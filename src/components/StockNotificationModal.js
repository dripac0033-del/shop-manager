import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function StockNotificationModal({ visible, onClose }) {
  const { t, formatMoney, products, updateProduct, isRTL } = useApp();

  const [addQtyInputs, setAddQtyInputs] = useState({});

  // Filter low stock and out-of-stock products
  const criticalProducts = products.filter((p) => p.stock <= p.minStock);

  const handleReplenish = (product) => {
    const qtyToAdd = Number(addQtyInputs[product.id] || 10);
    if (qtyToAdd <= 0) return;

    const newStock = product.stock + qtyToAdd;
    updateProduct(product.id, { stock: newStock });

    setAddQtyInputs({ ...addQtyInputs, [product.id]: '' });
    Alert.alert(
      t('inStock'),
      isRTL
        ? `تمت إضافة +${qtyToAdd} إلى مخزون ${product.nameAr || product.nameFr} (المجموع الجديد: ${newStock})`
        : `+${qtyToAdd} unités ajoutées à ${product.nameFr} (Nouveau stock : ${newStock})`
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
            <View style={[styles.titleGroup, isRTL && styles.rowReverse]}>
              <View style={styles.alertIconBox}>
                <Ionicons name="warning" size={24} color="#ffffff" />
              </View>
              <View style={isRTL && styles.alignRight}>
                <Text style={styles.modalTitle}>
                  {isRTL ? 'تنبيهات نفاذ المخزون' : 'Alertes Stock Limite'}
                </Text>
                <Text style={styles.modalSub}>
                  {criticalProducts.length} {isRTL ? 'منتجات تجاوزت الحد الأدنى' : 'produits sous le seuil critique'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* List of critical products */}
          {criticalProducts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-circle" size={54} color={theme.colors.success} />
              <Text style={styles.emptyTitle}>
                {isRTL ? 'جميع المنتجات متوفرة بشكل جيد!' : 'Tous les stocks sont à niveau !'}
              </Text>
              <Text style={styles.emptySub}>
                {isRTL
                  ? 'لا يوجد أي منتج وصل إلى الحد الأدنى للتنبيه حالياً.'
                  : 'Aucun produit n\'a atteint son seuil d\'alerte.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={criticalProducts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => {
                const isZero = item.stock <= 0;

                return (
                  <View style={[styles.productCard, isRTL && styles.rowReverse]}>
                    <View style={styles.productInfo}>
                      <View style={[styles.tagRow, isRTL && styles.rowReverse]}>
                        <View
                          style={[
                            styles.badge,
                            isZero ? styles.badgeDanger : styles.badgeWarning,
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              isZero ? styles.textDanger : styles.textWarning,
                            ]}
                          >
                            {isZero ? (isRTL ? 'نفذ كلياً' : 'Rupture') : (isRTL ? 'مخزون حرج' : 'Critique')}
                          </Text>
                        </View>
                        <Text style={styles.barcodeText}>#{item.barcode}</Text>
                      </View>

                      <Text style={[styles.productName, isRTL && styles.textRight]}>
                        {isRTL ? item.nameAr || item.nameFr : item.nameFr}
                      </Text>

                      <Text style={[styles.stockDetailText, isRTL && styles.textRight]}>
                        {isRTL ? 'المتبقي:' : 'Reste :'} <Text style={styles.boldRed}>{item.stock}</Text> / {isRTL ? 'الحد الأدنى:' : 'Seuil :'} {item.minStock}
                      </Text>
                    </View>

                    {/* Quick Replenish Controls */}
                    <View style={styles.replenishBox}>
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="numeric"
                        placeholder="+10"
                        placeholderTextColor={theme.colors.textMuted}
                        value={addQtyInputs[item.id] || ''}
                        onChangeText={(txt) =>
                          setAddQtyInputs({ ...addQtyInputs, [item.id]: txt })
                        }
                      />
                      <TouchableOpacity
                        style={styles.replenishBtn}
                        onPress={() => handleReplenish(item)}
                      >
                        <Ionicons name="add" size={16} color="#ffffff" />
                        <Text style={styles.replenishBtnText}>
                          {isRTL ? 'إمداد' : 'Ajouter'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Bottom dismiss button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>{isRTL ? 'إغلاق التنبيهات' : 'Fermer'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '85%',
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.typography.title,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalSub: {
    fontSize: 12,
    color: theme.colors.danger,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: theme.spacing.xs,
  },
  listContainer: {
    paddingVertical: theme.spacing.sm,
  },
  productCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.danger,
  },
  productInfo: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginRight: 6,
  },
  badgeDanger: {
    backgroundColor: theme.colors.dangerLight,
  },
  badgeWarning: {
    backgroundColor: theme.colors.warningLight,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  textDanger: {
    color: theme.colors.danger,
  },
  textWarning: {
    color: theme.colors.warning,
  },
  barcodeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  productName: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  stockDetailText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  boldRed: {
    fontWeight: 'bold',
    color: theme.colors.danger,
  },
  replenishBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  qtyInput: {
    width: 48,
    height: 36,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    textAlign: 'center',
    fontSize: 12,
    marginRight: 4,
  },
  replenishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
  },
  replenishBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  emptyBox: {
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
  },
  doneBtn: {
    backgroundColor: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  doneBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
