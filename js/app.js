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

/* =========================================================
   POSTX v2.0
   PART 3 — DASHBOARD & POST CARD ENGINE
   ========================================================= */


/* ================= 11. DASHBOARD STATISTICS ================= */

function getPostStats() {
  const posts = safeArray(state.posts);

  return {
    total: posts.length,

    drafts: posts.filter(
      post => post.status === 'draft'
    ).length,

    scheduled: posts.filter(
      post => post.status === 'scheduled'
    ).length,

    published: posts.filter(
      post => post.status === 'published'
    ).length,

    connected: Object.values(
      state.connectedAccounts || {}
    ).filter(Boolean).length
  };
}


/* ================= 12. POST SEARCH ================= */

function searchPosts(posts, query) {

  const list = safeArray(posts);

  const search =
    String(query || '')
      .trim()
      .toLowerCase();

  if (!search) {
    return list;
  }

  return list.filter(post => {

    const content = [
      post.caption,
      post.hashtags,
      post.status,
      ...safeArray(post.platforms)
    ]
      .join(' ')
      .toLowerCase();

    return content.includes(search);
  });
}


/* ================= 13. SORT POSTS ================= */

function sortPosts(posts, newestFirst = true) {

  return safeArray(posts)
    .slice()
    .sort((a, b) => {

      const dateA =
        new Date(
          a.updatedAt ||
          a.createdAt ||
          0
        ).getTime();

      const dateB =
        new Date(
          b.updatedAt ||
          b.createdAt ||
          0
        ).getTime();

      return newestFirst
        ? dateB - dateA
        : dateA - dateB;
    });
}


/* ================= 14. POST PLATFORM BADGES ================= */

function renderPlatformBadges(post) {

  const platforms =
    safeArray(post.platforms);

  if (!platforms.length) {
    return `
      <span class="postx-platform-badge">
        No platform
      </span>
    `;
  }

  return platforms
    .map(platformId => {

      const platform =
        PLATFORMS[platformId];

      if (!platform) {
        return '';
      }

      return `
        <span
          class="postx-platform-badge"
          data-platform="${escapeHTML(platformId)}"
          title="${escapeHTML(platform.label)}"
        >
          ${escapeHTML(platform.label)}
        </span>
      `;
    })
    .join('');
}


/* ================= 15. POST STATUS BADGE ================= */

function renderStatusBadge(status) {

  const validStatuses = [
    'draft',
    'scheduled',
    'published'
  ];

  const safeStatus =
    validStatuses.includes(status)
      ? status
      : 'draft';

  return `
    <span
      class="postx-status-badge postx-status-${safeStatus}"
    >
      ${escapeHTML(safeStatus)}
    </span>
  `;
}


/* ================= 16. POST DATE INFORMATION ================= */

function renderPostDate(post) {

  if (post.status === 'scheduled') {

    return `
      <span>
        Scheduled:
        ${escapeHTML(
          formatDate(post.scheduledAt)
        )}
      </span>
    `;
  }

  if (post.status === 'published') {

    return `
      <span>
        Published:
        ${escapeHTML(
          formatDate(post.publishedAt)
        )}
      </span>
    `;
  }

  return `
    <span>
      Created:
      ${escapeHTML(
        formatDate(post.createdAt)
      )}
    </span>
  `;
}


/* ================= 17. POST MEDIA ================= */

function renderPostMedia(post) {

  if (!post.media) {
    return '';
  }

  return `
    <div class="postx-post-media">
      <img
        src="${escapeHTML(post.media)}"
        alt="Post media"
        loading="lazy"
        onerror="this.parentElement.remove()"
      >
    </div>
  `;
}


/* ================= 18. POST CARD ================= */

function renderPostCard(post) {

  if (!post) {
    return '';
  }

  const id =
    escapeHTML(post.id);

  const caption =
    escapeHTML(post.caption || '');

  const hashtags =
    escapeHTML(post.hashtags || '');

  return `
    <article
      class="postx-post-card post-card"
      data-post-id="${id}"
      data-id="${id}"
    >

      ${renderPostMedia(post)}

      <div class="postx-post-card-body">

        <!-- Status + platforms -->

        <div class="postx-post-meta-top">

          <div class="postx-post-status">
            ${renderStatusBadge(post.status)}
          </div>

          <div class="postx-post-platforms">
            ${renderPlatformBadges(post)}
          </div>

        </div>


        <!-- Caption -->

        <div class="postx-post-caption">

          ${
            caption
              ? caption
              : '<span class="postx-empty-caption">No caption</span>'
          }

        </div>


        <!-- Hashtags -->

        ${
          hashtags
            ? `
              <div class="postx-post-hashtags">
                ${hashtags}
              </div>
            `
            : ''
        }


        <!-- Date -->

        <div class="postx-post-date">
          ${renderPostDate(post)}
        </div>


        <!-- Actions -->

        <div class="postx-post-actions">

          <button
            type="button"
            class="postx-btn postx-btn-edit btn-edit"
            data-action="edit-post"
            data-id="${id}"
          >
            Edit
          </button>


          ${
            post.status === 'draft'
              ? `
                <button
                  type="button"
                  class="postx-btn postx-btn-primary btn-publish-now"
                  data-action="publish-post"
                  data-id="${id}"
                >
                  Publish
                </button>
              `
              : ''
          }


          ${
            post.status === 'scheduled'
              ? `
                <button
                  type="button"
                  class="postx-btn postx-btn-primary btn-publish-now"
                  data-action="publish-post"
                  data-id="${id}"
                >
                  Publish Now
                </button>
              `
              : ''
          }


          <button
            type="button"
            class="postx-btn postx-btn-danger btn-delete"
            data-action="delete-post"
            data-id="${id}"
          >
            Delete
          </button>

        </div>

      </div>

    </article>
  `;
}


/* ================= 19. POST CARD LIST ================= */

function renderPostCards(posts) {

  const list =
    safeArray(posts);

  if (!list.length) {

    return `
      <div class="postx-empty-state">

        <div class="postx-empty-icon">
          ✦
        </div>

        <h3>No posts yet</h3>

        <p>
          Create your first PostX post to get started.
        </p>

        <button
          type="button"
          class="postx-btn postx-btn-gradient"
          data-page="create"
        >
          Create Post
        </button>

      </div>
    `;
  }

  return `
    <div class="postx-post-list posts-grid">

      ${list
        .map(renderPostCard)
        .join('')}

    </div>
  `;
}


/* ================= 20. DASHBOARD EMPTY STATE ================= */

function renderDashboardEmptyState() {

  return `
    <div class="postx-dashboard-empty postx-card">

      <div class="postx-empty-icon">
        ✦
      </div>

      <h2>Welcome to PostX</h2>

      <p>
        Create, schedule and manage your social media
        content from one dashboard.
      </p>

      <button
        type="button"
        class="postx-btn postx-btn-gradient"
        data-page="create"
      >
        + Create Your First Post
      </button>

    </div>
  `;
}


/* ================= 21. DASHBOARD ================= */

function renderDashboard() {

  const page =
    safeEl('dashboard-page');

  if (!page) {
    return;
  }

  const stats =
    getPostStats();

  const sortedPosts =
    sortPosts(state.posts)
      .slice(0, 6);


  page.innerHTML = `

    <div class="postx-page">

      <!-- HEADER -->

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
            class="postx-btn postx-btn-gradient"
            data-page="create"
          >
            + Create Post
          </button>

        </div>

      </div>


      <!-- STATISTICS -->

      <div class="postx-stats">

        <div class="postx-card postx-stat">

          <div class="postx-stat-label">
            Total Posts
          </div>

          <div class="postx-stat-value">
            ${stats.total}
          </div>

          <div class="postx-stat-sub">
            All content
          </div>

        </div>


        <div class="postx-card postx-stat">

          <div class="postx-stat-label">
            Drafts
          </div>

          <div class="postx-stat-value">
            ${stats.drafts}
          </div>

          <div class="postx-stat-sub">
            Unpublished
          </div>

        </div>


        <div class="postx-card postx-stat">

          <div class="postx-stat-label">
            Scheduled
          </div>

          <div class="postx-stat-value">
            ${stats.scheduled}
          </div>

          <div class="postx-stat-sub">
            Waiting to publish
          </div>

        </div>


        <div class="postx-card postx-stat">

          <div class="postx-stat-label">
            Published
          </div>

          <div class="postx-stat-value">
            ${stats.published}
          </div>

          <div class="postx-stat-sub">
            Published posts
          </div>

        </div>


        <div class="postx-card postx-stat">

          <div class="postx-stat-label">
            Connected
          </div>

          <div class="postx-stat-value">
            ${stats.connected}/3
          </div>

          <div class="postx-stat-sub">
            Social accounts
          </div>

        </div>

      </div>


      <!-- RECENT POSTS -->

      <div class="postx-card postx-section-card">

        <div class="postx-section-head">

          <div>

            <h2 class="postx-section-title">
              Recent Posts
            </h2>

            <p class="postx-page-subtitle">
              Your latest content
            </p>

          </div>


          <div class="postx-actions">

            <button
              type="button"
              class="postx-btn"
              data-page="drafts"
            >
              View Drafts
            </button>

            <button
              type="button"
              class="postx-btn"
              data-page="scheduled"
            >
              Scheduled
            </button>

          </div>

        </div>


        ${
          sortedPosts.length
            ? renderPostCards(sortedPosts)
            : renderDashboardEmptyState()
        }

      </div>

    </div>
  `;
}


/* ================= 22. POST ACTION HANDLERS ================= */

function handleEditPost(postId) {

  const post =
    getPostById(postId);

  if (!post) {

    showToast(
      'Post not found.',
      'error'
    );

    return;
  }

  state.editingPostId =
    post.id;

  /*
   * Composer state will be prepared
   * by the composer engine.
   */

  if (
    typeof loadPostIntoComposer === 'function'
  ) {

    loadPostIntoComposer(post);

  } else {

    state.editingPostId =
      post.id;

  }

  navigate('create');
}


/* ================= 23. DELETE POST ================= */

function deletePost(postId) {

  const post =
    getPostById(postId);

  if (!post) {

    showToast(
      'Post not found.',
      'error'
    );

    return;
  }


  const confirmDelete =
    () => {

      state.posts =
        state.posts.filter(
          item => item.id !== postId
        );

      if (
        state.editingPostId === postId
      ) {
        state.editingPostId = null;
      }

      saveState();
      render();

      showToast(
        'Post deleted.',
        'success'
      );
    };


  /*
   * Use PostX modal when available.
   * Falls back to browser confirmation.
   */

  if (
    typeof openModal === 'function'
  ) {

    openModal({

      title: 'Delete Post',

      body: `
        Are you sure you want to delete this post?
        This action cannot be undone.
      `,

      actions: [

        {
          label: 'Cancel',
          variant: 'secondary',
          close: true
        },

        {
          label: 'Delete',
          variant: 'primary',
          onClick: confirmDelete
        }

      ]

    });

  } else if (
    window.confirm(
      'Delete this post?'
    )
  ) {

    confirmDelete();

  }

}


/* ================= 24. PUBLISH POST ================= */

function publishPost(postId) {

  const post =
    getPostById(postId);

  if (!post) {

    showToast(
      'Post not found.',
      'error'
    );

    return;
  }


  if (!post.platforms.length) {

    showToast(
      'Select at least one platform before publishing.',
      'warning'
    );

    return;
  }


  const publish =
    () => {

      post.status =
        'published';

      post.scheduledAt =
        null;

      post.publishedAt =
        nowISO();

      post.updatedAt =
        nowISO();

      saveState();
      render();

      showToast(
        'Post published successfully.',
        'success'
      );
    };


  if (
    typeof openModal === 'function'
  ) {

    openModal({

      title: 'Publish Post',

      body: `
        Publish this post now?
        <br><br>
        <strong>
          Frontend demo:
        </strong>
        the post will move to Published locally.
      `,

      actions: [

        {
          label: 'Cancel',
          variant: 'secondary'
        },

        {
          label: 'Publish Now',
          variant: 'primary',
          onClick: publish
        }

      ]

    });

  } else {

    publish();

  }

}


/* ================= 25. DASHBOARD ACTION EVENTS ================= */

function bindDashboardActions() {

  if (
    window.__POSTX_DASHBOARD_ACTIONS_BOUND
  ) {
    return;
  }

  window.__POSTX_DASHBOARD_ACTIONS_BOUND =
    true;


  document.addEventListener(
    'click',
    event => {

      const editButton =
        event.target.closest(
          '[data-action="edit-post"], .btn-edit'
        );

      if (editButton) {

        event.preventDefault();

        const id =
          editButton.dataset.id ||
          editButton.dataset.postId;

        if (id) {
          handleEditPost(id);
        }

        return;
      }


      const publishButton =
        event.target.closest(
          '[data-action="publish-post"], .btn-publish-now'
        );

      if (publishButton) {

        event.preventDefault();

        const id =
          publishButton.dataset.id ||
          publishButton.dataset.postId;

        if (id) {
          publishPost(id);
        }

        return;
      }


      const deleteButton =
        event.target.closest(
          '[data-action="delete-post"], .btn-delete'
        );

      if (deleteButton) {

        event.preventDefault();

        const id =
          deleteButton.dataset.id ||
          deleteButton.dataset.postId;

        if (id) {
          deletePost(id);
        }

      }

    }
  );
}


/* ================= 26. PART 3 INITIALIZATION ================= */

bindDashboardActions();

/* =========================================================
   POSTX v2.0 — PART 4
   COMPOSER ENGINE
   ---------------------------------------------------------
   Responsibilities:
   - Create posts
   - Edit posts
   - Save drafts
   - Schedule posts
   - Publish posts locally
   - Platform selection
   - Image upload/preview
   - Composer validation
   - LocalStorage persistence
   ========================================================= */


/* ================= 11. COMPOSER STATE ================= */

function createEmptyComposer() {
  return {
    caption: '',
    hashtags: '',
    media: '',
    platforms: [],
    scheduledAt: ''
  };
}

if (!state.composer) {
  state.composer = createEmptyComposer();
}


/* ================= 12. LOAD POST INTO COMPOSER ================= */

function loadPostIntoComposer(post) {
  if (!post) {
    state.composer = createEmptyComposer();
    state.editingPostId = null;
    return;
  }

  state.composer = {
    caption: String(post.caption || ''),
    hashtags: String(post.hashtags || ''),
    media: String(post.media || ''),
    platforms: Array.isArray(post.platforms)
      ? [...new Set(
          post.platforms.filter(id => PLATFORM_IDS.includes(id))
        )]
      : [],
    scheduledAt: post.scheduledAt
      ? toLocalDateTimeInput(post.scheduledAt)
      : ''
  };

  state.editingPostId = post.id;
}


/* ================= 13. DATE/TIME HELPERS ================= */

/*
 * Converts an ISO UTC date into the local datetime-local format:
 * YYYY-MM-DDTHH:mm
 *
 * This prevents timezone shifts when editing scheduled posts.
 */

function toLocalDateTimeInput(iso) {
  if (!iso || !isValidDateString(iso)) return '';

  const d = new Date(iso);

  const pad = n => String(n).padStart(2, '0');

  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate())
  ].join('-') + 'T' +
    [
      pad(d.getHours()),
      pad(d.getMinutes())
    ].join(':');
}


/*
 * Converts datetime-local value into ISO UTC.
 */

function localDateTimeToISO(value) {
  if (!value) return null;

  const d = new Date(value);

  if (isNaN(d.getTime())) return null;

  return d.toISOString();
}


/* ================= 14. RESET COMPOSER ================= */

function resetComposer() {
  state.composer = createEmptyComposer();
  state.editingPostId = null;
}


/* ================= 15. READ COMPOSER FORM ================= */

function readComposerForm() {
  const captionEl = safeEl('composer-caption');
  const hashtagsEl = safeEl('composer-hashtags');
  const scheduleEl = safeEl('composer-schedule');

  if (captionEl) {
    state.composer.caption = captionEl.value;
  }

  if (hashtagsEl) {
    state.composer.hashtags = hashtagsEl.value;
  }

  if (scheduleEl) {
    state.composer.scheduledAt = scheduleEl.value;
  }

  state.composer.caption =
    String(state.composer.caption || '').trim();

  state.composer.hashtags =
    String(state.composer.hashtags || '').trim();

  state.composer.platforms = [
    ...new Set(
      safeArray(state.composer.platforms)
        .filter(id => PLATFORM_IDS.includes(id))
    )
  ];
}


/* ================= 16. COMPOSER VALIDATION ================= */

function validateComposer(options = {}) {

  const requirePlatform =
    options.requirePlatform !== false;

  const requireSchedule =
    options.requireSchedule === true;

  readComposerForm();

  const caption = state.composer.caption.trim();

  if (!caption) {
    showToast(
      'Please enter a caption before continuing.',
      'warning'
    );

    safeEl('composer-caption')?.focus();

    return false;
  }

  if (caption.length > 10000) {
    showToast(
      'Caption is too long. Maximum 10,000 characters.',
      'warning'
    );

    return false;
  }

  if (
    requirePlatform &&
    state.composer.platforms.length === 0
  ) {
    showToast(
      'Please select at least one platform.',
      'warning'
    );

    return false;
  }

  if (requireSchedule) {

    if (!state.composer.scheduledAt) {
      showToast(
        'Please select a schedule date and time.',
        'warning'
      );

      safeEl('composer-schedule')?.focus();

      return false;
    }

    const scheduledISO =
      localDateTimeToISO(state.composer.scheduledAt);

    if (!scheduledISO) {
      showToast(
        'The selected schedule time is invalid.',
        'error'
      );

      return false;
    }

    if (
      new Date(scheduledISO).getTime() <= Date.now()
    ) {
      showToast(
        'Schedule time must be in the future.',
        'warning'
      );

      return false;
    }
  }

  return true;
}


