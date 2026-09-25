import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { respondToFeedback } from "@/lib/feedback";
import { apiError, apiErrorText } from "@/lib/apiError";

const schema = z.object({ status: z.enum(["IN_PROGRESS", "DONE", "WONT_DO"]) });

// Bewust GEEN authenticatie — het respondToken zelf (lang, willekeurig, uit
// de e-mail naar de beheerder) is hier de toegangscontrole. Zie ook
// /feedback/respond/[token]/page.tsx: die pagina zelf is een veilige GET
// (toont alleen info), de status wijzigt pas op een bewuste klik hier.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  const result = await respondToFeedback(token, parsed.data.status);
  if (!result.ok) return await apiErrorText(result.error, 404);
  return NextResponse.json({ ok: true, status: result.feedback.status });
}
