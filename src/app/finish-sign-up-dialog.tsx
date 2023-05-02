import { FC, useState } from "react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { arrayBufferToString, encryptRsaPrivateKey, generateRsaKeyPair, serializeKey } from "~/lib/key-utils";
import { api } from "../trpc/client/trpc-client";

/**
 * Ask for the user's name and master password to finish setting up their account.
 * Non-dismissable. Annoying, but necessary until we come up with a better sign up flow.
 * @todo possible to do this as part of our next-auth sign up page?
 */
export const FinishSignUpDialog: FC<{
  close: () => unknown;
  dialogOpen: boolean;
}> = ({ close, dialogOpen }) => {
  const utils = api.useContext();
  const signUp = api.example.signUp.useMutation();
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmationPassword, setConfirmationPassword] = useState("");

  const passwordsMatch = password === confirmationPassword;
  const canSubmitChangePassword = !!firstName && !!lastName && !!password && passwordsMatch;

  const generateKeyPairAndSignUp = async (password: string) => {
    if (!canSubmitChangePassword) throw new Error("Invalid passwords input"); // the ui should have prevented this

    const keyPair = await generateRsaKeyPair();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encryptedPrivateKey = await encryptRsaPrivateKey(keyPair, password, salt);
    const saltString = arrayBufferToString(salt);
    await signUp.mutateAsync({
      encryptedPrivateKey: btoa(encryptedPrivateKey.ciphertextString),
      encryptedPrivateKeyIv: btoa(encryptedPrivateKey.ivString),
      publicKey: btoa(await serializeKey(keyPair.publicKey)),
      encryptedPrivateKeySalt: btoa(saltString),
      firstName,
      lastName,
    });

    await Promise.all([utils.example.getMyKeys.invalidate(), utils.example.getSession.invalidate()]);

    close();
  };

  return (
    // we don't handle onOpenChange so that the dialog can't close itself when the user clicks outside of it
    <Dialog open={dialogOpen} onOpenChange={() => undefined}>
      {/* Is the answer still loading? TODO: maybe skeleton, but we expect this query to always be loaded by the time this modal is opened. */}
      <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Ready to send your first file?</DialogTitle>
          <DialogDescription>
            <HoverCard>
              <HoverCardTrigger className="underline-offset-3 cursor-default underline decoration-slate-500 decoration-dashed hover:decoration-slate-400">
                Learn more.
              </HoverCardTrigger>
              <HoverCardContent>
                <p className="text-sm">
                  In order to securely send and receive files, we&rsquo;ll generate a key pair for you on your device. Our zero-knowledge
                  architecture requires that your private key be encrypted with a master password, which you must provide each time you need
                  to use your private key. This ensures that only you can access your private key, even though it&rsquo;s stored on our
                  servers.
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
            {/* TODO: tell the user that their name will appear in their recipients' emails (maybe even show picture of example email subject). */}
            <Label htmlFor="firstName">First Name</Label>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="col-span-3"
                autoComplete="given-name"
              />
            </div>

            <Label htmlFor="lastName">Last Name</Label>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="col-span-3"
                autoComplete="family-name"
              />
            </div>

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
            </div>

            <Label htmlFor="confirmationPassword">Confirm Password</Label>
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

            <Button type="submit" disabled={!canSubmitChangePassword}>
              Create Account
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