/* ================= 17. CONNECTED PLATFORM CHECK ================= */

function getConnectedState(platform) {
  if (!state.connectedAccounts) {
    state.connectedAccounts = {};
  }

  return Boolean(
    state.connectedAccounts[platform]
  );
}


function validateSelectedPlatforms() {

  const selected =
    safeArray(state.composer.platforms);

  if (!selected.length) {
    showToast(
      'Select at least one platform.',
      'warning'
    );

    return false;
  }

  const disconnected = selected.filter(
    id => !getConnectedState(id)
  );

  /*
   * Frontend demo:
   * Do not block creation because an account is not
   * connected. Real API connection will be implemented
   * in the backend integration phase.
   */

  if (disconnected.length) {

    const names = disconnected
      .map(id => PLATFORMS[id]?.label || id)
      .join(', ');

    showToast(
      `${names} not connected. Post will be saved locally for now.`,
      'warning'
    );
  }

  return true;
}


/* ================= 18. BUILD POST OBJECT ================= */

function buildPost(status) {

  readComposerForm();

  const now = nowISO();

  let scheduledAt = null;
  let publishedAt = null;

  if (status === 'scheduled') {
    scheduledAt =
      localDateTimeToISO(
        state.composer.scheduledAt
      );
  }

  if (status === 'published') {
    publishedAt = now;
  }

  return normalizePost({
    id: state.editingPostId || uid(),

    caption: state.composer.caption,

    hashtags: state.composer.hashtags,

    media: state.composer.media,

    platforms: state.composer.platforms,

    status,

    createdAt:
      state.editingPostId
        ? (
            state.posts.find(
              p => p.id === state.editingPostId
            )?.createdAt || now
          )
        : now,

    updatedAt: now,

    scheduledAt,

    publishedAt
  });
}


/* ================= 19. SAVE POST ================= */

function saveComposerPost(status) {

  const valid =
    validateComposer({
      requirePlatform: true,
      requireSchedule: status === 'scheduled'
    });

  if (!valid) return false;

  if (!validateSelectedPlatforms()) {
    return false;
  }

  const post = buildPost(status);

  if (!post) {
    showToast(
      'Unable to create the post.',
      'error'
    );

    return false;
  }

  const existingIndex =
    state.posts.findIndex(
      p => p.id === post.id
    );

  if (existingIndex >= 0) {

    state.posts[existingIndex] = post;

  } else {

    state.posts.unshift(post);
  }

  state.posts =
    normalizePosts(state.posts);

  saveState();

  return true;
}


/* ================= 20. SAVE DRAFT ================= */

function handleSaveDraft() {

  if (!saveComposerPost('draft')) {
    return;
  }

  showToast(
    state.editingPostId
      ? 'Draft updated successfully.'
      : 'Draft saved successfully.',
    'success'
  );

  resetComposer();

  navigate('drafts');
}


/* ================= 21. SCHEDULE POST ================= */

function handleSchedulePost() {

  if (!saveComposerPost('scheduled')) {
    return;
  }

  showToast(
    state.editingPostId
      ? 'Scheduled post updated successfully.'
      : 'Post scheduled successfully.',
    'success'
  );

  resetComposer();

  navigate('scheduled');
}


/* ================= 22. PUBLISH CONFIRMATION ================= */

function handlePublishConfirm() {

  if (!validateComposer({
    requirePlatform: true
  })) {
    return;
  }

  if (!validateSelectedPlatforms()) {
    return;
  }

  openModal({
    title: state.editingPostId
      ? 'Publish Changes?'
      : 'Publish Post?',

    body: `
      <div>
        This frontend demo will mark the post as
        <strong style="color:#fff;">Published</strong>
        locally.
      </div>

      <div style="
        margin-top:12px;
        padding:12px;
        border-radius:10px;
        background:#1a1a24;
        border:1px solid #2a2a3a;
      ">
        ${escapeHTML(
          state.composer.caption.slice(0, 180)
        )}${state.composer.caption.length > 180 ? '…' : ''}
      </div>
    `,

    actions: [

      {
        label: 'Cancel',
        variant: 'secondary',
        close: true
      },

      {
        label: 'Publish Now',
        variant: 'primary',
        close: true,

        onClick: () => {
          publishComposerPost();
        }
      }

    ]
  });
}


/* ================= 23. PUBLISH POST ================= */

function publishComposerPost() {

  if (!saveComposerPost('published')) {
    return;
  }

  showToast(
    'Post published successfully.',
    'success'
  );

  resetComposer();

  navigate('published');
}


/* ================= 24. EDIT POST ================= */

function editPost(postId) {

  const id = String(postId || '');

  const post =
    state.posts.find(
      p => p.id === id
    );

  if (!post) {

    showToast(
      'Post could not be found.',
      'error'
    );

    return;
  }

  loadPostIntoComposer(post);

  navigate('create');
}


/* ================= 25. DELETE POST ================= */

function deletePost(postId) {

  const id = String(postId || '');

  const post =
    state.posts.find(
      p => p.id === id
    );

  if (!post) {
    showToast(
      'Post not found.',
      'error'
    );

    return;
  }

  openModal({

    title: 'Delete Post?',

    body: `
      <div>
        Are you sure you want to permanently delete this post?
      </div>

      <div style="
        margin-top:12px;
        padding:12px;
        border-radius:10px;
        background:#1a1a24;
        border:1px solid #2a2a3a;
        color:#fff;
      ">
        ${escapeHTML(
          post.caption.slice(0, 180)
        )}${post.caption.length > 180 ? '…' : ''}
      </div>
    `,

    actions: [

      {
        label: 'Cancel',
        variant: 'secondary'
      },

      {
        label: 'Delete',
        variant: 'danger',

        onClick: () => {

          state.posts =
            state.posts.filter(
              p => p.id !== id
            );

          if (
            state.editingPostId === id
          ) {
            resetComposer();
          }

          saveState();

          showToast(
            'Post deleted.',
            'success'
          );

          render();
        }
      }

    ]
  });
}


/* ================= 26. PLATFORM SELECTION ================= */

function toggleComposerPlatform(platformId) {

  const id =
    String(platformId || '')
      .toLowerCase()
      .trim();

  if (!PLATFORM_IDS.includes(id)) {
    return;
  }

  if (!state.composer) {
    state.composer =
      createEmptyComposer();
  }

  const index =
    state.composer.platforms.indexOf(id);

  if (index >= 0) {

    state.composer.platforms.splice(
      index,
      1
    );

  } else {

    state.composer.platforms.push(id);
  }

  state.composer.platforms =
    [...new Set(
      state.composer.platforms
    )];

  renderComposer();
}


/* ================= 27. MEDIA UPLOAD ================= */

function handleComposerMedia(file) {

  if (!file) return;

  if (!file.type.startsWith('image/')) {

    showToast(
      'Please select an image file.',
      'warning'
    );

    return;
  }

  /*
   * Keep the existing localStorage-safe limit.
   * Large base64 images can quickly exhaust browser
   * storage, so we reject oversized files.
   */

  const MAX_IMAGE_SIZE = 2_000_000;

  if (file.size > MAX_IMAGE_SIZE) {

    showToast(
      'Image is too large. Please use an image under 2 MB.',
      'error'
    );

    return;
  }

  const reader =
    new FileReader();

  reader.onload = event => {

    const result =
      event.target?.result;

    if (
      typeof result !== 'string' ||
      !result
    ) {

      showToast(
        'Unable to read image.',
        'error'
      );

      return;
    }

    state.composer.media =
      result;

    renderComposer();

    showToast(
      'Image added to post.',
      'success'
    );
  };

  reader.onerror = () => {

    showToast(
      'Failed to read image.',
      'error'
    );
  };

  reader.readAsDataURL(file);
}


/* ================= 28. REMOVE MEDIA ================= */

function removeComposerMedia() {

  if (!state.composer) return;

  state.composer.media = '';

  renderComposer();

  showToast(
    'Image removed.',
    'info'
  );
}


/* ================= 29. COMPOSER EVENT BINDING ================= */

function bindComposerEvents() {

  const caption =
    safeEl('composer-caption');

  const hashtags =
    safeEl('composer-hashtags');

  const schedule =
    safeEl('composer-schedule');

  const uploadButton =
    safeEl('composer-upload-btn');

  const fileInput =
    safeEl('composer-media-input');


  /*
   * Input events are attached only to the current
   * composer DOM elements.
   *
   * renderComposer() replaces those elements, so old
   * listeners disappear with the old DOM.
   */

  if (caption) {

    caption.addEventListener(
      'input',
      e => {
        state.composer.caption =
          e.target.value;
      }
    );
  }


  if (hashtags) {

    hashtags.addEventListener(
      'input',
      e => {
        state.composer.hashtags =
          e.target.value;
      }
    );
  }


  if (schedule) {

    schedule.addEventListener(
      'change',
      e => {
        state.composer.scheduledAt =
          e.target.value;
      }
    );
  }


  /*
   * Platform buttons
   */

  $$('.platform-btn').forEach(button => {

    button.addEventListener(
      'click',
      e => {

        e.preventDefault();

        toggleComposerPlatform(
          button.dataset.platform
        );
      }
    );
  });


  /*
   * Upload button
   */

  if (
    uploadButton &&
    fileInput
  ) {

    uploadButton.addEventListener(
      'click',
      e => {

        e.preventDefault();

        fileInput.click();
      }
    );


    fileInput.addEventListener(
      'change',
      e => {

        const file =
          e.target.files?.[0];

        if (file) {
          handleComposerMedia(file);
        }

        /*
         * Allow selecting the same file again.
         */

        e.target.value = '';
      }
    );
  }


  /*
   * Remove media
   */

  const removeMedia =
    safeEl('remove-media');

  if (removeMedia) {

    removeMedia.addEventListener(
      'click',
      e => {

        e.preventDefault();

        removeComposerMedia();
      }
    );
  }


  /*
   * Main composer actions
   */

  const saveDraft =
    safeEl('btn-save-draft');

  if (saveDraft) {

    saveDraft.addEventListener(
      'click',
      e => {

        e.preventDefault();

        handleSaveDraft();
      }
    );
  }


  const scheduleButton =
    safeEl('btn-schedule');

  if (scheduleButton) {

    scheduleButton.addEventListener(
      'click',
      e => {

        e.preventDefault();

        handleSchedulePost();
      }
    );
  }


  const publishButton =
    safeEl('btn-publish');

  if (publishButton) {

    publishButton.addEventListener(
      'click',
      e => {

        e.preventDefault();

        handlePublishConfirm();
      }
    );
  }


  /*
   * Cancel edit
   */

  const cancelEdit =
    safeEl('btn-cancel-edit');

  if (cancelEdit) {

    cancelEdit.addEventListener(
      'click',
      e => {

        e.preventDefault();

        resetComposer();

        navigate('drafts');
      }
    );
  }
}


/* ================= 30. GLOBAL POST ACTIONS ================= */

function bindPostActions() {

  if (window.__POSTX_POST_ACTIONS_BOUND) {
    return;
  }

  window.__POSTX_POST_ACTIONS_BOUND = true;

  document.addEventListener(
    'click',
    e => {

      /*
       * Edit
       */

      const editButton =
        e.target.closest('.btn-edit');

      if (editButton) {

        e.preventDefault();

        editPost(
          editButton.dataset.id
        );

        return;
      }


      /*
       * Delete
       */

      const deleteButton =
        e.target.closest('.btn-delete');

      if (deleteButton) {

        e.preventDefault();

        deletePost(
          deleteButton.dataset.id
        );

        return;
      }


      /*
       * Publish Now
       */

      const publishButton =
        e.target.closest('.btn-publish-now');

      if (publishButton) {

        e.preventDefault();

        publishPostById(
          publishButton.dataset.id
        );

        return;
      }
    }
  );
}


/* ================= 31. PUBLISH EXISTING POST ================= */

function publishPostById(postId) {

  const id =
    String(postId || '');

  const post =
    state.posts.find(
      p => p.id === id
    );

  if (!post) {

    showToast(
      'Post not found.',
      'error'
    );

    return;
  }

  openModal({

    title: 'Publish this post now?',

    body: `
      <div>
        This will move the post to
        <strong style="color:#fff;">
          Published
        </strong>.
      </div>

      <div style="
        margin-top:12px;
        padding:12px;
        border-radius:10px;
        background:#1a1a24;
        border:1px solid #2a2a3a;
      ">
        ${escapeHTML(
          post.caption.slice(0, 180)
        )}${post.caption.length > 180 ? '…' : ''}
      </div>
    `,

    actions: [

      {
        label: 'Cancel',
        variant: 'secondary'
      },

      {
        label: 'Publish Now',
        variant: 'primary',

        onClick: () => {

          post.status =
            'published';

          post.scheduledAt =
            null;

          post.publishedAt =
            nowISO();

          post.updatedAt =
            nowISO();

          state.posts =
            normalizePosts(
              state.posts
            );

          saveState();

          showToast(
            'Post published successfully.',
            'success'
          );

          render();
        }
      }

    ]
  });
}


/* ================= 32. INITIALIZE COMPOSER ENGINE ================= */

function initComposerEngine() {

  if (!state.composer) {
    state.composer =
      createEmptyComposer();
  }

  bindPostActions();

  /*
   * If an editing ID exists after page reload,
   * restore the post into the composer.
   */

  if (state.editingPostId) {

    const post =
      state.posts.find(
        p => p.id === state.editingPostId
      );

    if (post) {

      loadPostIntoComposer(post);

    } else {

      resetComposer();
    }
  }
}


/* ================= 33. START PART 4 ================= */

initComposerEngine();

/* =========================================================
   POSTX v2.0 — PART 5
   POST LISTS ENGINE
   ---------------------------------------------------------
   Responsibilities:
   - Drafts page
   - Scheduled page
   - Published page
   - Search/filter
   - Empty states
   - Post counts
   - Edit / publish / delete actions
   ========================================================= */


/* ================= 34. LIST HELPERS ================= */

function getPostsByStatus(status) {
  return state.posts
    .filter(post => post.status === status)
    .sort((a, b) => {
      const dateA = new Date(
        status === 'scheduled'
          ? (a.scheduledAt || a.updatedAt)
          : status === 'published'
            ? (a.publishedAt || a.updatedAt)
            : (a.updatedAt || a.createdAt)
      ).getTime();

      const dateB = new Date(
        status === 'scheduled'
          ? (b.scheduledAt || b.updatedAt)
          : status === 'published'
            ? (b.publishedAt || b.updatedAt)
            : (b.updatedAt || b.createdAt)
      ).getTime();

      return status === 'scheduled'
        ? dateA - dateB
        : dateB - dateA;
    });
}


