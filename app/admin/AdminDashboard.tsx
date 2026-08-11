"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query as firestoreQuery, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  Activity, AlertTriangle, ArrowLeft, BellRing, Boxes, Building2, CheckCircle2,
  CirclePlus, Gauge, LogOut, Mail, PackageSearch, Phone,
  RefreshCw, Save, Search, Settings2, Truck, Users, Wrench,
} from "lucide-react";
import { SHIPMENT_STATUS_STEPS, progressForStatus } from "../../lib/shipment-status";
import { firebaseAuth, firebaseStorage, firestore } from "../../lib/firebase";
import { interpolateRoute } from "../../lib/shipment-status";
import { coordinatesForLocation } from "../../lib/location-coordinates";

type DashboardTab = "control" | "shipments" | "customers" | "fleet" | "settings";
type Shipment = {
  trackingNumber: string; customerName: string; origin: string; destination: string; status: string;
  senderName: string; senderEmail: string; senderPhone: string; senderCompany: string; senderAddress: string;
  receiverEmail: string; service: string; description: string; weight: string; pieces: number; progress: number;
  currentLocation: string; eta: string; carrier: string; updatedAt: string;
  latitude: number; longitude: number; originLatitude: number; originLongitude: number;
  destinationLatitude: number; destinationLongitude: number;
  packageImageUrl?: string;
};
type Customer = {
  id: string; companyName: string; contactName: string; email: string; phone: string;
  country: string; status: string; notes: string; createdAt: string;
};
type FleetAsset = {
  id: string; assetCode: string; name: string; type: string; registration: string;
  driver: string; status: string; location: string; serviceDue: string; updatedAt: string;
};
type OperationsSettings = {
  branchName: string; dispatchEmail: string; supportPhone: string; timezone: string; mapRefreshSeconds: number;
  receiverNotifications: boolean; delayAlerts: boolean;
};

const emptyShipment = { trackingNumber: "", senderName: "", senderEmail: "", senderPhone: "", senderCompany: "", senderAddress: "", customerName: "", receiverEmail: "", origin: "Shuwaikh, Kuwait", destination: "Dubai, UAE", status: "Shipment created", eta: "", service: "GCC Road Express", description: "General cargo", weight: "", pieces: "1", currentLocation: "Shuwaikh, Kuwait" };
const emptyCustomer = { companyName: "", contactName: "", email: "", phone: "", country: "Kuwait", status: "Active", notes: "" };
const emptyAsset = { assetCode: "", name: "", type: "Truck", registration: "", driver: "Unassigned", status: "Available", location: "Kuwait Operations Center", serviceDue: "" };
const defaultSettings: OperationsSettings = { branchName: "Kuwait Operations Center", dispatchEmail: "operations@redline-logistics.com", supportPhone: "+965 2228 6400", timezone: "Asia/Kuwait", mapRefreshSeconds: 10, receiverNotifications: true, delayAlerts: true };
type ShipmentFormState = typeof emptyShipment & { carrier: string };

