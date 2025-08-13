document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const app = {
    elements: {
      analyzeBtn: document.getElementById('analyze-btn'),
      downloadBtn: document.getElementById('download-btn'),
      formatBtns: document.querySelectorAll('.format-btn'),
      videoUrlInput: document.getElementById('video-url'),
      optionsContainer: document.getElementById('options-container'),
      resultContainer: document.getElementById('result-container'),
      errorContainer: document.getElementById('error-container'),
      offlineNotice: document.getElementById('offline-notice')
    },
    state: {
      currentVideo: null,
      selectedFormat: 'mp4'
    }
  };

  // Initialize the app
  function init() {
    setupEventListeners();
    setCurrentYear();
    setupNetworkDetection();
    setInitialFormat();
    console.log('YouTube Downloader initialized');
  }

  // Event Listeners
  function setupEventListeners() {
    // Format selection
    app.elements.formatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        app.elements.formatBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        app.state.selectedFormat = btn.dataset.format;
        console.log('Selected format:', app.state.selectedFormat);
      });
    });

    // Analyze button
    app.elements.analyzeBtn.addEventListener('click', handleAnalyze);

    // Download button
    app.elements.downloadBtn.addEventListener('click', handleDownload);

    // Enter key in input field
    app.elements.videoUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAnalyze();
    });
  }

  // Set current year in footer
  function setCurrentYear() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
  }

  // Network detection
  function setupNetworkDetection() {
    const updateStatus = () => {
      app.elements.offlineNotice.style.display = navigator.onLine ? 'none' : 'flex';
    };
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  // Set initial format to MP4
  function setInitialFormat() {
    const mp4Btn = document.querySelector('.format-btn[data-format="mp4"]');
    if (mp4Btn) {
      mp4Btn.classList.add('active');
      mp4Btn.setAttribute('aria-pressed', 'true');
    }
  }

  // Handle video analysis
  async function handleAnalyze() {
    const url = app.elements.videoUrlInput.value.trim();
    
    if (!url) {
      showError('Please enter a YouTube URL');
      return;
    }

    // Basic YouTube URL validation
    if (!isValidYouTubeUrl(url)) {
      showError('Please enter a valid YouTube URL');
      return;
    }

    try {
      setLoading(app.elements.analyzeBtn, true);
      
      const response = await fetch(`/.netlify/functions/info?url=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch video info');
      }
      
      const data = await response.json();
      app.state.currentVideo = data;
      
      displayVideoInfo(data);
      app.elements.optionsContainer.classList.remove('hidden');
      app.elements.downloadBtn.disabled = false;
      
    } catch (error) {
      console.error('Analysis error:', error);
      showError(error.message);
      showResultError(error.message);
    } finally {
      setLoading(app.elements.analyzeBtn, false);
    }
  }

  // Handle download
  async function handleDownload() {
    if (!app.state.currentVideo) {
      showError('Please analyze a video first');
      return;
    }

    try {
      setLoading(app.elements.downloadBtn, true);
      
      const response = await fetch(`/.netlify/functions/download?id=${app.state.currentVideo.videoId}&format=${app.state.selectedFormat}`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Download failed');
      }
      
      const data = await response.json();
      triggerDownload(data.url, `${app.state.currentVideo.title}.${app.state.selectedFormat}`);
      
    } catch (error) {
      console.error('Download error:', error);
      showError(error.message);
    } finally {
      setLoading(app.elements.downloadBtn, false);
    }
  }

  // Helper functions
  function isValidYouTubeUrl(url) {
    return url.includes('youtube.com/watch') || url.includes('youtu.be/');
  }

  function displayVideoInfo(video) {
    app.elements.resultContainer.innerHTML = `
      <div class="video-preview">
        <img src="${video.thumbnail}" alt="Video thumbnail" loading="lazy">
        <div class="video-info">
          <h3>${video.title}</h3>
          <p>Duration: ${formatTime(video.duration)}</p>
        </div>
      </div>
    `;
    app.elements.resultContainer.classList.remove('hidden');
  }

  function showError(message) {
    app.elements.errorContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
        <button onclick="this.parentElement.parentElement.style.display='none'">Dismiss</button>
      </div>
    `;
    app.elements.errorContainer.style.display = 'block';
    setTimeout(() => app.elements.errorContainer.style.display = 'none', 5000);
  }

  function showResultError(message) {
    app.elements.resultContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
      </div>
    `;
    app.elements.resultContainer.classList.remove('hidden');
  }

  function setLoading(element, isLoading) {
    if (element === app.elements.analyzeBtn) {
      element.disabled = isLoading;
      element.innerHTML = isLoading 
        ? '<i class="fas fa-spinner fa-spin"></i> Analyzing...' 
        : '<i class="fas fa-search"></i> Analyze';
    } else if (element === app.elements.downloadBtn) {
      element.disabled = isLoading;
      element.innerHTML = isLoading
        ? '<i class="fas fa-spinner fa-spin"></i> Preparing...'
        : '<i class="fas fa-download"></i> Download Now';
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
  init();
});
