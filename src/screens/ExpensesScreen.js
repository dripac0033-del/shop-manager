import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ExpensesScreen() {
  const {
    t,
    formatMoney,
    expenses = [],
    addExpense,
    updateExpense,
    deleteExpense,
    clearAllExpenses,
    isRTL,
    firebaseConnected,
    syncStatus,
    lastSyncTime,
  } = useApp();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Add Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('other');

  const categories = [
    { key: 'rent', icon: 'business', label: t('rent') },
    { key: 'electricity', icon: 'flash', label: t('electricity') },
    { key: 'salary', icon: 'people', label: t('salary') },
    { key: 'transport', icon: 'car', label: t('transport') },
    { key: 'maintenance', icon: 'construct', label: t('maintenance') },
    { key: 'other', icon: 'ellipsis-horizontal', label: t('other') },
  ];

  const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const handleAddExpense = async () => {
    if (!title.trim() || !amount) {
      Alert.alert(t('newExpense'), isRTL ? 'يرجى إدخال سبب المصروف والمبلغ!' : 'Veuillez saisir le motif et le montant !');
      return;
    }

    try {
      await addExpense({
        title: title.trim(),
        amount: Number(amount),
        category,
      });

      setTitle('');
      setAmount('');
      setCategory('other');
      setAddModalVisible(false);
    } catch (err) {
      console.warn('Error adding expense:', err);
    }
  };

  const handleOpenEdit = (exp) => {
    setSelectedExpense(exp);
    setEditTitle(exp.title || '');
    setEditAmount((exp.amount || 0).toString());
    setEditCategory(exp.category || 'other');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedExpense) return;
    if (!editTitle.trim() || !editAmount) {
      Alert.alert(t('newExpense'), isRTL ? 'يرجى إدخال سبب المصروف والمبلغ!' : 'Veuillez saisir le motif et le montant !');
      return;
    }

    try {
      await updateExpense(selectedExpense.id, {
        title: editTitle.trim(),
        amount: Number(editAmount),
        category: editCategory,
      });
      setEditModalVisible(false);
      setSelectedExpense(null);
    } catch (err) {
      console.warn('Error updating expense:', err);
    }
  };

  const handleDelete = (exp) => {
    const confirmMsg = isRTL
      ? `هل تريد حذف المصروف "${exp.title}" (${formatMoney(exp.amount)})؟`
      : `Voulez-vous vraiment supprimer la dépense "${exp.title}" (${formatMoney(exp.amount)}) ?`;

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) {
        deleteExpense(exp.id);
      }
      return;
    }

    Alert.alert(
      t('deleteProduct'),
      confirmMsg,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: isRTL ? 'حذف' : 'Supprimer', style: 'destructive', onPress: () => deleteExpense(exp.id) },
      ]
    );
  };

  const handleClearAll = () => {
    const confirmMsg = isRTL
      ? 'هل أنت متأكد من مسح جميع المصاريف المسجلة في التطبيق وقاعدة البيانات؟'
      : 'Voulez-vous vraiment effacer toutes les dépenses enregistrées sur l\'application et Firebase ?';

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) {
        clearAllExpenses();
      }
      return;
    }

    Alert.alert(
      isRTL ? 'مسح المصاريف' : 'Vider les dépenses',
      confirmMsg,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: isRTL ? 'مسح الكل' : 'Effacer tout', style: 'destructive', onPress: clearAllExpenses },
      ]
    );
  };

  return (
    <View style={styles.container}>
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
              ? (isRTL ? 'جارٍ حفظ المصروف في السحابة...' : 'Envoi vers Firebase...')
              : syncStatus === 'receiving'
              ? (isRTL ? 'تحديث فوري للمصاريف...' : 'Réception en direct de Firebase...')
              : firebaseConnected
              ? (isRTL ? 'المصاريف متزامنة مباشرة مع فايربيس' : 'Dépenses synchronisées avec Firebase')
              : (isRTL ? 'الوضع المحلي' : 'Mode Local')}
          </Text>
        </View>
        {lastSyncTime && (
          <Text style={styles.syncTimeText}>{lastSyncTime}</Text>
        )}
      </View>

      {/* Total Banner */}
      <View style={[styles.summaryBanner, isRTL && styles.rowReverse]}>
        <View style={[styles.summaryMeta, isRTL && styles.alignRight]}>
          <Text style={styles.summaryTitle}>{t('totalExpenses')}</Text>
          <Text style={styles.summaryAmount}>{formatMoney(totalExpenses)}</Text>
          <Text style={styles.summaryCount}>
            {(expenses || []).length} {isRTL ? 'عمليات مصروفات' : 'dépenses enregistrées'}
          </Text>
        </View>

        <View style={[styles.headerActions, isRTL && styles.rowReverse]}>
          <TouchableOpacity style={styles.addExpenseBtn} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.addExpenseBtnText}>{t('newExpense')}</Text>
          </TouchableOpacity>

          {(expenses || []).length > 0 && (
            <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={16} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Expenses List */}
      {(expenses || []).length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={54} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {isRTL ? 'لا توجد أي مصاريف مسجلة' : 'Aucune dépense enregistrée'}
          </Text>
          <Text style={styles.emptySub}>
            {isRTL
              ? 'سجل مصاريف المحل كالفواتير، كراء المحل، أو الصيانة ليتم خصمها تلقائياً من الأرباح.'
              : 'Enregistrez les charges du magasin (loyer, factures, salaires) pour les déduire de votre bénéfice net.'}
          </Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="add-circle" size={18} color="#ffffff" />
            <Text style={styles.emptyAddBtnText}>{t('newExpense')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const catObj = categories.find((c) => c.key === item.category) || categories[5];
            const dateStr = item.date ? new Date(item.date).toLocaleDateString() : '';

            return (
              <View style={[styles.expenseCard, isRTL && styles.rowReverse]}>
                <View style={styles.iconCircle}>
                  <Ionicons name={catObj.icon} size={22} color={theme.colors.secondary} />
                </View>

                <View style={[styles.expenseDetails, isRTL && styles.alignRight]}>
                  <Text style={styles.expenseTitleText}>{item.title}</Text>
                  <Text style={styles.expenseSubText}>
                    {catObj.label} {dateStr ? `• ${dateStr}` : ''}
                  </Text>
                </View>

                <View style={styles.amountCol}>
                  <Text style={styles.amountText}>-{formatMoney(item.amount || 0)}</Text>
                  <View style={[styles.cardBtnRow, isRTL && styles.rowReverse]}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
                      <Ionicons name="pencil" size={15} color={theme.colors.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                      <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Add Expense Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>{t('newExpense')}</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('expenseTitle')} *</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Facture Sonelgaz, Achat Sacs, etc."
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('expenseAmount')} *</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('expenseCategory')}</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      styles.catSelectBtn,
                      category === c.key && styles.catSelectBtnActive,
                    ]}
                    onPress={() => setCategory(c.key)}
                  >
                    <Ionicons
                      name={c.icon}
                      size={16}
                      color={category === c.key ? '#ffffff' : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.catSelectBtnText,
                        category === c.key && styles.catSelectBtnTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleAddExpense}>
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {isRTL ? 'تعديل المصروف' : 'Modifier la Dépense'}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('expenseTitle')} *</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Ex: Facture Sonelgaz"
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('expenseAmount')} *</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="numeric"
                placeholder="0"
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('expenseCategory')}</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      styles.catSelectBtn,
                      editCategory === c.key && styles.catSelectBtnActive,
                    ]}
                    onPress={() => setEditCategory(c.key)}
                  >
                    <Ionicons
                      name={c.icon}
                      size={16}
                      color={editCategory === c.key ? '#ffffff' : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.catSelectBtnText,
                        editCategory === c.key && styles.catSelectBtnTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>
                  {isRTL ? 'حفظ التعديل في فايربيس' : 'Enregistrer les modifications'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
  syncStatusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
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
  summaryBanner: {
    backgroundColor: '#7c3aed',
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
  },
  summaryMeta: {
    flex: 1,
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: theme.typography.small,
    opacity: 0.9,
  },
  summaryAmount: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  summaryCount: {
    color: '#ffffff',
    fontSize: theme.typography.small,
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addExpenseBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addExpenseBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: theme.typography.small,
  },
  clearAllBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 40,
  },
  expenseCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseTitleText: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  expenseSubText: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.danger,
    marginBottom: 4,
  },
  cardBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
  },
  emptyAddBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
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
    maxWidth: 480,
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
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  catSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: theme.colors.surface,
  },
  catSelectBtnActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  catSelectBtnText: {
    fontSize: 12,
    marginLeft: 4,
    color: theme.colors.textSecondary,
  },
  catSelectBtnTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#7c3aed',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: theme.typography.medium,
  },
});
