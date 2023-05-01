import { SNSClient } from "@aws-sdk/client-sns";
import { env } from "~/env.mjs";

export const getSnsClient = () => {
  return new SNSClient({
    region: env.OUR_AWS_REGION,
    credentials: {
      accessKeyId: env.OUR_AWS_ACCESS_KEY_ID as string,
      secretAccessKey: env.OUR_AWS_SECRET_ACCESS_KEY as string,
    },
  });
};
