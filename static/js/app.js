const BASE_URL = "https://flashdl-backend-2026.onrender.com";

document.addEventListener("DOMContentLoaded", function () {
    M.AutoInit();

    const themeBtn = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    const body = document.body;

    // Theme logic
    if (localStorage.getItem("theme") === "dark") { body.classList.add("dark-mode"); themeIcon.innerText = "light_mode"; }
    themeBtn.addEventListener("click", () => {
        body.classList.toggle("dark-mode");
        const isDark = body.classList.contains("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        themeIcon.innerText = isDark ? "light_mode" : "dark_mode";
    });

    // Auth & History logic
    const updateUI = () => {
        const loggedIn = localStorage.getItem("userLoggedIn") === "true";
        document.getElementById("auth-btn").style.display = loggedIn ? "none" : "block";
        document.getElementById("user-display").style.display = loggedIn ? "block" : "none";
        document.getElementById("history-section").style.display = loggedIn ? "block" : "none";
        if (loggedIn) loadHistory();
    };

    const loadHistory = () => {
        const history = JSON.parse(localStorage.getItem("dl_history") || "[]");
        document.getElementById("history-table-body").innerHTML = history.map(item => `
            <tr>
                <td><img src="${item.thumb}" width="50"></td>
                <td>${item.title}</td>
                <td>${item.date}</td>
                <td><a href="${BASE_URL}/process_merge?url=${encodeURIComponent(item.url)}" class="btn-small green">Redownload</a></td>
            </tr>
        `).join("");
    };

    document.getElementById("confirm-login").addEventListener("click", () => {
        localStorage.setItem("userLoggedIn", "true");
        updateUI();
        M.Modal.getInstance(document.getElementById('login-modal')).close();
    });

    document.getElementById("logout-btn").addEventListener("click", () => { localStorage.removeItem("userLoggedIn"); updateUI(); });

    // Download logic
    document.getElementById("download-btn").addEventListener("click", async () => {
        const url = document.getElementById("url-input").value;
        document.getElementById("loader").style.display = "block";
        try {
            const res = await fetch(`${BASE_URL}/extract`, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({url}) });
            const data = await res.json();
            if (data.success) {
                document.getElementById("result-area").style.display = "block";
                document.getElementById("res-title").innerText = data.title;
                document.getElementById("res-thumb").src = data.thumbnail;
                document.getElementById("res-link").href = `${BASE_URL}/process_merge?url=${encodeURIComponent(url)}`;
                
                if (localStorage.getItem("userLoggedIn") === "true") {
                    let history = JSON.parse(localStorage.getItem("dl_history") || "[]");
                    history.unshift({title: data.title, thumb: data.thumbnail, url: url, date: new Date().toLocaleDateString()});
                    localStorage.setItem("dl_history", JSON.stringify(history.slice(0, 20)));
                    loadHistory();
                }
                window.location.href = `${BASE_URL}/process_merge?url=${encodeURIComponent(url)}`;
            }
        } catch (e) { document.getElementById("error-msg").innerText = "Error: " + e.message; }
        document.getElementById("loader").style.display = "none";
    });

    updateUI();
});