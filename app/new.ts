import { NextResponse } from "next/server";

export async function GET(request: Request) {
  console.debug("request", request);
  return NextResponse.json({ hi: "there" });
}
