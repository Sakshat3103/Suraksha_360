// Server-only wrapper around Twilio's SMS API. Never imported from client
// components — see /api/notify/sms, which holds the auth token server-side.
// When TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER aren't
// all configured, sendSms logs the message and returns a "mock" result
// instead of throwing, so the rest of the SOS flow keeps working even
// before a real Twilio account is wired up (same pattern as gemini.ts).
export interface SendSmsResult {
  sent: boolean;
  usedMock: boolean;
  error?: string;
}

export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(`[sms mock] Would send to ${to}: ${body}`);
    return { sent: true, usedMock: true };
  }

  try {
    // Lazy import: keeps the twilio SDK (and its transitive deps) out of
    // any bundle that doesn't actually need it.
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);
    await client.messages.create({ to, from: fromNumber, body });
    return { sent: true, usedMock: false };
  } catch (err) {
    console.error("Twilio SMS send failed:", err);
    return { sent: false, usedMock: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
