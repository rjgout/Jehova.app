import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { consumeAuthToken } from "@/lib/authTokens";
import ResendVerificationButton from "@/components/ResendVerificationButton";
import { getT } from "@/lib/i18n";
import { rich } from "@/lib/i18n/rich";
import { requestLanguage } from "@/lib/requestLanguage";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getCurrentUser();
  const t = getT(await requestLanguage(user));

  if (token) {
    const userId = await consumeAuthToken(token, "EMAIL_VERIFY");
    if (!userId) {
      return (
        <div className="max-w-md mx-auto card text-center flex flex-col gap-4">
          <h1 className="text-xl font-extrabold text-red-600 dark:text-red-400">{t("verify.invalid")}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {t("verify.requestNew")}
          </p>
          <ResendVerificationButton />
        </div>
      );
    }
    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">{t("verify.confirmed")}</h1>
        <Link href="/dashboard" className="btn-primary self-center">
          {t("verify.toLessons")}
        </Link>
      </div>
    );
  }

  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/dashboard");

  return (
    <div className="max-w-md mx-auto card text-center flex flex-col gap-4">
      <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">{t("verify.title")}</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm">
        {rich(t("verify.sentTo"), { email: <strong>{user.email}</strong> })}
      </p>
      <ResendVerificationButton />
    </div>
  );
}
