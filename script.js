// DOM Elements
const videoUrlInput = document.getElementById('video-url');
const analyzeBtn = document.getElementById('analyze-btn');
const resultContainer = document.getElementById('result-container');
const optionsContainer = document.getElementById('options-container');
const downloadBtn = document.getElementById('download-btn');
const formatBtns = document.querySelectorAll('.format-btn');
const errorContainer = document.getElementById('error-container');
const offlineNotice = document.getElementById('offline-notice');

// Global variables
let currentVideoInfo = null;
let selectedFormat = 'mp4';

// Initialize the app
function init() {
  // Set current year in footer
  document.getElementById('current-year').textContent = new Date().getFullYear();
  
  // Set up event listeners
  setupEventListeners();
  
  // Check online status
  updateOnlineStatus();
}

// Set up all event listeners
function setupEventListeners() {
  // Analyze button click
  analyzeBtn.addEventListener('click', handleAnalyzeClick);
  
  // Download button click
  downloadBtn.addEventListener('click', handleDownloadClick);
  
  // Format selection buttons
  formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      formatBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      selectedFormat = btn.dataset.format;
    });
  });
  
  // Allow pressing Enter in the input field
  videoUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAnalyzeClick();
    }
  });
  
  // Network status events
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

// Handle analyze button click
async function handleAnalyzeClick() {
  const url = videoUrlInput.value.trim();
  
  if (!url) {
    showError('Please enter a YouTube URL');
    return;
  }
  
  try {
    // Show loading state
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    
    // Validate URL
    if (!isValidYouTubeUrl(url)) {
      throw new Error('Please enter a valid YouTube URL');
    }
    
    // Fetch video info
    currentVideoInfo = await fetchVideoInfo(url);
    
    // Display video info
    displayVideoInfo(currentVideoInfo);
    
    // Show download options
    optionsContainer.classList.remove('hidden');
    downloadBtn.disabled = false;
    
  } catch (error) {
    console.error('Analyze error:', error);
    showErrorInResult(error.message);
  } finally {
    // Reset analyze button
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze';
  }
}

// Handle download button click
async function handleDownloadClick() {
  if (!currentVideoInfo) return;
  
  try {
    // Show loading state
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
    
    // Start download
    const downloadUrl = await getDownloadUrl(currentVideoInfo.videoId, selectedFormat);
    
    // Create temporary link for download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${currentVideoInfo.title}.${selectedFormat}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Download error:', error);
    showError(error.message);
  } finally {
    // Reset download button
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Now';
  }
}

// Validate YouTube URL
function isValidYouTubeUrl(url) {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

// Fetch video info from backend
async function fetchVideoInfo(url) {
  const response = await fetch(`/.netlify/functions/info?url=${encodeURIComponent(url)}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch video info');
  }
  
  return data;
}

// Display video info in the result container
function displayVideoInfo(videoInfo) {
  resultContainer.innerHTML = `
    <div class="video-preview">
      <img src="${videoInfo.thumbnail}" alt="Video thumbnail" loading="lazy">
      <div class="video-info">
        <h3>${videoInfo.title}</h3>
        <p>Duration: ${formatTime(videoInfo.duration)}</p>
      </div>
    </div>
  `;
  resultContainer.classList.remove('hidden');
}

// Format time from seconds to MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get download URL from backend
async function getDownloadUrl(videoId, format) {
  const response = await fetch(`/.netlify/functions/download?id=${videoId}&format=${format}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get download URL');
  }
  
  return data.url;
}

// Show error message in result container
function showErrorInResult(message) {
  resultContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <p>${message}</p>
    </div>
  `;
  resultContainer.classList.remove('hidden');
}

// Show error message at top of page
function showError(message) {
  errorContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <p>${message}</p>
      <button onclick="this.parentElement.parentElement.style.display='none'">Dismiss</button>
    </div>
  `;
  errorContainer.style.display = 'block';
  
  // Hide error after 5 seconds
  setTimeout(() => {
    errorContainer.style.display = 'none';
  }, 5000);
}

// Update online/offline status
function updateOnlineStatus() {
  offlineNotice.style.display = navigator.onLine ? 'none' : 'flex';
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
