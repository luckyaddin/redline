"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query as firestoreQuery,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Boxes,
  Building2,
  CheckCircle2,
  CirclePlus,
  Clock,
  Clock3,
  ExternalLink,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Package,
  PackageSearch,
  Phone,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  Shield,
  Truck,
  Users,
} from "lucide-react";
import { SHIPMENT_STATUS_STEPS, progressForStatus, statusDescription } from "../../lib/shipment-status";
import { firebaseAuth, firebaseStorage, firestore } from "../../lib/firebase";
import { interpolateRoute } from "../../lib/shipment-status";
import { coordinatesForLocation } from "../../lib/location-coordinates";

type DashboardTab = "control" | "shipments" | "customers" | "support" | "fleet" | "settings";

type Shipment = {
  trackingNumber: string;
  customerName: string;
  origin: string;
  destination: string;
  status: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  senderCompany: string;
  senderAddress: string;
  receiverEmail: string;
  receiverPhone?: string;
  service: string;
  category?: string;
  description: string;
  weight: string;
  pieces: number;
  progress: number;
  currentLocation: string;
  eta: string;
  expectedShippingDate?: string;
  carrier: string;
  updatedAt: string;
  createdAt?: string;
  internalNotes?: string;
  publicNotes?: string;
  latitude: number;
  longitude: number;
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  packageImageUrl?: string;
};

type Customer = {
  id: string;
  fullName?: string;
  companyName?: string;
  contactName?: string;
  email: string;
  phone: string;
  country: string;
  status: string;
  accountStatus?: string;
  idType?: string;
  idNumberMasked?: string;
  ssnMasked?: string;
  notes?: string;
  createdAt: string;
};

type SupportTicket = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  category: string;
  trackingNumber?: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastSender?: "customer" | "support";
};

type TicketMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "customer" | "admin";
  message: string;
  createdAt: string;
};

type FleetAsset = {
  id: string;
  assetCode: string;
  name: string;
  type: string;
  registration: string;
  driver: string;
  status: string;
  location: string;
  serviceDue: string;
  updatedAt: string;
};

type OperationsSettings = {
  branchName: string;
  dispatchEmail: string;
  supportPhone: string;
  timezone: string;
  mapRefreshSeconds: number;
  receiverNotifications: boolean;
  delayAlerts: boolean;
};

