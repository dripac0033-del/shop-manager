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
  Linking,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function CustomersScreen() {
  const {
    t,
    formatMoney,
    customers,
    addCustomer,
    recordCustomerPayment,
    isRTL,
    storeInfo,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [initialDebt, setInitialDebt] = useState('');

  // Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  const totalDebt = customers.reduce((sum, c) => sum + (c.debt || 0), 0);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery));
    const matchesDebt = filterDebtOnly ? c.debt > 0 : true;
    return matchesSearch && matchesDebt;
  });

  const handleAddCustomer = () => {
    if (!name.trim()) {
      Alert.alert(t('customerName'), isRTL ? 'يرجى إدخال اسم الزبون!' : 'Veuillez saisir le nom du client !');
      return;
    }

    addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      debt: Number(initialDebt || 0),
    });

    setName('');
    setPhone('');
    setAddress('');
    setInitialDebt('');
    setAddModalVisible(false);
  };

  const handleOpenPayment = (customer) => {
    setSelectedCustomer(customer);
    setPayAmount('');
    setPayNote('');
    setPaymentModalVisible(true);
  };

  const handleConfirmPayment = () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      Alert.alert(t('paymentAmount'), isRTL ? 'يرجى إدخال مبلغ صحيح!' : 'Veuillez entrer un montant valide !');
      return;
    }

    recordCustomerPayment(selectedCustomer.id, amount, payNote);
    setPaymentModalVisible(false);
    Alert.alert(
      t('saleCompleted'),
      isRTL
        ? `تم تسجيل تسديد مبلغ ${formatMoney(amount)} بنجاح!`
        : `Paiement de ${formatMoney(amount)} enregistré avec succès !`
    );
  };

  const handleShareDebt = (customer) => {
    const message = isRTL
      ? `السلام عليكم ${customer.name}، نود تذكيركم بأن رصيدكم المتبقي لدى ${storeInfo.name} هو: ${formatMoney(customer.debt)}. شكراً لتعاملكم معنا!`
      : `Bonjour ${customer.name}, petit rappel amical concernant votre solde chez ${storeInfo.name} qui s'élève à : ${formatMoney(customer.debt)}. Merci de votre fidélité !`;
    
    const url = `whatsapp://send?phone=${customer.phone.replace(/\s+/g, '')}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert(isRTL ? 'رسالة التذكير' : 'Rappel Dette', message);
        }
      })
      .catch(() => Alert.alert(isRTL ? 'رسالة التذكير' : 'Rappel Dette', message));
  };

  return (
    <View style={styles.container}>
      {/* Total Debt Banner */}
      <View style={[styles.debtBanner, isRTL && styles.rowReverse]}>
        <View style={[styles.debtBannerInfo, isRTL && styles.alignRight]}>
          <Text style={styles.debtBannerTitle}>{t('totalDebt')}</Text>
          <Text style={styles.debtBannerAmount}>{formatMoney(totalDebt)}</Text>
          <Text style={styles.debtBannerCount}>
            {customers.filter((c) => c.debt > 0).length} {isRTL ? 'زبائن عليهم ديون' : 'clients avec solde débiteur'}
          </Text>
        </View>
        <TouchableOpacity style={styles.newCustBtn} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="person-add" size={20} color="#ffffff" />
          <Text style={styles.newCustBtnText}>{t('newCustomer')}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter and Search Bar */}
      <View style={[styles.searchRow, isRTL && styles.rowReverse]}>
        <View style={[styles.searchBar, isRTL && styles.rowReverse]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.textRight]}
            placeholder={isRTL ? 'بحث بالاسم أو الهاتف...' : 'Rechercher un client...'}
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity
          style={[styles.filterChip, filterDebtOnly && styles.filterChipActive]}
          onPress={() => setFilterDebtOnly(!filterDebtOnly)}
        >
          <Ionicons
            name="warning"
            size={16}
            color={filterDebtOnly ? '#ffffff' : theme.colors.danger}
          />
          <Text style={[styles.filterChipText, filterDebtOnly && styles.filterChipTextActive]}>
            {isRTL ? 'الديون فقط' : 'Dettes'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Customers List */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const hasDebt = item.debt > 0;

          return (
            <View style={[styles.customerCard, isRTL && styles.rowReverse]}>
              <View style={[styles.customerAvatar, hasDebt && styles.customerAvatarDebt]}>
                <Ionicons
                  name={hasDebt ? 'person' : 'checkmark'}
                  size={22}
                  color={hasDebt ? theme.colors.danger : theme.colors.success}
                />
              </View>

              <View style={[styles.customerMeta, isRTL && styles.alignRight]}>
                <Text style={styles.customerNameText}>{item.name}</Text>
                {item.phone ? (
                  <Text style={styles.customerPhoneText}>
                    <Ionicons name="call-outline" size={12} /> {item.phone}
                  </Text>
                ) : null}
                {item.address ? (
                  <Text style={styles.customerAddressText}>
                    <Ionicons name="location-outline" size={12} /> {item.address}
                  </Text>
                ) : null}
              </View>

              <View style={styles.customerDebtBox}>
                <Text style={[styles.debtValueText, hasDebt ? styles.textRed : styles.textGreen]}>
                  {formatMoney(item.debt)}
                </Text>

                <View style={[styles.actionButtonsRow, isRTL && styles.rowReverse]}>
                  {hasDebt && (
                    <>
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => handleOpenPayment(item)}
                      >
                        <Text style={styles.payBtnText}>{isRTL ? 'تسديد' : 'Encaisser'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={() => handleShareDebt(item)}
                      >
                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Add Customer Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>{t('newCustomer')}</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('customerName')} *</Text>
            <TextInput
              style={[styles.inputBox, isRTL && styles.textRight]}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Mohamed Amine"
            />

            <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('phone')}</Text>
            <TextInput
              style={[styles.inputBox, isRTL && styles.textRight]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="0550..."
            />

            <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('address')}</Text>
            <TextInput
              style={[styles.inputBox, isRTL && styles.textRight]}
              value={address}
              onChangeText={setAddress}
              placeholder="Ex: Alger Centre"
            />

            <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('currentDebt')} (Solde initial)</Text>
            <TextInput
              style={[styles.inputBox, isRTL && styles.textRight]}
              value={initialDebt}
              onChangeText={setInitialDebt}
              keyboardType="numeric"
              placeholder="0"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleAddCustomer}>
              <Text style={styles.submitBtnText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment (Encaisser Versement) Modal */}
      <Modal visible={paymentModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>{t('recordPayment')}</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <View style={styles.customerNoticeBanner}>
                <Text style={styles.noticeCustName}>{selectedCustomer.name}</Text>
                <Text style={styles.noticeCustDebt}>
                  {t('currentDebt')} : <Text style={styles.boldRed}>{formatMoney(selectedCustomer.debt)}</Text>
                </Text>
              </View>
            )}

            <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('paymentAmount')} *</Text>
            <TextInput
              style={[styles.inputBox, { fontSize: 18, fontWeight: 'bold' }, isRTL && styles.textRight]}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder={selectedCustomer?.debt.toString()}
            />

            <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('notes')}</Text>
            <TextInput
              style={[styles.inputBox, isRTL && styles.textRight]}
              value={payNote}
              onChangeText={setPayNote}
              placeholder="Ex: Versement partiel en espèces"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleConfirmPayment}>
              <Text style={styles.submitBtnText}>{t('recordPayment')}</Text>
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
  debtBanner: {
    backgroundColor: theme.colors.danger,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
  },
  debtBannerInfo: {
    flex: 1,
  },
  debtBannerTitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: theme.typography.small,
  },
  debtBannerAmount: {
    color: '#ffffff',
    fontSize: theme.typography.header,
    fontWeight: 'bold',
    marginTop: 2,
  },
  debtBannerCount: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    marginTop: 4,
  },
  newCustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  newCustBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: theme.typography.small,
    marginLeft: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    elevation: 1,
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 6,
    fontSize: theme.typography.regular,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  filterChipActive: {
    backgroundColor: theme.colors.danger,
  },
  filterChipText: {
    fontSize: theme.typography.small,
    fontWeight: 'bold',
    color: theme.colors.danger,
    marginLeft: 4,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  customerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  customerAvatarDebt: {
    backgroundColor: theme.colors.dangerLight,
  },
  customerMeta: {
    flex: 1,
  },
  customerNameText: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  customerPhoneText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  customerAddressText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  customerDebtBox: {
    alignItems: 'flex-end',
    marginLeft: theme.spacing.sm,
  },
  debtValueText: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  textRed: {
    color: theme.colors.danger,
  },
  textGreen: {
    color: theme.colors.success,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    marginRight: 6,
  },
  payBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  shareBtn: {
    backgroundColor: '#E8F5E9',
    padding: 6,
    borderRadius: theme.borderRadius.full,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
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
  submitBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: theme.typography.medium,
  },
  customerNoticeBanner: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  noticeCustName: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  noticeCustDebt: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  boldRed: {
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
});
