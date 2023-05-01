"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { inferRouterOutputs } from "@trpc/server";
import { FC, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertTriangleIcon } from "~/components/icons";
import { SignInButtons } from "~/components/sign-in-options";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { env } from "~/env.mjs";
import { arrayBufferToString, encryptAesKey, encryptFile, encryptFilename } from "~/lib/key-utils";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/client/trpc-client";
import { PageTagline } from "../components/page-tagline";
import { AppRouter } from "../server/routers/_app";
import { FinishSignUpDialog } from "./finish-sign-up-dialog";
import { UploadDialog } from "./upload-dialog";

type PublicKey = {
  email: string;
  data: { public_key: string | null } | undefined;
};

const Dropzone: FC<{ onDropFiles: (files: File[]) => unknown; files: File[] }> = ({ onDropFiles, files }) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onDropFiles(acceptedFiles);
    },
    [onDropFiles],
  );
  const { getRootProps, getInputProps } = useDropzone({ onDrop, multiple: false });

  // We only accept one file, so we only care about the first file in the array.
  const file = files[0];

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <div>
        {/* (fake) animated border https://play.tailwindcss.com/YooA6NXDHi?layout=preview */}
        <div
          className={cn(
            "inline-block h-full w-72 animate-border cursor-pointer rounded-xl from-teal-500 via-purple-500 to-pink-500 bg-[length:400%_400%] p-0.5 shadow-lg transition focus:outline-none focus:ring",
            !file ? "h-36 bg-gradient-to-r" : "h-24 bg-white",
          )}
        >
          <div
            className={cn(
              "flex h-full w-full items-center justify-center rounded-[11px] bg-muted px-10 text-lg text-white",
              !!file && "text-sm",
            )}
          >
            {!file ? "Drop a file" : `${file.name}`}
          </div>
        </div>
      </div>
    </div>
  );
};

const encryptKey = async (email: string | null | undefined, publicKey: string | null | undefined, sharedKey: CryptoKey) => {
  await new Promise<void>((resolve) => {
    resolve();
  });
  if (!email || !publicKey) throw new Error("User does not exist or does not have public key");
  const encryptedAesKey = await encryptAesKey(sharedKey, atob(publicKey));
  return { email, encrypted_shared_key: btoa(encryptedAesKey) };
};

export interface Props {
  session: inferRouterOutputs<AppRouter>["example"]["getSession"];
}

