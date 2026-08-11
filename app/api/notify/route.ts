import { sendShipmentEmail } from "../../../lib/shipment-email";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!idToken || !apiKey) return Response.json({ sent: false, message: "Firebase authentication is required." }, { status: 401 });

    const verification = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!verification.ok) return Response.json({ sent: false, message: "Your Firebase session is invalid or expired." }, { status: 401 });

    const body = (await request.json()) as { shipment?: Parameters<typeof sendShipmentEmail>[0]; kind?: "created" | "status-update" };
    if (!body.shipment || !body.kind) return Response.json({ sent: false, message: "Shipment notification data is incomplete." }, { status: 400 });
    const result = await sendShipmentEmail(body.shipment, body.kind, new URL(request.url).origin);
    return Response.json(result, { status: result.sent ? 200 : 503 });
  } catch {
    return Response.json({ sent: false, message: "The notification service could not send this email." }, { status: 500 });
  }
}
