type ExportValue = string | number | boolean | null | undefined;
type ExportRow = Record<string, ExportValue>;

type PdfMeta = {
  filters?: string[];
  generatedBy?: string;
  reportRef?: string;
  classification?: string;
};

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
      const body = section.rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("");
      return `<h2>${escapeHtml(section.heading)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join("");

  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;color:#0f172a;margin:32px}h1{font-size:24px;margin-bottom:4px}h2{font-size:16px;margin-top:28px}p{color:#475569}table{border-collapse:collapse;width:100%;margin-top:10px;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f1f5f9}</style></head><body><h1>${escapeHtml(title)}</h1><p>Made ${new Date().toLocaleString()}</p>${tableHtml}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export type PdfSection = {
  title: string;
  headers?: string[];
  rows: Array<Array<string | number>>;
};

export function downloadPdf(filename: string, title: string, sections: PdfSection[], meta: PdfMeta = {}) {
  const content = makePdf(title, sections, {
    filters: meta.filters ?? [],
    generatedBy: meta.generatedBy ?? "SafeCommunity AI",
    reportRef: meta.reportRef ?? reportReference(title),
    classification: meta.classification ?? "Confidential",
  });
  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function makePdf(title: string, sections: PdfSection[], meta: Required<PdfMeta>) {
  const wideTable = sections.some((section) => (section.headers?.length ?? 0) > 6);
  const pageWidth = wideTable ? 792 : 612;
  const pageHeight = wideTable ? 612 : 792;
  const margin = wideTable ? 32 : 38;
  const contentWidth = pageWidth - margin * 2;
  const pages: string[] = [];
  let commands: string[] = [];
  let y = pageHeight - 230;

  const add = (command: string) => commands.push(command);
  const estimateWidth = (value: string, size: number) => value.length * size * 0.58;
  const text = (value: string | number, x: number, baseline: number, size = 9, color = colors.ink, font = "F1") => {
    add(`BT /${font} ${size} Tf ${x} ${baseline} Td ${color} rg (${escapePdf(String(value ?? ""))}) Tj ET`);
  };
  const rightText = (value: string | number, right: number, baseline: number, size = 9, color = colors.ink, font = "F1") => {
    const raw = String(value ?? "");
    text(raw, Math.max(margin, right - estimateWidth(raw, size)), baseline, size, color, font);
  };
  const rect = (x: number, baseline: number, width: number, height: number, color: string) => add(`${color} rg ${x} ${baseline} ${width} ${height} re f`);
  const strokeRect = (x: number, baseline: number, width: number, height: number, color = colors.line) => add(`${color} RG ${x} ${baseline} ${width} ${height} re S`);
  const line = (x1: number, y1: number, x2: number, y2: number, color = colors.line) => add(`${color} RG ${x1} ${y1} m ${x2} ${y2} l S`);
  const circle = (cx: number, cy: number, radius: number, color: string, width = 1) => {
    const c = radius * 0.5522847498;
    add(`${color} RG ${width} w ${cx + radius} ${cy} m ${cx + radius} ${cy + c} ${cx + c} ${cy + radius} ${cx} ${cy + radius} c ${cx - c} ${cy + radius} ${cx - radius} ${cy + c} ${cx - radius} ${cy} c ${cx - radius} ${cy - c} ${cx - c} ${cy - radius} ${cx} ${cy - radius} c ${cx + c} ${cy - radius} ${cx + radius} ${cy - c} ${cx + radius} ${cy} c S 1 w`);
  };

  const startPage = () => {
    commands = [];
    rect(0, 0, pageWidth, pageHeight, "0.985 0.99 0.995");
    drawHeader();
    y = pageHeight - (wideTable ? 186 : 230);
  };

  const drawHeader = () => {
    const generated = new Date();
    const logoSize = wideTable ? 38 : 42;
    const logoTop = pageHeight - (wideTable ? 106 : 116);
    const brandX = margin + logoSize + 12;
    const metaWidth = wideTable ? 286 : 224;
    const metaX = pageWidth - margin - metaWidth;
    const metaStart = pageHeight - (wideTable ? 78 : 88);
    const metaStep = wideTable ? 16 : 18;

    text(generated.toLocaleString(), margin, pageHeight - 31, 7, colors.muted);
    rect(margin, logoTop, logoSize, logoSize, colors.red);
    strokeRect(margin, logoTop, logoSize, logoSize, colors.red);
    circle(margin + logoSize / 2, logoTop + logoSize / 2, logoSize * 0.26, "1 1 1", 1.6);
    rect(margin + logoSize / 2 - 1.1, logoTop + logoSize / 2 - 1, 2.2, logoSize * 0.16, "1 1 1");
    rect(margin + logoSize / 2 - 1.1, logoTop + logoSize / 2 - logoSize * 0.16, 2.2, 2.2, "1 1 1");
    text("SafeCommunity", brandX, logoTop + logoSize - 16, wideTable ? 14 : 15, colors.ink, "F2");
    text("AI EMERGENCY OPERATIONS", brandX, logoTop + logoSize - 32, 7.2, colors.letter);

    text("OPERATIONS REPORT", metaX, pageHeight - (wideTable ? 52 : 62), wideTable ? 13 : 14, colors.blue, "F2");
    drawMetaPair("Report Ref", meta.reportRef, metaX, metaStart, metaWidth);
    drawMetaPair("Generated At", generated.toLocaleString(), metaX, metaStart - metaStep, metaWidth);
    drawMetaPair("Generated By", meta.generatedBy, metaX, metaStart - metaStep * 2, metaWidth);
    drawMetaPair("Report", cleanTitle(title), metaX, metaStart - metaStep * 3, metaWidth);
    line(margin, pageHeight - (wideTable ? 150 : 166), pageWidth - margin, pageHeight - (wideTable ? 150 : 166), colors.blue);
  };

  const drawMetaPair = (label: string, value: string, x: number, baseline: number, width: number) => {
    text(label, x, baseline, 8, colors.muted);
    rightText(truncate(value, wideTable ? 46 : 28), x + width, baseline, 8, colors.ink, "F2");
  };

  const finishPage = () => {
    line(margin, 58, pageWidth - margin, 58, colors.line);
    text("This document is system-generated from current SafeCommunity records.", margin, 38, 7.5, colors.muted);
    rightText(`SafeCommunity - ${meta.classification}`, pageWidth - margin, 38, 7.5, colors.muted);
    rightText(`Page ${pages.length + 1}`, pageWidth - margin, 22, 7.5, colors.muted);
    pages.push(commands.join("\n"));
  };

  const ensureSpace = (height: number) => {
    if (y - height < 76) {
      finishPage();
      startPage();
    }
  };

  const drawReportSummary = () => {
    const summary = sections.find((section) => isSummarySection(section));
    const filters = meta.filters.filter(Boolean);
    if (!summary && filters.length === 0) return;

    ensureSpace(142);
    text("REPORT SUMMARY", margin, y, 10, colors.letter, "F2");
    y -= 20;

    const entries = [...(summary?.rows ?? []), ...filters.map((filter) => splitFilter(filter))].slice(0, 12);
    const cols = 3;
    const cellW = contentWidth / cols;
    const cellH = 34;
    const rows = Math.max(1, Math.ceil(entries.length / cols));
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = row * cols + col;
        const item = entries[index];
        const x = margin + col * cellW;
        const cellY = y - cellH;
        rect(x, cellY, cellW, cellH, row % 2 === 0 ? "0.965 0.975 0.985" : "0.99 0.995 1");
        strokeRect(x, cellY, cellW, cellH, colors.line);
        if (item) {
          text(String(item[0]).toUpperCase(), x + 10, cellY + 21, 6.8, colors.letter, "F2");
          rightText(truncate(String(item[1]), 20), x + cellW - 10, cellY + 9, 10, colors.ink, "F2");
        }
      }
      y -= cellH;
    }
    y -= 22;
  };

  const drawSection = (section: PdfSection) => {
    if (isSummarySection(section)) return;
    ensureSpace(62);
    text(section.title.toUpperCase(), margin, y, 10, colors.letter, "F2");
    y -= 18;

    if (!section.headers?.length) {
      y -= 8;
      return;
    }

    const widths = columnWidths(section.headers, contentWidth);
    const compact = section.headers.length > 6;
    const rowHeight = compact ? 21 : 24;
    ensureSpace(rowHeight * 2);
    rect(margin, y - rowHeight + 6, contentWidth, rowHeight, colors.dark);
    let x = margin;
    section.headers.forEach((header, index) => {
      text(truncate(header.toUpperCase(), Math.floor((widths[index] ?? 70) / (compact ? 4.5 : 5))), x + 5, y - (compact ? 8 : 9), compact ? 6.1 : 6.8, "1 1 1", "F2");
      x += widths[index] ?? 70;
    });
    y -= rowHeight;

    const rows = section.rows.length ? section.rows : [["No records available"]];
    rows.forEach((row, rowIndex) => {
      ensureSpace(rowHeight + 8);
      rect(margin, y - rowHeight + 6, contentWidth, rowHeight, rowIndex % 2 === 0 ? "1 1 1" : "0.97 0.98 0.99");
      strokeRect(margin, y - rowHeight + 6, contentWidth, rowHeight, colors.line);
      x = margin;
      row.forEach((cell, index) => {
        const width = widths[index] ?? contentWidth;
        const value = cellText(cell, width);
        const color = statusColor(value);
        text(value, x + 5, y - (compact ? 8 : 9), compact ? 6.7 : 7.6, color, index <= 1 ? "F2" : "F1");
        if (index > 0) line(x, y + 6, x, y - rowHeight + 6, "0.88 0.9 0.92");
        x += width;
      });
      y -= rowHeight;
    });
    y -= 22;
  };

  startPage();
  if (sections.length === 0) {
    drawReportSummary();
    rect(margin, y - 54, contentWidth, 70, "1 1 1");
    strokeRect(margin, y - 54, contentWidth, 70);
    text("No records matched the selected filters.", margin + 18, y - 16, 11, colors.muted);
  } else {
    drawReportSummary();
    sections.forEach(drawSection);
  }
  finishPage();

  return assemblePdf(pageWidth, pageHeight, pages);
}

function assemblePdf(pageWidth: number, pageHeight: number, pages: string[]) {
  const fontObject = 3;
  const boldFontObject = 4;
  const pageObjects = pages.map((_, index) => 5 + index * 2);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjects.map((objectId) => `${objectId} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  pages.forEach((stream, index) => {
    const pageObject = pageObjects[index];
    const contentObject = pageObject + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObject} 0 R /F2 ${boldFontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`);
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

const colors = {
  dark: "0.06 0.09 0.16",
  blue: "0.145 0.388 0.922",
  red: "0.863 0.149 0.149",
  green: "0.063 0.725 0.506",
  orange: "0.961 0.451 0.086",
  purple: "0.545 0.361 0.965",
  softBlue: "0.875 0.922 1",
  ink: "0.08 0.10 0.14",
  muted: "0.36 0.42 0.50",
  letter: "0.27 0.31 0.38",
  line: "0.80 0.84 0.88",
};

function isSummarySection(section: PdfSection) {
  return /summary|overview/i.test(section.title) && (section.headers?.length ?? 0) <= 2;
}

function splitFilter(filter: string): [string, string] {
  const [label, ...rest] = filter.split(":");
  return [label.trim() || "Filter", rest.join(":").trim() || "All"];
}

function cleanTitle(title: string) {
  return title.replace(/^SafeCommunity\s*-\s*/i, "");
}

function reportReference(title: string) {
  const slug = cleanTitle(title).replace(/[^A-Za-z0-9]+/g, "").slice(0, 8).toUpperCase() || "REPORT";
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `SCR-${slug}-${stamp}`;
}

function columnWidths(headers: string[], availableWidth: number) {
  const count = headers.length || 1;
  const normalized = headers.map((header) => header.toLowerCase());
  const preset = normalized.map((header) => {
    if (header === "#") return 0.45;
    if (header.includes("report number")) return 1.35;
    if (header.includes("kind")) return 1.05;
    if (header.includes("urgency")) return 0.85;
    if (header.includes("progress")) return 0.9;
    if (header.includes("reported by")) return 1.25;
    if (header.includes("team")) return 1.45;
    if (header.includes("place")) return 1.35;
    if (header.includes("reported on") || header.includes("created")) return 1.25;
    if (header.includes("certainty")) return 0.8;
    if (header.includes("email")) return 1.6;
    if (header.includes("name")) return 1.2;
    return 1;
  });
  if (count === 2) return [availableWidth * 0.68, availableWidth * 0.32];
  const total = preset.reduce((sum, width) => sum + width, 0) || count;
  return preset.map((width) => (width / total) * availableWidth);
}

function cellText(value: string | number, width: number) {
  const textValue = String(value ?? "").replace(/\s+/g, " ").trim();
  const maxChars = Math.max(4, Math.floor(width / 3.8));
  return truncate(textValue, maxChars);
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}...` : value;
}

function statusColor(value: string) {
  const lower = value.toLowerCase();
  if (/closed|resolved|active|available|complete|finished/.test(lower)) return colors.green;
  if (/critical|high|cancelled|locked|failed/.test(lower)) return colors.orange;
  if (/pending|waiting|assigned|review/.test(lower)) return colors.blue;
  return colors.ink;
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "");
}
