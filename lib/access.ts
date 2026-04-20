import { createHmac, timingSafeEqual } from "crypto";

export const ACCESS_COOKIE_NAME = "lighthouse_access";
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;

export type AccessPayload = {
  email: string;
  plan: "starter" | "unlimited";
  iat: number;
  exp: number;
};

function getSecret() {
  return process.env.ACCESS_TOKEN_SECRET ?? "local-dev-access-secret-change-me";
}

function toBase64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${pad}`, "base64");
}

function sign(data: string) {
  return toBase64Url(createHmac("sha256", getSecret()).update(data).digest());
}

export function createAccessToken(email: string, plan: "starter" | "unlimited") {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessPayload = {
    email,
    plan,
    iat: now,
    exp: now + ACCESS_TTL_SECONDS
  };

  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export function verifyAccessToken(token: string): AccessPayload | null {
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return null;
  }

  const expectedSignature = sign(payloadEncoded);

  try {
    const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(fromBase64Url(payloadEncoded).toString("utf-8")) as AccessPayload;
    if (!payload.email || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (payload.plan !== "starter" && payload.plan !== "unlimited") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
