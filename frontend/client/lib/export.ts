type ExportValue = string | number | boolean | null | undefined;
type ExportRow = Record<string, ExportValue>;

const escapeCsv = (value: ExportValue) => {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const escapeHtml = (value: ExportValue) =>
  (value == null ? "" : String(value))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export function downloadCsv(filename: string, rows: ExportRow[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printPdf(title: string, sections: Array<{ heading: string; rows: ExportRow[] }>) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;

  const tableHtml = sections
    .filter((section) => section.rows.length > 0)
    .map((section) => {
      const headers = Object.keys(section.rows[0]);
      const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
      const body = section.rows
        .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`)
        .join("");
      return `<h2>${escapeHtml(section.heading)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join("");

  win.document.write(`<!doctype html>
<html>
<head>
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin-top: 28px; }
    p { color: #475569; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>Generated ${new Date().toLocaleString()}</p>
  ${tableHtml}
</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
}
