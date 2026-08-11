"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { firebaseAuth } from "../../../../lib/firebase";

export default function KuwaitOperationsLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(firebaseAuth, (user) => {
    if (user) router.replace("/private/kuwait/operations");
  }), [router]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      router.replace("/private/kuwait/operations");
    } catch {
      setError("The email or password is incorrect, or this account is not enabled in Firebase Authentication.");
    } finally { setLoading(false); }
  }

  return <main className="portal-login-shell">
    <section className="portal-login-brand">
      <Link href="/" className="brand portal-brand"><span className="brand-mark"><i /><i /><i /></span><span><strong>REDLINE</strong><small>KUWAIT LOGISTICS</small></span></Link>
      <div><span className="page-kicker">Private operations network</span><h1>Kuwait control starts here.</h1><p>Secure Firebase access for authorized RedLine staff managing shipments, route milestones and receiver notifications.</p></div>
      <div className="portal-security"><ShieldCheck size={19} /><span><strong>Protected operational access</strong><small>Firebase Authentication verifies every operations user before dashboard entry.</small></span></div>
    </section>
    <section className="portal-login-panel">
      <form className="portal-login-card firebase-login-form" onSubmit={submit}>
        <span className="portal-lock"><LockKeyhole size={23} /></span><small>KUWAIT OPERATIONS CENTER</small><h2>Sign in to continue</h2><p>This private portal is restricted to approved operations personnel.</p>
        <label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
        <label>Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
        {error && <div className="portal-login-error">{error}</div>}
        <button disabled={loading} className="portal-signin" type="submit"><span>{loading ? "Signing in…" : "Secure sign in"}</span><ArrowRight size={17} /></button>
        <div className="portal-login-note"><ShieldCheck size={14} /> Secured by Firebase Authentication</div>
      </form>
      <Link href="/" className="portal-back"><ArrowLeft size={14} /> Return to public website</Link>
    </section>
  </main>;
}
