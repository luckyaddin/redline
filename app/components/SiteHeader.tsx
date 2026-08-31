"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ArrowUpRight, Languages, MapPin, User as UserIcon } from "lucide-react";
import { firebaseAuth } from "../../lib/firebase";

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span><MapPin size={13} /> Shuwaikh Industrial, Kuwait</span>
          <div>
            <a href="tel:+96522286400">+965 2228 6400</a>
            <span className="divider" />
            <Link href={user ? "/account/dashboard" : "/account/login"} className="topbar-portal-link">
              <UserIcon size={12} /> {user ? "My Account" : "Client Portal"}
            </Link>
            <span className="divider" />
            <button type="button"><Languages size={13} /> العربية</button>
          </div>
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
            <Link
              href={user ? "/account/dashboard" : "/account/login"}
              className="nav-portal-btn"
            >
              <UserIcon size={14} />
              <span>{user ? "My Account" : "Sign In"}</span>
            </Link>
            <Link href="/quote" className="nav-quote">Get a quote <ArrowUpRight size={16} /></Link>
          </div>
        </div>
      </header>
    </>
  );
}
