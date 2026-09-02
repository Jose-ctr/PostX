/**
 * ============================================================
 * POSTX — SETTINGS ENGINE
 * ============================================================
 *
 * Frontend settings foundation.
 *
 * Production responsibilities that will later connect to the
 * secure PostX backend:
 *
 * - Account/profile management
 * - Facebook OAuth
 * - Instagram OAuth
 * - M-PESA payments
 * - PostX Pro subscriptions
 * - Security/session management
 * - Real notification preferences
 *
 * Never place API secrets, OAuth secrets, M-PESA credentials,
 * access tokens or private keys in this frontend file.
 * ============================================================
 */

(() => {
  "use strict";

  const PostX = window.PostX;

  if (!PostX) {
    console.error("PostX core is unavailable.");
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  /* ==========================================================
     STATE
     ========================================================== */

  function getSettings() {
    const state = PostX.getState();

    return state.settings || {};
  }

  function saveSettings(changes) {
    const current = getSettings();

    PostX.updateState({
      settings: {
        ...current,
        ...changes
      }
    });
  }

  /* ==========================================================
     PROFILE
     ========================================================== */

  function loadProfile() {
    const state = PostX.getState();
    const user = state.user || {};

    const name = user.name || "PostX User";
    const avatar = user.avatar || "";

    const nameElement = $("#profileName");
    const initialElement = $("#profileInitial");
    const avatarElement = $("#profileAvatar");

    if (nameElement) {
      nameElement.textContent = name;
    }

    if (initialElement) {
      initialElement.textContent =
        name.trim().charAt(0).toUpperCase() || "P";
    }

    if (avatarElement && avatar) {
      avatarElement.src = avatar;
      avatarElement.style.display = "block";

      if (initialElement) {
        initialElement.style.display = "none";
      }
    }
  }

  function setupProfile() {
    const button = $("#editProfileBtn");

    if (!button) return;

    button.addEventListener("click", () => {
      PostX.toast(
        "Profile editing will connect to the PostX account backend.",
        "info",
        4000
      );
    });
  }

  /* ==========================================================
     THEME
     ========================================================== */

  function applyTheme(theme) {
    const selectedTheme =
      theme === "light" ? "light" : "dark";

    document.body.classList.toggle(
      "light-mode",
      selectedTheme === "light"
    );

    $$(".theme-option").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.theme === selectedTheme
      );
    });

    saveSettings({
      theme: selectedTheme
    });
  }

  function setupTheme() {
    const savedTheme =
      getSettings().theme || "dark";

    applyTheme(savedTheme);

    $$(".theme-option").forEach((button) => {
      button.addEventListener("click", () => {
        const theme =
          button.dataset.theme || "dark";

        applyTheme(theme);

        PostX.toast(
          `${theme === "light" ? "Light" : "Dark"} theme enabled.`,
          "success"
        );
      });
    });
  }

  /* ==========================================================
     NOTIFICATIONS
     ========================================================== */

  function loadNotificationSettings() {
    const settings = getSettings();

    const notificationToggle =
      $("#notificationsToggle");

    const soundToggle =
      $("#soundToggle");

    if (notificationToggle) {
      notificationToggle.checked =
        settings.notifications !== false;
    }

    if (soundToggle) {
      soundToggle.checked =
        settings.sound !== false;
    }
  }

  function setupNotifications() {
    const notificationToggle =
      $("#notificationsToggle");

    const soundToggle =
      $("#soundToggle");

    if (notificationToggle) {
      notificationToggle.addEventListener(
        "change",
        (event) => {
          const enabled =
            event.target.checked;

          saveSettings({
            notifications: enabled
          });

          PostX.toast(
            enabled
              ? "Notifications enabled."
              : "Notifications disabled.",
            "success"
          );
        }
      );
    }

    if (soundToggle) {
      soundToggle.addEventListener(
        "change",
        (event) => {
          const enabled =
            event.target.checked;

          saveSettings({
            sound: enabled
          });

          PostX.toast(
            enabled
              ? "Notification sound enabled."
              : "Notification sound disabled.",
            "success"
          );
        }
      );
    }
  }

  /* ==========================================================
     SOCIAL PLATFORMS
     ========================================================== */

  function getConnectedPlatforms() {
    return (
      getSettings().connectedPlatforms || {}
    );
  }

  function updatePlatformUI(
    platform,
    connected
  ) {
    const key =
      platform.toLowerCase();

    const status =
      $(`#${key}Status`);

    const button =
      document.querySelector(
        `.connect-platform[data-platform="${platform}"]`
      );

    if (!status || !button) return;

    status.classList.toggle(
      "connected",
      connected
    );

    status.textContent =
      connected
        ? "Connected"
        : "Not connected";

    button.textContent =
      connected
        ? "Manage"
        : "Connect";
  }

  function setupPlatforms() {
    const platforms =
      getConnectedPlatforms();

    ["Facebook", "Instagram"].forEach(
      (platform) => {
        const key =
          platform.toLowerCase();

        updatePlatformUI(
          platform,
          Boolean(platforms[key])
        );
      }
    );

    $$(".connect-platform").forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const platform =
              button.dataset.platform;

            /*
             * Production OAuth flow:
             *
             * 1. User taps Connect.
             * 2. PostX requests a backend OAuth URL.
             * 3. User authorizes the platform.
             * 4. Platform redirects to PostX backend.
             * 5. Backend exchanges the authorization code.
             * 6. Tokens are stored securely server-side.
             * 7. Frontend receives connection status only.
             */

            PostX.toast(
              `${platform} will connect through secure PostX OAuth.`,
              "info",
              4500
            );
          }
        );
      }
    );
  }

  /* ==========================================================
     POSTX PRO
     ========================================================== */

  function setupPro() {
    const button =
      $("#upgradeProBtn");

    if (!button) return;

    button.addEventListener("click", () => {
      /*
       * Production:
       * Create a Pro checkout/payment request
       * through the PostX backend.
       */

      PostX.toast(
        "PostX Pro checkout will use secure M-PESA payment processing.",
        "info",
        4500
      );
    });
  }

  /* ==========================================================
     PAYMENTS
     ========================================================== */

  function setupPayments() {
    const paymentButton =
      $("#paymentBtn");

    const historyButton =
      $("#paymentHistoryBtn");

    if (paymentButton) {
      paymentButton.addEventListener(
        "click",
        () => {
          PostX.toast(
            "M-PESA payment management will connect to the secure backend.",
            "info",
            4500
          );
        }
      );
    }

    if (historyButton) {
      historyButton.addEventListener(
        "click",
        () => {
          PostX.toast(
            "Payment history will appear here once the payment backend is connected.",
            "info",
            4500
          );
        }
      );
    }
  }

  /* ==========================================================
     SECURITY
     ========================================================== */

  function setupSecurity() {
    const securityButton =
      $("#securityBtn");

    const sessionsButton =
      $("#sessionsBtn");

    if (securityButton) {
      securityButton.addEventListener(
        "click",
        () => {
          PostX.toast(
            "Security controls will be handled by the PostX account backend.",
            "info",
            4000
          );
        }
      );
    }

    if (sessionsButton) {
      sessionsButton.addEventListener(
        "click",
        () => {
          PostX.toast(
            "Active sessions will be available through the account backend.",
            "info",
            4000
          );
        }
      );
    }
  }

  /* ==========================================================
     PWA INSTALLATION
     ========================================================== */

  let deferredInstallPrompt = null;

  function setupInstall() {
    const installButton =
      $("#installBtn");

    const installStatus =
      $("#installStatus");

    if (!installButton) return;

    installButton.disabled = false;

    window.addEventListener(
      "beforeinstallprompt",
      (event) => {
        event.preventDefault();

        deferredInstallPrompt = event;

        if (installStatus) {
          installStatus.textContent =
            "PostX is ready to be installed on your device.";
        }

        installButton.disabled = false;
        installButton.textContent = "Install";
      }
    );

    installButton.addEventListener(
      "click",
      async () => {
        if (!deferredInstallPrompt) {
          PostX.toast(
            "Use your browser's Add to Home Screen option if PostX is not already installed.",
            "info",
            5000
          );

          return;
        }

        deferredInstallPrompt.prompt();

        try {
          const result =
            await deferredInstallPrompt.userChoice;

          if (
            result &&
            result.outcome === "accepted"
          ) {
            PostX.toast(
              "PostX installation started.",
              "success"
            );
          } else {
            PostX.toast(
              "PostX installation was cancelled.",
              "info"
            );
          }
        } catch (error) {
          console.warn(
            "PWA installation prompt failed:",
            error
          );
        }

        deferredInstallPrompt = null;
      }
    );

    window.addEventListener(
      "appinstalled",
      () => {
        if (installStatus) {
          installStatus.textContent =
            "PostX is installed on your device.";
        }

        installButton.textContent =
          "Installed";

        installButton.disabled = true;

        PostX.toast(
          "PostX installed successfully.",
          "success"
        );
      }
    );
  }

  /* ==========================================================
     LOGOUT
     ========================================================== */

  function setupLogout() {
    const button =
      $("#logoutBtn");

    if (!button) return;

    button.addEventListener(
      "click",
      () => {
        const confirmed =
          window.confirm(
            "Log out of PostX?"
          );

        if (!confirmed) return;

        /*
         * Production:
         *
         * POST /api/auth/logout
         *
         * Backend invalidates the authenticated
         * session/token.
         */

        PostX.toast(
          "Logout will be handled by the secure PostX authentication backend.",
          "info",
          4500
        );
      }
    );
  }

  /* ==========================================================
     INITIALIZE
     ========================================================== */

  function init() {
    loadProfile();
    loadNotificationSettings();

    setupProfile();
    setupTheme();
    setupNotifications();
    setupPlatforms();
    setupPro();
    setupPayments();
    setupSecurity();
    setupInstall();
    setupLogout();

    console.log(
      "PostX Settings Engine initialized."
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
