"use client";

import { useRouter } from "next/navigation";
import { FC, useState } from "react";
import { SpinnerIcon } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  arrayBufferToString,
  deriveKey,
  encryptRsaPrivateKey,
  encryptString,
  generateNewIvForAesGcm,
  generateRsaKeyPair,
  serializeKey,
} from "~/lib/key-utils";
import { api } from "~/trpc/client/trpc-client";

export interface Props {
  preFiledrop: {
    id: string;
    randomString: string;
  };
}

export const NewFiledropForm: FC<Props> = ({ preFiledrop }) => {
  // const utils = api.useContext();
  const createFiledrop = api.example.createFiledrop.useMutation();
  const [password, setPassword] = useState("");
  const [confirmationPassword, setConfirmationPassword] = useState("");
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const passwordsMatch = password === confirmationPassword;
  const canSubmitChangePassword = !!password && passwordsMatch;

  const generateKeyPairAndSignUp = async (password: string) => {
    if (!canSubmitChangePassword) throw new Error("Invalid passwords input"); // the ui should have prevented this
    setIsCreating(true);

    try {
      const keyPair = await generateRsaKeyPair();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const encryptedPrivateKey = await encryptRsaPrivateKey(keyPair, password, salt);
      const saltString = arrayBufferToString(salt);

      console.debug({ encryptedPrivateKey });

      const encryptedPrivKeyB64 = btoa(encryptedPrivateKey.ciphertextString);
      const ivB64 = btoa(encryptedPrivateKey.ivString);
      const saltB64 = btoa(saltString);

      // TODO: only derive key once and both pass it to encryptRsaPrivateKey and use it here
      const aesKey = await deriveKey(password, salt);
      const encryptedRandomStringIv = generateNewIvForAesGcm();
      const encryptedRandomString = await encryptString(preFiledrop.randomString, aesKey, encryptedRandomStringIv);

      const filedrop = await createFiledrop.mutateAsync({
        encryptedPrivateKey: encryptedPrivKeyB64,
        encryptedPrivateKeyIv: ivB64,
        publicKey: btoa(await serializeKey(keyPair.publicKey)),
        encryptedPrivateKeySalt: saltB64, // TODO: rename to derivedKeySalt
        encryptedRandomString: btoa(encryptedRandomString),
        encryptedRandomStringIv: btoa(arrayBufferToString(encryptedRandomStringIv)),
        preFiledropId: preFiledrop.id,
      });

      // localStorage.setItem(`filedrop_access-${filedrop.slug}`, `${encryptedPrivKeyB64}|${ivB64}|${saltB64}`);

      // const result = JsCookie.set(`filedrop_access-${filedrop.slug}`, `${encryptedPrivKeyB64}|${ivB64}|${saltB64}`, {
      //   sameSite: "strict",
      //   secure: true,
      // });
      // console.debug("set cookie", result);

      // await Promise.all([utils.example.getMyKeys.invalidate(), utils.example.getSession.invalidate()]);
      router.push(`/d/${filedrop.slug}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="grid gap-4 py-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void generateKeyPairAndSignUp(password);
        }}
      >
        <Label htmlFor="password">Master Password</Label>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="col-span-3"
            autoComplete="new-password"
          />
        </div>

        <Label htmlFor="confirmationPassword">Confirm Master Password</Label>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            id="confirmationPassword"
            type="password"
            value={confirmationPassword}
            onChange={(e) => setConfirmationPassword(e.target.value)}
            className="col-span-3"
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" disabled={!canSubmitChangePassword || isCreating}>
          {isCreating && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
          Create
        </Button>
      </form>
    </div>
  );
};
