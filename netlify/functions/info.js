const ytdl = require('ytdl-core');

exports.handler = async (event) => {
  // 1. Validate input
  if (!event.queryStringParameters?.url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'YouTube URL is required' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  const url = event.queryStringParameters.url;

  // 2. Configure request options
  const options = {
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }
  };

  try {
    // 3. Get video info with error handling
    const info = await ytdl.getInfo(url, options);
    
    // 4. Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        title: info.videoDetails.title,
        thumbnail: getBestThumbnail(info.videoDetails.thumbnails),
        duration: formatDuration(info.videoDetails.lengthSeconds),
        formats: getAvailableFormats(info.formats)
      }),
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    };

  } catch (error) {
    // 5. Handle specific YouTube errors
    let errorMessage = 'Failed to fetch video info';
    if (error.message.includes('private video')) {
      errorMessage = 'This video is private';
    } else if (error.message.includes('not found')) {
      errorMessage = 'Video not found';
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error.message 
      }),
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    };
  }
};

// Helper functions
function getBestThumbnail(thumbnails) {
  const qualities = ['maxres', 'standard', 'high', 'medium'];
  for (const quality of qualities) {
    const thumb = thumbnails.find(t => t.quality === quality);
    if (thumb) return thumb.url;
  }
  return thumbnails[0]?.url || '';
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` 
               : `${m}:${s.toString().padStart(2,'0')}`;
}

function getAvailableFormats(formats) {
  return {
    hasAudio: formats.some(f => f.hasAudio && !f.hasVideo),
    hasVideo: formats.some(f => f.hasVideo && !f.hasAudio),
    hasBoth: formats.some(f => f.hasAudio && f.hasVideo)
  };
}
