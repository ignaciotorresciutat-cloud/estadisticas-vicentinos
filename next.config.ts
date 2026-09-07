import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 es un módulo nativo: que no lo toque el bundler.
  serverExternalPackages: ["better-sqlite3"],
  // la base SQLite se abre con un path de string (no un import), así que el
  // tracing automático de Next no la detecta sola: hay que sumarla a mano
  // para que viaje empaquetada con las funciones serverless.
  outputFileTracingIncludes: {
    "/**": ["./prisma/dev.db"],
  },
};

export default nextConfig;
