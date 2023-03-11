"use client";

import Link from "next/link";
import { ChangeEvent, FC, useState } from "react";
import { api } from "~/trpc/client/trpc-client";
import { arrayBufferToString, encryptRsaPrivateKey, generateRsaKeyPair, serializeKey } from "../lib/key-utils";

export const KeyPairGenerator: FC = () => {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Enter a password to generate a key pair");
  const signUp = api.example.signUp.useMutation();

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target?.value);
  };

  const handleGenerateKeyPair = async () => {
    if (!password) {
      setStatus("Please enter a password");
      return;
    }

    setStatus("Generating key pair...");

    try {
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

      setStatus("Generated key pair");
    } catch (err) {
      setStatus(`Error setting up master password: ${err as string}`);
    }
  };

  return (
    <div className="w-full max-w-xs">
      <form className="mb-4 rounded bg-white px-8 pt-6 pb-8 shadow-md">
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="password">
            Create your master password
          </label>
          <input
            className="focus:shadow-outline w-full appearance-none rounded border border-red-500 py-2 px-3 leading-tight text-gray-700 shadow focus:outline-none"
            id="password"
            type="password"
            placeholder="******************"
            onChange={handlePasswordChange}
            value={password}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="focus:shadow-outline rounded bg-blue-500 py-2 px-4 font-bold text-white hover:bg-blue-700 focus:outline-none"
            type="button"
            onClick={() => void handleGenerateKeyPair()}
          >
            Let&rsquo;s go
          </button>
          <div className="text-black">{status}</div>
        </div>
      </form>
      <Link href="/files/new">Send File</Link>
    </div>
  );
};
