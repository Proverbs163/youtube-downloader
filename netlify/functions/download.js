const ytdl = require('ytdl-core');
const axios = require('axios');
const stream = require('stream');
const { promisify } = require('util');

// Enhanced cache with TTL and size limits
const downloadCache = new Map();
const CACHE_TTL = 300000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Prevent memory overload

exports.handler = async (event) => {
  try {
    let { url, format = 'mp4', quality } = event.queryStringParameters;
    
    // Validate URL presence
    if (!url) {
      return respond(400, { 
        error: 'URL parameter is required',
        example: '?url=https://youtu.be/dQw4w9WgXcQ&format=mp4'
      });
    }

    // Normalize URL format
    url = normalizeYouTubeUrl(url);
    if (!url) {
      return respond(400, { 
        error: 'Invalid YouTube URL',
        received: event.queryStringParameters.url,
        validExamples: [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtu.be/dQw4w9WgXcQ'
        ]
      });
    }

    // Check cache
    const cacheKey = `${url}-${format}-${quality || 'default'}`;
    const cached = downloadCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return respond(200, cached.data);
    }

    // Prepare download options
    const options = {
      requestOptions: {
        headers: getRandomHeaders(),
        timeout: 15000
      },
      quality: quality || (format === 'mp3' ? 'highestaudio' : 'highestvideo'),
      filter: format === 'mp3' ? 'audioonly' : 'videoandaudio'
    };

    // Fetch video info with retry logic
    const info = await fetchWithRetry(url, options);
    
    // Process download based on format
    const result = await (format === 'mp3' 
      ? processAudioDownload(info, options)
      : processVideoDownload(info, options));

    // Update cache (with size management)
    if (downloadCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = [...downloadCache.keys()][0];
      downloadCache.delete(oldestKey);
    }
    downloadCache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return respond(200, result);

  } catch (error) {
    console.error('Download Error:', error);
    return respond(error.statusCode || 500, {
      error: 'Download failed',
      details: error.message,
      solutions: [
        'Try a lower quality setting',
        'Try again in 5 minutes',
        'Check if video is age-restricted'
      ]
    });
  }
};

// ===== Enhanced Helper Functions ===== //

async function fetchWithRetry(url, options, retries = 2) {
  try {
    return await ytdl.getInfo(url, options);
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... (${retries} attempts left)`);
      return fetchWithRetry(url, options, retries - 1);
    }
    
    // Fallback to proxy if all retries fail
    console.log('Direct fetch failed, trying proxy...');
    return fetchViaProxy(url, options);
  }
}

async function fetchViaProxy(url, options) {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(proxyUrl, { timeout: 10000 });
    
    if (!data.contents) throw new Error('Proxy returned empty response');
    return await ytdl.getInfoFromPage(data.contents, options);
  } catch (proxyError) {
    throw new Error(`All download methods failed: ${proxyError.message}`);
  }
}

async function processAudioDownload(info, options) {
  const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
  if (audioFormats.length === 0) {
    throw { 
      message: 'No audio formats available', 
      statusCode: 404 
    };
  }

  // Get best audio format
  const format = ytdl.chooseFormat(audioFormats, {
    quality: options.quality,
    filter: 'audioonly'
  });

  return {
    url: format.url,
    title: sanitizeFilename(info.videoDetails.title),
    thumbnail: getBestThumbnail(info.videoDetails.thumbnails),
    duration: formatDuration(info.videoDetails.lengthSeconds),
    bitrate: format.audioBitrate || 128,
    type: 'audio/mp3'
  };
}

async function processVideoDownload(info, options) {
  const format = ytdl.chooseFormat(info.formats, {
    quality: options.quality,
    filter: options.filter
  });

  if (!format) {
    throw { 
      message: 'No matching video format found', 
      statusCode: 404 
    };
  }

  // For very large files, return the URL directly
  if (format.contentLength > 100000000) { // >100MB
    return {
      url: format.url,
      title: sanitizeFilename(info.videoDetails.title),
      thumbnail: getBestThumbnail(info.videoDetails.thumbnails),
      duration: formatDuration(info.videoDetails.lengthSeconds),
      quality: format.qualityLabel,
      type: format.mimeType.split(';')[0]
    };
  }

  // For smaller files, consider streaming
  return await streamToBuffer(format.url);
}

async function streamToBuffer(url) {
  const pipeline = promisify(stream.pipeline);
  const chunks = [];
  const bufferStream = new stream.PassThrough();
  
  bufferStream.on('data', chunk => chunks.push(chunk));
  
  await pipeline(
    axios({ url, responseType: 'stream' }).then(res => res.data),
    bufferStream
  );

  return Buffer.concat(chunks);
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

function normalizeYouTubeUrl(url) {
  try {
    // Handle various URL formats
    const patterns = [
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/shorts\/([^?]+)/,
      /youtube\.com\/watch\?v=([^&]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
    }
    
    return ytdl.validateURL(url) ? url : null;
  } catch {
    return null;
  }
}

function getRandomHeaders() {
  const mobile = Math.random() > 0.5;
  return {
    'User-Agent': mobile ?
      'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' :
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.youtube.com/',
    'Origin': 'https://www.youtube.com',
    'X-Forwarded-For': generateRandomIP()
  };
}

function generateRandomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function sanitizeFilename(title) {
  return title
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function getBestThumbnail(thumbnails) {
  const preferredOrder = ['maxres', 'standard', 'high', 'medium', 'default'];
  for (const quality of preferredOrder) {
    const thumb = thumbnails.find(t => t.quality === quality);
    if (thumb) return thumb.url;
  }
  return thumbnails[0]?.url || '';
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? 
    `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` :
    `${m}:${s.toString().padStart(2, '0')}`;
}