function filterPosts(posts) {
  const query =
    String(state.searchQuery || '')
      .trim()
      .toLowerCase();

  if (!query) return posts;

  return posts.filter(post => {

    const searchable = [
      post.caption,
      post.hashtags,
      post.status,
      ...(post.platforms || [])
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(query);
  });
}


/* ================= 35. LIST SEARCH ================= */

function renderListSearch(inputId, placeholder) {
  return `
    <div style="
      display:flex;
      gap:10px;
      align-items:center;
      margin-bottom:18px;
      flex-wrap:wrap;
    ">

      <input
        id="${inputId}"
        type="search"
        autocomplete="off"
        placeholder="${escapeHTML(placeholder)}"
        value="${escapeHTML(state.searchQuery || '')}"
        style="
          flex:1;
          min-width:220px;
          background:#1a1a24;
          border:1px solid #2a2a3a;
          border-radius:12px;
          padding:11px 14px;
          color:#fff;
          outline:none;
        "
      >

      <button
        class="clear-list-search"
        type="button"
        style="
          background:#1e1e2e;
          border:1px solid #2a2a3a;
          color:#9aa0b4;
          padding:10px 14px;
          border-radius:10px;
          cursor:pointer;
        "
      >
        Clear
      </button>

    </div>
  `;
}


/* ================= 36. LIST HEADER ================= */

function renderListHeader(title, subtitle, count) {
  return `
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:15px;
      margin-bottom:20px;
      flex-wrap:wrap;
    ">

      <div>
        <h2 style="
          margin:0;
          color:#fff;
          font-size:24px;
          font-weight:800;
        ">
          ${escapeHTML(title)}
        </h2>

        <div style="
          color:#6a708a;
          font-size:13px;
          margin-top:5px;
        ">
          ${escapeHTML(subtitle)}
        </div>
      </div>

      <div style="
        background:#1e1e2e;
        border:1px solid #2a2a3a;
        color:#fff;
        padding:8px 13px;
        border-radius:20px;
        font-size:12px;
        font-weight:700;
      ">
        ${count} post${count === 1 ? '' : 's'}
      </div>

    </div>
  `;
}


/* ================= 37. EMPTY STATE ================= */

function renderEmptyListState(type) {

  const config = {

    drafts: {
      icon: '📝',
      title: 'No drafts yet',
      text: 'Create a post and save it as a draft to continue later.'
    },

    scheduled: {
      icon: '⏰',
      title: 'Nothing scheduled',
      text: 'Schedule a post and it will appear here.'
    },

    published: {
      icon: '✅',
      title: 'No published posts',
      text: 'Posts you publish will appear here.'
    }

  };

  const item =
    config[type] || config.drafts;

  return `
    <div style="
      text-align:center;
      padding:55px 25px;
      background:#15151f;
      border:1px dashed #2a2a3a;
      border-radius:18px;
    ">

      <div style="
        font-size:42px;
        margin-bottom:12px;
      ">
        ${item.icon}
      </div>

      <h3 style="
        color:#fff;
        margin:0 0 8px;
        font-size:18px;
      ">
        ${escapeHTML(item.title)}
      </h3>

      <p style="
        color:#6a708a;
        margin:0 auto 20px;
        max-width:420px;
        line-height:1.6;
        font-size:13px;
      ">
        ${escapeHTML(item.text)}
      </p>

      <button
        class="postx-create-from-list"
        type="button"
        style="
          background:#6c5ce7;
          border:none;
          color:#fff;
          padding:11px 18px;
          border-radius:10px;
          cursor:pointer;
          font-weight:700;
        "
      >
        + Create Post
      </button>

    </div>
  `;
}


/* ================= 38. STATUS BADGE ================= */

function renderStatusBadge(status) {

  const styles = {

    draft: {
      background:'#2a2a2a',
      color:'#d7d9e2'
    },

    scheduled: {
      background:'#2a2a4a',
      color:'#b9b5ff'
    },

    published: {
      background:'#183525',
      color:'#65e6a4'
    }

  };

  const style =
    styles[status] || styles.draft;

  return `
    <span style="
      display:inline-flex;
      align-items:center;
      padding:5px 10px;
      border-radius:20px;
      background:${style.background};
      color:${style.color};
      font-size:10px;
      font-weight:800;
      text-transform:uppercase;
      letter-spacing:.06em;
    ">
      ${escapeHTML(status)}
    </span>
  `;
}


/* ================= 39. PLATFORM BADGES ================= */

function renderPlatformBadges(platforms) {

  const ids = safeArray(platforms)
    .filter(id => PLATFORM_IDS.includes(id));

  if (!ids.length) {

    return `
      <span style="
        color:#6a708a;
        font-size:11px;
      ">
        No platform selected
      </span>
    `;
  }

  return ids.map(id => {

    const platform =
      PLATFORMS[id];

    return `
      <span style="
        display:inline-flex;
        align-items:center;
        padding:5px 9px;
        border-radius:20px;
        background:#1e1e2e;
        border:1px solid #2a2a3a;
        color:#aeb3c7;
        font-size:10px;
      ">
        ${escapeHTML(platform?.label || id)}
      </span>
    `;

  }).join('');
}


/* ================= 40. SINGLE LIST CARD ================= */

function renderListCard(post) {

  const scheduled =
    post.status === 'scheduled';

  const published =
    post.status === 'published';

  const dateText =
    scheduled
      ? `Scheduled: ${formatDate(post.scheduledAt)}`
      : published
        ? `Published: ${formatDate(post.publishedAt)}`
        : `Updated: ${formatDate(post.updatedAt)}`;

  return `
    <article
      class="post-card"
      data-id="${escapeHTML(post.id)}"
      style="
        background:#15151f;
        border:1px solid #2a2a3a;
        border-radius:16px;
        padding:18px;
        overflow:hidden;
      "
    >

      ${
        post.media
          ? `
            <div style="
              margin-bottom:14px;
              position:relative;
            ">
              <img
                src="${escapeHTML(post.media)}"
                alt="Post media"
                loading="lazy"
                style="
                  width:100%;
                  max-height:300px;
                  object-fit:cover;
                  border-radius:12px;
                  display:block;
                  background:#101018;
                "
                onerror="this.style.display='none'"
              >
            </div>
          `
          : ''
      }

      <div style="
        display:flex;
        align-items:center;
        gap:8px;
        flex-wrap:wrap;
        margin-bottom:12px;
      ">

        ${renderStatusBadge(post.status)}

        ${renderPlatformBadges(post.platforms)}

      </div>

      <div style="
        color:#fff;
        font-size:14px;
        line-height:1.6;
        white-space:pre-wrap;
        overflow-wrap:anywhere;
      ">
        ${escapeHTML(post.caption)}
      </div>

      ${
        post.hashtags
          ? `
            <div style="
              color:#8175ff;
              font-size:13px;
              margin-top:8px;
              overflow-wrap:anywhere;
            ">
              ${escapeHTML(post.hashtags)}
            </div>
          `
          : ''
      }

      <div style="
        color:#6a708a;
        font-size:11px;
        margin-top:12px;
      ">
        ${escapeHTML(dateText)}
      </div>

      <div style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:14px;
        padding-top:14px;
        border-top:1px solid #242433;
      ">

        <button
          class="btn-edit"
          data-id="${escapeHTML(post.id)}"
          type="button"
          style="
            background:#1e1e2e;
            border:1px solid #2a2a3a;
            color:#fff;
            padding:7px 13px;
            border-radius:9px;
            cursor:pointer;
          "
        >
          Edit
        </button>

        ${
          scheduled || post.status === 'draft'
            ? `
              <button
                class="btn-publish-now"
                data-id="${escapeHTML(post.id)}"
                type="button"
                style="
                  background:#6c5ce7;
                  border:none;
                  color:#fff;
                  padding:7px 13px;
                  border-radius:9px;
                  cursor:pointer;
                  font-weight:700;
                "
              >
                Publish Now
              </button>
            `
            : ''
        }

        <button
          class="btn-delete"
          data-id="${escapeHTML(post.id)}"
          type="button"
          style="
            background:#2a1a1a;
            border:1px solid #3a2a2a;
            color:#ff7777;
            padding:7px 13px;
            border-radius:9px;
            cursor:pointer;
          "
        >
          Delete
        </button>

      </div>

    </article>
  `;
}


/* ================= 41. RENDER LIST ================= */

function renderPostListPage({
  pageId,
  status,
  title,
  subtitle,
  searchId,
  searchPlaceholder
}) {

  const page =
    safeEl(pageId);

  if (!page) return;

  let posts =
    getPostsByStatus(status);

  posts =
    filterPosts(posts);

  page.innerHTML = `

    <div style="
      max-width:900px;
      margin:0 auto;
    ">

      ${renderListHeader(
        title,
        subtitle,
        posts.length
      )}

      ${renderListSearch(
        searchId,
        searchPlaceholder
      )}

      ${
        posts.length
          ? `
            <div style="
              display:grid;
              gap:14px;
            ">
              ${posts
                .map(renderListCard)
                .join('')}
            </div>
          `
          : renderEmptyListState(status)
      }

    </div>
  `;

  bindListSearch(searchId);
}


/* ================= 42. DRAFTS ================= */

function renderDrafts() {

  renderPostListPage({

    pageId:'drafts-page',

    status:'draft',

    title:'Drafts',

    subtitle:
      'Posts saved locally and ready to publish.',

    searchId:
      'drafts-search',

    searchPlaceholder:
      'Search drafts...'

  });
}


/* ================= 43. SCHEDULED ================= */

function renderScheduled() {

  renderPostListPage({

    pageId:'scheduled-page',

    status:'scheduled',

    title:'Scheduled',

    subtitle:
      'Posts waiting for their scheduled publishing time.',

    searchId:
      'scheduled-search',

    searchPlaceholder:
      'Search scheduled posts...'

  });
}


/* ================= 44. PUBLISHED ================= */

function renderPublished() {

  renderPostListPage({

    pageId:'published-page',

    status:'published',

    title:'Published',

    subtitle:
      'Posts that have been published in the local demo.',

    searchId:
      'published-search',

    searchPlaceholder:
      'Search published posts...'

  });
}


/* ================= 45. SEARCH BINDING ================= */

function bindListSearch(inputId) {

  const input =
    safeEl(inputId);

  if (input) {

    input.addEventListener(
      'input',
      e => {

        state.searchQuery =
          e.target.value;

        const page =
          state.activePage;

        if (page === 'drafts') {
          renderDrafts();
        }

        else if (page === 'scheduled') {
          renderScheduled();
        }

        else if (page === 'published') {
          renderPublished();
        }

      }
    );

    input.addEventListener(
      'keydown',
      e => {

        if (e.key === 'Escape') {

          state.searchQuery = '';

          input.value = '';

          render();
        }
      }
    );
  }


  /*
   * Clear search
   */

  $$('.clear-list-search').forEach(button => {

    button.addEventListener(
      'click',
      () => {

        state.searchQuery = '';

        render();
      }
    );

  });


  /*
   * Create from empty state
   */

  $$('.postx-create-from-list').forEach(button => {

    button.addEventListener(
      'click',
      () => {

        resetComposer();

        navigate('create');
      }
    );

  });
}


/* ================= 46. AUTO-REFRESH SCHEDULED LIST ================= */

let scheduledRefreshTimer = null;

function startScheduledRefresh() {

  if (scheduledRefreshTimer) {
    clearInterval(
      scheduledRefreshTimer
    );
  }

  scheduledRefreshTimer =
    setInterval(() => {

      /*
       * This does NOT call a real API.
       *
       * It simply refreshes the Scheduled UI so
       * date/time information remains current.
       */

      if (
        state.activePage === 'scheduled'
      ) {
        renderScheduled();
      }

    }, 30000);
}


/* ================= 47. LIST ENGINE INIT ================= */

function initPostLists() {

  startScheduledRefresh();

  /*
   * Part 4 already provides the global
   * .btn-edit / .btn-delete /
   * .btn-publish-now handlers.
   *
   * This prevents duplicate event listeners.
   */

  console.log(
    '[PostX] Part 5 — Post Lists Engine ready'
  );
}


/* ================= 48. START PART 5 ================= */

initPostLists();

/* ================= 6. POST ACTIONS ENGINE ================= */

/*
 * PostX v2.0
 * Handles:
 * - Create/update posts
 * - Save drafts
 * - Schedule posts
 * - Publish immediately
 * - Publish scheduled posts
 * - Edit posts
 * - Delete posts
 * - Safe confirmation dialogs
 */

/* ---------- Composer Helpers ---------- */

function getComposerData() {
  return {
    caption: String($('#composer-caption')?.value || state.composer?.caption || '').trim(),
    hashtags: String($('#composer-hashtags')?.value || state.composer?.hashtags || '').trim(),
    media: String(state.composer?.media || ''),
    platforms: Array.isArray(state.composer?.platforms)
      ? [...new Set(state.composer.platforms.filter(id => PLATFORM_IDS.includes(id)))]
      : [],
    scheduledAt: String($('#composer-schedule')?.value || state.composer?.scheduledAt || '').trim()
  };
}

function resetComposer() {
  state.editingPostId = null;

  state.composer = {
    caption: '',
    hashtags: '',
    media: '',
    platforms: [],
    scheduledAt: ''
  };
}

/* ---------- Validation ---------- */

function validatePostData(data, mode = 'draft') {
  if (!data.caption) {
    showToast('Please add a caption.', 'warning');
    return false;
  }

  if (!data.platforms.length) {
    showToast('Please select at least one platform.', 'warning');
    return false;
  }

  if (mode === 'scheduled') {
    if (!data.scheduledAt) {
      showToast('Please select a schedule date and time.', 'warning');
      return false;
    }

    const scheduledTime = new Date(data.scheduledAt);

    if (isNaN(scheduledTime.getTime())) {
      showToast('Invalid schedule date and time.', 'error');
      return false;
    }

    if (scheduledTime.getTime() <= Date.now()) {
      showToast('Schedule time must be in the future.', 'warning');
      return false;
    }
  }

  return true;
}

/* ---------- Create / Update ---------- */

function createOrUpdatePost(status = 'draft') {
  const data = getComposerData();

  if (!validatePostData(data, status)) return null;

  const now = nowISO();

  if (state.editingPostId) {
    const index = state.posts.findIndex(
      p => p.id === state.editingPostId
    );

    if (index === -1) {
      showToast('The post being edited no longer exists.', 'error');
      resetComposer();
      return null;
    }

    const existing = state.posts[index];

    const updatedPost = normalizePost({
      ...existing,
      caption: data.caption,
      hashtags: data.hashtags,
      media: data.media,
      platforms: data.platforms,
      status,
      updatedAt: now,
      scheduledAt: status === 'scheduled'
        ? new Date(data.scheduledAt).toISOString()
        : null,
      publishedAt: status === 'published'
        ? now
        : null
    });

    state.posts[index] = updatedPost;

    saveState();
    return updatedPost;
  }

  const post = normalizePost({
    id: uid(),
    caption: data.caption,
    hashtags: data.hashtags,
    media: data.media,
    platforms: data.platforms,
    status,
    createdAt: now,
    updatedAt: now,
    scheduledAt: status === 'scheduled'
      ? new Date(data.scheduledAt).toISOString()
      : null,
    publishedAt: status === 'published'
      ? now
      : null
  });

  if (!post) {
    showToast('Unable to create post.', 'error');
    return null;
  }

  state.posts.unshift(post);

  saveState();
  return post;
}

/* ---------- Save Draft ---------- */

function handleSaveDraft() {
  const post = createOrUpdatePost('draft');

  if (!post) return;

  resetComposer();
  showToast('Draft saved successfully.', 'success');

  navigate('drafts');
}

/* ---------- Schedule ---------- */

function handleSchedulePost() {
  const post = createOrUpdatePost('scheduled');

  if (!post) return;

  resetComposer();
  showToast(`Post scheduled for ${formatDate(post.scheduledAt)}.`, 'success');

  navigate('scheduled');
}

/* ---------- Publish Immediately ---------- */

function handlePublishPost() {
  const data = getComposerData();

  if (!validatePostData(data, 'publish')) return;

  openModal({
    title: 'Publish this post now?',
    body: `
      <div style="margin-bottom:8px;">
        Your post will be moved to the <strong style="color:#fff;">Published</strong> list.
      </div>
      <div style="color:#6c5ce7;">
        ${escapeHTML(data.platforms.map(
          id => PLATFORMS[id]?.label || id
        ).join(' • '))}
      </div>
    `,
    actions: [
      {
        label: 'Cancel',
        variant: 'secondary',
        close: true
      },
      {
        label: 'Publish Now',
        variant: 'primary',
        close: true,
        onClick: () => {
          const post = createOrUpdatePost('published');

          if (!post) return;

          resetComposer();

          showToast(
            'Post published successfully.',
            'success'
          );

          navigate('published');
        }
      }
    ]
  });
}

/* ---------- Publish Existing Post ---------- */

function publishPostById(postId) {
  const post = state.posts.find(p => p.id === postId);

  if (!post) {
    showToast('Post not found.', 'error');
    return;
  }

  if (post.status === 'published') {
    showToast('This post is already published.', 'info');
    return;
  }

  openModal({
    title: 'Publish this post now?',
    body: `
      <div style="color:#9aa0b4;">
        This will move the post from
        <strong style="color:#fff;">
          ${escapeHTML(post.status)}
        </strong>
        to
        <strong style="color:#fff;">
          Published
        </strong>.
      </div>
    `,
    actions: [
      {
        label: 'Cancel',
        variant: 'secondary'
      },
      {
        label: 'Publish Now',
        variant: 'primary',
        onClick: () => {
          const now = nowISO();

          post.status = 'published';
          post.publishedAt = now;
          post.scheduledAt = null;
          post.updatedAt = now;

          saveState();

          showToast(
            'Post published successfully.',
            'success'
          );

          render();
        }
      }
    ]
  });
}

/* ---------- Edit Post ---------- */

function editPostById(postId) {
  const post = state.posts.find(p => p.id === postId);

  if (!post) {
    showToast('Post not found.', 'error');
    return;
  }

  state.editingPostId = post.id;

  state.composer = {
    caption: post.caption || '',
    hashtags: post.hashtags || '',
    media: post.media || '',
    platforms: Array.isArray(post.platforms)
      ? [...post.platforms]
      : [],
    scheduledAt: post.scheduledAt
      ? toLocalDateTimeInput(post.scheduledAt)
      : ''
  };

  navigate('create');
}

/* ---------- Local DateTime Conversion ---------- */

function toLocalDateTimeInput(iso) {
  if (!iso || !isValidDateString(iso)) return '';

  const d = new Date(iso);

  const pad = n => String(n).padStart(2, '0');

  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate())
  ].join('-') + 'T' +
  [
    pad(d.getHours()),
    pad(d.getMinutes())
  ].join(':');
}

/* ---------- Delete Post ---------- */

function deletePostById(postId) {
  const post = state.posts.find(p => p.id === postId);

  if (!post) {
    showToast('Post not found.', 'error');
    return;
  }

  openModal({
    title: 'Delete this post?',
    body: `
      <div style="color:#9aa0b4;">
        This action cannot be undone.
      </div>
      <div style="margin-top:10px;color:#fff;">
        ${escapeHTML(
          post.caption.length > 120
            ? post.caption.slice(0, 120) + '…'
            : post.caption
        )}
      </div>
    `,
    actions: [
      {
        label: 'Cancel',
        variant: 'secondary'
      },
      {
        label: 'Delete',
        variant: 'danger',
        onClick: () => {
          state.posts = state.posts.filter(
            p => p.id !== postId
          );

          if (state.editingPostId === postId) {
            resetComposer();
          }

          saveState();

          showToast(
            'Post deleted.',
            'success'
          );

          render();
        }
      }
    ]
  });
}

/* ---------- Event Binding ---------- */

function bindPostActionEvents() {
  if (window.__POSTX_POST_ACTIONS_BOUND) return;
  window.__POSTX_POST_ACTIONS_BOUND = true;

  document.addEventListener('click', e => {

    const editBtn = e.target.closest('.btn-edit');

    if (editBtn) {
      e.preventDefault();

      const id = editBtn.dataset.id;

      if (id) {
        editPostById(id);
      }

      return;
    }

    const publishBtn = e.target.closest('.btn-publish-now');

    if (publishBtn) {
      e.preventDefault();

      const id = publishBtn.dataset.id;

      if (id) {
        publishPostById(id);
      }

      return;
    }

    const deleteBtn = e.target.closest('.btn-delete');

    if (deleteBtn) {
      e.preventDefault();

      const id = deleteBtn.dataset.id;

      if (id) {
        deletePostById(id);
      }

      return;
    }
  });
}

