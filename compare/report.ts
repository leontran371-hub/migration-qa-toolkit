// Renders the comparison result as a self-contained HTML page.
import type { CompareResult } from './engine';

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export function renderHtml(result: CompareResult): string {
  const { summary, findings } = result;
  const rows = findings
    .map(
      (f) => `      <tr class="${f.status.toLowerCase()}" data-testid="finding-${f.rule}-${escape(f.externalId)}">
        <td>${f.status}</td><td>${escape(f.defect ?? '')}</td><td>${f.rule}</td><td>${f.object}</td><td>${escape(f.externalId)}</td>
        <td>${escape(f.field ?? '')}</td><td>${escape(f.expected)}</td><td>${escape(f.actual)}</td>
      </tr>`,
    )
    .join('\n');
  const tile = (label: string, value: number, id: string) =>
    `<div class="tile"><span class="value" data-testid="summary-${id}">${value}</span><span class="label">${label}</span></div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Migration comparison report</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #1f2933; }
  .summary { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0 2rem; }
  .tile { border: 1px solid #d0d7de; border-radius: 6px; padding: 0.75rem 1.25rem; min-width: 8rem; }
  .value { display: block; font-size: 1.75rem; font-weight: 600; }
  .label { color: #57606a; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border-bottom: 1px solid #d0d7de; padding: 0.4rem 0.6rem; text-align: left; }
  tr.failed td:first-child { color: #b42318; font-weight: 600; }
  tr.known td:first-child { color: #946200; font-weight: 600; }
</style>
</head>
<body>
<h1>Salesforce to target comparison</h1>
<p>Reference date ${escape(result.referenceDate)}. Rules R1 to R5, matched on External ID.</p>
<section class="summary" aria-label="Summary">
  ${tile('Total checked', summary.totalChecked, 'total')}
  ${tile('Passed', summary.passed, 'passed')}
  ${tile('Failed', summary.failed, 'failed')}
  ${tile('Known', summary.known, 'known')}
</section>
<h2>Findings (${findings.length})</h2>
<table data-testid="findings-table">
  <thead>
    <tr><th>Status</th><th>Defect</th><th>Rule</th><th>Object</th><th>External ID</th><th>Field</th><th>Expected</th><th>Actual</th></tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>
</body>
</html>
`;
}
