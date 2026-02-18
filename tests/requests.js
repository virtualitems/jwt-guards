import { request } from 'node:http';

/**
 * Performs an HTTP request and returns the response.
 *
 * @param {import('node:http').RequestOptions & { body?: unknown } | string | URL} options
 * @returns {Promise<{ statusCode: number, headers: import('node:http').IncomingHttpHeaders, body: Buffer }>}
 */
export function httpRequest(options) {
  return new Promise((resolve, reject) => {
    const req = request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (options.body !== undefined) {
      req.write(options.body);
    }

    req.end();
  });
}
