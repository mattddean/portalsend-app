import superjson from "superjson";
import { createTRPCNextLayout } from "~/@trpc/next-layout";
import { createContext } from "~/server/context";
import { appRouter } from "~/server/routers/_app";
import { getUser } from "./getUser";

export const rsc = createTRPCNextLayout({
  router: appRouter,
  transformer: superjson,
  createContext() {
    return createContext({
      type: "rsc",
      getUser,
    });
  },
});
