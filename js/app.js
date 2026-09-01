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
