const https = require('https');
const fs = require('fs');
const app = require('./src/app');
const { initializeSocket } = require('./src/services/socketService');
const port = process.env.PORT || 3000;

const options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert'),
};

const server = https.createServer(options, app);
initializeSocket(server);

server.listen(port, () => {
  console.log(`Game server listening at https://localhost:${port}`);
});

/*app.listen(port, () => {
  console.log(`Game server listening at http://localhost:${port}`);
});*/
