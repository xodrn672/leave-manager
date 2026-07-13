const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:비밀번호@cluster0.jpigxal.mongodb.net/?appName=Cluster0';
const DB_NAME = 'leaveManager';
const COL_NAME = 'appData';
const HIST_COL = 'appDataHistory';
const MAX_HISTORY = 30;
const HTML_FILE = path.join(__dirname, 'index.html');

let mailer = null;
if (process.env.EMAIL_ADDRESS && process.env.EMAIL_PASSWORD) {
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_SERVER || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpPort === 465,   // 465=SSL(secure:true), 587=STARTTLS(secure:false)
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

let db, col, hist;

async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    col = db.collection(COL_NAME);
    hist = db.collection(HIST_COL);
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
    // 덮어쓰기 전에 현재 상태를 자동 백업으로 남겨둠 (실수로 초기화/삭제해도 복구 가능하도록)
    try {
      const before = await col.findOne({ _id: 'main' });
      if (before) {
        const { _id, ...snapshot } = before;
        await hist.insertOne({ savedAt: new Date(), data: snapshot });
        const old = await hist.find().sort({ savedAt: -1 }).skip(MAX_HISTORY).toArray();
        if (old.length) await hist.deleteMany({ _id: { $in: old.map(o => o._id) } });
      }
    } catch (histErr) {
      console.error('⚠️ 자동 백업 스냅샷 실패(저장은 계속 진행):', histErr.message);
    }

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
    console.log('📨 /api/notify 요청 수신됨');
    try {
      const { subject, text } = await parseBody(req);
      sendNotifyMail(subject || '연차관리 알림', text || '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.error('❌ /api/notify 요청 파싱 실패:', err.message);
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

  if (url === '/api/history' && req.method === 'GET') {
    try {
      const items = await hist.find().sort({ savedAt: -1 }).limit(MAX_HISTORY).toArray();
      const list = items.map(it => ({
        id: it._id.toString(),
        savedAt: it.savedAt,
        employees: it.data.employees?.length || 0,
        leaveRequests: it.data.leaveRequests?.length || 0
      }));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(list));
    } catch (err) {
      res.writeHead(500); res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url === '/api/history/restore' && req.method === 'POST') {
    try {
      const { id } = await parseBody(req);
      const snap = await hist.findOne({ _id: new ObjectId(id) });
      if (!snap) { res.writeHead(404); res.end(JSON.stringify({ error: 'not found' })); return; }
      const result = await writeData(snap.data);
      res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: result.ok, error: result.error }));
    } catch (err) {
      res.writeHead(400); res.end(JSON.stringify({ error: err.message }));
    }
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
