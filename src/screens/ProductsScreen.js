import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProductsScreen() {
  const {
    t,
    formatMoney,
    products = [],
    addProduct,
    updateProduct,
    deleteProduct,
    restoreDefaultProducts,
    isRTL,
    firebaseConnected,
    uploadStockToCloud,
    syncStatus,
    lastSyncTime,
    resetDemoData,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [barcode, setBarcode] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [category, setCategory] = useState('Alimentation');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [minStock, setMinStock] = useState('5');

  // Categories list with safe fallback
  const validProducts = Array.isArray(products) ? products : [];
  const categories = ['All', ...new Set(validProducts.map((p) => p.category).filter(Boolean))];

  // Open modal for Add or Edit
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setBarcode(Math.floor(6130000000 + Math.random() * 999999).toString());
    setNameFr('');
    setNameAr('');
    setCategory('Alimentation');
    setBuyPrice('');
    setSellPrice('');
    setStock('10');
    setMinStock('5');
    setModalVisible(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setBarcode(p.barcode || '');
    setNameFr(p.nameFr || '');
    setNameAr(p.nameAr || '');
    setCategory(p.category || 'Alimentation');
    setBuyPrice((p.buyPrice || 0).toString());
    setSellPrice((p.sellPrice || 0).toString());
    setStock((p.stock || 0).toString());
    setMinStock((p.minStock || 5).toString());
    setModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!nameFr.trim() && !nameAr.trim()) {
      Alert.alert(t('save'), isRTL ? 'يرجى إدخال اسم المنتج!' : 'Veuillez saisir le nom du produit !');
      return;
    }
    if (!sellPrice) {
      Alert.alert(t('save'), isRTL ? 'يرجى إدخال سعر البيع!' : 'Veuillez saisir le prix de vente !');
      return;
    }

    const payload = {
      barcode: barcode || Math.floor(6130000000 + Math.random() * 999999).toString(),
      nameFr: nameFr.trim() || nameAr.trim(),
      nameAr: nameAr.trim() || nameFr.trim(),
      category: category.trim() || 'Alimentation',
      buyPrice: Number(buyPrice || 0),
      sellPrice: Number(sellPrice || 0),
      stock: Number(stock || 0),
      minStock: Number(minStock || 5),
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await addProduct(payload);
      }
      setModalVisible(false);
    } catch (err) {
      console.warn('Error saving product:', err);
      setModalVisible(false);
    }
  };

  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm
        ? window.confirm(isRTL ? 'هل تريد حقاً حذف هذا المنتج؟' : 'Voulez-vous vraiment supprimer ce produit ?')
        : true;
      if (confirmed) {
        deleteProduct(id);
      }
      return;
    }
    Alert.alert(
      t('deleteProduct'),
      t('confirmDelete'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('deleteProduct'), style: 'destructive', onPress: () => deleteProduct(id) },
      ]
    );
  };

  const filteredProducts = validProducts.filter((p) => {
    if (!p) return false;
    const barcodeStr = p.barcode ? String(p.barcode) : '';
    const nameFrStr = p.nameFr ? String(p.nameFr).toLowerCase() : '';
    const nameArStr = p.nameAr ? String(p.nameAr) : '';
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch =
      barcodeStr.includes(q) ||
      nameFrStr.includes(q) ||
      nameArStr.includes(q);
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <View style={styles.container}>
      {/* Header and Search */}
      <View style={[styles.topRow, isRTL && styles.rowReverse]}>
        <View style={[styles.searchBar, isRTL && styles.rowReverse]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.textRight]}
            placeholder={t('searchByNameOrBarcode')}
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {firebaseConnected && (
          <TouchableOpacity
            style={[styles.cloudSyncBtn, syncStatus === 'sending' && { opacity: 0.6 }]}
            onPress={async () => {
              try {
                const res = await uploadStockToCloud();
                Alert.alert(t('firebaseSync'), isRTL ? `تمت مزامنة ${res.count} منتج مع فايربيس!` : `${res.count} produits synchronisés avec Firebase !`);
              } catch (e) {
                Alert.alert('Firebase', e.message);
              }
            }}
          >
            <Ionicons name="cloud-done" size={20} color="#ffffff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
          <Ionicons name="add" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

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
              ? (isRTL ? 'جارٍ إرسال البيانات إلى السحابة...' : 'Envoi automatique vers Firebase...')
              : syncStatus === 'receiving'
              ? (isRTL ? 'جارٍ استقبال التحديثات من السحابة...' : 'Réception en direct de Firebase...')
              : firebaseConnected
              ? (isRTL ? 'مزامنة تلقائية نشطة (إرسال واستقبال فوري)' : 'Synchro auto active (Envoi & Réception)')
              : (isRTL ? 'الوضع المحلي (بدون إنترنت)' : 'Mode Local Hors-ligne')}
          </Text>
        </View>
        {lastSyncTime && (
          <Text style={styles.syncTimeText}>{lastSyncTime}</Text>
        )}
      </View>

      {/* Category Pills */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat === 'All' ? t('allCategories') : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Empty State */}
      {filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={54} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {isRTL ? 'لا توجد منتجات مسجلة' : 'Aucun produit dans le catalogue'}
          </Text>
          <Text style={styles.emptySub}>
            {isRTL
              ? 'اضغط على زر الإضافة (+) لإنشاء منتج جديد أو استعد السلع الافتراضية.'
              : 'Cliquez sur (+) pour ajouter un produit ou restaurez les produits par défaut.'}
          </Text>

          <View style={styles.emptyActionsRow}>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAdd}>
              <Ionicons name="add-circle" size={20} color="#ffffff" />
              <Text style={styles.emptyAddBtnText}>{t('addProduct')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.emptyRestoreBtn} onPress={restoreDefaultProducts}>
              <Ionicons name="refresh" size={18} color={theme.colors.secondary} />
              <Text style={styles.emptyRestoreBtnText}>
                {isRTL ? 'استعادة السلع الافتراضية' : 'Restaurer Produits Démo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Product List */
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isOut = item.stock <= 0;
            const isLow = item.stock <= item.minStock && item.stock > 0;
            const unitProfit = item.sellPrice - item.buyPrice;

            return (
              <View style={[styles.productItemCard, isRTL && styles.rowReverse]}>
                <View style={[styles.productDetails, isRTL && styles.alignRight]}>
                  <View style={[styles.badgeLine, isRTL && styles.rowReverse]}>
                    <Text style={styles.categoryLabel}>{item.category || 'Général'}</Text>
                    <Text style={styles.barcodeLabel}>#{item.barcode}</Text>
                  </View>

                  <Text style={[styles.productTitle, isRTL && styles.textRight]}>
                    {isRTL ? item.nameAr || item.nameFr : item.nameFr || item.nameAr}
                  </Text>

                  <View style={[styles.priceStatsRow, isRTL && styles.rowReverse]}>
                    <Text style={styles.sellPriceText}>{formatMoney(item.sellPrice)}</Text>
                    <Text style={styles.buyPriceText}>
                      ({isRTL ? 'الشراء:' : 'Achat:'} {formatMoney(item.buyPrice)})
                    </Text>
                    <Text style={styles.profitText}>
                      +{formatMoney(unitProfit)} {isRTL ? 'ربح' : 'marge'}
                    </Text>
                  </View>
                </View>

                <View style={styles.stockActionsCol}>
                  <View
                    style={[
                      styles.stockStatusBadge,
                      isOut ? styles.bgDanger : isLow ? styles.bgWarning : styles.bgSuccess,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockStatusText,
                        isOut ? styles.textDanger : isLow ? styles.textWarning : styles.textSuccess,
                      ]}
                    >
                      {item.stock} {isRTL ? 'قطع' : 'u.'}
                    </Text>
                  </View>

                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={styles.actionCircleBtn}
                      onPress={() => handleOpenEdit(item)}
                    >
                      <Ionicons name="pencil" size={16} color={theme.colors.secondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionCircleBtn, { backgroundColor: theme.colors.dangerLight }]}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {editingProduct ? t('editProduct') : t('addProduct')}
              </Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('barcode')}</Text>
              <View style={[styles.barcodeInputRow, isRTL && styles.rowReverse]}>
                <TextInput
                  style={[styles.inputBox, { flex: 1 }, isRTL && styles.textRight]}
                  value={barcode}
                  onChangeText={setBarcode}
                  placeholder="613..."
                  placeholderTextColor={theme.colors.textMuted}
                />
                <TouchableOpacity
                  style={styles.genBarcodeBtn}
                  onPress={() => setBarcode(Math.floor(6130000000 + Math.random() * 999999).toString())}
                >
                  <Ionicons name="refresh" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('productName')} (Français)</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={nameFr}
                onChangeText={setNameFr}
                placeholder="Ex: Eau Minérale 1.5L"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('productName')} (العربية)</Text>
              <TextInput
                style={[styles.inputBox, { textAlign: 'right' }]}
                value={nameAr}
                onChangeText={setNameAr}
                placeholder="مثال: ماء معدني 1.5 لتر"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('category')}</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={category}
                onChangeText={setCategory}
                placeholder="Alimentation / Boissons / etc."
                placeholderTextColor={theme.colors.textMuted}
              />

              <View style={[styles.priceInputRow, isRTL && styles.rowReverse]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('buyPrice')}</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    keyboardType="numeric"
                    value={buyPrice}
                    onChangeText={setBuyPrice}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('sellPrice')}</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    keyboardType="numeric"
                    value={sellPrice}
                    onChangeText={setSellPrice}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              <View style={[styles.priceInputRow, isRTL && styles.rowReverse]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('stockQuantity')}</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    keyboardType="numeric"
                    value={stock}
                    onChangeText={setStock}
                    placeholder="10"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('minStockAlert')}</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    keyboardType="numeric"
                    value={minStock}
                    onChangeText={setMinStock}
                    placeholder="5"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct}>
              <Text style={styles.saveBtnText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    elevation: 2,
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 6,
    fontSize: theme.typography.regular,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  cloudSyncBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    elevation: 2,
  },
  syncStatusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
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
  categoryContainer: {
    marginBottom: theme.spacing.sm,
  },
  categoryScroll: {
    paddingHorizontal: theme.spacing.md,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  productItemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  productDetails: {
    flex: 1,
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 10,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.textSecondary,
    marginRight: 6,
  },
  barcodeLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  productTitle: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  priceStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  sellPriceText: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginRight: 8,
  },
  buyPriceText: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
    marginRight: 8,
  },
  profitText: {
    fontSize: theme.typography.small,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  stockActionsCol: {
    alignItems: 'flex-end',
    marginLeft: theme.spacing.md,
  },
  stockStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    marginBottom: 8,
  },
  bgSuccess: {
    backgroundColor: theme.colors.successLight,
  },
  bgWarning: {
    backgroundColor: theme.colors.warningLight,
  },
  bgDanger: {
    backgroundColor: theme.colors.dangerLight,
  },
  stockStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  textSuccess: {
    color: theme.colors.success,
  },
  textWarning: {
    color: theme.colors.warning,
  },
  textDanger: {
    color: theme.colors.danger,
  },
  btnRow: {
    flexDirection: 'row',
  },
  actionCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: theme.spacing.lg,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginRight: 8,
  },
  emptyAddBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  emptyRestoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondaryLight,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  emptyRestoreBtnText: {
    color: theme.colors.secondary,
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
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
    fontSize: theme.typography.header,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 420,
  },
  inputLabel: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  inputBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    height: 44,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.regular,
    backgroundColor: '#ffffff',
    color: theme.colors.text,
  },
  barcodeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genBarcodeBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  priceInputRow: {
    flexDirection: 'row',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    elevation: 2,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: theme.typography.medium,
  },
});
