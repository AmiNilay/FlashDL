const BASE_URL = "https://flashdl-backend-2026.onrender.com";

document.addEventListener('DOMContentLoaded', function() {
    M.AutoInit(); 

    // --- 1. THEME MEMORY LOGIC ---
    const themeBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    // Check if user previously chose dark mode
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        themeIcon.innerText = 'light_mode';
    }

    themeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        
        // Save choice to local storage
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeIcon.innerText = isDark ? 'light_mode' : 'dark_mode';
        
        // Add a quick "pop" animation to the button
        themeBtn.style.transform = "scale(1.2)";
        setTimeout(() => themeBtn.style.transform = "scale(1)", 200);
    });

    // --- 2. PERSISTENT LOGIN LOGIC ---
    const loginBtn = document.getElementById('confirm-login');
    const userDisplay = document.getElementById('user-display');
    const authBtn = document.getElementById('auth-btn');

    // Check if user is already "logged in"
    const savedUser = localStorage.getItem('userEmail');
    if (savedUser) {
        showLoggedIn(savedUser);
    }

    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('email').value;
        if(email) {
            localStorage.setItem('userEmail', email); // Save login
            showLoggedIn(email);
            M.Modal.getInstance(document.getElementById('login-modal')).close();
            M.toast({html: `Welcome back, ${email}!`});
        }
    });

    function showLoggedIn(email) {
        authBtn.style.display = 'none';
        userDisplay.style.display = 'block';
        // You could also update a 'Welcome, Name' text here
    }

    // Logout Logic
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('userEmail'); // Clear memory
        location.reload(); // Refresh to reset UI
    });

    // --- 3. DOWNLOAD LOGIC ---
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', async () => {
        const url = document.getElementById('url-input').value.trim();
        if (!url) return M.toast({html: 'Paste a link first!'});

        downloadBtn.innerHTML = `Wait... <i class="material-icons right">sync</i>`;
        downloadBtn.classList.add('loading-pulse'); // Animation
        
        // ... (rest of your fetch code) ...
    });
});