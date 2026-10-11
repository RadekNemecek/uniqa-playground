// Náhrada service workera staré aplikace. Kdo měl Mučírnu otevřenou na
// GitHub Pages, má v prohlížeči uloženou celou aplikaci a stránka by se mu
// načítala z mezipaměti, takže by se o přesměrování nikdy nedozvěděl.
// Prohlížeč si tenhle soubor stáhne jako aktualizaci, ten smaže mezipaměť,
// odregistruje se a otevřené karty načte znovu, už ze serveru.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key)
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) client.navigate(client.url)
    })(),
  )
})
