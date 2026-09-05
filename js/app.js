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

  const STORAGE_KEY =
    "postx_state_v1";


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


  let state =
    loadState();


  /* =======================================================
     STORAGE
     ======================================================= */

  function loadState() {

    try {

      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );


      if (!saved) {

        return structuredClone(
          defaultState
        );

      }


      const parsed =
        JSON.parse(saved);


      return {

        ...structuredClone(
          defaultState
        ),

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

    }

    catch (error) {

      console.warn(
        "PostX: Could not load saved state.",
        error
      );

      return structuredClone(
        defaultState
      );

    }

  }


  function saveState() {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

    }

    catch (error) {

      console.warn(
        "PostX: Could not save saved state.",
        error
      );

    }

  }


  /* =======================================================
     POSTX PUBLIC API
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
      document.getElementById(
        "toast"
      );


    if (!toast) {

      toast =
        document.createElement(
          "div"
        );

      toast.id =
        "toast";

      toast.className =
        "toast";

      document.body.appendChild(
        toast
      );

    }


    toast.textContent =
      message;


    toast.className =
      `toast ${type} show`;


    clearTimeout(
      toast._timer
    );


    toast._timer =
      setTimeout(() => {

        toast.classList.remove(
          "show"
        );

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

    applyTheme(
      state.theme || "dark"
    );

  }


  window.PostX.setTheme =
    applyTheme;


  window.PostX.toggleTheme =
    function () {

      const nextTheme =
        state.theme === "dark"
          ? "light"
          : "dark";


      applyTheme(
        nextTheme
      );


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
     MAIN POSTX PAGE ORDER
     
     CREATE → HOME → MARKET → INBOX → SETTINGS
     
     LEFT SWIPE  = NEXT
     RIGHT SWIPE = PREVIOUS
     ======================================================= */

  const POSTX_PAGES = [

    "index.html",
    "feed.html",
    "marketplace.html",
    "inbox.html",
    "settings.html"

  ];


  /* =======================================================
     CURRENT PAGE
     ======================================================= */

  function getCurrentPage() {

    let path =
      window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();


    /*
     * GitHub Pages root:
     *
     * /PostX/
     *
     * has no filename.
     *
     * Treat root as index.html.
     */

    if (
      !path ||
      path === "postx"
    ) {

      path =
        "index.html";

    }


    if (
      POSTX_PAGES.includes(path)
    ) {

      return path;

    }


    return null;

  }


  /* =======================================================
     NAVIGATE
     ======================================================= */

  function navigateToPage(
    page
  ) {

    if (
      !POSTX_PAGES.includes(page)
    ) {

      return;

    }


    if (
      getCurrentPage() === page
    ) {

      return;

    }


    window.location.href =
      page;

  }


  /* =======================================================
     SWIPE NAVIGATION
     ======================================================= */

  function navigateBySwipe(
    direction
  ) {

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


    const nextIndex =
      currentIndex + direction;


    /*
     * No wrapping.
     */

    if (
      nextIndex < 0 ||
      nextIndex >=
        POSTX_PAGES.length
    ) {

      return;

    }


    const target =
      POSTX_PAGES[nextIndex];


    navigateToPage(
      target
    );

  }


  /* =======================================================
     RELIABLE ANDROID SWIPE ENGINE
     
     IMPORTANT:
     - Vertical scrolling remains normal.
     - Horizontal swipes change pages.
     - Buttons and links remain clickable.
     - No duplicate swipe handler.
     ======================================================= */

  function initSwipeNavigation() {

    if (
      window.PostX._swipeInitialized
    ) {

      return;

    }


    window.PostX._swipeInitialized =
      true;


    let startX = 0;
    let startY = 0;

    let currentX = 0;
    let currentY = 0;

    let tracking = false;
    let horizontalGesture = false;


    const SWIPE_DISTANCE = 70;


    /* =====================================================
       TOUCH START
       ===================================================== */

    document.addEventListener(

      "touchstart",

      event => {

        if (
          event.touches.length !== 1
        ) {

          tracking = false;

          return;

        }


        const target =
          event.target;


        /*
         * Interactive controls should
         * behave normally.
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
         * Don't hijack horizontal
         * scrolling filter bars.
         */

        if (
          target.closest(
            ".feed-filters, .type-tabs, .marketplace-filters, .filter-tabs"
          )
        ) {

          tracking = false;

          return;

        }


        const touch =
          event.touches[0];


        startX =
          touch.clientX;

        startY =
          touch.clientY;


        currentX =
          startX;

        currentY =
          startY;


        tracking =
          true;


        horizontalGesture =
          false;

      },

      {
        passive: true
      }

    );


    /* =====================================================
       TOUCH MOVE
       ===================================================== */

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


        currentX =
          touch.clientX;

        currentY =
          touch.clientY;


        const dx =
          currentX - startX;


        const dy =
          currentY - startY;


        /*
         * Once the gesture clearly becomes
         * vertical, give it back to scrolling.
         */

        if (
          Math.abs(dy) >
          Math.abs(dx) + 10
        ) {

          tracking = false;

          return;

        }


        /*
         * Horizontal gesture detected.
         */

        if (
          Math.abs(dx) >= 25 &&
          Math.abs(dx) >
            Math.abs(dy)
        ) {

          horizontalGesture =
            true;

        }

      },

      {
        passive: true
      }

    );


    /* =====================================================
       TOUCH END
       ===================================================== */

    document.addEventListener(

      "touchend",

      event => {

        if (!tracking) {

          return;

        }


        tracking = false;


        if (
          event.changedTouches.length !== 1
        ) {

          return;

        }


        const touch =
          event.changedTouches[0];


        currentX =
          touch.clientX;

        currentY =
          touch.clientY;


        const dx =
          currentX - startX;


        const dy =
          currentY - startY;


        /*
         * Must be a genuine horizontal
         * gesture.
         */

        if (
          !horizontalGesture
        ) {

          return;

        }


        if (
          Math.abs(dx) <
          SWIPE_DISTANCE
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
         * LEFT = NEXT
         */

        if (dx < 0) {

          navigateBySwipe(
            1
          );

        }


        /*
         * RIGHT = PREVIOUS
         */

        else {

          navigateBySwipe(
            -1
          );

        }

      },

      {
        passive: true
      }

    );


    console.log(
      "PostX swipe navigation enabled."
    );

  }


  /* =======================================================
     ACTIVE BOTTOM NAV
     
     Supports:
     - buttons
     - anchors
     - data-page
     ======================================================= */

  function setActiveNavigation() {

    const currentPage =
      getCurrentPage();


    if (!currentPage) {

      return;

    }


    /*
     * BUTTON NAVIGATION
     */

    document
      .querySelectorAll(
        ".postx-nav-item, .bottom-nav button, .marketplace-bottom-nav button"
      )
      .forEach(button => {

        const onclick =
          button.getAttribute(
            "onclick"
          ) || "";


        let target =
          "";


        const match =
          onclick.match(
            /['"]([^'"]+\.html)['"]/
          );


        if (match) {

          target =
            match[1]
              .split("/")
              .pop()
              .split("?")[0]
              .toLowerCase();

        }


        button.classList.toggle(
          "active",
          target === currentPage
        );


        if (
          target === currentPage
        ) {

          button.setAttribute(
            "aria-current",
            "page"
          );

        }
        else {

          button.removeAttribute(
            "aria-current"
          );

        }

      });


    /*
     * ANCHOR NAVIGATION
     */

    document
      .querySelectorAll(
        ".bottom-nav a, .marketplace-bottom-nav a, nav a[data-page]"
      )
      .forEach(link => {

        const href =
          link.getAttribute(
            "href"
          ) || "";


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


        if (
          target === currentPage
        ) {

          link.setAttribute(
            "aria-current",
            "page"
          );

        }
        else {

          link.removeAttribute(
            "aria-current"
          );

        }

      });

  }


  /* =======================================================
     NAVIGATION CLICK FEEDBACK
     ======================================================= */

  function initNavigation() {

    document
      .querySelectorAll(
        "a[href]"
      )
      .forEach(link => {

        link.addEventListener(
          "click",
          () => {

            const href =
              link.getAttribute(
                "href"
              ) || "";


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
     DASHBOARD COUNTERS
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
     NOTIFICATIONS
     ======================================================= */

  function initNotifications() {

    /*
     * Global delegated handler below
     * already handles notifications.
     */

  }


  /* =======================================================
     GLOBAL ACTIONS
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

        }

        catch (error) {

          console.warn(
            "PostX Service Worker registration failed:",
            error
          );

        }

      }
    );

  }


  /* =======================================================
     CONNECTION STATUS
     ======================================================= */

  function updateConnectionStatus() {

    if (
      navigator.onLine
    ) {

      document.body.classList.remove(
        "offline"
      );

    }

    else {

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
     ERROR HANDLING
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

  }

  else {

    init();

  }

})();
