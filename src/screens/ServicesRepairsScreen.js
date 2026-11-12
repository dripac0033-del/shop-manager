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

export default function ServicesRepairsScreen({ navigation }) {
  const {
    t,
    formatMoney,
    services = [],
    repairs = [],
    customers = [],
    addService,
    updateService,
    deleteService,
    addRepair,
    updateRepair,
    deleteRepair,
    completeRepairAndPay,
    isRTL,
    storeInfo,
  } = useApp();

  // Active Sub-Tab: 'services' | 'repairs'
  const [activeTab, setActiveTab] = useState('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Service Modal State
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');

  // Repair Modal State
  const [repairModalVisible, setRepairModalVisible] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  const [repairDetailModalVisible, setRepairDetailModalVisible] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);

  // Repair Form Fields
  const [repairCustName, setRepairCustName] = useState('');
  const [repairCustPhone, setRepairCustPhone] = useState('');
  const [repairDevice, setRepairDevice] = useState('');
  const [repairIssue, setRepairIssue] = useState('');
  const [repairStatus, setRepairStatus] = useState('received');
  const [repairEstimatedCost, setRepairEstimatedCost] = useState('');
  const [repairDeposit, setRepairDeposit] = useState('');
  const [repairNotes, setRepairNotes] = useState('');

  // Repair Status filter
  const [repairStatusFilter, setRepairStatusFilter] = useState('all');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  /* ==============================================================
   * SERVICES HANDLERS (Validates directly and exits)
   * ============================================================== */
  const handleOpenAddService = () => {
    setEditingService(null);
    setServiceName('');
    setServiceCategory('Général');
    setServiceDescription('');
    setServicePrice('');
    setServiceModalVisible(true);
  };

  const handleOpenEditService = (srv) => {
    setEditingService(srv);
    setServiceName(srv.name || '');
    setServiceCategory(srv.category || 'Général');
    setServiceDescription(srv.description || '');
    setServicePrice((srv.price || 0).toString());
    setServiceModalVisible(true);
  };

  const handleSaveService = async () => {
    if (!serviceName.trim()) {
      Alert.alert(t('services'), isRTL ? 'يرجى إدخال اسم الخدمة!' : 'Veuillez saisir le nom du service !');
      return;
    }

    const payload = {
      name: serviceName.trim(),
      category: serviceCategory.trim() || 'Général',
      description: serviceDescription.trim(),
      price: Number(servicePrice || 0),
    };

    // DIRECTLY QUIT WINDOW
    setServiceModalVisible(false);

    try {
      if (editingService) {
        await updateService(editingService.id, payload);
        showToast(isRTL ? '✅ تم تحديث الخدمة بنجاح' : '✅ Service modifié');
      } else {
        await addService(payload);
        showToast(isRTL ? '✅ تم إضافة الخدمة وحفظها' : '✅ Service enregistré');
      }
    } catch (err) {
      console.warn('Error saving service:', err);
    }
  };

  const handleDeleteService = (id) => {
    const confirmMsg = isRTL ? 'هل تريد حذف هذه الخدمة؟' : 'Voulez-vous supprimer ce service ?';
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) {
        deleteService(id);
        showToast(isRTL ? 'تم حذف الخدمة' : 'Service supprimé');
      }
      return;
    }
    Alert.alert(t('deleteProduct'), confirmMsg, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: isRTL ? 'حذف' : 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteService(id);
          showToast(isRTL ? 'تم حذف الخدمة' : 'Service supprimé');
        },
      },
    ]);
  };

  /* ==============================================================
   * REPAIRS HANDLERS (Validates directly and exits)
   * ============================================================== */
  const handleOpenAddRepair = () => {
    setEditingRepair(null);
    setRepairCustName('');
    setRepairCustPhone('');
    setRepairDevice('');
    setRepairIssue('');
    setRepairStatus('received');
    setRepairEstimatedCost('');
    setRepairDeposit('');
    setRepairNotes('');
    setRepairModalVisible(true);
  };

  const handleOpenEditRepair = (rep) => {
    setEditingRepair(rep);
    setRepairCustName(rep.customerName || '');
    setRepairCustPhone(rep.customerPhone || '');
    setRepairDevice(rep.deviceModel || '');
    setRepairIssue(rep.issueDescription || '');
    setRepairStatus(rep.status || 'received');
    setRepairEstimatedCost((rep.estimatedCost || 0).toString());
    setRepairDeposit((rep.depositPaid || 0).toString());
    setRepairNotes(rep.technicianNotes || '');
    setRepairModalVisible(true);
  };

  const handleSaveRepair = async () => {
    if (!repairCustName.trim() || !repairDevice.trim()) {
      Alert.alert(
        t('repairs'),
        isRTL ? 'يرجى إدخال اسم الزبون ونوع الجهاز!' : 'Veuillez renseigner le nom du client et le modèle !'
      );
      return;
    }

    const payload = {
      customerName: repairCustName.trim(),
      customerPhone: repairCustPhone.trim(),
      deviceModel: repairDevice.trim(),
      issueDescription: repairIssue.trim(),
      status: repairStatus,
      estimatedCost: Number(repairEstimatedCost || 0),
      finalCost: Number(repairEstimatedCost || 0),
      depositPaid: Number(repairDeposit || 0),
      technicianNotes: repairNotes.trim(),
    };

    // DIRECTLY QUIT WINDOW
    setRepairModalVisible(false);

    try {
      if (editingRepair) {
        await updateRepair(editingRepair.id, payload);
        showToast(isRTL ? '✅ تم تحديث ملف الصيانة' : '✅ Dossier de réparation mis à jour');
      } else {
        await addRepair(payload);
        showToast(isRTL ? '✅ تم تسجيل ملف الصيانة بنجاح' : '✅ Dossier de réparation enregistré');
      }
    } catch (err) {
      console.warn('Error saving repair:', err);
    }
  };

  const handleDeleteRepair = (id) => {
    const confirmMsg = isRTL ? 'هل تريد حذف هذا الملف؟' : 'Voulez-vous supprimer ce dossier de réparation ?';
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) {
        deleteRepair(id);
        showToast(isRTL ? 'تم حذف الملف' : 'Dossier supprimé');
      }
      return;
    }
    Alert.alert(t('deleteProduct'), confirmMsg, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: isRTL ? 'حذف' : 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteRepair(id);
          showToast(isRTL ? 'تم حذف الملف' : 'Dossier supprimé');
        },
      },
    ]);
  };

  // Close and collect payment for repair
  const handleDeliverRepair = async (rep) => {
    const remaining = Math.max(0, (rep.finalCost || rep.estimatedCost || 0) - (rep.depositPaid || 0));
    const confirmMsg = isRTL
      ? `تسليم الجهاز للزبون وتأكيد تحصيل المبلغ المتبقي (${formatMoney(remaining)})؟`
      : `Clôturer la réparation et encaisser le solde restant (${formatMoney(remaining)}) ?`;

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) {
        await completeRepairAndPay(rep.id, remaining);
        showToast(isRTL ? '✅ تم تسليم الجهاز وتسجيل المبلغ' : '✅ Réparation clôturée & solde encaissé');
        setRepairDetailModalVisible(false);
      }
      return;
    }

    Alert.alert(isRTL ? 'تسليم وإغلاق' : 'Clôturer la Réparation', confirmMsg, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: isRTL ? 'تأكيد التسليم' : 'Valider la livraison',
        onPress: async () => {
          await completeRepairAndPay(rep.id, remaining);
          showToast(isRTL ? '✅ تم تسليم الجهاز وتسجيل المبلغ' : '✅ Réparation clôturée & solde encaissé');
          setRepairDetailModalVisible(false);
        },
      },
    ]);
  };

  // WhatsApp Repair notification
  const handleSendRepairWhatsApp = (rep) => {
    const cleanPhone = (rep.customerPhone || '').replace(/[^0-9]/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '213' + cleanPhone.substring(1) : cleanPhone;
    const msg = isRTL
      ? `السلام عليكم ${rep.customerName}،\nنعلمكم بخصوص جهازكم [${rep.deviceModel}] المسجل تحت رقم *#${rep.ticketNumber}* لدى *${storeInfo.name || 'Store Soft'}*.\nالحالة الحالية: *${getStatusLabel(rep.status)}*.\n📞 هاتف المحل: ${storeInfo.phone || ''}`
      : `Bonjour ${rep.customerName},\nConcernant votre appareil [${rep.deviceModel}] - Dossier *#${rep.ticketNumber}* chez *${storeInfo.name || 'Store Soft'}*.\nStatut actuel : *${getStatusLabel(rep.status)}*.\n📞 Magasin : ${storeInfo.phone || ''}`;

    const url = cleanPhone ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => Alert.alert('WhatsApp', msg));
    }
  };

  const getStatusLabel = (st) => {
    switch (st) {
      case 'received':
        return isRTL ? 'تم الاستلام' : 'Reçu';
      case 'in_progress':
        return isRTL ? 'قيد الصيانة' : 'En cours';
      case 'waiting_parts':
        return isRTL ? 'في انتظار قطع' : 'En attente pièce';
      case 'repaired':
        return isRTL ? 'تم التصليح (جاهز)' : 'Réparé (Prêt)';
      case 'delivered':
        return isRTL ? 'تم التسليم' : 'Livré / Clôturé';
      case 'cancelled':
        return isRTL ? 'ملغى' : 'Annulé';
      default:
        return st;
    }
  };

  const getStatusColor = (st) => {
    switch (st) {
      case 'received':
        return '#3b82f6';
      case 'in_progress':
        return '#f59e0b';
      case 'waiting_parts':
        return '#8b5cf6';
      case 'repaired':
        return '#10b981';
      case 'delivered':
        return '#059669';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  // Filtered Services
  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    );
  });

  // Filtered Repairs
  const filteredRepairs = repairs.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.customerPhone || '').includes(q) ||
      (r.deviceModel || '').toLowerCase().includes(q) ||
      (r.ticketNumber || '').toLowerCase().includes(q);

    const matchStatus = repairStatusFilter === 'all' || r.status === repairStatusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <View style={styles.container}>
      {/* Toast Feedback */}
      {toastMessage ? (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Top Main Tab Toggle: Services vs Réparations */}
      <View style={[styles.mainTabRow, isRTL && styles.rowReverse]}>
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'services' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('services')}
        >
          <Ionicons
            name="construct-outline"
            size={18}
            color={activeTab === 'services' ? '#ffffff' : theme.colors.textSecondary}
          />
          <Text style={[styles.mainTabBtnText, activeTab === 'services' && styles.mainTabBtnTextActive]}>
            {t('services')} ({services.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'repairs' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('repairs')}
        >
          <Ionicons
            name="hardware-chip-outline"
            size={18}
            color={activeTab === 'repairs' ? '#ffffff' : theme.colors.textSecondary}
          />
          <Text style={[styles.mainTabBtnText, activeTab === 'repairs' && styles.mainTabBtnTextActive]}>
            {t('repairs')} ({repairs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar & Action Button */}
      <View style={[styles.headerControlsRow, isRTL && styles.rowReverse]}>
        <View style={[styles.searchBar, isRTL && styles.rowReverse]}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.textRight]}
            placeholder={
              activeTab === 'services'
                ? (isRTL ? 'ابحث عن خدمة...' : 'Rechercher un service...')
                : (isRTL ? 'بحث برقم الوصل، الزبون، أو الجهاز...' : 'Rechercher N° ticket, client, appareil...')
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.addMainBtn}
          onPress={activeTab === 'services' ? handleOpenAddService : handleOpenAddRepair}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
          <Text style={styles.addMainBtnText}>
            {activeTab === 'services' ? t('newService') : t('newRepair')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status Filter for Repairs */}
      {activeTab === 'repairs' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilterScroll}>
          {[
            { key: 'all', label: isRTL ? 'الكل' : 'Tous' },
            { key: 'received', label: t('statusReceived') },
            { key: 'in_progress', label: t('statusInProgress') },
            { key: 'waiting_parts', label: t('statusWaitingParts') },
            { key: 'repaired', label: t('statusRepaired') },
            { key: 'delivered', label: t('statusDelivered') },
          ].map((st) => (
            <TouchableOpacity
              key={st.key}
              style={[
                styles.statusFilterPill,
                repairStatusFilter === st.key && styles.statusFilterPillActive,
              ]}
              onPress={() => setRepairStatusFilter(st.key)}
            >
              <Text
                style={[
                  styles.statusFilterPillText,
                  repairStatusFilter === st.key && styles.statusFilterPillTextActive,
                ]}
              >
                {st.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* TAB CONTENT: SERVICES */}
      {activeTab === 'services' && (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={[styles.itemCard, isRTL && styles.rowReverse]}>
              <View style={styles.serviceIconCircle}>
                <Ionicons name="construct" size={20} color="#6366f1" />
              </View>

              <View style={[styles.itemMeta, isRTL && styles.alignRight]}>
                <View style={[styles.tagRow, isRTL && styles.rowReverse]}>
                  <Text style={styles.categoryTag}>{item.category || 'Général'}</Text>
                </View>
                <Text style={styles.itemTitle}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.itemDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>

              <View style={styles.itemRightCol}>
                <Text style={styles.itemPrice}>{formatMoney(item.price)}</Text>
                <View style={[styles.actionsBtnRow, isRTL && styles.rowReverse]}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleOpenEditService(item)}
                  >
                    <Ionicons name="pencil" size={15} color={theme.colors.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.colors.dangerLight }]}
                    onPress={() => handleDeleteService(item.id)}
                  >
                    <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="construct-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {isRTL ? 'لا توجد خدمات مسجلة' : 'Aucun service enregistré'}
              </Text>
              <Text style={styles.emptySub}>
                {isRTL
                  ? 'سجل خدمات المحل كالفورمات، تركيب شاشات، صيانة أو تنصيب برامج.'
                  : 'Enregistrez les prestations de votre boutique (installation, formatage, changement écran...).'}
              </Text>
            </View>
          }
        />
      )}

      {/* TAB CONTENT: REPAIRS */}
      {activeTab === 'repairs' && (
        <FlatList
          data={filteredRepairs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const remaining = Math.max(0, (item.finalCost || item.estimatedCost || 0) - (item.depositPaid || 0));
            const statusColor = getStatusColor(item.status);

            return (
              <TouchableOpacity
                style={[styles.itemCard, isRTL && styles.rowReverse]}
                onPress={() => {
                  setSelectedRepair(item);
                  setRepairDetailModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.repairStatusIndicator, { backgroundColor: statusColor }]} />

                <View style={[styles.itemMeta, isRTL && styles.alignRight]}>
                  <View style={[styles.tagRow, isRTL && styles.rowReverse]}>
                    <Text style={styles.ticketBadge}>#{item.ticketNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {getStatusLabel(item.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.itemTitle}>{item.deviceModel}</Text>
                  <Text style={styles.repairCustText}>
                    <Ionicons name="person-outline" size={12} /> {item.customerName} {item.customerPhone ? `(${item.customerPhone})` : ''}
                  </Text>
                  {item.issueDescription ? (
                    <Text style={styles.itemDesc} numberOfLines={1}>
                      {isRTL ? 'العطل:' : 'Panne :'} {item.issueDescription}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.itemRightCol}>
                  <Text style={styles.itemPrice}>{formatMoney(item.finalCost || item.estimatedCost)}</Text>
                  {remaining > 0 ? (
                    <Text style={styles.repairRemainingText}>
                      {isRTL ? 'المتبقي:' : 'Reste :'} {formatMoney(remaining)}
                    </Text>
                  ) : (
                    <Text style={styles.repairPaidText}>{isRTL ? 'مدفوع كلياً' : 'Réglé'}</Text>
                  )}

                  <View style={[styles.actionsBtnRow, isRTL && styles.rowReverse]}>
                    <TouchableOpacity
                      style={styles.whatsAppBtnSmall}
                      onPress={() => handleSendRepairWhatsApp(item)}
                    >
                      <Ionicons name="logo-whatsapp" size={14} color="#ffffff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenEditRepair(item)}
                    >
                      <Ionicons name="pencil" size={14} color={theme.colors.secondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="hardware-chip-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {isRTL ? 'لا توجد طلبات صيانة حالياً' : 'Aucun dossier de réparation'}
              </Text>
              <Text style={styles.emptySub}>
                {isRTL
                  ? 'اضغط على زر (وصل صيانة جديد) لتسجيل جهاز تم استلامه من الزبون.'
                  : 'Cliquez sur Nouveau Dossier pour enregistrer la réception d\'un appareil à réparer.'}
              </Text>
            </View>
          }
        />
      )}

      {/* SERVICE MODAL (Add / Edit) - Direct validation & close */}
      <Modal visible={serviceModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {editingService ? (isRTL ? 'تعديل الخدمة' : 'Modifier le Service') : t('newService')}
              </Text>
              <TouchableOpacity onPress={() => setServiceModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('serviceName')} *</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                placeholder="Ex: Formatage & Installation Windows"
                value={serviceName}
                onChangeText={setServiceName}
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('serviceCategory')}</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                placeholder="Ex: Logiciel / Maintenance / Réseau"
                value={serviceCategory}
                onChangeText={setServiceCategory}
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('servicePrice')}</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                placeholder="0"
                keyboardType="numeric"
                value={servicePrice}
                onChangeText={setServicePrice}
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('serviceDescription')}</Text>
              <TextInput
                style={[styles.inputBox, { height: 80, textAlignVertical: 'top', paddingTop: 8 }, isRTL && styles.textRight]}
                placeholder="Ex: Comprend sauvegarde des données et installation antivirus"
                multiline
                numberOfLines={3}
                value={serviceDescription}
                onChangeText={setServiceDescription}
              />

              {/* Direct Save Button */}
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveService}>
                <Text style={styles.submitBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* REPAIR MODAL (Add / Edit) - Direct validation & close */}
      <Modal visible={repairModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {editingRepair ? (isRTL ? 'تعديل ملف الصيانة' : 'Modifier Réparation') : t('newRepair')}
              </Text>
              <TouchableOpacity onPress={() => setRepairModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.formRow, isRTL && styles.rowReverse]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('customerName')} *</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    placeholder="Ex: Karim Hadj"
                    value={repairCustName}
                    onChangeText={setRepairCustName}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('phone')}</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    placeholder="0550..."
                    keyboardType="phone-pad"
                    value={repairCustPhone}
                    onChangeText={setRepairCustPhone}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('deviceModel')} *</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                placeholder="Ex: Samsung Galaxy A54 / PC Lenovo Legion"
                value={repairDevice}
                onChangeText={setRepairDevice}
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('issueDescription')} *</Text>
              <TextInput
                style={[styles.inputBox, { height: 70, textAlignVertical: 'top', paddingTop: 8 }, isRTL && styles.textRight]}
                placeholder="Ex: Afficheur cassé, problème chargeur..."
                multiline
                numberOfLines={3}
                value={repairIssue}
                onChangeText={setRepairIssue}
              />

              {/* Status Picker */}
              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('repairStatus')}</Text>
              <View style={[styles.statusSelectionRow, isRTL && styles.rowReverse]}>
                {[
                  { key: 'received', label: t('statusReceived') },
                  { key: 'in_progress', label: t('statusInProgress') },
                  { key: 'waiting_parts', label: t('statusWaitingParts') },
                  { key: 'repaired', label: t('statusRepaired') },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.statusSelectPill, repairStatus === s.key && styles.statusSelectPillActive]}
                    onPress={() => setRepairStatus(s.key)}
                  >
                    <Text style={[styles.statusSelectPillText, repairStatus === s.key && styles.statusSelectPillTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.formRow, isRTL && styles.rowReverse]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('estimatedCost')}</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    placeholder="0"
                    keyboardType="numeric"
                    value={repairEstimatedCost}
                    onChangeText={setRepairEstimatedCost}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('depositPaid')}</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    placeholder="0"
                    keyboardType="numeric"
                    value={repairDeposit}
                    onChangeText={setRepairDeposit}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('technicianNotes')}</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                placeholder="Ex: Pièce commandée chez Fournisseur X"
                value={repairNotes}
                onChangeText={setRepairNotes}
              />

              {/* Direct Save Button */}
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveRepair}>
                <Text style={styles.submitBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* REPAIR DETAILS / WORKSHOP SHEET MODAL */}
      <Modal visible={repairDetailModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRepair && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
                  <Text style={styles.modalTitle}>
                    {isRTL ? 'بطاقة متابعة الصيانة' : 'Fiche Réparation'} #{selectedRepair.ticketNumber}
                  </Text>
                  <TouchableOpacity onPress={() => setRepairDetailModalVisible(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.ticketCard}>
                  <Text style={styles.ticketDeviceName}>{selectedRepair.deviceModel}</Text>
                  <View style={[styles.tagRow, isRTL && styles.rowReverse]}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRepair.status) + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedRepair.status) }]}>
                        {getStatusLabel(selectedRepair.status)}
                      </Text>
                    </View>
                    <Text style={styles.ticketDateText}>
                      {isRTL ? 'تاريخ الاستلام:' : 'Reçu le :'} {new Date(selectedRepair.dateReceived || selectedRepair.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.ticketDetailsBox}>
                    <Text style={styles.ticketRowLabel}>{isRTL ? 'الزبون:' : 'Client :'} <Text style={styles.ticketRowVal}>{selectedRepair.customerName}</Text></Text>
                    {selectedRepair.customerPhone ? (
                      <Text style={styles.ticketRowLabel}>{isRTL ? 'الهاتف:' : 'Téléphone :'} <Text style={styles.ticketRowVal}>{selectedRepair.customerPhone}</Text></Text>
                    ) : null}
                    <Text style={styles.ticketRowLabel}>{isRTL ? 'وصف العطل:' : 'Panne :'} <Text style={styles.ticketRowVal}>{selectedRepair.issueDescription}</Text></Text>
                    {selectedRepair.technicianNotes ? (
                      <Text style={styles.ticketRowLabel}>{isRTL ? 'ملاحظات التقني:' : 'Notes :'} <Text style={styles.ticketRowVal}>{selectedRepair.technicianNotes}</Text></Text>
                    ) : null}
                  </View>

                  {/* Financial breakdown */}
                  <View style={styles.ticketFinancesBox}>
                    <View style={styles.financeLine}>
                      <Text style={styles.financeLineLabel}>{isRTL ? 'التكلفة الإجمالية:' : 'Coût Total :'}</Text>
                      <Text style={styles.financeLineVal}>{formatMoney(selectedRepair.finalCost || selectedRepair.estimatedCost)}</Text>
                    </View>
                    <View style={styles.financeLine}>
                      <Text style={styles.financeLineLabel}>{isRTL ? 'العربون المدفوع:' : 'Acompte versé :'}</Text>
                      <Text style={[styles.financeLineVal, { color: '#059669' }]}>-{formatMoney(selectedRepair.depositPaid || 0)}</Text>
                    </View>
                    <View style={[styles.financeLine, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 4 }]}>
                      <Text style={[styles.financeLineLabel, { fontWeight: 'bold' }]}>{isRTL ? 'المتبقي للدفع:' : 'Reste à payer :'}</Text>
                      <Text style={[styles.financeLineVal, { fontWeight: 'bold', color: theme.colors.danger }]}>
                        {formatMoney(Math.max(0, (selectedRepair.finalCost || selectedRepair.estimatedCost || 0) - (selectedRepair.depositPaid || 0)))}
                      </Text>
                    </View>
                  </View>

                  {/* Quick Status Updater */}
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{isRTL ? 'تحديث الحالة سريعاً:' : 'Changer statut rapide :'}</Text>
                  <View style={[styles.statusSelectionRow, isRTL && styles.rowReverse]}>
                    {['received', 'in_progress', 'waiting_parts', 'repaired'].map((stKey) => (
                      <TouchableOpacity
                        key={stKey}
                        style={[styles.statusSelectPill, selectedRepair.status === stKey && styles.statusSelectPillActive]}
                        onPress={async () => {
                          const updated = await updateRepair(selectedRepair.id, { status: stKey });
                          setSelectedRepair(updated);
                          showToast(isRTL ? 'تم تغيير الحالة' : 'Statut mis à jour');
                        }}
                      >
                        <Text style={[styles.statusSelectPillText, selectedRepair.status === stKey && styles.statusSelectPillTextActive]}>
                          {getStatusLabel(stKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Actions: Deliver & Pay, WhatsApp, Delete */}
                  <View style={styles.ticketActionsCol}>
                    {selectedRepair.status !== 'delivered' && (
                      <TouchableOpacity
                        style={styles.deliverBtn}
                        onPress={() => handleDeliverRepair(selectedRepair)}
                      >
                        <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                        <Text style={styles.deliverBtnText}>
                          {isRTL ? 'تسليم للجهاز وتحصيل المتبقي' : 'Livrer au client & Encaisser'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.whatsAppActionBtn}
                      onPress={() => handleSendRepairWhatsApp(selectedRepair)}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                      <Text style={styles.whatsAppActionBtnText}>
                        {isRTL ? 'إرسال إشعار للزبون عبر واتساب' : 'Informer le client sur WhatsApp'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteRepairBtn}
                      onPress={() => {
                        handleDeleteRepair(selectedRepair.id);
                        setRepairDetailModalVisible(false);
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                      <Text style={styles.deleteRepairBtnText}>{isRTL ? 'حذف الملف' : 'Supprimer ce dossier'}</Text>
                    </TouchableOpacity>
                  </View>
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
  mainTabRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 6,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 1,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  mainTabBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  mainTabBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  mainTabBtnTextActive: {
    color: '#ffffff',
  },
  headerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 44,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 6,
    fontSize: 13,
  },
  addMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.full,
    elevation: 2,
  },
  addMainBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statusFilterScroll: {
    marginHorizontal: theme.spacing.md,
    marginBottom: 10,
  },
  statusFilterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusFilterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  statusFilterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  statusFilterPillTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 40,
  },
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 1,
  },
  serviceIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  repairStatusIndicator: {
    width: 5,
    height: '100%',
    borderRadius: 3,
    marginRight: 10,
  },
  itemMeta: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6366f1',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ticketBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  repairCustText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  itemDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  itemRightCol: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  repairRemainingText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.danger,
    marginTop: 2,
  },
  repairPaidText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginTop: 2,
  },
  actionsBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  whatsAppBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: 30,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
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
    maxWidth: 500,
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
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
    fontWeight: '600',
  },
  inputBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 13,
    backgroundColor: '#ffffff',
    color: theme.colors.text,
  },
  formRow: {
    flexDirection: 'row',
  },
  statusSelectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 6,
  },
  statusSelectPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusSelectPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  statusSelectPillText: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '600',
  },
  statusSelectPillTextActive: {
    color: '#ffffff',
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: 18,
    elevation: 2,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  ticketCard: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ticketDeviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  ticketDateText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },
  ticketDetailsBox: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  ticketRowLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginVertical: 2,
  },
  ticketRowVal: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  ticketFinancesBox: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  financeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  financeLineLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  financeLineVal: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ticketActionsCol: {
    marginTop: 14,
  },
  deliverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
  },
  deliverBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  whatsAppActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
  },
  whatsAppActionBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  deleteRepairBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  deleteRepairBtnText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
