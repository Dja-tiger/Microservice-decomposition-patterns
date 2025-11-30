import express from 'express';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

// request-id
app.use((req,res,next)=>{
  const rid = req.header('x-request-id') || uuidv4();
  req.requestId = rid;
  res.set('x-request-id', rid);
  next();
});
morgan.token('rid',(req)=>req.requestId);
app.use(morgan(':method :url :status - rid=:rid - :response-time ms'));

// In-memory db
const store = {
  messages: [] // {id, from, to, text, reply_to, ts}
};

function nowIso(){ return new Date().toISOString(); }

function authFromMonolith(req, res, next){
  // Доверять монолиту с authenticated user id
  const uid = Number(req.header('x-user-id') || NaN);
  if (!uid) return res.status(401).json({ error: 'missing x-user-id (monolith facade required)' });
  req.userId = uid;
  next();
}

// Send message
app.post('/dialog/:user_id/send', authFromMonolith, (req,res)=>{
  const to = Number(req.params.user_id);
  const { text, reply_to } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }
  const from = req.userId;
  const id = store.messages.length + 1;
  const msg = { id, from, to, text, reply_to: reply_to || null, ts: nowIso() };
  store.messages.push(msg);
  res.status(201).json(msg);
});

// List messages in dialog
app.get('/dialog/:user_id/list', authFromMonolith, (req,res)=>{
  const other = Number(req.params.user_id);
  const me = req.userId;
  const list = store.messages.filter(m => 
    (m.from === me && m.to === other) || (m.from === other && m.to === me)
  );
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);
  res.json({ total: list.length, items: list.slice(offset, offset+limit) });
});

// Health
app.get('/health', (req,res)=> res.json({ status:'OK', time: nowIso() }));

// 404
app.use((req,res)=> res.status(404).json({ error:'not found' }));

const port = process.env.PORT || 8081;
app.listen(port, ()=> console.log(`chat-service listening on ${port}`));


