import { useAutoAnimate } from "@formkit/auto-animate/react";
import { FC, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { arrayBufferToString, encryptRsaPrivateKey, generateRsaKeyPair, serializeKey } from "~/lib/key-utils";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { Label } from "~/components/ui/label";
import { api } from "../trpc/client/trpc-client";

export const SetKeyPairDialog: FC<{
  progressTasks: { text: string; hoverText: string }[];
  close: () => unknown;
  dialogOpen: boolean;
}> = ({ progressTasks, close, dialogOpen }) => {
  const utils = api.useContext();
  const signUp = api.example.signUp.useMutation();
  const [animatedListParentRef] = useAutoAnimate();
  const [password, setPassword] = useState("");

  const generateKeyPairAndSignUp = async (password: string) => {
    const keyPair = await generateRsaKeyPair();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encryptedPrivateKey = await encryptRsaPrivateKey(keyPair, password, salt);

    const decodedSalt = arrayBufferToString(salt);

    console.debug("signing up");
    await signUp.mutateAsync({
      encryptedPrivateKey: btoa(encryptedPrivateKey.ciphertextString),
      encryptedPrivateKeyIv: btoa(encryptedPrivateKey.ivString),
      publicKey: btoa(await serializeKey(keyPair.publicKey)),
      encryptedPrivateKeySalt: btoa(decodedSalt),
    });
    console.debug("signed up");

    await utils.example.getMyKeys.invalidate();
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      {/* Is the answer still loading? TODO: maybe skeleton, but we expect this query to always be loaded by the time this modal is opened. */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose master password</DialogTitle>
          <DialogDescription>
            <HoverCard>
              <HoverCardTrigger className="underline-offset-3 cursor-default underline decoration-slate-500 decoration-dashed hover:decoration-slate-400">
                Learn more.
              </HoverCardTrigger>
              <HoverCardContent>
                <p className="text-sm">
                  In order to securely send and receive files, we&rsquo;ll generate a key pair for you on your device.
                  Our zero-knowledge architecture requires that your private key be encrypted with a master password,
                  which you must provide each time you need to use your private key. This ensures that only you can
                  access your private key, even though it&rsquo;s stored on our servers.
                </p>
              </HoverCardContent>
            </HoverCard>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void generateKeyPairAndSignUp(password);
            }}
          >
            <Label htmlFor="password">Password</Label>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                autoComplete="new-password"
              />
              <Button type="submit" disabled={!password}>
                Set
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
