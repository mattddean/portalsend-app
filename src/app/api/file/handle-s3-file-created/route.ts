import { ConfirmSubscriptionCommand, ConfirmSubscriptionCommandInput } from "@aws-sdk/client-sns";
import console from "console";
import { and, eq } from "drizzle-orm/expressions";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "~/db/drizzle-db";
import * as Schema from "~/db/schema";
import { portalsendFilesS3Bucket } from "~/lib/s3";
import { getSnsClient } from "~/lib/sns";

/** A partial representation of the message we receive from SNS about the file that was created. */
interface S3PutObjectSnsMessage {
  Records: [
    {
      s3: {
        bucket: {
          name: string;
        };
        object: {
          key: string;
          size: number;
          eTag: string;
          sequencer: string;
        };
      };
    },
  ];
}

/** A partial representation of the body of the request we receive from SNS. */
interface SnsRequestBody {
  Message: string;
  Signature: string;
}

function isConfirmSubscription(headers: Headers) {
  return headers.get("x-amz-sns-message-type") === "SubscriptionConfirmation";
}

async function handleInternal(event: NextRequest) {
  // TODO: verify SNS signature

  if (isConfirmSubscription(event.headers)) {
    const snsTopicArn = event.headers.get("x-amz-sns-topic-arn");
    const body = await event.json();
    const token = body.Token;
    if (!snsTopicArn || !token) throw new Error("Invalid subscription confirmation request");

    const client = getSnsClient();
    const input: ConfirmSubscriptionCommandInput = {
      TopicArn: snsTopicArn,
      Token: token,
      AuthenticateOnUnsubscribe: "true",
    };
    const command = new ConfirmSubscriptionCommand(input);
    await client.send(command);

    return NextResponse.json({});
  }

  const body = (await event.json()) as SnsRequestBody;
  const message = JSON.parse(body.Message) as S3PutObjectSnsMessage;

  const bucket = message.Records[0].s3.bucket.name;
  if (bucket !== portalsendFilesS3Bucket) throw new Error("Unexpected bucket");

  // Find all users with access to this file but who are not the original sender.
  // TODO: if we start allowing users to change recipients, this won't work anymore because
  // we'll send another email to each recipient each time new recipients are added to a file.
  const storageKey = message.Records[0].s3.object.key;
  const results = await db
    .select({
      user_email: Schema.users.email,
      user_first_name: Schema.users.first_name,
      file_slug: Schema.files.slug,
      original_sender: Schema.fileAccesses.original_sender,
    })
    .from(Schema.files)
    .innerJoin(Schema.fileAccesses, eq(Schema.fileAccesses.file_id, Schema.files.id))
    .innerJoin(Schema.users, eq(Schema.users.id, Schema.fileAccesses.user_id))
    .where(
      and(
        // Find the file by its s3 key
        eq(Schema.files.storage_key, storageKey),
        // find users who were given access to this file but who are not the original sender
        // eq(Schema.fileAccesses.original_sender, false),
      ),
    );
  const slug = results[0]?.file_slug;

  const fileSender = results.find((result) => result.original_sender === true);
  if (!fileSender) throw new Error("Cannot determine file's sender");

  const recipients = results.filter((result) => result.original_sender === false);

  // Send an email to all of the file's recipients.
  const resendApiKey = process.env.RESEND_API_KEY as string;
  const resend = new Resend(resendApiKey);
  const result = await resend.sendEmail({
    from: "no-reply@notifications.portalsend.app",
    // The `to` array can contain 50 recipients max, but we only allow 5 recipients per file for now, so we don't need to worry about exceeding that.
    // In the event that this changes, we can just use a loop to send to all recipients.
    to: recipients.map((recipient) => recipient.user_email),
    // TODO: Consider including last name, but that may be weird
    subject: `${fileSender.user_first_name} shared a file with you`,
    // TODO: Use react instead
    html: `Someone shared a file with you.<br/>Visit <a href="${slug}">${slug}</a> to download it.`,
  });
  console.debug("Sent emails", JSON.stringify(result, null, 2));

  return NextResponse.json({});
}

/**
 * Send email to recipients on creation of S3 file.
 *
 * @todo upstash queue
 * @todo verify sns signature
 */
async function handle(event: NextRequest) {
  let response: NextResponse;

  try {
    response = await handleInternal(event);
  } catch (error) {
    console.error(error);
    // TODO: upstash dlq?
    throw error;
  }

  return response;
}

export { handle as POST };
