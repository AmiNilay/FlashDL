const BASE_URL = "https://flashdl-backend-2026.onrender.com";

document.addEventListener('DOMContentLoaded', function() {
    // 1. Initialize Materialize Components
    M.AutoInit(); 

    // 2. Theme Toggle Logic
    const themeBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    themeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('dark-theme');
        themeIcon.innerText = document.body.classList.contains('dark-theme') ? 'light_mode' : 'dark_mode';
    });

    // 3. Sign-In Logic (Simple Mock)
    const loginBtn = document.getElementById('confirm-login');
    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('email').value;
        if(email) {
            M.toast({html: `Welcome, ${email}!`});
            M.Modal.getInstance(document.getElementById('login-modal')).close();
            document.getElementById('auth-btn').style.display = 'none';
            document.getElementById('user-display').style.display = 'block';
        }
    });

    // 4. Download Logic
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', async () => {
        const url = document.getElementById('url-input').value.trim();
        if (!url) return M.toast({html: 'Paste a link first!'});

        document.getElementById('loader').style.display = 'block';
        document.getElementById('error-msg').innerText = "";

        try {
            const response = await fetch(`${BASE_URL}/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });
            const data = await response.json();
            if (data.success) {
                document.getElementById('result-area').style.display = 'block';
                document.getElementById('res-title').innerText = data.title;
                document.getElementById('res-link').href = `${BASE_URL}/process_merge?url=${encodeURIComponent(url)}&format_id=${data.options[0].format_id}`;
            } else {
                document.getElementById('error-msg').innerText = data.error;
            }
        } catch (err) {
            document.getElementById('error-msg').innerText = "Server Unreachable. Ensure backend is live.";
        } finally {
            document.getElementById('loader').style.display = 'none';
        }
    });
});