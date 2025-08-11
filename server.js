const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Configure Multer for disk storage (server-side uploads)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Enable CORS for all origins (for development purposes)
app.use(cors());

// Handle video upload
app.post('/uploadVideo', upload.single('videoFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No video file uploaded.');
    }
    // Save video metadata (could be to a DB, here just return info)
    const videoUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({
        message: 'Video uploaded successfully!',
        filePath: videoUrl
    });
});

// Serve uploaded videos statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});