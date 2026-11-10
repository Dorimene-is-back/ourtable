// Only here so timer notifications work once the app is installed. Nothing is cached.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      if (list.length) return list[0].focus();
      return self.clients.openWindow("/");
    })
  );
});
