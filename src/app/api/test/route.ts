import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { pathname } = new URL(request.url);

  const theCookies = cookies();

  theCookies.getAll().forEach((cookie) => {
    console.debug(cookie.name, ": ", cookie.value);
  });

  console.debug("pathname", pathname);

  return NextResponse.json({ hi: "there" });
}
