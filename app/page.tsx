"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Product = { id: number; name: string; description: string; price: number; category: string; icon: string; active: boolean };
type CartItem = Product & { qty: number };
type Location = { id: number; name: string; type: "Mesa" | "Barra" | "Otro"; active: boolean };
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type OrderLine = { name:string; qty:number; unitPrice:number };
type ActiveOrder = { id:string; status:string; total:number; table:string; name:string; itemCount:number; lines:OrderLine[]; paid:boolean; expiresAt:number };
type Banner = { id:number; eyebrow:string; title:string; text:string; image:string; active:boolean };
type Business = { name:string; slogan:string; logo:string; primary:string; accent:string; background:string; address:string; phone:string; whatsapp:string; mapUrl:string };
type ScheduleDay = { day:string; open:string; close:string; enabled:boolean };

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
  const [adminSection, setAdminSection] = useState<"orders"|"menu"|"history"|"locations"|"users"|"branding"|"settings">("orders");
  const [orderFilter, setOrderFilter] = useState("Activos");
  const [statusFilterOpen,setStatusFilterOpen]=useState(false);
  const [locationFilter, setLocationFilter] = useState("Todas las ubicaciones");
  const [modifiedOnly, setModifiedOnly] = useState(false);
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
    { id: "1048", table: "Mesa 06", name: "Laura", total: 38900, status: "Nuevo", ago: "Hace 2 min", lines:[{name:"Burger de la casa",qty:1,unitPrice:24900},{name:"Cerveza fría",qty:2,unitPrice:7000}], paid:false, modified:false, updateNote:"" },
    { id: "1047", table: "Mesa 02", name: "Carlos", total: 46800, status: "En preparación", ago: "Hace 7 min", lines:[{name:"Perro especial",qty:2,unitPrice:18900},{name:"Limonada de coco",qty:1,unitPrice:9000}], paid:false, modified:false, updateNote:"" },
    { id: "1046", table: "Para llevar", name: "Valentina", total: 28900, status: "Entregado", ago: "Hace 14 min", lines:[{name:"Papas explosivas",qty:1,unitPrice:21900},{name:"Cerveza fría",qty:1,unitPrice:7000}], paid:true, modified:false, updateNote:"" },
  ]);
  const [editId, setEditId] = useState<number | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [productPhotos, setProductPhotos] = useState<Record<number,string[]>>({});
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [finishedOrderId, setFinishedOrderId] = useState("");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [business, setBusiness] = useState<Business>({name:"Mesa Lista",slogan:"Comida que provoca",logo:"",primary:"#173d2d",accent:"#c8ff45",background:"#f6f1e7",address:"Calle 10 # 5-24, Cúcuta",phone:"300 123 4567",whatsapp:"573001234567",mapUrl:"https://maps.google.com"});
  const [banners,setBanners]=useState<Banner[]>([
    {id:1,eyebrow:"BIENVENIDOS",title:"¿Qué se le antoja comer hoy?",text:"Prepare su pedido desde su lugar. Nosotros nos encargamos del resto.",image:"",active:true},
    {id:2,eyebrow:"RECOMENDADO DE LA CASA",title:"Sabor que se disfruta sin afán",text:"Conozca nuestros productos favoritos y pida directamente desde su mesa.",image:"",active:true},
  ]);
  const [schedule,setSchedule]=useState<ScheduleDay[]>([
    {day:"Lunes",open:"11:00",close:"22:00",enabled:true},{day:"Martes",open:"11:00",close:"22:00",enabled:true},{day:"Miércoles",open:"11:00",close:"22:00",enabled:true},{day:"Jueves",open:"11:00",close:"22:00",enabled:true},{day:"Viernes",open:"11:00",close:"23:30",enabled:true},{day:"Sábado",open:"12:00",close:"23:30",enabled:true},{day:"Domingo",open:"12:00",close:"21:00",enabled:true},
  ]);
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
    const savedOrder = window.localStorage.getItem("mesa-lista-active-order");
    const savedBusiness=window.localStorage.getItem("mesa-lista-business");
    const savedBanners=window.localStorage.getItem("mesa-lista-banners");
    const savedSchedule=window.localStorage.getItem("mesa-lista-schedule");
    if(savedBusiness)setBusiness(JSON.parse(savedBusiness));
    if(savedBanners)setBanners(JSON.parse(savedBanners));
    if(savedSchedule)setSchedule(JSON.parse(savedSchedule));
    if(savedOrder) {
      const parsed=JSON.parse(savedOrder) as ActiveOrder & {items?:string[]};
      if(parsed.expiresAt && parsed.expiresAt <= Date.now()) window.localStorage.removeItem("mesa-lista-active-order");
      else {
        const legacyLines=(parsed.items||[]).map(item=>({name:item.replace(/^\d+\s+/,""),qty:Number(item.match(/^\d+/)?.[0]||1),unitPrice:0}));
        const restored={...parsed,lines:parsed.lines||legacyLines,paid:parsed.paid||false,expiresAt:parsed.expiresAt||Date.now()+6*60*60*1000};
        setActiveOrder(restored);
        setOrders(xs=>{
          const recovered={id:restored.id,table:restored.table,name:restored.name,total:restored.total,status:restored.status,ago:"Pedido recuperado",lines:restored.lines,paid:restored.paid,modified:false,updateNote:""};
          return [recovered,...xs.filter(o=>o.id!==restored.id)];
        });
      }
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  useEffect(()=>{
    if(activeOrder) window.localStorage.setItem("mesa-lista-active-order",JSON.stringify(activeOrder));
    else window.localStorage.removeItem("mesa-lista-active-order");
  },[activeOrder]);
  useEffect(()=>{window.localStorage.setItem("mesa-lista-business",JSON.stringify(business))},[business]);
  useEffect(()=>{window.localStorage.setItem("mesa-lista-banners",JSON.stringify(banners))},[banners]);
  useEffect(()=>{window.localStorage.setItem("mesa-lista-schedule",JSON.stringify(schedule))},[schedule]);
  useEffect(()=>{
    const timer=window.setInterval(()=>setActiveOrder(current=>current && current.expiresAt<=Date.now()?null:current),30000);
    return()=>window.clearInterval(timer);
  },[]);

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
    if (!name.trim() || (!cart.length && !activeOrder)) return;
    if(activeOrder){
      const additions=cart.map(x=>`${x.qty} ${x.name}`);
      const newLines=cart.map(x=>({name:x.name,qty:x.qty,unitPrice:x.price}));
      const locationChanged=table!==activeOrder.table;
      const changes=[additions.length?`Agregó: ${additions.join(", ")}`:"",locationChanged?`Cambió ubicación: ${activeOrder.table} → ${table}`:""].filter(Boolean).join(" · ");
      const merged=activeOrder.lines.map(line=>({...line}));
      newLines.forEach(line=>{const found=merged.find(x=>x.name===line.name&&x.unitPrice===line.unitPrice);if(found)found.qty+=line.qty;else merged.push(line)});
      const updated={...activeOrder,table,name,total:activeOrder.total+total,itemCount:activeOrder.itemCount+count,lines:merged,paid:false};
      setActiveOrder(updated);
      setOrders(xs=>{
        const previous=xs.find(o=>o.id===activeOrder.id);
        const changed={...(previous||{id:activeOrder.id,status:activeOrder.status}),table,name,total:updated.total,lines:updated.lines,paid:false,modified:true,updateNote:changes||"El cliente actualizó los datos del pedido",ago:"Modificado ahora"};
        return [changed,...xs.filter(o=>o.id!==activeOrder.id)];
      });
    } else {
      const id=String(Date.now()).slice(-6);
      const lines=cart.map(x=>({name:x.name,qty:x.qty,unitPrice:x.price}));
      const expiresAt=Date.now()+6*60*60*1000;
      setActiveOrder({id,status:"Nuevo",total,table,name,itemCount:count,lines,paid:false,expiresAt});
      setOrders(o => [{ id, table, name, total, status: "Nuevo", ago: "Ahora",lines,paid:false,modified:false,updateNote:"" }, ...o.filter(existing=>existing.id!==id)]);
    }
    setCheckout(false); setSuccess(true); setCart([]);
  };
  const setOrderStatus = (id:string,status:string) => {
    setOrders(xs=>xs.map(o=>o.id===id?{...o,status}:o));
    setActiveOrder(current=>current?.id===id?{...current,status}:current);
  };
  const setOrderPaid = (id:string,paid:boolean) => {
    setOrders(xs=>xs.map(o=>o.id===id?{...o,paid}:o));
    setActiveOrder(current=>current?.id===id?{...current,paid}:current);
  };
  const finishCustomerOrder=()=>{
    if(!activeOrder || activeOrder.status!=="Entregado" || !activeOrder.paid)return;
    setFinishedOrderId(activeOrder.id);setActiveOrder(null);setOrderDetailOpen(false);
  };
  const uniqueOrders=orders.filter((order,index,list)=>list.findIndex(item=>item.id===order.id)===index);
  const filteredOrders = uniqueOrders
    .filter(o=>orderFilter==="Todos" || orderFilter==="Activos" ? (orderFilter==="Todos" || o.status!=="Entregado") : o.status===orderFilter)
    .filter(o=>locationFilter==="Todas las ubicaciones" || o.table===locationFilter)
    .filter(o=>!modifiedOnly || o.modified)
    .sort((a,b)=>Number(b.modified)-Number(a.modified));
  const openAdmin = () => authenticated ? setMode("admin") : setLoginOpen(true);
  const signIn = () => {
    if(!loginUser.trim() || !loginPassword.trim())return;
    setAuthenticated(true);setLoginOpen(false);setMode("admin");setLoginPassword("");
  };
  const imageData=(file:File,done:(url:string)=>void)=>{const reader=new FileReader();reader.onload=()=>done(String(reader.result||""));reader.readAsDataURL(file)};
  const activeBanners=banners.filter(b=>b.active);
  const currentBanner=activeBanners[bannerIndex%Math.max(activeBanners.length,1)]||banners[0];
  const dayIndex=(new Date().getDay()+6)%7;
  const todaySchedule=schedule[dayIndex]||schedule[0];
  const nowTime=new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"America/Bogota"});
  const isOpenNow=Boolean(todaySchedule?.enabled&&nowTime>=todaySchedule.open&&nowTime<todaySchedule.close);
  const themeStyle={"--green":business.primary,"--lime":business.accent,"--cream":business.background} as CSSProperties;

  if (mode === "admin") return (
    <main className="admin-shell" style={themeStyle}>
      <aside className="sidebar">
        <div className="brand">{business.logo?<img src={business.logo} alt={business.name}/>:<span>{business.name.slice(0,2).toUpperCase()}</span>}<div>{business.name}<small>Panel del local</small></div></div>
        <nav>
          <button className={adminSection==="orders"?"active":""} onClick={()=>setAdminSection("orders")}>▦ <span>Pedidos</span><b>2</b></button>
          <button className={adminSection==="menu"?"active":""} onClick={()=>setAdminSection("menu")}>◫ <span>Menú y productos</span></button>
          <button className={adminSection==="history"?"active":""} onClick={()=>setAdminSection("history")}>◷ <span>Historial</span></button>
          <button className={adminSection==="locations"?"active":""} onClick={()=>setAdminSection("locations")}>⌁ <span>Mesas y barra</span></button>
          <button className={adminSection==="users"?"active":""} onClick={()=>setAdminSection("users")}>♙ <span>Usuarios</span></button>
          <button className={adminSection==="branding"?"active":""} onClick={()=>setAdminSection("branding")}>✦ <span>Diseño y negocio</span></button>
          <button className={adminSection==="settings"?"active":""} onClick={()=>setAdminSection("settings")}>⚙ <span>Configuración</span></button>
        </nav>
        <button className="view-menu" onClick={() => setMode("menu")}>Ver menú del cliente ↗</button>
        <button className="logout" onClick={()=>{setAuthenticated(false);setMode("menu")}}>Cerrar sesión</button>
      </aside>
      <section className="admin-main">
        <header className="admin-top"><div><p>Domingo, 26 de julio</p><h1>{adminSection==="orders"?"Pedidos":adminSection==="menu"?"Menú y productos":adminSection==="history"?"Historial de ventas":adminSection==="locations"?"Mesas y barra":adminSection==="users"?"Usuarios administradores":adminSection==="branding"?"Diseño y datos del negocio":"Configuración"}</h1></div><div className="open-pill"><i/> Local abierto</div></header>
        {adminSection==="orders" && <><div className="stats">
          <article><span>Pedidos hoy</span><strong>18</strong><em>↑ 12% frente a ayer</em></article>
          <article><span>Ventas hoy</span><strong>$486.300</strong><em>↑ 8% frente a ayer</em></article>
          <article><span>Ticket promedio</span><strong>$27.016</strong><em>6 mesas activas</em></article>
        </div>
        {uniqueOrders.some(o=>o.modified)&&<div className="change-alert"><span>!</span><div><strong>{uniqueOrders.filter(o=>o.modified).length} pedido modificado</strong><p>El pedido original fue actualizado y aparece primero; no se creó una copia.</p></div><button onClick={()=>setOrders(xs=>xs.map(o=>({...o,modified:false})))}>Marcar como revisado</button></div>}
        <div className="section-title order-title"><div><h2>Pedidos en vivo</h2><p>Un pedido por tarjeta; las modificaciones actualizan el original</p></div><div className="compact-filters"><div className="filter-status-wrap"><button className="visual-filter-trigger" onClick={()=>setStatusFilterOpen(v=>!v)}><i>{orderFilter==="Activos"?"◉":orderFilter==="Nuevo"?"●":orderFilter==="Aceptado"?"✓":orderFilter==="En preparación"?"◴":orderFilter==="Entregado"?"✓":"▦"}</i><span><small>Estado</small><b>{orderFilter}</b></span><em>⌄</em></button>{statusFilterOpen&&<div className="filter-status-menu"><strong>Filtrar pedidos</strong>{["Activos","Nuevo","Aceptado","En preparación","Entregado","Todos"].map(status=><button className={orderFilter===status?"selected":""} key={status} onClick={()=>{setOrderFilter(status);setStatusFilterOpen(false)}}><i>{status==="Activos"?"◉":status==="Nuevo"?"●":status==="Aceptado"?"✓":status==="En preparación"?"◴":status==="Entregado"?"✓":"▦"}</i><span><b>{status}</b><small>{status==="Activos"?"Pedidos pendientes de entrega":status==="Nuevo"?"Recién recibidos":status==="Aceptado"?"Confirmados por el local":status==="En preparación"?"Actualmente en cocina":status==="Entregado"?"Ya entregados":"Todos los pedidos"}</small></span>{orderFilter===status&&<em>✓</em>}</button>)}</div>}</div><label><span>Mesa o ubicación</span><select value={locationFilter} onChange={e=>setLocationFilter(e.target.value)}><option>Todas las ubicaciones</option>{Array.from(new Set([...locations.map(l=>l.name),...uniqueOrders.map(o=>o.table)])).map(place=><option key={place}>{place}</option>)}</select></label><button className={modifiedOnly?"active":""} onClick={()=>setModifiedOnly(v=>!v)}><i>{modifiedOnly?"✓":"↻"}</i><span><b>Solo modificados</b><small>{uniqueOrders.filter(o=>o.modified).length} pendientes de revisión</small></span></button>{(orderFilter!=="Activos"||locationFilter!=="Todas las ubicaciones"||modifiedOnly)&&<button className="clear-filters" onClick={()=>{setOrderFilter("Activos");setLocationFilter("Todas las ubicaciones");setModifiedOnly(false)}}>Limpiar</button>}</div></div>
        <div className="orders">
          {filteredOrders.map((o, i) => <article className={`order ${i === 0 && o.status==="Nuevo" ? "urgent" : ""}`} key={o.id}>
            <div className="order-main"><div className="order-head"><div><span>#{o.id}</span><strong>{o.table}</strong>{o.modified&&<b className="modified-badge">Modificado</b>}</div><small>{o.ago}</small></div><h3>{o.name}</h3><div className="order-lines"><div className="line-head"><span>Producto</span><span>Precio</span><span>Subtotal</span></div>{o.lines.map((line,index)=><div className="line-row" key={`${line.name}-${index}`}><span><b>{line.qty}×</b> {line.name}</span><span>{money(line.unitPrice)}</span><strong>{money(line.qty*line.unitPrice)}</strong></div>)}</div>{o.updateNote&&<div className="update-note"><b>↻ Novedad del cliente</b><span>{o.updateNote}</span></div>}</div>
            <div className="order-side"><div className="charge-total"><small>Total para cobrar</small><strong className="order-total">{money(o.total)}</strong><button className={`paid-button ${o.paid?"paid":""}`} onClick={()=>setOrderPaid(o.id,!o.paid)}>{o.paid?"✓ Pedido cobrado":"Marcar como cobrado"}</button></div><div className="status-control"><button className={`status-trigger status-${statusFlow.indexOf(o.status)}`} onClick={()=>setStatusMenuId(statusMenuId===o.id?null:o.id)}><i>{statusIcon[o.status]}</i><span><small>Estado del pedido</small>{o.status}</span><b>⌄</b></button>{statusMenuId===o.id&&<div className="status-menu"><strong>Cambiar estado</strong>{statusFlow.map(s=><button className={o.status===s?"selected":""} onClick={()=>{setOrderStatus(o.id,s);setStatusMenuId(null)}} key={s}><i>{statusIcon[s]}</i><span>{s}<small>{s==="Nuevo"?"Pedido recién recibido":s==="Aceptado"?"Confirmado por el local":s==="En preparación"?"Se está preparando":"Entregado al cliente"}</small></span>{o.status===s&&<b>✓</b>}</button>)}</div>}</div></div>
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
        {adminSection==="branding"&&<section className="branding-panel">
          <div className="branding-intro"><div><span>PERSONALIZACIÓN DEL LOCAL</span><h2>Controle cómo ven su negocio</h2><p>Los cambios se reflejan inmediatamente en el menú que abre el cliente mediante el código QR.</p></div><button onClick={()=>setMode("menu")}>Vista previa del menú ↗</button></div>
          <div className="branding-grid">
            <article className="brand-form"><h3>Identidad del negocio</h3><div className="logo-editor"><div className="logo-preview">{business.logo?<img src={business.logo} alt="Logo del negocio"/>:<span>{business.name.slice(0,2).toUpperCase()}</span>}</div><label className="image-upload">Cambiar logo<input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(file)imageData(file,url=>setBusiness(x=>({...x,logo:url})))}}/></label>{business.logo&&<button onClick={()=>setBusiness(x=>({...x,logo:""}))}>Quitar</button>}</div><div className="form-row"><label>Nombre del negocio<input value={business.name} onChange={e=>setBusiness(x=>({...x,name:e.target.value}))}/></label><label>Frase corta<input value={business.slogan} onChange={e=>setBusiness(x=>({...x,slogan:e.target.value}))}/></label></div>
              <h3>Colores</h3><div className="color-grid"><label><input type="color" value={business.primary} onChange={e=>setBusiness(x=>({...x,primary:e.target.value}))}/><span><b>Color principal</b><small>{business.primary}</small></span></label><label><input type="color" value={business.accent} onChange={e=>setBusiness(x=>({...x,accent:e.target.value}))}/><span><b>Color de acento</b><small>{business.accent}</small></span></label><label><input type="color" value={business.background} onChange={e=>setBusiness(x=>({...x,background:e.target.value}))}/><span><b>Fondo del menú</b><small>{business.background}</small></span></label></div>
            </article>
            <article className="brand-form"><h3>Datos de contacto</h3><label>Dirección<input value={business.address} onChange={e=>setBusiness(x=>({...x,address:e.target.value}))}/></label><div className="form-row"><label>Teléfono<input value={business.phone} onChange={e=>setBusiness(x=>({...x,phone:e.target.value}))}/></label><label>WhatsApp<input value={business.whatsapp} onChange={e=>setBusiness(x=>({...x,whatsapp:e.target.value.replace(/\D/g,"")}))}/></label></div><label>Enlace de ubicación en el mapa<input value={business.mapUrl} onChange={e=>setBusiness(x=>({...x,mapUrl:e.target.value}))} placeholder="https://maps.google.com/..."/></label><div className="contact-preview"><b>Así aparecerá en el menú</b><span>⌖ {business.address||"Sin dirección"}</span><span>☎ {business.phone||"Sin teléfono"}</span><span>WhatsApp {business.whatsapp||"Sin número"}</span></div></article>
          </div>
          <article className="schedule-editor"><div className="schedule-heading"><div><span>◷</span><div><h3>Horario de atención</h3><p>Defina los días y horas en que el local recibe pedidos.</p></div></div><b className={isOpenNow?"open":"closed"}>{isOpenNow?"Abierto ahora":"Cerrado ahora"}</b></div><div className="schedule-days">{schedule.map((item,index)=><div className={`schedule-row ${!item.enabled?"disabled":""}`} key={item.day}><label className="day-toggle"><input type="checkbox" checked={item.enabled} onChange={()=>setSchedule(xs=>xs.map((x,i)=>i===index?{...x,enabled:!x.enabled}:x))}/><span>{item.enabled?"✓":""}</span><b>{item.day}</b></label>{item.enabled?<><label>Apertura<input type="time" value={item.open} onChange={e=>setSchedule(xs=>xs.map((x,i)=>i===index?{...x,open:e.target.value}:x))}/></label><i>hasta</i><label>Cierre<input type="time" value={item.close} onChange={e=>setSchedule(xs=>xs.map((x,i)=>i===index?{...x,close:e.target.value}:x))}/></label></>:<em>Cerrado todo el día</em>}</div>)}</div></article>
          <div className="banner-admin-head"><div><h2>Banners del menú</h2><p>Puede publicar varios mensajes con su propio texto e imagen.</p></div><button onClick={()=>setBanners(xs=>[...xs,{id:Date.now(),eyebrow:"NUEVO MENSAJE",title:"Título del banner",text:"Escriba aquí la información que desea mostrar.",image:"",active:true}])}>＋ Agregar banner</button></div>
          <div className="banner-admin-list">{banners.map((banner,i)=><article className="banner-editor" key={banner.id}><div className="banner-number"><span>{String(i+1).padStart(2,"0")}</span><label className="switch"><input type="checkbox" checked={banner.active} onChange={()=>setBanners(xs=>xs.map(x=>x.id===banner.id?{...x,active:!x.active}:x))}/><span/></label></div><div className="banner-image">{banner.image?<img src={banner.image} alt={`Banner ${i+1}`}/>:<span>Imagen del banner</span>}<label>Subir imagen<input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(file)imageData(file,url=>setBanners(xs=>xs.map(x=>x.id===banner.id?{...x,image:url}:x)))}}/></label></div><div className="banner-fields"><label>Texto superior<input value={banner.eyebrow} onChange={e=>setBanners(xs=>xs.map(x=>x.id===banner.id?{...x,eyebrow:e.target.value}:x))}/></label><label>Título<input value={banner.title} onChange={e=>setBanners(xs=>xs.map(x=>x.id===banner.id?{...x,title:e.target.value}:x))}/></label><label>Descripción<textarea value={banner.text} onChange={e=>setBanners(xs=>xs.map(x=>x.id===banner.id?{...x,text:e.target.value}:x))}/></label></div><button className="banner-delete" disabled={banners.length===1} onClick={()=>setBanners(xs=>xs.filter(x=>x.id!==banner.id))}>Eliminar</button></article>)}</div>
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
    <main className="customer" style={themeStyle}>
      <header className="menu-head"><div className="brand light customer-brand">{business.logo?<img src={business.logo} alt={business.name}/>:<span>{business.name.slice(0,2).toUpperCase()}</span>}<div>{business.name}<small>{business.slogan}</small></div></div><div className={`menu-open-status ${isOpenNow?"open":"closed"}`}><i/><span><b>{isOpenNow?"Abierto ahora":"Cerrado ahora"}</b><small>{todaySchedule?.day} · {todaySchedule?.enabled?`${todaySchedule.open} – ${todaySchedule.close}`:"No hay atención"}</small></span></div><button onClick={openAdmin} className="admin-link">Ingreso del personal</button><button className="bag" onClick={()=>setCartOpen(true)}>🛍️ <b>{count}</b></button></header>
      <section className={`hero ${currentBanner?.image?"has-banner-image":""}`} style={currentBanner?.image?{backgroundImage:`linear-gradient(90deg, ${business.primary}f2 0%, ${business.primary}c9 48%, ${business.primary}33 100%), url(${currentBanner.image})`}:undefined}>
        <div><span className="eyebrow">{currentBanner?.eyebrow||"BIENVENIDOS"} · {table.toUpperCase()}</span><h1>{currentBanner?.title||"¿Qué se le antoja comer hoy?"}</h1><p>{currentBanner?.text}</p>{activeBanners.length>1&&<div className="banner-controls"><button onClick={()=>setBannerIndex(i=>(i-1+activeBanners.length)%activeBanners.length)}>←</button><span>{activeBanners.map((_,i)=><i className={i===bannerIndex%activeBanners.length?"active":""} key={i}/>)}</span><button onClick={()=>setBannerIndex(i=>(i+1)%activeBanners.length)}>→</button></div>}</div>
        {!currentBanner?.image&&<div className="hero-dish"><span>🍔</span><i>100%<br/><small>artesanal</small></i></div>}
      </section>
      {finishedOrderId&&<div className="finished-banner">✓ Pedido #{finishedOrderId} finalizado. Gracias por su compra.</div>}
      {activeOrder&&<section className="active-order-wrap"><div className="active-order"><div className="active-order-copy"><span className="pulse-dot"/><div><small>PEDIDO ACTIVO · #{activeOrder.id}</small><strong>{activeOrder.status}{activeOrder.paid?" · Cobrado":""}</strong><p>{activeOrder.itemCount} productos · {activeOrder.table} · {money(activeOrder.total)} · vence en 6 horas</p></div></div><div className="order-progress">{statusFlow.map((s,i)=><span className={statusFlow.indexOf(activeOrder.status)>=i?"done":""} key={s}><i>{statusIcon[s]}</i><small>{s}</small></span>)}</div><div className="active-actions"><button onClick={()=>setOrderDetailOpen(v=>!v)}>{orderDetailOpen?"Ocultar detalle":"Ver mi pedido"}</button><button onClick={()=>document.querySelector(".menu-area")?.scrollIntoView()}>＋ Agregar</button><button onClick={()=>{setName(activeOrder.name);setTable(activeOrder.table);setCheckout(true)}}>✎ Ubicación</button></div></div>{orderDetailOpen&&<div className="customer-order-detail"><div className="customer-detail-head"><div><small>SU CUENTA</small><h3>Detalle del pedido</h3></div><span>{activeOrder.paid?"✓ Pagado":"Pago pendiente"}</span></div>{activeOrder.lines.map((line,index)=><div className="customer-line" key={`${line.name}-${index}`}><span><b>{line.qty}×</b> {line.name}<small>{money(line.unitPrice)} cada uno</small></span><strong>{money(line.qty*line.unitPrice)}</strong></div>)}<div className="customer-total"><span>Total</span><strong>{money(activeOrder.total)}</strong></div>{activeOrder.status==="Entregado"&&activeOrder.paid?<button className="finish-order" onClick={finishCustomerOrder}>Confirmar recibido y finalizar</button>:<p className="finish-help">Podrá finalizar cuando el local marque el pedido como entregado y cobrado. Mientras esté en preparación no se puede cancelar.</p>}</div>}</section>}
      <section className="menu-area">
        <div className="menu-tools"><div><h2>Nuestro menú</h2><p>Todo preparado al momento</p></div><label className="search">⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar en el menú"/></label></div>
        <div className="chips">{categories.map(c=><button className={category===c?"active":""} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div>
        <div className="food-grid">{visible.map(p=><article className="food-card" key={p.id}><div className={`food-art art-${p.id%4}`}>{productPhotos[p.id]?.[0]?<img src={productPhotos[p.id][0]} alt={p.name}/>:<span>{p.icon}</span>}{p.id===1&&<b>Favorito</b>}</div><div className="food-copy"><div><h3>{p.name}</h3><p>{p.description}</p></div><footer><strong>{money(p.price)}</strong><button onClick={()=>add(p)} aria-label={`Agregar ${p.name}`}>＋</button></footer></div></article>)}</div>
      </section>
      <footer className="business-footer"><div className="brand light">{business.logo?<img src={business.logo} alt={business.name}/>:<span>{business.name.slice(0,2).toUpperCase()}</span>}<div>{business.name}<small>{business.slogan}</small></div></div><div className="footer-hours"><b>Horario de hoy</b><span>{todaySchedule?.enabled?`${todaySchedule.day}: ${todaySchedule.open} – ${todaySchedule.close}`:`${todaySchedule?.day}: Cerrado`}</span></div><div><span>⌖ {business.address}</span><a href={`tel:${business.phone.replace(/\s/g,"")}`}>☎ {business.phone}</a><a href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>{business.mapUrl&&<a href={business.mapUrl} target="_blank" rel="noreferrer">Ver ubicación ↗</a>}</div></footer>
      {count>0 && <button className="floating-cart" onClick={()=>setCartOpen(true)}><span><b>{count}</b> Ver pedido</span><strong>{money(total)}</strong></button>}
      {cartOpen && <div className="drawer-back" onClick={()=>setCartOpen(false)}><aside className="cart" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setCartOpen(false)}>×</button><span className="eyebrow">SU PEDIDO</span><h2>Todo listo para ordenar</h2><p className="table-tag">📍 {table}</p>
        <div className="cart-items">{cart.map(x=><div key={x.id}><span>{x.icon}</span><div><strong>{x.name}</strong><small>{money(x.price)}</small></div><div className="qty"><button onClick={()=>changeQty(x.id,-1)}>−</button><b>{x.qty}</b><button onClick={()=>changeQty(x.id,1)}>＋</button></div></div>)}</div>
        <div className="total"><span>Total</span><strong>{money(total)}</strong></div><button className="checkout-btn" disabled={!cart.length} onClick={()=>{setCartOpen(false);setCheckout(true)}}>Continuar pedido →</button>
      </aside></div>}
      {checkout && <div className="modal-back"><div className="checkout-modal"><button className="close" onClick={()=>setCheckout(false)}>×</button><span className="eyebrow">{activeOrder?"ACTUALIZAR PEDIDO":"ÚLTIMO PASO"}</span><h2>{activeOrder?"¿Qué desea cambiar?":"¿A nombre de quién?"}</h2><p>{activeOrder?"Puede cambiar la ubicación o sumar los productos nuevos al mismo pedido.":"Así podremos identificar su pedido y llevarlo al lugar correcto."}</p><label>Nombre<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Andrea"/></label><label>¿Dónde está?<select value={table} onChange={e=>setTable(e.target.value)}>{locations.filter(l=>l.active).map(l=><option key={l.id}>{l.name}</option>)}</select></label><label>Notas del pedido<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Sin cebolla, salsa aparte..."/></label><div className="pay-note"><span>☁</span><div><strong>{activeOrder?"Se actualizará el mismo pedido":"Pedido vinculado a este navegador"}</strong><small>Podrá regresar al enlace y consultar o actualizar su pedido activo</small></div></div><button className="checkout-btn" disabled={!name.trim()} onClick={submitOrder}>{activeOrder?"Actualizar pedido":"Enviar pedido"} · {money((activeOrder?.total||0)+total)}</button></div></div>}
      {success && <div className="modal-back"><div className="success"><span>✓</span><h2>¡Pedido actualizado!</h2><p>El local recibirá los cambios en el mismo pedido. Puede seguir agregando productos mientras continúe activo.</p><b>Pedido #{activeOrder?.id||"1052"} · {table}</b><button onClick={()=>setSuccess(false)}>Volver al menú</button></div></div>}
      {loginOpen && <div className="modal-back"><form className="login-card" onSubmit={e=>{e.preventDefault();signIn()}}><button type="button" className="close" onClick={()=>setLoginOpen(false)}>×</button><div className="brand"><span>ML</span><div>Mesa Lista<small>Acceso protegido</small></div></div><h2>Ingreso del personal</h2><p>Solo las personas autorizadas pueden administrar el local.</p><label>Usuario<input autoFocus value={loginUser} onChange={e=>setLoginUser(e.target.value)} placeholder="Ingrese su usuario"/></label><label>Contraseña<input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="Ingrese su contraseña"/></label><button className="checkout-btn" disabled={!loginUser.trim()||!loginPassword.trim()}>Ingresar al panel</button><small>🔒 Sus ventas y pedidos permanecen protegidos.</small></form></div>}
    </main>
  );
}
