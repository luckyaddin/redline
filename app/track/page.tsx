import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { TrackingExperience } from "./TrackingExperience";

export const metadata = {
  title: "Track Your Shipment | RedLine Kuwait Logistics",
  description: "Follow your RedLine shipment with live milestones, location and delivery status.",
};

export default function TrackingPage() {
  return (
    <main className="tracking-page">
      <SiteHeader />
      <section className="tracking-intro">
        <div className="container tracking-intro-inner">
          <div><span className="page-kicker">Shipment visibility</span><h1>Track every move.</h1></div>
          <p>Enter your RedLine tracking number for the latest location, route details and delivery estimate.</p>
        </div>
      </section>
      <TrackingExperience />
      <SiteFooter />
    </main>
  );
}
