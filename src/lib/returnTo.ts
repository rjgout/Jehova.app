// Terug naar waar je vandaan kwam na inloggen of registreren (bv. een
// groepslink van een poster). Alleen paden binnen de app: "//" of "/\\" zou
// de browser als ander domein lezen, en dan kan een link je na het inloggen
// naar een nagemaakte site sturen. Puur client-side hulpcode.

const STORAGE_KEY = "versado.returnTo";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}

/**
 * Onthoudt het doel ook in de browser: na registreren loopt de weg via de
 * e-mailbevestiging en een nieuwe inlog, waarbij de ?next= uit de adresbalk
 * verloren gaat.
 */
export function rememberReturnTo(path: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // Privémodus of geblokkeerde opslag: dan alleen via ?next=.
  }
}

/** Het onthouden doel (eenmalig), of null. */
export function takeReturnTo(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number };
    if (typeof at !== "number" || Date.now() - at > MAX_AGE_MS) return null;
    return safeReturnPath(path);
  } catch {
    return null;
  }
}
