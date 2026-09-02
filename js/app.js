/* =========================================================
   POSTX — APP CORE
   PWA • Navigation • Storage • Toasts • Theme • App State
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     POSTX GLOBAL STATE
     ======================================================= */

  const STORAGE_KEY = "postx_state_v1";

  const defaultState = {
    theme: "dark",

    user: {
      name: "PostX User",
      avatar: ""
    },

    drafts: [],
    scheduled: [],
    published: [],
    boosts: [],

    settings: {
      notifications: true,
      sound: true
    }
  };

  let state = loadState();

  /* =======================================================
     STORAGE
     ======================================================= */

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return structuredClone(defaultState);
      }

      const parsed = JSON.parse(saved);

      return {
        ...structuredClone(defaultState),
        ...parsed,
        user: {
          ...defaultState.user,
          ...(parsed.user || {})
        },
        settings: {
          ...defaultState.settings,
          ...(parsed.settings || {})
        }
      };
    } catch (error) {
      console.warn("PostX: Could not load saved state.", error);
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch (error) {
      console.warn("PostX: Could not save state.", error);
    }
  }

  /* =======================================================
     PUBLIC STATE ACCESS
     ======================================================= */

  window.PostX = {
    getState() {
      return state;
    },

    saveState,

    updateState(updates = {}) {
      state = {
        ...state,
        ...updates
      };

      saveState();

      document.dispatchEvent(
        new CustomEvent("postx:statechange", {
          detail: state
        })
      );

      return state;
    }
  };

  /* =======================================================
     TOAST SYSTEM
     ======================================================= */

  function showToast(message, type = "success", duration = 3000) {
    let toast = document.getElementById("toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";

      document.body.appendChild(toast);
    }

    toast.textContent = message;

    toast.className = `toast ${type} show`;

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
      toast.classList.remove("show");
    }, duration);
  }

  window.PostX.toast = showToast;

  /* =======================================================
     THEME
     ======================================================= */

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    state.theme = theme;

    saveState();

    document.dispatchEvent(
      new CustomEvent("postx:themechange", {
        detail: {
          theme
        }
      })
    );
  }

  function initTheme() {
    const savedTheme = state.theme || "dark";

    applyTheme(savedTheme);
  }

  window.PostX.setTheme = applyTheme;

  window.PostX.toggleTheme = function () {
    const nextTheme =
      state.theme === "dark"
        ? "light"
        : "dark";

    applyTheme(nextTheme);

    showToast(
      `${nextTheme === "dark" ? "Dark" : "Light"} mode enabled`,
      "success"
    );
  };

  /* =======================================================
     ACTIVE NAVIGATION
     ======================================================= */

  function setActiveNavigation() {
    const currentPage =
      window.location.pathname
        .split("/")
        .pop()
        .toLowerCase() || "index.html";

    document
      .querySelectorAll(".bottom-nav a")
      .forEach(link => {
        const href =
          link.getAttribute("href") || "";

        const target =
          href.split("/")
            .pop()
            .split("?")[0]
            .toLowerCase();

        link.classList.toggle(
          "active",
          target === currentPage
        );
      });
  }

  /* =======================================================
     NAVIGATION CLICK FEEDBACK
     ======================================================= */

  function initNavigation() {
    document
      .querySelectorAll("a[href]")
      .forEach(link => {
        link.addEventListener("click", event => {
          const href =
            link.getAttribute("href");

          if (
            !href ||
            href.startsWith("#") ||
            href.startsWith("http") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:")
          ) {
            return;
          }

          link.classList.add("loading");

          setTimeout(() => {
            link.classList.remove("loading");
          }, 1000);
        });
      });
  }

  /* =======================================================
     COUNTERS
     ======================================================= */

  function updateDashboardCounters() {
    const draftCount =
      document.getElementById("draftCount");

    const scheduledCount =
      document.getElementById("scheduledCount");

    const boostCount =
      document.getElementById("boostCount");

    if (draftCount) {
      draftCount.textContent =
        state.drafts.length;
    }

    if (scheduledCount) {
      scheduledCount.textContent =
        state.scheduled.length;
    }

    if (boostCount) {
      boostCount.textContent =
        state.boosts.filter(
          boost => boost.status === "active"
        ).length;
    }
  }

  /* =======================================================
     NOTIFICATION BUTTON
     ======================================================= */

  function initNotifications() {
    const button =
      document.querySelector(
        "[data-action='notifications']"
      );

    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      showToast(
        "Notifications will appear here.",
        "success"
      );
    });
  }

  /* =======================================================
     GLOBAL BUTTON ACTIONS
     ======================================================= */

  function initGlobalActions() {
    document.addEventListener("click", event => {
      const button =
        event.target.closest(
          "[data-action]"
        );

      if (!button) {
        return;
      }

      const action =
        button.dataset.action;

      switch (action) {
        case "notifications":
          showToast(
            "Notifications will appear here.",
            "success"
          );
          break;

        case "theme":
          window.PostX.toggleTheme();
          break;

        case "clear-drafts":
          state.drafts = [];
          saveState();
          updateDashboardCounters();

          showToast(
            "Drafts cleared.",
            "success"
          );
          break;

        default:
          break;
      }
    });
  }

  /* =======================================================
     PWA SERVICE WORKER
     ======================================================= */

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", async () => {
      try {
        const registration =
          await navigator.serviceWorker.register(
            "sw.js"
          );

        console.log(
          "PostX Service Worker registered:",
          registration.scope
        );
      } catch (error) {
        console.warn(
          "PostX Service Worker registration failed:",
          error
        );
      }
    });
  }

  /* =======================================================
     ONLINE / OFFLINE STATUS
     ======================================================= */

  function updateConnectionStatus() {
    if (navigator.onLine) {
      document.body.classList.remove(
        "offline"
      );
    } else {
      document.body.classList.add(
        "offline"
      );

      showToast(
        "You're offline. Saved data remains available.",
        "warning",
        4000
      );
    }
  }

  function initConnectionMonitoring() {
    window.addEventListener(
      "online",
      () => {
        document.body.classList.remove(
          "offline"
        );

        showToast(
          "Back online.",
          "success"
        );
      }
    );

    window.addEventListener(
      "offline",
      () => {
        document.body.classList.add(
          "offline"
        );

        showToast(
          "You're offline.",
          "warning",
          4000
        );
      }
    );

    updateConnectionStatus();
  }

  /* =======================================================
     GLOBAL ERROR HANDLING
     ======================================================= */

  window.addEventListener(
    "error",
    event => {
      console.error(
        "PostX error:",
        event.error || event.message
      );
    }
  );

  window.addEventListener(
    "unhandledrejection",
    event => {
      console.error(
        "PostX promise error:",
        event.reason
      );
    }
  );

  /* =======================================================
     INITIALIZATION
     ======================================================= */

  function init() {
    initTheme();
    setActiveNavigation();
    initNavigation();
    initNotifications();
    initGlobalActions();
    initConnectionMonitoring();
    registerServiceWorker();
    updateDashboardCounters();

    console.log(
      "PostX initialized successfully."
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
