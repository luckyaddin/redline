"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { firebaseAuth } from "../../../lib/firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("user-not-found")) {
        // For security, show standard confirmation or friendly note
        setSubmitted(true);
      } else {
        setError("Unable to process password reset. Please verify your email and try again.");
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
          <span><strong>REDLINE</strong><small>CUSTOMER RECOVERY</small></span>
        </Link>
        <div className="customer-auth-hero-copy">
          <span className="page-kicker">Account Security</span>
          <h1>Reset your customer password.</h1>
          <p>
            Enter your registered email address and we will immediately dispatch a secure password reset link to your inbox.
          </p>
        </div>
        <div className="customer-auth-security-badge">
          <ShieldCheck size={20} />
          <div>
            <strong>Protected Password Recovery</strong>
            <small>Direct token verification ensures only you can access your account.</small>
          </div>
        </div>
      </div>

      <div className="customer-auth-panel">
        <div className="customer-auth-card">
          <div className="customer-auth-header">
            <span className="customer-auth-icon"><KeyRound size={22} /></span>
            <small>PASSWORD RECOVERY</small>
            <h2>Reset Password</h2>
            <p>We will email you instructions to reset your password.</p>
          </div>

          {submitted ? (
            <div className="auth-success-box">
              <CheckCircle2 size={36} />
              <h3>Reset Link Sent</h3>
              <p>
                If an account exists for <strong>{email}</strong>, you will receive an email shortly with instructions to reset your password.
              </p>
              <Link href="/account/login" className="customer-auth-submit" style={{ display: "flex", justifyContent: "center", textDecoration: "none" }}>
                <span>Back to Sign In</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form className="customer-auth-form" onSubmit={handleReset}>
              <label>
                <span>Registered email address</span>
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

              {error && <div className="auth-error-box">{error}</div>}

              <button disabled={loading} className="customer-auth-submit" type="submit">
                <span>{loading ? "Sending reset link…" : "Send Reset Link"}</span>
                <ArrowRight size={17} />
              </button>
            </form>
          )}

          <div className="customer-auth-footer">
            <div className="auth-alt-links">
              <Link href="/account/login" className="auth-link-muted"><ArrowLeft size={13} /> Return to customer sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
