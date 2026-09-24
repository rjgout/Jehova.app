// Op iPhone/iPad klinkt Web Speech (voorlezen) standaard in de audiosessie
// voor "omgevingsgeluid": de stilknop dempt het, ook met het volume open. Een
// <audio>-element zoals de podcastspeler valt in de sessie voor "afspelen",
// die de stilknop negeert. Zolang er voorgelezen wordt, zetten we de pagina
// daarom ook in die afspeelsessie, op twee manieren omdat niet elke iOS-
// versie hetzelfde doet:
// 1. navigator.audioSession.type = "playback" (Safari 17 en nieuwer);
// 2. een stil, herhalend <audio>-geluid: bij oudere versies trekt dat de
//    hele pagina, spraak inbegrepen, de afspeelsessie in.
// Na afloop gaat alles terug naar "auto", zodat andere geluiden in de app
// (en muziek van een andere app) zich weer gewoon gedragen.

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

let silentAudio: HTMLAudioElement | null = null;
let silentUrl: string | null = null;

/** Een halve seconde stilte als WAV (8 kHz, 8 bit mono): klein, en overal af te spelen. */
function silentWavUrl(): string {
  if (silentUrl) return silentUrl;
  const samples = 4000;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, "data");
  view.setUint32(40, samples, true);
  // 8-bit PCM is zonder teken: 128 is stilte, 0 zou een klik zijn.
  new Uint8Array(buffer, 44).fill(128);
  silentUrl = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  return silentUrl;
}

function setSessionType(type: "playback" | "auto") {
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (!session) return;
  try {
    session.type = type;
  } catch {
    // Onbekend type in een oudere versie: dan doet het stille geluid het werk.
  }
}

/**
 * Aanroepen vlak voor het voorlezen, bij voorkeur vanuit een tik: iOS laat
 * het stille geluid alleen na een tik starten. Lukt dat niet (automatisch
 * voorlezen), dan wordt er gewoon voorgelezen zoals voorheen.
 */
export function beginSpeechPlayback() {
  if (typeof window === "undefined") return;
  setSessionType("playback");
  if (!silentAudio) {
    silentAudio = new Audio(silentWavUrl());
    silentAudio.loop = true;
  }
  silentAudio.play().catch(() => {});
}

/** Na afloop, pauze of stoppen van het voorlezen. */
export function endSpeechPlayback() {
  if (typeof window === "undefined") return;
  silentAudio?.pause();
  setSessionType("auto");
}
