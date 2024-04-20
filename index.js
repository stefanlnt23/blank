// Import necessary modules
const express = require('express');
const ytdl = require('ytdl-core');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const sanitize = require('sanitize-filename');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Create Express app
const app = express();

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Track total videos downloaded
let totalVideos = 0;

// Function to sanitize filename by keeping only alphanumeric characters and spaces
function sanitizeFilename(filename) {
    // Remove invalid characters and keep only alphanumeric characters and spaces
    return filename.replace(/[^a-zA-Z0-9\s]/g, '');
}

// Define route for the root URL
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Define route for downloading YouTube video as MP3
app.post('/download', async (req, res) => {
    const videoURL = req.body.url; // Get YouTube video URL from form input

    try {
        // Fetch video info using ytdl-core
        const info = await ytdl.getInfo(videoURL);

        // Get highest quality audio stream
        const audioFormat = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });

        // Extract video title and sanitize it for use as filename
        const title = sanitizeFilename(info.videoDetails.title);

        // Set filename for the downloaded MP3 file
        const filename = `${title}.mp3`;

        // Set response headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'audio/mpeg');

        // Convert video to MP3 using ffmpeg and pipe the output to response
        ffmpeg(ytdl(videoURL))
            .audioCodec('libmp3lame')
            .format('mp3')
            .pipe(res);

        // Increment totalVideos counter
        totalVideos++;
    } catch (error) {
        console.error('Error downloading or converting video:', error);
        res.status(500).send('Error downloading or converting video.');
    }
});

// Define route for getting total videos downloaded
app.get('/stats', (req, res) => {
    res.json({
        totalVideos
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
