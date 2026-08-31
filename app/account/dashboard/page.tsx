"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
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
  updateDoc,
  where,
} from "firebase/firestore";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Clock3,
  ExternalLink,
  HelpCircle,
  KeyRound,
  LifeBuoy,
  Lock,
  LogOut,
  MessageCircle,
  MessageSquare,
  Package,
  PackageSearch,
  Plus,
  Printer,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Truck,
  User as UserIcon,
  X,
} from "lucide-react";
import { firebaseAuth, firestore } from "../../../lib/firebase";
import { progressForStatus, statusDescription } from "../../../lib/shipment-status";

type CustomerTab = "overview" | "shipments" | "support" | "profile";

type CustomerProfile = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  stateProvince: string;
  country: string;
  postalCode: string;
  idType: string;
  idNumberMasked: string;
  ssnMasked?: string;
  accountStatus: string;
  createdAt: string;
};

type CustomerShipment = {
  trackingNumber: string;
  customerName?: string;
  receiverEmail?: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  senderCompany?: string;
  senderAddress?: string;
  origin: string;
  destination: string;
  status: string;
  service?: string;
  carrier?: string;
  description?: string;
  category?: string;
  weight?: string;
  pieces?: number;
  progress?: number;
  currentLocation?: string;
  eta?: string;
  expectedShippingDate?: string;
  updatedAt?: string;
  createdAt?: string;
  publicNotes?: string;
  packageImageUrl?: string;
};

