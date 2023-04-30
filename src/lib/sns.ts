import { SNSClient } from "@aws-sdk/client-sns";

export const getSnsClient = () => {
  return new SNSClient({
    region: process.env.OUR_AWS_REGION,
    credentials: {
      accessKeyId: process.env.OUR_AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.OUR_AWS_SECRET_ACCESS_KEY as string,
    },
  });
};
