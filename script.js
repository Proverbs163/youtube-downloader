// Main initialization function
function initApp() {
  console.log('Initializing application...');
  
  // Elements
  const analyzeBtn = document.getElementById('analyze-btn');
  const downloadBtn = document.getElementById('download-btn');
  const formatBtns = document.querySelectorAll('.format-btn');
  const videoUrlInput = document.getElementById('video-url');
  const optionsContainer = document.getElementById('options-container');
  const resultContainer = document.getElementById('result-container');
  const errorContainer = document.getElementById('error-container');
  const offlineNotice = document.getElementById('offline-notice');

  // Current video data
  let currentVideoData = null;
  let selectedFormat = 'mp4'; // Default format

  // Verify all elements exist
  if (!analyzeBtn || !downloadBtn || !videoUrlInput || !optionsContainer || !resultContainer) {
    console.error('Critical elements missing from DOM');
    return;
  }

  // Set current year in footer
  document.getElementById('current-year').textContent = new Date().getFullYear();

  // Network status detection
  function updateOnlineStatus() {
    offlineNotice.style.display = navigator.onLine ? 'none' : 'flex';
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // Format selection
  formatBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove active class from all buttons
      formatBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      
      // Add active class to clicked button
      this.classList.add('active');
      this.setAttribute('aria-pressed', 'true');
      
      // Update selected format
      selectedFormat = this.dataset.format;
      console.log('Selected format:', selectedFormat); // Debug log
    });
  });

  // Set initial active format (MP4)
  document.querySelector('.format-btn[data-format="mp4"]').classList.add('active');
  document.querySelector('.format-btn[data-format="mp4"]').setAttribute('aria-pressed', 'true');

  // Show error message
  function showError(message) {
    errorContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
        <button onclick="this.parentElement.parentElement.style.display='none'">Dismiss</button>
      </div>
    `;
    errorContainer.style.display = 'block';
    
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 5000);
  }

  // Analyze button
  analyzeBtn.addEventListener('click', async function() {
    const url = videoUrlInput.value.trim();
    
    if (!url) {
      showError('Please enter a YouTube URL');
      return;
    }

    // Basic YouTube URL validation
    if (!url.includes('youtube.com/watch') && !url.includes('youtu.be/')) {
      showError('Please enter a valid YouTube URL');
      return;
    }

    try {
      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
      
      const response = await fetch(`/.netlify/functions/info?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Analysis failed');
      
      // Store video data
      currentVideoData = data;
      
      // Display video info
      resultContainer.innerHTML = `
        <div class="video-preview">
          <img src="${data.thumbnail}" alt="Video thumbnail" loading="lazy">
          <div class="video-info">
            <h3>${data.title}</h3>
            <p>Duration: ${formatTime(data.duration)}</p>
          </div>
        </div>
      `;
      resultContainer.classList.remove('hidden');
      
      // Show download options
      optionsContainer.classList.remove('hidden');
      downloadBtn.disabled = false;
      
    } catch (error) {
      console.error('Analyze error:', error);
      resultContainer.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>${error.message}</p>
        </div>
      `;
      resultContainer.classList.remove('hidden');
    } finally {
      this.disabled = false;
      this.innerHTML = '<i class="fas fa-search"></i> Analyze';
    }
  });

  // Download button
  downloadBtn.addEventListener('click', async function() {
    if (!currentVideoData) {
      showError('Please analyze a video first');
      return;
    }

    try {
      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
      
      console.log('Downloading in format:', selectedFormat); // Debug log
      
      const response = await fetch(`/.netlify/functions/download?id=${currentVideoData.videoId}&format=${selectedFormat}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Download failed');
      if (!data.url) throw new Error('No download link received');
      
      // Trigger download
      const a = document.createElement('a');
      a.href = data.url;
      a.download = `${currentVideoData.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.${selectedFormat}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Download error:', error);
      showError(`Download failed: ${error.message}`);
    } finally {
      this.disabled = false;
      this.innerHTML = '<i class="fas fa-download"></i> Download Now';
    }
  });

  // Allow pressing Enter in the input field
  videoUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      analyzeBtn.click();
    }
  });

  console.log('Application initialized successfully');
}

// Helper function to format seconds to MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Call initApp when script loads
if (document.readyState === 'complete') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}
