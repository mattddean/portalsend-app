import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { pathname } = new URL(request.url);

  console.debug("pathname", pathname);

  return NextResponse.json({ hi: "there" });
}