function generateTrackingCode(): string {
  const chars = "0123456789";
  let randomDigits = "";
  for (let i = 0; i < 9; i++) {
    randomDigits += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AMG${randomDigits}`;
}

const emptyShipment: Omit<Shipment, "latitude" | "longitude" | "originLatitude" | "originLongitude" | "destinationLatitude" | "destinationLongitude" | "progress" | "updatedAt"> = {
  trackingNumber: "",
  senderName: "",
  senderEmail: "",
  senderPhone: "",
  senderCompany: "Kuwait Freight Hub",
  senderAddress: "Block 1, Street 17, Shuwaikh Industrial, Kuwait",
  customerName: "",
  receiverEmail: "",
  receiverPhone: "",
  origin: "Shuwaikh Logistics Center, Kuwait",
  destination: "Dubai Logistics City, UAE",
  status: "Pending",
  service: "GCC Road Express",
  category: "General Cargo",
  description: "General freight cargo",
  weight: "1,200 kg",
  pieces: 1,
  currentLocation: "Shuwaikh Logistics Center, Kuwait",
  expectedShippingDate: new Date().toISOString().slice(0, 16),
  eta: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
  carrier: "RedLine Direct",
  internalNotes: "Pre-registered pending shipment",
  publicNotes: "Shipment information has been received and the package is awaiting processing.",
};

const emptyCustomer = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  country: "Kuwait",
  status: "Active",
  notes: "",
};

const emptyAsset = {
  assetCode: "",
  name: "",
  type: "Truck",
  registration: "",
  driver: "Unassigned",
  status: "Available",
  location: "Kuwait Operations Center",
  serviceDue: "",
};

const defaultSettings: OperationsSettings = {
  branchName: "Kuwait Operations Center",
  dispatchEmail: "operations@redlinekw.com",
  supportPhone: "+965 2228 6400",
  timezone: "Asia/Kuwait",
  mapRefreshSeconds: 10,
  receiverNotifications: true,
  delayAlerts: true,
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-KW", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kuwait",
  }).format(date);
}

export function AdminDashboard({ user }: { user: { displayName: string; email: string } }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("control");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [assets, setAssets] = useState<FleetAsset[]>([]);
  const [settings, setSettings] = useState<OperationsSettings>(defaultSettings);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // Modals & Editors
  const [modal, setModal] = useState<"shipment" | "customer" | "asset" | null>(null);
  const [shipmentForm, setShipmentForm] = useState(emptyShipment);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [shipmentImage, setShipmentImage] = useState<File | null>(null);

  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [editForm, setEditForm] = useState<typeof emptyShipment | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);

  const [edits, setEdits] = useState<Record<string, { status: string; currentLocation: string; progress: number; eta: string }>>({});
  const [assetEdits, setAssetEdits] = useState<Record<string, Pick<FleetAsset, "status" | "driver" | "location" | "serviceDue">>>({});

  // Support Tab State
  const [activeAdminTicket, setActiveAdminTicket] = useState<SupportTicket | null>(null);
  const [adminTicketMessages, setAdminTicketMessages] = useState<TicketMessage[]>([]);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [sendingAdminReply, setSendingAdminReply] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<"all" | "open" | "resolved">("all");

  async function loadShipments(silent = false) {
    if (!silent) setLoading(true);
    try {
      const snapshot = await getDocs(firestoreQuery(collection(firestore, "shipments"), orderBy("updatedAt", "desc"), limit(100)));
      setShipments(snapshot.docs.map((item) => item.data() as Shipment));
    } catch (e) {
      console.error(e);
    }
  }

  async function loadOperations() {
    try {
      const [customerRows, assetRows, settingsRow, ticketRows] = await Promise.all([
        getDocs(collection(firestore, "customers")),
        getDocs(collection(firestore, "fleetAssets")),
        getDoc(doc(firestore, "operationSettings", "kuwait")),
        getDocs(firestoreQuery(collection(firestore, "supportTickets"), orderBy("updatedAt", "desc"), limit(100))),
      ]);
      setCustomers(customerRows.docs.map((item) => ({ id: item.id, ...item.data() } as Customer)));
      setAssets(assetRows.docs.map((item) => ({ id: item.id, ...item.data() } as FleetAsset)));
      setTickets(ticketRows.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<SupportTicket, "id">) })));
      setSettings(settingsRow.exists() ? { ...defaultSettings, ...(settingsRow.data() as Partial<OperationsSettings>) } : defaultSettings);
    } catch (e) {
      console.error(e);
    }
  }

  async function refreshDashboard() {
    setLoading(true);
    setNotice("");
    try {
      await Promise.all([loadShipments(true), loadOperations()]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load operations dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await Promise.all([loadShipments(true), loadOperations()]);
      } catch (error) {
        if (active) setNotice(error instanceof Error ? error.message : "Unable to load operations dashboard");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Listen to messages for active admin ticket
  useEffect(() => {
    if (!activeAdminTicket) return;
    const q = firestoreQuery(collection(firestore, "supportTickets", activeAdminTicket.id, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAdminTicketMessages(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TicketMessage, "id">) })));
    });
    return () => unsubscribe();
  }, [activeAdminTicket]);

  const shipmentResults = useMemo(
    () =>
      shipments.filter((item) =>
        [item.trackingNumber, item.customerName, item.destination, item.status, item.receiverEmail, item.senderName]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [shipments, query]
  );

  const customerResults = useMemo(
    () =>
      customers.filter((item) =>
        [item.fullName, item.companyName, item.contactName, item.email, item.phone, item.country, item.idNumberMasked]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [customers, query]
  );

  const ticketResults = useMemo(
    () =>
      tickets.filter((ticket) => {
        const matchesQuery = [ticket.subject, ticket.customerName, ticket.customerEmail, ticket.trackingNumber || "", ticket.category]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
        if (!matchesQuery) return false;
        if (ticketFilter === "open") return ticket.status !== "resolved";
        if (ticketFilter === "resolved") return ticket.status === "resolved";
        return true;
      }),
    [tickets, query, ticketFilter]
  );

  const assetResults = useMemo(
    () =>
      assets.filter((item) =>
        [item.assetCode, item.name, item.driver, item.location, item.status].join(" ").toLowerCase().includes(query.toLowerCase())
      ),
    [assets, query]
  );

  const pendingShipments = shipments.filter((item) => /pending/i.test(item.status)).length;
  const delivered = shipments.filter((item) => item.status.toLowerCase().includes("delivered")).length;
  const inTransit = shipments.filter((item) => item.status.toLowerCase().includes("transit") || /sorting|processing|ready|departed/i.test(item.status)).length;
  const exceptions = shipments.filter((item) => /hold|exception|delayed|cancel/i.test(item.status)).length;
  const openTicketsCount = tickets.filter((t) => t.status !== "resolved").length;
  const availableAssets = assets.filter((item) => item.status === "Available").length;

  function changeTab(tab: DashboardTab) {
    setActiveTab(tab);
    setQuery("");
    setNotice("");
  }

  function openPrimaryAction() {
    if (activeTab === "customers") setModal("customer");
    else if (activeTab === "fleet") setModal("asset");
    else if (activeTab === "support") {
      setNotice("Select a support inquiry on the left to respond to customer messages.");
    } else {
      setShipmentForm({
        ...emptyShipment,
        trackingNumber: generateTrackingCode(),
      });
      setModal("shipment");
    }
  }

  async function sendShipmentNotice(shipment: Shipment, kind: "created" | "status-update") {
    if (!settings.receiverNotifications) return { sent: false, message: "Receiver emails are disabled in Settings." };
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) return { sent: false, message: "Sign in again to send notifications." };
    const response = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ shipment, kind }),
    });
    return (await response.json()) as { sent: boolean; message: string };
  }

  async function uploadPackageImage(trackingNumber: string, file: File) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60) || "package.jpg";
    const imageRef = ref(firebaseStorage, `shipments/${trackingNumber}/${Date.now()}-${safeName}`);
    await uploadBytes(imageRef, file, { contentType: file.type || "image/jpeg" });
    return getDownloadURL(imageRef);
  }

  // CREATE SHIPMENT (PRE-REGISTERED / PENDING)
  async function createShipment(event: FormEvent) {
    event.preventDefault();
    setNotice("Creating shipment…");
    try {
      const trackingNumber = (shipmentForm.trackingNumber.trim() || generateTrackingCode()).toUpperCase();
      const status = shipmentForm.status || "Pending";
      const progress = progressForStatus(status) ?? 5;
      const originPoint = coordinatesForLocation(shipmentForm.origin, { latitude: 29.3759, longitude: 47.9774 });
      const destinationPoint = coordinatesForLocation(shipmentForm.destination, { latitude: 25.2048, longitude: 55.2708 });
      const livePoint = interpolateRoute(originPoint, destinationPoint, progress);
      const now = new Date().toISOString();

      let packageImageUrl = "";
      let imageFailed = false;
      if (shipmentImage) {
        try {
          packageImageUrl = await uploadPackageImage(trackingNumber, shipmentImage);
        } catch {
          imageFailed = true;
        }
      }

      const publicNotes = shipmentForm.publicNotes || statusDescription(status);

      const shipment: Shipment = {
        ...shipmentForm,
        trackingNumber,
        status,
        pieces: Number(shipmentForm.pieces) || 1,
        progress,
        latitude: livePoint.latitude,
        longitude: livePoint.longitude,
        originLatitude: originPoint.latitude,
        originLongitude: originPoint.longitude,
        destinationLatitude: destinationPoint.latitude,
        destinationLongitude: destinationPoint.longitude,
        carrier: shipmentForm.carrier || "RedLine Direct",
        packageImageUrl,
        publicNotes,
        internalNotes: shipmentForm.internalNotes || "Created by Operations",
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(firestore, "shipments", trackingNumber), shipment);

      // Add initial event
      await addDoc(collection(firestore, "shipments", trackingNumber, "events"), {
        label: status,
        location: shipment.currentLocation,
        details: publicNotes,
        eventTime: now,
        completed: true,
      });

      const email = await sendShipmentNotice(shipment, "created");
      setNotice(
        `${email.sent ? `Shipment ${trackingNumber} created and receiver email sent.` : `Shipment ${trackingNumber} created.`} Tracking is immediately active on the public tracking page.${imageFailed ? " Package photo upload failed." : ""}`
      );
      setShipmentForm(emptyShipment);
      setShipmentImage(null);
      setModal(null);
      await loadShipments(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create shipment");
    }
  }

  async function createCustomer(event: FormEvent) {
    event.preventDefault();
    setNotice("Creating customer…");
    try {
      await addDoc(collection(firestore, "customers"), {
        ...customerForm,
        fullName: customerForm.companyName || customerForm.contactName,
        email: customerForm.email.trim().toLowerCase(),
        accountStatus: customerForm.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNotice("Customer account created.");
      setCustomerForm(emptyCustomer);
      setModal(null);
      await loadOperations();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create customer");
    }
  }

  async function createAsset(event: FormEvent) {
    event.preventDefault();
    setNotice("Adding fleet asset…");
    try {
      await addDoc(collection(firestore, "fleetAssets"), {
        ...assetForm,
        assetCode: assetForm.assetCode.trim().toUpperCase(),
        registration: assetForm.registration.trim().toUpperCase(),
        updatedAt: new Date().toISOString(),
      });
      setNotice("Fleet asset added to the operations register.");
      setAssetForm(emptyAsset);
      setModal(null);
      await loadOperations();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to add asset");
    }
  }

  function getEdit(item: Shipment) {
    return edits[item.trackingNumber] ?? { status: item.status, currentLocation: item.currentLocation, progress: item.progress, eta: item.eta };
  }
  function changeEdit(item: Shipment, field: string, value: string | number) {
    setEdits((current) => ({ ...current, [item.trackingNumber]: { ...getEdit(item), [field]: value } }));
  }
  function changeStatus(item: Shipment, status: string) {
    const edit = getEdit(item);
    const mapped = progressForStatus(status);
    setEdits((current) => ({
      ...current,
      [item.trackingNumber]: {
        ...edit,
        status,
        progress: mapped === null ? edit.progress : mapped,
      },
    }));
  }

  async function saveShipment(item: Shipment) {
    const edit = getEdit(item);
    setNotice(`Saving ${item.trackingNumber}…`);
    try {
      const statusChanged = edit.status !== item.status;
      const mapped = progressForStatus(edit.status);
      const progress = mapped ?? edit.progress;
      const originPoint = coordinatesForLocation(item.origin, { latitude: item.originLatitude, longitude: item.originLongitude });
      const destinationPoint = coordinatesForLocation(item.destination, { latitude: item.destinationLatitude, longitude: item.destinationLongitude });
      const livePoint = interpolateRoute(originPoint, destinationPoint, progress);
      const updatedAt = new Date().toISOString();
      const shipment = {
        ...item,
        ...edit,
        progress,
        latitude: livePoint.latitude,
        longitude: livePoint.longitude,
        updatedAt,
      };
      await updateDoc(doc(firestore, "shipments", item.trackingNumber), shipment);
      if (statusChanged) {
        await addDoc(collection(firestore, "shipments", item.trackingNumber, "events"), {
          label: edit.status,
          location: edit.currentLocation,
          details: statusDescription(edit.status),
          eventTime: updatedAt,
          completed: true,
        });
      }
      const email = statusChanged ? await sendShipmentNotice(shipment, "status-update") : { sent: false, message: "No status change." };
      setNotice(email.sent ? `${item.trackingNumber} updated and receiver notified.` : `${item.trackingNumber} updated.`);
      await loadShipments(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update shipment");
    }
  }

  function openShipmentEditor(item: Shipment) {
    setEditingShipment(item);
    setEditImage(null);
    setEditForm({
      trackingNumber: item.trackingNumber,
      senderName: item.senderName ?? "",
      senderEmail: item.senderEmail ?? "",
      senderPhone: item.senderPhone ?? "",
      senderCompany: item.senderCompany ?? "",
      senderAddress: item.senderAddress ?? "",
      customerName: item.customerName ?? "",
      receiverEmail: item.receiverEmail ?? "",
      receiverPhone: item.receiverPhone ?? "",
      origin: item.origin ?? "",
      destination: item.destination ?? "",
      status: item.status ?? "Pending",
      service: item.service ?? "GCC Road Express",
      category: item.category ?? "General Cargo",
      description: item.description ?? "",
      weight: item.weight ?? "",
      pieces: item.pieces ?? 1,
      currentLocation: item.currentLocation ?? "",
      expectedShippingDate: item.expectedShippingDate ? item.expectedShippingDate.slice(0, 16) : "",
      eta: item.eta ? item.eta.slice(0, 16) : "",
      carrier: item.carrier ?? "RedLine Direct",
      internalNotes: item.internalNotes ?? "",
      publicNotes: item.publicNotes ?? "",
    });
  }

  function closeShipmentEditor() {
    setEditingShipment(null);
    setEditForm(null);
    setEditImage(null);
  }

  async function saveEditedShipment(event: FormEvent) {
    event.preventDefault();
    if (!editingShipment || !editForm) return;
    const item = editingShipment;
    setNotice(`Saving ${item.trackingNumber}…`);
    try {
      const statusChanged = editForm.status !== item.status;
      const mapped = progressForStatus(editForm.status);
      const progress = mapped ?? item.progress;
      const originPoint = coordinatesForLocation(editForm.origin, { latitude: item.originLatitude, longitude: item.originLongitude });
      const destinationPoint = coordinatesForLocation(editForm.destination, { latitude: item.destinationLatitude, longitude: item.destinationLongitude });
      const livePoint = interpolateRoute(originPoint, destinationPoint, progress);
      const updatedAt = new Date().toISOString();

      let packageImageUrl = item.packageImageUrl ?? "";
      let imageFailed = false;
      if (editImage) {
        try {
          packageImageUrl = await uploadPackageImage(item.trackingNumber, editImage);
        } catch {
          imageFailed = true;
        }
      }

      const shipment: Shipment = {
        ...item,
        ...editForm,
        pieces: Number(editForm.pieces) || item.pieces,
        progress,
        latitude: livePoint.latitude,
        longitude: livePoint.longitude,
        originLatitude: originPoint.latitude,
        originLongitude: originPoint.longitude,
        destinationLatitude: destinationPoint.latitude,
        destinationLongitude: destinationPoint.longitude,
        packageImageUrl,
        updatedAt,
      };

      await updateDoc(doc(firestore, "shipments", item.trackingNumber), shipment);
      if (statusChanged) {
        await addDoc(collection(firestore, "shipments", item.trackingNumber, "events"), {
          label: editForm.status,
          location: editForm.currentLocation,
          details: editForm.publicNotes || statusDescription(editForm.status),
          eventTime: updatedAt,
          completed: true,
        });
      }

      const email = statusChanged ? await sendShipmentNotice(shipment, "status-update") : null;
      setNotice(`${item.trackingNumber} updated.${email?.sent ? " Receiver notified by email." : ""}${imageFailed ? " Photo upload failed." : ""}`);
      closeShipmentEditor();
      await loadShipments(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update shipment");
    }
  }

  // ADMIN REPLY TO SUPPORT TICKET
  async function handleSendAdminReply(event: FormEvent) {
    event.preventDefault();
    if (!activeAdminTicket || !adminReplyText.trim()) return;
    setSendingAdminReply(true);

    try {
      const now = new Date().toISOString();
      const messageText = adminReplyText.trim();

      await addDoc(collection(firestore, "supportTickets", activeAdminTicket.id, "messages"), {
        senderId: firebaseAuth.currentUser?.uid || "admin",
        senderName: user.displayName || "RedLine Operations",
        senderRole: "admin",
        message: messageText,
        createdAt: now,
      });

      await updateDoc(doc(firestore, "supportTickets", activeAdminTicket.id), {
        status: "in-progress",
        updatedAt: now,
        lastMessage: messageText,
        lastSender: "support",
      });

      setAdminReplyText("");
      setNotice("Reply sent to customer.");
      await loadOperations();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to send reply.");
    } finally {
      setSendingAdminReply(false);
    }
  }

  async function updateTicketStatus(ticketId: string, status: "open" | "in-progress" | "resolved") {
    try {
      await updateDoc(doc(firestore, "supportTickets", ticketId), {
        status,
        updatedAt: new Date().toISOString(),
      });
      setNotice(`Ticket marked as ${status}.`);
      if (activeAdminTicket?.id === ticketId) {
        setActiveAdminTicket({ ...activeAdminTicket, status });
      }
      await loadOperations();
    } catch (e) {
      console.error(e);
    }
  }

  async function updateCustomer(customer: Customer, status: string) {
    setNotice(`Updating ${customer.companyName || customer.contactName}…`);
    try {
      await updateDoc(doc(firestore, "customers", customer.id), {
        status,
        accountStatus: status,
        phone: customer.phone,
        notes: customer.notes || "",
      });
      setNotice("Customer status updated.");
      await loadOperations();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update customer");
    }
  }

  function getAssetEdit(asset: FleetAsset) {
    return assetEdits[asset.id] ?? { status: asset.status, driver: asset.driver, location: asset.location, serviceDue: asset.serviceDue };
  }
  function changeAssetEdit(asset: FleetAsset, field: string, value: string) {
    setAssetEdits((current) => ({ ...current, [asset.id]: { ...getAssetEdit(asset), [field]: value } }));
  }
  async function saveAsset(asset: FleetAsset) {
    setNotice(`Saving ${asset.assetCode}…`);
    try {
      await updateDoc(doc(firestore, "fleetAssets", asset.id), { ...getAssetEdit(asset), updatedAt: new Date().toISOString() });
      setNotice(`${asset.assetCode} updated.`);
      await loadOperations();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update asset");
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setNotice("Saving operations settings…");
    try {
      await setDoc(doc(firestore, "operationSettings", "kuwait"), { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
      setNotice("Operations settings saved and applied.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save settings");
    }
  }

  const sectionCopy: Record<DashboardTab, { kicker: string; title: string; description: string; action?: string }> = {
    control: { kicker: "Operations control tower", title: `Good afternoon, ${user.displayName.split(" ")[0]}.`, description: "Live network activity and operational readiness at a glance.", action: "Create shipment" },
    shipments: { kicker: "Shipment management", title: "Shipment register", description: "Create pre-registered pending shipments, search, and update every milestone.", action: "Create shipment" },
    customers: { kicker: "Customer management", title: "Customer directory", description: "Manage registered customer profiles, encrypted ID records, and account statuses.", action: "Add customer" },
    support: { kicker: "Client communications", title: "Support & inquiries", description: "Read customer tickets, review package references, and transmit direct replies." },
    fleet: { kicker: "Fleet management", title: "Fleet & assets", description: "Assign drivers and keep equipment status current.", action: "Add asset" },
    settings: { kicker: "System configuration", title: "Operations settings", description: "Control live-map timing and notification preferences." },
  };
  const copy = sectionCopy[activeTab];

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="brand admin-brand">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><strong>REDLINE</strong><small>OPERATIONS</small></span>
        </Link>
        <nav aria-label="Operations dashboard">
          <button className={activeTab === "control" ? "active" : ""} onClick={() => changeTab("control")}>
            <Activity size={17} /> Control tower
          </button>
          <button className={activeTab === "shipments" ? "active" : ""} onClick={() => changeTab("shipments")}>
            <Truck size={17} /> Shipments <b>{shipments.length}</b>
          </button>
          <button className={activeTab === "support" ? "active" : ""} onClick={() => changeTab("support")}>
            <MessageSquare size={17} /> Support &amp; Inquiries {openTicketsCount > 0 && <b className="badge-alert">{openTicketsCount}</b>}
          </button>
          <button className={activeTab === "customers" ? "active" : ""} onClick={() => changeTab("customers")}>
            <Users size={17} /> Customers <b>{customers.length}</b>
          </button>
          <button className={activeTab === "fleet" ? "active" : ""} onClick={() => changeTab("fleet")}><Boxes size={17} /> Fleet &amp; assets <b>{assets.length}</b></button>
          <button className={activeTab === "settings" ? "active" : ""} onClick={() => changeTab("settings")}><Settings2 size={17} /> Settings</button>
        </nav>
        <div className="admin-profile">
          <span>{user.displayName.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{user.displayName}</strong>
            <small>{user.email}</small>
          </div>
          <button aria-label="Sign out" onClick={() => void signOut(firebaseAuth)}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <Link href="/"><ArrowLeft size={16} /> Public website</Link>
          <div className="topbar-right-info">
            <Link href="/account/dashboard" className="subtle-link">
              <Shield size={13} /> Customer Portal View
            </Link>
            <span className="divider-sm" />
            <span>{settings.branchName} <i /></span>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-title">
            <div>
              <span className="page-kicker">{copy.kicker}</span>
              <h1>{copy.title}</h1>
              <p>{copy.description}</p>
            </div>
            {copy.action && (
              <button onClick={openPrimaryAction}>
                <CirclePlus size={18} /> {copy.action}
              </button>
            )}
          </div>
          {notice && <div className="admin-global-notice">{notice}</div>}

          {activeTab === "control" && (
            <ControlTower
              shipments={shipments}
              assets={assets}
              pendingShipments={pendingShipments}
              inTransit={inTransit}
              delivered={delivered}
              exceptions={exceptions}
              availableAssets={availableAssets}
              loading={loading}
              onOpenShipments={() => changeTab("shipments")}
              onRefresh={() => void refreshDashboard()}
            />
          )}

          {activeTab === "shipments" && (
            <ShipmentRegister
              loading={loading}
              items={shipmentResults}
              total={shipments.length}
              query={query}
              setQuery={setQuery}
              getEdit={getEdit}
              changeStatus={changeStatus}
              changeEdit={changeEdit}
              saveShipment={saveShipment}
              onEdit={openShipmentEditor}
              onCreateNew={openPrimaryAction}
              onRefresh={() => void refreshDashboard()}
            />
          )}

          {activeTab === "support" && (
            <SupportManagementSection
              loading={loading}
              tickets={ticketResults}
              total={tickets.length}
              activeTicket={activeAdminTicket}
              setActiveTicket={setActiveAdminTicket}
              messages={adminTicketMessages}
              replyText={adminReplyText}
              setReplyText={setAdminReplyText}
              onSendReply={handleSendAdminReply}
              sendingReply={sendingAdminReply}
              onUpdateStatus={updateTicketStatus}
              filter={ticketFilter}
              setFilter={setTicketFilter}
              query={query}
              setQuery={setQuery}
              onRefresh={() => void refreshDashboard()}
            />
          )}

          {activeTab === "customers" && (
            <CustomerRegister
              loading={loading}
              items={customerResults}
              shipments={shipments}
              query={query}
              setQuery={setQuery}
              updateCustomer={updateCustomer}
            />
          )}

          {activeTab === "fleet" && (
            <FleetRegister
              loading={loading}
              items={assetResults}
              query={query}
              setQuery={setQuery}
              getEdit={getAssetEdit}
              changeEdit={changeAssetEdit}
              saveAsset={saveAsset}
            />
          )}

          {activeTab === "settings" && (
            <SettingsPanel settings={settings} setSettings={setSettings} saveSettings={saveSettings} />
          )}
        </div>
      </section>

      {/* CREATE SHIPMENT MODAL */}
      {modal === "shipment" && (
        <ShipmentModal
          form={shipmentForm}
          setForm={setShipmentForm}
          image={shipmentImage}
          setImage={setShipmentImage}
          onSubmit={createShipment}
          onGenerateTracking={() => setShipmentForm({ ...shipmentForm, trackingNumber: generateTrackingCode() })}
          onClose={() => { setShipmentImage(null); setModal(null); }}
        />
      )}

      {/* EDIT SHIPMENT MODAL */}
      {editingShipment && editForm && (
        <EditShipmentModal
          shipment={editingShipment}
          form={editForm}
          setForm={setEditForm}
          image={editImage}
          setImage={setEditImage}
          onSubmit={saveEditedShipment}
          onClose={closeShipmentEditor}
        />
      )}

      {modal === "customer" && (
        <CustomerModal form={customerForm} setForm={setCustomerForm} onSubmit={createCustomer} onClose={() => setModal(null)} />
      )}
      {modal === "asset" && (
        <AssetModal form={assetForm} setForm={setAssetForm} onSubmit={createAsset} onClose={() => setModal(null)} />
      )}

      <datalist id="shipment-status-options">
        {SHIPMENT_STATUS_STEPS.map((step) => (
          <option value={step.label} key={step.label} />
        ))}
      </datalist>
    </main>
  );
}

function ControlTower({
  shipments,
  assets,
  pendingShipments,
  inTransit,
  delivered,
  exceptions,
  availableAssets,
  loading,
  onOpenShipments,
  onRefresh,
}: {
  shipments: Shipment[];
  assets: FleetAsset[];
  pendingShipments: number;
  inTransit: number;
  delivered: number;
  exceptions: number;
  availableAssets: number;
  loading: boolean;
  onOpenShipments: () => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <div className="admin-metrics">
        <div>
          <span><PackageSearch size={20} /></span>
          <small>ACTIVE SHIPMENTS</small>
          <strong>{shipments.length}</strong>
          <em>Live network total</em>
        </div>
        <div>
          <span><Clock3 size={20} /></span>
          <small>PENDING</small>
          <strong>{pendingShipments}</strong>
          <em>Awaiting transit</em>
        </div>
        <div>
          <span><Truck size={20} /></span>
          <small>IN TRANSIT</small>
          <strong>{inTransit}</strong>
          <em>Moving now</em>
        </div>
        <div>
          <span><CheckCircle2 size={20} /></span>
          <small>DELIVERED</small>
          <strong>{delivered}</strong>
          <em>Completed records</em>
        </div>
        <div>
          <span><Activity size={20} /></span>
          <small>FLEET READY</small>
          <strong>{availableAssets}/{assets.length}</strong>
          <em>Available assets</em>
        </div>
      </div>
      <div className="admin-control-grid">
        <section className="admin-board">
          <div className="admin-board-head">
            <div>
              <h2>Live shipment pulse</h2>
              <span>Latest network movement</span>
            </div>
            <button className="icon-action" onClick={onRefresh} aria-label="Refresh control tower">
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="pulse-list">
            {loading && <div className="module-empty">Loading live operations…</div>}
            {!loading &&
              shipments.slice(0, 6).map((item) => (
                <button key={item.trackingNumber} onClick={onOpenShipments} className="pulse-row">
                  <span className={item.status.toLowerCase().includes("delivered") ? "pulse-dot complete" : item.status.toLowerCase().includes("pending") ? "pulse-dot pending" : "pulse-dot"} />
                  <div>
                    <strong>{item.trackingNumber}</strong>
                    <small>{item.origin} → {item.destination}</small>
                  </div>
                  <div className="pulse-progress">
                    <i style={{ width: `${item.progress}%` }} />
                    <small>{item.status} · {item.progress}%</small>
                  </div>
                </button>
              ))}
            {!loading && shipments.length === 0 && (
              <div className="module-empty">No shipments yet. Create the first tracking record.</div>
            )}
          </div>
        </section>
        <section className="admin-board network-watch">
          <div className="admin-board-head">
            <div>
              <h2>Network watch</h2>
              <span>Operational notices</span>
            </div>
          </div>
          <div className="watch-item">
            <span className={exceptions ? "watch-icon alert" : "watch-icon"}><AlertTriangle size={18} /></span>
            <div>
              <strong>{exceptions} shipment exceptions</strong>
              <small>{exceptions ? "Review pending, on-hold or exception records." : "No active shipment exceptions."}</small>
            </div>
          </div>
          <div className="watch-item">
            <span className="watch-icon"><Clock size={18} /></span>
            <div>
              <strong>Pre-Registered Pending Packages</strong>
              <small>{pendingShipments} packages awaiting initial pickup or facility processing.</small>
            </div>
          </div>
          <div className="watch-item">
            <span className="watch-icon"><BellRing size={18} /></span>
            <div>
              <strong>Receiver notification workflow</strong>
              <small>Status emails are triggered whenever a shipment milestone changes.</small>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function SearchHead({
  title,
  count,
  query,
  setQuery,
  placeholder,
  onRefresh,
}: {
  title: string;
  count: number;
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="admin-board-head">
      <div>
        <h2>{title}</h2>
        <span>{count} records shown</span>
      </div>
      <div className="admin-search">
        <Search size={15} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
        {onRefresh && (
          <button onClick={onRefresh} aria-label="Refresh">
            <RefreshCw size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function ShipmentRegister({
  loading,
  items,
  total,
  query,
  setQuery,
  getEdit,
  changeStatus,
  changeEdit,
  saveShipment,
  onEdit,
  onCreateNew,
  onRefresh,
}: {
  loading: boolean;
  items: Shipment[];
  total: number;
  query: string;
  setQuery: (value: string) => void;
  getEdit: (item: Shipment) => { status: string; currentLocation: string; progress: number; eta: string };
  changeStatus: (item: Shipment, value: string) => void;
  changeEdit: (item: Shipment, field: string, value: string | number) => void;
  saveShipment: (item: Shipment) => Promise<void>;
  onEdit: (item: Shipment) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}) {
  return (
    <section className="admin-board">
      <SearchHead title="Shipment register" count={items.length} query={query} setQuery={setQuery} placeholder={`Search ${total} shipments`} onRefresh={onRefresh} />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Shipment &amp; receiver</th>
              <th>Route</th>
              <th>Status &amp; route progress</th>
              <th>Current location</th>
              <th>ETA</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="empty-table">Loading live shipment records…</td></tr>
            ) : (
              items.map((item) => {
                const edit = getEdit(item);
                const isPending = /pending/i.test(edit.status);
                return (
                  <tr key={item.trackingNumber}>
                    <td>
                      <strong>{item.trackingNumber}</strong>
                      <span>{item.customerName}</span>
                      <small>{item.receiverEmail}</small>
                      <small className="badge-subtle">{item.service}</small>
                    </td>
                    <td>
                      <strong>{item.origin}</strong>
                      <span className="route-arrow">→</span>
                      <span>{item.destination}</span>
                    </td>
                    <td>
                      <input
                        list="shipment-status-options"
                        value={edit.status}
                        onChange={(e) => changeStatus(item, e.target.value)}
                        aria-label={`${item.trackingNumber} status`}
                        className={isPending ? "input-pending-highlight" : ""}
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={edit.progress}
                        onChange={(e) => changeEdit(item, "progress", Number(e.target.value))}
                      />
                      <small>{edit.progress}% complete · {edit.status}</small>
                    </td>
                    <td>
                      <input
                        value={edit.currentLocation}
                        onChange={(e) => changeEdit(item, "currentLocation", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="datetime-local"
                        value={edit.eta ? edit.eta.slice(0, 16) : ""}
                        onChange={(e) => changeEdit(item, "eta", e.target.value)}
                      />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="save-row" onClick={() => void saveShipment(item)}>Save</button>
                        <button className="edit-row" onClick={() => onEdit(item)}>Edit</button>
                        <a className="receipt-row" href={`/receipt/${item.trackingNumber}`} target="_blank" rel="noopener noreferrer">Receipt</a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-table">
                  No shipment records match your search.
                  <div style={{ marginTop: 10 }}>
                    <button className="btn-primary-sm" onClick={onCreateNew}>+ Create new shipment</button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// SUPPORT & INQUIRIES MANAGEMENT SECTION IN ADMIN
function SupportManagementSection({
  loading,
  tickets,
  total,
  activeTicket,
  setActiveTicket,
  messages,
  replyText,
  setReplyText,
  onSendReply,
  sendingReply,
  onUpdateStatus,
  filter,
  setFilter,
  query,
  setQuery,
  onRefresh,
}: {
  loading: boolean;
  tickets: SupportTicket[];
  total: number;
  activeTicket: SupportTicket | null;
  setActiveTicket: (t: SupportTicket) => void;
  messages: TicketMessage[];
  replyText: string;
  setReplyText: (t: string) => void;
  onSendReply: (e: FormEvent) => void;
  sendingReply: boolean;
  onUpdateStatus: (id: string, s: "open" | "in-progress" | "resolved") => void;
  filter: "all" | "open" | "resolved";
  setFilter: (f: "all" | "open" | "resolved") => void;
  query: string;
  setQuery: (q: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="admin-support-layout">
      {/* Ticket List Pane */}
      <div className="admin-board admin-tickets-pane">
        <div className="admin-board-head">
          <div>
            <h2>Customer Inquiries</h2>
            <span>{tickets.length} showing ({total} total)</span>
          </div>
          <button className="icon-action" onClick={onRefresh} aria-label="Refresh tickets"><RefreshCw size={14} /></button>
        </div>

        <div className="admin-ticket-filters">
          <div className="filter-chips">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
            <button className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>Open / In Progress</button>
            <button className={filter === "resolved" ? "active" : ""} onClick={() => setFilter("resolved")}>Resolved</button>
          </div>
          <div className="admin-search-sm">
            <Search size={13} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by customer, tracking..." />
          </div>
        </div>

        <div className="admin-tickets-scroll">
          {loading ? (
            <div className="module-empty">Loading tickets…</div>
          ) : tickets.length === 0 ? (
            <div className="module-empty">No support tickets found.</div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                className={`admin-ticket-row ${activeTicket?.id === t.id ? "active" : ""}`}
                onClick={() => setActiveTicket(t)}
              >
                <div className="ticket-top-line">
                  <strong>{t.customerName}</strong>
                  <span className={`ticket-status-pill ${t.status}`}>{t.status}</span>
                </div>
                <div className="ticket-subject">{t.subject}</div>
                {t.trackingNumber && (
                  <div className="ticket-tag-tracking">
                    <Package size={11} /> {t.trackingNumber}
                  </div>
                )}
                <p className="ticket-msg-snippet">{t.lastMessage || "No messages"}</p>
                <div className="ticket-bottom-line">
                  <small>{t.customerEmail}</small>
                  <small>{formatDate(t.updatedAt)}</small>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Conversation Thread Pane */}
      <div className="admin-board admin-thread-pane">
        {activeTicket ? (
          <div className="admin-thread-wrapper">
            <div className="admin-thread-head">
              <div className="thread-head-left">
                <div className="thread-title-flex">
                  <h2>{activeTicket.subject}</h2>
                  <span className={`ticket-status-pill ${activeTicket.status}`}>{activeTicket.status}</span>
                </div>
                <div className="thread-sub-info">
                  <span>Customer: <strong>{activeTicket.customerName}</strong> ({activeTicket.customerEmail})</span>
                  {activeTicket.trackingNumber && (
                    <span>
                      Tracking: <a href={`/track?tracking=${activeTicket.trackingNumber}`} target="_blank" rel="noreferrer"><strong>{activeTicket.trackingNumber}</strong> <ExternalLink size={11} /></a>
                    </span>
                  )}
                  <span>Category: <strong>{activeTicket.category}</strong></span>
                </div>
              </div>

              <div className="thread-status-actions">
                <small>Status:</small>
                <button
                  className={activeTicket.status === "open" ? "btn-status-active" : ""}
                  onClick={() => onUpdateStatus(activeTicket.id, "open")}
                >
                  Open
                </button>
                <button
                  className={activeTicket.status === "in-progress" ? "btn-status-active" : ""}
                  onClick={() => onUpdateStatus(activeTicket.id, "in-progress")}
                >
                  In Progress
                </button>
                <button
                  className={activeTicket.status === "resolved" ? "btn-status-active status-resolved" : ""}
                  onClick={() => onUpdateStatus(activeTicket.id, "resolved")}
                >
                  Resolve
                </button>
              </div>
            </div>

            <div className="admin-messages-stream">
              {messages.map((m) => {
                const isCustomer = m.senderRole === "customer";
                return (
                  <div key={m.id} className={`admin-msg-row ${isCustomer ? "customer-side" : "admin-side"}`}>
                    <div className="admin-msg-bubble">
                      <div className="admin-msg-header">
                        <strong>{isCustomer ? activeTicket.customerName : `${m.senderName} (Staff)`}</strong>
                        <small>{formatDate(m.createdAt)}</small>
                      </div>
                      <p>{m.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form className="admin-reply-box" onSubmit={onSendReply}>
              <textarea
                required
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Type official reply to ${activeTicket.customerName}...`}
              />
              <div className="admin-reply-bar">
                <small>Customer will receive this message directly in their private dashboard.</small>
                <button disabled={sendingReply || !replyText.trim()} type="submit">
                  <Send size={13} />
                  <span>{sendingReply ? "Sending…" : "Send Reply"}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="admin-thread-placeholder">
            <MessageSquare size={48} />
            <h3>Select a customer inquiry</h3>
            <p>Choose any ticket from the list on the left to read messages and reply.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerRegister({
  loading,
  items,
  shipments,
  query,
  setQuery,
  updateCustomer,
}: {
  loading: boolean;
  items: Customer[];
  shipments: Shipment[];
  query: string;
  setQuery: (value: string) => void;
  updateCustomer: (customer: Customer, status: string) => Promise<void>;
}) {
  return (
    <section className="admin-board">
      <SearchHead title="Customer directory" count={items.length} query={query} setQuery={setQuery} placeholder="Search customers by name, email, ID..." />
      <div className="admin-table-wrap">
        <table className="admin-table customer-table">
          <thead>
            <tr>
              <th>Customer / Company</th>
              <th>Primary contact</th>
              <th>Encrypted ID info</th>
              <th>Linked shipments</th>
              <th>Account status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="empty-table">Loading customer accounts…</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.fullName || item.companyName || item.contactName || "Customer"}</strong>
                    <span>Customer #{String(item.id).slice(-6).toUpperCase()}</span>
                  </td>
                  <td>
                    <strong>{item.contactName || item.fullName || "—"}</strong>
                    <span><Mail size={12} /> {item.email}</span>
                    {item.phone && <span><Phone size={12} /> {item.phone}</span>}
                  </td>
                  <td>
                    <strong>{item.idType || "Civil ID"}</strong>
                    <span className="masked-badge"><Lock size={10} /> {item.idNumberMasked || "*--1234"}</span>
                    {item.ssnMasked && <small className="masked-ssn">SSN: {item.ssnMasked}</small>}
                  </td>
                  <td>
                    <strong>
                      {shipments.filter((s) => s.receiverEmail?.toLowerCase() === item.email?.toLowerCase() || s.senderEmail?.toLowerCase() === item.email?.toLowerCase()).length}
                    </strong>
                    <span>linked records</span>
                  </td>
                  <td>
                    <select
                      value={item.status || item.accountStatus || "Active"}
                      onChange={(e) => void updateCustomer(item, e.target.value)}
                      aria-label={`${item.companyName || item.fullName} status`}
                    >
                      <option>Active</option>
                      <option>Priority</option>
                      <option>On hold</option>
                      <option>Inactive</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="empty-table">No customers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FleetRegister({
  loading,
  items,
  query,
  setQuery,
  getEdit,
  changeEdit,
  saveAsset,
}: {
  loading: boolean;
  items: FleetAsset[];
  query: string;
  setQuery: (value: string) => void;
  getEdit: (asset: FleetAsset) => Pick<FleetAsset, "status" | "driver" | "location" | "serviceDue">;
  changeEdit: (asset: FleetAsset, field: string, value: string) => void;
  saveAsset: (asset: FleetAsset) => Promise<void>;
}) {
  return (
    <section className="admin-board">
      <SearchHead title="Fleet asset register" count={items.length} query={query} setQuery={setQuery} placeholder="Search fleet and assets" />
      <div className="admin-table-wrap">
        <table className="admin-table fleet-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Status</th>
              <th>Driver / custodian</th>
              <th>Current location</th>
              <th>Service due</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="empty-table">Loading fleet records…</td></tr>
            ) : (
              items.map((item) => {
                const edit = getEdit(item);
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.assetCode}</strong>
                      <span>{item.name}</span>
                      <small>{item.type}{item.registration ? ` · ${item.registration}` : ""}</small>
                    </td>
                    <td>
                      <select value={edit.status} onChange={(e) => changeEdit(item, "status", e.target.value)}>
                        <option>Available</option>
                        <option>Assigned</option>
                        <option>In transit</option>
                        <option>Maintenance</option>
                        <option>Out of service</option>
                      </select>
                    </td>
                    <td>
                      <input value={edit.driver} onChange={(e) => changeEdit(item, "driver", e.target.value)} />
                    </td>
                    <td>
                      <input value={edit.location} onChange={(e) => changeEdit(item, "location", e.target.value)} />
                    </td>
                    <td>
                      <input type="date" value={edit.serviceDue} onChange={(e) => changeEdit(item, "serviceDue", e.target.value)} />
                    </td>
                    <td>
                      <button className="save-row" onClick={() => void saveAsset(item)}>Save asset</button>
                    </td>
                  </tr>
                );
              })
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="empty-table">No fleet assets found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SettingsPanel({
  settings,
  setSettings,
  saveSettings,
}: {
  settings: OperationsSettings;
  setSettings: (settings: OperationsSettings) => void;
  saveSettings: (event: FormEvent) => Promise<void>;
}) {
  return (
    <form className="settings-layout" onSubmit={saveSettings}>
      <section className="admin-board settings-card">
        <div className="settings-heading">
          <span><Building2 size={19} /></span>
          <div>
            <h2>Operations profile</h2>
            <p>Used throughout the Kuwait operations center.</p>
          </div>
        </div>
        <div className="settings-fields">
          <label>
            Branch name
            <input required value={settings.branchName} onChange={(e) => setSettings({ ...settings, branchName: e.target.value })} />
          </label>
          <label>
            Dispatch email
            <input required type="email" value={settings.dispatchEmail} onChange={(e) => setSettings({ ...settings, dispatchEmail: e.target.value })} />
          </label>
          <label>
            Support phone
            <input required value={settings.supportPhone} onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })} placeholder="+965 2228 6400" />
            <small>Shown on the public tracking page and customer receipts.</small>
          </label>
          <label>
            Timezone
            <select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>
              <option value="Asia/Kuwait">Kuwait (UTC+3)</option>
              <option value="Asia/Dubai">Dubai (UTC+4)</option>
              <option value="Asia/Riyadh">Riyadh (UTC+3)</option>
            </select>
          </label>
          <label>
            Live-map refresh
            <input type="number" min="5" max="120" value={settings.mapRefreshSeconds} onChange={(e) => setSettings({ ...settings, mapRefreshSeconds: Number(e.target.value) })} />
            <small>Seconds between tracking updates.</small>
          </label>
        </div>
      </section>

      <section className="admin-board settings-card">
        <div className="settings-heading">
          <span><BellRing size={19} /></span>
          <div>
            <h2>Notification controls</h2>
            <p>Manage automatic operational alerts.</p>
          </div>
        </div>
        <div className="toggle-list">
          <label>
            <div>
              <strong>Receiver status emails</strong>
              <small>Send branded Resend emails when shipment status changes.</small>
            </div>
            <input type="checkbox" checked={settings.receiverNotifications} onChange={(e) => setSettings({ ...settings, receiverNotifications: e.target.checked })} />
          </label>
          <label>
            <div>
              <strong>Delay and exception alerts</strong>
              <small>Highlight pending, on-hold and delivery-exception records.</small>
            </div>
            <input type="checkbox" checked={settings.delayAlerts} onChange={(e) => setSettings({ ...settings, delayAlerts: e.target.checked })} />
          </label>
        </div>
      </section>

      <div className="settings-save">
        <button type="submit"><Save size={17} /> Save settings</button>
        <span>Changes are stored for the Kuwait Operations Center.</span>
      </div>
    </form>
  );
}

