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
  Platform,
  ScrollView,
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
    updateCustomer,
    deleteCustomer,
    recordCustomerPayment,
    isRTL,
    storeInfo,
    firebaseConnected,
    syncStatus,
    lastSyncTime,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Add Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [initialDebt, setInitialDebt] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDebt, setEditDebt] = useState('');

  // Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  const totalDebt = (customers || []).reduce((sum, c) => sum + (c.debt || 0), 0);

  const filteredCustomers = (customers || []).filter((c) => {
    if (!c) return false;
    const nameMatch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = c.phone && c.phone.includes(searchQuery);
    const matchesSearch = nameMatch || phoneMatch;
    const matchesDebt = filterDebtOnly ? (c.debt || 0) > 0 : true;
    return matchesSearch && matchesDebt;
  });

  const handleAddCustomer = async () => {
    if (!name.trim()) {
      Alert.alert(t('customerName'), isRTL ? 'يرجى إدخال اسم الزبون!' : 'Veuillez saisir le nom du client !');
      return;
    }

    try {
      await addCustomer({
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
    } catch (err) {
      console.warn('Error adding customer:', err);
    }
  };

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer);
    setEditName(customer.name || '');
    setEditPhone(customer.phone || '');
    setEditAddress(customer.address || '');
    setEditDebt((customer.debt || 0).toString());
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;
    if (!editName.trim()) {
      Alert.alert(t('customerName'), isRTL ? 'يرجى إدخال اسم الزbون!' : 'Veuillez saisir le nom du client !');
      return;
    }

    try {
      await updateCustomer(selectedCustomer.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        debt: Number(editDebt || 0),
      });
      setEditModalVisible(false);
      setSelectedCustomer(null);
    } catch (err) {
      console.warn('Error updating customer:', err);
    }
  };

  const handleDelete = (customer) => {
    const confirmMsg = isRTL
      ? `هل أنت متأكد من حذف الزبون "${customer.name}"؟ سيتم حذفه من قاعدة البيانات أيضاً.`
      : `Voulez-vous vraiment supprimer le client "${customer.name}" ? Il sera également supprimé de Firebase.`;

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) {
        deleteCustomer(customer.id);
      }
      return;
    }

    Alert.alert(
      t('deleteProduct'),
      confirmMsg,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: isRTL ? 'حذف' : 'Supprimer',
          style: 'destructive',
          onPress: () => deleteCustomer(customer.id),
        },
      ]
    );
  };

  const handleOpenPayment = (customer) => {
    setSelectedCustomer(customer);
    setPayAmount('');
    setPayNote('');
    setPaymentModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      Alert.alert(t('paymentAmount'), isRTL ? 'يرجى إدخال مبلغ صحيح!' : 'Veuillez entrer un montant valide !');
      return;
    }

    try {
      await recordCustomerPayment(selectedCustomer.id, amount, payNote);
      setPaymentModalVisible(false);
      const msg = isRTL
        ? `تم تسجيل تسديد مبلغ ${formatMoney(amount)} بنجاح!`
        : `Paiement de ${formatMoney(amount)} enregistré avec succès !`;
      
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert(t('saleCompleted'), msg);
      }
    } catch (err) {
      console.warn('Error recording payment:', err);
    }
  };

  const handleShareDebt = (customer) => {
    const message = isRTL
      ? `السلام عليكم ${customer.name}، نود تذكيركم بأن رصيدكم المتبقي لدى ${storeInfo.name} هو: ${formatMoney(customer.debt)}. شكراً لتعاملكم معنا!`
      : `Bonjour ${customer.name}, petit rappel amical concernant votre solde chez ${storeInfo.name} qui s'élève à : ${formatMoney(customer.debt)}. Merci de votre fidélité !`;

    const url = `whatsapp://send?phone=${(customer.phone || '').replace(/\s+/g, '')}&text=${encodeURIComponent(message)}`;
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
              ? (isRTL ? 'جارٍ حفظ بيانات الزبائن في فايربيس...' : 'Synchronisation Firebase en cours...')
              : syncStatus === 'receiving'
              ? (isRTL ? 'تحديث فوري لبيانات الزبائن...' : 'Réception en direct de Firebase...')
              : firebaseConnected
              ? (isRTL ? 'الزبائن والديون متزامنة مباشرة مع فايربيس' : 'Clients & Crédits synchronisés avec Firebase')
              : (isRTL ? 'الوضع المحلي (بدون إنترنت)' : 'Mode Local')}
          </Text>
        </View>
        {lastSyncTime && (
          <Text style={styles.syncTimeText}>{lastSyncTime}</Text>
        )}
      </View>

      {/* Total Debt Banner */}
      <View style={[styles.debtBanner, isRTL && styles.rowReverse]}>
        <View style={[styles.debtBannerInfo, isRTL && styles.alignRight]}>
          <Text style={styles.debtBannerTitle}>{t('totalDebt')}</Text>
          <Text style={styles.debtBannerAmount}>{formatMoney(totalDebt)}</Text>
          <Text style={styles.debtBannerCount}>
            {(customers || []).filter((c) => (c.debt || 0) > 0).length} {isRTL ? 'زبائن عليهم ديون' : 'clients avec solde débiteur'}
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
      {filteredCustomers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={54} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {isRTL ? 'لا يوجد أي زبون مطابق' : 'Aucun client trouvé'}
          </Text>
          <Text style={styles.emptySub}>
            {isRTL
              ? 'اضغط على زر (زبون جديد) لإضافة زبون مع رصيد الديون الخاص به.'
              : 'Cliquez sur Nouveau Client pour ajouter un client et gérer ses crédits.'}
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="person-add" size={18} color="#ffffff" />
            <Text style={styles.emptyBtnText}>{t('newCustomer')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const hasDebt = (item.debt || 0) > 0;

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
                    {formatMoney(item.debt || 0)}
                  </Text>

                  <View style={[styles.actionButtonsRow, isRTL && styles.rowReverse]}>
                    {hasDebt && (
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => handleOpenPayment(item)}
                      >
                        <Text style={styles.payBtnText}>{isRTL ? 'تسديد' : 'Encaisser'}</Text>
                      </TouchableOpacity>
                    )}

                    {hasDebt && item.phone && (
                      <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={() => handleShareDebt(item)}
                      >
                        <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleOpenEdit(item)}
                    >
                      <Ionicons name="pencil" size={15} color={theme.colors.secondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

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

            <ScrollView showsVerticalScrollIndicator={false}>
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

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('currentDebt')} ({isRTL ? 'الرصيد الأولي' : 'Solde initial'})</Text>
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
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {isRTL ? 'تعديل بيانات الزبون والديون' : 'Modifier le Client & Crédit'}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('customerName')} *</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Ex: Mohamed Amine"
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('phone')}</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholder="0550..."
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('address')}</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Ex: Alger Centre"
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                {isRTL ? 'مبلغ الديون / الكريدي الحالي' : 'Montant de la Dette / Crédit'}
              </Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={editDebt}
                onChangeText={setEditDebt}
                keyboardType="numeric"
                placeholder="0"
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEdit}>
                <Text style={styles.submitBtnText}>
                  {isRTL ? 'حفظ التعديلات في فايربيس' : 'Enregistrer les modifications'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
                  {t('currentDebt')} : <Text style={styles.boldRed}>{formatMoney(selectedCustomer.debt || 0)}</Text>
                </Text>
              </View>
            )}

            <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('paymentAmount')} *</Text>
            <TextInput
              style={[styles.inputBox, { fontSize: 18, fontWeight: 'bold' }, isRTL && styles.textRight]}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="0"
              autoFocus
            />

            <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('notes')}</Text>
            <TextInput
              style={[styles.inputBox, isRTL && styles.textRight]}
              value={payNote}
              onChangeText={setPayNote}
              placeholder={isRTL ? 'ملاحظة (اختياري)' : 'Ex: Versement partiel'}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleConfirmPayment}>
              <Text style={styles.submitBtnText}>{isRTL ? 'تأكيد التسديد وحفظ' : 'Valider le paiement'}</Text>
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
  debtBanner: {
    backgroundColor: theme.colors.primary,
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
    color: '#ffffff',
    fontSize: theme.typography.small,
    opacity: 0.9,
  },
  debtBannerAmount: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  debtBannerCount: {
    color: '#ffffff',
    fontSize: theme.typography.small,
    opacity: 0.8,
  },
  newCustBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  newCustBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: theme.typography.small,
  },
  searchRow: {
    flexDirection: 'row',
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
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 6,
    fontSize: theme.typography.small,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerLight,
  },
  filterChipActive: {
    backgroundColor: theme.colors.danger,
  },
  filterChipText: {
    fontSize: theme.typography.small,
    color: theme.colors.danger,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
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
    borderRadius: 22,
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
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  customerPhoneText: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  customerAddressText: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  customerDebtBox: {
    alignItems: 'flex-end',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginRight: 4,
  },
  payBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  shareBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
  },
  emptyBtnText: {
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
  customerNoticeBanner: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noticeCustName: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  noticeCustDebt: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  boldRed: {
    fontWeight: 'bold',
    color: theme.colors.danger,
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
});
