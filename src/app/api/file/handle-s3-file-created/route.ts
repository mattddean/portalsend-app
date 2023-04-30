import { ConfirmSubscriptionCommand, ConfirmSubscriptionCommandInput } from "@aws-sdk/client-sns";
import console from "console";
import { NextRequest, NextResponse } from "next/server";
// import { Resend } from "resend";
import { getSnsClient } from "~/lib/sns";

function isConfirmSubscription(headers: Headers) {
  return headers.get("x-amz-sns-message-type") === "SubscriptionConfirmation";
}

// function confirmSubscription(
//   headers: {
//     "x-amz-sns-topic-arn": string;
//     "x-amz-sns-message-type": string;
//   },
//   body: { Token: string },
// ): Promise<string> {
//   return new Promise((resolve, reject) => {
//     if (!isConfirmSubscription(headers)) {
//       return resolve("No SubscriptionConfirmation in sns headers");
//     }

//     snsInstance.confirmSubscription(
//       {
//         TopicArn: headers["x-amz-sns-topic-arn"],
//         Token: body.Token,
//       },
//       (err, res) => {
//         console.log(err);
//         if (err) {
//           return reject(err);
//         }
//         return resolve(res.SubscriptionArn);
//       },
//     );
//   });
// }

async function handleInternal(event: NextRequest) {
  // const record = event.Records[0];
  // if (!record) throw Error();

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

  console.debug("await event.json()", JSON.stringify(await event.json(), null, 2));

  const body = (await event.json()) as { Message: string; Signature: string };
  const message = JSON.parse(body.Message) as { Service: string; Event: string };

  console.debug("message", message);

  // const message = event.Records[0]?.Sns.Message;
  // if (!message) throw new Error("No message");
  // const body = JSON.parse(message);

  // console.log("Received SNS message", JSON.stringify(body, null, 2));

  // TODO: validate message contents

  const resendApiKey = process.env.RESEND_API_KEY as string;

  // const resend = new Resend(resendApiKey);

  // const result = await resend.sendEmail({
  //   from: "onboarding@resend.dev",
  //   to: "mdean400@gmail.com",
  //   subject: "Hello World",
  //   html: "Congrats on sending your <strong>first email</strong>!",
  // });
  // console.log("Sent email", JSON.stringify(result, null, 2));

  return NextResponse.json({});
}

/**
 * Send email to recipients on creation of S3 file.
 *
 * @todo upstash queue
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

export { handle as GET, handle as POST, handle as PUT };
