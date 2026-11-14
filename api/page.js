// Serves app.html and adds link-preview (Open Graph) tags so Telegram / WhatsApp /
// Messenger / Facebook show the invitation card with the guest's name.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function getMeta(apiUrl, token) {
  try {
    const r = await fetch(apiUrl + '?meta=1&token=' + encodeURIComponent(token), { redirect: 'follow' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

module.exports = async (req, res) => {
  let html = fs.readFileSync(path.join(process.cwd(), 'app.html'), 'utf8');
  const token = String((req.query && req.query.token) || '').replace(/[^A-Za-z0-9_-]/g, '');
  const m = html.match(/const API_URL = '([^']+)'/);
  const apiUrl = process.env.GAS_API_URL || (m && m[1]);

  if (apiUrl && /^https?:/.test(apiUrl)) {
    const meta = await getMeta(apiUrl, token);
    if (meta) {
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const origin = 'https://' + host;
      const couple = [meta.groomName, meta.brideName].filter(Boolean).join(' & ');
      const title = meta.guestName ? 'សូមគោរពអញ្ជើញ ' + meta.guestName : (couple || 'ធៀបការ');
      const desc = 'សូមគោរពអញ្ជើញចូលរួមពិធីអាពាហ៍ពិពាហ៍ ' + couple;
      // the image address changes whenever the photo, name, date or venue changes -> chat apps refresh the preview
      const v = crypto.createHash('md5').update(JSON.stringify(meta)).digest('hex').slice(0, 8);
      const img = origin + '/api/og?token=' + encodeURIComponent(token) + '&v=' + v;
      const tags = [
        '<meta property="og:type" content="website">',
        '<meta property="og:title" content="' + esc(title) + '">',
        '<meta property="og:description" content="' + esc(desc) + '">',
        '<meta property="og:image" content="' + esc(img) + '">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:url" content="' + esc(origin + (token ? '/?token=' + token : '/')) + '">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="' + esc(title) + '">',
        '<meta name="twitter:image" content="' + esc(img) + '">'
      ].join('\n');
      html = html.replace('</head>', tags + '\n</head>');
    }
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.status(200).send(html);
};
