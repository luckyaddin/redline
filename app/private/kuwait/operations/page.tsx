"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { AdminDashboard } from "../../../admin/AdminDashboard";
import { firebaseAuth } from "../../../../lib/firebase";

export default function KuwaitOperationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => onAuthStateChanged(firebaseAuth, (currentUser) => {
    if (!currentUser) { router.replace("/private/kuwait/login"); setChecking(false); return; }
    setUser(currentUser); setChecking(false);
  }), [router]);

  if (checking || !user) return <main className="portal-auth-check"><span className="brand-mark"><i /><i /><i /></span><strong>Verifying secure access…</strong></main>;
  return <AdminDashboard user={{ displayName: user.displayName || user.email?.split("@")[0] || "Operations", email: user.email || "" }} />;
}
