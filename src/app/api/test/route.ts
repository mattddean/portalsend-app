import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: Request) {
  const { pathname } = new URL(request.url);

  const theCookies = cookies();

  console.debug("here are the cookies");
  const jar = theCookies.getAll().map((cookie) => `${cookie.name}=${cookie.value}`);
  console.debug("jar", jar.join(","));

  console.debug("pathname", pathname);

  return NextResponse.json({ hi: "there" });
}
