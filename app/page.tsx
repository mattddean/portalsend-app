"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { NextPage } from "next";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "~/client/trpcClient";
import { AlertTriangleIcon, CheckIcon, CopyIcon, SpinnerIcon } from "~/components/icons";
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
import { cn } from "~/components/ui/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
  arrayBufferToString,
  encryptAesKey,
  encryptFile,
  encryptFilename,
  encryptRsaPrivateKey,
  generateRsaKeyPair,
  serializeKey,
} from "~/lib/key-utils";

export const runtime = "experimental-edge";

type PublicKey = {
  email: string;
  data: { public_key: string | null } | undefined;
};

const CopyFileLink: FC<{ fileLink: string }> = ({ fileLink }) => {
  const [copyIconVisible, setCopyIconVisible] = useState(true);
  const [checkIconVisible, setCheckIconVisible] = useState(false);

  const toggleIcons = () => {
    setCopyIconVisible((val) => !val);
    setCheckIconVisible((val) => !val);
  };

  const cooldown = useRef(false);
  const handleCommandClick = () => {
    if (cooldown.current === false) {
      cooldown.current = true;
      void navigator.clipboard.writeText(fileLink);
      toggleIcons();
      setTimeout(() => {
        toggleIcons();
        cooldown.current = false;
      }, 2000);
    }
  };

  return (
    <div className="flex w-full flex-col">
      <div className="relative flex h-full">
        {/* TODO: figure out how to truncate this thing on smaller screens */}
        <button
          className="relative flex cursor-pointer flex-row items-center gap-2 rounded-md border border-purple-200/20 bg-purple-100/10 px-3 py-2 text-xs text-slate-500 transition-colors duration-300 hover:border-purple-300/50 hover:bg-purple-100/20 dark:text-slate-400"
          title="Copy your file link"
          onClick={handleCommandClick}
        >
          <span>{fileLink}</span>
          <CopyIcon className={!copyIconVisible ? "hidden" : ""} size={18} />
          {/* TODO: animate checkmark: https://github.com/t3-oss/create-t3-app/blob/29d4db5ca309d66b795de19fff7ed703b77d6ad6/www/src/components/landingPage/banner.astro#L144-L154 */}
          <CheckIcon className={!checkIconVisible ? "hidden" : ""} size={18} />
        </button>
      </div>
    </div>
  );
};

