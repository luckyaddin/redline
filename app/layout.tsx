import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://redlinekw.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RedLine Kuwait Logistics | Freight Without Friction",
    template: "%s | RedLine Kuwait Logistics",
  },
  description: "Premium air, ocean and road freight services from Kuwait, with real-time shipment tracking and dedicated logistics support across 48 countries.",
  keywords: ["Kuwait logistics", "freight Kuwait", "air freight Kuwait", "ocean freight Shuwaikh", "GCC road transport", "Kuwait customs clearance", "warehousing Kuwait", "shipment tracking", "RedLine logistics"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "RedLine Kuwait Logistics",
    title: "RedLine Kuwait Logistics | Freight Without Friction",
    description: "Premium air, ocean and road freight services from Kuwait, with real-time shipment tracking and dedicated logistics support across 48 countries.",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "RedLine Kuwait Logistics — air, ocean and road freight from Kuwait" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RedLine Kuwait Logistics | Freight Without Friction",
    description: "Premium air, ocean and road freight services from Kuwait, with real-time shipment tracking and dedicated logistics support across 48 countries.",
    images: ["/images/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
