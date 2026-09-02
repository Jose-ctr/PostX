/* =========================================================
   POSTX — UNIVERSAL COMPOSER ENGINE
   PostX • Facebook • Instagram • Schedule • Boost • Drafts
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     ELEMENTS
     ======================================================= */

  const form = document.getElementById("postForm");

  if (!form) {
    return;
  }

  const mediaInput = document.getElementById("mediaInput");
  const mediaPreview = document.getElementById("mediaPreview");

  const caption = document.getElementById("caption");
  const captionCount = document.getElementById("captionCount");

  const postText = document.getElementById("postText");
  const locationInput = document.getElementById("location");
  const hashtags = document.getElementById("hashtags");

  const scheduleControls =
    document.getElementById("scheduleControls");

  const scheduleDate =
    document.getElementById("scheduleDate");

  const scheduleTime =
    document.getElementById("scheduleTime");

  const boostToggle =
    document.getElementById("boostToggle");

  const boostControls =
    document.getElementById("boostControls");

  const boostPrice =
    document.getElementById("boostPrice");

  const publishButton =
    document.getElementById("publishBtn");

  const publishButtonText =
    document.getElementById("publishButtonText");

  const saveDraftButton =
    document.getElementById("saveDraftBtn");

  /* =======================================================
     COMPOSER STATE
     ======================================================= */

  let selectedMedia = null;

  let boostState = {
    enabled: false,
    location: null,
    price: 0,
    duration: null
  };

  /* =======================================================
     HELPERS
     ======================================================= */

  function toast(message, type = "success") {
    if (window.PostX?.toast) {
      window.PostX.toast(message, type);
    } else {
      alert(message);
    }
  }

  function getSelectedPlatforms() {
    return [
      ...document.querySelectorAll(
        'input[name="platform"]:checked'
      )
    ].map(input => input.value);
  }

  function getPublishMode() {
    const selected =
      document.querySelector(
        'input[name="publishMode"]:checked'
      );

    return selected ? selected.value : "now";
  }

  function getFormData() {
    return {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `post_${Date.now()}`,

      caption:
        caption?.value.trim() || "",

      text:
        postText?.value.trim() || "",

      location:
        locationInput?.value.trim() || "",

      hashtags:
        hashtags?.value
          .trim()
          .split(/\s+/)
          .filter(Boolean) || [],

      platforms:
        getSelectedPlatforms(),

      publishMode:
        getPublishMode(),

      scheduleDate:
        scheduleDate?.value || null,

      scheduleTime:
        scheduleTime?.value || null,

      media: selectedMedia
        ? {
            name: selectedMedia.name,
            type: selectedMedia.type,
            size: selectedMedia.size
          }
        : null,

      boost: {
        ...boostState
      },

      createdAt:
        new Date().toISOString()
    };
  }

  /* =======================================================
     MEDIA UPLOAD
     ======================================================= */

  function handleMediaUpload() {
    if (!mediaInput) {
      return;
    }

    mediaInput.addEventListener(
      "change",
      event => {
        const file =
          event.target.files?.[0];

        if (!file) {
          return;
        }

        const allowedTypes = [
          "image/",
          "video/"
        ];

        const validType =
          allowedTypes.some(prefix =>
            file.type.startsWith(prefix)
          );

        if (!validType) {
          toast(
            "Please select an image or video.",
            "error"
          );

          mediaInput.value = "";
          return;
        }

        selectedMedia = file;

        showMediaPreview(file);
      }
    );
  }

  function showMediaPreview(file) {
    if (!mediaPreview) {
      return;
    }

    mediaPreview.innerHTML = "";

    const objectURL =
      URL.createObjectURL(file);

    let element;

    if (file.type.startsWith("video/")) {
      element =
        document.createElement("video");

      element.controls = true;
      element.playsInline = true;
    } else {
      element =
        document.createElement("img");

      element.alt = "Post preview";
    }

    element.src = objectURL;

    mediaPreview.appendChild(element);

    mediaPreview.style.display = "block";
  }

  /* =======================================================
     CAPTION COUNTER
     ======================================================= */

  function handleCaptionCounter() {
    if (!caption || !captionCount) {
      return;
    }

    const update = () => {
      captionCount.textContent =
        caption.value.length;
    };

    caption.addEventListener(
      "input",
      update
    );

    update();
  }

  /* =======================================================
     PUBLISH MODE
     ======================================================= */

  function handlePublishMode() {
    document
      .querySelectorAll(
        'input[name="publishMode"]'
      )
      .forEach(input => {
        input.addEventListener(
          "change",
          () => {
            const mode =
              getPublishMode();

            if (mode === "schedule") {
              scheduleControls?.classList.add(
                "active"
              );

              if (publishButtonText) {
                publishButtonText.textContent =
                  "Schedule Post";
              }
            } else {
              scheduleControls?.classList.remove(
                "active"
              );

              if (publishButtonText) {
                publishButtonText.textContent =
                  "Post Everywhere";
              }
            }
          }
        );
      });
  }

  /* =======================================================
     BOOST TOGGLE
     ======================================================= */

  function handleBoostToggle() {
    if (!boostToggle) {
      return;
    }

    boostToggle.addEventListener(
      "change",
      () => {
        boostState.enabled =
          boostToggle.checked;

        if (boostState.enabled) {
          boostControls?.classList.add(
            "active"
          );

          updateBoostSummary();
        } else {
          boostControls?.classList.remove(
            "active"
          );

          boostState = {
            enabled: false,
            location: null,
            price: 0,
            duration: null
          };

          updateBoostSummary();
        }
      }
    );
  }

  /* =======================================================
     BOOST LOCATION
     ======================================================= */

  function handleBoostLocations() {
    document
      .querySelectorAll(
        "[data-location]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            document
              .querySelectorAll(
                "[data-location]"
              )
              .forEach(item =>
                item.classList.remove(
                  "active"
                )
              );

            button.classList.add("active");

            boostState.location =
              button.dataset.location;

            boostState.price =
              Number(
                button.dataset.price || 0
              );

            updateBoostSummary();
          }
        );
      });
  }

  /* =======================================================
     BOOST DURATION
     ======================================================= */

  function handleBoostDurations() {
    document
      .querySelectorAll(
        "[data-duration]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            document
              .querySelectorAll(
                "[data-duration]"
              )
              .forEach(item =>
                item.classList.remove(
                  "active"
                )
              );

            button.classList.add("active");

            boostState.duration =
              button.dataset.duration;

            updateBoostSummary();
          }
        );
      });
  }

  /* =======================================================
     BOOST SUMMARY
     ======================================================= */

  function updateBoostSummary() {
    if (!boostPrice) {
      return;
    }

    if (!boostState.enabled) {
      boostPrice.textContent =
        "KSh 0";

      return;
    }

    boostPrice.textContent =
      `KSh ${boostState.price}`;
  }

  /* =======================================================
     VALIDATION
     ======================================================= */

  function validatePost(post) {
    if (
      !post.caption &&
      !post.text &&
      !post.media
    ) {
      return {
        valid: false,
        message:
          "Add text, a caption, or media before posting."
      };
    }

    if (post.platforms.length === 0) {
      return {
        valid: false,
        message:
          "Select at least one publishing platform."
      };
    }

    if (post.publishMode === "schedule") {
      if (
        !post.scheduleDate ||
        !post.scheduleTime
      ) {
        return {
          valid: false,
          message:
            "Choose a schedule date and time."
        };
      }

      const scheduled =
        new Date(
          `${post.scheduleDate}T${post.scheduleTime}`
        );

      if (
        Number.isNaN(
          scheduled.getTime()
        )
      ) {
        return {
          valid: false,
          message:
            "The selected schedule time is invalid."
        };
      }

      if (
        scheduled.getTime() <= Date.now()
      ) {
        return {
          valid: false,
          message:
            "Schedule time must be in the future."
        };
      }
    }

    if (post.boost.enabled) {
      if (!post.boost.location) {
        return {
          valid: false,
          message:
            "Select a Boost location."
        };
      }

      if (!post.boost.duration) {
        return {
          valid: false,
          message:
            "Select a Boost duration."
        };
      }
    }

    return {
      valid: true
    };
  }

  /* =======================================================
     SAVE DRAFT
     ======================================================= */

  function saveDraft() {
    const post =
      getFormData();

    const state =
      window.PostX.getState();

    state.drafts.push({
      ...post,
      status: "draft"
    });

    window.PostX.saveState();

    toast(
      "Draft saved successfully."
    );

    updateCounters();
  }

  /* =======================================================
     SCHEDULE POST
     ======================================================= */

  function schedulePost(post) {
    const state =
      window.PostX.getState();

    state.scheduled.push({
      ...post,
      status: "scheduled"
    });

    window.PostX.saveState();

    toast(
      "Post scheduled successfully."
    );

    updateCounters();

    resetComposer();
  }

  /* =======================================================
     PUBLISH POST
     ======================================================= */

  function publishPost(post) {
    /*
      FRONTEND MVP BEHAVIOUR

      This records the publishing request locally.

      Production publishing must be connected to the
      PostX backend, which will securely communicate with
      official Facebook and Instagram APIs.
    */

    const state =
      window.PostX.getState();

    state.published.push({
      ...post,
      status: "published",
      publishedAt:
        new Date().toISOString()
    });

    window.PostX.saveState();

    toast(
      "Post published to your PostX workspace."
    );

    updateCounters();

    resetComposer();
  }

  /* =======================================================
     MAIN PUBLISH HANDLER
     ======================================================= */

  function handleSubmit(event) {
    event.preventDefault();

    const post =
      getFormData();

    const validation =
      validatePost(post);

    if (!validation.valid) {
      toast(
        validation.message,
        "error"
      );

      return;
    }

    if (publishButton) {
      publishButton.disabled = true;
      publishButton.classList.add(
        "loading"
      );
    }

    setTimeout(() => {
      if (
        post.publishMode ===
        "schedule"
      ) {
        schedulePost(post);
      } else {
        publishPost(post);
      }

      if (publishButton) {
        publishButton.disabled = false;
        publishButton.classList.remove(
          "loading"
        );
      }
    }, 500);
  }

  /* =======================================================
     RESET
     ======================================================= */

  function resetComposer() {
    form.reset();

    selectedMedia = null;

    boostState = {
      enabled: false,
      location: null,
      price: 0,
      duration: null
    };

    if (mediaPreview) {
      mediaPreview.innerHTML = "";
      mediaPreview.style.display =
        "none";
    }

    scheduleControls?.classList.remove(
      "active"
    );

    boostControls?.classList.remove(
      "active"
    );

    document
      .querySelectorAll(
        ".option-button.active"
      )
      .forEach(button =>
        button.classList.remove(
          "active"
        )
      );

    if (captionCount) {
      captionCount.textContent = "0";
    }

    if (publishButtonText) {
      publishButtonText.textContent =
        "Post Everywhere";
    }

    updateBoostSummary();
  }

  /* =======================================================
     COUNTERS
     ======================================================= */

  function updateCounters() {
    const state =
      window.PostX.getState();

    const draftCount =
      document.getElementById(
        "draftCount"
      );

    const scheduledCount =
      document.getElementById(
        "scheduledCount"
      );

    const boostCount =
      document.getElementById(
        "boostCount"
      );

    if (draftCount) {
      draftCount.textContent =
        state.drafts.length;
    }

    if (scheduledCount) {
      scheduledCount.textContent =
        state.scheduled.length;
    }

    if (boostCount) {
      boostCount.textContent =
        state.boosts.filter(
          boost =>
            boost.status ===
            "active"
        ).length;
    }
  }

  /* =======================================================
     PREVENT DOUBLE SUBMISSION
     ======================================================= */

  function handleDraftButton() {
    if (!saveDraftButton) {
      return;
    }

    saveDraftButton.addEventListener(
      "click",
      event => {
        event.preventDefault();

        saveDraft();
      }
    );
  }

  /* =======================================================
     INITIALIZATION
     ======================================================= */

  function init() {
    handleMediaUpload();
    handleCaptionCounter();
    handlePublishMode();

    handleBoostToggle();
    handleBoostLocations();
    handleBoostDurations();

    handleDraftButton();

    form.addEventListener(
      "submit",
      handleSubmit
    );

    updateBoostSummary();
    updateCounters();

    console.log(
      "PostX Composer initialized."
    );
  }

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
