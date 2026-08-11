import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Box, Boxes, Check, PackageCheck, Plane, Ship, Truck, Warehouse } from "lucide-react";
import { InnerPageHero } from "../components/InnerPageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Freight Services",
  description: "Air freight, ocean freight, GCC road transport, Kuwait distribution, warehousing and project cargo — every mode managed by one accountable RedLine team.",
  alternates: { canonical: "/services" },
};

const modes = [
  { icon: Plane, title: "Air freight", copy: "Priority, charter and consolidated services via Kuwait International Airport.", details: ["Airport-to-airport", "Door-to-door", "Dangerous goods handling"] },
  { icon: Ship, title: "Ocean freight", copy: "FCL and LCL solutions through Shuwaikh and Shuaiba, managed end to end.", details: ["Full containers", "Consolidation", "Port & customs support"] },
  { icon: Truck, title: "GCC road freight", copy: "Daily road connections across the Gulf with tracked, dependable line-haul.", details: ["Express vehicles", "FTL and LTL", "Cross-border clearance"] },
  { icon: PackageCheck, title: "Kuwait distribution", copy: "Same-day and scheduled delivery coverage across every governorate.", details: ["Retail replenishment", "Final-mile delivery", "Proof of delivery"] },
  { icon: Warehouse, title: "Warehousing", copy: "Flexible storage, pick-and-pack and inventory programs in Kuwait.", details: ["Secure storage", "Order fulfilment", "Returns management"] },
  { icon: Boxes, title: "Project cargo", copy: "Planning and execution for oversized, sensitive and high-value movements.", details: ["Route surveys", "Special equipment", "On-site supervision"] },
];

export default function ServicesPage() {
  return <main><SiteHeader /><InnerPageHero kicker="Freight solutions" title="Every mode. One accountable team." copy="The right combination of air, ocean, road and warehousing—designed and managed from Kuwait by people who understand your cargo." image="/images/gulf-cargo-aircraft-sunrise.png" cta={{ label: "Build my shipment plan", href: "/quote" }} />
    <section className="section inner-section"><div className="container"><div className="section-head"><div><div className="eyebrow"><span /> Complete logistics portfolio</div><h2>Built around the shipment—not the other way around.</h2></div><p>Use one service or combine several. Your RedLine lead coordinates every handoff, document and update.</p></div><div className="mode-grid">{modes.map(({ icon: Icon, title, copy, details }, index) => <article key={title}><div className="mode-icon"><Icon size={25} /></div><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p><ul>{details.map((detail) => <li key={detail}><Check size={13} />{detail}</li>)}</ul><Link href="/quote">Request this service <ArrowRight size={15} /></Link></article>)}</div></div></section>
    <section className="service-feature"><div className="container service-feature-grid"><div className="feature-image warehouse-image" /><div><div className="eyebrow eyebrow-light"><span /> Kuwait fulfilment</div><h2>Storage that moves at the pace of your orders.</h2><p>Our warehouse team receives, stores, picks, packs and dispatches your inventory with one connected record from inbound receipt to delivery.</p><div className="feature-facts"><span><Box size={19} /><strong>Barcode accuracy</strong><small>Scan-led inventory handling</small></span><span><Warehouse size={19} /><strong>Flexible capacity</strong><small>Scale with seasonal demand</small></span></div><Link className="text-link-light" href="/contact">Talk to a warehouse specialist <ArrowRight size={16} /></Link></div></div></section>
    <section className="cta-section"><div className="container cta-inner"><div><div className="eyebrow eyebrow-light"><span /> Route consultation</div><h2>Not sure which mode fits?</h2><p>Send us the cargo details. We&apos;ll recommend the best route.</p></div><Link href="/quote" className="button button-white">Ask RedLine <ArrowRight size={18} /></Link></div></section><SiteFooter /></main>;
}