type ShipmentEvent = {
  id?: string;
  label: string;
  location: string;
  details: string;
  eventTime: string;
  completed: boolean;
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

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [shipments, setShipments] = useState<CustomerShipment[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals & Active Selections
  const [timelineShipment, setTimelineShipment] = useState<CustomerShipment | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<ShipmentEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [newReplyMessage, setNewReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [openTicketModal, setOpenTicketModal] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketCategory, setNewTicketCategory] = useState("Tracking & Delivery");
  const [newTicketTracking, setNewTicketTracking] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Profile Edit State
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // 1. Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/account/login");
        setLoading(false);
        return;
      }
      setUser(currentUser);
      await loadCustomerData(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Load Customer Profile, Shipments & Tickets
  async function loadCustomerData(currentUser: User) {
    setLoading(true);
    try {
      // Profile
      const profileDoc = await getDoc(doc(firestore, "customers", currentUser.uid));
      let currentProfile: CustomerProfile;
      if (profileDoc.exists()) {
        currentProfile = { uid: currentUser.uid, ...(profileDoc.data() as Omit<CustomerProfile, "uid">) };
      } else {
        // Fallback default profile if created directly via Auth
        currentProfile = {
          uid: currentUser.uid,
          fullName: currentUser.displayName || "Customer",
          email: currentUser.email || "",
          phone: "",
          address: "Kuwait",
          city: "Kuwait City",
          stateProvince: "Al Asimah",
          country: "Kuwait",
          postalCode: "",
          idType: "Civil ID",
          idNumberMasked: "*--****",
          accountStatus: "Active",
          createdAt: new Date().toISOString(),
        };
      }
      setProfile(currentProfile);
      setEditPhone(currentProfile.phone || "");
      setEditAddress(currentProfile.address || "");
      setEditCity(currentProfile.city || "");
      setEditPostalCode(currentProfile.postalCode || "");

      // Shipments Isolation:
      // Match shipments where receiverEmail matches customer email OR senderEmail matches customer email OR customerId matches user.uid
      const userEmail = currentUser.email?.toLowerCase().trim() || "";
      const shipmentsMap = new Map<string, CustomerShipment>();

      if (userEmail) {
        const [receiverMatches, senderMatches, allShipments] = await Promise.all([
          getDocs(firestoreQuery(collection(firestore, "shipments"), where("receiverEmail", "==", userEmail))),
          getDocs(firestoreQuery(collection(firestore, "shipments"), where("senderEmail", "==", userEmail))),
          getDocs(firestoreQuery(collection(firestore, "shipments"), orderBy("updatedAt", "desc"), limit(150))),
        ]);

        receiverMatches.docs.forEach((d) => shipmentsMap.set(d.id, d.data() as CustomerShipment));
        senderMatches.docs.forEach((d) => shipmentsMap.set(d.id, d.data() as CustomerShipment));

        // Client-side case-insensitive filter over all shipments for safe fallback
        allShipments.docs.forEach((d) => {
          const s = d.data() as CustomerShipment;
          if (
            (s.receiverEmail && s.receiverEmail.toLowerCase().trim() === userEmail) ||
            (s.senderEmail && s.senderEmail.toLowerCase().trim() === userEmail) ||
            (s.customerName && s.customerName.toLowerCase().includes(currentProfile.fullName.toLowerCase()))
          ) {
            shipmentsMap.set(d.id, s);
          }
        });
      }

      const userShipments = Array.from(shipmentsMap.values()).sort(
        (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      setShipments(userShipments);

      // Support Tickets
      const ticketsSnapshot = await getDocs(
        firestoreQuery(
          collection(firestore, "supportTickets"),
          where("customerId", "==", currentUser.uid),
          orderBy("updatedAt", "desc")
        )
      );
      const userTickets = ticketsSnapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SupportTicket, "id">) }));
      setTickets(userTickets);
    } catch (error) {
      console.error("Error loading customer data:", error);
    } finally {
      setLoading(false);
    }
  }

  // 3. Listen to Real-time Messages for Selected Ticket
  useEffect(() => {
    if (!activeTicket) return;
    const messagesQuery = firestoreQuery(
      collection(firestore, "supportTickets", activeTicket.id, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TicketMessage, "id">) }));
      setTicketMessages(msgs);
    });
    return () => unsubscribe();
  }, [activeTicket]);

  // 4. Open Shipment Timeline Modal
  async function openTimeline(shipment: CustomerShipment) {
    setTimelineShipment(shipment);
    setLoadingTimeline(true);
    try {
      const eventsSnap = await getDocs(
        firestoreQuery(collection(firestore, "shipments", shipment.trackingNumber, "events"), orderBy("eventTime", "desc"))
      );
      setTimelineEvents(eventsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ShipmentEvent, "id">) })));
    } catch {
      setTimelineEvents([]);
    } finally {
      setLoadingTimeline(false);
    }
  }

  // 5. Submit New Support Ticket
  async function handleCreateTicket(event: FormEvent) {
    event.preventDefault();
    if (!user || !profile) return;
    setSubmittingTicket(true);

    try {
      const now = new Date().toISOString();
      const ticketData = {
        customerId: user.uid,
        customerName: profile.fullName || user.displayName || "Customer",
        customerEmail: user.email || "",
        subject: newTicketSubject.trim(),
        category: newTicketCategory,
        trackingNumber: newTicketTracking.trim().toUpperCase() || undefined,
        status: "open",
        createdAt: now,
        updatedAt: now,
        lastMessage: newTicketMessage.trim(),
        lastSender: "customer",
      };

      const ticketRef = await addDoc(collection(firestore, "supportTickets"), ticketData);

      // Add initial message
      await addDoc(collection(firestore, "supportTickets", ticketRef.id, "messages"), {
        senderId: user.uid,
        senderName: profile.fullName || user.displayName || "Customer",
        senderRole: "customer",
        message: newTicketMessage.trim(),
        createdAt: now,
      });

      setNotice("Your support request has been submitted. Our operations team will respond promptly.");
      setOpenTicketModal(false);
      setNewTicketSubject("");
      setNewTicketTracking("");
      setNewTicketMessage("");
      await loadCustomerData(user);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to submit support ticket.");
    } finally {
      setSubmittingTicket(false);
    }
  }

  // 6. Send Reply in Ticket Conversation
  async function handleSendReply(event: FormEvent) {
    event.preventDefault();
    if (!user || !profile || !activeTicket || !newReplyMessage.trim()) return;
    setSendingReply(true);

    try {
      const now = new Date().toISOString();
      const messageText = newReplyMessage.trim();

      await addDoc(collection(firestore, "supportTickets", activeTicket.id, "messages"), {
        senderId: user.uid,
        senderName: profile.fullName || user.displayName || "Customer",
        senderRole: "customer",
        message: messageText,
        createdAt: now,
      });

      await updateDoc(doc(firestore, "supportTickets", activeTicket.id), {
        status: "open",
        updatedAt: now,
        lastMessage: messageText,
        lastSender: "customer",
      });

      setNewReplyMessage("");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to send reply.");
    } finally {
      setSendingReply(false);
    }
  }

  // 7. Save Profile Changes
  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSavingProfile(true);

    try {
      const now = new Date().toISOString();
      await updateDoc(doc(firestore, "customers", user.uid), {
        phone: editPhone.trim(),
        address: editAddress.trim(),
        city: editCity.trim(),
        postalCode: editPostalCode.trim(),
        updatedAt: now,
      });

      if (profile) {
        setProfile({
          ...profile,
          phone: editPhone.trim(),
          address: editAddress.trim(),
          city: editCity.trim(),
          postalCode: editPostalCode.trim(),
        });
      }
      setNotice("Profile contact details updated successfully.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  // Filtered Shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      const matchesQuery = [
        item.trackingNumber,
        item.origin,
        item.destination,
        item.status,
        item.description || "",
        item.senderName || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      if (!matchesQuery) return false;

      if (statusFilter === "pending") return /pending|received/i.test(item.status);
      if (statusFilter === "in-transit") return /transit|sorting|departed|customs|facility|ready|processing/i.test(item.status);
      if (statusFilter === "delivered") return /delivered/i.test(item.status);
      if (statusFilter === "exception") return /hold|delayed|exception|cancel/i.test(item.status);

      return true;
    });
  }, [shipments, searchQuery, statusFilter]);

  // Metrics
  const pendingCount = shipments.filter((s) => /pending|received/i.test(s.status)).length;
  const inTransitCount = shipments.filter((s) => /transit|sorting|departed|customs|facility|ready|processing/i.test(s.status)).length;
  const deliveredCount = shipments.filter((s) => /delivered/i.test(s.status)).length;
  const openTicketsCount = tickets.filter((t) => t.status !== "resolved").length;

  if (loading || !user) {
    return (
      <main className="portal-auth-check">
        <span className="brand-mark"><i /><i /><i /></span>
        <strong>Loading your customer dashboard…</strong>
      </main>
    );
  }

  return (
    <main className="customer-dashboard-shell">
      {/* Customer Sidebar */}
      <aside className="customer-sidebar">
        <Link href="/" className="brand customer-sidebar-brand">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><strong>REDLINE</strong><small>CUSTOMER DASHBOARD</small></span>
        </Link>

        <nav className="customer-nav" aria-label="Customer portal navigation">
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => { setActiveTab("overview"); setNotice(""); }}
          >
            <Activity size={18} />
            <span>Overview</span>
          </button>
          <button
            className={activeTab === "shipments" ? "active" : ""}
            onClick={() => { setActiveTab("shipments"); setNotice(""); }}
          >
            <Truck size={18} />
            <span>My Shipments</span>
            {shipments.length > 0 && <b>{shipments.length}</b>}
          </button>
          <button
            className={activeTab === "support" ? "active" : ""}
            onClick={() => { setActiveTab("support"); setNotice(""); }}
          >
            <MessageSquare size={18} />
            <span>Support &amp; Inquiries</span>
            {openTicketsCount > 0 && <b className="badge-alert">{openTicketsCount}</b>}
          </button>
          <button
            className={activeTab === "profile" ? "active" : ""}
            onClick={() => { setActiveTab("profile"); setNotice(""); }}
          >
            <UserIcon size={18} />
            <span>Profile &amp; Security</span>
          </button>
        </nav>

        <div className="customer-sidebar-footer">
          <div className="customer-user-chip">
            <span className="user-initials">
              {profile?.fullName ? profile.fullName.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase()}
            </span>
            <div className="user-meta">
              <strong>{profile?.fullName || user.displayName || "Customer"}</strong>
              <small>{user.email}</small>
            </div>
            <button
              title="Sign Out"
              aria-label="Sign Out"
              className="user-signout-btn"
              onClick={() => void signOut(firebaseAuth)}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <section className="customer-main">
        <header className="customer-topbar">
          <Link href="/" className="customer-topbar-link">
            <ArrowLeft size={15} /> Back to Website
          </Link>
          <div className="customer-topbar-actions">
            <Link href="/track" className="topbar-btn">
              <Search size={14} /> Quick Track
            </Link>
            <button
              className="topbar-btn btn-primary"
              onClick={() => setOpenTicketModal(true)}
            >
              <LifeBuoy size={14} /> Contact Support
            </button>
          </div>
        </header>

        <div className="customer-content">
          {/* Header Title Banner */}
          <div className="customer-page-header">
            <div>
              <span className="page-kicker">Client Portal</span>
              <h1>
                {activeTab === "overview" && `Welcome back, ${(profile?.fullName || user.displayName || "Customer").split(" ")[0]}.`}
                {activeTab === "shipments" && "My Shipments & Packages"}
                {activeTab === "support" && "Customer Support & Messages"}
                {activeTab === "profile" && "Account Profile & Security"}
              </h1>
              <p>
                {activeTab === "overview" && "Live overview of all packages, delivery milestones and support conversations."}
                {activeTab === "shipments" && "Search, track and view detailed shipping receipts for your orders."}
                {activeTab === "support" && "Private direct communications with RedLine Kuwait logistics operations."}
                {activeTab === "profile" && "Manage your verified profile details, addresses, and encrypted security identification."}
              </p>
            </div>

            {activeTab === "shipments" && (
              <button className="customer-action-btn" onClick={() => setOpenTicketModal(true)}>
                <Plus size={16} /> Need shipment help?
              </button>
            )}
            {activeTab === "support" && (
              <button className="customer-action-btn" onClick={() => setOpenTicketModal(true)}>
                <Plus size={16} /> Open Support Request
              </button>
            )}
          </div>

          {notice && <div className="customer-alert-notice">{notice}</div>}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="customer-overview-view">
              <div className="customer-stats-grid">
                <div className="stat-card">
                  <span className="stat-icon"><PackageSearch size={22} /></span>
                  <small>TOTAL SHIPMENTS</small>
                  <strong>{shipments.length}</strong>
                  <em>Linked to your account</em>
                </div>
                <div className="stat-card">
                  <span className="stat-icon stat-icon-amber"><Clock3 size={22} /></span>
                  <small>PRE-REGISTERED / PENDING</small>
                  <strong>{pendingCount}</strong>
                  <em>Awaiting dispatch</em>
                </div>
                <div className="stat-card">
                  <span className="stat-icon stat-icon-blue"><Truck size={22} /></span>
                  <small>IN TRANSIT</small>
                  <strong>{inTransitCount}</strong>
                  <em>Moving across routes</em>
                </div>
                <div className="stat-card">
                  <span className="stat-icon stat-icon-green"><CheckCircle2 size={22} /></span>
                  <small>DELIVERED</small>
                  <strong>{deliveredCount}</strong>
                  <em>Completed deliveries</em>
                </div>
              </div>

              <div className="overview-sections-grid">
                {/* Recent Shipments List */}
                <div className="overview-card">
                  <div className="overview-card-head">
                    <div>
                      <h2>Recent Shipments</h2>
                      <span>Your latest tracking records</span>
                    </div>
                    <button className="link-button" onClick={() => setActiveTab("shipments")}>
                      View all ({shipments.length}) <ArrowRight size={14} />
                    </button>
                  </div>

                  {shipments.length === 0 ? (
                    <div className="empty-state">
                      <Package size={36} />
                      <h3>No shipments linked yet</h3>
                      <p>
                        When a shipment is pre-registered or dispatched with your email (<strong>{user.email}</strong>),
                        it will appear here automatically.
                      </p>
                      <Link href="/quote" className="btn-secondary">Request a Freight Quote</Link>
                    </div>
                  ) : (
                    <div className="overview-shipment-list">
                      {shipments.slice(0, 5).map((shipment) => {
                        const progress = progressForStatus(shipment.status) ?? 5;
                        const isPending = /pending/i.test(shipment.status);
                        const isDelivered = /delivered/i.test(shipment.status);

                        return (
                          <div className="overview-shipment-row" key={shipment.trackingNumber}>
                            <div className="shipment-route-info">
                              <div className="tracking-badge-row">
                                <strong>{shipment.trackingNumber}</strong>
                                <span className={`status-pill ${isPending ? "status-pending" : isDelivered ? "status-delivered" : "status-transit"}`}>
                                  {shipment.status}
                                </span>
                              </div>
                              <div className="route-sub">
                                <span>{shipment.origin}</span>
                                <span className="route-arrow">→</span>
                                <span>{shipment.destination}</span>
                              </div>
                              <small className="cargo-sub">
                                {shipment.description || "General cargo"} • {shipment.service || "GCC Road Express"}
                              </small>
                            </div>

                            <div className="shipment-progress-info">
                              <div className="progress-bar-wrap">
                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                              </div>
                              <div className="progress-text-row">
                                <small>{progress}% Route Progress</small>
                                <small>ETA: {formatDate(shipment.eta)}</small>
                              </div>
                            </div>

                            <div className="shipment-quick-actions">
                              <Link
                                href={`/track?tracking=${shipment.trackingNumber}`}
                                className="action-icon-btn"
                                title="Public Track"
                              >
                                <ExternalLink size={15} />
                              </Link>
                              <button
                                className="action-icon-btn"
                                title="View Milestone Timeline"
                                onClick={() => openTimeline(shipment)}
                              >
                                <Clock size={15} />
                              </button>
                              <Link
                                href={`/receipt/${shipment.trackingNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-icon-btn"
                                title="Official Receipt"
                              >
                                <Printer size={15} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Support Quick Widget & Account Status */}
                <div className="overview-side-stack">
                  <div className="overview-card">
                    <div className="overview-card-head">
                      <div>
                        <h2>Private Support</h2>
                        <span>Active inquiries</span>
                      </div>
                      <button className="link-button" onClick={() => setActiveTab("support")}>
                        View all <ArrowRight size={14} />
                      </button>
                    </div>

                    {tickets.length === 0 ? (
                      <div className="support-quick-promo">
                        <MessageCircle size={28} />
                        <h4>Have questions about a package?</h4>
                        <p>Our dedicated Kuwait operations team is available 24/7 to assist with your active shipments.</p>
                        <button className="btn-primary" onClick={() => setOpenTicketModal(true)}>
                          <Plus size={14} /> Open Support Request
                        </button>
                      </div>
                    ) : (
                      <div className="support-quick-list">
                        {tickets.slice(0, 3).map((ticket) => (
                          <button
                            key={ticket.id}
                            className="support-quick-row"
                            onClick={() => { setActiveTicket(ticket); setActiveTab("support"); }}
                          >
                            <div className="ticket-title-row">
                              <strong>{ticket.subject}</strong>
                              <span className={`ticket-status-pill ${ticket.status}`}>{ticket.status}</span>
                            </div>
                            {ticket.trackingNumber && <small className="ticket-tracking-tag">Shipment: {ticket.trackingNumber}</small>}
                            <p className="ticket-snippet">{ticket.lastMessage || "No message history"}</p>
                            <span className="ticket-time">{formatDate(ticket.updatedAt)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="overview-card security-highlight-card">
                    <div className="security-highlight-head">
                      <ShieldCheck size={20} />
                      <strong>Verified Customer Account</strong>
                    </div>
                    <p>
                      Your account ID is verified. Sensitive identification numbers (Civil ID/Passport/SSN) are
                      encrypted under AES-GCM protocols.
                    </p>
                    <div className="verified-details">
                      <div><small>ID TYPE</small><strong>{profile?.idType || "Civil ID"}</strong></div>
                      <div><small>ID NUMBER</small><strong>{profile?.idNumberMasked || "*--1234"}</strong></div>
                      <div><small>STATUS</small><strong className="active-text">{profile?.accountStatus || "Active"}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY SHIPMENTS */}
          {activeTab === "shipments" && (
            <div className="customer-shipments-view">
              <div className="shipment-filter-bar">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by tracking number, location, cargo..."
                  />
                  {searchQuery && <button onClick={() => setSearchQuery("")}><X size={14} /></button>}
                </div>

                <div className="filter-chips">
                  <button className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>
                    All ({shipments.length})
                  </button>
                  <button className={statusFilter === "pending" ? "active" : ""} onClick={() => setStatusFilter("pending")}>
                    Pending ({pendingCount})
                  </button>
                  <button className={statusFilter === "in-transit" ? "active" : ""} onClick={() => setStatusFilter("in-transit")}>
                    In Transit ({inTransitCount})
                  </button>
                  <button className={statusFilter === "delivered" ? "active" : ""} onClick={() => setStatusFilter("delivered")}>
                    Delivered ({deliveredCount})
                  </button>
                </div>
              </div>

              {filteredShipments.length === 0 ? (
                <div className="empty-table-card">
                  <PackageSearch size={40} />
                  <h3>No shipments found</h3>
                  <p>
                    {searchQuery
                      ? `No shipments matched "${searchQuery}". Try a different tracking code or status filter.`
                      : "You do not have any registered shipments under this category yet."}
                  </p>
                </div>
              ) : (
                <div className="shipment-cards-grid">
                  {filteredShipments.map((shipment) => {
                    const progress = progressForStatus(shipment.status) ?? 5;
                    const isPending = /pending/i.test(shipment.status);
                    const isDelivered = /delivered/i.test(shipment.status);
                    const desc = statusDescription(shipment.status);

                    return (
                      <div className="shipment-full-card" key={shipment.trackingNumber}>
                        <div className="card-top-row">
                          <div className="tracking-main-group">
                            <span className="card-kicker">TRACKING CODE</span>
                            <h2>{shipment.trackingNumber}</h2>
                          </div>
                          <span className={`status-pill large ${isPending ? "status-pending" : isDelivered ? "status-delivered" : "status-transit"}`}>
                            {shipment.status}
                          </span>
                        </div>

                        {/* Status Description Banner */}
                        <div className="status-description-banner">
                          <Clock3 size={15} />
                          <span>{desc}</span>
                        </div>

                        {/* Route Segment */}
                        <div className="route-segment-grid">
                          <div className="route-point">
                            <small>ORIGIN / SENDER</small>
                            <strong>{shipment.origin}</strong>
                            <span>{shipment.senderCompany || shipment.senderName || "RedLine Logistics Hub"}</span>
                          </div>
                          <div className="route-line-center">
                            <Truck size={18} />
                            <div className="route-line-bar" />
                            <small>{progress}%</small>
                          </div>
                          <div className="route-point text-right">
                            <small>DESTINATION / RECEIVER</small>
                            <strong>{shipment.destination}</strong>
                            <span>{shipment.customerName || profile?.fullName || "Verified Recipient"}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="card-progress-wrap">
                          <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>

                        {/* Meta Grid */}
                        <div className="shipment-meta-grid">
                          <div>
                            <small>SERVICE</small>
                            <strong>{shipment.service || "GCC Road Express"}</strong>
                          </div>
                          <div>
                            <small>CARGO</small>
                            <strong>{shipment.description || "General cargo"}</strong>
                          </div>
                          <div>
                            <small>WEIGHT / PIECES</small>
                            <strong>{shipment.weight || "Standard"} • {shipment.pieces || 1} pcs</strong>
                          </div>
                          <div>
                            <small>ESTIMATED ARRIVAL (ETA)</small>
                            <strong>{formatDate(shipment.eta)}</strong>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="shipment-card-footer">
                          <div className="card-footer-left">
                            <small>Updated: {formatDate(shipment.updatedAt || shipment.createdAt)}</small>
                          </div>
                          <div className="card-footer-buttons">
                            <button
                              className="btn-card-action"
                              onClick={() => openTimeline(shipment)}
                            >
                              <Clock size={14} /> Full History
                            </button>
                            <Link
                              href={`/track?tracking=${shipment.trackingNumber}`}
                              className="btn-card-action"
                            >
                              <ExternalLink size={14} /> Live Map
                            </Link>
                            <Link
                              href={`/receipt/${shipment.trackingNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-card-action"
                            >
                              <Printer size={14} /> Receipt
                            </Link>
                            <button
                              className="btn-card-action btn-card-highlight"
                              onClick={() => {
                                setNewTicketTracking(shipment.trackingNumber);
                                setNewTicketSubject(`Inquiry regarding shipment ${shipment.trackingNumber}`);
                                setOpenTicketModal(true);
                              }}
                            >
                              <HelpCircle size={14} /> Inquire
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUPPORT & MESSAGES */}
          {activeTab === "support" && (
            <div className="customer-support-view">
              <div className="support-layout-split">
                {/* Tickets Sidebar */}
                <div className="support-tickets-pane">
                  <div className="tickets-pane-head">
                    <div>
                      <h2>Support Conversations</h2>
                      <span>{tickets.length} total tickets</span>
                    </div>
                    <button className="btn-primary-sm" onClick={() => setOpenTicketModal(true)}>
                      <Plus size={14} /> New
                    </button>
                  </div>

                  {tickets.length === 0 ? (
                    <div className="empty-tickets-box">
                      <MessageSquare size={32} />
                      <h4>No Support Tickets</h4>
                      <p>Need assistance with a package or delivery? Click &ldquo;New&rdquo; to start a conversation.</p>
                    </div>
                  ) : (
                    <div className="tickets-scroll-list">
                      {tickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          className={`ticket-item-card ${activeTicket?.id === ticket.id ? "active" : ""}`}
                          onClick={() => setActiveTicket(ticket)}
                        >
                          <div className="ticket-card-header">
                            <strong>{ticket.subject}</strong>
                            <span className={`ticket-status-pill ${ticket.status}`}>{ticket.status}</span>
                          </div>
                          {ticket.trackingNumber && (
                            <span className="ticket-ref-tag">
                              <Package size={11} /> {ticket.trackingNumber}
                            </span>
                          )}
                          <p className="ticket-last-snippet">{ticket.lastMessage || "No messages"}</p>
                          <div className="ticket-card-footer">
                            <small>{ticket.category}</small>
                            <small>{formatDate(ticket.updatedAt)}</small>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Conversation Thread */}
                <div className="support-thread-pane">
                  {activeTicket ? (
                    <div className="thread-wrapper">
                      <div className="thread-header">
                        <div>
                          <div className="thread-title-row">
                            <h2>{activeTicket.subject}</h2>
                            <span className={`ticket-status-pill ${activeTicket.status}`}>
                              {activeTicket.status}
                            </span>
                          </div>
                          <div className="thread-meta-row">
                            <span>Category: <strong>{activeTicket.category}</strong></span>
                            {activeTicket.trackingNumber && (
                              <span>
                                Tracking: <Link href={`/track?tracking=${activeTicket.trackingNumber}`} target="_blank"><strong>{activeTicket.trackingNumber}</strong> <ExternalLink size={12} /></Link>
                              </span>
                            )}
                            <span>Created: {formatDate(activeTicket.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="thread-messages-list">
                        {ticketMessages.length === 0 ? (
                          <div className="thread-loading">Loading conversation history…</div>
                        ) : (
                          ticketMessages.map((msg) => {
                            const isCustomer = msg.senderRole === "customer";
                            return (
                              <div
                                key={msg.id}
                                className={`message-bubble-row ${isCustomer ? "customer-msg" : "support-msg"}`}
                              >
                                <div className="message-bubble">
                                  <div className="message-author">
                                    <strong>{isCustomer ? "You" : "RedLine Support Team"}</strong>
                                    <small>{formatDate(msg.createdAt)}</small>
                                  </div>
                                  <p>{msg.message}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <form className="thread-reply-form" onSubmit={handleSendReply}>
                        <textarea
                          required
                          rows={3}
                          value={newReplyMessage}
                          onChange={(e) => setNewReplyMessage(e.target.value)}
                          placeholder="Type your response to RedLine support operations..."
                        />
                        <div className="reply-actions">
                          <small>Replies are transmitted securely to authorized operations staff.</small>
                          <button disabled={sendingReply || !newReplyMessage.trim()} type="submit">
                            <Send size={14} />
                            <span>{sendingReply ? "Sending…" : "Send Message"}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="thread-placeholder">
                      <MessageCircle size={44} />
                      <h3>Select a support ticket</h3>
                      <p>Choose an ongoing conversation on the left, or open a new support request.</p>
                      <button className="btn-primary" onClick={() => setOpenTicketModal(true)}>
                        <Plus size={15} /> Open Support Request
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE & SECURITY */}
          {activeTab === "profile" && (
            <div className="customer-profile-view">
              <div className="profile-layout-grid">
                {/* Contact & Address Edit */}
                <div className="profile-card">
                  <div className="profile-card-head">
                    <UserIcon size={20} />
                    <div>
                      <h2>Personal &amp; Contact Details</h2>
                      <p>Your primary account credentials and registered address.</p>
                    </div>
                  </div>

                  <form className="profile-form" onSubmit={handleSaveProfile}>
                    <div className="form-grid-2">
                      <label>
                        <span>Full Name</span>
                        <input value={profile?.fullName || ""} disabled className="input-readonly" />
                      </label>

                      <label>
                        <span>Email Address</span>
                        <input value={profile?.email || ""} disabled className="input-readonly" />
                      </label>

                      <label>
                        <span>Phone Number</span>
                        <input
                          required
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="+965 ..."
                        />
                      </label>

                      <label>
                        <span>Country</span>
                        <input value={profile?.country || "Kuwait"} disabled className="input-readonly" />
                      </label>

                      <label className="form-full">
                        <span>Street / Business Address</span>
                        <input
                          required
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          placeholder="Street, Block, Building..."
                        />
                      </label>

                      <label>
                        <span>City</span>
                        <input
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          placeholder="Kuwait City"
                        />
                      </label>

                      <label>
                        <span>Postal / ZIP Code</span>
                        <input
                          value={editPostalCode}
                          onChange={(e) => setEditPostalCode(e.target.value)}
                          placeholder="13001"
                        />
                      </label>
                    </div>

                    <div className="profile-form-footer">
                      <button disabled={savingProfile} type="submit" className="btn-primary">
                        {savingProfile ? "Saving…" : "Save Contact Changes"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Encrypted Identification & Security */}
                <div className="profile-side-col">
                  <div className="profile-card security-card">
                    <div className="profile-card-head">
                      <ShieldCheck size={20} />
                      <div>
                        <h2>Encrypted Identification</h2>
                        <p>Protected by RedLine sensitive data protocols.</p>
                      </div>
                    </div>

                    <div className="security-id-display">
                      <div className="id-field">
                        <small>IDENTIFICATION TYPE</small>
                        <strong>{profile?.idType || "Civil ID"}</strong>
                      </div>
                      <div className="id-field">
                        <small>MASKED ID NUMBER</small>
                        <div className="masked-val-row">
                          <Lock size={13} />
                          <code>{profile?.idNumberMasked || "*--1234"}</code>
                        </div>
                      </div>
                      {profile?.ssnMasked && (
                        <div className="id-field">
                          <small>MASKED SSN</small>
                          <div className="masked-val-row">
                            <Lock size={13} />
                            <code>{profile.ssnMasked}</code>
                          </div>
                        </div>
                      )}
                      <div className="id-field">
                        <small>ACCOUNT STATUS</small>
                        <strong className="active-text">{profile?.accountStatus || "Active"}</strong>
                      </div>
                      <div className="id-field">
                        <small>MEMBER SINCE</small>
                        <span>{formatDate(profile?.createdAt)}</span>
                      </div>
                    </div>

                    <div className="security-notice-box">
                      <Shield size={16} />
                      <p>
                        In accordance with enterprise logistics data privacy standards, your sensitive identification
                        number is encrypted and masked. Plaintext values are never exposed publicly.
                      </p>
                    </div>
                  </div>

                  <div className="profile-card">
                    <div className="profile-card-head">
                      <KeyRound size={20} />
                      <div>
                        <h2>Password &amp; Authentication</h2>
                        <p>Managed securely via Firebase Authentication.</p>
                      </div>
                    </div>
                    <div className="auth-action-box">
                      <p>Need to update your password or reset your login credentials?</p>
                      <Link href="/account/forgot-password" className="btn-secondary">
                        Send Password Reset Email
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MODAL: Shipment Event Timeline */}
      {timelineShipment && (
        <div className="custom-modal-backdrop" role="dialog" aria-modal="true">
          <div className="custom-modal-card">
            <div className="modal-top">
              <div>
                <span className="modal-kicker">SHIPMENT MILESTONES</span>
                <h2>{timelineShipment.trackingNumber}</h2>
                <p>{timelineShipment.origin} → {timelineShipment.destination}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setTimelineShipment(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="timeline-modal-body">
              {loadingTimeline ? (
                <div className="timeline-loading">Loading event history…</div>
              ) : timelineEvents.length === 0 ? (
                <div className="timeline-empty">
                  <Clock3 size={32} />
                  <h4>Initial Processing Phase</h4>
                  <p>Shipment information has been received. Transit milestones will appear here as the package progresses.</p>
                </div>
              ) : (
                <div className="customer-timeline-list">
                  {timelineEvents.map((evt, idx) => (
                    <div className="customer-timeline-item" key={evt.id || idx}>
                      <div className="timeline-dot-wrap">
                        <span className="timeline-dot"><CheckCircle2 size={12} /></span>
                        {idx < timelineEvents.length - 1 && <div className="timeline-connector" />}
                      </div>
                      <div className="timeline-item-content">
                        <div className="timeline-item-title-row">
                          <strong>{evt.label}</strong>
                          <small>{formatDate(evt.eventTime)}</small>
                        </div>
                        <span className="timeline-loc">{evt.location}</span>
                        {evt.details && <p className="timeline-details">{evt.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-bottom">
              <Link
                href={`/track?tracking=${timelineShipment.trackingNumber}`}
                className="btn-primary"
                target="_blank"
              >
                <ExternalLink size={14} /> Open Live Map
              </Link>
              <button className="btn-secondary" onClick={() => setTimelineShipment(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Open New Support Request */}
      {openTicketModal && (
        <div className="custom-modal-backdrop" role="dialog" aria-modal="true">
          <form className="custom-modal-card" onSubmit={handleCreateTicket}>
            <div className="modal-top">
              <div>
                <span className="modal-kicker">NEW INQUIRY</span>
                <h2>Contact Customer Support</h2>
                <p>Send a private message to RedLine Kuwait operations specialists.</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setOpenTicketModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-form-body">
              <label>
                <span>Inquiry Subject *</span>
                <input
                  required
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder="e.g. Estimated delivery inquiry for my package"
                />
              </label>

              <div className="form-grid-2">
                <label>
                  <span>Category</span>
                  <select
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value)}
                  >
                    <option value="Tracking & Delivery">Tracking &amp; Delivery</option>
                    <option value="Address Correction">Address / Recipient Change</option>
                    <option value="Customs & Clearance">Customs &amp; Clearance</option>
                    <option value="Billing & Invoices">Billing &amp; Invoices</option>
                    <option value="General Inquiry">General Logistics Inquiry</option>
                  </select>
                </label>

                <label>
                  <span>Related Shipment (Optional)</span>
                  <input
                    list="user-shipment-options"
                    value={newTicketTracking}
                    onChange={(e) => setNewTicketTracking(e.target.value.toUpperCase())}
                    placeholder="e.g. RLK-98476351 or AMG..."
                  />
                  <datalist id="user-shipment-options">
                    {shipments.map((s) => (
                      <option value={s.trackingNumber} key={s.trackingNumber}>
                        {s.trackingNumber} ({s.origin} → {s.destination})
                      </option>
                    ))}
                  </datalist>
                </label>
              </div>

              <label>
                <span>Message Details *</span>
                <textarea
                  required
                  rows={5}
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  placeholder="Describe your inquiry or request in detail. Include any specific instructions or requirements..."
                />
              </label>
            </div>

            <div className="modal-bottom">
              <button type="button" className="btn-secondary" onClick={() => setOpenTicketModal(false)}>
                Cancel
              </button>
              <button disabled={submittingTicket} type="submit" className="btn-primary">
                {submittingTicket ? "Submitting…" : "Submit Support Request"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
