// Groepen in het meldingencentrum (zie NotificationCenter.tsx). Puur data,
// veilig voor zowel server (notify.ts) als client. Volgorde = volgorde van de
// groepen als ze even nieuw zijn.
export const NOTIFICATION_GROUPS = {
  games: { label: "Live spellen", icon: "🎮" },
  wordgame: { label: "Woordspel", icon: "🔤" },
  challenges: { label: "Uitdagingen", icon: "⚔️" },
  friends: { label: "Vrienden", icon: "👥" },
  achievements: { label: "Prestaties", icon: "🏅" },
  competition: { label: "Competitie", icon: "🏆" },
} as const;

export type NotificationKind = keyof typeof NOTIFICATION_GROUPS;

export function notificationGroup(kind: string): { label: string; icon: string } {
  return NOTIFICATION_GROUPS[kind as NotificationKind] ?? { label: "Meldingen", icon: "🔔" };
}
