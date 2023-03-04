/**
 *
 * This is an example router, you can delete this file and then update `../pages/api/trpc/[trpc].tsx`
 */
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../prisma/kysely";
import { privateProcedure, publicProcedure, router } from "../trpc";

const portalsendFilesS3Bucket = "portalsend-app-files";

// TODO: use env object from env.mjs to get environment variables

const getS3Client = () => {
  return new S3Client({
    region: process.env.OUR_AWS_REGION,
    credentials: {
      accessKeyId: process.env.OUR_AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.OUR_AWS_SECRET_ACCESS_KEY as string,
    },
  });
};

export const exampleRouter = router({
  hello: publicProcedure.input(z.object({ name: z.string() })).query(({ input }) => {
    return `Hello ${input.name}`;
  }),

  random: publicProcedure.input(z.object({ num: z.number() })).mutation(({ input }) => {
    return Math.floor(Math.random() * 100) / input.num;
  }),

  secret: privateProcedure.query(({ ctx }) => {
    return `This is top secret - ${ctx.user.name ?? ""}`;
  }),

  signUp: privateProcedure
    .input(
      z.object({
        publicKey: z.string(),
        encryptedPrivateKey: z.string(),
        encryptedPrivateKeyIv: z.string(),
        encryptedPrivateKeySalt: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const authenticatedEmail = ctx.user.email;
      if (!authenticatedEmail) {
        throw new Error(`Cannot sign up user ${ctx.user.id} because they do not have an email address set`);
      }

      await db
        .updateTable("users")
        .where("email", "=", authenticatedEmail)
        .set({
          public_key: input.publicKey,
          encrypted_private_key: input.encryptedPrivateKey,
          encrypted_private_key_iv: input.encryptedPrivateKeyIv,
          encrypted_private_key_salt: input.encryptedPrivateKeySalt,
        })
        .execute();
    }),

  getMyKeys: privateProcedure.query(async ({ ctx }) => {
    const authenticatedEmail = ctx.user.email;
    if (!authenticatedEmail) {
      throw new Error("User does not have an email address set");
    }

    const user = await db
      .selectFrom("users")
      .select(["encrypted_private_key", "encrypted_private_key_iv", "encrypted_private_key_salt", "public_key"])
      .where("users.email", "=", authenticatedEmail)
      .executeTakeFirst();

    if (!user?.encrypted_private_key || !user?.encrypted_private_key_iv || !user?.encrypted_private_key_salt) {
      throw new TRPCError({
        message: "User's keys are not set up yet",
        code: "INTERNAL_SERVER_ERROR",
      });
    }

    return {
      encrypted_private_key: user.encrypted_private_key,
      encrypted_private_key_iv: user.encrypted_private_key_iv,
      encrypted_private_key_salt: user.encrypted_private_key_salt,
      public_key: user.public_key,
    };
  }),

  getPublicKeysForUsers: privateProcedure
    .input(z.object({ user_emails: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      const users = await db
        .selectFrom("users")
        .select(["email", "public_key"])
        .where("email", "in", input.user_emails)
        .execute();

      const retUsers = [];
      for (const email of input.user_emails) {
        const foundUser = users.find((user) => user.email === email);
        retUsers.push({
          email,
          data: foundUser ? { public_key: foundUser.public_key } : undefined,
        });
      }
      return retUsers;
    }),

  createSignedUploadUrl: privateProcedure
    .input(
      z.object({
        /** The shared key encrypted for the user calling this endpoint. */
        encrypted_key_for_self: z.string(),
        /** The shared key encrypted for each recipient of the file with each recipient's email address. */
        encrypted_keys_for_recipients: z.array(z.object({ email: z.string(), encrypted_shared_key: z.string() })),
        /** The encrypted name of the file, base64 encoded. */
        encrypted_filename: z.string(),
        /** Initialization vector used to encrypt the file. */
        file_iv: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: use a db transaction

      const userEmail = ctx.user.email;
      if (!userEmail) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const sharedKeySet = await db
        .insertInto("shared_key_sets")
        .values({ created_at: new Date(), updated_at: new Date(), id: createId() })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      for (const encryptedSharedKey of input.encrypted_keys_for_recipients) {
        const user = await db
          .selectFrom("users")
          .select(["id"])
          .where("email", "=", encryptedSharedKey.email)
          .executeTakeFirstOrThrow();
        const sharedKey = await db
          .insertInto("shared_keys")
          .values([
            {
              encrypted_key: encryptedSharedKey.encrypted_shared_key,
              shared_key_set_id: sharedKeySet.id,
              id: createId(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          ])
          .returning(["id"])
          .executeTakeFirstOrThrow();
        await db
          .insertInto("file_accesses")
          .values([
            {
              user_id: user.id,
              shared_key_id: sharedKey.id,
              original_sender: false,
              permission: "VIEWER",
              id: createId(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          ])
          .executeTakeFirstOrThrow();
      }

      const sharedKey = await db
        .insertInto("shared_keys")
        .values([
          {
            encrypted_key: input.encrypted_key_for_self,
            shared_key_set_id: sharedKeySet.id,
            id: createId(),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ])
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("file_accesses")
        .values([
          {
            user_id: ctx.user.id,
            shared_key_id: sharedKey.id,
            original_sender: true,
            permission: "OWNER",
            id: createId(),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ])
        .executeTakeFirstOrThrow();

      const file = await db
        .insertInto("files")
        .values([
          {
            iv: input.file_iv,
            encrypted_name: input.encrypted_filename,
            shared_key_set_id: sharedKeySet.id,
            created_at: new Date(),
            updated_at: new Date(),
            id: createId(),
            slug: createId(),
            storage_key: createId(),
          },
        ])
        .returning(["id", "storage_key", "slug"])
        .executeTakeFirstOrThrow();

      // Add a one megabyte buffer in case the encrypted version of the file is a bit longer than the unencrypted version.
      const maxFileSizeBytes = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_BYTES as string) + 1_000_000;

      const client = getS3Client();
      const { url, fields } = await createPresignedPost(client, {
        Bucket: portalsendFilesS3Bucket,
        Key: file.storage_key,
        Conditions: [
          { bucket: portalsendFilesS3Bucket },
          ["content-length-range", 0, maxFileSizeBytes], // 0 bytes to maxFilSize bytes
          ["starts-with", "$Content-Type", ""], // necessary because the frontend will add this form data
        ],
        Expires: 5 * 60, //Seconds before the presigned post expires. 3600 by default.
      });

      return {
        signed_url: url,
        form_data_fields: fields,
        file_slug: file.slug,
      };
    }),

  getFile: privateProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const file = await db
      .selectFrom("file_accesses")
      .where("file_accesses.user_id", "=", ctx.user.id)
      .innerJoin("shared_keys", "shared_keys.id", "file_accesses.shared_key_id")
      .innerJoin("shared_key_sets", "shared_key_sets.id", "shared_keys.shared_key_set_id")
      .innerJoin("files", "files.shared_key_set_id", "shared_key_sets.id")
      .where("files.slug", "=", input.slug)
      .select(["shared_keys.encrypted_key", "files.iv", "files.name"])
      .executeTakeFirst();

    // NOT_FOUND is fine if the file exists but the user doesn't have access to it. This prevents revealing that the file exists.
    if (!file) throw new TRPCError({ code: "NOT_FOUND" });

    return {
      name: file.name,
      slug: input.slug,
      shared_key_encrypted_for_me: file.encrypted_key,
      iv: file.iv,
    };
  }),

  createFileSignedDownloadUrl: privateProcedure.input(z.object({ slug: z.string() })).mutation(async ({ input }) => {
    const file = await db
      .selectFrom("files")
      .select(["storage_key", "name"])
      .where("slug", "=", input.slug)
      .executeTakeFirst();

    if (!file) throw new TRPCError({ code: "NOT_FOUND" });

    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: portalsendFilesS3Bucket,
      Key: file.storage_key,
    });
    const url = await getSignedUrl(client, command, { expiresIn: 5 * 60 });

    return { signed_download_url: url, file_name: file.name };
  }),

  infiniteFiles: privateProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100),
        cursor: z.date().nullish(), // <-- "cursor" needs to exist to create an infinite query, but can be any type
        only_sent_received: z.enum(["sent", "received"]).nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 50;

      // const whereInput: Prisma.FileWhereInput = {
      //   sharedKeySet: {
      //     sharedKeys: {
      //       some: {
      //         fileAccesses: {
      //           some: {
      //             userId: ctx.user.id,
      //           },
      //         },
      //       },
      //     },
      //   },
      // };

      // // this first if statement is just to help typescript
      // if (whereInput.sharedKeySet?.sharedKeys?.some?.fileAccesses?.some) {
      //   if (input.only_sent_received === "sent") {
      //     whereInput.sharedKeySet.sharedKeys.some.fileAccesses.some.originalSender = true;
      //   } else if (input.only_sent_received === "received") {
      //     whereInput.sharedKeySet.sharedKeys.some.fileAccesses.some.originalSender = false;
      //   }
      // }

      // TODO: transaction
      let totalCountQuery = db
        .selectFrom("file_accesses")
        .where("file_accesses.user_id", "=", ctx.user.id)
        .innerJoin("shared_keys", "shared_keys.id", "file_accesses.shared_key_id")
        .innerJoin("shared_key_sets", "shared_key_sets.id", "shared_keys.shared_key_set_id")
        .innerJoin("files", "files.shared_key_set_id", "shared_key_sets.id")
        .select([db.fn.count("file_accesses.id").as("file_count")]);

      if (input.only_sent_received === "sent") {
        console.debug("filtering to original sender true");
        totalCountQuery = totalCountQuery.where("file_accesses.original_sender", "=", true);
      } else if (input.only_sent_received === "received") {
        totalCountQuery = totalCountQuery.where("file_accesses.original_sender", "=", false);
      }

      const totalCountResult = await totalCountQuery.execute();
      const totalCount = totalCountResult[0].file_count;

      let itemsQuery = db
        .selectFrom("file_accesses")
        .where("file_accesses.user_id", "=", ctx.user.id)
        .innerJoin("shared_keys", "shared_keys.id", "file_accesses.shared_key_id")
        .innerJoin("shared_key_sets", "shared_key_sets.id", "shared_keys.shared_key_set_id")
        .innerJoin("files", "files.shared_key_set_id", "shared_key_sets.id")
        .orderBy("files.created_at", "desc")
        .select(["files.created_at", "encrypted_key", "encrypted_name", "iv", "files.slug"])
        .limit(input.limit);

      const cursor = input.cursor;
      if (cursor) {
        itemsQuery = itemsQuery.where("files.created_at", "<=", cursor);
      }

      const items = await itemsQuery.execute();

      // const [totalCount, items] = await prisma.$transaction([
      //   // TODO: make a separate endpoint to get totalCount so that we don't have to make this query as often
      //   prisma.file.count({
      //     where: whereInput,
      //   }),
      //   prisma.file.findMany({
      //     take: limit + 1, // get an extra item at the end which we'll use as next cursor
      //     where: whereInput,
      //     cursor: input.cursor ? { id: input.cursor } : undefined,
      //     orderBy: { createdAt: "desc" },
      //     include: {
      //       sharedKeySet: {
      //         include: {
      //           sharedKeys: {
      //             // where: {
      //             //   fileAccesses: {
      //             //     some: {
      //             //       userId: ctx.session.user.id
      //             //     },
      //             //   }
      //             // },
      //             include: {
      //               fileAccesses: {
      //                 where: {
      //                   userId: ctx.user.id,
      //                 },
      //                 take: 1,
      //               },
      //             },
      //             take: 1,
      //           },
      //         },
      //       },
      //     },
      //   }),
      // ]);

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop() as NonNullable<(typeof items)[number]>;
        nextCursor = nextItem.created_at;
      }

      const returnableItems = items.map((item) => {
        return {
          // TODO: once this property is required we can remove this assertion
          encrypted_filename: item.encrypted_name as string,
          encrypted_key: item.encrypted_key,
          iv: item.iv,
          created_at: item.created_at,
          slug: item.slug,
        };
      });

      return {
        items: returnableItems,
        nextCursor,
        totalCount,
      };
    }),
});
