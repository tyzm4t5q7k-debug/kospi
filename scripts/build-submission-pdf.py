"""Generate the five-page submission report from the website's calculation model.
Run npm test, then node scripts/export-case-study.cjs before this script.
Requires reportlab. No network access or market data collection occurs here.
"""
import gzip
import io
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'tmp/submission/cases.json').read_text())
OUTPUT = ROOT / 'public/reports/kim-seunghyun-finance-portfolio.pdf'
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Report', io.BytesIO(gzip.decompress((ROOT / 'public/fonts/report-korean.ttf.gz').read_bytes()))))
INK, MUTED, TEAL, BLUE = '#17314c', '#506780', '#087f78', '#2563eb'
c = canvas.Canvas(str(OUTPUT), pagesize=(210 * mm, 297 * mm), pageCompression=1, invariant=1)
c.setTitle('김승현 | 시장·환율·현금흐름 분석 포트폴리오')
c.setAuthor('김승현 · Codex 보조')
c.setSubject('고정 표본의 시장·환율 분석 2편 및 가상 기업 시나리오 1편')

def clean(value):
    return str(value).replace('→', ' > ').replace('−', '-').replace('–', '-').replace('—', '-')

def text(value, x, y, size=10, color=INK):
    c.setFont('Report', size)
    c.setFillColor(HexColor(color))
    c.drawString(x * mm, (297 - y) * mm, clean(value))

def para(value, y, size=9.1, color=INK, x=18, width=174, leading=1.65):
    style = ParagraphStyle('body', fontName='Report', fontSize=size, leading=size * leading,
                           textColor=HexColor(color), wordWrap='CJK')
    block = Paragraph(escape(clean(value)).replace('\n', '<br/>'), style)
    _, h = block.wrap(width * mm, 280 * mm)
    if y + h / mm > 279:
        raise ValueError(f'Page overflow: {y + h / mm:.1f} mm / {value[:70]}')
    block.drawOn(c, x * mm, (297 - y) * mm - h)
    return y + h / mm

def line(y):
    c.setStrokeColor(HexColor('#cfdae5'))
    c.setLineWidth(.5)
    c.line(18 * mm, (297-y) * mm, 192 * mm, (297-y) * mm)

def section(label, value, y, size=9.1):
    text(label, 18, y, 10.5, TEAL)
    return para(value, y + 3.5, size=size) + 7

def footer(page):
    line(284)
    text('김승현 · 금융 분석 포트폴리오 | AI 보조 작성 · 고정 표본 사례 연구', 18, 290, 7.3, MUTED)
    text(f'{page} / 5', 181, 290, 8, MUTED)
    c.showPage()

def header(study):
    text(f"CASE {study['number']}  /  {study['label']}", 18, 17, 9, TEAL)
    text(study['title'], 18, 29, 18)
    return para(study['period'], 35, 8, MUTED)

def metrics(study, y):
    for i, metric in enumerate(study['metrics']):
        x = 18 + i * 59
        c.setFillColor(HexColor('#edf4f8'))
        c.roundRect(x * mm, (297-y-26) * mm, 56 * mm, 26 * mm, 2 * mm, fill=1, stroke=0)
        text(metric['label'], x+3, y+7, 8, MUTED)
        text(metric['value'], x+3, y+16, 17, TEAL)
        para(metric['detail'], y+19, size=6.7, x=x+3, width=50, leading=1.15, color=MUTED)
    return y + 26

def table(headers, rows, y, widths=None, size=8, row_height=None):
    style = ParagraphStyle('cell', fontName='Report', fontSize=size, leading=size * 1.5, wordWrap='CJK', textColor=HexColor(INK))
    data = [[Paragraph(escape(clean(v)).replace('\n', '<br/>'), style) for v in row] for row in [headers] + rows]
    t = Table(data, colWidths=[v*mm for v in (widths or [174/len(headers)] * len(headers))], rowHeights=row_height)
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), HexColor('#e4eef5')),
                          ('LINEBELOW', (0, 0), (-1, -1), .4, HexColor('#cfdbe5')),
                          ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                          ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                          ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    _, h = t.wrap(174 * mm, 270 * mm)
    if y + h/mm > 279: raise ValueError('Table overflow')
    t.drawOn(c, 18 * mm, (297-y) * mm - h)
    return y+h/mm

def chart_frame(y, h, low, high, ticks):
    x, w = 29, 160
    def yp(v): return 297-y-h+(v-low)/(high-low)*h
    for tick in ticks:
        c.setStrokeColor(HexColor('#d6e1e9')); c.setLineWidth(.4)
        c.line(x*mm, yp(tick)*mm, (x+w)*mm, yp(tick)*mm)
        text(str(tick), 18, 297-yp(tick)+1, 7, MUTED)
    return x, w, yp

