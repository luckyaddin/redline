export const SHIPMENT_STATUS_STEPS = [
  { label: "Pending", progress: 5, description: "Shipment information has been received and the package is awaiting processing." },
  { label: "Shipment Information Received", progress: 10, description: "Shipment information has been received and the package is awaiting processing." },
  { label: "Package Received", progress: 18, description: "Package received at origin facility." },
  { label: "Processing", progress: 25, description: "Cargo is being processed, measured and prepared for routing." },
  { label: "Ready for Dispatch", progress: 35, description: "Package sorted and ready for line-haul dispatch." },
  { label: "In Transit", progress: 50, description: "Package is moving along the designated freight route." },
  { label: "Arrived at Origin Facility", progress: 55, description: "Package arrived at origin logistics center." },
  { label: "Departed Origin Facility", progress: 60, description: "Package has departed origin facility for destination route." },
  { label: "Arrived at Transit Facility", progress: 70, description: "Package arrived at regional transit facility / border checkpoint." },
  { label: "Customs Processing", progress: 75, description: "Package is undergoing customs clearance and document verification." },
  { label: "Customs Cleared", progress: 80, description: "Customs clearance completed successfully." },
  { label: "Arrived at Destination Facility", progress: 88, description: "Package arrived at destination distribution hub." },
  { label: "Out for Delivery", progress: 94, description: "Package is with local courier and out for delivery." },
  { label: "Delivery Attempted", progress: 96, description: "Delivery was attempted. Notice left or rescheduling underway." },
  { label: "Delivered", progress: 100, description: "Package has been successfully delivered to recipient." },
  { label: "On Hold", progress: null, description: "Shipment is temporarily on hold pending documentation or instructions." },
  { label: "Delayed", progress: null, description: "Shipment is delayed due to weather, traffic, or transit conditions." },
  { label: "Cancelled", progress: null, description: "Shipment has been cancelled." },
  { label: "Returned", progress: null, description: "Package is being returned to sender." },
  // Legacy aliases for backward compatibility
  { label: "Shipment created", progress: 5, description: "Shipment information has been received and the package is awaiting processing." },
  { label: "Order received", progress: 8, description: "Order received by RedLine Operations." },
  { label: "Pickup scheduled", progress: 12, description: "Pickup scheduled with sender." },
  { label: "Picked up", progress: 20, description: "Cargo picked up and verified." },
  { label: "Arrived at sorting warehouse", progress: 30, description: "Cargo arrived at central sorting hub." },
  { label: "Sorting at warehouse", progress: 36, description: "Package undergoing sorting." },
  { label: "At border checkpoint", progress: 66, description: "Line-haul at border control checkpoint." },
  { label: "Customs clearance", progress: 72, description: "Customs clearance in progress." },
  { label: "Arrived at destination hub", progress: 82, description: "Cargo arrived at destination regional hub." },
  { label: "Pending review", progress: null, description: "Shipment under operational review." },
  { label: "Delivery exception", progress: null, description: "Delivery exception encountered." },
] as const;

export function progressForStatus(status: string): number | null {
  if (!status) return 5;
  const normalized = status.trim().toLowerCase();
  const match = SHIPMENT_STATUS_STEPS.find((step) => step.label.toLowerCase() === normalized);
  return match?.progress ?? null;
}

export function statusDescription(status: string): string {
  if (!status) return "Shipment information has been received and the package is awaiting processing.";
  const normalized = status.trim().toLowerCase();
  const match = SHIPMENT_STATUS_STEPS.find((step) => step.label.toLowerCase() === normalized);
  return match?.description ?? "Shipment is currently active on the RedLine logistics network.";
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
