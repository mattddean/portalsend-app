import GithubProvider from "@auth/core/providers/github";
import GoogleProvider from "@auth/core/providers/google";
import { db } from "~/db/drizzle-db";
import { env } from "~/env.mjs";
import { createDrizzleAdapter } from "./adapters/drizzle-orm";
import { type SolidAuthConfig } from "./server";

export const authConfig: SolidAuthConfig = {
  // Configure one or more authentication providers
  adapter: createDrizzleAdapter(db),
  providers: [
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore growing pains
    GithubProvider({
      clientId: env.GITHUB_ID as string,
      clientSecret: env.GITHUB_SECRET as string,
    }),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore growing pains
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID as string,
      clientSecret: env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  session: {
    strategy: "database",
  },
};