def annual_chart(y):
    x, w, yp = chart_frame(y, 37, -40, 50, [-40, -20, 0, 20, 40])
    rows = DATA['annualReturns']
    for i, row in enumerate(rows):
        for j, (key, color) in enumerate([('kospi', BLUE), ('nasdaq', TEAL)]):
            left = x + i * w/len(rows) + 2 + j * 5.2
            a, b = sorted([yp(0), yp(row[key])])
            c.setFillColor(HexColor(color)); c.rect(left*mm, a*mm, 4.4*mm, max(b-a,.1)*mm, fill=1, stroke=0)
        text(str(row['year'])[2:], x+i*w/len(rows)+3, y+42, 7, MUTED)
    text('Annual return (%) | KOSPI (KRW)', 29, y-4, 8, BLUE)
    text('NASDAQ (USD)', 129, y-4, 8, TEAL)
    return y+48

def currency_chart(y):
    x, w, yp = chart_frame(y, 33, 95, 155, [100, 120, 140])
    rows = DATA['currencyChart']
    for key, color in [('usd', BLUE), ('krw', TEAL)]:
        c.setStrokeColor(HexColor(color)); c.setLineWidth(1.6)
        for i in range(1,len(rows)):
            c.line((x+(i-1)*w/12)*mm, yp(rows[i-1][key])*mm, (x+i*w/12)*mm, yp(rows[i][key])*mm)
    for i in [0,3,6,9,12]: text(rows[i]['month'][2:7], x+i*w/12-3, y+38, 7, MUTED)
    text('2023-12-29 = 100 | NASDAQ (USD)', 29, y-4, 8, BLUE)
    text('NASDAQ (KRW)', 133, y-4, 8, TEAL)
    return y+43

# Page 1: an executive overview with concrete results, no decorative cover-only page.
c.setFillColor(HexColor('#10263f')); c.rect(0, 243*mm, 210*mm, 54*mm, fill=1, stroke=0)
text('FINANCIAL RESEARCH PORTFOLIO', 18, 17, 9, '#99f6e4')
text('시장·환율·현금흐름 분석', 18, 31, 24, '#ffffff')
text('김승현 | 경제통상학 · KOSPI × NASDAQ Coupling Lab', 18, 44, 10, '#dce8f4')
y = section('분석 목적', '시장 움직임을 관측 사실과 해석으로 나누고, 고객과 기업의 금융 선택에서 확인할 질문으로 연결한다. 은행·증권·자산운용에 공통으로 필요한 수치 설명과 가정 검토에 초점을 맞췄다.', 66, 10)
for study in DATA['cases']:
    y += 3
    text(study['number'], 18, y+2, 19, TEAL)
    text(study['title'], 30, y+1, 12)
    y = para(study['finding'], y+6, 9.4, x=30, width=162) + 11
y = section('읽는 순서', '2쪽 시장 동조화 → 3쪽 환율 효과 → 4쪽 기업 현금흐름 → 5쪽 출처·계산 기준. 전체 표본과 상세 해석은 웹사이트 및 저장소에서 확인할 수 있다.', y, 9)
y = section('작성 기여', '김승현: 주제·활용 목적·지원 범위와 확장 방향 결정. Codex: 자료 정리·개발·분석 초안·계산 검증·보고서 제작 보조. 독립 개발이나 실제 고객 상담·운용 실적이 아닌 AI 보조 프로젝트다.', y, 8.7)
text('웹 포트폴리오 · kospi-swart.vercel.app', 18, 269, 9, TEAL)
c.linkURL('https://kospi-swart.vercel.app', (18*mm, 25*mm, 180*mm, 34*mm), relative=0)
text('자료 확인 2026-09-11 | 고정 표본 연구 · 최신 시장 전망이 아님', 18, 277, 8, MUTED)
footer(1)

# Page 2: annual co-movement.
s = DATA['cases'][0]
header(s); metrics(s, 46)
y = para(s['finding'], 80, 9.2) + 11
y = annual_chart(y)
y = section('계산과 표본', s['method'], y+4, 8.6)
y = section('해석', s['interpretation'], y, 9.2)
y = section('표본 민감도', s['alternative'], y, 8.8)
y = section('업무 연결과 한계', '국가만으로 분산 효과를 판단하지 않고 업종 중복과 통화를 확인한다. 표본은 연간 수익률 10개이며, 일별 동조화·위기 시 동반 하락·인과관계를 검정하지 않았다. 2차 편집 자료를 사용했으며 KRX 원자료와 전수 대조하지 않았다.', y, 8.8)
para('자료: Wikipedia KOSPI·NASDAQ Composite 연간 성과표. 전체 종가·수익률 및 원문 링크는 사이트와 저장소에 공개. 배당·통화 환산 제외.', max(y,267), 7.5, MUTED)
footer(2)

