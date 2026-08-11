"use client";

import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import { useEffect, useRef } from "react";

type Coordinates = { lat: number; lng: number };

export function RealtimeMap({
  trackingNumber,
  current,
  origin,
  destination,
}: {
  trackingNumber: string;
  current: Coordinates;
  origin: Coordinates;
  destination: Coordinates;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const vehicleRef = useRef<Marker | null>(null);
  const routeRef = useRef<Polyline | null>(null);

  useEffect(() => {
    let disposed = false;

    async function initialize() {
      if (!containerRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (disposed || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const originPoint: [number, number] = [origin.lat, origin.lng];
      const currentPoint: [number, number] = [current.lat, current.lng];
      const destinationPoint: [number, number] = [destination.lat, destination.lng];

      L.circleMarker(originPoint, { radius: 7, color: "#d71920", weight: 3, fillColor: "#ffffff", fillOpacity: 1 })
        .bindTooltip("Pickup", { direction: "top" })
        .addTo(map);
      L.circleMarker(destinationPoint, { radius: 8, color: "#242527", weight: 3, fillColor: "#ffffff", fillOpacity: 1 })
        .bindTooltip("Destination", { direction: "top" })
        .addTo(map);

      const route = L.polyline([originPoint, currentPoint, destinationPoint], {
        color: "#d71920",
        weight: 4,
        opacity: 0.9,
        dashArray: "10 8",
      }).addTo(map);

      const vehicleIcon = L.divIcon({
        className: "live-vehicle-icon",
        html: '<span class="vehicle-pulse"></span><span class="vehicle-arrow">➤</span>',
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      });
      const vehicle = L.marker(currentPoint, { icon: vehicleIcon, zIndexOffset: 1000 })
        .bindTooltip(`${trackingNumber} · Live location`, { direction: "top", offset: [0, -18] })
        .addTo(map);

      map.fitBounds(L.latLngBounds([originPoint, destinationPoint]).pad(0.18), { animate: false });
      mapRef.current = map;
      vehicleRef.current = vehicle;
      routeRef.current = route;
    }

    void initialize();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      vehicleRef.current = null;
      routeRef.current = null;
    };
  }, [trackingNumber, origin.lat, origin.lng, destination.lat, destination.lng]);

  useEffect(() => {
    const next: [number, number] = [current.lat, current.lng];
    vehicleRef.current?.setLatLng(next);
    routeRef.current?.setLatLngs([
      [origin.lat, origin.lng],
      next,
      [destination.lat, destination.lng],
    ]);
    mapRef.current?.panTo(next, { animate: true, duration: 0.8 });
  }, [current.lat, current.lng, origin.lat, origin.lng, destination.lat, destination.lng]);

  return <div ref={containerRef} className="realtime-map-canvas" aria-label={`Live map for shipment ${trackingNumber}`} />;
}
