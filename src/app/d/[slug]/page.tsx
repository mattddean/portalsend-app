import type { NextPage } from "next";
// import { cookies } from "next/headers";
import { InnerPage } from "./inner-page";

export const runtime = "edge";

export const metadata = {
  title: "A Filedrop",
  description: "Drop a file here.",
};

export interface Props {
  params: { slug: string };
}

const FileDropSlug: NextPage<Props> = ({ params }) => {
  // const cookieStore = cookies();
  // const fileDropAccessCookie = cookieStore.get(`filedrop_access-${params.slug}`);
  // const fileDropAccessCookieValue = fileDropAccessCookie?.value;

  return (
    <>
      <div className="h-4" />

      <InnerPage slug={params.slug} />
    </>
  );
};

export default FileDropSlug;
