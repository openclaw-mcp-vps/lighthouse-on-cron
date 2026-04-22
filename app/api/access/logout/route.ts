import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(new URL("/dashboard", origin));
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/"
  });
  return response;
}
