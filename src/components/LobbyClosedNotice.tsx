import Link from "next/link";

/** Zie useLobbyExit: kort zichtbaar voordat je terug naar Spelen gaat. */
export default function LobbyClosedNotice() {
  return (
    <div className="max-w-md mx-auto card text-center flex flex-col gap-3" role="status">
      <span className="text-4xl" aria-hidden>
        🚪
      </span>
      <p className="font-extrabold dark:text-slate-100">De host heeft dit spel beëindigd.</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">Je gaat terug naar Spelen…</p>
      <Link href="/live" className="btn-secondary self-center">
        Nu naar Spelen
      </Link>
    </div>
  );
}
