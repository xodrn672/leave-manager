const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:비밀번호@cluster0.jpigxal.mongodb.net/?appName=Cluster0';
const DB_NAME = 'leaveManager';
const COL_NAME = 'appData';
const HTML_FILE = path.join(__dirname, 'index.html');

const defaultData = {
  _id: 'main',
  accounts: [
    { id: 'acc1', loginId: 'admin', password: 'admin123', employeeId: 'emp1' }
  ],
  employees: [
    { id: 'emp1', name: '관리자', department: '관리부', totalLeave: 15, role: 'admin' }
  ],
  leaveRequests: []
};

let db, col;

async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    col = db.collection(COL_NAME);
    // 초기 데이터 없으면 생성
    const existing = await col.findOne({ _id: 'main' });
    if (!existing) {
      await col.insertOne(JSON.parse(JSON.stringify(defaultData)));
      console.log('✅ 초기 데이터 생성됨');
    }
    console.log('✅ MongoDB 연결 성공!');
  } catch (err) {
    console.error('❌ MongoDB 연결 실패:', err.message);
    process.exit(1);
  }
}

async function readData() {
  try {
    const doc = await col.findOne({ _id: 'main' });
    if (!doc) return JSON.parse(JSON.stringify(defaultData));
    const { _id, ...data } = doc;
    return data;
  } catch {
    return JSON.parse(JSON.stringify(defaultData));
  }
}

async function writeData(data) {
  try {
    data._id = 'main';
    await col.replaceOne({ _id: 'main' }, data, { upsert: true });
  } catch (err) {
    console.error('저장 실패:', err.message);
  }
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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
    const data = await readData();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
    return;
  }

  if (url === '/api/data' && req.method === 'POST') {
    try {
      const data = await parseBody(req);
      await writeData(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch {
      res.writeHead(400); res.end(JSON.stringify({ error: 'bad data' }));
    }
    return;
  }

  if (url === '/api/reset' && req.method === 'POST') {
    await writeData(JSON.parse(JSON.stringify(defaultData)));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (url === '/api/backup' && req.method === 'GET') {
    const data = await readData();
    const ts = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="leave-backup-${ts}.json"`
    });
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  if (url === '/api/restore' && req.method === 'POST') {
    try {
      const data = await parseBody(req);
      if (!data.accounts || !data.employees || !data.leaveRequests) {
        res.writeHead(400); res.end(JSON.stringify({ error: 'invalid' })); return;
      }
      await writeData(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch {
      res.writeHead(400); res.end(JSON.stringify({ error: 'bad data' }));
    }
    return;
  }

  res.writeHead(404); res.end('Not Found');
});

connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  🗓  연차 관리 시스템 서버 시작!');
    console.log(`  ▶ http://localhost:${PORT}`);
    console.log('  💾 MongoDB Atlas 연동 (영구 저장)');
    console.log('═══════════════════════════════════════');
  });
});
