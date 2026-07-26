import postgres from "postgres";

export type ProductRecord = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  icon: string;
  images: string[];
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
  logo: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  address: string;
  phone: string;
  whatsapp: string;
  mapUrl: string;
};

export type BannerRecord = { id?: number; eyebrow: string; title: string; text: string; image: string; active: boolean; position: number };
export type ScheduleRecord = { weekday: number; day: string; openTime: string; closeTime: string; enabled: boolean };

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
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb`;
      await sql`CREATE TABLE IF NOT EXISTS locations (
        id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('Mesa','Barra','Otro')),
        active BOOLEAN NOT NULL DEFAULT TRUE
      )`;
      await sql`CREATE TABLE IF NOT EXISTS categories (
        id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, position INTEGER NOT NULL DEFAULT 0
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
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS logo TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS primary_color TEXT NOT NULL DEFAULT '#173d2d'`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#c8ff45'`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT '#f6f1e7'`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT 'Calle 10 # 5-24, Cúcuta'`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '300 123 4567'`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT '573001234567'`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS map_url TEXT NOT NULL DEFAULT 'https://maps.google.com'`;
      await sql`CREATE TABLE IF NOT EXISTS banners (
        id BIGSERIAL PRIMARY KEY, eyebrow TEXT NOT NULL, title TEXT NOT NULL,
        text TEXT NOT NULL, image TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE,
        position INTEGER NOT NULL DEFAULT 0
      )`;
      await sql`CREATE TABLE IF NOT EXISTS schedule_days (
        weekday SMALLINT PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6), day TEXT NOT NULL,
        open_time TIME NOT NULL, close_time TIME NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE
      )`;
      await sql`INSERT INTO restaurant_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;
      const [{ count: bannerCount }] = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM banners`;
      if (bannerCount === 0) {
        await sql`INSERT INTO banners (eyebrow,title,text,position) VALUES
          ('BIENVENIDOS','¿Qué se le antoja comer hoy?','Prepare su pedido desde su lugar. Nosotros nos encargamos del resto.',0),
          ('RECOMENDADO DE LA CASA','Sabor que se disfruta sin afán','Conozca nuestros productos favoritos y pida directamente desde su mesa.',1)`;
      }
      const [{ count: scheduleCount }] = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM schedule_days`;
      if (scheduleCount === 0) {
        await sql`INSERT INTO schedule_days (weekday,day,open_time,close_time,enabled) VALUES
          (0,'Lunes','11:00','22:00',TRUE),(1,'Martes','11:00','22:00',TRUE),
          (2,'Miércoles','11:00','22:00',TRUE),(3,'Jueves','11:00','22:00',TRUE),
          (4,'Viernes','11:00','23:30',TRUE),(5,'Sábado','12:00','23:30',TRUE),
          (6,'Domingo','12:00','21:00',TRUE)`;
      }
      await sql`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`;
      const [{ count: productCount }] = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM products`;
      if (productCount === 0) {
        for (const product of initialProducts) {
          await sql`INSERT INTO products (name, description, price, category, icon) VALUES (${product[0]}, ${product[1]}, ${product[2]}, ${product[3]}, ${product[4]})`;
        }
      }
      await sql`INSERT INTO categories (name, position)
        SELECT category, ROW_NUMBER() OVER (ORDER BY MIN(id))::int - 1 FROM products
        WHERE category <> '' GROUP BY category ON CONFLICT (name) DO NOTHING`;
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
  const [products, locations, [settings], banners, schedule] = await Promise.all([
    sql<ProductRecord[]>`SELECT id::int, name, description, price, category, icon, images, active FROM products WHERE active = TRUE ORDER BY category, id`,
    sql<LocationRecord[]>`SELECT id::int, name, type, active FROM locations WHERE active = TRUE ORDER BY id`,
    sql<RestaurantSettings[]>`SELECT name, tagline, welcome_message AS "welcomeMessage", currency, accepting_orders AS "acceptingOrders",
      logo, primary_color AS "primaryColor", accent_color AS "accentColor", background_color AS "backgroundColor",
      address, phone, whatsapp, map_url AS "mapUrl" FROM restaurant_settings WHERE id = 1`,
    sql<BannerRecord[]>`SELECT id::int, eyebrow, title, text, image, active, position FROM banners WHERE active = TRUE ORDER BY position, id`,
    sql<ScheduleRecord[]>`SELECT weekday::int, day, to_char(open_time,'HH24:MI') AS "openTime", to_char(close_time,'HH24:MI') AS "closeTime", enabled FROM schedule_days ORDER BY weekday`,
  ]);
  return { products, locations, settings, banners, schedule };
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
  const [products, locations, orders, items, [stats], [settings], banners, schedule, categories] = await Promise.all([
    sql<ProductRecord[]>`SELECT id::int, name, description, price, category, icon, images, active FROM products ORDER BY id`,
    sql<LocationRecord[]>`SELECT id::int, name, type, active FROM locations ORDER BY id`,
    sql<Record<string, unknown>[]>`SELECT id::int, location_id::int, location_name, customer_name, notes, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 100`,
    sql<Record<string, unknown>[]>`SELECT order_id::int, product_id::int, product_name, unit_price, quantity FROM order_items WHERE order_id IN (SELECT id FROM orders ORDER BY created_at DESC LIMIT 100) ORDER BY id`,
    sql<{ count: number; sales: number; average: number }[]>`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0)::int AS sales,
      COALESCE(AVG(total), 0)::int AS average FROM orders
      WHERE created_at >= CURRENT_DATE AND status != 'Cancelado'
    `,
    sql<RestaurantSettings[]>`SELECT name, tagline, welcome_message AS "welcomeMessage", currency, accepting_orders AS "acceptingOrders",
      logo, primary_color AS "primaryColor", accent_color AS "accentColor", background_color AS "backgroundColor",
      address, phone, whatsapp, map_url AS "mapUrl" FROM restaurant_settings WHERE id = 1`,
    sql<BannerRecord[]>`SELECT id::int, eyebrow, title, text, image, active, position FROM banners ORDER BY position, id`,
    sql<ScheduleRecord[]>`SELECT weekday::int, day, to_char(open_time,'HH24:MI') AS "openTime", to_char(close_time,'HH24:MI') AS "closeTime", enabled FROM schedule_days ORDER BY weekday`,
    sql<{id:number;name:string;position:number}[]>`SELECT id::int, name, position FROM categories ORDER BY position, name`,
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
    banners,
    schedule,
    categories,
  };
}

export async function saveProduct(input: Partial<ProductRecord> & { name: string; price: number; category: string }) {
  await ensureDatabase();
  const sql = database();
  const name = input.name.trim().slice(0, 100);
  const description = (input.description ?? "").trim().slice(0, 500);
  const category = input.category.trim().slice(0, 60);
  const icon = (input.icon ?? "🍽️").slice(0, 12);
  const images = (input.images ?? []).filter((image) => typeof image === "string" && image.startsWith("data:image/")).slice(0, 5);
  const price = Math.round(input.price);
  const active = input.active !== false;
  if (!name || !category || !Number.isFinite(price) || price < 0) throw new Error("Datos de producto inválidos.");
  if (input.id) {
    await sql`UPDATE products SET name=${name}, description=${description}, price=${price}, category=${category}, icon=${icon}, images=${sql.json(images)}, active=${active} WHERE id=${input.id}`;
    return { id: input.id };
  }
  const [row] = await sql<{ id: number }[]>`INSERT INTO products (name,description,price,category,icon,images,active) VALUES (${name},${description},${price},${category},${icon},${sql.json(images)},${active}) RETURNING id::int`;
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

function safeColor(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export async function saveBranding(input: RestaurantSettings) {
  await ensureDatabase();
  const sql = database();
  const logo = input.logo?.startsWith("data:image/") ? input.logo : "";
  await sql`UPDATE restaurant_settings SET
    name=${input.name.trim().slice(0,100)}, tagline=${input.tagline.trim().slice(0,140)},
    logo=${logo}, primary_color=${safeColor(input.primaryColor,"#173d2d")},
    accent_color=${safeColor(input.accentColor,"#c8ff45")}, background_color=${safeColor(input.backgroundColor,"#f6f1e7")},
    address=${input.address.trim().slice(0,200)}, phone=${input.phone.trim().slice(0,40)},
    whatsapp=${input.whatsapp.replace(/\D/g,"").slice(0,20)}, map_url=${input.mapUrl.trim().slice(0,500)},
    updated_at=NOW() WHERE id=1`;
}

export async function saveBanner(input: BannerRecord) {
  await ensureDatabase();
  const sql = database();
  const image = input.image?.startsWith("data:image/") ? input.image : "";
  if (!input.title.trim()) throw new Error("El banner necesita un título.");
  if (input.id) {
    await sql`UPDATE banners SET eyebrow=${input.eyebrow.trim().slice(0,80)}, title=${input.title.trim().slice(0,180)},
      text=${input.text.trim().slice(0,400)}, image=${image}, active=${Boolean(input.active)}, position=${Math.max(0,input.position||0)} WHERE id=${input.id}`;
  } else {
    await sql`INSERT INTO banners (eyebrow,title,text,image,active,position) VALUES
      (${input.eyebrow.trim().slice(0,80)},${input.title.trim().slice(0,180)},${input.text.trim().slice(0,400)},${image},${Boolean(input.active)},${Math.max(0,input.position||0)})`;
  }
}

export async function deleteBanner(id: number) {
  await ensureDatabase();
  const sql = database();
  const [{ count }] = await sql<{ count:number }[]>`SELECT COUNT(*)::int AS count FROM banners`;
  if (count <= 1) throw new Error("Debe conservar al menos un banner.");
  await sql`DELETE FROM banners WHERE id=${id}`;
}

export async function saveSchedule(input: ScheduleRecord[]) {
  await ensureDatabase();
  if (!Array.isArray(input) || input.length !== 7) throw new Error("Horario incompleto.");
  const sql = database();
  await sql.begin(async (transaction) => {
    for (const item of input) {
      if (!Number.isInteger(item.weekday) || !/^\d{2}:\d{2}$/.test(item.openTime) || !/^\d{2}:\d{2}$/.test(item.closeTime)) throw new Error("Horario inválido.");
      await transaction`UPDATE schedule_days SET open_time=${item.openTime}, close_time=${item.closeTime}, enabled=${Boolean(item.enabled)} WHERE weekday=${item.weekday}`;
    }
  });
}

export async function saveCategory(nameInput: string) {
  await ensureDatabase();
  const name = nameInput.trim().slice(0,60);
  if (!name) throw new Error("Escriba el nombre de la categoría.");
  const sql = database();
  const [{ next }] = await sql<{next:number}[]>`SELECT COALESCE(MAX(position),-1)::int + 1 AS next FROM categories`;
  await sql`INSERT INTO categories (name,position) VALUES (${name},${next}) ON CONFLICT (name) DO NOTHING`;
}

export async function deleteCategory(id: number) {
  await ensureDatabase();
  const sql = database();
  const [category] = await sql<{name:string}[]>`SELECT name FROM categories WHERE id=${id}`;
  if (!category) return;
  const [{ count }] = await sql<{count:number}[]>`SELECT COUNT(*)::int AS count FROM products WHERE category=${category.name}`;
  if (count > 0) throw new Error(`No puede eliminar “${category.name}” porque tiene ${count} producto(s).`);
  await sql`DELETE FROM categories WHERE id=${id}`;
}

export async function updateOrderStatus(id: number, status: OrderStatus) {
  await ensureDatabase();
  if (!["Nuevo", "Preparando", "Listo", "Entregado", "Cancelado"].includes(status)) throw new Error("Estado inválido.");
  await database()`UPDATE orders SET status=${status}, updated_at=NOW() WHERE id=${id}`;
}
