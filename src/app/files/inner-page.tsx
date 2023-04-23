"use client";

import { useState, type FC } from "react";
import { FilesTable } from "~/app/files/files-table";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { decryptRsaPrivateKey, stringToUint8Array } from "~/lib/key-utils";
import { api } from "~/trpc/client/trpc-client";

export const runtime = "edge";

export interface Props {
  pageSizes: number[];
  initialPageSize: number;
  onlySentReceived: "sent" | "received";
}

export const InnerPage: FC<Props> = ({ pageSizes, initialPageSize, onlySentReceived }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [formError, setFormError] = useState<string>();
  const [rsaPrivateKey, setRsaPrivateKey] = useState<CryptoKey>();

  // We only want to fetch this when we know the data from it will be used, so we disable it at first.
  // TODO: fetch when the master password dialog is opened.
  const getMyKeysQuery = api.example.getMyKeys.useQuery(undefined, { enabled: false });
  console.debug("getMyKeysQuery.data", getMyKeysQuery.data);

  const onSubmitMasterPassword = async (pwrd: string) => {
    // Decrypt RSA private key using the user's master password.
    const getMyKeysRefetched = await getMyKeysQuery.refetch();
    if (!getMyKeysRefetched.data) throw new Error("Could not retrieve your keys");

    try {
      const decryptedPrivateKey = await decryptRsaPrivateKey(
        atob(getMyKeysRefetched.data.encrypted_private_key),
        pwrd,
        stringToUint8Array(atob(getMyKeysRefetched.data.encrypted_private_key_salt)),
        atob(getMyKeysRefetched.data.encrypted_private_key_iv),
      );
      setRsaPrivateKey(decryptedPrivateKey);
      setDialogOpen(false);
    } catch (error) {
      setFormError("Incorrect password");
      return;
    }
  };

  return (
    <>
      <FilesTable
        onlySentReceived={onlySentReceived}
        rsaPrivateKey={rsaPrivateKey}
        onClickDecryptFilenames={() => setDialogOpen(true)}
        pageSizes={pageSizes}
        initialPageSize={initialPageSize}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialogOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Decrypt file names</DialogTitle>
            <DialogDescription>
              <HoverCard>
                <HoverCardTrigger className="underline-offset-3 cursor-default underline decoration-slate-500 decoration-dashed hover:decoration-slate-400">
                  Learn more.
                </HoverCardTrigger>
                <HoverCardContent>
                  <p className="text-sm">
                    Your file names are encrypted and we can&rsquo;t read them, but they can be decrypted with your
                    password.
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
                  Decrypt
                </Button>
              </div>
              <p className="text-sm text-red-400">{formError}</p>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
