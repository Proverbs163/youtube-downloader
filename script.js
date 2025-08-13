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

  // Verify all elements exist
  if (!analyzeBtn || !downloadBtn || !videoUrlInput || !optionsContainer) {
    console.error('Critical elements missing from DOM');
    return;
  }

  // Format selection
  formatBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      formatBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Analyze button
  analyzeBtn.addEventListener('click', async function() {
    const url = videoUrlInput.value.trim();
    
    if (!url) {
      alert('Please enter a YouTube URL');
      return;
    }

    try {
      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
      
      const response = await fetch(`/.netlify/functions/info?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Analysis failed');
      
      optionsContainer.classList.remove('hidden');
      downloadBtn.disabled = false;
      
    } catch (error) {
      console.error('Analyze error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      this.disabled = false;
      this.innerHTML = '<i class="fas fa-search"></i> Analyze';
    }
  });

  // Download button
  downloadBtn.addEventListener('click', async function() {
    const url = videoUrlInput.value.trim();
    const format = document.querySelector('.format-btn.active')?.dataset.format;
    
    if (!url || !format) {
      alert('Please analyze a video first');
      return;
    }

    try {
      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
      
      const response = await fetch(`/.netlify/functions/download?url=${encodeURIComponent(url)}&format=${format}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Download failed');
      if (!data.url) throw new Error('No download link received');
      
      // Trigger download
      const a = document.createElement('a');
      a.href = data.url;
      a.download = `download.${format}`;
      a.click();
      
    } catch (error) {
      console.error('Download error:', error);
      alert(`Download failed: ${error.message}`);
    } finally {
      this.disabled = false;
      this.innerHTML = '<i class="fas fa-download"></i> Download Now';
    }
  });

  console.log('Application initialized successfully');
}

// Call initApp when script loads
if (document.readyState === 'complete') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}

// After successful API response (in your analyze function)
const resultContainer = document.getElementById('result-container');
resultContainer.innerHTML = `
  <div class="video-preview">
    <img src="${data.thumbnail}" alt="Video thumbnail" class="thumbnail">
    <div class="video-info">
      <h3>${data.title}</h3>
      <p>Duration: ${formatTime(data.duration)}</p>
    </div>
  </div>
`;
resultContainer.classList.remove('hidden');

// Helper function to format seconds to MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