function ModalFrame({
  title,
  kicker,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  kicker: string;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="operations-modal-title">
      <form onSubmit={onSubmit}>
        <div className="modal-head">
          <div>
            <span>{kicker}</span>
            <h2 id="operations-modal-title">{title}</h2>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        {children}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Save record</button>
        </div>
      </form>
    </div>
  );
}

// CREATE SHIPMENT MODAL
function ShipmentModal({
  form,
  setForm,
  image,
  setImage,
  onSubmit,
  onGenerateTracking,
  onClose,
}: {
  form: typeof emptyShipment;
  setForm: (form: typeof emptyShipment) => void;
  image: File | null;
  setImage: (file: File | null) => void;
  onSubmit: (event: FormEvent) => void;
  onGenerateTracking: () => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame title="Create New Shipment (Pre-Register / Pending)" kicker="NEW SHIPMENT" onClose={onClose} onSubmit={onSubmit}>
      <div className="modal-grid">
        {/* Tracking Number Section */}
        <div className="modal-section-title">Tracking Number &amp; Initial Status</div>

        <label>
          <div className="label-with-action">
            <span>Tracking Number *</span>
            <button type="button" onClick={onGenerateTracking} className="btn-subtle-action">
              Generate AMG#
            </button>
          </div>
          <input
            required
            value={form.trackingNumber}
            onChange={(e) => setForm({ ...form, trackingNumber: e.target.value.toUpperCase() })}
            placeholder="e.g. AMG123456789 or RLK-00000000"
          />
        </label>

        <label>
          <span>Initial Status *</span>
          <select
            value={form.status}
            onChange={(e) => {
              const newStatus = e.target.value;
              setForm({
                ...form,
                status: newStatus,
                publicNotes: statusDescription(newStatus),
              });
            }}
          >
            {SHIPMENT_STATUS_STEPS.map((s) => (
              <option key={s.label} value={s.label}>{s.label}</option>
            ))}
          </select>
        </label>

        {/* Sender Info */}
        <div className="modal-section-title">Sender Information</div>
        <label>
          <span>Sender Name *</span>
          <input required value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} placeholder="e.g. Abdullah Al-Ghanim" />
        </label>
        <label>
          <span>Sender Email *</span>
          <input required type="email" value={form.senderEmail} onChange={(e) => setForm({ ...form, senderEmail: e.target.value })} placeholder="sender@example.com" />
        </label>
        <label>
          <span>Sender Phone</span>
          <input value={form.senderPhone} onChange={(e) => setForm({ ...form, senderPhone: e.target.value })} placeholder="+965 ..." />
        </label>
        <label>
          <span>Sender Company</span>
          <input value={form.senderCompany} onChange={(e) => setForm({ ...form, senderCompany: e.target.value })} placeholder="Company name" />
        </label>
        <label className="modal-wide">
          <span>Sender Pickup / Origin Address *</span>
          <input required value={form.senderAddress} onChange={(e) => setForm({ ...form, senderAddress: e.target.value })} />
        </label>

        {/* Receiver Info */}
        <div className="modal-section-title">Recipient &amp; Delivery Destination</div>
        <label>
          <span>Recipient Name *</span>
          <input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Recipient contact or business" />
        </label>
        <label>
          <span>Recipient Email *</span>
          <input required type="email" value={form.receiverEmail} onChange={(e) => setForm({ ...form, receiverEmail: e.target.value })} placeholder="recipient@example.com" />
        </label>
        <label>
          <span>Recipient Phone</span>
          <input value={form.receiverPhone} onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })} placeholder="+971 / +966 / +965..." />
        </label>
        <label>
          <span>Origin Hub *</span>
          <input required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
        </label>
        <label className="modal-wide">
          <span>Destination Address / Hub *</span>
          <input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
        </label>

        {/* Package & Logistics Specs */}
        <div className="modal-section-title">Package &amp; Shipping Specifications</div>
        <label>
          <span>Shipping Method / Service</span>
          <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
            <option>GCC Road Express</option>
            <option>Air Priority</option>
            <option>Ocean Freight</option>
            <option>Local Same-Day</option>
          </select>
        </label>
        <label>
          <span>Package Category</span>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option>General Cargo</option>
            <option>Electronics</option>
            <option>Industrial Equipment</option>
            <option>Documents &amp; Legal</option>
            <option>Perishables &amp; Pharma</option>
            <option>Commercial Samples</option>
            <option>Apparel &amp; Retail</option>
            <option>Personal Effects</option>
          </select>
        </label>
        <label>
          <span>Package Description *</span>
          <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Machinery parts, sample carton" />
        </label>
        <label>
          <span>Weight</span>
          <input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 1,200 kg" />
        </label>
        <label>
          <span>Quantity / Pieces</span>
          <input type="number" min="1" value={form.pieces} onChange={(e) => setForm({ ...form, pieces: Number(e.target.value) || 1 })} />
        </label>
        <label>
          <span>Carrier</span>
          <input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
        </label>
        <label>
          <span>Expected Shipping Date</span>
          <input type="datetime-local" value={form.expectedShippingDate} onChange={(e) => setForm({ ...form, expectedShippingDate: e.target.value })} />
        </label>
        <label>
          <span>Expected Delivery Date (ETA) *</span>
          <input required type="datetime-local" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} />
        </label>
        <label className="modal-wide">
          <span>Current Location / Hub *</span>
          <input required value={form.currentLocation} onChange={(e) => setForm({ ...form, currentLocation: e.target.value })} />
        </label>

        {/* Notes */}
        <div className="modal-section-title">Notes &amp; Public Tracking Information</div>
        <label className="modal-wide">
          <span>Public Tracking Notes (Visible to Customer / Recipient)</span>
          <input value={form.publicNotes} onChange={(e) => setForm({ ...form, publicNotes: e.target.value })} placeholder="Message shown on public tracking timeline" />
        </label>
        <label className="modal-wide">
          <span>Internal / Admin Notes (Restricted to Operations Staff)</span>
          <input value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} placeholder="Internal handling instructions, driver notes..." />
        </label>

        <PackageImageInput file={image} setFile={setImage} />
      </div>
    </ModalFrame>
  );
}

