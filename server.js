const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
    '.onnx': 'application/octet-stream',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Parse URL
    const parsedUrl = url.parse(req.url);
    
    // Prevent directory traversal
    let pathname = path.join(__dirname, parsedUrl.pathname);
    
    // If no file is specified, serve index.html
    if (parsedUrl.pathname === '/') {
        pathname = path.join(__dirname, 'index.html');
    }
    
    // Check if file exists
    fs.exists(pathname, (exist) => {
        if (!exist) {
            // If the file is not found, return 404
            res.statusCode = 404;
            res.end(`File ${pathname} not found!`);
            return;
        }

        // If is a directory, then look for index.html
        if (fs.statSync(pathname).isDirectory()) {
            pathname += '/index.html';
        }

        // Read file from file system
        fs.readFile(pathname, (err, data) => {
            if (err) {
                res.statusCode = 500;
                res.end(`Error getting the file: ${err}.`);
            } else {
                // Based on the URL path, extract the file extension
                const ext = path.parse(pathname).ext;
                // If the file is found, set Content-type and send data
                res.setHeader('Content-type', MIME_TYPES[ext] || 'application/octet-stream');
                res.end(data);
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
