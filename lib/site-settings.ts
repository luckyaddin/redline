"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "./firebase";

export type SiteSettings = {
  branchName: string;
  supportPhone: string;
  contactEmail: string; // Marketing / General contact email
  supportEmail: string; // Customer care / tracking support email
  dispatchEmail: string; // Operations / dispatch email
  salesEmail: string; // Sales / new business email
  whatsappNumber: string; // WhatsApp number
  officeAddress: string; // Street address (e.g. Block 1, Street 17)
  cityCountry: string; // City & Region (e.g. Shuwaikh Industrial, Kuwait)
  businessHours: string; // e.g. "Operations support, 24/7"
  officeHours: string; // e.g. "Sunday–Thursday, 8:00 AM–6:00 PM"
  emailResponseTime: string; // e.g. "Replies within one business hour"
  timezone: string;
  mapRefreshSeconds: number;
  receiverNotifications: boolean;
  delayAlerts: boolean;
  updatedAt?: string;
};

export const defaultSiteSettings: SiteSettings = {
  branchName: "Kuwait Operations Center",
  supportPhone: "+965 2228 6400",
  contactEmail: "hello@redlinekw.com",
  supportEmail: "care@redlinekw.com",
  dispatchEmail: "operations@redlinekw.com",
  salesEmail: "sales@redlinekw.com",
  whatsappNumber: "+965 2228 6400",
  officeAddress: "Block 1, Street 17",
  cityCountry: "Shuwaikh Industrial, Kuwait",
  businessHours: "Operations support, 24/7",
  officeHours: "Sunday–Thursday, 8:00 AM–6:00 PM",
  emailResponseTime: "Replies within one business hour",
  timezone: "Asia/Kuwait",
  mapRefreshSeconds: 10,
  receiverNotifications: true,
  delayAlerts: true,
};

export function cleanPhoneForTel(phone?: string): string {
  if (!phone) return "+96522286400";
  return phone.replace(/[^\d+]/g, "");
}

export function cleanPhoneForWhatsApp(phone?: string): string {
  if (!phone) return "96522286400";
  return phone.replace(/[^\d]/g, "");
}

export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);

  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(
        doc(firestore, "operationSettings", "kuwait"),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setSettings({
              ...defaultSiteSettings,
              ...data,
            });
          }
        },
        (error) => {
          console.warn("Could not load dynamic site settings, using defaults:", error);
        }
      );
      return () => unsubscribe();
    } catch {
      // Handled for SSR
    }
  }, []);

  return settings;
}
