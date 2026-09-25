import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDeployStatus, isDeployAgentConfigured } from "@/lib/deployAgent";
import { apiError } from "@/lib/apiError";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);
  if (!isDeployAgentConfigured()) return await apiError("apiErrors.deployAgentNotConfigured", 501);

  try {
    const { status, body } = await getDeployStatus();
    return NextResponse.json(body, { status });
  } catch {
    return await apiError("apiErrors.deployAgentUnreachable", 502);
  }
}
