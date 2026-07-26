"use client";

import { useEffect, useState } from "react";

type Product = { id: number; name: string; description: string; price: number; category: string; icon: string; active: boolean };
type CartItem = Product & { qty: number };
type Location = { id: number; name: string; type: "Mesa" | "Barra" | "Otro"; active: boolean };
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

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
  const [loginOpen, setLoginOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [historyPeriod, setHistoryPeriod] = useState<"Día"|"Semana"|"Quincena"|"Mes">("Día");
  const [adminSection, setAdminSection] = useState<"orders"|"menu"|"history"|"locations"|"users"|"settings">("orders");
  const [orderFilter, setOrderFilter] = useState("Activos");
  const [categoryList, setCategoryList] = useState(["Hamburguesas","Perros","Para compartir","Bebidas"]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [userEdit, setUserEdit] = useState<{id:number;name:string;username:string;role:string}|null>(null);
  const [users, setUsers] = useState([
    {id:1,name:"Andrea Martínez",username:"andrea",role:"Propietaria",active:true},
    {id:2,name:"Camila Rojas",username:"camila",role:"Administradora",active:true},
  ]);
  const [products, setProducts] = useState(seed);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [success, setSuccess] = useState(false);
  const [table, setTable] = useState("Mesa 04");
  const [locations, setLocations] = useState<Location[]>([
    { id: 1, name: "Mesa 01", type: "Mesa", active: true },
    { id: 2, name: "Mesa 02", type: "Mesa", active: true },
    { id: 3, name: "Mesa 03", type: "Mesa", active: true },
    { id: 4, name: "Mesa 04", type: "Mesa", active: true },
    { id: 5, name: "Barra 01", type: "Barra", active: true },
    { id: 6, name: "Barra 02", type: "Barra", active: true },
    { id: 7, name: "Para llevar", type: "Otro", active: true },
  ]);
  const [locationEdit, setLocationEdit] = useState<Location | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [orders, setOrders] = useState([
    { id: "1048", table: "Mesa 06", name: "Laura", total: 38900, status: "Nuevo", ago: "Hace 2 min" },
    { id: "1047", table: "Mesa 02", name: "Carlos", total: 47800, status: "En preparación", ago: "Hace 7 min" },
    { id: "1046", table: "Para llevar", name: "Valentina", total: 31900, status: "Entregado", ago: "Hace 14 min" },
  ]);
  const [editId, setEditId] = useState<number | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [productPhotos, setProductPhotos] = useState<Record<number,string[]>>({});
  const statusFlow = ["Nuevo", "Aceptado", "En preparación", "Entregado"];
  const statusIcon:Record<string,string> = {"Nuevo":"●","Aceptado":"✓","En preparación":"◴","Entregado":"✓"};
  const historyRows = [
    {date:"26 jul · 8:42 p. m.",id:"1046",name:"Valentina",place:"Para llevar",total:31900,status:"Entregado"},
    {date:"26 jul · 8:10 p. m.",id:"1045",name:"Miguel",place:"Mesa 03",total:52900,status:"Entregado"},
    {date:"26 jul · 7:34 p. m.",id:"1044",name:"Sara",place:"Barra 01",total:24700,status:"Entregado"},
    {date:"26 jul · 6:58 p. m.",id:"1043",name:"Daniel",place:"Mesa 01",total:44300,status:"Entregado"},
  ];
  const periodTotals = {Día:{sales:486300,orders:18,average:27016},Semana:{sales:2846900,orders:106,average:26858},Quincena:{sales:6124500,orders:231,average:26513},Mes:{sales:12867400,orders:489,average:26314}};

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const categories = ["Todos", ...categoryList];
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
  const setOrderStatus = (id:string,status:string) => setOrders(xs=>xs.map(o=>o.id===id?{...o,status}:o));
  const filteredOrders = orders.filter(o=>orderFilter==="Todos" || orderFilter==="Activos" ? (orderFilter==="Todos" || o.status!=="Entregado") : o.status===orderFilter);
  const openAdmin = () => authenticated ? setMode("admin") : setLoginOpen(true);
  const signIn = () => {
    if(!loginUser.trim() || !loginPassword.trim())return;
    setAuthenticated(true);setLoginOpen(false);setMode("admin");setLoginPassword("");
  };

  if (mode === "admin") return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand"><span>ML</span><div>Mesa Lista<small>Panel del local</small></div></div>
        <nav>
          <button className={adminSection==="orders"?"active":""} onClick={()=>setAdminSection("orders")}>▦ <span>Pedidos</span><b>2</b></button>
          <button className={adminSection==="menu"?"active":""} onClick={()=>setAdminSection("menu")}>◫ <span>Menú y productos</span></button>
          <button className={adminSection==="history"?"active":""} onClick={()=>setAdminSection("history")}>◷ <span>Historial</span></button>
          <button className={adminSection==="locations"?"active":""} onClick={()=>setAdminSection("locations")}>⌁ <span>Mesas y barra</span></button>
          <button className={adminSection==="users"?"active":""} onClick={()=>setAdminSection("users")}>♙ <span>Usuarios</span></button>
          <button className={adminSection==="settings"?"active":""} onClick={()=>setAdminSection("settings")}>⚙ <span>Configuración</span></button>
        </nav>
        <button className="view-menu" onClick={() => setMode("menu")}>Ver menú del cliente ↗</button>
        <button className="logout" onClick={()=>{setAuthenticated(false);setMode("menu")}}>Cerrar sesión</button>
      </aside>
      <section className="admin-main">
        <header className="admin-top"><div><p>Domingo, 26 de julio</p><h1>{adminSection==="orders"?"Pedidos":adminSection==="menu"?"Menú y productos":adminSection==="history"?"Historial de ventas":adminSection==="locations"?"Mesas y barra":adminSection==="users"?"Usuarios administradores":"Configuración"}</h1></div><div className="open-pill"><i/> Local abierto</div></header>
        {adminSection==="orders" && <><div className="stats">
          <article><span>Pedidos hoy</span><strong>18</strong><em>↑ 12% frente a ayer</em></article>
          <article><span>Ventas hoy</span><strong>$486.300</strong><em>↑ 8% frente a ayer</em></article>
          <article><span>Ticket promedio</span><strong>$27.016</strong><em>6 mesas activas</em></article>
        </div>
        <div className="section-title"><div><h2>Pedidos en vivo</h2><p>Seleccione el estado; ningún cambio se hará accidentalmente</p></div><div className="order-filters">{["Activos","Nuevo","Aceptado","En preparación","Entregado","Todos"].map(f=><button className={orderFilter===f?"active":""} onClick={()=>setOrderFilter(f)} key={f}>{f}</button>)}</div></div>
        <div className="orders">
          {filteredOrders.map((o, i) => <article className={`order ${i === 0 && o.status==="Nuevo" ? "urgent" : ""}`} key={o.id}>
            <div className="order-head"><div><span>#{o.id}</span><strong>{o.table}</strong></div><small>{o.ago}</small></div>
            <h3>{o.name}</h3><p>{i === 0 ? "1 Burger de la casa · 2 Cerveza fría" : i === 1 ? "2 Perros especiales · 1 Limonada" : "1 Papas explosivas · 1 Cerveza"}</p>
            <div className="order-foot"><strong>{money(o.total)}</strong><div className="status-control"><button className={`status-trigger status-${statusFlow.indexOf(o.status)}`} onClick={()=>setStatusMenuId(statusMenuId===o.id?null:o.id)}><i>{statusIcon[o.status]}</i><span><small>Estado del pedido</small>{o.status}</span><b>⌄</b></button>{statusMenuId===o.id&&<div className="status-menu"><strong>Cambiar estado</strong>{statusFlow.map(s=><button className={o.status===s?"selected":""} onClick={()=>{setOrderStatus(o.id,s);setStatusMenuId(null)}} key={s}><i>{statusIcon[s]}</i><span>{s}<small>{s==="Nuevo"?"Pedido recién recibido":s==="Aceptado"?"Confirmado por el local":s==="En preparación"?"Se está preparando":"Pedido finalizado"}</small></span>{o.status===s&&<b>✓</b>}</button>)}</div>}</div></div>
          </article>)}
          {!filteredOrders.length&&<div className="empty-state">No hay pedidos con este estado.</div>}
        </div></>}
        {adminSection==="history" && <section>
          <div className="section-title products-title"><div><h2>Historial de ventas</h2><p>Consulte el rendimiento del local por período</p></div><div className="period-tabs">{(["Día","Semana","Quincena","Mes"] as const).map(p=><button className={historyPeriod===p?"active":""} onClick={()=>setHistoryPeriod(p)} key={p}>{p}</button>)}</div></div>
          <div className="history-summary"><article><span>Ventas del período</span><strong>{money(periodTotals[historyPeriod].sales)}</strong></article><article><span>Pedidos entregados</span><strong>{periodTotals[historyPeriod].orders}</strong></article><article><span>Ticket promedio</span><strong>{money(periodTotals[historyPeriod].average)}</strong></article></div>
          <div className="history-table"><div className="history-head"><span>Fecha y hora</span><span>Pedido</span><span>Cliente / ubicación</span><span>Total</span><span>Estado</span></div>{historyRows.map(r=><div className="history-row" key={r.id}><span>{r.date}</span><b>#{r.id}</b><span><strong>{r.name}</strong><small>{r.place}</small></span><b>{money(r.total)}</b><em>✓ {r.status}</em></div>)}</div>
        </section>}
        {adminSection==="menu" && <section><div className="category-strip"><div><strong>Categorías del menú</strong><span>{categoryList.join(" · ")}</span></div><button onClick={()=>setCategoryOpen(true)}>＋ Crear categoría</button></div>
        <div className="section-title products-title"><div><h2>Productos</h2><p>{products.filter(p=>p.active).length} disponibles en {categoryList.length} categorías</p></div><button onClick={() => {
          const id = Date.now(); setProducts(p => [...p, {id,name:"Nuevo producto",description:"Edite la descripción",price:10000,category:"Hamburguesas",icon:"🍽️",active:true}]); setEditId(id);
        }}>＋ Agregar producto</button></div>
        <div className="product-table">
          {products.map(p => <div className="product-row" key={p.id}><span className="mini-food">{p.icon}</span><div><strong>{p.name}</strong><small>{p.category}</small></div><b>{money(p.price)}</b><label className="switch"><input type="checkbox" checked={p.active} onChange={() => setProducts(xs => xs.map(x => x.id===p.id?{...x,active:!x.active}:x))}/><span/></label><button className="edit" onClick={()=>setEditId(p.id)}>Editar</button></div>)}
        </div></section>}
        {adminSection==="locations" && <section><div className="section-title products-title"><div><h2>Mesas, barra y puntos de entrega</h2><p>Cree todos los lugares donde sus clientes pueden pedir</p></div><button onClick={() => setLocationEdit({id:Date.now(),name:"",type:"Mesa",active:true})}>＋ Crear ubicación</button></div>
        <div className="location-grid">
          {locations.map(l => <article className="location-card" key={l.id}>
            <div className={`location-icon ${l.type.toLowerCase()}`}>{l.type === "Mesa" ? "▦" : l.type === "Barra" ? "▰" : "⌂"}</div>
            <div><strong>{l.name}</strong><small>{l.type} · {l.active ? "Disponible" : "Oculta"}</small></div>
            <label className="switch"><input type="checkbox" checked={l.active} onChange={() => setLocations(xs=>xs.map(x=>x.id===l.id?{...x,active:!x.active}:x))}/><span/></label>
            <button className="edit" onClick={()=>setLocationEdit({...l})}>Editar</button>
          </article>)}
        </div></section>}
        {adminSection==="users" && <section><div className="section-title products-title"><div><h2>Usuarios administradores</h2><p>Controle quién puede ver ventas, pedidos y configuración</p></div><button onClick={()=>setUserEdit({id:Date.now(),name:"",username:"",role:"Administrador"})}>＋ Crear usuario</button></div>
          <div className="user-list">{users.map(u=><article key={u.id}><span className="avatar">{u.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</span><div><strong>{u.name}</strong><small>@{u.username} · {u.role}</small></div><i>{u.active?"Activo":"Inactivo"}</i><button className="edit" onClick={()=>setUserEdit({...u})}>Editar</button></article>)}</div>
        </section>}
        {adminSection==="settings" && <section><div className="settings-card"><span>📲</span><div><h2>Aplicación del local</h2><p>Instálela en Android y ábrala desde la pantalla de inicio, sin computador.</p></div><button disabled={!installPrompt} onClick={async()=>{if(installPrompt){await installPrompt.prompt();setInstallPrompt(null)}}}>{installPrompt ? "Instalar aplicación" : "Lista para instalar"}</button></div><div className="settings-card"><span>🔔</span><div><h2>Alertas por WhatsApp</h2><p>Conecte el número empresarial para recibir una alerta con cada nuevo pedido.</p></div><button>Configurar</button></div></section>}
      </section>
      {editId !== null && <div className="modal-back"><form className="edit-modal product-modal" onSubmit={e=>{e.preventDefault();setEditId(null)}}><button type="button" className="close" onClick={()=>setEditId(null)}>×</button><h2>Editar producto</h2><p>Agregue fotografías apetitosas y mantenga toda la información actualizada.</p>
        {(() => { const p=products.find(x=>x.id===editId); if(!p)return null; const photos=productPhotos[p.id]||[]; return <><div className="photo-section"><div><strong>Fotografías del producto</strong><small>Puede cargar una o varias imágenes</small></div><div className="photo-grid">{photos.map((src,i)=><figure key={src}><img src={src} alt={`${p.name} ${i+1}`}/><button type="button" onClick={()=>setProductPhotos(xs=>({...xs,[p.id]:xs[p.id].filter(x=>x!==src)}))}>×</button>{i===0&&<b>Principal</b>}</figure>)}<label className="upload-tile">＋<span>Agregar fotos</span><small>JPG, PNG o WEBP</small><input type="file" accept="image/*" multiple onChange={e=>{const urls=Array.from(e.target.files||[]).map(file=>URL.createObjectURL(file));setProductPhotos(xs=>({...xs,[p.id]:[...(xs[p.id]||[]),...urls]}));e.target.value=""}}/></label></div></div><label>Nombre<input value={p.name} onChange={e=>setProducts(xs=>xs.map(x=>x.id===p.id?{...x,name:e.target.value}:x))}/></label><label>Descripción<textarea value={p.description} onChange={e=>setProducts(xs=>xs.map(x=>x.id===p.id?{...x,description:e.target.value}:x))}/></label><div className="form-row"><label>Precio<input type="number" value={p.price} onChange={e=>setProducts(xs=>xs.map(x=>x.id===p.id?{...x,price:Number(e.target.value)}:x))}/></label><label>Categoría<select value={p.category} onChange={e=>setProducts(xs=>xs.map(x=>x.id===p.id?{...x,category:e.target.value}:x))}>{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select></label></div><button className="save">Guardar cambios</button></> })()}
      </form></div>}
      {locationEdit && <div className="modal-back"><form className="edit-modal" onSubmit={e=>{e.preventDefault();if(!locationEdit.name.trim())return;setLocations(xs=>xs.some(x=>x.id===locationEdit.id)?xs.map(x=>x.id===locationEdit.id?locationEdit:x):[...xs,locationEdit]);setLocationEdit(null)}}><button type="button" className="close" onClick={()=>setLocationEdit(null)}>×</button><h2>{locations.some(x=>x.id===locationEdit.id)?"Editar ubicación":"Crear ubicación"}</h2><p>Puede agregar mesas, puestos en la barra o cualquier otro punto de entrega.</p><label>Nombre<input autoFocus value={locationEdit.name} onChange={e=>setLocationEdit({...locationEdit,name:e.target.value})} placeholder="Ej. Barra 03"/></label><label>Tipo<select value={locationEdit.type} onChange={e=>setLocationEdit({...locationEdit,type:e.target.value as Location["type"]})}><option>Mesa</option><option>Barra</option><option>Otro</option></select></label><button className="save">Guardar ubicación</button>{locations.some(x=>x.id===locationEdit.id)&&<button type="button" className="delete-location" onClick={()=>{setLocations(xs=>xs.filter(x=>x.id!==locationEdit.id));setLocationEdit(null)}}>Eliminar ubicación</button>}</form></div>}
      {userEdit && <div className="modal-back"><form className="edit-modal" onSubmit={e=>{e.preventDefault();if(!userEdit.name.trim()||!userEdit.username.trim())return;setUsers(xs=>xs.some(x=>x.id===userEdit.id)?xs.map(x=>x.id===userEdit.id?{...x,...userEdit}:x):[...xs,{...userEdit,active:true}]);setUserEdit(null)}}><button type="button" className="close" onClick={()=>setUserEdit(null)}>×</button><h2>{users.some(x=>x.id===userEdit.id)?"Editar usuario":"Crear usuario"}</h2><p>Esta persona podrá ingresar al panel privado del local.</p><label>Nombre completo<input value={userEdit.name} onChange={e=>setUserEdit({...userEdit,name:e.target.value})} placeholder="Ej. María Gómez"/></label><label>Usuario<input value={userEdit.username} onChange={e=>setUserEdit({...userEdit,username:e.target.value.replace(/\s/g,"").toLowerCase()})} placeholder="maria"/></label><label>Rol<select value={userEdit.role} onChange={e=>setUserEdit({...userEdit,role:e.target.value})}><option>Administrador</option><option>Operador de pedidos</option></select></label><label>Contraseña temporal<input type="password" placeholder="Mínimo 8 caracteres"/></label><button className="save">Guardar usuario</button></form></div>}
      {categoryOpen && <div className="modal-back"><form className="edit-modal" onSubmit={e=>{e.preventDefault();if(!newCategory.trim())return;setCategoryList(xs=>xs.includes(newCategory.trim())?xs:[...xs,newCategory.trim()]);setNewCategory("");setCategoryOpen(false)}}><button type="button" className="close" onClick={()=>setCategoryOpen(false)}>×</button><h2>Crear categoría</h2><p>La categoría aparecerá inmediatamente al agregar o editar productos.</p><label>Nombre de la categoría<input autoFocus value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="Ej. Comida china"/></label><button className="save">Crear categoría</button></form></div>}
    </main>
  );

  return (
    <main className="customer">
      <header className="menu-head"><div className="brand light"><span>ML</span><div>Mesa Lista<small>Comida que provoca</small></div></div><button onClick={openAdmin} className="admin-link">Ingreso del personal</button><button className="bag" onClick={()=>setCartOpen(true)}>🛍️ <b>{count}</b></button></header>
      <section className="hero">
        <div><span className="eyebrow">BIENVENIDOS · {table.toUpperCase()}</span><h1>¿Qué se le antoja<br/>comer hoy?</h1><p>Prepare su pedido desde su lugar. Nosotros nos encargamos del resto.</p></div>
        <div className="hero-dish"><span>🍔</span><i>100%<br/><small>artesanal</small></i></div>
      </section>
      <section className="menu-area">
        <div className="menu-tools"><div><h2>Nuestro menú</h2><p>Todo preparado al momento</p></div><label className="search">⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar en el menú"/></label></div>
        <div className="chips">{categories.map(c=><button className={category===c?"active":""} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div>
        <div className="food-grid">{visible.map(p=><article className="food-card" key={p.id}><div className={`food-art art-${p.id%4}`}>{productPhotos[p.id]?.[0]?<img src={productPhotos[p.id][0]} alt={p.name}/>:<span>{p.icon}</span>}{p.id===1&&<b>Favorito</b>}</div><div className="food-copy"><div><h3>{p.name}</h3><p>{p.description}</p></div><footer><strong>{money(p.price)}</strong><button onClick={()=>add(p)} aria-label={`Agregar ${p.name}`}>＋</button></footer></div></article>)}</div>
      </section>
      {count>0 && <button className="floating-cart" onClick={()=>setCartOpen(true)}><span><b>{count}</b> Ver pedido</span><strong>{money(total)}</strong></button>}
      {cartOpen && <div className="drawer-back" onClick={()=>setCartOpen(false)}><aside className="cart" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setCartOpen(false)}>×</button><span className="eyebrow">SU PEDIDO</span><h2>Todo listo para ordenar</h2><p className="table-tag">📍 {table}</p>
        <div className="cart-items">{cart.map(x=><div key={x.id}><span>{x.icon}</span><div><strong>{x.name}</strong><small>{money(x.price)}</small></div><div className="qty"><button onClick={()=>changeQty(x.id,-1)}>−</button><b>{x.qty}</b><button onClick={()=>changeQty(x.id,1)}>＋</button></div></div>)}</div>
        <div className="total"><span>Total</span><strong>{money(total)}</strong></div><button className="checkout-btn" disabled={!cart.length} onClick={()=>{setCartOpen(false);setCheckout(true)}}>Continuar pedido →</button>
      </aside></div>}
      {checkout && <div className="modal-back"><div className="checkout-modal"><button className="close" onClick={()=>setCheckout(false)}>×</button><span className="eyebrow">ÚLTIMO PASO</span><h2>¿A nombre de quién?</h2><p>Así podremos identificar su pedido y llevarlo al lugar correcto.</p><label>Nombre<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Andrea"/></label><label>¿Dónde está?<select value={table} onChange={e=>setTable(e.target.value)}>{locations.filter(l=>l.active).map(l=><option key={l.id}>{l.name}</option>)}</select></label><label>Notas del pedido<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Sin cebolla, salsa aparte..."/></label><div className="pay-note"><span>🔔</span><div><strong>Alerta al local</strong><small>El pedido aparecerá en el panel y podrá notificarse por WhatsApp</small></div></div><button className="checkout-btn" disabled={!name.trim()} onClick={submitOrder}>Enviar pedido · {money(total)}</button></div></div>}
      {success && <div className="modal-back"><div className="success"><span>✓</span><h2>¡Pedido recibido!</h2><p>Ya estamos preparando todo. Le avisaremos cuando salga a su mesa.</p><b>Pedido #1052 · {table}</b><button onClick={()=>setSuccess(false)}>Volver al menú</button></div></div>}
      {loginOpen && <div className="modal-back"><form className="login-card" onSubmit={e=>{e.preventDefault();signIn()}}><button type="button" className="close" onClick={()=>setLoginOpen(false)}>×</button><div className="brand"><span>ML</span><div>Mesa Lista<small>Acceso protegido</small></div></div><h2>Ingreso del personal</h2><p>Solo las personas autorizadas pueden administrar el local.</p><label>Usuario<input autoFocus value={loginUser} onChange={e=>setLoginUser(e.target.value)} placeholder="Ingrese su usuario"/></label><label>Contraseña<input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="Ingrese su contraseña"/></label><button className="checkout-btn" disabled={!loginUser.trim()||!loginPassword.trim()}>Ingresar al panel</button><small>🔒 Sus ventas y pedidos permanecen protegidos.</small></form></div>}
    </main>
  );
}
