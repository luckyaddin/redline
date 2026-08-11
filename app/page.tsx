import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Globe2,
  PackageCheck,
  Plane,
  Quote,
  ShieldCheck,
  Ship,
  Star,
  Truck,
} from "lucide-react";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";

const services = [
  {
    icon: Plane,
    tag: "01",
    title: "Air freight",
    copy: "Priority and consolidated air cargo from Kuwait to major global gateways.",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=85",
  },
  {
    icon: Ship,
    tag: "02",
    title: "Ocean freight",
    copy: "FCL and LCL services with dependable port handling and customs support.",
    image:
      "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=85",
  },
  {
    icon: Truck,
    tag: "03",
    title: "GCC road transport",
    copy: "Scheduled and express road freight across Kuwait and the Gulf region.",
    image:
      "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=85",
  },
];

const stats = [
  ["12+", "Years moving Kuwait"],
  ["48", "Countries served"],
  ["98.7%", "On-time deliveries"],
  ["24/7", "Shipment visibility"],
];

export default function Home() {
  return (
    <main>
      <SiteHeader />

      <section className="hero-shell">
        <div className="hero-media" />
        <div className="hero-overlay" />
        <div className="container hero-content">
          <div className="eyebrow eyebrow-light">
            <span /> Kuwait&apos;s confident shipping partner
          </div>
          <h1>
            Moving Kuwait.
            <br />
            <em>Delivering the world.</em>
          </h1>
          <p>
            Fast, secure freight solutions built around your business—with one
            team, one clear plan and complete shipment visibility.
          </p>
          <div className="hero-actions">
            <Link href="/track" className="button button-red">
              Track a shipment <ArrowRight size={18} />
            </Link>
            <Link href="/quote" className="button button-ghost">
              Request a quote
            </Link>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack" aria-hidden="true">
              <span>FA</span>
              <span>YM</span>
              <span>SA</span>
            </div>
            <div>
              <div className="stars" aria-label="5 out of 5 stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={13} fill="currentColor" />
                ))}
              </div>
              <small>Trusted by 600+ businesses across Kuwait</small>
            </div>
          </div>
        </div>
        <div className="route-ribbon">
          <div className="container ribbon-inner">
            <div><span>KWI</span><strong>Kuwait City</strong></div>
            <div className="route-line"><i /><Truck size={18} /><i /></div>
            <div className="route-end"><span>GCC + WORLD</span><strong>Everywhere you trade</strong></div>
            <div className="ribbon-status"><b>●</b> Network operating normally</div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-grid">
          <span>Trusted logistics for</span>
          <b>ALSHAYA</b>
          <b>KUWAIT AIRWAYS</b>
          <b>AGILITY</b>
          <b>MAERSK</b>
          <b>GULF CABLE</b>
        </div>
      </section>

      <section className="section services-section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow"><span /> Built for every route</div>
              <h2>One partner. Every way to ship.</h2>
            </div>
            <p>
              From urgent documents to full container loads, our Kuwait team
              builds the right route, mode and schedule around your cargo.
            </p>
          </div>
          <div className="service-grid">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article className="service-card" key={service.title}>
                  <div className="service-image" style={{ backgroundImage: `url(${service.image})` }}>
                    <span className="service-number">{service.tag}</span>
                    <span className="service-icon"><Icon size={22} /></span>
                  </div>
                  <div className="service-copy">
                    <h3>{service.title}</h3>
                    <p>{service.copy}</p>
                    <Link href="/services">Explore service <ArrowRight size={16} /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section control-section">
        <div className="container control-grid">
          <div className="control-visual">
            <div className="map-panel">
              <div className="map-route route-one" />
              <div className="map-route route-two" />
              <div className="map-pin pin-a"><span>KWI</span></div>
              <div className="map-pin pin-b"><span>DXB</span></div>
              <div className="map-pin pin-c"><span>DOH</span></div>
              <div className="live-card">
                <span className="live-dot" />
                <div><small>LIVE SHIPMENT</small><strong>RLK-98476351</strong></div>
                <b>In transit</b>
              </div>
              <div className="arrival-card">
                <PackageCheck size={24} />
                <div><small>ESTIMATED ARRIVAL</small><strong>Today, 4:30 PM</strong></div>
              </div>
            </div>
          </div>
          <div className="control-copy">
            <div className="eyebrow eyebrow-light"><span /> Clarity at every mile</div>
            <h2>Stay in control from pickup to proof of delivery.</h2>
            <p>
              Our connected operations give your team the information it needs
              without chasing updates or waiting for callbacks.
            </p>
            <ul>
              <li><Clock3 size={19} /><span><strong>Real-time milestones</strong>Live location and delivery events in one clear timeline.</span></li>
              <li><ShieldCheck size={19} /><span><strong>Proactive exception care</strong>A real person responds before a delay becomes a problem.</span></li>
              <li><Globe2 size={19} /><span><strong>One global view</strong>Every air, ocean and road shipment in the same place.</span></li>
            </ul>
            <Link href="/track" className="text-link-light">See our tracking experience <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="container stats-grid">
          {stats.map(([value, label]) => (
            <div key={label}><strong>{value}</strong><span>{label}</span></div>
          ))}
        </div>
      </section>

      <section className="section testimonial-section">
        <div className="container testimonial-grid">
          <div className="testimonial-mark"><Quote size={34} /></div>
          <blockquote>
            “RedLine understands the pace of retail in Kuwait. Their team gives
            us answers quickly, handles every exception and keeps our stores
            moving.”
            <footer>
              <strong>Noura Al-Sabah</strong>
              <span>Supply Chain Director, Waha Retail Group</span>
            </footer>
          </blockquote>
          <div className="testimonial-metric">
            <span>OTIF PERFORMANCE</span>
            <strong>99.2%</strong>
            <small>Across 1,240 deliveries</small>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container cta-inner">
          <div>
            <div className="eyebrow eyebrow-light"><span /> Start a conversation</div>
            <h2>Have cargo to move?</h2>
            <p>Tell our Kuwait team what you need. We&apos;ll build the route.</p>
          </div>
          <Link href="/quote" className="button button-white">Get your quote <ArrowRight size={18} /></Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
