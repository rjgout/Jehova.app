import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { refreshCurrentStreak } from "@/lib/streak";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.userId ?? null;
}

export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const currentStreak = await refreshCurrentStreak(user.id);
  if (currentStreak === user.currentStreak) return user;

  return { ...user, currentStreak };
}

