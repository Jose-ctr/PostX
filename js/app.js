/* ================= 1. APP CONFIG ================= */
const APP = {
  STORAGE_KEY: 'postx_state_v2',
  LEGACY_KEYS: ['postx_state', 'postx_posts', 'postx_profile'],
  DATE_FORMAT: { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
};

/* ================= 2. PLATFORM CONFIG ================= */
const PLATFORMS = {
  facebook: { id: 'facebook', label: 'Facebook', icon: 'facebook', color: '#1877F2', desc: 'Page & Profile' },
  instagram: { id: 'instagram', label: 'Instagram', icon: 'instagram', color: '#E4405F', desc: '@thinkplustech / @mbuiijayoutlook' },
  x: { id: 'x', label: 'X (Twitter)', icon: 'x-twitter', color: '#000', desc: 'Premium API required' }
};
const PLATFORM_IDS = Object.keys(PLATFORMS);

/* ================= 3. DEFAULT STATE ================= */
const DEFAULT_STATE = {
  posts: [],
  activePage: 'dashboard',
  editingPostId: null,
  connectedAccounts: { facebook: false, instagram: false, x: false },
  profile: { name: 'PostX User', email: '' }
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

/* ================= 4. UTILITIES & HELPERS ================= */
const escapeHTML = (str) => String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const safeArray = (arr) => (Array.isArray(arr) ? arr : []);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nowISO = () => new Date().toISOString();

const isValidDateString = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime());
};

const formatDate = (iso) => {
  if (!iso || !isValidDateString(iso)) return '—';
  try { return new Date(iso).toLocaleString('en-KE', APP.DATE_FORMAT); } catch { return iso; }
};

const formatDateTime = formatDate; // Alias for backward compatibility

/* ================= 5. DATA NORMALIZATION ================= */
function normalizePost(p) {
  if (!p || typeof p !== 'object') return null;

  const validId = (p.id && String(p.id).trim()) ? String(p.id).trim() : uid();
  const caption = String(p.caption || p.text || '').trim();
  const hashtags = String(p.hashtags || '').trim();
  const media = String(p.media || p.image || '');

  // Filter valid platforms (facebook, instagram, x) and deduplicate
  const rawPlatforms = safeArray(p.platforms || p.platform);
  const platforms = [...new Set(rawPlatforms.filter(id => PLATFORM_IDS.includes(id)))];

  // Validate status
  let status = ['draft', 'scheduled', 'published'].includes(p.status) ? p.status : 'draft';

  // Date validations without changing updatedAt unnecessarily
  const createdAt = isValidDateString(p.createdAt) ? new Date(p.createdAt).toISOString() : nowISO();
  const updatedAt = isValidDateString(p.updatedAt) ? new Date(p.updatedAt).toISOString() : createdAt;

  let scheduledAt = null;
  let publishedAt = null;

  if (status === 'draft') {
    scheduledAt = null;
    publishedAt = null;
  } else if (status === 'scheduled') {
    if (isValidDateString(p.scheduledAt)) {
      scheduledAt = new Date(p.scheduledAt).toISOString();
      publishedAt = null;
    } else {
      // Fall back to draft if scheduled date is invalid/missing
      status = 'draft';
      scheduledAt = null;
      publishedAt = null;
    }
  } else if (status === 'published') {
    scheduledAt = null;
    if (isValidDateString(p.publishedAt)) {
      publishedAt = new Date(p.publishedAt).toISOString();
    } else if (isValidDateString(p.updatedAt)) {
      publishedAt = new Date(p.updatedAt).toISOString();
    } else {
      publishedAt = nowISO();
    }
  }

  return {
    id: validId,
    caption,
    hashtags,
    media,
    platforms,
    status,
    createdAt,
    updatedAt,
    scheduledAt,
    publishedAt
  };
}

function normalizePosts(postsArray) {
  const arr = safeArray(postsArray);
  const cleaned = arr.map(normalizePost).filter(Boolean);

  // Preserve existing IDs and repair duplicates only when necessary
  const seenIds = new Set();
  return cleaned.map(post => {
    if (seenIds.has(post.id)) {
      post.id = uid();
    }
    seenIds.add(post.id);
    return post;
  });
}

