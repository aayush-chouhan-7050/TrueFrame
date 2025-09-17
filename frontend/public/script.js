document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const uploadForm = document.getElementById('upload-form');
    const videoInput = document.getElementById('video-input');
    const chooseFileBtn = document.getElementById('choose-file-btn');
    const getStartedBtn = document.getElementById('get-started-btn'); // New
    const uploadAnchor = document.getElementById('upload-anchor'); // New
    
    // Sections and containers
    const resultSection = document.getElementById('result-section');
    const resultDisplay = document.getElementById('result-display');
    const errorDisplay = document.getElementById('error-display');
    const resultLoader = document.getElementById('result-loader'); // New
    const resultContent = document.getElementById('result-content'); // New

    // Result display elements
    const videoPreview = document.getElementById('video-preview');
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileSizeDisplay = document.getElementById('file-size-display');
    const verdictDisplay = document.getElementById('verdict-display');
    const verdictText = document.getElementById('verdict-text');
    const confidenceText = document.getElementById('confidence-text');
    const errorText = document.getElementById('error-text');
    const resetErrorBtn = document.getElementById('reset-error-btn');

    // --- Event Listeners ---
    chooseFileBtn.addEventListener('click', () => videoInput.click());
    videoInput.addEventListener('change', handleFileSelect);
    resetErrorBtn.addEventListener('click', resetUI);

    // NEW: Smooth scroll for "Get Started" button
    getStartedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        uploadAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    
    // Drag and drop listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadForm.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadForm.addEventListener(eventName, () => uploadForm.classList.add('dragover'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        uploadForm.addEventListener(eventName, () => uploadForm.classList.remove('dragover'), false);
    });
    uploadForm.addEventListener('drop', handleDrop, false);

    // --- Core Functions ---
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) startAnalysis(file);
    }

    function handleDrop(event) {
        const file = event.dataTransfer.files[0];
        if (file) {
            videoInput.files = event.dataTransfer.files; // Assign file to input
            startAnalysis(file);
        }
    }
    
    async function startAnalysis(file) {
        // 1. Validate file size
        if (file.size > 100 * 1024 * 1024) { // 100MB limit
            // We need to show the error display for this case
            resultSection.classList.remove('hidden');
            resultDisplay.classList.add('hidden');
            displayError('File is too large. Maximum size is 100MB.');
            return;
        }

        // 2. CHANGED: Show preview and loader immediately
        showPreviewAndLoader(file);

        // 3. Prepare and send data
        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || 'An unknown error occurred during analysis.');
            }
            
            // 4. Display success result
            displaySuccess(result);
        } catch (error) {
            // 5. Display error result
            console.error('Analysis failed:', error);
            displayError(error.message);
        }
    }

    // --- UI Update Functions ---

    // NEW FUNCTION: Shows the preview instantly and the loader in the results card
    function showPreviewAndLoader(file) {
        // Show the main sections
        resultSection.classList.remove('hidden');
        resultDisplay.classList.remove('hidden');
        errorDisplay.classList.add('hidden');
        
        // Populate the video preview card immediately
        videoPreview.src = URL.createObjectURL(file);
        fileNameDisplay.textContent = file.name;
        fileSizeDisplay.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

        // Show the loader in the results card and hide the final content
        resultLoader.classList.remove('hidden');
        resultContent.classList.add('hidden');
    }

    function displaySuccess(result) {
        // Hide loader and show the populated results
        resultLoader.classList.add('hidden');
        resultContent.classList.remove('hidden');
        
        // Populate verdict
        verdictText.textContent = result.prediction === 'FAKE' ? 'AI Generated' : 'Likely REAL';
        confidenceText.textContent = `${result.confidence}% confidence`;
        
        verdictDisplay.className = 'verdict-display'; // Reset classes
        verdictDisplay.classList.add(result.prediction.toLowerCase());
    }

    function displayError(message) {
        // Hide the main grid and show the error message block
        resultDisplay.classList.add('hidden');
        errorDisplay.classList.remove('hidden');
        errorText.textContent = message;
    }

    function resetUI() {
        resultSection.classList.add('hidden');
        videoInput.value = ''; // Clear file input
    }

    // --- Utility Function ---
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
});