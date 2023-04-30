// import { ConfirmSubscriptionCommand, SNSClient } from "@aws-sdk/client-sns";
import * as AWSLambda from "aws-lambda";
import console from "console";
import { Resend } from "resend";

function isConfirmSubscription(headers: { "x-amz-sns-message-type": string }) {
  return headers["x-amz-sns-message-type"] === "SubscriptionConfirmation";
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

async function handleInternal(event: AWSLambda.SNSEvent) {
  console.debug("event", JSON.stringify(event, null, 2));

  const record = event.Records[0];
  if (!record) throw Error();

  // if (isConfirmSubscription()) {
  //   const client = new SNSClient(config);
  //   const input = {
  //     // ConfirmSubscriptionInput
  //     TopicArn: "STRING_VALUE", // required
  //     Token: "STRING_VALUE", // required
  //     AuthenticateOnUnsubscribe: "STRING_VALUE",
  //   };
  //   const command = new ConfirmSubscriptionCommand(input);
  //   const response = await client.send(command);
  // }

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

/**
 * Send emails on creation of s3 file.
 *
 * @todo upstash queue
 */
async function handle(event: AWSLambda.SNSEvent) {
  try {
    await handleInternal(event);
  } catch (error) {
    console.error(error);

    // TODO: upstash dlq?

    throw error;
  }
}

export { handle as GET, handle as POST, handle as PUT };
