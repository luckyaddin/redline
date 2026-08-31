"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { ArrowLeft, ArrowRight, Lock, Mail, ShieldCheck, UserCheck } from "lucide-react";
import { firebaseAuth } from "../../../lib/firebase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/account/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        router.replace(redirectPath);
      }
    });
    return () => unsubscribe();
  }, [router, redirectPath]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      router.replace(redirectPath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("user-not-found") || message.includes("wrong-password") || message.includes("invalid-credential")) {
        setError("Invalid email address or password. Please verify your credentials and try again.");
      } else if (message.includes("too-many-requests")) {
        setError("Too many unsuccessful attempts. Please try again later or reset your password.");
      } else {
        setError("Unable to sign in. Please verify your account details or register if you are new.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="customer-auth-shell">
      <div className="customer-auth-hero">
        <Link href="/" className="brand customer-auth-brand">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><strong>REDLINE</strong><small>CUSTOMER PORTAL</small></span>
        </Link>
        <div className="customer-auth-hero-copy">
          <span className="page-kicker">Client shipment management</span>
          <h1>Track, manage &amp; communicate with total confidence.</h1>
          <p>
            Sign in to access your personal shipment dashboard, monitor live package milestones,
            view official delivery receipts, and communicate privately with our dedicated Kuwait support team.
          </p>
        </div>
        <div className="customer-auth-security-badge">
          <ShieldCheck size={20} />
          <div>
            <strong>Private &amp; Secure Customer Access</strong>
            <small>Encrypted authentication and sensitive data protection for every customer.</small>
          </div>
        </div>
      </div>

      <div className="customer-auth-panel">
        <div className="customer-auth-card">
          <div className="customer-auth-header">
            <span className="customer-auth-icon"><UserCheck size={22} /></span>
            <small>REDLINE CUSTOMER ACCOUNT</small>
            <h2>Customer Sign In</h2>
            <p>Enter your credentials to view your shipments and private messages.</p>
          </div>

          <form className="customer-auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Email address</span>
              <div className="auth-input-wrap">
                <Mail size={16} />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@example.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <label>
              <div className="auth-label-row">
                <span>Password</span>
                <Link href="/account/forgot-password" className="auth-link-subtle">Forgot password?</Link>
              </div>
              <div className="auth-input-wrap">
                <Lock size={16} />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
              </div>
            </label>

            {error && <div className="auth-error-box">{error}</div>}

            <button disabled={loading} className="customer-auth-submit" type="submit">
              <span>{loading ? "Signing in…" : "Sign in to account"}</span>
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="customer-auth-footer">
            <p>
              New to RedLine? <Link href="/account/register"><strong>Create an account</strong></Link>
            </p>
            <div className="auth-alt-links">
              <Link href="/track" className="auth-link-muted"><ArrowLeft size={13} /> Public tracking lookup</Link>
              <span className="auth-link-dot">•</span>
              <Link href="/private/kuwait/login" className="auth-link-muted">Operations Portal</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="portal-auth-check">Loading account login…</div>}>
      <LoginForm />
    </Suspense>
  );
}
