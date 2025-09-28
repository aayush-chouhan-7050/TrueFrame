document.addEventListener('DOMContentLoaded', () => {
    // --- Add jsPDF to the global scope ---
    const { jsPDF } = window.jspdf;

    // --- UI Element References ---
    const ui = {
        uploadForm: document.getElementById('upload-form'),
        videoInput: document.getElementById('video-input'),
        chooseFileBtn: document.getElementById('choose-file-btn'),
        getStartedBtn: document.getElementById('get-started-btn'),
        uploadAnchor: document.getElementById('upload-anchor'),
        resultSection: document.getElementById('result-section'),
        resultDisplay: document.getElementById('result-display'),
        errorDisplay: document.getElementById('error-display'),
        resultLoader: document.getElementById('result-loader'),
        resultContent: document.getElementById('result-content'),
        videoPreview: document.getElementById('video-preview'),
        fileNameDisplay: document.getElementById('file-name-display'),
        fileSizeDisplay: document.getElementById('file-size-display'),
        verdictDisplay: document.getElementById('verdict-display'),
        verdictText: document.getElementById('verdict-text'),
        confidenceText: document.getElementById('confidence-text'),
        errorText: document.getElementById('error-text'),
        resetErrorBtn: document.getElementById('reset-error-btn'),
        downloadReportBtn: document.getElementById('download-report-btn'),
        analysisBreakdownList: document.querySelector('.analysis-breakdown'),
        timerDisplay: document.getElementById('timer-display')
    };

    // --- State Variable ---
    let lastAnalysisResult = null;
    let countdownInterval = null;

    // --- Event Listeners ---
    const setupEventListeners = () => {
        ui.chooseFileBtn.addEventListener('click', () => ui.videoInput.click());
        ui.videoInput.addEventListener('change', handleFileSelect);
        ui.resetErrorBtn.addEventListener('click', resetUI);
        ui.downloadReportBtn.addEventListener('click', generatePDFReport);

        ui.getStartedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            ui.uploadAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        // Drag and drop listeners
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            ui.uploadForm.addEventListener(eventName, preventDefaults, false);
        });
        ui.uploadForm.addEventListener('dragenter', () => ui.uploadForm.classList.add('dragover'));
        ui.uploadForm.addEventListener('dragover', () => ui.uploadForm.classList.add('dragover'));
        ui.uploadForm.addEventListener('dragleave', () => ui.uploadForm.classList.remove('dragover'));
        ui.uploadForm.addEventListener('drop', handleDrop, false);
    };

    // --- Core Functions ---
    function handleFileSelect(event) {
        const file = event.target.files?.[0];
        if (file) startAnalysis(file);
    }

    function handleDrop(event) {
        ui.uploadForm.classList.remove('dragover');
        const file = event.dataTransfer?.files?.[0];
        if (file) {
            ui.videoInput.files = event.dataTransfer.files;
            startAnalysis(file);
        }
    }

    async function startAnalysis(file) {
        lastAnalysisResult = null;
        if (file.size > 100 * 1024 * 1024) { // 100MB limit
            renderError('File is too large. Maximum size is 100MB.');
            return;
        }

        showLoader(file);
        startTimer(120);

        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Server responded with status ${response.status}`);
            }
            
            renderSuccess(result);
        } catch (error) {
            console.error('Analysis failed:', error);
            renderError(error.message || 'An unknown network error occurred.');
        }
    }

    // --- UI Update Functions ---
    function showLoader(file) {
        ui.resultSection.classList.remove('hidden');
        ui.resultDisplay.classList.remove('hidden');
        ui.errorDisplay.classList.add('hidden');
        
        ui.videoPreview.src = URL.createObjectURL(file);
        ui.fileNameDisplay.textContent = file.name;
        ui.fileSizeDisplay.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

        ui.resultLoader.classList.remove('hidden');
        ui.resultContent.classList.add('hidden');
    }

    function renderSuccess(result) {
        stopTimer();
        lastAnalysisResult = result;
        ui.resultLoader.classList.add('hidden');
        ui.resultContent.classList.remove('hidden');

        const displayConfidence = parseFloat(result.confidence);
        const isFake = result.prediction === 'FAKE';
        
        ui.verdictText.textContent = isFake ? 'AI Generated' : 'Likely REAL';
        ui.confidenceText.textContent = `${displayConfidence.toFixed(2)}% confidence`;
        
        ui.verdictDisplay.className = 'verdict-display'; // Reset classes
        ui.verdictDisplay.classList.add(isFake ? 'fake' : 'real');

        // Dynamically build the analysis breakdown list
        ui.analysisBreakdownList.innerHTML = '';
        result.breakdown.forEach(item => {
            const listItem = `
                <li>
                    <span>${item.name}</span>
                    <span class="tag ${item.tag.toLowerCase()}">${item.tag}</span>
                </li>`;
            ui.analysisBreakdownList.insertAdjacentHTML('beforeend', listItem);
        });
    }

    function renderError(message) {
        stopTimer();
        ui.resultSection.classList.remove('hidden');
        ui.resultDisplay.classList.add('hidden');
        ui.errorDisplay.classList.remove('hidden');
        ui.errorText.textContent = message;
    }

    function resetUI() {
        stopTimer();
        ui.resultSection.classList.add('hidden');
        ui.videoInput.value = ''; // Reset file input
        lastAnalysisResult = null;
        URL.revokeObjectURL(ui.videoPreview.src); // Clean up object URL
    }

    // --- Timer Functions ---
    function startTimer(durationInSeconds) {
        stopTimer();
        let timer = durationInSeconds;

        const updateDisplay = () => {
            const minutes = Math.floor(timer / 60);
            let seconds = timer % 60;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            ui.timerDisplay.textContent = `${minutes}:${seconds}`;
        };

        updateDisplay();

        countdownInterval = setInterval(() => {
            timer--;
            updateDisplay();

            if (timer <= 0) {
                stopTimer();
                ui.timerDisplay.textContent = "Still working...";
            }
        }, 1000);
    }

    function stopTimer() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            ui.timerDisplay.textContent = '';
        }
    }

    // --- PDF Report Generation (Modularized) ---
    function generatePDFReport() {
        if (!lastAnalysisResult) {
            alert('No analysis result is available to download.');
            return;
        }

        const doc = new jsPDF();
        const data = {
            fileName: ui.fileNameDisplay.textContent,
            fileSize: ui.fileSizeDisplay.textContent,
            ...lastAnalysisResult,
        };

        addPdfHeader(doc);
        addFileDetails(doc, data);
        addAnalysisResult(doc, data);
        addInterpretation(doc, data);
        addDisclaimerAndFooter(doc);

        doc.save(`TrueFrame-Report-${data.fileName}.pdf`);
    }

    // --- PDF Helper Functions ---
    const addPdfHeader = (doc) => {
        const pageWidth = doc.internal.pageSize.width;
        doc.setFillColor(44, 62, 80); // #2c3e50
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor(255, 255, 255).text("TrueFrame", 15, 17);
        doc.setFontSize(12).setFont('helvetica', 'normal').text("AI Video Detection Report", 53, 17);
    };

    const addFileDetails = (doc, data) => {
        doc.setTextColor(0).setFontSize(14).setFont('helvetica', 'bold').text("File Information", 15, 40);
        doc.setFontSize(11).setFont('helvetica', 'normal');
        doc.text(`File Name: ${data.fileName}`, 15, 50);
        doc.text(`File Size: ${data.fileSize}`, 15, 57);
        doc.text(`Analysis Date: ${new Date().toLocaleString()}`, 15, 64);
    };

    const addAnalysisResult = (doc, data) => {
        const pageWidth = doc.internal.pageSize.width;
        const isFake = data.prediction === 'FAKE';
        const verdictColor = isFake ? [220, 53, 69] : [40, 167, 69];
        const verdictBgColor = isFake ? [253, 238, 238] : [234, 246, 234];

        doc.setFontSize(14).setFont('helvetica', 'bold').text("Analysis Result", 15, 80);
        
        doc.setDrawColor(...verdictColor).setFillColor(...verdictBgColor).setLineWidth(0.5);
        doc.roundedRect(15, 85, pageWidth - 30, 30, 3, 3, 'FD');

        doc.setFontSize(18).setFont('helvetica', 'bold').setTextColor(...verdictColor);
        doc.text(`Verdict: ${isFake ? 'AI Generated' : 'Likely REAL'}`, 20, 100);

        doc.setFontSize(12).setTextColor(0).setFont('helvetica', 'normal');
        doc.text(`(Confidence: ${parseFloat(data.confidence).toFixed(2)}%)`, 100, 100);
    };
    
    const addInterpretation = (doc, data) => {
        const pageWidth = doc.internal.pageSize.width;
        const isFake = data.prediction === 'FAKE';
        const text = isFake
            ? "The analysis detected patterns and artifacts consistent with known AI video generation techniques. This could include unnatural facial movements, temporal inconsistencies, or digital fingerprints left by generative models."
            : "The analysis did not find significant evidence of AI generation. The video's motion, visual patterns, and frame-to-frame consistency appear natural and authentic based on our detection models.";

        doc.setFontSize(14).setFont('helvetica', 'bold').text("Interpretation", 15, 130);
        doc.setFontSize(11).setFont('helvetica', 'normal');
        doc.text(doc.splitTextToSize(text, pageWidth - 30), 15, 138);
    };

    const addDisclaimerAndFooter = (doc) => {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const disclaimer = "This report is generated by an automated AI system. While it achieves high accuracy, the results should be used as a strong indicator rather than an absolute guarantee. Context is always important.";
        
        doc.setFontSize(10).setTextColor(150);
        doc.text(doc.splitTextToSize(disclaimer, pageWidth - 30), 15, pageHeight - 40);
        
        doc.setDrawColor(200).setLineWidth(0.5).line(15, pageHeight - 25, pageWidth - 15, pageHeight - 25);
        doc.text(`© ${new Date().getFullYear()} TrueFrame. All rights reserved.`, 15, pageHeight - 15);
        doc.text("Page 1 of 1", pageWidth - 35, pageHeight - 15);
    };

    // --- Utility Function ---
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // --- Initialize the App ---
    setupEventListeners();
});