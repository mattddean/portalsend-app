import type {
  Account,
  File,
  FileAccess,
  Session,
  SharedKey,
  SharedKeySet,
  User,
  VerificationToken,
} from "@prisma/client/edge";
import { PlanetScaleDialect } from "kysely-planetscale";
import { AuthedKysely, Codegen } from "../next-auth/adapters/kysely";

export interface Database {
  Account: Account;
  File: File;
  FileAccess: FileAccess;
  Session: Session;
  SharedKey: SharedKey;
  SharedKeySet: SharedKeySet;
  User: User;
  VerificationToken: VerificationToken;
}

export const db = new AuthedKysely<Database, Codegen>({
  dialect: new PlanetScaleDialect({
    url: process.env.DATABASE_URL,
  }),
});
