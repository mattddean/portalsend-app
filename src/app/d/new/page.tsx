import type { NextPage } from "next";
import { NewFiledropForm } from "~/app/d/new/create-filedrop-form";
import { rsc } from "~/shared/server-rsc/trpc";

export const runtime = "edge";

export const metadata = {
  title: "Create a Filedrop",
  description: "Create a new Filedrop.",
};

/* @ts-expect-error Async Server Component */
const NewFiledropPage: NextPage = async () => {
  const preFiledrop = await rsc.example.createPreFiledrop.fetch();

  return (
    <>
      <div className="h-4" />

      <NewFiledropForm preFiledrop={preFiledrop} />
    </>
  );
};

export default NewFiledropPage;
