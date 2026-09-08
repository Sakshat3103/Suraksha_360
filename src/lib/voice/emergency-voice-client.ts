export interface EmergencyVoiceResult {
  emergency: boolean;
  confidence: number;
  category: "harassment" | "stalking" | "kidnapping" | "assault" | "panic" | "medical" | "accident" | "unknown";
  usedMock: boolean;
}

// Dedicated client for the emergency-voice classifier kind. Kept separate
// from requestAI() (which returns a chat-style {text} shape) since this
// route returns structured emergency fields instead.
export async function classifyEmergencyVoice(transcript: string): Promise<EmergencyVoiceResult> {
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "emergency-voice", input: { transcript } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("classification failed");
    return await res.json();
  } catch {
    return { emergency: false, confidence: 0, category: "unknown", usedMock: true };
  }
}
