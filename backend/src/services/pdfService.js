const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const cfg = require('../config');
const { displayPlate } = require('../utils/plate');

const INK = '#15202B', MUTED = '#5B5F66', PRIMARY = '#1D4E63', BORDER = '#E3DFD6';
const CLASS_COLOR = { private: ['#FBD24A', '#4A3B00', 'PRIVATE VEHICLE'], commercial: ['#3B82C4', '#FFFFFF', 'COMMERCIAL VEHICLE'], psv: ['#D64545', '#FFFFFF', 'PUBLIC SERVICE VEHICLE'] };
const fmtDate = (d) => { const x = new Date(d + 'T00:00:00Z'); return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
const STATUS_LABEL = { active: 'ACTIVE', expired: 'EXPIRED', upcoming: 'UPCOMING', past: 'PAST COVER', none: 'NO RECORD' };

function newDoc(res, filename) {
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: filename, Author: 'SureTrace' } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);
  return doc;
}

function header(doc, title) {
  doc.rect(0, 0, doc.page.width, 70).fill(PRIMARY);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(20).text('SureTrace', 48, 24);
  doc.font('Helvetica').fontSize(10).text(title, 48, 30, { width: doc.page.width - 96, align: 'right' });
  doc.fillColor(INK);
  doc.y = 92;
}

function kv(doc, k, v, w = 250) {
  const y = doc.y;
  const val = String(v ?? '—');
  doc.font('Helvetica-Bold').fontSize(9.5);
  const h = Math.max(doc.heightOfString(val, { width: w }), 12);
  doc.font('Helvetica').fillColor(MUTED).text(k, 48, y, { width: 145, lineBreak: false });
  doc.font('Helvetica-Bold').fillColor(INK).text(val, 198, y, { width: w });
  doc.x = 48; doc.y = y + h + 5;
}

function footer(doc) {
  const y = doc.page.height - 56;
  doc.page.margins.bottom = 0;
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
    'Compiled by SureTrace from insurer records. This report is informational; the insurer certificate remains the legal document. Verify authenticity with the QR code.',
    48, y, { width: doc.page.width - 96, align: 'center' });
}

// -------- full history report --------
async function historyPdf(res, { history, vehicle, seller, ref }) {
  const doc = newDoc(res, `SureTrace-${history.plate}-history`);
  header(doc, 'Vehicle Insurance History Report');

  doc.font('Helvetica-Bold').fontSize(22).fillColor(INK).text(displayPlate(history.plate), 48, doc.y);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(`${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim());
  doc.moveDown(0.8);

  kv(doc, 'Chassis number', vehicle.chassis);
  kv(doc, 'Registered owner', seller.full_name);
  kv(doc, 'Report reference', ref);
  kv(doc, 'Generated', new Date(history.generated_at).toUTCString());
  kv(doc, 'Insurers checked', `${history.insurers_checked} (all licensed motor insurers in Rwanda)`);
  kv(doc, 'Insurers with a record', String(history.insurers_with_cover));
  kv(doc, 'Total certificates', String(history.total_certificates));
  kv(doc, 'First recorded cover', history.first_cover ? fmtDate(history.first_cover) : 'None');
  kv(doc, 'Currently insured', history.currently_insured ? 'Yes' : 'No');
  kv(doc, 'Uninsured gaps', history.gaps.length ? history.gaps.map((g) => `${fmtDate(g.from)} – ${fmtDate(g.to)} (${g.days} days)`).join('\n') : 'None between recorded certificates');

  const afterKv = doc.y;
  // QR block (top right)
  const url = `${cfg.baseUrl}/verify/${ref}`;
  const png = await QRCode.toBuffer(url, { margin: 1, width: 220 });
  doc.image(png, doc.page.width - 48 - 96, 100, { width: 96 });
  doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text('Scan to verify', doc.page.width - 48 - 96, 198, { width: 96, align: 'center' });

  doc.x = 48; doc.y = Math.max(afterKv + 10, 222);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(PRIMARY).text('Insurer-by-insurer record', 48, doc.y);
  doc.y += 8;

  for (const ins of history.insurers) {
    const need = 34 + Math.max(ins.certificates.length, 1) * 24;
    if (doc.y + need > doc.page.height - 70) { footer(doc); doc.addPage(); doc.page.margins.bottom = 48; header(doc, 'Vehicle Insurance History Report'); }
    const y = doc.y;
    doc.roundedRect(48, y, doc.page.width - 96, 24, 4).fill(ins.status === 'none' ? '#F1EFEA' : '#E9F0F3');
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(ins.insurer_name, 58, y + 7, { width: 330 });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(ins.status === 'active' ? '#176B45' : ins.status === 'past' ? PRIMARY : MUTED)
      .text(STATUS_LABEL[ins.status], 400, y + 8, { width: 130, align: 'right' });
    doc.y = y + 28;
    for (const c of ins.certificates) {
      doc.font('Helvetica').fontSize(9).fillColor(INK).text(
        `Certificate ${c.certificate_no}  ·  Policy ${c.policy_no}  ·  ${c.cover_type}  ·  ${fmtDate(c.start_date)} – ${fmtDate(c.end_date)}  ·  ${STATUS_LABEL[c.status] || c.status}`,
        62, doc.y, { width: doc.page.width - 124 });
      doc.y += 3;
    }
    if (ins.status === 'none') {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED).text('No certificate ever issued by this insurer for this vehicle.', 62, doc.y);
    }
    doc.x = 48; doc.y += 10;
  }
  footer(doc);
  doc.end();
}

// -------- single certificate --------
async function certificatePdf(res, { cert, vehicle }) {
  const doc = newDoc(res, `SureTrace-${cert.certificate_no}`);
  header(doc, 'Certificate of Insurance (copy)');
  const [bg, fg, label] = CLASS_COLOR[cert.certificate_class] || CLASS_COLOR.private;
  const by = doc.y;
  doc.rect(48, by, doc.page.width - 96, 28).fill(bg);
  doc.fillColor(fg).font('Helvetica-Bold').fontSize(11);
  doc.text(`${label} CERTIFICATE`, 58, by + 9, { lineBreak: false });
  doc.text(STATUS_LABEL[cert.status] || '', 58, by + 9, { width: doc.page.width - 116, align: 'right', lineBreak: false });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(15).text(cert.insurer_name, 48, by + 44, { width: doc.page.width - 96 });
  doc.y += 12;
  kv(doc, 'Certificate no.', cert.certificate_no);
  kv(doc, 'Policy no.', cert.policy_no);
  kv(doc, 'Policyholder', cert.policyholder);
  kv(doc, 'Plate number', displayPlate(cert.plate));
  kv(doc, 'Make / model', `${vehicle.make || ''} ${vehicle.model || ''}`.trim());
  kv(doc, 'Chassis number', vehicle.chassis);
  kv(doc, 'Cover type', cert.cover_type);
  kv(doc, 'Period of cover', `${fmtDate(cert.start_date)} – ${fmtDate(cert.end_date)}`);
  doc.y += 8;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('PERSONS ENTITLED TO DRIVE', 48, doc.y);
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(cert.persons_entitled || '—', 48, doc.y + 2, { width: doc.page.width - 96 });

  const qy = doc.y + 24;
  const png = await QRCode.toBuffer(`${cfg.baseUrl}/verify/cert/${cert.certificate_no}`, { margin: 1, width: 220 });
  doc.image(png, 48, qy, { width: 90 });
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('Scan to verify this certificate against the SureTrace registry copy', 148, qy + 36, { width: 300 });
  footer(doc);
  doc.end();
}

module.exports = { historyPdf, certificatePdf };
