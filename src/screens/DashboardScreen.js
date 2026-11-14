import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen({ navigation }) {
  const {
    t,
    formatMoney,
    products = [],
    customers = [],
    expenses = [],
    sales = [],
    repairs = [],
    services = [],
    transactions = [],
    isRTL,
    storeInfo,
    openStockModal,
    firebaseConnected,
    firebaseError,
    firebaseErrorDetails,
    syncStatus,
    lastSyncTime,
    refreshAllFromFirebase,
    cloudflareConnected,
    cloudflareError,
  } = useApp();

  // Metrics calculation
  const today = new Date().toISOString().split('T')[0];
  const validSales = Array.isArray(sales) ? sales : [];
  const validProducts = Array.isArray(products) ? products : [];
  const validCustomers = Array.isArray(customers) ? customers : [];
  const validRepairs = Array.isArray(repairs) ? repairs : [];
  const validTransactions = Array.isArray(transactions) ? transactions : [];
  const validExpenses = Array.isArray(expenses) ? expenses : [];

  const todaySales = validSales.filter((s) => (s.date || '').startsWith(today));
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const todayProfit = todaySales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
  const totalCustomerDebt = validCustomers.reduce((sum, c) => sum + Number(c.debt || 0), 0);
  const lowStockCount = validProducts.filter((p) => Number(p.stock || 0) <= Number(p.minStock || 5)).length;
  const pendingRepairsCount = validRepairs.filter((r) => r.status !== 'delivered' && r.status !== 'cancelled').length;

  // Real Money Transactions for Today
  const todayTransactions = validTransactions.filter((tx) => (tx.date || '').startsWith(today));
  const todayCashFromSales = todaySales.reduce((sum, s) => {
    if (s.paymentMethod === 'cash') return sum + Number(s.total || 0);
    return sum + Number(s.paidAmount || 0);
  }, 0);
  const todayDebtPayments = todayTransactions
    .filter((tx) => tx.type === 'debt_payment')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const todayRepairIncome = todayTransactions
    .filter((tx) => tx.type === 'repair_payment')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const todayCashIn = todayCashFromSales + todayDebtPayments + todayRepairIncome;

  const todayExpenses = validExpenses
    .filter((e) => (e.date || '').startsWith(today))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const todayNetCashFlow = todayCashIn - todayExpenses;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={[styles.headerBanner, isRTL && styles.rowReverse]}>
        <View style={styles.storeDetails}>
          <Text style={styles.welcomeText}>{isRTL ? 'مرحباً بك في' : 'Bienvenue sur'}</Text>
          <Text style={styles.storeName}>{storeInfo.name || 'Store Soft'}</Text>
          <Text style={styles.storePhone}>
            {storeInfo.phone || ''} {storeInfo.address ? `• ${storeInfo.address}` : ''}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsIconBtn} 
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Hybrid Cloud Status Bar */}
      <TouchableOpacity
        style={[styles.hybridStatusBar, isRTL && styles.rowReverse]}
        onPress={() => navigation.navigate('Settings')}
        activeOpacity={0.8}
      >
        <View style={[styles.hybridPill, isRTL && styles.rowReverse]}>
          <Ionicons
            name="logo-firebase"
            size={14}
            color={firebaseConnected ? '#10b981' : '#f59e0b'}
          />
          <Text style={styles.hybridPillLabel}>Firebase (Auth):</Text>
          <Text
            style={[
              styles.hybridPillVal,
              { color: firebaseConnected ? '#10b981' : '#f59e0b' },
            ]}
          >
            {firebaseConnected ? (isRTL ? 'متصل' : 'Actif') : (isRTL ? 'محلي' : 'Local')}
          </Text>
        </View>

        <View style={styles.hybridDivider} />

        <View style={[styles.hybridPill, isRTL && styles.rowReverse]}>
          <Ionicons
            name="cloud-outline"
            size={14}
            color={cloudflareConnected ? '#f97316' : '#94a3b8'}
          />
          <Text style={styles.hybridPillLabel}>Cloudflare D1:</Text>
          <Text
            style={[
              styles.hybridPillVal,
              { color: cloudflareConnected ? '#f97316' : '#94a3b8' },
            ]}
          >
            {cloudflareConnected ? (isRTL ? 'متصل' : 'Actif') : (isRTL ? 'غير متصل' : 'Inactif')}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Cloud Sync Warning Banner */}
      {!firebaseConnected && firebaseError && (
        <TouchableOpacity
          style={[styles.syncWarningBanner, isRTL && styles.rowReverse]}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.85}
        >
          <View style={styles.syncWarningIconBox}>
            <Ionicons name="cloud-offline" size={22} color="#dc2626" />
          </View>
          <View style={[{ flex: 1, marginHorizontal: 10 }]}>
            <Text style={[styles.syncWarningTitle, isRTL && styles.textRight]}>
              {isRTL ? '⚠️ المزامنة السحابية غير مفعلة' : '⚠️ Cloud non synchronisé (Données non partagées)'}
            </Text>
            <Text style={[styles.syncWarningSub, isRTL && styles.textRight]}>
              {isRTL
                ? 'قاعدة بيانات Firestore غير مفعلة. البيانات لا تظهر على الكمبيوتر. اضغط هنا للإصلاح.'
                : 'La base Firestore n\'est pas activée. Vos données ne s\'affichent pas sur le PC. Cliquez ici.'}
            </Text>
          </View>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color="#991b1b" />
        </TouchableOpacity>
      )}

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        {/* Today's Sales */}
        <TouchableOpacity
          style={[styles.kpiCard, { borderLeftColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('Reports')}
        >
          <View style={[styles.kpiHeader, isRTL && styles.rowReverse]}>
            <Text style={styles.kpiTitle}>{t('todaySales')}</Text>
            <View style={[styles.kpiIconWrapper, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="cart" size={20} color={theme.colors.primary} />
            </View>
          </View>
          <Text style={styles.kpiValue}>{formatMoney(todayRevenue)}</Text>
          <Text style={styles.kpiSubtitle}>{todaySales.length} {t('itemsCount')}</Text>
        </TouchableOpacity>

        {/* Today's Profit */}
        <View style={[styles.kpiCard, { borderLeftColor: theme.colors.secondary }]}>
          <View style={[styles.kpiHeader, isRTL && styles.rowReverse]}>
            <Text style={styles.kpiTitle}>{t('todayProfit')}</Text>
            <View style={[styles.kpiIconWrapper, { backgroundColor: theme.colors.secondaryLight }]}>
              <Ionicons name="trending-up" size={20} color={theme.colors.secondary} />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: theme.colors.secondary }]}>{formatMoney(todayProfit)}</Text>
          <Text style={styles.kpiSubtitle}>{isRTL ? 'صافي هامش الربح' : 'Marge nette estimée'}</Text>
        </View>

        {/* Today's Real Cash Inflow */}
        <TouchableOpacity
          style={[styles.kpiCard, { borderLeftColor: '#059669' }]}
          onPress={() => navigation.navigate('Reports')}
        >
          <View style={[styles.kpiHeader, isRTL && styles.rowReverse]}>
            <Text style={styles.kpiTitle}>{t('cashInflow') || 'Encaissements Réels'}</Text>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="cash" size={20} color="#059669" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>{formatMoney(todayCashIn)}</Text>
          <Text style={styles.kpiSubtitle}>{isRTL ? 'مقبوضات نقدية فعلية' : "Espèces reçues aujourd'hui"}</Text>
        </TouchableOpacity>

        {/* Today's Net Cash Flow */}
        <TouchableOpacity
          style={[styles.kpiCard, { borderLeftColor: todayNetCashFlow >= 0 ? '#0284c7' : theme.colors.danger }]}
          onPress={() => navigation.navigate('Reports')}
        >
          <View style={[styles.kpiHeader, isRTL && styles.rowReverse]}>
            <Text style={styles.kpiTitle}>{t('netCashFlow') || 'Trésorerie Nette'}</Text>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="swap-vertical" size={20} color="#0284c7" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: todayNetCashFlow >= 0 ? '#0284c7' : theme.colors.danger }]}>
            {formatMoney(todayNetCashFlow)}
          </Text>
          <Text style={styles.kpiSubtitle}>{isRTL ? 'صافي السيولة النقدية' : 'Entrées - Sorties du jour'}</Text>
        </TouchableOpacity>

        {/* Customer Debts */}
        <TouchableOpacity 
          style={[styles.kpiCard, { borderLeftColor: theme.colors.danger }]}
          onPress={() => navigation.navigate('Customers')}
        >
          <View style={[styles.kpiHeader, isRTL && styles.rowReverse]}>
            <Text style={styles.kpiTitle}>{t('totalDebt')}</Text>
            <View style={[styles.kpiIconWrapper, { backgroundColor: theme.colors.dangerLight }]}>
              <Ionicons name="people" size={20} color={theme.colors.danger} />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: theme.colors.danger }]}>{formatMoney(totalCustomerDebt)}</Text>
          <Text style={styles.kpiSubtitle}>{isRTL ? 'إجمالي مستحقات الزبائن' : 'Créances à recouvrer'}</Text>
        </TouchableOpacity>

        {/* Pending Repairs Counter */}
        <TouchableOpacity 
          style={[styles.kpiCard, { borderLeftColor: '#8b5cf6' }]}
          onPress={() => navigation.navigate('ServicesRepairs')}
        >
          <View style={[styles.kpiHeader, isRTL && styles.rowReverse]}>
            <Text style={styles.kpiTitle}>{isRTL ? 'أجهزة قيد الصيانة' : 'Réparations en cours'}</Text>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="hardware-chip" size={20} color="#8b5cf6" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#8b5cf6' }]}>{pendingRepairsCount} {isRTL ? 'أجهزة' : 'dossiers'}</Text>
          <Text style={styles.kpiSubtitle}>{isRTL ? 'في ورشة الصيانة' : 'En atelier'}</Text>
        </TouchableOpacity>

        {/* Low Stock Alert */}
        <TouchableOpacity 
          style={[styles.kpiCard, { borderLeftColor: theme.colors.warning }]}
          onPress={openStockModal}
        >
          <View style={[styles.kpiHeader, isRTL && styles.rowReverse]}>
            <Text style={styles.kpiTitle}>{t('lowStock')}</Text>
            <View style={[styles.kpiIconWrapper, { backgroundColor: theme.colors.warningLight }]}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.warning} />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: theme.colors.warning }]}>{lowStockCount} {isRTL ? 'سلع' : 'articles'}</Text>
          <Text style={styles.kpiSubtitle}>{isRTL ? 'تحت الحد الأدنى' : 'Nécessite réapprovisionnement'}</Text>
        </TouchableOpacity>

        {/* Active Catalog Total */}
        <TouchableOpacity 
          style={[styles.kpiCard, { borderLeftColor: '#0284c7' }]}
          onPress={() => navigation.navigate('Products')}
        >
          <View style={[styles.kpiHeader, isRTL && styles.rowReverse]}>
            <Text style={styles.kpiTitle}>{isRTL ? 'إجمالي المنتجات' : 'Articles & Services'}</Text>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="cube" size={20} color="#0284c7" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#0284c7' }]}>{validProducts.length + services.length}</Text>
          <Text style={styles.kpiSubtitle}>{validProducts.length} {isRTL ? 'منتج' : 'produits'} + {services.length} {isRTL ? 'خدمات' : 'services'}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Action Buttons */}
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>{t('quickActions')}</Text>
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('POS')}
        >
          <Ionicons name="barcode" size={26} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('newSale')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: theme.colors.secondary }]}
          onPress={() => navigation.navigate('Products')}
        >
          <Ionicons name="cube" size={26} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('addProduct')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]}
          onPress={() => navigation.navigate('ServicesRepairs')}
        >
          <Ionicons name="construct" size={26} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('servicesRepairs')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#dc2626' }]}
          onPress={() => navigation.navigate('Expenses')}
        >
          <Ionicons name="cash-outline" size={26} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('expenses')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#0284c7' }]}
          onPress={() => navigation.navigate('Customers')}
        >
          <Ionicons name="people" size={26} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('newCustomer')}</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Sales Section */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
        <Text style={styles.sectionTitle}>{t('recentSales')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
          <Text style={styles.viewAllText}>{isRTL ? 'عرض الكل' : 'Voir tout'}</Text>
        </TouchableOpacity>
      </View>

      {sales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>{t('noSalesYet')}</Text>
          <TouchableOpacity 
            style={[styles.startSaleBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('POS')}
          >
            <Text style={styles.startSaleBtnText}>{t('newSale')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        sales.slice(0, 5).map((sale) => (
          <View key={sale.id} style={[styles.saleItemCard, isRTL && styles.rowReverse]}>
            <View style={styles.saleIconBox}>
              <Ionicons 
                name={sale.paymentMethod === 'credit' ? 'time' : 'checkmark-circle'} 
                size={24} 
                color={sale.paymentMethod === 'credit' ? theme.colors.danger : theme.colors.primary} 
              />
            </View>
            <View style={[styles.saleMeta, isRTL && styles.alignRight]}>
              <Text style={styles.saleTitle}>
                {sale.items.length} {t('itemsCount')} • {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.saleCustomer}>
                {sale.paymentMethod === 'credit' ? (isRTL ? 'دين (كريدي)' : 'Crédit') : (isRTL ? 'دفع كاش' : 'Comptant')}
                {sale.cashierName || sale.cashier ? ` • @${sale.cashierName || sale.cashier}` : ''}
              </Text>
            </View>
            <View style={styles.saleTotalBox}>
              <Text style={styles.saleTotalAmount}>{formatMoney(sale.total)}</Text>
              <Text style={styles.saleProfit}>+{formatMoney(sale.profit || 0)}</Text>
            </View>
          </View>
        ))
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
    padding: theme.spacing.lg,
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
  headerBanner: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  hybridStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  hybridPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hybridPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 6,
    marginRight: 4,
  },
  hybridPillVal: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  hybridDivider: {
    width: 1,
    height: 16,
    backgroundColor: theme.colors.border,
  },
  syncWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: theme.spacing.lg,
  },
  syncWarningIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncWarningTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#991b1b',
  },
  syncWarningSub: {
    fontSize: 10.5,
    color: '#7f1d1d',
    marginTop: 2,
    lineHeight: 15,
  },
  storeDetails: {
    flex: 1,
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: theme.typography.small,
  },
  storeName: {
    color: '#ffffff',
    fontSize: theme.typography.header,
    fontWeight: 'bold',
    marginTop: 2,
  },
  storePhone: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: theme.typography.small,
    marginTop: 4,
  },
  settingsIconBtn: {
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.full,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
    marginBottom: theme.spacing.md,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  kpiIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: theme.typography.title,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  kpiSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  viewAllText: {
    color: theme.colors.secondary,
    fontWeight: '600',
    fontSize: theme.typography.small,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  actionBtn: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    elevation: 2,
    marginBottom: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.regular,
  },
  startSaleBtn: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
  },
  startSaleBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  saleItemCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    elevation: 1,
  },
  saleIconBox: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  saleMeta: {
    flex: 1,
  },
  saleTitle: {
    fontSize: theme.typography.regular,
    fontWeight: '600',
    color: theme.colors.text,
  },
  saleCustomer: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  saleTotalBox: {
    alignItems: 'flex-end',
  },
  saleTotalAmount: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  saleProfit: {
    fontSize: theme.typography.small,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
});
