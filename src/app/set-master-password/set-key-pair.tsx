"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useState, type FC } from "react";
import { Button } from "~/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { arrayBufferToString, encryptRsaPrivateKey, generateRsaKeyPair, serializeKey } from "../../lib/key-utils";
import type { AppRouter } from "../../server/routers/_app";
import { api } from "../../trpc/client/trpc-client";

export interface Props {
  userKeys: NonNullable<NonNullable<inferRouterOutputs<AppRouter>["example"]["getSession"]>["keys"]>;
}

export const SetKeyPair: FC<Props> = ({ userKeys }) => {
  const signUp = api.example.signUp.useMutation();

  const generateKeyPairAndSignUp = async (password: string) => {
    const keyPair = await generateRsaKeyPair();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encryptedPrivateKey = await encryptRsaPrivateKey(keyPair, password, salt);

    const decodedSalt = arrayBufferToString(salt);

    console.debug("signing up");
    signUp.mutate({
      encryptedPrivateKey: btoa(encryptedPrivateKey.ciphertextString),
      encryptedPrivateKeyIv: btoa(encryptedPrivateKey.ivString),
      publicKey: btoa(await serializeKey(keyPair.publicKey)),
      encryptedPrivateKeySalt: btoa(decodedSalt),
    });
    console.debug("signed up");
  };

  const onSubmitMasterPassword = async (password: string) => {
    const publicKey = userKeys.public_key;

    // Has the user not previously generated their key pair?
    if (!publicKey) {
      await generateKeyPairAndSignUp(password);
    }

    // await utils.example.getMyKeys.invalidate();
  };

  const [password, setPassword] = useState("");

  return (
    <div>
      <div>Choose master password</div>
      <HoverCard>
        <HoverCardTrigger className="underline-offset-3 cursor-default underline decoration-slate-500 decoration-dashed hover:decoration-slate-400">
          Learn more.
        </HoverCardTrigger>
        <HoverCardContent>
          <p className="text-sm">
            From your master password, a key is derived on your device and used to encrypt your RSA key pair. Whenever
            your key pair needs to be decrypted, you&rsquo;ll need to provide your master password again.
          </p>
        </HoverCardContent>
      </HoverCard>

      <div className="grid gap-4 py-4">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmitMasterPassword(password);
          }}
        >
          <Label htmlFor="password">Password</Label>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!password}
              className="col-span-3"
              autoComplete="new-password"
            />
            <Button type="submit" disabled={!password}>
              Set
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
