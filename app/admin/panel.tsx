"use client";
/* eslint-disable @next/next/no-img-element -- data URLs are optimized client-side before persistence */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Product = { id?: number; name: string; description: string; price: number; category: string; icon: string; images: string[]; active: boolean };
type Location = { id?: number; name: string; type: "Mesa" | "Barra" | "Otro"; active: boolean };
type OrderStatus = "Nuevo" | "Preparando" | "Listo" | "Entregado" | "Cancelado";
type Order = { id: number; locationName: string; customerName: string; notes: string; total: number; status: OrderStatus; createdAt: string; items: { productId: number; productName: string; quantity: number }[] };
type Settings = { name: string; tagline: string; welcomeMessage: string; currency: string; acceptingOrders: boolean; logo: string; primaryColor: string; accentColor: string; backgroundColor: string; address: string; phone: string; whatsapp: string; mapUrl: string };
type Banner = { id?: number; eyebrow: string; title: string; text: string; image: string; active: boolean; position: number };
type ScheduleDay = { weekday: number; day: string; openTime: string; closeTime: string; enabled: boolean };
type AdminData = { products: Product[]; locations: Location[]; orders: Order[]; stats: { count: number; sales: number; average: number }; settings: Settings; banners: Banner[]; schedule: ScheduleDay[] };
type Section = "orders" | "products" | "locations" | "history" | "branding" | "settings";
type InstallPrompt = Event & { prompt: () => Promise<void> };
type ManualOrder = { customerName: string; locationId: number; notes: string; items: Record<number, number> };

const money = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
const statuses: OrderStatus[] = ["Nuevo", "Preparando", "Listo", "Entregado", "Cancelado"];
const ago = (date: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  return new Date(date).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

async function optimizedImage(file: File, maxWidth = 1400) {
  if (!file.type.startsWith("image/")) throw new Error("Seleccione una imagen válida.");
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No fue posible leer la imagen."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("La imagen no es válida."));
    element.src = source;
  });
  const scale = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", .8);
}

