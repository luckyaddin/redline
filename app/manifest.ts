import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RedLine Kuwait Logistics",
    short_name: "RedLine",
    description: "Premium air, ocean and road freight services from Kuwait, with real-time shipment tracking and dedicated logistics support.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#d71920",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
