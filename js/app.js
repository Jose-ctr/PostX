/* =========================================================
   POSTX
   FULL DARK PREMIUM FRONTEND ENGINE
   Version 2.0.0
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     APP CONFIG
     ========================================================= */

  const APP = {
    name: "PostX",
    version: "2.0.0",
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
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "⌂"
    },
    {
      id: "create",
      label: "Create Post",
      icon: "+"
    },
    {
      id: "scheduled",
      label: "Scheduled",
      icon: "◷"
    },
    {
      id: "drafts",
      label: "Drafts",
      icon: "▤"
    },
    {
      id: "published",
      label: "Published",
      icon: "✓"
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: "▦"
    }
  ];

  /* =========================================================
     DEFAULT STATE
     ========================================================= */

  const DEFAULT_STATE = {
    posts: [],
    activePage: "dashboard",
    editingPostId: null,

    connectedAccounts: {
      facebook: false,
      instagram: false,
      x: false
    },

    profile: {
      name: "PostX User",
      email: ""
    }
  };

  let state = loadState();

  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

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

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizePlatformList(value) {
    return safeArray(value).filter(
      p => Object.prototype.hasOwnProperty.call(PLATFORM, p)
    );
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

        posts: safeArray(saved.posts),

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
      console.warn("PostX state recovery:", error);
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

  function nowISO() {
    return new Date().toISOString();
  }

  function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
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

    if (isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function truncate(value, length = 100) {
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

  function buildFullCaption(caption, hashtags) {
    const body = String(caption || "").trim();
    const tags = normalizeHashtags(hashtags);

    return [body, tags]
      .filter(Boolean)
      .join("\n\n");
  }

  function getPostById(id) {
    return state.posts.find(post => post.id === id) || null;
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
      /* =====================================================
         POSTX DARK PREMIUM
         ===================================================== */

      :root {
        --postx-bg: #07111f;
        --postx-bg-2: #091827;
        --postx-sidebar: #081321;
        --postx-surface: #0d1b2a;
        --postx-surface-2: #10253a;
        --postx-surface-3: #142c43;

        --postx-text: #f8fafc;
        --postx-muted: #94a3b8;
        --postx-muted-2: #64748b;

        --postx-border: rgba(255,255,255,.09);

        --postx-cyan: #00d4ff;
        --postx-blue: #1687ff;
        --postx-purple: #7c3aed;
        --postx-pink: #ec4899;

        --postx-green: #22c55e;
        --postx-red: #ef4444;
        --postx-yellow: #f59e0b;

        --postx-radius: 18px;
      }

      html {
        background: #07111f !important;
      }

      body {
        margin: 0 !important;
        min-height: 100vh !important;

        background:
          radial-gradient(
            circle at 15% 0%,
            rgba(0,212,255,.12),
            transparent 30%
          ),
          radial-gradient(
            circle at 90% 10%,
            rgba(124,58,237,.16),
            transparent 30%
          ),
          #07111f !important;

        color: #f8fafc !important;

        font-family:
          Inter,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif !important;
      }

      body,
      #app,
      #postx-app,
      main,
      .postx-root,
      .postx-shell,
      .postx-main,
      .postx-page {
        color: #f8fafc !important;
      }

      * {
        box-sizing: border-box;
      }

      button,
      input,
      textarea,
      select {
        font: inherit;
      }

      button {
        cursor: pointer;
      }

      .postx-root {
        min-height: 100vh;
        background: transparent !important;
      }

      .postx-shell {
        min-height: 100vh;
        display: flex;
        background: transparent !important;
      }

      /* SIDEBAR */

      .postx-sidebar {
        width: 270px !important;

        background:
          linear-gradient(
            180deg,
            rgba(8,19,33,.99),
            rgba(7,17,31,.99)
          ) !important;

        border-right: 1px solid var(--postx-border) !important;

        padding: 22px 16px !important;

        display: flex;
        flex-direction: column;

        position: fixed;

        inset: 0 auto 0 0;

        z-index: 100;

        overflow-y: auto;
      }

      .postx-brand {
        display: flex;
        align-items: center;
        gap: 11px;

        padding: 8px 10px 26px;
      }

      .postx-brand-mark {
        width: 44px;
        height: 44px;

        border-radius: 13px;

        display: grid;
        place-items: center;

        font-weight: 900;
        font-size: 22px;

        color: #fff !important;

        background:
          linear-gradient(
            135deg,
            #8b5cf6,
            #ec4899
          ) !important;

        box-shadow:
          0 8px 28px rgba(124,58,237,.38);
      }

      .postx-brand-name {
        font-size: 20px;
        font-weight: 900;
        color: #fff !important;
      }

      .postx-brand-sub {
        font-size: 10px;
        color: #94a3b8 !important;
        margin-top: 2px;
        letter-spacing: .5px;
      }

      .postx-nav {
        display: grid;
        gap: 6px;
      }

      .postx-nav-btn {
        width: 100%;

        border: 0 !important;

        background: transparent !important;

        color: #94a3b8 !important;

        padding: 12px 13px;

        border-radius: 12px;

        display: flex;
        align-items: center;
        gap: 12px;

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
            rgba(124,58,237,.20)
          ) !important;

        color: #fff !important;

        box-shadow:
          inset 3px 0 0 #00d4ff,
          0 8px 20px rgba(0,0,0,.12);
      }

      .postx-create-btn {
        width: 100%;

        border: 0 !important;

        border-radius: 12px;

        padding: 13px 16px;

        font-weight: 800;

        color: #fff !important;

        background:
          linear-gradient(
            135deg,
            #00d4ff,
            #7c3aed
          ) !important;

        box-shadow:
          0 8px 25px rgba(0,212,255,.22);

        margin-bottom: 18px;
      }

      .postx-create-btn:hover {
        transform: translateY(-1px);
        box-shadow:
          0 12px 30px rgba(0,212,255,.30);
      }

      /* MAIN */

      .postx-main {
        margin-left: 270px;

        width: calc(100% - 270px);

        min-height: 100vh;

        background: transparent !important;
      }

      .postx-mobile-header {
        display: none;
      }

      .postx-page {
        max-width: 1400px;

        margin: 0 auto;

        padding: 28px;

        background: transparent !important;
      }

      .postx-page-header {
        display: flex;

        justify-content: space-between;

        align-items: flex-start;

        gap: 20px;

        margin-bottom: 26px;

        flex-wrap: wrap;
      }

      .postx-page-title {
        margin: 0 !important;

        color: #f8fafc !important;

        font-size: 36px;

        font-weight: 900;

        letter-spacing: -.8px;
      }

      .postx-page-subtitle {
        margin: 7px 0 0;

        color: #94a3b8 !important;
      }

      /* CARDS */

      .postx-card {
        background:
          linear-gradient(
            145deg,
            rgba(13,27,42,.98),
            rgba(16,37,58,.88)
          ) !important;

        border: 1px solid rgba(255,255,255,.08) !important;

        border-radius: 18px;

        box-shadow:
          0 15px 45px rgba(0,0,0,.28) !important;

        color: #f8fafc !important;
      }

      /* STATS */

      .postx-stats {
        display: grid;

        grid-template-columns:
          repeat(4, 1fr);

        gap: 16px;

        margin-bottom: 24px;
      }

      .postx-stat {
        padding: 20px;

        position: relative;

        overflow: hidden;
      }

      .postx-stat::after {
        content: "";

        position: absolute;

        width: 100px;
        height: 100px;

        right: -40px;
        bottom: -40px;

        background:
          radial-gradient(
            circle,
            rgba(0,212,255,.18),
            transparent 70%
          );
      }

      .postx-stat-label {
        color: #94a3b8 !important;

        font-size: 13px;

        font-weight: 650;

        display: flex;

        align-items: center;

        gap: 8px;
      }

      .postx-stat-value {
        color: #fff !important;

        font-size: 34px;

        font-weight: 900;

        margin-top: 12px;

        letter-spacing: -.8px;
      }

      .postx-stat-sub {
        color: #00d4ff !important;

        font-size: 12px;

        margin-top: 6px;
      }

      /* DASHBOARD */

      .postx-dashboard-grid {
        display: grid;

        grid-template-columns:
          1.4fr .9fr;

        gap: 20px;
      }

      .postx-section-card {
        padding: 21px;
      }

      .postx-section-head {
        display: flex;

        justify-content: space-between;

        align-items: center;

        gap: 10px;

        margin-bottom: 18px;
      }

      .postx-section-title {
        font-size: 17px;

        font-weight: 850;

        margin: 0;

        color: #fff !important;
      }

      /* BUTTONS */

      .postx-actions {
        display: flex;

        gap: 10px;

        flex-wrap: wrap;
      }

      .postx-btn {
        border: 1px solid rgba(255,255,255,.10) !important;

        border-radius: 12px;

        padding: 11px 16px;

        font-weight: 750;

        background: #0d1b2a !important;

        color: #fff !important;
      }

      .postx-btn:hover {
        background: #142c43 !important;
        border-color: rgba(0,212,255,.30) !important;
      }

      .postx-btn-primary {
        background:
          linear-gradient(
            135deg,
            #00d4ff,
            #1687ff
          ) !important;

        color: #03121d !important;

        border: 0 !important;

        box-shadow:
          0 8px 22px rgba(0,212,255,.22);
      }

      .postx-btn-gradient {
        background:
          linear-gradient(
            135deg,
            #00d4ff,
            #7c3aed
          ) !important;

        color: #fff !important;

        border: 0 !important;
      }

      /* LIST */

      .postx-list {
        display: grid;

        gap: 12px;
      }

      .postx-list-item {
        display: flex;

        align-items: center;

        gap: 13px;

        padding: 13px;

        border: 1px solid rgba(255,255,255,.08);

        border-radius: 13px;

        background:
          rgba(255,255,255,.025);

        color: #fff;
      }

      .postx-list-thumb {
        width: 52px;
        height: 52px;

        border-radius: 11px;

        background: #07111f;

        display: grid;

        place-items: center;

        overflow: hidden;

        flex: 0 0 52px;

        color: #00d4ff;
        font-weight: 900;
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
        color: #fff !important;

        font-weight: 750;

        white-space: nowrap;

        overflow: hidden;

        text-overflow: ellipsis;
      }

      .postx-list-meta {
        color: #94a3b8 !important;

        font-size: 12px;

        margin-top: 4px;
      }

      /* STATUS */

      .postx-status {
        display: inline-flex;

        padding: 5px 8px;

        border-radius: 999px;

        font-size: 10px;

        font-weight: 850;

        text-transform: uppercase;
      }

      .postx-status-draft {
        background: rgba(245,158,11,.15) !important;
        color: #fbbf24 !important;
      }

      .postx-status-scheduled {
        background: rgba(0,212,255,.15) !important;
        color: #00d4ff !important;
      }

      .postx-status-published {
        background: rgba(34,197,94,.15) !important;
        color: #22c55e !important;
      }

      /* PLATFORM */

      .postx-platforms {
        display: grid;

        grid-template-columns:
          repeat(3, 1fr);

        gap: 10px;
      }

      .postx-platform {
        border: 1px solid rgba(255,255,255,.10);

        border-radius: 14px;

        padding: 13px;

        background: rgba(255,255,255,.035);

        color: #94a3b8;

        display: flex;

        align-items: center;

        gap: 10px;

        transition: .18s ease;
      }

      .postx-platform:hover {
        border-color: rgba(0,212,255,.35);

        background: rgba(0,212,255,.06);
      }

      .postx-platform.selected {
        border-color: #00d4ff;

        background:
          linear-gradient(
            135deg,
            rgba(0,212,255,.12),
            rgba(124,58,237,.12)
          );

        color: #fff;

        box-shadow:
          0 0 0 1px rgba(0,212,255,.10),
          0 8px 25px rgba(0,212,255,.08);
      }

      .postx-platform-icon {
        width: 34px;
        height: 34px;

        border-radius: 10px;

        display: grid;

        place-items: center;

        font-weight: 900;

        color: #fff;

        background: #182b3e;
      }

      .postx-platform-name {
        font-weight: 750;
      }

      .postx-platform-state {
        display: block;

        color: #64748b;

        font-size: 10px;

        margin-top: 2px;
      }

      .postx-platform.selected
      .postx-platform-state {
        color: #00d4ff;
      }

      /* FORMS */

      .postx-field {
        margin-bottom: 18px;
      }

      .postx-label {
        display: block;

        font-size: 13px;

        font-weight: 800;

        margin-bottom: 8px;

        color: #cbd5e1 !important;
      }

      .postx-input,
      .postx-textarea,
      .postx-select {
        width: 100%;

        border: 1px solid rgba(255,255,255,.10) !important;

        border-radius: 12px;

        padding: 12px 13px;

        background: rgba(255,255,255,.045) !important;

        color: #fff !important;

        outline: none;

        color-scheme: dark;
      }

      .postx-input:focus,
      .postx-textarea:focus,
      .postx-select:focus {
        border-color: #00d4ff !important;

        box-shadow:
          0 0 0 3px rgba(0,212,255,.10);
      }

      .postx-input::placeholder,
      .postx-textarea::placeholder {
        color: #64748b !important;
      }

      .postx-textarea {
        min-height: 170px;

        resize: vertical;
      }

      .postx-upload {
        border: 2px dashed rgba(255,255,255,.15);

        border-radius: 14px;

        padding: 28px 16px;

        text-align: center;

        background: rgba(255,255,255,.02);

        cursor: pointer;

        display: block;

        color: #94a3b8;
      }

      .postx-upload:hover {
        border-color: #00d4ff;

        background: rgba(0,212,255,.04);
      }

      /* PREVIEW */

      .postx-preview-phone {
        max-width: 360px;

        margin: 0 auto;

        border: 1px solid rgba(255,255,255,.10);

        border-radius: 22px;

        overflow: hidden;

        background: #0d1b2a !important;

        box-shadow:
          0 14px 40px rgba(0,0,0,.40);
      }

      /* EMPTY STATE */

      .postx-empty {
        padding: 45px 20px;

        text-align: center;

        color: #94a3b8;
      }

      .postx-empty-icon {
        font-size: 38px;

        margin-bottom: 12px;

        color: #00d4ff;
      }

      /* TOAST */

      .postx-toast-container {
        position: fixed;

        right: 18px;
        bottom: 18px;

        z-index: 10000;

        display: grid;

        gap: 9px;

        width:
          min(
            360px,
            calc(100vw - 36px)
          );
      }

      .postx-toast {
        padding: 13px 15px;

        border-radius: 12px;

        background: #10253a !important;

        color: #fff !important;

        font-size: 13px;

        font-weight: 650;

        border: 1px solid rgba(255,255,255,.10);

        box-shadow:
          0 12px 30px rgba(0,0,0,.40);
      }

      .postx-toast.success {
        border-color: rgba(34,197,94,.35);

        background: #0d2b20 !important;
      }

      .postx-toast.error {
        border-color: rgba(239,68,68,.35);

        background: #35151a !important;
      }

      /* MODAL */

      .postx-modal-backdrop {
        position: fixed;

        inset: 0;

        z-index: 20000;

        display: grid;

        place-items: center;

        padding: 20px;

        background:
          rgba(2,8,18,.78);

        backdrop-filter: blur(8px);
      }

      .postx-modal {
        width:
          min(
            460px,
            100%
          );

        background:
          linear-gradient(
            145deg,
            #0d1b2a,
            #10253a
          ) !important;

        border:
          1px solid rgba(255,255,255,.10);

        border-radius: 20px;

        padding: 24px;

        box-shadow:
          0 30px 80px rgba(0,0,0,.55);

        color: #fff;
      }

      .postx-modal-title {
        margin: 0 0 8px;

        font-size: 20px;

        font-weight: 900;
      }

      .postx-modal-text {
        color: #94a3b8;

        line-height: 1.6;

        margin: 0 0 20px;
      }

      .postx-modal-actions {
        display: flex;

        justify-content: flex-end;

        gap: 10px;

        flex-wrap: wrap;
      }

      /* OVERLAY */

      .postx-overlay {
        position: fixed;

        inset: 0;

        background:
          rgba(7,17,31,.70);

        display: none;

        z-index: 90;
      }

      .postx-overlay.show {
        display: block;
      }

      /* MOBILE */

      @media(max-width:1050px) {

        .postx-stats {
          grid-template-columns:
            repeat(2,1fr);
        }

        .postx-dashboard-grid {
          grid-template-columns: 1fr;
        }
      }

      @media(max-width:760px) {

        .postx-sidebar {
          transform: translateX(-100%);

          transition: .22s;

          width: 270px;
        }

        .postx-sidebar.open {
          transform: translateX(0);
        }

        .postx-main {
          width: 100%;

          margin-left: 0;
        }

        .postx-mobile-header {
          display: flex;

          height: 62px;

          align-items: center;

          justify-content: space-between;

          padding: 0 16px;

          background:
            rgba(8,19,33,.98) !important;

          border-bottom:
            1px solid rgba(255,255,255,.08);

          position: sticky;

          top: 0;

          z-index: 70;
        }

        .postx-page {
          padding: 20px 14px;
        }

        .postx-page-title {
          font-size: 28px;
        }

        .postx-stats {
          grid-template-columns:
            repeat(2,1fr);

          gap: 10px;
        }

        .postx-stat {
          padding: 15px;
        }

        .postx-stat-value {
          font-size: 28px;
        }

        .postx-platforms {
          grid-template-columns: 1fr;
        }

        .postx-list-item {
          align-items: flex-start;
        }

        .postx-status {
          margin-left: auto;
        }
      }

      @media(max-width:430px) {

        .postx-stats {
          grid-template-columns: 1fr;
        }

        .postx-actions {
          width: 100%;
        }

        .postx-actions .postx-btn {
          flex: 1;
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
     TOAST
     ========================================================= */

  function toast(message, type = "success") {
    let container =
      document.getElementById("postxToastContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "postxToastContainer";
      container.className = "postx-toast-container";
      document.body.appendChild(container);
    }

    const item = document.createElement("div");

    item.className =
      "postx-toast " +
      (type === "error" ? "error" : "success");

    item.textContent = message;

    container.appendChild(item);

    setTimeout(() => {
      item.style.opacity = "0";
      item.style.transform = "translateY(10px)";
      item.style.transition = ".25s";

      setTimeout(() => item.remove(), 250);
    }, 2800);
  }

  /* =========================================================
     DARK MODAL
     ========================================================= */

  function showModal({
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm
  }) {

    const existing =
      document.querySelector(".postx-modal-backdrop");

    if (existing) {
      existing.remove();
    }

    const backdrop =
      document.createElement("div");

    backdrop.className =
      "postx-modal-backdrop";

    backdrop.innerHTML = `
      <div class="postx-modal"
           role="dialog"
           aria-modal="true">

        <h3 class="postx-modal-title">
          ${escapeHTML(title)}
        </h3>

        <p class="postx-modal-text">
          ${escapeHTML(message)}
        </p>

        <div class="postx-modal-actions">

          <button
            type="button"
            class="postx-btn"
            data-modal-cancel>
            ${escapeHTML(cancelText)}
          </button>

          <button
            type="button"
            class="postx-btn postx-btn-gradient"
            data-modal-confirm>
            ${escapeHTML(confirmText)}
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(backdrop);

    backdrop
      .querySelector("[data-modal-cancel]")
      .addEventListener("click", () => {
        backdrop.remove();
      });

    backdrop
      .querySelector("[data-modal-confirm]")
      .addEventListener("click", () => {

        backdrop.remove();

        if (typeof onConfirm === "function") {
          onConfirm();
        }
      });

    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) {
        backdrop.remove();
      }
    });
  }

  /* =========================================================
     SHELL
     ========================================================= */

  function renderShell(root) {

    root.innerHTML = `
      <div class="postx-shell">

        <aside
          class="postx-sidebar"
          id="postxSidebar">

          <div class="postx-brand">

            <div class="postx-brand-mark">
              P
            </div>

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
            data-postx-nav="create">
            + Create Post
          </button>

          <nav class="postx-nav">

            ${NAV_ITEMS.map(item => `
              <button
                type="button"
                class="postx-nav-btn ${
                  state.activePage === item.id
                    ? "active"
                    : ""
                }"
                data-postx-nav="${item.id}">

                <span>
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
              color:#64748b;
              font-size:11px;
            ">

            PostX v${APP.version}

            <br>

            Dark Premium • Local storage

          </div>

        </aside>

        <div
          class="postx-overlay"
          id="postxOverlay">
        </div>

        <main class="postx-main">

          <header
            class="postx-mobile-header">

            <div style="font-weight:900;">
              PostX
            </div>

            <button
              type="button"
              id="postxMenuButton"
              style="
                width:40px;
                height:40px;
                border-radius:10px;
                border:1px solid rgba(255,255,255,.10);
                background:#0d1b2a;
                color:#fff;
              ">
              ☰
            </button>

          </header>

          <div id="postxPageContainer"></div>

        </main>

      </div>

      <div
        class="postx-toast-container"
        id="postxToastContainer">
      </div>
    `;

    document
      .querySelectorAll("[data-postx-nav]")
      .forEach(button => {

        button.addEventListener("click", () => {

          navigate(
            button.dataset.postxNav
          );

          closeMobileMenu();
        });
      });

    document
      .getElementById("postxMenuButton")
      ?.addEventListener("click", () => {

        const sidebar =
          document.getElementById("postxSidebar");

        const overlay =
          document.getElementById("postxOverlay");

        sidebar?.classList.toggle("open");

        overlay?.classList.toggle("show");
      });

    document
      .getElementById("postxOverlay")
      ?.addEventListener("click", closeMobileMenu);
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
     NAVIGATION
     ========================================================= */

  function navigate(page) {

    if (!NAV_ITEMS.some(item => item.id === page)) {
      page = "dashboard";
    }

    state.activePage = page;

    state.editingPostId = null;

    saveState();

    render();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* =========================================================
     MAIN RENDER
     ========================================================= */

  function render() {

    const container =
      document.getElementById(
        "postxPageContainer"
      );

    if (!container) return;

    document
      .querySelectorAll("[data-postx-nav]")
      .forEach(button => {

        button.classList.toggle(
          "active",
          button.dataset.postxNav ===
            state.activePage
        );
      });

    if (state.activePage === "dashboard") {

      renderDashboard(container);

    } else if (state.activePage === "create") {

      renderCreate(container);

    } else if (state.activePage === "calendar") {

      renderCalendar(container);

    } else {

      renderListPage(
        container,
        state.activePage
      );
    }
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */

  function renderDashboard(container) {

    const total =
      state.posts.length;

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

    const recent =
      [...state.posts]
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

    const connectedCount =
      Object.values(
        state.connectedAccounts
      ).filter(Boolean).length;

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">

          <div>

            <h1 class="postx-page-title">
              Dashboard
            </h1>

            <p class="postx-page-subtitle">
              Welcome back,
              ${escapeHTML(
                state.profile.name
              )}
              • Here's your social media overview
            </p>

          </div>

          <div class="postx-actions">

            <button
              type="button"
              class="postx-btn postx-btn-gradient"
              data-dashboard-create>
              + Create Post
            </button>

          </div>

        </div>

        <section class="postx-stats">

          <div class="postx-card postx-stat">

            <div class="postx-stat-label">
              📄 Total Posts
            </div>

            <div class="postx-stat-value">
              ${total}
            </div>

            <div class="postx-stat-sub">
              All posts created
            </div>

          </div>

          <div class="postx-card postx-stat">

            <div class="postx-stat-label">
              ◷ Scheduled
            </div>

            <div class="postx-stat-value">
              ${scheduled}
            </div>

            <div class="postx-stat-sub">
              Waiting to publish
            </div>

          </div>

          <div class="postx-card postx-stat">

            <div class="postx-stat-label">
              ✎ Drafts
            </div>

            <div class="postx-stat-value">
              ${drafts}
            </div>

            <div class="postx-stat-sub">
              Saved for later
            </div>

          </div>

          <div class="postx-card postx-stat">

            <div class="postx-stat-label">
              ✓ Published
            </div>

            <div class="postx-stat-value">
              ${published}
            </div>

            <div class="postx-stat-sub">
              Successfully published
            </div>

          </div>

        </section>

        <section
          class="postx-dashboard-grid">

          <div
            class="postx-card postx-section-card">

            <div class="postx-section-head">

              <h2 class="postx-section-title">
                Recent Posts
              </h2>

              <button
                type="button"
                class="postx-btn"
                style="
                  padding:6px 10px;
                  font-size:12px;
                "
                data-dashboard-published>
                See all →
              </button>

            </div>

            ${
              recent.length
                ? `
                  <div class="postx-list">

                    ${recent.map(post =>
                      postCardHTML(
                        post,
                        true
                      )
                    ).join("")}

                  </div>
                `
                : `
                  <div class="postx-empty">

                    <div class="postx-empty-icon">
                      ✨
                    </div>

                    <div>
                      No posts yet.
                    </div>

                    <div
                      style="
                        margin-top:6px;
                        font-size:12px;
                      ">
                      Create your first social post.
                    </div>

                  </div>
                `
            }

          </div>

          <div style="display:grid;gap:20px">

            <div
              class="postx-card postx-section-card">

              <h2 class="postx-section-title">
                Performance Overview
              </h2>

              <p
                style="
                  color:#94a3b8;
                  font-size:13px;
                  margin:6px 0 14px;
                ">
                Last 7 days engagement
              </p>

              <div
                style="
                  height:140px;
                  border-radius:14px;
                  padding:15px;
                  display:flex;
                  align-items:flex-end;
                  gap:8px;
                  background:
                    linear-gradient(
                      to top,
                      rgba(0,212,255,.12),
                      transparent
                    );
                  border:
                    1px solid rgba(0,212,255,.10);
                ">

                ${[42,65,50,82,60,91,76]
                  .map(height => `
                    <div
                      style="
                        flex:1;
                        height:${height}%;
                        min-height:10px;
                        border-radius:6px 6px 2px 2px;
                        background:
                          linear-gradient(
                            to top,
                            #00d4ff,
                            #7c3aed
                          );
                        opacity:.85;
                      ">
                    </div>
                  `)
                  .join("")}

              </div>

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  margin-top:14px;
                  gap:10px;
                ">

                <div>
                  <div
                    style="
                      color:#00d4ff;
                      font-size:20px;
                      font-weight:900;
                    ">
                    4.8%
                  </div>

                  <div
                    style="
                      color:#64748b;
                      font-size:11px;
                    ">
                    Engagement Rate
                  </div>
                </div>

                <div style="text-align:right">

                  <div
                    style="
                      color:#fff;
                      font-size:20px;
                      font-weight:900;
                    ">
                    12.4K
                  </div>

                  <div
                    style="
                      color:#64748b;
                      font-size:11px;
                    ">
                    Avg Reach
                  </div>

                </div>

              </div>

            </div>

            <div
              class="postx-card postx-section-card">

              <div class="postx-section-head">

                <h2 class="postx-section-title">
                  Platforms
                </h2>

                <span
                  style="
                    color:#00d4ff;
                    font-size:12px;
                    font-weight:800;
                  ">
                  ${connectedCount}/3 connected
                </span>

              </div>

              ${platformSummaryHTML()}

            </div>

          </div>

        </section>

      </div>
    `;

    container
      .querySelector("[data-dashboard-create]")
      ?.addEventListener(
        "click",
        () => navigate("create")
      );

    container
      .querySelector("[data-dashboard-published]")
      ?.addEventListener(
        "click",
        () => navigate("published")
      );

    attachPostActions(container);
  }

  /* =========================================================
     PLATFORM SUMMARY
     ========================================================= */

  function platformSummaryHTML() {

    return `
      <div
        style="
          display:grid;
          gap:10px;
        ">

        ${Object.values(PLATFORM)
          .map(platform => {

            const connected =
              !!state.connectedAccounts[
                platform.id
              ];

            return `
              <div
                style="
                  display:flex;
                  align-items:center;
                  gap:10px;
                  padding:10px;
                  border:
                    1px solid rgba(255,255,255,.07);
                  border-radius:12px;
                  background:
                    rgba(255,255,255,.025);
                ">

                <div
                  style="
                    width:34px;
                    height:34px;
                    border-radius:10px;
                    display:grid;
                    place-items:center;
                    font-weight:900;
                    color:#fff;
                    background:${platform.color};
                  ">
                  ${escapeHTML(platform.icon)}
                </div>

                <div style="flex:1">

                  <div
                    style="
                      color:#fff;
                      font-size:13px;
                      font-weight:800;
                    ">
                    ${escapeHTML(
                      platform.name
                    )}
                  </div>

                  <div
                    style="
                      color:${
                        connected
                          ? "#22c55e"
                          : "#64748b"
                      };
                      font-size:10px;
                      margin-top:2px;
                    ">
                    ${
                      connected
                        ? "Connected"
                        : "Not connected"
                    }
                  </div>

                </div>

                <button
                  type="button"
                  class="postx-btn"
                  style="
                    padding:7px 10px;
                    font-size:11px;
                  "
                  data-platform-toggle="${platform.id}">
                  ${
                    connected
                      ? "Disconnect"
                      : "Connect"
                  }
                </button>

              </div>
            `;
          })
          .join("")}

      </div>
    `;
  }

  /* =========================================================
     CREATE POST
     ========================================================= */

  function renderCreate(container) {

    const editing =
      state.editingPostId
        ? getPostById(
            state.editingPostId
          )
        : null;

    const post =
      editing || {
        caption: "",
        hashtags: "",
        imageData: "",
        platforms: [],
        scheduledAt: ""
      };

    const selectedPlatforms =
      normalizePlatformList(
        post.platforms
      );

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">

          <div>

            <h1 class="postx-page-title">
              ${
                editing
                  ? "Edit Post"
                  : "Create Post"
              }
            </h1>

            <p class="postx-page-subtitle">
              Create once and publish across your connected social platforms.
            </p>

          </div>

        </div>

        <div
          style="
            display:grid;
            grid-template-columns:
              minmax(0,1.15fr)
              minmax(280px,.85fr);
            gap:20px;
          "
          class="postx-create-grid">

          <div
            class="postx-card"
            style="padding:22px">

            <form id="postxCreateForm">

              <div class="postx-field">

                <label class="postx-label">
                  Platforms
                </label>

                <div class="postx-platforms">

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
                        <button
                          type="button"
                          class="postx-platform ${
                            selected
                              ? "selected"
                              : ""
                          }"
                          data-platform-select="${
                            platform.id
                          }"
                          ${!connected
                            ? "disabled"
                            : ""}>

                          <span
                            class="postx-platform-icon"
                            style="
                              background:
                                ${
                                  connected
                                    ? platform.color
                                    : "#182b3e"
                                };
                            ">
                            ${escapeHTML(
                              platform.icon
                            )}
                          </span>

                          <span style="text-align:left">

                            <span
                              class="postx-platform-name">
                              ${escapeHTML(
                                platform.name
                              )}
                            </span>

                            <span
                              class="postx-platform-state">
                              ${
                                connected
                                  ? selected
                                    ? "Selected"
                                    : "Connected"
                                  : "Connect first"
                              }
                            </span>

                          </span>

                        </button>
                      `;
                    })
                    .join("")}

                </div>

                <div
                  id="postxPlatformHelp"
                  style="
                    color:#64748b;
                    font-size:11px;
                    margin-top:8px;
                  ">
                  Select one or more connected platforms.
                </div>

              </div>

              <div class="postx-field">

                <label class="postx-label">
                  Post Caption
                </label>

                <textarea
                  id="postxCaption"
                  class="postx-textarea"
                  placeholder="Write your social media post..."
                  maxlength="5000"
                  required>${escapeHTML(
                    post.caption || ""
                  )}</textarea>

                <div
                  id="postxCharCount"
                  style="
                    text-align:right;
                    color:#64748b;
                    font-size:11px;
                    margin-top:5px;
                  ">
                  0 / 5000
                </div>

              </div>

              <div class="postx-field">

                <label class="postx-label">
                  Hashtags
                </label>

                <input
                  id="postxHashtags"
                  class="postx-input"
                  placeholder="#marketing #business #postx"
                  value="${escapeHTML(
                    post.hashtags || ""
                  )}">
              </div>

              <div class="postx-field">

                <label class="postx-label">
                  Image
                </label>

                <label
                  class="postx-upload">

                  <input
                    type="file"
                    id="postxImage"
                    accept="image/*"
                    hidden>

                  <div
                    style="
                      font-size:30px;
                      margin-bottom:8px;
                    ">
                    🖼️
                  </div>

                  <div
                    style="
                      color:#fff;
                      font-weight:800;
                    ">
                    Choose an image
                  </div>

                  <div
                    style="
                      margin-top:4px;
                      font-size:11px;
                      color:#64748b;
                    ">
                    JPG, PNG or WEBP
                  </div>

                </label>

                <div
                  id="postxImagePreview"
                  style="margin-top:10px">
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
                  value="${toDateTimeLocal(
                    post.scheduledAt
                  )}">
              </div>

              <div
                style="
                  display:flex;
                  gap:10px;
                  flex-wrap:wrap;
                  margin-top:22px;
                ">

                <button
                  type="button"
                  class="postx-btn"
                  id="postxSaveDraft">
                  Save Draft
                </button>

                <button
                  type="submit"
                  class="postx-btn postx-btn-gradient">
                  ${
                    editing
                      ? "Update Post"
                      : "Create Post"
                  }
                </button>

              </div>

            </form>

          </div>

          <div
            class="postx-card"
            style="padding:22px">

            <h2 class="postx-section-title">
              Live Preview
            </h2>

            <p
              style="
                color:#94a3b8;
                font-size:12px;
                margin-top:5px;
              ">
              Preview how your post will look.
            </p>

            <div
              class="postx-preview-phone"
              id="postxPreview">

              ${previewHTML(post)}

            </div>

          </div>

        </div>

      </div>
    `;

    /* RESPONSIVE CREATE GRID */

    const gridStyle =
      document.createElement("style");

    gridStyle.textContent = `
      @media(max-width:850px) {
        .postx-create-grid {
          grid-template-columns:1fr !important;
        }
      }
    `;

    document.head.appendChild(gridStyle);

    attachCreateEvents(editing);
  }

  /* =========================================================
     CREATE EVENTS
     ========================================================= */

  function attachCreateEvents(editing) {

    const form =
      document.getElementById(
        "postxCreateForm"
      );

    const caption =
      document.getElementById(
        "postxCaption"
      );

    const hashtags =
      document.getElementById(
        "postxHashtags"
      );

    const schedule =
      document.getElementById(
        "postxSchedule"
      );

    const imageInput =
      document.getElementById(
        "postxImage"
      );

    let imageData =
      editing?.imageData || "";

    let selectedPlatforms =
      normalizePlatformList(
        editing?.platforms
      );

    function updatePreview() {

      const preview =
        document.getElementById(
          "postxPreview"
        );

      if (!preview) return;

      preview.innerHTML =
        previewHTML({
          caption:
            caption?.value || "",

          hashtags:
            hashtags?.value || "",

          imageData,

          platforms:
            selectedPlatforms
        });
    }

    function updateCharCount() {

      const counter =
        document.getElementById(
          "postxCharCount"
        );

      if (!counter || !caption) {
        return;
      }

      counter.textContent =
        `${caption.value.length} / 5000`;
    }

    document
      .querySelectorAll(
        "[data-platform-select]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const platform =
              button.dataset
                .platformSelect;

            if (
              !state.connectedAccounts[
                platform
              ]
            ) {

              toast(
                `Connect ${PLATFORM[platform].name} first.`,
                "error"
              );

              return;
            }

            if (
              selectedPlatforms.includes(
                platform
              )
            ) {

              selectedPlatforms =
                selectedPlatforms.filter(
                  item => item !== platform
                );

            } else {

              selectedPlatforms.push(
                platform
              );
            }

            document
              .querySelectorAll(
                "[data-platform-select]"
              )
              .forEach(item => {

                const selected =
                  selectedPlatforms.includes(
                    item.dataset
                      .platformSelect
                  );

                item.classList.toggle(
                  "selected",
                  selected
                );

                const stateText =
                  item.querySelector(
                    ".postx-platform-state"
                  );

                if (stateText) {

                  stateText.textContent =
                    selected
                      ? "Selected"
                      : "Connected";
                }
              });

            updatePreview();
          }
        );
      });

    caption?.addEventListener(
      "input",
      () => {

        updateCharCount();

        updatePreview();
      }
    );

    hashtags?.addEventListener(
      "input",
      updatePreview
    );

    schedule?.addEventListener(
      "change",
      updatePreview
    );

    imageInput?.addEventListener(
      "change",
      event => {

        const file =
          event.target.files?.[0];

        if (!file) return;

        if (
          !file.type.startsWith(
            "image/"
          )
        ) {

          toast(
            "Please choose an image file.",
            "error"
          );

          return;
        }

        if (
          file.size >
          5 * 1024 * 1024
        ) {

          toast(
            "Image must be smaller than 5 MB.",
            "error"
          );

          return;
        }

        const reader =
          new FileReader();

        reader.onload = () => {

          imageData =
            reader.result;

          const imagePreview =
            document.getElementById(
              "postxImagePreview"
            );

          if (imagePreview) {

            imagePreview.innerHTML = `
              <img
                src="${escapeHTML(imageData)}"
                style="
                  width:100%;
                  max-height:220px;
                  object-fit:cover;
                  border-radius:12px;
                  border:1px solid rgba(255,255,255,.10);
                ">
            `;
          }

          updatePreview();
        };

        reader.readAsDataURL(file);
      }
    );

    document
      .getElementById(
        "postxSaveDraft"
      )
      ?.addEventListener(
        "click",
        () => {

          savePost({
            editing,
            caption,
            hashtags,
            schedule,
            imageData,
            selectedPlatforms,
            forceStatus: "draft"
          });
        }
      );

    form?.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        savePost({
          editing,
          caption,
          hashtags,
          schedule,
          imageData,
          selectedPlatforms
        });
      }
    );

    updateCharCount();

    if (imageData) {

      const imagePreview =
        document.getElementById(
          "postxImagePreview"
        );

      if (imagePreview) {

        imagePreview.innerHTML = `
          <img
            src="${escapeHTML(imageData)}"
            style="
              width:100%;
              max-height:220px;
              object-fit:cover;
              border-radius:12px;
            ">
        `;
      }
    }

    updatePreview();
  }

  /* =========================================================
     SAVE POST
     ========================================================= */

  function savePost({
    editing,
    caption,
    hashtags,
    schedule,
    imageData,
    selectedPlatforms,
    forceStatus
  }) {

    const body =
      String(
        caption?.value || ""
      ).trim();

    const tags =
      normalizeHashtags(
        hashtags?.value || ""
      );

    const scheduledAt =
      schedule?.value
        ? new Date(
            schedule.value
          ).toISOString()
        : "";

    if (!body) {

      toast(
        "Please write a caption first.",
        "error"
      );

      return;
    }

    if (
      !forceStatus &&
      selectedPlatforms.length === 0
    ) {

      toast(
        "Select at least one connected platform.",
        "error"
      );

      return;
    }

    let status =
      forceStatus || "published";

    if (
      !forceStatus &&
      scheduledAt
    ) {

      const scheduleDate =
        new Date(
          scheduledAt
        );

      if (
        scheduleDate.getTime() >
        Date.now()
      ) {

        status = "scheduled";

      } else {

        status = "published";
      }
    }

    const fullCaption =
      buildFullCaption(
        body,
        tags
      );

    const timestamp =
      nowISO();

    if (editing) {

      const post =
        getPostById(
          editing.id
        );

      if (!post) {

        toast(
          "Post could not be found.",
          "error"
        );

        return;
      }

      post.caption = body;

      post.hashtags = tags;

      post.fullCaption =
        fullCaption;

      post.platforms =
        selectedPlatforms;

      post.imageData =
        imageData || "";

      post.scheduledAt =
        status === "scheduled"
          ? scheduledAt
          : "";

      post.status =
        status;

      post.updatedAt =
        timestamp;

      if (
        status === "published"
      ) {

        post.publishedAt =
          timestamp;
      }

      saveState();

      state.editingPostId = null;

      toast(
        status === "scheduled"
          ? "Post updated and scheduled."
          : "Post updated successfully."
      );

    } else {

      const post = {

        id: uid(),

        caption: body,

        hashtags: tags,

        fullCaption,

        imageData:
          imageData || "",

        platforms:
          selectedPlatforms,

        status,

        scheduledAt:
          status === "scheduled"
            ? scheduledAt
            : "",

        publishedAt:
          status === "published"
            ? timestamp
            : "",

        createdAt:
          timestamp,

        updatedAt:
          timestamp
      };

      state.posts.unshift(post);

      saveState();

      toast(
        status === "scheduled"
          ? "Post scheduled successfully."
          : status === "draft"
            ? "Draft saved successfully."
            : "Post published successfully."
      );
    }

    if (status === "draft") {

      navigate("drafts");

    } else if (status === "scheduled") {

      navigate("scheduled");

    } else {

      navigate("published");
    }
  }

  /* =========================================================
     PREVIEW
     ========================================================= */

  function previewHTML(post) {

    const platforms =
      normalizePlatformList(
        post.platforms
      );

    const caption =
      buildFullCaption(
        post.caption || "",
        post.hashtags || ""
      );

    return `
      <div
        style="
          background:#0d1b2a;
          color:#fff;
        ">

        <div
          style="
            display:flex;
            align-items:center;
            gap:10px;
            padding:14px;
            border-bottom:
              1px solid rgba(255,255,255,.08);
          ">

          <div
            style="
              width:38px;
              height:38px;
              border-radius:50%;
              display:grid;
              place-items:center;
              font-weight:900;
              color:#fff;
              background:
                linear-gradient(
                  135deg,
                  #00d4ff,
                  #7c3aed
                );
            ">
            P
          </div>

          <div>

            <div
              style="
                font-weight:850;
                font-size:13px;
              ">
              PostX
            </div>

            <div
              style="
                color:#64748b;
                font-size:10px;
              ">
              Social Preview
            </div>

          </div>

        </div>

        ${
          post.imageData
            ? `
              <img
                src="${escapeHTML(
                  post.imageData
                )}"
                style="
                  width:100%;
                  max-height:280px;
                  object-fit:cover;
                  display:block;
                ">
            `
            : `
              <div
                style="
                  height:160px;
                  display:grid;
                  place-items:center;
                  background:
                    linear-gradient(
                      135deg,
                      rgba(0,212,255,.10),
                      rgba(124,58,237,.16)
                    );
                  color:#00d4ff;
                  font-size:36px;
                ">
                ✨
              </div>
            `
        }

        <div style="padding:15px">

          <div
            style="
              color:#f8fafc;
              white-space:pre-wrap;
              line-height:1.55;
              font-size:13px;
            ">
            ${escapeHTML(
              caption ||
              "Your post preview will appear here."
            )}
          </div>

          ${
            platforms.length
              ? `
                <div
                  style="
                    display:flex;
                    gap:6px;
                    margin-top:15px;
                  ">

                  ${platforms
                    .map(id => {

                      const platform =
                        PLATFORM[id];

                      return `
                        <span
                          style="
                            width:28px;
                            height:28px;
                            border-radius:8px;
                            display:grid;
                            place-items:center;
                            background:${platform.color};
                            color:#fff;
                            font-size:12px;
                            font-weight:900;
                          ">
                          ${escapeHTML(
                            platform.icon
                          )}
                        </span>
                      `;
                    })
                    .join("")}

                </div>
              `
              : ""
          }

        </div>

      </div>
    `;
  }

  /* =========================================================
     LIST PAGE
     ========================================================= */

  function renderListPage(
    container,
    page
  ) {

    const statusMap = {

      scheduled: "scheduled",

      drafts: "draft",

      published: "published"
    };

    const status =
      statusMap[page];

    const posts =
      state.posts
        .filter(
          post =>
            post.status === status
        )
        .sort(
          (a, b) =>
            new Date(
              b.updatedAt
            ) -
            new Date(
              a.updatedAt
            )
        );

    const titleMap = {

      scheduled:
        "Scheduled Posts",

      drafts:
        "Drafts",

      published:
        "Published Posts"
    };

    const subtitleMap = {

      scheduled:
        "Posts waiting to be published.",

      drafts:
        "Posts saved for later.",

      published:
        "Your published social media posts."
    };

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">

          <div>

            <h1 class="postx-page-title">
              ${escapeHTML(
                titleMap[page] ||
                "Posts"
              )}
            </h1>

            <p class="postx-page-subtitle">
              ${escapeHTML(
                subtitleMap[page] || ""
              )}
            </p>

          </div>

          <div class="postx-actions">

            <button
              type="button"
              class="postx-btn postx-btn-gradient"
              data-list-create>
              + Create Post
            </button>

          </div>

        </div>

        <div
          class="postx-card"
          style="padding:20px">

          ${
            posts.length
              ? `
                <div class="postx-list">

                  ${posts
                    .map(post =>
                      postCardHTML(
                        post,
                        false
                      )
                    )
                    .join("")}

                </div>
              `
              : `
                <div class="postx-empty">

                  <div class="postx-empty-icon">
                    ${
                      page === "scheduled"
                        ? "◷"
                        : page === "drafts"
                          ? "▤"
                          : "✓"
                    }
                  </div>

                  <div
                    style="
                      color:#fff;
                      font-weight:800;
                    ">
                    No ${
                      page === "scheduled"
                        ? "scheduled"
                        : page
                    } posts
                  </div>

                  <div
                    style="
                      margin-top:6px;
                      font-size:12px;
                    ">
                    Create a post to get started.
                  </div>

                </div>
              `
          }

        </div>

      </div>
    `;

    container
      .querySelector("[data-list-create]")
      ?.addEventListener(
        "click",
        () => navigate("create")
      );

    attachPostActions(container);
  }

  /* =========================================================
     POST CARD
     ========================================================= */

  function postCardHTML(
    post,
    compact
  ) {

    const platforms =
      normalizePlatformList(
        post.platforms
      );

    return `
      <div
        class="postx-list-item"
        data-post-card="${post.id}"
        style="
          ${
            compact
              ? ""
              : "padding:16px;"
          }
        ">

        <div class="postx-list-thumb">

          ${
            post.imageData
              ? `
                <img
                  src="${escapeHTML(
                    post.imageData
                  )}"
                  alt="">
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
                compact ? 55 : 120
              )
            )}
          </div>

          <div
            class="postx-list-meta">

            ${escapeHTML(
              formatDateTime(
                post.scheduledAt ||
                post.publishedAt ||
                post.updatedAt
              )
            )}

            ${
              platforms.length
                ? " • " +
                  platforms
                    .map(
                      id =>
                        PLATFORM[id].name
                    )
                    .join(", ")
                : ""
            }

          </div>

        </div>

        <span
          class="
            postx-status
            postx-status-${escapeHTML(
              post.status
            )}
          ">
          ${escapeHTML(
            post.status
          )}
        </span>

        ${
          compact
            ? ""
            : `
              <div
                style="
                  display:flex;
                  gap:6px;
                  margin-left:6px;
                ">

                ${
                  post.status === "draft"
                    ? `
                      <button
                        type="button"
                        class="postx-btn"
                        style="
                          padding:7px 10px;
                          font-size:11px;
                        "
                        data-post-edit="${post.id}">
                        Edit
                      </button>
                    `
                    : ""
                }

                ${
                  post.status === "scheduled"
                    ? `
                      <button
                        type="button"
                        class="postx-btn postx-btn-primary"
                        style="
                          padding:7px 10px;
                          font-size:11px;
                        "
                        data-post-publish="${post.id}">
                        Publish
                      </button>
                    `
                    : ""
                }

                <button
                  type="button"
                  class="postx-btn"
                  style="
                    padding:7px 10px;
                    font-size:11px;
                  "
                  data-post-delete="${post.id}">
                  Delete
                </button>

              </div>
            `
        }

      </div>
    `;
  }

  /* =========================================================
     POST ACTIONS
     ========================================================= */

  function attachPostActions(
    container
  ) {

    container
      .querySelectorAll(
        "[data-post-edit]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const post =
              getPostById(
                button.dataset.postEdit
              );

            if (!post) return;

            state.editingPostId =
              post.id;

            state.activePage =
              "create";

            saveState();

            render();
          }
        );
      });

    container
      .querySelectorAll(
        "[data-post-delete]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.postDelete;

            showModal({
              title:
                "Delete this post?",

              message:
                "This action cannot be undone.",

              confirmText:
                "Delete",

              onConfirm: () => {

                state.posts =
                  state.posts.filter(
                    post =>
                      post.id !== id
                  );

                saveState();

                toast(
                  "Post deleted successfully."
                );

                render();
              }
            });
          }
        );
      });

    container
      .querySelectorAll(
        "[data-post-publish]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.postPublish;

            const post =
              getPostById(id);

            if (!post) return;

            showModal({
              title:
                "Publish this post now?",

              message:
                "The scheduled post will be moved to Published.",

              confirmText:
                "Publish Now",

              onConfirm: () => {

                const timestamp =
                  nowISO();

                post.status =
                  "published";

                post.publishedAt =
                  timestamp;

                post.scheduledAt =
                  "";

                post.updatedAt =
                  timestamp;

                saveState();

                toast(
                  "Post published successfully."
                );

                render();
              }
            });
          }
        );
      });
  }

  /* =========================================================
     CALENDAR
     ========================================================= */

  function renderCalendar(container) {

    const scheduled =
      state.posts
        .filter(
          post =>
            post.status ===
              "scheduled" &&
            post.scheduledAt
        )
        .sort(
          (a, b) =>
            new Date(
              a.scheduledAt
            ) -
            new Date(
              b.scheduledAt
            )
        );

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">

          <div>

            <h1 class="postx-page-title">
              Calendar
            </h1>

            <p class="postx-page-subtitle">
              View your upcoming scheduled content.
            </p>

          </div>

          <button
            type="button"
            class="postx-btn postx-btn-gradient"
            data-calendar-create>
            + Create Post
          </button>

        </div>

        <div
          class="postx-card"
          style="padding:20px">

          ${
            scheduled.length
              ? `
                <div
                  style="
                    display:grid;
                    gap:12px;
                  ">

                  ${scheduled
                    .map(post => `

                      <div
                        style="
                          display:grid;
                          grid-template-columns:
                            120px 1fr auto;
                          gap:15px;
                          align-items:center;
                          padding:15px;
                          border:
                            1px solid rgba(255,255,255,.08);
                          border-radius:14px;
                          background:
                            rgba(255,255,255,.025);
                        ">

                        <div>

                          <div
                            style="
                              color:#00d4ff;
                              font-weight:900;
                              font-size:13px;
                            ">
                            ${escapeHTML(
                              formatDate(
                                post.scheduledAt
                              )
                            )}
                          </div>

                          <div
                            style="
                              color:#64748b;
                              font-size:11px;
                              margin-top:3px;
                            ">
                            ${escapeHTML(
                              new Date(
                                post.scheduledAt
                              ).toLocaleTimeString(
                                undefined,
                                {
                                  hour:
                                    "2-digit",
                                  minute:
                                    "2-digit"
                                }
                              )
                            )}
                          </div>

                        </div>

                        <div>

                          <div
                            style="
                              color:#fff;
                              font-weight:800;
                            ">
                            ${escapeHTML(
                              truncate(
                                post.caption,
                                100
                              )
                            )}
                          </div>

                          <div
                            style="
                              color:#64748b;
                              font-size:11px;
                              margin-top:4px;
                            ">
                            ${escapeHTML(
                              normalizePlatformList(
                                post.platforms
                              )
                                .map(
                                  id =>
                                    PLATFORM[id]
                                      .name
                                )
                                .join(", ")
                            )}
                          </div>

                        </div>

                        <button
                          type="button"
                          class="postx-btn postx-btn-primary"
                          data-calendar-publish="${post.id}"
                          style="
                            padding:8px 11px;
                            font-size:11px;
                          ">
                          Publish
                        </button>

                      </div>

                    `)
                    .join("")}

                </div>
              `
              : `
                <div class="postx-empty">

                  <div class="postx-empty-icon">
                    ▦
                  </div>

                  <div
                    style="
                      color:#fff;
                      font-weight:800;
                    ">
                    Your calendar is empty
                  </div>

                  <div
                    style="
                      margin-top:6px;
                      font-size:12px;
                    ">
                    Schedule a post to see it here.
                  </div>

                </div>
              `
          }

        </div>

      </div>
    `;

    container
      .querySelector(
        "[data-calendar-create]"
      )
      ?.addEventListener(
        "click",
        () => navigate("create")
      );

    container
      .querySelectorAll(
        "[data-calendar-publish]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const post =
              getPostById(
                button.dataset
                  .calendarPublish
              );

            if (!post) return;

            showModal({

              title:
                "Publish this post now?",

              message:
                "This will move the scheduled post to Published.",

              confirmText:
                "Publish Now",

              onConfirm: () => {

                const timestamp =
                  nowISO();

                post.status =
                  "published";

                post.publishedAt =
                  timestamp;

                post.scheduledAt =
                  "";

                post.updatedAt =
                  timestamp;

                saveState();

                toast(
                  "Post published successfully."
                );

                render();
              }
            });
          }
        );
      });
  }

  /* =========================================================
     PLATFORM CONNECTIONS
     ========================================================= */

  function togglePlatform(
    platformId
  ) {

    if (
      !Object.prototype.hasOwnProperty.call(
        PLATFORM,
        platformId
      )
    ) {
      return;
    }

    const platform =
      PLATFORM[platformId];

    const connected =
      !!state.connectedAccounts[
        platformId
      ];

    if (connected) {

      showModal({

        title:
          `Disconnect ${platform.name}?`,

        message:
          `You will no longer be able to select ${platform.name} when creating posts.`,

        confirmText:
          "Disconnect",

        onConfirm: () => {

          state.connectedAccounts[
            platformId
          ] = false;

          saveState();

          toast(
            `${platform.name} disconnected.`
          );

          render();
        }
      });

    } else {

      state.connectedAccounts[
        platformId
      ] = true;

      saveState();

      toast(
        `${platform.name} connected successfully.`
      );

      render();
    }
  }

  /* =========================================================
     DATE HELPERS
     ========================================================= */

  function toDateTimeLocal(value) {

    if (!value) return "";

    const date =
      new Date(value);

    if (
      isNaN(
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
     GLOBAL CLICK HANDLER
     ========================================================= */

  function attachGlobalHandlers() {

    document.addEventListener(
      "click",
      event => {

        const toggle =
          event.target.closest(
            "[data-platform-toggle]"
          );

        if (toggle) {

          togglePlatform(
            toggle.dataset
              .platformToggle
          );
        }
      }
    );
  }

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  function init() {

    injectStyles();

    const root =
      ensureRoot();

    renderShell(root);

    attachGlobalHandlers();

    render();

    console.log(
      `%cPostX ${APP.version} loaded`,
      `
        color:#00d4ff;
        font-size:14px;
        font-weight:bold;
      `
    );
  }

  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );

  } else {

    init();
  }

})();