export default function AdminPanel({ displayName }: { displayName: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [section, setSection] = useState<Section>("orders");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [manualOrder, setManualOrder] = useState<ManualOrder | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<Settings | null>(null);
  const [brandingDraft, setBrandingDraft] = useState<Settings | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDay[]>([]);
  const [saving, setSaving] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);

  const load = useCallback(async (quiet = false) => {
    try {
      const response = await fetch("/api/admin", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      setSettingsDraft((current) => current ?? result.settings);
      setBrandingDraft((current) => current ?? result.settings);
      setScheduleDraft((current) => current.length ? current : result.schedule);
      setError("");
    } catch (cause) {
      if (!quiet) setError(cause instanceof Error ? cause.message : "No fue posible cargar el panel.");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => load(), 0);
    const timer = window.setInterval(() => load(true), 10000);
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [load]);

  async function action(name: string, payload: Record<string, unknown>, successMessage?: string) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name, data: payload }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
      if (successMessage) setNotice(successMessage);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible guardar.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const activeOrders = useMemo(() => data?.orders.filter((order) => !["Entregado", "Cancelado"].includes(order.status)) ?? [], [data]);
  const history = useMemo(() => data?.orders.filter((order) => ["Entregado", "Cancelado"].includes(order.status)) ?? [], [data]);
  const date = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const newManualOrder = (): ManualOrder => ({
    customerName: "",
    locationId: data?.locations.find((location) => location.active)?.id ?? 0,
    notes: "",
    items: {},
  });

  return <main className="admin-shell">
    <aside className="sidebar">
      <div className="brand"><span>ML</span><div>{data?.settings.name ?? "Mesa Lista"}<small>Panel del local</small></div></div>
      <nav>
        <button className={section === "orders" ? "active" : ""} onClick={() => setSection("orders")}>▦ <span>Pedidos</span><b>{activeOrders.filter((order) => order.status === "Nuevo").length}</b></button>
        <button className={section === "products" ? "active" : ""} onClick={() => setSection("products")}>◫ <span>Productos</span></button>
        <button className={section === "locations" ? "active" : ""} onClick={() => setSection("locations")}>⌁ <span>Mesas y barra</span></button>
        <button className={section === "history" ? "active" : ""} onClick={() => setSection("history")}>◷ <span>Historial</span></button>
        <button className={section === "branding" ? "active" : ""} onClick={() => setSection("branding")}>✦ <span>Diseño y negocio</span></button>
        <button className={section === "settings" ? "active" : ""} onClick={() => setSection("settings")}>⚙ <span>Configuración</span></button>
      </nav>
      <Link className="view-menu" href="/">Ver menú del cliente ↗</Link>
    </aside>

    <section className="admin-main">
      <header className="admin-top">
        <div><p>{date}</p><h1>Buenas tardes, {displayName}</h1></div>
        <div className="admin-actions">
          <div className={`open-pill ${data?.settings.acceptingOrders === false ? "closed" : ""}`}><i /> {data?.settings.acceptingOrders === false ? "Local pausado" : "Local abierto"}</div>
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/admin/login"; }}>Salir</button>
        </div>
      </header>

      {error && <div className="system-message error-message">{error}<button onClick={() => load()}>Reintentar</button></div>}
      {notice && <div className="system-message success-message">{notice}</div>}
      {!data ? <div className="system-message">Cargando pedidos y menú…</div> : <>
        {section === "orders" && <>
          <div className="stats">
            <article><span>Pedidos hoy</span><strong>{data.stats.count}</strong><em>{activeOrders.length} pedidos activos</em></article>
            <article><span>Ventas hoy</span><strong>{money(data.stats.sales)}</strong><em>Pedidos no cancelados</em></article>
            <article><span>Ticket promedio</span><strong>{money(data.stats.average)}</strong><em>{data.locations.filter((location) => location.active).length} ubicaciones disponibles</em></article>
          </div>
          <div className="section-title"><div><h2>Pedidos en vivo</h2><p>Se actualizan automáticamente cada 10 segundos</p></div><button onClick={() => setManualOrder(newManualOrder())}>＋ Nuevo pedido</button></div>
          <div className="orders">{activeOrders.length === 0
            ? <div className="empty-state">Todavía no hay pedidos activos.<button onClick={() => setManualOrder(newManualOrder())}>Crear pedido manual</button></div>
            : activeOrders.map((order) => <OrderCard order={order} saving={saving} onStatus={(status) => action("orderStatus", { id: order.id, status })} key={order.id} />)}
          </div>
        </>}

        {section === "products" && <>
          <div className="section-title page-section-title"><div><h2>Productos</h2><p>{data.products.filter((product) => product.active).length} disponibles en el menú</p></div><button onClick={() => setEditingProduct({ name: "", description: "", price: 0, category: "Hamburguesas", icon: "🍽️", images: [], active: true })}>＋ Agregar producto</button></div>
          <div className="product-table">{data.products.map((product) => <div className="product-row" key={product.id}><span className="mini-food">{product.icon}</span><div><strong>{product.name}</strong><small>{product.category}</small></div><b>{money(product.price)}</b><label className="switch"><input type="checkbox" checked={product.active} onChange={() => action("saveProduct", { ...product, active: !product.active })} /><span /></label><button className="edit" onClick={() => setEditingProduct({ ...product })}>Editar</button></div>)}</div>
        </>}

        {section === "locations" && <>
          <div className="section-title page-section-title"><div><h2>Mesas, barra y puntos de entrega</h2><p>Cree todos los lugares donde sus clientes pueden pedir</p></div><button onClick={() => setEditingLocation({ name: "", type: "Mesa", active: true })}>＋ Crear ubicación</button></div>
          <div className="location-grid">{data.locations.map((location) => <article className="location-card" key={location.id}>
            <div className={`location-icon ${location.type.toLowerCase()}`}>{location.type === "Mesa" ? "▦" : location.type === "Barra" ? "▰" : "⌂"}</div>
            <div><strong>{location.name}</strong><small>{location.type} · {location.active ? "Disponible" : "Oculta"}</small></div>
            <label className="switch"><input type="checkbox" checked={location.active} onChange={() => action("saveLocation", { ...location, active: !location.active })} /><span /></label>
            <button className="edit" onClick={() => setEditingLocation({ ...location })}>Editar</button>
            <button className="copy-link" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/?mesa=${location.id}`); setNotice(`Enlace de ${location.name} copiado.`); }}>Copiar enlace</button>
          </article>)}</div>
        </>}

        {section === "history" && <>
          <div className="section-title page-section-title"><div><h2>Historial de pedidos</h2><p>Últimos pedidos entregados y cancelados</p></div><button onClick={() => load()}>↻ Actualizar</button></div>
          <div className="history-table">
            <div className="history-head"><span>Pedido</span><span>Cliente</span><span>Fecha</span><span>Total</span><span>Estado</span></div>
            {history.length === 0 ? <div className="empty-state">Los pedidos terminados aparecerán aquí.</div> : history.map((order) => <div className="history-row" key={order.id}><strong>#{order.id} · {order.locationName}</strong><span>{order.customerName}</span><span>{new Date(order.createdAt).toLocaleString("es-CO")}</span><b>{money(order.total)}</b><em className={`status ${order.status.toLowerCase()}`}>{order.status}</em></div>)}
          </div>
        </>}

        {section === "branding" && brandingDraft && <>
          <div className="section-title page-section-title"><div><h2>Diseño y datos del negocio</h2><p>Personalice lo que ven sus clientes</p></div><button onClick={async () => { if (await action("saveBranding", brandingDraft as unknown as Record<string, unknown>, "Identidad del negocio guardada.")) setBrandingDraft({ ...brandingDraft }); }}>Guardar cambios</button></div>
          <div className="branding-grid">
            <form className="brand-form" onSubmit={async (event) => { event.preventDefault(); await action("saveBranding", brandingDraft as unknown as Record<string, unknown>, "Identidad del negocio guardada."); }}>
              <h3>Identidad visual</h3>
              <div className="logo-upload"><div>{brandingDraft.logo ? <img src={brandingDraft.logo} alt="Logo" /> : <span>{brandingDraft.name.slice(0,2).toUpperCase()}</span>}</div><label>Subir logo<input type="file" accept="image/*" onChange={async (event) => { const file=event.target.files?.[0]; if(file) setBrandingDraft({ ...brandingDraft, logo: await optimizedImage(file, 600) }); }} /></label>{brandingDraft.logo && <button type="button" onClick={() => setBrandingDraft({ ...brandingDraft, logo: "" })}>Quitar</button>}</div>
              <div className="form-row"><label>Nombre del negocio<input value={brandingDraft.name} onChange={(event) => setBrandingDraft({ ...brandingDraft, name:event.target.value })} /></label><label>Frase corta<input value={brandingDraft.tagline} onChange={(event) => setBrandingDraft({ ...brandingDraft, tagline:event.target.value })} /></label></div>
              <h3>Colores</h3><div className="color-grid"><ColorInput label="Principal" value={brandingDraft.primaryColor} onChange={(value) => setBrandingDraft({ ...brandingDraft, primaryColor:value })} /><ColorInput label="Acento" value={brandingDraft.accentColor} onChange={(value) => setBrandingDraft({ ...brandingDraft, accentColor:value })} /><ColorInput label="Fondo" value={brandingDraft.backgroundColor} onChange={(value) => setBrandingDraft({ ...brandingDraft, backgroundColor:value })} /></div>
              <button className="save" disabled={saving}>{saving ? "Guardando…" : "Guardar identidad"}</button>
            </form>
            <form className="brand-form" onSubmit={async (event) => { event.preventDefault(); await action("saveBranding", brandingDraft as unknown as Record<string, unknown>, "Datos de contacto guardados."); }}>
              <h3>Datos de contacto</h3><label>Dirección<input value={brandingDraft.address} onChange={(event) => setBrandingDraft({ ...brandingDraft, address:event.target.value })} /></label><div className="form-row"><label>Teléfono<input value={brandingDraft.phone} onChange={(event) => setBrandingDraft({ ...brandingDraft, phone:event.target.value })} /></label><label>WhatsApp<input value={brandingDraft.whatsapp} onChange={(event) => setBrandingDraft({ ...brandingDraft, whatsapp:event.target.value.replace(/\D/g,"") })} /></label></div><label>Enlace del mapa<input value={brandingDraft.mapUrl} onChange={(event) => setBrandingDraft({ ...brandingDraft, mapUrl:event.target.value })} /></label>
              <div className="contact-preview"><b>Así aparecerá en el menú</b><span>⌖ {brandingDraft.address || "Sin dirección"}</span><span>☎ {brandingDraft.phone || "Sin teléfono"}</span><span>WhatsApp {brandingDraft.whatsapp || "Sin número"}</span></div><button className="save" disabled={saving}>Guardar contacto</button>
            </form>
          </div>
          <ScheduleEditor schedule={scheduleDraft} saving={saving} onChange={setScheduleDraft} onSave={() => action("saveSchedule", scheduleDraft as unknown as Record<string, unknown>, "Horario guardado.")} />
          <div className="banner-admin-head"><div><h2>Banners del menú</h2><p>Publique mensajes con texto e imagen para el slider.</p></div><button onClick={() => action("saveBanner", { eyebrow:"NUEVO MENSAJE", title:"Título del banner", text:"Escriba aquí la información que desea mostrar.", image:"", active:true, position:data.banners.length }, "Banner creado.")}>＋ Agregar banner</button></div>
          <div className="banner-admin-list">{data.banners.map((banner,index) => <BannerEditor banner={banner} index={index} canDelete={data.banners.length > 1} saving={saving} onSave={(updated) => action("saveBanner", updated as unknown as Record<string, unknown>, "Banner guardado.")} onDelete={() => action("deleteBanner", { id:banner.id }, "Banner eliminado.")} key={banner.id} />)}</div>
        </>}

        {section === "settings" && settingsDraft && <>
          <div className="section-title page-section-title"><div><h2>Configuración</h2><p>Información visible para sus clientes</p></div></div>
          <form className="settings-card" onSubmit={async (event) => { event.preventDefault(); if (await action("saveSettings", settingsDraft as unknown as Record<string, unknown>, "Configuración guardada.")) setSettingsDraft({ ...settingsDraft }); }}>
            <div className="settings-heading"><span>🏪</span><div><strong>Datos del restaurante</strong><p>Estos textos se actualizan también en el menú público.</p></div></div>
            <label>Nombre del restaurante<input required value={settingsDraft.name} onChange={(event) => setSettingsDraft({ ...settingsDraft, name: event.target.value })} /></label>
            <label>Frase de la marca<input required value={settingsDraft.tagline} onChange={(event) => setSettingsDraft({ ...settingsDraft, tagline: event.target.value })} /></label>
            <label>Mensaje de bienvenida<textarea required value={settingsDraft.welcomeMessage} onChange={(event) => setSettingsDraft({ ...settingsDraft, welcomeMessage: event.target.value })} /></label>
            <div className="accepting-toggle"><div><strong>Recibir pedidos</strong><small>Al pausarlo, los clientes podrán ver el menú pero no enviar pedidos.</small></div><label className="switch"><input type="checkbox" checked={settingsDraft.acceptingOrders} onChange={(event) => setSettingsDraft({ ...settingsDraft, acceptingOrders: event.target.checked })} /><span /></label></div>
            <button className="save" disabled={saving}>{saving ? "Guardando…" : "Guardar configuración"}</button>
          </form>
          <div className="install-card"><div><span>📲</span><div><strong>Aplicación para el teléfono del local</strong><p>Abra este panel en Chrome y agréguelo a la pantalla de inicio.</p></div></div><button type="button" disabled={!installPrompt} onClick={async () => { if (installPrompt) { await installPrompt.prompt(); setInstallPrompt(null); } }}>{installPrompt ? "Instalar aplicación" : "Use el menú de Chrome"}</button></div>
        </>}
      </>}
    </section>

    {editingProduct && <ProductModal product={editingProduct} saving={saving} onChange={setEditingProduct} onClose={() => setEditingProduct(null)} onSave={async () => { if (await action("saveProduct", editingProduct as unknown as Record<string, unknown>, "Producto guardado.")) setEditingProduct(null); }} />}
    {editingLocation && <LocationModal location={editingLocation} saving={saving} onChange={setEditingLocation} onClose={() => setEditingLocation(null)} onSave={async () => { if (await action("saveLocation", editingLocation as unknown as Record<string, unknown>, "Ubicación guardada.")) setEditingLocation(null); }} onDelete={editingLocation.id ? async () => { if (window.confirm(`¿Eliminar ${editingLocation.name}?`)) { if (await action("deleteLocation", { id: editingLocation.id }, "Ubicación eliminada u ocultada para conservar el historial.")) setEditingLocation(null); } } : undefined} />}
    {manualOrder && <ManualOrderModal order={manualOrder} products={data?.products.filter((product) => product.active) ?? []} locations={data?.locations.filter((location) => location.active) ?? []} saving={saving} onChange={setManualOrder} onClose={() => setManualOrder(null)} onSave={async () => {
      const items = Object.entries(manualOrder.items).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId: Number(productId), quantity }));
      if (await action("createOrder", { customerName: manualOrder.customerName, locationId: manualOrder.locationId, notes: manualOrder.notes, items }, "Pedido creado.")) setManualOrder(null);
    }} />}
  </main>;
}

function OrderCard({ order, saving, onStatus }: { order: Order; saving: boolean; onStatus: (status: OrderStatus) => void }) {
  return <article className={`order ${order.status === "Nuevo" ? "urgent" : ""}`}>
    <div className="order-head"><div><span>#{order.id}</span><strong>{order.locationName}</strong></div><small>{ago(order.createdAt)}</small></div>
    <h3>{order.customerName}</h3>
    <p>{order.items.map((item) => `${item.quantity} ${item.productName}`).join(" · ")}</p>
    {order.notes && <small className="order-note">Nota: {order.notes}</small>}
    <div className="order-foot"><strong>{money(order.total)}</strong><select className={`status ${order.status.toLowerCase()}`} value={order.status} disabled={saving} onChange={(event) => onStatus(event.target.value as OrderStatus)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
  </article>;
}

function ProductModal({ product, saving, onChange, onClose, onSave }: { product: Product; saving: boolean; onChange: (product: Product) => void; onClose: () => void; onSave: () => void }) {
  return <div className="modal-back"><form className="edit-modal" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
    <button type="button" className="close" onClick={onClose}>×</button><h2>{product.id ? "Editar producto" : "Nuevo producto"}</h2><p>Los cambios aparecerán inmediatamente en el menú.</p>
    <div className="photo-section"><div><strong>Fotografías del producto</strong><small>Puede cargar hasta cinco imágenes</small></div><div className="photo-grid">{product.images.map((src,index) => <figure key={`${src.slice(-20)}-${index}`}><img src={src} alt={`${product.name} ${index+1}`} /><button type="button" onClick={() => onChange({ ...product, images:product.images.filter((_,itemIndex) => itemIndex !== index) })}>×</button>{index===0 && <b>Principal</b>}</figure>)}{product.images.length<5 && <label className="upload-tile">＋<span>Agregar fotos</span><small>JPG, PNG o WEBP</small><input type="file" accept="image/*" multiple onChange={async (event) => { const files=Array.from(event.target.files ?? []).slice(0,5-product.images.length); const images=await Promise.all(files.map((file) => optimizedImage(file,1200))); onChange({ ...product, images:[...product.images,...images] }); event.target.value=""; }} /></label>}</div></div>
    <label>Nombre<input required value={product.name} onChange={(event) => onChange({ ...product, name: event.target.value })} /></label>
    <label>Descripción<textarea value={product.description} onChange={(event) => onChange({ ...product, description: event.target.value })} /></label>
    <div className="form-row"><label>Precio<input required min="0" type="number" value={product.price} onChange={(event) => onChange({ ...product, price: Number(event.target.value) })} /></label><label>Categoría<input required value={product.category} onChange={(event) => onChange({ ...product, category: event.target.value })} /></label></div>
    <label>Icono<input value={product.icon} onChange={(event) => onChange({ ...product, icon: event.target.value })} /></label>
    <button className="save" disabled={saving}>{saving ? "Guardando…" : "Guardar producto"}</button>
  </form></div>;
}

function ColorInput({ label, value, onChange }: { label:string; value:string; onChange:(value:string)=>void }) {
  return <label><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><span><b>{label}</b><small>{value}</small></span></label>;
}

function ScheduleEditor({ schedule, saving, onChange, onSave }: { schedule:ScheduleDay[]; saving:boolean; onChange:(value:ScheduleDay[])=>void; onSave:()=>void }) {
  return <article className="schedule-editor"><div className="schedule-heading"><div><span>◷</span><div><h3>Horario de atención</h3><p>Defina cuándo el local aparece abierto y recibe pedidos.</p></div></div><button disabled={saving} onClick={onSave}>{saving?"Guardando…":"Guardar horario"}</button></div><div className="schedule-days">{schedule.map((item,index) => <div className={`schedule-row ${!item.enabled?"disabled":""}`} key={item.weekday}><label className="day-toggle"><input type="checkbox" checked={item.enabled} onChange={() => onChange(schedule.map((day,itemIndex) => itemIndex===index?{...day,enabled:!day.enabled}:day))} /><span>{item.enabled?"✓":""}</span><b>{item.day}</b></label>{item.enabled ? <><label>Apertura<input type="time" value={item.openTime} onChange={(event) => onChange(schedule.map((day,itemIndex) => itemIndex===index?{...day,openTime:event.target.value}:day))} /></label><i>hasta</i><label>Cierre<input type="time" value={item.closeTime} onChange={(event) => onChange(schedule.map((day,itemIndex) => itemIndex===index?{...day,closeTime:event.target.value}:day))} /></label></> : <em>Cerrado todo el día</em>}</div>)}</div></article>;
}

function BannerEditor({ banner, index, canDelete, saving, onSave, onDelete }: { banner:Banner; index:number; canDelete:boolean; saving:boolean; onSave:(banner:Banner)=>void; onDelete:()=>void }) {
  const [draft,setDraft]=useState(banner);
  return <article className="banner-editor"><div className="banner-number"><span>{String(index+1).padStart(2,"0")}</span><label className="switch"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active:event.target.checked })} /><span /></label></div><div className="banner-image">{draft.image ? <img src={draft.image} alt={`Banner ${index+1}`} /> : <span>Imagen del banner</span>}<label>Subir imagen<input type="file" accept="image/*" onChange={async (event) => { const file=event.target.files?.[0]; if(file) setDraft({ ...draft, image:await optimizedImage(file,1600) }); }} /></label></div><div className="banner-fields"><label>Texto superior<input value={draft.eyebrow} onChange={(event) => setDraft({ ...draft, eyebrow:event.target.value })} /></label><label>Título<input value={draft.title} onChange={(event) => setDraft({ ...draft, title:event.target.value })} /></label><label>Descripción<textarea value={draft.text} onChange={(event) => setDraft({ ...draft, text:event.target.value })} /></label><div className="banner-actions"><button disabled={saving} onClick={() => onSave(draft)}>Guardar</button><button className="banner-delete" disabled={!canDelete||saving} onClick={onDelete}>Eliminar</button></div></div></article>;
}

function LocationModal({ location, saving, onChange, onClose, onSave, onDelete }: { location: Location; saving: boolean; onChange: (location: Location) => void; onClose: () => void; onSave: () => void; onDelete?: () => void }) {
  return <div className="modal-back"><form className="edit-modal" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
    <button type="button" className="close" onClick={onClose}>×</button><h2>{location.id ? "Editar ubicación" : "Crear ubicación"}</h2><p>Puede agregar mesas, puestos en la barra o puntos de entrega.</p>
    <label>Nombre<input required autoFocus value={location.name} onChange={(event) => onChange({ ...location, name: event.target.value })} placeholder="Ej. Barra 03" /></label>
    <label>Tipo<select value={location.type} onChange={(event) => onChange({ ...location, type: event.target.value as Location["type"] })}><option>Mesa</option><option>Barra</option><option>Otro</option></select></label>
    <button className="save" disabled={saving}>{saving ? "Guardando…" : "Guardar ubicación"}</button>
    {onDelete && <button type="button" className="delete-location" disabled={saving} onClick={onDelete}>Eliminar ubicación</button>}
  </form></div>;
}

function ManualOrderModal({ order, products, locations, saving, onChange, onClose, onSave }: { order: ManualOrder; products: Product[]; locations: Location[]; saving: boolean; onChange: (order: ManualOrder) => void; onClose: () => void; onSave: () => void }) {
  const total = products.reduce((sum, product) => sum + product.price * (order.items[product.id ?? 0] ?? 0), 0);
  const itemCount = Object.values(order.items).reduce((sum, quantity) => sum + quantity, 0);
  return <div className="modal-back"><form className="edit-modal manual-order-modal" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
    <button type="button" className="close" onClick={onClose}>×</button><h2>Nuevo pedido</h2><p>Registre pedidos recibidos en caja, por teléfono o directamente en la mesa.</p>
    <div className="form-row"><label>Cliente<input required value={order.customerName} onChange={(event) => onChange({ ...order, customerName: event.target.value })} placeholder="Nombre del cliente" /></label><label>Ubicación<select required value={order.locationId} onChange={(event) => onChange({ ...order, locationId: Number(event.target.value) })}>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label></div>
    <label>Productos</label><div className="manual-products">{products.map((product) => {
      const quantity = order.items[product.id ?? 0] ?? 0;
      return <div key={product.id}><span>{product.icon}</span><div><strong>{product.name}</strong><small>{money(product.price)}</small></div><div className="qty"><button type="button" onClick={() => onChange({ ...order, items: { ...order.items, [product.id ?? 0]: Math.max(0, quantity - 1) } })}>−</button><b>{quantity}</b><button type="button" onClick={() => onChange({ ...order, items: { ...order.items, [product.id ?? 0]: quantity + 1 } })}>＋</button></div></div>;
    })}</div>
    <label>Notas<textarea value={order.notes} onChange={(event) => onChange({ ...order, notes: event.target.value })} placeholder="Detalles especiales..." /></label>
    <button className="save" disabled={saving || !order.customerName.trim() || !order.locationId || itemCount === 0}>{saving ? "Creando…" : `Crear pedido · ${money(total)}`}</button>
  </form></div>;
}
