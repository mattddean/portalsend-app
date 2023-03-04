import type { Account, File, FileAccess, Session, SharedKey, SharedKeySet, User } from "@prisma/client/edge";
import { Kysely } from "kysely";
import { PlanetScaleDialect } from "kysely-planetscale";

interface Database {
  accounts: Account;
  files: File;
  file_accesses: FileAccess;
  sessions: Session;
  shared_keys: SharedKey;
  shared_key_sets: SharedKeySet;
  users: User;
}

export const db = new Kysely<Database>({
  dialect: new PlanetScaleDialect({
    url: process.env.DATABASE_URL,
  }),
});
