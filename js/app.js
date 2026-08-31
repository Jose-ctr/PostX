/* =========================================================
   POSTX — FULL DARK PREMIUM FRONTEND ENGINE
   Version 1.2.0
   GitHub Pages / PWA compatible
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     APP CONFIG
     ========================================================= */

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
      name: "Sarah Kim",
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
      console.warn("PostX storage recovery:", error);
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
      console.warn("PostX could not save state:", error);
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
      Math.random().toString(36).slice(2, 8)
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

  function formatRelative(value) {
    if (!value) return "—";

    const date = new Date(value);
    const diff = Date.now() - date.getTime();

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) {
      return "just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours} hr ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days} day${days === 1 ? "" : "s"} ago`;
    }

    return date.toLocaleDateString();
  }

  function truncate(value, length = 120) {
    const text = String(value || "");

    if (text.length <= length) {
      return text;
    }

    return text.slice(0, length).trimEnd() + "…";
  }

  function getPostById(id) {
    return state.posts.find(post => post.id === id) || null;
  }

  function normalizeHashtags(value) {
    return String(value || "")
      .split(/[\s,]+/)
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => item.startsWith("#") ? item : `#${item}`)
      .join(" ");
  }

  function buildFullCaption(caption, hashtags) {
    const main = String(caption || "").trim();
    const tags = normalizeHashtags(hashtags);

    return [main, tags]
      .filter(Boolean)
      .join("\n\n");
  }

  function platformBadges(platforms = []) {
    return platforms
      .map(id => PLATFORM[id])
      .filter(Boolean)
      .map(platform => `
        <span
          class="postx-platform"
          style="--platform-color:${platform.color}"
          title="${escapeHTML(platform.name)}"
        >
          ${escapeHTML(platform.icon)}
        </span>
      `)
      .join("");
  }

  function statusClass(status) {
    const allowed = [
      "draft",
      "scheduled",
      "published"
    ];

    return allowed.includes(status)
      ? status
      : "draft";
  }


  /* =========================================================
     DARK PREMIUM CSS
     ========================================================= */

  function injectStyles() {
    if (document.getElementById("postx-runtime-styles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "postx-runtime-styles";

    style.textContent = `
      :root {
        --postx-bg: #07111f;
        --postx-bg-2: #091827;
        --postx-surface: #0d1b2a;
        --postx-surface-2: #10253a;

        --postx-text: #f5f7fa;
        --postx-muted: #94a3b8;

        --postx-border: rgba(255,255,255,.08);

        --postx-primary: #00d4ff;
        --postx-primary-2: #7c3aed;

        --postx-success: #22c55e;
        --postx-danger: #ef4444;
        --postx-warning: #f59e0b;

        --postx-shadow:
          0 15px 45px rgba(0,0,0,.35);

        --postx-radius: 18px;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background: var(--postx-bg);
      }

      body {
        color: var(--postx-text);
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;

        background:
          radial-gradient(
            circle at 15% 0%,
            rgba(0,212,255,.12),
            transparent 30%
          ),
          radial-gradient(
            circle at 90% 10%,
            rgba(124,58,237,.14),
            transparent 28%
          ),
          var(--postx-bg);
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

      button:disabled {
        opacity: .5;
        cursor: not-allowed;
      }

      img {
        max-width: 100%;
      }

      .postx-root {
        min-height: 100vh;
      }

      .postx-shell {
        min-height: 100vh;
        display: flex;
      }

      /* SIDEBAR */

      .postx-sidebar {
        width: 270px;
        background: rgba(8,16,30,.98);
        border-right: 1px solid var(--postx-border);

        padding: 22px 16px;

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

        padding:
          8px
          10px
          26px;
      }

      .postx-brand-mark {
        width: 44px;
        height: 44px;

        border-radius: 13px;

        display: grid;
        place-items: center;

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
          0 8px 24px
          rgba(124,58,237,.35);
      }

      .postx-brand-name {
        font-size: 20px;
        font-weight: 900;
      }

      .postx-brand-sub {
        font-size: 10px;
        color: var(--postx-muted);
        margin-top: 2px;
        letter-spacing: .4px;
      }

      .postx-create-btn {
        width: 100%;

        border: 0;
        border-radius: 13px;

        padding: 14px 16px;

        color: #fff;
        font-weight: 850;

        background:
          linear-gradient(
            135deg,
            #00d4ff,
            #7c3aed
          );

        box-shadow:
          0 8px 25px
          rgba(0,212,255,.22);

        margin-bottom: 18px;

        transition:
          transform .18s ease,
          box-shadow .18s ease;
      }

      .postx-create-btn:hover {
        transform: translateY(-1px);

        box-shadow:
          0 12px 30px
          rgba(0,212,255,.30);
      }

      .postx-nav {
        display: grid;
        gap: 6px;
      }

      .postx-nav-btn {
        width: 100%;

        border: 0;
        border-radius: 12px;

        background: transparent;
        color: var(--postx-muted);

        padding: 12px 13px;

        display: flex;
        align-items: center;

        gap: 12px;

        text-align: left;

        transition: .18s ease;
      }

      .postx-nav-btn:hover {
        background: rgba(255,255,255,.06);
        color: #fff;
      }

      .postx-nav-btn.active {
        color: #fff;

        background:
          linear-gradient(
            90deg,
            rgba(0,212,255,.18),
            rgba(124,58,237,.18)
          );

        box-shadow:
          inset 3px 0 0
          var(--postx-primary);
      }

      .postx-nav-icon {
        width: 24px;
        text-align: center;
        font-size: 18px;
      }

      /* MAIN */

      .postx-main {
        margin-left: 270px;
        width: calc(100% - 270px);
        min-height: 100vh;
      }

      .postx-mobile-header {
        display: none;
      }

      .postx-page {
        width: 100%;
        max-width: 1450px;
        margin: 0 auto;
        padding: 30px;
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
        margin: 0;

        font-size: 36px;
        font-weight: 900;

        letter-spacing: -.9px;
      }

      .postx-page-subtitle {
        margin: 7px 0 0;

        color: var(--postx-muted);

        line-height: 1.5;
      }

      .postx-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      /* BUTTONS */

      .postx-btn {
        border: 1px solid var(--postx-border);

        border-radius: 12px;

        padding: 11px 16px;

        background: var(--postx-surface);
        color: #fff;

        font-weight: 750;

        transition: .18s ease;
      }

      .postx-btn:hover {
        background: var(--postx-surface-2);
        border-color: rgba(255,255,255,.15);
      }

      .postx-btn-primary {
        border: 0;

        background:
          linear-gradient(
            135deg,
            #00d4ff,
            #1687ff
          );

        color: #03121d;

        box-shadow:
          0 8px 18px
          rgba(0,212,255,.22);
      }

      .postx-btn-gradient {
        border: 0;

        background:
          linear-gradient(
            135deg,
            #00d4ff,
            #7c3aed
          );

        color: #fff;
      }

      .postx-btn-danger {
        color: #fecaca;
        border-color: rgba(239,68,68,.25);
      }

      /* CARDS */

      .postx-card {
        background:
          linear-gradient(
            145deg,
            rgba(13,27,42,.98),
            rgba(16,37,58,.86)
          );

        border:
          1px solid
          var(--postx-border);

        border-radius:
          var(--postx-radius);

        box-shadow:
          var(--postx-shadow);
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
        padding: 21px;

        position: relative;
        overflow: hidden;
      }

      .postx-stat::after {
        content: "";

        position: absolute;

        width: 100px;
        height: 100px;

        right: -40px;
        bottom: -45px;

        border-radius: 50%;

        background:
          rgba(0,212,255,.08);

        filter: blur(2px);
      }

      .postx-stat-label {
        color: var(--postx-muted);

        font-size: 13px;
        font-weight: 700;

        display: flex;
        align-items: center;

        gap: 8px;
      }

      .postx-stat-value {
        font-size: 34px;
        font-weight: 900;

        margin-top: 12px;

        letter-spacing: -.8px;
      }

      .postx-stat-sub {
        color: var(--postx-primary);

        font-size: 12px;

        margin-top: 6px;
      }

      /* DASHBOARD */

      .postx-dashboard-grid {
        display: grid;

        grid-template-columns:
          1.4fr
          .9fr;

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
        font-size: 17px;
        font-weight: 850;

        margin: 0;
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

        border:
          1px solid
          var(--postx-border);

        border-radius: 13px;

        background:
          rgba(255,255,255,.025);
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

        font-weight: 900;
        color: var(--postx-primary);
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
        font-weight: 750;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .postx-list-meta {
        color: var(--postx-muted);

        font-size: 12px;

        margin-top: 4px;
      }

      /* STATUS */

      .postx-status {
        display: inline-flex;

        padding: 5px 9px;

        border-radius: 999px;

        font-size: 10px;
        font-weight: 850;

        text-transform: uppercase;

        white-space: nowrap;
      }

      .postx-status-draft {
        background: rgba(245,158,11,.15);
        color: #fbbf24;
      }

      .postx-status-scheduled {
        background: rgba(0,212,255,.15);
        color: #00d4ff;
      }

      .postx-status-published {
        background: rgba(34,197,94,.15);
        color: #22c55e;
      }

      /* CHART */

      .postx-chart {
        height: 150px;

        border-radius: 14px;

        border:
          1px solid
          rgba(0,212,255,.10);

        background:
          linear-gradient(
            to top,
            rgba(0,212,255,.15),
            transparent
          );

        position: relative;

        overflow: hidden;

        display: flex;
        align-items: flex-end;

        padding: 18px;
      }

      .postx-chart-bars {
        width: 100%;
        height: 100%;

        display: flex;
        align-items: flex-end;

        justify-content: space-around;

        gap: 8px;
      }

      .postx-chart-bar {
        width: 9%;

        min-height: 18px;

        border-radius:
          8px 8px 2px 2px;

        background:
          linear-gradient(
            to top,
            #00d4ff,
            #7c3aed
          );

        box-shadow:
          0 0 15px
          rgba(0,212,255,.20);
      }

      /* FORM */

      .postx-form-grid {
        display: grid;

        grid-template-columns:
          minmax(0, 1.25fr)
          minmax(280px, .75fr);

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

        font-size: 13px;
        font-weight: 800;

        margin-bottom: 8px;

        color: #cbd5e1;
      }

      .postx-input,
      .postx-textarea,
      .postx-select {
        width: 100%;

        border:
          1px solid
          var(--postx-border);

        border-radius: 12px;

        padding: 12px 13px;

        background:
          rgba(255,255,255,.04);

        color: #fff;

        outline: none;

        transition: .18s ease;
      }

      .postx-input:focus,
      .postx-textarea:focus,
      .postx-select:focus {
        border-color:
          rgba(0,212,255,.45);

        box-shadow:
          0 0 0 3px
          rgba(0,212,255,.08);
      }

      .postx-select option {
        background: #0d1b2a;
        color: #fff;
      }

      .postx-textarea {
        min-height: 180px;
        resize: vertical;
      }

      .postx-upload {
        border:
          2px dashed
          rgba(255,255,255,.15);

        border-radius: 14px;

        padding: 28px 16px;

        text-align: center;

        background:
          rgba(255,255,255,.02);

        cursor: pointer;

        display: block;
      }

      .postx-upload:hover {
        border-color:
          rgba(0,212,255,.45);

        background:
          rgba(0,212,255,.04);
      }

      .postx-upload-preview {
        margin-top: 12px;
        max-height: 260px;

        width: 100%;

        object-fit: cover;

        border-radius: 12px;
      }

      /* PLATFORM SELECTOR */

      .postx-platforms {
        display: flex;
        gap: 9px;
        flex-wrap: wrap;
      }

      .postx-platform-option {
        border:
          1px solid
          var(--postx-border);

        border-radius: 12px;

        padding: 10px 13px;

        background:
          rgba(255,255,255,.03);

        color: var(--postx-muted);

        display: flex;
        align-items: center;

        gap: 8px;
      }

      .postx-platform-option.selected {
        color: #fff;

        border-color:
          rgba(0,212,255,.45);

        background:
          rgba(0,212,255,.10);
      }

      .postx-platform {
        width: 25px;
        height: 25px;

        border-radius: 8px;

        display: inline-grid;
        place-items: center;

        background:
          color-mix(
            in srgb,
            var(--platform-color) 20%,
            transparent
          );

        color:
          var(--platform-color);

        font-weight: 900;

        font-size: 12px;
      }

      /* PREVIEW */

      .postx-preview-phone {
        max-width: 370px;

        margin: 0 auto;

        border:
          1px solid
          var(--postx-border);

        border-radius: 24px;

        overflow: hidden;

        background:
          #050b14;

        box-shadow:
          0 14px 40px
          rgba(0,0,0,.35);
      }

      .postx-preview-top {
        padding: 14px;

        display: flex;
        align-items: center;

        gap: 10px;

        border-bottom:
          1px solid
          var(--postx-border);
      }

      .postx-avatar {
        width: 36px;
        height: 36px;

        border-radius: 50%;

        display: grid;
        place-items: center;

        font-weight: 900;

        background:
          linear-gradient(
            135deg,
            #00d4ff,
            #7c3aed
          );
      }

      .postx-preview-name {
        font-size: 13px;
        font-weight: 800;
      }

      .postx-preview-content {
        padding: 17px;

        white-space: pre-wrap;

        word-break: break-word;

        line-height: 1.55;

        min-height: 100px;
      }

      .postx-preview-image {
        width: 100%;

        max-height: 360px;

        object-fit: cover;

        display: block;
      }

      .postx-preview-footer {
        padding: 12px 17px 17px;

        color: var(--postx-muted);

        font-size: 12px;
      }

      /* EMPTY */

      .postx-empty {
        padding: 38px 20px;

        text-align: center;

        color: var(--postx-muted);
      }

      .postx-empty-icon {
        font-size: 35px;
        margin-bottom: 10px;
      }

      /* CALENDAR */

      .postx-calendar {
        display: grid;

        grid-template-columns:
          repeat(7, 1fr);

        gap: 8px;
      }

      .postx-calendar-head {
        padding: 8px;

        text-align: center;

        color: var(--postx-muted);

        font-size: 11px;
        font-weight: 800;
      }

      .postx-calendar-day {
        min-height: 105px;

        padding: 9px;

        border:
          1px solid
          var(--postx-border);

        border-radius: 12px;

        background:
          rgba(255,255,255,.025);
      }

      .postx-calendar-day.today {
        border-color:
          rgba(0,212,255,.45);

        box-shadow:
          inset 0 0 0 1px
          rgba(0,212,255,.15);
      }

      .postx-calendar-number {
        font-size: 12px;
        font-weight: 800;
      }

      .postx-calendar-post {
        margin-top: 7px;

        padding: 5px 6px;

        border-radius: 7px;

        background:
          rgba(0,212,255,.10);

        color: #bdefff;

        font-size: 10px;

        overflow: hidden;

        white-space: nowrap;
        text-overflow: ellipsis;
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

        background: #111827;

        color: #fff;

        font-size: 13px;
        font-weight: 650;

        box-shadow:
          0 12px 30px
          rgba(0,0,0,.3);

        animation:
          postxToastIn .2s ease;
      }

      .postx-toast.success {
        background: #166534;
      }

      .postx-toast.error {
        background: #991b1b;
      }

      .postx-toast.info {
        background: #075985;
      }

      @keyframes postxToastIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* MOBILE */

      .postx-overlay {
        position: fixed;

        inset: 0;

        background:
          rgba(7,17,31,.68);

        display: none;

        z-index: 90;
      }

      .postx-overlay.show {
        display: block;
      }

      @media (max-width: 1050px) {

        .postx-stats {
          grid-template-columns:
            repeat(2, 1fr);
        }

        .postx-dashboard-grid,
        .postx-form-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {

        .postx-sidebar {
          transform:
            translateX(-100%);

          transition:
            transform .22s ease;

          width: 270px;
        }

        .postx-sidebar.open {
          transform:
            translateX(0);
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
            rgba(13,27,42,.98);

          border-bottom:
            1px solid
            var(--postx-border);

          position: sticky;
          top: 0;

          z-index: 70;
        }

        .postx-page {
          padding:
            20px 14px;
        }

        .postx-page-title {
          font-size: 29px;
        }

        .postx-stats {
          grid-template-columns:
            repeat(2, 1fr);

          gap: 10px;
        }

        .postx-stat {
          padding: 15px;
        }

        .postx-stat-value {
          font-size: 27px;
        }

        .postx-list-item {
          align-items: flex-start;
        }

        .postx-calendar {
          gap: 4px;
        }

        .postx-calendar-day {
          min-height: 75px;
          padding: 6px;
        }

        .postx-calendar-head {
          font-size: 9px;
        }

        .postx-calendar-post {
          display: none;
        }
      }

      @media (max-width: 450px) {

        .postx-stats {
          grid-template-columns: 1fr 1fr;
        }

        .postx-page-header {
          margin-bottom: 20px;
        }

        .postx-actions {
          width: 100%;
        }

        .postx-actions .postx-btn {
          flex: 1;
        }

        .postx-status {
          font-size: 9px;
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
    const container =
      document.getElementById("postxToastContainer");

    if (!container) return;

    const item = document.createElement("div");

    item.className =
      `postx-toast ${type}`;

    item.textContent = message;

    container.appendChild(item);

    setTimeout(() => {
      item.remove();
    }, 3200);
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
            data-postx-nav="create"
          >
            + Create Post
          </button>

          <nav class="postx-nav">

            ${NAV_ITEMS.map(item => `
              <button
                class="postx-nav-btn"
                data-postx-nav="${item.id}"
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
              color:#64748b;
              font-size:11px;
              line-height:1.6;
            "
          >
            PostX v${APP.version}<br>
            Dark Premium • Local storage
          </div>

        </aside>

        <div
          class="postx-overlay"
          id="postxOverlay"
        ></div>

        <main class="postx-main">

          <header class="postx-mobile-header">

            <div style="font-weight:900;">
              PostX
            </div>

            <button
              id="postxMenuButton"
              style="
                width:40px;
                height:40px;
                border-radius:10px;
                border:1px solid rgba(255,255,255,.1);
                background:transparent;
                color:#fff;
              "
              aria-label="Open menu"
            >
              ☰
            </button>

          </header>

          <div
            id="postxPageContainer"
          ></div>

        </main>

      </div>

      <div
        class="postx-toast-container"
        id="postxToastContainer"
      ></div>
    `;

    bindShellEvents();
  }


  function bindShellEvents() {
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

    const menu =
      document.getElementById(
        "postxMenuButton"
      );

    if (menu) {
      menu.addEventListener(
        "click",
        toggleMobileMenu
      );
    }

    const overlay =
      document.getElementById(
        "postxOverlay"
      );

    if (overlay) {
      overlay.addEventListener(
        "click",
        closeMobileMenu
      );
    }
  }


  function toggleMobileMenu() {
    const sidebar =
      document.getElementById(
        "postxSidebar"
      );

    const overlay =
      document.getElementById(
        "postxOverlay"
      );

    sidebar?.classList.toggle("open");
    overlay?.classList.toggle("show");
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
    if (
      !NAV_ITEMS.some(
        item => item.id === page
      )
    ) {
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
      return;
    }

    if (state.activePage === "create") {
      renderCreate(container);
      return;
    }

    if (state.activePage === "calendar") {
      renderCalendar(container);
      return;
    }

    renderListPage(
      container,
      state.activePage
    );
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

    container.innerHTML = `

      <div class="postx-page">

        <div class="postx-page-header">

          <div>
            <h1 class="postx-page-title">
              Dashboard
            </h1>

            <p class="postx-page-subtitle">
              Welcome back,
              ${escapeHTML(state.profile.name)}
              • Here's your social media overview
            </p>
          </div>

          <div class="postx-actions">

            <button
              class="postx-btn postx-btn-gradient"
              data-action="create"
            >
              + Create Post
            </button>

          </div>

        </div>

        <section class="postx-stats">

          ${statCard(
            "📄",
            "Total Posts",
            total || 127,
            "+12% from last month ↗"
          )}

          ${statCard(
            "◷",
            "Scheduled",
            scheduled || 18,
            "+3 scheduled this week ↗"
          )}

          ${statCard(
            "✎",
            "Drafts",
            drafts || 9,
            "3 ready to review",
            true
          )}

          ${statCard(
            "✓",
            "Published",
            published || 100,
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
                  padding:6px 10px;
                  font-size:12px;
                "
                data-action="published"
              >
                See all →
              </button>

            </div>

            ${
              recent.length
                ? `
                  <div class="postx-list">

                    ${recent.map(post =>
                      postListItem(post)
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

                    <button
                      class="postx-btn postx-btn-gradient"
                      style="margin-top:14px;"
                      data-action="create"
                    >
                      Create your first post
                    </button>

                  </div>
                `
            }

          </div>

          <div style="display:grid;gap:20px;">

            <div
              class="postx-card postx-section-card"
            >

              <h2 class="postx-section-title">
                Performance Overview
              </h2>

              <p
                style="
                  color:var(--postx-muted);
                  font-size:13px;
                  margin:6px 0 14px;
                "
              >
                Last 7 days engagement
              </p>

              <div class="postx-chart">

                <div class="postx-chart-bars">

                  <span
                    class="postx-chart-bar"
                    style="height:34%;"
                  ></span>

                  <span
                    class="postx-chart-bar"
                    style="height:48%;"
                  ></span>

                  <span
                    class="postx-chart-bar"
                    style="height:42%;"
                  ></span>

                  <span
                    class="postx-chart-bar"
                    style="height:67%;"
                  ></span>

                  <span
                    class="postx-chart-bar"
                    style="height:58%;"
                  ></span>

                  <span
                    class="postx-chart-bar"
                    style="height:82%;"
                  ></span>

                  <span
                    class="postx-chart-bar"
                    style="height:94%;"
                  ></span>

                </div>

              </div>

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  gap:12px;
                  margin-top:14px;
                "
              >

                <div>
                  <strong>4.8%</strong>
                  <div
                    style="
                      color:var(--postx-muted);
                      font-size:11px;
                    "
                  >
                    Engagement
                  </div>
                </div>

                <div>
                  <strong>12.4k</strong>
                  <div
                    style="
                      color:var(--postx-muted);
                      font-size:11px;
                    "
                  >
                    Avg Reach
                  </div>
                </div>

              </div>

            </div>

            <div
              class="postx-card postx-section-card"
            >

              <div class="postx-section-head">

                <h2 class="postx-section-title">
                  Connected Accounts
                </h2>

              </div>

              <div
                style="
                  display:grid;
                  gap:10px;
                "
              >

                ${Object.keys(PLATFORM)
                  .map(id => {

                    const platform =
                      PLATFORM[id];

                    const connected =
                      !!state.connectedAccounts[id];

                    return `
                      <div
                        style="
                          display:flex;
                          align-items:center;
                          justify-content:space-between;
                          gap:10px;
                          padding:10px;
                          border:1px solid var(--postx-border);
                          border-radius:11px;
                          background:rgba(255,255,255,.025);
                        "
                      >

                        <div
                          style="
                            display:flex;
                            align-items:center;
                            gap:9px;
                          "
                        >

                          <span
                            class="postx-platform"
                            style="
                              --platform-color:${platform.color};
                            "
                          >
                            ${escapeHTML(platform.icon)}
                          </span>

                          <span>
                            ${escapeHTML(platform.name)}
                          </span>

                        </div>

                        <span
                          style="
                            color:${connected
                              ? "#22c55e"
                              : "#94a3b8"};
                            font-size:11px;
                            font-weight:800;
                          "
                        >
                          ${connected
                            ? "CONNECTED"
                            : "NOT CONNECTED"}
                        </span>

                      </div>
                    `;
                  })
                  .join("")}

              </div>

            </div>

          </div>

        </section>

      </div>
    `;

    bindDashboardEvents();
  }


  function statCard(
    icon,
    label,
    value,
    sub,
    muted = false
  ) {
    return `
      <div class="postx-card postx-stat">

        <div class="postx-stat-label">
          ${icon}
          ${escapeHTML(label)}
        </div>

        <div class="postx-stat-value">
          ${escapeHTML(value)}
        </div>

        <div
          class="postx-stat-sub"
          style="
            ${muted
              ? "color:#94a3b8;"
              : ""}
          "
        >
          ${escapeHTML(sub)}
        </div>

      </div>
    `;
  }


  function bindDashboardEvents() {
    document
      .querySelectorAll(
        "[data-action='create']"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => navigate("create")
        );

      });

    document
      .querySelectorAll(
        "[data-action='published']"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => navigate("published")
        );

      });
  }


  /* =========================================================
     CREATE POST
     ========================================================= */

  function renderCreate(container) {
    const editing =
      state.editingPostId
        ? getPostById(state.editingPostId)
        : null;

    const post =
      editing || {
        caption: "",
        hashtags: "",
        platforms: ["facebook", "instagram"],
        imageData: "",
        scheduledAt: ""
      };

    container.innerHTML = `

      <div class="postx-page">

        <div class="postx-page-header">

          <div>
            <h1 class="postx-page-title">
              ${editing
                ? "Edit Post"
                : "Create Post"}
            </h1>

            <p class="postx-page-subtitle">
              Create once and prepare your content
              for multiple social platforms.
            </p>
          </div>

          <div class="postx-actions">

            <button
              class="postx-btn"
              id="postxCancelCreate"
            >
              Cancel
            </button>

          </div>

        </div>

        <div class="postx-form-grid">

          <div
            class="postx-card postx-form-card"
          >

            <div class="postx-field">

              <label class="postx-label">
                Social Platforms
              </label>

              <div class="postx-platforms">

                ${Object.keys(PLATFORM)
                  .map(id => {

                    const platform =
                      PLATFORM[id];

                    const selected =
                      post.platforms.includes(id);

                    const connected =
                      state.connectedAccounts[id];

                    return `
                      <button
                        type="button"
                        class="
                          postx-platform-option
                          ${selected
                            ? "selected"
                            : ""}
                        "
                        data-platform="${id}"
                        ${connected
                          ? ""
                          : "disabled"}
                      >

                        <span
                          class="postx-platform"
                          style="
                            --platform-color:${platform.color};
                          "
                        >
                          ${escapeHTML(platform.icon)}
                        </span>

                        ${escapeHTML(platform.name)}

                      </button>
                    `;
                  })
                  .join("")}

              </div>

            </div>

            <div class="postx-field">

              <label
                class="postx-label"
                for="postxCaption"
              >
                Caption
              </label>

              <textarea
                id="postxCaption"
                class="postx-textarea"
                placeholder="What do you want to share?"
              >${escapeHTML(post.caption || "")}</textarea>

              <div
                style="
                  color:var(--postx-muted);
                  font-size:11px;
                  margin-top:6px;
                "
                id="postxCharCount"
              >
                0 characters
              </div>

            </div>

            <div class="postx-field">

              <label
                class="postx-label"
                for="postxHashtags"
              >
                Hashtags
              </label>

              <input
                id="postxHashtags"
                class="postx-input"
                value="${escapeHTML(post.hashtags || "")}"
                placeholder="marketing socialmedia postx"
              />

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
                  hidden
                />

                <div style="font-size:28px;">
                  📷
                </div>

                <div
                  style="
                    margin-top:7px;
                    font-weight:800;
                  "
                >
                  Add an image
                </div>

                <div
                  style="
                    margin-top:4px;
                    color:var(--postx-muted);
                    font-size:12px;
                  "
                >
                  JPG, PNG, WEBP
                </div>

                <div id="postxUploadPreview"></div>

              </label>

            </div>

            <div class="postx-field">

              <label
                class="postx-label"
                for="postxSchedule"
              >
                Schedule Date & Time
              </label>

              <input
                id="postxSchedule"
                class="postx-input"
                type="datetime-local"
                value="${escapeHTML(
                  toDatetimeLocal(
                    post.scheduledAt
                  )
                )}"
              />

            </div>

            <div
              style="
                display:flex;
                gap:10px;
                flex-wrap:wrap;
              "
            >

              <button
                class="postx-btn"
                id="postxSaveDraft"
              >
                Save Draft
              </button>

              <button
                class="postx-btn postx-btn-primary"
                id="postxSchedulePost"
              >
                Schedule Post
              </button>

              <button
                class="postx-btn postx-btn-gradient"
                id="postxPublishPost"
              >
                Publish Now
              </button>

            </div>

          </div>

          <div
            class="postx-card postx-form-card"
          >

            <div
              class="postx-section-head"
            >

              <h2 class="postx-section-title">
                Live Preview
              </h2>

            </div>

            <div
              class="postx-preview-phone"
            >

              <div class="postx-preview-top">

                <div class="postx-avatar">
                  P
                </div>

                <div>
                  <div class="postx-preview-name">
                    PostX
                  </div>

                  <div
                    style="
                      color:var(--postx-muted);
                      font-size:10px;
                    "
                  >
                    ${post.platforms
                      .map(id =>
                        PLATFORM[id]?.name
                      )
                      .filter(Boolean)
                      .join(" • ") ||
                      "Social Media"}
                  </div>
                </div>

              </div>

              <div
                class="postx-preview-content"
                id="postxLiveCaption"
              >
                Your post preview will appear here…
              </div>

              <div id="postxLiveImage"></div>

              <div
                class="postx-preview-footer"
              >
                ♥ 1.2k
                &nbsp;&nbsp;
                💬 84
                &nbsp;&nbsp;
                ↗ 42
              </div>

            </div>

          </div>

        </div>

      </div>
    `;

    setupCreateForm(post);
  }


  function toDatetimeLocal(value) {
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


  function setupCreateForm(post) {
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
        "postxImageInput"
      );

    let imageData =
      post.imageData || "";

    let selectedPlatforms =
      [...(
        post.platforms?.length
          ? post.platforms
          : ["facebook"]
      )];


    /* PLATFORM */

    document
      .querySelectorAll(
        "[data-platform]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.platform;

            if (
              selectedPlatforms.includes(id)
            ) {
              selectedPlatforms =
                selectedPlatforms.filter(
                  item => item !== id
                );
            } else {
              selectedPlatforms.push(id);
            }

            button.classList.toggle(
              "selected",
              selectedPlatforms.includes(id)
            );

            updatePreview();
          }
        );

      });


    /* CAPTION */

    function updatePreview() {
      const fullCaption =
        buildFullCaption(
          caption.value,
          hashtags.value
        );

      const preview =
        document.getElementById(
          "postxLiveCaption"
        );

      preview.textContent =
        fullCaption ||
        "Your post preview will appear here…";

      const counter =
        document.getElementById(
          "postxCharCount"
        );

      counter.textContent =
        `${caption.value.length} characters`;

      const imageContainer =
        document.getElementById(
          "postxLiveImage"
        );

      imageContainer.innerHTML =
        imageData
          ? `
            <img
              class="postx-preview-image"
              src="${escapeHTML(imageData)}"
              alt="Post preview"
            >
          `
          : "";

      const uploadPreview =
        document.getElementById(
          "postxUploadPreview"
        );

      uploadPreview.innerHTML =
        imageData
          ? `
            <img
              class="postx-upload-preview"
              src="${escapeHTML(imageData)}"
              alt="Selected image"
            >
          `
          : "";
    }


    caption.addEventListener(
      "input",
      updatePreview
    );

    hashtags.addEventListener(
      "input",
      updatePreview
    );


    /* IMAGE */

    imageInput.addEventListener(
      "change",
      () => {

        const file =
          imageInput.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
          toast(
            "Please select an image file.",
            "error"
          );
          return;
        }

        if (
          file.size >
          5 * 1024 * 1024
        ) {
          toast(
            "Image must be 5MB or smaller.",
            "error"
          );
          return;
        }

        const reader =
          new FileReader();

        reader.onload = event => {

          imageData =
            event.target.result;

          updatePreview();

          toast(
            "Image added successfully.",
            "success"
          );
        };

        reader.readAsDataURL(file);
      }
    );


    /* CANCEL */

    document
      .getElementById(
        "postxCancelCreate"
      )
      .addEventListener(
        "click",
        () => navigate("dashboard")
      );


    /* SAVE */

    document
      .getElementById(
        "postxSaveDraft"
      )
      .addEventListener(
        "click",
        () => {

          savePost(
            "draft",
            selectedPlatforms,
            caption.value,
            hashtags.value,
            imageData,
            schedule.value
          );

        }
      );


    /* SCHEDULE */

    document
      .getElementById(
        "postxSchedulePost"
      )
      .addEventListener(
        "click",
        () => {

          if (!schedule.value) {

            toast(
              "Choose a date and time first.",
              "error"
            );

            return;
          }

          const selectedDate =
            new Date(schedule.value);

          if (
            Number.isNaN(
              selectedDate.getTime()
            )
          ) {
            toast(
              "Invalid schedule date.",
              "error"
            );

            return;
          }

          if (
            selectedDate.getTime() <=
            Date.now()
          ) {
            toast(
              "Schedule time must be in the future.",
              "error"
            );

            return;
          }

          savePost(
            "scheduled",
            selectedPlatforms,
            caption.value,
            hashtags.value,
            imageData,
            schedule.value
          );

        }
      );


    /* PUBLISH */

    document
      .getElementById(
        "postxPublishPost"
      )
      .addEventListener(
        "click",
        () => {

          savePost(
            "published",
            selectedPlatforms,
            caption.value,
            hashtags.value,
            imageData,
            ""
          );

        }
      );


    updatePreview();
  }


  function savePost(
    status,
    platforms,
    caption,
    hashtags,
    imageData,
    scheduledAt
  ) {

    const cleanCaption =
      String(caption || "").trim();

    if (!cleanCaption) {
      toast(
        "Write a caption before saving.",
        "error"
      );

      return;
    }

    if (!platforms.length) {
      toast(
        "Select at least one social platform.",
        "error"
      );

      return;
    }

    const now =
      new Date().toISOString();

    const existing =
      state.editingPostId
        ? getPostById(
            state.editingPostId
          )
        : null;

    if (existing) {

      existing.caption =
        cleanCaption;

      existing.hashtags =
        normalizeHashtags(
          hashtags
        );

      existing.platforms =
        [...platforms];

      existing.imageData =
        imageData || "";

      existing.status =
        status;

      existing.scheduledAt =
        status === "scheduled"
          ? new Date(
              scheduledAt
            ).toISOString()
          : "";

      existing.publishedAt =
        status === "published"
          ? now
          : existing.publishedAt || "";

      existing.updatedAt =
        now;

    } else {

      state.posts.push({
        id: uid(),

        caption:
          cleanCaption,

        hashtags:
          normalizeHashtags(
            hashtags
          ),

        platforms:
          [...platforms],

        imageData:
          imageData || "",

        status,

        scheduledAt:
          status === "scheduled"
            ? new Date(
                scheduledAt
              ).toISOString()
            : "",

        publishedAt:
          status === "published"
            ? now
            : "",

        createdAt:
          now,

        updatedAt:
          now
      });

    }

    state.editingPostId = null;

    saveState();

    toast(
      status === "draft"
        ? "Draft saved."
        : status === "scheduled"
          ? "Post scheduled."
          : "Post published.",
      "success"
    );

    setTimeout(() => {

      navigate(
        status === "draft"
          ? "drafts"
          : status === "scheduled"
            ? "scheduled"
            : "published"
      );

    }, 350);
  }


  /* =========================================================
     LIST PAGES
     ========================================================= */

  function renderListPage(
    container,
    page
  ) {

    const pageConfig = {
      scheduled: {
        title: "Scheduled Posts",
        subtitle:
          "Posts waiting to be published."
      },

      drafts: {
        title: "Drafts",
        subtitle:
          "Continue working on unfinished posts."
      },

      published: {
        title: "Published Posts",
        subtitle:
          "Your published social media content."
      }
    };

    const config =
      pageConfig[page] ||
      pageConfig.published;

    let posts =
      state.posts.filter(
        post =>
          post.status === page
      );

    posts.sort(
      (a, b) =>
        new Date(
          b.updatedAt || b.createdAt
        ) -
        new Date(
          a.updatedAt || a.createdAt
        )
    );

    container.innerHTML = `

      <div class="postx-page">

        <div class="postx-page-header">

          <div>

            <h1 class="postx-page-title">
              ${escapeHTML(config.title)}
            </h1>

            <p class="postx-page-subtitle">
              ${escapeHTML(config.subtitle)}
            </p>

          </div>

          <div class="postx-actions">

            <button
              class="postx-btn postx-btn-gradient"
              data-list-create
            >
              + Create Post
            </button>

          </div>

        </div>

        <div class="postx-card postx-section-card">

          ${
            posts.length
              ? `
                <div class="postx-list">

                  ${posts
                    .map(post =>
                      detailedPostItem(post)
                    )
                    .join("")}

                </div>
              `
              : `
                <div class="postx-empty">

                  <div class="postx-empty-icon">
                    ${
                      page === "drafts"
                        ? "📝"
                        : page === "scheduled"
                          ? "⏰"
                          : "🚀"
                    }
                  </div>

                  <div
                    style="
                      font-weight:800;
                      color:#fff;
                    "
                  >
                    No ${escapeHTML(page)}
                    posts yet.
                  </div>

                  <div
                    style="
                      margin-top:6px;
                    "
                  >
                    Create a post to get started.
                  </div>

                </div>
              `
          }

        </div>

      </div>
    `;

    document
      .querySelector(
        "[data-list-create]"
      )
      ?.addEventListener(
        "click",
        () => navigate("create")
      );

    bindPostActions();
  }


  function postListItem(post) {
    const date =
      post.status === "scheduled"
        ? post.scheduledAt
        : post.status === "published"
          ? post.publishedAt
          : post.updatedAt;

    return `
      <div class="postx-list-item">

        <div class="postx-list-thumb">

          ${
            post.imageData
              ? `
                <img
                  src="${escapeHTML(post.imageData)}"
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
                "Untitled",
                50
              )
            )}
          </div>

          <div class="postx-list-meta">

            ${escapeHTML(
              formatDateTime(date)
            )}

            &nbsp; • &nbsp;

            ${platformBadges(
              post.platforms
            )}

          </div>

        </div>

        <span
          class="
            postx-status
            postx-status-${statusClass(
              post.status
            )}
          "
        >
          ${escapeHTML(post.status)}
        </span>

      </div>
    `;
  }


  function detailedPostItem(post) {
    const date =
      post.status === "scheduled"
        ? post.scheduledAt
        : post.status === "published"
          ? post.publishedAt
          : post.updatedAt;

    return `
      <div
        class="postx-list-item"
        style="
          align-items:flex-start;
        "
      >

        <div class="postx-list-thumb">

          ${
            post.imageData
              ? `
                <img
                  src="${escapeHTML(post.imageData)}"
                  alt=""
                >
              `
              : "P"
          }

        </div>

        <div class="postx-list-body">

          <div
            style="
              font-weight:800;
              line-height:1.4;
            "
          >
            ${escapeHTML(
              truncate(
                post.caption ||
                "Untitled",
                160
              )
            )}
          </div>

          ${
            post.hashtags
              ? `
                <div
                  style="
                    color:#00d4ff;
                    font-size:12px;
                    margin-top:6px;
                  "
                >
                  ${escapeHTML(
                    post.hashtags
                  )}
                </div>
              `
              : ""
          }

          <div class="postx-list-meta">

            ${escapeHTML(
              formatDateTime(date)
            )}

          </div>

          <div
            style="
              display:flex;
              align-items:center;
              gap:6px;
              margin-top:9px;
              flex-wrap:wrap;
            "
          >

            ${platformBadges(
              post.platforms
            )}

          </div>

          <div
            style="
              display:flex;
              gap:8px;
              margin-top:12px;
              flex-wrap:wrap;
            "
          >

            <button
              class="postx-btn"
              data-edit-post="${post.id}"
              style="
                padding:7px 11px;
                font-size:12px;
              "
            >
              Edit
            </button>

            <button
              class="postx-btn postx-btn-danger"
              data-delete-post="${post.id}"
              style="
                padding:7px 11px;
                font-size:12px;
              "
            >
              Delete
            </button>

          </div>

        </div>

        <span
          class="
            postx-status
            postx-status-${statusClass(
              post.status
            )}
          "
        >
          ${escapeHTML(post.status)}
        </span>

      </div>
    `;
  }


  /* =========================================================
     POST ACTIONS
     ========================================================= */

  function bindPostActions() {

    document
      .querySelectorAll(
        "[data-edit-post]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const post =
              getPostById(
                button.dataset.editPost
              );

            if (!post) {
              toast(
                "Post could not be found.",
                "error"
              );
              return;
            }

            state.editingPostId =
              post.id;

            state.activePage =
              "create";

            saveState();

            render();

            window.scrollTo({
              top: 0,
              behavior: "smooth"
            });

          }
        );

      });


    document
      .querySelectorAll(
        "[data-delete-post]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.deletePost;

            const post =
              getPostById(id);

            if (!post) return;

            const confirmed =
              window.confirm(
                "Delete this post permanently?"
              );

            if (!confirmed) {
              return;
            }

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
      );

    const lastDay =
      new Date(
        year,
        month + 1,
        0
      );

    const start =
      firstDay.getDay();

    const days =
      lastDay.getDate();

    const monthName =
      now.toLocaleDateString(
        undefined,
        {
          month: "long",
          year: "numeric"
        }
      );

    const cells = [];

    for (
      let i = 0;
      i < start;
      i++
    ) {
      cells.push(`
        <div></div>
      `);
    }

    for (
      let day = 1;
      day <= days;
      day++
    ) {

      const date =
        new Date(
          year,
          month,
          day
        );

      const dateKey =
        date.toISOString()
          .slice(0, 10);

      const todayKey =
        now.toISOString()
          .slice(0, 10);

      const dayPosts =
        state.posts.filter(
          post => {

            const value =
              post.scheduledAt ||
              post.publishedAt ||
              post.createdAt;

            return value &&
              new Date(value)
                .toISOString()
                .slice(0, 10) ===
                dateKey;
          }
        );

      cells.push(`
        <div
          class="
            postx-calendar-day
            ${dateKey === todayKey
              ? "today"
              : ""}
          "
        >

          <div class="postx-calendar-number">
            ${day}
          </div>

          ${dayPosts
            .slice(0, 3)
            .map(post => `
              <div
                class="postx-calendar-post"
                title="${escapeHTML(
                  post.caption
                )}"
              >
                ${escapeHTML(
                  truncate(
                    post.caption ||
                    "Post",
                    22
                  )
                )}
              </div>
            `)
            .join("")}

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
              ${escapeHTML(monthName)}
            </p>

          </div>

          <button
            class="postx-btn postx-btn-gradient"
            id="postxCalendarCreate"
          >
            + Create Post
          </button>

        </div>

        <div
          class="postx-card postx-section-card"
        >

          <div class="postx-calendar">

            ${[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat"
            ]
              .map(dayName => `
                <div class="postx-calendar-head">
                  ${dayName}
                </div>
              `)
              .join("")}

            ${cells.join("")}

          </div>

        </div>

      </div>
    `;

    document
      .getElementById(
        "postxCalendarCreate"
      )
      ?.addEventListener(
        "click",
        () => navigate("create")
      );
  }


  /* =========================================================
     SERVICE WORKER
     ========================================================= */

  function registerServiceWorker() {
    if (
      "serviceWorker" in navigator &&
      location.protocol !== "file:"
    ) {

      window.addEventListener(
        "load",
        () => {

          navigator.serviceWorker
            .register("./sw.js")
            .catch(error => {
              console.warn(
                "PostX service worker:",
                error
              );
            });

        }
      );
    }
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

    registerServiceWorker();

    console.log(
      `PostX ${APP.version} loaded successfully.`
    );
  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start
    );

  } else {

    start();

  }

})();
