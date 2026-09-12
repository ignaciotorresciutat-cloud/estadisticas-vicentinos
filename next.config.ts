import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 es un módulo nativo: que no lo toque el bundler.
  serverExternalPackages: ["better-sqlite3"],
  // la base SQLite se abre con un path de string (no un import), así que el
  // tracing automático de Next no la detecta sola: hay que sumarla a mano
  // para que viaje empaquetada con las funciones serverless. Mismo caso con
  // el escudo: las imágenes de Open Graph dinámicas (opengraph-image.tsx) lo
  // leen del disco con fs.readFile, no por import, así que tampoco lo traza solo.
  outputFileTracingIncludes: {
    "/**": ["./prisma/dev.db", "./public/escudo-vicentinos.jpg"],
  },
};

export default nextConfig;
