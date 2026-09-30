/**
 * Download audiobestanden voor schriftboeken van de kerkserver naar lokale opslag.
 *
 * Herbruikbaar:
 * - Via CLI: `npx tsx scripts/download-audio.ts`
 * - Via admin: `/api/admin/reseed` (roept downloadAudio aan via seed.ts)
 *
 * Ondersteunde talen:
 * - Nederlands (NL): bomAudio.json ✓
 * - Engels (EN): metadata nodig (bomAudio.en.json)
 * - Duits (DE): metadata nodig (bomAudio.de.json)
 * - Frans (FR): metadata nodig (bomAudio.fr.json)
 *
 * Toekomstig: ook L&V (Leer en Verbonden) en PGP (Parel van Grote Waarde)
 */

import fs from "fs";
import path from "path";
import https from "https";

interface AudioMetadata {
  book: string;
  chapter: number;
  url: string;
  headingStart: number;
  headingEnd: number;
  verseStarts: number[];
}

interface AudioLanguageConfig {
  code: string;
  name: string;
  metadataFile: string;
}

const AUDIO_DIR = process.env.AUDIO_STORAGE_DIR || "./public/audio";
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

/** Audio-metadata bestanden per taal. Voeg hier nieuwe talen toe als metadata beschikbaar wordt. */
const AUDIO_LANGUAGES: AudioLanguageConfig[] = [
  { code: "nl", name: "Nederlands", metadataFile: "prisma/bomAudio.json" },
  // { code: "en", name: "English", metadataFile: "prisma/bomAudio.en.json" },
  // { code: "de", name: "Deutsch", metadataFile: "prisma/bomAudio.de.json" },
  // { code: "fr", name: "Français", metadataFile: "prisma/bomAudio.fr.json" },
];

/**
 * Download een bestand met retries
 */
async function downloadFile(
  url: string,
  targetPath: string,
  retries = 0
): Promise<boolean> {
  return new Promise((resolve) => {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Skip als bestand al bestaat en compleet is
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      if (stats.size > 1000) {
        console.log(`✓ Bestaat al: ${path.relative(AUDIO_DIR, targetPath)}`);
        resolve(true);
        return;
      }
    }

    const file = fs.createWriteStream(targetPath);
    https
      .get(url, { timeout: 30000 }, (response) => {
        if (response.statusCode !== 200) {
          fs.unlink(targetPath, () => {});
          if (retries < MAX_RETRIES) {
            console.log(
              `  → Retry (${retries + 1}/${MAX_RETRIES}): ${path.basename(targetPath)}`
            );
            setTimeout(
              () =>
                downloadFile(url, targetPath, retries + 1).then(resolve),
              RETRY_DELAY
            );
          } else {
            console.error(
              `✗ Fout (${response.statusCode}): ${path.basename(targetPath)}`
            );
            resolve(false);
          }
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log(
            `✓ Downloaded: ${path.relative(AUDIO_DIR, targetPath)}`
          );
          resolve(true);
        });
      })
      .on("error", (e) => {
        fs.unlink(targetPath, () => {});
        if (retries < MAX_RETRIES) {
          console.log(
            `  → Retry (${retries + 1}/${MAX_RETRIES}): ${path.basename(targetPath)}`
          );
          setTimeout(
            () =>
              downloadFile(url, targetPath, retries + 1).then(resolve),
            RETRY_DELAY
          );
        } else {
          console.error(`✗ Fout: ${path.basename(targetPath)} - ${e.message}`);
          resolve(false);
        }
      });
  });
}

/**
 * Download alle audiobestanden voor een taal
 */
async function downloadAudioForLanguage(
  config: AudioLanguageConfig
): Promise<{ downloaded: number; failed: number; skipped: boolean }> {
  if (!fs.existsSync(config.metadataFile)) {
    return { downloaded: 0, failed: 0, skipped: true };
  }

  console.log(`\n📥 ${config.name} (${config.code})`);

  const metadata: AudioMetadata[] = JSON.parse(
    fs.readFileSync(config.metadataFile, "utf-8")
  );

  let downloaded = 0;
  let failed = 0;

  for (const item of metadata) {
    const filename = `${config.code}/${item.book}/${String(item.chapter).padStart(3, "0")}.mp3`;
    const targetPath = path.join(AUDIO_DIR, filename);

    const success = await downloadFile(item.url, targetPath);
    if (success) {
      downloaded++;
    } else {
      failed++;
    }
  }

  console.log(
    `  Klaar: ${downloaded}/${metadata.length} (${failed} mislukt)`
  );
  return { downloaded, failed, skipped: false };
}

/**
 * Herbruikbare download-functie voor CLI en seed
 */
export async function downloadAudio(
  logFn: (msg: string) => void = console.log
): Promise<{ totalDownloaded: number; totalFailed: number }> {
  logFn("🎵 Audio bestanden downloaden...");
  logFn(`   Opslag: ${AUDIO_DIR}`);

  let totalDownloaded = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const lang of AUDIO_LANGUAGES) {
    const result = await downloadAudioForLanguage(lang);
    if (result.skipped) {
      totalSkipped++;
    } else {
      totalDownloaded += result.downloaded;
      totalFailed += result.failed;
    }
  }

  if (totalSkipped > 0) {
    logFn(`⊘ ${totalSkipped} taal(talen) overgeslagen (geen metadata)`);
  }

  logFn(`✓ Totaal: ${totalDownloaded} bestanden gedownload`);
  if (totalFailed > 0) {
    logFn(`⚠ ${totalFailed} downloads mislukt`);
  }

  return { totalDownloaded, totalFailed };
}

/**
 * CLI entrypoint
 */
async function main() {
  const { totalFailed } = await downloadAudio();
  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
