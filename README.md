# Antojos

Sistema web de menú y pedidos para restaurantes. Los clientes abren el menú
desde un enlace, envían su pedido y el local lo administra en tiempo real desde
un panel instalable como PWA.

## Tecnología

- Next.js 16 y React 19
- PostgreSQL (Neon o Vercel Postgres)
- PWA instalable en Android
- Sesión administrativa firmada con cookie segura

## Desarrollo

Requiere Node.js 22 o superior.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abra `http://localhost:3000` para el menú y
`http://localhost:3000/admin` para el panel.

## Variables de entorno

- `DATABASE_URL`: conexión PostgreSQL con SSL.
- `ADMIN_PASSWORD`: clave que usará el dueño para entrar al panel.
- `ADMIN_SESSION_SECRET`: valor aleatorio de al menos 32 caracteres.

Las tablas y los datos iniciales se crean automáticamente la primera vez que se
consulta el menú.

## Publicar en Vercel

1. Importe el repositorio de GitHub en Vercel.
2. Cree o conecte una base PostgreSQL.
3. Configure las tres variables anteriores.
4. Despliegue el proyecto con la configuración predeterminada de Next.js.

Cada mesa puede usar un enlace como `https://dominio.com/?mesa=4`.
