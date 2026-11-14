import { Platform } from 'react-native';

/**
 * Generate a visual Code128 / barcode SVG representation for a given ticket ID
 */
export function generateBarcodeSvg(code = 'TICKET-001') {
  // Simple deterministic pattern to draw clean barcode lines
  const cleanCode = String(code).replace(/[^a-zA-Z0-9]/g, '').slice(-12) || '0123456789';
  const bars = [];
  let x = 10;

  for (let i = 0; i < cleanCode.length; i++) {
    const charCode = cleanCode.charCodeAt(i);
    const w1 = (charCode % 3) + 1;
    const w2 = ((charCode >> 1) % 2) + 1;
    const w3 = ((charCode >> 2) % 3) + 1;

    bars.push(`<rect x="${x}" y="0" width="${w1 * 2}" height="42" fill="#000000" />`);
    x += w1 * 2 + 2;
    bars.push(`<rect x="${x}" y="0" width="${w2 * 2}" height="42" fill="#000000" />`);
    x += w2 * 2 + 2;
    bars.push(`<rect x="${x}" y="0" width="${w3 * 2}" height="42" fill="#000000" />`);
    x += w3 * 2 + 3;
  }

  return `
    <div style="display:flex; flex-direction:column; align-items:center; margin-top:10px; margin-bottom:8px;">
      <svg width="${x + 20}" height="44" viewBox="0 0 ${x + 20} 44" xmlns="http://www.w3.org/2000/svg">
        ${bars.join('\n')}
      </svg>
      <div style="font-family:'Courier New', monospace; font-size:11px; letter-spacing:2px; font-weight:bold; color:#000000; margin-top:2px;">*${cleanCode}*</div>
    </div>
  `;
}

/**
 * Format Currency String
 */
