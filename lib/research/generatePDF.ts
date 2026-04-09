import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";
import { formatDateTimeIST } from "@/lib/utils/istDate";
import type { SearchResult } from "@/lib/search/searchWeb";

// Colors (RGB 0-1 range)
const COLORS = {
  primary: rgb(0.1, 0.1, 0.18),
  accent: rgb(0.06, 0.2, 0.38),
  text: rgb(0.18, 0.18, 0.18),
  muted: rgb(0.42, 0.45, 0.5),
  divider: rgb(0.82, 0.84, 0.86),
  link: rgb(0.12, 0.25, 0.69),
};

// Layout
const MARGIN = 72; // 1 inch
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Typography — standard academic formatting
const BODY_FONT_SIZE = 12; // Times New Roman 12pt
const HEADING_FONT_SIZE = 14; // Section headings 14pt bold
const LINE_HEIGHT = BODY_FONT_SIZE * 2; // Double spacing (24pt)
const PARAGRAPH_GAP = LINE_HEIGHT; // One blank double-spaced line between paragraphs
const REF_FONT_SIZE = 12; // References also 12pt
const REF_LINE_HEIGHT = REF_FONT_SIZE * 1.4; // Single-spaced for references (standard)

// Sanitize text for WinAnsi encoding (standard PDF fonts can't handle many Unicode chars)
function sanitizeText(text: string): string {
  return text
    // Math & typography symbols
    .replace(/\u2212/g, "-")   // minus sign → hyphen
    .replace(/\u2013/g, "-")   // en dash
    .replace(/\u2014/g, "--")  // em dash
    .replace(/\u2026/g, "...") // ellipsis
    .replace(/\u2018/g, "'")   // left single quote
    .replace(/\u2019/g, "'")   // right single quote / apostrophe
    .replace(/\u201C/g, '"')   // left double quote
    .replace(/\u201D/g, '"')   // right double quote
    .replace(/\u2022/g, "-")   // bullet
    .replace(/\u00B7/g, "-")   // middle dot
    .replace(/\u2010/g, "-")   // hyphen
    .replace(/\u2011/g, "-")   // non-breaking hyphen
    .replace(/\u00A0/g, " ")   // non-breaking space
    .replace(/\u200B/g, "")    // zero-width space
    .replace(/\u200E/g, "")    // left-to-right mark
    .replace(/\u200F/g, "")    // right-to-left mark
    .replace(/\uFEFF/g, "")    // BOM
    .replace(/\u2032/g, "'")   // prime
    .replace(/\u2033/g, '"')   // double prime
    .replace(/\u2192/g, "->")  // right arrow
    .replace(/\u2190/g, "<-")  // left arrow
    .replace(/\u2264/g, "<=")  // less than or equal
    .replace(/\u2265/g, ">=")  // greater than or equal
    .replace(/\u00D7/g, "x")   // multiplication sign
    .replace(/\u00F7/g, "/")   // division sign
    // Strip any remaining non-WinAnsi characters (keep ASCII + Latin-1 Supplement)
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xFF]/g, "");
}

