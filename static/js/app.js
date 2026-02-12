document.addEventListener('DOMContentLoaded', function() {
    // 0. CONFIGURATION: Point this to your Render Backend URL
    const BASE_URL = "https://flashdl-api.onrender.com";

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
            errorMsg.innerText = "Please paste a link first";
            return;
        }

        errorMsg.innerText = "";
        resultArea.style.display = 'none';
        loader.style.display = 'block';

        try {
            // Updated to use BASE_URL for the Render API
            const response = await fetch(`${BASE_URL}/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });
            const data = await response.json();

            if (data.success) {
                document.getElementById('res-title').innerText = data.title;
                
                const downloadLink = document.getElementById('res-link');
                const videoOptionsDiv = document.getElementById('video-options');
                const qualitySelect = document.getElementById('quality-select');

                videoOptionsDiv.style.display = 'block';
                qualitySelect.innerHTML = '';

                // Populate quality options
                data.options.forEach((opt, index) => {
                    let option = document.createElement('option');
                    option.value = index;
                    option.text = opt.label;
                    qualitySelect.appendChild(option);
                });

                // Set Download Action
                downloadLink.onclick = (e) => {
                    e.preventDefault();
                    const sel = data.options[qualitySelect.value];
                    
                    if (sel.merge) {
                        M.toast({html: 'Merging HD Video/Audio... this may take a minute.'});
                        window.location.href = `${BASE_URL}/process_merge?url=${encodeURIComponent(data.original_url)}&format_id=${sel.format_id}&title=${encodeURIComponent(data.title)}`;
                    } else {
                        // Direct download link from YouTube/Provider
                        window.location.href = sel.url;
                    }
                };

                resultArea.style.display = 'flex';
                resultArea.classList.add('fade-in-up');
            } else {
                errorMsg.innerText = "Error: " + (data.error || "Extraction failed");
            }
        } catch (err) {
            errorMsg.innerText = "Server Unreachable. Backend might be sleeping.";
            console.error(err);
        } finally {
            loader.style.display = 'none';
        }
    });
});