// EDIT SHIPMENT MODAL
function EditShipmentModal({
  shipment,
  form,
  setForm,
  image,
  setImage,
  onSubmit,
  onClose,
}: {
  shipment: Shipment;
  form: typeof emptyShipment;
  setForm: (form: typeof emptyShipment) => void;
  image: File | null;
  setImage: (file: File | null) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame title={`Edit Shipment: ${shipment.trackingNumber}`} kicker="FULL SHIPMENT EDIT" onClose={onClose} onSubmit={onSubmit}>
      <div className="modal-grid">
        <div className="modal-section-title">Status &amp; Timeline</div>
        <label>
          <span>Tracking Number</span>
          <input value={form.trackingNumber} readOnly disabled />
        </label>
        <label>
          <span>Status</span>
          <select
            value={form.status}
            onChange={(e) => {
              const newStatus = e.target.value;
              setForm({
                ...form,
                status: newStatus,
                publicNotes: form.publicNotes || statusDescription(newStatus),
              });
            }}
          >
            {SHIPMENT_STATUS_STEPS.map((s) => (
              <option key={s.label} value={s.label}>{s.label}</option>
            ))}
          </select>
        </label>

        <div className="modal-section-title">Sender Information</div>
        <label>
          <span>Sender Name</span>
          <input value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} />
        </label>
        <label>
          <span>Sender Email</span>
          <input type="email" value={form.senderEmail} onChange={(e) => setForm({ ...form, senderEmail: e.target.value })} />
        </label>
        <label>
          <span>Sender Phone</span>
          <input value={form.senderPhone} onChange={(e) => setForm({ ...form, senderPhone: e.target.value })} />
        </label>
        <label>
          <span>Sender Company</span>
          <input value={form.senderCompany} onChange={(e) => setForm({ ...form, senderCompany: e.target.value })} />
        </label>
        <label className="modal-wide">
          <span>Sender Address</span>
          <input value={form.senderAddress} onChange={(e) => setForm({ ...form, senderAddress: e.target.value })} />
        </label>

        <div className="modal-section-title">Receiver Information</div>
        <label>
          <span>Recipient Name</span>
          <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        </label>
        <label>
          <span>Recipient Email</span>
          <input type="email" value={form.receiverEmail} onChange={(e) => setForm({ ...form, receiverEmail: e.target.value })} />
        </label>
        <label>
          <span>Origin</span>
          <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
        </label>
        <label>
          <span>Destination</span>
          <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
        </label>

        <div className="modal-section-title">Shipping Specifications</div>
        <label>
          <span>Service</span>
          <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
            <option>GCC Road Express</option>
            <option>Air Priority</option>
            <option>Ocean Freight</option>
            <option>Local Same-Day</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option>General Cargo</option>
            <option>Electronics</option>
            <option>Industrial Equipment</option>
            <option>Documents &amp; Legal</option>
            <option>Perishables &amp; Pharma</option>
            <option>Commercial Samples</option>
            <option>Apparel &amp; Retail</option>
            <option>Personal Effects</option>
          </select>
        </label>
        <label>
          <span>Description</span>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label>
          <span>Weight</span>
          <input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
        </label>
        <label>
          <span>Pieces</span>
          <input type="number" min="1" value={form.pieces} onChange={(e) => setForm({ ...form, pieces: Number(e.target.value) || 1 })} />
        </label>
        <label>
          <span>Carrier</span>
          <input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
        </label>
        <label>
          <span>ETA</span>
          <input type="datetime-local" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} />
        </label>
        <label>
          <span>Current Location</span>
          <input value={form.currentLocation} onChange={(e) => setForm({ ...form, currentLocation: e.target.value })} />
        </label>

        <div className="modal-section-title">Notes</div>
        <label className="modal-wide">
          <span>Public Notes</span>
          <input value={form.publicNotes} onChange={(e) => setForm({ ...form, publicNotes: e.target.value })} />
        </label>
        <label className="modal-wide">
          <span>Internal Admin Notes</span>
          <input value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} />
        </label>

        <PackageImageInput file={image} setFile={setImage} currentUrl={shipment.packageImageUrl} />
      </div>
    </ModalFrame>
  );
}

