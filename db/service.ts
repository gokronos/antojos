import { env } from "cloudflare:workers";

export type ProductRecord = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  icon: string;
  active: boolean;
};

export type LocationRecord = {
  id: number;
  name: string;
  type: "Mesa" | "Barra" | "Otro";
  active: boolean;
};

export type OrderStatus = "Nuevo" | "Preparando" | "Listo" | "Entregado" | "Cancelado";

type D1Result<T = unknown> = { results?: T[]; success: boolean };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
};
type Database = {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<D1Result[]>;
  exec(query: string): Promise<unknown>;
};

const initialProducts = [
  ["Burger de la casa", "Carne artesanal, queso, tocineta y salsa de la casa", 24900, "Hamburguesas", "🍔"],
  ["Perro especial", "Salchicha premium, queso, papitas y tres salsas", 18900, "Perros", "🌭"],
  ["Papas explosivas", "Papas crocantes, carne, pollo, queso y maíz", 21900, "Para compartir", "🍟"],
  ["Cerveza fría", "Botella 330 ml", 7000, "Bebidas", "🍺"],
  ["Limonada de coco", "Cremosa, natural y muy fría", 9000, "Bebidas", "🥥"],
  ["Nachos de la casa", "Totopos, carne, queso, pico de gallo y guacamole", 22900, "Para compartir", "🌮"],
] as const;

const initialLocations = [
  ["Mesa 01", "Mesa"], ["Mesa 02", "Mesa"], ["Mesa 03", "Mesa"], ["Mesa 04", "Mesa"],
  ["Barra 01", "Barra"], ["Barra 02", "Barra"], ["Para llevar", "Otro"],
] as const;

let initialized: Promise<void> | null = null;

function database(): Database {
  const db = (env as unknown as { DB?: Database }).DB;
  if (!db) throw new Error("La base de datos no está configurada.");
  return db;
}

