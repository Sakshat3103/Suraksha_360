import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms/twilio";

// Sends a real SMS to one of the caller's own emergency contacts. Requires
// an authenticated session and validates the phone number belongs to a
// contact the user actually owns, so this can't be used as an open SMS
// relay. See src/lib/sms/twilio.ts for the mock fallback when Twilio
// credentials aren't configured.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.to || !body?.message) {
    return NextResponse.json({ error: "Missing 'to' or 'message'" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: contact } = await supabase
    .from("emergency_contacts")
    .select("id, phone")
    .eq("user_id", user.id)
    .eq("phone", body.to)
    .maybeSingle();

  if (!contact) {
    return NextResponse.json({ error: "Recipient is not one of your trusted contacts" }, { status: 403 });
  }

  const result = await sendSms(body.to, body.message);
  return NextResponse.json(result);
}
