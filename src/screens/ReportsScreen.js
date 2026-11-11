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
    isRTL,
    storeInfo,
    firebaseConnected,
    syncStatus,
    lastSyncTime,
    refreshAllFromFirebase,
  } = useApp();

  const [period, setPeriod] = useState('month'); // 'today' | 'week' | 'month' | 'all'
  const [selectedSale, setSelectedSale] = useState(null);
  const [sharePhone, setSharePhone] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [copiedTicket, setCopiedTicket] = useState(false);

  // Filter sales & expenses by period
  const now = new Date();
  const validSales = Array.isArray(sales) ? sales : [];
  const validProducts = Array.isArray(products) ? products : [];
  const validExpenses = Array.isArray(expenses) ? expenses : [];

  const filteredSales = validSales.filter((s) => {
    if (!s || !s.date) return false;
    const saleDate = new Date(s.date);
    if (period === 'today') {
      return saleDate.toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return saleDate >= oneWeekAgo;
    }
    if (period === 'month') {
      return (
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear()
      );
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

  // Generate Receipt Text for sharing
  const generateReceiptText = (sale) => {
    if (!sale) return '';
    const dateStr = sale.date ? new Date(sale.date).toLocaleString() : new Date().toLocaleString();
    const cust = (customers || []).find((c) => c.id === sale.customerId);

    const lines = [];
    lines.push(`🧾 *${storeInfo.name || 'Store Soft'}*`);
    if (storeInfo.address) lines.push(`📍 ${storeInfo.address}`);
    if (storeInfo.phone) lines.push(`📞 ${storeInfo.phone}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📅 Date : ${dateStr}`);
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
    const subject = `Facture / Ticket - ${storeInfo.name || 'Store Soft'}`;
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
      'Date',
      'Heure',
      'Caissier',
      'Mode Paiement',
      'Nombre Articles',
      'Sous-Total',
      'Remise',
      'Total Net DZD',
      'Marge Benefice DZD',
    ];

    const rows = filteredSales.map((s) => {
      const d = s.date ? new Date(s.date) : new Date();
      return [
        `"${s.id || ''}"`,
        `"${d.toLocaleDateString()}"`,
        `"${d.toLocaleTimeString()}"`,
        `"${(s.cashierName || s.cashier || 'Admin').replace(/"/g, '""')}"`,
        `"${s.paymentMethod || 'cash'}"`,
        (s.items || []).length,
        s.subtotal || s.total || 0,
        s.discount || 0,
        s.total || 0,
        s.profit || 0,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `rapport_ventes_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('CSV', isRTL ? 'تم تصدير تقرير المبيعات بنجاح!' : 'Rapport des ventes exporté avec succès !');
    }
  };

  // Print Summary Financial Report
  const handlePrintSummary = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
      window.print();
    } else {
      Alert.alert(
        isRTL ? 'طباعة التقرير' : 'Imprimer le bilan',
        isRTL
          ? `الإيرادات: ${formatMoney(totalRevenue)}\nالمصاريف: ${formatMoney(totalExpenses)}\nالأرباح الصافية: ${formatMoney(netProfit)}`
          : `Revenus : ${formatMoney(totalRevenue)}\nCharges : ${formatMoney(totalExpenses)}\nBénéfice Net : ${formatMoney(netProfit)}`
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Live Two-Way Sync Bar with Refresh */}
      <View style={[styles.syncStatusBanner, isRTL && styles.rowReverse]}>
        <View style={[styles.syncStatusLeft, isRTL && styles.rowReverse]}>
          <View
            style={[
              styles.syncDot,
              syncStatus === 'sending' || syncStatus === 'receiving'
                ? styles.syncDotBlue
                : firebaseConnected
                ? styles.syncDotGreen
                : styles.syncDotGray,
            ]}
          />
          <Text style={styles.syncStatusText}>
            {syncStatus === 'sending'
              ? (isRTL ? 'تحديث الإحصائيات...' : 'Mise à jour en cours...')
              : syncStatus === 'receiving'
              ? (isRTL ? 'مزامنة المعاملات مباشرة مع فايربيس...' : 'Synchronisation directe Firebase...')
              : firebaseConnected
              ? (isRTL ? 'إحصائيات مباشرة من فايربيس' : 'Statistiques directes Firebase')
              : (isRTL ? 'الوضع المحلي' : 'Mode Local')}
          </Text>
        </View>

        <TouchableOpacity style={styles.syncRefreshBtn} onPress={refreshAllFromFirebase}>
          <Ionicons name="refresh" size={14} color={theme.colors.secondary} />
          {lastSyncTime && <Text style={styles.syncTimeText}>{lastSyncTime}</Text>}
        </TouchableOpacity>
      </View>

      {/* Period Selector Tabs & Print Report Button */}
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

        <TouchableOpacity style={styles.printSummaryBtn} onPress={handlePrintSummary} title="Imprimer">
          <Ionicons name="print-outline" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Net Profit Big Banner */}
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
            ? 'الأرباح المحققة بعد خصم سعر الشراء وإجمالي المصاريف'
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

      {/* Inventory Valuation Section */}
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

      {/* Transactions & Cashiers log with CSV Export */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
        <Text style={styles.sectionTitle}>
          {isRTL ? 'سجل المعاملات والصيارفة' : 'Historique des Ventes & Caissiers'}
        </Text>

        <TouchableOpacity style={styles.exportSalesBtn} onPress={handleExportSalesCSV}>
          <Ionicons name="download-outline" size={14} color="#ffffff" />
          <Text style={styles.exportSalesBtnText}>CSV</Text>
        </TouchableOpacity>
      </View>

      {filteredSales.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {isRTL ? 'لا توجد معاملات مسجلة' : 'Aucune transaction enregistrée'}
          </Text>
        </View>
      ) : (
        filteredSales.slice(0, 15).map((s) => {
          const dateStr = s.date ? new Date(s.date).toLocaleDateString() : '';
          const timeStr = s.date ? new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.transactionCard, isRTL && styles.rowReverse]}
              onPress={() => {
                setSelectedSale(s);
                const cust = (customers || []).find((c) => c.id === s.customerId);
                setSharePhone(cust?.phone || '');
                setShareEmail('');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.txIconBox, s.paymentMethod === 'credit' ? styles.bgCredit : styles.bgCash]}>
                <Ionicons
                  name={s.paymentMethod === 'credit' ? 'card-outline' : 'cash-outline'}
                  size={20}
                  color="#ffffff"
                />
              </View>

              <View style={[styles.txMeta, isRTL && styles.alignRight]}>
                <Text style={styles.txTotal}>{formatMoney(s.total)}</Text>
                <Text style={styles.txDetails}>
                  {(s.items || []).length} {isRTL ? 'سلع' : 'articles'} • {dateStr} {timeStr}
                </Text>
                <View style={[styles.cashierBadge, isRTL && styles.rowReverse]}>
                  <Ionicons name="person" size={11} color={theme.colors.primary} />
                  <Text style={styles.cashierBadgeText}>
                    {isRTL ? 'البائع:' : 'Caissier :'} {s.cashierName || s.cashier || 'Admin'}
                  </Text>
                </View>
              </View>

              <View style={styles.txProfitBox}>
                <Text style={styles.txProfitText}>+{formatMoney(s.profit || 0)}</Text>
                <View style={styles.ticketActionPill}>
                  <Ionicons name="receipt-outline" size={12} color={theme.colors.primary} />
                  <Text style={styles.ticketActionPillText}>
                    {isRTL ? 'التذكرة' : 'Ticket'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Sale Detail / Receipt Modal (Print, WhatsApp, Email) */}
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

              <Text style={styles.receiptMethod}>
                {t('paymentMethod')}: {selectedSale?.paymentMethod === 'cash' ? t('cash') : t('credit')}
              </Text>

              <Text style={styles.receiptDivider}>--------------------------------</Text>
              <Text style={styles.receiptFooter}>{storeInfo.footer || 'Merci pour votre visite !'}</Text>

              {/* Direct WhatsApp & Email Send */}
              <View style={styles.shareSectionBox}>
                <Text style={[styles.shareSectionTitle, isRTL && styles.textRight]}>
                  {isRTL ? 'إرسال الفاتورة للزبون :' : 'Envoyer la facture au client :'}
                </Text>

                <View style={[styles.shareInputRow, isRTL && styles.rowReverse]}>
                  <View style={styles.shareInputWrapper}>
                    <Ionicons name="logo-whatsapp" size={16} color="#25D366" style={{ marginHorizontal: 6 }} />
                    <TextInput
                      style={[styles.shareInput, isRTL && styles.textRight]}
                      placeholder="0555... / +213"
                      keyboardType="phone-pad"
                      value={sharePhone}
                      onChangeText={setSharePhone}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.whatsAppShareBtn}
                    onPress={() => handleSendWhatsApp(selectedSale)}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#ffffff" />
                    <Text style={styles.shareBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.shareInputRow, isRTL && styles.rowReverse]}>
                  <View style={styles.shareInputWrapper}>
                    <Ionicons name="mail-outline" size={16} color="#3b82f6" style={{ marginHorizontal: 6 }} />
                    <TextInput
                      style={[styles.shareInput, isRTL && styles.textRight]}
                      placeholder="email@client.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={shareEmail}
                      onChangeText={setShareEmail}
                    />
                  </View>
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
  syncStatusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  syncStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncDotGreen: {
    backgroundColor: theme.colors.success,
  },
  syncDotBlue: {
    backgroundColor: theme.colors.secondary,
  },
  syncDotGray: {
    backgroundColor: theme.colors.textMuted,
  },
  syncStatusText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  syncRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncTimeText: {
    fontSize: 10,
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
  printSummaryBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
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
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
  },
  exportSalesBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 3,
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
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  invLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  invVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.secondary,
  },
  topProductMeta: {
    flex: 1,
  },
  topProductName: {
    fontSize: theme.typography.regular,
    fontWeight: '600',
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
    fontSize: theme.typography.small,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  soldTotalText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  transactionCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bgCash: {
    backgroundColor: theme.colors.primary,
  },
  bgCredit: {
    backgroundColor: theme.colors.danger,
  },
  txMeta: {
    flex: 1,
  },
  txTotal: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  txDetails: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  cashierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cashierBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 3,
  },
  txProfitBox: {
    alignItems: 'flex-end',
  },
  txProfitText: {
    fontSize: theme.typography.small,
    fontWeight: 'bold',
    color: theme.colors.secondary,
  },
  ticketActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: theme.borderRadius.sm,
    marginTop: 4,
  },
  ticketActionPillText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  /* Receipt Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  receiptContainer: {
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    elevation: 8,
  },
  receiptContent: {
    alignItems: 'center',
  },
  receiptStoreName: {
    fontSize: theme.typography.header,
    fontWeight: 'bold',
    color: '#000000',
  },
  receiptSub: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
    textAlign: 'center',
  },
  receiptDivider: {
    color: '#999999',
    letterSpacing: 2,
    marginVertical: 4,
  },
  receiptDate: {
    fontSize: 11,
    color: '#444444',
  },
  receiptCashierText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 2,
  },
  receiptItemName: {
    fontSize: 12,
    color: '#222222',
  },
  receiptItemTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#222222',
  },
  receiptDiscountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 2,
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
    width: '100%',
    marginVertical: 4,
  },
  receiptTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  receiptTotalVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  receiptMethod: {
    fontSize: 11,
    color: '#666666',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  receiptFooter: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },
  shareSectionBox: {
    width: '100%',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  shareSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  shareInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 4,
  },
  shareInput: {
    flex: 1,
    height: 36,
    fontSize: 12,
    color: theme.colors.text,
  },
  whatsAppShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    marginLeft: 6,
  },
  emailShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.sm,
    marginLeft: 6,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  receiptActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    gap: 6,
  },
  receiptPrintBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  receiptPrintBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
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
    backgroundColor: '#f8fafc',
  },
  receiptCopyBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 4,
  },
  receiptCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
  },
  receiptCloseBtnText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
});
