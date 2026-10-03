"use client";

// Client-only helpers voor het aan-/uitzetten van browser-pushnotificaties.
// Bewust geen React-hook: ProfileClient roept dit rechtstreeks aan vanuit
// een toggle-handler.

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Vraagt browsertoestemming en registreert een pushsubscriptie op de
 * server. Gooit een leesbare fout als toestemming geweigerd wordt of de
 * browser geen push ondersteunt — de aanroeper toont die aan de gebruiker.
 */
export async function enableBrowserPush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("Deze browser ondersteunt geen pushnotificaties.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Toestemming voor notificaties geweigerd.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const keyRes = await fetch("/api/push/public-key");
  if (!keyRes.ok) throw new Error("Kon geen verbinding maken met de server.");
  const { publicKey } = await keyRes.json();

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!res.ok) throw new Error("Kon de pushsubscriptie niet opslaan.");
}

/** Zet zowel de browser-subscriptie als de servervoorkeur uit. */
export async function disableBrowserPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => {});
    await subscription.unsubscribe().catch(() => {});
  }
}
