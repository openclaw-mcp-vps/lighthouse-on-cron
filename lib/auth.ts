import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const ACCESS_COOKIE_NAME = "lh_access";

interface AccessPayload {
  email: string;
  exp: number;
}

function getSecret() {
  return (
    process.env.AUTH_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    "dev-secret-change-me-before-production"
  );
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createAccessToken(email: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const payload: AccessPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds
  };

  const encoded = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAccessToken(token: string | undefined | null): AccessPayload | null {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = sign(encoded);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encoded)) as AccessPayload;
    if (!payload.email || !payload.exp) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
