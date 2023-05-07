"use client";

import { useState, type FC } from "react";
import { signIn } from "~/auth/client";
import type { SignInCustomProperties } from "~/auth/options";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { decryptString, deriveKey, stringToUint8Array } from "~/lib/key-utils";
import { Button } from "./ui/button";

/**
 * @todo Handle CSRF? It seems like the the signIn function from auth.js automatically passes a csrfToken property in the credentials.
 * Not sure whether or not we need to do something with that in the authorize function.
 */
export const SignInButton: FC<{
  filedrop: { slug: string; encryptedPrivateKeySalt: string; encryptedRandomString: string; encryptedRandomStringIv: string };
}> = ({ filedrop }) => {
  const [formError, setFormError] = useState<string>();
  const [masterPassword, setMasterPassword] = useState("");

  const onSubmitMasterPassword = async (masterPassword: string) => {
    try {
      const aesKey = await deriveKey(masterPassword, stringToUint8Array(atob(filedrop.encryptedPrivateKeySalt)));
      const encryptedRandomStringIv = stringToUint8Array(atob(filedrop.encryptedRandomStringIv));
      console.debug({ encryptedRandomStringIv: filedrop.encryptedRandomStringIv });
      const decryptedRandomString = await decryptString(atob(filedrop.encryptedRandomString), aesKey, encryptedRandomStringIv);
      console.debug("decrypted");
      const request: SignInCustomProperties = { slug: filedrop.slug, decryptedRandomString: btoa(decryptedRandomString) };
      console.debug("created request");
      await signIn("credentials", request);
    } catch (error) {
      // TODO: How do we report the raw error to ourselves? Axiom?
      console.error(error);
      setFormError("Something went wrong. Please try again later.");
    }
  };

  return (
    <div className="grid gap-4 py-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmitMasterPassword(masterPassword);
        }}
      >
        <Label htmlFor="password">Password</Label>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            id="password"
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            className="col-span-3"
            autoComplete="new-password"
          />
          <Button type="submit" disabled={!masterPassword}>
            Sign In
          </Button>
        </div>
        <p className="text-sm text-red-400">{formError}</p>
      </form>
    </div>
  );
};