export function AdminDashboard({ user }: { user: { displayName: string; email: string } }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("control");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assets, setAssets] = useState<FleetAsset[]>([]);
  const [settings, setSettings] = useState<OperationsSettings>(defaultSettings);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"shipment" | "customer" | "asset" | null>(null);
  const [shipmentForm, setShipmentForm] = useState(emptyShipment);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [shipmentImage, setShipmentImage] = useState<File | null>(null);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [editForm, setEditForm] = useState<ShipmentFormState | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [edits, setEdits] = useState<Record<string, { status: string; currentLocation: string; progress: number; eta: string }>>({});
  const [assetEdits, setAssetEdits] = useState<Record<string, Pick<FleetAsset, "status" | "driver" | "location" | "serviceDue">>>({});

  async function loadShipments(silent = false) {
    if (!silent) setLoading(true);
    const snapshot = await getDocs(firestoreQuery(collection(firestore, "shipments"), orderBy("updatedAt", "desc"), limit(100)));
    setShipments(snapshot.docs.map((item) => item.data() as Shipment));
  }

  async function loadOperations() {
    const [customerRows, assetRows, settingsRow] = await Promise.all([
      getDocs(collection(firestore, "customers")),
      getDocs(collection(firestore, "fleetAssets")),
      getDoc(doc(firestore, "operationSettings", "kuwait")),
    ]);
    setCustomers(customerRows.docs.map((item) => ({ id: item.id, ...item.data() } as Customer)));
    setAssets(assetRows.docs.map((item) => ({ id: item.id, ...item.data() } as FleetAsset)));
    setSettings(settingsRow.exists() ? { ...defaultSettings, ...(settingsRow.data() as Partial<OperationsSettings>) } : defaultSettings);
  }

  async function refreshDashboard() {
    setLoading(true); setNotice("");
    try { await Promise.all([loadShipments(true), loadOperations()]); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load operations dashboard"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refreshDashboard(); }, []);

  const shipmentResults = useMemo(() => shipments.filter((item) => [item.trackingNumber, item.customerName, item.destination, item.status].join(" ").toLowerCase().includes(query.toLowerCase())), [shipments, query]);
  const customerResults = useMemo(() => customers.filter((item) => [item.companyName, item.contactName, item.email, item.country].join(" ").toLowerCase().includes(query.toLowerCase())), [customers, query]);
  const assetResults = useMemo(() => assets.filter((item) => [item.assetCode, item.name, item.driver, item.location, item.status].join(" ").toLowerCase().includes(query.toLowerCase())), [assets, query]);
  const delivered = shipments.filter((item) => item.status.toLowerCase().includes("delivered")).length;
  const inTransit = shipments.filter((item) => item.status.toLowerCase().includes("transit")).length;
  const exceptions = shipments.filter((item) => /hold|exception|pending/i.test(item.status)).length;
  const availableAssets = assets.filter((item) => item.status === "Available").length;

  function changeTab(tab: DashboardTab) { setActiveTab(tab); setQuery(""); setNotice(""); }
  function openPrimaryAction() {
    if (activeTab === "customers") setModal("customer");
    else if (activeTab === "fleet") setModal("asset");
    else setModal("shipment");
  }

  async function sendShipmentNotice(shipment: Shipment, kind: "created" | "status-update") {
    if (!settings.receiverNotifications) return { sent: false, message: "Receiver emails are disabled in Settings." };
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) return { sent: false, message: "Sign in again to send notifications." };
    const response = await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shipment, kind }) });
    return (await response.json()) as { sent: boolean; message: string };
  }

  async function uploadPackageImage(trackingNumber: string, file: File) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60) || "package.jpg";
    const imageRef = ref(firebaseStorage, `shipments/${trackingNumber}/${Date.now()}-${safeName}`);
    await uploadBytes(imageRef, file, { contentType: file.type || "image/jpeg" });
    return getDownloadURL(imageRef);
  }

  async function createShipment(event: FormEvent) {
    event.preventDefault(); setNotice("Creating shipment…");
    try {
      const trackingNumber = shipmentForm.trackingNumber.trim().toUpperCase();
      const status = shipmentForm.status || "Shipment created";
      const progress = progressForStatus(status) ?? 5;
      const originPoint = coordinatesForLocation(shipmentForm.origin, { latitude: 29.3759, longitude: 47.9774 });
      const destinationPoint = coordinatesForLocation(shipmentForm.destination, { latitude: 25.2048, longitude: 55.2708 });
      const livePoint = interpolateRoute(originPoint, destinationPoint, progress);
      const now = new Date().toISOString();
      let packageImageUrl = "";
      let imageFailed = false;
      if (shipmentImage) {
        try { packageImageUrl = await uploadPackageImage(trackingNumber, shipmentImage); }
        catch { imageFailed = true; }
      }
      const shipment: Shipment = { ...shipmentForm, trackingNumber, pieces: Number(shipmentForm.pieces), progress, latitude: livePoint.latitude, longitude: livePoint.longitude, originLatitude: originPoint.latitude, originLongitude: originPoint.longitude, destinationLatitude: destinationPoint.latitude, destinationLongitude: destinationPoint.longitude, carrier: "RedLine Direct", packageImageUrl, updatedAt: now };
      await setDoc(doc(firestore, "shipments", trackingNumber), shipment);
      await addDoc(collection(firestore, "shipments", trackingNumber, "events"), { label: status, location: shipment.currentLocation, details: `Shipment registered by ${user.displayName}`, eventTime: now, completed: true });
      const email = await sendShipmentNotice(shipment, "created");
      setNotice(`${email.sent ? "Shipment created and receiver email sent." : `Shipment created. ${email.message}`}${imageFailed ? " The package photo could not be uploaded." : ""}`);
      setShipmentForm(emptyShipment); setShipmentImage(null); setModal(null); await loadShipments(true);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to create shipment"); }
  }

  async function createCustomer(event: FormEvent) {
    event.preventDefault(); setNotice("Creating customer…");
    try {
      await addDoc(collection(firestore, "customers"), { ...customerForm, email: customerForm.email.trim().toLowerCase(), createdAt: new Date().toISOString() });
      setNotice("Customer account created."); setCustomerForm(emptyCustomer); setModal(null); await loadOperations();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to create customer"); }
  }

  async function createAsset(event: FormEvent) {
    event.preventDefault(); setNotice("Adding fleet asset…");
    try {
      await addDoc(collection(firestore, "fleetAssets"), { ...assetForm, assetCode: assetForm.assetCode.trim().toUpperCase(), registration: assetForm.registration.trim().toUpperCase(), updatedAt: new Date().toISOString() });
      setNotice("Fleet asset added to the operations register."); setAssetForm(emptyAsset); setModal(null); await loadOperations();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to add asset"); }
  }

  function getEdit(item: Shipment) { return edits[item.trackingNumber] ?? { status: item.status, currentLocation: item.currentLocation, progress: item.progress, eta: item.eta }; }
  function changeEdit(item: Shipment, field: string, value: string | number) { setEdits((current) => ({ ...current, [item.trackingNumber]: { ...getEdit(item), [field]: value } })); }
  function changeStatus(item: Shipment, status: string) {
    const edit = getEdit(item); const mapped = progressForStatus(status);
    setEdits((current) => ({ ...current, [item.trackingNumber]: { ...edit, status, progress: mapped === null ? edit.progress : Math.max(edit.progress, mapped) } }));
  }
  async function saveShipment(item: Shipment) {
    const edit = getEdit(item); setNotice(`Saving ${item.trackingNumber}…`);
    try {
      const statusChanged = edit.status !== item.status;
      const mapped = progressForStatus(edit.status);
      const progress = Math.max(item.progress, mapped ?? edit.progress, statusChanged && mapped === null ? Math.min(98, item.progress + 7) : 0);
      const livePoint = interpolateRoute({ latitude: item.originLatitude, longitude: item.originLongitude }, { latitude: item.destinationLatitude, longitude: item.destinationLongitude }, progress);
      const updatedAt = new Date().toISOString();
      const shipment = { ...item, ...edit, progress, latitude: livePoint.latitude, longitude: livePoint.longitude, updatedAt };
      await updateDoc(doc(firestore, "shipments", item.trackingNumber), shipment);
      if (statusChanged) await addDoc(collection(firestore, "shipments", item.trackingNumber, "events"), { label: edit.status, location: edit.currentLocation, details: `Shipment updated by ${user.displayName}`, eventTime: updatedAt, completed: true });
      const email = statusChanged ? await sendShipmentNotice(shipment, "status-update") : { sent: false, message: "No status change; no email was sent." };
      setNotice(email.sent ? `${item.trackingNumber} updated and receiver notified.` : `${item.trackingNumber} updated. ${email.message}`); await loadShipments(true);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update shipment"); }
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
      origin: item.origin ?? "",
      destination: item.destination ?? "",
      status: item.status ?? "Shipment created",
      eta: item.eta ? item.eta.slice(0, 16) : "",
      service: item.service ?? "GCC Road Express",
      description: item.description ?? "",
      weight: item.weight ?? "",
      pieces: String(item.pieces ?? 1),
      currentLocation: item.currentLocation ?? "",
      carrier: item.carrier ?? "RedLine Direct",
    });
  }
  function closeShipmentEditor() { setEditingShipment(null); setEditForm(null); setEditImage(null); }
  async function saveEditedShipment(event: FormEvent) {
    event.preventDefault();
    if (!editingShipment || !editForm) return;
    const item = editingShipment;
    setNotice(`Saving ${item.trackingNumber}…`);
    try {
      const statusChanged = editForm.status !== item.status;
      const mapped = progressForStatus(editForm.status);
      const progress = statusChanged ? Math.max(item.progress, mapped ?? item.progress) : item.progress;
      const originPoint = coordinatesForLocation(editForm.origin, { latitude: item.originLatitude, longitude: item.originLongitude });
      const destinationPoint = coordinatesForLocation(editForm.destination, { latitude: item.destinationLatitude, longitude: item.destinationLongitude });
      const livePoint = interpolateRoute(originPoint, destinationPoint, progress);
      const updatedAt = new Date().toISOString();
      let packageImageUrl = item.packageImageUrl ?? "";
      let imageFailed = false;
      if (editImage) {
        try { packageImageUrl = await uploadPackageImage(item.trackingNumber, editImage); }
        catch { imageFailed = true; }
      }
      const shipment: Shipment = { ...item, ...editForm, pieces: Number(editForm.pieces) || item.pieces, progress, latitude: livePoint.latitude, longitude: livePoint.longitude, originLatitude: originPoint.latitude, originLongitude: originPoint.longitude, destinationLatitude: destinationPoint.latitude, destinationLongitude: destinationPoint.longitude, packageImageUrl, updatedAt };
      await updateDoc(doc(firestore, "shipments", item.trackingNumber), shipment);
      if (statusChanged) await addDoc(collection(firestore, "shipments", item.trackingNumber, "events"), { label: editForm.status, location: editForm.currentLocation, details: `Shipment updated by ${user.displayName}`, eventTime: updatedAt, completed: true });
      const email = statusChanged ? await sendShipmentNotice(shipment, "status-update") : null;
      setNotice(`${item.trackingNumber} fully updated.${email?.sent ? " Receiver notified by email." : ""}${imageFailed ? " The package photo could not be uploaded." : ""}`);
      closeShipmentEditor(); await loadShipments(true);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update shipment"); }
  }

  async function updateCustomer(customer: Customer, status: string) {
    setNotice(`Updating ${customer.companyName}…`);
    try {
      await updateDoc(doc(firestore, "customers", customer.id), { status, phone: customer.phone, notes: customer.notes });
      setNotice(`${customer.companyName} is now ${status.toLowerCase()}.`); await loadOperations();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update customer"); }
  }

  function getAssetEdit(asset: FleetAsset) { return assetEdits[asset.id] ?? { status: asset.status, driver: asset.driver, location: asset.location, serviceDue: asset.serviceDue }; }
  function changeAssetEdit(asset: FleetAsset, field: string, value: string) { setAssetEdits((current) => ({ ...current, [asset.id]: { ...getAssetEdit(asset), [field]: value } })); }
  async function saveAsset(asset: FleetAsset) {
    setNotice(`Saving ${asset.assetCode}…`);
    try {
      await updateDoc(doc(firestore, "fleetAssets", asset.id), { ...getAssetEdit(asset), updatedAt: new Date().toISOString() });
      setNotice(`${asset.assetCode} updated.`); await loadOperations();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update asset"); }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault(); setNotice("Saving operations settings…");
    try {
      await setDoc(doc(firestore, "operationSettings", "kuwait"), { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
      setNotice("Operations settings saved and applied.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save settings"); }
  }

  const sectionCopy: Record<DashboardTab, { kicker: string; title: string; description: string; action?: string }> = {
    control: { kicker: "Operations control tower", title: `Good afternoon, ${user.displayName.split(" ")[0]}.`, description: "Live network activity and operational readiness at a glance.", action: "Create shipment" },
    shipments: { kicker: "Shipment management", title: "Shipment register", description: "Create, search and update every shipment milestone.", action: "Create shipment" },
    customers: { kicker: "Customer management", title: "Customer accounts", description: "Maintain client contacts and account status.", action: "Add customer" },
    fleet: { kicker: "Fleet management", title: "Fleet & assets", description: "Assign drivers and keep equipment status current.", action: "Add asset" },
    settings: { kicker: "System configuration", title: "Operations settings", description: "Control live-map timing and notification preferences." },
  };
  const copy = sectionCopy[activeTab];

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="brand admin-brand"><span className="brand-mark"><i /><i /><i /></span><span><strong>REDLINE</strong><small>OPERATIONS</small></span></Link>
        <nav aria-label="Operations dashboard">
          <button className={activeTab === "control" ? "active" : ""} onClick={() => changeTab("control")}><Activity size={17} /> Control tower</button>
          <button className={activeTab === "shipments" ? "active" : ""} onClick={() => changeTab("shipments")}><Truck size={17} /> Shipments <b>{shipments.length}</b></button>
          <button className={activeTab === "customers" ? "active" : ""} onClick={() => changeTab("customers")}><Users size={17} /> Customers <b>{customers.length}</b></button>
          <button className={activeTab === "fleet" ? "active" : ""} onClick={() => changeTab("fleet")}><Boxes size={17} /> Fleet & assets <b>{assets.length}</b></button>
          <button className={activeTab === "settings" ? "active" : ""} onClick={() => changeTab("settings")}><Settings2 size={17} /> Settings</button>
        </nav>
        <div className="admin-profile"><span>{user.displayName.slice(0, 2).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>{user.email}</small></div><button aria-label="Sign out" onClick={() => void signOut(firebaseAuth)}><LogOut size={16} /></button></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar"><Link href="/"><ArrowLeft size={16} /> Public website</Link><span>{settings.branchName} <i /></span></header>
        <div className="admin-content">
          <div className="admin-title"><div><span className="page-kicker">{copy.kicker}</span><h1>{copy.title}</h1><p>{copy.description}</p></div>{copy.action && <button onClick={openPrimaryAction}><CirclePlus size={18} /> {copy.action}</button>}</div>
          {notice && <div className="admin-global-notice">{notice}</div>}

          {activeTab === "control" && <ControlTower shipments={shipments} assets={assets} inTransit={inTransit} delivered={delivered} exceptions={exceptions} availableAssets={availableAssets} loading={loading} onOpenShipments={() => changeTab("shipments")} onRefresh={() => void refreshDashboard()} />}
          {activeTab === "shipments" && <ShipmentRegister loading={loading} items={shipmentResults} total={shipments.length} query={query} setQuery={setQuery} getEdit={getEdit} changeStatus={changeStatus} changeEdit={changeEdit} saveShipment={saveShipment} onEdit={openShipmentEditor} onRefresh={() => void refreshDashboard()} />}
          {activeTab === "customers" && <CustomerRegister loading={loading} items={customerResults} shipments={shipments} query={query} setQuery={setQuery} updateCustomer={updateCustomer} />}
          {activeTab === "fleet" && <FleetRegister loading={loading} items={assetResults} query={query} setQuery={setQuery} getEdit={getAssetEdit} changeEdit={changeAssetEdit} saveAsset={saveAsset} />}
          {activeTab === "settings" && <SettingsPanel settings={settings} setSettings={setSettings} saveSettings={saveSettings} />}
        </div>
      </section>

      {modal === "shipment" && <ShipmentModal form={shipmentForm} setForm={setShipmentForm} image={shipmentImage} setImage={setShipmentImage} onSubmit={createShipment} onClose={() => { setShipmentImage(null); setModal(null); }} />}
      {editingShipment && editForm && <EditShipmentModal shipment={editingShipment} form={editForm} setForm={setEditForm} image={editImage} setImage={setEditImage} onSubmit={saveEditedShipment} onClose={closeShipmentEditor} />}
      {modal === "customer" && <CustomerModal form={customerForm} setForm={setCustomerForm} onSubmit={createCustomer} onClose={() => setModal(null)} />}
      {modal === "asset" && <AssetModal form={assetForm} setForm={setAssetForm} onSubmit={createAsset} onClose={() => setModal(null)} />}
      <datalist id="shipment-status-options">{SHIPMENT_STATUS_STEPS.map((step) => <option value={step.label} key={step.label} />)}</datalist>
    </main>
  );
}

function ControlTower({ shipments, assets, inTransit, delivered, exceptions, availableAssets, loading, onOpenShipments, onRefresh }: { shipments: Shipment[]; assets: FleetAsset[]; inTransit: number; delivered: number; exceptions: number; availableAssets: number; loading: boolean; onOpenShipments: () => void; onRefresh: () => void }) {
  return <>
    <div className="admin-metrics">
      <div><span><PackageSearch size={20} /></span><small>ACTIVE SHIPMENTS</small><strong>{shipments.length}</strong><em>Live network total</em></div>
      <div><span><Truck size={20} /></span><small>IN TRANSIT</small><strong>{inTransit}</strong><em>Moving now</em></div>
      <div><span><CheckCircle2 size={20} /></span><small>DELIVERED</small><strong>{delivered}</strong><em>Completed records</em></div>
      <div><span><Gauge size={20} /></span><small>FLEET READY</small><strong>{availableAssets}/{assets.length}</strong><em>Available assets</em></div>
    </div>
    <div className="admin-control-grid">
      <section className="admin-board">
        <div className="admin-board-head"><div><h2>Live shipment pulse</h2><span>Latest network movement</span></div><button className="icon-action" onClick={onRefresh} aria-label="Refresh control tower"><RefreshCw size={15} /></button></div>
        <div className="pulse-list">
          {loading && <div className="module-empty">Loading live operations…</div>}
          {!loading && shipments.slice(0, 6).map((item) => <button key={item.trackingNumber} onClick={onOpenShipments} className="pulse-row"><span className={item.status.toLowerCase().includes("delivered") ? "pulse-dot complete" : "pulse-dot"} /><div><strong>{item.trackingNumber}</strong><small>{item.origin} → {item.destination}</small></div><div className="pulse-progress"><i style={{ width: `${item.progress}%` }} /><small>{item.status} · {item.progress}%</small></div></button>)}
          {!loading && shipments.length === 0 && <div className="module-empty">No shipments yet. Create the first tracking record.</div>}
        </div>
      </section>
      <section className="admin-board network-watch">
        <div className="admin-board-head"><div><h2>Network watch</h2><span>Items needing attention</span></div></div>
        <div className="watch-item"><span className={exceptions ? "watch-icon alert" : "watch-icon"}><AlertTriangle size={18} /></span><div><strong>{exceptions} shipment exceptions</strong><small>{exceptions ? "Review pending, on-hold or exception records." : "No active shipment exceptions."}</small></div></div>
        <div className="watch-item"><span className="watch-icon"><Wrench size={18} /></span><div><strong>{assets.filter((item) => item.status === "Maintenance").length} assets in maintenance</strong><small>{assets.length ? "Fleet status is synchronized with the asset register." : "Add vehicles and equipment to begin fleet monitoring."}</small></div></div>
        <div className="watch-item"><span className="watch-icon"><BellRing size={18} /></span><div><strong>Receiver notification workflow</strong><small>Status emails are triggered whenever a shipment milestone changes.</small></div></div>
      </section>
    </div>
  </>;
}

function SearchHead({ title, count, query, setQuery, placeholder, onRefresh }: { title: string; count: number; query: string; setQuery: (value: string) => void; placeholder: string; onRefresh?: () => void }) {
  return <div className="admin-board-head"><div><h2>{title}</h2><span>{count} records shown</span></div><div className="admin-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />{onRefresh && <button onClick={onRefresh} aria-label="Refresh"><RefreshCw size={15} /></button>}</div></div>;
}

function ShipmentRegister({ loading, items, total, query, setQuery, getEdit, changeStatus, changeEdit, saveShipment, onEdit, onRefresh }: { loading: boolean; items: Shipment[]; total: number; query: string; setQuery: (value: string) => void; getEdit: (item: Shipment) => { status: string; currentLocation: string; progress: number; eta: string }; changeStatus: (item: Shipment, value: string) => void; changeEdit: (item: Shipment, field: string, value: string | number) => void; saveShipment: (item: Shipment) => Promise<void>; onEdit: (item: Shipment) => void; onRefresh: () => void }) {
  return <section className="admin-board"><SearchHead title="Shipment register" count={items.length} query={query} setQuery={setQuery} placeholder={`Search ${total} shipments`} onRefresh={onRefresh} /><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Shipment & receiver</th><th>Route</th><th>Status & route progress</th><th>Current location</th><th>ETA</th><th /></tr></thead><tbody>
    {loading ? <tr><td colSpan={6} className="empty-table">Loading live shipment records…</td></tr> : items.map((item) => { const edit = getEdit(item); return <tr key={item.trackingNumber}><td><strong>{item.trackingNumber}</strong><span>{item.customerName}</span><small>{item.receiverEmail}</small><small>{item.service}</small></td><td><strong>{item.origin}</strong><span className="route-arrow">→</span><span>{item.destination}</span></td><td><input list="shipment-status-options" value={edit.status} onChange={(e) => changeStatus(item, e.target.value)} aria-label={`${item.trackingNumber} status`} /><input type="range" min="0" max="100" value={edit.progress} onChange={(e) => changeEdit(item, "progress", Number(e.target.value))} /><small>{edit.progress}% complete · choose a status or type your own</small></td><td><input value={edit.currentLocation} onChange={(e) => changeEdit(item, "currentLocation", e.target.value)} /></td><td><input type="datetime-local" value={edit.eta.slice(0, 16)} onChange={(e) => changeEdit(item, "eta", e.target.value)} /></td><td><div className="row-actions"><button className="save-row" onClick={() => void saveShipment(item)}>Save update</button><button className="edit-row" onClick={() => onEdit(item)}>Edit all details</button></div></td></tr>; })}
    {!loading && items.length === 0 && <tr><td colSpan={6} className="empty-table">No shipment records match your search.</td></tr>}
  </tbody></table></div></section>;
}

function CustomerRegister({ loading, items, shipments, query, setQuery, updateCustomer }: { loading: boolean; items: Customer[]; shipments: Shipment[]; query: string; setQuery: (value: string) => void; updateCustomer: (customer: Customer, status: string) => Promise<void> }) {
  return <section className="admin-board"><SearchHead title="Customer directory" count={items.length} query={query} setQuery={setQuery} placeholder="Search customers" /><div className="admin-table-wrap"><table className="admin-table customer-table"><thead><tr><th>Company</th><th>Primary contact</th><th>Market</th><th>Shipments</th><th>Account status</th></tr></thead><tbody>
    {loading ? <tr><td colSpan={5} className="empty-table">Loading customer accounts…</td></tr> : items.map((item) => <tr key={item.id}><td><strong>{item.companyName}</strong><span>Customer #{String(item.id).padStart(4, "0")}</span></td><td><strong>{item.contactName}</strong><span><Mail size={12} /> {item.email}</span>{item.phone && <span><Phone size={12} /> {item.phone}</span>}</td><td><strong>{item.country}</strong><span>{item.notes || "Standard account"}</span></td><td><strong>{shipments.filter((shipment) => shipment.receiverEmail.toLowerCase() === item.email.toLowerCase()).length}</strong><span>linked records</span></td><td><select value={item.status} onChange={(e) => void updateCustomer(item, e.target.value)} aria-label={`${item.companyName} status`}><option>Active</option><option>Priority</option><option>On hold</option><option>Inactive</option></select></td></tr>)}
    {!loading && items.length === 0 && <tr><td colSpan={5} className="empty-table">No customers yet. Use “Add customer” to create the first account.</td></tr>}
  </tbody></table></div></section>;
}

function FleetRegister({ loading, items, query, setQuery, getEdit, changeEdit, saveAsset }: { loading: boolean; items: FleetAsset[]; query: string; setQuery: (value: string) => void; getEdit: (asset: FleetAsset) => Pick<FleetAsset, "status" | "driver" | "location" | "serviceDue">; changeEdit: (asset: FleetAsset, field: string, value: string) => void; saveAsset: (asset: FleetAsset) => Promise<void> }) {
  return <section className="admin-board"><SearchHead title="Fleet asset register" count={items.length} query={query} setQuery={setQuery} placeholder="Search fleet and assets" /><div className="admin-table-wrap"><table className="admin-table fleet-table"><thead><tr><th>Asset</th><th>Status</th><th>Driver / custodian</th><th>Current location</th><th>Service due</th><th /></tr></thead><tbody>
    {loading ? <tr><td colSpan={6} className="empty-table">Loading fleet records…</td></tr> : items.map((item) => { const edit = getEdit(item); return <tr key={item.id}><td><strong>{item.assetCode}</strong><span>{item.name}</span><small>{item.type}{item.registration ? ` · ${item.registration}` : ""}</small></td><td><select value={edit.status} onChange={(e) => changeEdit(item, "status", e.target.value)}><option>Available</option><option>Assigned</option><option>In transit</option><option>Maintenance</option><option>Out of service</option></select></td><td><input value={edit.driver} onChange={(e) => changeEdit(item, "driver", e.target.value)} /></td><td><input value={edit.location} onChange={(e) => changeEdit(item, "location", e.target.value)} /></td><td><input type="date" value={edit.serviceDue} onChange={(e) => changeEdit(item, "serviceDue", e.target.value)} /></td><td><button className="save-row" onClick={() => void saveAsset(item)}>Save asset</button></td></tr>; })}
    {!loading && items.length === 0 && <tr><td colSpan={6} className="empty-table">No fleet assets yet. Add trucks, vans, trailers or warehouse equipment.</td></tr>}
  </tbody></table></div></section>;
}

function SettingsPanel({ settings, setSettings, saveSettings }: { settings: OperationsSettings; setSettings: (settings: OperationsSettings) => void; saveSettings: (event: FormEvent) => Promise<void> }) {
  return <form className="settings-layout" onSubmit={saveSettings}>
    <section className="admin-board settings-card"><div className="settings-heading"><span><Building2 size={19} /></span><div><h2>Operations profile</h2><p>Used throughout the private Kuwait dashboard.</p></div></div><div className="settings-fields"><label>Branch name<input required value={settings.branchName} onChange={(e) => setSettings({ ...settings, branchName: e.target.value })} /></label><label>Dispatch email<input required type="email" value={settings.dispatchEmail} onChange={(e) => setSettings({ ...settings, dispatchEmail: e.target.value })} /></label><label>Support phone<input required value={settings.supportPhone} onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })} placeholder="+965 2228 6400" /><small>Shown in the “Need a human?” box on the public tracking page.</small></label><label>Timezone<select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}><option value="Asia/Kuwait">Kuwait (UTC+3)</option><option value="Asia/Dubai">Dubai (UTC+4)</option><option value="Asia/Riyadh">Riyadh (UTC+3)</option></select></label><label>Live-map refresh<input type="number" min="5" max="120" value={settings.mapRefreshSeconds} onChange={(e) => setSettings({ ...settings, mapRefreshSeconds: Number(e.target.value) })} /><small>Seconds between tracking-page updates.</small></label></div></section>
    <section className="admin-board settings-card"><div className="settings-heading"><span><BellRing size={19} /></span><div><h2>Notification controls</h2><p>Manage automatic operational alerts.</p></div></div><div className="toggle-list"><label><div><strong>Receiver status emails</strong><small>Send branded Resend emails when shipment status changes.</small></div><input type="checkbox" checked={settings.receiverNotifications} onChange={(e) => setSettings({ ...settings, receiverNotifications: e.target.checked })} /></label><label><div><strong>Delay and exception alerts</strong><small>Highlight pending, on-hold and delivery-exception records.</small></div><input type="checkbox" checked={settings.delayAlerts} onChange={(e) => setSettings({ ...settings, delayAlerts: e.target.checked })} /></label></div></section>
    <div className="settings-save"><button type="submit"><Save size={17} /> Save settings</button><span>Changes are stored for the Kuwait Operations Center.</span></div>
  </form>;
}

function ModalFrame({ title, kicker, onClose, onSubmit, children }: { title: string; kicker: string; onClose: () => void; onSubmit: (event: FormEvent) => void; children: ReactNode }) {
  return <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="operations-modal-title"><form onSubmit={onSubmit}><div className="modal-head"><div><span>{kicker}</span><h2 id="operations-modal-title">{title}</h2></div><button type="button" onClick={onClose}>×</button></div>{children}<div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button type="submit">Save record</button></div></form></div>;
}

function ShipmentModal({ form, setForm, image, setImage, onSubmit, onClose }: { form: typeof emptyShipment; setForm: (form: typeof emptyShipment) => void; image: File | null; setImage: (file: File | null) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  return <ModalFrame title="Create tracking record" kicker="NEW SHIPMENT" onClose={onClose} onSubmit={onSubmit}><div className="modal-grid"><div className="modal-section-title">Sender information</div><label>Sender name<input required value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} /></label><label>Sender email<input required type="email" value={form.senderEmail} onChange={(e) => setForm({ ...form, senderEmail: e.target.value })} /></label><label>Sender phone<input required value={form.senderPhone} onChange={(e) => setForm({ ...form, senderPhone: e.target.value })} placeholder="+965 ..." /></label><label>Sender company<input value={form.senderCompany} onChange={(e) => setForm({ ...form, senderCompany: e.target.value })} /></label><label className="modal-wide">Sender address<input required value={form.senderAddress} onChange={(e) => setForm({ ...form, senderAddress: e.target.value })} /></label><div className="modal-section-title">Receiver & shipment</div><label>Tracking number<input required value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value.toUpperCase() })} placeholder="RLK-00000000" /></label><label>Receiver name<input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label><label>Receiver email<input required type="email" value={form.receiverEmail} onChange={(e) => setForm({ ...form, receiverEmail: e.target.value })} placeholder="receiver@example.com" /></label><label>Initial status<input list="shipment-status-options" required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} /></label><label>Origin<input required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></label><label>Destination<input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></label><label>ETA (destination arrival date)<input required type="datetime-local" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} /></label><label>Service<select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}><option>GCC Road Express</option><option>Air Priority</option><option>Ocean Freight</option><option>Local Same-Day</option></select></label><label>Cargo description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label>Weight<input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 1,250 kg" /></label><label>Pieces<input type="number" min="1" value={form.pieces} onChange={(e) => setForm({ ...form, pieces: e.target.value })} /></label><label>Current location<input value={form.currentLocation} onChange={(e) => setForm({ ...form, currentLocation: e.target.value })} /></label><PackageImageInput file={image} setFile={setImage} /></div></ModalFrame>;
}

