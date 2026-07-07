const BASE_URL = "https://flashdl-backend-2026.onrender.com";

document.addEventListener("DOMContentLoaded", function () {

  // ─── DOM References ───────────────────────────────────────────────
  const themeBtn         = document.getElementById("theme-toggle");
  const themeIcon        = document.getElementById("theme-icon");
  const urlInput         = document.getElementById("url-input");
  const clearBtn         = document.getElementById("clear-btn");
  const pasteBtn         = document.getElementById("paste-btn");
  const downloadBtn      = document.getElementById("download-btn");
  const errorMsg         = document.getElementById("error-msg");
  const resultArea       = document.getElementById("result-area");
  const resTitle         = document.getElementById("res-title");
  const resThumb         = document.getElementById("res-thumb");
  const resLink          = document.getElementById("res-link");
  const authBtn          = document.getElementById("auth-btn");
  const userDisplay      = document.getElementById("user-display");
  const logoutBtn        = document.getElementById("logout-btn");
  const loginHint        = document.getElementById("login-hint");
  const confirmLoginBtn  = document.getElementById("confirm-login");
  const historySection   = document.getElementById("history-section");
  const historyBody      = document.getElementById("history-table-body");
  const clearHistoryBtn  = document.getElementById("clear-history");
  const loginModal       = document.getElementById("login-modal");

  // Logout Reconfirmation elements
  const cancelLogoutBtn  = document.getElementById("cancel-logout-btn");
  const confirmLogoutBtn = document.getElementById("confirm-logout-btn");

  // Modern Progress Tracker DOM Refs
  const progressContainer = document.getElementById("progress-container");
  const progressStatus    = document.getElementById("progress-status");
  const progressPercent   = document.getElementById("progress-percent");
  const progressBarFill   = document.getElementById("progress-bar-fill");
  const progressSpeed     = document.getElementById("progress-speed");
  const progressEta       = document.getElementById("progress-eta");
  const progressSize      = document.getElementById("progress-size");

  // Profile-specific dashboard elements
  const profileModal          = document.getElementById("profile-modal");
  const profileAvatarPreview  = document.getElementById("profile-avatar-preview");
  const avatarFileInput       = document.getElementById("avatar-file-input");
  const profileUsernameInput  = document.getElementById("profile-username-input");
  const saveProfileNameBtn    = document.getElementById("save-profile-name-btn");
  const profileEmailDisplay   = document.getElementById("profile-email-display");
  const profileHistoryList    = document.getElementById("profile-history-list");
  const navAvatar             = document.getElementById("nav-avatar");
  const navUsername           = document.getElementById("nav-username");
  const closeProfileBtn       = document.getElementById("close-profile-btn");

  // Format Toggles (Video/Audio Switch)
  const toggleMp4 = document.getElementById("toggle-mp4");
  const toggleMp3 = document.getElementById("toggle-mp3");
  let selectedFormat = 'mp4';

  // Playlist & Collections DOM elements
  const addToPlaylistBtn      = document.getElementById("add-to-playlist-btn");
  const playlistSelector      = document.getElementById("playlist-selector-dropdown");
  const playlistSelect        = document.getElementById("playlist-select");
  const newPlaylistInput      = document.getElementById("new-playlist-input");
  const confirmAddPlaylistBtn = document.getElementById("confirm-add-playlist-btn");
  const collectionsContainer  = document.getElementById("collections-container");

  // Send to Phone Dynamic QR Code Elements
  const qrShareBtn            = document.getElementById("qr-share-btn");
  const qrCodeContainer       = document.getElementById("qr-code-container");
  const qrCodeImg             = document.getElementById("qr-code-img");

  // Global extraction state holders
  let activeEventSource = null;
  let activeDownloadUrl = null;
  let lastExtractedData = null;

  // ─── Input & Clear Button Control ───────────────────────────────
  const toggleClearBtn = () => {
    if (urlInput.value.trim().length > 0) {
      clearBtn.style.display = "block";
    } else {
      clearBtn.style.display = "none";
    }
  };

  urlInput.addEventListener("input", toggleClearBtn);

  clearBtn.addEventListener("click", () => {
    urlInput.value = "";
    clearBtn.style.display = "none";
    urlInput.focus();
  });

  // ─── Instant Clipboard Paste Logic ───────────────────────────────
  pasteBtn.addEventListener("click", async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && clipboardText.trim().length > 0) {
        urlInput.value = clipboardText.trim();
        toggleClearBtn();
        pasteBtn.classList.add("pulse-success");
        setTimeout(() => pasteBtn.classList.remove("pulse-success"), 1000);
      } else {
        alert("Clipboard is empty or does not contain text.");
      }
    } catch (err) {
      console.warn("Clipboard read permission blocked.", err);
      urlInput.focus();
      alert("Please paste using (Ctrl+V / Cmd+V) inside the search box!");
    }
  });

  // ─── Send to Phone QR Scanner Logic ──────────────────────────────
  qrShareBtn.addEventListener("click", () => {
    if (qrCodeContainer.style.display === "none") {
      const finalMediaUrl = `${BASE_URL}/process_merge?url=${encodeURIComponent(lastExtractedData.url)}&format=${selectedFormat}`;
      qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(finalMediaUrl)}`;
      qrCodeContainer.style.display = "block";
    } else {
      qrCodeContainer.style.display = "none";
    }
  });

  // ─── Format Selection Switch Handler ──────────────────────────────
  toggleMp4.addEventListener("click", () => {
    selectedFormat = 'mp4';
    toggleMp4.classList.add("active");
    toggleMp3.classList.remove("active");
    if (qrCodeContainer.style.display === "block") {
      const finalMediaUrl = `${BASE_URL}/process_merge?url=${encodeURIComponent(lastExtractedData.url)}&format=${selectedFormat}`;
      qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(finalMediaUrl)}`;
    }
  });

  toggleMp3.addEventListener("click", () => {
    selectedFormat = 'mp3';
    toggleMp3.classList.add("active");
    toggleMp4.classList.remove("active");
    if (qrCodeContainer.style.display === "block") {
      const finalMediaUrl = `${BASE_URL}/process_merge?url=${encodeURIComponent(lastExtractedData.url)}&format=${selectedFormat}`;
      qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(finalMediaUrl)}`;
    }
  });

  // ─── Bookmarklet Link Auto-Loader ─────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const queryUrl = urlParams.get('url');
  if (queryUrl) {
    urlInput.value = decodeURIComponent(queryUrl);
    toggleClearBtn();
    setTimeout(() => {
      downloadBtn.click();
    }, 600);
  }

  // ─── Connection Auto-Resume Listener Shield ───────────────────────
  window.addEventListener('offline', () => {
    if (activeEventSource) {
      const pulseInd = document.getElementById("pulse-indicator");
      if (pulseInd) pulseInd.style.backgroundColor = "#eab308";
      progressStatus.innerText = "Network dropped! Auto-Resuming when signal returns...";
      progressStatus.style.color = "#eab308";
      progressBarFill.style.background = "linear-gradient(90deg, #eab308, #ca8a04)";
    }
  });

  window.addEventListener('online', () => {
    if (activeEventSource && activeDownloadUrl) {
      const pulseInd = document.getElementById("pulse-indicator");
      if (pulseInd) pulseInd.style.backgroundColor = "var(--primary-color)";
      progressStatus.innerText = "Signal restored! Re-starting download pipeline...";
      progressStatus.style.color = "var(--text-main)";
      progressBarFill.style.background = "linear-gradient(90deg, #2563eb, #3b82f6)";
      
      activeEventSource.close();
      startSSEStream(activeDownloadUrl);
    }
  });

  // ─── Interactive FAQ Accordion Trigger ───────────────────────────
  const faqQuestions = document.querySelectorAll(".faq-question");
  faqQuestions.forEach(question => {
    question.addEventListener("click", () => {
      const currentItem = question.parentElement;
      const isActive = currentItem.classList.contains("active");

      document.querySelectorAll(".faq-item").forEach(item => {
        item.classList.remove("active");
      });

      if (!isActive) {
        currentItem.classList.add("active");
      }
    });
  });

  // ─── Theme Implementation ─────────────────────────────────────────
  if (localStorage.getItem("theme") === "light") {
    document.documentElement.classList.remove("dark");
    themeIcon.innerText = "light_mode";
  } else {
    document.documentElement.classList.add("dark");
    themeIcon.innerText = "dark_mode";
  }

  themeBtn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      themeIcon.innerText = "light_mode";
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      themeIcon.innerText = "dark_mode";
    }
  });

  // ─── Custom Modal Interceptor ──────────────────────────────────────
  const modalTriggers = document.querySelectorAll(".modal-trigger");
  modalTriggers.forEach(trigger => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const modalId = trigger.getAttribute("href").replace("#", "");
      const targetModal = document.getElementById(modalId);
      if (targetModal) {
        targetModal.classList.add("active");
        
        let overlay = document.getElementById("custom-modal-overlay");
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.id = "custom-modal-overlay";
          overlay.className = "modal-overlay-custom";
          document.body.appendChild(overlay);
          overlay.addEventListener("click", () => {
            closeActiveModals();
          });
        }
        setTimeout(() => overlay.classList.add("active"), 10);
      }
    });
  });

  const closeActiveModals = () => {
    const modals = document.querySelectorAll(".modal");
    modals.forEach(m => m.classList.remove("active"));
    const overlay = document.getElementById("custom-modal-overlay");
    if (overlay) overlay.classList.remove("active");
  };

  if (closeProfileBtn) {
    closeProfileBtn.addEventListener("click", closeActiveModals);
  }

  // ─── Auth Flow, Strict Email Validation & Profile Persistence ────
  const updateUI = () => {
    const loggedIn = localStorage.getItem("userLoggedIn") === "true";
    authBtn.style.display        = loggedIn ? "none"  : "inline-flex";
    userDisplay.style.display    = loggedIn ? "flex"  : "none";
    historySection.style.display = loggedIn ? "block" : "none";
    loginHint.style.display      = loggedIn ? "none"  : "block";
    
    if (loggedIn) {
      const email = localStorage.getItem("userEmail") || "user@example.com";
      const username = localStorage.getItem("profile_username") || email.split("@")[0];
      const avatarSrc = localStorage.getItem("profile_avatar") || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
      
      navUsername.innerText = username;
      navAvatar.src = avatarSrc;
      profileAvatarPreview.src = avatarSrc;
      profileUsernameInput.value = username;
      profileEmailDisplay.innerText = email;

      renderHistory();
      renderProfileHistory();
      renderCollections();
    }
  };

  confirmLoginBtn.addEventListener("click", () => {
    const emailInput = document.getElementById("email");
    const email = emailInput.value.trim();
    const loginError = document.getElementById("login-validation-error");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      loginError.innerText = "Please provide an email address.";
      loginError.style.display = "block";
      return;
    }

    if (!emailRegex.test(email)) {
      loginError.innerText = "Invalid format. Must include '@' and '.' (e.g. name@domain.com)";
      loginError.style.display = "block";
      return;
    }

    loginError.style.display = "none";
    
    // PROFILE PERSISTENCE RECOVERY:
    const profileKey = `profile_data_${email.toLowerCase()}`;
    let profile = JSON.parse(localStorage.getItem(profileKey));

    if (!profile) {
      const baseName = email.split("@")[0];
      const computedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      profile = {
        username: computedName,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`
      };
      localStorage.setItem(profileKey, JSON.stringify(profile));
    }

    // Load active credentials
    localStorage.setItem("userLoggedIn", "true");
    localStorage.setItem("userEmail", email);
    localStorage.setItem("profile_username", profile.username);
    localStorage.setItem("profile_avatar", profile.avatar);

    closeActiveModals();
    updateUI();
  });

  // Logout Safe Reconfirmation Actions
  cancelLogoutBtn.addEventListener("click", () => {
    closeActiveModals();
  });

  confirmLogoutBtn.addEventListener("click", () => {
    localStorage.removeItem("userLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("profile_username");
    localStorage.removeItem("profile_avatar");
    closeActiveModals();
    updateUI();
  });

  // Custom Settings Editing
  profileUsernameInput.addEventListener("input", () => {
    saveProfileNameBtn.style.display = "inline-block";
  });

  saveProfileNameBtn.addEventListener("click", () => {
    const newName = profileUsernameInput.value.trim();
    if (newName) {
      localStorage.setItem("profile_username", newName);

      const email = localStorage.getItem("userEmail");
      if (email) {
        const profileKey = `profile_data_${email.toLowerCase()}`;
        let profile = JSON.parse(localStorage.getItem(profileKey)) || {};
        profile.username = newName;
        localStorage.setItem(profileKey, JSON.stringify(profile));
      }

      saveProfileNameBtn.style.display = "none";
      updateUI();
    }
  });

  avatarFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image file is too large! Please choose an avatar under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target.result;
        localStorage.setItem("profile_avatar", base64Data);

        const email = localStorage.getItem("userEmail");
        if (email) {
          const profileKey = `profile_data_${email.toLowerCase()}`;
          let profile = JSON.parse(localStorage.getItem(profileKey)) || {};
          profile.avatar = base64Data;
          localStorage.setItem(profileKey, JSON.stringify(profile));
        }

        updateUI();
      };
      reader.readAsDataURL(file);
    }
  });

  // Local Playlists & Collections Handler
  const loadPlaylistSelect = () => {
    const playlists = JSON.parse(localStorage.getItem("dl_playlists") || "{}");
    playlistSelect.innerHTML = Object.keys(playlists).map(name => `
      <option value="${name}">${name}</option>
    `).join("") + `<option value="__new">-- Create New Collection --</option>`;
  };

  addToPlaylistBtn.addEventListener("click", () => {
    const loggedIn = localStorage.getItem("userLoggedIn") === "true";
    if (!loggedIn) {
      alert("Please sign in to organize items into custom playlists.");
      return;
    }
    playlistSelector.style.display = playlistSelector.style.display === "none" ? "block" : "none";
    loadPlaylistSelect();
  });

  playlistSelect.addEventListener("change", () => {
    if (playlistSelect.value === "__new") {
      newPlaylistInput.style.display = "block";
      newPlaylistInput.focus();
    } else {
      newPlaylistInput.style.display = "none";
    }
  });

  confirmAddPlaylistBtn.addEventListener("click", () => {
    let listName = playlistSelect.value;
    if (listName === "__new") {
      listName = newPlaylistInput.value.trim();
    }

    if (!listName) {
      alert("Please enter or select a collection name.");
      return;
    }

    let playlists = JSON.parse(localStorage.getItem("dl_playlists") || "{}");
    if (!playlists[listName]) playlists[listName] = [];

    playlists[listName] = playlists[listName].filter(item => item.url !== lastExtractedData.url);
    playlists[listName].unshift({
      title: lastExtractedData.title,
      thumb: lastExtractedData.thumb,
      url: lastExtractedData.url,
      date: new Date().toLocaleDateString()
    });

    localStorage.setItem("dl_playlists", JSON.stringify(playlists));
    alert(`Successfully saved to "${listName}"!`);
    playlistSelector.style.display = "none";
    newPlaylistInput.value = "";
    updateUI();
  });

  const renderCollections = () => {
    if (!collectionsContainer) return;
    const playlists = JSON.parse(localStorage.getItem("dl_playlists") || "{}");
    const names = Object.keys(playlists);

    if (!names.length) {
      collectionsContainer.innerHTML = `
        <div class="font-body-sm text-on-surface-variant" style="padding: 20px 0; text-align: center;">
          No custom collections created yet.
        </div>`;
      return;
    }

    collectionsContainer.innerHTML = names.map(name => `
      <div class="collection-folder-card" style="margin-bottom: 12px; border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-body); overflow:hidden;">
        <div class="folder-header" style="padding: 12px; background: var(--bg-secondary); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
          <span class="font-body-sm font-semibold" style="display: flex; align-items: center; gap: 8px;">
            <i class="material-icons text-primary" style="font-size: 18px;">folder_open</i> ${name} (${playlists[name].length})
          </span>
          <button class="delete-collection-btn btn-ghost" data-name="${name}" style="height: 26px; line-height: 24px; padding: 0 8px; font-size: 11px;">Delete</button>
        </div>
        <div class="folder-contents" style="padding: 8px 12px;">
          ${playlists[name].map(item => `
            <div class="profile-history-item" style="margin-bottom: 6px; padding: 6px 8px;">
              <div class="profile-history-left">
                <img src="${item.thumb}" style="width: 38px; height: 26px;">
                <div class="truncate font-body-sm" style="max-width: 180px;">${item.title}</div>
              </div>
              <button data-url="${item.url}" class="history-redownload btn-ghost" style="height: 26px; line-height: 24px; padding: 0 8px; font-size: 11px;">Fetch</button>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");

    collectionsContainer.querySelectorAll(".delete-collection-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const targetName = btn.getAttribute("data-name");
        if (confirm(`Are you sure you want to delete the "${targetName}" collection?`)) {
          let playlists = JSON.parse(localStorage.getItem("dl_playlists") || "{}");
          delete playlists[targetName];
          localStorage.setItem("dl_playlists", JSON.stringify(playlists));
          updateUI();
        }
      });
    });

    collectionsContainer.querySelectorAll(".history-redownload").forEach(btn => {
      btn.addEventListener("click", () => {
        urlInput.value = btn.getAttribute("data-url");
        closeActiveModals();
        toggleClearBtn();
        downloadBtn.click();
      });
    });
  };

  // ─── History Hub Render ──────────────────────────────────────────
  const renderHistory = () => {
    const history = JSON.parse(localStorage.getItem("dl_history") || "[]");

    if (!history.length) {
      historyBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center font-body-sm text-on-surface-variant" style="padding: 32px 0;">
            No downloads saved yet.
          </td>
        </tr>`;
      return;
    }

    historyBody.innerHTML = history.map(item => `
      <tr class="border-t border-surface-variant hover:bg-surface-container/50 transition-colors">
        <td class="px-md py-sm">
          <img src="${item.thumb}" width="56" class="history-thumb rounded-lg object-cover" alt="thumb" style="height: 38px; display: block; border: 1px solid var(--border-color);">
        </td>
        <td class="px-md py-sm font-body-sm text-on-surface max-w-xs truncate">${item.title}</td>
        <td class="px-md py-sm font-status-code text-on-surface-variant hidden md:table-cell">${item.date}</td>
        <td class="px-md py-sm">
          <button data-url="${item.url}" class="history-redownload inline-flex items-center gap-xs bg-primary/10 text-primary border border-primary/20 px-sm py-xs rounded-xl font-label-caps hover:bg-primary/20 transition-all active:scale-95 cursor-pointer">
            <span class="material-icons" style="font-size: 14px;">refresh</span>
            Redownload
          </button>
        </td>
      </tr>
    `).join("");

    document.querySelectorAll(".history-redownload").forEach(btn => {
      btn.addEventListener("click", () => {
        urlInput.value = btn.getAttribute("data-url");
        toggleClearBtn();
        downloadBtn.click();
      });
    });
  };

  // ─── Mini Profile Dashboard History Stream ───────────────────────
  const renderProfileHistory = () => {
    if (!profileHistoryList) return;
    
    const history = JSON.parse(localStorage.getItem("dl_history") || "[]");
    if (!history.length) {
      profileHistoryList.innerHTML = `
        <div class="font-body-sm text-on-surface-variant" style="padding: 24px 0; text-align: center;">
          No downloadable sessions recorded.
        </div>`;
      return;
    }
    
    profileHistoryList.innerHTML = history.slice(0, 5).map(item => `
      <div class="profile-history-item">
        <div class="profile-history-left">
          <img src="${item.thumb || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100'}" alt="thumb">
          <div style="overflow: hidden;">
            <div class="font-body-sm font-semibold truncate" style="color: var(--text-main); margin-bottom: 2px;">${item.title}</div>
            <div class="font-status-code text-muted" style="font-size: 11px;">${item.date}</div>
          </div>
        </div>
        <button data-url="${item.url}" class="history-redownload btn-ghost" style="height: 30px; line-height: 28px; padding: 0 10px; font-size: 11px;">
          Fetch
        </button>
      </div>
    `).join("");
    
    profileHistoryList.querySelectorAll(".history-redownload").forEach(btn => {
      btn.addEventListener("click", () => {
        urlInput.value = btn.getAttribute("data-url");
        closeActiveModals();
        toggleClearBtn();
        downloadBtn.click();
      });
    });
  };

  clearHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem("dl_history");
    updateUI();
  });

  // UPGRADED PHYSICAL DOWNLOAD HANDLER (Prevents browser new-tab opening)
  const triggerDirectDownload = (dlUrl) => {
    const a = document.createElement("a");
    a.href = dlUrl;
    a.setAttribute("download", ""); // Forces system file-download dialog
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 100);
  };

  // ─── Downloader Core Event Stream Hook (SSE) ──────────────────────
  const startSSEStream = (url) => {
    progressContainer.style.display = "block";
    progressStatus.innerText = "Initializing connection...";
    progressStatus.style.color = "var(--text-main)";
    progressBarFill.style.width = "0%";
    progressPercent.innerText = "0%";
    progressSpeed.querySelector(".val").innerText = "0.0 MB/s";
    progressEta.querySelector(".val").innerText = "ETA: --:--";
    progressSize.querySelector(".val").innerText = "0 MB / 0 MB";

    activeDownloadUrl = url;
    activeEventSource = new EventSource(`${BASE_URL}/stream-download?url=${encodeURIComponent(url)}&format=${selectedFormat}`);

    activeEventSource.onmessage = (event) => {
      try {
        const stream = JSON.parse(event.data);
        
        if (stream.status === "downloading" || stream.status === "processing") {
          progressStatus.innerText = stream.msg || "Downloading resources...";
          progressBarFill.style.width = `${stream.percent}%`;
          progressPercent.innerText = `${stream.percent}%`;
          
          progressSpeed.querySelector(".val").innerText = stream.speed || "0.0 MB/s";
          progressEta.querySelector(".val").innerText = `ETA: ${stream.eta || "--:--"}`;
          progressSize.querySelector(".val").innerText = stream.size || "";
        } 
        else if (stream.status === "completed") {
          activeEventSource.close();
          activeEventSource = null;
          
          progressStatus.innerText = "Completed! Packaging final download...";
          progressBarFill.style.width = "100%";
          progressPercent.innerText = "100%";
          
          const finalDownloadUrl = `${BASE_URL}/download_media?filename=${encodeURIComponent(stream.filename)}`;
          triggerDirectDownload(finalDownloadUrl);
          
          setTimeout(() => {
            progressContainer.style.display = "none";
          }, 3500);
        }
      } catch (e) {
        console.error("Failed to parse progress data:", e);
      }
    };

    activeEventSource.onerror = (err) => {
      console.warn("SSE disconnected, dropping back to direct fallback.");
      if (activeEventSource) {
        activeEventSource.close();
        activeEventSource = null;
      }
      
      progressStatus.innerText = "Processing media on server backend...";
      progressBarFill.style.width = "50%";
      progressPercent.innerText = "Merging...";
      
      triggerDirectDownload(`${BASE_URL}/process_merge?url=${encodeURIComponent(url)}&format=${selectedFormat}`);
      
      setTimeout(() => {
        progressContainer.style.display = "none";
      }, 12000);
    };
  };

  // ─── Downloader Initialization Trigger ─────────────────────────────
  downloadBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();

    if (!url) {
      errorMsg.innerText = "Please paste a valid link first.";
      return;
    }

    errorMsg.innerText = "";
    resultArea.style.display = "none";
    progressContainer.style.display = "none";
    qrCodeContainer.style.display = "none";

    downloadBtn.innerHTML = `Analyzing... <span class="material-icons animate-spin" style="font-size: 18px; animation: spin 1s infinite linear;">sync</span>`;
    downloadBtn.disabled = true;

    try {
      const res = await fetch(`${BASE_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Unable to extract info from this link.");
      }

      resTitle.innerText = data.title || "Media File";
      resThumb.src       = data.thumbnail || "";
      resLink.href       = `${BASE_URL}/process_merge?url=${encodeURIComponent(url)}&format=${selectedFormat}`;
      resultArea.style.display = "block";

      lastExtractedData = {
        title: data.title || "Media",
        thumb: data.thumbnail || "",
        url: url
      };

      if (localStorage.getItem("userLoggedIn") === "true") {
        let history = JSON.parse(localStorage.getItem("dl_history") || "[]");
        history = history.filter(item => item.url !== url);
        history.unshift({
          title : data.title || "Media",
          thumb : data.thumbnail || "",
          url,
          date  : new Date().toLocaleDateString()
        });
        localStorage.setItem("dl_history", JSON.stringify(history.slice(0, 15)));
        updateUI();
      }

      startSSEStream(url);

    } catch (err) {
      errorMsg.innerText = "Error: " + err.message;
    } finally {
      downloadBtn.innerHTML = `Analyze Link <span class="material-icons">bolt</span>`;
      downloadBtn.disabled = false;
    }
  });

  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") downloadBtn.click();
  });

  // ─── Initialization ──────────────────────────────────────────────
  updateUI();
  toggleClearBtn();
});

const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
