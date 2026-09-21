export const READ_ALOUD_VOICE_KEY = "jehovaapp-read-aloud-voice";

export function getDutchVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];

  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("nl"));
}

export function getSelectedDutchVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  const selectedUri = window.localStorage.getItem(READ_ALOUD_VOICE_KEY);
  if (!selectedUri) return null;

  return getDutchVoices().find((voice) => voice.voiceURI === selectedUri) ?? null;
}

export function saveSelectedDutchVoice(voiceUri: string | null) {
  if (typeof window === "undefined") return;

  if (voiceUri) {
    window.localStorage.setItem(READ_ALOUD_VOICE_KEY, voiceUri);
  } else {
    window.localStorage.removeItem(READ_ALOUD_VOICE_KEY);
  }
}
