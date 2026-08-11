import { Check, Clock3, ShieldCheck } from "lucide-react";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { QuoteForm } from "./QuoteForm";

export default function QuotePage() {
  return <main><SiteHeader /><section className="quote-hero"><div className="container quote-grid"><div className="quote-copy"><span className="page-kicker">Request a freight quote</span><h1>Tell us what needs to move.</h1><p>Share the shipment details and our Kuwait team will return a clear route, rate and timeline.</p><div className="quote-promises"><div><Clock3 /><span><strong>Fast response</strong><small>Most requests answered within one business hour.</small></span></div><div><ShieldCheck /><span><strong>No hidden surprises</strong><small>Clear inclusions, transit time and handling notes.</small></span></div><div><Check /><span><strong>One accountable contact</strong><small>A named specialist from quote to delivery.</small></span></div></div></div><QuoteForm /></div></section><SiteFooter /></main>;
}