/* ---------- Compatibility Aliases ---------- */

function handleSave(mode = 'draft') {
  if (mode === 'scheduled') {
    handleSchedulePost();
    return;
  }

  handleSaveDraft();
}

function handlePublishConfirm() {
  handlePublishPost();
}

/* ================= 7. CALENDAR ENGINE ================= */

/*
 * PostX v2.0
 * Calendar functionality:
 * - Monthly calendar
 * - Scheduled post indicators
 * - Date selection
 * - Previous / next month
 * - Today button
 * - Scheduled posts for selected date
 * - Safe rendering
 */

/* ---------- Calendar Helpers ---------- */

function getCalendarDate() {
  if (!(state.calendarDate instanceof Date) || isNaN(state.calendarDate.getTime())) {
    state.calendarDate = new Date();
  }

  return state.calendarDate;
}

function calendarKey(date) {
  const d = new Date(date);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

function getPostsForCalendarDate(date) {
  const key = calendarKey(date);

  return state.posts.filter(post => {
    if (post.status !== 'scheduled' || !post.scheduledAt) {
      return false;
    }

    return calendarKey(new Date(post.scheduledAt)) === key;
  });
}

function getMonthName(date) {
  return date.toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric'
  });
}

/* ---------- Calendar Navigation ---------- */

function changeCalendarMonth(offset) {
  const current = getCalendarDate();

  state.calendarDate = new Date(
    current.getFullYear(),
    current.getMonth() + offset,
    1
  );

  state.selectedCalendarDate = null;

  renderCalendar();
}

function goToCalendarToday() {
  const today = new Date();

  state.calendarDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  state.selectedCalendarDate = calendarKey(today);

  renderCalendar();
}

function selectCalendarDate(date) {
  state.selectedCalendarDate = calendarKey(date);
  renderCalendar();
}

/* ---------- Calendar Grid ---------- */

function buildCalendarDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  /*
   * Convert Sunday = 0 into Monday = 0
   * so the calendar starts on Monday.
   */
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const previousMonthLastDay = new Date(
    year,
    month,
    0
  ).getDate();

  const cells = [];

  /* Previous month filler days */
  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({
      day: previousMonthLastDay - i,
      currentMonth: false,
      date: new Date(
        year,
        month - 1,
        previousMonthLastDay - i
      )
    });
  }

  /* Current month */
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      currentMonth: true,
      date: new Date(year, month, day)
    });
  }

  /* Next month filler */
  let nextDay = 1;

  while (cells.length % 7 !== 0) {
    cells.push({
      day: nextDay,
      currentMonth: false,
      date: new Date(year, month + 1, nextDay)
    });

    nextDay++;
  }

  return cells;
}

/* ---------- Calendar Rendering ---------- */

function renderCalendar() {
  const page = safeEl('calendar-page');

  if (!page) return;

  const calendarDate = getCalendarDate();
  const todayKey = calendarKey(new Date());

  const selectedKey =
    state.selectedCalendarDate || todayKey;

  const cells = buildCalendarDays(calendarDate);

  page.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        flex-wrap:wrap;
        margin-bottom:18px;
      ">

        <div>
          <h2 style="
            margin:0;
            color:#fff;
            font-size:24px;
          ">
            Content Calendar
          </h2>

          <div style="
            color:#6a708a;
            font-size:13px;
            margin-top:4px;
          ">
            Manage your scheduled posts
          </div>
        </div>

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        ">

          <button
            id="calendar-prev"
            style="
              background:#1a1a24;
              border:1px solid #2a2a3a;
              color:#fff;
              padding:9px 13px;
              border-radius:10px;
              cursor:pointer;
            "
          >
            ←
          </button>

          <button
            id="calendar-today"
            style="
              background:#6c5ce7;
              border:none;
              color:#fff;
              padding:9px 15px;
              border-radius:10px;
              cursor:pointer;
              font-weight:600;
            "
          >
            Today
          </button>

          <button
            id="calendar-next"
            style="
              background:#1a1a24;
              border:1px solid #2a2a3a;
              color:#fff;
              padding:9px 13px;
              border-radius:10px;
              cursor:pointer;
            "
          >
            →
          </button>

        </div>
      </div>

      <div style="
        background:#15151f;
        border:1px solid #2a2a3a;
        border-radius:18px;
        overflow:hidden;
      ">

        <div style="
          display:flex;
          justify-content:center;
          align-items:center;
          padding:18px;
          border-bottom:1px solid #2a2a3a;
        ">
          <h3 style="
            margin:0;
            color:#fff;
            font-size:18px;
          ">
            ${escapeHTML(getMonthName(calendarDate))}
          </h3>
        </div>

        <div style="
          display:grid;
          grid-template-columns:repeat(7,1fr);
          border-bottom:1px solid #2a2a3a;
        ">
          ${[
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
            'Sun'
          ].map(day => `
            <div style="
              padding:10px 4px;
              text-align:center;
              color:#6a708a;
              font-size:11px;
              font-weight:700;
              text-transform:uppercase;
            ">
              ${day}
            </div>
          `).join('')}
        </div>

        <div
          id="calendar-grid"
          style="
            display:grid;
            grid-template-columns:repeat(7,1fr);
          "
        >

          ${cells.map(cell => {

            const key = calendarKey(cell.date);
            const posts = getPostsForCalendarDate(cell.date);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;

            return `
              <button
                class="calendar-day"
                data-date="${key}"
                style="
                  min-height:90px;
                  border:0;
                  border-right:1px solid #242432;
                  border-bottom:1px solid #242432;
                  background:${isSelected ? '#211c3d' : '#15151f'};
                  color:${cell.currentMonth ? '#fff' : '#4f5368'};
                  padding:8px;
                  text-align:left;
                  cursor:pointer;
                  position:relative;
                "
              >

                <div style="
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  margin-bottom:5px;
                ">

                  <span style="
                    width:26px;
                    height:26px;
                    border-radius:50%;
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    background:${isToday ? '#6c5ce7' : 'transparent'};
                    color:#fff;
                    font-size:12px;
                    font-weight:${isToday ? '800' : '500'};
                  ">
                    ${cell.day}
                  </span>

                  ${posts.length ? `
                    <span style="
                      background:#6c5ce7;
                      color:#fff;
                      min-width:20px;
                      height:20px;
                      border-radius:10px;
                      display:inline-flex;
                      align-items:center;
                      justify-content:center;
                      font-size:10px;
                      font-weight:700;
                    ">
                      ${posts.length}
                    </span>
                  ` : ''}

                </div>

                ${posts.slice(0,2).map(post => `
                  <div style="
                    background:#1e1e2e;
                    border-left:3px solid #6c5ce7;
                    padding:5px 6px;
                    margin-top:4px;
                    border-radius:5px;
                    overflow:hidden;
                  ">
                    <div style="
                      color:#fff;
                      font-size:10px;
                      white-space:nowrap;
                      overflow:hidden;
                      text-overflow:ellipsis;
                    ">
                      ${escapeHTML(post.caption || 'Untitled post')}
                    </div>

                    <div style="
                      color:#6a708a;
                      font-size:9px;
                      margin-top:2px;
                    ">
                      ${formatDate(post.scheduledAt)}
                    </div>
                  </div>
                `).join('')}

                ${posts.length > 2 ? `
                  <div style="
                    color:#6c5ce7;
                    font-size:9px;
                    margin-top:4px;
                  ">
                    +${posts.length - 2} more
                  </div>
                ` : ''}

              </button>
            `;
          }).join('')}

        </div>
      </div>

      <div
        id="calendar-selected-posts"
        style="margin-top:18px;"
      >
        ${renderSelectedCalendarPosts(selectedKey)}
      </div>

    </div>
  `;

  bindCalendarEvents();
}

/* ---------- Selected Date Posts ---------- */

function renderSelectedCalendarPosts(dateKey) {
  const posts = state.posts.filter(post => {
    if (post.status !== 'scheduled' || !post.scheduledAt) {
      return false;
    }

    return calendarKey(new Date(post.scheduledAt)) === dateKey;
  });

  const date = new Date(`${dateKey}T00:00:00`);

  if (!posts.length) {
    return `
      <div style="
        background:#15151f;
        border:1px dashed #2a2a3a;
        border-radius:16px;
        padding:24px;
        text-align:center;
        color:#6a708a;
      ">
        No scheduled posts for
        <strong style="color:#fff;">
          ${escapeHTML(
            date.toLocaleDateString('en-KE', {
              weekday:'long',
              month:'long',
              day:'numeric',
              year:'numeric'
            })
          )}
        </strong>.
      </div>
    `;
  }

  return `
    <div style="
      background:#15151f;
      border:1px solid #2a2a3a;
      border-radius:16px;
      padding:18px;
    ">

      <h3 style="
        margin:0 0 14px;
        color:#fff;
        font-size:16px;
      ">
        Scheduled Posts
      </h3>

      <div style="
        display:grid;
        gap:12px;
      ">
        ${posts.map(post => `
          <div style="
            background:#1a1a24;
            border:1px solid #2a2a3a;
            border-radius:12px;
            padding:14px;
          ">

            <div style="
              display:flex;
              justify-content:space-between;
              gap:10px;
              flex-wrap:wrap;
            ">

              <div style="flex:1;min-width:200px;">

                <div style="
                  color:#fff;
                  font-size:14px;
                  line-height:1.5;
                  white-space:pre-wrap;
                ">
                  ${escapeHTML(post.caption)}
                </div>

                ${post.hashtags ? `
                  <div style="
                    color:#6c5ce7;
                    font-size:12px;
                    margin-top:5px;
                  ">
                    ${escapeHTML(post.hashtags)}
                  </div>
                ` : ''}

                <div style="
                  color:#6a708a;
                  font-size:11px;
                  margin-top:8px;
                ">
                  Scheduled:
                  ${formatDate(post.scheduledAt)}
                </div>

              </div>

              <div style="
                display:flex;
                gap:7px;
                align-items:flex-start;
                flex-wrap:wrap;
              ">

                <button
                  class="btn-edit"
                  data-id="${escapeHTML(post.id)}"
                  style="
                    background:#1e1e2e;
                    border:1px solid #2a2a3a;
                    color:#fff;
                    padding:7px 11px;
                    border-radius:8px;
                    cursor:pointer;
                  "
                >
                  Edit
                </button>

                <button
                  class="btn-publish-now"
                  data-id="${escapeHTML(post.id)}"
                  style="
                    background:#6c5ce7;
                    border:none;
                    color:#fff;
                    padding:7px 11px;
                    border-radius:8px;
                    cursor:pointer;
                  "
                >
                  Publish Now
                </button>

                <button
                  class="btn-delete"
                  data-id="${escapeHTML(post.id)}"
                  style="
                    background:#2a1a1a;
                    border:1px solid #3a2a2a;
                    color:#ff6b6b;
                    padding:7px 11px;
                    border-radius:8px;
                    cursor:pointer;
                  "
                >
                  Delete
                </button>

              </div>

            </div>

          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ---------- Calendar Events ---------- */

function bindCalendarEvents() {
  if (window.__POSTX_CALENDAR_BOUND) {
    return;
  }

  window.__POSTX_CALENDAR_BOUND = true;

  document.addEventListener('click', e => {

    const day = e.target.closest('.calendar-day');

    if (day) {
      const dateKey = day.dataset.date;

      if (dateKey) {
        selectCalendarDate(
          new Date(`${dateKey}T00:00:00`)
        );
      }

      return;
    }

    const prev = e.target.closest('#calendar-prev');

    if (prev) {
      changeCalendarMonth(-1);
      return;
    }

    const next = e.target.closest('#calendar-next');

    if (next) {
      changeCalendarMonth(1);
      return;
    }

    const today = e.target.closest('#calendar-today');

    if (today) {
      goToCalendarToday();
      return;
    }
  });
}

/* ---------- Calendar Initialization ---------- */

function initializeCalendarState() {
  if (!(state.calendarDate instanceof Date)) {
    state.calendarDate = new Date();
  }

  if (isNaN(state.calendarDate.getTime())) {
    state.calendarDate = new Date();
  }

  if (!state.selectedCalendarDate) {
    state.selectedCalendarDate = calendarKey(new Date());
  }
}

/* ================= 7. CALENDAR ENGINE ================= */

/*
 * PostX v2.0
 * Calendar functionality:
 * - Monthly calendar
 * - Scheduled post indicators
 * - Date selection
 * - Previous / next month
 * - Today button
 * - Scheduled posts for selected date
 * - Safe rendering
 */

/* ---------- Calendar Helpers ---------- */

function getCalendarDate() {
  if (!(state.calendarDate instanceof Date) || isNaN(state.calendarDate.getTime())) {
    state.calendarDate = new Date();
  }

  return state.calendarDate;
}

function calendarKey(date) {
  const d = new Date(date);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

function getPostsForCalendarDate(date) {
  const key = calendarKey(date);

  return state.posts.filter(post => {
    if (post.status !== 'scheduled' || !post.scheduledAt) {
      return false;
    }

    return calendarKey(new Date(post.scheduledAt)) === key;
  });
}

function getMonthName(date) {
  return date.toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric'
  });
}

/* ---------- Calendar Navigation ---------- */

function changeCalendarMonth(offset) {
  const current = getCalendarDate();

  state.calendarDate = new Date(
    current.getFullYear(),
    current.getMonth() + offset,
    1
  );

  state.selectedCalendarDate = null;

  renderCalendar();
}

function goToCalendarToday() {
  const today = new Date();

  state.calendarDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  state.selectedCalendarDate = calendarKey(today);

  renderCalendar();
}

function selectCalendarDate(date) {
  state.selectedCalendarDate = calendarKey(date);
  renderCalendar();
}

/* ---------- Calendar Grid ---------- */

function buildCalendarDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  /*
   * Convert Sunday = 0 into Monday = 0
   * so the calendar starts on Monday.
   */
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const previousMonthLastDay = new Date(
    year,
    month,
    0
  ).getDate();

  const cells = [];

  /* Previous month filler days */
  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({
      day: previousMonthLastDay - i,
      currentMonth: false,
      date: new Date(
        year,
        month - 1,
        previousMonthLastDay - i
      )
    });
  }

  /* Current month */
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      currentMonth: true,
      date: new Date(year, month, day)
    });
  }

  /* Next month filler */
  let nextDay = 1;

  while (cells.length % 7 !== 0) {
    cells.push({
      day: nextDay,
      currentMonth: false,
      date: new Date(year, month + 1, nextDay)
    });

    nextDay++;
  }

  return cells;
}

/* ---------- Calendar Rendering ---------- */

function renderCalendar() {
  const page = safeEl('calendar-page');

  if (!page) return;

  const calendarDate = getCalendarDate();
  const todayKey = calendarKey(new Date());

  const selectedKey =
    state.selectedCalendarDate || todayKey;

  const cells = buildCalendarDays(calendarDate);

  page.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        flex-wrap:wrap;
        margin-bottom:18px;
      ">

        <div>
          <h2 style="
            margin:0;
            color:#fff;
            font-size:24px;
          ">
            Content Calendar
          </h2>

          <div style="
            color:#6a708a;
            font-size:13px;
            margin-top:4px;
          ">
            Manage your scheduled posts
          </div>
        </div>

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        ">

          <button
            id="calendar-prev"
            style="
              background:#1a1a24;
              border:1px solid #2a2a3a;
              color:#fff;
              padding:9px 13px;
              border-radius:10px;
              cursor:pointer;
            "
          >
            ←
          </button>

          <button
            id="calendar-today"
            style="
              background:#6c5ce7;
              border:none;
              color:#fff;
              padding:9px 15px;
              border-radius:10px;
              cursor:pointer;
              font-weight:600;
            "
          >
            Today
          </button>

          <button
            id="calendar-next"
            style="
              background:#1a1a24;
              border:1px solid #2a2a3a;
              color:#fff;
              padding:9px 13px;
              border-radius:10px;
              cursor:pointer;
            "
          >
            →
          </button>

        </div>
      </div>

      <div style="
        background:#15151f;
        border:1px solid #2a2a3a;
        border-radius:18px;
        overflow:hidden;
      ">

        <div style="
          display:flex;
          justify-content:center;
          align-items:center;
          padding:18px;
          border-bottom:1px solid #2a2a3a;
        ">
          <h3 style="
            margin:0;
            color:#fff;
            font-size:18px;
          ">
            ${escapeHTML(getMonthName(calendarDate))}
          </h3>
        </div>

        <div style="
          display:grid;
          grid-template-columns:repeat(7,1fr);
          border-bottom:1px solid #2a2a3a;
        ">
          ${[
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
            'Sun'
          ].map(day => `
            <div style="
              padding:10px 4px;
              text-align:center;
              color:#6a708a;
              font-size:11px;
              font-weight:700;
              text-transform:uppercase;
            ">
              ${day}
            </div>
          `).join('')}
        </div>

        <div
          id="calendar-grid"
          style="
            display:grid;
            grid-template-columns:repeat(7,1fr);
          "
        >

          ${cells.map(cell => {

            const key = calendarKey(cell.date);
            const posts = getPostsForCalendarDate(cell.date);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;

            return `
              <button
                class="calendar-day"
                data-date="${key}"
                style="
                  min-height:90px;
                  border:0;
                  border-right:1px solid #242432;
                  border-bottom:1px solid #242432;
                  background:${isSelected ? '#211c3d' : '#15151f'};
                  color:${cell.currentMonth ? '#fff' : '#4f5368'};
                  padding:8px;
                  text-align:left;
                  cursor:pointer;
                  position:relative;
                "
              >

                <div style="
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  margin-bottom:5px;
                ">

                  <span style="
                    width:26px;
                    height:26px;
                    border-radius:50%;
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    background:${isToday ? '#6c5ce7' : 'transparent'};
                    color:#fff;
                    font-size:12px;
                    font-weight:${isToday ? '800' : '500'};
                  ">
                    ${cell.day}
                  </span>

                  ${posts.length ? `
                    <span style="
                      background:#6c5ce7;
                      color:#fff;
                      min-width:20px;
                      height:20px;
                      border-radius:10px;
                      display:inline-flex;
                      align-items:center;
                      justify-content:center;
                      font-size:10px;
                      font-weight:700;
                    ">
                      ${posts.length}
                    </span>
                  ` : ''}

                </div>

                ${posts.slice(0,2).map(post => `
                  <div style="
                    background:#1e1e2e;
                    border-left:3px solid #6c5ce7;
                    padding:5px 6px;
                    margin-top:4px;
                    border-radius:5px;
                    overflow:hidden;
                  ">
                    <div style="
                      color:#fff;
                      font-size:10px;
                      white-space:nowrap;
                      overflow:hidden;
                      text-overflow:ellipsis;
                    ">
                      ${escapeHTML(post.caption || 'Untitled post')}
                    </div>

                    <div style="
                      color:#6a708a;
                      font-size:9px;
                      margin-top:2px;
                    ">
                      ${formatDate(post.scheduledAt)}
                    </div>
                  </div>
                `).join('')}

                ${posts.length > 2 ? `
                  <div style="
                    color:#6c5ce7;
                    font-size:9px;
                    margin-top:4px;
                  ">
                    +${posts.length - 2} more
                  </div>
                ` : ''}

              </button>
            `;
          }).join('')}

        </div>
      </div>

      <div
        id="calendar-selected-posts"
        style="margin-top:18px;"
      >
        ${renderSelectedCalendarPosts(selectedKey)}
      </div>

    </div>
  `;

  bindCalendarEvents();
}

/* ---------- Selected Date Posts ---------- */

function renderSelectedCalendarPosts(dateKey) {
  const posts = state.posts.filter(post => {
    if (post.status !== 'scheduled' || !post.scheduledAt) {
      return false;
    }

    return calendarKey(new Date(post.scheduledAt)) === dateKey;
  });

  const date = new Date(`${dateKey}T00:00:00`);

  if (!posts.length) {
    return `
      <div style="
        background:#15151f;
        border:1px dashed #2a2a3a;
        border-radius:16px;
        padding:24px;
        text-align:center;
        color:#6a708a;
      ">
        No scheduled posts for
        <strong style="color:#fff;">
          ${escapeHTML(
            date.toLocaleDateString('en-KE', {
              weekday:'long',
              month:'long',
              day:'numeric',
              year:'numeric'
            })
          )}
        </strong>.
      </div>
    `;
  }

  return `
    <div style="
      background:#15151f;
      border:1px solid #2a2a3a;
      border-radius:16px;
      padding:18px;
    ">

      <h3 style="
        margin:0 0 14px;
        color:#fff;
        font-size:16px;
      ">
        Scheduled Posts
      </h3>

      <div style="
        display:grid;
        gap:12px;
      ">
        ${posts.map(post => `
          <div style="
            background:#1a1a24;
            border:1px solid #2a2a3a;
            border-radius:12px;
            padding:14px;
          ">

            <div style="
              display:flex;
              justify-content:space-between;
              gap:10px;
              flex-wrap:wrap;
            ">

              <div style="flex:1;min-width:200px;">

                <div style="
                  color:#fff;
                  font-size:14px;
                  line-height:1.5;
                  white-space:pre-wrap;
                ">
                  ${escapeHTML(post.caption)}
                </div>

                ${post.hashtags ? `
                  <div style="
                    color:#6c5ce7;
                    font-size:12px;
                    margin-top:5px;
                  ">
                    ${escapeHTML(post.hashtags)}
                  </div>
                ` : ''}

                <div style="
                  color:#6a708a;
                  font-size:11px;
                  margin-top:8px;
                ">
                  Scheduled:
                  ${formatDate(post.scheduledAt)}
                </div>

              </div>

              <div style="
                display:flex;
                gap:7px;
                align-items:flex-start;
                flex-wrap:wrap;
              ">

                <button
                  class="btn-edit"
                  data-id="${escapeHTML(post.id)}"
                  style="
                    background:#1e1e2e;
                    border:1px solid #2a2a3a;
                    color:#fff;
                    padding:7px 11px;
                    border-radius:8px;
                    cursor:pointer;
                  "
                >
                  Edit
                </button>

                <button
                  class="btn-publish-now"
                  data-id="${escapeHTML(post.id)}"
                  style="
                    background:#6c5ce7;
                    border:none;
                    color:#fff;
                    padding:7px 11px;
                    border-radius:8px;
                    cursor:pointer;
                  "
                >
                  Publish Now
                </button>

                <button
                  class="btn-delete"
                  data-id="${escapeHTML(post.id)}"
                  style="
                    background:#2a1a1a;
                    border:1px solid #3a2a2a;
                    color:#ff6b6b;
                    padding:7px 11px;
                    border-radius:8px;
                    cursor:pointer;
                  "
                >
                  Delete
                </button>

              </div>

            </div>

          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ---------- Calendar Events ---------- */

function bindCalendarEvents() {
  if (window.__POSTX_CALENDAR_BOUND) {
    return;
  }

  window.__POSTX_CALENDAR_BOUND = true;

  document.addEventListener('click', e => {

    const day = e.target.closest('.calendar-day');

    if (day) {
      const dateKey = day.dataset.date;

      if (dateKey) {
        selectCalendarDate(
          new Date(`${dateKey}T00:00:00`)
        );
      }

      return;
    }

    const prev = e.target.closest('#calendar-prev');

    if (prev) {
      changeCalendarMonth(-1);
      return;
    }

    const next = e.target.closest('#calendar-next');

    if (next) {
      changeCalendarMonth(1);
      return;
    }

    const today = e.target.closest('#calendar-today');

    if (today) {
      goToCalendarToday();
      return;
    }
  });
}

/* ---------- Calendar Initialization ---------- */

function initializeCalendarState() {
  if (!(state.calendarDate instanceof Date)) {
    state.calendarDate = new Date();
  }

  if (isNaN(state.calendarDate.getTime())) {
    state.calendarDate = new Date();
  }

  if (!state.selectedCalendarDate) {
    state.selectedCalendarDate = calendarKey(new Date());
  }
}

/* =========================================================
   POSTX v2.0 — PART 9
   CALENDAR ENGINE
   ========================================================= */

const CALENDAR = {
  initialized: false
};

/* ================= 9.1 CALENDAR HELPERS ================= */

function initializeCalendar() {
  if (!(state.calendarDate instanceof Date) ||
      isNaN(state.calendarDate.getTime())) {
    state.calendarDate = new Date();
  }

  if (!('selectedCalendarDate' in state)) {
    state.selectedCalendarDate = null;
  }
}

function getCalendarDate(post) {
  if (!post || typeof post !== 'object') return null;

  const value =
    post.scheduledAt ||
    post.publishedAt ||
    post.createdAt;

  if (!value || !isValidDateString(value)) return null;

  const date = new Date(value);

  return isNaN(date.getTime()) ? null : date;
}

function getCalendarPosts(year, month) {
  return safeArray(state.posts).filter(post => {
    const date = getCalendarDate(post);

    if (!date) return false;

    return (
      date.getFullYear() === year &&
      date.getMonth() === month
    );
  });
}

function getCalendarDayPosts(year, month, day) {
  return getCalendarPosts(year, month).filter(post => {
    const date = getCalendarDate(post);

    return date && date.getDate() === day;
  });
}

function getCalendarMonthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric'
  });
}

