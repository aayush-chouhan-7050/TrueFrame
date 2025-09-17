document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Element Selection ---
  const uploadForm = document.getElementById('upload-form');
  const videoInput = document.getElementById('video-input');
  const chooseFileBtn = document.getElementById('choose-file-btn');
  const resultSection = document.getElementById('result-section');
  const loader = document.getElementById('loader');
  const resultDisplay = document.getElementById('result-display');
  const errorDisplay = document.getElementById('error-display');
  const videoPreview = document.getElementById('video-preview');
  const fileNameDisplay = document.getElementById('file-name-display');
  const fileSizeDisplay = document.getElementById('file-size-display');
  const verdictDisplay = document.getElementById('verdict-display');
  const verdictText = document.getElementById('verdict-text');
  const confidenceText = document.getElementById('confidence-text');
  const errorText = document.getElementById('error-text');
  const resetBtn = document.getElementById('reset-btn');
  const resetErrorBtn = document.getElementById('reset-error-btn');

  // --- Event Listeners ---
  chooseFileBtn.addEventListener('click', () => videoInput.click());
  videoInput.addEventListener('change', handleFileSelect);
  uploadForm.addEventListener('submit', handleFormSubmit);
  resetBtn.addEventListener('click', resetUI);
  resetErrorBtn.addEventListener('click', resetUI);
  
  // Add drag and drop listeners
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
    if (file) {
      startAnalysis(file);
    }
  }

  function handleFormSubmit(event) {
    preventDefaults(event);
    const file = videoInput.files[0];
    if (file) {
      startAnalysis(file);
    } else {
      alert('Please choose a file first.');
    }
  }

  function handleDrop(event) {
    const dt = event.dataTransfer;
    const file = dt.files[0];
    if (file) {
        videoInput.files = dt.files; // Assign dropped file to the input
        startAnalysis(file);
    }
  }

  async function startAnalysis(file) {
    // 1. Validate File
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      displayError('File is too large. Maximum size is 100MB.');
      return;
    }

    // 2. Update UI to "Processing" state
    showProcessingState(file);

    // 3. Prepare and Send Data
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('/upload', { method: 'POST', body: formData });
      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'An unknown error occurred during analysis.');
      }
      
      // 4. Display Success Result
      displaySuccess(result);
    } catch (error) {
      // 5. Display Error Result
      console.error('Analysis failed:', error);
      displayError(error.message);
    }
  }

  // --- UI Update Functions ---
  function showProcessingState(file) {
    resultSection.classList.remove('hidden');
    loader.classList.remove('hidden');
    resultDisplay.classList.add('hidden');
    errorDisplay.classList.add('hidden');

    // Show preview
    const videoURL = URL.createObjectURL(file);
    videoPreview.src = videoURL;
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  }

  function displaySuccess(result) {
    loader.classList.add('hidden');
    resultDisplay.classList.remove('hidden');

    verdictText.textContent = result.prediction === 'FAKE' ? 'AI Generated' : 'Likely REAL';
    confidenceText.textContent = `Confidence: ${result.confidence}%`;
    
    verdictDisplay.className = 'verdict-display'; // Reset classes
    verdictDisplay.classList.add(result.prediction.toLowerCase());
  }

  function displayError(message) {
    resultSection.classList.remove('hidden');
    loader.classList.add('hidden');
    resultDisplay.classList.add('hidden');
    errorDisplay.classList.remove('hidden');
    errorText.textContent = message;
  }

  function resetUI() {
    resultSection.classList.add('hidden');
    videoInput.value = ''; // Clear the file input
    URL.revokeObjectURL(videoPreview.src); // Revoke object URL to free memory
  }

  // --- Utility Functions ---
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
});