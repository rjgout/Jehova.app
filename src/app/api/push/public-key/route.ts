import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getVapidPublicKey } from "@/lib/push";
import { apiError } from "@/lib/apiError";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  return NextResponse.json({ publicKey: await getVapidPublicKey() });
}
