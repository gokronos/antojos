import postgres from "postgres";

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

export type RestaurantSettings = {
  name: string;
  tagline: string;
  welcomeMessage: string;
  currency: string;
  acceptingOrders: boolean;
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

let client: ReturnType<typeof postgres> | null = null;
let initialized: Promise<void> | null = null;

function database() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta configurar DATABASE_URL.");
  client ??= postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
    ssl: "require",
  });
  return client;
}

export async function ensureDatabase() {
  if (!initialized) {
    initialized = (async () => {
      const sql = database();
      await sql`CREATE TABLE IF NOT EXISTS products (
        id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
        price INTEGER NOT NULL CHECK (price >= 0), category TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '🍽️', active BOOLEAN NOT NULL DEFAULT TRUE
      )`;
      await sql`CREATE TABLE IF NOT EXISTS locations (
        id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('Mesa','Barra','Otro')),
        active BOOLEAN NOT NULL DEFAULT TRUE
      )`;
      await sql`CREATE TABLE IF NOT EXISTS orders (
        id BIGSERIAL PRIMARY KEY, location_id BIGINT REFERENCES locations(id),
        location_name TEXT NOT NULL, customer_name TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '', total INTEGER NOT NULL CHECK (total >= 0),
        status TEXT NOT NULL DEFAULT 'Nuevo',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS order_items (
        id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id BIGINT NOT NULL, product_name TEXT NOT NULL,
        unit_price INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK (quantity > 0)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS restaurant_settings (
        id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        name TEXT NOT NULL DEFAULT 'Mesa Lista',
        tagline TEXT NOT NULL DEFAULT 'Comida que provoca',
        welcome_message TEXT NOT NULL DEFAULT 'Prepare su pedido desde su lugar. Nosotros nos encargamos del resto.',
        currency TEXT NOT NULL DEFAULT 'COP',
        accepting_orders BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`INSERT INTO restaurant_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;
      await sql`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`;
      const [{ count: productCount }] = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM products`;
      if (productCount === 0) {
        for (const product of initialProducts) {
          await sql`INSERT INTO products (name, description, price, category, icon) VALUES (${product[0]}, ${product[1]}, ${product[2]}, ${product[3]}, ${product[4]})`;
        }
      }
      const [{ count: locationCount }] = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM locations`;
      if (locationCount === 0) {
        for (const location of initialLocations) {
          await sql`INSERT INTO locations (name, type) VALUES (${location[0]}, ${location[1]})`;
        }
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
  const sql = database();
  const [products, locations, [settings]] = await Promise.all([
    sql<ProductRecord[]>`SELECT id::int, name, description, price, category, icon, active FROM products WHERE active = TRUE ORDER BY category, id`,
    sql<LocationRecord[]>`SELECT id::int, name, type, active FROM locations WHERE active = TRUE ORDER BY id`,
    sql<RestaurantSettings[]>`SELECT name, tagline, welcome_message AS "welcomeMessage", currency, accepting_orders AS "acceptingOrders" FROM restaurant_settings WHERE id = 1`,
  ]);
  return { products, locations, settings };
}

export async function createOrder(input: {
  customerName: string;
  notes?: string;
  locationId: number;
  items: { productId: number; quantity: number }[];
}) {
  await ensureDatabase();
  const sql = database();
  const customerName = input.customerName.trim().slice(0, 80);
  const notes = (input.notes ?? "").trim().slice(0, 500);
  if (!customerName || !Number.isInteger(input.locationId) || !input.items.length) throw new Error("Pedido incompleto.");
  const [settings] = await sql<{ acceptingOrders: boolean }[]>`SELECT accepting_orders AS "acceptingOrders" FROM restaurant_settings WHERE id = 1`;
  if (settings && !settings.acceptingOrders) throw new Error("El local no está recibiendo pedidos en este momento.");
  const [location] = await sql<{ id: number; name: string }[]>`SELECT id::int, name FROM locations WHERE id = ${input.locationId} AND active = TRUE`;
  if (!location) throw new Error("La ubicación seleccionada no está disponible.");
  const quantities = new Map<number, number>();
  for (const item of input.items) {
    if (!Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 30) throw new Error("Cantidad inválida.");
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  const ids = [...quantities.keys()];
  const products = await sql<{ id: number; name: string; price: number }[]>`
    SELECT id::int, name, price FROM products WHERE active = TRUE AND id IN ${sql(ids)}
  `;
  if (products.length !== ids.length) throw new Error("Uno de los productos ya no está disponible.");
  const total = products.reduce((sum, product) => sum + product.price * (quantities.get(product.id) ?? 0), 0);
  return sql.begin(async (transaction) => {
    const [created] = await transaction<{ id: number }[]>`
      INSERT INTO orders (location_id, location_name, customer_name, notes, total)
      VALUES (${location.id}, ${location.name}, ${customerName}, ${notes}, ${total})
      RETURNING id::int
    `;
    for (const product of products) {
      await transaction`
        INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
        VALUES (${created.id}, ${product.id}, ${product.name}, ${product.price}, ${quantities.get(product.id) ?? 0})
      `;
    }
    return { id: created.id, total, locationName: location.name, status: "Nuevo" as const };
  });
}

export async function adminData() {
  await ensureDatabase();
  const sql = database();
  const [products, locations, orders, items, [stats], [settings]] = await Promise.all([
    sql<ProductRecord[]>`SELECT id::int, name, description, price, category, icon, active FROM products ORDER BY id`,
    sql<LocationRecord[]>`SELECT id::int, name, type, active FROM locations ORDER BY id`,
    sql<Record<string, unknown>[]>`SELECT id::int, location_id::int, location_name, customer_name, notes, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 100`,
    sql<Record<string, unknown>[]>`SELECT order_id::int, product_id::int, product_name, unit_price, quantity FROM order_items WHERE order_id IN (SELECT id FROM orders ORDER BY created_at DESC LIMIT 100) ORDER BY id`,
    sql<{ count: number; sales: number; average: number }[]>`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0)::int AS sales,
      COALESCE(AVG(total), 0)::int AS average FROM orders
      WHERE created_at >= CURRENT_DATE AND status != 'Cancelado'
    `,
    sql<RestaurantSettings[]>`SELECT name, tagline, welcome_message AS "welcomeMessage", currency, accepting_orders AS "acceptingOrders" FROM restaurant_settings WHERE id = 1`,
  ]);
  return {
    products,
    locations,
    orders: orders.map((order) => ({
      id: order.id, locationId: order.location_id, locationName: order.location_name,
      customerName: order.customer_name, notes: order.notes, total: order.total,
      status: order.status, createdAt: order.created_at,
      items: items.filter((item) => item.order_id === order.id).map((item) => ({
        productId: item.product_id, productName: item.product_name,
        unitPrice: item.unit_price, quantity: item.quantity,
      })),
    })),
    stats: { count: stats?.count ?? 0, sales: stats?.sales ?? 0, average: Math.round(stats?.average ?? 0) },
    settings,
  };
}

export async function saveProduct(input: Partial<ProductRecord> & { name: string; price: number; category: string }) {
  await ensureDatabase();
  const sql = database();
  const name = input.name.trim().slice(0, 100);
  const description = (input.description ?? "").trim().slice(0, 500);
  const category = input.category.trim().slice(0, 60);
  const icon = (input.icon ?? "🍽️").slice(0, 12);
  const price = Math.round(input.price);
  const active = input.active !== false;
  if (!name || !category || !Number.isFinite(price) || price < 0) throw new Error("Datos de producto inválidos.");
  if (input.id) {
    await sql`UPDATE products SET name=${name}, description=${description}, price=${price}, category=${category}, icon=${icon}, active=${active} WHERE id=${input.id}`;
    return { id: input.id };
  }
  const [row] = await sql<{ id: number }[]>`INSERT INTO products (name,description,price,category,icon,active) VALUES (${name},${description},${price},${category},${icon},${active}) RETURNING id::int`;
  return row;
}

export async function saveLocation(input: Partial<LocationRecord> & { name: string; type: LocationRecord["type"] }) {
  await ensureDatabase();
  const sql = database();
  const name = input.name.trim().slice(0, 80);
  const active = input.active !== false;
  if (!name || !["Mesa", "Barra", "Otro"].includes(input.type)) throw new Error("Datos de ubicación inválidos.");
  if (input.id) {
    await sql`UPDATE locations SET name=${name}, type=${input.type}, active=${active} WHERE id=${input.id}`;
    return { id: input.id };
  }
  const [row] = await sql<{ id: number }[]>`INSERT INTO locations (name,type,active) VALUES (${name},${input.type},${active}) RETURNING id::int`;
  return row;
}

export async function deleteLocation(id: number) {
  await ensureDatabase();
  const sql = database();
  if (!Number.isInteger(id)) throw new Error("Ubicación inválida.");
  const [{ count }] = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM orders WHERE location_id = ${id}`;
  if (count > 0) {
    await sql`UPDATE locations SET active = FALSE WHERE id = ${id}`;
    return { deleted: false, hidden: true };
  }
  await sql`DELETE FROM locations WHERE id = ${id}`;
  return { deleted: true, hidden: false };
}

export async function saveSettings(input: RestaurantSettings) {
  await ensureDatabase();
  const sql = database();
  const name = input.name.trim().slice(0, 100);
  const tagline = input.tagline.trim().slice(0, 140);
  const welcomeMessage = input.welcomeMessage.trim().slice(0, 300);
  if (!name || !tagline || !welcomeMessage) throw new Error("Complete los datos del restaurante.");
  await sql`UPDATE restaurant_settings SET
    name = ${name}, tagline = ${tagline}, welcome_message = ${welcomeMessage},
    currency = 'COP', accepting_orders = ${Boolean(input.acceptingOrders)}, updated_at = NOW()
    WHERE id = 1`;
}

export async function updateOrderStatus(id: number, status: OrderStatus) {
  await ensureDatabase();
  if (!["Nuevo", "Preparando", "Listo", "Entregado", "Cancelado"].includes(status)) throw new Error("Estado inválido.");
  await database()`UPDATE orders SET status=${status}, updated_at=NOW() WHERE id=${id}`;
}
