import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations precisam de conexão DIRETA (não-pooled): o pooler do Neon
    // (host com `-pooler`) roda em modo transaction e não suporta os advisory
    // locks que o `prisma migrate` usa — dá erro P1002 (timeout de lock).
    // O app em si continua usando a URL pooled (lib/prisma.ts lê DATABASE_URL),
    // que é o recomendado em serverless.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
