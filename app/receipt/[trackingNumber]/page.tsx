import type { Metadata } from "next";
import { ReceiptView } from "./ReceiptView";

type ReceiptPageProps = { params: Promise<{ trackingNumber: string }> };

export async function generateMetadata({ params }: ReceiptPageProps): Promise<Metadata> {
  const { trackingNumber } = await params;
  const code = decodeURIComponent(trackingNumber).toUpperCase();
  return {
    title: `Shipping Receipt ${code}`,
    description: `Official RedLine Kuwait Logistics shipping receipt for shipment ${code}.`,
    robots: { index: false, follow: false },
  };
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { trackingNumber } = await params;
  return <ReceiptView trackingNumber={decodeURIComponent(trackingNumber).toUpperCase()} />;
}
