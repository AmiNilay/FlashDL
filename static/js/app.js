// Pointing to your live Render Backend
const BASE_URL = "https://flashdl-backend-2026.onrender.com";

document.addEventListener('DOMContentLoaded', function() {
    // 1. Initialize all Materialize components (Modals, Tooltips, etc.)
    M.AutoInit(); 

    // --- DARK MODE LOGIC (FIXED) ---
    const themeBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const body = document.body;

    // Check Local Storage on load
    // We use 'dark-mode' because that is what is defined in your style.css
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        themeIcon.innerText = 'light_mode';
    }

    themeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Toggle the class
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');

        // Save preference and update icon
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeIcon.innerText = isDark ? 'light_mode' : 'dark_mode';

        // Add a small animation effect
        themeBtn.style.transform = "scale(1.2)";
        setTimeout(() => themeBtn.style.transform = "scale(1)", 200);
    });

    // --- LOGIN LOGIC (PERSISTENT) ---
    const loginBtn = document.getElementById('confirm-login');
    const userDisplay = document.getElementById('user-display');
    const authBtn = document.getElementById('auth-btn');

    // Check if user is logged in
    const savedUser = localStorage.getItem('userEmail');
    if (savedUser) {
        showLoggedIn(savedUser);
    }

    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('email').value;
        if(email) {
            localStorage.setItem('userEmail', email);
            showLoggedIn(email);
            // Close the modal programmatically
            const modalInstance = M.Modal.getInstance(document.getElementById('login-modal'));
            modalInstance.close();
            M.toast({html: `Welcome back, ${email}!`});
        } else {
            M.toast({html: 'Please enter an email'});
        }
    });

    function showLoggedIn(email) {
        authBtn.style.display = 'none';
        userDisplay.style.display = 'block';
        document.getElementById('login-hint').style.display = 'none';
    }

    // Logout Logic
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('userEmail');
        location.reload(); // Refresh page to reset state
    });

    // --- DOWNLOAD LOGIC ---
    const downloadBtn = document.getElementById('download-btn');
    const urlInput = document.getElementById('url-input');
    const clearBtn = document.getElementById('clear-btn');

    // Show/Hide Clear Button
    urlInput.addEventListener('input', () => {
        clearBtn.style.display = urlInput.value ? 'block' : 'none';
    });

    clearBtn.addEventListener('click', () => {
        urlInput.value = '';
        clearBtn.style.display = 'none';
        document.getElementById('result-area').style.display = 'none';
        document.getElementById('error-msg').innerText = '';
    });

    downloadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return M.toast({html: 'Please paste a valid link first!'});

        // UI Loading State
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = `Wait... <i class="material-icons right">sync</i>`;
        downloadBtn.classList.add('loading-pulse');
        document.getElementById('loader').style.display = 'block';
        document.getElementById('error-msg').innerText = "";
        document.getElementById('result-area').style.display = 'none';

        try {
            // Call the Render Backend
            const response = await fetch(`${BASE_URL}/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (data.success) {
                // Success! Show results
                document.getElementById('result-area').style.display = 'block';
                document.getElementById('res-title').innerText = data.title;
                
                // Set Thumbnail (if available)
                if(data.thumbnail) {
                    document.getElementById('res-thumb').src = data.thumbnail;
                }

                // Prepare Download Link
                const downloadLink = document.getElementById('res-link');
                const formatId = data.options && data.options[0] ? data.options[0].format_id : 'best';
                
                // Construct the download URL
                downloadLink.href = `${BASE_URL}/process_merge?url=${encodeURIComponent(url)}&format_id=${formatId}`;
                
                // Scroll to result
                document.getElementById('result-area').scrollIntoView({behavior: "smooth"});
            } else {
                // Backend Error
                document.getElementById('error-msg').innerText = "Error: " + (data.error || "Could not fetch video.");
            }
        } catch (err) {
            // Network Error
            console.error(err);
            document.getElementById('error-msg').innerText = "Server Unreachable. Ensure Render backend is live.";
        } finally {
            // Reset UI
            document.getElementById('loader').style.display = 'none';
            downloadBtn.innerHTML = originalText;
            downloadBtn.classList.remove('loading-pulse');
        }
    });
});