function EditShipmentModal({ shipment, form, setForm, image, setImage, onSubmit, onClose }: { shipment: Shipment; form: ShipmentFormState; setForm: (form: ShipmentFormState) => void; image: File | null; setImage: (file: File | null) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  const serviceOptions = ["GCC Road Express", "Air Priority", "Ocean Freight", "Local Same-Day"];
  return <ModalFrame title={`Edit ${shipment.trackingNumber}`} kicker="FULL SHIPMENT EDIT" onClose={onClose} onSubmit={onSubmit}><div className="modal-grid"><div className="modal-section-title">Sender information</div><label>Sender name<input required value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} /></label><label>Sender email<input required type="email" value={form.senderEmail} onChange={(e) => setForm({ ...form, senderEmail: e.target.value })} /></label><label>Sender phone<input required value={form.senderPhone} onChange={(e) => setForm({ ...form, senderPhone: e.target.value })} placeholder="+965 ..." /></label><label>Sender company<input value={form.senderCompany} onChange={(e) => setForm({ ...form, senderCompany: e.target.value })} /></label><label className="modal-wide">Sender address<input required value={form.senderAddress} onChange={(e) => setForm({ ...form, senderAddress: e.target.value })} /></label><div className="modal-section-title">Receiver &amp; shipment</div><label>Tracking number<input value={form.trackingNumber} readOnly disabled aria-label="Tracking number (cannot be changed)" /></label><label>Receiver name<input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label><label>Receiver email<input required type="email" value={form.receiverEmail} onChange={(e) => setForm({ ...form, receiverEmail: e.target.value })} placeholder="receiver@example.com" /></label><label>Status<input list="shipment-status-options" required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} /></label><label>Origin<input required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></label><label>Destination<input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></label><label>ETA (destination arrival date)<input required type="datetime-local" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} /></label><label>Service<select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>{serviceOptions.map((option) => <option key={option}>{option}</option>)}{form.service && !serviceOptions.includes(form.service) && <option>{form.service}</option>}</select></label><label>Carrier<input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} /></label><label>Cargo description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label>Weight<input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 1,250 kg" /></label><label>Pieces<input type="number" min="1" value={form.pieces} onChange={(e) => setForm({ ...form, pieces: e.target.value })} /></label><label>Current location<input value={form.currentLocation} onChange={(e) => setForm({ ...form, currentLocation: e.target.value })} /></label><PackageImageInput file={image} setFile={setImage} currentUrl={shipment.packageImageUrl} /></div></ModalFrame>;
}

