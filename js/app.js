/*
=========================================================
                         POSTX
              Smart Social Media Publisher
                   Frontend App Engine
=========================================================

File:
    js/app.js

Purpose:
    Complete client-side PostX application engine.

Features:
    - Dashboard
    - Create Post
    - Facebook / Instagram selection
    - Image preview
    - Caption editor
    - Hashtags
    - Save Draft
    - Schedule Post
    - Publish Now simulation
    - Scheduled posts
    - Drafts
    - Published history
    - Calendar
    - LocalStorage persistence
    - Statistics
    - Edit / delete posts
    - Mobile navigation
    - Toast notifications
    - PWA-safe initialization

IMPORTANT:
    This is a frontend engine.
    Real Facebook/Instagram publishing requires a backend
    and Meta OAuth/API integration later.

=========================================================
*/

(() => {
  "use strict";

  /* =====================================================
     1. GLOBAL CONFIGURATION
  ===================================================== */

  const APP = {
    name: "PostX",
    version: "1.0.0",
    storageKey: "postx_state_v1",
    themeKey: "postx_theme_v1"
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

  /* =====================================================
     2. DEFAULT STATE
  ===================================================== */

  const DEFAULT_STATE = {
    posts: [],
    activePage: "dashboard",
    editingPostId: null,
    connectedAccounts: {
      facebook: false,
      instagram: false
    },
    profile: {
      name: "PostX User",
      email: ""
    }
  };

  let state = loadState();

  /* =====================================================
     3. STORAGE
  ===================================================== */

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
        posts: Array.isArray(saved.posts) ? saved.posts : [],
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
      console.warn("PostX: failed to load state.", error);
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
      console.warn("PostX: failed to save state.", error);
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* =====================================================
     4. UTILITY FUNCTIONS
  ===================================================== */

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

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatRelative(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return "just now";

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

    return formatDate(value);
  }

  function truncate(text, length = 120) {
    const value = String(text || "");

    if (value.length <= length) {
      return value;
    }

    return value.slice(0, length).trimEnd() + "…";
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

  function postPlatforms(post) {
    if (!post || !Array.isArray(post.platforms)) {
      return [];
    }

    return post.platforms;
  }

  function platformBadges(platforms) {
    return platforms
      .map(platform => {
        const data = PLATFORM[platform];

        if (!data) return "";

        return `
          <span
            class="postx-platform-badge"
            title="${escapeHTML(data.name)}"
            style="--platform-color:${data.color}"
          >
            ${escapeHTML(data.icon)}
          </span>
        `;
      })
      .join("");
  }

  /* =====================================================
     5. STATUS HELPERS
  ===================================================== */

  function getStatusLabel(status) {
    const labels = {
      draft: "Draft",
      scheduled: "Scheduled",
      published: "Published"
    };

    return labels[status] || status || "Unknown";
  }

  function getStatusClass(status) {
    return `postx-status-${String(status || "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")}`;
  }

  /* =====================================================
     6. DATE HELPERS
  ===================================================== */

  function getDateInputValue(date = new Date()) {
    const d = new Date(date);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getTimeInputValue(date = new Date()) {
    const d = new Date(date);

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
  }

  function combineDateTime(dateValue, timeValue) {
    if (!dateValue || !timeValue) {
      return null;
    }

    const date = new Date(`${dateValue}T${timeValue}`);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }

  /* =====================================================
     7. ROOT INITIALIZATION
  ===================================================== */

  function findExistingRoot() {
    const candidates = [
      "#postx-app",
      "#app",
      "#root",
      "#pageContainer",
      "#app-main",
      "main"
    ];

    for (const selector of candidates) {
      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function ensureRoot() {
    let root = findExistingRoot();

    if (!root) {
      root = document.createElement("div");
      root.id = "postx-app";
      document.body.appendChild(root);
    }

    root.classList.add("postx-root");

    return root;
  }

  /* =====================================================
     8. APPLICATION CSS
  ===================================================== */

  function injectStyles() {
    if (document.getElementById("postx-runtime-styles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "postx-runtime-styles";

    style.textContent = `
      :root {
        --postx-bg: #f5f7fb;
        --postx-surface: #ffffff;
        --postx-text: #111827;
        --postx-muted: #6b7280;
        --postx-border: #e5e7eb;
        --postx-primary: #635bff;
        --postx-primary-dark: #5046e5;
        --postx-success: #16a34a;
        --postx-danger: #dc2626;
        --postx-warning: #d97706;
        --postx-shadow: 0 12px 35px rgba(15, 23, 42, .08);
        --postx-radius: 18px;
      }

      * {
        box-sizing: border-box;
      }

      html {
        min-height: 100%;
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        min-height: 100%;
        background: var(--postx-bg);
        color: var(--postx-text);
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
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
      }

      .postx-shell {
        min-height: 100vh;
        display: flex;
      }

      .postx-sidebar {
        width: 250px;
        background: #0f172a;
        color: white;
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
        padding: 8px 10px 26px;
      }

      .postx-brand-mark {
        width: 42px;
        height: 42px;
        border-radius: 13px;
        display: grid;
        place-items: center;
        font-weight: 900;
        font-size: 21px;
        color: white;
        background: linear-gradient(135deg, #635bff, #ec4899);
        box-shadow: 0 8px 24px rgba(99, 91, 255, .35);
      }

      .postx-brand-name {
        font-size: 20px;
        font-weight: 900;
        letter-spacing: -.4px;
      }

      .postx-brand-sub {
        font-size: 10px;
        color: #94a3b8;
        margin-top: 2px;
      }

      .postx-nav {
        display: grid;
        gap: 6px;
      }

      .postx-nav-btn {
        border: 0;
        background: transparent;
        color: #cbd5e1;
        width: 100%;
        padding: 12px 13px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        text-align: left;
        transition: .18s ease;
      }

      .postx-nav-btn:hover {
        background: rgba(255,255,255,.08);
        color: white;
      }

      .postx-nav-btn.active {
        background: linear-gradient(
          135deg,
          rgba(99,91,255,.95),
          rgba(99,91,255,.72)
        );
        color: white;
        box-shadow: 0 8px 22px rgba(99,91,255,.25);
      }

      .postx-nav-icon {
        width: 24px;
        text-align: center;
        font-weight: 800;
        font-size: 17px;
      }

      .postx-sidebar-footer {
        margin-top: auto;
        padding: 18px 10px 4px;
        color: #94a3b8;
        font-size: 11px;
        line-height: 1.5;
      }

      .postx-main {
        margin-left: 250px;
        width: calc(100% - 250px);
        min-height: 100vh;
      }

      .postx-mobile-header {
        display: none;
      }

      .postx-page {
        max-width: 1280px;
        margin: 0 auto;
        padding: 30px;
      }

      .postx-page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 26px;
      }

      .postx-page-title {
        margin: 0;
        font-size: clamp(25px, 4vw, 34px);
        letter-spacing: -.8px;
      }

      .postx-page-subtitle {
        margin: 7px 0 0;
        color: var(--postx-muted);
        font-size: 14px;
      }

      .postx-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .postx-btn {
        border: 0;
        border-radius: 12px;
        padding: 11px 16px;
        font-weight: 750;
        transition: transform .15s ease, box-shadow .15s ease;
      }

      .postx-btn:hover {
        transform: translateY(-1px);
      }

      .postx-btn-primary {
        color: white;
        background: var(--postx-primary);
        box-shadow: 0 8px 18px rgba(99,91,255,.22);
      }

      .postx-btn-primary:hover {
        background: var(--postx-primary-dark);
      }

      .postx-btn-secondary {
        background: white;
        color: var(--postx-text);
        border: 1px solid var(--postx-border);
      }

      .postx-btn-danger {
        background: #fee2e2;
        color: #991b1b;
      }

      .postx-btn-success {
        background: #dcfce7;
        color: #166534;
      }

      .postx-btn-small {
        padding: 8px 11px;
        font-size: 12px;
      }

      .postx-card {
        background: var(--postx-surface);
        border: 1px solid var(--postx-border);
        border-radius: var(--postx-radius);
        box-shadow: var(--postx-shadow);
      }

      .postx-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }

      .postx-stat {
        padding: 20px;
      }

      .postx-stat-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .postx-stat-label {
        color: var(--postx-muted);
        font-size: 13px;
        font-weight: 650;
      }

      .postx-stat-icon {
        width: 38px;
        height: 38px;
        border-radius: 11px;
        display: grid;
        place-items: center;
        background: #eef2ff;
        color: var(--postx-primary);
        font-weight: 900;
      }

      .postx-stat-value {
        font-size: 29px;
        font-weight: 900;
        margin-top: 12px;
        letter-spacing: -.8px;
      }

      .postx-dashboard-grid {
        display: grid;
        grid-template-columns: 1.4fr .8fr;
        gap: 20px;
      }

      .postx-section-card {
        padding: 21px;
      }

      .postx-section-title {
        font-size: 17px;
        font-weight: 850;
        margin: 0;
      }

      .postx-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        margin-bottom: 18px;
      }

      .postx-empty {
        padding: 35px 18px;
        text-align: center;
        color: var(--postx-muted);
      }

      .postx-empty-icon {
        font-size: 35px;
        margin-bottom: 9px;
      }

      .postx-empty-title {
        color: var(--postx-text);
        font-weight: 800;
        margin-bottom: 5px;
      }

      .postx-list {
        display: grid;
        gap: 12px;
      }

      .postx-list-item {
        display: flex;
        align-items: center;
        gap: 13px;
        padding: 13px;
        border: 1px solid var(--postx-border);
        border-radius: 13px;
        background: #fff;
      }

      .postx-list-thumb {
        width: 58px;
        height: 58px;
        border-radius: 11px;
        overflow: hidden;
        background: #eef2f7;
        flex: 0 0 auto;
      }

      .postx-list-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .postx-list-body {
        min-width: 0;
        flex: 1;
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

      .postx-list-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .postx-status {
        display: inline-flex;
        align-items: center;
        padding: 5px 8px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 850;
        text-transform: uppercase;
        letter-spacing: .35px;
      }

      .postx-status-draft {
        background: #f1f5f9;
        color: #475569;
      }

      .postx-status-scheduled {
        background: #fef3c7;
        color: #92400e;
      }

      .postx-status-published {
        background: #dcfce7;
        color: #166534;
      }

      .postx-platforms {
        display: flex;
        gap: 5px;
      }

      .postx-platform-badge {
        width: 24px;
        height: 24px;
        border-radius: 8px;
        background: var(--platform-color);
        color: white;
        display: grid;
        place-items: center;
        font-size: 12px;
        font-weight: 900;
      }

      .postx-composer-layout {
        display: grid;
        grid-template-columns: 1.1fr .9fr;
        gap: 20px;
      }

      .postx-composer {
        padding: 23px;
      }

      .postx-field {
        margin-bottom: 18px;
      }

      .postx-label {
        display: block;
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 8px;
      }

      .postx-input,
      .postx-textarea,
      .postx-select {
        width: 100%;
        border: 1px solid var(--postx-border);
        border-radius: 12px;
        padding: 12px 13px;
        background: white;
        color: var(--postx-text);
        outline: none;
        transition: border-color .15s, box-shadow .15s;
      }

      .postx-input:focus,
      .postx-textarea:focus,
      .postx-select:focus {
        border-color: var(--postx-primary);
        box-shadow: 0 0 0 3px rgba(99,91,255,.10);
      }

      .postx-textarea {
        min-height: 170px;
        resize: vertical;
        line-height: 1.55;
      }

      .postx-character-count {
        text-align: right;
        color: var(--postx-muted);
        font-size: 11px;
        margin-top: 5px;
      }

      .postx-platform-selector {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .postx-platform-option {
        position: relative;
      }

      .postx-platform-option input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .postx-platform-label {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        border: 1px solid var(--postx-border);
        border-radius: 12px;
        cursor: pointer;
        background: white;
      }

      .postx-platform-option input:checked + .postx-platform-label {
        border-color: var(--postx-primary);
        background: #f5f3ff;
        box-shadow: 0 0 0 2px rgba(99,91,255,.08);
      }

      .postx-platform-logo {
        width: 31px;
        height: 31px;
        border-radius: 9px;
        color: white;
        display: grid;
        place-items: center;
        font-weight: 900;
      }

      .postx-upload {
        border: 2px dashed #d1d5db;
        border-radius: 14px;
        padding: 28px 16px;
        text-align: center;
        background: #fafafa;
        cursor: pointer;
        transition: .18s;
      }

      .postx-upload:hover {
        border-color: var(--postx-primary);
        background: #f8f7ff;
      }

      .postx-upload-icon {
        font-size: 34px;
        margin-bottom: 7px;
      }

      .postx-upload-title {
        font-weight: 800;
      }

      .postx-upload-text {
        color: var(--postx-muted);
        font-size: 12px;
        margin-top: 5px;
      }

      .postx-preview {
        padding: 23px;
      }

      .postx-preview-phone {
        max-width: 360px;
        margin: 0 auto;
        border: 1px solid #dbe1e9;
        border-radius: 22px;
        overflow: hidden;
        background: white;
        box-shadow: 0 14px 40px rgba(15,23,42,.10);
      }

      .postx-preview-header {
        padding: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        border-bottom: 1px solid #eef1f5;
      }

      .postx-avatar {
        width: 35px;
        height: 35px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg,#635bff,#ec4899);
        color: white;
        font-size: 13px;
        font-weight: 900;
      }

      .postx-preview-account {
        font-size: 13px;
        font-weight: 800;
      }

      .postx-preview-account small {
        display: block;
        color: #9ca3af;
        font-weight: 500;
        margin-top: 2px;
      }

      .postx-preview-image {
        width: 100%;
        aspect-ratio: 1 / 1;
        background: #f1f5f9;
        display: grid;
        place-items: center;
        color: #94a3b8;
        overflow: hidden;
      }

      .postx-preview-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .postx-preview-content {
        padding: 14px;
      }

      .postx-preview-caption {
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 13px;
        line-height: 1.5;
      }

      .postx-preview-actions {
        display: flex;
        gap: 15px;
        padding: 0 14px 13px;
        color: #475569;
        font-size: 19px;
      }

      .postx-form-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 9px;
        margin-top: 8px;
      }

      .postx-table-wrap {
        overflow-x: auto;
      }

      .postx-table {
        width: 100%;
        border-collapse: collapse;
      }

      .postx-table th,
      .postx-table td {
        padding: 13px 11px;
        border-bottom: 1px solid var(--postx-border);
        text-align: left;
        vertical-align: middle;
        font-size: 13px;
      }

      .postx-table th {
        color: var(--postx-muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .4px;
      }

      .postx-calendar {
        padding: 20px;
      }

      .postx-calendar-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .postx-calendar-title {
        font-size: 19px;
        font-weight: 850;
      }

      .postx-calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        border-top: 1px solid var(--postx-border);
        border-left: 1px solid var(--postx-border);
      }

      .postx-calendar-day-name {
        padding: 9px 7px;
        font-size: 10px;
        font-weight: 850;
        color: var(--postx-muted);
        text-transform: uppercase;
        border-right: 1px solid var(--postx-border);
        border-bottom: 1px solid var(--postx-border);
      }

      .postx-calendar-cell {
        min-height: 105px;
        padding: 8px;
        border-right: 1px solid var(--postx-border);
        border-bottom: 1px solid var(--postx-border);
        background: white;
      }

      .postx-calendar-cell.muted {
        background: #f8fafc;
        color: #cbd5e1;
      }

      .postx-calendar-number {
        font-size: 11px;
        font-weight: 800;
        margin-bottom: 6px;
      }

      .postx-calendar-number.today {
        display: inline-grid;
        place-items: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        color: white;
        background: var(--postx-primary);
      }

      .postx-calendar-event {
        font-size: 10px;
        padding: 5px 6px;
        margin-top: 4px;
        border-radius: 6px;
        background: #f0edff;
        color: #5146a8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .postx-toast-container {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 10000;
        display: grid;
        gap: 9px;
        width: min(360px, calc(100vw - 36px));
      }

      .postx-toast {
        padding: 13px 15px;
        border-radius: 12px;
        color: white;
        background: #111827;
        box-shadow: 0 12px 30px rgba(0,0,0,.20);
        animation: postxToastIn .2s ease;
        font-size: 13px;
        font-weight: 650;
      }

      .postx-toast.success {
        background: #166534;
      }

      .postx-toast.error {
        background: #991b1b;
      }

      .postx-toast.warning {
        background: #92400e;
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

      .postx-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15,23,42,.55);
        display: none;
        z-index: 90;
      }

      .postx-overlay.show {
        display: block;
      }

      .postx-hidden {
        display: none !important;
      }

      @media (max-width: 1050px) {
        .postx-stats {
          grid-template-columns: repeat(2, 1fr);
        }

        .postx-dashboard-grid,
        .postx-composer-layout {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {
        .postx-sidebar {
          transform: translateX(-100%);
          transition: transform .22s ease;
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
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          background: white;
          border-bottom: 1px solid var(--postx-border);
          position: sticky;
          top: 0;
          z-index: 70;
        }

        .postx-mobile-brand {
          font-size: 18px;
          font-weight: 900;
        }

        .postx-menu-btn {
          width: 40px;
          height: 40px;
          border: 1px solid var(--postx-border);
          border-radius: 10px;
          background: white;
          font-size: 20px;
        }

        .postx-page {
          padding: 20px 14px 30px;
        }

        .postx-page-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .postx-stats {
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .postx-stat {
          padding: 15px;
        }

        .postx-stat-value {
          font-size: 24px;
        }

        .postx-calendar-cell {
          min-height: 76px;
          padding: 5px;
        }

        .postx-calendar-event {
          font-size: 8px;
        }

        .postx-calendar-day-name {
          font-size: 8px;
          padding: 7px 3px;
        }

        .postx-list-item {
          align-items: flex-start;
        }

        .postx-list-actions {
          flex-direction: column;
        }

        .postx-list-actions .postx-btn {
          width: 100%;
        }
      }

      @media (max-width: 480px) {
        .postx-stats {
          grid-template-columns: 1fr;
        }

        .postx-platform-selector {
          grid-template-columns: 1fr;
        }

        .postx-form-actions {
          justify-content: stretch;
        }

        .postx-form-actions .postx-btn {
          flex: 1;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =====================================================
     9. APPLICATION SHELL
  ===================================================== */

  function renderShell(root) {
    root.innerHTML = `
      <div class="postx-shell">

        <aside
          class="postx-sidebar"
          id="postxSidebar"
          aria-label="PostX navigation"
        >
          <div class="postx-brand">
            <div class="postx-brand-mark">P</div>

            <div>
              <div class="postx-brand-name">PostX</div>
              <div class="postx-brand-sub">
                Smart Social Publisher
              </div>
            </div>
          </div>

          <nav class="postx-nav">
            ${NAV_ITEMS.map(item => `
              <button
                type="button"
                class="postx-nav-btn ${
                  state.activePage === item.id ? "active" : ""
                }"
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

          <div class="postx-sidebar-footer">
            <strong>PostX</strong> v${APP.version}<br>
            Frontend mode • Local storage
          </div>
        </aside>

        <div
          class="postx-overlay"
          id="postxOverlay"
        ></div>

        <main class="postx-main">

          <header class="postx-mobile-header">
            <div class="postx-mobile-brand">
              PostX
            </div>

            <button
              type="button"
              class="postx-menu-btn"
              id="postxMenuButton"
              aria-label="Open menu"
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
        aria-live="polite"
      ></div>
    `;

    bindShellEvents();
  }

  function bindShellEvents() {
    document
      .querySelectorAll("[data-postx-nav]")
      .forEach(button => {
        button.addEventListener("click", () => {
          navigate(button.dataset.postxNav);
        });
      });

    const menuButton =
      document.getElementById("postxMenuButton");

    if (menuButton) {
      menuButton.addEventListener("click", toggleSidebar);
    }

    const overlay =
      document.getElementById("postxOverlay");

    if (overlay) {
      overlay.addEventListener("click", closeSidebar);
    }
  }

  /* =====================================================
     10. NAVIGATION
  ===================================================== */

  function navigate(page) {
    const valid = NAV_ITEMS.some(item => item.id === page);

    if (!valid) {
      page = "dashboard";
    }

    state.activePage = page;
    state.editingPostId = null;

    saveState();

    render();

    closeSidebar();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function toggleSidebar() {
    const sidebar =
      document.getElementById("postxSidebar");

    const overlay =
      document.getElementById("postxOverlay");

    if (!sidebar || !overlay) return;

    sidebar.classList.toggle("open");
    overlay.classList.toggle(
      "show",
      sidebar.classList.contains("open")
    );
  }

  function closeSidebar() {
    const sidebar =
      document.getElementById("postxSidebar");

    const overlay =
      document.getElementById("postxOverlay");

    if (sidebar) {
      sidebar.classList.remove("open");
    }

    if (overlay) {
      overlay.classList.remove("show");
    }
  }

  /* =====================================================
     11. MAIN RENDER
  ===================================================== */

  function render() {
    const container =
      document.getElementById("postxPageContainer");

    if (!container) return;

    updateNavigationState();

    switch (state.activePage) {
      case "create":
        renderCreate(container);
        break;

      case "scheduled":
        renderScheduled(container);
        break;

      case "drafts":
        renderDrafts(container);
        break;

      case "published":
        renderPublished(container);
        break;

      case "calendar":
        renderCalendar(container);
        break;

      case "dashboard":
      default:
        renderDashboard(container);
        break;
    }
  }

  function updateNavigationState() {
    document
      .querySelectorAll("[data-postx-nav]")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.postxNav === state.activePage
        );
      });
  }

  /* =====================================================
     12. DASHBOARD
  ===================================================== */

  function renderDashboard(container) {
    const posts = state.posts;

    const total = posts.length;

    const drafts = posts.filter(
      post => post.status === "draft"
    ).length;

    const scheduled = posts.filter(
      post => post.status === "scheduled"
    ).length;

    const published = posts.filter(
      post => post.status === "published"
    ).length;

    const recent = [...posts]
      .sort((a, b) => {
        return new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt);
      })
      .slice(0, 6);

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">
          <div>
            <h1 class="postx-page-title">
              Dashboard
            </h1>

            <p class="postx-page-subtitle">
              Manage your social media content from one place.
            </p>
          </div>

          <div class="postx-actions">
            <button
              type="button"
              class="postx-btn postx-btn-primary"
              data-postx-action="new-post"
            >
              + Create Post
            </button>
          </div>
        </div>

        <section class="postx-stats">

          ${statCard(
            "Total Posts",
            total,
            "▤"
          )}

          ${statCard(
            "Scheduled",
            scheduled,
            "◷"
          )}

          ${statCard(
            "Drafts",
            drafts,
            "✎"
          )}

          ${statCard(
            "Published",
            published,
            "✓"
          )}

        </section>

        <section class="postx-dashboard-grid">

          <div class="postx-card postx-section-card">

            <div class="postx-section-head">
              <h2 class="postx-section-title">
                Recent Posts
              </h2>

              <button
                type="button"
                class="postx-btn postx-btn-secondary postx-btn-small"
                data-postx-action="view-published"
              >
                View All
              </button>
            </div>

            ${
              recent.length
                ? `
                  <div class="postx-list">
                    ${recent.map(renderListItem).join("")}
                  </div>
                `
                : emptyState(
                    "▤",
                    "No posts yet",
                    "Create your first social media post to get started."
                  )
            }

          </div>

          <div class="postx-card postx-section-card">

            <div class="postx-section-head">
              <h2 class="postx-section-title">
                Quick Actions
              </h2>
            </div>

            <div class="postx-list">

              <button
                type="button"
                class="postx-list-item"
                data-postx-action="new-post"
                style="text-align:left;border:1px solid var(--postx-border);cursor:pointer;"
              >
                <div class="postx-stat-icon">+</div>

                <div class="postx-list-body">
                  <div class="postx-list-title">
                    Create a Post
                  </div>

                  <div class="postx-list-meta">
                    Write, preview and schedule content.
                  </div>
                </div>
              </button>

              <button
                type="button"
                class="postx-list-item"
                data-postx-action="view-scheduled"
                style="text-align:left;border:1px solid var(--postx-border);cursor:pointer;"
              >
                <div class="postx-stat-icon">◷</div>

                <div class="postx-list-body">
                  <div class="postx-list-title">
                    Scheduled Posts
                  </div>

                  <div class="postx-list-meta">
                    Manage upcoming publications.
                  </div>
                </div>
              </button>

              <button
                type="button"
                class="postx-list-item"
                data-postx-action="view-calendar"
                style="text-align:left;border:1px solid var(--postx-border);cursor:pointer;"
              >
                <div class="postx-stat-icon">▦</div>

                <div class="postx-list-body">
                  <div class="postx-list-title">
                    Content Calendar
                  </div>

                  <div class="postx-list-meta">
                    View your posting schedule.
                  </div>
                </div>
              </button>

            </div>

          </div>

        </section>

      </div>
    `;

    bindCommonActions(container);
  }

  function statCard(label, value, icon) {
    return `
      <div class="postx-card postx-stat">
        <div class="postx-stat-top">

          <div class="postx-stat-label">
            ${escapeHTML(label)}
          </div>

          <div class="postx-stat-icon">
            ${escapeHTML(icon)}
          </div>

        </div>

        <div class="postx-stat-value">
          ${escapeHTML(value)}
        </div>
      </div>
    `;
  }

  function emptyState(icon, title, text) {
    return `
      <div class="postx-empty">
        <div class="postx-empty-icon">
          ${escapeHTML(icon)}
        </div>

        <div class="postx-empty-title">
          ${escapeHTML(title)}
        </div>

        <div>
          ${escapeHTML(text)}
        </div>
      </div>
    `;
  }

  /* =====================================================
     13. CREATE POST
  ===================================================== */

  function renderCreate(container) {
    const editing = state.editingPostId
      ? getPostById(state.editingPostId)
      : null;

    const post = editing || {
      caption: "",
      hashtags: "",
      platforms: ["facebook", "instagram"],
      imageData: "",
      scheduleDate: getDateInputValue(
        new Date(Date.now() + 60 * 60 * 1000)
      ),
      scheduleTime: getTimeInputValue(
        new Date(Date.now() + 60 * 60 * 1000)
      )
    };

    const platforms =
      Array.isArray(post.platforms) && post.platforms.length
        ? post.platforms
        : ["facebook", "instagram"];

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">
          <div>
            <h1 class="postx-page-title">
              ${editing ? "Edit Post" : "Create Post"}
            </h1>

            <p class="postx-page-subtitle">
              Create content once and prepare it for multiple platforms.
            </p>
          </div>
        </div>

        <div class="postx-composer-layout">

          <section class="postx-card postx-composer">

            <form
              id="postxComposerForm"
              novalidate
            >

              <div class="postx-field">

                <label class="postx-label">
                  Platforms
                </label>

                <div class="postx-platform-selector">

                  ${platformOption(
                    "facebook",
                    platforms.includes("facebook")
                  )}

                  ${platformOption(
                    "instagram",
                    platforms.includes("instagram")
                  )}

                </div>

              </div>

              <div class="postx-field">

                <label class="postx-label">
                  Caption
                </label>

                <textarea
                  id="postxCaption"
                  class="postx-textarea"
                  maxlength="5000"
                  placeholder="What do you want to share?"
                >${escapeHTML(post.caption || "")}</textarea>

                <div
                  class="postx-character-count"
                  id="postxCaptionCount"
                >
                  ${(post.caption || "").length} / 5000
                </div>

              </div>

              <div class="postx-field">

                <label class="postx-label">
                  Hashtags
                </label>

                <input
                  type="text"
                  id="postxHashtags"
                  class="postx-input"
                  placeholder="#marketing #business #postx"
                  value="${escapeHTML(post.hashtags || "")}"
                >

              </div>

              <div class="postx-field">

                <label class="postx-label">
                  Image
                </label>

                <input
                  type="file"
                  id="postxImageInput"
                  accept="image/*"
                  class="postx-hidden"
                >

                <label
                  for="postxImageInput"
                  class="postx-upload"
                >
                  <div class="postx-upload-icon">
                    🖼
                  </div>

                  <div class="postx-upload-title">
                    Choose an image
                  </div>

                  <div class="postx-upload-text">
                    JPG, PNG or WEBP
                  </div>
                </label>

                <input
                  type="hidden"
                  id="postxImageData"
                  value="${escapeHTML(post.imageData || "")}"
                >

              </div>

              <div class="postx-field">

                <label class="postx-label">
                  Schedule
                </label>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">

                  <input
                    type="date"
                    id="postxScheduleDate"
                    class="postx-input"
                    value="${escapeHTML(post.scheduleDate || "")}"
                  >

                  <input
                    type="time"
                    id="postxScheduleTime"
                    class="postx-input"
                    value="${escapeHTML(post.scheduleTime || "")}"
                  >

                </div>

              </div>

              <div class="postx-form-actions">

                <button
                  type="button"
                  class="postx-btn postx-btn-secondary"
                  data-postx-action="cancel-composer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  class="postx-btn postx-btn-secondary"
                  id="postxSaveDraft"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  class="postx-btn postx-btn-primary"
                  id="postxSchedulePost"
                >
                  Schedule
                </button>

                <button
                  type="button"
                  class="postx-btn postx-btn-success"
                  id="postxPublishPost"
                >
                  Publish Now
                </button>

              </div>

            </form>

          </section>

          <section class="postx-card postx-preview">

            <div class="postx-section-head">
              <h2 class="postx-section-title">
                Live Preview
              </h2>
            </div>

            <div class="postx-preview-phone">

              <div class="postx-preview-header">

                <div class="postx-avatar">
                  P
                </div>

                <div class="postx-preview-account">
                  PostX
                  <small>
                    Social Media Post
                  </small>
                </div>

              </div>

              <div
                class="postx-preview-image"
                id="postxPreviewImage"
              >
                ${
                  post.imageData
                    ? `<img src="${escapeHTML(post.imageData)}" alt="Post preview">`
                    : "Image preview"
                }
              </div>

              <div class="postx-preview-content">

                <div
                  class="postx-preview-caption"
                  id="postxPreviewCaption"
                >
                  ${escapeHTML(
                    buildFullCaption(
                      post.caption || "",
                      post.hashtags || ""
                    ) || "Your caption will appear here."
                  )}
                </div>

              </div>

              <div class="postx-preview-actions">
                <span>♡</span>
                <span>◯</span>
                <span>⌁</span>
                <span style="margin-left:auto;">⌑</span>
              </div>

            </div>

          </section>

        </div>

      </div>
    `;

    bindComposer(editing);
  }

  function platformOption(id, checked) {
    const data = PLATFORM[id];

    return `
      <div class="postx-platform-option">

        <input
          type="checkbox"
          id="postxPlatform_${id}"
          name="postxPlatform"
          value="${escapeHTML(id)}"
          ${checked ? "checked" : ""}
        >

        <label
          class="postx-platform-label"
          for="postxPlatform_${id}"
        >

          <span
            class="postx-platform-logo"
            style="background:${data.color}"
          >
            ${escapeHTML(data.icon)}
          </span>

          <span>
            ${escapeHTML(data.name)}
          </span>

        </label>

      </div>
    `;
  }

  function buildFullCaption(caption, hashtags) {
    const normalized = normalizeHashtags(hashtags);

    return [caption.trim(), normalized]
      .filter(Boolean)
      .join("\n\n");
  }

  function getComposerData() {
    const captionElement =
      document.getElementById("postxCaption");

    const hashtagsElement =
      document.getElementById("postxHashtags");

    const imageElement =
      document.getElementById("postxImageData");

    const dateElement =
      document.getElementById("postxScheduleDate");

    const timeElement =
      document.getElementById("postxScheduleTime");

    const platforms = [
      ...document.querySelectorAll(
        'input[name="postxPlatform"]:checked'
      )
    ].map(input => input.value);

    return {
      caption: captionElement
        ? captionElement.value.trim()
        : "",

      hashtags: hashtagsElement
        ? hashtagsElement.value.trim()
        : "",

      imageData: imageElement
        ? imageElement.value
        : "",

      scheduleDate: dateElement
        ? dateElement.value
        : "",

      scheduleTime: timeElement
        ? timeElement.value
        : "",

      platforms
    };
  }

  function validateComposer(data, requireSchedule = false) {
    if (!data.platforms.length) {
      showToast(
        "Select at least one platform.",
        "warning"
      );

      return false;
    }

    if (!data.caption && !data.imageData) {
      showToast(
        "Add a caption or an image before continuing.",
        "warning"
      );

      return false;
    }

    if (requireSchedule) {
      const scheduledAt = combineDateTime(
        data.scheduleDate,
        data.scheduleTime
      );

      if (!scheduledAt) {
        showToast(
          "Choose a valid schedule date and time.",
          "warning"
        );

        return false;
      }

      if (
        new Date(scheduledAt).getTime() <= Date.now()
      ) {
        showToast(
          "Scheduled time must be in the future.",
          "warning"
        );

        return false;
      }
    }

    return true;
  }

  function bindComposer(editing) {
    const caption =
      document.getElementById("postxCaption");

    const hashtags =
      document.getElementById("postxHashtags");

    const imageInput =
      document.getElementById("postxImageInput");

    const imageData =
      document.getElementById("postxImageData");

    const previewCaption =
      document.getElementById("postxPreviewCaption");

    const previewImage =
      document.getElementById("postxPreviewImage");

    const count =
      document.getElementById("postxCaptionCount");

    function updatePreview() {
      const text = buildFullCaption(
        caption ? caption.value : "",
        hashtags ? hashtags.value : ""
      );

      if (previewCaption) {
        previewCaption.textContent =
          text || "Your caption will appear here.";
      }

      if (count && caption) {
        count.textContent =
          `${caption.value.length} / 5000`;
      }
    }

    if (caption) {
      caption.addEventListener(
        "input",
        updatePreview
      );
    }

    if (hashtags) {
      hashtags.addEventListener(
        "input",
        updatePreview
      );
    }

    if (imageInput) {
      imageInput.addEventListener(
        "change",
        event => {
          const file =
            event.target.files &&
            event.target.files[0];

          if (!file) return;

          if (!file.type.startsWith("image/")) {
            showToast(
              "Please choose an image file.",
              "error"
            );

            return;
          }

          if (file.size > 8 * 1024 * 1024) {
            showToast(
              "Image is too large. Maximum size is 8 MB.",
              "warning"
            );

            imageInput.value = "";
            return;
          }

          const reader = new FileReader();

          reader.onload = () => {
            const result = reader.result;

            if (imageData) {
              imageData.value = result;
            }

            if (previewImage) {
              previewImage.innerHTML = `
                <img
                  src="${escapeHTML(result)}"
                  alt="Post preview"
                >
              `;
            }

            showToast(
              "Image added to the post.",
              "success"
            );
          };

          reader.readAsDataURL(file);
        }
      );
    }

    const saveDraft =
      document.getElementById("postxSaveDraft");

    if (saveDraft) {
      saveDraft.addEventListener(
        "click",
        () => {
          saveComposerAsDraft(
            editing ? editing.id : null
          );
        }
      );
    }

    const scheduleButton =
      document.getElementById("postxSchedulePost");

    if (scheduleButton) {
      scheduleButton.addEventListener(
        "click",
        () => {
          scheduleComposerPost(
            editing ? editing.id : null
          );
        }
      );
    }

    const publishButton =
      document.getElementById("postxPublishPost");

    if (publishButton) {
      publishButton.addEventListener(
        "click",
        () => {
          publishComposerPost(
            editing ? editing.id : null
          );
        }
      );
    }

    bindCommonActions(containerOrDocument());

    updatePreview();
  }

  function containerOrDocument() {
    return document;
  }

  /* =====================================================
     14. SAVE DRAFT
  ===================================================== */

  function saveComposerAsDraft(existingId = null) {
    const data = getComposerData();

    if (!data.platforms.length) {
      showToast(
        "Select at least one platform.",
        "warning"
      );

      return;
    }

    if (!data.caption && !data.imageData) {
      showToast(
        "Add a caption or image to save a useful draft.",
        "warning"
      );

      return;
    }

    const now = new Date().toISOString();

    if (existingId) {
      const post = getPostById(existingId);

      if (!post) {
        showToast(
          "The draft could not be found.",
          "error"
        );

        return;
      }

      Object.assign(post, {
        ...data,
        hashtags: normalizeHashtags(data.hashtags),
        status: "draft",
        updatedAt: now
      });

      showToast(
        "Draft updated successfully.",
        "success"
      );
    } else {
      state.posts.unshift({
        id: uid(),
        ...data,
        hashtags: normalizeHashtags(data.hashtags),
        status: "draft",
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        scheduledAt: null
      });

      showToast(
        "Draft saved successfully.",
        "success"
      );
    }

    saveState();

    state.editingPostId = null;

    navigate("drafts");
  }

  /* =====================================================
     15. SCHEDULE POST
  ===================================================== */

  function scheduleComposerPost(existingId = null) {
    const data = getComposerData();

    if (!validateComposer(data, true)) {
      return;
    }

    const scheduledAt = combineDateTime(
      data.scheduleDate,
      data.scheduleTime
    );

    const now = new Date().toISOString();

    if (existingId) {
      const post = getPostById(existingId);

      if (!post) {
        showToast(
          "The post could not be found.",
          "error"
        );

        return;
      }

      Object.assign(post, {
        ...data,
        hashtags: normalizeHashtags(data.hashtags),
        status: "scheduled",
        scheduledAt,
        updatedAt: now
      });

      showToast(
        "Post rescheduled successfully.",
        "success"
      );
    } else {
      state.posts.unshift({
        id: uid(),
        ...data,
        hashtags: normalizeHashtags(data.hashtags),
        status: "scheduled",
        scheduledAt,
        createdAt: now,
        updatedAt: now,
        publishedAt: null
      });

      showToast(
        "Post scheduled successfully.",
        "success"
      );
    }

    saveState();

    state.editingPostId = null;

    navigate("scheduled");
  }

  /* =====================================================
     16. PUBLISH NOW
  ===================================================== */

  function publishComposerPost(existingId = null) {
    const data = getComposerData();

    if (!validateComposer(data, false)) {
      return;
    }

    const now = new Date().toISOString();

    if (existingId) {
      const post = getPostById(existingId);

      if (!post) {
        showToast(
          "The post could not be found.",
          "error"
        );

        return;
      }

      Object.assign(post, {
        ...data,
        hashtags: normalizeHashtags(data.hashtags),
        status: "published",
        publishedAt: now,
        scheduledAt: null,
        updatedAt: now
      });

      showToast(
        "Post published successfully in frontend demo mode.",
        "success"
      );
    } else {
      state.posts.unshift({
        id: uid(),
        ...data,
        hashtags: normalizeHashtags(data.hashtags),
        status: "published",
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        scheduledAt: null
      });

      showToast(
        "Post published successfully in frontend demo mode.",
        "success"
      );
    }

    saveState();

    state.editingPostId = null;

    navigate("published");
  }

  /* =====================================================
     17. SCHEDULED PAGE
  ===================================================== */

  function renderScheduled(container) {
    const posts = state.posts
      .filter(post => post.status === "scheduled")
      .sort(
        (a, b) =>
          new Date(a.scheduledAt) -
          new Date(b.scheduledAt)
      );

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">
          <div>
            <h1 class="postx-page-title">
              Scheduled Posts
            </h1>

            <p class="postx-page-subtitle">
              Manage your upcoming social media publications.
            </p>
          </div>

          <button
            type="button"
            class="postx-btn postx-btn-primary"
            data-postx-action="new-post"
          >
            + Schedule Post
          </button>
        </div>

        <section class="postx-card postx-section-card">

          ${
            posts.length
              ? `
                <div class="postx-list">
                  ${posts.map(renderListItem).join("")}
                </div>
              `
              : emptyState(
                  "◷",
                  "Nothing scheduled",
                  "Your upcoming posts will appear here."
                )
          }

        </section>

      </div>
    `;

    bindCommonActions(container);
  }

  /* =====================================================
     18. DRAFTS PAGE
  ===================================================== */

  function renderDrafts(container) {
    const posts = state.posts
      .filter(post => post.status === "draft")
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt)
      );

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">
          <div>
            <h1 class="postx-page-title">
              Drafts
            </h1>

            <p class="postx-page-subtitle">
              Continue working on unfinished content.
            </p>
          </div>

          <button
            type="button"
            class="postx-btn postx-btn-primary"
            data-postx-action="new-post"
          >
            + New Draft
          </button>
        </div>

        <section class="postx-card postx-section-card">

          ${
            posts.length
              ? `
                <div class="postx-list">
                  ${posts.map(renderListItem).join("")}
                </div>
              `
              : emptyState(
                  "✎",
                  "No drafts",
                  "Saved drafts will appear here."
                )
          }

        </section>

      </div>
    `;

    bindCommonActions(container);
  }

  /* =====================================================
     19. PUBLISHED PAGE
  ===================================================== */

  function renderPublished(container) {
    const posts = state.posts
      .filter(post => post.status === "published")
      .sort(
        (a, b) =>
          new Date(b.publishedAt || b.updatedAt) -
          new Date(a.publishedAt || a.updatedAt)
      );

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">
          <div>
            <h1 class="postx-page-title">
              Published
            </h1>

            <p class="postx-page-subtitle">
              Your published content history.
            </p>
          </div>

          <button
            type="button"
            class="postx-btn postx-btn-primary"
            data-postx-action="new-post"
          >
            + New Post
          </button>
        </div>

        <section class="postx-card postx-section-card">

          ${
            posts.length
              ? `
                <div class="postx-list">
                  ${posts.map(renderListItem).join("")}
                </div>
              `
              : emptyState(
                  "✓",
                  "No published posts",
                  "Published posts will appear here."
                )
          }

        </section>

      </div>
    `;

    bindCommonActions(container);
  }

  /* =====================================================
     20. LIST ITEM
  ===================================================== */

  function renderListItem(post) {
    const title =
      post.caption ||
      "Untitled post";

    const date =
      post.status === "scheduled"
        ? `Scheduled: ${formatDateTime(post.scheduledAt)}`
        : post.status === "published"
          ? `Published: ${formatDateTime(post.publishedAt)}`
          : `Updated: ${formatRelative(post.updatedAt)}`;

    return `
      <article class="postx-list-item">

        <div class="postx-list-thumb">

          ${
            post.imageData
              ? `
                <img
                  src="${escapeHTML(post.imageData)}"
                  alt=""
                >
              `
              : `
                <div
                  style="
                    width:100%;
                    height:100%;
                    display:grid;
                    place-items:center;
                    color:#94a3b8;
                    font-size:20px;
                  "
                >
                  P
                </div>
              `
          }

        </div>

        <div class="postx-list-body">

          <div class="postx-list-title">
            ${escapeHTML(truncate(title, 85))}
          </div>

          <div class="postx-list-meta">
            ${escapeHTML(date)}
          </div>

          <div
            style="
              display:flex;
              align-items:center;
              gap:8px;
              margin-top:7px;
              flex-wrap:wrap;
            "
          >

            <span class="postx-status ${getStatusClass(post.status)}">
              ${escapeHTML(getStatusLabel(post.status))}
            </span>

            <div class="postx-platforms">
              ${platformBadges(postPlatforms(post))}
            </div>

          </div>

        </div>

        <div class="postx-list-actions">

          ${
            post.status !== "published"
              ? `
                <button
                  type="button"
                  class="postx-btn postx-btn-secondary postx-btn-small"
                  data-postx-edit="${escapeHTML(post.id)}"
                >
                  Edit
                </button>
              `
              : ""
          }

          ${
            post.status === "draft"
              ? `
                <button
                  type="button"
                  class="postx-btn postx-btn-success postx-btn-small"
                  data-postx-publish="${escapeHTML(post.id)}"
                >
                  Publish
                </button>
              `
              : ""
          }

          ${
            post.status === "scheduled"
              ? `
                <button
                  type="button"
                  class="postx-btn postx-btn-success postx-btn-small"
                  data-postx-publish="${escapeHTML(post.id)}"
                >
                  Publish
                </button>
              `
              : ""
          }

          <button
            type="button"
            class="postx-btn postx-btn-danger postx-btn-small"
            data-postx-delete="${escapeHTML(post.id)}"
          >
            Delete
          </button>

        </div>

      </article>
    `;
  }

  /* =====================================================
     21. CALENDAR
  ===================================================== */

  let calendarDate = new Date();

  function renderCalendar(container) {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(
      year,
      month,
      1
    );

    const lastDay = new Date(
      year,
      month + 1,
      0
    );

    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const previousLastDay = new Date(
      year,
      month,
      0
    ).getDate();

    const cells = [];

    for (let i = 0; i < 42; i++) {
      let day;
      let cellDate;
      let muted = false;

      if (i < startWeekday) {
        day =
          previousLastDay -
          startWeekday +
          i +
          1;

        cellDate = new Date(
          year,
          month - 1,
          day
        );

        muted = true;
      } else if (
        i >= startWeekday + daysInMonth
      ) {
        day =
          i -
          (startWeekday + daysInMonth) +
          1;

        cellDate = new Date(
          year,
          month + 1,
          day
        );

        muted = true;
      } else {
        day =
          i -
          startWeekday +
          1;

        cellDate = new Date(
          year,
          month,
          day
        );
      }

      const dateKey =
        `${cellDate.getFullYear()}-${String(
          cellDate.getMonth() + 1
        ).padStart(2, "0")}-${String(
          cellDate.getDate()
        ).padStart(2, "0")}`;

      const events = state.posts.filter(post => {
        if (post.status !== "scheduled") {
          return false;
        }

        if (!post.scheduledAt) {
          return false;
        }

        const d = new Date(post.scheduledAt);

        const key =
          `${d.getFullYear()}-${String(
            d.getMonth() + 1
          ).padStart(2, "0")}-${String(
            d.getDate()
          ).padStart(2, "0")}`;

        return key === dateKey;
      });

      const today = new Date();

      const isToday =
        today.getFullYear() ===
          cellDate.getFullYear() &&
        today.getMonth() ===
          cellDate.getMonth() &&
        today.getDate() ===
          cellDate.getDate();

      cells.push(`
        <div
          class="postx-calendar-cell ${
            muted ? "muted" : ""
          }"
        >

          <div
            class="postx-calendar-number ${
              isToday ? "today" : ""
            }"
          >
            ${day}
          </div>

          ${
            events
              .slice(0, 3)
              .map(event => `
                <div
                  class="postx-calendar-event"
                  title="${escapeHTML(event.caption || "Scheduled post")}"
                  data-postx-edit="${escapeHTML(event.id)}"
                >
                  ${escapeHTML(
                    truncate(
                      event.caption ||
                        "Scheduled post",
                      25
                    )
                  )}
                </div>
              `)
              .join("")
          }

        </div>
      `);
    }

    container.innerHTML = `
      <div class="postx-page">

        <div class="postx-page-header">

          <div>
            <h1 class="postx-page-title">
              Content Calendar
            </h1>

            <p class="postx-page-subtitle">
              Visualize your scheduled content.
            </p>
          </div>

          <button
            type="button"
            class="postx-btn postx-btn-primary"
            data-postx-action="new-post"
          >
            + New Post
          </button>

        </div>

        <section class="postx-card postx-calendar">

          <div class="postx-calendar-head">

            <button
              type="button"
              class="postx-btn postx-btn-secondary postx-btn-small"
              id="postxPreviousMonth"
            >
              ←
            </button>

            <div class="postx-calendar-title">
              ${escapeHTML(
                calendarDate.toLocaleDateString(
                  undefined,
                  {
                    month: "long",
                    year: "numeric"
                  }
                )
              )}
            </div>

            <button
              type="button"
              class="postx-btn postx-btn-secondary postx-btn-small"
              id="postxNextMonth"
            >
              →
            </button>

          </div>

          <div class="postx-calendar-grid">

            ${[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat"
            ]
              .map(day => `
                <div class="postx-calendar-day-name">
                  ${day}
                </div>
              `)
              .join("")}

            ${cells.join("")}

          </div>

        </section>

      </div>
    `;

    const previous =
      document.getElementById(
        "postxPreviousMonth"
      );

    const next =
      document.getElementById(
        "postxNextMonth"
      );

    if (previous) {
      previous.addEventListener(
        "click",
        () => {
          calendarDate = new Date(
            year,
            month - 1,
            1
          );

          render();
        }
      );
    }

    if (next) {
      next.addEventListener(
        "click",
        () => {
          calendarDate = new Date(
            year,
            month + 1,
            1
          );

          render();
        }
      );
    }

    bindCommonActions(container);
  }

  /* =====================================================
     22. COMMON ACTIONS
  ===================================================== */

  function bindCommonActions(scope) {
    if (!scope) return;

    scope
      .querySelectorAll("[data-postx-action]")
      .forEach(button => {
        if (button.dataset.postxBound === "1") {
          return;
        }

        button.dataset.postxBound = "1";

        button.addEventListener(
          "click",
          () => {
            handleAction(
              button.dataset.postxAction
            );
          }
        );
      });

    scope
      .querySelectorAll("[data-postx-edit]")
      .forEach(element => {
        if (element.dataset.postxEditBound === "1") {
          return;
        }

        element.dataset.postxEditBound = "1";

        element.addEventListener(
          "click",
          event => {
            event.stopPropagation();

            editPost(
              element.dataset.postxEdit
            );
          }
        );
      });

    scope
      .querySelectorAll("[data-postx-delete]")
      .forEach(button => {
        if (button.dataset.postxDeleteBound === "1") {
          return;
        }

        button.dataset.postxDeleteBound = "1";

        button.addEventListener(
          "click",
          () => {
            deletePost(
              button.dataset.postxDelete
            );
          }
        );
      });

    scope
      .querySelectorAll("[data-postx-publish]")
      .forEach(button => {
        if (button.dataset.postxPublishBound === "1") {
          return;
        }

        button.dataset.postxPublishBound = "1";

        button.addEventListener(
          "click",
          () => {
            publishExistingPost(
              button.dataset.postxPublish
            );
          }
        );
      });
  }

  function handleAction(action) {
    switch (action) {
      case "new-post":
        state.editingPostId = null;
        navigate("create");
        break;

      case "view-scheduled":
        navigate("scheduled");
        break;

      case "view-published":
        navigate("published");
        break;

      case "view-calendar":
        navigate("calendar");
        break;

      case "cancel-composer":
        state.editingPostId = null;
        navigate("dashboard");
        break;

      default:
        break;
    }
  }

  /* =====================================================
     23. EDIT POST
  ===================================================== */

  function editPost(id) {
    const post = getPostById(id);

    if (!post) {
      showToast(
        "Post not found.",
        "error"
      );

      return;
    }

    if (post.status === "published") {
      showToast(
        "Published posts cannot be edited in this frontend demo.",
        "warning"
      );

      return;
    }

    state.editingPostId = id;
    state.activePage = "create";

    saveState();

    render();
  }

  /* =====================================================
     24. DELETE POST
  ===================================================== */

  function deletePost(id) {
    const post = getPostById(id);

    if (!post) {
      showToast(
        "Post not found.",
        "error"
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Delete this post permanently?"
      );

    if (!confirmed) {
      return;
    }

    state.posts =
      state.posts.filter(
        item => item.id !== id
      );

    saveState();

    showToast(
      "Post deleted.",
      "success"
    );

    render();
  }

  /* =====================================================
     25. PUBLISH EXISTING POST
  ===================================================== */

  function publishExistingPost(id) {
    const post = getPostById(id);

    if (!post) {
      showToast(
        "Post not found.",
        "error"
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Publish this post now?"
      );

    if (!confirmed) {
      return;
    }

    const now =
      new Date().toISOString();

    post.status = "published";
    post.publishedAt = now;
    post.scheduledAt = null;
    post.updatedAt = now;

    saveState();

    showToast(
      "Post published in frontend demo mode.",
      "success"
    );

    render();
  }

  /* =====================================================
     26. TOAST NOTIFICATIONS
  ===================================================== */

  function showToast(
    message,
    type = "success",
    duration = 3200
  ) {
    const container =
      document.getElementById(
        "postxToastContainer"
      );

    if (!container) {
      return;
    }

    const toast =
      document.createElement("div");

    toast.className =
      `postx-toast ${type}`;

    toast.textContent =
      message;

    container.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform =
        "translateY(8px)";

      window.setTimeout(() => {
        toast.remove();
      }, 200);
    }, duration);
  }

  /* =====================================================
     27. IMAGE DATA CLEANUP
  ===================================================== */

  function cleanupLargeStorage() {
    try {
      const serialized =
        JSON.stringify(state);

      /*
       * localStorage is usually limited to several MB.
       * Warn instead of silently failing.
       */
      if (
        serialized.length >
        4.5 * 1024 * 1024
      ) {
        console.warn(
          "PostX: localStorage is approaching its practical limit."
        );
      }
    } catch (error) {
      console.warn(
        "PostX: storage size check failed.",
        error
      );
    }
  }

  /* =====================================================
     28. SCHEDULE MONITOR
  ===================================================== */

  function processDueScheduledPosts() {
    let changed = false;

    const now =
      Date.now();

    state.posts.forEach(post => {
      if (
        post.status !== "scheduled" ||
        !post.scheduledAt
      ) {
        return;
      }

      const scheduled =
        new Date(post.scheduledAt).getTime();

      if (
        !Number.isNaN(scheduled) &&
        scheduled <= now
      ) {
        /*
         * Frontend-only behavior:
         * when the browser is open and the scheduled time
         * arrives, mark the post as published.
         *
         * Real social posting requires Meta API/backend.
         */
        post.status = "published";
        post.publishedAt =
          new Date().toISOString();
        post.updatedAt =
          new Date().toISOString();
        post.scheduledAt = null;

        changed = true;
      }
    });

    if (changed) {
      saveState();

      if (state.activePage === "scheduled") {
        render();
      }
    }
  }

  /* =====================================================
     29. PWA SERVICE WORKER
  ===================================================== */

  function registerServiceWorker() {
    if (
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    /*
     * Only register when served through HTTP(S).
     * This avoids errors when testing a raw local file.
     */
    if (
      location.protocol !== "http:" &&
      location.protocol !== "https:"
    ) {
      return;
    }

    navigator.serviceWorker
      .register("./sw.js")
      .then(registration => {
        console.log(
          "PostX: service worker registered.",
          registration.scope
        );
      })
      .catch(error => {
        console.warn(
          "PostX: service worker registration failed.",
          error
        );
      });
  }

  /* =====================================================
     30. KEYBOARD SHORTCUTS
  ===================================================== */

  function bindKeyboardShortcuts() {
    document.addEventListener(
      "keydown",
      event => {
        if (
          (event.ctrlKey ||
            event.metaKey) &&
          event.key.toLowerCase() === "n"
        ) {
          event.preventDefault();

          navigate("create");
        }
      }
    );
  }

  /* =====================================================
     31. VISIBILITY HANDLING
  ===================================================== */

  function bindVisibilityHandling() {
    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          processDueScheduledPosts();
        }
      }
    );
  }

  /* =====================================================
     32. ONLINE / OFFLINE STATUS
  ===================================================== */

  function bindNetworkEvents() {
    window.addEventListener(
      "online",
      () => {
        showToast(
          "You are back online.",
          "success"
        );
      }
    );

    window.addEventListener(
      "offline",
      () => {
        showToast(
          "You are offline. Your local drafts remain available.",
          "warning"
        );
      }
    );
  }

  /* =====================================================
     33. GLOBAL EXPORT
  ===================================================== */

  window.PostX = {
    version: APP.version,

    state,

    navigate,

    createPost() {
      navigate("create");
    },

    getPosts() {
      return clone(state.posts);
    },

    save() {
      saveState();
    },

    reset() {
      const confirmed =
        window.confirm(
          "Reset all PostX local data? This cannot be undone."
        );

      if (!confirmed) {
        return;
      }

      state = clone(DEFAULT_STATE);

      saveState();

      render();

      showToast(
        "PostX data reset.",
        "success"
      );
    }
  };

  /* =====================================================
     34. INITIALIZE
  ===================================================== */

  function init() {
    try {
      injectStyles();

      const root =
        ensureRoot();

      renderShell(root);

      render();

      bindKeyboardShortcuts();

      bindVisibilityHandling();

      bindNetworkEvents();

      registerServiceWorker();

      cleanupLargeStorage();

      processDueScheduledPosts();

      /*
       * Check scheduled posts every 30 seconds while
       * the application remains open.
       */
      window.setInterval(
        processDueScheduledPosts,
        30000
      );

      console.log(
        `PostX v${APP.version} initialized successfully.`
      );
    } catch (error) {
      console.error(
        "PostX initialization failed:",
        error
      );

      document.body.innerHTML += `
        <div
          style="
            padding:30px;
            font-family:system-ui;
            color:#991b1b;
          "
        >
          <h2>PostX failed to initialize</h2>
          <p>
            Please refresh the application.
          </p>
        </div>
      `;
    }
  }

  /* =====================================================
     35. DOM READY
  ===================================================== */

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
