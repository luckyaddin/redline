"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Box, Check, Clock3, Gauge, MessageCircle, Phone, Search, SlidersHorizontal, Truck, Wifi } from "lucide-react";
import { collection, doc, getDoc, getDocs, orderBy, query as firestoreQuery } from "firebase/firestore";
import { RealtimeMap } from "./RealtimeMap";
import { firestore } from "../../lib/firebase";

type Shipment = {
  trackingNumber: string; customerName: string; origin: string; destination: string;
  status: string; service: string; description: string; weight: string; pieces: number;
  progress: number; currentLocation: string; eta: string; carrier: string; updatedAt: string;
  latitude: number; longitude: number; originLatitude: number; originLongitude: number;
  destinationLatitude: number; destinationLongitude: number;
  packageImageUrl?: string;
};
type ShipmentEvent = { id?: string | number; label: string; location: string; details: string; eventTime: string; completed: boolean };

const sampleShipment: Shipment = {
  trackingNumber: "RLK-98476351", customerName: "Al Noor Trading Co.", origin: "Shuwaikh, Kuwait",
  destination: "Dubai, UAE", status: "In transit", service: "GCC Road Express",
  description: "Retail display equipment", weight: "4,860 kg", pieces: 18, progress: 72,
  currentLocation: "Al Sila Border, UAE", eta: "2026-08-11T13:30:00.000Z",
  carrier: "RedLine Direct", updatedAt: "2026-08-10T12:20:00.000Z",
  latitude: 24.1103, longitude: 51.67, originLatitude: 29.3759, originLongitude: 47.9774,
  destinationLatitude: 25.2048, destinationLongitude: 55.2708,
};
const sampleEvents: ShipmentEvent[] = [
  { label: "Crossed into UAE", location: "Al Sila Border, UAE", details: "Line-haul vehicle cleared border control.", eventTime: "2026-08-10T12:20:00.000Z", completed: true },
  { label: "Departed Kuwait hub", location: "Sulaibiya Logistics Hub", details: "Vehicle sealed and dispatched for Dubai.", eventTime: "2026-08-10T04:45:00.000Z", completed: true },
  { label: "Shipment collected", location: "Shuwaikh Industrial, Kuwait", details: "Cargo collected and verified against manifest.", eventTime: "2026-08-09T15:10:00.000Z", completed: true },
];
const quickShipments = [
  sampleShipment,
  { ...sampleShipment, trackingNumber: "RLK-73149206", customerName: "Marina Medical Supplies", destination: "Doha, Qatar", status: "Customs clearance", progress: 54, latitude: 25.2731, longitude: 51.6081, destinationLatitude: 25.2854, destinationLongitude: 51.531 },
  { ...sampleShipment, trackingNumber: "RLK-42018635", customerName: "Sadu Home Collection", origin: "Mina Abdullah, Kuwait", destination: "Riyadh, Saudi Arabia", status: "Picked up", progress: 26, latitude: 28.965, longitude: 48.18, originLatitude: 28.965, originLongitude: 48.18, destinationLatitude: 24.7136, destinationLongitude: 46.6753 },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-KW", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
}

