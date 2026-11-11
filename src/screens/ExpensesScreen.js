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
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ExpensesScreen() {
  const { t, formatMoney, expenses, addExpense, deleteExpense, isRTL } = useApp();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');

  const categories = [
    { key: 'rent', icon: 'business', label: t('rent') },
    { key: 'electricity', icon: 'flash', label: t('electricity') },
    { key: 'salary', icon: 'people', label: t('salary') },
    { key: 'transport', icon: 'car', label: t('transport') },
    { key: 'maintenance', icon: 'construct', label: t('maintenance') },
    { key: 'other', icon: 'ellipsis-horizontal', label: t('other') },
  ];

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleAddExpense = () => {
    if (!title.trim() || !amount) {
      Alert.alert(t('newExpense'), isRTL ? 'يرجى إدخال سبب المصروف والمبلغ!' : 'Veuillez saisir le motif et le montant !');
      return;
    }

    addExpense({
      title: title.trim(),
      amount: Number(amount),
      category,
    });

    setTitle('');
    setAmount('');
    setCategory('other');
    setModalVisible(false);
  };

  const handleDelete = (id) => {
    Alert.alert(
      t('deleteProduct'),
      t('confirmDelete'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('deleteProduct'), style: 'destructive', onPress: () => deleteExpense(id) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Total Banner */}
      <View style={[styles.summaryBanner, isRTL && styles.rowReverse]}>
        <View style={[styles.summaryMeta, isRTL && styles.alignRight]}>
          <Text style={styles.summaryTitle}>{t('totalExpenses')}</Text>
          <Text style={styles.summaryAmount}>{formatMoney(totalExpenses)}</Text>
        </View>

        <TouchableOpacity style={styles.addExpenseBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addExpenseBtnText}>{t('newExpense')}</Text>
        </TouchableOpacity>
      </View>

      {/* Expenses List */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const catObj = categories.find((c) => c.key === item.category) || categories[5];

          return (
            <View style={[styles.expenseCard, isRTL && styles.rowReverse]}>
              <View style={styles.iconCircle}>
                <Ionicons name={catObj.icon} size={22} color={theme.colors.secondary} />
              </View>

              <View style={[styles.expenseDetails, isRTL && styles.alignRight]}>
                <Text style={styles.expenseTitleText}>{item.title}</Text>
                <Text style={styles.expenseSubText}>
                  {catObj.label} • {new Date(item.date).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.amountCol}>
                <Text style={styles.amountText}>-{formatMoney(item.amount)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Add Expense Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>{t('newExpense')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

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
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: theme.typography.small,
  },
  summaryAmount: {
    color: '#ffffff',
    fontSize: theme.typography.header,
    fontWeight: 'bold',
    marginTop: 2,
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  addExpenseBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: theme.typography.small,
    marginLeft: 6,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  expenseCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseTitleText: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  expenseSubText: {
    fontSize: 12,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.typography.title,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  inputLabel: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    height: 44,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.regular,
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
    backgroundColor: theme.colors.background,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  catSelectBtnActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  catSelectBtnText: {
    fontSize: 11,
    color: theme.colors.text,
    marginLeft: 4,
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
