import { eq } from "drizzle-orm";
import { db } from "~/db/drizzle-db";
import { hashStringSha256 } from "~/lib/key-utils";
import * as Schema from "../../db/schema";

export interface Filedrop {
  id: string;
  slug: string;
}

export type GetUser = () => Promise<Filedrop | null>;

export function createGetFiledrop(headers: Headers) {
  return async () => {
    const authHeader = headers.get("authorization");
    const parts = authHeader?.split(":"); // TODO: can colon appear in random string
    if (!parts) return null;
    const [slug, randomString] = parts;
    if (!slug || !randomString) return null;

    const [filedrop] = await db
      .select({ id: Schema.filedrops.id, slug: Schema.filedrops.slug, hashed_random_string: Schema.filedrops.hashed_random_string })
      .from(Schema.filedrops)
      .where(eq(Schema.filedrops.slug, slug))
      .limit(1);
    if (!filedrop) return null;

    const hashedRandomString = await hashStringSha256(randomString);
    if (filedrop.hashed_random_string !== hashedRandomString) return null;

    const result: Filedrop = {
      id: filedrop.id,
      slug: filedrop.slug,
    };
    return result;
  };
}
