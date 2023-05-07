import CredentialsProvider from "@auth/core/providers/credentials";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db/drizzle-db";
import * as Schema from "~/db/schema";
import { hashStringSha256 } from "~/lib/key-utils";
import { createDrizzleAdapter } from "./adapters/drizzle-orm";
import { type SolidAuthConfig } from "./server";

export const signInCustomProperties = z.object({
  slug: z.string(),
  decryptedRandomString: z.string(),
});

export type SignInCustomProperties = z.infer<typeof signInCustomProperties>;

export const authConfig: SolidAuthConfig = {
  // Configure one or more authentication providers
  adapter: createDrizzleAdapter(db),
  providers: [
    CredentialsProvider({
      // "Authenticate against your Filedrop"
      name: "against your Filedrop",
      credentials: {
        password: { label: "Master Password", type: "password", placeholder: "Master Password" },
      },
      async authorize(creds) {
        const parsedCreds = await signInCustomProperties.safeParseAsync(creds);
        if (!parsedCreds.success) throw new Error("Invalid input");
        const credentials = parsedCreds.data;

        const [filedrop] = await db
          .select()
          .from(Schema.filedrops)
          .where(and(eq(Schema.filedrops.slug, parsedCreds.data.slug)))
          .limit(1);
        if (!filedrop) throw new Error(`filedrop with slug ${credentials.slug} does not exist`); // weird error

        // TODO: use bcrypt or pbkdf2 instead
        const hashedRandomString = await hashStringSha256(atob(credentials.decryptedRandomString));
        if (filedrop.hashed_random_string !== hashedRandomString) return null; // unauthorized

        console.debug("authorized", { filedrop });

        return {
          id: filedrop.id,
          slug: filedrop.slug,
        };
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    signIn(params) {
      console.debug("is signing in");
      console.debug("params", params);
      return true;
    },
    async jwt(params) {
      console.debug("is creating jwt");
      console.debug("jwt params", params);
      if (params.user) {
        params.token.id = params.user.id;
        params.token.slug = params.user.slug;
      }
      // console.debug({account, profile, token})
      // // Persist the OAuth access_token and or the user id to the token right after signin
      // if (account) {
      //   token.accessToken = account.access_token
      //   token.id = account.
      // }
      // console.debug('updated token', token)
      console.debug("new token", params.token);
      return params.token;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 2, // 2 days in seconds
  },
};
