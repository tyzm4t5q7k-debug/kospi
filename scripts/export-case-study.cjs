// Run after npm test. All outputs use the same calculations as the website.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { submission } = require(path.join(root, '.test-build/case-studies.js'));
for (const dir of ['tmp/submission', 'public/research', 'public/reports']) fs.mkdirSync(path.join(root, dir), { recursive: true });
fs.writeFileSync(path.join(root, 'tmp/submission/cases.json'), JSON.stringify(submission, null, 2));
const csv = (headers, rows) => headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n') + '\n';
fs.writeFileSync(path.join(root, 'public/research/annual-market-closes.csv'), csv(['year', 'kospi_krw_close', 'nasdaq_usd_close'], submission.annualCloses.map(r => [r.year, r.kospi, r.nasdaq])));
fs.writeFileSync(path.join(root, 'public/research/nasdaq-fx-monthly.csv'), csv(['observation_date', 'nasdaq_usd_close', 'krw_per_usd'], submission.currencyCloses.map(r => [r.month, r.nasdaq, r.fx])));
console.log(JSON.stringify({ annualCorrelation: submission.annualStats.correlation, annualSplit: [submission.annualStats.firstHalf, submission.annualStats.secondHalf], fx: submission.currencyResult, cases: submission.cases.length }, null, 2));
