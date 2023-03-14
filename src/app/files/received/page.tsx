import { type FC } from "react";
import SignInButtons from "~/components/sign-in-options";
import { rsc } from "~/shared/server-rsc/trpc";
import { HydrateClient } from "~/trpc/client/hydrate-client";
import { InnerPage } from "../inner-page";

export const runtime = "edge";

/* @ts-expect-error Async Server Component */
const Page: FC = async () => {
  const pageSizes: [number, number, number] = [10, 25, 50];
  const initialPageSize = pageSizes[0];

  // Fetch the first page of data that FilesTable will look for so that it
  // can be dehydrated, passed to the client, and instantly retrieved.
  const [user] = await Promise.all([
    rsc.whoami.fetch(),
    rsc.example.infiniteFiles.fetchInfinite({ limit: initialPageSize, only_sent_received: "received" }),
  ]);

  const dehydratedState = await rsc.dehydrate();
  return (
    <>
      <div className="h-4" />
      <div className="flex w-full flex-col items-center gap-8">
        <div className="text-center text-sm text-blue-100">Received files</div>

        {!user && <SignInButtons />}

        {!!user && (
          // Provide dehydrated state to client components.
          <HydrateClient state={dehydratedState}>
            <InnerPage pageSizes={pageSizes} initialPageSize={initialPageSize} onlySentReceived={"received"} />
          </HydrateClient>
        )}
      </div>
    </>
  );
};

export default Page;
