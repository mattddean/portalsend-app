import { Auth } from "@auth/core";
import { nextAuthOptions } from "../../../../next-auth/options";

function handle(request: Request) {
  const envSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const envTrustHost = !!(
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_TRUST_HOST ??
    process.env.VERCEL ??
    process.env.NODE_ENV !== "production"
  );
  nextAuthOptions.secret ??= envSecret;
  nextAuthOptions.trustHost ??= envTrustHost;
  const req = new Request(request);
  return Auth(req, nextAuthOptions);
}

export const runtime = "experimental-edge";

export { handle as GET, handle as POST };
