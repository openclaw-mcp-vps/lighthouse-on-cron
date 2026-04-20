import { NextRequest, NextResponse } from "next/server";
import { requireSubscribedUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSubscribedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dashboardData = await getDashboardData(user.id);
    return NextResponse.json({ reports: dashboardData.reports });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
