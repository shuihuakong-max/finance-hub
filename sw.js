// Service Worker — 信用卡还款提醒器（离线优先）
const CACHE = "finance-hub-v4";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// 安装：预缓存所有静态资源
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting(); // 立即激活，不等旧 SW 释放
});

// 激活：清理旧版本缓存
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // 立即接管所有页面
});

// 请求拦截：网络优先 HTML，缓存优先静态资源
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // 跳过非 HTTP 请求和 chrome-extension
  if (!url.protocol.startsWith("http")) return;

  // HTML 导航请求：网络优先，失败则回退缓存
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          // 网络成功 → 更新缓存
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put("/", clone));
          return res;
        })
        .catch(() => caches.match("/")) // 离线 → 返回缓存
    );
    return;
  }

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      // 不在缓存中 → 请求网络并缓存
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
