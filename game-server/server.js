const https = require('https');
const fs = require('fs');
const app = require('./src/app');
const port = process.env.PORT || 3000;

const options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert'),
};

https.createServer(options, app).listen(port, () => {
  console.log(`Game server listening at http://localhost:${port}`);
});