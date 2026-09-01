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