function PackageImageInput({ file, setFile, currentUrl }: { file: File | null; setFile: (file: File | null) => void; currentUrl?: string }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const shown = preview || currentUrl || "";
  return (
    <>
      <label className="modal-wide">
        Package photo (optional)
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      {shown && (
        <div className="modal-image-preview modal-wide">
          <img src={shown} alt="Package preview" />
          <span>{preview ? "New photo selected — it will be uploaded when you save." : "Current package photo."}</span>
        </div>
      )}
    </>
  );
}

function CustomerModal({
  form,
  setForm,
  onSubmit,
  onClose,
}: {
  form: typeof emptyCustomer;
  setForm: (form: typeof emptyCustomer) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame title="Create customer account" kicker="NEW CUSTOMER" onClose={onClose} onSubmit={onSubmit}>
      <div className="modal-grid">
        <label>
          Company / Full Name
          <input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        </label>
        <label>
          Contact name
          <input required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        </label>
        <label>
          Email address
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Phone number
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+965 ..." />
        </label>
        <label>
          Country
          <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </label>
        <label>
          Account status
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Active</option>
            <option>Priority</option>
            <option>On hold</option>
            <option>Inactive</option>
          </select>
        </label>
        <label className="modal-wide">
          Notes
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Billing or service notes" />
        </label>
      </div>
    </ModalFrame>
  );
}

