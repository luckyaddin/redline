"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Lock,
  MapPin,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { firebaseAuth, firestore } from "../../../lib/firebase";
import { encryptSensitiveData, maskSensitiveValue } from "../../../lib/crypto-utils";

export default function CustomerRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Kuwait City");
  const [stateProvince, setStateProvince] = useState("Al Asimah");
  const [country, setCountry] = useState("Kuwait");
  const [postalCode, setPostalCode] = useState("");
  const [idType, setIdType] = useState("Civil ID");
  const [idNumber, setIdNumber] = useState("");
  const [ssn, setSsn] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    if (!acceptTerms) {
      setError("Please accept the terms and privacy policy to complete registration.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        email.trim().toLowerCase(),
        password
      );
      const user = userCredential.user;

      // Update Auth Profile Display Name
      await updateProfile(user, { displayName: fullName.trim() });

      // 2. Encrypt & Mask sensitive identification fields
      const idNumberMasked = maskSensitiveValue(idNumber, "id");
      const idNumberEncrypted = await encryptSensitiveData(idNumber.trim());

      const ssnMasked = ssn ? maskSensitiveValue(ssn, "ssn") : "";
      const ssnEncrypted = ssn ? await encryptSensitiveData(ssn.trim()) : "";

      const now = new Date().toISOString();

      // 3. Write customer profile to Firestore
      const customerRecord = {
        uid: user.uid,
        fullName: fullName.trim(),
        contactName: fullName.trim(),
        companyName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        stateProvince: stateProvince.trim(),
        country: country.trim(),
        postalCode: postalCode.trim(),
        idType,
        idNumberMasked,
        idNumberEncrypted,
        ssnMasked,
        ssnEncrypted,
        accountStatus: "Active",
        status: "Active",
        role: "customer",
        notes: "Registered online customer account",
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(firestore, "customers", user.uid), customerRecord);

      router.replace("/account/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("email-already-in-use")) {
        setError("An account with this email address already exists. Please sign in instead.");
      } else if (message.includes("invalid-email")) {
        setError("Please enter a valid email address.");
      } else if (message.includes("weak-password")) {
        setError("Password is too weak. Please use at least 8 characters with numbers or symbols.");
      } else {
        setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="customer-register-shell">
      <div className="customer-register-hero">
        <Link href="/" className="brand customer-auth-brand">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><strong>REDLINE</strong><small>CUSTOMER REGISTRATION</small></span>
        </Link>

        <div className="customer-auth-hero-copy">
          <span className="page-kicker">Account registration</span>
          <h1>Join RedLine Logistics Network</h1>
          <p>
            Create your verified customer profile to submit shipments, access real-time milestone
            tracking, download verified shipping receipts, and enjoy dedicated private support.
          </p>

          <div className="register-benefits">
            <div className="benefit-item">
              <CheckCircle2 size={18} />
              <div>
                <strong>Private Shipment Dashboard</strong>
                <small>View every package linked to your email in one secure portal.</small>
              </div>
            </div>
            <div className="benefit-item">
              <CheckCircle2 size={18} />
              <div>
                <strong>Private Customer Support</strong>
                <small>Direct two-way messaging with our operations specialists.</small>
              </div>
            </div>
            <div className="benefit-item">
              <CheckCircle2 size={18} />
              <div>
                <strong>Bank-Grade Sensitive Data Encryption</strong>
                <small>Your identification and credentials are encrypted using AES-GCM protocols.</small>
              </div>
            </div>
          </div>
        </div>

        <div className="customer-auth-security-badge">
          <ShieldCheck size={20} />
          <div>
            <strong>GDPR &amp; Logistics Data Protection</strong>
            <small>Sensitive ID numbers are never stored in plaintext and are masked across the platform.</small>
          </div>
        </div>
      </div>

      <div className="customer-register-panel">
        <div className="customer-register-card">
          <div className="customer-auth-header">
            <span className="customer-auth-icon"><UserPlus size={22} /></span>
            <small>CREATE YOUR ACCOUNT</small>
            <h2>Customer Registration</h2>
            <p>Please enter your information to set up your secure account.</p>
          </div>

          <form className="customer-register-form" onSubmit={handleRegister}>
            <div className="form-section-title">
              <User size={15} />
              <span>Personal &amp; Contact Details</span>
            </div>

            <div className="form-grid-2">
              <label>
                <span>Full Name *</span>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Faisal Al-Sabah"
                />
              </label>

              <label>
                <span>Email Address *</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faisal@example.com"
                  autoComplete="email"
                />
              </label>

              <label className="form-full">
                <span>Phone Number *</span>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+965 9999 0000"
                  autoComplete="tel"
                />
              </label>
            </div>

            <div className="form-section-title">
              <MapPin size={15} />
              <span>Residential or Business Address</span>
            </div>

            <div className="form-grid-2">
              <label className="form-full">
                <span>Street Address *</span>
                <input
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Block 4, Street 12, House 15"
                />
              </label>

              <label>
                <span>City *</span>
                <input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Kuwait City"
                />
              </label>

              <label>
                <span>State / Province *</span>
                <input
                  required
                  value={stateProvince}
                  onChange={(e) => setStateProvince(e.target.value)}
                  placeholder="Al Asimah"
                />
              </label>

              <label>
                <span>Country *</span>
                <select value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="Kuwait">Kuwait</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Qatar">Qatar</option>
                  <option value="Bahrain">Bahrain</option>
                  <option value="Oman">Oman</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                <span>Postal / ZIP Code</span>
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 13001"
                />
              </label>
            </div>

            <div className="form-section-title">
              <FileCheck2 size={15} />
              <span>Identification &amp; Security (Encrypted)</span>
            </div>

            <div className="form-grid-2">
              <label>
                <span>Identification Type *</span>
                <select value={idType} onChange={(e) => setIdType(e.target.value)}>
                  <option value="Civil ID">Civil ID (Kuwait)</option>
                  <option value="Passport">Passport</option>
                  <option value="National ID">National ID</option>
                  <option value="Driver's License">Driver&apos;s License</option>
                  <option value="Commercial License">Commercial License</option>
                </select>
              </label>

              <label>
                <span>ID Number *</span>
                <input
                  required
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. 294081200123"
                />
              </label>

              <label className="form-full">
                <span>SSN (Optional — only if business specifically requires it)</span>
                <input
                  type="password"
                  value={ssn}
                  onChange={(e) => setSsn(e.target.value)}
                  placeholder="XXX-XX-XXXX (optional)"
                  autoComplete="off"
                />
                <small className="field-hint">
                  Sensitive ID data is encrypted with AES-GCM before storage and masked as <code>*--1234</code> in the UI.
                </small>
              </label>
            </div>

            <div className="form-section-title">
              <Lock size={15} />
              <span>Account Password</span>
            </div>

            <div className="form-grid-2">
              <label>
                <span>Password * (min 8 chars)</span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
              </label>

              <label>
                <span>Confirm Password *</span>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
              </label>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span>
                I agree to the RedLine Logistics Terms of Service and Privacy Policy, and understand that
                my account details will be used to verify shipment ownership and support requests.
              </span>
            </label>

            {error && <div className="auth-error-box">{error}</div>}

            <button disabled={loading} className="customer-auth-submit" type="submit">
              <span>{loading ? "Creating your account…" : "Register Account"}</span>
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="customer-auth-footer">
            <p>
              Already registered? <Link href="/account/login"><strong>Sign in here</strong></Link>
            </p>
            <div className="auth-alt-links">
              <Link href="/" className="auth-link-muted"><ArrowLeft size={13} /> Back to homepage</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
