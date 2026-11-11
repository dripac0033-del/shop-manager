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
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [shareDebtCustomer, setShareDebtCustomer] = useState(null);
  const [shareEmailInput, setShareEmailInput] = useState('');
  const [copiedDebtText, setCopiedDebtText] = useState(false);

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

  const validCustomers = Array.isArray(customers) ? customers : [];
  const totalDebt = validCustomers.reduce((sum, c) => sum + (c.debt || 0), 0);

  const filteredCustomers = validCustomers.filter((c) => {
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
      Alert.alert(t('customerName'), isRTL ? 'يرجى إدخال اسم الزبون!' : 'Veuillez saisir le nom du client !');
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

  // Open Debt Share Modal
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

  // Export Customers to CSV
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
        {lastSyncTime && <Text style={styles.syncTimeText}>{lastSyncTime}</Text>}
      </View>

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

                    {hasDebt && (
                      <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={() => handleOpenShare(item)}
                        title="Partager"
                      >
                        <Ionicons name="share-social-outline" size={16} color="#0284c7" />
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
                {isRTL ? 'تأكيد التسديد وحفظ' : 'Valider le paiement'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share Debt Reminder Modal (WhatsApp, Email, Print, Copy) */}
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

                {/* Formatted Message Preview */}
                <View style={styles.sharePreviewBox}>
                  <Text style={styles.sharePreviewText}>
                    {generateDebtMessage(shareDebtCustomer)}
                  </Text>
                </View>

                {/* Direct WhatsApp Share */}
                <TouchableOpacity
                  style={styles.modalWhatsAppBtn}
                  onPress={() => handleSendWhatsApp(shareDebtCustomer)}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                  <Text style={styles.modalShareBtnText}>
                    {isRTL ? 'إرسال عبر واتساب' : 'Envoyer par WhatsApp'}
                  </Text>
                </TouchableOpacity>

                {/* Direct Email Share */}
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

                {/* Copy Text Button */}
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
    marginLeft: 3,
  },
  newCustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
  },
  newCustBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  searchRow: {
    flexDirection: 'row',
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
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    height: 42,
    marginLeft: 6,
    fontSize: 13,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    marginLeft: 6,
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
    marginTop: 1,
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
    backgroundColor: theme.colors.success,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
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
    marginBottom: theme.spacing.md,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    fontSize: theme.typography.header,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
  },
  inputBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    height: 42,
    paddingHorizontal: theme.spacing.md,
    fontSize: 14,
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
    fontSize: 14,
  },
  customerNoticeBanner: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: theme.borderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noticeCustName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  noticeCustDebt: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  boldRed: {
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  shareCustHeader: {
    marginBottom: 10,
  },
  shareCustName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  shareCustDebt: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.danger,
    marginTop: 2,
  },
  sharePreviewBox: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sharePreviewText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  modalWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
  },
  modalEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
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
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#f8fafc',
  },
  copyMsgBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 4,
  },
});
