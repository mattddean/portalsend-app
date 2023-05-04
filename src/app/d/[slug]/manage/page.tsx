import type { NextPage } from "next";
// import { cookies } from "next/headers";

export const runtime = "edge";

const FileDropSlug: NextPage = () => {
  // const cookieStore = cookies();
  // const fileDropAccessCookie = cookieStore.get(`filedrop_access-${params.slug}`);
  // const fileDropAccessCookieValue = fileDropAccessCookie?.value;

  return (
    <>
      <div className="h-4" />
      Let users manage files here
    </>
  );
};

export default FileDropSlug;
