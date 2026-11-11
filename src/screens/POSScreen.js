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

export default function POSScreen() {
  const {
    t,
    formatMoney,
    products,
    customers,
    completeSale,
    isRTL,
    storeInfo,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);

  // Modals
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'credit' | 'partial'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState('');

  // Categories list
  const categories = ['All', ...new Set(products.map((p) => p.category))];

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.barcode.includes(searchQuery) ||
      (p.nameFr && p.nameFr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.nameAr && p.nameAr.includes(searchQuery));
    const matchesCategory =
      selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const addToCart = (product) => {
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

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
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
      discount: Number(discount || 0),
      total,
      paidAmount: paymentMethod === 'cash' ? total : Number(paidAmountInput || 0),
      paymentMethod,
      customerId: selectedCustomerId || null,
    });

    setLastCompletedSale(sale);
    setCheckoutModalVisible(false);
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

  return (
    <View style={styles.container}>
      {/* Search & Barcode input bar */}
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
              <Text style={styles.productBarcode}>#{item.barcode}</Text>

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
              {isRTL ? 'لا توجد منتجات مسجلة في المتجر' : 'Aucun produit disponible en caisse'}
            </Text>
            <Text style={styles.emptyProductsSub}>
              {isRTL
                ? 'يرجى التوجه إلى قسم (المنتجات) لإضافة سلع إلى المخزون.'
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

              {/* Discount Input */}
              <View style={[styles.discountRow, isRTL && styles.rowReverse]}>
                <Text style={styles.discountLabel}>{t('discount')} :</Text>
                <TextInput
                  style={[styles.discountInput, isRTL && styles.textRight]}
                  keyboardType="numeric"
                  placeholder="0"
                  value={discount.toString()}
                  onChangeText={(val) => setDiscount(Number(val) || 0)}
                />
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

      {/* Thermal Receipt Preview Modal */}
      <Modal visible={receiptModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptContainer}>
            <ScrollView contentContainerStyle={styles.receiptContent}>
              <Text style={styles.receiptStoreName}>{storeInfo.name}</Text>
              <Text style={styles.receiptSub}>{storeInfo.phone} • {storeInfo.address}</Text>
              <Text style={styles.receiptDivider}>--------------------------------</Text>
              <Text style={styles.receiptDate}>
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </Text>
              <Text style={styles.receiptDivider}>--------------------------------</Text>

              {lastCompletedSale?.items.map((item, index) => (
                <View key={index} style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemName}>
                    {item.nameFr} x{item.quantity}
                  </Text>
                  <Text style={styles.receiptItemTotal}>
                    {formatMoney(item.sellPrice * item.quantity)}
                  </Text>
                </View>
              ))}

              <Text style={styles.receiptDivider}>--------------------------------</Text>
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>{t('total')}</Text>
                <Text style={styles.receiptTotalVal}>{formatMoney(lastCompletedSale?.total || 0)}</Text>
              </View>

              <Text style={styles.receiptMethod}>
                {t('paymentMethod')}: {lastCompletedSale?.paymentMethod === 'cash' ? t('cash') : t('credit')}
              </Text>

              <Text style={styles.receiptDivider}>--------------------------------</Text>
              <Text style={styles.receiptFooter}>{storeInfo.footer}</Text>
            </ScrollView>

            <View style={styles.receiptActions}>
              <TouchableOpacity
                style={styles.receiptPrintBtn}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
                    window.print();
                    setReceiptModalVisible(false);
                    return;
                  }
                  Alert.alert(t('printReceipt'), isRTL ? 'تم إرسال أمر الطباعة إلى الطابعة الحرارية!' : 'Impression thermique envoyée !');
                  setReceiptModalVisible(false);
                }}
              >
                <Ionicons name="print" size={20} color="#ffffff" />
                <Text style={styles.receiptPrintBtnText}>{t('printReceipt')}</Text>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
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
    height: 44,
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
    margin: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  inCartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inCartBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  productName: {
    fontSize: theme.typography.regular,
    fontWeight: '600',
    color: theme.colors.text,
  },
  productBarcode: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  productBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  productPrice: {
    fontSize: theme.typography.medium,
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
    fontWeight: '600',
  },
  stockTextIn: {
    color: theme.colors.success,
  },
  stockTextLow: {
    color: theme.colors.warning,
  },
  stockTextOut: {
    color: theme.colors.danger,
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
    fontSize: theme.typography.title,
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
    backgroundColor: theme.colors.dangerLight,
    borderRadius: theme.borderRadius.md,
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
    backgroundColor: theme.colors.textMuted,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: theme.typography.medium,
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
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
    maxHeight: 450,
  },
  modalSectionLabel: {
    fontSize: theme.typography.small,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cartItemDesc: {
    flex: 2,
  },
  cartItemTitle: {
    fontSize: theme.typography.regular,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cartItemSub: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
  },
  cartItemQtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  cartItemTotal: {
    flex: 1,
    textAlign: 'right',
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  discountLabel: {
    fontSize: theme.typography.regular,
    color: theme.colors.textSecondary,
  },
  discountInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    width: 100,
    height: 36,
    paddingHorizontal: theme.spacing.sm,
    textAlign: 'center',
    fontSize: theme.typography.regular,
  },
  totalBanner: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  totalBannerLabel: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
  },
  totalBannerAmount: {
    fontSize: theme.typography.header,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  methodBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
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
    marginTop: theme.spacing.md,
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
    height: 44,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.medium,
  },
  changeText: {
    marginTop: 6,
    fontSize: theme.typography.medium,
    color: theme.colors.success,
  },
  boldText: {
    fontWeight: 'bold',
  },
  debtNotice: {
    marginTop: 6,
    fontSize: theme.typography.regular,
    color: theme.colors.danger,
    fontWeight: '600',
  },
  customerSelectBox: {
    marginTop: theme.spacing.sm,
  },
  customerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
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
    fontSize: theme.typography.regular,
    fontWeight: '600',
    color: theme.colors.text,
  },
  customerOptionDebt: {
    fontSize: theme.typography.small,
    color: theme.colors.danger,
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
  receiptContainer: {
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
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
  },
  receiptActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  receiptPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
  },
  receiptPrintBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  receiptCloseBtn: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
  },
  receiptCloseBtnText: {
    color: theme.colors.text,
    fontWeight: '600',
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
