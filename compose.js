// Builds the 1200x630 link-preview card: couple photo on the left, invitation text on the right.
const path = require('path');
const fs = require('fs');
const os = require('os');

// Make fonts discoverable even on a server with no system fonts (e.g. Vercel).
const FONT_DIR = path.join(__dirname, '..', 'fonts');
(function setupFontconfig() {
  try {
    const dir = path.join(os.tmpdir(), 'fc');
    fs.mkdirSync(dir, { recursive: true });
    const conf = path.join(dir, 'fonts.conf');
    fs.writeFileSync(conf, '<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>' + FONT_DIR +
      '</dir><cachedir>' + path.join(dir, 'cache') + '</cachedir></fontconfig>');
    process.env.FONTCONFIG_FILE = conf;
    process.env.FONTCONFIG_PATH = dir;
  } catch (e) { /* ignore */ }
})();
const sharp = require('sharp');

const W = 1200, H = 630;
const GOLD = '#e9cd88', GOLD_SOFT = '#cdb98a', BG = '#15110b';
const F = {
  moul: { family: 'Moul', file: path.join(FONT_DIR, 'Moul.ttf') },
  bat: { family: 'Battambang', file: path.join(FONT_DIR, 'Battambang-Regular.ttf') },
  batB: { family: 'Battambang Bold', file: path.join(FONT_DIR, 'Battambang-Bold.ttf') },
  script: { family: 'Great Vibes', file: path.join(FONT_DIR, 'GreatVibes.ttf') }
};
const KH_DAY = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
const KH_MON = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
const toKh = n => String(n).replace(/\d/g, d => '០១២៣៤៥៦៧៨៩'[d]);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const shortName = n => String(n || '').trim().split(/\s+/).pop();
const titleCase = s => String(s || '').toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());

async function textImg(str, o) {
  const f = F[o.font];
  const r = await sharp({ text: {
    text: '<span foreground="' + (o.color || GOLD) + '">' + esc(str) + '</span>',
    font: f.family + ' ' + o.size, fontfile: f.file, width: o.width, align: o.align || 'center',
    rgba: true, dpi: 72, wrap: 'word-char', spacing: o.spacing || 0
  } }).png().toBuffer({ resolveWithObject: true });
  return { input: r.data, w: r.info.width, h: r.info.height };
}
// shrink until it fits inside maxW x maxH (wraps to extra lines first)
async function fitText(str, o, maxH, minSize) {
  let size = o.size, t;
  for (;;) {
    t = await textImg(str, Object.assign({}, o, { size }));
    if ((t.h <= maxH && t.w <= o.width) || size <= (minSize || 12)) return t;
    size -= 2;
  }
}

function khDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return 'ថ្ងៃ' + KH_DAY[d.getDay()] + ' ទី' + toKh(d.getDate()) + ' ខែ' + KH_MON[d.getMonth()] + ' ឆ្នាំ' + toKh(d.getFullYear());
}

