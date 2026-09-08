export interface SendSmsClientResult {
  sent: boolean;
  usedMock: boolean;
  error?: string;
}

// Client-side helper for /api/notify/sms — the only way an SMS actually
// leaves the app. `to` must be one of the caller's own emergency contacts
// (enforced server-side).
export async function sendSmsNotification(to: string, message: string): Promise<SendSmsClientResult> {
  try {
    const res = await fetch("/api/notify/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { sent: false, usedMock: false, error: err.error ?? "SMS request failed" };
    }
    return await res.json();
  } catch {
    return { sent: false, usedMock: false, error: "Network error" };
  }
}
