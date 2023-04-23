// import { redirect } from "next/navigation";
import { FC } from "react";
import { rsc } from "../../shared/server-rsc/trpc";
// import { SetKeyPair } from "./set-key-pair";

/* @ts-expect-error Async Server Component */
const Page: FC = async () => {
  console.debug("rendering set-master-password page");

  const session = await rsc.example.getSession.fetch();

  // Redirect to the homepage if the user has already set up their key pair.
  // This will happen whenever a user signs in and has already set up their key pair.
  if (!session?.keys) {
    // redirect("/");
  }
  return null;

  // return <SetKeyPair userKeys={session.keys} />;
};

export default Page;
