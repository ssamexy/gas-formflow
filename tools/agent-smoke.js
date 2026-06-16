const https = require('https');

const baseUrl = process.env.TEST_WEB_APP_URL || process.argv[2];
if (!baseUrl) {
  console.error('Usage: node tools/agent-smoke.js <WEB_APP_URL>');
  console.error('Or set TEST_WEB_APP_URL.');
  process.exit(2);
}

function requestJson(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const location = res.headers.location;
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && location && redirects < 5) {
        const nextUrl = new URL(location, url).toString();
        res.resume();
        requestJson(nextUrl, redirects + 1).then(resolve, reject);
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Response was not JSON: ${body.slice(0, 300)}`));
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  const url = new URL(baseUrl);
  url.searchParams.set('mode', 'agent-test');
  const result = await requestJson(url.toString());
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    app: result.app,
    version: result.version,
    checks: result.checks.map((check) => ({ name: check.name, ok: check.ok }))
  }, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
