"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { collection, doc, getDoc, getDocs, orderBy, query as firestoreQuery } from "firebase/firestore";
import { firestore } from "../../../lib/firebase";

type ReceiptShipment = {
  trackingNumber: string;
  customerName?: string; receiverEmail?: string;
  senderName?: string; senderEmail?: string; senderPhone?: string; senderCompany?: string; senderAddress?: string;
  origin?: string; destination?: string; status?: string; service?: string; carrier?: string;
  description?: string; weight?: string; pieces?: number; progress?: number;
  currentLocation?: string; eta?: string; updatedAt?: string;
};
type ReceiptEvent = { id?: string; label: string; location: string; details: string; eventTime: string };

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-KW", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuwait",
  }).format(date);
}

export function ReceiptView({ trackingNumber }: { trackingNumber: string }) {
  const [shipment, setShipment] = useState<ReceiptShipment | null>(null);
  const [events, setEvents] = useState<ReceiptEvent[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [shipmentRow, eventRows] = await Promise.all([
          getDoc(doc(firestore, "shipments", trackingNumber)),
          getDocs(firestoreQuery(collection(firestore, "shipments", trackingNumber, "events"), orderBy("eventTime", "desc"))),
        ]);
        if (cancelled) return;
        if (!shipmentRow.exists()) { setState("missing"); return; }
        setShipment(shipmentRow.data() as ReceiptShipment);
        setEvents(eventRows.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ReceiptEvent, "id">) })));
        setState("ready");
        if (new URLSearchParams(window.location.search).get("print") === "1") {
          window.setTimeout(() => window.print(), 600);
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [trackingNumber]);

  if (state === "loading") {
    return <main className="receipt-wrap"><div className="receipt-sheet receipt-state">Preparing shipping receipt…</div></main>;
  }

  if (state === "missing" || state === "error" || !shipment) {
    return (
      <main className="receipt-wrap">
        <div className="receipt-sheet receipt-state">
          <strong>{state === "missing" ? "Receipt not found." : "Receipt unavailable."}</strong>
          <p>{state === "missing"
            ? `We could not find a shipment with tracking number ${trackingNumber}.`
            : "The receipt service could not load this shipment. Please try again."}</p>
          <Link href={`/track?tracking=${encodeURIComponent(trackingNumber)}`} className="receipt-print receipt-state-link">Go to shipment tracking</Link>
        </div>
      </main>
    );
  }

  const progress = Math.max(0, Math.min(100, Number(shipment.progress) || 0));
  const generatedAt = formatDate(new Date().toISOString());

  return (
    <main className="receipt-wrap">
      <div className="receipt-toolbar">
        <Link href={`/track?tracking=${encodeURIComponent(trackingNumber)}`} className="receipt-tool-link"><ArrowLeft size={15} /> Back to tracking</Link>
        <button type="button" onClick={() => window.print()} className="receipt-print"><Printer size={15} /> Print / Save as PDF</button>
      </div>

      <div className="receipt-sheet">
        <header className="receipt-head">
          <div className="receipt-brand">
            <span className="brand-mark"><i /><i /><i /></span>
            <span className="receipt-wordmark">REDLINE<small>KUWAIT LOGISTICS</small></span>
          </div>
          <div className="receipt-title">
            <strong>SHIPPING RECEIPT</strong>
            <span>Receipt No. {trackingNumber}</span>
          </div>
        </header>
        <div className="receipt-company">
          <span>Block 1, Street 17, Shuwaikh Industrial, Kuwait</span>
          <span>+965 2228 6400</span>
          <span>hello@redlinekw.com</span>
          <span>www.redlinekw.com</span>
        </div>

        <section className="receipt-summary">
          <div>
            <small>TRACKING NUMBER</small>
            <h1>{shipment.trackingNumber}</h1>
          </div>
          <div className="receipt-status-box">
            <small>SHIPMENT STATUS</small>
            <span className="receipt-status">{shipment.status ?? "—"}</span>
          </div>
        </section>

        <div className="receipt-route">
          <div className="receipt-route-head"><em>ROUTE PROGRESS</em><span>{progress}% complete</span></div>
          <div className="receipt-bar"><i style={{ width: `${progress}%` }} /></div>
        </div>

        <section className="receipt-parties">
          <div>
            <h3>SHIP FROM · SENDER</h3>
            <strong>{shipment.senderCompany || shipment.senderName || "RedLine customer"}</strong>
            {shipment.senderCompany && shipment.senderName ? <span>Attn: {shipment.senderName}</span> : null}
            {shipment.senderAddress ? <span>{shipment.senderAddress}</span> : null}
            {shipment.senderEmail ? <span>{shipment.senderEmail}</span> : null}
            {shipment.senderPhone ? <span>{shipment.senderPhone}</span> : null}
          </div>
          <div>
            <h3>DELIVER TO · RECEIVER</h3>
            <strong>{shipment.customerName ?? "—"}</strong>
            {shipment.receiverEmail ? <span>{shipment.receiverEmail}</span> : null}
            <span>{shipment.destination ?? "—"}</span>
          </div>
        </section>

        <section className="receipt-grid">
          <div><small>SERVICE</small><strong>{shipment.service ?? "—"}</strong></div>
          <div><small>CARRIER</small><strong>{shipment.carrier ?? "—"}</strong></div>
          <div><small>ORIGIN</small><strong>{shipment.origin ?? "—"}</strong></div>
          <div><small>DESTINATION</small><strong>{shipment.destination ?? "—"}</strong></div>
          <div><small>CURRENT LOCATION</small><strong>{shipment.currentLocation ?? "—"}</strong></div>
          <div><small>ESTIMATED ARRIVAL</small><strong>{formatDate(shipment.eta)}</strong></div>
        </section>

        <table className="receipt-table">
          <thead><tr><th>Cargo description</th><th>Weight</th><th>Pieces</th></tr></thead>
          <tbody><tr><td>{shipment.description ?? "General cargo"}</td><td>{shipment.weight || "—"}</td><td>{shipment.pieces ?? "—"}</td></tr></tbody>
        </table>

        {events.length > 0 && (
          <>
            <h3 className="receipt-section-title">Shipment milestones</h3>
            <table className="receipt-table">
              <thead><tr><th>Date &amp; time</th><th>Milestone</th><th>Location</th><th>Details</th></tr></thead>
              <tbody>
                {events.map((item) => (
                  <tr key={item.id ?? `${item.label}-${item.eventTime}`}>
                    <td>{formatDate(item.eventTime)}</td><td>{item.label}</td><td>{item.location}</td><td>{item.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <p className="receipt-terms">
          This receipt confirms that RedLine Kuwait Logistics has accepted the shipment described above for transport and handling.
          Delivery is subject to RedLine standard conditions of carriage. This is a computer-generated receipt and is valid without a
          physical signature. Verify this shipment at any time using the tracking number above on www.redlinekw.com/track.
        </p>

        <section className="receipt-sign">
          <div><span>Issued by · RedLine Kuwait Operations</span><i /><small>Signature &amp; company stamp</small></div>
          <div><span>Received by</span><i /><small>Signature &amp; date</small></div>
        </section>

        <footer className="receipt-foot">
          <span>Thank you for shipping with RedLine.</span>
          <span>Questions about this shipment? +965 2228 6400 · care@redlinekw.com</span>
          <span>Last updated {formatDate(shipment.updatedAt)} · Generated {generatedAt}</span>
        </footer>
      </div>
    </main>
  );
}