function PackageImageInput({ file, setFile, currentUrl }: { file: File | null; setFile: (file: File | null) => void; currentUrl?: string }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const shown = preview || currentUrl || "";
  return <>
    <label className="modal-wide">Package photo (optional)<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
    {shown && <div className="modal-image-preview modal-wide"><img src={shown} alt="Package preview" /><span>{preview ? "New photo selected — it will be uploaded when you save." : "Current package photo. Choose a new file above to replace it."}</span></div>}
  </>;
}

function CustomerModal({ form, setForm, onSubmit, onClose }: { form: typeof emptyCustomer; setForm: (form: typeof emptyCustomer) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  return <ModalFrame title="Create customer account" kicker="NEW CUSTOMER" onClose={onClose} onSubmit={onSubmit}><div className="modal-grid"><label>Company name<input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></label><label>Contact name<input required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></label><label>Email address<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+965 ..." /></label><label>Country<input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label><label>Account status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Priority</option><option>On hold</option><option>Inactive</option></select></label><label className="modal-wide">Notes<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Billing or service notes" /></label></div></ModalFrame>;
}

function AssetModal({ form, setForm, onSubmit, onClose }: { form: typeof emptyAsset; setForm: (form: typeof emptyAsset) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  return <ModalFrame title="Add fleet or warehouse asset" kicker="NEW ASSET" onClose={onClose} onSubmit={onSubmit}><div className="modal-grid"><label>Asset code<input required value={form.assetCode} onChange={(e) => setForm({ ...form, assetCode: e.target.value.toUpperCase() })} placeholder="KWT-TRK-01" /></label><label>Asset name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Volvo FH16" /></label><label>Asset type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Truck</option><option>Delivery van</option><option>Trailer</option><option>Forklift</option><option>Warehouse equipment</option></select></label><label>Registration<input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} /></label><label>Driver / custodian<input value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Available</option><option>Assigned</option><option>In transit</option><option>Maintenance</option><option>Out of service</option></select></label><label>Current location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label><label>Next service date<input type="date" value={form.serviceDue} onChange={(e) => setForm({ ...form, serviceDue: e.target.value })} /></label></div></ModalFrame>;
}
