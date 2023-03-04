"use client";

import type { NextPage } from "next";
import { FormEventHandler, useState } from "react";
import { api } from "~/client/trpcClient";
import { LockIcon } from "~/components/icons";
import SignInButtons from "~/components/sign-in-options";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { arrayBufferToString, encryptRsaPrivateKey, generateRsaKeyPair, serializeKey } from "~/lib/key-utils";

const Home: NextPage = () => {
  const { data: session } = api.auth.getSession.useQuery();

  const [newPassword, setNewPassword] = useState("");
  const [confirmationPassword, setConfirmationPassword] = useState("");

  const signUpMutation = api.example.signUp.useMutation();
  const generateKeyPairAndSignUp = async (password: string) => {
    const keyPair = await generateRsaKeyPair();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encryptedPrivateKey = await encryptRsaPrivateKey(keyPair, password, salt);

    const decodedSalt = arrayBufferToString(salt);

    await signUpMutation.mutateAsync({
      encryptedPrivateKey: btoa(encryptedPrivateKey.ciphertextString),
      encryptedPrivateKeyIv: btoa(encryptedPrivateKey.ivString),
      publicKey: btoa(await serializeKey(keyPair.publicKey)),
      encryptedPrivateKeySalt: btoa(decodedSalt),
    });
  };

  const passwordsMatch = newPassword === confirmationPassword;
  const canSubmitChangePassword = newPassword && passwordsMatch;
  const submitChangePassword: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!canSubmitChangePassword) throw new Error("Invalid passwords input"); // the ui should have prevented this
    void generateKeyPairAndSignUp(newPassword);
  };

  return (
    <>
      <div className="h-12" />

      {!session?.user && <SignInButtons />}

      {!!session?.user && (
        <div className="flex w-full max-w-[500px] flex-col gap-8">
          <div id="account-info">
            <h2 className="pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
              Account Information
            </h2>
            <div className="h-2"></div>
            <div className="flex flex-col rounded border border-slate-600 bg-slate-900">
              <div className="flex justify-between border-b-2 border-b-slate-800 p-4">
                <div>Username</div>
                <div>{session?.user.name}</div>
              </div>
              <div className="flex justify-between p-4">
                <div>Email</div>
                <div>{session?.user.email}</div>
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

            <form className="flex flex-col gap-4" onSubmit={submitChangePassword}>
              <div className="flex justify-between">
                <div className="flex w-full flex-col gap-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="flex w-full items-center space-x-2">
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <div className="flex w-full flex-col gap-2">
                  <Label htmlFor="password">Confirm Password</Label>
                  <div className="flex w-full items-center space-x-2">
                    <Input
                      id="confirmationPassword"
                      type="password"
                      value={confirmationPassword}
                      onChange={(e) => setConfirmationPassword(e.target.value)}
                      className="flex-1"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button disabled={!canSubmitChangePassword}>Reset</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
