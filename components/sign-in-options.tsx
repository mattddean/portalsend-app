"use client";

import { signIn } from "next-auth/react";
import { FC } from "react";
import { Button } from "./ui/button";

const SignInButtons: FC = () => {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => void signIn("github")}>
        Authenticate with GitHub
      </Button>
      <Button variant="outline" onClick={() => void signIn("google")}>
        Authenticate with Google
      </Button>
    </div>
  );
};

export default SignInButtons;
