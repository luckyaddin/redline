"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  Box,
  Check,
  Clock,
  Clock3,
  FileText,
  Gauge,
  Info,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Wifi,
} from "lucide-react";
import { collection, doc, getDoc, getDocs, orderBy, query as firestoreQuery } from "firebase/firestore";
import { RealtimeMap } from "./RealtimeMap";
import { firestore } from "../../lib/firebase";
import { progressForStatus, statusDescription } from "../../lib/shipment-status";

type Shipment = {
  trackingNumber: string;
  customerName: string;
  origin: string;
  destination: string;
  status: string;
  service: string;
  description: string;
  category?: string;
  weight: string;
  pieces: number;
  progress: number;
  currentLocation: string;
  eta: string;
  expectedShippingDate?: string;
  carrier: string;
  updatedAt: string;
  createdAt?: string;
  publicNotes?: string;
  senderName?: string;
  senderCompany?: string;
  latitude: number;
  longitude: number;
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  packageImageUrl?: string;
};

type ShipmentEvent = {
  id?: string | number;
  label: string;
  location: string;
  details: string;
  eventTime: string;
  completed: boolean;
};

const sampleShipment: Shipment = {
  trackingNumber: "RLK-98476351",
  customerName: "Al Noor Trading Co.",
  origin: "Shuwaikh, Kuwait",
  destination: "Dubai, UAE",
  status: "In transit",
  service: "GCC Road Express",
  category: "Industrial Equipment",
  description: "Retail display equipment",
  weight: "4,860 kg",
  pieces: 18,
  progress: 72,
  currentLocation: "Al Sila Border, UAE",
  eta: "2026-08-11T13:30:00.000Z",
  carrier: "RedLine Direct",
  updatedAt: "2026-08-10T12:20:00.000Z",
  latitude: 24.1103,
  longitude: 51.67,
  originLatitude: 29.3759,
  originLongitude: 47.9774,
  destinationLatitude: 25.2048,
  destinationLongitude: 55.2708,
};

const sampleEvents: ShipmentEvent[] = [
  { label: "Crossed into UAE", location: "Al Sila Border, UAE", details: "Line-haul vehicle cleared border control.", eventTime: "2026-08-10T12:20:00.000Z", completed: true },
  { label: "Departed Kuwait hub", location: "Sulaibiya Logistics Hub", details: "Vehicle sealed and dispatched for Dubai.", eventTime: "2026-08-10T04:45:00.000Z", completed: true },
  { label: "Shipment collected", location: "Shuwaikh Industrial, Kuwait", details: "Cargo collected and verified against manifest.", eventTime: "2026-08-09T15:10:00.000Z", completed: true },
];

const quickShipments: Shipment[] = [
  sampleShipment,
  { ...sampleShipment, trackingNumber: "RLK-73149206", customerName: "Marina Medical Supplies", destination: "Doha, Qatar", status: "Customs clearance", progress: 54, latitude: 25.2731, longitude: 51.6081, destinationLatitude: 25.2854, destinationLongitude: 51.531 },
  { ...sampleShipment, trackingNumber: "RLK-42018635", customerName: "Sadu Home Collection", origin: "Mina Abdullah, Kuwait", destination: "Riyadh, Saudi Arabia", status: "Picked up", progress: 26, latitude: 28.965, longitude: 48.18, originLatitude: 28.965, originLongitude: 48.18, destinationLatitude: 24.7136, destinationLongitude: 46.6753 },
  { ...sampleShipment, trackingNumber: "AMG123456789", customerName: "Kuwait Retail Distribution", origin: "Shuwaikh Logistics Center, Kuwait", destination: "Jeddah, Saudi Arabia", status: "Pending", service: "GCC Road Express", category: "Commercial Goods", description: "Pending dispatch cargo", weight: "1,200 kg", pieces: 4, progress: 5, currentLocation: "Shuwaikh Industrial, Kuwait", eta: "2026-09-04T12:00:00.000Z", expectedShippingDate: "2026-09-01T08:00:00.000Z", publicNotes: "Shipment information has been received and the package is awaiting processing.", latitude: 29.3759, longitude: 47.9774, originLatitude: 29.3759, originLongitude: 47.9774, destinationLatitude: 21.5433, destinationLongitude: 39.1728 },
];

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-KW", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kuwait",
  }).format(date);
}

