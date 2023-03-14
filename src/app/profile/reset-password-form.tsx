"use client";

import { FC, FormEventHandler, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { arrayBufferToString, encryptRsaPrivateKey, generateRsaKeyPair, serializeKey } from "~/lib/key-utils";
import { api } from "~/trpc/client/trpc-client";

export interface Props {
  email: string;
}

export const ResetPasswordForm: FC<Props> = ({ email }) => {
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
    <form className="flex flex-col gap-4" onSubmit={submitChangePassword}>
      {/* hidden username field to make chrome and password managers happy */}
      <input id="email" hidden type="text" value={email} autoComplete="email" />

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
  );
};
