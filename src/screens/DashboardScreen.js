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
    isRTL,
    storeInfo,
    openStockModal,
    firebaseConnected,
    syncStatus,
    lastSyncTime,
    refreshAllFromFirebase,
  } = useApp();

  // Metrics calculation
  const today = new Date().toISOString().split('T')[0];
  const validSales = Array.isArray(sales) ? sales : [];
  const validProducts = Array.isArray(products) ? products : [];
  const validCustomers = Array.isArray(customers) ? customers : [];

  const todaySales = validSales.filter((s) => (s.date || '').startsWith(today));
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const todayProfit = todaySales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
  const totalCustomerDebt = validCustomers.reduce((sum, c) => sum + Number(c.debt || 0), 0);
  const lowStockCount = validProducts.filter((p) => Number(p.stock || 0) <= Number(p.minStock || 5)).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Live Two-Way Sync Bar */}
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
              ? (isRTL ? 'مزامنة السحابة جارية...' : 'Envoi vers Firebase...')
              : syncStatus === 'receiving'
              ? (isRTL ? 'استقبال البيانات من فايربيس...' : 'Synchronisation directe Firebase...')
              : firebaseConnected
              ? (isRTL ? 'متصل بقاعدة البيانات السحابية فايربيس' : 'Connecté & synchronisé avec Firebase')
              : (isRTL ? 'الوضع المحلي' : 'Mode Local')}
          </Text>
        </View>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={refreshAllFromFirebase}
        >
          <Ionicons name="refresh" size={14} color={theme.colors.secondary} />
          {lastSyncTime && (
            <Text style={[styles.syncTimeText, { marginLeft: 4 }]}>{lastSyncTime}</Text>
          )}
        </TouchableOpacity>
      </View>
      {/* Header Banner */}
      <View style={[styles.headerBanner, isRTL && styles.rowReverse]}>
        <View style={styles.storeDetails}>
          <Text style={styles.welcomeText}>{isRTL ? 'مرحباً بك في' : 'Bienvenue sur'}</Text>
          <Text style={styles.storeName}>{storeInfo.name}</Text>
          <Text style={styles.storePhone}>{storeInfo.phone} • {storeInfo.address}</Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsIconBtn} 
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        {/* Today's Sales */}
        <View style={[styles.kpiCard, { borderLeftColor: theme.colors.primary }]}>
          <View style={[styles.kpiHeader, isRTL && styles.rowReverse]}>
            <Text style={styles.kpiTitle}>{t('todaySales')}</Text>
            <View style={[styles.kpiIconWrapper, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="cart" size={20} color={theme.colors.primary} />
            </View>
          </View>
          <Text style={styles.kpiValue}>{formatMoney(todayRevenue)}</Text>
          <Text style={styles.kpiSubtitle}>{todaySales.length} {t('itemsCount')}</Text>
        </View>

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
      </View>

      {/* Quick Action Buttons */}
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>{t('quickActions')}</Text>
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('POS')}
        >
          <Ionicons name="barcode" size={28} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('newSale')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: theme.colors.secondary }]}
          onPress={() => navigation.navigate('Products')}
        >
          <Ionicons name="add-circle" size={28} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('addProduct')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#7c3aed' }]}
          onPress={() => navigation.navigate('Expenses')}
        >
          <Ionicons name="cash-outline" size={28} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('newExpense')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#0284c7' }]}
          onPress={() => navigation.navigate('Customers')}
        >
          <Ionicons name="person-add" size={28} color="#ffffff" />
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
    marginBottom: theme.spacing.lg,
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
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
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
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  actionBtn: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xs,
    elevation: 2,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 6,
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
  syncTimeText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
});