export function formatReceiptMoney(amount = 0, currency = 'DA') {
  const num = Number(amount || 0);
  return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * Generate Professional HTML for 80mm/58mm Thermal Ticket or Invoice
 */
export function generateProfessionalReceiptHtml({
  sale,
  storeInfo = {},
  customer = null,
  currency = 'DA',
  isRTL = false,
}) {
  if (!sale) return '';

  const ticketNo = sale.id ? `#${sale.id.slice(-8).toUpperCase()}` : '#FAC-0001';
  const saleDate = sale.date ? new Date(sale.date) : new Date();
  const dateStr = saleDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = saleDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const storeName = storeInfo.name || 'STORE SOFT';
  const storePhone = storeInfo.phone || '';
  const storeAddress = storeInfo.address || '';
  const storeFooter = storeInfo.footer || 'Merci pour votre visite et à bientôt !';
  const storeNif = storeInfo.nif || '';
  const storeRc = storeInfo.rc || '';

  const cashier = sale.cashierName || sale.cashier || 'Admin';
  const customerName = customer ? customer.name : sale.customerName || (sale.customerId ? 'Client Compte' : 'Client Comptoir');
  const customerPhone = customer ? customer.phone : '';

  const paymentLabel =
    sale.paymentMethod === 'credit'
      ? 'CRÉDIT (DETTE)'
      : sale.paymentMethod === 'partial'
      ? 'PAIEMENT PARTIEL'
      : 'ESPÈCES (COMPTANT)';

  const paidAmount = Number(sale.paidAmount || (sale.paymentMethod === 'cash' ? sale.total : 0));
  const change = Math.max(0, paidAmount - sale.total);
  const remainingDebt = Math.max(0, sale.total - paidAmount);

  // Items table rows
  const itemRows = (sale.items || []).map((item, index) => {
    const name = item.nameFr || item.nameAr || `Article #${index + 1}`;
    const qty = Number(item.quantity || 1);
    const pu = Number(item.sellPrice || 0);
    const totalLine = qty * pu;

    return `
      <tr style="border-bottom: 1px dashed #cccccc;">
        <td style="padding: 5px 0; text-align: left; vertical-align: top;">
          <div style="font-weight: bold; font-size: 12px; color: #111111;">${name}</div>
          <div style="font-size: 11px; color: #555555;">${qty} x ${formatReceiptMoney(pu, currency)}</div>
        </td>
        <td style="padding: 5px 0; text-align: right; vertical-align: bottom; font-weight: bold; font-size: 12px; white-space: nowrap;">
          ${formatReceiptMoney(totalLine, currency)}
        </td>
      </tr>
    `;
  }).join('');

  // Returns section if any
  let returnsHtml = '';
  if (Array.isArray(sale.returns) && sale.returns.length > 0) {
    returnsHtml = `
      <div style="margin-top: 10px; border-top: 1px dashed #e11d48; padding-top: 6px;">
        <div style="font-weight: bold; font-size: 11px; color: #e11d48; text-transform: uppercase; text-align: center;">
          --- RETOURS / REMBOURSEMENTS ---
        </div>
        ${sale.returns.map((ret, idx) => `
          <div style="font-size: 10px; margin-top: 4px; color: #333333;">
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
              <span>Retour #${idx + 1} (${ret.dateRetour ? new Date(ret.dateRetour).toLocaleDateString('fr-FR') : ''})</span>
              <span>-${formatReceiptMoney(ret.refundAmount, currency)}</span>
            </div>
            <div style="color:#666666; font-style:italic;">Motif: ${ret.reason || 'Retour article'}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  const barcodeSvgHtml = generateBarcodeSvg(ticketNo);

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>Ticket de Caisse ${ticketNo}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 2mm;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
        }
        body {
          font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
          line-height: 1.35;
          color: #000000;
          background-color: #ffffff;
          margin: 0 auto;
          padding: 8px;
          max-width: 80mm;
          box-sizing: border-box;
        }
        .header {
          text-align: center;
          margin-bottom: 8px;
        }
        .store-title {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .store-sub {
          font-size: 11px;
          color: #222222;
        }
        .divider {
          border-top: 1px dashed #000000;
          margin: 6px 0;
        }
        .double-divider {
          border-top: 2px solid #000000;
          margin: 6px 0;
        }
        .meta-table {
          width: 100%;
          font-size: 11px;
          margin-bottom: 4px;
        }
        .meta-table td {
          padding: 1px 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 6px 0;
        }
        .totals-table {
          width: 100%;
          font-size: 12px;
          margin-top: 4px;
        }
        .totals-table td {
          padding: 2px 0;
        }
        .grand-total-row {
          font-size: 15px;
          font-weight: 900;
          border-top: 1.5px solid #000000;
          border-bottom: 1.5px solid #000000;
          padding: 6px 0;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          margin-top: 10px;
          color: #333333;
        }
        .policy-notice {
          font-size: 9px;
          margin-top: 5px;
          color: #555555;
          line-height: 1.25;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="store-title">${storeName}</div>
        ${storeAddress ? `<div class="store-sub">${storeAddress}</div>` : ''}
        ${storePhone ? `<div class="store-sub">Tél : ${storePhone}</div>` : ''}
        ${storeNif ? `<div class="store-sub">NIF: ${storeNif} ${storeRc ? `• RC: ${storeRc}` : ''}</div>` : ''}
      </div>

      <div class="divider"></div>

      <table class="meta-table">
        <tr>
          <td><strong>TICKET :</strong> ${ticketNo}</td>
          <td style="text-align:right;"><strong>DATE :</strong> ${dateStr}</td>
        </tr>
        <tr>
          <td><strong>CAISSE :</strong> ${cashier}</td>
          <td style="text-align:right;"><strong>HEURE :</strong> ${timeStr}</td>
        </tr>
        <tr>
          <td colspan="2"><strong>CLIENT :</strong> ${customerName} ${customerPhone ? `(${customerPhone})` : ''}</td>
        </tr>
      </table>

      <div class="double-divider"></div>

      <table class="items-table">
        <thead>
          <tr style="border-bottom: 1px solid #000000; font-weight: bold; font-size: 11px;">
            <th style="text-align: left; padding-bottom: 3px;">ARTICLE</th>
            <th style="text-align: right; padding-bottom: 3px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="divider"></div>

      <table class="totals-table">
        ${sale.discount > 0 ? `
          <tr>
            <td>Sous-total :</td>
            <td style="text-align: right;">${formatReceiptMoney(sale.subtotal || sale.total + sale.discount, currency)}</td>
          </tr>
          <tr>
            <td style="color: #dc2626; font-weight: bold;">Remise :</td>
            <td style="text-align: right; color: #dc2626; font-weight: bold;">-${formatReceiptMoney(sale.discount, currency)}</td>
          </tr>
        ` : ''}
        <tr class="grand-total-row">
          <td style="font-size: 15px; font-weight: 900;">NET À PAYER :</td>
          <td style="text-align: right; font-size: 15px; font-weight: 900;">${formatReceiptMoney(sale.total, currency)}</td>
        </tr>
        <tr>
          <td style="padding-top: 5px;">Mode de règlement :</td>
          <td style="text-align: right; padding-top: 5px; font-weight: bold;">${paymentLabel}</td>
        </tr>
        <tr>
          <td>Montant versé :</td>
          <td style="text-align: right; font-weight: bold;">${formatReceiptMoney(paidAmount, currency)}</td>
        </tr>
        ${change > 0 ? `
          <tr>
            <td style="color: #16a34a; font-weight: bold;">Monnaie rendue :</td>
            <td style="text-align: right; color: #16a34a; font-weight: bold;">${formatReceiptMoney(change, currency)}</td>
          </tr>
        ` : ''}
        ${remainingDebt > 0 ? `
          <tr>
            <td style="color: #dc2626; font-weight: bold;">Reste dû (Dette) :</td>
            <td style="text-align: right; color: #dc2626; font-weight: bold;">${formatReceiptMoney(remainingDebt, currency)}</td>
          </tr>
        ` : ''}
      </table>

      ${returnsHtml}

      ${barcodeSvgHtml}

      <div class="divider"></div>

      <div class="footer">
        <div style="font-weight: bold; font-size: 11px;">${storeFooter}</div>
        <div class="policy-notice">
          Les articles vendus ne sont échangés ou repris que sur présentation de ce ticket dans un délai de 48 heures.
        </div>
        <div style="margin-top: 4px; font-size: 8px; color: #888888;">
          Édité par Store Soft POS • Solution de Gestion de Caisse
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Print directly via a silent hidden iframe on Web without disrupting screen layout
 */
export function printReceiptDirectly({ sale, storeInfo, customer, currency = 'DA', isRTL = false }) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      const html = generateProfessionalReceiptHtml({ sale, storeInfo, customer, currency, isRTL });

      const iframeId = 'receipt-thermal-print-frame';
      let iframe = document.getElementById(iframeId);
      if (iframe) {
        iframe.remove();
      }

      iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow || iframe.contentDocument;
      const doc = frameDoc.document || frameDoc;
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.warn('Iframe print error:', e);
        }
      }, 350);

      return true;
    } catch (err) {
      console.warn('Direct web receipt print error:', err);
    }
  }

  return false;
}
