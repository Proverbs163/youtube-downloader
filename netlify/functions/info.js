const ytdl = require('ytdl-core');

exports.handler = async (event) => {
  try {
    // Validate URL parameter
    if (!event.queryStringParameters || !event.queryStringParameters.url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'YouTube URL is required' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const url = event.queryStringParameters.url;
    
    // Validate it's a YouTube URL
    if (!ytdl.validateURL(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid YouTube URL' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Get video info with custom headers
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails[3]?.url,
        duration: info.videoDetails.lengthSeconds
      }),
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch video info',
        details: error.message 
      }),
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    };
  }
};
