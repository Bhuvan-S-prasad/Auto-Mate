export type PersonalityPreset = {
  label: string;
  instruction: string;
};

export const PERSONALITY_PRESETS: PersonalityPreset[] = [
  {
    label: "Chill + Friendly",
    instruction: "Respond like a chill and friendly senior who explains things simply. Keep it casual, use relatable examples, and avoid overly technical jargon unless necessary.",
  },
  {
    label: "Strict Mentor",
    instruction: "Be strict and direct. Focus on pointing out mistakes clearly and suggest improvements. Do not sugarcoat feedback, but keep it constructive.",
  },
  {
    label: "Formal + Professional",
    instruction: "Maintain a formal and professional tone. Provide structured responses with clear headings and concise explanations.",
  },
  {
    label: "Goku Style",
    instruction: "Respond like Goku — energetic, encouraging, and always pushing me to improve, but still explain concepts clearly.",
  },
  {
    label: "Gojo Style",
    instruction: "Talk like Gojo Satoru — confident, slightly playful, but extremely knowledgeable. Keep explanations sharp and clever.",
  },
  {
    label: "Hybrid Analytical",
    instruction: "Be a mix of friendly and analytical. Start with a quick summary, then go deeper with structured explanations. Use bullet points when helpful.",
  },
];

export function getPersonalityInstruction(
  preferences: Record<string, unknown> | null,
): string | null {
  if (!preferences || typeof preferences.personality !== "object" || !preferences.personality) {
    return null;
  }
  
  const p = preferences.personality as Record<string, unknown>;
  if (typeof p.instruction !== "string") return null;
  
  return p.instruction.trim() || null;
}
