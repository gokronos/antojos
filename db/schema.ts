import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull().default("🍽️"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  type: text("type", { enum: ["Mesa", "Barra", "Otro"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  locationId: integer("location_id").references(() => locations.id),
  locationName: text("location_name").notNull(),
  customerName: text("customer_name").notNull(),
  notes: text("notes").notNull().default(""),
  total: integer("total").notNull(),
  status: text("status", {
    enum: ["Nuevo", "Preparando", "Listo", "Entregado", "Cancelado"],
  }).notNull().default("Nuevo"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
});
