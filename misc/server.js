const assert = require("node:assert");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const host = "localhost";
const port = 5566;

function assembleFileContents(chunks, type) {
  switch (type) {
    case "octet": return Buffer.concat(chunks);
    case "base64": return Buffer.from(Buffer.concat(chunks).toString(), "base64");
    case "buffer": return Buffer.from(JSON.parse(Buffer.concat(chunks).toString()));
  }
}

function receiveToFile(req, res, type) {
  const contentLength = req.headers["content-length"];
  const chunks = [];
  req
    .on("data", (chunk) => chunks.push(chunk))
    .on("end", () =>
      fs.writeFileSync(
        path.join(os.tmpdir(), `gh-woman-${type}-upload-${contentLength}.jpeg`),
        assembleFileContents(chunks, type)
      )
    );
  return res.end();
}

const server = http.createServer(function (req, res) {
  console.log(`responding to request received at ${req}`)
  switch (req.url) {
    case "/binary": return receiveToFile(req, res, "octet");
    case "/base64": return receiveToFile(req, res, "base64");
    case "/buffer": return receiveToFile(req, res, "buffer");
    default:
      res.writeHead(404);
  }
});

server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});