export function TrackingExperience() {
  const [query, setQuery] = useState(() => {
    if (typeof window !== "undefined") {
      const fromLink = new URLSearchParams(window.location.search).get("tracking")?.trim().toUpperCase();
      return fromLink || sampleShipment.trackingNumber;
    }
    return sampleShipment.trackingNumber;
  });
  const [shipment, setShipment] = useState<Shipment>(sampleShipment);
  const [events, setEvents] = useState<ShipmentEvent[]>(sampleEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeDetailTab, setActiveDetailTab] = useState<"cargo" | "order" | "notes">("cargo");
  const [mapRefreshSeconds, setMapRefreshSeconds] = useState(10);
  const [supportPhone, setSupportPhone] = useState("+965 2228 6400");

  async function loadShipment(trackingNumber: string, quiet = false) {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const [shipmentRow, eventRows, settingsRow] = await Promise.all([
        getDoc(doc(firestore, "shipments", trackingNumber)),
        getDocs(firestoreQuery(collection(firestore, "shipments", trackingNumber, "events"), orderBy("eventTime", "desc"))),
        getDoc(doc(firestore, "operationSettings", "kuwait")),
      ]);

      if (!shipmentRow.exists()) {
        // Check if matching quick shipment demo
        const demoMatch = quickShipments.find((s) => s.trackingNumber.toUpperCase() === trackingNumber);
        if (demoMatch) {
          setShipment(demoMatch);
          setEvents([
            {
              label: demoMatch.status,
              location: demoMatch.currentLocation,
              details: demoMatch.publicNotes || statusDescription(demoMatch.status),
              eventTime: demoMatch.updatedAt,
              completed: true,
            },
          ]);
          return;
        }
        throw new Error(`Tracking number "${trackingNumber}" was not found on our network.`);
      }

      const data = shipmentRow.data() as Shipment;
      setShipment(data);
      const evts = eventRows.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ShipmentEvent, "id">) }));
      setEvents(
        evts.length > 0
          ? evts
          : [
              {
                label: data.status,
                location: data.currentLocation,
                details: data.publicNotes || statusDescription(data.status),
                eventTime: data.updatedAt || new Date().toISOString(),
                completed: true,
              },
            ]
      );

      const settingsData = settingsRow.data();
      setMapRefreshSeconds(Number(settingsData?.mapRefreshSeconds ?? 10));
      setSupportPhone(typeof settingsData?.supportPhone === "string" && settingsData.supportPhone.trim() ? settingsData.supportPhone : "+965 2228 6400");
    } catch (err) {
      if (trackingNumber !== sampleShipment.trackingNumber || !quiet) {
        setError(err instanceof Error ? err.message : "Tracking unavailable");
      }
      if (trackingNumber === sampleShipment.trackingNumber) {
        setShipment(sampleShipment);
        setEvents(sampleEvents);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const fromLink = new URLSearchParams(window.location.search).get("tracking")?.trim().toUpperCase();
    const initialTracking = fromLink || sampleShipment.trackingNumber;

    (async () => {
      try {
        const [shipmentRow, eventRows, settingsRow] = await Promise.all([
          getDoc(doc(firestore, "shipments", initialTracking)),
          getDocs(firestoreQuery(collection(firestore, "shipments", initialTracking, "events"), orderBy("eventTime", "desc"))),
          getDoc(doc(firestore, "operationSettings", "kuwait")),
        ]);
        if (!active) return;
        if (shipmentRow.exists()) {
          const data = shipmentRow.data() as Shipment;
          setShipment(data);
          const evts = eventRows.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ShipmentEvent, "id">) }));
          setEvents(
            evts.length > 0
              ? evts
              : [
                  {
                    label: data.status,
                    location: data.currentLocation,
                    details: data.publicNotes || statusDescription(data.status),
                    eventTime: data.updatedAt || new Date().toISOString(),
                    completed: true,
                  },
                ]
          );
        } else {
          const demoMatch = quickShipments.find((s) => s.trackingNumber.toUpperCase() === initialTracking);
          if (demoMatch) {
            setShipment(demoMatch);
            setEvents([
              {
                label: demoMatch.status,
                location: demoMatch.currentLocation,
                details: demoMatch.publicNotes || statusDescription(demoMatch.status),
                eventTime: demoMatch.updatedAt,
                completed: true,
              },
            ]);
          }
        }
        const settingsData = settingsRow.data();
        if (settingsData?.mapRefreshSeconds) setMapRefreshSeconds(Number(settingsData.mapRefreshSeconds));
        if (settingsData?.supportPhone) setSupportPhone(settingsData.supportPhone);
      } catch {
        // Fallback demo handled
      }
    })();

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void loadShipment(shipment.trackingNumber, true), mapRefreshSeconds * 1_000);
    return () => window.clearInterval(timer);
  }, [shipment.trackingNumber, mapRefreshSeconds]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim().toUpperCase();
    if (value) void loadShipment(value);
  }

  const isPending = /pending/i.test(shipment.status);
  const isDelivered = /delivered/i.test(shipment.status);
  const statusNote = shipment.publicNotes || statusDescription(shipment.status);
  const progressVal = shipment.progress ?? progressForStatus(shipment.status) ?? 5;

  return (
    <section className="tracking-workspace">
      <div className="container tracking-app">
        {/* Tracking Search Sidebar */}
        <aside className="tracking-sidebar">
          <form onSubmit={submit} className="tracking-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tracking number"
              placeholder="e.g. AMG123456789"
            />
            <button type="submit" aria-label="Search shipment"><SlidersHorizontal size={17} /></button>
          </form>
          {error && <p className="tracking-error">{error}</p>}

          <div className="recent-label">
            <span>Sample active shipments</span>
            <b>{quickShipments.length}</b>
          </div>

          <div className="shipment-list">
            {quickShipments.map((item) => (
              <button
                key={item.trackingNumber}
                className={item.trackingNumber === shipment.trackingNumber ? "shipment-row active" : "shipment-row"}
                onClick={() => {
                  setQuery(item.trackingNumber);
                  void loadShipment(item.trackingNumber);
                }}
              >
                <span className="shipment-avatar">
                  {item.customerName.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                </span>
                <span className="shipment-person">
                  <strong>{item.customerName}</strong>
                  <small><i /> {item.status}</small>
                  <em>{item.trackingNumber}</em>
                </span>
                <span className="shipment-contact"><Phone size={12} /><MessageCircle size={12} /></span>
              </button>
            ))}
          </div>

          <div className="sidebar-account-prompt">
            <ShieldCheck size={18} />
            <div>
              <strong>Are you the recipient?</strong>
              <p>Sign in to your private Customer Account to view receipts and communicate with support.</p>
              <Link href="/account/login" className="account-prompt-link">
                Sign in to Customer Portal <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          <div className="sidebar-help">
            <span>Need a human?</span>
            <strong>Our Kuwait care team is online.</strong>
            <a href={`tel:${supportPhone.replace(/[^+\d]/g, "")}`}>Call {supportPhone}</a>
          </div>
        </aside>

        {/* Main Live Tracking Pane */}
        <div className={loading ? "tracking-main is-loading" : "tracking-main"}>
          {/* Status Message Highlight Banner */}
          <div className={`tracking-status-banner ${isPending ? "banner-pending" : isDelivered ? "banner-delivered" : "banner-active"}`}>
            <div className="status-banner-content">
              <div className="status-banner-badge">
                <Clock3 size={16} />
                <span>{shipment.status.toUpperCase()}</span>
              </div>
              <p>{statusNote}</p>
            </div>
            <div className="status-banner-meta">
              <span>ESTIMATED DELIVERY</span>
              <strong>{formatDate(shipment.eta)}</strong>
            </div>
          </div>

          {/* Interactive Route Map */}
          <div className="tracking-map live-map-shell">
            <RealtimeMap
              key={shipment.trackingNumber}
              trackingNumber={shipment.trackingNumber}
              current={{ lat: shipment.latitude, lng: shipment.longitude }}
              origin={{ lat: shipment.originLatitude, lng: shipment.originLongitude }}
              destination={{ lat: shipment.destinationLatitude, lng: shipment.destinationLongitude }}
            />
            <div className="map-live-badge">
              <Wifi size={14} />
              <span>
                <strong>LIVE LOCATION</strong>
                <small>Refreshes every {mapRefreshSeconds} seconds</small>
              </span>
            </div>
            <div className="map-callout origin-callout">
              <small>PICKUP / ORIGIN</small>
              <strong>{shipment.origin}</strong>
            </div>
            <div className="map-callout destination-callout">
              <small>DESTINATION</small>
              <strong>{shipment.destination}</strong>
            </div>
            <div className="location-strip">
              <div>
                <small>CURRENT LOCATION</small>
                <strong>{shipment.currentLocation}</strong>
              </div>
              <div>
                <small>CURRENT STATUS</small>
                <strong>{shipment.status}</strong>
              </div>
              <div>
                <small>LAST UPDATE</small>
                <strong>{formatDate(shipment.updatedAt)}</strong>
              </div>
            </div>
          </div>

          {/* Shipment Details & Timeline */}
          <div className="tracking-detail-grid">
            <div className="shipment-details">
              <div className="detail-tabs">
                <button
                  className={activeDetailTab === "cargo" ? "active" : ""}
                  onClick={() => setActiveDetailTab("cargo")}
                >
                  Vehicle &amp; Cargo
                </button>
                <button
                  className={activeDetailTab === "order" ? "active" : ""}
                  onClick={() => setActiveDetailTab("order")}
                >
                  Order Specifications
                </button>
                <button
                  className={activeDetailTab === "notes" ? "active" : ""}
                  onClick={() => setActiveDetailTab("notes")}
                >
                  Public Notes
                </button>
                <Link
                  className="receipt-tab"
                  href={`/receipt/${shipment.trackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText size={12} /> Print receipt
                </Link>
              </div>

              <div className="progress-header">
                <span>{progressVal}% route progress</span>
                <small>{shipment.trackingNumber}</small>
              </div>
              <div className="progress-track">
                <i style={{ width: `${progressVal}%` }} />
              </div>

              {activeDetailTab === "cargo" && (
                <>
                  <div className="vehicle-card">
                    <div className="truck-illustration"><Truck size={65} /></div>
                    <div>
                      <small>CARRIER</small>
                      <strong>{shipment.carrier}</strong>
                      <span>{shipment.service}</span>
                    </div>
                    <div>
                      <small>WEIGHT &amp; QTY</small>
                      <strong>{shipment.weight}</strong>
                      <span>{shipment.pieces} pieces</span>
                    </div>
                    <div>
                      <small>CARGO</small>
                      <strong>{shipment.description}</strong>
                      <span>{shipment.category || "General freight"}</span>
                    </div>
                  </div>

                  {shipment.packageImageUrl && (
                    <div className="package-photo">
                      <small>VERIFIED PACKAGE PHOTO</small>
                      <img src={shipment.packageImageUrl} alt={`Package for ${shipment.trackingNumber}`} loading="lazy" />
                    </div>
                  )}

                  <div className="tracking-metrics">
                    <div>
                      <Gauge size={18} />
                      <span>
                        <small>TRANSIT MODE</small>
                        <strong>{shipment.service}</strong>
                      </span>
                    </div>
                    <div>
                      <Clock3 size={18} />
                      <span>
                        <small>ESTIMATED ARRIVAL</small>
                        <strong>{formatDate(shipment.eta)}</strong>
                      </span>
                    </div>
                    <div>
                      <Box size={18} />
                      <span>
                        <small>HANDLING STATUS</small>
                        <strong>{isPending ? "Pre-registered" : "Active Transit"}</strong>
                      </span>
                    </div>
                  </div>
                </>
              )}

              {activeDetailTab === "order" && (
                <div className="order-specs-panel">
                  <div className="specs-grid">
                    <div>
                      <small>TRACKING NUMBER</small>
                      <strong>{shipment.trackingNumber}</strong>
                    </div>
                    <div>
                      <small>SHIPPING SERVICE</small>
                      <strong>{shipment.service}</strong>
                    </div>
                    <div>
                      <small>PACKAGE CATEGORY</small>
                      <strong>{shipment.category || "General Cargo"}</strong>
                    </div>
                    <div>
                      <small>CARGO PIECES</small>
                      <strong>{shipment.pieces} unit(s)</strong>
                    </div>
                    <div>
                      <small>DECLARED WEIGHT</small>
                      <strong>{shipment.weight}</strong>
                    </div>
                    {shipment.expectedShippingDate && (
                      <div>
                        <small>EXPECTED SHIPPING DATE</small>
                        <strong>{formatDate(shipment.expectedShippingDate)}</strong>
                      </div>
                    )}
                    <div>
                      <small>EXPECTED DELIVERY (ETA)</small>
                      <strong>{formatDate(shipment.eta)}</strong>
                    </div>
                    <div>
                      <small>CARRIER / OPERATOR</small>
                      <strong>{shipment.carrier}</strong>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === "notes" && (
                <div className="order-notes-panel">
                  <div className="notes-box">
                    <Info size={18} />
                    <div>
                      <strong>Operational Tracking Notes</strong>
                      <p>{statusNote}</p>
                    </div>
                  </div>
                  {isPending && (
                    <div className="pending-advisory">
                      <Clock size={16} />
                      <span>
                        This shipment has been officially pre-registered in the RedLine Kuwait logistics network.
                        Live transport telemetry will update as soon as the vehicle departs origin facility.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Event Milestone Timeline */}
            <aside className="delivery-timeline">
              <h3>Milestone History</h3>
              <div className="timeline-list">
                {events.map((item, index) => (
                  <div className="timeline-item" key={`${item.label}-${index}`}>
                    <span className="timeline-dot"><Check size={10} /></span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.location}</small>
                      {item.details && <p className="timeline-text">{item.details}</p>}
                      <em>{formatDate(item.eventTime)}</em>
                    </div>
                  </div>
                ))}
                {!isDelivered && (
                  <div className="timeline-item future">
                    <span className="timeline-dot" />
                    <div>
                      <strong>Delivered</strong>
                      <small>{shipment.destination}</small>
                      <em>Expected {formatDate(shipment.eta)}</em>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
