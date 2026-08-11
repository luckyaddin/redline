import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, Globe2, HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { InnerPageHero } from "../components/InnerPageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "About Us",
  description: "RedLine Kuwait Logistics — Kuwaiti at heart, global by design. Learn about our story, values and the 86-member team behind every shipment.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <main><SiteHeader /><InnerPageHero kicker="Kuwaiti at heart. Global by design." title="Logistics made personal." copy="RedLine was built in Kuwait around a simple belief: customers deserve clear answers, responsible ownership and a team that treats every shipment like it matters." image="/images/premium-gulf-fulfillment-warehouse.png" cta={{ label: "Meet our Kuwait team", href: "/contact" }} />
    <section className="section story-section"><div className="container story-grid"><div><div className="eyebrow"><span /> Our story</div><h2>From one red truck to a connected global network.</h2><p>RedLine began with local deliveries in Shuwaikh and a promise to communicate better. Today, we coordinate road, air and ocean freight across 48 countries—while keeping the same hands-on service our first customers trusted.</p><p>Our headquarters, control tower and customer care team remain in Kuwait, close to the businesses and communities we serve.</p><Link href="/quote" className="inline-red-link">Move with RedLine <ArrowRight size={16} /></Link></div><div className="story-visual"><div className="story-number"><strong>2014</strong><span>Founded in Kuwait</span></div><div className="story-image" /></div></div></section>
    <section className="values-section"><div className="container"><div className="values-head"><span className="page-kicker">How we work</span><h2>Four promises behind every shipment.</h2></div><div className="values-grid"><article><HeartHandshake /><h3>We own the outcome.</h3><p>One accountable lead stays with your shipment from plan to proof of delivery.</p></article><article><ShieldCheck /><h3>We protect the details.</h3><p>Documents, cargo handling and milestones are checked before they become risks.</p></article><article><Globe2 /><h3>We connect clearly.</h3><p>Global reach is useful only when local communication stays simple and fast.</p></article><article><Award /><h3>We improve every route.</h3><p>Performance data helps us make the next movement safer and more efficient.</p></article></div></div></section>
    <section className="section team-section"><div className="container team-grid"><div className="team-image" /><div><span className="page-kicker">People behind the movement</span><h2>A local team with global experience.</h2><p>Freight forwarding, customs, warehouse and final-mile specialists work side by side in our Kuwait operations center.</p><div className="team-stats"><div><Users size={20} /><strong>86</strong><span>Kuwait team members</span></div><div><Globe2 size={20} /><strong>14</strong><span>Languages spoken</span></div></div><Link href="/contact" className="button button-red">Contact the team <ArrowRight size={17} /></Link></div></div></section><SiteFooter /></main>;
}
