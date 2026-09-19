/* Two to One — serverless notification service worker.
   The page computes triggers and posts messages here; we show the notification.
   Clicking focuses or opens the app. No server involved. */

self.addEventListener("message", function(e){
  const d = e.data || {};
  if (!d.title) return;
  self.registration.showNotification(d.title, {
    body: d.body || "",
    tag: d.tag || "two-to-one"
  }).catch(function(){ /* best effort */ });
});

self.addEventListener("notificationclick", function(e){
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(list){
    for (const c of list) {
      if ("focus" in c) { c.focus(); return; }
    }
    return clients.openWindow("./");
  }));
});