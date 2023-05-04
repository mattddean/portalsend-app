import "dotenv/config";
import type { Config } from "drizzle-kit";

const config: Config = {
  schema: "./src/db/schema.ts",
  connectionString: process.env.DB_URL, // TODO: figure out how to use this with ~/env.mjs
};

export default config;
