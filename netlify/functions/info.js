const ytdl = require('ytdl-core');
const axios = require('axios');

// Enhanced cache with TTL (Time To Live)
const videoInfoCache = new Map();
const CACHE_TTL = 300000; // 5 minutes in milliseconds

exports.handler = async (event) => {
  try {
    let { url } = event.queryStringParameters;
    
    // 1. Validate URL presence
    if (!url) {
      return respond(400, { 
        error: 'URL parameter is required',
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      });
    }

    // 2. Normalize URL format
    url = normalizeYouTubeUrl(url);
    if (!url) {
      return respond(400, { 
        error: 'Invalid YouTube URL format',
        received: event.queryStringParameters.url,
        validExamples: [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtu.be/dQw4w9WgXcQ',
          'https://www.youtube.com/shorts/dQw4w9WgXcQ'
        ]
      });
    }

    // 3. Check cache
    const cachedData = videoInfoCache.get(url);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
      return respond(200, cachedData.data);
    }

    // 4. Prepare request with robust headers
    const options = {
      requestOptions: {
        headers: getRandomHeaders(),
        timeout: 15000
      }
    };

    // 5. Try to fetch info (direct + proxy fallback)
    const info = await fetchVideoInfo(url, options);
    
    // 6. Process response
    const result = {
      title: cleanTitle(info.videoDetails.title),
      thumbnail: getBestThumbnail(info.videoDetails.thumbnails),
      duration: formatDuration(info.videoDetails.lengthSeconds),
      views: formatViews(info.videoDetails.viewCount),
      videoId: info.videoDetails.videoId,
      formats: getAvailableFormats(info.formats),
      isLive: info.videoDetails.isLiveContent,
      uploadDate: info.videoDetails.uploadDate
    };

    // 7. Cache result
    videoInfoCache.set(url, {
      timestamp: Date.now(),
      data: result
    });

    return respond(200, result);

  } catch (error) {
    console.error('Error:', error);
    return respond(500, {
      error: 'Failed to fetch video info',
      details: error.message,
      solutions: [
        'Try again in a few minutes',
        'Try a different video',
        'Check the URL format'
      ]
    });
  }
};

// ===== Helper Functions ===== //

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify(body)
  };
}

function normalizeYouTubeUrl(rawUrl) {
  try {
    let url = rawUrl.trim();
    
    // Handle youtu.be links
    if (url.includes('youtu.be')) {
      const videoId = url.split('/').pop().split('?')[0];
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    // Handle YouTube Shorts
    if (url.includes('youtube.com/shorts')) {
      const videoId = url.split('/shorts/')[1].split('?')[0];
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    // Validate standard URL
    if (!ytdl.validateURL(url)) return null;
    
    // Ensure consistent format
    const videoId = ytdl.getURLVideoID(url);
    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch {
    return null;
  }
}

async function fetchVideoInfo(url, options) {
  try {
    // Try direct fetch first
    return await ytdl.getInfo(url, options);
  } catch (directError) {
    console.log('Direct fetch failed, trying proxy...');
    
    // Proxy fallback
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(proxyUrl, { timeout: 10000 });
    
    if (!data.contents) throw new Error('Proxy returned empty response');
    
    return await ytdl.getInfoFromPage(data.contents, options);
  }
}

function getRandomHeaders() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
  ];
  
  return {
    'User-Agent': agents[Math.floor(Math.random() * agents.length)],
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.youtube.com/',
    'Origin': 'https://www.youtube.com'
  };
}

function getBestThumbnail(thumbnails) {
  return thumbnails.reduce((best, current) => 
    (current.width > best.width) ? current : best
  ).url;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatViews(viewCount) {
  return parseInt(viewCount).toLocaleString() + ' views';
}

function cleanTitle(title) {
  return title.replace(/[^\w\s-]/g, '').slice(0, 100); // Safe for filenames
}

function getAvailableFormats(formats) {
  return {
    audio: ytdl.filterFormats(formats, 'audioonly').length > 0,
    video: ytdl.filterFormats(formats, 'videoonly').length > 0,
    combined: ytdl.filterFormats(formats, 'videoandaudio').length > 0
  };
}