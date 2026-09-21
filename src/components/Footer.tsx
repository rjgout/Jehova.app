import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-400 dark:text-slate-500">
      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col gap-3">
        <p>
          Deze website is een onafhankelijk initiatief en wordt niet gesponsord, ondersteund, goedgekeurd of
          onderhouden door De Kerk van Jezus Christus van de Heiligen der Laatste Dagen.
        </p>
        <div className="flex gap-4 flex-wrap">
          <Link href="/privacy" className="hover:text-brand-600 dark:hover:text-brand-300 underline">
            Privacybeleid
          </Link>
          <Link href="/cookies" className="hover:text-brand-600 dark:hover:text-brand-300 underline">
            Cookiebeleid
          </Link>
        </div>
      </div>
    </footer>
  );
}
