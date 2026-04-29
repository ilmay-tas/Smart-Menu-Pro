import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function cleanup() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      DELETE FROM menu_items
      WHERE name LIKE 'TC20_TEST_%'
      RETURNING id
    `);

    console.log(`✓ Deleted ${result.rowCount} TC20 test items`);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup().catch((err) => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
