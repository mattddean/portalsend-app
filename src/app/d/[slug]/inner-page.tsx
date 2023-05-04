"use client";

import Link from "next/link";
import { FC, useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

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

export const InnerPage: FC<{ slug: string }> = ({ slug }) => {
  const [fileAccessValue, setFileAccessValue] = useState<string | undefined>();
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    setFileAccessValue(localStorage.getItem(`filedrop_access-${slug}`) ?? undefined);
  }, [slug]);

  return (
    <>
      <div className="h-4" />

      <Dropzone onDropFiles={setFiles} files={files} />

      <div className="h-4" />

      <div className="flex gap-2">
        <Link href={`/d/${slug}/files`}>
          <Button disabled={!fileAccessValue}>View Files</Button>
        </Link>
        <Link href={`/d/${slug}/manage`}>
          <Button disabled={!fileAccessValue}>Manage Filedrop</Button>
        </Link>
      </div>
    </>
  );
};
