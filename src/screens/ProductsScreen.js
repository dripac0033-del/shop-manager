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
import CameraBarcodeScannerModal from '../components/CameraBarcodeScannerModal';

export default function ProductsScreen() {
  const {
    t,
    formatMoney,
    products = [],
    categories = [],
    addProduct,
    updateProduct,
    deleteProduct,
    adjustProductStock,
    addCategory,
    deleteCategory,
    isRTL,
    firebaseConnected,
    uploadStockToCloud,
    syncStatus,
    lastSyncTime,
    refreshAllFromFirebase,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'normal' | 'low' | 'out'
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'priceAsc' | 'priceDesc' | 'stockAsc' | 'stockDesc'
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [scannedCodeInput, setScannedCodeInput] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');

  // Form State
  const [barcode, setBarcode] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [category, setCategory] = useState('Alimentation');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [minStock, setMinStock] = useState('5');

  // New Category Form State
  const [newCatNameFr, setNewCatNameFr] = useState('');
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [newCatColor, setNewCatColor] = useState('#10b981');

  const validProducts = Array.isArray(products) ? products : [];

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Open modal for Add
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setBarcode(Math.floor(6130000000 + Math.random() * 999999).toString());
    setNameFr('');
    setNameAr('');
    setCategory(categories[0]?.nameFr || 'Alimentation');
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

  // Direct Validation & Instant Window Closure
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

    // CLOSE WINDOW DIRECTLY
    setModalVisible(false);

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        showToast(isRTL ? '✅ تم تحديث المنتج بنجاح' : '✅ Produit modifié avec succès');
      } else {
        await addProduct(payload);
        showToast(isRTL ? '✅ تم إضافة المنتج وحفظه بنجاح' : '✅ Produit ajouté et enregistré');
      }
    } catch (err) {
      console.warn('Error saving product:', err);
    }
  };

  const handleBarcodeScanned = (scannedCode) => {
    const code = String(scannedCode || '').trim();
    if (!code) return;

    if (modalVisible) {
      // Adding or editing product: populate barcode
      setBarcode(code);
      const existing = validProducts.find((p) => String(p.barcode || '').trim() === code);
      if (existing && (!editingProduct || editingProduct.id !== existing.id)) {
        showToast(
          isRTL
            ? `⚠️ الباركود مسجل مسبقاً: ${existing.nameAr || existing.nameFr}`
            : `⚠️ Code déjà utilisé pour: ${existing.nameFr}`
        );
      } else {
        showToast(isRTL ? `✅ تم مسح الكود: ${code}` : `✅ Code-barres scanné : ${code}`);
      }
    } else {
      // Search or filter products by scanned barcode
      setSearchQuery(code);
      const matched = validProducts.find((p) => String(p.barcode || '').trim() === code);
      if (matched) {
        showToast(
          isRTL
            ? `✅ تم العثور على: ${matched.nameAr || matched.nameFr} (${matched.stock} قطعة)`
            : `✅ Trouvé : ${matched.nameFr} (${matched.stock} en stock)`
        );
      } else {
        showToast(
          isRTL
            ? `❌ الباركود [${code}] غير موجود بالمخزون`
            : `❌ Aucun produit avec le code [${code}]`
        );
      }
    }
    setScannerModalVisible(false);
  };

  const handleDelete = (id) => {
    const confirmMsg = isRTL ? 'هل تريد حقاً حذف هذا المنتج من المخزون؟' : 'Voulez-vous vraiment supprimer ce produit ?';
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) {
        deleteProduct(id);
        showToast(isRTL ? 'تم حذف المنتج' : 'Produit supprimé');
      }
      return;
    }
    Alert.alert(
      t('deleteProduct'),
      confirmMsg,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteProduct'),
          style: 'destructive',
          onPress: () => {
            deleteProduct(id);
            showToast(isRTL ? 'تم حذف المنتج' : 'Produit supprimé');
          },
        },
      ]
    );
  };

  // Add Category handler
  const handleCreateCategory = async () => {
    if (!newCatNameFr.trim()) {
      Alert.alert(t('categories'), isRTL ? 'يرجى إدخال اسم الصنف!' : 'Veuillez saisir le nom de la catégorie !');
      return;
    }

    try {
      await addCategory({
        nameFr: newCatNameFr.trim(),
        nameAr: newCatNameAr.trim() || newCatNameFr.trim(),
        color: newCatColor,
      });
      setNewCatNameFr('');
      setNewCatNameAr('');
      showToast(isRTL ? '✅ تم إنشاء الصنف بنجاح' : '✅ Catégorie créée avec succès');
    } catch (err) {
      console.warn('Error creating category:', err);
    }
  };

  const handleDeleteCategory = (catId) => {
    if (categories.length <= 1) {
      Alert.alert(t('categories'), isRTL ? 'يجب إبقاء صنف واحد على الأقل!' : 'Vous devez garder au moins une catégorie !');
      return;
    }
    deleteCategory(catId);
  };

  // Quick Stock Adjust (+5, +10, -1)
  const handleQuickStock = async (item, delta) => {
    if (adjustProductStock) {
      await adjustProductStock(item.id, delta);
    } else {
      const newStock = Math.max(0, Number(item.stock || 0) + delta);
      await updateProduct(item.id, { ...item, stock: newStock });
    }
  };

  // Export Product Catalog to CSV
  const handleExportCSV = () => {
    if (!validProducts.length) {
      Alert.alert('CSV', isRTL ? 'لا توجد منتجات لتصديرها!' : 'Aucun produit à exporter !');
      return;
    }

    const headers = [
      'Code-barres',
      'Nom (FR)',
      'Nom (AR)',
      'Categorie',
      'Prix Achat',
      'Prix Vente',
      'Stock',
      'Seuil Min',
      'Valeur Achat DZD',
    ];

    const rows = validProducts.map((p) => [
      `"${p.barcode || ''}"`,
      `"${(p.nameFr || '').replace(/"/g, '""')}"`,
      `"${(p.nameAr || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      p.buyPrice || 0,
      p.sellPrice || 0,
      p.stock || 0,
      p.minStock || 5,
      (Number(p.buyPrice || 0) * Number(p.stock || 0)).toFixed(2),
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `catalogue_stock_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('CSV', isRTL ? 'تم إنشاء ملف CSV للكتالوج بنجاح!' : 'Export CSV du catalogue généré avec succès !');
    }
  };

  // Filtered & Sorted Products
  let processedProducts = validProducts.filter((p) => {
    if (!p) return false;
    const barcodeStr = p.barcode ? String(p.barcode) : '';
    const nameFrStr = p.nameFr ? String(p.nameFr).toLowerCase() : '';
    const nameArStr = p.nameAr ? String(p.nameAr) : '';
    const catStr = p.category ? String(p.category).toLowerCase() : '';
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch =
      barcodeStr.includes(q) ||
      nameFrStr.includes(q) ||
      nameArStr.includes(q) ||
      catStr.includes(q);

    const matchesCat =
      selectedCategory === 'All' ||
      p.category === selectedCategory ||
      (selectedCategory.nameFr && p.category === selectedCategory.nameFr);

    let matchesStock = true;
    if (stockFilter === 'normal') {
      matchesStock = p.stock > p.minStock;
    } else if (stockFilter === 'low') {
      matchesStock = p.stock <= p.minStock && p.stock > 0;
    } else if (stockFilter === 'out') {
      matchesStock = p.stock <= 0;
    }

    return matchesSearch && matchesCat && matchesStock;
  });

  // Sorting
  processedProducts.sort((a, b) => {
    if (sortBy === 'name') {
      return (a.nameFr || '').localeCompare(b.nameFr || '');
    }
    if (sortBy === 'priceAsc') {
      return Number(a.sellPrice || 0) - Number(b.sellPrice || 0);
    }
    if (sortBy === 'priceDesc') {
      return Number(b.sellPrice || 0) - Number(a.sellPrice || 0);
    }
    if (sortBy === 'stockAsc') {
      return Number(a.stock || 0) - Number(b.stock || 0);
    }
    if (sortBy === 'stockDesc') {
      return Number(b.stock || 0) - Number(a.stock || 0);
    }
    return 0;
  });

  const lowStockCount = validProducts.filter((p) => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStockCount = validProducts.filter((p) => p.stock <= 0).length;

  return (
    <View style={styles.container}>
      {/* Toast Banner */}
      {toastMessage ? (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Top Header & Search Controls */}
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
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Barcode Scanner Button */}
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => setScannerModalVisible(true)}
          title="Scanner"
        >
          <Ionicons name="barcode-outline" size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* Manage Categories Button */}
        <TouchableOpacity
          style={styles.categoryManageBtn}
          onPress={() => setCategoryModalVisible(true)}
          title="Gérer Catégories"
        >
          <Ionicons name="folder-open-outline" size={18} color="#ffffff" />
          <Text style={styles.btnSmallText}>{isRTL ? 'الأصناف' : 'Catégories'}</Text>
        </TouchableOpacity>

        {/* Add Product Button */}
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
          <Ionicons name="add" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Filter and Sort Bar */}
      <View style={[styles.filterSortRow, isRTL && styles.rowReverse]}>
        {/* Stock status pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsScroll}>
          <TouchableOpacity
            style={[styles.stockFilterPill, stockFilter === 'all' && styles.stockFilterPillActive]}
            onPress={() => setStockFilter('all')}
          >
            <Text style={[styles.stockFilterPillText, stockFilter === 'all' && styles.stockFilterPillTextActive]}>
              {isRTL ? 'الكل' : 'Tous'} ({validProducts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stockFilterPill, stockFilter === 'normal' && styles.stockFilterPillActive]}
            onPress={() => setStockFilter('normal')}
          >
            <Text style={[styles.stockFilterPillText, stockFilter === 'normal' && styles.stockFilterPillTextActive]}>
              {isRTL ? 'متوفر' : 'En stock'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stockFilterPill,
              stockFilter === 'low' && styles.stockFilterPillWarningActive,
              lowStockCount > 0 && styles.stockFilterHasAlert,
            ]}
            onPress={() => setStockFilter('low')}
          >
            <Text
              style={[
                styles.stockFilterPillText,
                stockFilter === 'low' && styles.stockFilterPillTextActive,
                lowStockCount > 0 && { color: '#b45309' },
              ]}
            >
              ⚠️ {isRTL ? 'منخفض' : 'Faible'} ({lowStockCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stockFilterPill,
              stockFilter === 'out' && styles.stockFilterPillDangerActive,
              outOfStockCount > 0 && styles.stockFilterHasDanger,
            ]}
            onPress={() => setStockFilter('out')}
          >
            <Text
              style={[
                styles.stockFilterPillText,
                stockFilter === 'out' && styles.stockFilterPillTextActive,
                outOfStockCount > 0 && { color: '#dc2626' },
              ]}
            >
              ❌ {isRTL ? 'نفذ' : 'Rupture'} ({outOfStockCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sort Button Toggle */}
        <TouchableOpacity
          style={styles.sortToggleBtn}
          onPress={() => setShowSortDropdown(!showSortDropdown)}
        >
          <Ionicons name="swap-vertical" size={16} color={theme.colors.primary} />
          <Text style={styles.sortToggleText}>{isRTL ? 'ترتيب' : 'Trier'}</Text>
        </TouchableOpacity>
      </View>

      {/* Sort Dropdown Options */}
      {showSortDropdown && (
        <View style={styles.sortMenu}>
          {[
            { key: 'name', label: t('sortNameAZ') },
            { key: 'priceAsc', label: t('sortPriceAsc') },
            { key: 'priceDesc', label: t('sortPriceDesc') },
            { key: 'stockAsc', label: t('sortStockAsc') },
            { key: 'stockDesc', label: t('sortStockDesc') },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.sortMenuItem, sortBy === item.key && styles.sortMenuItemActive]}
              onPress={() => {
                setSortBy(item.key);
                setShowSortDropdown(false);
              }}
            >
              <Text style={[styles.sortMenuText, sortBy === item.key && styles.sortMenuTextActive]}>
                {item.label}
              </Text>
              {sortBy === item.key && (
                <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Category Filter Chips */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === 'All' && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory('All')}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === 'All' && styles.categoryChipTextActive,
              ]}
            >
              {t('allCategories')}
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                (selectedCategory === cat.nameFr || selectedCategory === cat.nameAr) && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(isRTL ? cat.nameAr || cat.nameFr : cat.nameFr)}
            >
              <View style={[styles.catColorDot, { backgroundColor: cat.color || theme.colors.primary }]} />
              <Text
                style={[
                  styles.categoryChipText,
                  (selectedCategory === cat.nameFr || selectedCategory === cat.nameAr) && styles.categoryChipTextActive,
                ]}
              >
                {isRTL ? cat.nameAr || cat.nameFr : cat.nameFr}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Product List */}
      {processedProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={54} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {isRTL ? 'لا توجد منتجات مطابقة' : 'Aucun produit correspondant'}
          </Text>
          <Text style={styles.emptySub}>
            {isRTL
              ? 'اضغط على زر الإضافة (+) لإنشاء منتج جديد وحفظه مباشرة.'
              : 'Cliquez sur Ajouter (+) pour enregistrer un article dans votre inventaire.'}
          </Text>

          <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAdd}>
            <Ionicons name="add-circle" size={20} color="#ffffff" />
            <Text style={styles.emptyAddBtnText}>{t('addProduct')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={processedProducts}
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
                    <View style={styles.barcodeLabelBox}>
                      <Ionicons name="barcode-outline" size={12} color={theme.colors.textMuted} />
                      <Text style={styles.barcodeLabel}>#{item.barcode}</Text>
                    </View>
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

                  {/* Quick Stock Adjusters (+5, +10, -1) */}
                  <View style={[styles.quickStockRow, isRTL && styles.rowReverse]}>
                    <Text style={styles.quickStockLabel}>
                      {isRTL ? 'تعديل سريع:' : 'Ajuster stock:'}
                    </Text>
                    <TouchableOpacity
                      style={styles.quickStockBtn}
                      onPress={() => handleQuickStock(item, 5)}
                    >
                      <Text style={styles.quickStockBtnText}>+5</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickStockBtn}
                      onPress={() => handleQuickStock(item, 10)}
                    >
                      <Text style={styles.quickStockBtnText}>+10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickStockBtn, styles.quickStockBtnMinus]}
                      onPress={() => handleQuickStock(item, -1)}
                    >
                      <Text style={styles.quickStockBtnMinusText}>-1</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Stock Status Badge & Edit/Delete Controls */}
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

      {/* Add / Edit Product Modal (Closes Directly on Validation) */}
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
                  <Text style={styles.genBtnText}>{isRTL ? 'توليد' : 'Générer'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.scanCodeModalBtn}
                  onPress={() => setScannerModalVisible(true)}
                >
                  <Ionicons name="camera-outline" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('productName')} (Français) *</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={nameFr}
                onChangeText={setNameFr}
                placeholder="Ex: Écran Protection Verre Trempé"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('productName')} (العربية)</Text>
              <TextInput
                style={[styles.inputBox, { textAlign: 'right' }]}
                value={nameAr}
                onChangeText={setNameAr}
                placeholder="مثال: شاشة حماية زجاجية"
                placeholderTextColor={theme.colors.textMuted}
              />

              {/* Category Picker with Fast Create */}
              <View style={[styles.categoryHeaderRow, isRTL && styles.rowReverse]}>
                <Text style={styles.inputLabel}>{t('category')}</Text>
                <TouchableOpacity onPress={() => setCategoryModalVisible(true)}>
                  <Text style={styles.addCategoryLink}>+ {t('newCategory')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.modalCatChip,
                      category === c.nameFr && styles.modalCatChipActive,
                    ]}
                    onPress={() => setCategory(c.nameFr)}
                  >
                    <Text style={[styles.modalCatChipText, category === c.nameFr && styles.modalCatChipTextActive]}>
                      {isRTL ? c.nameAr || c.nameFr : c.nameFr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

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
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('sellPrice')} *</Text>
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

            {/* Direct Save Button (Validates & Exits Immediately) */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct}>
              <Text style={styles.saveBtnText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Categories Management Space Modal */}
      <Modal visible={categoryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.categoryModalCard}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="folder-open" size={22} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle}>{t('manageCategories')}</Text>
              </View>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Create Category Form */}
            <View style={styles.newCatBox}>
              <Text style={[styles.newCatTitle, isRTL && styles.textRight]}>{t('newCategory')}</Text>
              <View style={[styles.newCatRow, isRTL && styles.rowReverse]}>
                <TextInput
                  style={[styles.inputBox, { flex: 1, marginRight: 6 }, isRTL && styles.textRight]}
                  placeholder={t('categoryNameFr')}
                  value={newCatNameFr}
                  onChangeText={setNewCatNameFr}
                />
                <TextInput
                  style={[styles.inputBox, { flex: 1, textAlign: 'right' }]}
                  placeholder={t('categoryNameAr')}
                  value={newCatNameAr}
                  onChangeText={setNewCatNameAr}
                />
              </View>

              <TouchableOpacity style={styles.createCatBtn} onPress={handleCreateCategory}>
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.createCatBtnText}>{t('addCategory')}</Text>
              </TouchableOpacity>
            </View>

            {/* Existing Categories List */}
            <Text style={[styles.existingCatsTitle, isRTL && styles.textRight]}>
              {isRTL ? 'الأصناف المسجلة:' : 'Catégories enregistrées :'}
            </Text>
            <ScrollView style={{ maxHeight: 240 }}>
              {categories.map((c) => {
                const count = validProducts.filter((p) => p.category === c.nameFr || p.category === c.nameAr).length;
                return (
                  <View key={c.id} style={[styles.catListItem, isRTL && styles.rowReverse]}>
                    <View style={[styles.catListItemLeft, isRTL && styles.rowReverse]}>
                      <View style={[styles.catColorCircle, { backgroundColor: c.color || theme.colors.primary }]} />
                      <View style={isRTL && styles.alignRight}>
                        <Text style={styles.catItemName}>{c.nameFr}</Text>
                        {c.nameAr && <Text style={styles.catItemSub}>{c.nameAr}</Text>}
                      </View>
                    </View>

                    <View style={styles.catListItemRight}>
                      <Text style={styles.catCountBadge}>{count} {isRTL ? 'منتجات' : 'produits'}</Text>
                      <TouchableOpacity
                        style={styles.delCatBtn}
                        onPress={() => handleDeleteCategory(c.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Real Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        onScan={handleBarcodeScanned}
        title={isRTL ? 'ماسح الكاميرا للمنتجات' : 'Scanner Caméra Produits'}
        continuous={false}
        isRTL={isRTL}
      />
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
  toastBanner: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
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
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 6,
    fontSize: theme.typography.regular,
  },
  scanBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    elevation: 2,
  },
  categoryManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    marginRight: 6,
    elevation: 2,
  },
  btnSmallText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  filterSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginBottom: 8,
  },
  filterPillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockFilterPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stockFilterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stockFilterPillWarningActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  stockFilterPillDangerActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  stockFilterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  stockFilterPillTextActive: {
    color: '#ffffff',
  },
  stockFilterHasAlert: {
    borderColor: '#f59e0b',
  },
  stockFilterHasDanger: {
    borderColor: '#ef4444',
  },
  sortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginLeft: 4,
  },
  sortToggleText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  sortMenu: {
    backgroundColor: '#ffffff',
    marginHorizontal: theme.spacing.md,
    marginBottom: 8,
    borderRadius: theme.borderRadius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 3,
  },
  sortMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
  },
  sortMenuItemActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  sortMenuText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  sortMenuTextActive: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  categoryContainer: {
    marginBottom: 6,
  },
  categoryScroll: {
    paddingHorizontal: theme.spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  catColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#ffffff',
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
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: theme.borderRadius.full,
  },
  emptyAddBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 30,
  },
  productItemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    fontWeight: 'bold',
    color: theme.colors.secondary,
    backgroundColor: theme.colors.secondaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginRight: 6,
  },
  barcodeLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginLeft: 2,
  },
  productTitle: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  priceStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sellPriceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  buyPriceText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginHorizontal: 6,
  },
  profitText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  quickStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quickStockLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginRight: 6,
  },
  quickStockBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryLight,
    marginRight: 4,
  },
  quickStockBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  quickStockBtnMinus: {
    backgroundColor: theme.colors.dangerLight,
  },
  quickStockBtnMinusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.danger,
  },
  stockActionsCol: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  stockStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    marginBottom: 8,
  },
  stockStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  bgSuccess: {
    backgroundColor: theme.colors.successLight,
  },
  textSuccess: {
    color: theme.colors.success,
  },
  bgWarning: {
    backgroundColor: theme.colors.warningLight,
  },
  textWarning: {
    color: '#b45309',
  },
  bgDanger: {
    backgroundColor: theme.colors.dangerLight,
  },
  textDanger: {
    color: theme.colors.danger,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
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
    maxWidth: 520,
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
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 460,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 10,
    height: 44,
    borderRadius: theme.borderRadius.md,
    marginLeft: 6,
  },
  genBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  scanCodeModalBtn: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  addCategoryLink: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  modalCatChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalCatChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  modalCatChipText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
  modalCatChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  categoryModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '85%',
  },
  newCatBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  newCatTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  newCatRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  createCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
  },
  createCatBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  existingCatsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  catListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  catListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catColorCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  catItemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  catItemSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  catListItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catCountBadge: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginRight: 10,
  },
  delCatBtn: {
    padding: 4,
  },
  scanHelperCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  scanViewfinder: {
    height: 150,
    backgroundColor: '#0f172a',
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  scanViewfinderText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
