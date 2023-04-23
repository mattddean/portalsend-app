"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { FC, useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, SpinnerIcon } from "~/components/icons";
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
  console.debug("rendering master password and upload dialog");

  const [animatedListParentRef] = useAutoAnimate();
  const [password, setPassword] = useState("");

  console.debug("open", dialogOpen);

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

export default MasterPasswordAndUploadDialog;
