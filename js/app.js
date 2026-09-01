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
