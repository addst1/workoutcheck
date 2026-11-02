// 운동 체크 서비스워커
// - HTML(페이지 이동)은 네트워크 우선 → 항상 최신 버전, 오프라인이면 캐시
// - 그 외 정적 파일은 캐시 우선 + 백그라운드 갱신
// - 새 버전은 자동으로 덮어쓰지 않고, 앱에서 "업데이트"를 누르면 적용 (입력 중 화면이 튀지 않도록)
// 앱 파일을 수정해서 배포할 때는 아래 VERSION 숫자를 올려주세요.
const VERSION = "v3.1";
const CACHE_NAME = "workout-check-" + VERSION;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // 파일 하나가 없어도 전체 설치가 실패하지 않도록 개별로 추가
      Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 페이지 이동: 네트워크 우선
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put("./index.html", clone));
          }
          return res;
        })
        .catch(() =>
          caches.match("./index.html").then((r) => r || caches.match("./"))
        )
    );
    return;
  }

  // 정적 파일: 캐시 우선 + 백그라운드 갱신
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