interface ReportSection {
  heading: string;
  body: string;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

// Parse the LLM-generated report into sections.
function parseReportSections(report: string): ReportSection[] {
  const sections: ReportSection[] = [];
  const lines = report.split("\n");
  let currentHeading = "";
  let currentBody: string[] = [];

  // Helper: flush the current heading + body as a section.
  // If currentHeading is empty but there's body content, extract the first
  // non-empty line as the heading (handles the first section with no --- prefix).
  function flushSection() {
    if (currentHeading) {
      sections.push({
        heading: currentHeading,
        body: currentBody.join("\n").trim(),
      });
    } else {
      // No heading yet — content before the first delimiter
      const bodyText = currentBody.join("\n").trim();
      if (bodyText.length > 0) {
        // Extract first non-empty line as heading
        const bodyLines = bodyText.split("\n");
        const firstLine = bodyLines.find((l) => l.trim().length > 0)?.trim();
        if (firstLine) {
          const rest = bodyLines.slice(bodyLines.indexOf(firstLine) + 1);
          sections.push({
            heading: firstLine.toUpperCase(),
            body: rest.join("\n").trim(),
          });
        }
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detection strategy 1: `---` delimiter followed by heading on the next line
    // The compile prompt uses "--- Section Heading" or "---\nSection Heading"
    if (/^-{3,}\s*$/.test(trimmed)) {
      // Pure delimiter line — the next non-empty line is the heading
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && nextLine.length > 0 && nextLine.length < 120) {
        flushSection();
        currentHeading = nextLine.toUpperCase();
        currentBody = [];
        i++; // skip the heading line
        continue;
      }
      continue; // stray delimiter, skip
    }

    // Detection strategy 2: `--- Heading Text` on the same line
    const inlineMatch = trimmed.match(/^-{3,}\s+(.+)$/);
    if (inlineMatch && inlineMatch[1].length < 120) {
      flushSection();
      currentHeading = inlineMatch[1].trim().toUpperCase();
      currentBody = [];
      continue;
    }

    // Detection strategy 3 (fallback): standalone ALL-CAPS line (2+ words, no punctuation)
    // This catches old-style reports that use "EXECUTIVE SUMMARY" etc. without ---
    if (
      /^[A-Z][A-Z\s]{4,}$/.test(trimmed) &&
      trimmed.length < 60
    ) {
      // Only treat as heading if it looks like a section title (not body text)
      const words = trimmed.split(/\s+/);
      if (words.length >= 2 && words.length <= 6) {
        flushSection();
        currentHeading = trimmed;
        currentBody = [];
        continue;
      }
    }

    currentBody.push(line);
  }

  // Flush last section
  flushSection();

  // If no sections were detected, treat the entire report as one section
  if (sections.length === 0) {
    sections.push({ heading: "REPORT", body: report });
  }

  return sections;
}

// Word-wrap text to fit within a given width
function wrapText(
  rawText: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const text = sanitizeText(rawText);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Generate a professionally formatted PDF from a deep research report.
export async function generateResearchPDF(
  topic: string,
  report: string,
  sources: SearchResult[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  pdfDoc.setTitle(`Deep Research: ${topic}`);
  pdfDoc.setAuthor("Auto-Mate Research Agent");
  pdfDoc.setSubject(topic);
  pdfDoc.setCreationDate(new Date());

  // Embed standard fonts — Times Roman family for body, Helvetica for title page
  const fonts: Fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    italic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
  };
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  // ─────────────────────────────────────
  // TITLE PAGE
  // ─────────────────────────────────────
  const titlePage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Accent bar
  titlePage.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 180,
    width: CONTENT_WIDTH,
    height: 4,
    color: COLORS.accent,
  });

  // Title
  const titleText = "DEEP RESEARCH REPORT";
  const titleWidth = helveticaBold.widthOfTextAtSize(titleText, 26);
  titlePage.drawText(titleText, {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: PAGE_HEIGHT - MARGIN - 220,
    size: 26,
    font: helveticaBold,
    color: COLORS.primary,
  });

  // Topic (centered, may wrap)
  const topicLines = wrapText(topic, fonts.regular, 16, CONTENT_WIDTH - 40);
  let topicY = PAGE_HEIGHT - MARGIN - 270;
  for (const line of topicLines) {
    const lineWidth = fonts.regular.widthOfTextAtSize(line, 16);
    titlePage.drawText(line, {
      x: (PAGE_WIDTH - lineWidth) / 2,
      y: topicY,
      size: 16,
      font: fonts.regular,
      color: COLORS.accent,
    });
    topicY -= 24;
  }

  // Metadata
  const dateStr = formatDateTimeIST(new Date());
  const metaLines = [
    `Generated: ${dateStr} IST`,
    `Sources: ${sources.length}`,
    "Prepared by Auto-Mate Research Agent",
  ];
  let metaY = topicY - 60;
  for (const line of metaLines) {
    const lineWidth = fonts.regular.widthOfTextAtSize(line, BODY_FONT_SIZE);
    titlePage.drawText(line, {
      x: (PAGE_WIDTH - lineWidth) / 2,
      y: metaY,
      size: BODY_FONT_SIZE,
      font: fonts.regular,
      color: COLORS.muted,
    });
    metaY -= 18;
  }

  // Bottom accent line
  titlePage.drawRectangle({
    x: MARGIN,
    y: metaY - 30,
    width: CONTENT_WIDTH,
    height: 2,
    color: COLORS.divider,
  });

  // ─────────────────────────────────────
  // CONTENT PAGES
  // ─────────────────────────────────────
  const sections = parseReportSections(report);

  for (const section of sections) {
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    // Section heading — accent bar + 14pt bold
    page.drawRectangle({
      x: MARGIN,
      y: y - 18,
      width: 4,
      height: 22,
      color: COLORS.accent,
    });

    page.drawText(section.heading, {
      x: MARGIN + 14,
      y: y - 14,
      size: HEADING_FONT_SIZE,
      font: fonts.bold,
      color: COLORS.primary,
    });

    y -= 32;

    // Divider line
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: MARGIN + CONTENT_WIDTH, y },
      thickness: 1,
      color: COLORS.divider,
    });

    y -= LINE_HEIGHT; // one double-spaced line gap after heading

    // Body paragraphs — Times New Roman 12pt, double spaced
    const paragraphs = section.body.split(/\n\n+/);

    for (const para of paragraphs) {
      const trimmed = para.trim().replace(/\*\*/g, "");
      if (!trimmed) continue;

      // Numbered sub-heading (e.g. "1. Finding Title") — bold but same 12pt
      const isSubHeading = /^\d+\.\s+/.test(trimmed) && trimmed.length < 100;

      const font = isSubHeading ? fonts.bold : fonts.regular;
      const color = isSubHeading ? COLORS.accent : COLORS.text;

      const wrappedLines = wrapText(
        trimmed,
        font,
        BODY_FONT_SIZE,
        CONTENT_WIDTH,
      );

      for (const line of wrappedLines) {
        if (y < MARGIN + 30) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }

        page.drawText(line, {
          x: MARGIN,
          y,
          size: BODY_FONT_SIZE,
          font,
          color,
        });
        y -= LINE_HEIGHT; // double spacing
      }

      y -= PARAGRAPH_GAP; // extra blank line between paragraphs
    }
  }

  // ─────────────────────────────────────
  // REFERENCES PAGE
  // ─────────────────────────────────────
  const seenUrls = new Set<string>();
  const uniqueSources: SearchResult[] = [];
  for (const s of sources) {
    if (!seenUrls.has(s.url)) {
      seenUrls.add(s.url);
      uniqueSources.push(s);
    }
  }

  let refPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let refY = PAGE_HEIGHT - MARGIN;

  // References heading
  refPage.drawRectangle({
    x: MARGIN,
    y: refY - 18,
    width: 4,
    height: 22,
    color: COLORS.accent,
  });

  refPage.drawText("REFERENCES", {
    x: MARGIN + 14,
    y: refY - 14,
    size: HEADING_FONT_SIZE,
    font: fonts.bold,
    color: COLORS.primary,
  });

  refY -= 32;

  refPage.drawLine({
    start: { x: MARGIN, y: refY },
    end: { x: MARGIN + CONTENT_WIDTH, y: refY },
    thickness: 1,
    color: COLORS.divider,
  });

  refY -= LINE_HEIGHT;

  // References — 12pt Times New Roman, single-spaced (standard for bibliographies)
  for (let i = 0; i < uniqueSources.length; i++) {
    const src = uniqueSources[i];

    if (refY < MARGIN + 60) {
      refPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      refY = PAGE_HEIGHT - MARGIN;
    }

    // Reference number + title — 12pt bold
    const refTitle = `[${i + 1}]  ${src.title}`;
    const titleLines = wrapText(
      refTitle,
      fonts.bold,
      REF_FONT_SIZE,
      CONTENT_WIDTH,
    );
    for (const line of titleLines) {
      refPage.drawText(line, {
        x: MARGIN,
        y: refY,
        size: REF_FONT_SIZE,
        font: fonts.bold,
        color: COLORS.text,
      });
      refY -= REF_LINE_HEIGHT;
    }

    // URL — 12pt regular
    const urlLines = wrapText(
      src.url,
      fonts.regular,
      REF_FONT_SIZE,
      CONTENT_WIDTH - 24,
    );
    for (const line of urlLines) {
      refPage.drawText(line, {
        x: MARGIN + 24,
        y: refY,
        size: REF_FONT_SIZE,
        font: fonts.regular,
        color: COLORS.link,
      });
      refY -= REF_LINE_HEIGHT;
    }

    // Snippet — 12pt italic
    if (src.snippet) {
      const snippet =
        src.snippet.length > 150
          ? src.snippet.slice(0, 150) + "..."
          : src.snippet;
      const snippetLines = wrapText(
        snippet,
        fonts.italic,
        REF_FONT_SIZE,
        CONTENT_WIDTH - 24,
      );
      for (const line of snippetLines) {
        if (refY < MARGIN + 20) {
          refPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          refY = PAGE_HEIGHT - MARGIN;
        }
        refPage.drawText(line, {
          x: MARGIN + 24,
          y: refY,
          size: REF_FONT_SIZE,
          font: fonts.italic,
          color: COLORS.muted,
        });
        refY -= REF_LINE_HEIGHT;
      }
    }

    refY -= REF_LINE_HEIGHT; // gap between references
  }

  // ─────────────────────────────────────
  // PAGE NUMBERS
  // ─────────────────────────────────────
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const pageNum = `Page ${i + 1} of ${pages.length}`;
    const numWidth = fonts.regular.widthOfTextAtSize(pageNum, 10);
    pages[i].drawText(pageNum, {
      x: (PAGE_WIDTH - numWidth) / 2,
      y: 30,
      size: 10,
      font: fonts.regular,
      color: COLORS.muted,
    });
  }

  return await pdfDoc.save();
}
