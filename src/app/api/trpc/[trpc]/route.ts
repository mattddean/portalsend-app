import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";
import { createContext } from "~/server/context";
import { appRouter } from "~/server/routers/_app";
import { createGetUser } from "~/shared/server-rsc/get-user";

export const runtime = "edge";

const handler = (request: NextRequest) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext(opts) {
      return createContext({
        type: "api",
        getUser: createGetUser(),
        ...opts,
      });
    },
    onError({ error }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error("Caught TRPC error:", error);
      }
    },
  });
};

export { handler as GET, handler as POST };
