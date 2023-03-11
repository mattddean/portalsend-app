import { authConfig } from "~/next-auth/options";
import { SolidAuth } from "~/next-auth/server";

const handler = SolidAuth(authConfig);
const get = handler.GET;
const post = handler.POST;

export { get as GET, post as POST };

export const runtime = "edge";