function isCalendarToday(year, month, day) {
  const today = new Date();

  return (
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
  );
}

/* ================= 9.2 CALENDAR RENDER ================= */

function renderCalendar() {
  try {
    const page =
      safeEl('calendar-page') ||
      $('[data-page-content="calendar"]');

    if (!page) return;

    initializeCalendar();

    const current = state.calendarDate;

    const year = current.getFullYear();
    const month = current.getMonth();

    const firstDay =
      new Date(year, month, 1).getDay();

    const daysInMonth =
      new Date(year, month + 1, 0).getDate();

    const monthPosts =
      getCalendarPosts(year, month);

    let html = `
      <div class="postx-calendar">

        <!-- HEADER -->
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
          margin-bottom:20px;
        ">

          <div>
            <h2 style="
              margin:0;
              color:#fff;
              font-size:22px;
              font-weight:800;
            ">
              Content Calendar
            </h2>

            <div style="
              color:#6a708a;
              font-size:12px;
              margin-top:5px;
            ">
              ${monthPosts.length}
              post${monthPosts.length === 1 ? '' : 's'}
              this month
            </div>
          </div>

          <div style="
            display:flex;
            align-items:center;
            gap:8px;
          ">

            <button
              type="button"
              class="calendar-control"
              data-calendar-action="previous"
              aria-label="Previous month"
              style="
                width:40px;
                height:40px;
                border-radius:10px;
                border:1px solid #2a2a3a;
                background:#1a1a24;
                color:#fff;
                cursor:pointer;
                font-size:20px;
              "
            >
              ‹
            </button>

            <button
              type="button"
              class="calendar-control"
              data-calendar-action="today"
              style="
                padding:10px 14px;
                border-radius:10px;
                border:1px solid #2a2a3a;
                background:#1e1e2e;
                color:#fff;
                cursor:pointer;
                font-weight:600;
              "
            >
              Today
            </button>

            <button
              type="button"
              class="calendar-control"
              data-calendar-action="next"
              aria-label="Next month"
              style="
                width:40px;
                height:40px;
                border-radius:10px;
                border:1px solid #2a2a3a;
                background:#1a1a24;
                color:#fff;
                cursor:pointer;
                font-size:20px;
              "
            >
              ›
            </button>

          </div>
        </div>

        <!-- MONTH TITLE -->
        <div style="
          color:#fff;
          font-size:18px;
          font-weight:700;
          margin-bottom:12px;
        ">
          ${escapeHTML(
            getCalendarMonthLabel(year, month)
          )}
        </div>

        <!-- WEEK DAYS -->
        <div style="
          display:grid;
          grid-template-columns:repeat(7,minmax(0,1fr));
          gap:6px;
          margin-bottom:6px;
        ">

          ${[
            'Sun',
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat'
          ].map(day => `
            <div style="
              text-align:center;
              padding:7px 2px;
              color:#6a708a;
              font-size:10px;
              font-weight:700;
              text-transform:uppercase;
            ">
              ${day}
            </div>
          `).join('')}

        </div>

        <!-- CALENDAR GRID -->
        <div style="
          display:grid;
          grid-template-columns:repeat(7,minmax(0,1fr));
          gap:6px;
        ">
    `;

    /* Empty cells before first day */
    for (let i = 0; i < firstDay; i++) {
      html += `
        <div style="
          min-height:95px;
          background:#101019;
          border:1px solid #1d1d29;
          border-radius:10px;
        "></div>
      `;
    }

    /* Days */
    for (let day = 1; day <= daysInMonth; day++) {

      const posts =
        getCalendarDayPosts(year, month, day);

      const today =
        isCalendarToday(year, month, day);

      html += `
        <button
          type="button"
          class="calendar-day"
          data-calendar-day="${day}"
          style="
            min-height:95px;
            width:100%;
            text-align:left;
            background:${today ? '#18152d' : '#15151f'};
            border:1px solid ${today ? '#6c5ce7' : '#2a2a3a'};
            border-radius:10px;
            padding:8px;
            cursor:pointer;
            color:#fff;
            overflow:hidden;
          "
        >

          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:6px;
          ">

            <span style="
              font-size:12px;
              font-weight:${today ? '800' : '600'};
              color:${today ? '#fff' : '#9aa0b4'};
            ">
              ${day}
            </span>

            ${
              posts.length
                ? `
                  <span style="
                    min-width:20px;
                    height:20px;
                    padding:0 5px;
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:10px;
                    background:#6c5ce7;
                    color:#fff;
                    font-size:10px;
                    font-weight:700;
                  ">
                    ${posts.length}
                  </span>
                `
                : ''
            }

          </div>

          <div style="
            display:flex;
            flex-direction:column;
            gap:4px;
          ">

            ${posts.slice(0, 3).map(post => {

              const statusColor =
                post.status === 'published'
                  ? '#25D366'
                  : post.status === 'scheduled'
                    ? '#6c5ce7'
                    : '#6a708a';

              return `
                <div
                  class="calendar-post"
                  data-post-id="${escapeHTML(post.id)}"
                  style="
                    border-left:3px solid ${statusColor};
                    background:#1a1a24;
                    border-radius:5px;
                    padding:4px 6px;
                    color:#cfd2df;
                    font-size:10px;
                    line-height:1.3;
                    white-space:nowrap;
                    overflow:hidden;
                    text-overflow:ellipsis;
                  "
                >
                  ${escapeHTML(
                    post.caption || '(No caption)'
                  )}
                </div>
              `;

            }).join('')}

            ${
              posts.length > 3
                ? `
                  <div style="
                    color:#6a708a;
                    font-size:10px;
                    padding-left:4px;
                  ">
                    +${posts.length - 3} more
                  </div>
                `
                : ''
            }

          </div>

        </button>
      `;
    }

    html += `
        </div>

        <!-- LEGEND -->
        <div style="
          display:flex;
          gap:16px;
          flex-wrap:wrap;
          margin-top:18px;
          padding:14px;
          background:#15151f;
          border:1px solid #2a2a3a;
          border-radius:12px;
        ">

          <span style="
            color:#9aa0b4;
            font-size:11px;
          ">
            <b style="color:#6c5ce7;">●</b>
            Scheduled
          </span>

          <span style="
            color:#9aa0b4;
            font-size:11px;
          ">
            <b style="color:#25D366;">●</b>
            Published
          </span>

          <span style="
            color:#9aa0b4;
            font-size:11px;
          ">
            <b style="color:#6a708a;">●</b>
            Draft
          </span>

        </div>

      </div>
    `;

    page.innerHTML = html;

    bindCalendarEvents();

  } catch (err) {
    console.error(
      '[PostX Calendar Render Error]',
      err
    );
  }
}

/* ================= 9.3 GUARDED CALENDAR EVENTS ================= */

function bindCalendarEvents() {

  const page =
    safeEl('calendar-page') ||
    $('[data-page-content="calendar"]');

  if (!page) return;

  /*
   * Event delegation:
   * Only ONE listener is attached to the calendar page.
   * Re-rendering the calendar therefore cannot create
   * duplicate event listeners.
   */

  if (page.dataset.calendarEventsBound === 'true') {
    return;
  }

  page.dataset.calendarEventsBound = 'true';

  page.addEventListener('click', handleCalendarClick);
}

function handleCalendarClick(e) {

  const actionButton =
    e.target.closest('[data-calendar-action]');

  if (actionButton) {

    const action =
      actionButton.dataset.calendarAction;

    if (action === 'previous') {
      changeCalendarMonth(-1);
      return;
    }

    if (action === 'next') {
      changeCalendarMonth(1);
      return;
    }

    if (action === 'today') {
      goToCalendarToday();
      return;
    }
  }

  const postElement =
    e.target.closest('.calendar-post');

  if (postElement) {

    e.stopPropagation();

    const postId =
      postElement.dataset.postId;

    if (postId) {
      openCalendarPost(postId);
    }

    return;
  }

  const dayElement =
    e.target.closest('.calendar-day');

  if (dayElement) {

    const day =
      Number(dayElement.dataset.calendarDay);

    if (!day) return;

    selectCalendarDay(day);
  }
}

/* ================= 9.4 MONTH NAVIGATION ================= */

function changeCalendarMonth(offset) {

  initializeCalendar();

  const current = state.calendarDate;

  state.calendarDate = new Date(
    current.getFullYear(),
    current.getMonth() + offset,
    1
  );

  state.selectedCalendarDate = null;

  renderCalendar();
}

function goToCalendarToday() {

  const today = new Date();

  state.calendarDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  state.selectedCalendarDate =
    today.toISOString();

  renderCalendar();
}

/* ================= 9.5 DAY SELECTION ================= */

function selectCalendarDay(day) {

  initializeCalendar();

  const current =
    state.calendarDate;

  const selectedDate = new Date(
    current.getFullYear(),
    current.getMonth(),
    day
  );

  state.selectedCalendarDate =
    selectedDate.toISOString();

  const posts =
    getCalendarDayPosts(
      current.getFullYear(),
      current.getMonth(),
      day
    );

  if (posts.length) {

    showCalendarDayModal(
      current.getFullYear(),
      current.getMonth(),
      day,
      posts
    );

    return;
  }

  /*
   * No posts on selected day:
   * prepare composer for a new scheduled post.
   */

  state.editingPostId = null;

  state.composer = {
    caption: '',
    hashtags: '',
    media: '',
    platforms: [],
    scheduledAt: toLocalDateTimeInput(selectedDate)
  };

  navigate('create');
}

/* ================= 9.6 DATE INPUT HELPER ================= */

function toLocalDateTimeInput(date) {

  if (!(date instanceof Date) ||
      isNaN(date.getTime())) {
    return '';
  }

  const pad = value =>
    String(value).padStart(2, '0');

  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes())
  );
}

/* ================= 9.7 OPEN CALENDAR POST ================= */

