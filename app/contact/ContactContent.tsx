"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import {
  cleanPhoneForTel,
  cleanPhoneForWhatsApp,
  useSiteSettings,
} from "../../lib/site-settings";

export function ContactContent() {
  const settings = useSiteSettings();

  return (
    <main>
      <SiteHeader />
      <section className="contact-hero">
        <div className="container contact-hero-grid">
          <div>
            <span className="page-kicker">Talk to RedLine</span>
            <h1>Good logistics starts with a clear conversation.</h1>
            <p>
              Speak directly with our Kuwait team about a shipment, a service
              plan or an update you need.
            </p>
          </div>
          <div className="contact-quick">
            <a href={`tel:${cleanPhoneForTel(settings.supportPhone)}`}>
              <Phone />
              <span>
                <small>CALL OUR TEAM</small>
                <strong>{settings.supportPhone || "+965 2228 6400"}</strong>
                <em>{settings.businessHours || "Operations support, 24/7"}</em>
              </span>
            </a>
            <a href={`mailto:${settings.contactEmail || "hello@redlinekw.com"}`}>
              <Mail />
              <span>
                <small>EMAIL US</small>
                <strong>{settings.contactEmail || "hello@redlinekw.com"}</strong>
                <em>{settings.emailResponseTime || "Replies within one business hour"}</em>
              </span>
            </a>
            <a
              href={`https://wa.me/${cleanPhoneForWhatsApp(settings.whatsappNumber || settings.supportPhone)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle />
              <span>
                <small>WHATSAPP</small>
                <strong>Start a conversation</strong>
                <em>Fast support for active shipments</em>
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="section contact-section">
        <div className="container contact-grid">
          <div>
            <div className="eyebrow">
              <span /> Kuwait headquarters
            </div>
            <h2>Visit our {settings.cityCountry.split(",")[0].trim() || "Shuwaikh"} operations center.</h2>
            <div className="office-details">
              <p>
                <MapPin size={19} />
                <span>
                  <strong>RedLine Kuwait Logistics</strong>
                  {settings.officeAddress || "Block 1, Street 17"}
                  <br />
                  {settings.cityCountry || "Shuwaikh Industrial, Kuwait"}
                </span>
              </p>
              <p>
                <Clock3 size={19} />
                <span>
                  <strong>Office hours</strong>
                  {settings.officeHours || "Sunday–Thursday, 8:00 AM–6:00 PM"}
                  <br />
                  {settings.businessHours || "Operations support available 24/7"}
                </span>
              </p>
            </div>
            <Link href="/quote" className="button button-red">
              Request a freight quote <ArrowRight size={17} />
            </Link>
          </div>
          <div className="contact-map">
            <div className="contact-map-grid" />
            <span className="contact-map-pin">
              <MapPin size={23} />
            </span>
            <div className="contact-map-card">
              <small>REDLINE HQ</small>
              <strong>{settings.cityCountry.split(",")[0].trim() || "Shuwaikh Industrial"}</strong>
              <span>5 minutes from Shuwaikh Port</span>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-departments">
        <div className="container department-grid">
          <div>
            <span>ACTIVE SHIPMENTS</span>
            <strong>{settings.supportEmail || "care@redlinekw.com"}</strong>
            <small>Tracking, delays and delivery support</small>
          </div>
          <div>
            <span>NEW BUSINESS & MARKETING</span>
            <strong>{settings.salesEmail || settings.contactEmail || "sales@redlinekw.com"}</strong>
            <small>Rates, contracts and marketing partnerships</small>
          </div>
          <div>
            <span>DISPATCH & OPERATIONS</span>
            <strong>{settings.dispatchEmail || "operations@redlinekw.com"}</strong>
            <small>Carrier and fleet network operations</small>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
