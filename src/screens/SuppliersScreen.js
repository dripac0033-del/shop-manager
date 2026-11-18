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
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SuppliersScreen() {
  const navigation = useNavigation();
  const {
    t,
    formatMoney,
    currency = 'DA',
    suppliers = [],
    purchases = [],
    transactions = [],
    addSupplier,
    updateSupplier,
    deleteSupplier,
    recordSupplierPayment,
    addPurchaseOrder,
    isRTL,
    storeInfo,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [dossierModalVisible, setDossierModalVisible] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Add / Edit Form State
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [initialDebt, setInitialDebt] = useState('');
  const [notes, setNotes] = useState('');

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Purchase Form State
  const [purchaseTotal, setPurchaseTotal] = useState('');
  const [purchasePaid, setPurchasePaid] = useState('');
  const [purchaseRef, setPurchaseRef] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const alertMsg = (msg) => {
    if (Platform.OS === 'web') {
      window.alert ? window.alert(msg) : console.log(msg);
    } else {
      Alert.alert(isRTL ? 'تنبيه' : 'Information', msg);
    }
  };

  const totalSupplierDebt = (suppliers || []).reduce((sum, s) => sum + Number(s.debt || 0), 0);
  const totalSuppliersCount = (suppliers || []).length;
  const suppliersWithDebtCount = (suppliers || []).filter((s) => Number(s.debt || 0) > 0).length;

  // Filtered Suppliers
  const filteredSuppliers = (suppliers || []).filter((s) => {
    if (!s) return false;
    const nameStr = (s.name || '').toLowerCase();
    const compStr = (s.company || '').toLowerCase();
    const phoneStr = (s.phone || '');
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || nameStr.includes(q) || compStr.includes(q) || phoneStr.includes(q);
    const matchDebt = !filterDebtOnly || Number(s.debt || 0) > 0;
    return matchQuery && matchDebt;
  });

  const openAddModal = () => {
    setName('');
    setCompany('');
    setPhone('');
    setAddress('');
    setCategory('');
    setInitialDebt('');
    setNotes('');
    setAddModalVisible(true);
  };

  const openEditModal = (sup) => {
    setSelectedSupplier(sup);
    setName(sup.name || '');
    setCompany(sup.company || '');
    setPhone(sup.phone || '');
    setAddress(sup.address || '');
    setCategory(sup.category || '');
    setInitialDebt(sup.debt !== undefined ? String(sup.debt) : '0');
    setNotes(sup.notes || '');
    setEditModalVisible(true);
  };

  const openPaymentModal = (sup) => {
    setSelectedSupplier(sup);
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentModalVisible(true);
  };

  const openPurchaseModal = (sup) => {
    setSelectedSupplier(sup);
    setPurchaseTotal('');
    setPurchasePaid('');
    setPurchaseRef('');
    setPurchaseNotes('');
    setPurchaseModalVisible(true);
  };

  const openDossierModal = (sup) => {
    setSelectedSupplier(sup);
    setDossierModalVisible(true);
  };

  const handleSaveAdd = async () => {
    if (!name.trim()) {
      alertMsg(isRTL ? 'يرجى إدخال اسم المورد' : 'Veuillez saisir le nom du fournisseur.');
      return;
    }
    try {
      await addSupplier({
        name: name.trim(),
        company: company.trim() || name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        category: category.trim() || 'Général',
        debt: Number(initialDebt) || 0,
        notes: notes.trim(),
      });
      setAddModalVisible(false);
      showToast(isRTL ? 'تم إضافة المورد بنجاح' : 'Fournisseur ajouté avec succès !');
    } catch (e) {
      alertMsg(e.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!name.trim() || !selectedSupplier) return;
    try {
      await updateSupplier(selectedSupplier.id, {
        name: name.trim(),
        company: company.trim() || name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        category: category.trim(),
        debt: Number(initialDebt) || 0,
        notes: notes.trim(),
      });
      setEditModalVisible(false);
      showToast(isRTL ? 'تم تعديل بيانات المورد' : 'Fournisseur modifié !');
    } catch (e) {
      alertMsg(e.message);
    }
  };

  const handleDelete = (sup) => {
    const confirmMsg = isRTL
      ? `هل أنت متأكد من حذف المورد "${sup.name}"؟`
      : `Voulez-vous supprimer le fournisseur "${sup.name}" ?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        deleteSupplier(sup.id);
        showToast(isRTL ? 'تم الحذف' : 'Fournisseur supprimé');
      }
      return;
    }

    Alert.alert(
      isRTL ? 'تأكيد الحذف' : 'Confirmation',
      confirmMsg,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            deleteSupplier(sup.id);
            showToast(isRTL ? 'تم الحذف' : 'Fournisseur supprimé');
          },
        },
      ]
    );
  };

  const handleRecordPayment = async () => {
    const num = Number(paymentAmount);
    if (!num || num <= 0) {
      alertMsg(isRTL ? 'يرجى إدخال مبلغ صحيح' : 'Veuillez saisir un montant valide.');
      return;
    }
    if (!selectedSupplier) return;
    try {
      await recordSupplierPayment(selectedSupplier.id, {
        amount: num,
        notes: paymentNotes.trim(),
      });
      setPaymentModalVisible(false);
      showToast(isRTL ? 'تم تسجيل الدفعة بنجاح' : 'Paiement fournisseur enregistré !');
    } catch (e) {
      alertMsg(e.message);
    }
  };

  const handleSavePurchase = async () => {
    const numTotal = Number(purchaseTotal);
    if (!numTotal || numTotal <= 0) {
      alertMsg(isRTL ? 'يرجى إدخال إجمالي الشراء' : 'Veuillez saisir le montant total de l\'achat.');
      return;
    }
    const numPaid = Number(purchasePaid) || 0;
    try {
      await addPurchaseOrder({
        supplierId: selectedSupplier?.id || '',
        supplierName: selectedSupplier?.name || 'Fournisseur',
        total: numTotal,
        paidAmount: numPaid,
        invoiceRef: purchaseRef.trim(),
        notes: purchaseNotes.trim(),
      });
      setPurchaseModalVisible(false);
      showToast(isRTL ? 'تم تسجيل فاتورة الشراء بنجاح' : 'Bon d\'achat enregistré avec succès !');
    } catch (e) {
      alertMsg(e.message);
    }
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      alertMsg(isRTL ? 'تعذر فتح الهاتف' : 'Impossible d\'ouvrir l\'application téléphone.');
    });
  };

  const handleWhatsApp = (phoneNumber) => {
    if (!phoneNumber) return;
    const clean = phoneNumber.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${clean}`;
    Linking.openURL(url).catch(() => {
      alertMsg('Impossible d\'ouvrir WhatsApp.');
    });
  };

  return (
    <View style={styles.container}>
      {/* Toast */}
      {toastMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Top Banner */}
      <View style={[styles.headerBanner, isRTL && styles.rowReverse]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('suppliers') || 'Fournisseurs & Achats'}</Text>
          <Text style={styles.headerSubtitle}>
            {isRTL
              ? `إجمالي الموردين: ${totalSuppliersCount} • ديون الموردين: ${formatMoney(totalSupplierDebt)}`
              : `Total: ${totalSuppliersCount} • Dettes Fournisseurs : ${formatMoney(totalSupplierDebt)}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryAddBtn} onPress={openAddModal}>
          <Ionicons name="person-add" size={17} color="#ffffff" />
          <Text style={styles.primaryAddBtnText}>{t('addSupplier') || 'Nouveau'}</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Cards Row */}
      <View style={[styles.kpiRow, isRTL && styles.rowReverse]}>
        <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6' }]}>
          <Text style={styles.kpiValue}>{totalSuppliersCount}</Text>
          <Text style={styles.kpiLabel}>{t('allSuppliers') || 'Total Fournisseurs'}</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#ef4444' }]}>
          <Text style={[styles.kpiValue, { color: '#ef4444' }]}>{suppliersWithDebtCount}</Text>
          <Text style={styles.kpiLabel}>{t('debtorSuppliers') || 'Avec Dette'}</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b', flex: 1.4 }]}>
          <Text style={[styles.kpiValue, { color: '#f59e0b', fontSize: 15 }]}>
            {formatMoney(totalSupplierDebt)}
          </Text>
          <Text style={styles.kpiLabel}>{t('totalSupplierDebt') || 'Total Dettes'}</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.filterBar}>
        <View style={[styles.searchBox, isRTL && styles.rowReverse]}>
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            style={[styles.searchInput, isRTL && styles.textRight]}
            placeholder={isRTL ? 'بحث بالاسم، الشركة أو الهاتف...' : 'Rechercher fournisseur, société, tél...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterChip, filterDebtOnly && styles.filterChipActive]}
          onPress={() => setFilterDebtOnly(!filterDebtOnly)}
        >
          <Ionicons name="alert-circle-outline" size={15} color={filterDebtOnly ? '#ffffff' : '#ef4444'} />
          <Text style={[styles.filterChipText, filterDebtOnly && styles.filterChipTextActive]}>
            {isRTL ? 'الديون فقط' : 'Dettes uniquement'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Suppliers List */}
      <FlatList
        data={filteredSuppliers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={54} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>
              {isRTL ? 'لا يوجد موردون مطابقون للبحث' : 'Aucun fournisseur trouvé.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const hasDebt = Number(item.debt || 0) > 0;
          return (
            <View style={[styles.supplierCard, hasDebt && styles.supplierCardDebt]}>
              <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
                <View style={[styles.supplierAvatar, { backgroundColor: hasDebt ? '#fee2e2' : '#e0e7ff' }]}>
                  <Ionicons name="business" size={20} color={hasDebt ? '#ef4444' : theme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.supplierName}>{item.name}</Text>
                  {item.company && item.company !== item.name ? (
                    <Text style={styles.companyName}>{item.company}</Text>
                  ) : null}
                  {item.category ? (
                    <Text style={styles.categoryBadge}>{item.category}</Text>
                  ) : null}
                </View>
                <View style={styles.debtBox}>
                  <Text style={styles.debtTitle}>{t('supplierDebt') || 'Dette'}</Text>
                  <Text style={[styles.debtAmount, hasDebt ? styles.debtAmountRed : styles.debtAmountGreen]}>
                    {formatMoney(item.debt || 0)}
                  </Text>
                </View>
              </View>

              {/* Info Rows */}
              <View style={styles.cardDetails}>
                {item.phone ? (
                  <View style={[styles.infoRow, isRTL && styles.rowReverse]}>
                    <Ionicons name="call-outline" size={14} color="#64748b" />
                    <Text style={styles.infoText}>{item.phone}</Text>
                    <View style={styles.contactIcons}>
                      <TouchableOpacity onPress={() => handleCall(item.phone)} style={styles.contactIconBtn}>
                        <Ionicons name="call" size={14} color="#10b981" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleWhatsApp(item.phone)} style={styles.contactIconBtn}>
                        <Ionicons name="logo-whatsapp" size={14} color="#22c55e" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {item.address ? (
                  <View style={[styles.infoRow, isRTL && styles.rowReverse]}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.infoText}>{item.address}</Text>
                  </View>
                ) : null}

                {item.notes ? (
                  <Text style={styles.notesText} numberOfLines={2}>
                    📝 {item.notes}
                  </Text>
                ) : null}
              </View>

              {/* Action Buttons Bar */}
              <View style={[styles.cardActionsBar, isRTL && styles.rowReverse]}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.payBtn]}
                  onPress={() => openPaymentModal(item)}
                >
                  <Ionicons name="cash-outline" size={15} color="#ffffff" />
                  <Text style={styles.actionBtnText}>{isRTL ? 'دفع وصل' : 'Verser'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.purchaseBtn]}
                  onPress={() => openPurchaseModal(item)}
                >
                  <Ionicons name="cart-outline" size={15} color="#ffffff" />
                  <Text style={styles.actionBtnText}>{isRTL ? 'تسجيل شراء' : 'Bon Achat'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.dossierBtn]}
                  onPress={() => openDossierModal(item)}
                >
                  <Ionicons name="folder-open-outline" size={15} color="#3b82f6" />
                  <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>{isRTL ? 'السجل' : 'Dossier'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => openEditModal(item)}
                >
                  <Ionicons name="pencil" size={16} color="#64748b" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* ADD / EDIT MODAL */}
      <Modal visible={addModalVisible || editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {addModalVisible
                  ? (isRTL ? 'إضافة مورد جديد' : 'Nouveau Fournisseur')
                  : (isRTL ? 'تعديل بيانات المورد' : 'Modifier le Fournisseur')}
              </Text>
              <TouchableOpacity onPress={() => { setAddModalVisible(false); setEditModalVisible(false); }}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 450 }}>
              <Text style={styles.fieldLabel}>{t('supplierName') || 'Nom du Fournisseur'} *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ex: Ahmed Grossiste Belfort"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.fieldLabel}>Nom de la Société / Marque</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ex: SARL Techno DZ"
                value={company}
                onChangeText={setCompany}
              />

              <Text style={styles.fieldLabel}>{t('phone') || 'Téléphone'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0550123456"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.fieldLabel}>{t('address') || 'Adresse / Ville'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ex: Belfort, Alger"
                value={address}
                onChangeText={setAddress}
              />

              <Text style={styles.fieldLabel}>{t('supplierCategory') || 'Catégorie de Produits'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ex: Accessoires, Téléphonie, IPTV..."
                value={category}
                onChangeText={setCategory}
              />

              <Text style={styles.fieldLabel}>{t('supplierDebt') || 'Dette envers ce fournisseur'} ({currency})</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                keyboardType="numeric"
                value={initialDebt}
                onChangeText={setInitialDebt}
              />

              <Text style={styles.fieldLabel}>{t('notes') || 'Notes & Remarques'}</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 60 }]}
                placeholder="Conditions de paiement, jours de livraison..."
                multiline
                value={notes}
                onChangeText={setNotes}
              />
            </ScrollView>

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => { setAddModalVisible(false); setEditModalVisible(false); }}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={addModalVisible ? handleSaveAdd : handleSaveEdit}
              >
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PAYMENT MODAL */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {isRTL ? 'تسجيل دفعة نقدية للمورد' : 'Versement au Fournisseur'}
              </Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Fournisseur : <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedSupplier?.name}</Text>
              {' • '}Dette actuelle : <Text style={{ fontWeight: 'bold', color: '#ef4444' }}>{formatMoney(selectedSupplier?.debt || 0)}</Text>
            </Text>

            <Text style={styles.fieldLabel}>{t('paymentAmount') || 'Montant Versé'} ({currency}) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="ex: 5000"
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
            />

            <Text style={styles.fieldLabel}>{t('notes') || 'Remarques / N° Reçu'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="ex: Virement BaridiMob, Espèces en main propre..."
              value={paymentNotes}
              onChangeText={setPaymentNotes}
            />

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setPaymentModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleRecordPayment}
              >
                <Text style={styles.saveBtnText}>{isRTL ? 'تأكيد الدفع' : 'Valider Versement'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PURCHASE ORDER MODAL */}
      <Modal visible={purchaseModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {isRTL ? 'تسجيل فاتورة شراء / استلام بضاعة' : 'Nouvel Achat / Bon de Réception'}
              </Text>
              <TouchableOpacity onPress={() => setPurchaseModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 450 }}>
              <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                Fournisseur : <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedSupplier?.name}</Text>
              </Text>

              <Text style={styles.fieldLabel}>{t('purchaseTotal') || 'Montant Total Achat'} ({currency}) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ex: 45000"
                keyboardType="numeric"
                value={purchaseTotal}
                onChangeText={setPurchaseTotal}
              />

              <Text style={styles.fieldLabel}>{t('purchasePaid') || 'Montant Versé Comptant'} ({currency})</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ex: 20000 (0 si tout à crédit)"
                keyboardType="numeric"
                value={purchasePaid}
                onChangeText={setPurchasePaid}
              />

              {Number(purchaseTotal) > Number(purchasePaid) ? (
                <View style={styles.remainingDebtNotice}>
                  <Text style={styles.remainingDebtText}>
                    {t('purchaseRemaining') || 'Reste en Dette Fournisseur'} :{' '}
                    <Text style={{ fontWeight: 'bold' }}>
                      {formatMoney(Number(purchaseTotal) - (Number(purchasePaid) || 0))}
                    </Text>
                  </Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>{t('invoiceRef') || 'N° Facture ou Bon'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ex: FAC-2026-0042"
                value={purchaseRef}
                onChangeText={setPurchaseRef}
              />

              <Text style={styles.fieldLabel}>{t('notes') || 'Détails des Articles Achetés'}</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 60 }]}
                placeholder="ex: 50x Câbles Type-C, 20x Écrans OLED..."
                multiline
                value={purchaseNotes}
                onChangeText={setPurchaseNotes}
              />
            </ScrollView>

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setPurchaseModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSavePurchase}
              >
                <Text style={styles.saveBtnText}>{isRTL ? 'تسجيل الفاتورة' : 'Enregistrer Achat'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DOSSIER MODAL */}
      <Modal visible={dossierModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 550 }]}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {isRTL ? 'سجل حركات المورد' : 'Dossier & Historique Fournisseur'}
              </Text>
              <TouchableOpacity onPress={() => setDossierModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.dossierSummaryBox}>
              <Text style={styles.dossierSupplierName}>{selectedSupplier?.name}</Text>
              <Text style={styles.dossierPhone}>{selectedSupplier?.phone || 'Pas de numéro'}</Text>
              <View style={[styles.dossierDebtRow, isRTL && styles.rowReverse]}>
                <Text style={styles.dossierDebtLabel}>{t('supplierDebt') || 'Solde Dette Actuelle :'}</Text>
                <Text style={styles.dossierDebtVal}>{formatMoney(selectedSupplier?.debt || 0)}</Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              <Text style={styles.subHeading}>{t('supplierHistory') || 'Achats & Commandes'}</Text>
              {purchases.filter((p) => p.supplierId === selectedSupplier?.id).length === 0 ? (
                <Text style={styles.emptySubText}>Aucun achat enregistré pour ce fournisseur.</Text>
              ) : (
                purchases
                  .filter((p) => p.supplierId === selectedSupplier?.id)
                  .map((pur) => (
                    <View key={pur.id} style={styles.dossierHistoryRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyRef}>Facture #{pur.invoiceRef || pur.id.slice(-6)}</Text>
                        <Text style={styles.historyDate}>{new Date(pur.date).toLocaleDateString()}</Text>
                        {pur.notes ? <Text style={styles.historyNotes}>{pur.notes}</Text> : null}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.historyTotal}>{formatMoney(pur.total)}</Text>
                        <Text style={styles.historyPaid}>Payé: {formatMoney(pur.paidAmount)}</Text>
                      </View>
                    </View>
                  ))
              )}
            </ScrollView>

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setDossierModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('close')}</Text>
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
    backgroundColor: '#f8fafc',
  },
  toast: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryAddBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 5,
  },
  kpiRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 3,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 6,
    color: '#0f172a',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  filterChipActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ef4444',
    marginLeft: 4,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 10,
  },
  supplierCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  supplierCardDebt: {
    borderColor: '#fca5a5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplierName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  companyName: {
    fontSize: 12,
    color: '#64748b',
  },
  categoryBadge: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  debtBox: {
    alignItems: 'flex-end',
  },
  debtTitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  debtAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  debtAmountRed: {
    color: '#ef4444',
  },
  debtAmountGreen: {
    color: '#10b981',
  },
  cardDetails: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 6,
    flex: 1,
  },
  contactIcons: {
    flexDirection: 'row',
  },
  contactIconBtn: {
    padding: 4,
    marginLeft: 6,
  },
  notesText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 6,
  },
  payBtn: {
    backgroundColor: '#10b981',
  },
  purchaseBtn: {
    backgroundColor: '#f59e0b',
  },
  dossierBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  iconActionBtn: {
    padding: 6,
    marginLeft: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  remainingDebtNotice: {
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  remainingDebtText: {
    fontSize: 12,
    color: '#b91c1c',
  },
  dossierSummaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dossierSupplierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  dossierPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  dossierDebtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  dossierDebtLabel: {
    fontSize: 13,
    color: '#475569',
  },
  dossierDebtVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  subHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  dossierHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyRef: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  historyDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  historyNotes: {
    fontSize: 11,
    color: '#64748b',
  },
  historyTotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  historyPaid: {
    fontSize: 11,
    color: '#10b981',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginLeft: 8,
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
});
