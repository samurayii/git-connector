/* eslint-disable @typescript-eslint/no-var-requires */
const http = require("http");

const hostname = "127.0.0.1";
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Hello World");
  console.log("UPDATE APP");
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
  console.log(process.cwd());
});

process.on("SIGTERM", () => {
    console.log("💀 Termination signal received 💀");
    process.exit();
});