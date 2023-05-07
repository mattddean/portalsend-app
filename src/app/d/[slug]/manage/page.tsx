import type { NextPage } from "next";
import { SignInButton } from "~/components/sign-in-options";
import { rsc } from "~/shared/server-rsc/trpc";

export const runtime = "edge";

export interface Props {
  params: { slug: string };
}

/* @ts-expect-error Async Server Component */
const FileDropSlug: NextPage<Props> = async ({ params }) => {
  // const cookieStore = cookies();
  // const fileDropAccessCookie = cookieStore.get(`filedrop_access-${params.slug}`);
  // const fileDropAccessCookieValue = fileDropAccessCookie?.value;

  const [session, publicFiledrop] = await Promise.all([
    rsc.example.getSession.fetch(),
    rsc.example.getFiledrop.fetch({ slug: params.slug }),
  ]);

  console.debug("session", session);

  if (!session?.slug || session.slug !== params.slug) {
    return <SignInButton filedrop={publicFiledrop} />;
  }

  return (
    <>
      <div className="h-4" />
      Signed in! User can manage this filedrop.
    </>
  );
};

export default FileDropSlug;
