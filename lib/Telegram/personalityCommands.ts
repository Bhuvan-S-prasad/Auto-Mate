import { prisma } from "@/lib/prisma";
import sendMessage from "@/lib/Telegram/send-message";
import { formatDateIST, formatTimeIST } from "@/lib/utils/istDate";

export async function handleSetPersonality(userId: string, text: string, telegramChatId: number) {
  const instruction = text.replace(/^\/setpersonality/i, "").trim();

  if (!instruction) {
    const helpMsg = `To set your personality, send:
/setpersonality [your instruction]

Examples:
/setpersonality Be casual and friendly, like a helpful colleague.
/setpersonality Be strict and direct. Point out my mistakes clearly.

Visit the settings page to choose from preset styles.`;
    await sendMessage(telegramChatId, helpMsg);
    return;
  }

  if (instruction.length > 500) {
    await sendMessage(telegramChatId, "That's a bit long — keep it under 500 characters.");
    return;
  }

  try {
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { preferences: true } 
    });
    
    if (!user) {
      await sendMessage(telegramChatId, "User not found.");
      return;
    }

    const sanitizedInstruction = instruction.replace(/\n{2,}/g, '\n');
    const newPersonality = {
      instruction: sanitizedInstruction,
      label: "Custom",
      updatedAt: new Date().toISOString()
    };
    
    await prisma.$executeRaw`
      UPDATE users
      SET preferences = jsonb_set(
        COALESCE(preferences::jsonb, '{}'::jsonb),
        '{personality}',
        CAST(${JSON.stringify(newPersonality)} AS jsonb),
        true
      )
      WHERE id = ${userId}
    `;

    const preview = sanitizedInstruction.slice(0, 100) + (sanitizedInstruction.length > 100 ? "..." : "");
    const confirmMsg = `Got it! I'll respond with this style from now on:

${preview}

Send /mypersonality to see your full setting, or
/setpersonality [new instruction] to change it.`;
    
    await sendMessage(telegramChatId, confirmMsg);
  } catch (error) {
    console.error("Error setting personality:", error);
    await sendMessage(telegramChatId, "Sorry, I couldn't save your personality setting right now.");
  }
}

export async function handleMyPersonality(userId: string, telegramChatId: number) {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { preferences: true } 
    });
    
    if (!user) {
      await sendMessage(telegramChatId, "User not found.");
      return;
    }

    const prefs = user.preferences as Record<string, unknown> | null;
    const p = prefs?.personality as Record<string, unknown> | undefined;

    if (!p || typeof p.instruction !== 'string') {
      const noneMsg = `You haven't set a personality yet. Send:
/setpersonality [your instruction]
or visit the settings page to choose a preset.`;
      await sendMessage(telegramChatId, noneMsg);
      return;
    }

    const label = (p.label as string) || "Custom";
    const instruction = p.instruction;
    let updatedAtStr = "Unknown";
    
    if (p.updatedAt) {
      const d = new Date(p.updatedAt as string);
      updatedAtStr = `${formatDateIST(d)} ${formatTimeIST(d)}`;
    }

    const msg = `Your current personality setting (${label}):

${instruction}

Updated: ${updatedAtStr}

Send /setpersonality [new text] to change it.`;
    
    await sendMessage(telegramChatId, msg);
  } catch (error) {
    console.error("Error getting personality:", error);
    await sendMessage(telegramChatId, "Sorry, I couldn't retrieve your personality setting right now.");
  }
}

export async function handleClearPersonality(userId: string, telegramChatId: number) {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { preferences: true } 
    });
    
    if (!user) {
      await sendMessage(telegramChatId, "User not found.");
      return;
    }

    await prisma.$executeRaw`
      UPDATE users
      SET preferences = preferences::jsonb - 'personality'
      WHERE id = ${userId}
    `;

    await sendMessage(telegramChatId, "Personality setting cleared. I'll use my default style from now on.");
  } catch (error) {
    console.error("Error clearing personality:", error);
    await sendMessage(telegramChatId, "Sorry, I couldn't clear your personality setting right now.");
  }
}
