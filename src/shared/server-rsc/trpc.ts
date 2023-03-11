import superjson from "superjson";
import { createContext } from "~/server/context";
import { appRouter } from "~/server/routers/_app";
import { createTRPCNextLayout } from "~/trpc/@trpc/next-layout";
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
