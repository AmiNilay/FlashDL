// Backend URL
const BASE_URL = "https://flashdl-backend-2026.onrender.com";

document.addEventListener("DOMContentLoaded", function () {
    M.AutoInit();

    // ---------------------------
    // DARK MODE
    // ---------------------------
    const themeBtn = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    const body = document.body;

    if (localStorage.getItem("theme") === "dark") {
        body.classList.add("dark-mode");
        themeIcon.innerText = "light_mode";
    }

    themeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        body.classList.toggle("dark-mode");
        const isDark = body.classList.contains("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        themeIcon.innerText = isDark ? "light_mode" : "dark_mode";
    });

    // ---------------------------
    // LOGIN
    // ---------------------------
    const loginBtn = document.getElementById("confirm-login");
    const userDisplay = document.getElementById("user-display");
    const authBtn = document.getElementById("auth-btn");

    const savedUser = localStorage.getItem("userEmail");
    if (savedUser) showLoggedIn(savedUser);

    loginBtn.addEventListener("click", () => {
        const email = document.getElementById("email").value;
        if (email) {
            localStorage.setItem("userEmail", email);
            showLoggedIn(email);
            const modalInstance = M.Modal.getInstance(
                document.getElementById("login-modal")
            );
            modalInstance.close();
            M.toast({ html: `Welcome ${email}` });
        } else {
            M.toast({ html: "Enter email first" });
        }
    });

    function showLoggedIn(email) {
        authBtn.style.display = "none";
        userDisplay.style.display = "block";
        document.getElementById("login-hint").style.display = "none";
    }

    document
        .getElementById("logout-btn")
        .addEventListener("click", function (e) {
            e.preventDefault();
            localStorage.removeItem("userEmail");
            location.reload();
        });

    // ---------------------------
    // DOWNLOAD LOGIC (FIXED)
    // ---------------------------
    const downloadBtn = document.getElementById("download-btn");
    const urlInput = document.getElementById("url-input");
    const clearBtn = document.getElementById("clear-btn");

    urlInput.addEventListener("input", () => {
        clearBtn.style.display = urlInput.value ? "block" : "none";
    });

    clearBtn.addEventListener("click", () => {
        urlInput.value = "";
        clearBtn.style.display = "none";
        document.getElementById("result-area").style.display = "none";
        document.getElementById("error-msg").innerText = "";
    });

    downloadBtn.addEventListener("click", async () => {
        const url = urlInput.value.trim();
        if (!url) return M.toast({ html: "Paste a valid YouTube link!" });

        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = "Processing...";
        document.getElementById("loader").style.display = "block";
        document.getElementById("error-msg").innerText = "";
        document.getElementById("result-area").style.display = "none";

        try {
            // Step 1: Extract info
            const extractRes = await fetch(`${BASE_URL}/extract`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            const extractData = await extractRes.json();
            if (!extractData.success) {
                throw new Error(extractData.error || "Extraction failed");
            }

            document.getElementById("result-area").style.display = "block";
            document.getElementById("res-title").innerText =
                extractData.title;

            if (extractData.thumbnail) {
                document.getElementById("res-thumb").src =
                    extractData.thumbnail;
            }

            // Step 2: Get direct stream URL
            const downloadRes = await fetch(
                `${BASE_URL}/process_merge?url=${encodeURIComponent(url)}`
            );

            const downloadData = await downloadRes.json();
            if (!downloadData.success) {
                throw new Error(downloadData.error || "Download failed");
            }

            // Step 3: Open real YouTube file (IMPORTANT)
            window.open(downloadData.download_url, "_blank");

        } catch (err) {
            console.error(err);
            document.getElementById("error-msg").innerText =
                "Error: " + err.message;
        } finally {
            document.getElementById("loader").style.display = "none";
            downloadBtn.innerHTML = originalText;
        }
    });
});