const MasterPasswordAndUploadDialog: FC<{
  onSubmitMasterPassword: (password: string) => Promise<unknown>;
  onClickSend: () => unknown | Promise<unknown>;
  submitEnabled?: boolean;
  progressTasks: { text: string; hoverText: string }[];
  fileLink: string | undefined;
  isSendingFile: boolean;
  finalSendButtonDisabled: boolean;
  onDialogOpenClick: () => Promise<unknown>;
  close: () => unknown;
  dialogOpen: boolean;
  /** an undefined value means that the answer to this question is still loading */
  userHasSetUpKeyPair: boolean | undefined;
}> = ({
  onSubmitMasterPassword,
  onClickSend,
  submitEnabled,
  progressTasks,
  fileLink,
  isSendingFile,
  finalSendButtonDisabled,
  onDialogOpenClick,
  close,
  dialogOpen,
  userHasSetUpKeyPair,
}) => {
  const [animatedListParentRef] = useAutoAnimate();
  const [password, setPassword] = useState("");

  // Once the user has set up their key pair, encrypt and send the file.
  const initiatedSend = useRef(false);
  useEffect(() => {
    const asyncFn = async () => {
      if (userHasSetUpKeyPair && !initiatedSend.current && dialogOpen) {
        initiatedSend.current = true;
        await onClickSend();
      }
    };
    asyncFn().catch(console.error);
  }, [dialogOpen, onClickSend, userHasSetUpKeyPair]);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Button onClick={() => void onDialogOpenClick()} variant="outline" disabled={!submitEnabled}>
        Send
      </Button>
      {/* Is the answer still loading? TODO: maybe skeleton, but we expect this query to always be loaded by the time this modal is opened. */}
      <DialogContent className="sm:max-w-[425px]">
        {!userHasSetUpKeyPair ? (
          <DialogHeader>
            <DialogTitle>Choose master password</DialogTitle>
            <DialogDescription>
              <HoverCard>
                <HoverCardTrigger className="underline-offset-3 cursor-default underline decoration-slate-500 decoration-dashed hover:decoration-slate-400">
                  Learn more.
                </HoverCardTrigger>
                <HoverCardContent>
                  <p className="text-sm">
                    From your master password, a key is derived on your device and used to encrypt your RSA key pair.
                    Whenever your key pair needs to be decrypted, you&rsquo;ll need to provide your master password
                    again.
                  </p>
                </HoverCardContent>
              </HoverCard>
            </DialogDescription>
          </DialogHeader>
        ) : (
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                Sending
                {isSendingFile && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              </div>
            </DialogTitle>
            <DialogDescription>Your file is encrypted before it ever leaves your device.</DialogDescription>
          </DialogHeader>
        )}

        {!userHasSetUpKeyPair ? (
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
                  disabled={finalSendButtonDisabled}
                  className="col-span-3"
                  autoComplete="new-password"
                />
                <Button type="submit" disabled={!password}>
                  {userHasSetUpKeyPair ? "Unlock" : "Set"}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <DialogFooter className="flex gap-6 sm:flex-col sm:space-x-0">
            {progressTasks.length > 0 && (
              <div className="flex flex-col gap-2" ref={animatedListParentRef}>
                {progressTasks.map((task) => (
                  <div className="text-sm text-slate-500 dark:text-slate-400" key={task.text}>
                    <HoverCard>
                      <HoverCardTrigger className="underline-offset-3 cursor-default underline decoration-slate-500 decoration-dashed hover:decoration-slate-400">
                        {task.text}
                      </HoverCardTrigger>
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
            {fileLink && <CopyFileLink fileLink={fileLink} />}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
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
            "animate-border inline-block h-full w-72 cursor-pointer rounded-xl from-teal-500 via-purple-500 to-pink-500 bg-[length:400%_400%] p-0.5 shadow-lg transition focus:outline-none focus:ring",
            !file ? "h-36 bg-gradient-to-r" : "h-24 bg-white",
          )}
        >
          <div
            className={cn(
              "flex h-full w-full items-center justify-center rounded-[11px] bg-slate-900 px-10 text-lg text-white",
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

const encryptKey = async (
  email: string | null | undefined,
  publicKey: string | null | undefined,
  sharedKey: CryptoKey,
) => {
  await new Promise<void>((resolve) => {
    resolve();
  });
  if (!email || !publicKey) throw new Error("User does not exist or does not have public key");
  const encryptedAesKey = await encryptAesKey(sharedKey, atob(publicKey));
  return { email, encrypted_shared_key: btoa(encryptedAesKey) };
};

const Home: NextPage = () => {
  const [linkToFile, setLinkToFile] = useState<string>();
  const [files, setFiles] = useState<File[]>([]);
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const numRecipientEmailInputs = (recipientEmails?.length ?? 0) + 1;
  // TODO: store emails rather than indicies
  const [usersNotSetUpIndicies, setUsersNotSetUpIndicies] = useState<number[]>([]);

  const [progressTasks, setProgressTasks] = useState<{ text: string; hoverText: string }[]>([]);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const [finalSendButtonDisabled, setFinalSendButtonDisabled] = useState(false);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [publicKeysForRecipients, setPublicKeysForRecipients] = useState<PublicKey[]>([]);

  const [recipientListAnimateRef] = useAutoAnimate();

  const getPublicKeysForUsersMutation = api.example.getPublicKeysForUsers.useMutation();
  const createSignedUploadUrlMutation = api.example.createSignedUploadUrl.useMutation();
  const getSessionQuery = api.auth.getSession.useQuery();
  const { data: session } = api.auth.getSession.useQuery();
  const getMyKeysQuery = api.example.getMyKeys.useQuery();

  const onDialogOpenClick = async () => {
    const refreshedSession = await getSessionQuery.refetch({ cancelRefetch: false });
    if (!refreshedSession.data?.user.email) throw new Error("Failed to get user email");

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
    setPublicKeysForRecipients(publicKeys);
  };

  let fileError: string | undefined;
  const file = files[0];
  if (file) {
    const fileSizeBytes = file.size;
    const maxFileSizeBytes = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_BYTES);
    if (fileSizeBytes > maxFileSizeBytes) {
      fileError = `File exceeds ${maxFileSizeBytes / 1e6} MB limit.`;
    }
  }

  const handleEncryptClick = async () => {
    setIsSendingFile(true);
    setFinalSendButtonDisabled(true);

    if (!file) {
      // The UI should have prevented us from getting here.
      throw new Error("File is missing.");
    }
    if (!recipientEmails || recipientEmails.length < 1) {
      // The UI should have prevented us from getting here.
      throw new Error("Recipient emails are missing.");
    }
    const myEmail = session?.user.email;
    if (!myEmail) {
      // The UI should have prevented us from getting here.
      throw new Error("Own email is missing");
    }
    const myPublicKey = getMyKeysQuery.data?.public_key;
    if (!myPublicKey || publicKeysForRecipients.length < 1) {
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
    const newAesKey = await crypto.subtle.generateKey({ name: "AES-CBC", length: 256 }, true, ["encrypt", "decrypt"]);

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
    for (let i = 0; i < publicKeysForRecipients.length; i++) {
      const key = publicKeysForRecipients[i];
      if (!key?.email || !key?.data?.public_key) {
        usersNotSetUp.push(i);
        continue;
      }
      encryptedAesKeyPromises.push(encryptKey(key.email, key.data.public_key, newAesKey));
    }
    const ownEncryptedSharedKey = await encryptKey(session?.user.email, myPublicKey, newAesKey);
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

  const signUp = api.example.signUp.useMutation();

  const generateKeyPairAndSignUp = async (password: string) => {
    const keyPair = await generateRsaKeyPair();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encryptedPrivateKey = await encryptRsaPrivateKey(keyPair, password, salt);

    const decodedSalt = arrayBufferToString(salt);

    await signUp.mutateAsync({
      encryptedPrivateKey: btoa(encryptedPrivateKey.ciphertextString),
      encryptedPrivateKeyIv: btoa(encryptedPrivateKey.ivString),
      publicKey: btoa(await serializeKey(keyPair.publicKey)),
      encryptedPrivateKeySalt: btoa(decodedSalt),
    });
  };

  const utils = api.useContext();

  const onSubmitMasterPassword = async (password: string) => {
    const publicKey = getMyKeysQuery.data?.public_key;

    // Has the user not previously generated their key pair?
    if (!publicKey) {
      await generateKeyPairAndSignUp(password);
    }

    await utils.example.getMyKeys.invalidate();
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
        <div className="text-center text-sm text-blue-100">
          Dead simple end-to-end encrypted file sharing for everyone.
        </div>

        {/* Sign in buttons */}
        <div className="flex flex-col items-center justify-center gap-4">
          {!session?.user && <SignInButtons />}

          {/* File upload box */}
          {!!session?.user && (
            <div className="flex justify-center">
              <Dropzone onDropFiles={setFiles} files={files} />
            </div>
          )}

          {!!fileError && <div>{fileError}</div>}

          {/* Recipient email inputs */}
          {!!(files.length > 0 && session && !fileError) && (
            <div className="flex w-full max-w-[200px] flex-col justify-start gap-4">
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
                            if (!e.target) {
                              throw new Error("No target");
                            }
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
                              <Button variant="outline" className="w-10 rounded-full p-0">
                                <AlertTriangleIcon className="h-4 w-4" />
                                <span className="sr-only">Open popover</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="grid gap-4">
                                <div className="space-y-2">
                                  <h4 className="font-medium leading-none">Recipient not found</h4>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    This recipient doesn&rsquo;t have an account or hasn&rsquo;t set up their public
                                    key. Because of Portalsend&rsquo;s{" "}
                                    <a className="underline" href="#todo">
                                      zero-knowledge architecture
                                    </a>
                                    , it&rsquo;s impossible for us to share a file with this user until they have set up
                                    their account.
                                  </p>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Remove this recipient to continue. We can send them an email if you&rsquo;d like to
                                    invite them to use Portalsend.
                                  </p>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Once they join, you&rsquo;ll be able to easily update the recipients of your file,
                                    even if you&rsquo;ve already sent it.
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={() => removeRecipient(recipientEmails[index]!)}>
                                    Remove
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => removeAndInviteRecipient(recipientEmails[index]!)}
                                  >
                                    Remove and Invite
                                  </Button>
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

              {/* Send button which spawns master password and upload dialog */}
              <div>
                <MasterPasswordAndUploadDialog
                  onSubmitMasterPassword={onSubmitMasterPassword}
                  onClickSend={handleEncryptClick}
                  submitEnabled={recipientEmails.length > 0}
                  progressTasks={progressTasks}
                  fileLink={linkToFile}
                  isSendingFile={isSendingFile}
                  finalSendButtonDisabled={finalSendButtonDisabled}
                  onDialogOpenClick={onDialogOpenClick}
                  dialogOpen={passwordDialogOpen}
                  close={() => setPasswordDialogOpen(false)}
                  userHasSetUpKeyPair={getMyKeysQuery.isLoading ? undefined : !!getMyKeysQuery.data?.public_key}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
