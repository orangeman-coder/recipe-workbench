/* 拍菜谱工作台 — Vercel Serverless 代理
 * 部署到 Vercel 后自动生效：前端所有模型 / ima 请求经 /api/proxy 转发，无 CORS 限制。
 * 请求格式（POST /api/proxy）：{url, headers, body, method}
 * 安全：仅转发 http/https；Vercel 请求体上限 4.5MB（3 张 1024px 图的 base64 约 1.2MB，足够）。
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    if (req.url.indexOf('/api/health') >= 0) {
      res.status(200).json({ ok: true, proxy: true, runtime: 'vercel-edge', ts: Date.now() });
      return;
    }
    res.status(404).json({ error: 'not_found' });
    return;
  }

  if (req.method !== 'POST' || req.url.indexOf('/api/proxy') < 0) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const { url, headers = {}, body = null, method = 'POST' } = req.body || {};

  let u;
  try { u = new URL(url); } catch (e) {
    res.status(400).json({ error: 'bad_url', message: '目标 URL 不合法' });
    return;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    res.status(400).json({ error: 'bad_scheme', message: '仅支持 http/https 转发' });
    return;
  }

  let m = (method || 'POST').toUpperCase();
  if (['GET', 'POST', 'PUT', 'DELETE'].indexOf(m) < 0) m = 'POST';

  try {
    const opts = {
      method: m,
      headers: Object.assign(m === 'GET' ? {} : { 'Content-Type': 'application/json' }, headers),
    };
    if (m !== 'GET' && body != null) opts.body = JSON.stringify(body);
    const upstream = await fetch(u.href, opts);
    const text = await upstream.text();
    res.status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8')
      .send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream_failed', message: e.message });
  }
}
