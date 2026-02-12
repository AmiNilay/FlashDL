document.addEventListener('DOMContentLoaded', function() {
    // 0. CONFIGURATION: Link to your Render Backend
    const BASE_URL = "https://flashdl-api.onrender.com";

    // 1. INITIALIZE MATERIALIZE COMPONENTS
    M.Modal.init(document.querySelectorAll('.modal'));
    var tooltips = document.querySelectorAll('.tooltipped');
    M.Tooltip.init(tooltips, { enterDelay: 500, margin: 5 });

    // 2. ELEMENT SELECTIONS
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const body = document.body;
    const authBtn = document.getElementById('auth-btn');
    const userDisplay = document.getElementById('user-display');
    const logoutBtn = document.getElementById('logout-btn');
    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');
    const confirmLoginBtn = document.getElementById('confirm-login');
    const downloadBtn = document.getElementById('download-btn');
    const loader = document.getElementById('loader');
    const errorMsg = document.getElementById('error-msg');
    const resultArea = document.getElementById('result-area');
    const urlInput = document.getElementById('url-input');
    const clearBtn = document.getElementById('clear-btn');
    let currentUser = null;

    // 3. THEME MANAGEMENT
    function enableDarkMode() {
        body.classList.add('dark-mode');
        themeIcon.innerText = 'light_mode';
        if(themeToggle) themeToggle.setAttribute('data-tooltip', 'Switch to Light Mode');
        localStorage.setItem('theme', 'dark');
    }

    function disableDarkMode() {
        body.classList.remove('dark-mode');
        themeIcon.innerText = 'dark_mode';
        if(themeToggle) themeToggle.setAttribute('data-tooltip', 'Switch to Dark Mode');
        localStorage.setItem('theme', 'light');
    }

    if (localStorage.getItem('theme') === 'dark') enableDarkMode();

    themeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        body.classList.contains('dark-mode') ? disableDarkMode() : enableDarkMode();
        M.Tooltip.init(document.querySelectorAll('.tooltipped'));
    });

    // 4. INPUT FIELD INTERACTIONS
    urlInput.addEventListener('input', function() {
        clearBtn.style.display = this.value.length > 0 ? 'flex' : 'none';
    });

    clearBtn.addEventListener('click', function() {
        urlInput.value = '';
        clearBtn.style.display = 'none';
        urlInput.focus();
    });

    // 5. SESSION & HISTORY LOGIC
    function checkSession() {
        const storedUser = localStorage.getItem('active_user');
        if (storedUser) {
            currentUser = storedUser;
            updateUI(true);
            loadHistory();
        } else {
            updateUI(false);
        }
    }

    function updateUI(isLoggedIn) {
        const loginHint = document.getElementById('login-hint');
        if (isLoggedIn) {
            authBtn.style.display = 'none';
            userDisplay.style.display = 'block';
            userDisplay.querySelector('a').innerText = `Logout`;
            historySection.style.display = 'block';
            if(loginHint) loginHint.style.display = 'none';
        } else {
            authBtn.style.display = 'block';
            userDisplay.style.display = 'none';
            historySection.style.display = 'none';
            currentUser = null;
            if(loginHint) loginHint.style.display = 'block';
        }
    }

    confirmLoginBtn.addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        if (email && pass) {
            let userData = localStorage.getItem('user_data_' + email);
            if (!userData) {
                localStorage.setItem('user_data_' + email, JSON.stringify({ history: [] }));
            }
            localStorage.setItem('active_user', email);
            currentUser = email;
            M.Modal.getInstance(document.getElementById('login-modal')).close();
            checkSession();
            M.toast({html: 'Logged in successfully'});
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('active_user');
        checkSession();
        M.toast({html: 'Logged out'});
    });

    // 6. MAIN DOWNLOAD & EXTRACTION LOGIC
    downloadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
            errorMsg.innerText = "Please paste a link first";
            return;
        }

        errorMsg.innerText = "";
        resultArea.style.display = 'none';
        loader.style.display = 'block';

        try {
            // Updated to use BASE_URL for Render deployment
            const response = await fetch(`${BASE_URL}/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });
            const data = await response.json();

            if (data.success) {
                // Set metadata
                document.getElementById('res-title').innerText = data.title;
                
                // Construct proxy thumbnail URL
                const thumbImg = document.getElementById('res-thumb');
                thumbImg.src = data.proxy_thumbnail ? `${BASE_URL}${data.proxy_thumbnail}` : data.thumbnail;

                const downloadLink = document.getElementById('res-link');
                const videoOptionsDiv = document.getElementById('video-options');
                const qualitySelect = document.getElementById('quality-select');
                const imageBadge = document.getElementById('image-badge');

                // UI State Reset
                videoOptionsDiv.style.display = 'none';
                imageBadge.style.display = 'none';
                qualitySelect.innerHTML = '';

                // Handle Response Type
                if (data.type === 'image' || data.type === 'video_single') {
                    if(data.type === 'image') imageBadge.style.display = 'inline-block';
                    downloadLink.innerText = data.type === 'image' ? "Download Image" : "Download Video";
                    downloadLink.href = `${BASE_URL}${data.proxy_url}`;
                    downloadLink.onclick = null; 
                } 
                else if (data.type === 'video_multi') {
                    videoOptionsDiv.style.display = 'block';
                    downloadLink.innerText = "Download Selected";
                    
                    // Fill Quality Select
                    data.options.forEach((opt, index) => {
                        let option = document.createElement('option');
                        option.value = index;
                        option.text = opt.label;
                        qualitySelect.appendChild(option);
                    });

                    // Set Download Action with Render Routing
                    downloadLink.onclick = (e) => {
                        e.preventDefault();
                        const sel = data.options[qualitySelect.value];
                        
                        if (sel.merge) {
                            M.toast({html: 'Merging HD Audio/Video on server... please wait.'});
                            window.location.href = `${BASE_URL}/process_merge?url=${encodeURIComponent(data.original_url)}&format_id=${sel.format_id}&title=${encodeURIComponent(data.title)}`;
                        } else {
                            window.location.href = `${BASE_URL}/proxy_download?url=${encodeURIComponent(sel.url)}&title=${encodeURIComponent(data.title)}&ext=${sel.ext}`;
                        }
                    };
                }

                // Show with animation
                resultArea.style.display = 'flex';
                resultArea.classList.remove('fade-in-up');
                void resultArea.offsetWidth; // Trigger reflow
                resultArea.classList.add('fade-in-up');

                if (currentUser) addToHistory(url, data.title);
            } else {
                errorMsg.innerText = "Error: " + (data.error || "Extraction failed");
            }
        } catch (err) {
            errorMsg.innerText = "Server Unreachable. Ensure Render backend is live.";
            console.error(err);
        } finally {
            loader.style.display = 'none';
        }
    });

    // 7. HISTORY HANDLING
    function addToHistory(url, title) {
        if (!currentUser) return;
        let key = 'user_data_' + currentUser;
        let data = JSON.parse(localStorage.getItem(key));
        if (!data) data = { history: [] };
        data.history.unshift({ url: url, title: title, date: new Date().toLocaleDateString() });
        localStorage.setItem(key, JSON.stringify(data));
        loadHistory();
    }

    function loadHistory() {
        if (!currentUser) return;
        let key = 'user_data_' + currentUser;
        let data = JSON.parse(localStorage.getItem(key));
        historyList.innerHTML = '';
        if (!data || !data.history || data.history.length === 0) return;

        data.history.forEach(item => {
            let li = document.createElement('li');
            li.className = 'collection-item';
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 85%;">
                        <span style="font-weight: 600;">${item.title || 'Untitled'}</span><br>
                        <span style="font-size:0.8rem; opacity: 0.7;">${item.url}</span>
                    </div>
                    <a href="${item.url}" target="_blank" class="secondary-content tooltipped" data-tooltip="Open Link">
                        <i class="material-icons" style="color: inherit;">open_in_new</i>
                    </a>
                </div>`;
            historyList.appendChild(li);
        });
        M.Tooltip.init(document.querySelectorAll('.tooltipped'));
    }

    checkSession();
});