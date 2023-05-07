export type { DefaultSession, Session } from "@auth/core/types";

/**
 * Module augmentation for `@auth/core/types` types
 * Allows us to add custom properties to the `session` object
 * and keep type safety
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */

declare module "@auth/core/types" {
  interface Session extends DefaultSession {
    // this is actually a filedrop, not a user
    user: {
      /** The Filedrop's internal id */
      id: string;
      /** The Filedrop's URL slug */
      slug: string;
    };
  }
}
