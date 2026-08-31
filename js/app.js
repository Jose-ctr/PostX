/* =========================================================
   POSTX — SMART SOCIAL PUBLISHER
   FULL DARK PREMIUM FRONTEND ENGINE
   Version 1.2.0

   Platforms:
   ✓ Facebook
   ✓ Instagram
   ✓ X

   Features:
   ✓ Dashboard
   ✓ Create Post
   ✓ Platform selection
   ✓ Image upload
   ✓ Hashtags
   ✓ Drafts
   ✓ Scheduling
   ✓ Published posts
   ✓ Calendar
   ✓ Edit / Delete
   ✓ LocalStorage
   ✓ Responsive mobile navigation
   ✓ Forced Dark Premium theme
   ========================================================= */

(() => {
  "use strict";

  const APP = {
    name: "PostX",
    version: "1.2.0",
    storageKey: "postx_state_v2"
  };

  const PLATFORM = {
    facebook: {
      id: "facebook",
      name: "Facebook",
      icon: "f",
      color: "#1877F2"
    },
    instagram: {
      id: "instagram",
      name: "Instagram",
      icon: "◎",
      color: "#E1306C"
    },
    x: {
      id: "x",
      name: "X",
      icon: "𝕏",
      color: "#00D4FF"
    }
  };

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: "⌂" },
    { id: "create", label: "Create Post", icon: "+" },
    { id: "scheduled", label: "Scheduled", icon: "◷" },
    { id: "drafts", label: "Drafts", icon: "▤" },
    { id: "published", label: "Published", icon: "✓" },
    { id: "calendar", label: "Calendar", icon: "▦" }
  ];

  const DEFAULT_STATE = {
    posts: [],
    activePage: "dashboard",
    editingPostId: null,

    connectedAccounts: {
      facebook: true,
      instagram: true,
      x: true
    },

    profile: {
      name: "PostX User",
      email: ""
    }
  };

  let state = loadState();

  /* =========================================================
     STORAGE
     ========================================================= */

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(APP.storageKey);

      if (!raw) {
        return clone(DEFAULT_STATE);
      }

      const saved = JSON.parse(raw);

      return {
        ...clone(DEFAULT_STATE),
        ...saved,

        posts: Array.isArray(saved.posts)
          ? saved.posts
          : [],

        connectedAccounts: {
          ...DEFAULT_STATE.connectedAccounts,
          ...(saved.connectedAccounts || {})
        },

        profile: {
          ...DEFAULT_STATE.profile,
          ...(saved.profile || {})
        }
      };
    } catch (error) {
      return clone(DEFAULT_STATE);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        APP.storageKey,
        JSON.stringify(state)
      );
    } catch (error) {
      console.warn("PostX storage error:", error);
    }
  }

  /* =========================================================
     HELPERS
     ========================================================= */

  function uid(prefix = "post") {
    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 9)
    );
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function truncate(value, length = 120) {
    const text = String(value || "");

    if (text.length <= length) {
      return text;
    }

    return text.slice(0, length).trimEnd() + "…";
  }

  function normalizeHashtags(value) {
    return String(value || "")
      .split(/[\s,]+/)
      .map(item => item.trim())
      .filter(Boolean)
      .map(item =>
        item.startsWith("#") ? item : "#" + item
      )
      .join(" ");
  }

  function buildCaption(caption, hashtags) {
    const body = String(caption || "").trim();
    const tags = normalizeHashtags(hashtags);

    return [body, tags]
      .filter(Boolean)
      .join("\n\n");
  }

  function getPostById(id) {
    return state.posts.find(post => post.id === id) || null;
  }

  function getPlatforms(post) {
    if (!post || !Array.isArray(post.platforms)) {
      return [];
    }

    return post.platforms
      .map(id => PLATFORM[id])
      .filter(Boolean);
  }

  function closeMobileMenu() {
    document
      .getElementById("postxSidebar")
      ?.classList.remove("open");

    document
      .getElementById("postxOverlay")
      ?.classList.remove("show");
  }

  /* =========================================================
     DARK PREMIUM THEME
     ========================================================= */

  function injectStyles() {
    if (document.getElementById("postx-runtime-styles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "postx-runtime-styles";

    style.textContent = `
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        min-height: 100% !important;
        background: #07111f !important;
        color: #f5f7fa !important;
      }

      body {
        font-family:
          Inter,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif !important;

        background:
          radial-gradient(
            circle at 10% 0%,
            rgba(0, 212, 255, .12),
            transparent 30%
          ),
          radial-gradient(
            circle at 90% 5%,
            rgba(124, 58, 237, .14),
            transparent 30%
          ),
          #07111f !important;
      }

      body,
      body *,
      #app,
      #app *,
      #postx-app,
      #postx-app * {
        scrollbar-color: #263c55 #07111f;
      }

      #app,
      #postx-app,
      main {
        background: transparent !important;
        color: #f5f7fa !important;
      }

      #postx-app {
        min-height: 100vh !important;
      }

      #postx-app * {
        box-sizing: border-box;
      }

      button,
      input,
      textarea,
      select {
        font: inherit !important;
      }

      button {
        cursor: pointer !important;
      }

      .postx-shell {
        min-height: 100vh;
        display: flex;
      }

      /* SIDEBAR */

      .postx-sidebar {
        width: 270px;
        min-width: 270px;

        position: fixed;
        inset: 0 auto 0 0;

        z-index: 1000;

        padding: 22px 16px;

        display: flex;
        flex-direction: column;

        background:
          linear-gradient(
            180deg,
            #091625 0%,
            #07111f 100%
          ) !important;

        border-right: 1px solid rgba(255,255,255,.08);

        box-shadow:
          12px 0 40px rgba(0,0,0,.25);

        overflow-y: auto;
      }

      .postx-brand {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 7px 10px 26px;
      }

      .postx-brand-mark {
        width: 45px;
        height: 45px;

        display: grid;
        place-items: center;

        border-radius: 13px;

        font-size: 22px;
        font-weight: 900;

        color: #fff;

        background:
          linear-gradient(
            135deg,
            #8b5cf6,
            #ec4899
          );

        box-shadow:
          0 8px 28px rgba(124,58,237,.4);
      }

      .postx-brand-name {
        font-size: 20px;
        font-weight: 900;
        color: #fff;
      }

      .postx-brand-sub {
        margin-top: 2px;
        font-size: 9px;
        letter-spacing: .6px;
        color: #718198;
      }

      .postx-create-btn {
        width: 100%;
        border: 0;

        border-radius: 13px;

        padding: 14px 16px;

        margin-bottom: 18px;

        color: #fff !important;

        font-weight: 850;

        background:
          linear-gradient(
            135deg,
            #00d4ff,
            #7c3aed
          ) !important;

        box-shadow:
          0 10px 28px rgba(0,212,255,.22);

        transition: .2s ease;
      }

      .postx-create-btn:hover {
        transform: translateY(-1px);
        box-shadow:
          0 13px 32px rgba(0,212,255,.3);
      }

      .postx-nav {
        display: grid;
        gap: 6px;
      }

      .postx-nav-btn {
        width: 100%;

        display: flex;
        align-items: center;
        gap: 12px;

        border: 0;

        padding: 12px 13px;

        border-radius: 12px;

        background: transparent !important;

        color: #8ea0b5 !important;

        text-align: left;

        transition: .18s ease;
      }

      .postx-nav-btn:hover {
        background: rgba(255,255,255,.055) !important;
        color: #fff !important;
      }

      .postx-nav-btn.active {
        background:
          linear-gradient(
            90deg,
            rgba(0,212,255,.18),
            rgba(124,58,237,.18)
          ) !important;

        color: #fff !important;

        box-shadow:
          inset 3px 0 0 #00d4ff,
          0 4px 18px rgba(0,0,0,.12);
      }

      .postx-nav-icon {
        width: 22px;
        text-align: center;
        font-weight: 900;
      }

      /* MAIN */

      .postx-main {
        width: calc(100% - 270px);

        min-height: 100vh;

        margin-left: 270px;

        background: transparent !important;
      }

      .postx-page {
        width: 100%;
        max-width: 1400px;

        margin: 0 auto;

        padding: 30px;
      }

      .postx-page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;

        gap: 20px;

        margin-bottom: 26px;
      }

      .postx-page-title {
        margin: 0;

        color: #fff !important;

        font-size: clamp(28px, 4vw, 38px);

        line-height: 1.1;

        font-weight: 900;

        letter-spacing: -.9px;
      }

      .postx-page-subtitle {
        margin: 8px 0 0;

        color: #8fa1b5 !important;

        font-size: 14px;
      }

      /* CARDS */

      .postx-card {
        background:
          linear-gradient(
            145deg,
            rgba(13,27,42,.98),
            rgba(16,37,58,.88)
          ) !important;

        border:
          1px solid rgba(255,255,255,.08) !important;

        border-radius: 18px;

        color: #f5f7fa !important;

        box-shadow:
          0 18px 50px rgba(0,0,0,.25);
      }

      /* STATS */

      .postx-stats {
        display: grid;

        grid-template-columns:
          repeat(4, minmax(0, 1fr));

        gap: 16px;

        margin-bottom: 24px;
      }

      .postx-stat {
        padding: 21px;
        min-height: 145px;
      }

      .postx-stat-label {
        display: flex;
        align-items: center;
        gap: 8px;

        color: #94a3b8 !important;

        font-size: 13px;
        font-weight: 700;
      }

      .postx-stat-value {
        margin-top: 11px;

        color: #fff !important;

        font-size: 35px;

        font-weight: 900;

        letter-spacing: -.8px;

        text-shadow:
          0 0 18px rgba(0,212,255,.18);
      }

      .postx-stat-sub {
        margin-top: 6px;

        color: #00d4ff !important;

        font-size: 12px;
      }

      /* DASHBOARD */

      .postx-dashboard-grid {
        display: grid;

        grid-template-columns:
          1.35fr .9fr;

        gap: 20px;
      }

      .postx-section-card {
        padding: 21px;
      }

      .postx-section-head {
        display: flex;
        justify-content: space-between;
        align-items: center;

        gap: 12px;

        margin-bottom: 18px;
      }

      .postx-section-title {
        margin: 0;

        color: #fff !important;

        font-size: 17px;
        font-weight: 850;
      }

      /* BUTTONS */

      .postx-btn {
        border:
          1px solid rgba(255,255,255,.1) !important;

        border-radius: 11px;

        padding: 10px 15px;

        color: #fff !important;

        background:
          #0d1b2a !important;

        font-weight: 750;

        transition: .18s ease;
      }

      .postx-btn:hover {
        background: #14283c !important;
        border-color: rgba(0,212,255,.3) !important;
      }

      .postx-btn-primary {
        border: 0 !important;

        color: #03121d !important;

        background:
          linear-gradient(
            135deg,
            #00d4ff,
            #1687ff
          ) !important;

        box-shadow:
          0 8px 22px rgba(0,212,255,.22);
      }

      .postx-btn-danger {
        color: #fff !important;
        background: #991b1b !important;
        border-color: rgba(239,68,68,.25) !important;
      }

      /* LIST */

      .postx-list {
        display: grid;
        gap: 11px;
      }

      .postx-list-item {
        display: flex;
        align-items: center;

        gap: 13px;

        padding: 13px;

        border:
          1px solid rgba(255,255,255,.07);

        border-radius: 13px;

        background:
          rgba(255,255,255,.025);

        min-width: 0;
      }

      .postx-list-thumb {
        width: 52px;
        height: 52px;

        flex: 0 0 52px;

        display: grid;
        place-items: center;

        overflow: hidden;

        border-radius: 11px;

        color: #00d4ff;

        font-weight: 900;

        background: #07111f;
      }

      .postx-list-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .postx-list-body {
        flex: 1;
        min-width: 0;
      }

      .postx-list-title {
        color: #fff;

        font-weight: 750;

        white-space: nowrap;

        overflow: hidden;

        text-overflow: ellipsis;
      }

      .postx-list-meta {
        margin-top: 4px;

        color: #8192a7;

        font-size: 12px;
      }

      /* STATUS */

      .postx-status {
        display: inline-flex;

        align-items: center;

        padding: 5px 9px;

        border-radius: 999px;

        font-size: 10px;

        font-weight: 850;

        text-transform: uppercase;
      }

      .postx-status-draft {
        background: rgba(245,158,11,.14);
        color: #fbbf24;
      }

      .postx-status-scheduled {
        background: rgba(0,212,255,.14);
        color: #00d4ff;
      }

      .postx-status-published {
        background: rgba(34,197,94,.14);
        color: #22c55e;
      }

      /* PLATFORM BADGES */

      .postx-platforms {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .postx-platform-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;

        padding: 5px 8px;

        border-radius: 999px;

        font-size: 10px;

        font-weight: 800;

        background: rgba(255,255,255,.06);

        border: 1px solid rgba(255,255,255,.07);
      }

      .postx-platform-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }

      /* CREATE */

      .postx-create-grid {
        display: grid;

        grid-template-columns:
          minmax(0,1.3fr)
          minmax(280px,.8fr);

        gap: 20px;
      }

      .postx-form-card {
        padding: 22px;
      }

      .postx-field {
        margin-bottom: 18px;
      }

      .postx-label {
        display: block;

        margin-bottom: 8px;

        color: #cbd5e1 !important;

        font-size: 13px;

        font-weight: 800;
      }

      .postx-input,
      .postx-textarea,
      .postx-select {
        width: 100%;

        border:
          1px solid rgba(255,255,255,.1) !important;

        border-radius: 12px;

        padding: 12px 13px;

        outline: none;

        color: #fff !important;

        background:
          rgba(255,255,255,.045) !important;
      }

      .postx-input::placeholder,
      .postx-textarea::placeholder {
        color: #667991 !important;
      }

      .postx-input:focus,
      .postx-textarea:focus,
      .postx-select:focus {
        border-color: #00d4ff !important;

        box-shadow:
          0 0 0 3px rgba(0,212,255,.09);
      }

      .postx-textarea {
        min-height: 190px;
        resize: vertical;
      }

      /* PLATFORM SELECTOR */

      .postx-platform-grid {
        display: grid;

        grid-template-columns:
          repeat(3, minmax(0,1fr));

        gap: 10px;
      }

      .postx-platform-option {
        position: relative;

        display: flex;

        align-items: center;

        gap: 9px;

        min-height: 58px;

        padding: 12px;

        border-radius: 13px;

        border:
          1px solid rgba(255,255,255,.09);

        background:
          rgba(255,255,255,.025);

        color: #94a3b8;

        cursor: pointer;

        transition: .18s ease;
      }

      .postx-platform-option:hover {
        border-color:
          rgba(0,212,255,.3);
      }

      .postx-platform-option.selected {
        color: #fff;

        border-color:
          rgba(0,212,255,.65);

        background:
          linear-gradient(
            135deg,
            rgba(0,212,255,.12),
            rgba(124,58,237,.12)
          );

        box-shadow:
          0 0 0 1px rgba(0,212,255,.1);
      }

      .postx-platform-option input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .postx-platform-icon {
        width: 30px;
        height: 30px;

        display: grid;
        place-items: center;

        border-radius: 9px;

        color: #fff;

        font-weight: 900;

        background: rgba(255,255,255,.08);
      }

      .postx-platform-name {
        font-size: 12px;
        font-weight: 800;
      }

      .postx-platform-status {
        margin-top: 2px;

        color: #6f8196;

        font-size: 9px;
      }

      /* UPLOAD */

      .postx-upload {
        display: block;

        padding: 28px 16px;

        text-align: center;

        border:
          2px dashed rgba(255,255,255,.14);

        border-radius: 14px;

        color: #94a3b8;

        background:
          rgba(255,255,255,.02);

        cursor: pointer;

        transition: .18s ease;
      }

      .postx-upload:hover {
        border-color: #00d4ff;
        background: rgba(0,212,255,.04);
      }

      .postx-upload input {
        display: none;
      }

      .postx-image-preview {
        width: 100%;

        max-height: 360px;

        object-fit: cover;

        border-radius: 13px;

        margin-top: 12px;

        border:
          1px solid rgba(255,255,255,.08);
      }

      /* PREVIEW */

      .postx-preview-phone {
        width: 100%;
        max-width: 370px;

        margin: 0 auto;

        overflow: hidden;

        border-radius: 24px;

        border:
          1px solid rgba(255,255,255,.09);

        background: #0d1b2a;

        box-shadow:
          0 18px 50px rgba(0,0,0,.35);
      }

      .postx-preview-header {
        display: flex;
        align-items: center;
        gap: 10px;

        padding: 14px;

        border-bottom:
          1px solid rgba(255,255,255,.07);
      }

      .postx-preview-avatar {
        width: 36px;
        height: 36px;

        display: grid;
        place-items: center;

        border-radius: 50%;

        color: #fff;

        font-weight: 900;

        background:
          linear-gradient(
            135deg,
            #8b5cf6,
            #ec4899
          );
      }

      .postx-preview-content {
        padding: 14px;

        color: #e8edf3;
        white-space: pre-wrap;

        font-size: 14px;

        line-height: 1.55;
      }

      .postx-preview-image {
        display: block;

        width: 100%;

        max-height: 330px;

        object-fit: cover;
      }

      /* CALENDAR */

      .postx-calendar {
        display: grid;

        grid-template-columns:
          repeat(7, minmax(0,1fr));

        gap: 8px;
      }

      .postx-calendar-day {
        min-height: 100px;

        padding: 10px;

        border-radius: 12px;

        border:
          1px solid rgba(255,255,255,.07);

        background:
          rgba(255,255,255,.025);
      }

      .postx-calendar-number {
        color: #fff;

        font-size: 12px;

        font-weight: 850;
      }

      .postx-calendar-post {
        margin-top: 8px;

        padding: 5px;

        border-radius: 7px;

        color: #00d4ff;

        background:
          rgba(0,212,255,.08);

        font-size: 9px;
      }

      /* EMPTY */

      .postx-empty {
        padding: 45px 20px;

        text-align: center;

        color: #72849a;
      }

      .postx-empty-icon {
        margin-bottom: 12px;

        font-size: 36px;

        opacity: .7;
      }

      /* TOAST */

      .postx-toast-container {
        position: fixed;

        right: 18px;
        bottom: 18px;

        z-index: 99999;

        width:
          min(360px, calc(100vw - 36px));

        display: grid;

        gap: 9px;
      }

      .postx-toast {
        padding: 13px 15px;

        border-radius: 12px;

        color: #fff;

        background: #111827;

        box-shadow:
          0 14px 35px rgba(0,0,0,.35);

        font-size: 13px;

        font-weight: 700;

        animation:
          postxToastIn .2s ease;
      }

      .postx-toast.success {
        background: #166534;
      }

      .postx-toast.error {
        background: #991b1b;
      }

      @keyframes postxToastIn {
        from {
          transform: translateY(10px);
          opacity: 0;
        }

        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      /* MOBILE */

      .postx-mobile-header {
        display: none;
      }

      .postx-overlay {
        display: none;

        position: fixed;

        inset: 0;

        z-index: 900;

        background:
          rgba(0,0,0,.65);

        backdrop-filter:
          blur(3px);
      }

      .postx-overlay.show {
        display: block;
      }

      @media(max-width:1100px) {
        .postx-stats {
          grid-template-columns:
            repeat(2, minmax(0,1fr));
        }

        .postx-dashboard-grid,
        .postx-create-grid {
          grid-template-columns: 1fr;
        }
      }

      @media(max-width:760px) {
        .postx-sidebar {
          transform: translateX(-105%);
          transition: transform .22s ease;
        }

        .postx-sidebar.open {
          transform: translateX(0);
        }

        .postx-main {
          width: 100%;
          margin-left: 0;
        }

        .postx-mobile-header {
          position: sticky;

          top: 0;

          z-index: 800;

          height: 62px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          padding: 0 15px;

          background:
            rgba(9,22,37,.96) !important;

          backdrop-filter:
            blur(14px);

          border-bottom:
            1px solid rgba(255,255,255,.08);
        }

        .postx-page {
          padding: 20px 14px 35px;
        }

        .postx-page-header {
          margin-bottom: 20px;
        }

        .postx-page-title {
          font-size: 30px;
        }

        .postx-stats {
          grid-template-columns:
            repeat(2, minmax(0,1fr));

          gap: 10px;
        }

        .postx-stat {
          padding: 15px;
          min-height: 120px;
        }

        .postx-stat-value {
          font-size: 28px;
        }

        .postx-platform-grid {
          grid-template-columns: 1fr;
        }

        .postx-calendar {
          grid-template-columns:
            repeat(2, minmax(0,1fr));
        }
      }

      @media(max-width:430px) {
        .postx-stats {
          grid-template-columns: 1fr 1fr;
        }

        .postx-stat-label {
          font-size: 11px;
        }

        .postx-stat-value {
          font-size: 25px;
        }

        .postx-calendar {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     ROOT
     ========================================================= */

  function ensureRoot() {
    let root =
      document.querySelector("#postx-app") ||
      document.querySelector("#app");

    if (!root) {
      root = document.createElement("div");
      root.id = "postx-app";

      document.body.appendChild(root);
    }

    root.classList.add("postx-root");

    return root;
  }

  /* =========================================================
     SHELL
     ========================================================= */

  function renderShell(root) {
    root.innerHTML = `
      <div class="postx-shell">

        <aside
          class="postx-sidebar"
          id="postxSidebar"
        >

          <div class="postx-brand">
            <div class="postx-brand-mark">P</div>

            <div>
              <div class="postx-brand-name">
                PostX
              </div>

              <div class="postx-brand-sub">
                SMART SOCIAL PUBLISHER
              </div>
            </div>
          </div>

          <button
            class="postx-create-btn"
            data-postx-nav="create"
          >
            + Create Post
          </button>

          <nav class="postx-nav">
            ${NAV_ITEMS.map(item => `
              <button
                class="postx-nav-btn ${
                  state.activePage === item.id
                    ? "active"
                    : ""
                }"
                data-postx-nav="${escapeHTML(item.id)}"
              >
                <span class="postx-nav-icon">
                  ${escapeHTML(item.icon)}
                </span>

                <span>
                  ${escapeHTML(item.label)}
                </span>
              </button>
            `).join("")}
          </nav>

          <div
            style="
              margin-top:auto;
              padding:18px 10px 4px;
              color:#52657a;
              font-size:10px;
              line-height:1.6;
            "
          >
            PostX v${APP.version}<br>
            Dark Premium • Local Storage
          </div>

        </aside>

        <div
          class="postx-overlay"
          id="postxOverlay"
        ></div>

        <main class="postx-main">

          <header class="postx-mobile-header">

            <div
              style="
                display:flex;
                align-items:center;
                gap:9px;
                font-weight:900;
              "
            >
              <span
                style="
                  width:30px;
                  height:30px;
                  display:grid;
                  place-items:center;
                  border-radius:9px;
                  background:linear-gradient(
                    135deg,
                    #8b5cf6,
                    #ec4899
                  );
                "
              >
                P
              </span>

              PostX
            </div>

            <button
              id="postxMenuButton"
              aria-label="Open menu"
              style="
                width:40px;
                height:40px;
                border-radius:10px;
                border:1px solid rgba(255,255,255,.1);
                background:#0d1b2a;
                color:#fff;
              "
            >
              ☰
            </button>

          </header>

          <div id="postxPageContainer"></div>

        </main>

      </div>

      <div
        class="postx-toast-container"
        id="postxToastContainer"
      ></div>
    `;

    document
      .querySelectorAll("[data-postx-nav]")
      .forEach(button => {
        button.addEventListener("click", () => {
          navigate(button.dataset.postxNav);
        });
      });

    document
      .getElementById("postxMenuButton")
      ?.addEventListener("click", () => {
        document
          .getElementById("postxSidebar")
          ?.classList.toggle("open");

        document
          .getElementById("postxOverlay")
          ?.classList.toggle("show");
      });

    document
      .getElementById("postxOverlay")
      ?.addEventListener("click", closeMobileMenu);
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

  function navigate(page) {
    if (!NAV_ITEMS.some(item => item.id === page)) {
      page = "dashboard";
    }

    state.activePage = page;

    if (page !== "create") {
      state.editingPostId = null;
    }

    saveState();

    closeMobileMenu();

    render();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function render() {
    const container =
      document.getElementById("postxPageContainer");

    if (!container) return;

    document
      .querySelectorAll("[data-postx-nav]")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.postxNav === state.activePage
        );
      });

    switch (state.activePage) {
      case "dashboard":
        renderDashboard(container);
        break;

      case "create":
        renderCreate(container);
        break;

      case "scheduled":
        renderListPage(container, "scheduled");
        break;

      case "drafts":
        renderListPage(container, "drafts");
        break;

      case "published":
        renderListPage(container, "published");
        break;

      case "calendar":
        renderCalendar(container);
        break;

      default:
        renderDashboard(container);
    }
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */

  function renderDashboard(container) {
    const total = state.posts.length;

    const scheduled =
      state.posts.filter(
        post => post.status === "scheduled"
      ).length;

    const drafts =
      state.posts.filter(
        post => post.status === "draft"
      ).length;

    const published =
      state.posts.filter(
        post => post.status === "published"
      ).length;

    const recent = [...state.posts]
      .sort(
        (a, b) =>
          new Date(
            b.updatedAt || b.createdAt
          ) -
          new Date(
            a.updatedAt || a.createdAt
          )
      )
      .slice(0, 5);

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">

          <div>
            <h1 class="postx-page-title">
              Dashboard
            </h1>

            <p class="postx-page-subtitle">
              Welcome back, ${escapeHTML(
                state.profile.name
              )} • Here's your social media overview
            </p>
          </div>

          <div>
            <button
              class="postx-btn postx-btn-primary"
              data-postx-nav="create"
            >
              + Create Post
            </button>
          </div>

        </div>

        <section class="postx-stats">

          ${statCard(
            "📄",
            "Total Posts",
            total,
            "+12% from last month ↗"
          )}

          ${statCard(
            "◷",
            "Scheduled",
            scheduled,
            "+3 scheduled this week ↗"
          )}

          ${statCard(
            "✎",
            "Drafts",
            drafts,
            drafts
              ? "Ready for review"
              : "No drafts yet"
          )}

          ${statCard(
            "✓",
            "Published",
            published,
            "+8 published this month ↗"
          )}

        </section>

        <section class="postx-dashboard-grid">

          <div class="postx-card postx-section-card">

            <div class="postx-section-head">

              <h2 class="postx-section-title">
                Recent Posts
              </h2>

              <button
                class="postx-btn"
                style="
                  padding:7px 10px;
                  font-size:11px;
                "
                data-postx-nav="published"
              >
                See all →
              </button>

            </div>

            ${
              recent.length
                ? `
                  <div class="postx-list">
                    ${recent
                      .map(postListItem)
                      .join("")}
                  </div>
                `
                : emptyState(
                    "✦",
                    "No posts yet",
                    "Create your first social media post."
                  )
            }

          </div>

          <div style="display:grid;gap:20px">

            <div class="postx-card postx-section-card">

              <h2 class="postx-section-title">
                Performance Overview
              </h2>

              <p
                style="
                  color:#8294a9;
                  font-size:13px;
                  margin:6px 0 14px;
                "
              >
                Last 7 days engagement
              </p>

              <div
                style="
                  height:145px;
                  display:flex;
                  align-items:flex-end;
                  gap:8px;
                  padding:15px;
                  border-radius:13px;
                  background:
                    linear-gradient(
                      to top,
                      rgba(0,212,255,.12),
                      rgba(0,212,255,.015)
                    );
                  border:
                    1px solid rgba(0,212,255,.1);
                "
              >
                ${[38,55,44,76,62,88,72]
                  .map(
                    height => `
                      <div
                        style="
                          flex:1;
                          height:${height}%;
                          min-height:8px;
                          border-radius:5px 5px 2px 2px;
                          background:
                            linear-gradient(
                              to top,
                              #00d4ff,
                              #7c3aed
                            );
                          opacity:.85;
                        "
                      ></div>
                    `
                  )
                  .join("")}
              </div>

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  margin-top:14px;
                "
              >
                <div>
                  <div
                    style="
                      color:#00d4ff;
                      font-size:19px;
                      font-weight:900;
                    "
                  >
                    4.8%
                  </div>

                  <div
                    style="
                      color:#718399;
                      font-size:10px;
                    "
                  >
                    Engagement Rate
                  </div>
                </div>

                <div style="text-align:right">
                  <div
                    style="
                      color:#fff;
                      font-size:19px;
                      font-weight:900;
                    "
                  >
                    12.4k
                  </div>

                  <div
                    style="
                      color:#718399;
                      font-size:10px;
                    "
                  >
                    Avg Reach
                  </div>
                </div>
              </div>

            </div>

            <div class="postx-card postx-section-card">

              <h2 class="postx-section-title">
                Connected Platforms
              </h2>

              <div
                style="
                  display:grid;
                  gap:9px;
                  margin-top:14px;
                "
              >
                ${Object.values(PLATFORM)
                  .map(platformRow)
                  .join("")}
              </div>

            </div>

          </div>

        </section>

      </div>
    `;

    bindNavigationButtons(container);
  }

  function statCard(icon, label, value, sub) {
    return `
      <div class="postx-card postx-stat">

        <div class="postx-stat-label">
          <span>${icon}</span>
          ${escapeHTML(label)}
        </div>

        <div class="postx-stat-value">
          ${value}
        </div>

        <div class="postx-stat-sub">
          ${escapeHTML(sub)}
        </div>

      </div>
    `;
  }

  function platformRow(platform) {
    const connected =
      !!state.connectedAccounts[platform.id];

    return `
      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:10px;
          border-radius:11px;
          background:rgba(255,255,255,.025);
          border:1px solid rgba(255,255,255,.06);
        "
      >

        <div
          style="
            display:flex;
            align-items:center;
            gap:10px;
          "
        >

          <span
            class="postx-platform-icon"
            style="
              background:${platform.color};
            "
          >
            ${platform.icon}
          </span>

          <div>
            <div
              style="
                color:#fff;
                font-size:12px;
                font-weight:800;
              "
            >
              ${platform.name}
            </div>

            <div
              style="
                color:#718399;
                font-size:9px;
              "
            >
              ${connected ? "Connected" : "Not connected"}
            </div>
          </div>

        </div>

        <span
          style="
            width:8px;
            height:8px;
            border-radius:50%;
            background:${connected ? "#22c55e" : "#64748b"};
            box-shadow:${connected
              ? "0 0 10px rgba(34,197,94,.5)"
              : "none"};
          "
        ></span>

      </div>
    `;
  }

  /* =========================================================
     CREATE POST
     ========================================================= */

  function renderCreate(container) {
    const editing =
      state.editingPostId
        ? getPostById(state.editingPostId)
        : null;

    const post = editing || {
      caption: "",
      hashtags: "",
      platforms: [],
      imageData: "",
      scheduledAt: ""
    };

    const selectedPlatforms =
      Array.isArray(post.platforms)
        ? post.platforms
        : [];

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">

          <div>
            <h1 class="postx-page-title">
              ${editing ? "Edit Post" : "Create Post"}
            </h1>

            <p class="postx-page-subtitle">
              Create content and choose exactly where it should be published.
            </p>
          </div>

        </div>

        <div class="postx-create-grid">

          <!-- FORM -->

          <div class="postx-card postx-form-card">

            <div class="postx-field">

              <label class="postx-label">
                Publish to
              </label>

              <div class="postx-platform-grid">

                ${Object.values(PLATFORM)
                  .map(platform => {
                    const selected =
                      selectedPlatforms.includes(
                        platform.id
                      );

                    const connected =
                      !!state.connectedAccounts[
                        platform.id
                      ];

                    return `
                      <label
                        class="
                          postx-platform-option
                          ${selected ? "selected" : ""}
                          ${!connected ? "disabled" : ""}
                        "
                        data-platform-label="${platform.id}"
                        style="
                          opacity:${connected ? "1" : ".45"};
                        "
                      >

                        <input
                          type="checkbox"
                          name="postx-platform"
                          value="${platform.id}"
                          ${selected ? "checked" : ""}
                          ${!connected ? "disabled" : ""}
                        >

                        <span
                          class="postx-platform-icon"
                          style="
                            background:${platform.color};
                          "
                        >
                          ${platform.icon}
                        </span>

                        <span>
                          <span
                            class="postx-platform-name"
                          >
                            ${platform.name}
                          </span>

                          <span
                            class="postx-platform-status"
                            style="display:block"
                          >
                            ${
                              connected
                                ? "Connected"
                                : "Not connected"
                            }
                          </span>
                        </span>

                      </label>
                    `;
                  })
                  .join("")}

              </div>

              <div
                style="
                  margin-top:8px;
                  color:#63758a;
                  font-size:10px;
                "
              >
                Select one or more connected platforms.
              </div>

            </div>

            <div class="postx-field">

              <label class="postx-label">
                Caption
              </label>

              <textarea
                id="postxCaption"
                class="postx-textarea"
                placeholder="Write your post here..."
              >${escapeHTML(
                post.caption || ""
              )}</textarea>

              <div
                style="
                  display:flex;
                  justify-content:flex-end;
                  margin-top:5px;
                  color:#63758a;
                  font-size:10px;
                "
                id="postxCharacterCount"
              >
                0 characters
              </div>

            </div>

            <div class="postx-field">

              <label class="postx-label">
                Hashtags
              </label>

              <input
                id="postxHashtags"
                class="postx-input"
                value="${escapeHTML(
                  post.hashtags || ""
                )}"
                placeholder="marketing socialmedia PostX"
              >

            </div>

            <div class="postx-field">

              <label class="postx-label">
                Image
              </label>

              <label class="postx-upload">

                <input
                  type="file"
                  id="postxImageInput"
                  accept="image/*"
                >

                <div style="font-size:28px">
                  ${post.imageData ? "🖼️" : "＋"}
                </div>

                <div
                  style="
                    color:#cbd5e1;
                    font-weight:800;
                    margin-top:7px;
                  "
                >
                  ${
                    post.imageData
                      ? "Change image"
                      : "Upload image"
                  }
                </div>

                <div
                  style="
                    margin-top:4px;
                    font-size:10px;
                  "
                >
                  JPG, PNG or WEBP
                </div>

              </label>

              <div id="postxImagePreview">
                ${
                  post.imageData
                    ? `
                      <img
                        class="postx-image-preview"
                        src="${escapeHTML(
                          post.imageData
                        )}"
                        alt="Post image"
                      >
                    `
                    : ""
                }
              </div>

            </div>

            <div class="postx-field">

              <label class="postx-label">
                Schedule
              </label>

              <input
                type="datetime-local"
                id="postxSchedule"
                class="postx-input"
                value="${escapeHTML(
                  toDateTimeLocal(
                    post.scheduledAt
                  )
                )}"
              >

              <div
                style="
                  margin-top:6px;
                  color:#63758a;
                  font-size:10px;
                "
              >
                Leave empty to publish immediately.
              </div>

            </div>

            <div
              style="
                display:flex;
                gap:10px;
                flex-wrap:wrap;
                margin-top:24px;
              "
            >

              <button
                class="postx-btn"
                id="postxSaveDraft"
              >
                Save Draft
              </button>

              <button
                class="postx-btn"
                id="postxSchedulePost"
              >
                Schedule
              </button>

              <button
                class="postx-btn postx-btn-primary"
                id="postxPublishPost"
              >
                Publish Now
              </button>

            </div>

          </div>

          <!-- PREVIEW -->

          <div>

            <div
              class="postx-card postx-section-card"
              style="position:sticky;top:85px"
            >

              <div class="postx-section-head">

                <h2 class="postx-section-title">
                  Live Preview
                </h2>

                <span
                  style="
                    color:#00d4ff;
                    font-size:10px;
                    font-weight:800;
                  "
                >
                  POSTX
                </span>

              </div>

              <div
                id="postxPreview"
                class="postx-preview-phone"
              ></div>

            </div>

          </div>

        </div>

      </div>
    `;

    bindCreateEvents();

    updateCreatePreview();
  }

  function bindCreateEvents() {
    document
      .querySelectorAll(
        'input[name="postx-platform"]'
      )
      .forEach(input => {
        input.addEventListener("change", () => {
          const label =
            input.closest(
              ".postx-platform-option"
            );

          label?.classList.toggle(
            "selected",
            input.checked
          );

          updateCreatePreview();
        });
      });

    const caption =
      document.getElementById(
        "postxCaption"
      );

    const hashtags =
      document.getElementById(
        "postxHashtags"
      );

    caption?.addEventListener(
      "input",
      updateCreatePreview
    );

    hashtags?.addEventListener(
      "input",
      updateCreatePreview
    );

    document
      .getElementById("postxSchedule")
      ?.addEventListener(
        "input",
        updateCreatePreview
      );

    document
      .getElementById("postxImageInput")
      ?.addEventListener(
        "change",
        handleImageUpload
      );

    document
      .getElementById("postxSaveDraft")
      ?.addEventListener(
        "click",
        () => savePost("draft")
      );

    document
      .getElementById("postxSchedulePost")
      ?.addEventListener(
        "click",
        () => savePost("scheduled")
      );

    document
      .getElementById("postxPublishPost")
      ?.addEventListener(
        "click",
        () => savePost("published")
      );
  }

  function getCreateFormData() {
    const platforms = [
      ...document.querySelectorAll(
        'input[name="postx-platform"]:checked'
      )
    ].map(input => input.value);

    const caption =
      document.getElementById(
        "postxCaption"
      )?.value || "";

    const hashtags =
      document.getElementById(
        "postxHashtags"
      )?.value || "";

    const schedule =
      document.getElementById(
        "postxSchedule"
      )?.value || "";

    const preview =
      document.querySelector(
        "#postxImagePreview img"
      );

    return {
      platforms,
      caption: caption.trim(),
      hashtags: hashtags.trim(),
      scheduledAt: schedule
        ? new Date(schedule).toISOString()
        : "",
      imageData:
        preview?.src || ""
    };
  }

  function validatePost(data, status) {
    if (!data.platforms.length) {
      toast(
        "Select at least one platform.",
        "error"
      );

      return false;
    }

    if (!data.caption && !data.imageData) {
      toast(
        "Add a caption or image first.",
        "error"
      );

      return false;
    }

    if (
      status === "scheduled" &&
      !data.scheduledAt
    ) {
      toast(
        "Choose a date and time for scheduling.",
        "error"
      );

      return false;
    }

    if (
      status === "scheduled" &&
      new Date(data.scheduledAt) <= new Date()
    ) {
      toast(
        "Scheduled time must be in the future.",
        "error"
      );

      return false;
    }

    return true;
  }

  function savePost(status) {
    const data = getCreateFormData();

    if (!validatePost(data, status)) {
      return;
    }

    const now =
      new Date().toISOString();

    if (state.editingPostId) {
      const existing =
        getPostById(
          state.editingPostId
        );

      if (!existing) {
        state.editingPostId = null;
      } else {
        existing.platforms =
          data.platforms;

        existing.caption =
          data.caption;

        existing.hashtags =
          data.hashtags;

        existing.imageData =
          data.imageData;

        existing.status =
          status;

        existing.updatedAt =
          now;

        existing.scheduledAt =
          status === "scheduled"
            ? data.scheduledAt
            : "";

        existing.publishedAt =
          status === "published"
            ? now
            : "";

        state.editingPostId = null;

        saveState();

        toast(
          statusMessage(status, true),
          "success"
        );

        navigate(statusPage(status));

        return;
      }
    }

    const post = {
      id: uid(),

      platforms:
        data.platforms,

      caption:
        data.caption,

      hashtags:
        data.hashtags,

      imageData:
        data.imageData,

      status,

      scheduledAt:
        status === "scheduled"
          ? data.scheduledAt
          : "",

      publishedAt:
        status === "published"
          ? now
          : "",

      createdAt:
        now,

      updatedAt:
        now
    };

    state.posts.unshift(post);

    saveState();

    toast(
      statusMessage(status, false),
      "success"
    );

    navigate(statusPage(status));
  }

  function statusMessage(status, editing) {
    if (status === "draft") {
      return editing
        ? "Draft updated successfully."
        : "Post saved as draft.";
    }

    if (status === "scheduled") {
      return editing
        ? "Post rescheduled successfully."
        : "Post scheduled successfully.";
    }

    return editing
      ? "Post published successfully."
      : "Post published successfully.";
  }

  function statusPage(status) {
    if (status === "draft") {
      return "drafts";
    }

    if (status === "scheduled") {
      return "scheduled";
    }

    return "published";
  }

  function handleImageUpload(event) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast(
        "Please select an image file.",
        "error"
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const preview =
        document.getElementById(
          "postxImagePreview"
        );

      if (preview) {
        preview.innerHTML = `
          <img
            class="postx-image-preview"
            src="${escapeHTML(
              reader.result
            )}"
            alt="Post image preview"
          >
        `;
      }

      updateCreatePreview();
    };

    reader.readAsDataURL(file);
  }

  function updateCreatePreview() {
    const caption =
      document.getElementById(
        "postxCaption"
      )?.value || "";

    const hashtags =
      document.getElementById(
        "postxHashtags"
      )?.value || "";

    const fullCaption =
      buildCaption(
        caption,
        hashtags
      );

    const image =
      document.querySelector(
        "#postxImagePreview img"
      )?.src || "";

    const platforms = [
      ...document.querySelectorAll(
        'input[name="postx-platform"]:checked'
      )
    ].map(input => input.value);

    const count =
      document.getElementById(
        "postxCharacterCount"
      );

    if (count) {
      count.textContent =
        `${caption.length} characters`;
    }

    const preview =
      document.getElementById(
        "postxPreview"
      );

    if (!preview) return;

    const platform =
      PLATFORM[platforms[0]] ||
      PLATFORM.facebook;

    preview.innerHTML = `
      <div class="postx-preview-header">

        <div
          class="postx-preview-avatar"
          style="
            background:${platform.color};
          "
        >
          ${platform.icon}
        </div>

        <div>
          <div
            style="
              color:#fff;
              font-weight:800;
              font-size:12px;
            "
          >
            PostX
          </div>

          <div
            style="
              color:#718399;
              font-size:9px;
            "
          >
            ${platform.name}
          </div>
        </div>

      </div>

      ${
        image
          ? `
            <img
              class="postx-preview-image"
              src="${escapeHTML(image)}"
              alt="Preview"
            >
          `
          : ""
      }

      <div class="postx-preview-content">
        ${
          fullCaption
            ? escapeHTML(fullCaption)
            : "Your post preview will appear here..."
        }
      </div>

      <div
        style="
          padding:0 14px 14px;
          display:flex;
          gap:14px;
          color:#65778c;
          font-size:11px;
        "
      >
        ♡ Like
       　💬 Comment
       　↗ Share
      </div>
    `;
  }

  function toDateTimeLocal(value) {
    if (!value) return "";

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const pad =
      number =>
        String(number)
          .padStart(2, "0");

    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    );
  }

  /* =========================================================
     LIST PAGES
     ========================================================= */

  function renderListPage(container, status) {
    const posts =
      state.posts
        .filter(
          post =>
            post.status === status
        )
        .sort(
          (a, b) =>
            new Date(
              b.updatedAt || b.createdAt
            ) -
            new Date(
              a.updatedAt || a.createdAt
            )
        );

    const titles = {
      scheduled: "Scheduled Posts",
      drafts: "Drafts",
      published: "Published Posts"
    };

    const subtitles = {
      scheduled:
        "Posts waiting to be published.",
      drafts:
        "Posts saved for later editing.",
      published:
        "Your published social media posts."
    };

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">

          <div>
            <h1 class="postx-page-title">
              ${titles[status]}
            </h1>

            <p class="postx-page-subtitle">
              ${subtitles[status]}
            </p>
          </div>

          <button
            class="postx-btn postx-btn-primary"
            data-postx-nav="create"
          >
            + Create Post
          </button>

        </div>

        ${
          posts.length
            ? `
              <div class="postx-card postx-section-card">

                <div class="postx-list">

                  ${posts
                    .map(
                      post =>
                        postListItem(
                          post,
                          true
                        )
                    )
                    .join("")}

                </div>

              </div>
            `
            : emptyState(
                status === "draft"
                  ? "▤"
                  : status === "scheduled"
                  ? "◷"
                  : "✓",
                `No ${status} posts`,
                "Create a post to get started."
              )
        }

      </div>
    `;

    bindNavigationButtons(container);

    bindPostActions(container);
  }

  function postListItem(post, withActions = false) {
    const platforms =
      getPlatforms(post);

    const date =
      post.status === "scheduled"
        ? post.scheduledAt
        : post.status === "published"
        ? post.publishedAt
        : post.updatedAt;

    return `
      <div
        class="postx-list-item"
        data-post-id="${escapeHTML(post.id)}"
        style="
          align-items:flex-start;
          flex-wrap:wrap;
        "
      >

        <div class="postx-list-thumb">
          ${
            post.imageData
              ? `
                <img
                  src="${escapeHTML(
                    post.imageData
                  )}"
                  alt=""
                >
              `
              : "P"
          }
        </div>

        <div class="postx-list-body">

          <div class="postx-list-title">
            ${escapeHTML(
              truncate(
                post.caption ||
                "Untitled post",
                80
              )
            )}
          </div>

          <div
            class="postx-list-meta"
          >
            ${escapeHTML(
              formatDateTime(date)
            )}
          </div>

          <div
            class="postx-platforms"
            style="margin-top:7px"
          >
            ${
              platforms.length
                ? platforms
                    .map(
                      platform => `
                        <span
                          class="postx-platform-badge"
                        >
                          <span
                            class="postx-platform-dot"
                            style="
                              background:${platform.color};
                            "
                          ></span>

                          ${escapeHTML(
                            platform.name
                          )}
                        </span>
                      `
                    )
                    .join("")
                : ""
            }
          </div>

        </div>

        <div
          style="
            display:flex;
            align-items:center;
            gap:8px;
            margin-left:auto;
          "
        >

          <span
            class="
              postx-status
              postx-status-${escapeHTML(
                post.status
              )}
            "
          >
            ${escapeHTML(post.status)}
          </span>

          ${
            withActions
              ? `
                <button
                  class="postx-btn"
                  data-postx-edit="${escapeHTML(
                    post.id
                  )}"
                  style="
                    padding:6px 9px;
                    font-size:11px;
                  "
                >
                  Edit
                </button>

                <button
                  class="postx-btn postx-btn-danger"
                  data-postx-delete="${escapeHTML(
                    post.id
                  )}"
                  style="
                    padding:6px 9px;
                    font-size:11px;
                  "
                >
                  Delete
                </button>
              `
              : ""
          }

        </div>

      </div>
    `;
  }

  /* =========================================================
     CALENDAR
     ========================================================= */

  function renderCalendar(container) {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      now.getMonth();

    const firstDay =
      new Date(
        year,
        month,
        1
      ).getDay();

    const daysInMonth =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    const postsByDay = {};

    state.posts
      .filter(
        post =>
          post.status === "scheduled" &&
          post.scheduledAt
      )
      .forEach(post => {
        const date =
          new Date(
            post.scheduledAt
          );

        if (
          date.getFullYear() === year &&
          date.getMonth() === month
        ) {
          const day =
            date.getDate();

          if (!postsByDay[day]) {
            postsByDay[day] = [];
          }

          postsByDay[day].push(post);
        }
      });

    const weekdayLabels = [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat"
    ];

    const cells = [];

    for (
      let i = 0;
      i < firstDay;
      i++
    ) {
      cells.push(
        `<div></div>`
      );
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const posts =
        postsByDay[day] || [];

      cells.push(`
        <div
          class="postx-calendar-day"
        >

          <div
            class="postx-calendar-number"
          >
            ${day}
          </div>

          ${
            posts.length
              ? posts
                  .map(
                    post => `
                      <div
                        class="postx-calendar-post"
                      >
                        ${escapeHTML(
                          truncate(
                            post.caption ||
                            "Scheduled post",
                            28
                          )
                        )}
                      </div>
                    `
                  )
                  .join("")
              : ""
          }

        </div>
      `);
    }

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">

          <div>
            <h1 class="postx-page-title">
              Calendar
            </h1>

            <p class="postx-page-subtitle">
              ${now.toLocaleString(
                undefined,
                {
                  month: "long",
                  year: "numeric"
                }
              )}
            </p>
          </div>

          <button
            class="postx-btn postx-btn-primary"
            data-postx-nav="create"
          >
            + Schedule Post
          </button>

        </div>

        <div class="postx-card postx-section-card">

          <div
            class="postx-calendar"
            style="margin-bottom:8px"
          >
            ${weekdayLabels
              .map(
                day => `
                  <div
                    style="
                      padding:7px;
                      color:#65788d;
                      font-size:10px;
                      font-weight:800;
                      text-align:center;
                    "
                  >
                    ${day}
                  </div>
                `
              )
              .join("")}
          </div>

          <div class="postx-calendar">
            ${cells.join("")}
          </div>

        </div>

      </div>
    `;

    bindNavigationButtons(container);
  }

  /* =========================================================
     EDIT / DELETE
     ========================================================= */

  function bindPostActions(container) {
    container
      .querySelectorAll(
        "[data-postx-edit]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            const id =
              button.dataset.postxEdit;

            if (!getPostById(id)) {
              return;
            }

            state.editingPostId = id;

            state.activePage = "create";

            saveState();

            render();
          }
        );
      });

    container
      .querySelectorAll(
        "[data-postx-delete]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            const id =
              button.dataset.postxDelete;

            const post =
              getPostById(id);

            if (!post) return;

            const confirmed =
              window.confirm(
                "Delete this post?"
              );

            if (!confirmed) return;

            state.posts =
              state.posts.filter(
                item =>
                  item.id !== id
              );

            saveState();

            toast(
              "Post deleted.",
              "success"
            );

            render();
          }
        );
      });
  }

  /* =========================================================
     EMPTY STATE
     ========================================================= */

  function emptyState(
    icon,
    title,
    message
  ) {
    return `
      <div class="postx-card postx-empty">

        <div class="postx-empty-icon">
          ${icon}
        </div>

        <div
          style="
            color:#dbe5ef;
            font-weight:850;
            margin-bottom:5px;
          "
        >
          ${escapeHTML(title)}
        </div>

        <div
          style="
            font-size:12px;
            margin-bottom:18px;
          "
        >
          ${escapeHTML(message)}
        </div>

        <button
          class="postx-btn postx-btn-primary"
          data-postx-nav="create"
        >
          + Create Post
        </button>

      </div>
    `;
  }

  /* =========================================================
     EVENT HELPERS
     ========================================================= */

  function bindNavigationButtons(root) {
    root
      .querySelectorAll(
        "[data-postx-nav]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            navigate(
              button.dataset.postxNav
            );
          }
        );
      });
  }

  /* =========================================================
     TOAST
     ========================================================= */

  function toast(
    message,
    type = "success"
  ) {
    const container =
      document.getElementById(
        "postxToastContainer"
      );

    if (!container) return;

    const item =
      document.createElement("div");

    item.className =
      `postx-toast ${type}`;

    item.textContent =
      message;

    container.appendChild(item);

    setTimeout(() => {
      item.remove();
    }, 3200);
  }

  /* =========================================================
     START APPLICATION
     ========================================================= */

  function start() {
    injectStyles();

    const root =
      ensureRoot();

    renderShell(root);

    render();

    saveState();

    console.log(
      `PostX ${APP.version} started successfully.`
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }

})();
