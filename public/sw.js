// Service worker voor Web Push + PWA-installeerbaarheid. Bewust GEEN
// offline-caching van pagina's/data: dit is een dynamische, ingelogde app
// (lessen, voortgang, live spel, woordspel) — content cachen zou al snel
// verouderde of verkeerde (andere-gebruiker-achtige) data tonen. De
// fetch-listener hieronder is daarom een kale doorgeefluik, alleen om aan
// installeerbaarheidscriteria (Chrome "toevoegen aan startscherm") te
// voldoen; hij verandert het netwerkgedrag niet.

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  let data = { title: "Jehova", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // negeer onverwachte payload-vorm, val terug op de defaults hierboven
  }

  // De Badging API hangt in een service worker aan self.navigator, niet aan
  // self.registration. Een synchrone fout hier zou event.waitUntil overslaan,
  // en iOS trekt een push-abonnement in als een push geen melding toont.
  //
  // Staat de app op dit apparaat open en in beeld, dan zie je de melding al:
  // geen badge zetten (die bleef anders staan na het sluiten, omdat de app
  // niet opnieuw "in beeld komt"), maar de open app laten weten dat de
  // teller op de server weer op nul mag (zie NotificationBadgeClear.tsx).
  const setBadge = async () => {
    if (typeof data.badge !== "number" || data.badge <= 0) return;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true }).catch(() => []);
    const visible = windows.filter((client) => client.visibilityState === "visible");
    if (visible.length > 0) {
      for (const client of visible) client.postMessage({ type: "jehova:badge-seen" });
      return;
    }
    if (!("setAppBadge" in self.navigator)) return;
    await self.navigator.setAppBadge(data.badge).catch(() => {});
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, {
        body: data.body,
        data: { url: data.url },
      }),
      setBadge(),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
