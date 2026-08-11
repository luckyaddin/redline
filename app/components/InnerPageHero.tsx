import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function InnerPageHero({ kicker, title, copy, image, cta }: { kicker: string; title: string; copy: string; image: string; cta?: { label: string; href: string } }) {
  return <section className="inner-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(15,16,18,.95),rgba(15,16,18,.62),rgba(15,16,18,.1)),url(${image})` }}>
    <div className="container inner-hero-content"><span className="page-kicker">{kicker}</span><h1>{title}</h1><p>{copy}</p>{cta && <Link href={cta.href} className="button button-red">{cta.label}<ArrowRight size={17} /></Link>}</div>
  </section>;
}
