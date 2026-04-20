import { NextRequest, NextResponse } from "next/server";
import { getAccessFromRequest } from "@/lib/auth";
import { getDashboardReportByEmail } from "@/lib/db";

export async function GET(request: NextRequest) {
  const access = getAccessFromRequest(request);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await getDashboardReportByEmail(access.email);
    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}
