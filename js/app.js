/*
=========================================================
                    POSTX
             Smart Social Media
=========================================================
                    app.js
=========================================================

CORE FRONTEND ENGINE

Features:
- Mobile navigation
- Create post
- Caption handling
- Image preview
- Facebook / Instagram selection
- Save drafts
- Publish locally
- Schedule posts
- Post history
- Delete posts
- Clear composer
- LocalStorage persistence
- Toast notifications
- Safe DOM handling
=========================================================
*/

(() => {
    "use strict";

    /* =====================================================
       POSTX CONFIGURATION
    ===================================================== */

    const APP_NAME = "PostX";

    const STORAGE_KEYS = {
        POSTS: "postx_posts",
        DRAFTS: "postx_drafts",
        SETTINGS: "postx_settings"
    };

    const DEFAULT_SETTINGS = {
        theme: "system"
    };


    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        selectedPlatforms: new Set(),
        selectedImage: null,
        editingDraftId: null
    };


    /* =====================================================
       DOM HELPERS
    ===================================================== */

    const $ = (selector, parent = document) => {
        return parent.querySelector(selector);
    };

    const $$ = (selector, parent = document) => {
        return Array.from(parent.querySelectorAll(selector));
    };

    const getElement = (...selectors) => {
        for (const selector of selectors) {
            const element = $(selector);
            if (element) return element;
        }

        return null;
    };


    /* =====================================================
       STORAGE HELPERS
    ===================================================== */

    function readStorage(key, fallback = []) {
        try {
            const value = localStorage.getItem(key);

            if (!value) {
                return fallback;
            }

            const parsed = JSON.parse(value);

            return parsed;
        } catch (error) {
            console.warn(`${APP_NAME}: Storage read error`, error);
            return fallback;
        }
    }


    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`${APP_NAME}: Storage write error`, error);
            showToast(
                "Storage is full. Remove some old posts or images.",
                "error"
            );
            return false;
        }
    }


    function getPosts() {
        const posts = readStorage(STORAGE_KEYS.POSTS, []);

        return Array.isArray(posts) ? posts : [];
    }


    function getDrafts() {
        const drafts = readStorage(STORAGE_KEYS.DRAFTS, []);

        return Array.isArray(drafts) ? drafts : [];
    }


    function savePosts(posts) {
        return writeStorage(STORAGE_KEYS.POSTS, posts);
    }


    function saveDrafts(drafts) {
        return writeStorage(STORAGE_KEYS.DRAFTS, drafts);
    }


    /* =====================================================
       ID GENERATOR
    ===================================================== */

    function createId(prefix = "post") {
        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).slice(2, 8)
        );
    }


    /* =====================================================
       DATE HELPERS
    ===================================================== */

    function formatDate(dateValue) {
        if (!dateValue) {
            return "Unknown date";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Unknown date";
        }

        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(message, type = "success") {
        let container = $("#postxToastContainer");

        if (!container) {
            container = document.createElement("div");
            container.id = "postxToastContainer";

            Object.assign(container.style, {
                position: "fixed",
                left: "16px",
                right: "16px",
                bottom: "20px",
                zIndex: "99999",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                pointerEvents: "none"
            });

            document.body.appendChild(container);
        }

        const toast = document.createElement("div");

        toast.textContent = message;

        Object.assign(toast.style, {
            padding: "13px 16px",
            borderRadius: "12px",
            background:
                type === "error"
                    ? "#b91c1c"
                    : type === "warning"
                    ? "#b45309"
                    : "#111827",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "600",
            boxShadow: "0 8px 25px rgba(0,0,0,.25)",
            opacity: "0",
            transform: "translateY(10px)",
            transition: "all .25s ease",
            pointerEvents: "auto"
        });

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateY(0)";
        });

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(10px)";

            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }


    /* =====================================================
       PLATFORM HELPERS
    ===================================================== */

    function normalizePlatform(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "");
    }


    function getPlatformLabel(platform) {
        const labels = {
            facebook: "Facebook",
            instagram: "Instagram",
            twitter: "X",
            x: "X",
            linkedin: "LinkedIn",
            tiktok: "TikTok"
        };

        return labels[normalizePlatform(platform)] || platform;
    }


    function setPlatformSelected(platform, selected) {
        platform = normalizePlatform(platform);

        if (selected) {
            state.selectedPlatforms.add(platform);
        } else {
            state.selectedPlatforms.delete(platform);
        }
    }


    function refreshPlatformButtons() {
        const buttons = $$(
            "[data-platform], .platform-btn, .social-platform"
        );

        buttons.forEach(button => {
            const platform =
                button.dataset.platform ||
                button.getAttribute("data-social") ||
                button.getAttribute("data-network");

            if (!platform) return;

            const active = state.selectedPlatforms.has(
                normalizePlatform(platform)
            );

            button.classList.toggle("active", active);
            button.classList.toggle("selected", active);

            button.setAttribute(
                "aria-pressed",
                active ? "true" : "false"
            );
        });
    }


    /* =====================================================
       NAVIGATION
    ===================================================== */

    function setupNavigation() {
        const navButtons = $$(
            "[data-page], [data-nav], .nav-item, .bottom-nav-item"
        );

        navButtons.forEach(button => {
            if (button.dataset.postxNavigationBound === "1") {
                return;
            }

            button.dataset.postxNavigationBound = "1";

            button.addEventListener("click", event => {
                const target =
                    button.dataset.page ||
                    button.dataset.nav ||
                    button.getAttribute("href");

                if (!target) return;

                if (target.startsWith("#")) {
                    event.preventDefault();
                    showPage(target.substring(1));
                } else if (
                    !target.includes(".html") &&
                    !target.startsWith("http")
                ) {
                    event.preventDefault();
                    showPage(target);
                }
            });
        });


        /*
         * Generic navigation links.
         */
        $$("[data-postx-page]").forEach(button => {
            if (button.dataset.postxNavigationBound === "1") {
                return;
            }

            button.dataset.postxNavigationBound = "1";

            button.addEventListener("click", event => {
                event.preventDefault();

                showPage(button.dataset.postxPage);
            });
        });
    }


    function showPage(pageName) {
        if (!pageName) return;

        pageName = String(pageName)
            .replace(/^#/, "")
            .trim();

        /*
         * Try common page naming conventions.
         */
        const possibleSelectors = [
            `[data-page-section="${pageName}"]`,
            `#${pageName}`,
            `.page-${pageName}`,
            `.${pageName}-page`
        ];

        let target = null;

        for (const selector of possibleSelectors) {
            try {
                target = $(selector);

                if (target) break;
            } catch {
                // Ignore invalid selector.
            }
        }

        /*
         * If a page exists, activate it.
         */
        if (target) {
            const sections = $$(
                "[data-page-section], .page-section, .app-page"
            );

            sections.forEach(section => {
                section.classList.remove("active");
                section.classList.remove("show");
                section.hidden = true;
            });

            target.hidden = false;
            target.classList.add("active");
            target.classList.add("show");

            /*
             * Update navigation state.
             */
            $$(
                "[data-page], [data-nav], [data-postx-page]"
            ).forEach(button => {
                const value =
                    button.dataset.page ||
                    button.dataset.nav ||
                    button.dataset.postxPage;

                button.classList.toggle(
                    "active",
                    value === pageName
                );
            });

            window.history.replaceState(
                null,
                "",
                "#" + pageName
            );

            refreshPageData(pageName);

            return;
        }


        /*
         * Dashboard fallback.
         */
        if (
            pageName === "dashboard" ||
            pageName === "home"
        ) {
            refreshDashboard();
        }
    }


    /* =====================================================
       IMAGE HANDLING
    ===================================================== */

    function findImageInput() {
        return getElement(
            "#postImage",
            "#imageInput",
            "#mediaInput",
            "#postMedia",
            'input[type="file"][accept*="image"]',
            'input[type="file"]'
        );
    }


    function findImagePreview() {
        return getElement(
            "#imagePreview",
            "#postImagePreview",
            ".image-preview",
            ".media-preview"
        );
    }


    function handleImageSelection(file) {
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showToast(
                "Please select a valid image file.",
                "error"
            );
            return;
        }

        /*
         * Keep a reasonable frontend limit.
         * This is not a server-side security limit.
         */
        if (file.size > 8 * 1024 * 1024) {
            showToast(
                "Image is too large. Please use an image under 8 MB.",
                "error"
            );
            return;
        }

        const reader = new FileReader();

        reader.onload = event => {
            state.selectedImage = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: event.target.result
            };

            renderImagePreview();

            showToast("Image added.");
        };

        reader.onerror = () => {
            showToast(
                "Unable to read the selected image.",
                "error"
            );
        };

        reader.readAsDataURL(file);
    }


    function renderImagePreview() {
        const preview = findImagePreview();

        if (!preview) return;

        preview.innerHTML = "";

        if (!state.selectedImage) {
            preview.style.display = "none";
            return;
        }

        preview.style.display = "block";

        const wrapper = document.createElement("div");

        wrapper.className = "postx-image-preview-wrapper";

        const image = document.createElement("img");

        image.src = state.selectedImage.data;
        image.alt = "Selected post image";

        Object.assign(image.style, {
            maxWidth: "100%",
            width: "100%",
            maxHeight: "280px",
            objectFit: "cover",
            borderRadius: "14px",
            display: "block"
        });

        const removeButton = document.createElement("button");

        removeButton.type = "button";
        removeButton.textContent = "Remove image";
        removeButton.className = "postx-remove-image";

        removeButton.addEventListener("click", () => {
            state.selectedImage = null;

            const input = findImageInput();

            if (input) {
                input.value = "";
            }

            renderImagePreview();

            showToast("Image removed.");
        });

        wrapper.appendChild(image);
        wrapper.appendChild(removeButton);

        preview.appendChild(wrapper);
    }


    function setupImageInput() {
        const input = findImageInput();

        if (!input) return;

        if (input.dataset.postxImageBound === "1") {
            return;
        }

        input.dataset.postxImageBound = "1";

        input.addEventListener("change", event => {
            const file = event.target.files?.[0];

            if (file) {
                handleImageSelection(file);
            }
        });
    }


    /* =====================================================
       COMPOSER
    ===================================================== */

    function findCaptionInput() {
        return getElement(
            "#postCaption",
            "#caption",
            "#postText",
            "#content",
            "#postContent",
            "textarea[name='caption']",
            "textarea"
        );
    }


    function findScheduleInput() {
        return getElement(
            "#scheduleDate",
            "#scheduledAt",
            "#scheduleTime",
            "#postSchedule",
            "input[type='datetime-local']"
        );
    }


    function getCaption() {
        const input = findCaptionInput();

        if (!input) return "";

        return String(input.value || "").trim();
    }


    function setCaption(value) {
        const input = findCaptionInput();

        if (input) {
            input.value = value || "";

            input.dispatchEvent(
                new Event("input", {
                    bubbles: true
                })
            );
        }
    }


    function getScheduledDate() {
        const input = findScheduleInput();

        if (!input || !input.value) {
            return null;
        }

        const date = new Date(input.value);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date.toISOString();
    }


    function validateComposer(requirePlatform = true) {
        const caption = getCaption();

        if (!caption && !state.selectedImage) {
            showToast(
                "Add a caption or image before continuing.",
                "warning"
            );

            return false;
        }

        if (
            requirePlatform &&
            state.selectedPlatforms.size === 0
        ) {
            showToast(
                "Select at least one social platform.",
                "warning"
            );

            return false;
        }

        return true;
    }


    function collectComposerData() {
        return {
            caption: getCaption(),
            platforms: Array.from(state.selectedPlatforms),
            image: state.selectedImage,
            scheduledAt: getScheduledDate()
        };
    }


    /* =====================================================
       CREATE POST
    ===================================================== */

    function createPost(status = "published") {
        if (!validateComposer(true)) {
            return null;
        }

        const data = collectComposerData();

        const post = {
            id: createId("post"),
            caption: data.caption,
            platforms: data.platforms,
            image: data.image,
            status,
            scheduledAt:
                status === "scheduled"
                    ? data.scheduledAt
                    : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const posts = getPosts();

        posts.unshift(post);

        if (!savePosts(posts)) {
            return null;
        }

        clearComposer();

        renderAll();

        if (status === "scheduled") {
            showToast("Post scheduled successfully.");
        } else {
            showToast(
                "Post saved as published locally."
            );
        }

        return post;
    }


    /* =====================================================
       SAVE DRAFT
    ===================================================== */

    function saveCurrentDraft() {
        const data = collectComposerData();

        if (!data.caption && !data.image) {
            showToast(
                "Add some content before saving a draft.",
                "warning"
            );

            return null;
        }

        const drafts = getDrafts();

        let draft;

        if (state.editingDraftId) {
            const index = drafts.findIndex(
                item => item.id === state.editingDraftId
            );

            if (index !== -1) {
                draft = {
                    ...drafts[index],
                    caption: data.caption,
                    platforms: data.platforms,
                    image: data.image,
                    scheduledAt: data.scheduledAt,
                    updatedAt: new Date().toISOString()
                };

                drafts[index] = draft;
            }
        }

        if (!draft) {
            draft = {
                id: createId("draft"),
                caption: data.caption,
                platforms: data.platforms,
                image: data.image,
                scheduledAt: data.scheduledAt,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            drafts.unshift(draft);
        }

        if (!saveDrafts(drafts)) {
            return null;
        }

        state.editingDraftId = null;

        clearComposer();

        renderAll();

        showToast("Draft saved.");

        return draft;
    }


    /* =====================================================
       LOAD DRAFT
    ===================================================== */

    function loadDraft(id) {
        const drafts = getDrafts();

        const draft = drafts.find(
            item => item.id === id
        );

        if (!draft) {
            showToast(
                "Draft could not be found.",
                "error"
            );
            return;
        }

        state.editingDraftId = draft.id;

        setCaption(draft.caption || "");

        state.selectedPlatforms = new Set(
            Array.isArray(draft.platforms)
                ? draft.platforms.map(normalizePlatform)
                : []
        );

        state.selectedImage = draft.image || null;

        const scheduleInput = findScheduleInput();

        if (scheduleInput) {
            if (draft.scheduledAt) {
                const date = new Date(draft.scheduledAt);

                if (!Number.isNaN(date.getTime())) {
                    const offset =
                        date.getTimezoneOffset();

                    const localDate = new Date(
                        date.getTime() -
                            offset * 60 * 1000
                    );

                    scheduleInput.value =
                        localDate
                            .toISOString()
                            .slice(0, 16);
                }
            } else {
                scheduleInput.value = "";
            }
        }

        refreshPlatformButtons();
        renderImagePreview();

        showPage("create");

        showToast("Draft loaded.");
    }


    /* =====================================================
       DELETE DRAFT
    ===================================================== */

    function deleteDraft(id) {
        const drafts = getDrafts();

        const filtered = drafts.filter(
            draft => draft.id !== id
        );

        if (filtered.length === drafts.length) {
            return;
        }

        if (saveDrafts(filtered)) {
            renderDrafts();

            showToast("Draft deleted.");
        }
    }


    /* =====================================================
       DELETE POST
    ===================================================== */

    function deletePost(id) {
        const posts = getPosts();

        const filtered = posts.filter(
            post => post.id !== id
        );

        if (filtered.length === posts.length) {
            return;
        }

        if (savePosts(filtered)) {
            renderPosts();
            refreshDashboard();

            showToast("Post deleted.");
        }
    }


    /* =====================================================
       CLEAR COMPOSER
    ===================================================== */

    function clearComposer() {
        const captionInput = findCaptionInput();

        if (captionInput) {
            captionInput.value = "";
        }

        const scheduleInput = findScheduleInput();

        if (scheduleInput) {
            scheduleInput.value = "";
        }

        const imageInput = findImageInput();

        if (imageInput) {
            imageInput.value = "";
        }

        state.selectedPlatforms.clear();
        state.selectedImage = null;
        state.editingDraftId = null;

        refreshPlatformButtons();
        renderImagePreview();

        updateCharacterCount();
    }


    /* =====================================================
       CHARACTER COUNTER
    ===================================================== */

    function updateCharacterCount() {
        const input = findCaptionInput();

        if (!input) return;

        const count =
            input.value?.length || 0;

        const counters = $$(
            "#characterCount, #captionCount, .character-count, [data-character-count]"
        );

        counters.forEach(counter => {
            counter.textContent = count;
        });
    }


    /* =====================================================
       PLATFORM SELECTION
    ===================================================== */

    function setupPlatformSelection() {
        const buttons = $$(
            "[data-platform], .platform-btn, .social-platform"
        );

        buttons.forEach(button => {
            if (button.dataset.postxPlatformBound === "1") {
                return;
            }

            button.dataset.postxPlatformBound = "1";

            button.addEventListener("click", event => {
                event.preventDefault();

                const platform =
                    button.dataset.platform ||
                    button.getAttribute("data-social") ||
                    button.getAttribute("data-network");

                if (!platform) return;

                const normalized =
                    normalizePlatform(platform);

                const selected =
                    state.selectedPlatforms.has(
                        normalized
                    );

                setPlatformSelected(
                    normalized,
                    !selected
                );

                refreshPlatformButtons();
            });
        });
    }


    /* =====================================================
       ACTION BUTTONS
    ===================================================== */

    function setupActionButtons() {
        /*
         * Publish buttons
         */
        $$(
            "#publishPost, #publishBtn, [data-action='publish'], .publish-btn"
        ).forEach(button => {
            if (button.dataset.postxActionBound === "1") {
                return;
            }

            button.dataset.postxActionBound = "1";

            button.addEventListener("click", event => {
                event.preventDefault();

                createPost("published");
            });
        });


        /*
         * Schedule buttons
         */
        $$(
            "#schedulePost, #scheduleBtn, [data-action='schedule'], .schedule-btn"
        ).forEach(button => {
            if (button.dataset.postxActionBound === "1") {
                return;
            }

            button.dataset.postxActionBound = "1";

            button.addEventListener("click", event => {
                event.preventDefault();

                if (!validateComposer(true)) {
                    return;
                }

                const scheduleInput =
                    findScheduleInput();

                if (
                    !scheduleInput ||
                    !scheduleInput.value
                ) {
                    showToast(
                        "Choose a date and time first.",
                        "warning"
                    );

                    return;
                }

                const scheduledDate =
                    new Date(scheduleInput.value);

                if (
                    Number.isNaN(
                        scheduledDate.getTime()
                    )
                ) {
                    showToast(
                        "Choose a valid date and time.",
                        "error"
                    );

                    return;
                }

                if (
                    scheduledDate.getTime() <=
                    Date.now()
                ) {
                    showToast(
                        "Scheduled time must be in the future.",
                        "warning"
                    );

                    return;
                }

                createPost("scheduled");
            });
        });


        /*
         * Draft buttons
         */
        $$(
            "#saveDraft, #saveDraftBtn, [data-action='draft'], .save-draft-btn"
        ).forEach(button => {
            if (button.dataset.postxActionBound === "1") {
                return;
            }

            button.dataset.postxActionBound = "1";

            button.addEventListener("click", event => {
                event.preventDefault();

                saveCurrentDraft();
            });
        });


        /*
         * Clear buttons
         */
        $$(
            "#clearPost, #clearComposer, #clearBtn, [data-action='clear'], .clear-btn"
        ).forEach(button => {
            if (button.dataset.postxActionBound === "1") {
                return;
            }

            button.dataset.postxActionBound = "1";

            button.addEventListener("click", event => {
                event.preventDefault();

                clearComposer();

                showToast("Composer cleared.");
            });
        });


        /*
         * Create post buttons
         */
        $$(
            "#createPost, [data-action='create'], .create-post-btn"
        ).forEach(button => {
            if (button.dataset.postxActionBound === "1") {
                return;
            }

            button.dataset.postxActionBound = "1";

            button.addEventListener("click", event => {
                event.preventDefault();

                showPage("create");
            });
        });


        /*
         * Draft navigation
         */
        $$(
            "#draftsBtn, [data-action='drafts'], .drafts-btn"
        ).forEach(button => {
            if (button.dataset.postxActionBound === "1") {
                return;
            }

            button.dataset.postxActionBound = "1";

            button.addEventListener("click", event => {
                event.preventDefault();

                showPage("drafts");
            });
        });


        /*
         * History navigation
         */
        $$(
            "#historyBtn, [data-action='history'], .history-btn"
        ).forEach(button => {
            if (button.dataset.postxActionBound === "1") {
                return;
            }

            button.dataset.postxActionBound = "1";

            button.addEventListener("click", event => {
                event.preventDefault();

                showPage("history");
            });
        });
    }


    /* =====================================================
       EVENT DELEGATION
    ===================================================== */

    function setupGlobalActions() {
        document.addEventListener("click", event => {
            const loadDraftButton =
                event.target.closest(
                    "[data-load-draft]"
                );

            if (loadDraftButton) {
                event.preventDefault();

                loadDraft(
                    loadDraftButton.dataset.loadDraft
                );

                return;
            }


            const deleteDraftButton =
                event.target.closest(
                    "[data-delete-draft]"
                );

            if (deleteDraftButton) {
                event.preventDefault();

                const id =
                    deleteDraftButton.dataset.deleteDraft;

                if (
                    window.confirm(
                        "Delete this draft?"
                    )
                ) {
                    deleteDraft(id);
                }

                return;
            }


            const deletePostButton =
                event.target.closest(
                    "[data-delete-post]"
                );

            if (deletePostButton) {
                event.preventDefault();

                const id =
                    deletePostButton.dataset.deletePost;

                if (
                    window.confirm(
                        "Delete this post?"
                    )
                ) {
                    deletePost(id);
                }

                return;
            }


            const editPostButton =
                event.target.closest(
                    "[data-edit-post]"
                );

            if (editPostButton) {
                event.preventDefault();

                editPost(
                    editPostButton.dataset.editPost
                );

                return;
            }
        });
    }


    /* =====================================================
       RENDER POST CARD
    ===================================================== */

    function createPostCard(post) {
        const card = document.createElement("article");

        card.className = "postx-post-card";

        const header = document.createElement("div");

        header.className = "postx-post-header";

        const status = document.createElement("span");

        status.className =
            "postx-status postx-status-" +
            String(post.status || "published")
                .toLowerCase();

        status.textContent =
            String(post.status || "published")
                .replace(/^\w/, c => c.toUpperCase());

        const date = document.createElement("small");

        date.textContent = formatDate(
            post.createdAt
        );

        header.appendChild(status);
        header.appendChild(date);

        card.appendChild(header);


        /*
         * Image
         */
        if (post.image?.data) {
            const image = document.createElement("img");

            image.src = post.image.data;
            image.alt = "Post image";

            image.loading = "lazy";

            image.className = "postx-post-image";

            card.appendChild(image);
        }


        /*
         * Caption
         */
        if (post.caption) {
            const caption = document.createElement("p");

            caption.className = "postx-post-caption";

            caption.textContent = post.caption;

            card.appendChild(caption);
        }


        /*
         * Platforms
         */
        if (
            Array.isArray(post.platforms) &&
            post.platforms.length
        ) {
            const platforms =
                document.createElement("div");

            platforms.className =
                "postx-post-platforms";

            post.platforms.forEach(platform => {
                const badge =
                    document.createElement("span");

                badge.className =
                    "postx-platform-badge";

                badge.textContent =
                    getPlatformLabel(platform);

                platforms.appendChild(badge);
            });

            card.appendChild(platforms);
        }


        /*
         * Schedule information
         */
        if (
            post.status === "scheduled" &&
            post.scheduledAt
        ) {
            const schedule =
                document.createElement("div");

            schedule.className =
                "postx-scheduled-time";

            schedule.textContent =
                "Scheduled: " +
                formatDate(post.scheduledAt);

            card.appendChild(schedule);
        }


        /*
         * Actions
         */
        const actions =
            document.createElement("div");

        actions.className = "postx-post-actions";

        const editButton =
            document.createElement("button");

        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.dataset.editPost = post.id;

        const deleteButton =
            document.createElement("button");

        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.dataset.deletePost = post.id;

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        card.appendChild(actions);

        return card;
    }


    /* =====================================================
       RENDER POSTS
    ===================================================== */

    function renderPosts() {
        const containers = [
            getElement("#postsList"),
            getElement("#postHistory"),
            getElement("#historyList"),
            getElement("#publishedPosts")
        ].filter(Boolean);

        if (!containers.length) return;

        const posts = getPosts();

        containers.forEach(container => {
            container.innerHTML = "";

            if (!posts.length) {
                const empty =
                    document.createElement("div");

                empty.className =
                    "postx-empty-state";

                empty.textContent =
                    "No posts yet.";

                container.appendChild(empty);

                return;
            }

            posts.forEach(post => {
                container.appendChild(
                    createPostCard(post)
                );
            });
        });
    }


    /* =====================================================
       RENDER DRAFT CARD
    ===================================================== */

    function createDraftCard(draft) {
        const card =
            document.createElement("article");

        card.className =
            "postx-draft-card";


        const title =
            document.createElement("h3");

        title.textContent =
            draft.caption
                ? draft.caption.slice(0, 70)
                : "Image draft";

        card.appendChild(title);


        const date =
            document.createElement("small");

        date.textContent =
            "Updated " +
            formatDate(draft.updatedAt);

        card.appendChild(date);


        if (
            Array.isArray(draft.platforms) &&
            draft.platforms.length
        ) {
            const platforms =
                document.createElement("p");

            platforms.textContent =
                draft.platforms
                    .map(getPlatformLabel)
                    .join(" • ");

            card.appendChild(platforms);
        }


        const actions =
            document.createElement("div");

        actions.className =
            "postx-draft-actions";


        const loadButton =
            document.createElement("button");

        loadButton.type = "button";
        loadButton.textContent = "Load";
        loadButton.dataset.loadDraft =
            draft.id;


        const deleteButton =
            document.createElement("button");

        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.dataset.deleteDraft =
            draft.id;


        actions.appendChild(loadButton);
        actions.appendChild(deleteButton);

        card.appendChild(actions);

        return card;
    }


    /* =====================================================
       RENDER DRAFTS
    ===================================================== */

    function renderDrafts() {
        const containers = [
            getElement("#draftsList"),
            getElement("#draftList"),
            getElement("#savedDrafts")
        ].filter(Boolean);

        if (!containers.length) return;

        const drafts = getDrafts();

        containers.forEach(container => {
            container.innerHTML = "";

            if (!drafts.length) {
                const empty =
                    document.createElement("div");

                empty.className =
                    "postx-empty-state";

                empty.textContent =
                    "No saved drafts.";

                container.appendChild(empty);

                return;
            }

            drafts.forEach(draft => {
                container.appendChild(
                    createDraftCard(draft)
                );
            });
        });
    }


    /* =====================================================
       EDIT POST
    ===================================================== */

    function editPost(id) {
        const posts = getPosts();

        const post = posts.find(
            item => item.id === id
        );

        if (!post) {
            showToast(
                "Post could not be found.",
                "error"
            );

            return;
        }

        setCaption(post.caption || "");

        state.selectedPlatforms = new Set(
            Array.isArray(post.platforms)
                ? post.platforms.map(normalizePlatform)
                : []
        );

        state.selectedImage = post.image || null;

        refreshPlatformButtons();
        renderImagePreview();

        /*
         * Convert scheduled time back to
         * datetime-local format.
         */
        const scheduleInput =
            findScheduleInput();

        if (
            scheduleInput &&
            post.scheduledAt
        ) {
            const date =
                new Date(post.scheduledAt);

            if (!Number.isNaN(date.getTime())) {
                const offset =
                    date.getTimezoneOffset();

                const localDate =
                    new Date(
                        date.getTime() -
                            offset * 60 * 1000
                    );

                scheduleInput.value =
                    localDate
                        .toISOString()
                        .slice(0, 16);
            }
        }

        showPage("create");

        showToast(
            "Post loaded into composer."
        );
    }


    /* =====================================================
       DASHBOARD
    ===================================================== */

    function refreshDashboard() {
        const posts = getPosts();
        const drafts = getDrafts();

        const published =
            posts.filter(
                post =>
                    post.status === "published"
            ).length;

        const scheduled =
            posts.filter(
                post =>
                    post.status === "scheduled"
            ).length;


        /*
         * Support multiple possible counter IDs.
         */
        const counters = {
            "#totalPosts": posts.length,
            "#postCount": posts.length,
            "#totalDrafts": drafts.length,
            "#draftCount": drafts.length,
            "#scheduledCount": scheduled,
            "#publishedCount": published
        };


        Object.entries(counters).forEach(
            ([selector, value]) => {
                const element = $(selector);

                if (element) {
                    element.textContent = value;
                }
            }
        );


        /*
         * Data attributes:
         */
        $$("[data-postx-stat]").forEach(element => {
            const stat =
                element.dataset.postxStat;

            if (stat === "posts") {
                element.textContent =
                    posts.length;
            }

            if (stat === "drafts") {
                element.textContent =
                    drafts.length;
            }

            if (stat === "scheduled") {
                element.textContent =
                    scheduled;
            }

            if (stat === "published") {
                element.textContent =
                    published;
            }
        });
    }


    /* =====================================================
       REFRESH PAGE DATA
    ===================================================== */

    function refreshPageData(pageName) {
        const page =
            String(pageName || "").toLowerCase();

        if (
            page === "dashboard" ||
            page === "home"
        ) {
            refreshDashboard();
        }

        if (
            page === "history" ||
            page === "posts"
        ) {
            renderPosts();
        }

        if (page === "drafts") {
            renderDrafts();
        }
    }


    function renderAll() {
        renderPosts();
        renderDrafts();
        refreshDashboard();
    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    function loadSettings() {
        const stored =
            readStorage(
                STORAGE_KEYS.SETTINGS,
                DEFAULT_SETTINGS
            );

        return {
            ...DEFAULT_SETTINGS,
            ...(stored || {})
        };
    }


    function saveSettings(settings) {
        return writeStorage(
            STORAGE_KEYS.SETTINGS,
            settings
        );
    }


    /* =====================================================
       THEME
    ===================================================== */

    function setupTheme() {
        const settings = loadSettings();

        if (settings.theme === "dark") {
            document.documentElement.classList.add(
                "dark"
            );
        }


        $$(
            "[data-theme], #themeToggle, #darkModeToggle"
        ).forEach(button => {
            if (
                button.dataset.postxThemeBound === "1"
            ) {
                return;
            }

            button.dataset.postxThemeBound = "1";

            button.addEventListener(
                "click",
                event => {
                    event.preventDefault();

                    const isDark =
                        document.documentElement.classList.toggle(
                            "dark"
                        );

                    saveSettings({
                        ...loadSettings(),
                        theme: isDark
                            ? "dark"
                            : "system"
                    });
                }
            );
        });
    }


    /* =====================================================
       ONLINE / OFFLINE STATUS
    ===================================================== */

    function updateConnectionStatus() {
        const online =
            navigator.onLine;

        $$(
            "#connectionStatus, [data-connection-status]"
        ).forEach(element => {
            element.textContent = online
                ? "Online"
                : "Offline";

            element.classList.toggle(
                "online",
                online
            );

            element.classList.toggle(
                "offline",
                !online
            );
        });
    }


    function setupConnectionEvents() {
        window.addEventListener(
            "online",
            () => {
                updateConnectionStatus();

                showToast(
                    "Internet connection restored."
                );
            }
        );

        window.addEventListener(
            "offline",
            () => {
                updateConnectionStatus();

                showToast(
                    "You are offline. Local drafts still work.",
                    "warning"
                );
            }
        );
    }


    /* =====================================================
       SERVICE WORKER
    ===================================================== */

    function registerServiceWorker() {
        if (
            "serviceWorker" in navigator
        ) {
            window.addEventListener(
                "load",
                () => {
                    navigator.serviceWorker
                        .register("./sw.js")
                        .then(registration => {
                            console.log(
                                `${APP_NAME}: Service worker registered`,
                                registration.scope
                            );
                        })
                        .catch(error => {
                            console.warn(
                                `${APP_NAME}: Service worker registration failed`,
                                error
                            );
                        });
                }
            );
        }
    }


    /* =====================================================
       KEYBOARD SHORTCUTS
    ===================================================== */

    function setupKeyboardShortcuts() {
        document.addEventListener(
            "keydown",
            event => {
                /*
                 * Ctrl/Cmd + Enter = save draft
                 */
                if (
                    (event.ctrlKey ||
                        event.metaKey) &&
                    event.key === "Enter"
                ) {
                    const active =
                        document.activeElement;

                    if (
                        active &&
                        (
                            active.tagName ===
                                "TEXTAREA" ||
                            active.tagName ===
                                "INPUT"
                        )
                    ) {
                        event.preventDefault();

                        saveCurrentDraft();
                    }
                }
            }
        );
    }


    /* =====================================================
       URL HASH ROUTING
    ===================================================== */

    function setupHashRouting() {
        window.addEventListener(
            "hashchange",
            () => {
                const hash =
                    window.location.hash
                        .replace("#", "")
                        .trim();

                if (hash) {
                    showPage(hash);
                }
            }
        );

        const initialHash =
            window.location.hash
                .replace("#", "")
                .trim();

        if (initialHash) {
            showPage(initialHash);
        }
    }


    /* =====================================================
       CAPTION EVENTS
    ===================================================== */

    function setupCaptionEvents() {
        const input =
            findCaptionInput();

        if (!input) return;

        if (
            input.dataset.postxCaptionBound ===
            "1"
        ) {
            return;
        }

        input.dataset.postxCaptionBound = "1";

        input.addEventListener(
            "input",
            updateCharacterCount
        );

        updateCharacterCount();
    }


    /* =====================================================
       DATE INPUT SETUP
    ===================================================== */

    function setupScheduleInput() {
        const input =
            findScheduleInput();

        if (!input) return;

        /*
         * Set minimum time to current time.
         */
        try {
            const now = new Date();

            const offset =
                now.getTimezoneOffset();

            const localNow =
                new Date(
                    now.getTime() -
                        offset * 60 * 1000
                );

            input.min =
                localNow
                    .toISOString()
                    .slice(0, 16);
        } catch {
            // Ignore.
        }
    }


    /* =====================================================
       FORM SUBMISSION
    ===================================================== */

    function setupForms() {
        $$("form").forEach(form => {
            if (
                form.dataset.postxFormBound ===
                "1"
            ) {
                return;
            }

            form.dataset.postxFormBound = "1";

            form.addEventListener(
                "submit",
                event => {
                    /*
                     * Only intercept forms that
                     * appear to belong to PostX.
                     */
                    const isPostForm =
                        form.id?.toLowerCase().includes("post") ||
                        form.className?.toString()
                            .toLowerCase()
                            .includes("post") ||
                        form.querySelector(
                            "textarea"
                        );

                    if (!isPostForm) {
                        return;
                    }

                    event.preventDefault();

                    createPost("published");
                }
            );
        });
    }


    /* =====================================================
       PWA INSTALL PROMPT
    ===================================================== */

    let deferredInstallPrompt = null;


    function setupInstallPrompt() {
        window.addEventListener(
            "beforeinstallprompt",
            event => {
                event.preventDefault();

                deferredInstallPrompt = event;

                $$(
                    "#installApp, #installBtn, [data-action='install']"
                ).forEach(button => {
                    button.hidden = false;

                    if (
                        button.dataset.postxInstallBound ===
                        "1"
                    ) {
                        return;
                    }

                    button.dataset.postxInstallBound =
                        "1";

                    button.addEventListener(
                        "click",
                        async () => {
                            if (
                                !deferredInstallPrompt
                            ) {
                                return;
                            }

                            deferredInstallPrompt.prompt();

                            await deferredInstallPrompt.userChoice;

                            deferredInstallPrompt =
                                null;
                        }
                    );
                });
            }
        );


        window.addEventListener(
            "appinstalled",
            () => {
                deferredInstallPrompt = null;

                showToast(
                    "PostX installed successfully."
                );
            }
        );
    }


    /* =====================================================
       GLOBAL API
    ===================================================== */

    window.PostX = {
        state,

        getPosts,
        getDrafts,

        createPost,
        saveDraft: saveCurrentDraft,
        loadDraft,
        deleteDraft,
        deletePost,

        clearComposer,

        showPage,
        refreshDashboard,
        renderPosts,
        renderDrafts,
        renderAll,

        showToast
    };


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    function init() {
        console.log(
            `%c${APP_NAME} initialized`,
            "font-weight:bold;"
        );

        setupNavigation();

        setupPlatformSelection();

        setupImageInput();

        setupActionButtons();

        setupGlobalActions();

        setupCaptionEvents();

        setupScheduleInput();

        setupForms();

        setupTheme();

        setupConnectionEvents();

        setupKeyboardShortcuts();

        setupHashRouting();

        setupInstallPrompt();

        registerServiceWorker();

        refreshPlatformButtons();

        renderImagePreview();

        renderAll();

        updateConnectionStatus();

        updateCharacterCount();
    }


    /* =====================================================
       START
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }

})();
