import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { buyHints } from "@/lib/shop";
import { apiError, apiErrorText } from "@/lib/apiError";

const schema = z.object({ quantity: z.number().int().min(1).max(1000).optional() });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  const result = await buyHints(user.id, parsed.data.quantity ?? 1);
  if (!result.ok) return await apiErrorText(result.error, 400);
  return NextResponse.json(result);
}
