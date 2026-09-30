import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { PrismaClient } from "@prisma/client";

// Eigen kopie van de voorgelezen hoofdstukken van de kerk, zodat afspelen
// niet afhangt van hun server of van links die daar verhuizen.
//
// Chapter.audioUrl blijft bewust de bron-URL van de kerk: de metadata
// (prisma/bomAudio*.json) en de import blijven ongewijzigd, en elke uitgave
// met audio (elke taal, elk werk) wordt vanzelf meegenomen zodra die in de
// database staat. Pas bij het afspelen wordt de link vervangen door de eigen
// kopie (playableAudioUrl); ontbreekt die nog, dan speelt de app gewoon de
// bron af, zodat niets breekt zolang het spiegelen nog niet klaar is.
//
// Geen next/headers of andere request-API's: chapterGuess.ts (eager-keten
// van server.ts) gebruikt dit bestand ook.

// De bestandsnaam volgt de bron-URL. Een nieuwe opname krijgt bij de kerk een
// nieuwe URL, en daarmee hier vanzelf een nieuw bestand in plaats van een
// verouderde kopie onder dezelfde naam.
const FILE_NAME = /^[A-Za-z0-9._-]{1,200}\.mp3$/;
const ALLOWED_HOSTS = new Set(["assets.churchofjesuschrist.org", "media2.ldscdn.org"]);
const CONCURRENCY = 3;
const ATTEMPTS = 3;
const TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Map met de kopieën. Zonder AUDIO_DIR wordt er niets gespiegeld (bv. bij
 * lokaal ontwikkelen: een seed hoort dan niet ruim een gigabyte op te halen);
 * de Docker-image zet hem standaard.
 */
export function audioDir(): string | null {
  const dir = process.env.AUDIO_DIR?.trim();
  // turbopackIgnore: de map staat buiten het project (een volume) en hoort
  // niet in de bundelanalyse van Next mee te tellen.
  return dir ? path.resolve(/*turbopackIgnore: true*/ dir) : null;
}

export function isAudioFileName(name: string): boolean {
  return FILE_NAME.test(name) && !name.startsWith(".");
}

/** Bestandsnaam voor de kopie, of null als deze bron niet gespiegeld wordt. */
export function mirrorFileName(sourceUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) return null;
  const name = decodeURIComponent(url.pathname.split("/").pop() ?? "");
  return isAudioFileName(name) ? name : null;
}

/** De link voor de speler: de eigen kopie als die er is, anders de bron. */
export function playableAudioUrl(sourceUrl: string): string;
export function playableAudioUrl(sourceUrl: string | null): string | null;
export function playableAudioUrl(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;
  const dir = audioDir();
  const name = mirrorFileName(sourceUrl);
  if (!dir || !name) return sourceUrl;
  return fs.existsSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ dir, name)) ? `/api/audio/${name}` : sourceUrl;
}

async function download(url: string, target: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  // Een foutpagina of omleiding naar een webpagina mag nooit als mp3 op
  // schijf belanden: die zou daarna "gevonden" worden en nooit meer spelen.
  if (!type.startsWith("audio/") && type !== "application/octet-stream") throw new Error(`onverwacht type ${type || "(leeg)"}`);
  const expected = Number(response.headers.get("content-length") ?? "0");

  // Eerst naar een tijdelijk bestand en pas bij een complete download
  // hernoemen: een afgebroken download telt zo nooit als kopie.
  const temp = `${target}.${process.pid}.${randomBytes(4).toString("hex")}.part`;
  try {
    await pipeline(Readable.fromWeb(response.body as import("node:stream/web").ReadableStream), fs.createWriteStream(temp));
    const { size } = await fs.promises.stat(temp);
    if (size === 0 || (expected > 0 && size !== expected)) throw new Error(`onvolledig (${size} van ${expected} bytes)`);
    await fs.promises.rename(temp, target);
  } finally {
    await fs.promises.rm(temp, { force: true });
  }
}

/**
 * Haalt de audio op van elk hoofdstuk dat er nog geen kopie van heeft.
 * Idempotent en veilig om vaak te draaien: wat er al staat wordt
 * overgeslagen. Gooit nooit: een onbereikbare kerkserver mag het laden van
 * content niet laten mislukken; die hoofdstukken spelen dan (nog) van de bron.
 */
export async function mirrorChapterAudio(prisma: PrismaClient, log: (msg: string) => void = console.log): Promise<void> {
  const dir = audioDir();
  if (!dir) {
    log("  Audio: AUDIO_DIR is niet ingesteld, voorgelezen hoofdstukken worden niet gespiegeld.");
    return;
  }
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (e) {
    log(`  Audio: kan map ${dir} niet aanmaken (${e instanceof Error ? e.message : e}), spiegelen overgeslagen.`);
    return;
  }

  const rows = await prisma.chapter.findMany({
    where: { audioUrl: { not: null } },
    select: { audioUrl: true },
    distinct: ["audioUrl"],
  });
  const sources = new Map<string, string>();
  for (const { audioUrl } of rows) {
    const name = audioUrl ? mirrorFileName(audioUrl) : null;
    if (audioUrl && name) sources.set(name, audioUrl);
  }
  const missing = [...sources].filter(([name]) => !fs.existsSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ dir, name)));
  if (missing.length === 0) {
    log(`  Audio: alle ${sources.size} bestanden staan al lokaal.`);
    return;
  }
  log(`  Audio: ${missing.length} van ${sources.size} bestanden ophalen naar ${dir}...`);

  let done = 0;
  const failed: string[] = [];
  const queue = [...missing];
  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [name, url] = next;
      let lastError = "";
      for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        try {
          await download(url, path.join(dir!, name));
          lastError = "";
          break;
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
          if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
        }
      }
      if (lastError) failed.push(`${name} (${lastError})`);
      done += 1;
      if (done % 25 === 0 && done < missing.length) log(`  Audio: ${done} van ${missing.length} verwerkt...`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  log(
    `  Audio: ${missing.length - failed.length} bestanden opgehaald` +
      (failed.length ? `, ${failed.length} mislukt (spelen voorlopig van de bron): ${failed.slice(0, 5).join(", ")}${failed.length > 5 ? ", ..." : ""}` : "") +
      "."
  );
}
