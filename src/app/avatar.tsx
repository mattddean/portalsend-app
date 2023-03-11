"use client";

import type { FC } from "react";
import { api } from "~/trpc/client/trpc-client";
import { MainDropdownMenu } from "./main-dropdown-menu";

export const Avatar: FC = () => {
  const userQuery = api.auth.getSession.useQuery();

  const user = userQuery.data?.user;

  const avatarFallbackText = (() => {
    const userName = user?.name;
    return userName?.[0];
  })();

  return <>{!!user && <MainDropdownMenu avatarFallbackText={avatarFallbackText} user={user} />}</>;
};
