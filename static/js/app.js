document.addEventListener('DOMContentLoaded', function() {
    // 0. CONFIGURATION
    // Ensure this matches your Render URL where FFmpeg Status is "OK"
    const BASE_URL = "https://flashdl-backend-2026.onrender.com";

    // 1. INITIALIZE MATERIALIZE COMPONENTS
    M.Modal.init(document.querySelectorAll('.modal'));
    var tooltips = document.querySelectorAll('.tooltipped');
    M.Tooltip.init(tooltips, { enterDelay: 500, margin: 5 });

    // 2. ELEMENT SELECTIONS
    const downloadBtn = document.getElementById('download-btn');
    const loader = document.getElementById('loader');
    const errorMsg = document.getElementById('error-msg');
    const resultArea = document.getElementById('result-area');
    const urlInput = document.getElementById('url-input');
    const clearBtn = document.getElementById('clear-btn');

    // 3. INPUT FIELD INTERACTIONS
    urlInput.addEventListener('input', function() {
        clearBtn.style.display = this.value.length > 0 ? 'flex' : 'none';
    });

    clearBtn.addEventListener('click', function() {
        urlInput.value = '';
        clearBtn.style.display = 'none';
        urlInput.focus();
    });

    // 4. MAIN DOWNLOAD & EXTRACTION LOGIC
    downloadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
            M.toast({html: 'Please paste a link first'});
            return;
        }

        // Reset UI state
        errorMsg.innerText = "";
        resultArea.style.display = 'none';
        loader.style.display = 'block';

        try {
            // Step 1: Extract info from Render API
            const response = await fetch(`${BASE_URL}/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });

            if (!response.ok) throw new Error(`Server Error: ${response.status}`);

            const data = await response.json();

            if (data.success) {
                // Populate Results
                document.getElementById('res-title').innerText = data.title;
                const downloadLink = document.getElementById('res-link');
                const qualitySelect = document.getElementById('quality-select');

                qualitySelect.innerHTML = '';

                // Populate quality options from backend response
                data.options.forEach((opt, index) => {
                    let option = document.createElement('option');
                    option.value = index;
                    option.text = opt.label;
                    qualitySelect.appendChild(option);
                });

                // Initialize Select component for Materialize
                M.FormSelect.init(qualitySelect);

                // Handle the Download Button Click
                downloadLink.onclick = (e) => {
                    e.preventDefault();
                    const selectedOption = data.options[qualitySelect.value];
                    
                    if (selectedOption.merge) {
                        // Merging happens on Render server
                        M.toast({html: 'Processing HD video... this may take a minute.'});
                        const mergeUrl = `${BASE_URL}/process_merge?url=${encodeURIComponent(data.original_url)}&format_id=${selectedOption.format_id}&title=${encodeURIComponent(data.title)}`;
                        window.location.href = mergeUrl;
                    } else if (selectedOption.url) {
                        // Direct download link
                        window.location.href = selectedOption.url;
                    } else {
                        M.toast({html: 'Download link not available for this quality.'});
                    }
                };

                resultArea.style.display = 'flex';
                resultArea.classList.add('fade-in-up');
            } else {
                errorMsg.innerText = "Extraction Error: " + (data.error || "Please try another link.");
            }
        } catch (err) {
            errorMsg.innerText = "Server Unreachable. Ensure backend is live.";
            console.error("Connection Error:", err);
        } finally {
            loader.style.display = 'none';
        }
    });
});