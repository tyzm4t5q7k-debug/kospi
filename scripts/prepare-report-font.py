from pathlib import Path
from tempfile import TemporaryDirectory
from fontTools.ttLib import TTFont
from fontTools.merge import Merger
import shutil
import gzip
from fontTools import subset
root=Path(__file__).resolve().parents[1]
src=root/'node_modules/@fontsource/nanum-gothic'
with TemporaryDirectory() as tmp:
    paths=[]
    for i,p in enumerate(sorted((src/'files').glob('*-400-normal.woff'))):
        f=TTFont(p)
        for table in ('GSUB','GPOS','GDEF','kern','DSIG'):
            if table in f: del f[table]
        f.flavor=None
        out=Path(tmp)/f'{i}.ttf'; f.save(out); paths.append(str(out))
    font=Merger().merge(paths)
    font.flavor=None
    for record in font['name'].names:
        values={1:'Coupling Lab Report',2:'Regular',3:'CouplingLabReport-Regular',4:'Coupling Lab Report Regular',6:'CouplingLabReport-Regular'}
        if record.nameID in values:
            record.string=values[record.nameID].encode(record.getEncoding(),errors='replace')
    font.save(root/'public/fonts/report-korean.ttf')
shutil.copyfile(src/'LICENSE',root/'public/fonts/OFL.txt')
f=TTFont(root/'public/fonts/report-korean.ttf')
cmap=f.getBestCmap()
assert all(ord(c) in cmap for c in '김승현 금융시장 자산운용 개인고객 기업금융 환율 변동 수익률0123456789')
opt=subset.Options(); opt.hinting=False; opt.name_IDs=['*']; opt.name_legacy=True; opt.name_languages=['*']
sub=subset.Subsetter(options=opt); sub.populate(unicodes=list(cmap)); sub.subset(f)
p=root/'public/fonts/report-korean.ttf'; f.save(p)
gz=p.with_suffix('.ttf.gz'); gz.write_bytes(gzip.compress(p.read_bytes(),mtime=0)); p.unlink()
print({'bytes':gz.stat().st_size,'characters':len(cmap)})
