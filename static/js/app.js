const BASE_URL = "https://flashdl-backend-2026.onrender.com";

document.addEventListener("DOMContentLoaded", function () {
    M.AutoInit();

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
            // STEP 1: Extract info
            const extractRes = await fetch(`${BASE_URL}/extract`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            const extractData = await extractRes.json();

            if (!extractData.success) {
                throw new Error(extractData.error);
            }

            document.getElementById("result-area").style.display = "block";
            document.getElementById("res-title").innerText = extractData.title;
            document.getElementById("res-thumb").src = extractData.thumbnail;

            // STEP 2: Redirect to backend download
            window.location.href =
                `${BASE_URL}/process_merge?url=${encodeURIComponent(url)}`;

        } catch (err) {
            document.getElementById("error-msg").innerText =
                "Error: " + err.message;
        } finally {
            document.getElementById("loader").style.display = "none";
            downloadBtn.innerHTML = originalText;
        }
    });
});
