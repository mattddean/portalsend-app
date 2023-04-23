import type { NextPage } from "next";
import { rsc } from "../shared/server-rsc/trpc";
import Home from "./home";

export const runtime = "edge";

/* @ts-expect-error Async Server Component */
const Page: NextPage = async () => {
  const session = await rsc.example.getSession.fetch();

  return <Home session={session} />;
};

export default Page;
