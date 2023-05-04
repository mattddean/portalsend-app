import { boolean, datetime, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const accounts = mysqlTable(
  "accounts",
  {
    id: varchar("id", { length: 191 }).primaryKey().notNull(),
    user_id: varchar("user_id", { length: 191 }).notNull(),
    type: varchar("type", { length: 191 }).notNull(),
    provider: varchar("provider", { length: 191 }).notNull(),
    provider_account_id: varchar("provider_account_id", { length: 191 }).notNull(),
    access_token: text("access_token"),
    expires_in: int("expires_in"),
    id_token: text("id_token"),
    refresh_token: text("refresh_token"),
    refresh_token_expires_in: int("refresh_token_expires_in"),
    scope: varchar("scope", { length: 191 }),
    token_type: varchar("token_type", { length: 191 }),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (account) => ({
    provider__provider_account_id__index: uniqueIndex("accounts__provider__providerAccountId__idx").on(
      account.provider,
      account.provider_account_id,
    ),
    user_id__index: index("accounts__userId__idx").on(account.user_id),
  }),
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 191 }).primaryKey().notNull(),
    session_token: varchar("session_token", { length: 191 }).notNull(),
    user_id: varchar("user_id", { length: 191 }).notNull(),
    expires: datetime("expires").notNull(),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (session) => ({
    session_token__index: uniqueIndex("sessions__sessionToken__idx").on(session.session_token),
    user_id__index: index("sessions__userId__idx").on(session.user_id),
  }),
);

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 191 }).primaryKey().notNull(),
    name: varchar("name", { length: 191 }),
    email: varchar("email", { length: 191 }).notNull(),
    email_verified: timestamp("email_verified"),
    image: varchar("image", { length: 191 }),
    first_name: varchar("first_name", { length: 191 }),
    last_name: varchar("last_name", { length: 191 }),

    /** RSA private key exported as JWK, encrypted with AES, then base64 encoded */
    encrypted_private_key: text("encrypted_private_key"),
    /** Initialization vector used to encrypt encrypted_private_key with AES, base64 encoded */
    encrypted_private_key_iv: text("encrypted_private_key_iv"),
    /** Salt used to encrypt encrypted_private_key with AES, base64 encoded */
    encrypted_private_key_salt: text("encrypted_private_key_salt"),
    /** RSA public key exported as JWK then base64 encoded */
    public_key: text("public_key"),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (user) => ({
    email__index: uniqueIndex("users__email__idx").on(user.email),
  }),
);

export const filedrops = mysqlTable(
  "filedrops",
  {
    id: varchar("id", { length: 191 }).primaryKey().notNull(),
    slug: varchar("slug", { length: 191 }).notNull(),
    /** RSA private key exported as JWK, encrypted with AES, then base64 encoded */
    encrypted_private_key: text("encrypted_private_key"),
    /** Initialization vector used to encrypt encrypted_private_key with AES, base64 encoded */
    encrypted_private_key_iv: text("encrypted_private_key_iv"),
    /** Salt used to encrypt encrypted_private_key with AES, base64 encoded */
    encrypted_private_key_salt: text("encrypted_private_key_salt"),
    /** RSA public key exported as JWK then base64 encoded */
    public_key: text("public_key"),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (filedrop) => ({
    slug__index: uniqueIndex("filedrops__slug__idx").on(filedrop.slug),
  }),
);

export const verificationTokens = mysqlTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 191 }).primaryKey().notNull(),
    token: varchar("token", { length: 191 }).notNull(),
    expires: datetime("expires").notNull(),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (verificationToken) => ({
    token__index: uniqueIndex("verification_tokens__token__idx").on(verificationToken.token),
  }),
);

export const fileAccessPermission = mysqlEnum("file_access_permission", [
  "OWNER",
  // "EDITOR" // TODO: add functionality around this permission
  "VIEWER",
]);

/**
 * Stores the permission that a user has to a file along with the shared key
 * that the user can use to access the file.
 */
export const fileAccesses = mysqlTable(
  "file_accesses",
  {
    id: varchar("id", { length: 191 }).primaryKey().notNull(),
    user_id: varchar("user_id", { length: 191 }).notNull(),
    file_id: varchar("file_id", { length: 191 }).notNull(),
    shared_key_id: varchar("shared_key_id", { length: 191 }).notNull(),
    permission: fileAccessPermission.notNull(),
    original_sender: boolean("original_sender").notNull(),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (fileAccess) => ({
    user_id__index: index("file_accesses__user_id__index").on(fileAccess.user_id),
    file_id__index: index("file_accesses__file_id__index").on(fileAccess.file_id),
    shared_key_id__index: index("file_accesses__shared_key_id__index").on(fileAccess.shared_key_id),
  }),
);

/** One key in a shared key set. */
export const sharedKeys = mysqlTable(
  "shared_keys",
  {
    id: varchar("id", { length: 191 }).primaryKey().notNull(),
    /** Key encrypted with the owning user's public key, base64 encoded. */
    encrypted_key: text("user_id").notNull(),
    shared_key_set_id: varchar("shared_key_set_id", { length: 191 }).notNull(),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (sharedKey) => ({
    shared_key_set_id__index: index("shared_keys__shared_key_set_id__index").on(sharedKey.shared_key_set_id),
  }),
);

/** A set of AES keys encrypted for different users which all decrypt to the same key. */
export const sharedKeySets = mysqlTable("shared_key_sets", {
  id: varchar("id", { length: 191 }).primaryKey().notNull(),

  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const files = mysqlTable(
  "files",
  {
    id: varchar("id", { length: 191 }).primaryKey().notNull(),
    /** S3 key. */
    // TODO: consider adding a storage_provider property which is an enum where we just store "s3" for now.
    storage_key: varchar("storage_key", { length: 191 }).notNull(),
    /** Initialization vector used to encrypt the file and its name, base64 encoded. */
    iv: text("iv").notNull(),
    /** URL slug that will serve as the file's download page. */
    slug: varchar("slug", { length: 191 }).notNull(),
    /** Encrypted display name of the file, including its extension if given, base64 encoded */
    encrypted_name: text("encrypted_name").notNull(),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (file) => ({
    slug__index: uniqueIndex("files__slug__index").on(file.slug),
  }),
);
