/**
 *
 * This is an example router, you can delete this file and then update `../pages/api/trpc/[trpc].tsx`
 */
import { privateProcedure, router } from "../trpc";

export const authRouter = router({
  getSession: privateProcedure.query(({ ctx }) => {
    return { user: ctx.user };
  }),
});
