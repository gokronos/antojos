"use client";

import { useEffect, useMemo, useState } from "react";

type Product = { id: number; name: string; description: string; price: number; category: string; icon: string; active: boolean };
type Location = { id: number; name: string; type: "Mesa" | "Barra" | "Otro"; active: boolean };
type CartItem = Product & { qty: number };
type Settings = { name: string; tagline: string; welcomeMessage: string; acceptingOrders: boolean };
type InstallPrompt = Event & { prompt: () => Promise<void> };

const money = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [settings, setSettings] = useState<Settings>({ name: "Mesa Lista", tagline: "Comida que provoca", welcomeMessage: "Prepare su pedido desde su lugar. Nosotros nos encargamos del resto.", acceptingOrders: true });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [success, setSuccess] = useState<{ id: number; locationName: string } | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [, setInstallPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    fetch("/api/menu", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setProducts(data.products);
        setLocations(data.locations);
        if (data.settings) setSettings(data.settings);
        const requested = new URLSearchParams(window.location.search).get("mesa");
        const normalized = requested?.toLowerCase().replace(/[-_]/g, " ");
        const selected = data.locations.find((l: Location) =>
          String(l.id) === requested || l.name.toLowerCase() === normalized ||
          l.name.toLowerCase().replace(/\s+/g, "") === normalized?.replace(/\s+/g, "")
        );
        setLocationId(selected?.id ?? data.locations[0]?.id ?? null);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No fue posible cargar el menú."))
      .finally(() => setLoading(false));
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const categories = useMemo(() => ["Todos", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const visible = products.filter((p) =>
    (category === "Todos" || p.category === category) &&
    `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase())
  );
  const location = locations.find((l) => l.id === locationId);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const add = (product: Product) => setCart((current) => {
    const found = current.find((item) => item.id === product.id);
    return found
      ? current.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      : [...current, { ...product, qty: 1 }];
  });
  const changeQty = (id: number, delta: number) => setCart((current) =>
    current.map((item) => item.id === id ? { ...item, qty: item.qty + delta } : item).filter((item) => item.qty > 0)
  );

  async function submitOrder() {
    if (!name.trim() || !cart.length || !locationId) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          notes,
          locationId,
          items: cart.map((item) => ({ productId: item.id, quantity: item.qty })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setCheckout(false);
      setSuccess({ id: result.id, locationName: result.locationName });
      setCart([]);
      setName("");
      setNotes("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible enviar el pedido.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="customer">
      <header className="menu-head">
        <div className="brand"><span>ML</span><div>{settings.name}<small>{settings.tagline}</small></div></div>
        <a href="/admin" className="admin-link">Panel del local</a>
        <button className="bag" onClick={() => setCartOpen(true)}>🛍️ <b>{count}</b></button>
      </header>
      <section className="hero">
        <div><span className="eyebrow">BIENVENIDOS · {(location?.name ?? "SELECCIONE SU MESA").toUpperCase()}</span><h1>¿Qué se le antoja<br />comer hoy?</h1><p>{settings.welcomeMessage}</p>{!settings.acceptingOrders && <b className="closed-banner">El local está pausado · Puede consultar el menú</b>}</div>
        <div className="hero-dish"><span>🍔</span><i>100%<br /><small>artesanal</small></i></div>
      </section>
      <section className="menu-area">
        <div className="menu-tools"><div><h2>Nuestro menú</h2><p>Todo preparado al momento</p></div><label className="search">⌕<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en el menú" /></label></div>
        {loading && <div className="system-message">Cargando el menú…</div>}
        {error && <div className="system-message error-message">{error}</div>}
        {!loading && !error && <>
          <div className="chips">{categories.map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
          <div className="food-grid">{visible.map((product) => <article className="food-card" key={product.id}><div className={`food-art art-${product.id % 4}`}><span>{product.icon}</span></div><div className="food-copy"><div><h3>{product.name}</h3><p>{product.description}</p></div><footer><strong>{money(product.price)}</strong><button onClick={() => add(product)} aria-label={`Agregar ${product.name}`}>＋</button></footer></div></article>)}</div>
        </>}
      </section>
      {count > 0 && <button className="floating-cart" onClick={() => setCartOpen(true)}><span><b>{count}</b> Ver pedido</span><strong>{money(total)}</strong></button>}
      {cartOpen && <div className="drawer-back" onClick={() => setCartOpen(false)}><aside className="cart" onClick={(e) => e.stopPropagation()}><button className="close" onClick={() => setCartOpen(false)}>×</button><span className="eyebrow">SU PEDIDO</span><h2>Todo listo para ordenar</h2><p className="table-tag">📍 {location?.name ?? "Sin ubicación"}</p>
        <div className="cart-items">{cart.map((item) => <div key={item.id}><span>{item.icon}</span><div><strong>{item.name}</strong><small>{money(item.price)}</small></div><div className="qty"><button onClick={() => changeQty(item.id, -1)}>−</button><b>{item.qty}</b><button onClick={() => changeQty(item.id, 1)}>＋</button></div></div>)}</div>
        <div className="total"><span>Total</span><strong>{money(total)}</strong></div><button className="checkout-btn" disabled={!cart.length || !settings.acceptingOrders} onClick={() => { setCartOpen(false); setCheckout(true); }}>{settings.acceptingOrders ? "Continuar pedido →" : "Pedidos pausados"}</button>
      </aside></div>}
      {checkout && <div className="modal-back"><div className="checkout-modal"><button className="close" onClick={() => setCheckout(false)}>×</button><span className="eyebrow">ÚLTIMO PASO</span><h2>¿A nombre de quién?</h2><p>Así podremos identificar su pedido y llevarlo al lugar correcto.</p><label>Nombre<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Andrea" maxLength={80} /></label><label>¿Dónde está?<select value={locationId ?? ""} onChange={(e) => setLocationId(Number(e.target.value))}>{locations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Notas del pedido<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sin cebolla, salsa aparte..." maxLength={500} /></label>{error && <div className="form-error">{error}</div>}<div className="pay-note"><span>🔔</span><div><strong>Alerta al local</strong><small>El pedido aparecerá inmediatamente en el panel</small></div></div><button className="checkout-btn" disabled={!name.trim() || sending || !locationId} onClick={submitOrder}>{sending ? "Enviando…" : `Enviar pedido · ${money(total)}`}</button></div></div>}
      {success && <div className="modal-back"><div className="success"><span>✓</span><h2>¡Pedido recibido!</h2><p>El pedido ya apareció en el panel del local.</p><b>Pedido #{success.id} · {success.locationName}</b><button onClick={() => setSuccess(null)}>Volver al menú</button></div></div>}
    </main>
  );
}
