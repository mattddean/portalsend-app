import { eq } from "drizzle-orm/expressions";
import { db } from "~/db/drizzle-db";
import * as Schema from "~/db/schema";
import { privateProcedure, router } from "../trpc";

export const authRouter = router({
  getSession: privateProcedure.query(async ({ ctx }) => {
    const authenticatedEmail = ctx.user.email;
    if (!authenticatedEmail) {
      throw new Error("User does not have an email address set");
    }

    const [user] = await db
      .select({
        encrypted_private_key: Schema.users.encrypted_private_key,
        encrypted_private_key_iv: Schema.users.encrypted_private_key_iv,
        encrypted_private_key_salt: Schema.users.encrypted_private_key_salt,
        public_key: Schema.users.public_key,
      })
      .from(Schema.users)
      .where(eq(Schema.users.email, authenticatedEmail))
      .limit(1);

    // TODO: Consider creating a new table called user_keys where all of these can be required, then link that to a user when
    // they set up their keys. That would avoid this issue where we can't represent that if public_key exists, all keys must exist.
    const keys =
      user?.public_key && user.encrypted_private_key_salt && user.encrypted_private_key_iv && user.encrypted_private_key
        ? {
            encrypted_private_key: user.encrypted_private_key,
            encrypted_private_key_iv: user.encrypted_private_key_iv,
            encrypted_private_key_salt: user.encrypted_private_key_salt,
            public_key: user.public_key,
          }
        : undefined;

    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      keys,
    };
  }),
});
