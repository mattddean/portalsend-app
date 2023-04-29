/**
 * This file contains the root router of your tRPC-backend
 */
import { router } from "../trpc";
import { exampleRouter } from "./example";
import { healthRouter } from "./health";

export const appRouter = router({
  example: exampleRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
