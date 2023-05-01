import "dotenv/config";
import type { Config } from "drizzle-kit";
import { env } from "~/env.mjs";

const config: Config = {
  schema: "./src/db/schema.ts",
  connectionString: env.DB_URL,
};

export default config;
