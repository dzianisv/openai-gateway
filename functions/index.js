const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');


exports.openaiGateway = onRequest(async (req, res) => {
  const openaiPath = req.path.replace(/^\/openai/, '');
  const url = new URL(`https://api.openai.com${openaiPath}`);

  // 5. Copy query parameters
  if (Object.keys(req.query).length > 0) {
    url.search = new URLSearchParams(req.query).toString();
  }

  // 6. Construct headers
  //    - Use most incoming headers but override Authorization with the OpenAI key.
  const headers = req.headers;

  // 7. Prepare fetch options
  const method = req.method;

  // If the request is GET or HEAD, typically no body is sent
  let body = null;
  if (!['GET', 'HEAD'].includes(method)) {
    // If it's JSON, you might want:
    // body = JSON.stringify(req.body);
    //
    // If your function is set up for raw or text data, you may do:
    // body = req.rawBody;
    //
    // Adjust as needed depending on your Cloud Function config for request parsing
    body = JSON.stringify(req.body);
  }

  const fetchOptions = {
    method,
    headers,
    body,
    redirect: 'manual',
  };

  // 8. Forward the request to OpenAI and stream back the response
  try {
    logger.info(`[${req.ip}:${req.socket.remotePort} ${req.path}] forwarding request to OpenAI`);
    const responseFromOpenAI = await fetch(url, fetchOptions);

    // Copy status code and headers
    res.status(responseFromOpenAI.status);
    responseFromOpenAI.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Read the response as a buffer and forward it
    // (Alternatively, you could pipe the stream directly)
    const responseBuffer = await responseFromOpenAI.buffer();
    res.send(responseBuffer);
  } catch (error) {
    logger.error('Error proxying request to OpenAI:', error);
    res.status(500).json({ error: 'Internal Server Error while contacting OpenAI.' });
  }
});
