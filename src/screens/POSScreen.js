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
    customers = [],
    completeSale,
    isRTL,
    storeInfo,
    currentUser,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  
  // Barcode Fast Scan State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'success' | 'error', text: '' }
  const [scannerModalVisible, setScannerModalVisible] = useState(false);

  // Discount & Checkout
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' | 'percent'
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
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

  // Categories list
  const validProducts = Array.isArray(products) ? products : [];
  const categories = ['All', ...new Set(validProducts.map((p) => p.category).filter(Boolean))];

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
      selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
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

  // Barcode scanning handler (works with physical barcode gun / scanner / typed input)
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
    }, 3500);
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

  // Handle Checkout submission
  const handleConfirmSale = async () => {
    if (cart.length === 0) return;

    if ((paymentMethod === 'credit' || paymentMethod === 'partial') && !selectedCustomerId) {
      Alert.alert(t('credit'), isRTL ? 'يجب اختيار زبون لتسجيل الدين!' : 'Veuillez sélectionner un client pour le crédit !');
      return;
    }

    const { sale, lowStockWarnings } = await completeSale({
      items: cart,
      subtotal,
      discount: calculatedDiscount,
      total,
      paidAmount: paymentMethod === 'cash' ? total : Number(paidAmountInput || 0),
      paymentMethod,
      customerId: selectedCustomerId || null,
    });

    setLastCompletedSale(sale);
    setCheckoutModalVisible(false);

    // Pre-fill phone if client is selected
    const chosenCust = (customers || []).find((c) => c.id === selectedCustomerId);
    if (chosenCust?.phone) {
      setSharePhone(chosenCust.phone);
    } else {
      setSharePhone('');
    }
    setShareEmail('');

    clearCart();
    setPaidAmountInput('');
    setSelectedCustomerId('');
    setPaymentMethod('cash');
    setReceiptModalVisible(true);

    if (lowStockWarnings && lowStockWarnings.length > 0) {
      const names = lowStockWarnings.map((p) => isRTL ? (p.nameAr || p.nameFr) : p.nameFr).join(', ');
      setTimeout(() => {
        Alert.alert(
          isRTL ? '⚠️ تنبيه: نقص في المخزون!' : '⚠️ Attention : Seuil Stock Limite Atteint !',
          isRTL
            ? `المنتجات التالية وصلت إلى الحد الأدنى للمخزون: ${names}. يرجى إعادة الطلب في أقرب وقت.`
            : `Le(s) produit(s) suivant(s) ont atteint ou dépassé le seuil minimum d'alerte : ${names}. Pensez à vous réapprovisionner !`
        );
      }, 600);
    }
  };

  // Generate formatted printable / readable text ticket
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

  // Send receipt via WhatsApp
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
      Linking.openURL(url).catch(() => {
        Alert.alert('WhatsApp', text);
      });
    }
  };

  // Send receipt via Email
  const handleSendEmail = (sale) => {
    const text = generateReceiptText(sale);
    const subject = `Facture / Ticket - ${storeInfo.name || 'Store Soft'}`;
    const cleanMail = (shareEmail || '').trim();
    const mailto = `mailto:${cleanMail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(mailto, '_blank');
    } else {
      Linking.openURL(mailto).catch(() => {
        Alert.alert('Email', text);
      });
    }
  };

  // Copy receipt to clipboard
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

      {/* Instant Scan Toast / Feedback */}
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

      {/* 2. Text Search Bar */}
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

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
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
                : 'Veuillez ajouter des articles dans l\'onglet Produits pour enregistrer des ventes.'}
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

      {/* Checkout Modal */}
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

              {/* Discount / Remise (DZD ou %) */}
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

            <TouchableOpacity style={styles.confirmSaleBtn} onPress={handleConfirmSale}>
              <Text style={styles.confirmSaleBtnText}>{t('pay')} ({formatMoney(total)})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. Barcode Scanner Camera & Quick Tester Modal */}
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
              {/* Simulated Camera Viewfinder */}
              <View style={styles.viewfinderFrame}>
                <View style={styles.viewfinderScanLine} />
                <Ionicons name="barcode-outline" size={60} color="#22c55e" />
                <Text style={styles.viewfinderHelp}>
                  {isRTL
                    ? 'وجه الكاميرا أو قارئ الباركود نحو كود المنتج'
                    : 'Pointez votre lecteur ou saisissez le code ci-dessous'}
                </Text>
              </View>

              {/* Fast Manual Input */}
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

              {/* Quick-tap products with barcode */}
              <Text style={[styles.scannerQuickTitle, isRTL && styles.textRight]}>
                {isRTL ? 'أو اختر منتجاً بنقرة واحدة:' : 'Ou cliquez sur un produit pour simuler :'}
              </Text>
              {validProducts.slice(0, 10).map((prod) => (
                <TouchableOpacity
                  key={prod.id}
                  style={[styles.scannerProductItem, isRTL && styles.rowReverse]}
                  onPress={() => {
                    handleBarcodeScan(prod.barcode);
                    setScannerModalVisible(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scannerProdName}>
                      {isRTL ? prod.nameAr || prod.nameFr : prod.nameFr}
                    </Text>
                    <Text style={styles.scannerProdCode}>#{prod.barcode}</Text>
                  </View>
                  <Text style={styles.scannerProdPrice}>{formatMoney(prod.sellPrice)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. Thermal Receipt & Direct Share Modal (WhatsApp, Email, Print) */}
      <Modal visible={receiptModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptContainer}>
            <ScrollView contentContainerStyle={styles.receiptContent}>
              <Text style={styles.receiptStoreName}>{storeInfo.name || 'Store Soft'}</Text>
              <Text style={styles.receiptSub}>
                {storeInfo.phone} • {storeInfo.address}
              </Text>
              <Text style={styles.receiptDivider}>--------------------------------</Text>
              <Text style={styles.receiptDate}>
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </Text>
              {lastCompletedSale?.cashierName && (
                <Text style={styles.receiptCashierText}>
                  {isRTL ? 'البائع:' : 'Caissier :'} {lastCompletedSale.cashierName}
                </Text>
              )}
              <Text style={styles.receiptDivider}>--------------------------------</Text>

              {(lastCompletedSale?.items || []).map((item, index) => (
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

              {lastCompletedSale?.discount > 0 && (
                <View style={styles.receiptDiscountRow}>
                  <Text style={styles.receiptDiscountLabel}>{t('discount')}</Text>
                  <Text style={styles.receiptDiscountVal}>
                    -{formatMoney(lastCompletedSale.discount)}
                  </Text>
                </View>
              )}

              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>{t('total')}</Text>
                <Text style={styles.receiptTotalVal}>{formatMoney(lastCompletedSale?.total || 0)}</Text>
              </View>

              <Text style={styles.receiptMethod}>
                {t('paymentMethod')}: {lastCompletedSale?.paymentMethod === 'cash' ? t('cash') : t('credit')}
              </Text>

              <Text style={styles.receiptDivider}>--------------------------------</Text>
              <Text style={styles.receiptFooter}>{storeInfo.footer || 'Merci pour votre visite !'}</Text>

              {/* Instant Share Inputs (WhatsApp & Email) */}
              <View style={styles.shareSectionBox}>
                <Text style={[styles.shareSectionTitle, isRTL && styles.textRight]}>
                  {isRTL ? 'إرسال الفاتورة مباشرة للزبون :' : 'Envoyer la facture directement au client :'}
                </Text>

                {/* WhatsApp Direct */}
                <View style={[styles.shareInputRow, isRTL && styles.rowReverse]}>
                  <View style={styles.shareInputWrapper}>
                    <Ionicons name="logo-whatsapp" size={18} color="#25D366" style={{ marginHorizontal: 6 }} />
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
                    onPress={() => handleSendWhatsApp(lastCompletedSale)}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#ffffff" />
                    <Text style={styles.shareBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>

                {/* Email Direct */}
                <View style={[styles.shareInputRow, isRTL && styles.rowReverse]}>
                  <View style={styles.shareInputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="#3b82f6" style={{ marginHorizontal: 6 }} />
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
                    onPress={() => handleSendEmail(lastCompletedSale)}
                  >
                    <Ionicons name="mail" size={16} color="#ffffff" />
                    <Text style={styles.shareBtnText}>Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Receipt Modal Bottom Actions */}
            <View style={styles.receiptActions}>
              <TouchableOpacity
                style={styles.receiptPrintBtn}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
                    window.print();
                    return;
                  }
                  Alert.alert(t('printReceipt'), isRTL ? 'تم إرسال أمر الطباعة إلى الطابعة الحرارية!' : 'Impression thermique envoyée !');
                }}
              >
                <Ionicons name="print" size={18} color="#ffffff" />
                <Text style={styles.receiptPrintBtnText}>{t('printReceipt')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.receiptCopyBtn}
                onPress={() => handleCopyReceipt(lastCompletedSale)}
              >
                <Ionicons
                  name={copyFeedback ? 'checkmark' : 'copy-outline'}
                  size={18}
                  color={copyFeedback ? '#22c55e' : theme.colors.text}
                />
                <Text style={[styles.receiptCopyBtnText, copyFeedback && { color: '#22c55e' }]}>
                  {copyFeedback ? (isRTL ? 'تم النسخ' : 'Copié !') : (isRTL ? 'نسخ' : 'Copier')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.receiptCloseBtn}
                onPress={() => setReceiptModalVisible(false)}
              >
                <Text style={styles.receiptCloseBtnText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
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
  barcodeScanBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  barcodeIconBox: {
    marginRight: 8,
  },
  barcodeInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: theme.colors.text,
  },
  barcodeActionBtn: {
    paddingHorizontal: 6,
  },
  cameraScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    marginLeft: 6,
  },
  cameraScanBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  scanFeedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
  },
  bgSuccess: {
    backgroundColor: '#16a34a',
  },
  bgDanger: {
    backgroundColor: '#dc2626',
  },
  scanFeedbackText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: theme.typography.regular,
    color: theme.colors.text,
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
  productsGrid: {
    padding: theme.spacing.sm,
    paddingBottom: 90,
  },
  productCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    margin: theme.spacing.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  inCartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.full,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inCartBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productName: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  productBarcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  productBarcode: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  productBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  productPrice: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  stockBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: theme.borderRadius.sm,
  },
  stockBadgeIn: {
    backgroundColor: '#dcfce7',
  },
  stockBadgeLow: {
    backgroundColor: '#fef3c7',
  },
  stockBadgeOut: {
    backgroundColor: '#fee2e2',
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  stockTextIn: {
    color: '#15803d',
  },
  stockTextLow: {
    color: '#b45309',
  },
  stockTextOut: {
    color: '#b91c1c',
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    elevation: 8,
  },
  cartInfo: {
    flex: 1,
  },
  cartItemsCount: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
  },
  cartTotalAmount: {
    fontSize: theme.typography.header,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearCartBtn: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
  },
  checkoutBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    marginRight: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.typography.header,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalSectionLabel: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cartItemDesc: {
    flex: 2,
  },
  cartItemTitle: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  cartItemSub: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
  },
  cartItemQtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  qtyText: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    marginHorizontal: theme.spacing.sm,
  },
  cartItemTotal: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
  },
  discountContainer: {
    marginTop: theme.spacing.md,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  discountLabel: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  discountTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: theme.borderRadius.sm,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm - 2,
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  discountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  discountEquivalent: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.danger,
  },
  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.md,
  },
  totalBannerLabel: {
    fontSize: theme.typography.header,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  totalBannerAmount: {
    fontSize: theme.typography.header,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.sm,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 4,
  },
  methodBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  methodBtnText: {
    fontSize: theme.typography.small,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 4,
  },
  methodBtnTextActive: {
    color: '#ffffff',
  },
  calcBox: {
    marginTop: theme.spacing.sm,
  },
  inputLabel: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.typography.medium,
  },
  changeText: {
    fontSize: theme.typography.regular,
    color: theme.colors.success,
    marginTop: 4,
  },
  boldText: {
    fontWeight: 'bold',
  },
  customerSelectBox: {
    marginTop: theme.spacing.sm,
  },
  customerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginBottom: 6,
  },
  customerOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  customerOptionMeta: {
    flex: 1,
  },
  customerOptionName: {
    fontSize: theme.typography.regular,
    fontWeight: '600',
    color: theme.colors.text,
  },
  customerOptionDebt: {
    fontSize: theme.typography.small,
    color: theme.colors.danger,
  },
  debtNotice: {
    fontSize: theme.typography.small,
    color: theme.colors.danger,
    marginTop: 4,
    fontWeight: '600',
  },
  confirmSaleBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  confirmSaleBtnText: {
    color: '#ffffff',
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
  },
  /* Scanner Modal Styles */
  scannerModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 440,
    elevation: 8,
  },
  viewfinderFrame: {
    height: 140,
    backgroundColor: '#0f172a',
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 12,
  },
  viewfinderScanLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  viewfinderHelp: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  scannerInputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  scannerModalInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 14,
  },
  scannerModalValidateBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
    marginLeft: 6,
  },
  scannerModalValidateBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  scannerQuickTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  scannerProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  scannerProdName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  scannerProdCode: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  scannerProdPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  /* Receipt Modal Styles */
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
  emptyProductsBox: {
    width: '100%',
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyProductsTitle: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyProductsSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
