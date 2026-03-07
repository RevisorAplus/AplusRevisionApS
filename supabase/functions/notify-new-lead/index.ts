import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadPayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  source?: string;
  language?: string;
}

async function sendEmail(lead: LeadPayload): Promise<void> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  const body = `
Ny henvendelse fra hjemmesiden

Navn: ${lead.name}
Email: ${lead.email}
Telefon: ${lead.phone || "Ikke angivet"}
Virksomhed: ${lead.company || "Ikke angivet"}
Besked: ${lead.message || "Ingen besked"}
Kilde: ${lead.source || "ukendt"}
Sprog: ${lead.language || "ukendt"}
  `.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: "revisor@aplusrevision.dk",
      subject: `Ny henvendelse fra ${lead.name}${lead.company ? ` (${lead.company})` : ""}`,
      text: body,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    throw new Error(`Email send failed: ${err}`);
  }
}

async function sendSMS(lead: LeadPayload): Promise<void> {
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
  const NOTIFY_PHONE = Deno.env.get("NOTIFY_PHONE") || "+4550295159";

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.warn("Twilio credentials not set, skipping SMS");
    return;
  }

  const message = `Ny kunde henvendelse!\nNavn: ${lead.name}\nTlf: ${lead.phone || "ikke angivet"}\nEmail: ${lead.email}${lead.company ? `\nFirma: ${lead.company}` : ""}`;

  const params = new URLSearchParams({
    To: NOTIFY_PHONE,
    From: TWILIO_FROM_NUMBER,
    Body: message,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Twilio error:", err);
    throw new Error(`SMS send failed: ${err}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const lead: LeadPayload = await req.json();

    const results = await Promise.allSettled([sendEmail(lead), sendSMS(lead)]);

    const errors = results
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason?.message);

    if (errors.length === results.length) {
      return new Response(JSON.stringify({ error: errors.join(", ") }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, warnings: errors.length > 0 ? errors : undefined }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-new-lead error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
