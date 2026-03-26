import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("Webhook hit");

  const body = await req.json();
  console.log("Incoming Telegram Update:", body);

  const message = body.message?.text;
  const chatId = body.message?.chat?.id;

  if (!message || !chatId) {
    return NextResponse.json({ status: "ignored" });
  }

  console.log("User:", message);

  return NextResponse.json({ status: "ok" });
}
