import { type AuthConfig } from "@auth/core";
import GithubProvider from "@auth/core/providers/github";
import GoogleProvider from "@auth/core/providers/google";
import { KyselyAdapter } from "~/next-auth/adapters/kysely";
import { db } from "~/prisma/kysely";

export const nextAuthOptions: AuthConfig = {
  adapter: KyselyAdapter(db),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
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
};
