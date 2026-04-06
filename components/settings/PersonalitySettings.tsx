"use client";

import { useState, useEffect } from "react";
import { PERSONALITY_PRESETS } from "@/lib/constants/personality";

export default function PersonalitySettings() {
  const [currentInstruction, setCurrentInstruction] = useState<string>("");
  const [currentLabel, setCurrentLabel] = useState<string>("");
  const [draftInstruction, setDraftInstruction] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    fetchPersonality();
  }, []);

  const fetchPersonality = async () => {
    try {
      const res = await fetch("/api/user/personality");
      if (res.ok) {
        const data = await res.json();
        if (data.instruction) {
          setCurrentInstruction(data.instruction);
          setCurrentLabel(data.label || "Custom");
          setDraftInstruction(data.instruction);
          if (data.label && data.label !== "Custom") {
            setSelectedPreset(data.label);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearPersonality = async () => {
    if (!confirm("This will reset to default style. Are you sure?")) return;
    setIsClearing(true);
    try {
      const res = await fetch("/api/user/personality", { method: "DELETE" });
      if (res.ok) {
        setCurrentInstruction("");
        setCurrentLabel("");
        setDraftInstruction("");
        setSelectedPreset(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/user/personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: draftInstruction,
          label: selectedPreset || "Custom",
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      setCurrentInstruction(data.instruction);
      setCurrentLabel(data.label);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePresetSelect = (label: string, instruction: string) => {
    setDraftInstruction(instruction);
    setSelectedPreset(label);
  };

  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftInstruction(e.target.value);
    setSelectedPreset(null);
  };

  const isOverLimit = draftInstruction.length > 500;
  const isNearLimit = draftInstruction.length > 480;
  const isUnchanged = draftInstruction === currentInstruction;
  const isEmpty = draftInstruction.trim() === "";
  const saveDisabled = isEmpty || isOverLimit || isUnchanged || isSaving;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10 w-full">
      {/* 1. CURRENT SETTING */}
      {currentInstruction && (
        <section className="bg-card/50 p-6 rounded-2xl border border-white/5 space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Current Personality
            </h2>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-semibold rounded-full border border-primary/20">
                {currentLabel}
              </span>
              <button
                onClick={clearPersonality}
                disabled={isClearing}
                className="text-xs text-red-400 hover:text-red-300 transition px-3 py-1 bg-red-400/10 rounded-full cursor-pointer"
              >
                {isClearing ? "Clearing..." : "Clear"}
              </button>
            </div>
          </div>
          <div className="p-4 bg-background/50 rounded-xl border border-white/5 text-sm text-gray-300 leading-relaxed shadow-inner">
            {currentInstruction}
          </div>
        </section>
      )}

      {/* 2. PRESET TEMPLATES */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Presets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PERSONALITY_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.label;
            return (
              <button
                key={preset.label}
                onClick={() =>
                  handlePresetSelect(preset.label, preset.instruction)
                }
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.15)] scale-[1.02]"
                    : "border-white/5 bg-card/40 hover:border-white/15 hover:bg-card/60"
                }`}
              >
                <div
                  className={`font-semibold text-sm mb-2 ${
                    isSelected ? "text-primary" : "text-white"
                  }`}
                >
                  {preset.label}
                </div>
                <div className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                  {preset.instruction}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. INSTRUCTION TEXTAREA */}
      <section className="space-y-3">
        <label className="text-sm font-semibold text-gray-300 block">
          Your personality instruction
        </label>
        <textarea
          value={draftInstruction}
          onChange={handleDraftChange}
          disabled={isSaving}
          placeholder="Describe how you want the AI to respond..."
          className="w-full min-h-[120px] p-4 bg-card/50 border border-white/10 rounded-xl focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y text-sm transition-all shadow-inner leading-relaxed"
        />
        <div className="flex justify-end">
          <span
            className={`text-xs font-mono transition-colors ${
              isOverLimit
                ? "text-red-500 font-bold"
                : isNearLimit
                  ? "text-orange-400"
                  : "text-gray-500"
            }`}
          >
            {draftInstruction.length} / 500
          </span>
        </div>
      </section>

      {/* 4. SAVE BUTTON */}
      <div className="flex justify-end gap-3 items-center pt-2">
        {saveStatus === "error" && (
          <span className="text-red-400 text-sm font-medium">
            Failed to save
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saveDisabled}
          className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            saveDisabled
              ? "bg-white/5 text-white/30 cursor-not-allowed"
              : "bg-primary text-black hover:opacity-90 active:scale-[0.98] shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.25)] hover:shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.4)]"
          }`}
        >
          {isSaving ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );
}
