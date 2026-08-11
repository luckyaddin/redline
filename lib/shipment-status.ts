export const SHIPMENT_STATUS_STEPS = [
  { label: "Shipment created", progress: 5 },
  { label: "Order received", progress: 8 },
  { label: "Pickup scheduled", progress: 12 },
  { label: "Picked up", progress: 20 },
  { label: "Arrived at sorting warehouse", progress: 30 },
  { label: "Sorting at warehouse", progress: 36 },
  { label: "Departed origin facility", progress: 45 },
  { label: "In transit", progress: 58 },
  { label: "At border checkpoint", progress: 66 },
  { label: "Customs clearance", progress: 72 },
  { label: "Arrived at destination hub", progress: 82 },
  { label: "Out for delivery", progress: 92 },
  { label: "Delivered", progress: 100 },
  { label: "Pending review", progress: null },
  { label: "On hold", progress: null },
  { label: "Delivery exception", progress: null },
] as const;

export function progressForStatus(status: string): number | null {
  const normalized = status.trim().toLowerCase();
  const match = SHIPMENT_STATUS_STEPS.find((step) => step.label.toLowerCase() === normalized);
  return match?.progress ?? null;
}

export function interpolateRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  progress: number,
) {
  const ratio = Math.max(0, Math.min(100, progress)) / 100;
  return {
    latitude: origin.latitude + (destination.latitude - origin.latitude) * ratio,
    longitude: origin.longitude + (destination.longitude - origin.longitude) * ratio,
  };
}