function AssetModal({
  form,
  setForm,
  onSubmit,
  onClose,
}: {
  form: typeof emptyAsset;
  setForm: (form: typeof emptyAsset) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame title="Add fleet or warehouse asset" kicker="NEW ASSET" onClose={onClose} onSubmit={onSubmit}>
      <div className="modal-grid">
        <label>
          Asset code
          <input required value={form.assetCode} onChange={(e) => setForm({ ...form, assetCode: e.target.value.toUpperCase() })} placeholder="KWT-TRK-01" />
        </label>
        <label>
          Asset name
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Volvo FH16" />
        </label>
        <label>
          Asset type
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>Truck</option>
            <option>Delivery van</option>
            <option>Trailer</option>
            <option>Forklift</option>
            <option>Warehouse equipment</option>
          </select>
        </label>
        <label>
          Registration
          <input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} />
        </label>
        <label>
          Driver / custodian
          <input value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} />
        </label>
        <label>
          Status
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Available</option>
            <option>Assigned</option>
            <option>In transit</option>
            <option>Maintenance</option>
            <option>Out of service</option>
          </select>
        </label>
        <label>
          Current location
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </label>
        <label>
          Next service date
          <input type="date" value={form.serviceDue} onChange={(e) => setForm({ ...form, serviceDue: e.target.value })} />
        </label>
      </div>
    </ModalFrame>
  );
}
