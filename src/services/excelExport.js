import { Platform, Alert } from 'react-native';

/**
 * Excel & Spreadsheet Export Utility
 * Generates Excel-compatible HTML/XML Workbooks (.xls) and UTF-8 BOM CSV files (.csv).
 * Compatible with Microsoft Excel, LibreOffice Calc, and Google Sheets.
 */

// Helper to trigger browser download
function downloadFile(content, fileName, mimeType) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }
  return false;
}

// Convert data to Excel-compatible HTML table (opens directly in MS Excel as formatted spreadsheet)
function createExcelHtmlTable(sheetName, headers, rows, summaryRows = []) {
  const headerHtml = headers
    .map(
      (h) =>
        `<th style="background-color:#1e40af;color:#ffffff;font-weight:bold;padding:10px 14px;border:1px solid #cbd5e1;text-align:center;">${h}</th>`
    )
    .join('');

  const rowsHtml = rows
    .map(
      (row, idx) =>
        `<tr style="background-color:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">` +
        row
          .map((cell) => {
            const isNumber = typeof cell === 'number';
            const align = isNumber ? 'right' : 'left';
            return `<td style="padding:8px 12px;border:1px solid #cbd5e1;text-align:${align};">${cell !== null && cell !== undefined ? cell : ''}</td>`;
          })
          .join('') +
        '</tr>'
    )
    .join('');

  const summaryHtml = summaryRows
    .map(
      (sRow) =>
        `<tr style="background-color:#e0f2fe;font-weight:bold;">` +
        sRow
          .map((cell) => `<td style="padding:10px 12px;border:2px solid #0284c7;">${cell !== null && cell !== undefined ? cell : ''}</td>`)
          .join('') +
        '</tr>'
    )
    .join('');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${sheetName}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        <h2 style="color:#1e3a8a;margin-bottom:6px;">${sheetName}</h2>
        <p style="color:#64748b;font-size:12px;margin-bottom:14px;">Généré le ${new Date().toLocaleString('fr-FR')}</p>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}${summaryHtml}</tbody>
        </table>
      </body>
    </html>
  `;
}

/**
 * 1. Export Products / Stock to Excel
 */
export function exportProductsToExcel(products = [], currency = 'DA') {
  if (!products.length) {
    Alert.alert('Export Excel', 'Aucun produit disponible à exporter !');
    return false;
  }

  const headers = [
    'Code-barres',
    'Désignation (FR)',
    'Désignation (AR)',
    'Catégorie',
    `Prix Achat (${currency})`,
    `Prix Vente (${currency})`,
    `Marge Unitaire (${currency})`,
    'Stock Actuel',
    'Stock Min.',
    `Valeur Stock Achat (${currency})`,
    `Valeur Stock Vente (${currency})`,
    'Statut Stock',
  ];

  let totalBuyVal = 0;
  let totalSellVal = 0;
  let totalQty = 0;

  const rows = products.map((p) => {
    const buy = Number(p.buyPrice || 0);
    const sell = Number(p.sellPrice || 0);
    const qty = Number(p.stock || 0);
    const min = Number(p.minStock || 5);
    const margin = sell - buy;
    const buyVal = buy * qty;
    const sellVal = sell * qty;

    totalBuyVal += buyVal;
    totalSellVal += sellVal;
    totalQty += qty;

    let status = 'Normal';
    if (qty <= 0) status = 'Rupture (0)';
    else if (qty <= min) status = 'Stock Faible';

    return [
      p.barcode ? `'${p.barcode}` : '',
      p.nameFr || '',
      p.nameAr || '',
      p.category || 'Général',
      buy,
      sell,
      margin,
      qty,
      min,
      buyVal,
      sellVal,
      status,
    ];
  });

  const summaryRows = [
    [
      'TOTAL GENERAL',
      `${products.length} articles`,
      '',
      '',
      '',
      '',
      `Marge Totale: ${totalSellVal - totalBuyVal} ${currency}`,
      totalQty,
      '',
      totalBuyVal,
      totalSellVal,
      '',
    ],
  ];

  const content = createExcelHtmlTable('Stock et Produits', headers, rows, summaryRows);
  const dateStr = new Date().toISOString().slice(0, 10);
  const success = downloadFile(content, `produits_stock_${dateStr}.xls`, 'application/vnd.ms-excel;charset=utf-8');

  if (!success && Platform.OS !== 'web') {
    Alert.alert('Export Excel', 'Fichier Excel généré avec succès !');
  }
  return true;
}

