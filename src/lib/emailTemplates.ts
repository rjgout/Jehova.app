import { APP_NAME } from "@/lib/brand";
import type { TFunction } from "@/lib/i18n/core";

// Elke mail in de taal van de ontvanger (User.uiLanguage, via getT).

const BUTTON_STYLE = "background:#16a34a;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:bold";

function wrap(t: TFunction, bodyHtml: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937">
    <h1 style="color:#166534;font-size:20px">${APP_NAME}</h1>
    ${bodyHtml}
    <p style="color:#9ca3af;font-size:12px;margin-top:32px">${t("emails.autoSent")}</p>
  </div>`;
}

function linkBlock(t: TFunction, link: string, buttonLabel: string, validity: string): string {
  return `<p><a href="${link}" style="${BUTTON_STYLE}">${buttonLabel}</a></p>
       <p style="color:#6b7280;font-size:13px">${t("emails.copyLink", { link })}</p>
       <p style="color:#6b7280;font-size:13px">${validity}</p>`;
}

export function verifyEmailTemplate(t: TFunction, link: string) {
  return {
    subject: t("emails.verifySubject", { app: APP_NAME }),
    html: wrap(t, `<p>${t("emails.verifyIntro")}</p>
       ${linkBlock(t, link, t("emails.verifyButton"), t("emails.valid24h"))}`),
    text: t("emails.verifyText", { link }),
  };
}

export function resetPasswordTemplate(t: TFunction, link: string) {
  return {
    subject: t("emails.resetSubject", { app: APP_NAME }),
    html: wrap(t, `<p>${t("emails.resetIntro")}</p>
       ${linkBlock(t, link, t("emails.resetButton"), t("emails.valid1hIgnore"))}`),
    text: t("emails.resetText", { link }),
  };
}

// Anders dan resetPasswordTemplate hierboven: het huidige wachtwoord is hier
// al ongeldig gemaakt (zie de admin-resetroute), dus "negeer deze mail als
// je dit niet was" zou hier verwarrend zijn — inloggen kan pas weer via
// deze link.
export function adminPasswordResetTemplate(t: TFunction, link: string) {
  return {
    subject: t("emails.adminResetSubject", { app: APP_NAME }),
    html: wrap(t, `<p>${t("emails.adminResetIntro")}</p>
       ${linkBlock(t, link, t("emails.resetButton"), t("emails.valid1h"))}`),
    text: t("emails.adminResetText", { link }),
  };
}
