import type { NextPage } from "next";
import { LockIcon } from "~/components/icons";
import SignInButtons from "~/components/sign-in-options";
import { rsc } from "../../shared/server-rsc/trpc";
import { ResetPasswordForm } from "./reset-password-form";

export const runtime = "edge";

export const metadata = {
  title: "Profile",
  description: "Your profile.",
};

/* @ts-expect-error Async Server Component */
const Home: NextPage = async () => {
  const user = await rsc.example.getSession.fetch();

  return (
    <>
      <div className="h-12" />

      {!user && <SignInButtons />}

      {!!user && (
        <div className="flex w-full max-w-[500px] flex-col gap-8">
          <div id="account-info">
            <h2 className="pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
              Account Information
            </h2>
            <div className="h-2"></div>
            <div className="flex flex-col rounded border border-slate-600 bg-slate-900">
              <div className="flex justify-between border-b-2 border-b-slate-800 p-4">
                <div>Username</div>
                <div>{user.name}</div>
              </div>
              <div className="flex justify-between p-4">
                <div>Email</div>
                <div>{user.email}</div>
              </div>
            </div>
          </div>

          <div id="password" className="flex flex-col gap-6 rounded-lg border border-slate-600 bg-slate-900 p-6">
            <div className="flex flex-col gap-0.5">
              <h3 className="flex scroll-m-20 items-center gap-2 text-2xl font-semibold tracking-tight">
                <LockIcon size={20} />
                Reset Password
              </h3>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                You will lose access to your previously sent and received files.
              </div>
            </div>

            <ResetPasswordForm email={user.email} />
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