export async function ensureDatabase() {
  if (!initialized) {
    initialized = (async () => {
      const db = database();
      await db.exec(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL,
          category TEXT NOT NULL, icon TEXT NOT NULL DEFAULT '🍽️',
          active INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT, location_id INTEGER,
          location_name TEXT NOT NULL, customer_name TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '', total INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'Nuevo', created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL, product_name TEXT NOT NULL,
          unit_price INTEGER NOT NULL, quantity INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      `);
      const productCount = await db.prepare("SELECT COUNT(*) AS count FROM products").first<{ count: number }>();
      if (!productCount?.count) {
        await db.batch(initialProducts.map((p) =>
          db.prepare("INSERT INTO products (name, description, price, category, icon, active) VALUES (?, ?, ?, ?, ?, 1)").bind(...p)
        ));
      }
      const locationCount = await db.prepare("SELECT COUNT(*) AS count FROM locations").first<{ count: number }>();
      if (!locationCount?.count) {
        await db.batch(initialLocations.map((l) =>
          db.prepare("INSERT INTO locations (name, type, active) VALUES (?, ?, 1)").bind(...l)
        ));
      }
    })().catch((error) => {
      initialized = null;
      throw error;
    });
  }
  return initialized;
}

export async function publicData() {
  await ensureDatabase();
  const db = database();
  const [products, locations] = await Promise.all([
    db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY category, id").all<Omit<ProductRecord, "active"> & { active: number }>(),
    db.prepare("SELECT * FROM locations WHERE active = 1 ORDER BY id").all<Omit<LocationRecord, "active"> & { active: number }>(),
  ]);
  return {
    products: (products.results ?? []).map((p) => ({ ...p, active: Boolean(p.active) })),
    locations: (locations.results ?? []).map((l) => ({ ...l, active: Boolean(l.active) })),
  };
}

export async function createOrder(input: {
  customerName: string;
  notes?: string;
  locationId: number;
  items: { productId: number; quantity: number }[];
}) {
  await ensureDatabase();
  const db = database();
  const customerName = input.customerName.trim().slice(0, 80);
  const notes = (input.notes ?? "").trim().slice(0, 500);
  if (!customerName || !Number.isInteger(input.locationId) || !input.items.length) throw new Error("Pedido incompleto.");
  const location = await db.prepare("SELECT id, name FROM locations WHERE id = ? AND active = 1").bind(input.locationId).first<{ id: number; name: string }>();
  if (!location) throw new Error("La ubicación seleccionada no está disponible.");
  const quantities = new Map<number, number>();
  for (const item of input.items) {
    if (!Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 30) throw new Error("Cantidad inválida.");
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  const ids = [...quantities.keys()];
  const placeholders = ids.map(() => "?").join(",");
  const rows = await db.prepare(`SELECT id, name, price FROM products WHERE active = 1 AND id IN (${placeholders})`).bind(...ids).all<{ id: number; name: string; price: number }>();
  const products = rows.results ?? [];
  if (products.length !== ids.length) throw new Error("Uno de los productos ya no está disponible.");
  const total = products.reduce((sum, p) => sum + p.price * (quantities.get(p.id) ?? 0), 0);
  const now = new Date().toISOString();
  const created = await db.prepare(
    "INSERT INTO orders (location_id, location_name, customer_name, notes, total, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Nuevo', ?, ?) RETURNING id"
  ).bind(location.id, location.name, customerName, notes, total, now, now).first<{ id: number }>();
  if (!created) throw new Error("No fue posible crear el pedido.");
  await db.batch(products.map((p) => db.prepare(
    "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)"
  ).bind(created.id, p.id, p.name, p.price, quantities.get(p.id) ?? 0)));
  return { id: created.id, total, locationName: location.name, status: "Nuevo" as const };
}

export async function adminData() {
  await ensureDatabase();
  const db = database();
  const [products, locations, orders, items, stats] = await Promise.all([
    db.prepare("SELECT * FROM products ORDER BY id").all<Omit<ProductRecord, "active"> & { active: number }>(),
    db.prepare("SELECT * FROM locations ORDER BY id").all<Omit<LocationRecord, "active"> & { active: number }>(),
    db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM order_items WHERE order_id IN (SELECT id FROM orders ORDER BY created_at DESC LIMIT 100) ORDER BY id").all<Record<string, unknown>>(),
    db.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS sales, COALESCE(AVG(total), 0) AS average FROM orders WHERE date(created_at) = date('now') AND status != 'Cancelado'").first<{ count: number; sales: number; average: number }>(),
  ]);
  const orderItems = items.results ?? [];
  return {
    products: (products.results ?? []).map((p) => ({ ...p, active: Boolean(p.active) })),
    locations: (locations.results ?? []).map((l) => ({ ...l, active: Boolean(l.active) })),
    orders: (orders.results ?? []).map((o) => ({
      id: o.id, locationId: o.location_id, locationName: o.location_name,
      customerName: o.customer_name, notes: o.notes, total: o.total,
      status: o.status, createdAt: o.created_at,
      items: orderItems.filter((item) => item.order_id === o.id).map((item) => ({
        productId: item.product_id, productName: item.product_name,
        unitPrice: item.unit_price, quantity: item.quantity,
      })),
    })),
    stats: { count: stats?.count ?? 0, sales: stats?.sales ?? 0, average: Math.round(stats?.average ?? 0) },
  };
}

export async function saveProduct(input: Partial<ProductRecord> & { name: string; price: number; category: string }) {
  await ensureDatabase();
  const db = database();
  const values = [input.name.trim().slice(0, 100), (input.description ?? "").trim().slice(0, 500), Math.round(input.price), input.category.trim().slice(0, 60), (input.icon ?? "🍽️").slice(0, 12), input.active === false ? 0 : 1];
  if (!values[0] || !values[3] || !Number.isFinite(input.price) || input.price < 0) throw new Error("Datos de producto inválidos.");
  if (input.id) {
    await db.prepare("UPDATE products SET name=?, description=?, price=?, category=?, icon=?, active=? WHERE id=?").bind(...values, input.id).run();
    return { id: input.id };
  }
  const row = await db.prepare("INSERT INTO products (name,description,price,category,icon,active) VALUES (?,?,?,?,?,?) RETURNING id").bind(...values).first<{ id: number }>();
  return row;
}

export async function saveLocation(input: Partial<LocationRecord> & { name: string; type: LocationRecord["type"] }) {
  await ensureDatabase();
  const db = database();
  const name = input.name.trim().slice(0, 80);
  if (!name || !["Mesa", "Barra", "Otro"].includes(input.type)) throw new Error("Datos de ubicación inválidos.");
  if (input.id) {
    await db.prepare("UPDATE locations SET name=?, type=?, active=? WHERE id=?").bind(name, input.type, input.active === false ? 0 : 1, input.id).run();
    return { id: input.id };
  }
  const row = await db.prepare("INSERT INTO locations (name,type,active) VALUES (?,?,?) RETURNING id").bind(name, input.type, input.active === false ? 0 : 1).first<{ id: number }>();
  return row;
}

export async function updateOrderStatus(id: number, status: OrderStatus) {
  await ensureDatabase();
  if (!["Nuevo", "Preparando", "Listo", "Entregado", "Cancelado"].includes(status)) throw new Error("Estado inválido.");
  await database().prepare("UPDATE orders SET status=?, updated_at=? WHERE id=?").bind(status, new Date().toISOString(), id).run();
}
