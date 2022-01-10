const express = require('express')
var multer = require('multer')
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs')
app.use(bodyParser.urlencoded({ extended: true }));

// AWS
const AWS = require('aws-sdk');
const BUCKET_NAME = 'shake-media-bucket';
// Initialize the Amazon Cognito credentials provider
// AWS.config.region = 'us-west-2'; // Region
// AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//     IdentityPoolId: 'us-west-2:2c4fa3e3-c68e-419d-ab8c-3c9a4f34894e',
// });
const s3 = new AWS.S3()
var multer = require( 'multer');
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'media/');
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

var upload = multer({ storage: storage })
// const upload = multer({ dest: './media/' })
var multerS3 = require('multer-s3');
// var upload = multer({storage: multerS3({
//         s3: s3,
//         bucket: BUCKET_NAME,
//         key: function (req, file, cb) {
//             console.log(file);
//             cb(null, file.originalname); //use Date.now() for unique file keys
//         }
// })});

async function download (filename) {
    console.log("filename param: ", filename);
    const { Body } = await s3.getObject({
        Key: filename,
        Bucket: 'mybucketname'
    }).promise()
    return Body
}

async function pipeVideo(fileName, range, res) {
    if (!range) {
        res.status(400).send("Requires Range header");
    }

    // get video stats (about 61MB)
    const videoPath = `media/${fileName}`;
    const videoSize = fs.statSync(videoPath).size;

    // Parse Range
    // Example: "bytes=32324-"
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    // Create headers
    const contentLength = end - start + 1;
    const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
    };

    // HTTP Status 206 for Partial Content
    res.writeHead(206, headers);

    // create video read stream for this particular chunk
    const videoStream = fs.createReadStream(videoPath, { start, end });

    // Stream the video chunk to the client
    videoStream.pipe(res);
}


const cors = require('cors');
const {response} = require("express");
const port = 8081;

var corsOptions = {
    origin: 'http://localhost:3000'
}

app.use(cors(corsOptions));

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded());

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// Access the parse results as request.body
app.post('/video/upload', upload.array('file', 1), function(req, res){
    res.sendStatus(200);
});

app.get('/video/view-by-name', function(req, res){
    // Ensure there is a range given for the video
    var filename = req.query.filename;
    if (req.query.filename === "birds") {
        filename = "bigbuck.mp4"
    }
    pipeVideo(filename, req.headers.range, res);
});

app.get('/image/birds', function(req, res){
    // Ensure there is a range given for the video
    const files = []
    if (fs.existsSync("./media/bigbuck.mp4")) {
        res.sendFile("/Users/aaronjimenez/Projects/eth/shake-server/images/birds.png")
    }
});

app.get('/image/lions', function(req, res){
    // Ensure there is a range given for the video
    const files = []
    if (fs.existsSync("./media/lionvideo.mp4")) {
        res.sendFile("/Users/aaronjimenez/Projects/eth/shake-server/images/lions.png")
    }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
});
