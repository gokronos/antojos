"use client";
/* eslint-disable @next/next/no-img-element -- restaurant images are persisted as optimized data URLs */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Product = { id: number; name: string; description: string; price: number; category: string; icon: string; images: string[]; active: boolean };
type Location = { id: number; name: string; type: "Mesa" | "Barra" | "Otro"; active: boolean };
type CartItem = Product & { qty: number };
type Settings = { name: string; tagline: string; welcomeMessage: string; acceptingOrders: boolean; logo:string; primaryColor:string; accentColor:string; backgroundColor:string; address:string; phone:string; whatsapp:string; mapUrl:string };
type Banner = { id:number; eyebrow:string; title:string; text:string; image:string; active:boolean; position:number };
type ScheduleDay = { weekday:number; day:string; openTime:string; closeTime:string; enabled:boolean };
type InstallPrompt = Event & { prompt: () => Promise<void> };
type ActiveOrder = { id:number; locationId:number; locationName:string; customerName:string; notes:string; total:number; status:"Nuevo"|"Aceptado"|"En preparación"|"Entregado"; paid:boolean; items:{productId:number;productName:string;unitPrice:number;quantity:number}[] };
type ServiceRequestType = "Llamar al mesero" | "Pedir la cuenta" | "Cubiertos o servilletas" | "Reportar un inconveniente" | "Otra solicitud";