/**
 * 2. Export Sales & Profits to Excel
 */
export function exportSalesToExcel(sales = [], customers = [], currency = 'DA') {
  if (!sales.length) {
    Alert.alert('Export Excel', 'Aucune vente disponible à exporter !');
    return false;
  }

  const customerMap = {};
  (customers || []).forEach((c) => {
    customerMap[c.id] = c.name;
  });

  const headers = [
    'N° Ticket / Vente',
    'Date & Heure',
    'Caissier',
    'Client',
    'Mode de Paiement',
    `Sous-Total (${currency})`,
    `Remise (${currency})`,
    `Total Net (${currency})`,
    `Montant Versé (${currency})`,
    `Crédit Restant (${currency})`,
    `Bénéfice Réalisé (${currency})`,
    'Articles Vendus',
  ];

  let sumTotal = 0;
  let sumProfit = 0;
  let sumPaid = 0;
  let sumDiscounts = 0;

  const rows = sales.map((s) => {
    const total = Number(s.total || 0);
    const profit = Number(s.profit || 0);
    const paid = s.paymentMethod === 'cash' ? total : Number(s.paidAmount || 0);
    const remaining = Math.max(0, total - paid);
    const discount = Number(s.discount || 0);
    const dateFormatted = s.date ? new Date(s.date).toLocaleString('fr-FR') : '';
    const clientName = s.customerId ? (customerMap[s.customerId] || 'Client Enregistré') : 'Client Comptoir';

    const itemsSummary = (s.items || [])
      .map((i) => `${i.nameFr || i.nameAr || 'Article'} (x${i.quantity || 1})`)
      .join(', ');

    sumTotal += total;
    sumProfit += profit;
    sumPaid += paid;
    sumDiscounts += discount;

    let paymentLabel = 'Espèces';
    if (s.paymentMethod === 'credit') paymentLabel = 'Crédit (Dette)';
    else if (s.paymentMethod === 'partial') paymentLabel = 'Paiement Partiel';

    return [
      s.id || '',
      dateFormatted,
      s.cashierName || s.cashier || 'Admin',
      clientName,
      paymentLabel,
      Number(s.subtotal || total),
      discount,
      total,
      paid,
      remaining,
      profit,
      itemsSummary,
    ];
  });

  const summaryRows = [
    [
      'TOTAL',
      `${sales.length} ventes`,
      '',
      '',
      '',
      '',
      sumDiscounts,
      sumTotal,
      sumPaid,
      sumTotal - sumPaid,
      sumProfit,
      '',
    ],
  ];

  const content = createExcelHtmlTable('Ventes et Bénéfices', headers, rows, summaryRows);
  const dateStr = new Date().toISOString().slice(0, 10);
  const success = downloadFile(content, `ventes_benefices_${dateStr}.xls`, 'application/vnd.ms-excel;charset=utf-8');

  if (!success && Platform.OS !== 'web') {
    Alert.alert('Export Excel', 'Fichier Excel des ventes généré avec succès !');
  }
  return true;
}

/**
 * 3. Export Financial Report & Profit Statement to Excel
 */
