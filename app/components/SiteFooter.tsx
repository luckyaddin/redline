import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="brand brand-footer">
            <span className="brand-mark"><i /><i /><i /></span>
            <span><strong>REDLINE</strong><small>KUWAIT LOGISTICS</small></span>
          </Link>
          <p>Clear routes. Confident delivery. Logistics built for Kuwait and connected to the world.</p>
          <span className="kuwait-badge">Proudly headquartered in Kuwait</span>
        </div>
        <div><h3>Company</h3><Link href="/about">About RedLine</Link><Link href="/services">Our services</Link><Link href="/contact">Contact</Link></div>
        <div><h3>Support</h3><Link href="/track">Track shipment</Link><Link href="/quote">Request a quote</Link><a href="mailto:care@redlinekw.com">Customer care</a><Link href="/contact">FAQs</Link></div>
        <div className="footer-contact"><h3>Kuwait office</h3><p><MapPin size={16} /> Block 1, Street 17<br />Shuwaikh Industrial</p><a href="tel:+96522286400"><Phone size={16} /> +965 2228 6400</a><a href="mailto:hello@redlinekw.com"><Mail size={16} /> hello@redlinekw.com</a><Link href="/contact">Get directions <ArrowUpRight size={15} /></Link></div>
      </div>
      <div className="container footer-bottom"><span>© 2026 RedLine Kuwait Logistics. All rights reserved.</span><div><a href="#">Privacy</a><a href="#">Terms</a></div></div>
    </footer>
  );
}
