"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { NextPage } from "next";
import { FC, useReducer, useState } from "react";
import { Grid } from "react-loading-icons";
import SignInButtons from "~/components/sign-in-options";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { decryptFile, decryptRsaPrivateKey, stringToUint8Array } from "~/lib/key-utils";
import { api } from "~/trpc/client/trpc-client";

export const runtime = "edge";

interface Task {
  text: string;
  hoverText: string;
  isWorking: boolean;
}

const DownloadAndDecryptDialog: FC<{
  onDownloadFileClick: (pwrd: string) => Promise<void>;
  isOpen: boolean;
  close: () => unknown;
  fileSaveLink: string | undefined;
  progressTasks: Task[];
  filename: string | undefined;
  formError: string | undefined;
}> = ({ onDownloadFileClick, close, isOpen, fileSaveLink, progressTasks, filename, formError }) => {
  const [password, setPassword] = useState("");
  const [animatedListParentRef] = useAutoAnimate();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      {/* Is the answer still loading? TODO: maybe skeleton, but we expect this query to always be loaded by the time this modal is opened. */}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Download and Decrypt</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!password) return;
            void onDownloadFileClick(password);
          }}
        >
          <div className="flex w-full flex-col gap-1.5">
            <Label htmlFor="password">Master Password</Label>
            <div className="flex w-full flex-col gap-0.5">
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="col-span-3"
                  autoComplete="password"
                />
                <Button type="submit" disabled={!password || (progressTasks.length > 0 && !formError)}>
                  Download
                </Button>
              </div>
              <p className="text-sm text-red-400">{formError}</p>
            </div>
          </div>
        </form>

        <DialogFooter className="flex gap-4 sm:flex-col sm:space-x-0">
          {progressTasks.length > 0 && (
            <div className="flex flex-col gap-2" ref={animatedListParentRef}>
              {progressTasks.map((task) => (
                <div className="text-sm text-slate-500 dark:text-slate-400" key={task.text}>
                  <HoverCard>
                    <div className="flex cursor-default items-center justify-start gap-1">
                      <HoverCardTrigger>
                        <div className="underline-offset-3 underline decoration-slate-500 decoration-dashed hover:decoration-slate-400">
                          {task.text}
                        </div>
                      </HoverCardTrigger>
                      {task.isWorking && <Grid height={10} width={10} />}
                    </div>

                    <HoverCardContent>
                      <div>
                        <p className="text-sm">{task.hoverText}</p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              ))}
            </div>
          )}
          {fileSaveLink && (
            <a href={fileSaveLink} download={filename || "decrypted"}>
              <Button disabled={!password} className="h-full w-full">
                Save File
              </Button>
            </a>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function progressTasksReducer(
  state: Task[],
  action: { type: "append_new_working" | "all_done" | "clear"; task?: Omit<Task, "isWorking"> },
) {
  if (action.type === "append_new_working") {
    const stateClone: typeof state = state.map((task) => ({
      text: task.text,
      hoverText: task.hoverText,
      isWorking: false, // set all of the current tasks to not working
    }));
    if (!action.task) throw new Error("append_new_working action requires task");
    stateClone.push({
      ...action.task,
      isWorking: true,
    });
    return stateClone;
  }

  if (action.type === "all_done") {
    const stateClone: typeof state = state.map((task) => ({
      text: task.text,
      hoverText: task.hoverText,
      isWorking: false, // set all of the current tasks to not working
    }));
    return stateClone;
  }

  if (action.type === "clear") {
    return [];
  }

  throw new Error("Coding bug: did not handle action type");
}

export interface Props {
  params: { slug: string };
}

const FileSlug: NextPage<Props> = ({ params }) => {
  const user = api.auth.getSession.useQuery();

  // We wait until the user is logged in to fetch this query, because the user will not be allowed to fetch the file
  // unless they are logged in.
  const getFileQuery = api.example.getFile.useQuery(
    { slug: params.slug },
    {
      enabled: !!user.data?.user,
      retry: (_attempts, data) => data.data?.code !== "NOT_FOUND",
    },
  );

  // We will refetch this when ready, so we disable it at first.
  const getMyKeysQuery = api.example.getMyKeys.useQuery(undefined, { enabled: false });
  const createFileSignedUrlMutation = api.example.createFileSignedDownloadUrl.useMutation();

  const [fileSaveLink, setFileSaveLink] = useState<string>();
  const [filename, setFilename] = useState<string>();
  const [formError, setFormError] = useState<string>();

  const [progressTasks, dispatchProgressTasks] = useReducer(progressTasksReducer, []);

  const onDownloadFileClick = async (pwrd: string) => {
    if (!getFileQuery.data) throw new Error("File data is missing"); // the ui should have prevented this

    // Decrypt RSA private key using the user's master password.
    dispatchProgressTasks({
      type: "append_new_working",
      task: {
        text: "Fetching your encrypted private key",
        hoverText: "We only ever see or store the encrypted version of your private key.",
      },
    });
    const getMyKeysRefetched = await getMyKeysQuery.refetch();
    if (!getMyKeysRefetched.data) throw new Error("Could not retrieve your keys");

    dispatchProgressTasks({
      type: "append_new_working",
      task: {
        text: "Decrypting your private key",
        hoverText: "Your private key is decrypted on your device.",
      },
    });

    let decryptedPrivateKey: CryptoKey;
    try {
      decryptedPrivateKey = await decryptRsaPrivateKey(
        atob(getMyKeysRefetched.data?.encrypted_private_key),
        pwrd,
        stringToUint8Array(atob(getMyKeysRefetched.data.encrypted_private_key_salt)),
        atob(getMyKeysRefetched.data?.encrypted_private_key_iv),
      );
    } catch (error) {
      dispatchProgressTasks({ type: "clear" });
      setFormError("Incorrect password");
      return;
    }

    // Decrypt shared AES key using RSA private key.
    dispatchProgressTasks({
      type: "append_new_working",
      task: {
        text: "Decrypting your shared key",
        hoverText: "We only store each user's unique version of the file's shared decryption key.",
      },
    });
    const decryptedAesKey = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      decryptedPrivateKey,
      stringToUint8Array(atob(getFileQuery.data.shared_key_encrypted_for_me)),
    );

    // Import shared AES key.
    const decryptedAesKeyString = new TextDecoder().decode(new Uint8Array(decryptedAesKey));
    const importedAesKey = await crypto.subtle.importKey(
      "jwk",
      JSON.parse(decryptedAesKeyString) as JsonWebKey,
      { name: "AES-CBC" },
      true,
      ["decrypt"],
    );

    // Download encrypted file.
    dispatchProgressTasks({
      type: "append_new_working",
      task: {
        text: "Downloading encrypted file",
        hoverText: "The encrypted version of the file is downloaded to your device for decryption.",
      },
    });
    const signedUrlResult = await createFileSignedUrlMutation.mutateAsync({ slug: getFileQuery.data?.slug });
    const downloadFileResult = await fetch(signedUrlResult.signed_download_url);
    const fileBlob = await downloadFileResult.blob();
    const encryptedFile = new File([fileBlob], "decrypted.txt");

    // Decrypt file using decrypted shared aes key.

    dispatchProgressTasks({
      type: "append_new_working",
      task: {
        text: "Decrypting file",
        hoverText: "The file is decrypted on your device.",
      },
    });
    const iv = stringToUint8Array(atob(getFileQuery.data.iv));
    const decryptedBlob = await decryptFile(encryptedFile, importedAesKey, iv);
    const decryptedFile = new File([decryptedBlob], "decrypted.txt");

    // Give the user a link to copy the file to their filesystem.
    const decryptedFileUrl = window.URL.createObjectURL(decryptedFile);
    setFileSaveLink(decryptedFileUrl);
    setFilename(signedUrlResult.file_name as string);

    dispatchProgressTasks({ type: "all_done" });
  };

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="h-4" />

      {!user.data?.user && <SignInButtons />}

      {!!user.data?.user && (
        <div className="flex w-full flex-col items-center gap-8">
          <div className="text-center text-sm text-blue-100">Download and decrypt the file.</div>
          <div>
            {getFileQuery.data && (
              <div className="w-full max-w-[200px]">
                <div className="grid gap-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex w-full max-w-sm flex-col gap-4">
                      <Button type="submit" onClick={() => setDialogOpen(true)}>
                        Download and Decrypt
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {getFileQuery.error?.data?.code === "NOT_FOUND" && (
              <div className="w-full">
                <div className="grid gap-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex w-full max-w-sm flex-col gap-4">File not found or you lack access to it.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DownloadAndDecryptDialog
            close={() => setDialogOpen(false)}
            isOpen={dialogOpen}
            onDownloadFileClick={onDownloadFileClick}
            progressTasks={progressTasks}
            fileSaveLink={fileSaveLink}
            filename={filename}
            formError={formError}
          ></DownloadAndDecryptDialog>
        </div>
      )}
    </>
  );
};

export default FileSlug;
