import Link from "next/link";
import { ArrowUpRight, Languages, MapPin } from "lucide-react";

export function SiteHeader() {
  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span><MapPin size={13} /> Shuwaikh Industrial, Kuwait</span>
          <div><a href="tel:+96522286400">+965 2228 6400</a><span className="divider" /><button type="button"><Languages size={13} /> العربية</button></div>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand" aria-label="RedLine Kuwait Logistics home">
            <span className="brand-mark"><i /><i /><i /></span>
            <span><strong>REDLINE</strong><small>KUWAIT LOGISTICS</small></span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/services">Services</Link>
            <Link href="/track">Tracking</Link>
            <Link href="/about">Company</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <div className="header-actions">
            <Link href="/quote" className="nav-quote">Get a quote <ArrowUpRight size={16} /></Link>
          </div>
        </div>
      </header>
    </>
  );
}