const money = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const serviceOptions:{type:ServiceRequestType;icon:string;help:string}[]=[
  {type:"Llamar al mesero",icon:"🙋",help:"Necesito atención en la mesa"},
  {type:"Pedir la cuenta",icon:"🧾",help:"Quiero solicitar la cuenta"},
  {type:"Cubiertos o servilletas",icon:"🍴",help:"Necesito elementos para la mesa"},
  {type:"Reportar un inconveniente",icon:"⚠️",help:"Algo requiere atención"},
  {type:"Otra solicitud",icon:"💬",help:"Quiero escribir otra necesidad"},
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [settings, setSettings] = useState<Settings>({ name:"Mesa Lista",tagline:"Comida que provoca",welcomeMessage:"Prepare su pedido desde su lugar. Nosotros nos encargamos del resto.",acceptingOrders:true,logo:"",primaryColor:"#173d2d",accentColor:"#c8ff45",backgroundColor:"#f6f1e7",address:"",phone:"",whatsapp:"",mapUrl:"" });
  const [banners,setBanners]=useState<Banner[]>([]);
  const [schedule,setSchedule]=useState<ScheduleDay[]>([]);
  const [bannerIndex,setBannerIndex]=useState(0);
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
  const [activeOrder,setActiveOrder]=useState<ActiveOrder|null>(null);
  const [orderDetailOpen,setOrderDetailOpen]=useState(false);
  const [serviceOpen,setServiceOpen]=useState(false);
  const [serviceType,setServiceType]=useState<ServiceRequestType|null>(null);
  const [serviceNote,setServiceNote]=useState("");
  const [serviceSent,setServiceSent]=useState("");

  useEffect(() => {
    fetch("/api/menu", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setProducts(data.products);
        setLocations(data.locations);
        if (data.settings) setSettings(data.settings);
        setBanners(data.banners ?? []);
        setSchedule(data.schedule ?? []);
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

  const refreshActiveOrder=useCallback(async()=>{
    const token=window.localStorage.getItem("antojos-active-order");
    if(!token) return;
    try {
      const response=await fetch(`/api/orders?token=${encodeURIComponent(token)}`,{cache:"no-store"});
      const result=await response.json();
      if(response.ok&&result.order) {
        setActiveOrder(result.order);
        setName(result.order.customerName);
        setLocationId(result.order.locationId);
      } else {
        window.localStorage.removeItem("antojos-active-order");
        setActiveOrder(null);
      }
    } catch {}
  },[]);

  useEffect(()=>{
    const initial=window.setTimeout(refreshActiveOrder,0);
    const timer=window.setInterval(refreshActiveOrder,10000);
    return()=>{window.clearTimeout(initial);window.clearInterval(timer);};
  },[refreshActiveOrder]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => setBannerIndex((index) => (index + 1) % banners.length), 7000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const categories = useMemo(() => ["Todos", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const visible = products.filter((p) =>
    (category === "Todos" || p.category === category) &&
    `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase())
  );
  const location = locations.find((l) => l.id === locationId);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const currentBanner=banners[bannerIndex%banners.length];
  const colombiaDay=(new Date(new Date().toLocaleString("en-US",{timeZone:"America/Bogota"})).getDay()+6)%7;
  const todaySchedule=schedule.find((day) => day.weekday===colombiaDay);
  const nowTime=new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"America/Bogota"});
  const isOpenNow=Boolean(settings.acceptingOrders&&todaySchedule?.enabled&&nowTime>=todaySchedule.openTime&&nowTime<todaySchedule.closeTime);
  const themeStyle={"--green":settings.primaryColor,"--lime":settings.accentColor,"--cream":settings.backgroundColor} as CSSProperties;
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
    if (!name.trim() || (!cart.length && !activeOrder) || !locationId) return;
    setSending(true);
    setError("");
    try {
      const token=window.localStorage.getItem("antojos-active-order");
      const response = await fetch("/api/orders", {
        method: activeOrder&&token?"PATCH":"POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          notes,
          locationId,
          items: cart.map((item) => ({ productId: item.id, quantity: item.qty })), token,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setCheckout(false);
      if(result.customerToken) window.localStorage.setItem("antojos-active-order",result.customerToken);
      setSuccess({ id: result.id, locationName: result.locationName });
      setCart([]);
      setNotes("");
      await refreshActiveOrder();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible enviar el pedido.");
    } finally {
      setSending(false);
    }
  }

  async function finishOrder() {
    const token=window.localStorage.getItem("antojos-active-order");
    if(!token)return;
    const response=await fetch("/api/orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"close",token})});
    const result=await response.json();
    if(!response.ok){setError(result.error);return;}
    window.localStorage.removeItem("antojos-active-order");
    setActiveOrder(null);setOrderDetailOpen(false);setName("");
  }

  async function submitServiceRequest() {
    if(!locationId||!serviceType)return;
    setSending(true);setError("");
    try {
      const response=await fetch("/api/service-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        locationId,customerName:name,requestType:serviceType,note:serviceNote,
      })});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error);
      setServiceSent(`${serviceType} · ${result.locationName}`);
      setServiceType(null);setServiceNote("");setServiceOpen(false);
    } catch(cause) {
      setError(cause instanceof Error?cause.message:"No fue posible solicitar atención.");
    } finally {setSending(false);}
  }

  if (loading) {
    return (
      <main className="menu-initial-loading" aria-live="polite" aria-busy="true">
        <span />
        <p>Cargando el menú…</p>
      </main>
    );
  }

  return (
    <main className="customer" style={themeStyle}>
      <header className="menu-head">
        <div className="brand customer-brand">{settings.logo?<img src={settings.logo} alt={settings.name}/>:<span>{settings.name.slice(0,2).toUpperCase()}</span>}<div>{settings.name}<small>{settings.tagline}</small></div></div>
        <div className={`menu-open-status ${isOpenNow?"open":"closed"}`}><i/><span><b>{isOpenNow?"Abierto ahora":"Cerrado ahora"}</b><small>{todaySchedule?.day} · {todaySchedule?.enabled?`${todaySchedule.openTime} – ${todaySchedule.closeTime}`:"No hay atención"}</small></span></div>
        <a href="/admin" className="admin-link">Panel del local</a>
        <button className="bag" onClick={() => setCartOpen(true)}>🛍️ <b>{count}</b></button>
      </header>
      <section className={`hero ${currentBanner?.image?"has-banner-image":""}`} style={currentBanner?.image?{backgroundImage:`linear-gradient(90deg, ${settings.primaryColor}f2 0%, ${settings.primaryColor}c9 48%, ${settings.primaryColor}33 100%), url(${currentBanner.image})`}:undefined}>
        <div><span className="eyebrow">{currentBanner?.eyebrow||"BIENVENIDOS"} · {(location?.name ?? "SELECCIONE SU MESA").toUpperCase()}</span><h1>{currentBanner?.title||"¿Qué se le antoja comer hoy?"}</h1><p>{currentBanner?.text||settings.welcomeMessage}</p>{!settings.acceptingOrders && <b className="closed-banner">El local está pausado · Puede consultar el menú</b>}{banners.length>1&&<div className="banner-controls"><button onClick={()=>setBannerIndex((index)=>(index-1+banners.length)%banners.length)}>←</button><span>{banners.map((banner,index)=><i className={index===bannerIndex%banners.length?"active":""} key={banner.id}/>)}</span><button onClick={()=>setBannerIndex((index)=>(index+1)%banners.length)}>→</button></div>}</div>
        {!currentBanner?.image&&<div className="hero-dish"><span>🍔</span><i>100%<br /><small>artesanal</small></i></div>}
      </section>
      {activeOrder&&<section className="active-order-wrap"><div className="active-order"><div className="active-order-copy"><span className="pulse-dot"/><div><small>PEDIDO ACTIVO · #{activeOrder.id}</small><strong>{activeOrder.status}{activeOrder.paid?" · Cobrado":""}</strong><p>{activeOrder.items.reduce((sum,item)=>sum+item.quantity,0)} productos · {activeOrder.locationName} · {money(activeOrder.total)}</p></div></div><div className="order-progress">{["Nuevo","Aceptado","En preparación","Entregado"].map((status,index)=><span className={["Nuevo","Aceptado","En preparación","Entregado"].indexOf(activeOrder.status)>=index?"done":""} key={status}><i>{index===0?"●":"✓"}</i><small>{status}</small></span>)}</div><div className="active-actions"><button onClick={()=>setOrderDetailOpen(value=>!value)}>{orderDetailOpen?"Ocultar detalle":"Ver mi pedido"}</button><button onClick={()=>document.querySelector(".menu-area")?.scrollIntoView()}>＋ Agregar productos</button><button onClick={()=>setCheckout(true)}>✎ Cambiar ubicación</button></div></div>{orderDetailOpen&&<div className="customer-order-detail"><div className="customer-detail-head"><div><small>SU CUENTA</small><h3>Detalle del pedido</h3></div><span>{activeOrder.paid?"✓ Pagado":"Pago pendiente"}</span></div>{activeOrder.items.map((item,index)=><div className="customer-line" key={`${item.productId}-${index}`}><span><b>{item.quantity}×</b> {item.productName}<small>{money(item.unitPrice)} cada uno</small></span><strong>{money(item.quantity*item.unitPrice)}</strong></div>)}<div className="customer-total"><span>Total</span><strong>{money(activeOrder.total)}</strong></div>{activeOrder.status==="Entregado"&&activeOrder.paid?<button className="finish-order" onClick={finishOrder}>Confirmar recibido y finalizar</button>:<p className="finish-help">Puede seguir agregando productos al mismo pedido. Podrá finalizar cuando el local lo marque entregado y cobrado.</p>}</div>}</section>}
      <section className="menu-area">
        <div className="menu-tools"><div><h2>Nuestro menú</h2><p>Todo preparado al momento</p></div><label className="search">⌕<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en el menú" /></label></div>
        {loading && <div className="system-message">Cargando el menú…</div>}
        {error && <div className="system-message error-message">{error}</div>}
        {!loading && !error && <>
          <div className="chips">{categories.map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
          <div className="food-grid">{visible.map((product) => <article className="food-card" key={product.id}><div className={`food-art art-${product.id % 4}`}>{product.images?.[0]?<img src={product.images[0]} alt={product.name}/>:<span>{product.icon}</span>}{product.id===1&&<b>Favorito</b>}</div><div className="food-copy"><div><h3>{product.name}</h3><p>{product.description}</p></div><footer><strong>{money(product.price)}</strong><button onClick={() => add(product)} aria-label={`Agregar ${product.name}`}>＋</button></footer></div></article>)}</div>
        </>}
      </section>
      <footer className="business-footer"><div className="brand">{settings.logo?<img src={settings.logo} alt={settings.name}/>:<span>{settings.name.slice(0,2).toUpperCase()}</span>}<div>{settings.name}<small>{settings.tagline}</small></div></div><div className="footer-hours"><b>Horario de hoy</b><span>{todaySchedule?.enabled?`${todaySchedule.day}: ${todaySchedule.openTime} – ${todaySchedule.closeTime}`:`${todaySchedule?.day??"Hoy"}: Cerrado`}</span></div><div>{settings.address&&<span>⌖ {settings.address}</span>}{settings.phone&&<a href={`tel:${settings.phone.replace(/\s/g,"")}`}>☎ {settings.phone}</a>}{settings.whatsapp&&<a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}{settings.mapUrl&&<a href={settings.mapUrl} target="_blank" rel="noreferrer">Ver ubicación ↗</a>}</div></footer>
      {location&&!(location.type==="Otro"&&location.name.toLowerCase().includes("llevar"))&&<button className={`service-button ${count>0?"with-cart":""}`} onClick={()=>{setError("");setServiceOpen(true)}}><span>🔔</span><b>Solicitar atención</b></button>}
      {count > 0 && <button className="floating-cart" onClick={() => setCartOpen(true)}><span><b>{count}</b> Ver pedido</span><strong>{money(total)}</strong></button>}
      {cartOpen && <div className="drawer-back" onClick={() => setCartOpen(false)}><aside className="cart" onClick={(e) => e.stopPropagation()}><button className="close" onClick={() => setCartOpen(false)}>×</button><span className="eyebrow">SU PEDIDO</span><h2>Todo listo para ordenar</h2><p className="table-tag">📍 {location?.name ?? "Sin ubicación"}</p>
        <div className="cart-items">{cart.map((item) => <div key={item.id}><span>{item.icon}</span><div><strong>{item.name}</strong><small>{money(item.price)}</small></div><div className="qty"><button onClick={() => changeQty(item.id, -1)}>−</button><b>{item.qty}</b><button onClick={() => changeQty(item.id, 1)}>＋</button></div></div>)}</div>
        <div className="total"><span>Total</span><strong>{money(total)}</strong></div><button className="checkout-btn" disabled={!cart.length || !settings.acceptingOrders} onClick={() => { setCartOpen(false); setCheckout(true); }}>{settings.acceptingOrders ? "Revisar y ordenar →" : "Pedidos pausados"}</button>
      </aside></div>}
      {checkout && <div className="modal-back"><div className="checkout-modal"><button className="close" onClick={() => setCheckout(false)}>×</button><span className="eyebrow">{activeOrder?"ACTUALIZAR PEDIDO":"ÚLTIMO PASO"}</span><h2>{activeOrder?"¿Qué desea agregar?":"¿A nombre de quién?"}</h2><p>{activeOrder?"Los productos nuevos o el cambio de ubicación se guardarán en el mismo pedido.":"Así podremos identificar su pedido y llevarlo al lugar correcto."}</p><label>Nombre<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Andrea" maxLength={80} /></label><label>Mesa o lugar de entrega<select value={locationId ?? ""} onChange={(e) => setLocationId(Number(e.target.value))}>{locations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Notas del pedido<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sin cebolla, salsa aparte..." maxLength={500} /></label>{error && <div className="form-error">{error}</div>}<div className="pay-note"><span>🔔</span><div><strong>{activeOrder?"Alerta de modificación":"Alerta al local"}</strong><small>{activeOrder?"El pedido original se actualizará sin crear una copia":"El pedido aparecerá inmediatamente en el panel"}</small></div></div><button className="checkout-btn" disabled={!name.trim() || sending || !locationId || (!activeOrder&&!cart.length)} onClick={submitOrder}>{sending ? "Enviando…" : `${activeOrder?"Actualizar":"Enviar"} pedido · ${money((activeOrder?.total??0)+total)}`}</button></div></div>}
      {serviceOpen&&<div className="modal-back"><div className="checkout-modal service-modal"><button className="close" onClick={()=>{setServiceOpen(false);setServiceType(null);setError("")}}>×</button><span className="eyebrow">ATENCIÓN EN SU MESA</span><h2>¿En qué podemos ayudarle?</h2><p>Enviaremos una alerta al personal para <b>{location?.name}</b>.</p><div className="service-options">{serviceOptions.map(option=><button className={serviceType===option.type?"selected":""} onClick={()=>setServiceType(option.type)} key={option.type}><span>{option.icon}</span><div><strong>{option.type}</strong><small>{option.help}</small></div><i>{serviceType===option.type?"✓":"›"}</i></button>)}</div>{serviceType&&<label>Detalle opcional<textarea value={serviceNote} onChange={event=>setServiceNote(event.target.value)} maxLength={300} placeholder={serviceType==="Otra solicitud"?"Cuéntenos qué necesita...":"Puede agregar una indicación..."}/></label>}{error&&<div className="form-error">{error}</div>}<button className="checkout-btn" disabled={!serviceType||sending} onClick={submitServiceRequest}>{sending?"Enviando…":"Enviar solicitud"}</button></div></div>}
      {success && <div className="modal-back"><div className="success"><span>✓</span><h2>{activeOrder?"¡Pedido actualizado!":"¡Pedido recibido!"}</h2><p>{activeOrder?"El local recibió los cambios en el mismo pedido.":"El pedido ya apareció en el panel del local."}</p><b>Pedido #{success.id} · {success.locationName}</b><button onClick={() => setSuccess(null)}>Volver al menú</button></div></div>}
      {serviceSent&&<div className="modal-back"><div className="success service-success"><span>🔔</span><h2>Solicitud enviada</h2><p>El personal recibió la alerta y se acercará tan pronto como sea posible.</p><b>{serviceSent}</b><button onClick={()=>setServiceSent("")}>Entendido</button></div></div>}
    </main>
  );
}
