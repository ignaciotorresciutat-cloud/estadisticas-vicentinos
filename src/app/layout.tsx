import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NavigationTracker } from "@/components/navigation-tracker";

export const dynamic = "force-dynamic";

// las imágenes de Open Graph se declaran con rutas relativas (ej.
// "/escudo-vicentinos.jpg"); sin metadataBase, Next no puede convertirlas en
// URLs absolutas y WhatsApp/Facebook no logran resolver la imagen al armar
// la vista previa del link.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Estadísticas Club Vicentinos",
  description: "Estadísticas históricas del club (2014–2026)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <NavigationTracker />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