const Home: FC<Props> = ({ session }) => {
  const [linkToFile, setLinkToFile] = useState<string>();
  const [files, setFiles] = useState<File[]>([]);
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const numRecipientEmailInputs = (recipientEmails?.length ?? 0) + 1;
  // TODO: store emails rather than indicies
  const [usersNotSetUpIndicies, setUsersNotSetUpIndicies] = useState<number[]>([]);

  const [progressTasks, setProgressTasks] = useState<{ text: string; hoverText: string }[]>([]);
  const [isSendingFile, setIsSendingFile] = useState(false);

  const userIsSignedInButHasNotGeneratedKeyPair = !!session && !session?.keys;
  const [masterPasswordDialogOpen, setMasterPasswordDialogOpen] = useState(userIsSignedInButHasNotGeneratedKeyPair);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const [recipientListAnimateRef] = useAutoAnimate();

  const getPublicKeysForUsersMutation = api.example.getPublicKeysForUsers.useMutation();
  const createSignedUploadUrlMutation = api.example.createSignedUploadUrl.useMutation();

  const onDialogOpenClick = async () => {
    if (!session?.email) throw new Error("Failed to get user email");

    const publicKeys = await getPublicKeysForUsersMutation.mutateAsync({ user_emails: recipientEmails });
    const usersNotSetUp = [];
    for (let i = 0; i < publicKeys.length; i++) {
      const key = publicKeys[i];
      if (!key?.email || !key?.data?.public_key) {
        usersNotSetUp.push(i);
        continue;
      }
    }

    // Give the UI information about which users are not set up and refuse to open the dialog
    // until it's fixed.
    setUsersNotSetUpIndicies(usersNotSetUp);
    if (usersNotSetUp.length > 0) return;

    setPasswordDialogOpen(true);
    await handleEncryptClick(publicKeys);
  };

  let fileError: string | undefined;
  const file = files[0];
  if (file) {
    const fileSizeBytes = file.size;
    const maxFileSizeBytes = Number(env.NEXT_PUBLIC_MAX_FILE_SIZE_BYTES);
    if (fileSizeBytes > maxFileSizeBytes) {
      fileError = `File exceeds ${maxFileSizeBytes / 1e6} MB limit.`;
    }
  }

  const handleEncryptClick = async (recipientPublicKeys: PublicKey[]) => {
    setIsSendingFile(true);

    if (!file) {
      // The UI should have prevented us from getting here.
      throw new Error("File is missing.");
    }
    if (!recipientEmails || recipientEmails.length < 1) {
      // The UI should have prevented us from getting here.
      throw new Error("Recipient emails are missing.");
    }
    const myEmail = session?.email;
    if (!myEmail) {
      // The UI should have prevented us from getting here.
      throw new Error("Own email is missing");
    }
    const myPublicKey = session.keys?.public_key;
    console.debug("mypublickey", myPublicKey);
    console.debug("recipientPublicKeys", recipientPublicKeys);
    if (!myPublicKey || recipientPublicKeys.length < 1) {
      // The UI should have prevented us from getting here.
      throw new Error("Public key(s) are missing");
    }

    // Generate a new shared shared key with which we will encrypt the file.
    setProgressTasks((tasks) => [
      ...tasks,
      {
        text: "Generating a new shared encryption key",
        hoverText: "We generate a unique AES key for this file which will be shared between you and your recipients.",
      },
    ]);
    const newAesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

    // Encrypt the shared key for each user, including self.
    setProgressTasks((tasks) => [
      ...tasks,
      {
        text: "Encrypting shared key for each recipient",
        hoverText:
          "As part of our zero-knowledge architecture, we encrypt the shared key on your device using each recipient's public RSA key. No one but you and your recipients can decrypt it, not even us.",
      },
    ]);
    const encryptedAesKeyPromises = [];
    const usersNotSetUp = [];
    for (let i = 0; i < recipientPublicKeys.length; i++) {
      const key = recipientPublicKeys[i];
      if (!key?.email || !key?.data?.public_key) {
        usersNotSetUp.push(i);
        continue;
      }
      encryptedAesKeyPromises.push(encryptKey(key.email, key.data.public_key, newAesKey));
    }
    const ownEncryptedSharedKey = await encryptKey(session.email, myPublicKey, newAesKey);
    setUsersNotSetUpIndicies(usersNotSetUp);

    // TODO: use Promise.allSettled and catch the error and report to the user which users don't have accounts set up.
    // Maybe let the user easily send an email to have the other users sign up.
    // Probably also send the file to the users already specified, telling the user that they'll be able to add
    // the additional users once they sign up.
    const recipientEncryptedSharedKeys = await Promise.all(encryptedAesKeyPromises);

    // Encrypt the file using the new shared key.
    setProgressTasks((tasks) => [
      ...tasks,
      { text: "Encrypting file", hoverText: "We encrypt your file using the shared key we just generated." },
    ]);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encryptedFileUint8Promise = encryptFile(file, newAesKey, iv);
    const encryptedFilenameUint8Promise = encryptFilename(file.name, newAesKey, iv);

    // Get signed file upload URL for S3.
    setProgressTasks((tasks) => [
      ...tasks,
      {
        text: "Uploading file",
        hoverText: "We upload the encrypted file, along with each recipient's encrypted version of the shared key.",
      },
    ]);
    // TODO: need MIME type?
    const encryptedFileUint8 = await encryptedFileUint8Promise;
    const encryptedFilenameUint8 = await encryptedFilenameUint8Promise;
    const encryptedFile = new Blob([encryptedFileUint8]);
    const signedUrlResult = await createSignedUploadUrlMutation.mutateAsync({
      encrypted_key_for_self: ownEncryptedSharedKey.encrypted_shared_key,
      encrypted_keys_for_recipients: recipientEncryptedSharedKeys,
      encrypted_filename: btoa(arrayBufferToString(encryptedFilenameUint8)),
      file_iv: btoa(arrayBufferToString(iv)),
    });

    // Upload file to S3.
    // https://advancedweb.hu/how-to-use-s3-post-signed-urls/
    const formData = new FormData();
    formData.append("Content-Type", encryptedFile.type);
    Object.entries(signedUrlResult.form_data_fields).forEach(([k, v]) => {
      formData.append(k, v);
    });
    formData.append("file", encryptedFile); // must be the last one

    const result = await fetch(signedUrlResult.signed_url, { method: "POST", body: formData });
    if (result.ok) {
      setLinkToFile(`${window.location.origin}/file/${signedUrlResult.file_slug}`);
    } else {
      throw new Error("Failed to upload file");
    }

    setIsSendingFile(false);
  };

  const removeRecipient = (email: string) => {
    setRecipientEmails((emails) => emails.filter((eml) => eml !== email));
    setUsersNotSetUpIndicies([]);
  };

  const removeAndInviteRecipient = (email: string) => {
    removeRecipient(email);

    // TODO: send an invite email
  };

  return (
    <>
      <div className="h-4" />

      <div className="flex w-full flex-col items-center gap-8">
        <PageTagline text="Dead simple end-to-end encrypted file sharing for everyone." />

        <div className="flex flex-col items-center justify-center gap-4">
          {/* Sign in buttons */}
          {!session && <SignInButtons />}

          {/* File upload box */}
          {!!session && (
            <div className="flex justify-center">
              <Dropzone onDropFiles={setFiles} files={files} />
            </div>
          )}

          {!!fileError && <div>{fileError}</div>}

          {userIsSignedInButHasNotGeneratedKeyPair && (
            <FinishSignUpDialog dialogOpen={masterPasswordDialogOpen} close={() => setMasterPasswordDialogOpen(false)} />
          )}

          <div className="flex w-full flex-col gap-4">
            {/* Recipient email inputs */}
            {!!(files.length > 0 && session && !fileError) && (
              <div className="flex flex-col justify-start gap-4">
                <div className="flex flex-col gap-2" ref={recipientListAnimateRef}>
                  {Array.from(Array(numRecipientEmailInputs)).map((_unused, index) => {
                    const id = `recipientEmail${index}`;
                    return (
                      <div key={index} className="flex gap-2">
                        <Input
                          id={id}
                          value={recipientEmails[index] ?? ""}
                          onChange={(e) =>
                            setRecipientEmails((emails) => {
                              const copy = [...emails];
                              const newValue = e.target.value;
                              if (newValue === "" && numRecipientEmailInputs > 1) {
                                // Remove this input box when the user has zeroed it out, as long as this will leave
                                // the user with at least one box left
                                copy.splice(index, 1);
                              } else {
                                copy[index] = e.target.value;
                              }
                              return copy;
                            })
                          }
                          placeholder={index === 0 ? "Recipient email" : "Add another recipient"}
                          className="col-span-3"
                        />
                        {usersNotSetUpIndicies.includes(index) && (
                          <div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="default" className="w-10 rounded-full p-0">
                                  <AlertTriangleIcon className="h-4 w-4" />
                                  <span className="sr-only">Open popover</span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                  <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Recipient not found</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                      This recipient doesn&rsquo;t have an account or hasn&rsquo;t set up their public key. Because of
                                      Portalsend&rsquo;s{" "}
                                      {/* <a className="underline" href="#todo">
                                        zero-knowledge architecture
                                      </a> */}
                                      zero-knowledge architecture, it&rsquo;s impossible for us to share a file with this user until they
                                      have set up their account.
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                      Remove this recipient to continue. We can send them an email if you&rsquo;d like to invite them to use
                                      Portalsend.
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                      Once they join, you&rsquo;ll be able to easily update the recipients of your file, even if
                                      you&rsquo;ve already sent it.
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="destructive" onClick={() => removeRecipient(recipientEmails[index]!)}>
                                      Remove
                                    </Button>
                                    {/* <Button variant="outline" onClick={() => removeAndInviteRecipient(recipientEmails[index]!)}>
                                      Remove and Invite
                                    </Button> */}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Send button which spawns master password and upload dialog */}
            {!!file && (
              <div>
                <UploadDialog
                  submitEnabled={recipientEmails.length > 0}
                  progressTasks={progressTasks}
                  fileLink={linkToFile}
                  isSendingFile={isSendingFile}
                  onDialogOpenClick={onDialogOpenClick}
                  dialogOpen={passwordDialogOpen}
                  close={() => setPasswordDialogOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