function openCalendarPost(postId) {

  const post =
    state.posts.find(
      p => p.id === postId
    );

  if (!post) {
    showToast(
      'Post could not be found',
      'error'
    );
    return;
  }

  /*
   * Use the existing editor if Part 5/6
   * provides editPost().
   */

  if (typeof editPost === 'function') {
    editPost(postId);
    return;
  }

  /*
   * Safe fallback if editPost() is not available.
   */

  state.editingPostId = postId;

  state.composer = {
    caption: post.caption || '',
    hashtags: post.hashtags || '',
    media: post.media || '',
    platforms: safeArray(post.platforms),
    scheduledAt:
      post.scheduledAt
        ? toLocalDateTimeInput(
            new Date(post.scheduledAt)
          )
        : ''
  };

  navigate('create');
}

/* ================= 9.8 DAY MODAL ================= */

function showCalendarDayModal(
  year,
  month,
  day,
  posts
) {

  const dateLabel =
    new Date(year, month, day)
      .toLocaleDateString('en-KE', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

  const body = `
    <div style="
      display:flex;
      flex-direction:column;
      gap:10px;
    ">

      ${posts.map(post => {

        const date =
          getCalendarDate(post);

        return `
          <button
            type="button"
            class="calendar-modal-post"
            data-post-id="${escapeHTML(post.id)}"
            style="
              width:100%;
              text-align:left;
              padding:12px;
              background:#1a1a24;
              border:1px solid #2a2a3a;
              border-radius:10px;
              cursor:pointer;
              color:#fff;
            "
          >

            <div style="
              display:flex;
              justify-content:space-between;
              gap:8px;
              margin-bottom:5px;
            ">

              <strong style="
                color:#fff;
                font-size:12px;
              ">
                ${escapeHTML(
                  post.status.toUpperCase()
                )}
              </strong>

              <span style="
                color:#6a708a;
                font-size:10px;
              ">
                ${
                  date
                    ? escapeHTML(
                        formatDate(
                          date.toISOString()
                        )
                      )
                    : '—'
                }
              </span>

            </div>

            <div style="
              color:#9aa0b4;
              font-size:12px;
              line-height:1.5;
            ">
              ${escapeHTML(
                post.caption || '(No caption)'
              )}
            </div>

          </button>
        `;

      }).join('')}

    </div>
  `;

  openModal({
    title: dateLabel,
    body,
    actions: [
      {
        label: 'Close',
        variant: 'secondary'
      }
    ]
  });

  /*
   * Modal posts are dynamically generated.
   * Use one delegated listener on the modal box.
   */

  const root =
    safeEl('postx-modal-root');

  const box =
    root?.querySelector(
      '.postx-modal-box'
    );

  if (!box) return;

  if (box.dataset.calendarModalBound === 'true') {
    return;
  }

  box.dataset.calendarModalBound = 'true';

  box.addEventListener('click', e => {

    const item =
      e.target.closest(
        '.calendar-modal-post'
      );

    if (!item) return;

    const postId =
      item.dataset.postId;

    closeModal();

    if (postId) {
      openCalendarPost(postId);
    }

  });
}

/* =========================================================
   POSTX v2.0 — PART 10
   CALENDAR & SCHEDULING ENGINE
   ---------------------------------------------------------
   Responsibilities:
   - Calendar month rendering
   - Previous / next month navigation
   - Scheduled-post date grouping
   - Selected-date scheduled posts
   - Safe local datetime handling
   - Edit scheduled posts
   - Publish scheduled posts now
   - Delete scheduled posts
   - Reschedule scheduled posts
   - No duplicate event listeners
   - LocalStorage persistence
   ========================================================= */

/* ================= 10.1 CALENDAR STATE ================= */

if (!state.calendarDate || !(state.calendarDate instanceof Date)) {
  state.calendarDate = new Date();
}

if (!state.selectedCalendarDate) {
  state.selectedCalendarDate = null;
}

/* ================= 10.2 DATE HELPERS ================= */

function calendarStartOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function calendarEndOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function calendarDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return '';

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

function parseCalendarDateKey(key) {
  if (!key || typeof key !== 'string') return null;

  const parts = key.split('-').map(Number);

  if (
    parts.length !== 3 ||
    parts.some(Number.isNaN)
  ) {
    return null;
  }

  const [year, month, day] = parts;

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function calendarMonthLabel(date) {
  return new Date(date).toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric'
  });
}

function calendarDayNumber(date) {
  return new Date(date).getDate();
}

/*
 * Convert an ISO UTC datetime into the value expected by
 * <input type="datetime-local"> using LOCAL time.
 */
function toLocalDateTimeInput(iso) {
  if (!iso || !isValidDateString(iso)) return '';

  const d = new Date(iso);

  const pad = n => String(n).padStart(2, '0');

  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate())
  ].join('-') + 'T' + [
    pad(d.getHours()),
    pad(d.getMinutes())
  ].join(':');
}

/*
 * Convert datetime-local input into an ISO UTC value.
 */
function localDateTimeToISO(value) {
  if (!value) return null;

  const d = new Date(value);

  if (isNaN(d.getTime())) return null;

  return d.toISOString();
}

/* ================= 10.3 SCHEDULED POSTS ================= */

function getScheduledPosts() {
  return safeArray(state.posts)
    .filter(post =>
      post &&
      post.status === 'scheduled' &&
      isValidDateString(post.scheduledAt)
    )
    .sort((a, b) =>
      new Date(a.scheduledAt).getTime() -
      new Date(b.scheduledAt).getTime()
    );
}

function getScheduledPostsForDate(dateKey) {
  const date = parseCalendarDateKey(dateKey);

  if (!date) return [];

  return getScheduledPosts().filter(post => {
    return calendarDateKey(new Date(post.scheduledAt)) === dateKey;
  });
}

function getScheduledCountForDate(dateKey) {
  return getScheduledPostsForDate(dateKey).length;
}

/* ================= 10.4 CALENDAR NAVIGATION ================= */

function changeCalendarMonth(offset) {
  const current = state.calendarDate instanceof Date
    ? state.calendarDate
    : new Date();

  const next = new Date(
    current.getFullYear(),
    current.getMonth() + offset,
    1
  );

  state.calendarDate = next;

  /*
   * Keep selected date sensible when changing month.
   * We intentionally do not erase scheduled posts.
   */
  state.selectedCalendarDate = null;

  renderCalendar();
}

function goToCurrentMonth() {
  const today = new Date();

  state.calendarDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  state.selectedCalendarDate = calendarDateKey(today);

  renderCalendar();
}

/* ================= 10.5 CALENDAR HTML ================= */

