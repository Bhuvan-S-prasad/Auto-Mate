import type { SearchResult } from "@/lib/search/searchWeb";
import { sendDocument } from "@/lib/Telegram/send-document";
import { formatDateTimeIST } from "@/lib/utils/istDate";
import { generateResearchPDF } from "@/lib/research/generatePDF";
import { getTelegramChatId, sendToUser } from "./utils";
import { LOG_PREFIX } from "../types/research";

// ── STAGE 8: Format and Deliver

export function splitAtParagraphs(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let current = "";

  const paragraphs = text.split(/\n\n+/);

  for (const para of paragraphs) {
    // If adding this paragraph exceeds the limit, flush current
    if (current.length + para.length + 2 > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }

    // If a single paragraph exceeds maxLen, split by sentences
    if (para.length > maxLen) {
      if (current.length > 0) {
        chunks.push(current.trim());
        current = "";
      }
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if (
          current.length + sentence.length + 1 > maxLen &&
          current.length > 0
        ) {
          chunks.push(current.trim());
          current = "";
        }
        current += (current ? " " : "") + sentence;
      }
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

export async function formatAndDeliver(
  userId: string,
  topic: string,
  report: string,
  sources: SearchResult[],
): Promise<void> {
  console.log(
    `${LOG_PREFIX} formatAndDeliver() called, sources=${sources.length}`,
  );

  const header =
    "DEEP RESEARCH REPORT\n" +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    topic.toUpperCase() +
    "\n" +
    `Generated: ${formatDateTimeIST(new Date())} · ${sources.length} sources\n`;

  // Deduplicate sources for footer by URL
  const seenUrls = new Set<string>();
  const uniqueSources: SearchResult[] = [];
  for (const s of sources) {
    if (!seenUrls.has(s.url)) {
      seenUrls.add(s.url);
      uniqueSources.push(s);
    }
  }

  // Find highest citation index used in the report
  let maxCitationIndex = 0;
  const citationRegex = /\[(\d+)\]/g;
  let match;
  while ((match = citationRegex.exec(report)) !== null) {
    const num = parseInt(match[1], 10);
    if (num > maxCitationIndex) {
      maxCitationIndex = num;
    }
  }
  const sourcesToShow = Math.max(8, maxCitationIndex);

  const footer =
    "\n─── SOURCES ───\n" +
    uniqueSources
      .slice(0, sourcesToShow)
      .map((s, i) => `[${i + 1}] ${s.title}\n    ${s.url}`)
      .join("\n");

  const fullMessage = header + "\n" + report + "\n" + footer;
  const chunks = splitAtParagraphs(fullMessage, 3800);

  console.log(
    `${LOG_PREFIX} formatAndDeliver: message length=${fullMessage.length}, chunks=${chunks.length}`,
  );

  for (let i = 0; i < chunks.length; i++) {
    console.log(
      `${LOG_PREFIX} Sending chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`,
    );

    let sent = false;
    let attempts = 0;
    while (!sent && attempts < 3) {
      try {
        await sendToUser(userId, chunks[i]);
        sent = true;
      } catch (err) {
        attempts++;
        if (attempts >= 3) {
          console.error(
            `${LOG_PREFIX} Failed to send chunk ${i + 1}/${chunks.length} after 3 attempts:`,
            err,
          );
        } else {
          const delay = attempts * 1000;
          console.warn(
            `${LOG_PREFIX} Retry sending chunk ${i + 1}/${chunks.length} (attempt ${attempts}) due to: ${err}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Delay between chunks to avoid Telegram rate limiting
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  console.log(`${LOG_PREFIX} formatAndDeliver: all text chunks sent`);

  // Generate and send PDF
  try {
    console.log(`${LOG_PREFIX} Generating PDF...`);
    const pdfBuffer = await generateResearchPDF(topic, report, sources);
    console.log(
      `${LOG_PREFIX} PDF generated: ${(pdfBuffer.length / 1024).toFixed(1)} KB`,
    );

    const chatId = await getTelegramChatId(userId);
    if (chatId) {
      const safeTopic = topic
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 50);
      const filename = `research_${safeTopic}.pdf`;

      await sendDocument(
        chatId,
        pdfBuffer,
        filename,
        `📄 Full research report: ${topic}`,
      );
      console.log(`${LOG_PREFIX} PDF sent to Telegram`);
    }
  } catch (pdfErr) {
    // PDF is a bonus — don't fail the whole delivery if it errors
    console.error(`${LOG_PREFIX} PDF generation/delivery failed:`, pdfErr);
  }
}
