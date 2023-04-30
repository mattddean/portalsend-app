import { S3Client } from "@aws-sdk/client-s3";

export const portalsendFilesS3Bucket = "portalsend-app-files";

// TODO: use env object from env.mjs to get environment variables

export const getS3Client = () => {
  return new S3Client({
    region: process.env.OUR_AWS_REGION,
    credentials: {
      accessKeyId: process.env.OUR_AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.OUR_AWS_SECRET_ACCESS_KEY as string,
    },
  });
};
