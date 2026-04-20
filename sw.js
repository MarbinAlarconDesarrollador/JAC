const CACHE_NAME = 'jac-escrutinio-v1';
const assets = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

// Instalación y guardado en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(assets);
      })
  );
});

// Estrategia: Cache First (Busca en caché, si no está, va a la red)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});