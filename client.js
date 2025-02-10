const express = require('express');
const http=require('http');
const app = express();
const server = http.createServer(app);

app.get('/', (req, res) => {
    res.sendFile(__dirname+'/public/html/index.html');
});

// Define a route for file downloads
app.get('/download/:file', (req, res) => {
    // Assuming files are stored in the &quot;files&quot; folder
    const filePath = __dirname + '/files/' + req.params.file;

    // Use res.download() to initiate the file download
    res.download(filePath, (err) => {
        if (err) {
            // Handle errors, such as file not found
            res.status(404).send('File not found');
        }
    });
});

const PORT=443||process.env.PORT_CLIENT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
