#!/usr/bin/env node
/* 拍菜谱工作台 — 本地代理服务器
 *
 * 解决浏览器直连 LLM / ima 被跨域拦截的问题：
 *   1. 静态文件服务：浏览器访问 http://127.0.0.1:8787/ 直接打开工作台（同源，零 CORS 问题）
 *   2. 通用转发端点 POST /proxy：把请求转发到任意 http/https 接口（LLM、ima 均适用）
 *
 * 启动：node server.js        （默认端口 8787，可用 PORT 环境变量修改）
 * 停止：Ctrl+C
 *
 * 安全边界（仅在本地使用，不要暴露到公网）：
 *   - 只监听 127.0.0.1，不对外网开放
 *   - 只转发 http/https 协议，拒绝 file: / data: 等
 *   - 请求体上限 20MB（多图 base64 也够用）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8787', 10);
const HOST = '127.0.0.1';
const MAX_BODY = 20 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('请求体超过 20MB 限制')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, 'http://' + (req.headers.host || HOST));

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(html);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('index.html not found: ' + e.message);
    }
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, proxy: true, ts: Date.now() }));
    return;
  }

  if (req.method === 'POST' && (url.pathname === '/proxy' || url.pathname === '/api/proxy')) {
    let target, headers = {}, payload = null, method = 'POST';
    try {
      const raw = JSON.parse((await readBody(req)).toString('utf8'));
      target = raw.url;
      headers = raw.headers || {};
      payload = raw.body || null;
      method = (raw.method || 'POST').toUpperCase();
      if (['GET', 'POST', 'PUT', 'DELETE'].indexOf(method) < 0) method = 'POST';
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'bad_request', message: e.message }));
      return;
    }
    let u;
    try { u = new URL(target); } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'bad_url', message: '目标 URL 不合法' }));
      return;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'bad_scheme', message: '仅支持 http/https 转发' }));
      return;
    }
    try {
      const opts = { method, headers: Object.assign(method === 'GET' ? {} : { 'Content-Type': 'application/json' }, headers) };
      if (method !== 'GET' && payload != null) opts.body = JSON.stringify(payload);
      const upstream = await fetch(u.href, opts);
      const text = await upstream.text();
      res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8' });
      res.end(text);
      console.log('[proxy]', u.host + u.pathname, '->', upstream.status);
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'upstream_failed', message: e.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'not_found', path: url.pathname }));
});

server.listen(PORT, HOST, () => {
  console.log('拍菜谱工作台本地代理已启动：');
  console.log('  工作台地址  http://' + HOST + ':' + PORT + '/');
  console.log('  健康检查    http://' + HOST + ':' + PORT + '/health');
  console.log('  转发端点    POST http://' + HOST + ':' + PORT + '/proxy');
  console.log('  按 Ctrl+C 停止');
});