# Page 3: currency attribution.
s = DATA['cases'][1]
header(s); metrics(s, 46)
y = para(s['finding'], 80, 9.0) + 11
y = currency_chart(y)
y = table(s['table']['headers'], s['table']['rows'], y, size=7.8) + 8
r = DATA['currencyResult']
y = section('가격·환율 분해', f"가격 {r['price']:+.2f}%p + 환율 {r['fx']:+.2f}%p + 교차효과 {r['interaction']:+.2f}%p = 원화 환산 {r['total']:+.2f}%. 원화 수익률은 (1+달러 수익률)×(1+환율 변화율)-1로 계산했다.", y, 9)
y = section('구간을 바꿔 확인', s['alternative'], y, 9)
y = section('업무 연결과 한계', '고객의 지출 통화와 환헤지 여부를 확인하고 가격 상승과 환율 효과를 나눠 설명한다. 월별 지수·환율은 같은 날짜라도 관측 시각이 다르며, 일별 급락과 실제 상품의 보수·추적오차·배당·세금은 반영하지 않았다.', y, 8.8)
para('자료: Nasdaq, Inc. / FRED NASDAQCOM; 미 연준 / FRED DEXKOUS. 뉴욕 정오 환율을 사용하며 서울 종가·고객 적용 환율과 다름. 시작일 2023-12-29, 종료일 2024-12-31.', max(y,267), 7.5, MUTED)
footer(3)

# Page 4: hypothetical business scenario and sensitivity matrix.
s = DATA['cases'][2]
header(s); metrics(s, 46)
y = section('가정과 결과', s['finding'], 83, 9.2)
y = section('계산 방법', s['method'], y, 9.0)
y = table(s['table']['headers'], s['table']['rows'], y, size=8.5) + 4
y = para('달러 순수취 10만 달러 기업의 12개월 순효과. 금액은 만원, 환율은 원/USD, 금리 변화는 %p.', y, 7.8, MUTED)+9
y = section('해석', s['interpretation'], y, 9)
y = section('결제 시점까지 확인', s['alternative'], y, 9)
y = section('상담에서 확인할 질문', s['implication'], y, 9)
para('원금·거래량 일정, 즉시 금리 재산정, 환헤지 없음. 분할 상환·세금·시간가치는 제외. 실제 기업·여신 한도·회계상 순이익 추정이 아닌 입력 가정에 따른 계산이다.', max(y,267), 7.7, MUTED)
footer(4)

# Page 5: source hierarchy, reproducibility, and contribution disclosure.
text('METHODS & SOURCES', 18, 17, 9, TEAL)
text('출처와 검증 범위', 18, 30, 21)
y = section('고정 표본을 사용하는 이유', '제출 후에도 같은 수치와 문장을 재현할 수 있도록 표본과 산식을 고정했다. 시장 사례는 2015~2024년 연간 자료, 환율 사례는 2024년 월별 자료다. 최신 시장 데이터는 웹사이트의 별도 비교 도구에서 확인한다.', 43, 9.1)
y = table(['구분', '수행한 확인', '수행하지 않은 확인'], [
    ['자료', '출처·단위·기간 기록\nNASDAQ 2023·2024년 말 FRED 대조', 'KOSPI 전 기간의 KRX 원자료 대조'],
    ['계산', '연간 수익률 재계산\n환율 분해·현금계산 일치\n분기 연결·기업 부호 확인', '인과 추정·예측력 검증\n표본 외 실증 검정'],
    ['출력', '웹 계산과 PDF 모델 공유\n한글·도표·페이지 출력 확인', '실제 고객·기업 데이터 적용']
], y, widths=[22,76,76], size=8.2)+10
text('자료와 참고 문헌 · 아래 제목을 클릭하면 원문으로 이동', 18, y, 10, TEAL)
y += 6
for source in DATA['sources']:
    top = y
    y = para(source['title'], y, 8.6, TEAL)
    c.linkURL(source['url'], (18*mm, (297-y)*mm, 192*mm, (297-top)*mm), relative=0)
    y = para(source['detail'], y+1, 7.6, MUTED) + 4
y = section('재현과 작성 기여', '원자료 CSV, 산식, 검증 코드 및 보고서 생성 코드를 GitHub에 공개했다. 김승현은 프로젝트 방향을 정했고, Codex는 자료·구현·분석 문안의 작성을 보조했다. 자동 검증 통과는 작성자의 직접 검토나 외부 원자료의 정확성을 보장하지 않는다.', y+2, 8.6)
text('GitHub · tyzm4t5q7k-debug/kospi', 18, min(y+2, 276), 9, TEAL)
c.linkURL('https://github.com/tyzm4t5q7k-debug/kospi', (18*mm, 17*mm, 192*mm, 33*mm), relative=0)
footer(5)
c.save()
print(OUTPUT)