export function TrackingExperience() {
  const [query, setQuery] = useState("RLK-98476351");
  const [shipment, setShipment] = useState<Shipment>(sampleShipment);
  const [events, setEvents] = useState<ShipmentEvent[]>(sampleEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      if (!shipmentRow.exists()) throw new Error("We could not find that tracking number.");
      setShipment(shipmentRow.data() as Shipment);
      setEvents(eventRows.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ShipmentEvent, "id">) })));
      const settingsData = settingsRow.data();
      setMapRefreshSeconds(Number(settingsData?.mapRefreshSeconds ?? 10));
      setSupportPhone(typeof settingsData?.supportPhone === "string" && settingsData.supportPhone.trim() ? settingsData.supportPhone : "+965 2228 6400");
    } catch (err) {
      if (trackingNumber !== sampleShipment.trackingNumber || !quiet) {
        setError(err instanceof Error ? err.message : "Tracking unavailable");
      }
      if (trackingNumber === sampleShipment.trackingNumber) { setShipment(sampleShipment); setEvents(sampleEvents); }
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("tracking")?.trim().toUpperCase();
    const initialTracking = fromLink || sampleShipment.trackingNumber;
    setQuery(initialTracking);
    void loadShipment(initialTracking, true);
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

  return (
    <section className="tracking-workspace">
      <div className="container tracking-app">
        <aside className="tracking-sidebar">
          <form onSubmit={submit} className="tracking-search">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Tracking number" placeholder="RLK-00000000" />
            <button type="submit" aria-label="Search shipment"><SlidersHorizontal size={17} /></button>
          </form>
          {error && <p className="tracking-error">{error}</p>}
          <div className="recent-label"><span>Recent shipments</span><b>{quickShipments.length}</b></div>
          <div className="shipment-list">
            {quickShipments.map((item) => (
              <button key={item.trackingNumber} className={item.trackingNumber === shipment.trackingNumber ? "shipment-row active" : "shipment-row"} onClick={() => { setQuery(item.trackingNumber); void loadShipment(item.trackingNumber); }}>
                <span className="shipment-avatar">{item.customerName.split(" ").slice(0, 2).map((word) => word[0]).join("")}</span>
                <span className="shipment-person"><strong>{item.customerName}</strong><small><i /> {item.status}</small><em>{item.trackingNumber}</em></span>
                <span className="shipment-contact"><Phone size={12} /><MessageCircle size={12} /></span>
              </button>
            ))}
          </div>
          <div className="sidebar-help"><span>Need a human?</span><strong>Our Kuwait care team is online.</strong><a href={`tel:${supportPhone.replace(/[^+\d]/g, "")}`}>Call {supportPhone}</a></div>
        </aside>

        <div className={loading ? "tracking-main is-loading" : "tracking-main"}>
          <div className="tracking-map live-map-shell">
            <RealtimeMap
              key={shipment.trackingNumber}
              trackingNumber={shipment.trackingNumber}
              current={{ lat: shipment.latitude, lng: shipment.longitude }}
              origin={{ lat: shipment.originLatitude, lng: shipment.originLongitude }}
              destination={{ lat: shipment.destinationLatitude, lng: shipment.destinationLongitude }}
            />
            <div className="map-live-badge"><Wifi size={14} /><span><strong>LIVE LOCATION</strong><small>Refreshes every {mapRefreshSeconds} seconds</small></span></div>
            <div className="map-callout origin-callout"><small>PICKUP</small><strong>{shipment.origin}</strong></div>
            <div className="map-callout destination-callout"><small>DESTINATION</small><strong>{shipment.destination}</strong></div>
            <div className="location-strip">
              <div><small>CURRENT LOCATION</small><strong>{shipment.currentLocation}</strong></div>
              <div><small>STATUS</small><strong>{shipment.status}</strong></div>
              <div><small>LAST UPDATE</small><strong>{formatDate(shipment.updatedAt)}</strong></div>
            </div>
          </div>

          <div className="tracking-detail-grid">
            <div className="shipment-details">
              <div className="detail-tabs"><button className="active">Vehicle & cargo</button><button>Order details</button><button>History</button><Link className="receipt-tab" href={`/receipt/${shipment.trackingNumber}`} target="_blank" rel="noopener noreferrer">Print receipt</Link></div>
              <div className="progress-header"><span>{shipment.progress}% complete</span><small>{shipment.trackingNumber}</small></div>
              <div className="progress-track"><i style={{ width: `${shipment.progress}%` }} /></div>
              <div className="vehicle-card">
                <div className="truck-illustration"><Truck size={70} /></div>
                <div><small>CARRIER</small><strong>{shipment.carrier}</strong><span>{shipment.service}</span></div>
                <div><small>WEIGHT</small><strong>{shipment.weight}</strong><span>{shipment.pieces} pieces</span></div>
                <div><small>CARGO</small><strong>{shipment.description}</strong><span>Verified manifest</span></div>
              </div>
              {shipment.packageImageUrl && (
                <div className="package-photo">
                  <small>PACKAGE PHOTO</small>
                  <img src={shipment.packageImageUrl} alt={`Package for shipment ${shipment.trackingNumber}`} loading="lazy" />
                </div>
              )}
              <div className="tracking-metrics">
                <div><Gauge size={19} /><span><small>AVERAGE SPEED</small><strong>68 km/h</strong></span></div>
                <div><Clock3 size={19} /><span><small>ESTIMATED ARRIVAL</small><strong>{formatDate(shipment.eta)}</strong></span></div>
                <div><Box size={19} /><span><small>HANDLING</small><strong>Sealed cargo</strong></span></div>
              </div>
            </div>
            <aside className="delivery-timeline">
              <h3>Delivery status</h3>
              <div className="timeline-list">
                {events.map((item, index) => (
                  <div className="timeline-item" key={`${item.label}-${index}`}>
                    <span className="timeline-dot"><Check size={10} /></span>
                    <div><strong>{item.label}</strong><small>{item.location}</small><em>{formatDate(item.eventTime)}</em></div>
                  </div>
                ))}
                <div className="timeline-item future"><span className="timeline-dot" /><div><strong>Delivered</strong><small>{shipment.destination}</small><em>Expected {formatDate(shipment.eta)}</em></div></div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
