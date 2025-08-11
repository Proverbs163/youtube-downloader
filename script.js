document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const analyzeBtn = document.getElementById('analyze-btn');
  const downloadBtn = document.getElementById('download-btn');
  const optionsContainer = document.getElementById('options-container');
  const formatBtns = document.querySelectorAll('.format-btn');
  const videoUrlInput = document.getElementById('video-url');
  const resultContainer = document.getElementById('result-container');

  // Disable download button initially
  downloadBtn.disabled = true;

  // Format selection
  formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      formatBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    });
  });

  // Analyze button - now with actual API call
  analyzeBtn.addEventListener('click', async () => {
    const url = videoUrlInput.value.trim();
    
    // Basic URL validation
    if (!url || !(url.includes('youtube.com/watch') || url.includes('youtu.be/'))) {
      alert('Please enter a valid YouTube URL\n\nExample:\nhttps://www.youtube.com/watch?v=...\nor\nhttps://youtu.be/...');
      return;
    }

    try {
      // Show loading state
      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

      // Call Netlify function
      const response = await fetch(`/.netlify/functions/info?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to analyze video');
      
      // Success - show options
      optionsContainer.classList.remove('hidden');
      downloadBtn.disabled = false;
      
      // Debug log
      console.log('Analysis success:', data);
      
    } catch (error) {
      console.error('Analyze error:', error);
      alert(`Analysis failed:\n${error.message}\n\nTry again or check console (F12)`);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze';
    }
  });

  // Download button - enhanced with error handling
  downloadBtn.addEventListener('click', async () => {
    const url = videoUrlInput.value.trim();
    const format = document.querySelector('.format-btn.active').dataset.format;
    
    // Validate
    if (!url || optionsContainer.classList.contains('hidden')) {
      alert('Please click "Analyze" first to validate the video!');
      return;
    }

    try {
      // Show loading state
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';

      // Call download function
      const response = await fetch(
        `/.netlify/functions/download?url=${encodeURIComponent(url)}&format=${format}`
      );
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'No download link received');
      if (!data.url) throw new Error('Download URL missing');

      // Create hidden download link
      const a = document.createElement('a');
      a.href = data.url;
      a.download = `yt-download.${format}`; // Default filename
      if (data.title) {
        a.download = `${data.title.replace(/[^\w\s-]/g, '')}.${format}`; // Sanitized filename
      }
      a.target = '_blank';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Success feedback
      console.log('Download started:', data.url);
      
    } catch (error) {
      console.error('Download error:', error);
      alert(`Download failed:\n${error.message}\n\nPossible solutions:\n1. Try a different video\n2. Wait a few minutes\n3. Check console (F12)`);
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Now';
    }
  });

  // Debug helper - log Netlify function endpoints
  console.debug('API Endpoints:', {
    info: '/.netlify/functions/info',
    download: '/.netlify/functions/download'
  });
});
