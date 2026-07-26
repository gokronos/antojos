"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Product = { id?: number; name: string; description: string; price: number; category: string; icon: string; active: boolean };
type Location = { id?: number; name: string; type: "Mesa" | "Barra" | "Otro"; active: boolean };
type OrderStatus = "Nuevo" | "Preparando" | "Listo" | "Entregado" | "Cancelado";
type Order = { id: number; locationName: string; customerName: string; notes: string; total: number; status: OrderStatus; createdAt: string; items: { productName: string; quantity: number }[] };
type AdminData = { products: Product[]; locations: Location[]; orders: Order[]; stats: { count: number; sales: number; average: number } };
type InstallPrompt = Event & { prompt: () => Promise<void> };

const money = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const statuses: OrderStatus[] = ["Nuevo", "Preparando", "Listo", "Entregado", "Cancelado"];
const ago = (date: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  return new Date(date).toLocaleString("es-CO", { hour: "numeric", minute: "2-digit" });
};

export default function AdminPanel({ displayName }: { displayName: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);

  const load = useCallback(async (quiet = false) => {
    try {
      const response = await fetch("/api/admin", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      setError("");
    } catch (cause) {
      if (!quiet) setError(cause instanceof Error ? cause.message : "No fue posible cargar el panel.");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 10000);
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => { window.clearInterval(timer); window.removeEventListener("beforeinstallprompt", handler); };
  }, [load]);

  async function action(name: string, payload: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, data: payload }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible guardar.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const activeOrders = useMemo(() => data?.orders.filter((order) => !["Entregado", "Cancelado"].includes(order.status)) ?? [], [data]);
  const date = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return <main className="admin-shell">
    <aside className="sidebar">
      <div className="brand"><span>ML</span><div>Mesa Lista<small>Panel del local</small></div></div>
      <nav><button className="active">▦ <span>Pedidos</span><b>{activeOrders.filter((o) => o.status === "Nuevo").length}</b></button><button onClick={() => document.getElementById("products")?.scrollIntoView()}>◫ <span>Productos</span></button><button onClick={() => document.getElementById("locations")?.scrollIntoView()}>⌁ <span>Mesas y barra</span></button></nav>
      <a className="view-menu" href="/">Ver menú del cliente ↗</a>
    </aside>
    <section className="admin-main">
      <header className="admin-top"><div><p>{date}</p><h1>Hola, {displayName}</h1></div><div className="open-pill"><i /> Sistema conectado</div></header>
      {error && <div className="system-message error-message">{error}<button onClick={() => load()}>Reintentar</button></div>}
      {!data ? <div className="system-message">Cargando pedidos y menú…</div> : <>
        <div className="stats"><article><span>Pedidos hoy</span><strong>{data.stats.count}</strong><em>{activeOrders.length} pedidos activos</em></article><article><span>Ventas hoy</span><strong>{money(data.stats.sales)}</strong><em>Pedidos no cancelados</em></article><article><span>Ticket promedio</span><strong>{money(data.stats.average)}</strong><em>{data.locations.filter((l) => l.active).length} ubicaciones disponibles</em></article></div>
        <div className="section-title"><div><h2>Pedidos en vivo</h2><p>Se actualizan cada 10 segundos</p></div><button onClick={() => load()}>↻ Actualizar</button></div>
        <div className="orders">{activeOrders.length === 0 ? <div className="empty-state">Todavía no hay pedidos activos.</div> : activeOrders.map((order) => <article className={`order ${order.status === "Nuevo" ? "urgent" : ""}`} key={order.id}><div className="order-head"><div><span>#{order.id}</span><strong>{order.locationName}</strong></div><small>{ago(order.createdAt)}</small></div><h3>{order.customerName}</h3><p>{order.items.map((item) => `${item.quantity} ${item.productName}`).join(" · ")}</p>{order.notes && <small className="order-note">Nota: {order.notes}</small>}<div className="order-foot"><strong>{money(order.total)}</strong><select className={`status ${order.status.toLowerCase()}`} value={order.status} disabled={saving} onChange={(e) => action("orderStatus", { id: order.id, status: e.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div></article>)}</div>
        <div className="section-title products-title" id="products"><div><h2>Productos</h2><p>{data.products.filter((p) => p.active).length} disponibles en el menú</p></div><button onClick={() => setEditingProduct({ name: "", description: "", price: 0, category: "Hamburguesas", icon: "🍽️", active: true })}>＋ Agregar producto</button></div>
        <div className="product-table">{data.products.map((product) => <div className="product-row" key={product.id}><span className="mini-food">{product.icon}</span><div><strong>{product.name}</strong><small>{product.category}</small></div><b>{money(product.price)}</b><label className="switch"><input type="checkbox" checked={product.active} onChange={() => action("saveProduct", { ...product, active: !product.active })} /><span /></label><button className="edit" onClick={() => setEditingProduct({ ...product })}>Editar</button></div>)}</div>
        <div className="section-title products-title" id="locations"><div><h2>Mesas, barra y entrega</h2><p>Cada ubicación puede tener su propio enlace QR</p></div><button onClick={() => setEditingLocation({ name: "", type: "Mesa", active: true })}>＋ Crear ubicación</button></div>
        <div className="location-grid">{data.locations.map((location) => <article className="location-card" key={location.id}><div className={`location-icon ${location.type.toLowerCase()}`}>{location.type === "Mesa" ? "▦" : location.type === "Barra" ? "▰" : "⌂"}</div><div><strong>{location.name}</strong><small>{location.type} · {location.active ? "Disponible" : "Oculta"}</small></div><label className="switch"><input type="checkbox" checked={location.active} onChange={() => action("saveLocation", { ...location, active: !location.active })} /><span /></label><button className="edit" onClick={() => setEditingLocation({ ...location })}>Editar</button><button className="copy-link" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/?mesa=${location.id}`)}>Copiar enlace QR</button></article>)}</div>
        <div className="install-card"><div><span>📲</span><div><strong>Aplicación para el teléfono del local</strong><p>Abra este panel en Chrome y agréguelo a la pantalla de inicio.</p></div></div><button disabled={!installPrompt} onClick={async () => { if (installPrompt) { await installPrompt.prompt(); setInstallPrompt(null); } }}>{installPrompt ? "Instalar aplicación" : "Use el menú de Chrome"}</button></div>
      </>}
    </section>
    {editingProduct && <div className="modal-back"><form className="edit-modal" onSubmit={async (e) => { e.preventDefault(); if (await action("saveProduct", editingProduct as unknown as Record<string, unknown>)) setEditingProduct(null); }}><button type="button" className="close" onClick={() => setEditingProduct(null)}>×</button><h2>{editingProduct.id ? "Editar producto" : "Nuevo producto"}</h2><p>Los cambios aparecerán inmediatamente en el menú.</p><label>Nombre<input required value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} /></label><label>Descripción<textarea value={editingProduct.description} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} /></label><div className="form-row"><label>Precio<input required min="0" type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })} /></label><label>Categoría<input required value={editingProduct.category} onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })} /></label></div><label>Icono<input value={editingProduct.icon} onChange={(e) => setEditingProduct({ ...editingProduct, icon: e.target.value })} /></label><button className="save" disabled={saving}>{saving ? "Guardando…" : "Guardar producto"}</button></form></div>}
    {editingLocation && <div className="modal-back"><form className="edit-modal" onSubmit={async (e) => { e.preventDefault(); if (await action("saveLocation", editingLocation as unknown as Record<string, unknown>)) setEditingLocation(null); }}><button type="button" className="close" onClick={() => setEditingLocation(null)}>×</button><h2>{editingLocation.id ? "Editar ubicación" : "Crear ubicación"}</h2><p>Puede ser una mesa, un puesto en la barra o entrega para llevar.</p><label>Nombre<input required autoFocus value={editingLocation.name} onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })} placeholder="Ej. Mesa 05" /></label><label>Tipo<select value={editingLocation.type} onChange={(e) => setEditingLocation({ ...editingLocation, type: e.target.value as Location["type"] })}><option>Mesa</option><option>Barra</option><option>Otro</option></select></label><button className="save" disabled={saving}>{saving ? "Guardando…" : "Guardar ubicación"}</button></form></div>}
  </main>;
}
