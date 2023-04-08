import type { NextPage } from "next";
import { rsc } from "../shared/server-rsc/trpc";
import Home from "./home";

export const runtime = "edge";

/* @ts-expect-error Async Server Component */
const Page: NextPage = async () => {
  const user = await rsc.whoami.fetch();

  return <Home user={user} />;
};

export default Page;
