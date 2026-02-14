const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const HTML_FILE = path.join(__dirname, 'index.html');

const defaultData = {
  accounts: [
    { id: 'acc1', loginId: 'admin', password: 'admin123', employeeId: 'emp1' }
  ],
  employees: [
    { id: 'emp1', name: '관리자', department: '관리부', totalLeave: 15, role: 'admin' }
  ],
  leaveRequests: []
};

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
  console.log('✅ data.json 생성됨');
}

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return JSON.parse(JSON.stringify(defaultData)); }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 5e6) reject(); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(); } });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = req.url;

  if ((url === '/' || url === '/index.html') && req.method === 'GET') {
    try {
      const html = fs.readFileSync(HTML_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      res.writeHead(500); res.end('index.html not found');
    }
    return;
  }

  if (url === '/api/data' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(readData()));
    return;
  }

  if (url === '/api/data' && req.method === 'POST') {
    try {
      const data = await parseBody(req);
      writeData(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch {
      res.writeHead(400); res.end(JSON.stringify({ error: 'bad data' }));
    }
    return;
  }

  if (url === '/api/reset' && req.method === 'POST') {
    writeData(JSON.parse(JSON.stringify(defaultData)));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 백업 다운로드
  if (url === '/api/backup' && req.method === 'GET') {
    const data = readData();
    const ts = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="leave-backup-${ts}.json"`
    });
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  // 백업 복원
  if (url === '/api/restore' && req.method === 'POST') {
    try {
      const data = await parseBody(req);
      if (!data.accounts || !data.employees || !data.leaveRequests) {
        res.writeHead(400); res.end(JSON.stringify({ error: 'invalid backup' })); return;
      }
      writeData(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch {
      res.writeHead(400); res.end(JSON.stringify({ error: 'bad data' }));
    }
    return;
  }

  res.writeHead(404); res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  🗓  연차 관리 시스템 서버 시작!');
  console.log(`  ▶ http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════');
});
