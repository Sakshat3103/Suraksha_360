import { NextResponse } from "next/server";
import { callGemini } from "@/lib/ai/gemini";
import {
  riskAnalysisPrompt,
  safeHavenPrompt,
  communitySummaryPrompt,
  copilotPrompt,
  emergencyVoicePrompt,
  type RiskAnalysisInput,
  type SafeHavenInput,
  type CommunitySummaryInput,
  type CopilotContext,
  type EmergencyVoiceInput,
  type EmergencyVoiceResult,
} from "@/lib/ai/prompts";
import { mockRiskAnalysis, mockSafeHavenReason, mockCommunitySummary, mockCopilotReply, mockEmergencyVoiceClassification } from "@/lib/ai/mock";

// Gemini sometimes wraps JSON in ```json fences or adds stray text despite
// instructions — this pulls out the first {...} block and validates shape,
// falling back to the mock classifier on any parse failure so the feature
// never silently breaks.
function parseEmergencyVoiceResult(raw: string | null, input: EmergencyVoiceInput): { result: EmergencyVoiceResult; usedMock: boolean } {
  if (raw) {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const category = ["harassment", "stalking", "kidnapping", "assault", "panic", "medical", "accident", "unknown"].includes(parsed.category)
          ? parsed.category
          : "unknown";
        if (typeof parsed.emergency === "boolean" && typeof parsed.confidence === "number") {
          return {
            result: { emergency: parsed.emergency, confidence: Math.max(0, Math.min(1, parsed.confidence)), category },
            usedMock: false,
          };
        }
      }
    } catch {
      // fall through to mock
    }
  }
  return { result: mockEmergencyVoiceClassification(input), usedMock: true };
}

// Single entry point for every AI capability in the app (risk narration,
// safe-haven reasoning, community summaries, the copilot). Keeping the
// Gemini call server-side means the API key never reaches the browser.
// When GEMINI_API_KEY isn't set, or the call fails/times out, this falls
// back to the deterministic mock generators — the response shape is
// identical either way, so the UI never needs to know which path ran.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.kind) {
    return NextResponse.json({ error: "Missing 'kind'" }, { status: 400 });
  }

  try {
    switch (body.kind) {
      case "risk": {
        const input = body.input as RiskAnalysisInput;
        const prompt = riskAnalysisPrompt(input);
        const gemini = await callGemini(prompt);
        return NextResponse.json({ text: gemini ?? mockRiskAnalysis(input), usedMock: !gemini });
      }
      case "safe-haven": {
        const input = body.input as SafeHavenInput;
        const prompt = safeHavenPrompt(input);
        const gemini = await callGemini(prompt);
        return NextResponse.json({ text: gemini ?? mockSafeHavenReason(input), usedMock: !gemini });
      }
      case "community-summary": {
        const input = body.input as CommunitySummaryInput;
        const prompt = communitySummaryPrompt(input);
        const gemini = await callGemini(prompt);
        const mock = mockCommunitySummary(input);
        return NextResponse.json({ text: gemini ?? mock.text, riskLevel: mock.riskLevel, usedMock: !gemini });
      }
      case "copilot": {
        const input = body.input as CopilotContext;
        const prompt = copilotPrompt(input);
        const gemini = await callGemini(prompt);
        return NextResponse.json({ text: gemini ?? mockCopilotReply(input), usedMock: !gemini });
      }
      case "emergency-voice": {
        const input = body.input as EmergencyVoiceInput;
        const prompt = emergencyVoicePrompt(input);
        const gemini = await callGemini(prompt);
        const { result, usedMock } = parseEmergencyVoiceResult(gemini, input);
        return NextResponse.json({ ...result, usedMock });
      }
      default:
        return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
