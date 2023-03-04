/**
 * This file contains the root router of your tRPC-backend
 */
import { privateProcedure, publicProcedure, router } from "../trpc";
import { authRouter } from "./auth";
import { exampleRouter } from "./example";
import { healthRouter } from "./health";

export const appRouter = router({
  example: exampleRouter,
  health: healthRouter,
  whoami: publicProcedure.query(({ ctx }) => {
    return ctx.user;
  }),
  secret: privateProcedure.query(() => "cow level"),
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
