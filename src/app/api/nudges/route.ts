import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { sendNudge } from "@/lib/social/nudges";
import { socialError } from "@/lib/social/http";

const schema = z.object({
  recipientId: z.string().trim().min(1),
  context: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("general") }),
    z.object({ kind: z.literal("friend-streak") }),
    z.object({ kind: z.literal("group"), groupId: z.string().trim().min(1) }),
  ]),
});

/** Seintje geven: geen XP, geen teller. Grenzen en vriendschap worden in nudges.ts gecontroleerd. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);
  try {
    return NextResponse.json(await sendNudge(user.id, parsed.data.recipientId, parsed.data.context));
  } catch (error) {
    return socialError(error);
  }
}
