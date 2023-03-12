import type { NextRequest } from "next/server";
import { authConfig } from "~/auth/options";
import { SolidAuthHandler } from "~/auth/server";

export const runtime = "edge";

async function handler(request: NextRequest) {
  const { prefix = "/api/auth", ...authOptions } = authConfig;

  authOptions.secret ??= process.env.AUTH_SECRET;
  authOptions.trustHost ??= !!(
    process.env.AUTH_TRUST_HOST ??
    process.env.VERCEL ??
    process.env.NODE_ENV !== "production"
  );

  const response = await SolidAuthHandler(request, prefix, authOptions);
  return response;
}

export { handler as GET, handler as POST };
