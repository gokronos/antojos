import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mesa Lista Pedidos",
  description: "Menú digital y sistema de pedidos para el local.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
