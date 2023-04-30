import * as AWSLambda from "aws-lambda";
import console from "console";
import { Resend } from "resend";

/**
 * Send emails on creation of s3 file.
 *
 * @todo upstash queue
 */
export async function handle(event: AWSLambda.SNSEvent) {
  try {
    await handleInternal(event);
  } catch (error) {
    console.error(error);

    // TODO: upstash dlq?

    throw error;
  }
}

async function handleInternal(event: AWSLambda.SNSEvent) {
  const message = event.Records[0]?.Sns.Message;
  if (!message) throw new Error("No message");
  const body = JSON.parse(message);

  console.log("Received SNS message", JSON.stringify(body, null, 2));

  // TODO: validate message contents

  const resendApiKey = process.env.RESEND_API_KEY as string;

  const resend = new Resend(resendApiKey);

  const result = await resend.sendEmail({
    from: "onboarding@resend.dev",
    to: "mdean400@gmail.com",
    subject: "Hello World",
    html: "Congrats on sending your <strong>first email</strong>!",
  });

  console.log("Sent email", JSON.stringify(result, null, 2));
}
