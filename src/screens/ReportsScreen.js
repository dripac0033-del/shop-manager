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

export default function ReportsScreen() {
  const {
    t,
    formatMoney,
    sales = [],
    products = [],
    expenses = [],
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
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
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

  const filteredSales = validSales.filter((s) => {
    if (!s || !s.date) return false;
    const saleDate = new Date(s.date);
    let matchPeriod = true;

    if (period === 'today') {
      matchPeriod = saleDate.toDateString() === now.toDateString();
    } else if (period === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchPeriod = saleDate >= oneWeekAgo;
    } else if (period === 'month') {
      matchPeriod =
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear();
    }

    if (!matchPeriod) return false;

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
    const expDate = new Date(e.date);
    if (period === 'today') {
      return expDate.toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return expDate >= oneWeekAgo;
    }
    if (period === 'month') {
      return (
        expDate.getMonth() === now.getMonth() &&
        expDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  // Financial aggregates
  const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const grossProfit = filteredSales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = grossProfit - totalExpenses;

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

      {/* Net Profit Banner */}
      <View
        style={[
          styles.netProfitCard,
          { backgroundColor: netProfit >= 0 ? theme.colors.primary : theme.colors.danger },
        ]}
      >
        <Text style={styles.netProfitLabel}>{t('profit')}</Text>
        <Text style={styles.netProfitAmount}>{formatMoney(netProfit)}</Text>
        <Text style={styles.netProfitDesc}>
          {isRTL
            ? 'الأرباح الصافية بعد خصم سعر الشراء وإجمالي المصاريف'
            : 'Bénéfice calculé : Ventes - Prix Achat - Dépenses'}
        </Text>
      </View>

      {/* Financial Details Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('revenue')}</Text>
          <Text style={[styles.statVal, { color: theme.colors.primary }]}>
            {formatMoney(totalRevenue)}
          </Text>
          <Text style={styles.statSub}>
            {filteredSales.length} {isRTL ? 'عمليات بيع' : 'ventes'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('totalExpenses')}</Text>
          <Text style={[styles.statVal, { color: theme.colors.danger }]}>
            {formatMoney(totalExpenses)}
          </Text>
          <Text style={styles.statSub}>
            {filteredExpenses.length} {isRTL ? 'مصاريف مسجلة' : 'charges'}
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

      {/* Sale Detail / Receipt Modal */}
      <Modal visible={!!selectedSale} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptContainer}>
            <ScrollView contentContainerStyle={styles.receiptContent}>
              <Text style={styles.receiptStoreName}>{storeInfo.name || 'Store Soft'}</Text>
              <Text style={styles.receiptSub}>
                {storeInfo.phone} • {storeInfo.address}
              </Text>
              <Text style={styles.receiptDivider}>--------------------------------</Text>
              <Text style={styles.receiptDate}>
                {selectedSale?.date ? new Date(selectedSale.date).toLocaleString() : ''}
              </Text>
              {selectedSale?.cashierName && (
                <Text style={styles.receiptCashierText}>
                  {isRTL ? 'البائع:' : 'Caissier :'} {selectedSale.cashierName}
                </Text>
              )}
              <Text style={styles.receiptDivider}>--------------------------------</Text>

              {(selectedSale?.items || []).map((item, index) => (
                <View key={index} style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemName}>
                    {item.nameFr || item.nameAr} x{item.quantity}
                  </Text>
                  <Text style={styles.receiptItemTotal}>
                    {formatMoney(item.sellPrice * item.quantity)}
                  </Text>
                </View>
              ))}

              <Text style={styles.receiptDivider}>--------------------------------</Text>

              {selectedSale?.discount > 0 && (
                <View style={styles.receiptDiscountRow}>
                  <Text style={styles.receiptDiscountLabel}>{t('discount')}</Text>
                  <Text style={styles.receiptDiscountVal}>
                    -{formatMoney(selectedSale.discount)}
                  </Text>
                </View>
              )}

              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>{t('total')}</Text>
                <Text style={styles.receiptTotalVal}>{formatMoney(selectedSale?.total || 0)}</Text>
              </View>

              {/* Return dates history displayed in receipt */}
              {selectedSale?.returns && selectedSale.returns.length > 0 && (
                <View style={styles.receiptReturnsBox}>
                  <Text style={styles.receiptReturnsTitle}>*** RETOURS EFFECTUES ***</Text>
                  {selectedSale.returns.map((ret, idx) => (
                    <Text key={idx} style={styles.receiptReturnLine}>
                      Date: {ret.dateRetour ? new Date(ret.dateRetour).toLocaleString() : ''} | Remboursé: -{formatMoney(ret.refundAmount)}
                    </Text>
                  ))}
                </View>
              )}

              <Text style={styles.receiptDivider}>--------------------------------</Text>
              <Text style={styles.receiptFooter}>{storeInfo.footer || 'Merci pour votre visite !'}</Text>

              {/* Direct WhatsApp & Email Send */}
              <View style={styles.shareSectionBox}>
                <View style={[styles.shareInputRow, isRTL && styles.rowReverse]}>
                  <TextInput
                    style={[styles.shareInput, isRTL && styles.textRight]}
                    placeholder="0555... / WhatsApp"
                    keyboardType="phone-pad"
                    value={sharePhone}
                    onChangeText={setSharePhone}
                  />
                  <TouchableOpacity
                    style={styles.whatsAppShareBtn}
                    onPress={() => handleSendWhatsApp(selectedSale)}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#ffffff" />
                    <Text style={styles.shareBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.shareInputRow, isRTL && styles.rowReverse]}>
                  <TextInput
                    style={[styles.shareInput, isRTL && styles.textRight]}
                    placeholder="email@client.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={shareEmail}
                    onChangeText={setShareEmail}
                  />
                  <TouchableOpacity
                    style={styles.emailShareBtn}
                    onPress={() => handleSendEmail(selectedSale)}
                  >
                    <Ionicons name="mail" size={14} color="#ffffff" />
                    <Text style={styles.shareBtnText}>Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View style={styles.receiptActions}>
              <TouchableOpacity
                style={styles.receiptPrintBtn}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
                    window.print();
                    return;
                  }
                  Alert.alert(t('printReceipt'), isRTL ? 'تم إرسال أمر الطباعة!' : 'Impression envoyée !');
                }}
              >
                <Ionicons name="print" size={18} color="#ffffff" />
                <Text style={styles.receiptPrintBtnText}>{t('printReceipt')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.receiptCopyBtn}
                onPress={() => handleCopyTicket(selectedSale)}
              >
                <Ionicons
                  name={copiedTicket ? 'checkmark' : 'copy-outline'}
                  size={18}
                  color={copiedTicket ? '#22c55e' : theme.colors.text}
                />
                <Text style={[styles.receiptCopyBtnText, copiedTicket && { color: '#22c55e' }]}>
                  {copiedTicket ? (isRTL ? 'تم النسخ' : 'Copié') : (isRTL ? 'نسخ' : 'Copier')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.receiptCloseBtn}
                onPress={() => setSelectedSale(null)}
              >
                <Text style={styles.receiptCloseBtnText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
