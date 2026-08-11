type ShipmentEmailData = {
  trackingNumber: string;
  receiverEmail: string;
  customerName: string;
  origin: string;
  destination: string;
  status: string;
  service: string;
  description: string;
  weight: string;
  pieces: number;
  progress: number;
  currentLocation: string;
  eta: string;
  updatedAt: string;
  senderName?: string;
  senderCompany?: string;
};

type EmailKind = "created" | "status-update";

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-KW", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kuwait",
  }).format(date);
}

function emailHtml(shipment: ShipmentEmailData, kind: EmailKind, siteUrl: string) {
  const isCreated = kind === "created";
  const heading = isCreated ? "Your shipment is on our network." : `Shipment update: ${shipment.status}`;
  const intro = isCreated
    ? `We have created shipment ${shipment.trackingNumber} for ${shipment.customerName}. You can follow every milestone using the tracking link below.`
    : `Your shipment has moved to a new milestone. Its latest status is ${shipment.status} at ${shipment.currentLocation}.`;
  const trackingUrl = `${siteUrl}/track?tracking=${encodeURIComponent(shipment.trackingNumber)}`;
  const safeProgress = Math.max(0, Math.min(100, shipment.progress));

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;background:#f1f1f0;font-family:Arial,Helvetica,sans-serif;color:#202123">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(intro)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f1f0;padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;width:100%;background:#ffffff;border-collapse:collapse;box-shadow:0 12px 38px rgba(0,0,0,.08)">
      <tr><td style="background:#18191b;padding:26px 34px;border-top:5px solid #d71920">
        <table role="presentation" width="100%"><tr><td>
          <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:3px">/// REDLINE</div>
          <div style="color:#9ea0a4;font-size:8px;letter-spacing:2px;margin-top:5px">KUWAIT LOGISTICS</div>
        </td><td align="right"><span style="display:inline-block;background:#2a2b2e;color:#d8d9da;font-size:9px;letter-spacing:1px;padding:9px 12px">SHIPMENT NOTICE</span></td></tr></table>
      </td></tr>
      <tr><td style="padding:38px 34px 12px">
        <div style="color:#d71920;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">${isCreated ? "Shipment confirmed" : "Status notification"}</div>
        <h1 style="font-size:30px;line-height:1.15;letter-spacing:-.7px;margin:12px 0 14px;color:#202123">${escapeHtml(heading)}</h1>
        <p style="font-size:14px;line-height:1.75;color:#686a6e;margin:0">${escapeHtml(intro)}</p>
      </td></tr>
      <tr><td style="padding:22px 34px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f4f2;border-left:4px solid #d71920">
          <tr><td style="padding:20px 22px"><div style="font-size:8px;color:#8a8c90;letter-spacing:1.3px">TRACKING NUMBER</div><div style="font-size:20px;font-weight:800;margin-top:6px">${escapeHtml(shipment.trackingNumber)}</div></td>
          <td style="padding:20px 22px" align="right"><div style="font-size:8px;color:#8a8c90;letter-spacing:1.3px">CURRENT STATUS</div><div style="display:inline-block;background:#d71920;color:#fff;font-size:10px;font-weight:800;padding:8px 11px;margin-top:6px">${escapeHtml(shipment.status)}</div></td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 34px 8px">
        <table role="presentation" width="100%"><tr><td style="font-size:10px;font-weight:700">Route progress</td><td align="right" style="font-size:11px;font-weight:800;color:#d71920">${safeProgress}%</td></tr></table>
        <div style="height:7px;background:#e7e7e7;margin-top:9px"><div style="width:${safeProgress}%;height:7px;background:#d71920"></div></div>
      </td></tr>
      <tr><td style="padding:24px 34px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7e7e7;border-bottom:1px solid #e7e7e7">
          <tr><td colspan="2" style="padding:17px 0;border-bottom:1px solid #e7e7e7"><div style="font-size:8px;color:#929499;letter-spacing:1px">SENDER</div><div style="font-size:12px;font-weight:700;margin-top:5px">${escapeHtml(shipment.senderCompany || shipment.senderName || "RedLine customer")}${shipment.senderName && shipment.senderCompany ? ` · ${escapeHtml(shipment.senderName)}` : ""}</div></td></tr>
          <tr><td width="50%" style="padding:17px 8px 17px 0;border-right:1px solid #e7e7e7"><div style="font-size:8px;color:#929499;letter-spacing:1px">FROM</div><div style="font-size:12px;font-weight:700;margin-top:5px">${escapeHtml(shipment.origin)}</div></td><td width="50%" style="padding:17px 0 17px 20px"><div style="font-size:8px;color:#929499;letter-spacing:1px">TO</div><div style="font-size:12px;font-weight:700;margin-top:5px">${escapeHtml(shipment.destination)}</div></td></tr>
          <tr><td width="50%" style="padding:17px 8px 17px 0;border-top:1px solid #e7e7e7;border-right:1px solid #e7e7e7"><div style="font-size:8px;color:#929499;letter-spacing:1px">CURRENT LOCATION</div><div style="font-size:12px;font-weight:700;margin-top:5px">${escapeHtml(shipment.currentLocation)}</div></td><td width="50%" style="padding:17px 0 17px 20px;border-top:1px solid #e7e7e7"><div style="font-size:8px;color:#929499;letter-spacing:1px">ESTIMATED ARRIVAL</div><div style="font-size:12px;font-weight:700;margin-top:5px">${escapeHtml(formatDate(shipment.eta))}</div></td></tr>
          <tr><td width="50%" style="padding:17px 8px 17px 0;border-top:1px solid #e7e7e7;border-right:1px solid #e7e7e7"><div style="font-size:8px;color:#929499;letter-spacing:1px">SERVICE</div><div style="font-size:12px;font-weight:700;margin-top:5px">${escapeHtml(shipment.service)}</div></td><td width="50%" style="padding:17px 0 17px 20px;border-top:1px solid #e7e7e7"><div style="font-size:8px;color:#929499;letter-spacing:1px">CARGO</div><div style="font-size:12px;font-weight:700;margin-top:5px">${escapeHtml(shipment.description)} · ${escapeHtml(shipment.pieces)} pcs</div></td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:4px 34px 36px"><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#d71920;color:#fff;text-decoration:none;font-size:12px;font-weight:800;padding:15px 26px">Track this shipment&nbsp;&nbsp;→</a><div style="font-size:9px;color:#9a9ca0;margin-top:14px">Last updated ${escapeHtml(formatDate(shipment.updatedAt))}</div></td></tr>
      <tr><td style="background:#202123;padding:24px 34px;color:#9ea0a4;font-size:10px;line-height:1.65"><strong style="display:block;color:#fff;margin-bottom:5px">Need help with this shipment?</strong>Call +965 2228 6400 or reply to this email. RedLine Kuwait Operations is available 24/7.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function emailText(shipment: ShipmentEmailData, kind: EmailKind, siteUrl: string) {
  const heading = kind === "created" ? "Your RedLine shipment has been created" : `Shipment status: ${shipment.status}`;
  return `${heading}\n\nTracking number: ${shipment.trackingNumber}\nStatus: ${shipment.status}\nCurrent location: ${shipment.currentLocation}\nRoute: ${shipment.origin} to ${shipment.destination}\nProgress: ${shipment.progress}%\nEstimated arrival: ${formatDate(shipment.eta)}\n\nTrack: ${siteUrl}/track?tracking=${encodeURIComponent(shipment.trackingNumber)}\n\nRedLine Kuwait Logistics\n+965 2228 6400`;
}

export async function sendShipmentEmail(shipment: ShipmentEmailData, kind: EmailKind, siteUrl: string) {
  const runtime = process.env;
  const apiKey = runtime.RESEND_API_KEY;
  const from = runtime.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { sent: false, message: "Email service is not configured yet." };

  const subject = kind === "created"
    ? `Shipment created · ${shipment.trackingNumber}`
    : `${shipment.status} · ${shipment.trackingNumber}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `${kind}-${shipment.trackingNumber}-${shipment.updatedAt}`.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 256),
    },
    body: JSON.stringify({
      from,
      to: [shipment.receiverEmail],
      subject,
      html: emailHtml(shipment, kind, siteUrl),
      text: emailText(shipment, kind, siteUrl),
      ...(runtime.RESEND_REPLY_TO ? { reply_to: runtime.RESEND_REPLY_TO } : {}),
      tags: [
        { name: "category", value: "shipment_update" },
        { name: "tracking", value: shipment.trackingNumber.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 256) },
      ],
    }),
  });
  if (!response.ok) return { sent: false, message: "Shipment saved, but Resend could not deliver the notification." };
  const result = (await response.json()) as { id?: string };
  return { sent: true, id: result.id ?? null, message: "Notification email sent." };
}
