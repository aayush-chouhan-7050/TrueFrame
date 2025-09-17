document.addEventListener('DOMContentLoaded', () => {
    // --- Add jsPDF to the global scope ---
    const { jsPDF } = window.jspdf;

    // --- DOM Element Selection ---
    const uploadForm = document.getElementById('upload-form');
    const videoInput = document.getElementById('video-input');
    const chooseFileBtn = document.getElementById('choose-file-btn');
    const getStartedBtn = document.getElementById('get-started-btn');
    const uploadAnchor = document.getElementById('upload-anchor');
    
    // Sections and containers
    const resultSection = document.getElementById('result-section');
    const resultDisplay = document.getElementById('result-display');
    const errorDisplay = document.getElementById('error-display');
    const resultLoader = document.getElementById('result-loader');
    const resultContent = document.getElementById('result-content');

    // Result display elements
    const videoPreview = document.getElementById('video-preview');
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileSizeDisplay = document.getElementById('file-size-display');
    const verdictDisplay = document.getElementById('verdict-display');
    const verdictText = document.getElementById('verdict-text');
    const confidenceText = document.getElementById('confidence-text');
    const errorText = document.getElementById('error-text');
    const resetErrorBtn = document.getElementById('reset-error-btn');
    const downloadReportBtn = document.getElementById('download-report-btn');

    // --- State Variable ---
    let lastAnalysisResult = null; 

    // --- Event Listeners ---
    chooseFileBtn.addEventListener('click', () => videoInput.click());
    videoInput.addEventListener('change', handleFileSelect);
    resetErrorBtn.addEventListener('click', resetUI);
    downloadReportBtn.addEventListener('click', generatePDFReport);

    getStartedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        uploadAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    
    // Drag and drop listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadForm.addEventListener(eventName, preventDefaults, false);
        uploadForm.addEventListener(eventName, () => uploadForm.classList.toggle('dragover', ['dragenter', 'dragover'].includes(eventName)), false);
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
            videoInput.files = event.dataTransfer.files;
            startAnalysis(file);
        }
    }
    
    async function startAnalysis(file) {
        lastAnalysisResult = null; 
        if (file.size > 100 * 1024 * 1024) {
            resultSection.classList.remove('hidden');
            resultDisplay.classList.add('hidden');
            displayError('File is too large. Maximum size is 100MB.');
            return;
        }

        showPreviewAndLoader(file);

        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || 'An unknown error occurred during analysis.');
            }
            
            displaySuccess(result);
        } catch (error) {
            console.error('Analysis failed:', error);
            displayError(error.message);
        }
    }

    // --- UI Update Functions ---
    function showPreviewAndLoader(file) {
        resultSection.classList.remove('hidden');
        resultDisplay.classList.remove('hidden');
        errorDisplay.classList.add('hidden');
        
        videoPreview.src = URL.createObjectURL(file);
        fileNameDisplay.textContent = file.name;
        fileSizeDisplay.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

        resultLoader.classList.remove('hidden');
        resultContent.classList.add('hidden');
    }

    function displaySuccess(result) {
        lastAnalysisResult = result; 
        resultLoader.classList.add('hidden');
        resultContent.classList.remove('hidden');
        
        verdictText.textContent = result.prediction === 'FAKE' ? 'AI Generated' : 'Likely REAL';
        confidenceText.textContent = `${result.confidence}% confidence`;
        
        verdictDisplay.className = 'verdict-display';
        verdictDisplay.classList.add(result.prediction.toLowerCase());
    }

    function displayError(message) {
        resultDisplay.classList.add('hidden');
        errorDisplay.classList.remove('hidden');
        errorText.textContent = message;
    }

    function resetUI() {
        resultSection.classList.add('hidden');
        videoInput.value = '';
        lastAnalysisResult = null;
    }

    // --- CORRECTED FUNCTION: More Detailed Report Generation ---
    function generatePDFReport() {
        if (!lastAnalysisResult) {
            alert('No analysis result to download.');
            return;
        }

        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;

        const fileName = fileNameDisplay.textContent;
        const fileSize = fileSizeDisplay.textContent;
        const verdict = lastAnalysisResult.prediction;
        const confidence = lastAnalysisResult.confidence;
        const isFake = verdict === 'FAKE';

        // --- Header ---
        doc.setFillColor(44, 62, 80); // #2c3e50
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text("TrueFrame", 15, 17);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text("AI Video Detection Report", 53, 17);

        // --- File Details Section ---
        doc.setTextColor(0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("File Information", 15, 40);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`File Name: ${fileName}`, 15, 50);
        doc.text(`File Size: ${fileSize}`, 15, 57);
        doc.text(`Analysis Date: ${new Date().toLocaleString()}`, 15, 64);

        // --- Analysis Result Section ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Analysis Result", 15, 80);

        // --- CORRECTED Result Box ---
        doc.setLineWidth(0.5);
        if (isFake) {
            doc.setDrawColor(220, 53, 69); // Red border
            doc.setFillColor(253, 238, 238); // Light Red fill
        } else {
            doc.setDrawColor(223, 230, 223); // Green border
            doc.setFillColor(234, 246, 234); // Light Green fill
        }
        doc.roundedRect(15, 85, pageWidth - 30, 30, 3, 3, 'FD');

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        if (isFake) {
            doc.setTextColor(220, 53, 69); // Red text
        } else {
            doc.setTextColor(40, 167, 69); // Green text
        }
        doc.text(`Verdict: ${isFake ? 'AI Generated' : 'Likely REAL'}`, 20, 100);

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'normal');
        doc.text(`(Confidence: ${confidence}%)`, 100, 100);

        // --- Interpretation ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Interpretation", 15, 130);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const interpretationText = isFake
            ? "The analysis detected patterns and artifacts consistent with known AI video generation techniques. This could include unnatural facial movements, temporal inconsistencies between frames, or digital fingerprints left by generative models."
            : "The analysis did not find significant evidence of AI generation. The video's motion, visual patterns, and frame-to-frame consistency appear natural and authentic based on our detection models.";
        
        doc.text(doc.splitTextToSize(interpretationText, pageWidth - 30), 15, 138);

        // --- Disclaimer ---
        doc.setFontSize(10);
        doc.setTextColor(150); // Gray color
        const disclaimer = "This report is generated by an automated AI system. While it achieves high accuracy, the results should be used as a strong indicator rather than an absolute guarantee. Context is always important.";
        doc.text(doc.splitTextToSize(disclaimer, pageWidth - 30), 15, pageHeight - 40);
        
        // --- Footer ---
        doc.setLineWidth(0.5);
        doc.setDrawColor(200);
        doc.line(15, pageHeight - 25, pageWidth - 15, pageHeight - 25);
        doc.text(`© ${new Date().getFullYear()} TrueFrame. All rights reserved.`, 15, pageHeight - 15);
        doc.text("Page 1 of 1", pageWidth - 35, pageHeight - 15);

        doc.save(`TrueFrame-Report-${fileName}.pdf`);
    }

    // --- Utility Function ---
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
});