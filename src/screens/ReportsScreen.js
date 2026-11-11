import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
    isRTL,
    firebaseConnected,
    syncStatus,
    lastSyncTime,
    refreshAllFromFirebase,
  } = useApp();

  const [period, setPeriod] = useState('month'); // 'today' | 'week' | 'month' | 'all'

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
          {lastSyncTime && (
            <Text style={styles.syncTimeText}>{lastSyncTime}</Text>
          )}
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

      {/* Transactions & Cashiers log */}
      <Text style={[styles.sectionTitle, isRTL && styles.textRight, { marginTop: 20 }]}>
        {isRTL ? 'سجل المعاملات والصيارفة' : 'Historique des Ventes & Caissiers'}
      </Text>
      {filteredSales.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {isRTL ? 'لا توجد معاملات مسجلة' : 'Aucune transaction enregistrée'}
          </Text>
        </View>
      ) : (
        filteredSales.slice(0, 10).map((s) => {
          const dateStr = s.date ? new Date(s.date).toLocaleDateString() : '';
          const timeStr = s.date ? new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          return (
            <View key={s.id} style={[styles.transactionCard, isRTL && styles.rowReverse]}>
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
                <Text style={styles.txMethodText}>
                  {s.paymentMethod === 'credit' ? t('credit') : t('cash')}
                </Text>
              </View>
            </View>
          );
        })
      )}
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
    elevation: 3,
  },
  netProfitLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: theme.typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  netProfitAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  netProfitDesc: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    elevation: 1,
  },
  statLabel: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
  },
  statVal: {
    fontSize: theme.typography.title,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  inventoryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    elevation: 1,
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
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
  },
  invVal: {
    fontSize: theme.typography.small,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
  },
  topProductRow: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
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
  txMethodText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
