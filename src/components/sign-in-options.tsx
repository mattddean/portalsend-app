"use client";

import { FC } from "react";
import { signIn } from "~/auth/client";
import { GithubIcon, GoogleIcon } from "./icons";
import { Button } from "./ui/button";

const SignInButtons: FC = () => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="gap-2"
        // If a user has already set up their master password, set-master-password will redirect them to the homepage
        onClick={() => void signIn("github", { callbackUrl: "/set-master-password" })}
      >
        <GithubIcon className="h-5 w-5 text-gray-500" />
        Authenticate
      </Button>
      <Button
        variant="outline"
        className="gap-2"
        // If a user has already set up their master password, set-master-password will redirect them to the homepage
        onClick={() => void signIn("google", { callbackUrl: "/set-master-password" })}
      >
        <GoogleIcon className="h-5 w-5 text-gray-500" />
        Authenticate
      </Button>
    </div>
  );
};

export default SignInButtons;
