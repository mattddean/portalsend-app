import { createNextApiHandler } from "@trpc/server/adapters/next";
import { createContext } from "~/server/context";
import { appRouter } from "~/server/routers/_app";

export default createNextApiHandler({
  router: appRouter,
  /**
   * @link https://trpc.io/docs/error-handling
   */
  onError({ error }) {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      console.error("Caught TRPC error:", error);
    }
  },
  createContext(opts) {
    return createContext({
      type: "api",
      ...opts,
    });
  },
});