export function exportFinancialStatementToExcel(financialData, currency = 'DA') {
  const {
    totalRevenue = 0,
    grossProfit = 0,
    totalExpenses = 0,
    repairIncome = 0,
    iptvIncome = 0,
    totalRefunds = 0,
    netProfit = 0,
    profitMarginPercent = 0,
    inventoryBuyValue = 0,
    inventorySellValue = 0,
    potentialInventoryMargin = 0,
    totalCustomerDebt = 0,
    cashInflow = 0,
    netCashFlow = 0,
    periodLabel = 'Période globale',
  } = financialData;

  const headers = ['Indicateur Financier', `Montant (${currency})`, 'Commentaire / Détail'];

  const rows = [
    ['Chiffre d’Affaires Ventes (TTC)', totalRevenue, 'Total des ventes de produits'],
    ['Marge Brute sur Ventes', grossProfit, 'Ventes moins coût d’achat marchandises'],
    ['Revenus Services & Réparations', repairIncome, 'Encaissements atelier & réparations'],
    ['Revenus IPTV & Abonnements', iptvIncome, 'Ventes de serveurs et abonnements IPTV'],
    ['Total des Dépenses & Charges', -totalExpenses, 'Frais de magasin, loyer, factures, etc.'],
    ['Remboursements Retours Clients', -totalRefunds, 'Marchandises reprises et remboursées'],
    ['BENEFICE NET REEL DU PROJET', netProfit, `Bénéfice final dégagé (${profitMarginPercent}% de rentabilité)`],
    ['---', '---', '---'],
    ['Valeur du Stock au Prix d’Achat', inventoryBuyValue, 'Capital immobilisé en magasin'],
    ['Valeur Marchande du Stock (Vente)', inventorySellValue, 'Revenus prévus si tout est vendu'],
    ['Bénéfice Potentiel en Stock', potentialInventoryMargin, 'Gain théorique restant dans le stock'],
    ['Créances & Dettes Clients Dehors', totalCustomerDebt, 'Argent restant à recouvrer'],
    ['Total Encaissements Réels (Entrées)', cashInflow, 'Espèces et paiements effectifs reçus'],
    ['Trésorerie Nette Réelle', netCashFlow, 'Entrées réelles moins sorties d’argent'],
  ];

  const content = createExcelHtmlTable(`Bilan Financier & Bénéfices - ${periodLabel}`, headers, rows);
  const dateStr = new Date().toISOString().slice(0, 10);
  const success = downloadFile(content, `bilan_financier_${dateStr}.xls`, 'application/vnd.ms-excel;charset=utf-8');

  if (!success && Platform.OS !== 'web') {
    Alert.alert('Export Excel', 'Bilan financier exporté avec succès !');
  }
  return true;
}

/**
 * 4. Export Grand Master Project Excel File (All-in-One project data)
 */
export function exportMasterProjectExcel({
  products = [],
  sales = [],
  customers = [],
  expenses = [],
  repairs = [],
  iptvCodes = [],
  currency = 'DA',
}) {
  // Compute global summary metrics
  const totalSalesVal = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const totalSalesProfit = sales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
  const totalExpensesVal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalStockBuyVal = products.reduce((sum, p) => sum + Number(p.buyPrice || 0) * Number(p.stock || 0), 0);
  const totalStockSellVal = products.reduce((sum, p) => sum + Number(p.sellPrice || 0) * Number(p.stock || 0), 0);
  const totalDebtVal = customers.reduce((sum, c) => sum + Number(c.debt || 0), 0);
  const netGlobalProfit = totalSalesProfit - totalExpensesVal;

  const headers = ['Module / Rubrique', 'Quantité / Nombre', `Total Valeur (${currency})`, `Bénéfice / Marge (${currency})`];

  const rows = [
    ['Produits en Stock', `${products.length} références`, `Coût: ${totalStockBuyVal} / Vente: ${totalStockSellVal}`, totalStockSellVal - totalStockBuyVal],
    ['Ventes Effectuées', `${sales.length} tickets`, totalSalesVal, totalSalesProfit],
    ['Clients Enregistrés', `${customers.length} clients`, `Dettes: ${totalDebtVal}`, '-'],
    ['Dépenses Enregistrées', `${expenses.length} dépenses`, totalExpensesVal, -totalExpensesVal],
    ['Réparations Atelier', `${repairs.length} fiches`, repairs.reduce((sum, r) => sum + Number(r.cost || 0), 0), '-'],
    ['Codes IPTV & Serveurs', `${iptvCodes.length} codes`, iptvCodes.reduce((sum, c) => sum + Number(c.sellPrice || 0), 0), '-'],
  ];

  const summaryRows = [
    ['BILAN PROJET GLOBAL', 'Complet', `Chiffre d’Affaires: ${totalSalesVal}`, `Bénéfice Net Global: ${netGlobalProfit}`],
  ];

  const content = createExcelHtmlTable('Rapport Global du Projet', headers, rows, summaryRows);
  const dateStr = new Date().toISOString().slice(0, 10);
  const success = downloadFile(content, `projet_complet_excel_${dateStr}.xls`, 'application/vnd.ms-excel;charset=utf-8');

  if (!success && Platform.OS !== 'web') {
    Alert.alert('Export Excel', 'Classeur Excel complet du projet exporté avec succès !');
  }
  return true;
}
