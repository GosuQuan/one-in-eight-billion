const http = require('http');
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.json': 'application/json', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  let u = (req.url || '/').split('?')[0];
  if (u === '/') u = '/index.html';
  const fp = path.join(root, decodeURIComponent(u));
  fs.readFile(fp, (err, data) => {
    if (err) { res.statusCode = 404; res.end('not found'); return; }
    res.setHeader('Content-Type', (MIME[path.extname(fp)] || 'application/octet-stream') + '; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  });
}).listen(8811, '127.0.0.1', () => console.log('serving on 8811'));
