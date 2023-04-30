/**
 * This is an example router, you can delete this file and then update `../pages/api/trpc/[trpc].tsx`
 */
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, lte } from "drizzle-orm/expressions";
import { sql } from "drizzle-orm/sql";
import { z } from "zod";
import { db } from "~/db/drizzle-db";
import * as Schema from "~/db/schema";
import { getS3Client, portalsendFilesS3Bucket } from "~/lib/s3";
import { privateProcedure, publicProcedure, router } from "../trpc";

export const exampleRouter = router({
  getSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;

    const authenticatedEmail = ctx.user.email;
    if (!authenticatedEmail) {
      throw new Error("User does not have an email address set");
    }

    const [user] = await db
      .select({
        encrypted_private_key: Schema.users.encrypted_private_key,
        encrypted_private_key_iv: Schema.users.encrypted_private_key_iv,
        encrypted_private_key_salt: Schema.users.encrypted_private_key_salt,
        public_key: Schema.users.public_key,
      })
      .from(Schema.users)
      .where(eq(Schema.users.email, authenticatedEmail))
      .limit(1);

    // TODO: Consider creating a new table called user_keys where all of these can be required, then link that to a user when
    // they set up their keys. That would avoid this issue where we can't represent that if public_key exists, all keys must exist.
    const keys =
      user?.public_key && user.encrypted_private_key_salt && user.encrypted_private_key_iv && user.encrypted_private_key
        ? {
            encrypted_private_key: user.encrypted_private_key,
            encrypted_private_key_iv: user.encrypted_private_key_iv,
            encrypted_private_key_salt: user.encrypted_private_key_salt,
            public_key: user.public_key,
          }
        : undefined;

    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      keys,
    };
  }),

  signUp: privateProcedure
    .input(
      z.object({
        publicKey: z.string().min(1),
        encryptedPrivateKey: z.string().min(1),
        encryptedPrivateKeyIv: z.string().min(1),
        encryptedPrivateKeySalt: z.string().min(1),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const authenticatedEmail = ctx.user.email;
      if (!authenticatedEmail) {
        throw new Error(`Cannot sign up user ${ctx.user.id} because they do not have an email address set`);
      }

      await db
        .update(Schema.users)
        .set({
          public_key: input.publicKey,
          encrypted_private_key: input.encryptedPrivateKey,
          encrypted_private_key_iv: input.encryptedPrivateKeyIv,
          encrypted_private_key_salt: input.encryptedPrivateKeySalt,
          first_name: input.firstName,
          last_name: input.lastName,
        })
        .where(eq(Schema.users.email, authenticatedEmail));
    }),

  /** @todo Remove this and use getSession everywhere instead of this */
  getMyKeys: privateProcedure.query(async ({ ctx }) => {
    const authenticatedEmail = ctx.user.email;
    if (!authenticatedEmail) {
      throw new Error("User does not have an email address set");
    }

    const [user] = await db
      .select({
        encrypted_private_key: Schema.users.encrypted_private_key,
        encrypted_private_key_iv: Schema.users.encrypted_private_key_iv,
        encrypted_private_key_salt: Schema.users.encrypted_private_key_salt,
        public_key: Schema.users.public_key,
      })
      .from(Schema.users)
      .where(eq(Schema.users.email, authenticatedEmail))
      .limit(1);

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

  getPublicKeysForUsers: privateProcedure.input(z.object({ user_emails: z.array(z.string()) })).mutation(async ({ input }) => {
    const users = await db
      .select({
        email: Schema.users.email,
        public_key: Schema.users.public_key,
      })
      .from(Schema.users)
      .where(inArray(Schema.users.email, input.user_emails));

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

      const sharedKeySetId = createId();
      const fileId = createId();

      await db.insert(Schema.sharedKeySets).values({ id: sharedKeySetId });

      for (const encryptedSharedKey of input.encrypted_keys_for_recipients) {
        const [user] = await db
          .select({ id: Schema.users.id })
          .from(Schema.users)
          .where(eq(Schema.users.email, encryptedSharedKey.email))
          .limit(1);
        if (!user) throw new Error("User not found");
        const sharedKeyId = createId();
        await db.insert(Schema.sharedKeys).values({
          encrypted_key: encryptedSharedKey.encrypted_shared_key,
          shared_key_set_id: sharedKeySetId,
          id: sharedKeyId,
        });
        await db.insert(Schema.fileAccesses).values({
          id: createId(),
          user_id: user.id,
          file_id: fileId,
          shared_key_id: sharedKeyId,
          original_sender: false,
          permission: "VIEWER",
        });
      }

      const sharedKeyId = createId();
      await db.insert(Schema.sharedKeys).values({
        encrypted_key: input.encrypted_key_for_self,
        shared_key_set_id: sharedKeySetId,
        id: sharedKeyId,
      });

      await db.insert(Schema.fileAccesses).values({
        id: createId(),
        user_id: ctx.user.id,
        file_id: fileId,
        shared_key_id: sharedKeyId,
        original_sender: true,
        permission: "OWNER",
      });

      await db.insert(Schema.files).values({
        id: fileId,
        iv: input.file_iv,
        encrypted_name: input.encrypted_filename,
        slug: createId(),
        storage_key: createId(),
      });
      const [file] = await db
        .select({ id: Schema.files.id, storage_key: Schema.files.storage_key, slug: Schema.files.slug })
        .from(Schema.files)
        .where(eq(Schema.files.id, fileId))
        .limit(1);
      if (!file) throw new Error(`File with id ${fileId} which was just inserted cannot be found`);

      // Add a one megabyte buffer in case the encrypted version of the file is a bit longer than the unencrypted version.
      const ONE_MEGABYTE_BYTES = 1_000_000;
      const maxFileSizeBytes = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_BYTES as string) + ONE_MEGABYTE_BYTES;

      const client = getS3Client();
      const { url, fields } = await createPresignedPost(client, {
        Bucket: portalsendFilesS3Bucket,
        Key: file.storage_key,
        Conditions: [
          { bucket: portalsendFilesS3Bucket },
          ["content-length-range", 0, maxFileSizeBytes], // 0 bytes to maxFilSize bytes
          ["starts-with", "$Content-Type", ""], // necessary because the frontend will add this form data
        ],
        Expires: 5 * 60, // seconds before the presigned post expires; 3600 by default
      });

      return {
        signed_url: url,
        form_data_fields: fields,
        file_slug: file.slug,
      };
    }),

  getFile: privateProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const [file] = await db
      .select({ encrypted_key: Schema.sharedKeys.encrypted_key, iv: Schema.files.iv })
      .from(Schema.fileAccesses)
      .where(and(eq(Schema.files.slug, input.slug), eq(Schema.fileAccesses.user_id, ctx.user.id)))
      .innerJoin(Schema.files, eq(Schema.files.id, Schema.fileAccesses.file_id))
      .innerJoin(Schema.sharedKeys, eq(Schema.sharedKeys.id, Schema.fileAccesses.shared_key_id))
      .limit(1);

    // NOT_FOUND is fine if the file exists but the user doesn't have access to it. This prevents revealing that the file exists.
    if (!file) throw new TRPCError({ code: "NOT_FOUND" });

    return {
      slug: input.slug,
      shared_key_encrypted_for_me: file.encrypted_key,
      iv: file.iv,
    };
  }),

  createFileSignedDownloadUrl: privateProcedure.input(z.object({ slug: z.string() })).mutation(async ({ input }) => {
    const [file] = await db
      .select({ storage_key: Schema.files.storage_key })
      .from(Schema.files)
      .where(eq(Schema.files.slug, input.slug))
      .limit(1);
    if (!file) throw new TRPCError({ code: "NOT_FOUND" });

    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: portalsendFilesS3Bucket,
      Key: file.storage_key,
    });
    const url = await getSignedUrl(client, command, { expiresIn: 5 * 60 });

    return { signed_download_url: url };
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

      const countRows = await db
        .select({ files_count: sql<number>`count(${Schema.files.id})`.as("files_count") })
        .from(Schema.fileAccesses)
        .where(eq(Schema.fileAccesses.user_id, ctx.user.id))
        .innerJoin(Schema.files, eq(Schema.files.id, Schema.fileAccesses.file_id));
      const totalCount = countRows[0]?.files_count;
      if (totalCount === undefined) throw new Error("Failed to query total file count");

      let itemsQuery = db
        .select({
          created_at: Schema.files.created_at,
          encrypted_key: Schema.sharedKeys.encrypted_key,
          encrypted_name: Schema.files.encrypted_name,
          iv: Schema.files.iv,
          slug: Schema.files.slug,
        })
        .from(Schema.fileAccesses)
        .where(eq(Schema.fileAccesses.user_id, ctx.user.id))
        .innerJoin(Schema.files, eq(Schema.files.id, Schema.fileAccesses.file_id))
        .innerJoin(Schema.sharedKeys, eq(Schema.sharedKeys.id, Schema.fileAccesses.shared_key_id))
        .orderBy(desc(Schema.files.created_at))
        .limit(input.limit);

      const cursor = input.cursor;
      if (cursor) {
        itemsQuery = itemsQuery.where(lte(Schema.files.created_at, cursor));
      }

      const items = await itemsQuery;

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop() as NonNullable<(typeof items)[number]>;
        nextCursor = nextItem.created_at;
      }

      const returnableItems = items.map((item) => {
        return {
          encrypted_filename: item.encrypted_name,
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
