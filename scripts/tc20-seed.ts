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

const RESTAURANT_ID = 1;
const COUNT = 200;

async function seed() {
  const client = await pool.connect();
  try {
    const values = Array.from({ length: COUNT }, (_, i) => i + 1)
      .map((n) => `('TC20_TEST_ITEM_${n}', '9.99', ${RESTAURANT_ID}, false)`)
      .join(",\n");

    const result = await client.query(`
      INSERT INTO menu_items (name, price, restaurant_id, is_sold_out)
      VALUES ${values}
      RETURNING id
    `);

    console.log(`✓ Inserted ${result.rowCount} test items into restaurantId=${RESTAURANT_ID}`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
