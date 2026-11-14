// Generates the link-preview card for a guest: couple photo (left) + invitation text with the
// guest's name, date and venue (right). Telegram / WhatsApp / Messenger fetch this image.
const fs = require('fs');
const path = require('path');
const { compose } = require('../lib/compose');

function candidates(meta) {
  const out = [meta.previewPhoto, meta.cardPhoto];
  try {
    const arr = JSON.parse(meta.cardPhotos);
    if (Array.isArray(arr)) arr.forEach(x => out.push(typeof x === 'string' ? x : (x && x.url)));
  } catch (e) { if (meta.cardPhotos) String(meta.cardPhotos).split(/[\s,]+/).forEach(x => out.push(x)); }
  out.push(meta.photoCover);
  return out.filter(u => typeof u === 'string' && /^(https?:|data:image\/)/i.test(u.trim())).map(u => u.trim());
}

async function loadPhoto(meta) {
  for (const u of candidates(meta)) {
    try {
      if (u.startsWith('data:')) {
        const mm = u.match(/^data:image\/[\w.+-]+;base64,(.+)$/);
        if (mm) return Buffer.from(mm[1], 'base64');
        continue;
      }
      const r = await fetch(u, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !/^image\//i.test(type)) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length && buf.length < 15000000) return buf;
    } catch (e) { /* try the next photo */ }
  }
  return null;
}

module.exports = async (req, res) => {
  try {
    const html = fs.readFileSync(path.join(process.cwd(), 'app.html'), 'utf8');
    const m = html.match(/const API_URL = '([^']+)'/);
    const apiUrl = process.env.GAS_API_URL || (m && m[1]);
    const token = String((req.query && req.query.token) || '').replace(/[^A-Za-z0-9_-]/g, '');
    const mr = await fetch(apiUrl + '?meta=1&token=' + encodeURIComponent(token), { redirect: 'follow' });
    const meta = await mr.json();
    const photo = await loadPhoto(meta);
    const jpg = await compose(photo, meta);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).send(jpg);
  } catch (e) {
    res.status(500).send('Preview error: ' + (e && e.message));
  }
};
