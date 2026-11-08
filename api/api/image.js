module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '').replace(/[^\w-]/g, '');
  if (!id) { res.status(400).end('missing id'); return; }
  try {
    const r = await fetch('https://drive.google.com/thumbnail?id=' + id + '&sz=w1200', { redirect: 'follow' });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !/^image\//.test(type)) throw new Error('not an image');
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).send(buf);
  } catch (e) { res.status(502).end('image unavailable'); }
};
