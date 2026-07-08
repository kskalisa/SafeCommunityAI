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
  <p>Made ${new Date().toLocaleString()}</p>
  ${tableHtml}
</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
}
export type PdfSection = {
  title: string;
  headers?: string[];
  rows: Array<Array<string | number>>;
};

export function downloadPdf(filename: string, title: string, sections: PdfSection[], meta: { filters?: string[] } = {}) {
  const content = makePdf(title, sections, { filters: meta.filters ?? [] });
  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function makePdf(title: string, sections: PdfSection[], meta: { filters: string[] }) {
  const pageWidth = 792;
  const pageHeight = 612;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const pages: string[] = [];
  let commands: string[] = [];
  let y = pageHeight - 160;

  const add = (command: string) => commands.push(command);
  const textWidth = (value: string, size: number) => value.length * size * 0.48;
  const text = (value: string, x: number, baseline: number, size = 9, color = "0.12 0.16 0.23") => {
    add(`BT /F1 ${size} Tf ${x} ${baseline} Td ${color} rg (${escapePdf(value)}) Tj ET`);
  };
  const centeredText = (value: string, baseline: number, size = 12, color = "0.12 0.16 0.23") => {
    text(value, Math.max(margin, (pageWidth - textWidth(value, size)) / 2), baseline, size, color);
  };
  const rect = (x: number, baseline: number, width: number, height: number, color: string) => {
    add(`${color} rg ${x} ${baseline} ${width} ${height} re f`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color = "0.82 0.87 0.93") => {
    add(`${color} RG ${x1} ${y1} m ${x2} ${y2} l S`);
  };

  const startPage = () => {
    commands = [];
    rect(0, 0, pageWidth, pageHeight, "0.97 0.98 1");
    rect(0, pageHeight - 88, pageWidth, 88, "0.05 0.16 0.36");
    centeredText(title, pageHeight - 38, 21, "1 1 1");
    centeredText("Operational report made from the selected live records", pageHeight - 58, 9, "0.83 0.9 1");
    rect(margin, pageHeight - 126, contentWidth, 28, "0.9 0.95 1");
    centeredText([`Made ${new Date().toLocaleString()}`, ...meta.filters].join("    |    "), pageHeight - 116, 8, "0.05 0.16 0.36");
    y = pageHeight - 160;
  };

  const finishPage = () => {
    line(margin, 42, pageWidth - margin, 42);
    text("SafeCommunity", margin, 24, 8, "0.38 0.45 0.55");
    centeredText(`Confidential emergency operations report - Page ${pages.length + 1}`, 24, 8, "0.38 0.45 0.55");
    text(new Date().toLocaleDateString(), pageWidth - margin - 70, 24, 8, "0.38 0.45 0.55");
    pages.push(commands.join("\n"));
  };

  const ensureSpace = (height: number) => {
    if (y - height < 62) {
      finishPage();
      startPage();
    }
  };

  const columnWidths = (headers: string[]) => {
    if (headers.length === 2) return [contentWidth * 0.72, contentWidth * 0.28];
    if (headers.length === 5) return [145, 205, 80, 90, 120];
    if (headers.length === 4) return [190, 220, 140, 150];
    if (headers.length === 8) return [100, 72, 62, 82, 96, 132, 118, 42];
    if (headers.length === 9) return [82, 65, 55, 70, 82, 104, 92, 92, 32];
    return headers.map(() => contentWidth / Math.max(1, headers.length));
  };

  const cellText = (value: string | number, width: number) => {
    const textValue = String(value ?? "");
    const maxChars = Math.max(5, Math.floor(width / 5.1));
    return textValue.length > maxChars ? `${textValue.slice(0, Math.max(0, maxChars - 3))}...` : textValue;
  };

  const drawTable = (section: PdfSection) => {
    const headers = section.headers ?? [];
    const widths = columnWidths(headers);
    const rowHeight = 24;
    ensureSpace(48);
    rect(margin, y - 18, contentWidth, 30, "0.05 0.16 0.36");
    text(section.title, margin + 14, y - 6, 12, "1 1 1");
    y -= 38;

    if (!headers.length) return;
    ensureSpace(rowHeight * 2);
    rect(margin, y - 16, contentWidth, rowHeight, "0.91 0.95 1");
    let x = margin;
    headers.forEach((header, index) => {
      text(header.toUpperCase(), x + 8, y - 7, 7, "0.26 0.36 0.52");
      if (index > 0) line(x, y + 8, x, y - 16, "0.78 0.84 0.91");
      x += widths[index] ?? 80;
    });
    y -= rowHeight;

    section.rows.forEach((row, rowIndex) => {
      ensureSpace(rowHeight + 8);
      rect(margin, y - 16, contentWidth, rowHeight, rowIndex % 2 === 0 ? "1 1 1" : "0.96 0.98 1");
      x = margin;
      row.forEach((cell, index) => {
        const width = widths[index] ?? 80;
        text(cellText(cell, width), x + 8, y - 7, 8, index === 0 ? "0.05 0.16 0.36" : "0.2 0.27 0.36");
        if (index > 0) line(x, y + 8, x, y - 16, "0.89 0.92 0.96");
        x += width;
      });
      line(margin, y - 16, pageWidth - margin, y - 16, "0.88 0.92 0.96");
      y -= rowHeight;
    });
    y -= 18;
  };

  startPage();
  if (sections.length === 0) {
    rect(margin, y - 40, contentWidth, 70, "1 1 1");
    centeredText("Nothing was selected, or no records matched your choices.", y - 4, 11, "0.38 0.45 0.55");
  } else {
    sections.forEach(drawTable);
  }
  finishPage();

  const fontObject = 3;
  const pageObjects = pages.map((_, index) => 4 + index * 2);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjects.map((objectId) => `${objectId} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  pages.forEach((stream, index) => {
    const pageObject = pageObjects[index];
    const contentObject = pageObject + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "");
}


