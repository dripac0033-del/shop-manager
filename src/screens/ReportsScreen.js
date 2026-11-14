import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  Linking,
  TextInput,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import ProfessionalReceiptModal from '../components/ProfessionalReceiptModal';
import { printReceiptDirectly } from '../services/receiptPrinter';

export default function ReportsScreen() {
  const {
    t,
    formatMoney,
    currency = 'DA',
    sales = [],
    transactions = [],
    expenses = [],
    repairs = [],
    products = [],
    customers = [],
    processSaleReturn,
    isRTL,
    storeInfo,
    firebaseConnected,
    syncStatus,
    lastSyncTime,
    refreshAllFromFirebase,
  } = useApp();

  const [period, setPeriod] = useState('month'); // 'today' | 'week' | 'month' | 'all'
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'ledger'
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [sharePhone, setSharePhone] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [copiedTicket, setCopiedTicket] = useState(false);

  // Return Modal State
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnSaleTarget, setReturnSaleTarget] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnQtyInputs, setReturnQtyInputs] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const now = new Date();
  const validSales = Array.isArray(sales) ? sales : [];
  const validProducts = Array.isArray(products) ? products : [];
  const validExpenses = Array.isArray(expenses) ? expenses : [];
  const validTransactions = Array.isArray(transactions) ? transactions : [];

  const isMatchingPeriod = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (period === 'today') {
      return d.toDateString() === now.toDateString();
    } else if (period === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= oneWeekAgo;
    } else if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true; // 'all'
  };

  const filteredSales = validSales.filter((s) => {
    if (!s || !s.date) return false;
    if (!isMatchingPeriod(s.date)) return false;

    if (salesSearchQuery.trim()) {
      const q = salesSearchQuery.toLowerCase().trim();
      const idMatch = (s.id || '').toLowerCase().includes(q);
      const cashierMatch = (s.cashierName || s.cashier || '').toLowerCase().includes(q);
      const cust = (customers || []).find((c) => c.id === s.customerId);
      const custMatch = cust ? cust.name.toLowerCase().includes(q) : false;
      return idMatch || cashierMatch || custMatch;
    }

    return true;
  });

  const filteredExpenses = validExpenses.filter((e) => {
    if (!e || !e.date) return false;
    return isMatchingPeriod(e.date);
  });

  // ==============================================================
  // COMPREHENSIVE FINANCIAL AGGREGATIONS (ALL DATABASE MONEY TRANSACTIONS)
  // ==============================================================
  const totalSalesRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const totalRevenue = totalSalesRevenue;
  const grossProfit = filteredSales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Cash directly received from sales
  const cashFromSales = filteredSales.reduce((sum, s) => {
    if (s.paymentMethod === 'cash') return sum + Number(s.total || 0);
    return sum + Number(s.paidAmount || 0);
  }, 0);

  // Customer debt payments collected in this period
  const debtCollections = validTransactions
    .filter((tx) => tx.type === 'debt_payment' && isMatchingPeriod(tx.date))
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  // Workshop repairs & services income in this period
  const repairIncome = validTransactions
    .filter((tx) => tx.type === 'repair_payment' && isMatchingPeriod(tx.date))
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  // Total Real Cash Inflows
  const totalCashIn = cashFromSales + debtCollections + repairIncome;

  // Refunds issued for returns
  const totalRefunds = validTransactions
    .filter((tx) => tx.type === 'return' && isMatchingPeriod(tx.date))
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  // Total Real Cash Outflows
  const totalCashOut = totalExpenses + totalRefunds;

  // Trésorerie Nette Réelle (Net Cash Flow for period)
  const netCashFlow = totalCashIn - totalCashOut;

  // Bénéfice Net Réel Global (Gross Profit + Services - Expenses - Refunds)
  const netProfit = grossProfit + repairIncome - totalExpenses - totalRefunds;

  // Average Basket
  const averageBasket = filteredSales.length > 0 ? totalSalesRevenue / filteredSales.length : 0;

  // Outstanding Customer Debt
  const totalCustomerDebt = (customers || []).reduce((sum, c) => sum + Number(c.debt || 0), 0);

  // Inventory Valuation
  const inventoryBuyValue = validProducts.reduce(
    (sum, p) => sum + Number(p.buyPrice || 0) * Number(p.stock || 0),
    0
  );
  const inventorySellValue = validProducts.reduce(
    (sum, p) => sum + Number(p.sellPrice || 0) * Number(p.stock || 0),
    0
  );
  const potentialInventoryMargin = inventorySellValue - inventoryBuyValue;

  // Top Selling Items
  const itemCounts = {};
  filteredSales.forEach((s) => {
    (s.items || []).forEach((item) => {
      if (item && item.id) {
        itemCounts[item.id] = (itemCounts[item.id] || 0) + Number(item.quantity || 1);
      }
    });
  });

  const topProducts = validProducts
    .map((p) => ({ ...p, soldQty: itemCounts[p.id] || 0 }))
    .filter((p) => p.soldQty > 0)
    .sort((a, b) => b.soldQty - a.soldQty);

  // Open Return Modal
  const handleOpenReturnModal = (sale) => {
    setReturnSaleTarget(sale);
    setReturnReason('');
    const initialQty = {};
    (sale.items || []).forEach((i) => {
      initialQty[i.id] = String(i.quantity);
    });
    setReturnQtyInputs(initialQty);
    setReturnModalVisible(true);
  };

  // Submit Sale Return
  const handleConfirmReturn = async () => {
    if (!returnSaleTarget) return;

    const itemsToReturn = [];
    let calculatedRefund = 0;

    (returnSaleTarget.items || []).forEach((i) => {
      const q = Number(returnQtyInputs[i.id] || 0);
      if (q > 0) {
        const returnCount = Math.min(q, i.quantity);
        itemsToReturn.push({
          ...i,
          quantity: returnCount,
        });
        calculatedRefund += returnCount * Number(i.sellPrice || 0);
      }
    });

    if (itemsToReturn.length === 0) {
      Alert.alert(t('processReturn'), isRTL ? 'يرجى تحديد كمية صالحة للإرجاع!' : 'Veuillez saisir une quantité valide à retourner !');
      return;
    }

    setReturnModalVisible(false);

    try {
      await processSaleReturn(returnSaleTarget.id, {
        itemsToReturn,
        returnReason: returnReason.trim() || 'Retour client',
        refundAmount: calculatedRefund,
      });

      showToast(
        isRTL
          ? `✅ تم تسجيل الإرجاع وتحديث المخزون بنجاح (المبلغ المسترجع: ${formatMoney(calculatedRefund)})`
          : `✅ Retour enregistré et stock réintégré (+${formatMoney(calculatedRefund)})`
      );

      if (selectedSale && selectedSale.id === returnSaleTarget.id) {
        setSelectedSale(null);
      }
    } catch (err) {
      console.warn('Error processing return:', err);
    }
  };

  // Generate Receipt Text for sharing with return dates
  const generateReceiptText = (sale) => {
    if (!sale) return '';
    const dateStr = sale.date ? new Date(sale.date).toLocaleString() : new Date().toLocaleString();
    const cust = (customers || []).find((c) => c.id === sale.customerId);

    const lines = [];
    lines.push(`🧾 *${storeInfo.name || 'Store Soft'}*`);
    if (storeInfo.address) lines.push(`📍 ${storeInfo.address}`);
    if (storeInfo.phone) lines.push(`📞 ${storeInfo.phone}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📅 Date Vente : ${dateStr}`);
    if (sale.cashierName || sale.cashier) {
      lines.push(`👤 Caissier : ${sale.cashierName || sale.cashier}`);
    }
    if (cust) {
      lines.push(`👥 Client : ${cust.name}`);
    }
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🛒 ARTICLES :`);
    (sale.items || []).forEach((item) => {
      const name = item.nameFr || item.nameAr || 'Article';
      lines.push(`• ${name} x${item.quantity} = ${formatMoney(item.sellPrice * item.quantity)}`);
    });
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    if (sale.discount > 0) {
      lines.push(`Remise : -${formatMoney(sale.discount)}`);
    }
    lines.push(`💰 *TOTAL : ${formatMoney(sale.total)}*`);
    lines.push(`Mode : ${sale.paymentMethod === 'cash' ? 'Espèces' : 'Crédit'}`);

    // If returns exist, include them with their return dates
    if (sale.returns && sale.returns.length > 0) {
      lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
      lines.push(`🔄 *HISTORIQUE DES RETOURS :*`);
      sale.returns.forEach((ret, idx) => {
        const retDateStr = ret.dateRetour ? new Date(ret.dateRetour).toLocaleString() : '';
        lines.push(`[Retour #${idx + 1}] Date : ${retDateStr}`);
        lines.push(`Motif : ${ret.reason || 'Retour'}`);
        (ret.items || []).forEach((rItem) => {
          lines.push(`  - ${rItem.nameFr || rItem.nameAr} x${rItem.quantity}`);
        });
        lines.push(`  Remboursé : ${formatMoney(ret.refundAmount)}`);
      });
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(storeInfo.footer || 'Merci pour votre visite !');
    return lines.join('\n');
  };

  const handleSendWhatsApp = (sale) => {
    const text = generateReceiptText(sale);
    const cleanPhone = (sharePhone || '').replace(/[^0-9]/g, '');
    let url = '';

    if (cleanPhone) {
      const intlPhone = cleanPhone.startsWith('0') ? '213' + cleanPhone.substring(1) : cleanPhone;
      url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => Alert.alert('WhatsApp', text));
    }
  };

  const handleSendEmail = (sale) => {
    const text = generateReceiptText(sale);
    const subject = `Facture / Ticket #${sale.id.slice(-6)} - ${storeInfo.name || 'Store Soft'}`;
    const cleanMail = (shareEmail || '').trim();
    const mailto = `mailto:${cleanMail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(mailto, '_blank');
    } else {
      Linking.openURL(mailto).catch(() => Alert.alert('Email', text));
    }
  };

  const handleCopyTicket = (sale) => {
    const text = generateReceiptText(sale);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedTicket(true);
      setTimeout(() => setCopiedTicket(false), 2500);
    } else {
      Alert.alert(isRTL ? 'تم نسخ التذكرة' : 'Ticket copié', text);
    }
  };

  // Filtered transactions for Grand Livre
  const filteredTransactions = validTransactions
    .filter((tx) => isMatchingPeriod(tx.date))
    .filter((tx) => {
      if (ledgerTypeFilter === 'all') return true;
      if (ledgerTypeFilter === 'sale') return tx.type === 'sale';
      if (ledgerTypeFilter === 'expense') return tx.type === 'expense';
      if (ledgerTypeFilter === 'debt_payment') return tx.type === 'debt_payment';
      if (ledgerTypeFilter === 'repair_payment') return tx.type === 'repair_payment';
      if (ledgerTypeFilter === 'return') return tx.type === 'return';
      return true;
    })
    .filter((tx) => {
      if (!ledgerSearch.trim()) return true;
      const q = ledgerSearch.toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const id = (tx.id || '').toLowerCase();
      const type = (tx.type || '').toLowerCase();
      return desc.includes(q) || id.includes(q) || type.includes(q);
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const ledgerTotalIn = filteredTransactions
    .filter((tx) => Number(tx.amount || 0) > 0)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const ledgerTotalOut = filteredTransactions
    .filter((tx) => Number(tx.amount || 0) < 0)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const ledgerNet = ledgerTotalIn - ledgerTotalOut;

  // Export Grand Livre to CSV
  const handleExportLedgerCSV = () => {
    if (!filteredTransactions.length) {
      Alert.alert('CSV', isRTL ? 'لا توجد حركات مالية لتصديرها!' : 'Aucune transaction à exporter !');
      return;
    }

    const headers = [
      'ID Transaction',
      'Date & Heure',
      'Type Mouvement',
      'Description / Libelle',
      'Montant DZD',
      'Sens Flux',
      'Mode Paiement',
      'Operateur / Caisse',
    ];

    const rows = filteredTransactions.map((tx) => {
      const d = tx.date ? new Date(tx.date) : new Date();
      const isPos = Number(tx.amount || 0) >= 0;
      return [
        `"${tx.id || ''}"`,
        `"${d.toLocaleDateString()} ${d.toLocaleTimeString()}"`,
        `"${tx.type || ''}"`,
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        Math.abs(Number(tx.amount || 0)),
        isPos ? 'Entrée (+)' : 'Sortie (-)',
        `"${tx.paymentMethod || 'cash'}"`,
        `"${(tx.cashier || tx.user || 'Admin').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `grand_livre_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('CSV', isRTL ? 'تم تصدير دفتر الأستاذ بنجاح!' : 'Fichier CSV du Grand Livre exporté avec succès !');
    }
  };

  // Export Sales Report to CSV
  const handleExportSalesCSV = () => {
    if (!filteredSales.length) {
      Alert.alert('CSV', isRTL ? 'لا توجد مبيعات لتصديرها!' : 'Aucune vente à exporter !');
      return;
    }

    const headers = [
      'ID Vente',
      'Date Vente',
      'Statut',
      'Caissier',
      'Mode Paiement',
      'Articles',
      'Total Net DZD',
      'Marge Benefice DZD',
      'Historique Retours & Dates',
    ];

    const rows = filteredSales.map((s) => {
      const d = s.date ? new Date(s.date) : new Date();
      const returnsSummary = (s.returns || [])
        .map((r) => `${r.dateRetour ? new Date(r.dateRetour).toLocaleDateString() : ''}: Remboursé ${r.refundAmount} DA (${r.reason})`)
        .join(' | ');

      return [
        `"${s.id || ''}"`,
        `"${d.toLocaleDateString()} ${d.toLocaleTimeString()}"`,
        `"${s.status || 'completed'}"`,
        `"${(s.cashierName || s.cashier || 'Admin').replace(/"/g, '""')}"`,
        `"${s.paymentMethod || 'cash'}"`,
        (s.items || []).length,
        s.total || 0,
        s.profit || 0,
        `"${returnsSummary.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ventes_retours_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('CSV', isRTL ? 'تم تصدير ملف المبيعات بنجاح!' : 'Fichier CSV des ventes exporté avec succès !');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Toast Feedback */}
      {toastMessage ? (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Main Tab Switcher: Synthese & Marges vs Grand Livre */}
      <View style={[styles.mainTabRow, isRTL && styles.rowReverse]}>
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'summary' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Ionicons
            name="pie-chart-outline"
            size={16}
            color={activeTab === 'summary' ? '#ffffff' : theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.mainTabBtnText,
              activeTab === 'summary' && styles.mainTabBtnTextActive,
            ]}
          >
            {isRTL ? 'نظرة عامة وهوامش الربح' : 'Vue Synthèse & Marges'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'ledger' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('ledger')}
        >
          <Ionicons
            name="book-outline"
            size={16}
            color={activeTab === 'ledger' ? '#ffffff' : theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.mainTabBtnText,
              activeTab === 'ledger' && styles.mainTabBtnTextActive,
            ]}
          >
            {t('allTransactions') || 'Grand Livre des Transactions'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector Tabs */}
      <View style={[styles.periodRow, isRTL && styles.rowReverse]}>
        {[
          { key: 'today', label: t('today') },
          { key: 'week', label: t('thisWeek') },
          { key: 'month', label: t('thisMonth') },
          { key: 'all', label: isRTL ? 'الكل' : 'Global' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.periodTab, period === tab.key && styles.periodTabActive]}
            onPress={() => setPeriod(tab.key)}
          >
            <Text
              style={[
                styles.periodTabText,
                period === tab.key && styles.periodTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ========================================================= */}
      {/* TAB 1: VUE SYNTHESE FINANCIERE & MARGES                  */}
      {/* ========================================================= */}
      {activeTab === 'summary' && (
        <View>
          {/* Net Profit Banner */}
          <View
            style={[
              styles.netProfitCard,
              { backgroundColor: netProfit >= 0 ? theme.colors.primary : theme.colors.danger },
            ]}
          >
            <Text style={styles.netProfitLabel}>{t('realNetProfit') || t('profit')}</Text>
            <Text style={styles.netProfitAmount}>{formatMoney(netProfit)}</Text>
            <Text style={styles.netProfitDesc}>
              {isRTL
                ? `هامش البيع: +${formatMoney(grossProfit)} | الصيانة: +${formatMoney(repairIncome)} | المصاريف: -${formatMoney(totalExpenses)} | الاسترجاع: -${formatMoney(totalRefunds)}`
                : `Marge Ventes: +${formatMoney(grossProfit)} | Services: +${formatMoney(repairIncome)} | Dépenses: -${formatMoney(totalExpenses)} | Retours: -${formatMoney(totalRefunds)}`}
            </Text>
          </View>

          {/* Financial Details Grid 1: Revenue vs Cash Collected */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t('totalSalesRevenue') || t('revenue')}</Text>
              <Text style={[styles.statVal, { color: theme.colors.primary }]}>
                {formatMoney(totalSalesRevenue)}
              </Text>
              <Text style={styles.statSub}>
                {filteredSales.length} {isRTL ? 'عمليات بيع' : 'ventes'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t('cashInflow') || 'Encaissements Réels'}</Text>
              <Text style={[styles.statVal, { color: '#059669' }]}>
                {formatMoney(totalCashIn)}
              </Text>
              <Text style={styles.statSub}>
                {isRTL ? 'مقبوضات نقدية فعلية' : 'Cash + Dettes perçues'}
              </Text>
            </View>
          </View>

          {/* Financial Details Grid 2: Total Cash Out vs Net Cash Flow */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t('totalExpenses') || 'Sorties Réelles'}</Text>
              <Text style={[styles.statVal, { color: theme.colors.danger }]}>
                {formatMoney(totalCashOut)}
              </Text>
              <Text style={styles.statSub}>
                {isRTL ? 'مصاريف + استرجاعات' : `Charges (${formatMoney(totalExpenses)}) + Retours (${formatMoney(totalRefunds)})`}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t('netCashFlow') || 'Trésorerie Nette'}</Text>
              <Text style={[styles.statVal, { color: netCashFlow >= 0 ? '#0284c7' : theme.colors.danger }]}>
                {formatMoney(netCashFlow)}
              </Text>
              <Text style={styles.statSub}>
                {isRTL ? 'صافي حركة السيولة' : 'Entrées réelles - Sorties'}
              </Text>
            </View>
          </View>

          {/* Financial Details Grid 3: Average Basket & Customer Outstanding Debt */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t('averageBasket') || 'Panier Moyen'}</Text>
              <Text style={[styles.statVal, { color: '#7c3aed' }]}>
                {formatMoney(averageBasket)}
              </Text>
              <Text style={styles.statSub}>
                {isRTL ? 'معدل قيمة الشراء للزبون' : 'Moyenne par ticket de vente'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t('customerDebt') || 'Dettes Clients'}</Text>
              <Text style={[styles.statVal, { color: '#d97706' }]}>
                {formatMoney(totalCustomerDebt)}
              </Text>
              <Text style={styles.statSub}>
                {isRTL ? 'إجمالي الديون المعلقة في السوق' : 'Total créances clients en cours'}
              </Text>
            </View>
          </View>

          {/* Inventory Valuation */}
          <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
            {isRTL ? 'تقييم المخزون الحالي' : 'Valeur du Stock Actuel'}
          </Text>
          <View style={styles.inventoryCard}>
            <View style={[styles.inventoryRow, isRTL && styles.rowReverse]}>
              <Text style={styles.invLabel}>
                {isRTL ? 'القيمة بسعر الشراء (رأس المال):' : "Valeur d'Achat (Capital) :"}
              </Text>
              <Text style={styles.invVal}>{formatMoney(inventoryBuyValue)}</Text>
            </View>
            <View style={[styles.inventoryRow, isRTL && styles.rowReverse]}>
              <Text style={styles.invLabel}>
                {isRTL ? 'القيمة بسعر البيع (الإجمالي المتوقع):' : 'Valeur de Vente Totale :'}
              </Text>
              <Text style={[styles.invVal, { color: theme.colors.primary }]}>
                {formatMoney(inventorySellValue)}
              </Text>
            </View>
            <View style={[styles.inventoryRow, isRTL && styles.rowReverse, styles.noBorder]}>
              <Text style={styles.invLabel}>
                {isRTL ? 'هامش الربح المتوقع في المخزن:' : 'Marge brute théorique :'}
              </Text>
              <Text style={[styles.invVal, { color: theme.colors.secondary }]}>
                +{formatMoney(potentialInventoryMargin)}
              </Text>
            </View>
          </View>

          {/* Top Products */}
          <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
            {t('topSellingProducts')}
          </Text>
          {topProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {isRTL ? 'لا توجد مبيعات في هذه الفترة' : 'Aucune vente sur cette période'}
              </Text>
            </View>
          ) : (
            topProducts.slice(0, 5).map((p, idx) => (
              <View key={p.id} style={[styles.topProductRow, isRTL && styles.rowReverse]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{idx + 1}</Text>
                </View>

                <View style={[styles.topProductMeta, isRTL && styles.alignRight]}>
                  <Text style={styles.topProductName}>{isRTL ? p.nameAr || p.nameFr : p.nameFr}</Text>
                  <Text style={styles.topProductCat}>{p.category} • #{p.barcode}</Text>
                </View>

                <View style={styles.topProductSales}>
                  <Text style={styles.soldQtyText}>
                    {p.soldQty} {isRTL ? 'مباع' : 'vendus'}
                  </Text>
                  <Text style={styles.soldTotalText}>{formatMoney(p.soldQty * p.sellPrice)}</Text>
                </View>
              </View>
            ))
          )}

          {/* SALES HISTORY & RETURNS MANAGEMENT */}
          <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time" size={20} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>{t('salesHistory')}</Text>
            </View>

            <TouchableOpacity style={styles.exportSalesBtn} onPress={handleExportSalesCSV}>
              <Ionicons name="download-outline" size={14} color="#ffffff" />
              <Text style={styles.exportSalesBtnText}>CSV</Text>
            </TouchableOpacity>
          </View>

          {/* Search in Sales History */}
          <View style={[styles.searchBar, isRTL && styles.rowReverse]}>
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, isRTL && styles.textRight]}
              placeholder={isRTL ? 'بحث برقم الوصل، البائع أو الزبون...' : 'Recherche par N° ticket, caissier ou client...'}
              value={salesSearchQuery}
              onChangeText={setSalesSearchQuery}
            />
            {salesSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSalesSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {filteredSales.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {isRTL ? 'لا توجد مبيعات مطابقة' : 'Aucune vente enregistrée'}
              </Text>
            </View>
          ) : (
            filteredSales.map((s) => {
              const dateStr = s.date ? new Date(s.date).toLocaleDateString() : '';
              const timeStr = s.date ? new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              const hasReturns = s.returns && s.returns.length > 0;

              return (
                <View key={s.id} style={styles.saleHistoryCard}>
                  <View style={[styles.saleHeaderRow, isRTL && styles.rowReverse]}>
                    <View style={[styles.saleHeaderLeft, isRTL && styles.rowReverse]}>
                      <View style={[styles.txIconBox, s.paymentMethod === 'credit' ? styles.bgCredit : styles.bgCash]}>
                        <Ionicons
                          name={s.paymentMethod === 'credit' ? 'card-outline' : 'cash-outline'}
                          size={18}
                          color="#ffffff"
                        />
                      </View>
                      <View style={isRTL && styles.alignRight}>
                        <Text style={styles.saleIdText}>#{s.id.slice(-6).toUpperCase()}</Text>
                        <Text style={styles.saleDateTimeText}>{dateStr} • {timeStr}</Text>
                      </View>
                    </View>

                    <View style={styles.saleHeaderRight}>
                      <Text style={styles.saleTotalText}>{formatMoney(s.total)}</Text>
                      {hasReturns && (
                        <View style={styles.returnedTag}>
                          <Ionicons name="return-up-back" size={11} color="#b45309" />
                          <Text style={styles.returnedTagText}>{isRTL ? 'تم الإرجاع' : 'Retour effectué'}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Items in this sale preview */}
                  <View style={styles.saleItemsSummaryBox}>
                    <Text style={[styles.saleItemsSummaryText, isRTL && styles.textRight]}>
                      {(s.items || []).map((i) => `${i.nameFr || i.nameAr} (x${i.quantity})`).join(', ')}
                    </Text>
                  </View>

                  {/* Return dates & details preview if returned */}
                  {hasReturns && (
                    <View style={styles.returnDatesContainer}>
                      {s.returns.map((ret, rIdx) => {
                        const retDateStr = ret.dateRetour ? new Date(ret.dateRetour).toLocaleString() : '';
                        return (
                          <View key={rIdx} style={[styles.returnDateRow, isRTL && styles.rowReverse]}>
                            <Ionicons name="calendar-outline" size={13} color="#b45309" />
                            <Text style={styles.returnDateText}>
                              {isRTL ? 'تاريخ الإرجاع:' : 'Date de retour :'} {retDateStr} • {isRTL ? 'استرجاع:' : 'Remboursé :'} -{formatMoney(ret.refundAmount)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={[styles.saleActionsRow, isRTL && styles.rowReverse]}>
                    <TouchableOpacity
                      style={styles.saleDetailBtn}
                      onPress={() => {
                        setSelectedSale(s);
                        const cust = (customers || []).find((c) => c.id === s.customerId);
                        setSharePhone(cust?.phone || '');
                        setShareEmail('');
                      }}
                    >
                      <Ionicons name="receipt-outline" size={14} color={theme.colors.primary} />
                      <Text style={styles.saleDetailBtnText}>{isRTL ? 'عرض التذكرة' : 'Voir Ticket'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.saleReturnBtn}
                      onPress={() => handleOpenReturnModal(s)}
                    >
                      <Ionicons name="return-down-back-outline" size={14} color="#b45309" />
                      <Text style={styles.saleReturnBtnText}>{isRTL ? 'إرجاع سلع' : 'Retour / Avoir'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GRAND LIVRE DES TRANSACTIONS D'ARGENT              */}
      {/* ========================================================= */}
      {activeTab === 'ledger' && (
        <View>
          {/* Ledger KPI Summary Bar */}
          <View style={styles.ledgerSummaryRow}>
            <View style={[styles.ledgerSummaryCard, { borderTopColor: '#059669' }]}>
              <Text style={styles.ledgerSummaryLabel}>{isRTL ? 'إجمالي المقبوضات (+)' : 'Total Entrées (+)'}</Text>
              <Text style={[styles.ledgerSummaryVal, { color: '#059669' }]}>
                +{formatMoney(ledgerTotalIn)}
              </Text>
            </View>

            <View style={[styles.ledgerSummaryCard, { borderTopColor: theme.colors.danger }]}>
              <Text style={styles.ledgerSummaryLabel}>{isRTL ? 'إجمالي المصاريف (-)' : 'Total Sorties (-)'}</Text>
              <Text style={[styles.ledgerSummaryVal, { color: theme.colors.danger }]}>
                -{formatMoney(ledgerTotalOut)}
              </Text>
            </View>

            <View style={[styles.ledgerSummaryCard, { borderTopColor: ledgerNet >= 0 ? theme.colors.primary : theme.colors.danger }]}>
              <Text style={styles.ledgerSummaryLabel}>{isRTL ? 'الرصيد الصافي' : 'Solde Net'}</Text>
              <Text style={[styles.ledgerSummaryVal, { color: ledgerNet >= 0 ? theme.colors.primary : theme.colors.danger }]}>
                {formatMoney(ledgerNet)}
              </Text>
            </View>
          </View>

          {/* Type Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ledgerFilterScroll}>
            {[
              { key: 'all', label: isRTL ? 'الكل' : 'Toutes les opérations' },
              { key: 'sale', label: isRTL ? 'المبيعات' : 'Ventes' },
              { key: 'expense', label: isRTL ? 'المصاريف' : 'Dépenses' },
              { key: 'debt_payment', label: isRTL ? 'تسديد الديون' : 'Paiements Dettes' },
              { key: 'repair_payment', label: isRTL ? 'الصيانة والخدمات' : 'Réparations' },
              { key: 'return', label: isRTL ? 'الاسترجاع' : 'Retours' },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.ledgerFilterChip, ledgerTypeFilter === f.key && styles.ledgerFilterChipActive]}
                onPress={() => setLedgerTypeFilter(f.key)}
              >
                <Text style={[styles.ledgerFilterChipText, ledgerTypeFilter === f.key && styles.ledgerFilterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Ledger Search & Export CSV */}
          <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse, { marginTop: 8 }]}>
            <View style={[styles.searchBar, { flex: 1, marginBottom: 0, marginRight: 8 }, isRTL && styles.rowReverse]}>
              <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, isRTL && styles.textRight]}
                placeholder={isRTL ? 'بحث في الحركات المالية (وصف، رقم، نوع)...' : 'Recherche transaction (libellé, ID)...'}
                value={ledgerSearch}
                onChangeText={setLedgerSearch}
              />
              {ledgerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLedgerSearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.exportSalesBtn} onPress={handleExportLedgerCSV}>
              <Ionicons name="download-outline" size={14} color="#ffffff" />
              <Text style={styles.exportSalesBtnText}>CSV</Text>
            </TouchableOpacity>
          </View>

          {/* Ledger Transactions List */}
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={36} color={theme.colors.textMuted} />
              <Text style={[styles.emptyText, { marginTop: 8 }]}>
                {isRTL ? 'لا توجد حركات مالية مسجلة لهذه الفترة' : 'Aucune transaction trouvée sur cette période'}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((tx) => {
              const d = tx.date ? new Date(tx.date) : new Date();
              const isPositive = Number(tx.amount || 0) >= 0;
              const absAmount = Math.abs(Number(tx.amount || 0));

              let iconName = 'swap-horizontal';
              let badgeColor = '#64748b';
              let badgeLabel = tx.type;

              if (tx.type === 'sale') {
                iconName = 'cart';
                badgeColor = '#059669';
                badgeLabel = isRTL ? 'بيع' : 'Vente';
              } else if (tx.type === 'expense') {
                iconName = 'trending-down';
                badgeColor = theme.colors.danger;
                badgeLabel = isRTL ? 'مصروف' : 'Dépense';
              } else if (tx.type === 'debt_payment') {
                iconName = 'person-circle';
                badgeColor = '#7c3aed';
                badgeLabel = isRTL ? 'تسديد دين' : 'Règlement';
              } else if (tx.type === 'repair_payment') {
                iconName = 'build';
                badgeColor = '#0284c7';
                badgeLabel = isRTL ? 'صيانة' : 'Réparation';
              } else if (tx.type === 'return') {
                iconName = 'return-up-back';
                badgeColor = '#d97706';
                badgeLabel = isRTL ? 'إرجاع سلع' : 'Retour';
              }

              return (
                <View key={tx.id || Math.random()} style={styles.ledgerTxCard}>
                  <View style={[styles.ledgerTxHeader, isRTL && styles.rowReverse]}>
                    <View style={[styles.ledgerTxLeft, isRTL && styles.rowReverse]}>
                      <View style={[styles.ledgerTxIconBox, { backgroundColor: badgeColor + '20' }]}>
                        <Ionicons name={iconName} size={18} color={badgeColor} />
                      </View>
                      <View style={isRTL && styles.alignRight}>
                        <Text style={styles.ledgerTxDesc}>
                          {tx.description || (isRTL ? 'حركة مالية' : 'Transaction')}
                        </Text>
                        <Text style={styles.ledgerTxDate}>
                          {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.paymentMethod || 'cash'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.ledgerTxRight, isRTL && { alignItems: 'flex-start' }]}>
                      <Text style={[styles.ledgerTxAmount, { color: isPositive ? '#059669' : theme.colors.danger }]}>
                        {isPositive ? '+' : '-'}{formatMoney(absAmount)}
                      </Text>
                      <View style={[styles.ledgerBadge, { backgroundColor: badgeColor + '15' }]}>
                        <Text style={[styles.ledgerBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                      </View>
                    </View>
                  </View>

                  {(tx.cashier || tx.user) && (
                    <View style={[styles.ledgerTxFooter, isRTL && styles.rowReverse]}>
                      <Ionicons name="person-outline" size={11} color={theme.colors.textMuted} />
                      <Text style={styles.ledgerTxCashierText}>
                        {isRTL ? 'بواسطة:' : 'Opérateur :'} {tx.cashier || tx.user}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Return Modal (Effectuer un retour avec dates & réintégration au stock) */}
      <Modal visible={returnModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="return-up-back" size={22} color="#b45309" style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle}>
                  {isRTL ? 'إجراء إرجاع سلع للوصل' : 'Effectuer un Retour / Avoir'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReturnModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {returnSaleTarget && (
              <ScrollView style={{ maxHeight: 440 }}>
                <View style={styles.returnInfoNotice}>
                  <Text style={styles.returnNoticeTitle}>
                    {isRTL ? 'تاريخ الإرجاع المسجل:' : 'Date de retour enregistrée :'} {new Date().toLocaleString()}
                  </Text>
                  <Text style={styles.returnNoticeSub}>
                    {isRTL
                      ? 'سيتم إعادة السلع المرجعة تلقائياً إلى المخزون وتسجيل حركة في المعاملات المالية.'
                      : 'Les quantités retournées seront réintégrées automatiquement au stock.'}
                  </Text>
                </View>

                {/* Items to return selection */}
                <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                  {isRTL ? 'السلع والكميات المرجعة:' : 'Articles & Quantités à retourner :'}
                </Text>
                {(returnSaleTarget.items || []).map((item) => (
                  <View key={item.id} style={[styles.returnItemRow, isRTL && styles.rowReverse]}>
                    <View style={styles.returnItemDesc}>
                      <Text style={styles.returnItemName}>{item.nameFr || item.nameAr}</Text>
                      <Text style={styles.returnItemPrice}>
                        {formatMoney(item.sellPrice)} • {isRTL ? 'الكمية الأصلية:' : 'Acheté :'} x{item.quantity}
                      </Text>
                    </View>

                    <View style={styles.returnQtyBox}>
                      <Text style={styles.returnQtyLabel}>{isRTL ? 'كمية الإرجاع:' : 'Retourner :'}</Text>
                      <TextInput
                        style={styles.returnQtyInput}
                        keyboardType="numeric"
                        value={returnQtyInputs[item.id] !== undefined ? returnQtyInputs[item.id] : String(item.quantity)}
                        onChangeText={(txt) => setReturnQtyInputs({ ...returnQtyInputs, [item.id]: txt })}
                      />
                    </View>
                  </View>
                ))}

                <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('returnReason')}</Text>
                <TextInput
                  style={[styles.inputBox, isRTL && styles.textRight]}
                  placeholder={isRTL ? 'سبب الإرجاع (منتج معطوب، تبديل، رغبة الزبون...)' : 'Motif (Défectueux, échange, demande client...)'}
                  value={returnReason}
                  onChangeText={setReturnReason}
                />

                <TouchableOpacity style={styles.confirmReturnBtn} onPress={handleConfirmReturn}>
                  <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                  <Text style={styles.confirmReturnBtnText}>{t('confirmReturn')}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Professional Thermal Receipt Modal */}
      <ProfessionalReceiptModal
        visible={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
        storeInfo={storeInfo}
        customers={customers}
        currency={currency}
        isRTL={isRTL}
        t={t}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  toastBanner: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    marginBottom: 12,
  },
  toastText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
  mainTabRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 4,
    borderRadius: theme.borderRadius.full,
    marginBottom: 12,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
  },
  mainTabBtnActive: {
    backgroundColor: theme.colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  mainTabBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  mainTabBtnTextActive: {
    color: '#ffffff',
  },
  ledgerSummaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  ledgerSummaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  ledgerSummaryLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  ledgerSummaryVal: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  ledgerFilterScroll: {
    marginBottom: 10,
  },
  ledgerFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  ledgerFilterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  ledgerFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  ledgerFilterChipTextActive: {
    color: '#ffffff',
  },
  ledgerTxCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ledgerTxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerTxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ledgerTxIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  ledgerTxDesc: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  ledgerTxDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  ledgerTxRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  ledgerTxAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  ledgerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  ledgerBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  ledgerTxFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  ledgerTxCashierText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  periodTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  periodTabTextActive: {
    color: '#ffffff',
  },
  netProfitCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    elevation: 2,
  },
  netProfitLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
  },
  netProfitAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: theme.spacing.xs,
  },
  netProfitDesc: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statLabel: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statVal: {
    fontSize: theme.typography.header,
    fontWeight: 'bold',
  },
  statSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  exportSalesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
  },
  exportSalesBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 40,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 6,
    fontSize: 13,
  },
  inventoryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  invLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  invVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  topProductMeta: {
    flex: 1,
  },
  topProductName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  topProductCat: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  topProductSales: {
    alignItems: 'flex-end',
  },
  soldQtyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  soldTotalText: {
    fontSize: 11,
    color: theme.colors.primary,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  saleHistoryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 1,
  },
  saleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bgCash: {
    backgroundColor: '#059669',
  },
  bgCredit: {
    backgroundColor: '#d97706',
  },
  saleIdText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  saleDateTimeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  saleHeaderRight: {
    alignItems: 'flex-end',
  },
  saleTotalText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  returnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  returnedTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#b45309',
    marginLeft: 2,
  },
  saleItemsSummaryBox: {
    marginVertical: 6,
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 6,
  },
  saleItemsSummaryText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  returnDatesContainer: {
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  returnDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  returnDateText: {
    fontSize: 11,
    color: '#b45309',
    marginLeft: 4,
    fontWeight: '600',
  },
  saleActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  saleDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    marginRight: 6,
  },
  saleDetailBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  saleReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#fef3c7',
  },
  saleReturnBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#b45309',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  returnInfoNotice: {
    backgroundColor: '#fffbeb',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  returnNoticeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#b45309',
  },
  returnNoticeSub: {
    fontSize: 11,
    color: '#92400e',
    marginTop: 2,
  },
  returnItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  returnItemDesc: {
    flex: 1,
  },
  returnItemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  returnItemPrice: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  returnQtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  returnQtyLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  returnQtyInput: {
    width: 44,
    height: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 13,
    backgroundColor: '#ffffff',
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
    fontWeight: '600',
  },
  inputBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 13,
    backgroundColor: '#ffffff',
  },
  confirmReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b45309',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.full,
    marginTop: 16,
  },
  confirmReturnBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  receiptContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  receiptContent: {
    paddingBottom: 20,
  },
  receiptStoreName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: theme.colors.text,
  },
  receiptSub: {
    fontSize: 12,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  receiptDivider: {
    textAlign: 'center',
    color: theme.colors.border,
    marginVertical: 4,
  },
  receiptDate: {
    fontSize: 11,
    textAlign: 'center',
    color: theme.colors.textMuted,
  },
  receiptCashierText: {
    fontSize: 11,
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  receiptItemName: {
    fontSize: 12,
    color: theme.colors.text,
    flex: 1,
  },
  receiptItemTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  receiptDiscountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  receiptDiscountLabel: {
    fontSize: 12,
    color: theme.colors.danger,
  },
  receiptDiscountVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.danger,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 4,
  },
  receiptTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  receiptTotalVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  receiptReturnsBox: {
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  receiptReturnsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#b45309',
    textAlign: 'center',
    marginBottom: 4,
  },
  receiptReturnLine: {
    fontSize: 10,
    color: '#b45309',
  },
  receiptFooter: {
    fontSize: 11,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginVertical: 8,
  },
  shareSectionBox: {
    marginTop: 10,
  },
  shareInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    marginRight: 6,
  },
  whatsAppShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  emailShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  receiptActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  receiptPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginRight: 6,
  },
  receiptPrintBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  receiptCopyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginRight: 6,
  },
  receiptCopyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 4,
  },
  receiptCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptCloseBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
});
