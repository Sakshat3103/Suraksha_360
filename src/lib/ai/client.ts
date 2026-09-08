// Client-side helper for calling the /api/ai/generate route. Every AI
// feature in the app (risk narration, safe-haven reasons, community
// summaries, the copilot) goes through this one function.
export interface AIResponse {
  text: string;
  usedMock: boolean;
  riskLevel?: "Low" | "Medium" | "High";
}

export async function requestAI(kind: string, input: unknown): Promise<AIResponse> {
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, input }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error("AI request failed");
    return await res.json();
  } catch {
    return { text: "AI reasoning is temporarily unavailable — showing rule-based analysis only.", usedMock: true };
  }
}
