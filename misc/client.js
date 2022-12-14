const http = require("http");
const fs = require("fs");

const imagePath = "./gh-woman_200x250.jpeg";

function bytesPayload() {
  const image = fs.readFileSync(imagePath);
  const options = {
    host: "localhost",
    port: "5566",
    path: "/binary",
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
      "content-length": Buffer.byteLength(image),
    },
  };

  return [image, options];
}

function base64Payload() {
  const base64 = fs.readFileSync(imagePath).toString("base64");
  const options = {
    host: "localhost",
    port: "5566",
    path: "/base64",
    method: "POST",
    headers: {
      "content-type": "text/plain",
      "content-length": Buffer.byteLength(base64),
    },
  };

  return [base64, options];
}

function bufferJsonPayload() {
  const bufferJSON = fs.readFileSync(imagePath).toJSON();
  const asBody = JSON.stringify(bufferJSON);
  const options = {
    host: "localhost",
    port: "5566",
    path: "/buffer",
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(asBody),
    },
  };

  return [asBody, options];
}

function prepareRequest(payloadFormat) {
  switch (payloadFormat) {
    case "binary": return bytesPayload();
    case "base64": return base64Payload();
    case "buffer": return bufferJsonPayload();
  }
}

function makeRequest(payloadFormat) {
  const [body, options] = prepareRequest(payloadFormat);
  const req = http.request(options, (resp) => {
    resp.on("data", console.log);
    resp.on("end", () => console.log("entire response received"));
  });

  req.on("error", console.error);
  req.write(body);
  req.end();
}

makeRequest("binary");
makeRequest("base64");
makeRequest("buffer");
