import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const sslRootCertPath = process.env.PGSSLROOTCERT;
const ssl =
  process.env.DB_SSL_INSECURE === "true"
    ? { rejectUnauthorized: false }
    : sslRootCertPath && fs.existsSync(sslRootCertPath)
      ? { ca: fs.readFileSync(sslRootCertPath).toString(), rejectUnauthorized: true }
      : undefined;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });
export const db = drizzle(pool, { schema });
