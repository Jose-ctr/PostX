/*
=========================================================
                         POSTX
              Smart Social Media Publisher
=========================================================

File:
    sw.js

Purpose:
    Progressive Web App service worker.

Features:
    - App-shell caching
    - Offline loading
    - Runtime caching
    - Automatic cache cleanup
    - Navigation fallback
    - Safe handling of missing assets

=========================================================
*/

"use strict";

/* =====================================================
   CONFIGURATION
===================================================== */

const CACHE_VERSION = "postx-v1.0.0";

const APP_CACHE = `${CACHE_VERSION}-app`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

/*
 * Keep these paths relative to the repository root.
 * This works correctly on GitHub Pages project sites.
 */

const APP_SHELL = [
  "./",
  "./index.html",
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
                "[PostX SW] Could not cache:",
                file,
                error
              );

            });

          })
        );

      })

      .then(() => {

        /*
         * Activate the new worker immediately.
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
   * Only handle GET requests.
   */

  if (request.method !== "GET") {
    return;
  }

  /*
   * Ignore browser extensions and unsupported schemes.
   */

  if (
    !request.url.startsWith("http://") &&
    !request.url.startsWith("https://")
  ) {
    return;
  }

  /*
   * Navigation requests:
   *
   * Network first
   * Cache fallback
   */

  if (request.mode === "navigate") {

    event.respondWith(

      fetch(request)

        .then(response => {

          /*
           * Save a fresh copy of the page.
           */

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

          return caches.match(
            request
          ).then(cached => {

            return (
              cached ||
              caches.match("./index.html")
            );

          });

        })

    );

    return;
  }

  /*
   * Static assets:
   *
   * Cache first
   * Network fallback
   */

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
             * If an image fails offline,
             * return a simple empty response
             * rather than breaking the application.
             */

            if (
              request.destination === "image"
            ) {

              return new Response(
                "",
                {
                  status: 200,
                  headers: {
                    "Content-Type":
                      "image/svg+xml"
                  }
                }
              );

            }

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
   * Allows the application to request
   * an immediate service-worker update.
   */

  if (
    event.data.type === "SKIP_WAITING"
  ) {

    self.skipWaiting();

  }

});

/* =====================================================
   END OF POSTX SERVICE WORKER
========================================================= */