async function compose(photoBuf, meta) {
  const PH_W = 690, CX = 905, TW = 440;
  const layers = [];

  // left: photo (or a soft gold gradient when no photo)
  let left;
  if (photoBuf) {
    left = await sharp(photoBuf).rotate().resize(PH_W, H, { fit: 'cover', position: 'attention' }).toBuffer();
  } else {
    left = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + PH_W + '" height="' + H + '"><defs><radialGradient id="g" cx="40%" cy="40%" r="80%"><stop offset="0" stop-color="#4a3a1c"/><stop offset="1" stop-color="' + BG + '"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>')).png().toBuffer();
  }
  layers.push({ input: left, left: 0, top: 0 });

  // fade photo into the panel + gold frame
  const overlay = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><defs>' +
    '<linearGradient id="f" x1="0" x2="1"><stop offset="0" stop-color="' + BG + '" stop-opacity="0"/><stop offset="1" stop-color="' + BG + '" stop-opacity="1"/></linearGradient></defs>' +
    '<rect x="470" y="0" width="240" height="' + H + '" fill="url(#f)"/>' +
    '<rect x="16" y="16" width="' + (W - 32) + '" height="' + (H - 32) + '" fill="none" stroke="' + GOLD + '" stroke-opacity=".55" stroke-width="1.5"/>' +
    '<rect x="24" y="24" width="' + (W - 48) + '" height="' + (H - 48) + '" fill="none" stroke="' + GOLD + '" stroke-opacity=".25" stroke-width="1"/></svg>';
  layers.push({ input: Buffer.from(overlay), left: 0, top: 0 });

  // right: text blocks
  const groom = shortName(meta.groomName), bride = shortName(meta.brideName);
  const en = [meta.groomNameEn, meta.brideNameEn].filter(Boolean).map(titleCase).join(' & ');
  const blocks = [];
  blocks.push({ t: await textImg('សិរីសួស្តីអាពាហ៍ពិពាហ៍', { font: 'moul', size: 19, width: TW, color: GOLD }), gap: 12 });
  if (groom || bride) blocks.push({ t: await fitText([groom, bride].filter(Boolean).join('  &  '), { font: 'moul', size: 30, width: TW }, 46, 18), gap: 4 });
  if (en) blocks.push({ t: await fitText(en, { font: 'script', size: 30, width: TW, color: GOLD_SOFT }, 44, 16), gap: 16 });
  blocks.push({ divider: true, h: 14, gap: 16 });
  blocks.push({ t: await textImg('សូមគោរពអញ្ជើញ', { font: 'moul', size: 20, width: TW, color: GOLD_SOFT }), gap: 12 });
  if (meta.guestName) blocks.push({ guest: await fitText(meta.guestName, { font: 'moul', size: 38, width: TW - 50 }, 118, 20), gap: 18 });
  const dateStr = khDate(meta.countdownAt);
  if (dateStr) blocks.push({ t: await fitText(dateStr, { font: 'batB', size: 23, width: TW, color: GOLD }, 34, 15), gap: 8 });
  if (meta.venue) blocks.push({ t: await fitText(meta.venue, { font: 'bat', size: 20, width: TW, color: '#e3d6b4' }, 62, 13), gap: 0 });

  const hOf = b => b.divider ? b.h : b.guest ? b.guest.h + 36 : b.t.h;
  const total = blocks.reduce((a, b) => a + hOf(b) + b.gap, 0) - (blocks.length ? blocks[blocks.length - 1].gap : 0);
  let y = Math.max(40, Math.round((H - total) / 2));
  const svgBits = [];
  for (const b of blocks) {
    if (b.divider) {
      const cy = y + 7;
      svgBits.push('<line x1="' + (CX - 120) + '" x2="' + (CX - 14) + '" y1="' + cy + '" y2="' + cy + '" stroke="' + GOLD + '" stroke-opacity=".7"/>' +
        '<line x1="' + (CX + 14) + '" x2="' + (CX + 120) + '" y1="' + cy + '" y2="' + cy + '" stroke="' + GOLD + '" stroke-opacity=".7"/>' +
        '<path d="M' + CX + ' ' + (cy - 6) + ' L' + (CX + 6) + ' ' + cy + ' L' + CX + ' ' + (cy + 6) + ' L' + (CX - 6) + ' ' + cy + ' Z" fill="' + GOLD + '"/>');
    } else if (b.guest) {
      const g = b.guest, fw = Math.min(TW, Math.max(g.w + 56, 300)), fh = g.h + 36;
      svgBits.push('<rect x="' + (CX - fw / 2) + '" y="' + y + '" width="' + fw + '" height="' + fh + '" rx="6" fill="' + GOLD + '" fill-opacity=".08" stroke="' + GOLD + '" stroke-width="2"/>' +
        '<rect x="' + (CX - fw / 2 + 5) + '" y="' + (y + 5) + '" width="' + (fw - 10) + '" height="' + (fh - 10) + '" rx="4" fill="none" stroke="' + GOLD + '" stroke-opacity=".4"/>');
      layers.push({ input: g.input, left: Math.round(CX - g.w / 2), top: y + 18 });
    } else {
      layers.push({ input: b.t.input, left: Math.round(CX - b.t.w / 2), top: y });
    }
    y += hOf(b) + b.gap;
  }
  // shapes must sit under the text: put the svg first among right-side layers
  const shapes = { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">' + svgBits.join('') + '</svg>'), left: 0, top: 0 };
  layers.splice(2, 0, shapes);

  return sharp({ create: { width: W, height: H, channels: 3, background: BG } })
    .composite(layers).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

module.exports = { compose };
