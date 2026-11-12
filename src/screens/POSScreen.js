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
  Linking,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function POSScreen() {
  const {
    t,
    formatMoney,
    products = [],
    categories = [],
    customers = [],
    completeSale,
    isRTL,
    storeInfo,
    currentUser,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'inStock' | 'lowStock'
  const [cart, setCart] = useState([]);

  // Barcode Fast Scan State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Discount & Checkout Modal
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' | 'percent'
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);

  // Quick Receipt View Modal (Optional on-demand)
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState(null);

  // Sharing contact state
  const [sharePhone, setSharePhone] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'credit' | 'partial'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState('');

  const validProducts = Array.isArray(products) ? products : [];

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Filtered Products
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

    const matchesCategory =
      selectedCategory === 'All' ||
      p.category === selectedCategory ||
      (selectedCategory.nameFr && p.category === selectedCategory.nameFr);

    let matchesStock = true;
    if (stockFilter === 'inStock') {
      matchesStock = p.stock > 0;
    } else if (stockFilter === 'lowStock') {
      matchesStock = p.stock <= p.minStock && p.stock > 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Cart operations
  const addToCart = (product) => {
    if (!product) return;
    if (product.stock <= 0) {
      Alert.alert(t('outOfStock'), isRTL ? 'هذا المنتج نفذ من المخزن!' : 'Ce produit est en rupture de stock !');
      return;
    }
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        Alert.alert(t('lowStock'), isRTL ? 'لا توجد كمية كافية في المخزن!' : 'Stock insuffisant pour ajouter plus !');
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  // Barcode scanning handler
  const handleBarcodeScan = (manualCode) => {
    const code = (manualCode || barcodeInput).trim();
    if (!code) return;

    const found = validProducts.find(
      (p) => String(p.barcode || '').trim().toLowerCase() === code.toLowerCase()
    );

    if (found) {
      if (found.stock <= 0) {
        setScanFeedback({
          type: 'error',
          text: isRTL
            ? `⚠️ ${found.nameAr || found.nameFr} غير متوفر في المخزن (0)!`
            : `⚠️ ${found.nameFr} est en rupture de stock !`,
        });
      } else {
        addToCart(found);
        setScanFeedback({
          type: 'success',
          text: isRTL
            ? `✅ أضيف: ${found.nameAr || found.nameFr}`
            : `✅ Ajouté : ${found.nameFr}`,
        });
      }
      setBarcodeInput('');
    } else {
      setScanFeedback({
        type: 'error',
        text: isRTL
          ? `❌ كود بار [${code}] غير مسجل في المخزون!`
          : `❌ Code-barres [${code}] introuvable !`,
      });
    }

    setTimeout(() => {
      setScanFeedback(null);
    }, 3000);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + Number(item.sellPrice || 0) * Number(item.quantity || 1), 0);
  const calculatedDiscount =
    discountType === 'percent'
      ? (subtotal * Math.min(100, Math.max(0, Number(discount || 0)))) / 100
      : Math.min(subtotal, Math.max(0, Number(discount || 0)));

  const total = Math.max(0, subtotal - calculatedDiscount);
  const change = Math.max(0, Number(paidAmountInput || 0) - total);
  const remainingCredit = Math.max(0, total - Number(paidAmountInput || 0));

  // Direct Validation & Instant Window Closure on Sale Completion
  const handleConfirmSale = async () => {
    if (cart.length === 0) return;

    if ((paymentMethod === 'credit' || paymentMethod === 'partial') && !selectedCustomerId) {
      Alert.alert(t('credit'), isRTL ? 'يجب اختيار زبون لتسجيل الدين!' : 'Veuillez sélectionner un client pour le crédit !');
      return;
    }

    const payload = {
      items: cart,
      subtotal,
      discount: calculatedDiscount,
      total,
      paidAmount: paymentMethod === 'cash' ? total : Number(paidAmountInput || 0),
      paymentMethod,
      customerId: selectedCustomerId || null,
    };

    // DIRECTLY QUIT WINDOW (quitte la fenêtre immédiatement)
    setCheckoutModalVisible(false);

    try {
      const { sale, lowStockWarnings } = await completeSale(payload);
      setLastCompletedSale(sale);

      clearCart();
      setPaidAmountInput('');
      setSelectedCustomerId('');
      setPaymentMethod('cash');

      showToast(
        isRTL
          ? `✅ تمت عملية البيع بنجاح (${formatMoney(total)})`
          : `✅ Vente validée avec succès (${formatMoney(total)})`
      );

      if (lowStockWarnings && lowStockWarnings.length > 0) {
        const names = lowStockWarnings.map((p) => (isRTL ? p.nameAr || p.nameFr : p.nameFr)).join(', ');
        setTimeout(() => {
          Alert.alert(
            isRTL ? '⚠️ تنبيه: نقص في المخزون!' : '⚠️ Attention : Seuil Stock Limite Atteint !',
            isRTL
              ? `المنتجات التالية وصلت إلى الحد الأدنى للمخزون: ${names}.`
              : `Le(s) produit(s) suivant(s) ont atteint le seuil minimum : ${names}.`
          );
        }, 800);
      }
    } catch (err) {
      console.warn('Error completing sale:', err);
    }
  };

  // Generate Receipt Text
  const generateReceiptText = (sale) => {
    if (!sale) return '';
    const dateStr = sale.date ? new Date(sale.date).toLocaleString() : new Date().toLocaleString();
    const chosenCust = (customers || []).find((c) => c.id === sale.customerId);

    const lines = [];
    lines.push(`🧾 *${storeInfo.name || 'Store Soft'}*`);
    if (storeInfo.address) lines.push(`📍 ${storeInfo.address}`);
    if (storeInfo.phone) lines.push(`📞 ${storeInfo.phone}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📅 Date : ${dateStr}`);
    if (sale.cashierName || sale.cashier) {
      lines.push(`👤 Caissier : ${sale.cashierName || sale.cashier}`);
    }
    if (chosenCust) {
      lines.push(`👥 Client : ${chosenCust.name}`);
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

    if (sale.paymentMethod === 'credit' && chosenCust) {
      lines.push(`Solde crédit client : ${formatMoney(chosenCust.debt)}`);
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
    const subject = `Facture / Ticket - ${storeInfo.name || 'Store Soft'}`;
    const cleanMail = (shareEmail || '').trim();
    const mailto = `mailto:${cleanMail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(mailto, '_blank');
    } else {
      Linking.openURL(mailto).catch(() => Alert.alert('Email', text));
    }
  };

  const handleCopyReceipt = (sale) => {
    const text = generateReceiptText(sale);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    } else {
      Alert.alert(isRTL ? 'تم نسخ التذكرة' : 'Ticket copié', text);
    }
  };

  return (
    <View style={styles.container}>
      {/* Toast Feedback */}
      {toastMessage ? (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{toastMessage}</Text>
          {lastCompletedSale && (
            <TouchableOpacity
              style={styles.toastReceiptBtn}
              onPress={() => setReceiptModalVisible(true)}
            >
              <Ionicons name="receipt-outline" size={14} color="#ffffff" />
              <Text style={styles.toastReceiptBtnText}>{isRTL ? 'عرض التذكرة' : 'Voir Ticket'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* 1. Barcode Scanner Fast-Entry Bar */}
      <View style={[styles.barcodeScanBar, isRTL && styles.rowReverse]}>
        <View style={styles.barcodeIconBox}>
          <Ionicons name="barcode-outline" size={24} color={theme.colors.primary} />
        </View>
        <TextInput
          style={[styles.barcodeInput, isRTL && styles.textRight]}
          placeholder={
            isRTL
              ? 'امسح بالباركود أو اكتب الرقم ثم Enter...'
              : 'Scanner au lecteur code-barres ou taper...'
          }
          placeholderTextColor={theme.colors.textMuted}
          value={barcodeInput}
          onChangeText={setBarcodeInput}
          onSubmitEditing={() => handleBarcodeScan()}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {barcodeInput.length > 0 && (
          <TouchableOpacity style={styles.barcodeActionBtn} onPress={() => handleBarcodeScan()}>
            <Ionicons name="arrow-forward-circle" size={26} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.cameraScanBtn}
          onPress={() => setScannerModalVisible(true)}
          title="Scanner"
        >
          <Ionicons name="camera-outline" size={20} color="#ffffff" />
          <Text style={styles.cameraScanBtnText}>{isRTL ? 'ماسح' : 'Scanner'}</Text>
        </TouchableOpacity>
      </View>

      {/* Instant Scan Toast */}
      {scanFeedback && (
        <View
          style={[
            styles.scanFeedbackBanner,
            scanFeedback.type === 'error' ? styles.bgDanger : styles.bgSuccess,
            isRTL && styles.rowReverse,
          ]}
        >
          <Ionicons
            name={scanFeedback.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={18}
            color="#ffffff"
          />
          <Text style={styles.scanFeedbackText}>{scanFeedback.text}</Text>
        </View>
      )}

      {/* 2. Text Search & Stock Filter Bar */}
      <View style={[styles.searchBar, isRTL && styles.rowReverse]}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, isRTL && styles.textRight]}
          placeholder={t('searchProduct')}
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

      {/* Category selector chips */}
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

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.productsGrid}
        renderItem={({ item }) => {
          const inCart = cart.find((c) => c.id === item.id);
          const isLow = item.stock <= item.minStock && item.stock > 0;
          const isOut = item.stock <= 0;

          return (
            <TouchableOpacity
              style={[styles.productCard, isOut && styles.productCardDisabled]}
              onPress={() => addToCart(item)}
              activeOpacity={0.7}
            >
              {inCart && (
                <View style={styles.inCartBadge}>
                  <Text style={styles.inCartBadgeText}>{inCart.quantity}</Text>
                </View>
              )}
              <Text style={[styles.productName, isRTL && styles.textRight]} numberOfLines={2}>
                {isRTL ? item.nameAr || item.nameFr : item.nameFr}
              </Text>
              <View style={[styles.productBarcodeRow, isRTL && styles.rowReverse]}>
                <Ionicons name="barcode-outline" size={13} color={theme.colors.textMuted} />
                <Text style={styles.productBarcode}>#{item.barcode}</Text>
              </View>

              <View style={[styles.productBottomRow, isRTL && styles.rowReverse]}>
                <Text style={styles.productPrice}>{formatMoney(item.sellPrice)}</Text>
                <View
                  style={[
                    styles.stockBadge,
                    isOut
                      ? styles.stockBadgeOut
                      : isLow
                      ? styles.stockBadgeLow
                      : styles.stockBadgeIn,
                  ]}
                >
                  <Text
                    style={[
                      styles.stockBadgeText,
                      isOut
                        ? styles.stockTextOut
                        : isLow
                        ? styles.stockTextLow
                        : styles.stockTextIn,
                    ]}
                  >
                    {item.stock} {isRTL ? 'قطع' : 'u.'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyProductsBox}>
            <Ionicons name="cart-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyProductsTitle}>
              {isRTL ? 'لا توجد منتجات مطابقة في المتجر' : 'Aucun produit disponible en caisse'}
            </Text>
            <Text style={styles.emptyProductsSub}>
              {isRTL
                ? 'يرجى التوجه إلى قسم (المنتجات) لإضافة سلع إلى المخزون أو مسح كود بار.'
                : "Veuillez ajouter des articles dans l'onglet Produits pour enregistrer des ventes."}
            </Text>
          </View>
        }
      />

      {/* Bottom Cart Summary Bar */}
      <View style={[styles.cartBar, isRTL && styles.rowReverse]}>
        <View style={styles.cartInfo}>
          <Text style={styles.cartItemsCount}>
            {cart.reduce((sum, i) => sum + i.quantity, 0)} {t('itemsCount')}
          </Text>
          <Text style={styles.cartTotalAmount}>{formatMoney(total)}</Text>
        </View>

        <View style={[styles.cartActions, isRTL && styles.rowReverse]}>
          {cart.length > 0 && (
            <TouchableOpacity style={styles.clearCartBtn} onPress={clearCart}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.checkoutBtn,
              cart.length === 0 && styles.checkoutBtnDisabled,
            ]}
            onPress={() => cart.length > 0 && setCheckoutModalVisible(true)}
            disabled={cart.length === 0}
          >
            <Text style={styles.checkoutBtnText}>{t('pay')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Checkout Modal (Validates & Exits Directly) */}
      <Modal visible={checkoutModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>{t('pay')}</Text>
              <TouchableOpacity onPress={() => setCheckoutModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Cart Items List */}
              <Text style={[styles.modalSectionLabel, isRTL && styles.textRight]}>{t('cart')}</Text>
              {cart.map((item) => (
                <View key={item.id} style={[styles.cartItemRow, isRTL && styles.rowReverse]}>
                  <View style={styles.cartItemDesc}>
                    <Text style={[styles.cartItemTitle, isRTL && styles.textRight]}>
                      {isRTL ? item.nameAr || item.nameFr : item.nameFr}
                    </Text>
                    <Text style={styles.cartItemSub}>{formatMoney(item.sellPrice)} / u.</Text>
                  </View>

                  <View style={styles.cartItemQtyControls}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, -1)}>
                      <Ionicons name="remove" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, 1)}>
                      <Ionicons name="add" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cartItemTotal}>{formatMoney(item.sellPrice * item.quantity)}</Text>
                </View>
              ))}

              {/* Discount / Remise */}
              <View style={[styles.discountContainer, isRTL && styles.rowReverse]}>
                <View style={[styles.discountHeader, isRTL && styles.rowReverse]}>
                  <Text style={styles.discountLabel}>{t('discount')} :</Text>
                  <View style={styles.discountTypeToggle}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, discountType === 'fixed' && styles.toggleBtnActive]}
                      onPress={() => setDiscountType('fixed')}
                    >
                      <Text style={[styles.toggleBtnText, discountType === 'fixed' && styles.toggleBtnTextActive]}>
                        DZD
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleBtn, discountType === 'percent' && styles.toggleBtnActive]}
                      onPress={() => setDiscountType('percent')}
                    >
                      <Text style={[styles.toggleBtnText, discountType === 'percent' && styles.toggleBtnTextActive]}>
                        %
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.discountInputRow, isRTL && styles.rowReverse]}>
                  <TextInput
                    style={[styles.discountInput, isRTL && styles.textRight]}
                    keyboardType="numeric"
                    placeholder="0"
                    value={discount.toString()}
                    onChangeText={(val) => setDiscount(Number(val) || 0)}
                  />
                  {discountType === 'percent' && discount > 0 && (
                    <Text style={styles.discountEquivalent}>
                      = -{formatMoney(calculatedDiscount)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Total Banner */}
              <View style={[styles.totalBanner, isRTL && styles.rowReverse]}>
                <Text style={styles.totalBannerLabel}>{t('total')} :</Text>
                <Text style={styles.totalBannerAmount}>{formatMoney(total)}</Text>
              </View>

              {/* Payment Method Selector */}
              <Text style={[styles.modalSectionLabel, isRTL && styles.textRight]}>{t('paymentMethod')}</Text>
              <View style={[styles.paymentMethodRow, isRTL && styles.rowReverse]}>
                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    paymentMethod === 'cash' && styles.methodBtnActive,
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Ionicons
                    name="cash"
                    size={20}
                    color={paymentMethod === 'cash' ? '#ffffff' : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.methodBtnText,
                      paymentMethod === 'cash' && styles.methodBtnTextActive,
                    ]}
                  >
                    {t('cash')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    paymentMethod === 'credit' && styles.methodBtnActive,
                  ]}
                  onPress={() => setPaymentMethod('credit')}
                >
                  <Ionicons
                    name="time"
                    size={20}
                    color={paymentMethod === 'credit' ? '#ffffff' : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.methodBtnText,
                      paymentMethod === 'credit' && styles.methodBtnTextActive,
                    ]}
                  >
                    {t('credit')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    paymentMethod === 'partial' && styles.methodBtnActive,
                  ]}
                  onPress={() => setPaymentMethod('partial')}
                >
                  <Ionicons
                    name="pie-chart"
                    size={20}
                    color={paymentMethod === 'partial' ? '#ffffff' : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.methodBtnText,
                      paymentMethod === 'partial' && styles.methodBtnTextActive,
                    ]}
                  >
                    {t('partial')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Cash given & change */}
              {paymentMethod === 'cash' && (
                <View style={styles.calcBox}>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('amountPaid')}</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    keyboardType="numeric"
                    placeholder={total.toString()}
                    value={paidAmountInput}
                    onChangeText={setPaidAmountInput}
                  />
                  {Number(paidAmountInput) > total && (
                    <Text style={[styles.changeText, isRTL && styles.textRight]}>
                      {t('change')} : <Text style={styles.boldText}>{formatMoney(change)}</Text>
                    </Text>
                  )}
                </View>
              )}

              {/* Customer Selector for Credit / Partial */}
              {(paymentMethod === 'credit' || paymentMethod === 'partial') && (
                <View style={styles.customerSelectBox}>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('selectCustomer')}</Text>
                  {customers.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.customerOption,
                        selectedCustomerId === c.id && styles.customerOptionActive,
                        isRTL && styles.rowReverse,
                      ]}
                      onPress={() => setSelectedCustomerId(c.id)}
                    >
                      <View style={styles.customerOptionMeta}>
                        <Text style={styles.customerOptionName}>{c.name}</Text>
                        <Text style={styles.customerOptionDebt}>
                          {t('currentDebt')}: {formatMoney(c.debt)}
                        </Text>
                      </View>
                      {selectedCustomerId === c.id && (
                        <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}

                  {paymentMethod === 'partial' && (
                    <View style={styles.calcBox}>
                      <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('amountPaid')}</Text>
                      <TextInput
                        style={[styles.inputBox, isRTL && styles.textRight]}
                        keyboardType="numeric"
                        placeholder="0"
                        value={paidAmountInput}
                        onChangeText={setPaidAmountInput}
                      />
                      <Text style={[styles.debtNotice, isRTL && styles.textRight]}>
                        {t('remainingDebt')} : {formatMoney(remainingCredit)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Direct Checkout Validation Button (Quits window immediately) */}
            <TouchableOpacity style={styles.confirmSaleBtn} onPress={handleConfirmSale}>
              <Text style={styles.confirmSaleBtnText}>{t('pay')} ({formatMoney(total)})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal visible={scannerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.scannerModalCard}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="scan" size={22} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>
                  {isRTL ? 'ماسح الباركود' : 'Scanner Code-barres'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setScannerModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <View style={styles.viewfinderFrame}>
                <Ionicons name="barcode-outline" size={64} color="#22c55e" />
                <Text style={styles.viewfinderHelp}>
                  {isRTL
                    ? 'امسح بالباركود أو اكتب الكود للإضافة السريعة'
                    : 'Scannez un article ou tapez le code pour ajouter au panier'}
                </Text>
              </View>

              <View style={[styles.scannerInputRow, isRTL && styles.rowReverse]}>
                <TextInput
                  style={[styles.scannerModalInput, isRTL && styles.textRight]}
                  placeholder={isRTL ? 'اكتب كود بار هنا...' : 'Saisir un code-barres...'}
                  value={barcodeInput}
                  onChangeText={setBarcodeInput}
                  onSubmitEditing={() => {
                    handleBarcodeScan();
                    setScannerModalVisible(false);
                  }}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.scannerModalValidateBtn}
                  onPress={() => {
                    handleBarcodeScan();
                    setScannerModalVisible(false);
                  }}
                >
                  <Text style={styles.scannerModalValidateBtnText}>
                    {isRTL ? 'إضافة' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Optional Receipt Viewer Modal */}
      <Modal visible={receiptModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>{t('receipt')}</Text>
              <TouchableOpacity onPress={() => setReceiptModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {lastCompletedSale && (
              <ScrollView style={{ maxHeight: 380 }}>
                <View style={styles.receiptPaper}>
                  <Text style={styles.receiptPaperText}>
                    {generateReceiptText(lastCompletedSale)}
                  </Text>
                </View>

                <View style={styles.receiptModalActions}>
                  <TouchableOpacity
                    style={styles.receiptWhatsAppBtn}
                    onPress={() => handleSendWhatsApp(lastCompletedSale)}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                    <Text style={styles.receiptActionText}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.receiptCopyBtn}
                    onPress={() => handleCopyReceipt(lastCompletedSale)}
                  >
                    <Ionicons name="copy-outline" size={18} color={theme.colors.text} />
                    <Text style={styles.receiptCopyText}>
                      {copyFeedback ? (isRTL ? 'تم النسخ' : 'Copié') : (isRTL ? 'نسخ' : 'Copier')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
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
  toastBanner: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toastText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    flex: 1,
  },
  toastReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.full,
    marginLeft: 8,
  },
  toastReceiptBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  barcodeScanBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    elevation: 2,
    height: 48,
  },
  barcodeIconBox: {
    paddingHorizontal: 6,
  },
  barcodeInput: {
    flex: 1,
    height: 44,
    fontSize: 13,
    color: theme.colors.text,
  },
  barcodeActionBtn: {
    padding: 4,
  },
  cameraScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    marginLeft: 4,
  },
  cameraScanBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  scanFeedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginTop: 6,
    padding: 8,
    borderRadius: theme.borderRadius.md,
  },
  bgSuccess: {
    backgroundColor: '#059669',
  },
  bgDanger: {
    backgroundColor: '#dc2626',
  },
  scanFeedbackText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 42,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: theme.typography.regular,
  },
  categoryContainer: {
    marginVertical: 8,
  },
  categoryScroll: {
    paddingHorizontal: theme.spacing.md,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  productsGrid: {
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: 90,
  },
  productCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    margin: 6,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 1,
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  inCartBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inCartBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  productName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
    minHeight: 34,
  },
  productBarcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  productBarcode: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginLeft: 2,
  },
  productBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  stockBadgeIn: {
    backgroundColor: theme.colors.successLight,
  },
  stockBadgeLow: {
    backgroundColor: theme.colors.warningLight,
  },
  stockBadgeOut: {
    backgroundColor: theme.colors.dangerLight,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  stockTextIn: {
    color: theme.colors.success,
  },
  stockTextLow: {
    color: '#b45309',
  },
  stockTextOut: {
    color: theme.colors.danger,
  },
  emptyProductsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyProductsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 10,
  },
  emptyProductsSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
  },
  cartInfo: {
    flex: 1,
  },
  cartItemsCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cartTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearCartBtn: {
    padding: 10,
    marginRight: 8,
  },
  checkoutBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: theme.borderRadius.full,
    elevation: 2,
  },
  checkoutBtnDisabled: {
    opacity: 0.5,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 6,
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
  modalScroll: {
    maxHeight: 460,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 10,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cartItemDesc: {
    flex: 1,
  },
  cartItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cartItemSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  cartItemQtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  cartItemTotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  discountContainer: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: theme.borderRadius.md,
    marginVertical: 10,
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  discountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  discountTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
  },
  toggleBtnText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  toggleBtnTextActive: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  discountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    height: 36,
    paddingHorizontal: 8,
    width: 100,
    fontSize: 13,
  },
  discountEquivalent: {
    fontSize: 12,
    color: theme.colors.danger,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    marginVertical: 8,
  },
  totalBannerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
  },
  totalBannerAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 3,
  },
  methodBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  methodBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 4,
  },
  methodBtnTextActive: {
    color: '#ffffff',
  },
  calcBox: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  inputBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  changeText: {
    fontSize: 13,
    color: theme.colors.success,
    marginTop: 4,
  },
  boldText: {
    fontWeight: 'bold',
  },
  customerSelectBox: {
    marginTop: 8,
  },
  customerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#f8fafc',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  customerOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  customerOptionMeta: {
    flex: 1,
  },
  customerOptionName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  customerOptionDebt: {
    fontSize: 11,
    color: theme.colors.danger,
    marginTop: 2,
  },
  debtNotice: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 4,
    fontWeight: 'bold',
  },
  confirmSaleBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: 14,
    elevation: 2,
  },
  confirmSaleBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  scannerModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  viewfinderFrame: {
    height: 140,
    backgroundColor: '#0f172a',
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  viewfinderHelp: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  scannerInputRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  scannerModalInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  scannerModalValidateBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  scannerModalValidateBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  receiptPaper: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  receiptPaperText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.text,
  },
  receiptModalActions: {
    flexDirection: 'row',
    marginTop: 14,
  },
  receiptWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginRight: 6,
  },
  receiptActionText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
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
  },
  receiptCopyText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 6,
  },
});
