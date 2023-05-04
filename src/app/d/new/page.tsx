import type { NextPage } from "next";
import { NewFiledropForm } from "~/app/d/new/create-filedrop-form";

export const runtime = "edge";

export const metadata = {
  title: "Profile",
  description: "Your profile.",
};

/* @ts-expect-error Async Server Component */
const NewFiledropPage: NextPage = async () => {
  return (
    <>
      <div className="h-4" />

      <NewFiledropForm />
    </>
  );
};

export default NewFiledropPage;
