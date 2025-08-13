// Main initialization function
function initApp() {
  console.log('Initializing YouTube Downloader...');
  
  // Elements
  const elements = {
    analyzeBtn: document.getElementById('analyze-btn'),
    downloadBtn: document.getElementById('download-btn'),
    formatBtns: document.querySelectorAll('.format-btn'),
    videoUrlInput: document.getElementById('video-url'),
    optionsContainer: document.getElementById('options-container'),
    resultContainer: document.getElementById('result-container'),
    errorContainer: document.getElementById('error-container'),
    offlineNotice: document.getElementById('offline-notice')
  };

  // State management
  const state = {
    currentVideo: null,
    selectedFormat: 'mp4'
  };

  // Verify all elements exist
  if (!elements.analyzeBtn || !elements.downloadBtn || !elements.videoUrlInput) {
    console.error('Critical elements missing from DOM');
    return;
  }

  // Initialize the app
  function initialize() {
    setCurrentYear();
    setupNetworkDetection();
    setupFormatSelection();
    setupEventListeners();
    setInitialFormat();
    console.log('App initialized successfully');
  }

  // Helper functions
  function setCurrentYear() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
  }

  function setupNetworkDetection() {
    const updateStatus = () => {
      elements.offlineNotice.style.display = navigator.onLine ? 'none' : 'flex';
    };
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  function setupFormatSelection() {
    elements.formatBtns.forEach(btn => {
      btn.addEventListener('click', () => handleFormatSelection(btn));
    });
  }

  function handleFormatSelection(selectedBtn) {
    // Update UI
    elements.formatBtns.forEach(btn => {
      const isActive = btn === selectedBtn;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });
    
    // Update state
    state.selectedFormat = selectedBtn.dataset.format;
    console.log('Format changed to:', state.selectedFormat); // Debug
  }

  function setInitialFormat() {
    const initialFormatBtn = document.querySelector('.format-btn[data-format="mp4"]');
    if (initialFormatBtn) {
      initialFormatBtn.classList.add('active');
      initialFormatBtn.setAttribute('aria-pressed', 'true');
    }
  }

  function setupEventListeners() {
    elements.analyzeBtn.addEventListener('click', handleAnalyze);
    elements.downloadBtn.addEventListener('click', handleDownload);
    elements.videoUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') elements.analyzeBtn.click();
    });
  }

  function showError(message) {
    elements.errorContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
        <button onclick="this.parentElement.parentElement.style.display='none'">Dismiss</button>
      </div>
    `;
    elements.errorContainer.style.display = 'block';
    setTimeout(() => elements.errorContainer.style.display = 'none', 5000);
  }

  function setLoading(button, isLoading) {
    if (button === elements.analyzeBtn) {
      button.disabled = isLoading;
      button.innerHTML = isLoading 
        ? '<i class="fas fa-spinner fa-spin"></i> Analyzing...' 
        : '<i class="fas fa-search"></i> Analyze';
    } else if (button === elements.downloadBtn) {
      button.disabled = isLoading;
      button.innerHTML = isLoading
        ? '<i class="fas fa-spinner fa-spin"></i> Preparing...'
        : '<i class="fas fa-download"></i> Download Now';
    }
  }

  // Main handlers
  async function handleAnalyze() {
    const url = elements.videoUrlInput.value.trim();
    
    if (!url) return showError('Please enter a YouTube URL');
    if (!isValidYouTubeUrl(url)) return showError('Please enter a valid YouTube URL');

    try {
      setLoading(elements.analyzeBtn, true);
      
      const response = await fetch(`/.netlify/functions/info?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Analysis failed');
      
      // Update state and UI
      state.currentVideo = data;
      displayVideoInfo(data);
      elements.optionsContainer.classList.remove('hidden');
      elements.downloadBtn.disabled = false;
      
    } catch (error) {
      console.error('Analyze error:', error);
      showResultError(error.message);
    } finally {
      setLoading(elements.analyzeBtn, false);
    }
  }

  function isValidYouTubeUrl(url) {
    return url.includes('youtube.com/watch') || url.includes('youtu.be/');
  }

  function displayVideoInfo(video) {
    elements.resultContainer.innerHTML = `
      <div class="video-preview">
        <img src="${video.thumbnail}" alt="Video thumbnail" loading="lazy">
        <div class="video-info">
          <h3>${video.title}</h3>
          <p>Duration: ${formatTime(video.duration)}</p>
        </div>
      </div>
    `;
    elements.resultContainer.classList.remove('hidden');
  }

  function showResultError(message) {
    elements.resultContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
      </div>
    `;
    elements.resultContainer.classList.remove('hidden');
  }

  async function handleDownload() {
    if (!state.currentVideo) return showError('Please analyze a video first');
    
    try {
      setLoading(elements.downloadBtn, true);
      console.log('Attempting download with format:', state.selectedFormat); // Debug
      
      const response = await fetch(`/.netlify/functions/download?id=${state.currentVideo.videoId}&format=${state.selectedFormat}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Download failed');
      if (!data.url) throw new Error('No download link received');
      
      triggerDownload(data.url, `${state.currentVideo.title}.${state.selectedFormat}`);
      
    } catch (error) {
      console.error('Download error:', error);
      showError(`Download failed: ${error.message}`);
    } finally {
      setLoading(elements.downloadBtn, false);
    }
  }

  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/[^a-z0-9._-]/gi, '_').substring(0, 100);
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Start the app
  initialize();
}

// Start the app when ready
if (document.readyState === 'complete') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}
