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
    customers = [],
    sales = [],
    transactions = [],
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
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [dossierModalVisible, setDossierModalVisible] = useState(false);
  const [dossierCustomer, setDossierCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [shareDebtCustomer, setShareDebtCustomer] = useState(null);
  const [shareEmailInput, setShareEmailInput] = useState('');
  const [copiedDebtText, setCopiedDebtText] = useState(false);

  // Add Form State (Includes Description / Notes)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [initialDebt, setInitialDebt] = useState('');

  // Edit Form State (Includes Description / Notes)
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDebt, setEditDebt] = useState('');

  // Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  const validCustomers = Array.isArray(customers) ? customers : [];
  const totalDebt = validCustomers.reduce((sum, c) => sum + (c.debt || 0), 0);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const filteredCustomers = validCustomers.filter((c) => {
    if (!c) return false;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (c.name || '').toLowerCase().includes(q);
    const phoneMatch = c.phone && c.phone.includes(q);
    const descMatch = (c.description || '').toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || phoneMatch || descMatch;
    const matchesDebt = filterDebtOnly ? (c.debt || 0) > 0 : true;
    return matchesSearch && matchesDebt;
  });

  // Direct Validation & Instant Window Closure
  const handleAddCustomer = async () => {
    if (!name.trim()) {
      Alert.alert(t('customerName'), isRTL ? 'يرجى إدخال اسم الزبون!' : 'Veuillez saisir le nom du client !');
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      description: description.trim(),
      debt: Number(initialDebt || 0),
    };

    // CLOSE MODAL DIRECTLY
    setAddModalVisible(false);
    setName('');
    setPhone('');
    setAddress('');
    setDescription('');
    setInitialDebt('');

    try {
      await addCustomer(payload);
      showToast(isRTL ? '✅ تم إضافة الزبون بنجاح' : '✅ Client enregistré avec succès');
    } catch (err) {
      console.warn('Error adding customer:', err);
    }
  };

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer);
    setEditName(customer.name || '');
    setEditPhone(customer.phone || '');
    setEditAddress(customer.address || '');
    setEditDescription(customer.description || '');
    setEditDebt((customer.debt || 0).toString());
    setEditModalVisible(true);
  };

  const handleOpenDossier = (customer) => {
    setDossierCustomer(customer);
    setDossierModalVisible(true);
  };

  // Direct Validation & Instant Window Closure
  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;
    if (!editName.trim()) {
      Alert.alert(t('customerName'), isRTL ? 'يرجى إدخال اسم الزبون!' : 'Veuillez saisir le nom du client !');
      return;
    }

    const targetId = selectedCustomer.id;
    const payload = {
      name: editName.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
      description: editDescription.trim(),
      debt: Number(editDebt || 0),
    };

    // CLOSE MODAL DIRECTLY
    setEditModalVisible(false);
    setSelectedCustomer(null);

    try {
      await updateCustomer(targetId, payload);
      showToast(isRTL ? '✅ تم تحديث بيانات الزبون' : '✅ Client mis à jour');
    } catch (err) {
      console.warn('Error updating customer:', err);
    }
  };

  const handleDelete = (customer) => {
    const confirmMsg = isRTL
      ? `هل أنت متأكد من حذف الزبون "${customer.name}"؟`
      : `Voulez-vous vraiment supprimer le client "${customer.name}" ?`;

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) {
        deleteCustomer(customer.id);
        showToast(isRTL ? 'تم حذف الزبون' : 'Client supprimé');
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
          onPress: () => {
            deleteCustomer(customer.id);
            showToast(isRTL ? 'تم حذف الزبون' : 'Client supprimé');
          },
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

  // Direct Validation & Close for Payment
  const handleConfirmPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      Alert.alert(t('paymentAmount'), isRTL ? 'يرجى إدخال مبلغ صحيح!' : 'Veuillez entrer un montant valide !');
      return;
    }

    const custId = selectedCustomer.id;
    const note = payNote;

    // CLOSE MODAL DIRECTLY
    setPaymentModalVisible(false);
    setSelectedCustomer(null);

    try {
      await recordCustomerPayment(custId, amount, note);
      showToast(isRTL ? `✅ تم تسديد ${formatMoney(amount)} بنجاح` : `✅ Versement de ${formatMoney(amount)} encaissé`);
    } catch (err) {
      console.warn('Error recording payment:', err);
    }
  };

  const handleOpenShare = (customer) => {
    setShareDebtCustomer(customer);
    setShareEmailInput('');
    setShareModalVisible(true);
  };

  const generateDebtMessage = (customer) => {
    if (!customer) return '';
    return isRTL
      ? `السلام عليكم ${customer.name}،\nنود تذكيركم بأن رصيدكم المتبقي لدى *${storeInfo.name || 'Store Soft'}* هو : *${formatMoney(customer.debt)}*.\nشكراً لتعاملكم معنا وفضل ثقتكم!\n📞 هاتف المحل: ${storeInfo.phone || ''}`
      : `Bonjour ${customer.name},\nPetit rappel amical concernant votre solde chez *${storeInfo.name || 'Store Soft'}* qui s'élève à : *${formatMoney(customer.debt)}*.\nMerci pour votre fidélité !\n📞 Contact magasin : ${storeInfo.phone || ''}`;
  };

  const handleSendWhatsApp = (customer) => {
    const message = generateDebtMessage(customer);
    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    let url = '';

    if (cleanPhone) {
      const intlPhone = cleanPhone.startsWith('0') ? '213' + cleanPhone.substring(1) : cleanPhone;
      url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => Alert.alert('WhatsApp', message));
    }
  };

  const handleSendEmail = (customer) => {
    const message = generateDebtMessage(customer);
    const subject = `Rappel de Solde / Relevé - ${storeInfo.name || 'Store Soft'}`;
    const cleanMail = (shareEmailInput || '').trim();
    const mailto = `mailto:${cleanMail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(mailto, '_blank');
    } else {
      Linking.openURL(mailto).catch(() => Alert.alert('Email', message));
    }
  };

  const handleCopyDebtMessage = (customer) => {
    const message = generateDebtMessage(customer);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message);
      setCopiedDebtText(true);
      setTimeout(() => setCopiedDebtText(false), 2500);
    } else {
      Alert.alert(isRTL ? 'تم نسخ نص التذكير' : 'Message copié', message);
    }
  };

  const handleExportCustomersCSV = () => {
    if (!validCustomers.length) {
      Alert.alert('CSV', isRTL ? 'لا توجد بيانات زبائن لتصديرها!' : 'Aucun client à exporter !');
      return;
    }

    const headers = ['Nom Client', 'Telephone', 'Adresse', 'Dette Actuelle DZD'];
    const rows = validCustomers.map((c) => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.debt || 0,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `clients_dettes_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('CSV', isRTL ? 'تم تصدير ملف الزبائن بنجاح!' : 'Export CSV des clients généré avec succès !');
    }
  };

  return (
    <View style={styles.container}>
      {/* Toast Banner */}
      {toastMessage ? (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Total Debt Banner */}
      <View style={[styles.debtBanner, isRTL && styles.rowReverse]}>
        <View style={[styles.debtBannerInfo, isRTL && styles.alignRight]}>
          <Text style={styles.debtBannerTitle}>{t('totalDebt')}</Text>
          <Text style={styles.debtBannerAmount}>{formatMoney(totalDebt)}</Text>
          <Text style={styles.debtBannerCount}>
            {validCustomers.filter((c) => (c.debt || 0) > 0).length}{' '}
            {isRTL ? 'زبائن عليهم ديون' : 'clients avec solde débiteur'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.csvBtn}
            onPress={handleExportCustomersCSV}
            title="Exporter CSV"
          >
            <Ionicons name="download-outline" size={16} color="#ffffff" />
            <Text style={styles.csvBtnText}>CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.newCustBtn} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="person-add" size={18} color="#ffffff" />
            <Text style={styles.newCustBtnText}>{t('newCustomer')}</Text>
          </TouchableOpacity>
        </View>
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
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
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
                  <TouchableOpacity onPress={() => handleOpenDossier(item)}>
                    <Text style={styles.customerNameText}>{item.name}</Text>
                  </TouchableOpacity>
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
                  {item.description ? (
                    <View style={[styles.customerDescPill, isRTL && styles.rowReverse]}>
                      <Ionicons name="document-text" size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.customerDescPillText} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.customerDebtBox}>
                  <Text style={[styles.debtValueText, hasDebt ? styles.textRed : styles.textGreen]}>
                    {formatMoney(item.debt || 0)}
                  </Text>

                  <View style={[styles.actionButtonsRow, isRTL && styles.rowReverse]}>
                    <TouchableOpacity
                      style={styles.dossierBtn}
                      onPress={() => handleOpenDossier(item)}
                      title={t('customerDossier')}
                    >
                      <Ionicons name="folder-open" size={15} color="#8b5cf6" />
                    </TouchableOpacity>

                    {item.phone ? (
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => Linking.openURL(`tel:${item.phone}`)}
                        title={t('callCustomer')}
                      >
                        <Ionicons name="call" size={14} color="#0284c7" />
                      </TouchableOpacity>
                    ) : null}

                    {hasDebt && (
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => handleOpenPayment(item)}
                      >
                        <Text style={styles.payBtnText}>{isRTL ? 'تسديد' : 'Encaisser'}</Text>
                      </TouchableOpacity>
                    )}

                    {hasDebt && (
                      <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={() => handleOpenShare(item)}
                        title="Partager"
                      >
                        <Ionicons name="logo-whatsapp" size={15} color="#16a34a" />
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

      {/* Add Customer Modal (Closes Directly on Validation) */}
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

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('description')}</Text>
              <TextInput
                style={[styles.inputBox, styles.textArea, isRTL && styles.textRight]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholder={t('customerDescriptionPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                {t('currentDebt')} ({isRTL ? 'الرصيد الأولي' : 'Solde initial'})
              </Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={initialDebt}
                onChangeText={setInitialDebt}
                keyboardType="numeric"
                placeholder="0"
              />

              {/* Direct Save Button */}
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddCustomer}>
                <Text style={styles.submitBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Customer Modal (Closes Directly on Validation) */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {isRTL ? 'تعديل بيانات الزبون' : 'Modifier le Client'}
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

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('description')}</Text>
              <TextInput
                style={[styles.inputBox, styles.textArea, isRTL && styles.textRight]}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                placeholder={t('customerDescriptionPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                {isRTL ? 'مبلغ الديون الحالي' : 'Montant de la Dette'}
              </Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={editDebt}
                onChangeText={setEditDebt}
                keyboardType="numeric"
                placeholder="0"
              />

              {/* Direct Save Button */}
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEdit}>
                <Text style={styles.submitBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
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
                  {t('currentDebt')} :{' '}
                  <Text style={styles.boldRed}>{formatMoney(selectedCustomer.debt || 0)}</Text>
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
              <Text style={styles.submitBtnText}>
                {isRTL ? 'تأكيد التسديد' : 'Valider le paiement'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share Debt Reminder Modal */}
      <Modal visible={shareModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {isRTL ? 'إرسال تذكير بالدين' : 'Rappel de Dette / Solde'}
              </Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {shareDebtCustomer && (
              <View>
                <View style={styles.shareCustHeader}>
                  <Text style={styles.shareCustName}>{shareDebtCustomer.name}</Text>
                  <Text style={styles.shareCustDebt}>
                    {isRTL ? 'المبلغ المستحق:' : 'Montant Dû :'} {formatMoney(shareDebtCustomer.debt)}
                  </Text>
                </View>

                <View style={styles.sharePreviewBox}>
                  <Text style={styles.sharePreviewText}>
                    {generateDebtMessage(shareDebtCustomer)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalWhatsAppBtn}
                  onPress={() => handleSendWhatsApp(shareDebtCustomer)}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                  <Text style={styles.modalShareBtnText}>
                    {isRTL ? 'إرسال عبر واتساب' : 'Envoyer par WhatsApp'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.shareEmailRow}>
                  <TextInput
                    style={[styles.inputBox, { flex: 1, marginRight: 6 }, isRTL && styles.textRight]}
                    placeholder="email@client.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={shareEmailInput}
                    onChangeText={setShareEmailInput}
                  />
                  <TouchableOpacity
                    style={styles.modalEmailBtn}
                    onPress={() => handleSendEmail(shareDebtCustomer)}
                  >
                    <Ionicons name="mail" size={16} color="#ffffff" />
                    <Text style={styles.modalShareBtnText}>Email</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.copyMsgBtn}
                  onPress={() => handleCopyDebtMessage(shareDebtCustomer)}
                >
                  <Ionicons
                    name={copiedDebtText ? 'checkmark' : 'copy-outline'}
                    size={16}
                    color={copiedDebtText ? '#16a34a' : theme.colors.text}
                  />
                  <Text style={[styles.copyMsgBtnText, copiedDebtText && { color: '#16a34a' }]}>
                    {copiedDebtText ? (isRTL ? 'تم النسخ!' : 'Message copié !') : (isRTL ? 'نسخ الرسالة' : 'Copier le message')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Detailed Customer Dossier / Statement Modal */}
      <Modal visible={dossierModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dossierModalCard}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="folder-open" size={22} color="#8b5cf6" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>{t('customerDossier')}</Text>
              </View>
              <TouchableOpacity onPress={() => setDossierModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {dossierCustomer && (
              <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.dossierHeader}>
                  <View style={[styles.dossierAvatar, (dossierCustomer.debt || 0) > 0 && styles.customerAvatarDebt]}>
                    <Ionicons
                      name="person"
                      size={28}
                      color={(dossierCustomer.debt || 0) > 0 ? theme.colors.danger : theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.dossierName}>{dossierCustomer.name}</Text>
                  {dossierCustomer.phone ? (
                    <Text style={styles.dossierPhone}>
                      <Ionicons name="call" size={13} color="#0284c7" /> {dossierCustomer.phone}
                    </Text>
                  ) : null}
                  {dossierCustomer.address ? (
                    <Text style={styles.dossierAddress}>
                      <Ionicons name="location" size={13} color="#64748b" /> {dossierCustomer.address}
                    </Text>
                  ) : null}
                </View>

                {/* Balance & Debt Status */}
                <View style={styles.dossierDebtBanner}>
                  <Text style={styles.dossierDebtTitle}>{t('currentDebt')}</Text>
                  <Text style={[styles.dossierDebtValue, (dossierCustomer.debt || 0) > 0 ? styles.textRed : styles.textGreen]}>
                    {formatMoney(dossierCustomer.debt || 0)}
                  </Text>
                  <Text style={styles.dossierDebtSub}>
                    {(dossierCustomer.debt || 0) > 0
                      ? isRTL ? 'رصيد مطلوب تسديده' : 'Solde débiteur à recouvrer'
                      : isRTL ? 'الحساب مسدد بالكامل' : 'Compte en règle (Aucune dette)'}
                  </Text>
                </View>

                {/* Description & Remarks Field */}
                <View style={styles.dossierDescSection}>
                  <View style={[styles.dossierDescHeader, isRTL && styles.rowReverse]}>
                    <Ionicons name="document-text" size={16} color="#475569" style={{ marginRight: 6 }} />
                    <Text style={styles.dossierDescHeading}>{t('description')}</Text>
                  </View>
                  <Text style={[styles.dossierDescContent, isRTL && styles.textRight]}>
                    {dossierCustomer.description || (isRTL ? 'لا توجد ملاحظات مسجلة لهذا الزبون.' : 'Aucune description ou remarque renseignée.')}
                  </Text>
                </View>

                {/* Customer Sales & Ledger History */}
                <View style={styles.dossierHistorySection}>
                  <Text style={[styles.dossierHistoryTitle, isRTL && styles.textRight]}>
                    {t('transactionHistory')}
                  </Text>

                  {sales.filter((s) => s.customerId === dossierCustomer.id).length === 0 &&
                  transactions.filter((t) => t.customerId === dossierCustomer.id).length === 0 ? (
                    <Text style={[styles.emptyHistoryText, isRTL && styles.textRight]}>
                      {isRTL ? 'لا توجد عمليات مسجلة حتى الآن' : 'Aucun achat ou paiement enregistré'}
                    </Text>
                  ) : (
                    <>
                      {/* Recent Purchases */}
                      {sales
                        .filter((s) => s.customerId === dossierCustomer.id)
                        .slice(0, 5)
                        .map((s) => (
                          <View key={s.id} style={[styles.dossierHistoryItem, isRTL && styles.rowReverse]}>
                            <View>
                              <Text style={styles.historyItemTitle}>
                                🛒 {isRTL ? 'عملية بيع' : 'Achat'} #{s.id.slice(-6)}
                              </Text>
                              <Text style={styles.historyItemDate}>
                                {new Date(s.date).toLocaleDateString()} • {s.items?.length || 0} {t('itemsCount')}
                              </Text>
                            </View>
                            <Text style={styles.historyItemAmount}>{formatMoney(s.total)}</Text>
                          </View>
                        ))}

                      {/* Recent Payments */}
                      {transactions
                        .filter((tx) => tx.customerId === dossierCustomer.id && tx.type === 'debt_payment')
                        .slice(0, 5)
                        .map((tx) => (
                          <View key={tx.id} style={[styles.dossierHistoryItem, isRTL && styles.rowReverse]}>
                            <View>
                              <Text style={[styles.historyItemTitle, { color: '#16a34a' }]}>
                                💵 {isRTL ? 'تسديد دفعة' : 'Règlement dette'}
                              </Text>
                              <Text style={styles.historyItemDate}>{new Date(tx.date).toLocaleDateString()}</Text>
                            </View>
                            <Text style={[styles.historyItemAmount, { color: '#16a34a' }]}>
                              +{formatMoney(tx.amount)}
                            </Text>
                          </View>
                        ))}
                    </>
                  )}
                </View>

                {/* Quick Dossier Actions */}
                <View style={[styles.dossierActionsRow, isRTL && styles.rowReverse]}>
                  {(dossierCustomer.debt || 0) > 0 && (
                    <TouchableOpacity
                      style={styles.dossierPayBtn}
                      onPress={() => {
                        setDossierModalVisible(false);
                        handleOpenPayment(dossierCustomer);
                      }}
                    >
                      <Ionicons name="cash" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.dossierActionBtnText}>{t('recordPayment')}</Text>
                    </TouchableOpacity>
                  )}

                  {dossierCustomer.phone ? (
                    <TouchableOpacity
                      style={styles.dossierCallBtn}
                      onPress={() => Linking.openURL(`tel:${dossierCustomer.phone}`)}
                    >
                      <Ionicons name="call" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.dossierActionBtnText}>{t('callCustomer')}</Text>
                    </TouchableOpacity>
                  ) : null}

                  {(dossierCustomer.debt || 0) > 0 && (
                    <TouchableOpacity
                      style={styles.dossierWaBtn}
                      onPress={() => handleSendWhatsApp(dossierCustomer)}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.dossierActionBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  )}
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
  debtBanner: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  debtBannerInfo: {
    flex: 1,
  },
  debtBannerTitle: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
  },
  debtBannerAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.danger,
    marginVertical: 4,
  },
  debtBannerCount: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    marginRight: 6,
  },
  csvBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  newCustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.full,
    elevation: 2,
  },
  newCustBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
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
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    height: 42,
    marginLeft: 6,
    fontSize: theme.typography.regular,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.danger,
    borderColor: theme.colors.danger,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  filterChipTextActive: {
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
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: theme.borderRadius.full,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 30,
  },
  customerCard: {
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
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    marginLeft: 8,
  },
  debtValueText: {
    fontSize: 15,
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
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    marginRight: 4,
  },
  payBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  shareBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#e0f2fe',
    marginRight: 4,
  },
  editBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    marginRight: 4,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.dangerLight,
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
  submitBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    elevation: 2,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: theme.typography.medium,
  },
  customerNoticeBanner: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    marginBottom: 12,
  },
  noticeCustName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  noticeCustDebt: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  boldRed: {
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  shareCustHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  shareCustName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  shareCustDebt: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.danger,
    marginTop: 2,
  },
  sharePreviewBox: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    marginBottom: 12,
  },
  sharePreviewText: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
  },
  modalWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginBottom: 10,
  },
  modalEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.md,
  },
  modalShareBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  shareEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  copyMsgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
  },
  copyMsgBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 6,
  },
  textArea: {
    minHeight: 65,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  customerDescPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  customerDescPillText: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
  },
  dossierBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#ede9fe',
    marginRight: 4,
  },
  callBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#e0f2fe',
    marginRight: 4,
  },
  dossierModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  dossierHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  dossierAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dossierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  dossierPhone: {
    fontSize: 13,
    color: '#0284c7',
    marginTop: 2,
    fontWeight: '600',
  },
  dossierAddress: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  dossierDebtBanner: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dossierDebtTitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  dossierDebtValue: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 2,
  },
  dossierDebtSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  dossierDescSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dossierDescHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dossierDescHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  dossierDescContent: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  dossierHistorySection: {
    marginBottom: 14,
  },
  dossierHistoryTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  dossierHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  historyItemTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  historyItemDate: {
    fontSize: 10.5,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  historyItemAmount: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  emptyHistoryText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  dossierActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  dossierPayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.danger,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 6,
  },
  dossierCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 6,
  },
  dossierWaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  dossierActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