/* ================= 6. STORAGE ================= */
function loadState() {
  try {
    const raw = localStorage.getItem(APP.STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state.posts = normalizePosts(parsed.posts);
        
        // Support connectedAccounts or legacy connected object
        const connSource = parsed.connectedAccounts || parsed.connected || {};
        state.connectedAccounts = {
          facebook: Boolean(connSource.facebook),
          instagram: Boolean(connSource.instagram),
          x: Boolean(connSource.x)
        };

        state.profile = {
          name: parsed.profile?.name || DEFAULT_STATE.profile.name,
          email: parsed.profile?.email || DEFAULT_STATE.profile.email
        };

        state.activePage = parsed.activePage || DEFAULT_STATE.activePage;
        state.editingPostId = parsed.editingPostId || null;
      }
    } else {
      // Migrate legacy state safely
      const legacy = localStorage.getItem('postx_state');
      if (legacy) {
        const p = JSON.parse(legacy);
        if (p?.posts) state.posts = normalizePosts(p.posts);
        if (p?.connected) {
          state.connectedAccounts = {
            facebook: Boolean(p.connected.facebook),
            instagram: Boolean(p.connected.instagram),
            x: Boolean(p.connected.x)
          };
        }
      }
    }
  } catch (e) {
    console.warn('[PostX] Storage recovery triggered due to parse error:', e);
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveState() {
  try {
    state.posts = normalizePosts(state.posts);
    const toSave = {
      posts: state.posts,
      connectedAccounts: state.connectedAccounts,
      profile: state.profile,
      activePage: state.activePage,
      v: 2
    };
    localStorage.setItem(APP.STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('[PostX] Save failed:', e);
    if (typeof showToast === 'function') {
      showToast('Storage full - remove large images', 'error');
    }
  }
}

/* =========================================================
   POSTX v2.0
   PART 2 — NAVIGATION, ROUTING & RENDER ENGINE
   ========================================================= */

/* ================= 8. NAVIGATION & ROUTING ================= */

const VALID_PAGES = [
  'dashboard',
  'create',
  'scheduled',
  'drafts',
  'published',
  'calendar'
];

function sanitizePage(page) {
  return VALID_PAGES.includes(page) ? page : 'dashboard';
}

function navigate(page) {
  try {
    const targetPage = sanitizePage(page);

    state.activePage = targetPage;

    /* Validate editing post reference */
    if (
      state.editingPostId &&
      !state.posts.some(post => post.id === state.editingPostId)
    ) {
      state.editingPostId = null;
    }

    saveState();
    render();
    closeMobileDrawer();

  } catch (error) {
    console.error('[PostX] Navigation error:', error);
  }
}


/* ================= 8.1 ACTIVE NAVIGATION STATE ================= */

function updateNavActiveState() {
  const currentPage = sanitizePage(state.activePage);

  $$('[data-page]').forEach(element => {
    const page = element.dataset.page;
    const active = page === currentPage;

    element.classList.toggle('active', active);

    if (
      element.tagName === 'BUTTON' ||
      element.tagName === 'A'
    ) {
      if (active) {
        element.setAttribute('aria-current', 'page');
      } else {
        element.removeAttribute('aria-current');
      }
    }
  });
}


/* ================= 8.2 MOBILE DRAWER ================= */

function closeMobileDrawer() {
  const drawer =
    safeEl('mobile-drawer') ||
    $('.mobile-drawer') ||
    safeEl('sidebar-drawer');

  if (drawer) {
    drawer.classList.remove(
      'open',
      'active',
      'show'
    );
  }

  const overlay =
    $('.drawer-overlay') ||
    safeEl('drawer-overlay');

  if (overlay) {
    overlay.classList.remove(
      'open',
      'active',
      'show'
    );
  }

  document.body.classList.remove(
    'drawer-open',
    'mobile-menu-open'
  );
}


/* ================= 8.3 TOGGLE MOBILE DRAWER ================= */

function toggleMobileDrawer() {
  const drawer =
    safeEl('mobile-drawer') ||
    $('.mobile-drawer') ||
    safeEl('sidebar-drawer');

  if (!drawer) return;

  const isOpen =
    drawer.classList.contains('open');

  if (isOpen) {
    closeMobileDrawer();
  } else {
    drawer.classList.add('open');
    document.body.classList.add('drawer-open');
  }
}


/* ================= 9. GUARDED NAVIGATION EVENTS ================= */

function bindNavigation() {

  if (window.__POSTX_NAV_BOUND) {
    return;
  }

  window.__POSTX_NAV_BOUND = true;


  /* ---------- CLICK EVENTS ---------- */

  document.addEventListener('click', event => {

    /* Navigation */
    const navTrigger =
      event.target.closest('[data-page]');

    if (navTrigger) {
      const page =
        navTrigger.dataset.page;

      if (page) {
        event.preventDefault();
        navigate(page);
        return;
      }
    }


    /* Mobile menu button */
    const drawerToggle =
      event.target.closest(
        '#mobile-drawer-toggle,' +
        '.mobile-menu-btn,' +
        '[data-drawer-toggle]'
      );

    if (drawerToggle) {
      event.preventDefault();
      toggleMobileDrawer();
      return;
    }


    /* Drawer backdrop */
    const clickedBackdrop =
      event.target.matches(
        '.drawer-overlay,' +
        '#drawer-overlay,' +
        '.mobile-drawer-backdrop'
      );

    if (clickedBackdrop) {
      closeMobileDrawer();
    }

  });


  /* ---------- KEYBOARD EVENTS ---------- */

  document.addEventListener('keydown', event => {

    if (event.key !== 'Escape') {
      return;
    }

    /* Close active modal first */
    if (
      typeof activeModal !== 'undefined' &&
      activeModal
    ) {
      if (
        typeof closeModal === 'function'
      ) {
        closeModal();
      }

      return;
    }

    /* Otherwise close mobile drawer */
    closeMobileDrawer();

  });
}


/* ================= 10. SINGLE RENDER ROUTER ================= */

function render() {

  try {

    /* ---------- Validate active page ---------- */

    state.activePage =
      sanitizePage(state.activePage);


    /* ---------- Validate editing post ---------- */

    if (
      state.editingPostId &&
      !state.posts.some(
        post => post.id === state.editingPostId
      )
    ) {
      state.editingPostId = null;
    }


    const activePage =
      state.activePage;


    /* ---------- Page visibility ---------- */

    VALID_PAGES.forEach(pageId => {

      const pageElement =
        safeEl(`${pageId}-page`) ||
        $(`[data-page-content="${pageId}"]`);

      if (!pageElement) {
        return;
      }

      pageElement.style.display =
        pageId === activePage
          ? 'block'
          : 'none';

    });


    /* ---------- Page renderer ---------- */

    switch (activePage) {

      case 'dashboard':

        if (
          typeof renderDashboard === 'function'
        ) {
          renderDashboard();
        }

        break;


      case 'create':

        if (
          typeof renderComposer === 'function'
        ) {
          renderComposer();
        }

        break;


      case 'scheduled':

        if (
          typeof renderScheduled === 'function'
        ) {
          renderScheduled();
        }

        break;


      case 'drafts':

        if (
          typeof renderDrafts === 'function'
        ) {
          renderDrafts();
        }

        break;


      case 'published':

        if (
          typeof renderPublished === 'function'
        ) {
          renderPublished();
        }

        break;


      case 'calendar':

        if (
          typeof renderCalendar === 'function'
        ) {
          renderCalendar();
        }

        break;


      default:

        state.activePage = 'dashboard';

        if (
          typeof renderDashboard === 'function'
        ) {
          renderDashboard();
        }

        break;

    }


    /* ---------- Update navigation ---------- */

    updateNavActiveState();


  } catch (error) {

    console.error(
      '[PostX] Render error:',
      error
    );

  }

}


/* ================= 10.1 INITIALIZE PART 2 ================= */

bindNavigation();
render();
