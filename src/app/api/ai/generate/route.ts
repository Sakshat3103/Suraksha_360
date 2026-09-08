import { NextResponse } from "next/server";
import { callGemini } from "@/lib/ai/gemini";
import {
  riskAnalysisPrompt,
  safeHavenPrompt,
  communitySummaryPrompt,
  copilotPrompt,
  type RiskAnalysisInput,
  type SafeHavenInput,
  type CommunitySummaryInput,
  type CopilotContext,
} from "@/lib/ai/prompts";
import { mockRiskAnalysis, mockSafeHavenReason, mockCommunitySummary, mockCopilotReply } from "@/lib/ai/mock";

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
      default:
        return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
