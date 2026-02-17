import fs from 'fs';
import path from 'path';

const indexHtmlPath = path.resolve('dist/index.html');
const headersPath = path.resolve('dist/_headers');

if (fs.existsSync(indexHtmlPath)) {
  const content = fs.readFileSync(indexHtmlPath, 'utf8');
  const match = content.match(/<meta http-equiv="Content-Security-Policy" content="(.*?)">/);

  if (match && match[1]) {
    const csp = match[1];
    console.log('Found CSP in index.html, syncing to _headers...');

    if (fs.existsSync(headersPath)) {
      let headers = fs.readFileSync(headersPath, 'utf8');
      // Replace existing CSP or add it
      if (headers.includes('Content-Security-Policy:')) {
        headers = headers.replace(/Content-Security-Policy: .*/, `Content-Security-Policy: ${csp}`);
      } else {
        headers = headers.replace('/*', `/*\n  Content-Security-Policy: ${csp}`);
      }
      fs.writeFileSync(headersPath, headers);
      console.log('Successfully updated _headers with CSP.');
    } else {
      // Create it if it doesn't exist
      fs.writeFileSync(headersPath, `/*\n  Content-Security-Policy: ${csp}\n  X-Frame-Options: DENY\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
      console.log('Created _headers with CSP.');
    }
  } else {
    console.warn('CSP meta tag not found in index.html.');
  }
} else {
  console.error('dist/index.html not found.');
}
