import { prisma } from "@/lib/db";
import FeedbackRespondClient from "@/components/FeedbackRespondClient";
import { getCurrentUser } from "@/lib/session";
import { getT } from "@/lib/i18n";
import { requestLanguage } from "@/lib/requestLanguage";

// Bewust geen auth-check — het token in de URL (lang, willekeurig, alleen in
// de e-mail naar de beheerder) is hier de toegangscontrole. Zie
// src/lib/feedback.ts en /api/feedback/respond/[token].
export default async function FeedbackRespondPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const feedback = await prisma.feedback.findUnique({
    where: { respondToken: token },
    include: { user: { select: { handle: true, email: true } } },
  });

  if (!feedback) {
    return (
      <div className="max-w-md mx-auto card text-center">
        <p className="font-bold dark:text-slate-100">{getT(await requestLanguage(await getCurrentUser()))("apiErrors.notificationNotFound")}</p>
      </div>
    );
  }

  return (
    <FeedbackRespondClient
      token={token}
      submitterName={feedback.user.handle}
      submitterEmail={feedback.user.email}
      message={feedback.message}
      screenshot={feedback.screenshot}
      initialStatus={feedback.status}
      createdAt={feedback.createdAt.toISOString()}
    />
  );
}
