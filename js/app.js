/* =========================================================
   POSTX — APP CORE
   PWA • Navigation • Swipe • Storage • Toasts • Theme
   • App State • Connection Monitoring
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
      const saved =
        localStorage.getItem(STORAGE_KEY);

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

      console.warn(
        "PostX: Could not load saved state.",
        error
      );

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

      console.warn(
        "PostX: Could not save state.",
        error
      );
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
        new CustomEvent(
          "postx:statechange",
          {
            detail: state
          }
        )
      );

      return state;
    }
  };


  /* =======================================================
     TOAST SYSTEM
     ======================================================= */

  function showToast(
    message,
    type = "success",
    duration = 3000
  ) {

    let toast =
      document.getElementById("toast");

    if (!toast) {

      toast =
        document.createElement("div");

      toast.id = "toast";
      toast.className = "toast";

      document.body.appendChild(toast);
    }

    toast.textContent = message;

    toast.className =
      `toast ${type} show`;

    clearTimeout(toast._timer);

    toast._timer =
      setTimeout(() => {

        toast.classList.remove("show");

      }, duration);
  }


  window.PostX.toast =
    showToast;


  /* =======================================================
     THEME
     ======================================================= */

  function applyTheme(theme) {

    if (
      theme !== "dark" &&
      theme !== "light"
    ) {
      theme = "dark";
    }

    document.documentElement.dataset.theme =
      theme;

    state.theme =
      theme;

    saveState();

    document.dispatchEvent(
      new CustomEvent(
        "postx:themechange",
        {
          detail: {
            theme
          }
        }
      )
    );
  }


  function initTheme() {

    const savedTheme =
      state.theme || "dark";

    applyTheme(savedTheme);
  }


  window.PostX.setTheme =
    applyTheme;


  window.PostX.toggleTheme =
    function () {

      const nextTheme =
        state.theme === "dark"
          ? "light"
          : "dark";

      applyTheme(nextTheme);

      showToast(
        `${
          nextTheme === "dark"
            ? "Dark"
            : "Light"
        } mode enabled`,
        "success"
      );
    };


  /* =======================================================
     POSTX MAIN PAGE ORDER
     
     LEFT SWIPE  = NEXT
     RIGHT SWIPE = PREVIOUS

     Create → Social → Market → Inbox → Settings
     ======================================================= */

  const POSTX_PAGES = [
    "index.html",
    "feed.html",
    "marketplace.html",
    "inbox.html",
    "settings.html"
  ];


  function getCurrentPage() {

    let page =
      window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    if (!page) {
      page = "index.html";
    }

    /*
      GitHub Pages root can sometimes appear
      without an explicit filename.
    */

    if (
      !POSTX_PAGES.includes(page)
    ) {

      /*
        If this is another PostX page,
        don't force navigation.
      */

      return null;
    }

    return page;
  }


  function navigateBySwipe(direction) {

    const currentPage =
      getCurrentPage();

    if (!currentPage) {
      return;
    }

    const currentIndex =
      POSTX_PAGES.indexOf(
        currentPage
      );

    if (currentIndex === -1) {
      return;
    }

    let nextIndex =
      currentIndex + direction;

    /*
      No wrapping.

      First page:
      right swipe stays on Create.

      Last page:
      left swipe stays on Settings.
    */

    if (
      nextIndex < 0 ||
      nextIndex >= POSTX_PAGES.length
    ) {
      return;
    }

    const target =
      POSTX_PAGES[nextIndex];

    if (!target) {
      return;
    }

    window.location.href =
      target;
  }


  /* =======================================================
     WHOLE-SCREEN SWIPE NAVIGATION
     
     Designed for mobile:
     - Vertical scrolling remains normal
     - Horizontal swipe changes PostX page
     - Buttons/links/forms are ignored
     - Marketplace filter tabs are ignored
     ======================================================= */

  function initSwipeNavigation() {

    /*
      Prevent duplicate initialization if this
      file is accidentally loaded twice.
    */

    if (
      window.PostX &&
      window.PostX._swipeInitialized
    ) {
      return;
    }

    if (window.PostX) {
      window.PostX._swipeInitialized =
        true;
    }


    let startX = 0;
    let startY = 0;

    let tracking = false;

    let swipeLocked = false;


    const SWIPE_THRESHOLD = 90;


    document.addEventListener(
      "touchstart",
      event => {

        /*
          Only track a single finger.
        */

        if (
          event.touches.length !== 1
        ) {
          tracking = false;
          return;
        }


        const touch =
          event.touches[0];

        const target =
          event.target;


        /*
          Never hijack normal interaction
          with controls.
        */

        if (
          target.closest(
            "button, a, input, textarea, select, video, [contenteditable='true']"
          )
        ) {
          tracking = false;
          return;
        }


        /*
          Marketplace category tabs are
          horizontally scrollable.
        */

        if (
          target.closest(
            ".type-tabs, .feed-filters, .marketplace-filters"
          )
        ) {
          tracking = false;
          return;
        }


        startX =
          touch.clientX;

        startY =
          touch.clientY;

        tracking = true;

        swipeLocked = false;

      },
      {
        passive: true
      }
    );


    document.addEventListener(
      "touchmove",
      event => {

        if (!tracking) {
          return;
        }

        if (
          event.touches.length !== 1
        ) {
          tracking = false;
          return;
        }


        const touch =
          event.touches[0];

        const dx =
          touch.clientX - startX;

        const dy =
          touch.clientY - startY;


        /*
          If movement is primarily vertical,
          allow normal page scrolling.
        */

        if (
          Math.abs(dy) >
          Math.abs(dx)
        ) {
          tracking = false;
          return;
        }


        /*
          Horizontal movement detected.
        */

        if (
          Math.abs(dx) >=
          SWIPE_THRESHOLD
        ) {
          swipeLocked = true;
        }

      },
      {
        passive: true
      }
    );


    document.addEventListener(
      "touchend",
      event => {

        if (!tracking) {
          return;
        }

        tracking = false;


        if (
          swipeLocked !== true
        ) {
          return;
        }


        const touch =
          event.changedTouches[0];

        if (!touch) {
          return;
        }


        const dx =
          touch.clientX - startX;

        const dy =
          touch.clientY - startY;


        /*
          Confirm this is genuinely
          a horizontal gesture.
        */

        if (
          Math.abs(dx) <
          SWIPE_THRESHOLD
        ) {
          return;
        }


        if (
          Math.abs(dx) <=
          Math.abs(dy)
        ) {
          return;
        }


        /*
          LEFT → NEXT PAGE

          RIGHT → PREVIOUS PAGE
        */

        if (dx < 0) {

          navigateBySwipe(1);

        } else {

          navigateBySwipe(-1);

        }

      },
      {
        passive: true
      }
    );
  }


  /* =======================================================
     ACTIVE NAVIGATION
     ======================================================= */

  function setActiveNavigation() {

    const currentPage =
      getCurrentPage();

    if (!currentPage) {
      return;
    }


    /*
      Supports all PostX navigation
      classes, including Marketplace.
    */

    document
      .querySelectorAll(
        ".bottom-nav a, .marketplace-bottom-nav a, nav a[data-page]"
      )
      .forEach(link => {

        const href =
          link.getAttribute("href") ||
          "";

        const target =
          href
            .split("/")
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

        link.addEventListener(
          "click",
          event => {

            const href =
              link.getAttribute(
                "href"
              );


            if (
              !href ||
              href.startsWith("#") ||
              href.startsWith("http") ||
              href.startsWith("//") ||
              href.startsWith("mailto:") ||
              href.startsWith("tel:") ||
              href.startsWith("javascript:")
            ) {
              return;
            }


            link.classList.add(
              "loading"
            );


            setTimeout(() => {

              link.classList.remove(
                "loading"
              );

            }, 1000);

          }
        );
      });
  }


  /* =======================================================
     COUNTERS
     ======================================================= */

  function updateDashboardCounters() {

    const draftCount =
      document.getElementById(
        "draftCount"
      );

    const scheduledCount =
      document.getElementById(
        "scheduledCount"
      );

    const boostCount =
      document.getElementById(
        "boostCount"
      );


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
          boost =>
            boost.status ===
            "active"
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


    button.addEventListener(
      "click",
      () => {

        showToast(
          "Notifications will appear here.",
          "success"
        );

      }
    );
  }


  /* =======================================================
     GLOBAL BUTTON ACTIONS
     ======================================================= */

  function initGlobalActions() {

    document.addEventListener(
      "click",
      event => {

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

      }
    );
  }


  /* =======================================================
     PWA SERVICE WORKER
     ======================================================= */

  function registerServiceWorker() {

    if (
      !("serviceWorker" in navigator)
    ) {
      return;
    }


    window.addEventListener(
      "load",
      async () => {

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

      }
    );
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
        event.error ||
        event.message
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

    initSwipeNavigation();

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
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }

})();
