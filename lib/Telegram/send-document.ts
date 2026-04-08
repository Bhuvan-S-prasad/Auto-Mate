const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

// Send document/file to Telegram chat.
export async function sendDocument(
  chatId: number,
  fileData: Uint8Array,
  filename: string,
  caption?: string,
): Promise<void> {
  const formData = new FormData();
  formData.append("chat_id", String(chatId));
  formData.append(
    "document",
    new Blob([fileData as BlobPart], { type: "application/pdf" }),
    filename,
  );
  if (caption) {
    formData.append("caption", caption);
  }

  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`[Telegram:sendDocument] Error ${res.status}:`, body);
    throw new Error(`Telegram sendDocument failed: ${res.status}`);
  }
}
