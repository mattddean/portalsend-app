import { authConfig } from "~/auth/options";
import { SolidAuth } from "~/auth/server";

const handler = SolidAuth(authConfig);
const get = handler.GET;
const post = handler.POST;

export { get as GET, post as POST };

export const runtime = "edge";
