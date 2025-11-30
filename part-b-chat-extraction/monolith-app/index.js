import express from 'express';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

// request-id
app.use((req, res, next) => {
  const rid = req.header('x-request-id') || uuidv4();
  req.requestId = rid;
  res.set('x-request-id', rid);
  next();
});

morgan.token('rid', (req) => req.requestId);
app.use(morgan(':method :url :status - rid=:rid - :response-time ms'));

// db
const db = {
  users: [], // {id,name}
  tokens: new Map() // token -> userId
};

function nowIso(){ return new Date().toISOString(); }

function authOptional(req, res, next) {
  const header = req.header('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (m) {
    const token = m[1];
    const uid = db.tokens.get(token);
    if (uid) req.userId = uid;
  }
  next();
}
function authRequired(req, res, next) {
  const header = req.header('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'missing bearer token' });
  const token = m[1];
  const uid = db.tokens.get(token);
  if (!uid) return res.status(401).json({ error: 'invalid token' });
  req.userId = uid;
  next();
}

// Health
app.get('/health', (req, res)=> res.json({status:'OK', time: nowIso()}));

// Users
app.post('/user/register', (req,res)=>{
  const {name} = req.body||{};
  if(!name) return res.status(400).json({error:'name is required'});
  const id = db.users.length + 1;
  const user = {id, name};
  db.users.push(user);
  const token = `demo-${uuidv4()}`;
  db.tokens.set(token, id);
  res.json({ user, token });
});
app.get('/user/get/:id', authOptional, (req,res)=>{
  const id = Number(req.params.id);
  const user = db.users.find(u=>u.id===id);
  if(!user) return res.status(404).json({error:'user not found'});
  res.json(user);
});

// Dialogs -> proxy to chat-service (обрати внимание! здесь выносим сервис диалогов из монолита)
const CHAT_BASE = process.env.CHAT_BASE || 'http://chat-service:8081';

async function proxy(req, res, path){
  // forward method, path, body, and headers
  const url = `${CHAT_BASE}${path}`;
  const headers = {
    'content-type': req.headers['content-type'] || 'application/json',
    'x-request-id': req.requestId,
    // propagate auth-related info as internal user id
    'x-user-id': String(req.userId || ''),
  };
  // keep Authorization too (not required by chat, but harmless)
  if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'];
  const init = {
    method: req.method,
    headers,
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = JSON.stringify(req.body || {});
  }
  const r = await fetch(url, init);
  const bodyText = await r.text();
  // pass-through status and body
  res.status(r.status);
  // copy content-type if present
  const ct = r.headers.get('content-type');
  if (ct) res.set('content-type', ct);
  // echo x-request-id from chat-service if set (otherwise keep ours)
  const chatRid = r.headers.get('x-request-id');
  if (chatRid) res.set('x-request-id', chatRid);
  res.send(bodyText);
}

app.post('/dialog/:user_id/send', authRequired, (req,res)=>{
  proxy(req,res, `/dialog/${encodeURIComponent(req.params.user_id)}/send`)
    .catch(err=>{
      console.error('proxy error', err);
      res.status(502).json({error:'chat-service unavailable'});
    });
});
app.get('/dialog/:user_id/list', authRequired, (req,res)=>{
  const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  proxy(req,res, `/dialog/${encodeURIComponent(req.params.user_id)}/list${qs}`)
    .catch(err=>{
      console.error('proxy error', err);
      res.status(502).json({error:'chat-service unavailable'});
    });
});

// 404
app.use((req,res)=> res.status(404).json({error:'not found'}));

const port = process.env.PORT || 8080;
app.listen(port, ()=> console.log(`Monolith facade on ${port}, proxy to ${CHAT_BASE}`));

