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

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url },
    }),
    typeof data.badge === "number" && data.badge > 0
      ? self.registration.setAppBadge(data.badge).catch(() => {})
      : Promise.resolve()
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
