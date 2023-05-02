import type { NextPage } from "next";
import { HydrateClient } from "~/trpc/client/hydrate-client";
import { rsc } from "../shared/server-rsc/trpc";
import Home from "./home";

export const runtime = "edge";

/* @ts-expect-error Async Server Component */
const Page: NextPage = async () => {
  // fetch session and dehydrate to client for immediate access in react-query
  await rsc.example.getSession.fetch();
  const dehydratedState = await rsc.dehydrate();

  // Provide dehydrated state to client components.
  return (
    <HydrateClient state={dehydratedState}>
      <Home />
    </HydrateClient>
  );
};

export default Page;
