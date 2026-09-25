import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { setMaintenanceMode, isDeployAgentConfigured } from "@/lib/deployAgent";
import { apiError } from "@/lib/apiError";

const schema = z.object({ on: z.boolean() });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);
  if (!isDeployAgentConfigured()) return await apiError("apiErrors.deployAgentNotConfigured", 501);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  try {
    const { status, body } = await setMaintenanceMode(parsed.data.on);
    return NextResponse.json(body, { status });
  } catch {
    return await apiError("apiErrors.deployAgentUnreachable", 502);
  }
}
