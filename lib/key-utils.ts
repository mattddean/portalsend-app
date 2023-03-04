export const stringToUint8Array = (str: string) => {
  const uint8Array = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    uint8Array[i] = str.charCodeAt(i);
  }
  return uint8Array;
};

export const arrayBufferToString = (buf: ArrayBuffer) => {
  // This seems to work, despite the type being wrong.
  return String.fromCharCode.apply(null, new Uint8Array(buf) as unknown as number[]);
};

const deriveKey = async (masterPassword: string, salt: Uint8Array) => {
  const masterPasswordAsKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const derivedKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    masterPasswordAsKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  return derivedKey;
};

/**
 * Take in an RSA private key and return an encrypted version of it which could be passed
 * into decryptRsaPrivateKey as its encryptedPrivateKey argument. Does some additional
 * transformation to make sure the key and its generated iv can be stored nicely as a single
 * string in a database.
 */
export const encryptRsaPrivateKey = async (keyPair: CryptoKeyPair, masterPassword: string, salt: Uint8Array) => {
  // Export the private key as a JWK
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  // Convert the private key JWK to a string
  const privateKeyString = JSON.stringify(privateKeyJwk);

  // Derive AES key from master password.
  const aesKey = await deriveKey(masterPassword, salt);

  // Encrypt the private key string using AES
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedString = new TextEncoder().encode(privateKeyString);
  const cipherText = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, aesKey, encodedString);

  // Convert ArrayBuffer to string
  const ciphertextString = arrayBufferToString(cipherText);
  const ivString = arrayBufferToString(iv);

  return {
    ciphertextString,
    ivString,
  };
};

/**
 * Take in an RSA private key produced by encryptRsaPrivateKey and return the raw version of it
 * as a CryptoKey.
 */
export const decryptRsaPrivateKey = async (
  encryptedPrivateKey: string,
  masterPassword: string,
  salt: Uint8Array,
  ivString: string,
) => {
  // Save the cipherText and the AES key
  const cipherTextUint8 = stringToUint8Array(encryptedPrivateKey);
  const iv = stringToUint8Array(ivString);

  const aesKey = await deriveKey(masterPassword, salt);

  // Later on, import the encrypted private key string as a CryptoKey
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, aesKey, cipherTextUint8);
  const decryptedString = new TextDecoder().decode(new Uint8Array(decrypted));
  const importedKey = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(decryptedString) as JsonWebKey,
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    },
    true,
    ["decrypt"],
  );
  return importedKey;
};

export const generateRsaKeyPair = async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt", "decrypt"],
  );
  return keyPair;
};

export const serializeKey = async (key: CryptoKey) => {
  // Export the private key as a JWK
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", key);

  // Convert the private key JWK to a string
  const privateKeyString = JSON.stringify(privateKeyJwk);
  return privateKeyString;
};

export const encryptAesKey = async (aesKey: CryptoKey, rsaPublicKey: string) => {
  const importedPublicKey = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(rsaPublicKey) as JsonWebKey,
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt"],
  );

  // Export the private key as a JWK
  const aesKeyJwk = await crypto.subtle.exportKey("jwk", aesKey);

  // Convert the private key JWK to a string
  const privateKeyString = JSON.stringify(aesKeyJwk);

  // Encrypt the private key string using AES
  const encodedString = new TextEncoder().encode(privateKeyString);
  const cipherText = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, importedPublicKey, encodedString);

  //Convert ArrayBuffer to string
  const encryptedAesKeyString = arrayBufferToString(cipherText);
  return encryptedAesKeyString;
};

export const encryptFile = (file: File, importedAesKey: CryptoKey, iv: Uint8Array) => {
  const reader = new FileReader();
  reader.readAsArrayBuffer(file);

  return new Promise<Uint8Array>((resolve, reject) => {
    reader.onload = async () => {
      if (!reader.result || typeof reader.result === "string") return reject("Invalid reader result");
      const buffer = new Uint8Array(reader.result);
      const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv: iv }, importedAesKey, buffer);
      const encryptedFileUint8 = new Uint8Array(encrypted);
      return resolve(encryptedFileUint8);
    };
  });
};

export const decryptFile = (file: File, sharedAesKey: CryptoKey, iv: Uint8Array) => {
  const reader = new FileReader();
  reader.readAsArrayBuffer(file);

  return new Promise<Uint8Array>((resolve, reject) => {
    reader.onload = async () => {
      if (!reader.result || typeof reader.result === "string") return reject("Invalid reader result");
      const buffer = new Uint8Array(reader.result);
      const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, sharedAesKey, buffer);
      const decryptedFile = new Uint8Array(decrypted);
      return resolve(decryptedFile);
    };
  });
};

export const encryptFilename = async (filename: string, aesKey: CryptoKey, iv: Uint8Array) => {
  const buffer = stringToUint8Array(filename);
  const encryptedFilename = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, aesKey, buffer);
  return new Uint8Array(encryptedFilename);
};

export const decryptFilename = async (encryptedFilename: string, aesKey: CryptoKey, iv: Uint8Array) => {
  const buffer = stringToUint8Array(encryptedFilename);
  const decryptedFilename = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aesKey, buffer);
  return new Uint8Array(decryptedFilename);
};
