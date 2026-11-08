const APP_URL = process.env.APP_URL || 'https://script.google.com/macros/s/AKfycbydNNWqCVqVnPY34v2XXPizXRGakqm6GWEX8eHB32_TXQonCu2pQZlflppMA5UUKaEK/exec';
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const firstOf = v => { try { const a = JSON.parse(v); return Array.isArray(a) ? a[0] : ''; } catch (e) { return ''; } };

module.exports = async (req, res) => {
  const token = String((req.query && req.query.token) || '').replace(/[^A-Za-z0-9_-]/g, '');
  let m = {};
  try {
    const r = await fetch(APP_URL + '?meta=1&token=' + encodeURIComponent(token), { redirect: 'follow' });
    m = await r.json();
  } catch (e) { m = {}; }
  const names = [m.groomName, m.brideName].filter(Boolean).join(' & ');
  const title = 'សិរីមង្គលអាពាហ៍ពិពាហ៍';
  const desc = m.guestName ? 'សូមគោរពអញ្ជើញ ' + m.guestName : 'សូមចុចដើម្បីមើលធៀបការ';
  const site = names || 'Wedding Invitation';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const pick = [m.previewPhoto, firstOf(m.cardPhotos) || m.cardPhoto, m.photoCover].find(u => /^https?:/i.test(u || '')) || '';
  const dm = pick.match(/[?&]id=([\w-]+)/) || pick.match(/\/d\/([\w-]+)/);
  const img = pick && /drive\.(usercontent\.)?google\.com|lh3\.googleusercontent\.com/.test(pick) && dm ? 'https://' + host + '/api/image?id=' + dm[1] : pick;
  const dest = APP_URL + (token ? '?token=' + encodeURIComponent(token) : '');
  const html = '<!DOCTYPE html><html lang="km"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>' + esc(title) + '</title>'
    + '<meta name="description" content="' + esc(desc) + '">'
    + '<meta property="og:type" content="website">'
    + '<meta property="og:site_name" content="' + esc(site) + '">'
    + '<meta property="og:title" content="' + esc(title) + '">'
    + '<meta property="og:description" content="' + esc(desc) + '">'
    + (img ? '<meta property="og:image" content="' + esc(img) + '">' : '')
    + '<meta property="og:image:alt" content="' + esc(site) + '">'
    + '<meta name="twitter:card" content="summary_large_image">'
    + '<meta name="twitter:title" content="' + esc(title) + '">'
    + '<meta name="twitter:description" content="' + esc(desc) + '">'
    + '<style>html,body{height:100%;margin:0;background:#0b0905;color:#f3e7c4;font-family:sans-serif}body{display:flex;align-items:center;justify-content:center;text-align:center}a{color:#d9b15a}</style>'
    + '</head><body><p>កំពុងបើកធៀបការ...<br><a href="' + esc(dest) + '">ចុចទីនេះបើមិនបើកដោយស្វ័យប្រវត្តិ</a></p>'
    + '<script>location.replace(' + JSON.stringify(dest) + ');</script></body></html>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
};
