import type { Metadata } from "next";
import { ContactContent } from "./ContactContent";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Talk to the RedLine Kuwait team — 24/7 operations support, Shuwaikh headquarters, WhatsApp, phone and email contacts.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactContent />;
}
