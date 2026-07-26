"use client";

import { useMemo, useState } from "react";

type Product = { id: number; name: string; description: string; price: number; category: string; icon: string; active: boolean };
type CartItem = Product & { qty: number };

const seed: Product[] = [
  { id: 1, name: "Burger de la casa", description: "Carne artesanal, queso, tocineta y salsa de la casa", price: 24900, category: "Hamburguesas", icon: "🍔", active: true },
  { id: 2, name: "Perro especial", description: "Salchicha premium, queso, papitas y tres salsas", price: 18900, category: "Perros", icon: "🌭", active: true },
  { id: 3, name: "Papas explosivas", description: "Papas crocantes, carne, pollo, queso y maíz", price: 21900, category: "Para compartir", icon: "🍟", active: true },
  { id: 4, name: "Cerveza fría", description: "Botella 330 ml", price: 7000, category: "Bebidas", icon: "🍺", active: true },
  { id: 5, name: "Limonada de coco", description: "Cremosa, natural y muy fría", price: 9000, category: "Bebidas", icon: "🥥", active: true },
  { id: 6, name: "Nachos de la casa", description: "Totopos, carne, queso, pico de gallo y guacamole", price: 22900, category: "Para compartir", icon: "🌮", active: true },
];

const money = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export default function Home() {
  const [mode, setMode] = useState<"menu" | "admin">("menu");
  const [products, setProducts] = useState(seed);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [success, setSuccess] = useState(false);
  const [table, setTable] = useState("Mesa 04");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [orders, setOrders] = useState([
    { id: "1048", table: "Mesa 06", name: "Laura", total: 38900, status: "Nuevo", ago: "Hace 2 min" },
    { id: "1047", table: "Mesa 02", name: "Carlos", total: 47800, status: "Preparando", ago: "Hace 7 min" },
    { id: "1046", table: "Para llevar", name: "Valentina", total: 31900, status: "Listo", ago: "Hace 14 min" },
  ]);
  const [editId, setEditId] = useState<number | null>(null);

  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category)))];
  const visible = products.filter(p => p.active && (category === "Todos" || p.category === category) && p.name.toLowerCase().includes(search.toLowerCase()));
  const total = cart.reduce((s, p) => s + p.price * p.qty, 0);
  const count = cart.reduce((s, p) => s + p.qty, 0);
  const add = (p: Product) => setCart(c => {
    const found = c.find(x => x.id === p.id);
    return found ? c.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...p, qty: 1 }];
  });
  const changeQty = (id: number, d: number) => setCart(c => c.map(x => x.id === id ? { ...x, qty: x.qty + d } : x).filter(x => x.qty > 0));
  const submitOrder = () => {
    if (!name.trim() || !cart.length) return;
    setOrders(o => [{ id: String(1049 + o.length), table, name, total, status: "Nuevo", ago: "Ahora" }, ...o]);
    setCheckout(false); setSuccess(true); setCart([]);
  };

  if (mode === "admin") return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand"><span>ML</span><div>Mesa Lista<small>Panel del local</small></div></div>
        <nav>
          <button className="active">▦ <span>Pedidos</span><b>2</b></button>
          <button onClick={() => document.getElementById("products")?.scrollIntoView()}>◫ <span>Productos</span></button>
          <button>⌁ <span>Mesas y QR</span></button>
          <button>◷ <span>Historial</span></button>
          <button>⚙ <span>Configuración</span></button>
        </nav>
        <button className="view-menu" onClick={() => setMode("menu")}>Ver menú del cliente ↗</button>
      </aside>
      <section className="admin-main">
        <header className="admin-top"><div><p>Domingo, 26 de julio</p><h1>Buenas tardes, Andrea</h1></div><div className="open-pill"><i/> Local abierto</div></header>
        <div className="stats">
          <article><span>Pedidos hoy</span><strong>18</strong><em>↑ 12% frente a ayer</em></article>
          <article><span>Ventas hoy</span><strong>$486.300</strong><em>↑ 8% frente a ayer</em></article>
          <article><span>Ticket promedio</span><strong>$27.016</strong><em>6 mesas activas</em></article>
        </div>
        <div className="section-title"><div><h2>Pedidos en vivo</h2><p>Se actualizan automáticamente</p></div><button>＋ Nuevo pedido</button></div>
        <div className="orders">
          {orders.map((o, i) => <article className={`order ${i === 0 ? "urgent" : ""}`} key={o.id}>
            <div className="order-head"><div><span>#{o.id}</span><strong>{o.table}</strong></div><small>{o.ago}</small></div>
            <h3>{o.name}</h3><p>{i === 0 ? "1 Burger de la casa · 2 Cerveza fría" : i === 1 ? "2 Perros especiales · 1 Limonada" : "1 Papas explosivas · 1 Cerveza"}</p>
            <div className="order-foot"><strong>{money(o.total)}</strong><button className={`status ${o.status.toLowerCase()}`}>{o.status}⌄</button></div>
          </article>)}
        </div>
        <div className="section-title products-title" id="products"><div><h2>Productos</h2><p>{products.filter(p=>p.active).length} disponibles en el menú</p></div><button onClick={() => {
          const id = Date.now(); setProducts(p => [...p, {id,name:"Nuevo producto",description:"Edite la descripción",price:10000,category:"Hamburguesas",icon:"🍽️",active:true}]); setEditId(id);
        }}>＋ Agregar producto</button></div>
        <div className="product-table">
          {products.map(p => <div className="product-row" key={p.id}><span className="mini-food">{p.icon}</span><div><strong>{p.name}</strong><small>{p.category}</small></div><b>{money(p.price)}</b><label className="switch"><input type="checkbox" checked={p.active} onChange={() => setProducts(xs => xs.map(x => x.id===p.id?{...x,active:!x.active}:x))}/><span/></label><button className="edit" onClick={()=>setEditId(p.id)}>Editar</button></div>)}
        </div>
      </section>
      {editId !== null && <div className="modal-back"><form className="edit-modal" onSubmit={e=>{e.preventDefault();setEditId(null)}}><button type="button" className="close" onClick={()=>setEditId(null)}>×</button><h2>Editar producto</h2><p>Los cambios aparecerán de inmediato en el menú.</p>
        {(() => { const p=products.find(x=>x.id===editId); if(!p)return null; return <><label>Nombre<input value={p.name} onChange={e=>setProducts(xs=>xs.map(x=>x.id===p.id?{...x,name:e.target.value}:x))}/></label><label>Descripción<textarea value={p.description} onChange={e=>setProducts(xs=>xs.map(x=>x.id===p.id?{...x,description:e.target.value}:x))}/></label><div className="form-row"><label>Precio<input type="number" value={p.price} onChange={e=>setProducts(xs=>xs.map(x=>x.id===p.id?{...x,price:Number(e.target.value)}:x))}/></label><label>Categoría<select value={p.category} onChange={e=>setProducts(xs=>xs.map(x=>x.id===p.id?{...x,category:e.target.value}:x))}>{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select></label></div><button className="save">Guardar cambios</button></> })()}
      </form></div>}
    </main>
  );

  return (
    <main className="customer">
      <header className="menu-head"><div className="brand light"><span>ML</span><div>Mesa Lista<small>Comida que provoca</small></div></div><button onClick={() => setMode("admin")} className="admin-link">Panel del local</button><button className="bag" onClick={()=>setCartOpen(true)}>🛍️ <b>{count}</b></button></header>
      <section className="hero">
        <div><span className="eyebrow">BIENVENIDOS · MESA 04</span><h1>¿Qué se le antoja<br/>comer hoy?</h1><p>Prepare su pedido desde la mesa. Nosotros nos encargamos del resto.</p></div>
        <div className="hero-dish"><span>🍔</span><i>100%<br/><small>artesanal</small></i></div>
      </section>
      <section className="menu-area">
        <div className="menu-tools"><div><h2>Nuestro menú</h2><p>Todo preparado al momento</p></div><label className="search">⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar en el menú"/></label></div>
        <div className="chips">{categories.map(c=><button className={category===c?"active":""} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div>
        <div className="food-grid">{visible.map(p=><article className="food-card" key={p.id}><div className={`food-art art-${p.id%4}`}><span>{p.icon}</span>{p.id===1&&<b>Favorito</b>}</div><div className="food-copy"><div><h3>{p.name}</h3><p>{p.description}</p></div><footer><strong>{money(p.price)}</strong><button onClick={()=>add(p)} aria-label={`Agregar ${p.name}`}>＋</button></footer></div></article>)}</div>
      </section>
      {count>0 && <button className="floating-cart" onClick={()=>setCartOpen(true)}><span><b>{count}</b> Ver pedido</span><strong>{money(total)}</strong></button>}
      {cartOpen && <div className="drawer-back" onClick={()=>setCartOpen(false)}><aside className="cart" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setCartOpen(false)}>×</button><span className="eyebrow">SU PEDIDO</span><h2>Todo listo para ordenar</h2><p className="table-tag">📍 {table}</p>
        <div className="cart-items">{cart.map(x=><div key={x.id}><span>{x.icon}</span><div><strong>{x.name}</strong><small>{money(x.price)}</small></div><div className="qty"><button onClick={()=>changeQty(x.id,-1)}>−</button><b>{x.qty}</b><button onClick={()=>changeQty(x.id,1)}>＋</button></div></div>)}</div>
        <div className="total"><span>Total</span><strong>{money(total)}</strong></div><button className="checkout-btn" disabled={!cart.length} onClick={()=>{setCartOpen(false);setCheckout(true)}}>Continuar pedido →</button>
      </aside></div>}
      {checkout && <div className="modal-back"><div className="checkout-modal"><button className="close" onClick={()=>setCheckout(false)}>×</button><span className="eyebrow">ÚLTIMO PASO</span><h2>¿A nombre de quién?</h2><p>Así podremos identificar su pedido al llevarlo a la mesa.</p><label>Nombre<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Andrea"/></label><label>Mesa<select value={table} onChange={e=>setTable(e.target.value)}><option>Mesa 01</option><option>Mesa 02</option><option>Mesa 03</option><option>Mesa 04</option><option>Para llevar</option></select></label><label>Notas del pedido<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Sin cebolla, salsa aparte..."/></label><div className="pay-note"><span>💳</span><div><strong>Pago en el local</strong><small>Efectivo, transferencia o datáfono</small></div></div><button className="checkout-btn" disabled={!name.trim()} onClick={submitOrder}>Enviar pedido · {money(total)}</button></div></div>}
      {success && <div className="modal-back"><div className="success"><span>✓</span><h2>¡Pedido recibido!</h2><p>Ya estamos preparando todo. Le avisaremos cuando salga a su mesa.</p><b>Pedido #1052 · {table}</b><button onClick={()=>setSuccess(false)}>Volver al menú</button></div></div>}
    </main>
  );
}
