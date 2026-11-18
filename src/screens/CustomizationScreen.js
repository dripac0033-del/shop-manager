import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const ICON_OPTIONS = [
  'flash',
  'hardware-chip',
  'shield-checkmark',
  'phone-portrait',
  'construct',
  'bicycle',
  'gift',
  'cube',
  'cart',
  'pricetag',
  'wifi',
  'tv',
  'headset',
  'print',
  'sparkles',
  'battery-charging',
];

const COLOR_OPTIONS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#64748b', // Slate
];

export default function CustomizationScreen() {
  const navigation = useNavigation();
  const {
    t,
    formatMoney,
    currency = 'DA',
    isRTL,
    customPresets = {},
    addQuickSaleItem,
    updateQuickSaleItem,
    deleteQuickSaleItem,
    addCustomExpenseCategory,
    deleteCustomExpenseCategory,
    addCustomRepairDevice,
    deleteCustomRepairDevice,
    addCustomRepairIssue,
    deleteCustomRepairIssue,
    addCustomPaymentMethod,
    togglePaymentMethod,
    bulkImportData,
  } = useApp();

  // Active Sub-Tab: 'quickKeys' | 'expenses' | 'repairs' | 'payments' | 'importer'
  const [activeTab, setActiveTab] = useState('quickKeys');
  const [toastMessage, setToastMessage] = useState('');

  // Quick Key Modal State
  const [quickKeyModalVisible, setQuickKeyModalVisible] = useState(false);
  const [editingQuickKey, setEditingQuickKey] = useState(null);
  const [qkNameFr, setQkNameFr] = useState('');
  const [qkNameAr, setQkNameAr] = useState('');
  const [qkPrice, setQkPrice] = useState('');
  const [qkCategory, setQkCategory] = useState('Services');
  const [qkIcon, setQkIcon] = useState('flash');
  const [qkColor, setQkColor] = useState('#3b82f6');

  // Input states for categories & presets
  const [newExpenseCatInput, setNewExpenseCatInput] = useState('');
  const [newDeviceInput, setNewDeviceInput] = useState('');
  const [newIssueInput, setNewIssueInput] = useState('');

  // Payment Method Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [pmLabelFr, setPmLabelFr] = useState('');
  const [pmLabelAr, setPmLabelAr] = useState('');
  const [pmIcon, setPmIcon] = useState('card-outline');

  // Bulk Importer State
  const [importType, setImportType] = useState('products'); // 'products' | 'customers' | 'suppliers' | 'quickKeys'
  const [csvText, setCsvText] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const openAddQuickKeyModal = () => {
    setEditingQuickKey(null);
    setQkNameFr('');
    setQkNameAr('');
    setQkPrice('');
    setQkCategory('Services');
    setQkIcon('flash');
    setQkColor('#3b82f6');
    setQuickKeyModalVisible(true);
  };

  const openEditQuickKeyModal = (item) => {
    setEditingQuickKey(item);
    setQkNameFr(item.nameFr || '');
    setQkNameAr(item.nameAr || '');
    setQkPrice(item.price ? String(item.price) : '');
    setQkCategory(item.category || 'Services');
    setQkIcon(item.icon || 'flash');
    setQkColor(item.color || '#3b82f6');
    setQuickKeyModalVisible(true);
  };

  const handleSaveQuickKey = async () => {
    if (!qkNameFr.trim()) {
      alertMsg(isRTL ? 'يرجى إدخال اسم الزر' : 'Veuillez saisir le nom du bouton.');
      return;
    }
    const priceNum = Number(qkPrice) || 0;
    try {
      if (editingQuickKey) {
        await updateQuickSaleItem(editingQuickKey.id, {
          nameFr: qkNameFr.trim(),
          nameAr: qkNameAr.trim(),
          price: priceNum,
          category: qkCategory.trim() || 'Services',
          icon: qkIcon,
          color: qkColor,
        });
        showToast(isRTL ? 'تم تحديث الزر بنجاح' : 'Bouton modifié avec succès !');
      } else {
        await addQuickSaleItem({
          nameFr: qkNameFr.trim(),
          nameAr: qkNameAr.trim(),
          price: priceNum,
          category: qkCategory.trim() || 'Services',
          icon: qkIcon,
          color: qkColor,
        });
        showToast(isRTL ? 'تم إضافة الزر السريع بنجاح' : 'Bouton rapide ajouté avec succès !');
      }
      setQuickKeyModalVisible(false);
    } catch (e) {
      alertMsg(e.message);
    }
  };

  const handleDeleteQuickKey = (item) => {
    const confirmMsg = isRTL
      ? `هل أنت متأكد من حذف الزر "${item.nameAr || item.nameFr}"؟`
      : `Voulez-vous supprimer le bouton "${item.nameFr}" ?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        deleteQuickSaleItem(item.id);
        showToast(isRTL ? 'تم الحذف' : 'Bouton supprimé');
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
            deleteQuickSaleItem(item.id);
            showToast(isRTL ? 'تم الحذف' : 'Bouton supprimé');
          },
        },
      ]
    );
  };

  const handleAddExpenseCategory = async () => {
    if (!newExpenseCatInput.trim()) return;
    await addCustomExpenseCategory(newExpenseCatInput.trim());
    setNewExpenseCatInput('');
    showToast(isRTL ? 'تم إضافة صنف المصاريف' : 'Catégorie ajoutée !');
  };

  const handleAddDevicePreset = async () => {
    if (!newDeviceInput.trim()) return;
    await addCustomRepairDevice(newDeviceInput.trim());
    setNewDeviceInput('');
    showToast(isRTL ? 'تم إضافة نوع الجهاز' : 'Modèle d\'appareil ajouté !');
  };

  const handleAddIssuePreset = async () => {
    if (!newIssueInput.trim()) return;
    await addCustomRepairIssue(newIssueInput.trim());
    setNewIssueInput('');
    showToast(isRTL ? 'تم إضافة العطل' : 'Type de panne ajouté !');
  };

  const handleSavePaymentMethod = async () => {
    if (!pmLabelFr.trim()) {
      alertMsg(isRTL ? 'يرجى إدخال اسم طريقة الدفع' : 'Veuillez saisir le libellé.');
      return;
    }
    await addCustomPaymentMethod({
      labelFr: pmLabelFr.trim(),
      labelAr: pmLabelAr.trim() || pmLabelFr.trim(),
      icon: pmIcon,
    });
    setPaymentModalVisible(false);
    setPmLabelFr('');
    setPmLabelAr('');
    showToast(isRTL ? 'تمت إضافة طريقة الدفع' : 'Mode de paiement ajouté !');
  };

  // Helper alert
  const alertMsg = (msg) => {
    if (Platform.OS === 'web') {
      window.alert ? window.alert(msg) : console.log(msg);
    } else {
      Alert.alert(isRTL ? 'تنبيه' : 'Information', msg);
    }
  };

  // CSV Parse Handler
  const handleAnalyzeCSV = () => {
    if (!csvText.trim()) {
      alertMsg(isRTL ? 'يرجى لصق نص CSV أولاً' : 'Veuillez coller le texte CSV d\'abord.');
      return;
    }

    const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      alertMsg(isRTL ? 'النص فارغ' : 'Le texte est vide.');
      return;
    }

    const items = [];
    // Auto-detect header if first row contains non-numbers
    let startIdx = 0;
    const firstLineCols = lines[0].split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const isHeader = firstLineCols.some((c) => /nom|name|prix|price|code|stock|tel|phone/i.test(c));
    if (isHeader) startIdx = 1;

    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (parts.length === 0 || !parts[0]) continue;

      if (importType === 'products') {
        // Expected format: Nom, PrixAchat, PrixVente, Stock, CodeBarre, Catégorie
        items.push({
          nameFr: parts[0] || 'Produit',
          buyPrice: Number(parts[1]) || 0,
          sellPrice: Number(parts[2]) || Number(parts[1]) || 0,
          stock: Number(parts[3]) || 0,
          barcode: parts[4] || '',
          category: parts[5] || 'Alimentation',
        });
      } else if (importType === 'customers') {
        // Expected format: Nom, Téléphone, Adresse, DetteInitiale, Remarque
        items.push({
          name: parts[0] || 'Client',
          phone: parts[1] || '',
          address: parts[2] || '',
          debt: Number(parts[3]) || 0,
          description: parts[4] || '',
        });
      } else if (importType === 'suppliers') {
        // Expected format: Nom, Société, Téléphone, Adresse, Catégorie, Dette
        items.push({
          name: parts[0] || 'Fournisseur',
          company: parts[1] || parts[0] || '',
          phone: parts[2] || '',
          address: parts[3] || '',
          category: parts[4] || 'Général',
          debt: Number(parts[5]) || 0,
        });
      } else if (importType === 'quickKeys') {
        // Expected format: Nom, Prix, Catégorie
        items.push({
          nameFr: parts[0] || 'Bouton',
          price: Number(parts[1]) || 0,
          category: parts[2] || 'Services',
          icon: 'flash',
          color: '#3b82f6',
        });
      }
    }

    if (items.length === 0) {
      alertMsg(isRTL ? 'لم يتم العثور على أسطر صالحة' : 'Aucune ligne valide trouvée.');
      return;
    }

    setParsedPreview(items);
  };

  const handleConfirmImport = async () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    setIsImporting(true);
    try {
      const res = await bulkImportData({ type: importType, items: parsedPreview });
      alertMsg(
        isRTL
          ? `✅ تم استيراد ${res.count} عنصر بنجاح دون الحاجة لكتابة أي كود!`
          : `✅ ${res.count} éléments importés avec succès sans toucher au code !`
      );
      setParsedPreview(null);
      setCsvText('');
    } catch (e) {
      alertMsg('Erreur: ' + e.message);
    } finally {
      setIsImporting(false);
    }
  };

  const quickItems = customPresets.quickSaleItems || [];
  const expenseCats = customPresets.customExpenseCategories || [];
  const repairDevices = customPresets.customRepairDevices || [];
  const repairIssues = customPresets.customRepairIssues || [];
  const paymentMethods = customPresets.customPaymentMethods || [];

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
          <Text style={styles.headerTitle}>
            {t('customizationCenter') || 'Centre Sans-Code & Personnalisation'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('customizationDesc') || 'Ajoutez des boutons, catégories, modes de paiement et options sans toucher au code !'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Sub Tabs */}
      <View style={styles.subTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsScroll}>
          <TouchableOpacity
            style={[styles.subTab, activeTab === 'quickKeys' && styles.subTabActive]}
            onPress={() => setActiveTab('quickKeys')}
          >
            <Ionicons name="flash-outline" size={17} color={activeTab === 'quickKeys' ? '#ffffff' : theme.colors.textMuted} />
            <Text style={[styles.subTabText, activeTab === 'quickKeys' && styles.subTabTextActive]}>
              {t('quickSaleKeys') || 'Boutons Rapides'} ({quickItems.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeTab === 'expenses' && styles.subTabActive]}
            onPress={() => setActiveTab('expenses')}
          >
            <Ionicons name="wallet-outline" size={17} color={activeTab === 'expenses' ? '#ffffff' : theme.colors.textMuted} />
            <Text style={[styles.subTabText, activeTab === 'expenses' && styles.subTabTextActive]}>
              {t('customExpenseCategories') || 'Catégories Dépenses'} ({expenseCats.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeTab === 'repairs' && styles.subTabActive]}
            onPress={() => setActiveTab('repairs')}
          >
            <Ionicons name="construct-outline" size={17} color={activeTab === 'repairs' ? '#ffffff' : theme.colors.textMuted} />
            <Text style={[styles.subTabText, activeTab === 'repairs' && styles.subTabTextActive]}>
              {t('repairPresets') || 'Modèles SAV'} ({repairDevices.length + repairIssues.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeTab === 'payments' && styles.subTabActive]}
            onPress={() => setActiveTab('payments')}
          >
            <Ionicons name="card-outline" size={17} color={activeTab === 'payments' ? '#ffffff' : theme.colors.textMuted} />
            <Text style={[styles.subTabText, activeTab === 'payments' && styles.subTabTextActive]}>
              {t('customPaymentMethods') || 'Modes Paiement'} ({paymentMethods.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeTab === 'importer' && styles.subTabActive]}
            onPress={() => setActiveTab('importer')}
          >
            <Ionicons name="cloud-upload-outline" size={17} color={activeTab === 'importer' ? '#ffffff' : theme.colors.textMuted} />
            <Text style={[styles.subTabText, activeTab === 'importer' && styles.subTabTextActive]}>
              {t('noCodeImporter') || 'Importateur Sans-Code'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* ================= TAB 1: QUICK KEYS ================= */}
        {activeTab === 'quickKeys' && (
          <View>
            <View style={[styles.sectionRow, isRTL && styles.rowReverse]}>
              <View>
                <Text style={styles.sectionHeading}>{t('quickSaleKeys') || 'Boutons Vente Rapide POS'}</Text>
                <Text style={styles.sectionSubtitle}>
                  {isRTL
                    ? 'أزرار سريعة تظهر مباشرة في الكاسة لإضافة خدمات أو مواد فورية بنقرة واحدة'
                    : 'Apparaissent directement dans l\'écran Caisse pour ajouter des articles en 1 clic'}
                </Text>
              </View>
              <TouchableOpacity style={styles.primaryAddBtn} onPress={openAddQuickKeyModal}>
                <Ionicons name="add-circle" size={18} color="#ffffff" />
                <Text style={styles.primaryAddBtnText}>{t('addQuickKey') || 'Nouveau Bouton'}</Text>
              </TouchableOpacity>
            </View>

            {quickItems.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="flash-off-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyCardText}>
                  {isRTL ? 'لم تقم بإضافة أي زر سريع بعد' : 'Aucun bouton rapide configuré.'}
                </Text>
              </View>
            ) : (
              <View style={styles.quickGrid}>
                {quickItems.map((item) => (
                  <View key={item.id} style={[styles.quickCard, { borderLeftColor: item.color || '#3b82f6' }]}>
                    <View style={[styles.quickCardHeader, isRTL && styles.rowReverse]}>
                      <View style={[styles.iconCircle, { backgroundColor: (item.color || '#3b82f6') + '20' }]}>
                        <Ionicons name={item.icon || 'flash'} size={20} color={item.color || '#3b82f6'} />
                      </View>
                      <View style={styles.quickCardActions}>
                        <TouchableOpacity style={styles.smallActionBtn} onPress={() => openEditQuickKeyModal(item)}>
                          <Ionicons name="pencil" size={15} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.smallActionBtn} onPress={() => handleDeleteQuickKey(item)}>
                          <Ionicons name="trash" size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.quickCardName}>{item.nameFr}</Text>
                    {item.nameAr ? <Text style={styles.quickCardNameAr}>{item.nameAr}</Text> : null}
                    <View style={[styles.quickCardFooter, isRTL && styles.rowReverse]}>
                      <Text style={[styles.quickCardPrice, { color: item.color || '#3b82f6' }]}>
                        {formatMoney(item.price)}
                      </Text>
                      <Text style={styles.quickCardCat}>{item.category || 'Services'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 2: EXPENSES CATEGORIES ================= */}
        {activeTab === 'expenses' && (
          <View>
            <Text style={styles.sectionHeading}>{t('customExpenseCategories') || 'Catégories de Dépenses Personnalisées'}</Text>
            <Text style={styles.sectionSubtitle}>
              {isRTL
                ? 'أضف أصناف جديدة لتصنيف مصاريف المحل (إيجار، كهرباء، عمال، فواتير...)'
                : 'Personnalisez vos types de charges (Loyer, Sonelgaz, Salaires, Maintenance...)'}
            </Text>

            {/* Add Input Bar */}
            <View style={[styles.inputAddRow, isRTL && styles.rowReverse]}>
              <TextInput
                style={[styles.inputField, { flex: 1 }]}
                placeholder={isRTL ? 'اسم الصنف الجديد...' : 'Nouvelle catégorie (ex: Facture Eau, Taxe...)'}
                value={newExpenseCatInput}
                onChangeText={setNewExpenseCatInput}
              />
              <TouchableOpacity style={styles.primaryAddBtn} onPress={handleAddExpenseCategory}>
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.primaryAddBtnText}>{t('addCategory') || 'Ajouter'}</Text>
              </TouchableOpacity>
            </View>

            {/* Chips List */}
            <View style={styles.chipsWrap}>
              {expenseCats.map((cat, idx) => (
                <View key={idx} style={styles.chipItem}>
                  <Ionicons name="wallet-outline" size={15} color="#10b981" />
                  <Text style={styles.chipText}>{cat}</Text>
                  <TouchableOpacity
                    onPress={() => deleteCustomExpenseCategory(cat)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ================= TAB 3: REPAIR PRESETS ================= */}
        {activeTab === 'repairs' && (
          <View>
            <Text style={styles.sectionHeading}>{t('repairPresets') || 'Modèles d\'Appareils & Pannes SAV'}</Text>
            <Text style={styles.sectionSubtitle}>
              {isRTL
                ? 'قوالب سريعة تظهر للفني عند تسجيل وصل صيانة دون الحاجة لكتابة النص يدوياً'
                : 'Modèles et pannes fréquentes en 1 clic pour accélérer la réception en atelier'}
            </Text>

            {/* Devices Section */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.subHeading}>{t('addDevicePreset') || 'Modèles d\'Appareils Récurrents'}</Text>
              <View style={[styles.inputAddRow, isRTL && styles.rowReverse]}>
                <TextInput
                  style={[styles.inputField, { flex: 1 }]}
                  placeholder={isRTL ? 'نوع أو ماركة جهاز جديدة...' : 'ex: Condor, Geant HD, PS5, iPad...'}
                  value={newDeviceInput}
                  onChangeText={setNewDeviceInput}
                />
                <TouchableOpacity style={styles.primaryAddBtn} onPress={handleAddDevicePreset}>
                  <Ionicons name="add" size={20} color="#ffffff" />
                  <Text style={styles.primaryAddBtnText}>{t('add') || 'Ajouter'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsWrap}>
                {repairDevices.map((dev, idx) => (
                  <View key={idx} style={[styles.chipItem, { borderColor: '#8b5cf6' }]}>
                    <Ionicons name="phone-portrait-outline" size={14} color="#8b5cf6" />
                    <Text style={styles.chipText}>{dev}</Text>
                    <TouchableOpacity onPress={() => deleteCustomRepairDevice(dev)}>
                      <Ionicons name="close-circle" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Issues Section */}
            <View style={{ marginTop: 24 }}>
              <Text style={styles.subHeading}>{t('addIssuePreset') || 'Pannes & Diagnostics Fréquents'}</Text>
              <View style={[styles.inputAddRow, isRTL && styles.rowReverse]}>
                <TextInput
                  style={[styles.inputField, { flex: 1 }]}
                  placeholder={isRTL ? 'عطل جديد (مثال: الشحن بطيء، الشاشة زرقاء...)' : 'ex: Problème Micro, Charge lente, Court-circuit...'}
                  value={newIssueInput}
                  onChangeText={setNewIssueInput}
                />
                <TouchableOpacity style={styles.primaryAddBtn} onPress={handleAddIssuePreset}>
                  <Ionicons name="add" size={20} color="#ffffff" />
                  <Text style={styles.primaryAddBtnText}>{t('add') || 'Ajouter'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsWrap}>
                {repairIssues.map((iss, idx) => (
                  <View key={idx} style={[styles.chipItem, { borderColor: '#f59e0b' }]}>
                    <Ionicons name="construct-outline" size={14} color="#f59e0b" />
                    <Text style={styles.chipText}>{iss}</Text>
                    <TouchableOpacity onPress={() => deleteCustomRepairIssue(iss)}>
                      <Ionicons name="close-circle" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ================= TAB 4: PAYMENT METHODS ================= */}
        {activeTab === 'payments' && (
          <View>
            <View style={[styles.sectionRow, isRTL && styles.rowReverse]}>
              <View>
                <Text style={styles.sectionHeading}>{t('customPaymentMethods') || 'Modes de Paiement'}</Text>
                <Text style={styles.sectionSubtitle}>
                  {isRTL
                    ? 'فعل أو عطل أو أضف وسائل دفع جديدة (بريدي موب، CCP، بطاقات بنكية، وصولات...)'
                    : 'Activez ou ajoutez des modes de paiement personnalisés pour la caisse'}
                </Text>
              </View>
              <TouchableOpacity style={styles.primaryAddBtn} onPress={() => setPaymentModalVisible(true)}>
                <Ionicons name="add-circle" size={18} color="#ffffff" />
                <Text style={styles.primaryAddBtnText}>{t('addPaymentMethod') || 'Nouveau Mode'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 14 }}>
              {paymentMethods.map((pm) => (
                <View key={pm.id} style={[styles.paymentMethodRow, isRTL && styles.rowReverse]}>
                  <View style={[styles.paymentMethodLeft, isRTL && styles.rowReverse]}>
                    <View style={styles.pmIconBox}>
                      <Ionicons name={pm.icon || 'card-outline'} size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.pmTitle}>{pm.labelFr}</Text>
                      {pm.labelAr ? <Text style={styles.pmSubtitle}>{pm.labelAr}</Text> : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleBtn, pm.active ? styles.toggleBtnActive : styles.toggleBtnInactive]}
                    onPress={() => togglePaymentMethod(pm.id)}
                  >
                    <Text style={[styles.toggleBtnText, pm.active && { color: '#ffffff' }]}>
                      {pm.active ? (isRTL ? 'مفعل' : 'Actif') : (isRTL ? 'معطل' : 'Inactif')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ================= TAB 5: NO-CODE DATA IMPORTER ================= */}
        {activeTab === 'importer' && (
          <View>
            <Text style={styles.sectionHeading}>{t('noCodeImporter') || 'Importateur de Données Express Sans-Code'}</Text>
            <Text style={styles.sectionSubtitle}>
              {isRTL
                ? 'استورد مئات المنتجات أو الزبائن أو الموردين دفعة واحدة عبر لصق نص CSV أو جدول إكسل'
                : 'Importez en masse des produits, clients ou fournisseurs par simple copier-coller de CSV ou Excel'}
            </Text>

            {/* Type Selector */}
            <View style={[styles.typeSelectRow, isRTL && styles.rowReverse]}>
              {[
                { key: 'products', label: t('products') || 'Produits' },
                { key: 'customers', label: t('customers') || 'Clients' },
                { key: 'suppliers', label: t('suppliers') || 'Fournisseurs' },
                { key: 'quickKeys', label: t('quickSaleKeys') || 'Boutons Rapides' },
              ].map((tp) => (
                <TouchableOpacity
                  key={tp.key}
                  style={[styles.typePill, importType === tp.key && styles.typePillActive]}
                  onPress={() => {
                    setImportType(tp.key);
                    setParsedPreview(null);
                  }}
                >
                  <Text style={[styles.typePillText, importType === tp.key && styles.typePillTextActive]}>
                    {tp.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Format Instructions Box */}
            <View style={styles.formatBox}>
              <View style={[styles.formatHeader, isRTL && styles.rowReverse]}>
                <Ionicons name="information-circle" size={18} color="#3b82f6" />
                <Text style={styles.formatTitle}>
                  {isRTL ? 'صيغة الأعمدة المطلوبة:' : 'Format des colonnes attendues :'}
                </Text>
              </View>
              <Text style={styles.formatCode}>
                {importType === 'products' && 'Nom, PrixAchat, PrixVente, Stock, CodeBarre, Catégorie\nExemple: Ecouteur Bluetooth, 800, 1500, 20, 6130001, Accessoires'}
                {importType === 'customers' && 'Nom, Téléphone, Adresse, DetteInitiale, Notes\nExemple: Karim Belhadj, 0550112233, Alger, 2500, Client fidèle'}
                {importType === 'suppliers' && 'Nom, Société, Téléphone, Adresse, Catégorie, DetteInitiale\nExemple: Sarl Electro, Belfort Tech, 0555123456, Alger, Pièces, 0'}
                {importType === 'quickKeys' && 'Nom, Prix, Catégorie\nExemple: Recharge 1000 DA, 1000, Services'}
              </Text>
            </View>

            {/* Textarea */}
            <TextInput
              style={styles.csvTextArea}
              placeholder={isRTL ? 'الصق أسطر CSV أو بيانات إكسل هنا...' : 'Collez vos lignes CSV ici...'}
              multiline
              numberOfLines={8}
              value={csvText}
              onChangeText={setCsvText}
            />

            {/* Action Bar */}
            <View style={[styles.importActionRow, isRTL && styles.rowReverse]}>
              <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyzeCSV}>
                <Ionicons name="search" size={17} color="#ffffff" />
                <Text style={styles.analyzeBtnText}>
                  {isRTL ? 'تحليل ومعاينة البيانات' : 'Analyser & Prévisualiser'}
                </Text>
              </TouchableOpacity>
              {csvText ? (
                <TouchableOpacity style={styles.clearBtn} onPress={() => { setCsvText(''); setParsedPreview(null); }}>
                  <Text style={styles.clearBtnText}>{t('cancel') || 'Effacer'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Parsed Preview Table */}
            {parsedPreview && (
              <View style={styles.previewBox}>
                <View style={[styles.previewHeader, isRTL && styles.rowReverse]}>
                  <Text style={styles.previewCount}>
                    {isRTL
                      ? `تم تحليل ${parsedPreview.length} عنصر جاهز للاستيراد:`
                      : `Aperçu de ${parsedPreview.length} éléments prêts à être importés :`}
                  </Text>
                  <TouchableOpacity
                    style={styles.confirmImportBtn}
                    onPress={handleConfirmImport}
                    disabled={isImporting}
                  >
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                    <Text style={styles.confirmImportBtnText}>
                      {isImporting ? '...' : (t('importNow') || 'Importer Maintenant')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {parsedPreview.slice(0, 5).map((row, idx) => (
                  <View key={idx} style={[styles.previewRow, isRTL && styles.rowReverse]}>
                    <Text style={styles.previewNum}>#{idx + 1}</Text>
                    <Text style={styles.previewName}>{row.nameFr || row.name || row.company}</Text>
                    <Text style={styles.previewPrice}>
                      {row.sellPrice ? formatMoney(row.sellPrice) : row.phone || row.category || ''}
                    </Text>
                  </View>
                ))}
                {parsedPreview.length > 5 ? (
                  <Text style={styles.previewMore}>
                    + {parsedPreview.length - 5} {isRTL ? 'عناصر أخرى...' : 'autres éléments...'}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* QUICK KEY MODAL */}
      <Modal visible={quickKeyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {editingQuickKey
                  ? (isRTL ? 'تعديل الزر السريع' : 'Modifier le Bouton Rapide')
                  : (isRTL ? 'إضافة زر بيع سريع' : 'Nouveau Bouton Rapide')}
              </Text>
              <TouchableOpacity onPress={() => setQuickKeyModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 450 }}>
              <Text style={styles.fieldLabel}>{t('quickItemName') || 'Nom du Bouton (Français)'} *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ex: Recharge 1000 DA, Changement Écran..."
                value={qkNameFr}
                onChangeText={setQkNameFr}
              />

              <Text style={styles.fieldLabel}>Nom en Arabe (Optionnel)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="مثال: تعبئة رصيد 1000 دج..."
                value={qkNameAr}
                onChangeText={setQkNameAr}
              />

              <Text style={styles.fieldLabel}>{t('quickItemPrice') || 'Prix Direct'} ({currency}) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ex: 1000"
                keyboardType="numeric"
                value={qkPrice}
                onChangeText={setQkPrice}
              />

              <Text style={styles.fieldLabel}>{t('category') || 'Catégorie'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Services, Accessoires, Divers..."
                value={qkCategory}
                onChangeText={setQkCategory}
              />

              {/* Icon Picker */}
              <Text style={styles.fieldLabel}>{t('quickItemIcon') || 'Icône'}</Text>
              <View style={styles.iconPickerRow}>
                {ICON_OPTIONS.map((ico) => (
                  <TouchableOpacity
                    key={ico}
                    style={[styles.iconPickBox, qkIcon === ico && styles.iconPickBoxSelected]}
                    onPress={() => setQkIcon(ico)}
                  >
                    <Ionicons name={ico} size={18} color={qkIcon === ico ? '#3b82f6' : '#64748b'} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color Picker */}
              <Text style={styles.fieldLabel}>{t('quickItemColor') || 'Couleur'}</Text>
              <View style={styles.colorPickerRow}>
                {COLOR_OPTIONS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorCircle, { backgroundColor: c }, qkColor === c && styles.colorCircleSelected]}
                    onPress={() => setQkColor(c)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setQuickKeyModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveQuickKey}
              >
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PAYMENT METHOD MODAL */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {isRTL ? 'إضافة وسيلة دفع مخصصة' : 'Nouveau Mode de Paiement'}
              </Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Libellé en Français *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="ex: BaridiMob, CCP, Chèque..."
              value={pmLabelFr}
              onChangeText={setPmLabelFr}
            />

            <Text style={styles.fieldLabel}>Libellé en Arabe (Optionnel)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="مثال: بريدي موب، شيك..."
              value={pmLabelAr}
              onChangeText={setPmLabelAr}
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
                onPress={handleSavePaymentMethod}
              >
                <Text style={styles.saveBtnText}>{t('save')}</Text>
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
  backBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 10,
  },
  subTabsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subTabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  subTabActive: {
    backgroundColor: theme.colors.primary,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginLeft: 6,
  },
  subTabTextActive: {
    color: '#ffffff',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 320,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
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
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
  },
  emptyCardText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  quickCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardActions: {
    flexDirection: 'row',
  },
  smallActionBtn: {
    padding: 4,
    marginLeft: 4,
  },
  quickCardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  quickCardNameAr: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  quickCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickCardPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickCardCat: {
    fontSize: 11,
    color: '#94a3b8',
  },
  inputAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  inputField: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginRight: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 13,
    color: '#334155',
    marginHorizontal: 6,
    fontWeight: '500',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pmIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pmTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  pmSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  toggleBtnActive: {
    backgroundColor: '#10b981',
  },
  toggleBtnInactive: {
    backgroundColor: '#cbd5e1',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  typeSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 12,
  },
  typePill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 6,
  },
  typePillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  typePillTextActive: {
    color: '#ffffff',
  },
  formatBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 12,
  },
  formatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  formatTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e40af',
    marginLeft: 6,
  },
  formatCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#1e3a8a',
    backgroundColor: '#dbeafe',
    padding: 8,
    borderRadius: 6,
  },
  csvTextArea: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  importActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  analyzeBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  clearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginLeft: 8,
  },
  clearBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  previewBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewCount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  confirmImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  confirmImportBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  previewNum: {
    fontSize: 12,
    color: '#94a3b8',
    width: 30,
  },
  previewName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  previewPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  previewMore: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
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
  iconPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  iconPickBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 6,
  },
  iconPickBoxSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  colorPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 6,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#0f172a',
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
});
