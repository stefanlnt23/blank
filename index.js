// Import necessary modules
const express = require('express');
const ytdl = require('ytdl-core');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Create Express app
const app = express();

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Track unique countries and total videos downloaded
const countries = new Set();
let totalVideos = 0;

// Define route for the root URL
app.get('/', (req, res) => {
    // Get IP address of the user
    const ipAddress = req.ip;
    console.log(`User with IP address ${ipAddress} accessed the site.`);

    // Increment totalVideos counter
    totalVideos++;

    // Add country to set
    const countryCode = req.headers['cf-ipcountry']; // Assuming Cloudflare header is used for country code
    if (countryCode) {
        countries.add(countryCode);
    }

    res.sendFile(__dirname + '/index.html');
});

// Define route for downloading YouTube video as MP3
app.post('/download', async (req, res) => {
    const videoURL = req.body.url; // Get YouTube video URL from form input
    console.log('Received request to convert video:', videoURL); // Log the received URL

    try {
        // Fetch video info using ytdl-core
        const info = await ytdl.getInfo(videoURL);
        console.log('Video info:', info); // Log the fetched video info

        // Get highest quality audio stream
        const audioFormat = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });

        // Set response headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${info.title}.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');

        // Convert video to MP3 using ffmpeg and pipe the output to response
        ffmpeg(ytdl(videoURL))
            .audioCodec('libmp3lame')
            .format('mp3')
            .pipe(res);
    } catch (error) {
        console.error('Error downloading or converting video:', error);
        res.status(500).send('Error downloading or converting video.');
    }
});

// Define route for getting statistics
app.get('/stats', (req, res) => {
    res.json({
        ipAddresses: Array.from(countries),
        totalCountries: countries.size,
        totalVideos
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