function renderCalendar() {
  const container =
    safeEl('calendar-page') ||
    $('[data-page-content="calendar"]');

  if (!container) return;

  const monthDate = state.calendarDate instanceof Date
    ? state.calendarDate
    : new Date();

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  /*
   * Convert Sunday=0 to Monday=0.
   */
  const startingWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const todayKey = calendarDateKey(new Date());

  let selectedKey = state.selectedCalendarDate;

  if (!selectedKey) {
    selectedKey = todayKey;
  }

  /*
   * If selected date belongs to another month,
   * don't visually select it inside this month.
   */
  const selectedDate = parseCalendarDateKey(selectedKey);

  const selectedIsCurrentMonth =
    selectedDate &&
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month;

  const scheduledPosts = getScheduledPosts();

  const scheduledByDate = {};

  scheduledPosts.forEach(post => {
    const key = calendarDateKey(new Date(post.scheduledAt));

    if (!key) return;

    if (!scheduledByDate[key]) {
      scheduledByDate[key] = [];
    }

    scheduledByDate[key].push(post);
  });

  let calendarCells = '';

  /* Empty cells before first day */
  for (let i = 0; i < startingWeekday; i++) {
    calendarCells += `
      <div
        class="postx-calendar-cell postx-calendar-empty"
        aria-hidden="true"
        style="
          min-height:100px;
          background:#101018;
          border:1px solid #20202d;
          opacity:.45;
        "
      ></div>
    `;
  }

  /* Actual month days */
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = calendarDateKey(date);

    const posts = scheduledByDate[key] || [];

    const isToday = key === todayKey;
    const isSelected =
      selectedIsCurrentMonth &&
      key === selectedKey;

    const count = posts.length;

    calendarCells += `
      <button
        type="button"
        class="postx-calendar-cell"
        data-calendar-date="${escapeHTML(key)}"
        aria-label="${escapeHTML(
          date.toLocaleDateString('en-KE', {
            weekday:'long',
            month:'long',
            day:'numeric',
            year:'numeric'
          })
        )}"
        style="
          min-height:100px;
          padding:10px;
          text-align:left;
          vertical-align:top;
          background:${isSelected ? '#1d1938' : '#15151f'};
          border:1px solid ${isToday ? '#6c5ce7' : '#2a2a3a'};
          border-radius:12px;
          color:#fff;
          cursor:pointer;
          position:relative;
          overflow:hidden;
        "
      >
        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:8px;
          "
        >
          <span
            style="
              width:28px;
              height:28px;
              display:inline-flex;
              align-items:center;
              justify-content:center;
              border-radius:50%;
              background:${isToday ? '#6c5ce7' : '#1e1e2e'};
              color:#fff;
              font-size:12px;
              font-weight:700;
            "
          >
            ${day}
          </span>

          ${
            count
              ? `
                <span
                  style="
                    background:#6c5ce7;
                    color:#fff;
                    min-width:22px;
                    height:22px;
                    padding:0 6px;
                    border-radius:20px;
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    font-size:10px;
                    font-weight:700;
                  "
                >
                  ${count}
                </span>
              `
              : ''
          }
        </div>

        ${
          posts.slice(0, 2).map(post => `
            <div
              class="calendar-post-preview"
              data-calendar-post-id="${escapeHTML(post.id)}"
              style="
                background:#1e1e2e;
                border:1px solid #2a2a3a;
                border-left:3px solid #6c5ce7;
                border-radius:7px;
                padding:5px 7px;
                margin-top:5px;
                overflow:hidden;
              "
            >
              <div
                style="
                  color:#fff;
                  font-size:10px;
                  font-weight:700;
                  white-space:nowrap;
                  overflow:hidden;
                  text-overflow:ellipsis;
                "
              >
                ${escapeHTML(
                  new Date(post.scheduledAt).toLocaleTimeString(
                    'en-KE',
                    {
                      hour:'2-digit',
                      minute:'2-digit'
                    }
                  )
                )}
              </div>

              <div
                style="
                  color:#9aa0b4;
                  font-size:10px;
                  white-space:nowrap;
                  overflow:hidden;
                  text-overflow:ellipsis;
                "
              >
                ${escapeHTML(post.caption || 'Untitled post')}
              </div>
            </div>
          `).join('')
        }

        ${
          count > 2
            ? `
              <div
                style="
                  color:#6c5ce7;
                  font-size:10px;
                  margin-top:5px;
                  font-weight:700;
                "
              >
                +${count - 2} more
              </div>
            `
            : ''
        }
      </button>
    `;
  }

  /*
   * Complete final week.
   */
  const totalCells = startingWeekday + daysInMonth;
  const remainingCells = (7 - (totalCells % 7)) % 7;

  for (let i = 0; i < remainingCells; i++) {
    calendarCells += `
      <div
        class="postx-calendar-cell postx-calendar-empty"
        aria-hidden="true"
        style="
          min-height:100px;
          background:#101018;
          border:1px solid #20202d;
          opacity:.45;
        "
      ></div>
    `;
  }

  const selectedPosts =
    selectedKey
      ? getScheduledPostsForDate(selectedKey)
      : [];

  const selectedDateObject =
    selectedKey
      ? parseCalendarDateKey(selectedKey)
      : null;

  const selectedTitle =
    selectedDateObject
      ? selectedDateObject.toLocaleDateString('en-KE', {
          weekday:'long',
          month:'long',
          day:'numeric',
          year:'numeric'
        })
      : 'Select a date';

  container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
          margin-bottom:18px;
        "
      >
        <div>
          <h2
            style="
              color:#fff;
              margin:0;
              font-size:24px;
            "
          >
            Content Calendar
          </h2>

          <div
            style="
              color:#6a708a;
              font-size:12px;
              margin-top:5px;
            "
          >
            ${scheduledPosts.length} scheduled post${scheduledPosts.length === 1 ? '' : 's'}
          </div>
        </div>

        <button
          type="button"
          id="calendar-today-btn"
          style="
            background:#1e1e2e;
            border:1px solid #2a2a3a;
            color:#fff;
            padding:9px 14px;
            border-radius:10px;
            cursor:pointer;
          "
        >
          Today
        </button>
      </div>

      <div
        style="
          background:#15151f;
          border:1px solid #2a2a3a;
          border-radius:18px;
          padding:16px;
        "
      >

        <div
          style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            margin-bottom:16px;
          "
        >

          <button
            type="button"
            id="calendar-prev"
            aria-label="Previous month"
            style="
              width:40px;
              height:40px;
              border-radius:10px;
              border:1px solid #2a2a3a;
              background:#1e1e2e;
              color:#fff;
              cursor:pointer;
              font-size:18px;
            "
          >
            ‹
          </button>

          <h3
            style="
              color:#fff;
              margin:0;
              font-size:18px;
              text-align:center;
            "
          >
            ${escapeHTML(calendarMonthLabel(monthDate))}
          </h3>

          <button
            type="button"
            id="calendar-next"
            aria-label="Next month"
            style="
              width:40px;
              height:40px;
              border-radius:10px;
              border:1px solid #2a2a3a;
              background:#1e1e2e;
              color:#fff;
              cursor:pointer;
              font-size:18px;
            "
          >
            ›
          </button>

        </div>

        <div
          style="
            display:grid;
            grid-template-columns:repeat(7,minmax(0,1fr));
            gap:6px;
            margin-bottom:6px;
          "
        >
          ${
            ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
              .map(day => `
                <div
                  style="
                    text-align:center;
                    color:#6a708a;
                    font-size:10px;
                    font-weight:700;
                    text-transform:uppercase;
                    padding:7px 2px;
                  "
                >
                  ${day}
                </div>
              `).join('')
          }
        </div>

        <div
          id="postx-calendar-grid"
          style="
            display:grid;
            grid-template-columns:repeat(7,minmax(0,1fr));
            gap:6px;
          "
        >
          ${calendarCells}
        </div>

      </div>

      <div
        style="
          margin-top:18px;
          background:#15151f;
          border:1px solid #2a2a3a;
          border-radius:18px;
          padding:20px;
        "
      >

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            margin-bottom:14px;
            flex-wrap:wrap;
          "
        >
          <div>
            <h3
              style="
                margin:0;
                color:#fff;
                font-size:16px;
              "
            >
              ${escapeHTML(selectedTitle)}
            </h3>

            <div
              style="
                color:#6a708a;
                font-size:11px;
                margin-top:4px;
              "
            >
              Scheduled content
            </div>
          </div>

          ${
            selectedPosts.length
              ? `
                <span
                  style="
                    background:#2a2a4a;
                    color:#bdb7ff;
                    border-radius:20px;
                    padding:5px 10px;
                    font-size:11px;
                  "
                >
                  ${selectedPosts.length} post${selectedPosts.length === 1 ? '' : 's'}
                </span>
              `
              : ''
          }
        </div>

        ${
          selectedPosts.length
            ? `
              <div
                style="
                  display:grid;
                  gap:12px;
                "
              >
                ${selectedPosts.map(renderCalendarScheduledPost).join('')}
              </div>
            `
            : `
              <div
                style="
                  padding:30px 15px;
                  text-align:center;
                  color:#6a708a;
                  border:1px dashed #2a2a3a;
                  border-radius:12px;
                "
              >
                No scheduled posts for this date.
              </div>
            `
        }

      </div>

    </div>
  `;

  bindCalendarEvents();
}

/* ================= 10.6 SCHEDULED POST CARD ================= */

function renderCalendarScheduledPost(post) {
  const time = isValidDateString(post.scheduledAt)
    ? new Date(post.scheduledAt).toLocaleTimeString('en-KE', {
        hour:'2-digit',
        minute:'2-digit'
      })
    : '—';

  const platforms = safeArray(post.platforms);

  return `
    <div
      class="postx-calendar-scheduled-card"
      data-scheduled-card-id="${escapeHTML(post.id)}"
      style="
        background:#1a1a24;
        border:1px solid #2a2a3a;
        border-radius:14px;
        padding:15px;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:10px;
        "
      >

        <div style="min-width:0;flex:1;">

          <div
            style="
              color:#6c5ce7;
              font-size:12px;
              font-weight:800;
              margin-bottom:6px;
            "
          >
            ${escapeHTML(time)}
          </div>

          <div
            style="
              color:#fff;
              font-size:14px;
              line-height:1.5;
              white-space:pre-wrap;
              overflow-wrap:anywhere;
            "
          >
            ${escapeHTML(post.caption || 'Untitled post')}
          </div>

          ${
            post.hashtags
              ? `
                <div
                  style="
                    color:#6c5ce7;
                    font-size:12px;
                    margin-top:6px;
                  "
                >
                  ${escapeHTML(post.hashtags)}
                </div>
              `
              : ''
          }

        </div>

        <span
          style="
            flex-shrink:0;
            background:#2a2a4a;
            color:#bdb7ff;
            padding:5px 9px;
            border-radius:20px;
            font-size:10px;
            text-transform:uppercase;
          "
        >
          Scheduled
        </span>

      </div>

      ${
        platforms.length
          ? `
            <div
              style="
                display:flex;
                flex-wrap:wrap;
                gap:6px;
                margin-top:10px;
              "
            >
              ${platforms.map(pid => `
                <span
                  style="
                    background:#15151f;
                    border:1px solid #2a2a3a;
                    color:#9aa0b4;
                    padding:4px 8px;
                    border-radius:20px;
                    font-size:10px;
                  "
                >
                  ${escapeHTML(
                    PLATFORMS[pid]?.label || pid
                  )}
                </span>
              `).join('')}
            </div>
          `
          : ''
      }

      <div
        style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:13px;
        "
      >

        <button
          type="button"
          class="calendar-edit-btn"
          data-id="${escapeHTML(post.id)}"
          style="
            background:#1e1e2e;
            border:1px solid #2a2a3a;
            color:#fff;
            padding:7px 11px;
            border-radius:8px;
            cursor:pointer;
          "
        >
          Edit
        </button>

        <button
          type="button"
          class="calendar-publish-btn"
          data-id="${escapeHTML(post.id)}"
          style="
            background:#6c5ce7;
            border:none;
            color:#fff;
            padding:7px 11px;
            border-radius:8px;
            cursor:pointer;
            font-weight:700;
          "
        >
          Publish Now
        </button>

        <button
          type="button"
          class="calendar-delete-btn"
          data-id="${escapeHTML(post.id)}"
          style="
            background:#2a1a1a;
            border:1px solid #3a2a2a;
            color:#ff6b6b;
            padding:7px 11px;
            border-radius:8px;
            cursor:pointer;
          "
        >
          Delete
        </button>

      </div>

    </div>
  `;
}

/* ================= 10.7 CALENDAR EVENTS ================= */

function bindCalendarEvents() {
  const prev = safeEl('calendar-prev');
  const next = safeEl('calendar-next');
  const today = safeEl('calendar-today-btn');

  if (prev) {
    prev.onclick = () => changeCalendarMonth(-1);
  }

  if (next) {
    next.onclick = () => changeCalendarMonth(1);
  }

  if (today) {
    today.onclick = goToCurrentMonth;
  }

  $$('.postx-calendar-cell[data-calendar-date]').forEach(cell => {
    cell.onclick = () => {
      const key = cell.dataset.calendarDate;

      if (!key) return;

      state.selectedCalendarDate = key;

      renderCalendar();
    };
  });

  $$('.calendar-edit-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;

      if (id) {
        editScheduledPost(id);
      }
    };
  });

  $$('.calendar-publish-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;

      if (id) {
        publishScheduledPostNow(id);
      }
    };
  });

  $$('.calendar-delete-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;

      if (id) {
        deleteScheduledPost(id);
      }
    };
  });
}

/* ================= 10.8 EDIT SCHEDULED POST ================= */

function editScheduledPost(id) {
  const post = state.posts.find(p => p.id === id);

  if (!post) {
    showToast('Scheduled post not found', 'error');
    return;
  }

  state.editingPostId = post.id;

  /*
   * Composer uses datetime-local, so convert the stored ISO
   * value into local browser time first.
   */
  state.composer = {
    caption: post.caption || '',
    hashtags: post.hashtags || '',
    media: post.media || '',
    platforms: [...safeArray(post.platforms)],
    scheduledAt: toLocalDateTimeInput(post.scheduledAt)
  };

  saveState();

  navigate('create');
}

/* ================= 10.9 PUBLISH SCHEDULED POST ================= */

function publishScheduledPostNow(id) {
  const post = state.posts.find(p => p.id === id);

  if (!post) {
    showToast('Scheduled post not found', 'error');
    return;
  }

  const performPublish = () => {
    const index = state.posts.findIndex(p => p.id === id);

    if (index === -1) {
      showToast('Post no longer exists', 'error');
      return;
    }

    const current = state.posts[index];

    current.status = 'published';
    current.publishedAt = nowISO();
    current.scheduledAt = null;
    current.updatedAt = nowISO();

    state.posts[index] = normalizePost(current);

    saveState();

    showToast(
      'Post moved to Published successfully',
      'success'
    );

    renderCalendar();
  };

  if (typeof openModal === 'function') {
    openModal({
      title: 'Publish this post now?',
      body: `
        <div>
          This will move the scheduled post to your
          <strong style="color:#fff;">Published</strong> list.
        </div>
      `,
      actions: [
        {
          label: 'Cancel',
          variant: ''
        },
        {
          label: 'Publish Now',
          variant: 'primary',
          onClick: performPublish
        }
      ]
    });
  } else {
    if (window.confirm('Publish this post now?')) {
      performPublish();
    }
  }
}

/* ================= 10.10 DELETE SCHEDULED POST ================= */

function deleteScheduledPost(id) {
  const post = state.posts.find(p => p.id === id);

  if (!post) {
    showToast('Scheduled post not found', 'error');
    return;
  }

  const performDelete = () => {
    state.posts = state.posts.filter(p => p.id !== id);

    if (state.editingPostId === id) {
      state.editingPostId = null;
    }

    saveState();

    showToast(
      'Scheduled post deleted',
      'success'
    );

    renderCalendar();
  };

  if (typeof openModal === 'function') {
    openModal({
      title: 'Delete scheduled post?',
      body: `
        <div>
          This action cannot be undone.
        </div>
      `,
      actions: [
        {
          label: 'Cancel',
          variant: ''
        },
        {
          label: 'Delete',
          variant: 'primary',
          onClick: performDelete
        }
      ]
    });
  } else {
    if (window.confirm('Delete this scheduled post?')) {
      performDelete();
    }
  }
}

/* ================= 10.11 SCHEDULE VALIDATION ================= */

function validateScheduledDate(value) {
  const iso = localDateTimeToISO(value);

  if (!iso) {
    showToast(
      'Please select a valid schedule date and time',
      'warning'
    );
    return null;
  }

  /*
   * Allow scheduling slightly into the future.
   * A 30-second tolerance avoids rejecting a timestamp while
   * the user is submitting.
   */
  if (new Date(iso).getTime() < Date.now() - 30000) {
    showToast(
      'Scheduled time must be in the future',
      'warning'
    );
    return null;
  }

  return iso;
}

/* ================= 10.12 OPTIONAL SCHEDULE HELPER ================= */

function schedulePost(postId, localDateTimeValue) {
  const post = state.posts.find(p => p.id === postId);

  if (!post) {
    showToast('Post not found', 'error');
    return false;
  }

  const iso = validateScheduledDate(localDateTimeValue);

  if (!iso) return false;

  post.status = 'scheduled';
  post.scheduledAt = iso;
  post.publishedAt = null;
  post.updatedAt = nowISO();

  state.posts = normalizePosts(state.posts);

  saveState();

  state.calendarDate = new Date(iso);

  state.selectedCalendarDate =
    calendarDateKey(new Date(iso));

  showToast(
    'Post scheduled successfully',
    'success'
  );

  return true;
}

/* ================= 10.13 CALENDAR RESPONSIVE FIX ================= */

function ensureCalendarResponsiveStyle() {
  if (safeEl('postx-calendar-responsive-style')) {
    return;
  }

  const style = document.createElement('style');

  style.id = 'postx-calendar-responsive-style';

  style.textContent = `
    @media (max-width: 700px) {

      #postx-calendar-grid {
        gap: 3px !important;
      }

      .postx-calendar-cell {
        min-height: 72px !important;
        padding: 6px !important;
        border-radius: 8px !important;
      }

      .calendar-post-preview {
        padding: 3px 4px !important;
      }

      .calendar-post-preview div {
        font-size: 9px !important;
      }
    }

    @media (max-width: 480px) {

      .postx-calendar-cell {
        min-height: 58px !important;
      }

      .postx-calendar-empty {
        min-height: 58px !important;
      }

      .postx-calendar-cell > div:first-child {
        margin-bottom: 2px !important;
      }

      .postx-calendar-cell > div:first-child > span:first-child {
        width: 22px !important;
        height: 22px !important;
        font-size: 10px !important;
      }

      .calendar-post-preview {
        display: none !important;
      }

      .postx-calendar-cell > div:last-child {
        font-size: 8px !important;
      }
    }
  `;

  document.head.appendChild(style);
}

/* ================= 10.14 INITIALIZE CALENDAR ENGINE ================= */

function initCalendarEngine() {
  ensureCalendarResponsiveStyle();

  if (!state.calendarDate) {
    state.calendarDate = new Date();
  }

  if (
    state.selectedCalendarDate &&
    !parseCalendarDateKey(state.selectedCalendarDate)
  ) {
    state.selectedCalendarDate = null;
  }
}

/*
 * Guarded initialization.
 * Safe if Part 10 is pasted into a script that is already running.
 */
if (!window.__POSTX_CALENDAR_ENGINE_INITIALIZED) {
  window.__POSTX_CALENDAR_ENGINE_INITIALIZED = true;

  initCalendarEngine();
}

/* =========================================================
   END OF POSTX v2.0 — PART 10
   ========================================================= */

/* =========================================================
   POSTX v2.0 — PART 11
   PROFILE & CONNECTED ACCOUNTS ENGINE
   ---------------------------------------------------------
   Responsibilities:
   - Profile display and editing
   - Connected account state
   - Facebook / Instagram / X connection demo
   - Safe account disconnect
   - Profile persistence
   - Account statistics
   - Compatibility with existing state/storage
   - No external API calls
   ========================================================= */

/* ================= 11.1 PROFILE DEFAULTS ================= */

function ensureProfileState() {
  if (!state.profile || typeof state.profile !== 'object') {
    state.profile = {
      name: 'PostX User',
      email: ''
    };
  }

  if (typeof state.profile.name !== 'string' || !state.profile.name.trim()) {
    state.profile.name = 'PostX User';
  }

  if (typeof state.profile.email !== 'string') {
    state.profile.email = '';
  }

  if (!state.connectedAccounts || typeof state.connectedAccounts !== 'object') {
    state.connectedAccounts = {};
  }

  PLATFORM_IDS.forEach(pid => {
    state.connectedAccounts[pid] =
      Boolean(state.connectedAccounts[pid]);
  });
}

/* ================= 11.2 ACCOUNT HELPERS ================= */

function isPlatformConnected(platformId) {
  if (!PLATFORMS[platformId]) return false;

  return Boolean(
    state.connectedAccounts &&
    state.connectedAccounts[platformId]
  );
}

function connectedPlatformCount() {
  return PLATFORM_IDS.filter(
    pid => isPlatformConnected(pid)
  ).length;
}

function getConnectedPlatforms() {
  return PLATFORM_IDS.filter(
    pid => isPlatformConnected(pid)
  );
}

/* ================= 11.3 PROFILE VALIDATION ================= */

function validateProfileName(name) {
  const value = String(name || '').trim();

  if (!value) {
    showToast(
      'Please enter your name',
      'warning'
    );
    return null;
  }

  if (value.length > 80) {
    showToast(
      'Name is too long',
      'warning'
    );
    return null;
  }

  return value;
}

function validateProfileEmail(email) {
  const value = String(email || '').trim();

  if (!value) return '';

  if (value.length > 160) {
    showToast(
      'Email address is too long',
      'warning'
    );
    return null;
  }

  /*
   * Basic email validation.
   * This is frontend validation only.
   */
  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  if (!valid) {
    showToast(
      'Please enter a valid email address',
      'warning'
    );
    return null;
  }

  return value;
}

/* ================= 11.4 SAVE PROFILE ================= */

function saveProfile(name, email) {
  const validName = validateProfileName(name);

  if (validName === null) {
    return false;
  }

  const validEmail = validateProfileEmail(email);

  if (validEmail === null) {
    return false;
  }

  state.profile.name = validName;
  state.profile.email = validEmail;

  saveState();

  showToast(
    'Profile updated successfully',
    'success'
  );

  return true;
}

/* ================= 11.5 CONNECT ACCOUNT ================= */

function connectPlatform(platformId) {
  if (!PLATFORMS[platformId]) {
    showToast(
      'Unknown platform',
      'error'
    );
    return;
  }

  if (isPlatformConnected(platformId)) {
    showToast(
      `${PLATFORMS[platformId].label} is already connected`,
      'info'
    );
    return;
  }

  const platform = PLATFORMS[platformId];

  /*
   * Frontend demo connection.
   * No real OAuth/API request is performed here.
   */
  const performConnect = () => {
    ensureProfileState();

    state.connectedAccounts[platformId] = true;

    saveState();

    showToast(
      `${platform.label} connected successfully (Demo)`,
      'success'
    );

    renderProfile();
  };

  if (typeof openModal === 'function') {
    openModal({
      title: `Connect ${platform.label}`,
      body: `
        <div style="line-height:1.7;">
          <strong style="color:#fff;">
            ${escapeHTML(platform.label)}
          </strong>
          will be marked as connected for this
          frontend demo.
          <br><br>
          No real social-media authorization or API
          connection is performed yet.
        </div>
      `,
      actions: [
        {
          label: 'Cancel',
          variant: ''
        },
        {
          label: 'Connect Demo',
          variant: 'primary',
          onClick: performConnect
        }
      ]
    });
  } else {
    performConnect();
  }
}

/* ================= 11.6 DISCONNECT ACCOUNT ================= */

function disconnectPlatform(platformId) {
  if (!PLATFORMS[platformId]) {
    showToast(
      'Unknown platform',
      'error'
    );
    return;
  }

  if (!isPlatformConnected(platformId)) {
    showToast(
      `${PLATFORMS[platformId].label} is not connected`,
      'info'
    );
    return;
  }

  const platform = PLATFORMS[platformId];

  const performDisconnect = () => {
    ensureProfileState();

    state.connectedAccounts[platformId] = false;

    /*
     * Remove this platform from currently selected
     * composer platforms so the user cannot accidentally
     * publish to a disconnected account.
     */
    if (
      state.composer &&
      Array.isArray(state.composer.platforms)
    ) {
      state.composer.platforms =
        state.composer.platforms.filter(
          pid => pid !== platformId
        );
    }

    saveState();

    showToast(
      `${platform.label} disconnected`,
      'success'
    );

    renderProfile();
  };

  if (typeof openModal === 'function') {
    openModal({
      title: `Disconnect ${platform.label}?`,
      body: `
        <div>
          This will remove the local demo connection
          for <strong style="color:#fff;">
          ${escapeHTML(platform.label)}</strong>.
        </div>
      `,
      actions: [
        {
          label: 'Cancel',
          variant: ''
        },
        {
          label: 'Disconnect',
          variant: 'primary',
          onClick: performDisconnect
        }
      ]
    });
  } else {
    if (
      window.confirm(
        `Disconnect ${platform.label}?`
      )
    ) {
      performDisconnect();
    }
  }
}

/* ================= 11.7 ACCOUNT CARD ================= */

function renderAccountCard(platformId) {
  const platform = PLATFORMS[platformId];

  if (!platform) return '';

  const connected =
    isPlatformConnected(platformId);

  return `
    <div
      class="postx-account-card"
      data-account-id="${escapeHTML(platformId)}"
      style="
        background:#15151f;
        border:1px solid #2a2a3a;
        border-radius:16px;
        padding:18px;
      "
    >

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        "
      >

        <div
          style="
            display:flex;
            align-items:center;
            gap:12px;
            min-width:0;
          "
        >

          <div
            style="
              width:42px;
              height:42px;
              flex-shrink:0;
              border-radius:12px;
              background:#1e1e2e;
              border:1px solid #2a2a3a;
              display:flex;
              align-items:center;
              justify-content:center;
              color:#fff;
              font-size:17px;
              font-weight:800;
            "
          >
            ${escapeHTML(
              platform.label.charAt(0)
            )}
          </div>

          <div style="min-width:0;">
            <div
              style="
                color:#fff;
                font-size:14px;
                font-weight:700;
              "
            >
              ${escapeHTML(platform.label)}
            </div>

            <div
              style="
                color:#6a708a;
                font-size:11px;
                margin-top:3px;
                overflow-wrap:anywhere;
              "
            >
              ${escapeHTML(platform.desc)}
            </div>
          </div>

        </div>

        <span
          style="
            flex-shrink:0;
            background:${connected ? '#173624' : '#2a2a2a'};
            color:${connected ? '#25D366' : '#9aa0b4'};
            padding:5px 9px;
            border-radius:20px;
            font-size:10px;
            font-weight:700;
            text-transform:uppercase;
          "
        >
          ${connected ? 'Connected' : 'Not Connected'}
        </span>

      </div>

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
          margin-top:15px;
          padding-top:13px;
          border-top:1px solid #242432;
        "
      >

        <div
          style="
            color:#6a708a;
            font-size:11px;
          "
        >
          ${
            connected
              ? 'Ready for publishing'
              : 'Connection required'
          }
        </div>

        ${
          connected
            ? `
              <button
                type="button"
                class="postx-disconnect-account"
                data-platform-id="${escapeHTML(platformId)}"
                style="
                  background:#2a1a1a;
                  border:1px solid #3a2a2a;
                  color:#ff6b6b;
                  padding:7px 11px;
                  border-radius:8px;
                  cursor:pointer;
                "
              >
                Disconnect
              </button>
            `
            : `
              <button
                type="button"
                class="postx-connect-account"
                data-platform-id="${escapeHTML(platformId)}"
                style="
                  background:#6c5ce7;
                  border:none;
                  color:#fff;
                  padding:7px 13px;
                  border-radius:8px;
                  cursor:pointer;
                  font-weight:700;
                "
              >
                Connect
              </button>
            `
        }

      </div>

    </div>
  `;
}

/* ================= 11.8 PROFILE RENDERER ================= */

function renderProfile() {
  ensureProfileState();

  const container =
    safeEl('profile-page') ||
    safeEl('settings-page') ||
    $('[data-page-content="profile"]') ||
    $('[data-page-content="settings"]');

  if (!container) return;

  const profileName =
    state.profile.name || 'PostX User';

  const initials =
    profileName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'P';

  const connectedCount =
    connectedPlatformCount();

  container.innerHTML = `
    <div
      style="
        max-width:900px;
        margin:0 auto;
      "
    >

      <!-- HEADER -->

      <div
        style="
          margin-bottom:20px;
        "
      >
        <h2
          style="
            color:#fff;
            margin:0;
            font-size:24px;
          "
        >
          Profile & Accounts
        </h2>

        <div
          style="
            color:#6a708a;
            font-size:12px;
            margin-top:5px;
          "
        >
          Manage your PostX profile and social connections.
        </div>
      </div>

      <!-- PROFILE CARD -->

      <div
        style="
          background:#15151f;
          border:1px solid #2a2a3a;
          border-radius:18px;
          padding:20px;
          margin-bottom:18px;
        "
      >

        <div
          style="
            display:flex;
            align-items:center;
            gap:14px;
            margin-bottom:20px;
          "
        >

          <div
            style="
              width:58px;
              height:58px;
              border-radius:16px;
              background:#6c5ce7;
              color:#fff;
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:20px;
              font-weight:800;
              flex-shrink:0;
            "
          >
            ${escapeHTML(initials)}
          </div>

          <div>
            <h3
              style="
                margin:0;
                color:#fff;
                font-size:18px;
              "
            >
              ${escapeHTML(profileName)}
            </h3>

            <div
              style="
                color:#6a708a;
                font-size:11px;
                margin-top:4px;
              "
            >
              ${connectedCount} of ${PLATFORM_IDS.length}
              platforms connected
            </div>
          </div>

        </div>

        <div
          style="
            display:grid;
            gap:14px;
          "
        >

          <div>
            <label
              for="postx-profile-name"
              style="
                display:block;
                color:#9aa0b4;
                font-size:11px;
                margin-bottom:6px;
              "
            >
              Display Name
            </label>

            <input
              id="postx-profile-name"
              type="text"
              maxlength="80"
              value="${escapeHTML(state.profile.name)}"
              placeholder="Your name"
              style="
                width:100%;
                box-sizing:border-box;
                background:#1a1a24;
                border:1px solid #2a2a3a;
                border-radius:10px;
                padding:11px 13px;
                color:#fff;
                outline:none;
              "
            >
          </div>

          <div>
            <label
              for="postx-profile-email"
              style="
                display:block;
                color:#9aa0b4;
                font-size:11px;
                margin-bottom:6px;
              "
            >
              Email
            </label>

            <input
              id="postx-profile-email"
              type="email"
              maxlength="160"
              value="${escapeHTML(state.profile.email)}"
              placeholder="you@example.com"
              style="
                width:100%;
                box-sizing:border-box;
                background:#1a1a24;
                border:1px solid #2a2a3a;
                border-radius:10px;
                padding:11px 13px;
                color:#fff;
                outline:none;
              "
            >
          </div>

          <div>
            <button
              type="button"
              id="postx-save-profile"
              style="
                background:#6c5ce7;
                border:none;
                color:#fff;
                padding:11px 17px;
                border-radius:10px;
                cursor:pointer;
                font-weight:700;
              "
            >
              Save Profile
            </button>
          </div>

        </div>

      </div>

      <!-- CONNECTION SUMMARY -->

      <div
        style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
          gap:12px;
          margin-bottom:18px;
        "
      >

        <div
          style="
            background:#15151f;
            border:1px solid #2a2a3a;
            border-radius:14px;
            padding:16px;
          "
        >
          <div
            style="
              color:#6a708a;
              font-size:10px;
              text-transform:uppercase;
              letter-spacing:.08em;
            "
          >
            Connected
          </div>

          <div
            style="
              color:#fff;
              font-size:25px;
              font-weight:800;
              margin-top:5px;
            "
          >
            ${connectedCount}
          </div>
        </div>

        <div
          style="
            background:#15151f;
            border:1px solid #2a2a3a;
            border-radius:14px;
            padding:16px;
          "
        >
          <div
            style="
              color:#6a708a;
              font-size:10px;
              text-transform:uppercase;
              letter-spacing:.08em;
            "
          >
            Available
          </div>

          <div
            style="
              color:#fff;
              font-size:25px;
              font-weight:800;
              margin-top:5px;
            "
          >
            ${PLATFORM_IDS.length}
          </div>
        </div>

      </div>

      <!-- ACCOUNTS -->

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:12px;
        "
      >

        <div>
          <h3
            style="
              color:#fff;
              margin:0;
              font-size:17px;
            "
          >
            Connected Accounts
          </h3>

          <div
            style="
              color:#6a708a;
              font-size:11px;
              margin-top:4px;
            "
          >
            Frontend demo connections
          </div>
        </div>

      </div>

      <div
        style="
          display:grid;
          gap:12px;
        "
      >
        ${PLATFORM_IDS.map(renderAccountCard).join('')}
      </div>

      <div
        style="
          margin-top:18px;
          padding:14px;
          background:#11111a;
          border:1px dashed #2a2a3a;
          border-radius:12px;
          color:#6a708a;
          font-size:11px;
          line-height:1.6;
        "
      >
        <strong style="color:#9aa0b4;">
          Demo mode:
        </strong>
        Account connections are stored locally in this
        browser. Real Facebook, Instagram and X OAuth/API
        authentication will be added in the backend phase.
      </div>

    </div>
  `;

  bindProfileEvents();
}

/* ================= 11.9 PROFILE EVENTS ================= */

function bindProfileEvents() {
  const saveBtn =
    safeEl('postx-save-profile');

  if (saveBtn) {
    saveBtn.onclick = () => {
      const name =
        safeEl('postx-profile-name')?.value || '';

      const email =
        safeEl('postx-profile-email')?.value || '';

      if (saveProfile(name, email)) {
        renderProfile();
      }
    };
  }

  $$('.postx-connect-account').forEach(btn => {
    btn.onclick = () => {
      const platformId =
        btn.dataset.platformId;

      if (platformId) {
        connectPlatform(platformId);
      }
    };
  });

  $$('.postx-disconnect-account').forEach(btn => {
    btn.onclick = () => {
      const platformId =
        btn.dataset.platformId;

      if (platformId) {
        disconnectPlatform(platformId);
      }
    };
  });
}

/* ================= 11.10 PROFILE ROUTE SUPPORT ================= */

function openProfilePage() {
  /*
   * Profile/settings can exist under either route.
   * Prefer profile when available.
   */
  const profileExists =
    safeEl('profile-page') ||
    $('[data-page-content="profile"]');

  if (profileExists) {
    state.activePage = 'profile';
  } else {
    state.activePage = 'settings';
  }

  saveState();

  renderProfile();

  updateNavActiveState();
}

/* ================= 11.11 RENDER HOOK ================= */

/*
 * Extend the existing render router without replacing it.
 *
 * IMPORTANT:
 * We wrap the previous render function only once.
 * Existing dashboard/composer/calendar/list rendering
 * remains intact.
 */
if (!window.__POSTX_PROFILE_RENDER_HOOK) {
  window.__POSTX_PROFILE_RENDER_HOOK = true;

  const previousRender =
    typeof render === 'function'
      ? render
      : null;

  if (previousRender) {
    window.__POSTX_PREVIOUS_RENDER =
      previousRender;

    /*
     * Re-declare render so profile/settings can be
     * handled while all existing routes continue working.
     */
    render = function() {
      try {
        /*
         * Existing router handles normal pages.
         * Profile is handled separately.
         */
        if (
          state.activePage === 'profile' ||
          state.activePage === 'settings'
        ) {
          const profilePage =
            safeEl('profile-page') ||
            $('[data-page-content="profile"]');

          const settingsPage =
            safeEl('settings-page') ||
            $('[data-page-content="settings"]');

          if (profilePage) {
            if (settingsPage && settingsPage !== profilePage) {
              settingsPage.style.display = 'none';
            }

            profilePage.style.display = 'block';
            renderProfile();
            updateNavActiveState();
            return;
          }

          if (settingsPage) {
            settingsPage.style.display = 'block';
            renderProfile();
            updateNavActiveState();
            return;
          }
        }

        /*
         * All original routes continue through the
         * Part 9 render engine.
         */
        previousRender();

      } catch (err) {
        console.error(
          '[PostX Profile Render Error]',
          err
        );
      }
    };
  }
}

/* ================= 11.12 INITIALIZATION ================= */

if (!window.__POSTX_PROFILE_ENGINE_INITIALIZED) {
  window.__POSTX_PROFILE_ENGINE_INITIALIZED = true;

  ensureProfileState();
}

/* =========================================================
   END OF POSTX v2.0 — PART 11
   ========================================================= */

/* =========================================================
   POSTX v2.0 — PART 12
   FINAL INTEGRATION, VALIDATION & INITIALIZATION
   ---------------------------------------------------------
   Responsibilities:
   - Final state validation
   - Safe initialization
   - Single startup execution
   - Storage recovery
   - Navigation binding
   - Initial rendering
   - Scheduled-post maintenance
   - Final runtime safety
   ========================================================= */

/* ================= 12.1 FINAL RUNTIME CONFIG ================= */

const POSTX_FINAL = {
  initialized: false,
  version: '2.0.0',
  startupKey: '__POSTX_FINAL_STARTED',
  maxPosts: 500
};


/* ================= 12.2 FINAL STATE VALIDATION ================= */

function validateFinalState() {
  try {
    if (!state || typeof state !== 'object') {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    if (!Array.isArray(state.posts)) {
      state.posts = [];
    }

    state.posts = normalizePosts(state.posts);

    if (!state.connectedAccounts ||
        typeof state.connectedAccounts !== 'object') {
      state.connectedAccounts = {
        facebook: false,
        instagram: false,
        x: false
      };
    }

    state.connectedAccounts = {
      facebook: Boolean(state.connectedAccounts.facebook),
      instagram: Boolean(state.connectedAccounts.instagram),
      x: Boolean(state.connectedAccounts.x)
    };

    if (!state.profile || typeof state.profile !== 'object') {
      state.profile = {
        name: DEFAULT_STATE.profile.name,
        email: DEFAULT_STATE.profile.email
      };
    }

    state.profile = {
      name: String(state.profile.name || DEFAULT_STATE.profile.name),
      email: String(state.profile.email || '')
    };

    state.activePage = sanitizePage(state.activePage);

    if (
      state.editingPostId &&
      !state.posts.some(post => post.id === state.editingPostId)
    ) {
      state.editingPostId = null;
    }

    /*
     * Prevent uncontrolled localStorage growth.
     * Keep the newest posts only if an abnormal number
     * of records somehow enters the application.
     */
    if (state.posts.length > POSTX_FINAL.maxPosts) {
      state.posts.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );

      state.posts = state.posts.slice(0, POSTX_FINAL.maxPosts);

      showToast(
        `Post limit reached. Keeping the ${POSTX_FINAL.maxPosts} newest posts.`,
        'warning'
      );
    }

    return true;

  } catch (err) {
    console.error('[PostX] Final state validation failed:', err);

    state = JSON.parse(JSON.stringify(DEFAULT_STATE));

    return false;
  }
}


/* ================= 12.3 SCHEDULE MAINTENANCE ================= */

function maintainScheduledPosts() {
  try {
    if (!Array.isArray(state.posts)) return;

    let changed = false;

    state.posts = state.posts.map(post => {
      if (!post || typeof post !== 'object') return post;

      /*
       * Scheduled posts remain scheduled.
       * The frontend does NOT falsely claim that an API
       * published them. Real automatic publishing requires
       * the future backend/API engine.
       */
      if (post.status === 'scheduled') {

        if (!post.scheduledAt || !isValidDateString(post.scheduledAt)) {
          changed = true;

          return {
            ...post,
            status: 'draft',
            scheduledAt: null,
            updatedAt: nowISO()
          };
        }
      }

      return post;
    });

    if (changed) {
      state.posts = normalizePosts(state.posts);
      saveState();
    }

  } catch (err) {
    console.error('[PostX] Schedule maintenance error:', err);
  }
}


/* ================= 12.4 STORAGE HEALTH CHECK ================= */

function checkStorageHealth() {
  try {
    const testKey = '__postx_storage_test__';
    const testValue = 'ok';

    localStorage.setItem(testKey, testValue);

    const result = localStorage.getItem(testKey);

    localStorage.removeItem(testKey);

    return result === testValue;

  } catch (err) {
    console.warn('[PostX] LocalStorage unavailable:', err);

    try {
      showToast(
        'Local storage is unavailable. Your changes may not persist.',
        'warning',
        5000
      );
    } catch {}

    return false;
  }
}


/* ================= 12.5 FINAL DOM SAFETY ================= */

function ensurePostXRoot() {
  try {
    /*
     * Most PostX installations already have their page
     * containers in index.html. This function only verifies
     * the DOM and never destroys existing markup.
     */

    const requiredPages = [
      'dashboard',
      'create',
      'scheduled',
      'drafts',
      'published',
      'calendar'
    ];

    const existingPages = requiredPages.filter(page => {
      return safeEl(`${page}-page`) ||
             document.querySelector(`[data-page-content="${page}"]`);
    });

    if (!existingPages.length) {
      console.warn(
        '[PostX] No page containers detected. Check index.html.'
      );
      return false;
    }

    return true;

  } catch (err) {
    console.error('[PostX] DOM validation failed:', err);
    return false;
  }
}


/* ================= 12.6 FINAL ERROR HANDLING ================= */

function installGlobalErrorHandlers() {

  if (window.__POSTX_ERROR_HANDLERS) return;
  window.__POSTX_ERROR_HANDLERS = true;

  window.addEventListener('error', event => {
    console.error(
      '[PostX Runtime Error]',
      event.error || event.message
    );
  });

  window.addEventListener('unhandledrejection', event => {
    console.error(
      '[PostX Promise Error]',
      event.reason
    );
  });
}


/* ================= 12.7 PAGE VISIBILITY HANDLING ================= */

function handlePageVisibility() {
  if (document.hidden) return;

  try {
    /*
     * Revalidate state when the user returns to the app.
     * This helps when another browser tab changed storage.
     */
    loadState();
    validateFinalState();
    render();

  } catch (err) {
    console.error(
      '[PostX] Visibility refresh failed:',
      err
    );
  }
}

function bindVisibilityHandler() {

  if (window.__POSTX_VISIBILITY_BOUND) return;
  window.__POSTX_VISIBILITY_BOUND = true;

  document.addEventListener(
    'visibilitychange',
    handlePageVisibility
  );
}


/* ================= 12.8 STORAGE SYNCHRONIZATION ================= */

function bindStorageSync() {

  if (window.__POSTX_STORAGE_SYNC_BOUND) return;
  window.__POSTX_STORAGE_SYNC_BOUND = true;

  window.addEventListener('storage', event => {

    if (event.key !== APP.STORAGE_KEY) return;

    try {
      loadState();
      validateFinalState();
      render();

      showToast(
        'PostX was synchronized with another tab.',
        'info'
      );

    } catch (err) {
      console.error(
        '[PostX] Cross-tab synchronization failed:',
        err
      );
    }
  });
}


/* ================= 12.9 FINAL STARTUP ================= */

function initializePostX() {

  /*
   * Absolute startup guard.
   * Prevents duplicate initialization even if this
   * function is accidentally called more than once.
   */
  if (POSTX_FINAL.initialized ||
      window[POSTX_FINAL.startupKey]) {
    return;
  }

  POSTX_FINAL.initialized = true;
  window[POSTX_FINAL.startupKey] = true;

  try {

    /* 1. Verify browser storage */
    checkStorageHealth();

    /* 2. Load existing PostX data */
    loadState();

    /* 3. Validate and repair state */
    validateFinalState();

    /* 4. Clean invalid scheduled records */
    maintainScheduledPosts();

    /* 5. Install global error protection */
    installGlobalErrorHandlers();

    /* 6. Bind navigation */
    if (typeof bindNavigation === 'function') {
      bindNavigation();
    }

    /* 7. Bind cross-tab synchronization */
    bindStorageSync();

    /* 8. Bind visibility refresh */
    bindVisibilityHandler();

    /* 9. Render current page */
    if (typeof render === 'function') {
      render();
    }

    /* 10. Final active navigation state */
    if (typeof updateNavActiveState === 'function') {
      updateNavActiveState();
    }

    console.log(
      `[PostX] v${POSTX_FINAL.version} initialized successfully.`
    );

  } catch (err) {

    console.error(
      '[PostX] Fatal initialization error:',
      err
    );

    /*
     * Last-resort recovery.
     * Never leave the application completely blank
     * because of corrupted local state.
     */
    try {
      state = JSON.parse(
        JSON.stringify(DEFAULT_STATE)
      );

      if (typeof render === 'function') {
        render();
      }

      showToast(
        'PostX recovered from an initialization error.',
        'warning',
        5000
      );

    } catch (recoveryError) {

      console.error(
        '[PostX] Recovery failed:',
        recoveryError
      );
    }
  }
}


/* ================= 12.10 START WHEN DOM IS READY ================= */

if (document.readyState === 'loading') {

  document.addEventListener(
    'DOMContentLoaded',
    initializePostX,
    { once: true }
  );

} else {

  initializePostX();

}


/* ================= 12.11 FINAL API ================= */

/*
 * Expose only safe public helpers.
 * Internal implementation remains private to this IIFE.
 */
window.PostX = window.PostX || {};

window.PostX.version = POSTX_FINAL.version;

window.PostX.navigate = function(page) {
  if (typeof navigate === 'function') {
    navigate(page);
  }
};

window.PostX.refresh = function() {
  try {
    loadState();
    validateFinalState();
    render();
  } catch (err) {
    console.error('[PostX] Refresh failed:', err);
  }
};

window.PostX.getState = function() {
  return {
    posts: Array.isArray(state.posts)
      ? state.posts.map(post => ({ ...post }))
      : [],
    activePage: state.activePage,
    connectedAccounts: {
      ...state.connectedAccounts
    },
    profile: {
      ...state.profile
    }
  };
};

})();
