const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:비밀번호@cluster0.jpigxal.mongodb.net/?appName=Cluster0';
const DB_NAME = 'leaveManager';
const COL_NAME = 'appData';
const HTML_FILE = path.join(__dirname, 'index.html');

let mailer = null;
if (process.env.EMAIL_ADDRESS && process.env.EMAIL_PASSWORD) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_SERVER || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: { user: process.env.EMAIL_ADDRESS, pass: process.env.EMAIL_PASSWORD }
  });
}

async function sendNotifyMail(subject, text) {
  if (!mailer || !process.env.EMAIL_TO) {
    console.log('[알림] 이메일 미설정, 알림 발송 생략');
    return;
  }
  try {
    await mailer.sendMail({
      from: process.env.EMAIL_ADDRESS,
      to: process.env.EMAIL_TO,
      subject,
      text
    });
    console.log(`✅ 알림 메일 발송: ${subject}`);
  } catch (err) {
    console.error('❌ 알림 메일 발송 실패:', err.message);
  }
}

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
      console.log('⚠️  기존 데이터를 찾지 못해 새로 생성했습니다 (직원/연차 데이터가 초기화됨)');
    } else {
      console.log(`✅ 기존 데이터 로드됨 (직원 ${existing.employees?.length || 0}명, 연차신청 ${existing.leaveRequests?.length || 0}건)`);
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
  } catch (err) {
    console.error('❌ 읽기 실패:', err.message);
    return JSON.parse(JSON.stringify(defaultData));
  }
}

// 실패 시 더 이상 조용히 넘어가지 않고, 성공 여부를 그대로 반환합니다.
async function writeData(data) {
  try {
    data._id = 'main';
    const result = await col.replaceOne({ _id: 'main' }, data, { upsert: true });
    console.log(`💾 저장 완료 (matched: ${result.matchedCount}, modified: ${result.modifiedCount}, upserted: ${result.upsertedCount})`);
    return { ok: true };
  } catch (err) {
    console.error('❌ 저장 실패:', err.message);
    return { ok: false, error: err.message };
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
      const result = await writeData(data);
      if (!result.ok) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: result.error }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch {
      res.writeHead(400); res.end(JSON.stringify({ error: 'bad data' }));
    }
    return;
  }

  if (url === '/api/notify' && req.method === 'POST') {
    try {
      const { subject, text } = await parseBody(req);
      sendNotifyMail(subject || '연차관리 알림', text || '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch {
      res.writeHead(400); res.end(JSON.stringify({ error: 'bad data' }));
    }
    return;
  }

  if (url === '/api/reset' && req.method === 'POST') {
    const result = await writeData(JSON.parse(JSON.stringify(defaultData)));
    res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: result.ok, error: result.error }));
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
      const result = await writeData(data);
      res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: result.ok, error: result.error }));
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
