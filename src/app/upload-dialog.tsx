"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { FC, useRef, useState } from "react";
import { CheckIcon, CopyIcon, SpinnerIcon } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";

const CopyFileLink: FC<{ fileLink: string }> = ({ fileLink }) => {
  const [copyIconVisible, setCopyIconVisible] = useState(true);
  const [checkIconVisible, setCheckIconVisible] = useState(false);

  const toggleIcons = () => {
    setCopyIconVisible((val) => !val);
    setCheckIconVisible((val) => !val);
  };

  const cooldown = useRef(false);
  const handleCopyClick = () => {
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
          onClick={handleCopyClick}
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

export const UploadDialog: FC<{
  submitEnabled?: boolean;
  progressTasks: { text: string; hoverText: string }[];
  fileLink: string | undefined;
  isSendingFile: boolean;
  onDialogOpenClick: () => Promise<unknown>;
  close: () => unknown;
  dialogOpen: boolean;
}> = ({ submitEnabled, progressTasks, fileLink, isSendingFile, onDialogOpenClick, close, dialogOpen }) => {
  const [animatedListParentRef] = useAutoAnimate();

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Button onClick={() => void onDialogOpenClick()} variant="default" disabled={!submitEnabled}>
        Send
      </Button>
      {/* Is the answer still loading? TODO: maybe skeleton, but we expect this query to always be loaded by the time this modal is opened. */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              Sending
              {isSendingFile && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            </div>
          </DialogTitle>
          <DialogDescription>Your file is encrypted before it ever leaves your device.</DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
};
