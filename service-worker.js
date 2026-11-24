var ONBELLEK = "hesabim-v1";
var DOSYALAR = ["./", "./index.html", "./style.css", "./app.js", "./manifest.json", "./icon-192.svg", "./icon-512.svg"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(ONBELLEK).then(function (c) { return c.addAll(DOSYALAR); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (adlar) {
    return Promise.all(adlar.filter(function (a) { return a !== ONBELLEK; })
      .map(function (a) { return caches.delete(a); }));
  }));
  self.clients.claim();
});

// Önce internetten dene; bağlantı yoksa önbellekteki sürümü aç.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      if (r && r.ok) {
        var kopya = r.clone();
        caches.open(ONBELLEK).then(function (c) { c.put(e.request, kopya); });
      }
      return r;
    }).catch(function () {
      return caches.match(e.request).then(function (r) {
        return r || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error());
      });
    })
  );
});
