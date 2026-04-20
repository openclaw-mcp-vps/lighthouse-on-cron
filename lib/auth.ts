import { type NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, getUserByAccessToken } from "@/lib/db";

export async function requireSubscribedUser(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return getUserByAccessToken(token);
}
