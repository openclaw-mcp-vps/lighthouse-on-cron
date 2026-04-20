import { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/access";

export function getAccessFromRequest(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifyAccessToken(token);
}
