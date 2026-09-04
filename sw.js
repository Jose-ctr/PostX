/*
=========================================================
                         POSTX
             Social • Marketplace • PWA
=========================================================

File:
    sw.js

Purpose:
    Progressive Web App service worker.

Features:
    - Multi-page app-shell caching
    - Offline navigation
    - Runtime asset caching
    - Automatic old-cache cleanup
    - Network-first HTML navigation
    - Cache-first static assets
    - Safe handling of failed requests
    - Immediate activation/update support
=========================================================
*/

"use strict";

/* =====================================================
   CACHE CONFIGURATION
===================================================== */

const CACHE_VERSION = "postx-v2.0.0";

const APP_CACHE = `${CACHE_VERSION}-app`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

/*
 * Core PostX application files.
 *
 * Keep paths relative to the repository root so the
 * service worker works correctly on GitHub Pages.
 */

const APP_SHELL = [
  "./",
  "./index.html",
  "./feed.html",
  "./marketplace.html",
  "./listing.html",
  "./inbox.html",
  "./settings.html",

  "./manifest.json",

  "./css/style.css",

  "./js/app.js",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

/* =====================================================
   INSTALL
===================================================== */

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(APP_CACHE)

      .then(cache => {

        return Promise.all(

          APP_SHELL.map(file => {

            return cache.add(file).catch(error => {

              console.warn(
                "[PostX SW] Cache skipped:",
                file,
                error
              );

            });

          })

        );

      })

      .then(() => {

        /*
         * Activate the new service worker immediately.
         */

        return self.skipWaiting();

      })

  );

});

/* =====================================================
   ACTIVATE
===================================================== */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()

      .then(cacheNames => {

        return Promise.all(

          cacheNames.map(cacheName => {

            /*
             * Delete every old PostX cache.
             */

            if (
              cacheName !== APP_CACHE &&
              cacheName !== RUNTIME_CACHE
            ) {

              return caches.delete(cacheName);

            }

            return null;

          })

        );

      })

      .then(() => {

        /*
         * Take control of open pages immediately.
         */

        return self.clients.claim();

      })

  );

});

/* =====================================================
   FETCH
===================================================== */

self.addEventListener("fetch", event => {

  const request = event.request;

  /*
   * Only GET requests can be cached.
   */

  if (request.method !== "GET") {
    return;
  }

  /*
   * Ignore unsupported protocols.
   */

  if (
    !request.url.startsWith("http://") &&
    !request.url.startsWith("https://")
  ) {
    return;
  }

  /* ===================================================
     NAVIGATION REQUESTS
     
     Strategy:
       Network first
       Cache fallback
     
     This ensures users normally receive the newest
     version of PostX while still supporting offline use.
     =================================================== */

  if (request.mode === "navigate") {

    event.respondWith(

      fetch(request)

        .then(response => {

          if (
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {

            const responseClone =
              response.clone();

            caches
              .open(RUNTIME_CACHE)
              .then(cache => {

                cache.put(
                  request,
                  responseClone
                );

              });

          }

          return response;

        })

        .catch(() => {

          return caches.match(request)

            .then(cachedResponse => {

              if (cachedResponse) {
                return cachedResponse;
              }

              /*
               * Final offline fallback.
               */

              return caches.match(
                "./index.html"
              );

            });

        })

    );

    return;
  }

  /* ===================================================
     STATIC / RUNTIME REQUESTS
     
     Strategy:
       Cache first
       Network fallback
     =================================================== */

  event.respondWith(

    caches.match(request)

      .then(cachedResponse => {

        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)

          .then(networkResponse => {

            /*
             * Cache successful same-origin responses.
             */

            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {

              const responseClone =
                networkResponse.clone();

              caches
                .open(RUNTIME_CACHE)
                .then(cache => {

                  cache.put(
                    request,
                    responseClone
                  );

                });

            }

            return networkResponse;

          })

          .catch(() => {

            /*
             * Images:
             * Return a transparent 1x1 SVG instead
             * of causing an application failure.
             */

            if (
              request.destination === "image"
            ) {

              return new Response(

                `<svg xmlns="http://www.w3.org/2000/svg"
                      width="1"
                      height="1"
                      viewBox="0 0 1 1">
                   <rect width="1"
                         height="1"
                         fill="none"/>
                 </svg>`,

                {
                  status: 200,
                  headers: {
                    "Content-Type":
                      "image/svg+xml"
                  }
                }

              );

            }

            /*
             * Generic offline response.
             */

            return new Response(

              "PostX is currently offline.",

              {
                status: 503,
                statusText: "Offline",
                headers: {
                  "Content-Type":
                    "text/plain; charset=utf-8"
                }
              }

            );

          });

      })

  );

});

/* =====================================================
   MESSAGE HANDLER
===================================================== */

self.addEventListener("message", event => {

  if (!event.data) {
    return;
  }

  /*
   * Application can request an immediate update.
   */

  if (
    event.data.type === "SKIP_WAITING"
  ) {

    self.skipWaiting();

  }

});

/* =====================================================
   END OF POSTX SERVICE WORKER
===================================================== */
