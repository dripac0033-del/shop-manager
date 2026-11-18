import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_FIREBASE_CONFIG } from '../services/firebase';
import {
  exportMasterProjectExcel,
  exportProductsToExcel,
  exportSalesToExcel,
} from '../services/excelExport';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const {
    language,
    setLanguage,
    currency,
    setCurrency,
    storeInfo,
    setStoreInfo,
    wipeAllData,
    products = [],
    sales = [],
    customers = [],
    expenses = [],
    services = [],
    repairs = [],
    iptvCodes = [],
    suppliers = [],
    t,
    isRTL,
    // Authentication & Users
    currentUser,
    users = [],
    addUser,
    deleteUser,
    logout,
    sessionTimeoutMinutes,
    updateSessionTimeout,
    // Settings PIN Protection
    settingsPin,
    isPinRequired,
    isSettingsUnlocked,
    unlockSettingsWithPin,
    setSettingsPinCode,
    disableSettingsPinCode,
    lockSettings,
    // Storage Diagnostics
    getStorageDiagnostics,
    // Storage Routing & Custom Locations
    storageRouting = {},
    updateStorageRouting,
    exportMasterBackupJSON,
    importMasterBackupJSON,
    // Firebase
    firebaseConfig,
    firebaseConnected,
    firebaseError,
    firebaseErrorDetails,
    isSyncing,
    lastSyncTime,
    applyFirebaseConfig,
    uploadStockToCloud,
    downloadStockFromCloud,
    uploadAllDataToCloud,
    downloadAllDataFromCloud,
    testCloudHealth,
    refreshAllFromFirebase,
    // Cloudflare D1
    cloudflareConfig,
    cloudflareConnected,
    cloudflareError,
    cloudflareLastSync,
    cloudflareLatency,
    applyCloudflareConfig,
    uploadAllDataToCloudflare,
    downloadAllDataFromCloudflare,
    initCloudflareD1Tables,
    testCloudflareHealth,
    refreshAllFromCloudflare,
    // Multi-Databases
    databasesList = [],
    activeDatabaseId = 'default',
    addDatabaseConfig,
    updateDatabaseConfig,
    deleteDatabaseConfig,
    switchDatabase,
    testDatabase,
    // Real-Time Auto Sync
    syncMetrics,
    runAutoSync,
    // IPTV Supplier & Headless Automated Purchasing
    iptvSupplierConfig,
    saveIptvSupplierConfig,
    openSupplierSession,
  } = useApp();

  const [name, setName] = useState(storeInfo?.name || '');
  const [phone, setPhone] = useState(storeInfo?.phone || '');
  const [address, setAddress] = useState(storeInfo?.address || '');
  const [footer, setFooter] = useState(storeInfo?.footer || '');
  const [toastMessage, setToastMessage] = useState('');

  // Firebase form fields
  const [apiKey, setApiKey] = useState(firebaseConfig?.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey);
  const [projectId, setProjectId] = useState(firebaseConfig?.projectId || DEFAULT_FIREBASE_CONFIG.projectId);
  const [appId, setAppId] = useState(firebaseConfig?.appId || DEFAULT_FIREBASE_CONFIG.appId);
  const [authDomain, setAuthDomain] = useState(firebaseConfig?.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain);
  const [testingHealth, setTestingHealth] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Cloudflare D1 form fields
  const [cfAccountId, setCfAccountId] = useState(cloudflareConfig?.accountId || '');
  const [cfDatabaseId, setCfDatabaseId] = useState(cloudflareConfig?.databaseId || '');
  const [cfApiToken, setCfApiToken] = useState(cloudflareConfig?.apiToken || '');
  const [cfWorkerUrl, setCfWorkerUrl] = useState(cloudflareConfig?.workerUrl || '');
  const [testingCf, setTestingCf] = useState(false);
  const [cfSyncing, setCfSyncing] = useState(false);

  // Multi-Databases Form State
  const [addDbModalVisible, setAddDbModalVisible] = useState(false);
  const [editingDbId, setEditingDbId] = useState(null);
  const [dbFormName, setDbFormName] = useState('');
  const [dbFormType, setDbFormType] = useState('worker');
  const [dbFormWorkerUrl, setDbFormWorkerUrl] = useState('');
  const [dbFormAccountId, setDbFormAccountId] = useState('');
  const [dbFormDatabaseId, setDbFormDatabaseId] = useState('');
  const [dbFormApiToken, setDbFormApiToken] = useState('');
  const [testingDbId, setTestingDbId] = useState(null);
  const [autoSyncRunning, setAutoSyncRunning] = useState(false);

  // New User Form Modal (Dedicated 'users' collection)
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('cashier'); // 'admin' | 'cashier' | 'technician'

  // IPTV Supplier Form Fields in Settings
  const [settingSupUrl, setSettingSupUrl] = useState(iptvSupplierConfig?.url || '');
  const [settingSupUser, setSettingSupUser] = useState(iptvSupplierConfig?.username || '');
  const [settingSupPass, setSettingSupPass] = useState(iptvSupplierConfig?.password || '');
  const [settingSupServer, setSettingSupServer] = useState(iptvSupplierConfig?.defaultServerName || '');
  const [settingShowSupPass, setSettingShowSupPass] = useState(false);
  const [savingSettingSup, setSavingSettingSup] = useState(false);

  // PIN Unlock Gate State
  const [enteredPin, setEnteredPin] = useState('');
  const [pinUnlockError, setPinUnlockError] = useState('');
  const [showUnlockPin, setShowUnlockPin] = useState(false);

  // PIN Management Modal State
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [currentPinForm, setCurrentPinForm] = useState('');
  const [newPinForm, setNewPinForm] = useState('');
  const [confirmPinForm, setConfirmPinForm] = useState('');
  const [showPinModalText, setShowPinModalText] = useState(false);

  // Storage Diagnostics State
  const [diagnosticsData, setDiagnosticsData] = useState(() => (getStorageDiagnostics ? getStorageDiagnostics() : null));

  // Guide & Advice Modal State
  const [guideModalVisible, setGuideModalVisible] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState('stock'); // 'stock' | 'cash' | 'credit' | 'backup' | 'margin'

  const handleUnlockPin = () => {
    if (!enteredPin.trim()) return;
    const res = unlockSettingsWithPin(enteredPin.trim());
    if (res.success) {
      setPinUnlockError('');
      setEnteredPin('');
    } else {
      setPinUnlockError(res.message || (isRTL ? 'رمز PIN غير صحيح!' : 'Code PIN incorrect !'));
      setEnteredPin('');
    }
  };

  const handleOpenPinModal = () => {
    setCurrentPinForm('');
    setNewPinForm('');
    setConfirmPinForm('');
    setPinModalVisible(true);
  };

  const handleSavePin = async () => {
    if (!newPinForm.trim()) {
      Alert.alert(t('save'), isRTL ? 'يرجى إدخال رمز PIN الجديد!' : 'Veuillez saisir le nouveau code PIN !');
      return;
    }
    if (newPinForm.trim().length < 4) {
      Alert.alert(t('save'), isRTL ? 'يجب أن يتكون رمز PIN من 4 أرقام على الأقل!' : 'Le code PIN doit comporter au moins 4 chiffres !');
      return;
    }
    if (newPinForm.trim() !== confirmPinForm.trim()) {
      Alert.alert(t('save'), isRTL ? 'رمزا PIN غير متطابقين!' : 'Les deux codes PIN ne correspondent pas !');
      return;
    }

    try {
      await setSettingsPinCode(newPinForm.trim(), currentPinForm.trim());
      setPinModalVisible(false);
      setCurrentPinForm('');
      setNewPinForm('');
      setConfirmPinForm('');
      showToast(isRTL ? '✅ تم حفظ وتفعيل رمز PIN بنجاح' : '✅ Code PIN enregistré et activé avec succès');
    } catch (err) {
      Alert.alert('Erreur Code PIN', err.message);
    }
  };

  const handleDisablePin = async () => {
    const confirmPrompt = isRTL
      ? 'هل أنت متأكد من تعطيل حماية رمز PIN للإعدادات؟'
      : 'Voulez-vous vraiment désactiver la protection par code PIN ?';

    const performDisable = async (pinAttempt) => {
      try {
        await disableSettingsPinCode(pinAttempt);
        showToast(isRTL ? '✅ تم تعطيل رمز PIN' : '✅ Protection par PIN désactivée');
      } catch (err) {
        Alert.alert('Erreur', err.message);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmPrompt) : true;
      if (confirmed) {
        const pinAttempt = window.prompt ? window.prompt(isRTL ? 'أدخل رمز PIN الحالي للتأكيد:' : 'Entrez le code PIN actuel :') : '';
        if (pinAttempt !== null) performDisable(pinAttempt);
      }
    } else {
      Alert.alert(
        'Code PIN',
        confirmPrompt,
        [
          { text: t('cancel'), style: 'cancel' },
          { text: isRTL ? 'تعطيل' : 'Désactiver', style: 'destructive', onPress: () => performDisable('') },
        ]
      );
    }
  };

  const handleRefreshDiagnostics = () => {
    if (getStorageDiagnostics) {
      const diag = getStorageDiagnostics();
      setDiagnosticsData(diag);
      showToast(isRTL ? '✅ تم فحص وتشخيص الذاكرة' : '✅ Diagnostic de stockage actualisé');
    }
  };

  const handleImportBackup = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              await importMasterBackupJSON(event.target.result);
              if (getStorageDiagnostics) setDiagnosticsData(getStorageDiagnostics());
              showToast(isRTL ? '✅ تم استرجاع النسخة الاحتياطية بنجاح' : '✅ Sauvegarde restaurée avec succès');
              Alert.alert(
                isRTL ? 'استرجاع ناجح' : 'Restauration réussie',
                isRTL
                  ? 'تم استرجاع جميع بيانات المشروع والمخزن بنجاح!'
                  : 'Toutes les données du projet ont été restaurées avec succès !'
              );
            } catch (err) {
              Alert.alert('Erreur', err.message);
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    } else {
      Alert.alert(
        'Restauration',
        isRTL
          ? 'يرجى فتح التطبيق من المتصفح لاستيراد ملف النسخة الاحتياطية'
          : 'Veuillez utiliser la version Web pour importer un fichier de sauvegarde JSON.'
      );
    }
  };

  useEffect(() => {
    if (iptvSupplierConfig) {
      if (iptvSupplierConfig.url) setSettingSupUrl(iptvSupplierConfig.url);
      if (iptvSupplierConfig.username) setSettingSupUser(iptvSupplierConfig.username);
      if (iptvSupplierConfig.password) setSettingSupPass(iptvSupplierConfig.password);
      if (iptvSupplierConfig.defaultServerName) setSettingSupServer(iptvSupplierConfig.defaultServerName);
    }
  }, [iptvSupplierConfig]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    if (storeInfo) {
      if (storeInfo.name) setName(storeInfo.name);
      if (storeInfo.phone) setPhone(storeInfo.phone);
      if (storeInfo.address) setAddress(storeInfo.address);
      if (storeInfo.footer) setFooter(storeInfo.footer);
    }
  }, [storeInfo]);

  useEffect(() => {
    if (firebaseConfig) {
      if (firebaseConfig.apiKey) setApiKey(firebaseConfig.apiKey);
      if (firebaseConfig.projectId) setProjectId(firebaseConfig.projectId);
      if (firebaseConfig.appId) setAppId(firebaseConfig.appId);
      if (firebaseConfig.authDomain) setAuthDomain(firebaseConfig.authDomain);
    }
  }, [firebaseConfig]);

  useEffect(() => {
    if (cloudflareConfig) {
      if (cloudflareConfig.accountId) setCfAccountId(cloudflareConfig.accountId);
      if (cloudflareConfig.databaseId) setCfDatabaseId(cloudflareConfig.databaseId);
      if (cloudflareConfig.apiToken) setCfApiToken(cloudflareConfig.apiToken);
      if (cloudflareConfig.workerUrl) setCfWorkerUrl(cloudflareConfig.workerUrl);
    }
  }, [cloudflareConfig]);

  const handleSaveStoreInfo = async () => {
    await setStoreInfo({ name, phone, address, footer });
    showToast(isRTL ? '✅ تم حفظ معلومات المحل بنجاح' : '✅ Informations du magasin enregistrées');
  };

  const handleSaveFirebaseConfig = async () => {
    if (!apiKey.trim() || !projectId.trim()) {
      Alert.alert(
        t('firebaseConfig'),
        isRTL
          ? 'يرجى إدخال مفتاح API ومعرف المشروع (Project ID) على الأقل!'
          : 'Veuillez au minimum saisir la Clé API et le Project ID !'
      );
      return;
    }

    const conf = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      appId: appId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
    };

    const res = await applyFirebaseConfig(conf);
    if (res.success) {
      showToast(isRTL ? '✅ تم تفعيل الاتصال بـ Firebase' : '✅ Connexion Firebase établie');
    } else {
      Alert.alert(
        t('firebaseSync'),
        (isRTL ? 'خطأ في الاتصال: ' : 'Erreur de connexion : ') + (res.error || '')
      );
    }
  };

  const handlePushStock = async () => {
    try {
      const res = await uploadStockToCloud();
      showToast(
        isRTL
          ? `✅ تمت مزامنة ${res.count} منتج مع Firebase`
          : `✅ ${res.count} produits synchronisés sur Firebase`
      );
    } catch (err) {
      Alert.alert(t('pushToCloud'), err.message);
    }
  };

  const handlePullStock = async () => {
    try {
      const res = await downloadStockFromCloud();
      if (res.success) {
        showToast(
          isRTL
            ? `✅ تم استيراد ${res.count} منتج من Firebase`
            : `✅ ${res.count} produits récupérés depuis Firebase`
        );
      } else {
        Alert.alert(t('pullFromCloud'), res.message);
      }
    } catch (err) {
      Alert.alert(t('pullFromCloud'), err.message);
    }
  };

  const handleTestConnection = async () => {
    setTestingHealth(true);
    setTestResult(null);
    try {
      const res = await testCloudHealth();
      setTestResult(res);
      if (res.success) {
        showToast(isRTL ? '✅ الاتصال بسحابة فايربيس متصل ويعمل بشكل ممتاز!' : '✅ Connexion Firebase Firestore active et opérationnelle !');
        Alert.alert(
          isRTL ? 'اتصال ناجح' : 'Connexion Réussie',
          isRTL ? 'قاعدة بيانات Firestore متصلة وجاهزة للمزامنة!' : 'La base Firestore est active et prête pour la synchronisation !'
        );
      } else {
        Alert.alert(
          isRTL ? 'تنبيه الاتصال بالسحابة' : 'Diagnostic de connexion Firebase',
          res.error + (res.consoleUrl ? `\n\nLien de configuration :\n${res.consoleUrl}` : '')
        );
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message });
      Alert.alert('Erreur', err.message);
    } finally {
      setTestingHealth(false);
    }
  };

  const handlePushAllData = async () => {
    try {
      const res = await uploadAllDataToCloud();
      const countMsg = `✅ ${res.counts.products} produits, ${res.counts.customers} clients, ${res.counts.sales} ventes, ${res.counts.repairs} réparations synchronisés avec succès vers le Cloud !`;
      const countMsgAr = `✅ تمت مزامنة ${res.counts.products} منتج، ${res.counts.customers} زبون، ${res.counts.sales} مبيعات و ${res.counts.repairs} تصليحات مع السحابة بنجاح!`;
      showToast(isRTL ? countMsgAr : countMsg);
      Alert.alert(
        isRTL ? 'مزامنة ناجحة' : 'Synchronisation Réussie (Téléphone ➔ Cloud)',
        (isRTL ? countMsgAr : countMsg) + '\n\n' + (isRTL ? 'الآن يمكنك فتح الكمبيوتر وتحديث الصفحة وستظهر كل بياناتك فوراً!' : 'Vous pouvez maintenant ouvrir le PC, rafraîchir la page et toutes vos données s\'afficheront instantanément !')
      );
    } catch (err) {
      Alert.alert(
        isRTL ? 'خطأ في الرفع للسحابة' : 'Erreur d\'envoi vers le Cloud',
        err.message
      );
    }
  };

  const handlePullAllData = async () => {
    try {
      const res = await downloadAllDataFromCloud();
      const msg = `✅ ${res.count} éléments récupérés depuis le Cloud !`;
      const msgAr = `✅ تم استيراد ${res.count} عنصر من السحابة بنجاح!`;
      showToast(isRTL ? msgAr : msg);
      Alert.alert(
        isRTL ? 'استيراد ناجح' : 'Importation Réussie (Cloud ➔ PC)',
        isRTL ? msgAr : msg
      );
    } catch (err) {
      Alert.alert(
        isRTL ? 'خطأ في التحميل من السحابة' : 'Erreur de récupération depuis le Cloud',
        err.message
      );
    }
  };

  // Multi-Databases Handlers
  const handleOpenAddDatabase = () => {
    setEditingDbId(null);
    setDbFormName('Nouvelle Base D1');
    setDbFormType('worker');
    setDbFormWorkerUrl('');
    setDbFormAccountId('');
    setDbFormDatabaseId('');
    setDbFormApiToken('');
    setAddDbModalVisible(true);
  };

  const handleOpenEditDatabase = (db) => {
    setEditingDbId(db.id);
    setDbFormName(db.name || '');
    setDbFormType(db.type || 'worker');
    setDbFormWorkerUrl(db.workerUrl || '');
    setDbFormAccountId(db.accountId || '');
    setDbFormDatabaseId(db.databaseId || '');
    setDbFormApiToken(db.apiToken || '');
    setAddDbModalVisible(true);
  };

  const handleSaveDatabase = async () => {
    if (!dbFormName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour cette base.');
      return;
    }

    const payload = {
      name: dbFormName.trim(),
      type: dbFormType,
      workerUrl: dbFormWorkerUrl.trim(),
      accountId: dbFormAccountId.trim(),
      databaseId: dbFormDatabaseId.trim(),
      apiToken: dbFormApiToken.trim(),
    };

    try {
      if (editingDbId) {
        await updateDatabaseConfig(editingDbId, payload);
        showToast(isRTL ? '✅ تم تحديث بيانات القاعدة بنجاح' : '✅ Base de données mise à jour !');
      } else {
        await addDatabaseConfig(payload);
        showToast(isRTL ? '✅ تم إضافة وحفظ القاعدة على فايربيس' : '✅ Base ajoutée & enregistrée sur Firebase !');
      }
      setAddDbModalVisible(false);
    } catch (err) {
      Alert.alert('Erreur', err.message);
    }
  };

  const handleDeleteDatabase = async (dbId) => {
    try {
      await deleteDatabaseConfig(dbId);
      showToast(isRTL ? '✅ تم حذف القاعدة' : '✅ Base supprimée');
    } catch (err) {
      Alert.alert('Erreur', err.message);
    }
  };

  const handleSwitchDatabase = async (dbId) => {
    setTestingCf(true);
    try {
      const res = await switchDatabase(dbId);
      if (res.success) {
        showToast(isRTL ? '✅ تم التبديل إلى القاعدة بنجاح' : '✅ Base de données activée et connectée !');
        Alert.alert(
          isRTL ? 'تم التبديل' : 'Base Active Modifiée',
          isRTL ? 'تم تفعيل القاعدة الجديدة وتحميل مخزونها ومبيعاتها بنجاح' : 'La nouvelle base est active et ses données ont été synchronisées !'
        );
      } else {
        Alert.alert('Attention', res.error || 'Impossible d\'activer cette base');
      }
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setTestingCf(false);
    }
  };

  const handleTestSpecificDatabase = async (db) => {
    setTestingDbId(db.id);
    try {
      const res = await testDatabase(db);
      if (res.success) {
        Alert.alert(
          isRTL ? 'الاتصال بالقاعدة ناجح' : 'Connexion Réussie !',
          `${db.name} : ${res.message}`
        );
      } else {
        Alert.alert(
          isRTL ? 'فشل الاتصال' : 'Échec de connexion',
          res.error || 'Impossible de joindre cette base'
        );
      }
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setTestingDbId(null);
    }
  };

  const handleTriggerAutoSync = async () => {
    setAutoSyncRunning(true);
    try {
      await runAutoSync();
      showToast(isRTL ? '✅ تمت المزامنة الثنائية بنجاح' : '✅ Synchronisation bidirectionnelle réussie !');
    } catch (err) {
      Alert.alert('Erreur Synchro', err.message);
    } finally {
      setAutoSyncRunning(false);
    }
  };

  const handleSaveSettingSupplierConfig = async () => {
    setSavingSettingSup(true);
    try {
      await saveIptvSupplierConfig({
        url: settingSupUrl.trim(),
        username: settingSupUser.trim(),
        password: settingSupPass.trim(),
        defaultServerName: settingSupServer.trim(),
      });
      showToast(
        isRTL
          ? '✅ تم حفظ بيانات مزود IPTV على فايربيس بنجاح'
          : '✅ Identifiants fournisseur IPTV enregistrés sur Firebase !'
      );
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSavingSettingSup(false);
    }
  };

  // Cloudflare D1 Handlers (Pure Direct REST API - No Worker required)
  const handleSaveCloudflareConfig = async () => {
    if (!cfAccountId.trim() || !cfDatabaseId.trim() || !cfApiToken.trim()) {
      Alert.alert(
        'Cloudflare D1 REST API',
        isRTL
          ? 'يرجى إدخال (Account ID + Database ID + API Token) لتفعيل قاعدة D1 مباشرة وبشكل دائم!'
          : 'Veuillez saisir votre Account ID, Database ID et API Token pour activer Cloudflare D1 en direct !'
      );
      return;
    }

    const conf = {
      accountId: cfAccountId.trim(),
      databaseId: cfDatabaseId.trim(),
      apiToken: cfApiToken.trim(),
      workerUrl: '',
    };

    const res = await applyCloudflareConfig(conf);
    showToast(isRTL ? '✅ تم تفعيل وتثبيت Cloudflare D1 بنجاح' : '✅ Cloudflare D1 activé en REST API direct !');
  };

  const handleTestCloudflare = async () => {
    setTestingCf(true);
    try {
      const res = await testCloudflareHealth();
      if (res.success) {
        showToast(isRTL ? '✅ الاتصال بـ Cloudflare D1 ناجح ومثالي!' : '✅ Connexion Cloudflare D1 réussie et active !');
        Alert.alert(
          isRTL ? 'اتصال ناجح' : 'Connexion Cloudflare Réussie',
          isRTL
            ? `قاعدة بيانات Cloudflare D1 متصلة بنجاح (${res.mode === 'worker' ? 'عبر Worker' : 'مباشرة عبر REST API'}).`
            : `La base D1 répond parfaitement (${res.mode === 'worker' ? 'via Cloudflare Worker' : 'via API REST directe'}).`
        );
      } else {
        Alert.alert(
          isRTL ? 'تنبيه الاتصال بـ Cloudflare' : 'Échec de connexion Cloudflare D1',
          res.error || 'Impossible de joindre Cloudflare D1'
        );
      }
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setTestingCf(false);
    }
  };

  const handleInitCloudflareTables = async () => {
    setTestingCf(true);
    try {
      const res = await initCloudflareD1Tables();
      if (res.success) {
        showToast(isRTL ? '✅ تم تهيئة وتحديث جداول SQL D1 بنجاح' : '✅ Tables SQL D1 initialisées avec succès');
        Alert.alert(
          isRTL ? 'جداول D1 جاهزة' : 'Tables D1 SQL Prêtes',
          isRTL
            ? 'تم إنشاء وتحديث الجداول: products, categories, customers, sales, transactions, services, repairs, expenses, store_info.'
            : 'Toutes les tables requises (produits, ventes, clients, dépenses, réparations, transactions...) sont créées sur Cloudflare D1.'
        );
      } else {
        Alert.alert('Erreur Tables D1', res.error || 'Erreur');
      }
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setTestingCf(false);
    }
  };

  const handlePushAllCloudflare = async () => {
    setCfSyncing(true);
    try {
      const res = await uploadAllDataToCloudflare();
      const countMsg = `✅ ${res.counts.products} produits, ${res.counts.customers} clients, ${res.counts.sales} ventes, ${res.counts.transactions} transactions synchronisés vers Cloudflare D1 !`;
      const countMsgAr = `✅ تمت مزامنة ${res.counts.products} منتج، ${res.counts.customers} زبون، ${res.counts.sales} مبيعات في Cloudflare D1 بنجاح!`;
      showToast(isRTL ? countMsgAr : countMsg);
      Alert.alert(
        isRTL ? 'مزامنة Cloudflare ناجحة' : 'Exportation Complète vers Cloudflare D1',
        isRTL ? countMsgAr : countMsg
      );
    } catch (err) {
      Alert.alert('Cloudflare Export', err.message);
    } finally {
      setCfSyncing(false);
    }
  };

  const handlePullAllCloudflare = async () => {
    setCfSyncing(true);
    try {
      const res = await downloadAllDataFromCloudflare();
      const msg = `✅ ${res.count} enregistrements importés depuis Cloudflare D1 !`;
      const msgAr = `✅ تم استيراد ${res.count} سجل من Cloudflare D1 بنجاح!`;
      showToast(isRTL ? msgAr : msg);
      Alert.alert(
        isRTL ? 'استيراد ناجح' : 'Importation Complète depuis Cloudflare D1',
        isRTL ? msgAr : msg
      );
    } catch (err) {
      Alert.alert('Cloudflare Import', err.message);
    } finally {
      setCfSyncing(false);
    }
  };

  // Direct Validation & Instant Window Closure for Users
  const handleAddUser = async () => {
    if (!newUserUsername.trim() || !newUserPassword.trim()) {
      Alert.alert(
        'Utilisateur',
        isRTL ? 'يرجى إدخال اسم المستخدم وكلمة المرور!' : 'Veuillez saisir un identifiant et un mot de passe !'
      );
      return;
    }

    const payload = {
      name: newUserName.trim() || newUserUsername.trim(),
      username: newUserUsername.trim().toLowerCase(),
      password: newUserPassword.trim(),
      role: newUserRole,
    };

    // CLOSE MODAL DIRECTLY
    setUserModalVisible(false);
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserRole('cashier');

    try {
      await addUser(payload);
      showToast(isRTL ? '✅ تم إنشاء المستخدم في جدول users' : '✅ Utilisateur enregistré dans la table users');
    } catch (err) {
      Alert.alert('Erreur', err.message);
    }
  };

  const handleDeleteUser = (u) => {
    if (u.id === currentUser?.id || u.username === currentUser?.username) {
      const msg = isRTL
        ? 'لا يمكنك حذف الحساب النشط الذي أنت متصل به حالياً!'
        : 'Vous ne pouvez pas supprimer le compte actuellement connecté !';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Attention', msg);
      return;
    }

    const confirmMsg = isRTL
      ? `هل أنت متأكد من حذف المستخدم "${u.username}" من جدول المستخدمين؟`
      : `Voulez-vous vraiment supprimer l'utilisateur "${u.username}" ?`;

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) {
        deleteUser(u.id);
        showToast(isRTL ? 'تم حذف المستخدم' : 'Utilisateur supprimé');
      }
      return;
    }

    Alert.alert('Supprimer', confirmMsg, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: isRTL ? 'حذف' : 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteUser(u.id);
          showToast(isRTL ? 'تم حذف المستخدم' : 'Utilisateur supprimé');
        },
      },
    ]);
  };

  const handleWipeAll = async () => {
    const confirmMsg = isRTL
      ? 'تحذير: هل أنت متأكد من مسح جميع المنتجات والزبائن والديون والمبيعات والمصاريف بالكامل؟'
      : 'ATTENTION : Voulez-vous vraiment effacer TOUTES les données ?';

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) {
        await wipeAllData();
        showToast(isRTL ? 'تم مسح جميع البيانات بنجاح' : 'Toutes les données ont été effacées');
      }
      return;
    }

    Alert.alert(isRTL ? 'مسح شامل' : 'Vider Tout', confirmMsg, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: isRTL ? 'مسح نهائي' : 'Effacer Tout',
        style: 'destructive',
        onPress: async () => {
          await wipeAllData();
          showToast(isRTL ? 'تم مسح جميع البيانات بنجاح' : 'Toutes les données ont été effacées');
        },
      },
    ]);
  };

  // PIN LOCK GATE FOR SETTINGS ACCESS
  if (isPinRequired && !isSettingsUnlocked) {
    return (
      <View style={styles.pinLockContainer}>
        <View style={styles.pinLockCard}>
          <View style={styles.pinLockIconBox}>
            <Ionicons name="lock-closed" size={44} color={theme.colors.primary} />
          </View>

          <Text style={styles.pinLockTitle}>
            {isRTL ? 'إعدادات محمية برمز PIN' : 'Paramètres Sécurisés'}
          </Text>

          <Text style={styles.pinLockSubtitle}>
            {isRTL
              ? 'يرجى إدخال رمز PIN المكون من 4 أرقام للوصول إلى لوحة الإعدادات.'
              : 'Veuillez saisir votre code PIN à 4 chiffres pour accéder aux paramètres du magasin.'}
          </Text>

          {pinUnlockError ? (
            <View style={styles.pinErrorBanner}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
              <Text style={styles.pinErrorText}>{pinUnlockError}</Text>
            </View>
          ) : null}

          <View style={styles.pinInputRow}>
            <TextInput
              style={styles.pinInputMain}
              value={enteredPin}
              onChangeText={(val) => {
                setEnteredPin(val);
                setPinUnlockError('');
                if (val.length === 4) {
                  const res = unlockSettingsWithPin(val);
                  if (!res.success) {
                    setPinUnlockError(res.message || (isRTL ? 'رمز PIN غير صحيح!' : 'Code PIN incorrect !'));
                    setEnteredPin('');
                  }
                }
              }}
              placeholder="••••"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              secureTextEntry={!showUnlockPin}
              maxLength={6}
              autoFocus={true}
              onSubmitEditing={handleUnlockPin}
            />
            <TouchableOpacity
              style={styles.pinEyeBtn}
              onPress={() => setShowUnlockPin(!showUnlockPin)}
            >
              <Ionicons
                name={showUnlockPin ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.pinSubmitBtn} onPress={handleUnlockPin}>
            <Ionicons name="key" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.pinSubmitBtnText}>
              {isRTL ? 'إلغاء القفل والمتابعة' : 'Déverrouiller l’accès'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pinBackBtn}
            onPress={() => {
              if (navigation && navigation.goBack) navigation.goBack();
            }}
          >
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={16} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.pinBackBtnText}>
              {isRTL ? 'رجوع إلى الشاشة السابقة' : 'Retour'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Toast Feedback */}
      {toastMessage ? (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Current User Session Banner */}
      {currentUser && (
        <View style={[styles.userSessionCard, isRTL && styles.rowReverse]}>
          <View style={[styles.userSessionInfo, isRTL && styles.alignRight]}>
            <View style={[styles.userBadgeRow, isRTL && styles.rowReverse]}>
              <Ionicons name="person-circle" size={24} color={theme.colors.primary} />
              <Text style={styles.sessionNameText}>{currentUser.name || currentUser.username}</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>
                  {currentUser.role === 'admin'
                    ? (isRTL ? 'مسؤول' : 'Admin')
                    : currentUser.role === 'technician'
                    ? (isRTL ? 'تقني' : 'Technicien')
                    : (isRTL ? 'صراف' : 'Caissier')}
                </Text>
              </View>
            </View>
            <Text style={styles.sessionSubText}>
              {isRTL ? 'المستخدم النشط:' : 'Connecté en tant que:'} @{currentUser.username}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => logout(false)}>
            <Ionicons name="log-out-outline" size={16} color={theme.colors.danger} />
            <Text style={styles.logoutBtnText}>{isRTL ? 'خروج' : 'Déconnexion'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 0. MODULES PRO & EXTENSIONS SANS-CODE */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse, { marginTop: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="cube-outline" size={20} color="#6366f1" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>{isRTL ? 'الوحدات المتقدمة والتخصيص' : 'Modules Avancés & Sans-Code'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.usersHelpText, isRTL && styles.textRight]}>
          {isRTL
            ? 'أضف خيارات، أزرار سريعة، موردين وطرق دفع مخصصة مباشرة دون الرجوع للبرمجة!'
            : 'Accédez aux nouveaux modules et personnalisez vos touches, fournisseurs et caisse sans toucher au code !'}
        </Text>

        <View style={{ marginTop: 10 }}>
          {/* Customization Center */}
          <TouchableOpacity
            style={[styles.moduleNavBtn, { borderLeftColor: '#6366f1' }]}
            onPress={() => navigation.navigate('Customization')}
          >
            <View style={[styles.moduleNavIcon, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="color-wand" size={20} color="#6366f1" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={styles.moduleNavTitle}>
                {t('customizationCenter') || 'Centre Sans-Code & Personnalisation'}
              </Text>
              <Text style={styles.moduleNavDesc}>
                Boutons rapides, catégories de dépenses, modèles SAV, importateur CSV
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#94a3b8" />
          </TouchableOpacity>

          {/* Suppliers & Purchases */}
          <TouchableOpacity
            style={[styles.moduleNavBtn, { borderLeftColor: '#f97316' }]}
            onPress={() => navigation.navigate('Suppliers')}
          >
            <View style={[styles.moduleNavIcon, { backgroundColor: '#ffedd5' }]}>
              <Ionicons name="business" size={20} color="#f97316" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={styles.moduleNavTitle}>
                {t('suppliers') || 'Fournisseurs & Commandes d\'Achat'}
              </Text>
              <Text style={styles.moduleNavDesc}>
                {(suppliers || []).length} fournisseurs • Suivi des dettes et bons d'entrée
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#94a3b8" />
          </TouchableOpacity>

          {/* Cash Drawer & Z-Report */}
          <TouchableOpacity
            style={[styles.moduleNavBtn, { borderLeftColor: '#10b981' }]}
            onPress={() => navigation.navigate('CashDrawer')}
          >
            <View style={[styles.moduleNavIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="wallet" size={20} color="#10b981" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={styles.moduleNavTitle}>
                {t('cashDrawer') || 'Gestion de Caisse & Clôture Z'}
              </Text>
              <Text style={styles.moduleNavDesc}>
                Fond de caisse, billetage, entrées/sorties et impression ticket Z
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#94a3b8" />
          </TouchableOpacity>

          {/* Barcode & Shelf Label Generator */}
          <TouchableOpacity
            style={[styles.moduleNavBtn, { borderLeftColor: '#0ea5e9' }]}
            onPress={() => navigation.navigate('BarcodeGenerator')}
          >
            <View style={[styles.moduleNavIcon, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="pricetag" size={20} color="#0ea5e9" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={styles.moduleNavTitle}>
                {t('barcodeGenerator') || 'Étiquettes Prix & Codes-Barres'}
              </Text>
              <Text style={styles.moduleNavDesc}>
                Générateur de codes-barres et impression d'étiquettes rayon
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. SETTINGS PIN CODE SECURITY */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>{t('pinSettingsTitle') || 'Sécurité & Code PIN Paramètres'}</Text>
        </View>
        <View
          style={[
            styles.pinStatusBadge,
            { backgroundColor: isPinRequired ? '#dcfce7' : '#f1f5f9' },
          ]}
        >
          <Text
            style={[
              styles.pinStatusBadgeText,
              { color: isPinRequired ? '#15803d' : '#64748b' },
            ]}
          >
            {isPinRequired
              ? (isRTL ? 'الحماية مفعّلة' : 'Protection Active')
              : (isRTL ? 'معطل' : 'Désactivé')}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.usersHelpText, isRTL && styles.textRight]}>
          {t('pinSettingsDesc') ||
            "Protégez l'accès aux paramètres, configurations sensibles et bases de données avec un code PIN à 4 chiffres."}
        </Text>

        <View style={[styles.pinActionBtnsRow, isRTL && styles.rowReverse]}>
          <TouchableOpacity style={styles.pinSetBtn} onPress={handleOpenPinModal}>
            <Ionicons name="key-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.pinSetBtnText}>
              {isPinRequired
                ? (isRTL ? 'تعديل رمز PIN' : 'Modifier le Code PIN')
                : (isRTL ? 'تفعيل رمز PIN جديد' : 'Définir un Code PIN')}
            </Text>
          </TouchableOpacity>

          {isPinRequired && (
            <TouchableOpacity style={styles.pinDisableBtn} onPress={handleDisablePin}>
              <Ionicons name="lock-open-outline" size={16} color={theme.colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.pinDisableBtnText}>
                {isRTL ? 'تعطيل الحماية' : 'Désactiver le PIN'}
              </Text>
            </TouchableOpacity>
          )}

          {isPinRequired && (
            <TouchableOpacity style={styles.pinLockNowBtn} onPress={lockSettings}>
              <Ionicons name="lock-closed-outline" size={16} color="#475569" style={{ marginRight: 6 }} />
              <Text style={styles.pinLockNowBtnText}>
                {isRTL ? 'قفل الآن' : 'Verrouiller'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. DATABASE STORAGE CAPACITY & SATURATION ANALYTICS */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="speedometer" size={20} color="#0284c7" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>{t('dbCapacityTitle') || 'Capacité & Saturation du Stockage'}</Text>
        </View>
        <TouchableOpacity style={styles.refreshDiagBtn} onPress={handleRefreshDiagnostics}>
          <Ionicons name="refresh" size={15} color="#0284c7" />
          <Text style={styles.refreshDiagBtnText}>{isRTL ? 'فحص' : 'Diagnostiquer'}</Text>
        </TouchableOpacity>
      </View>

      {diagnosticsData && (
        <View style={styles.card}>
          <View style={[styles.storageTopRow, isRTL && styles.rowReverse]}>
            <View>
              <Text style={[styles.statLabel, isRTL && styles.textRight]}>
                {t('dbStorageUsed') || 'Espace Mémoire Utilisé'} :
              </Text>
              <Text style={styles.storageUsageNum}>
                {diagnosticsData.sizeFormatted} <Text style={{ fontSize: 13, color: '#64748b' }}>/ {diagnosticsData.safeLimitFormatted} ({diagnosticsData.usagePercent}%)</Text>
              </Text>
            </View>

            <View
              style={[
                styles.storageHealthPill,
                diagnosticsData.status === 'healthy'
                  ? styles.storageHealthy
                  : diagnosticsData.status === 'moderate'
                  ? styles.storageModerate
                  : styles.storageCritical,
              ]}
            >
              <Text
                style={[
                  styles.storageHealthPillText,
                  diagnosticsData.status === 'healthy'
                    ? { color: '#15803d' }
                    : diagnosticsData.status === 'moderate'
                    ? { color: '#b45309' }
                    : { color: '#b91c1c' },
                ]}
              >
                {isRTL ? diagnosticsData.statusLabelAr : diagnosticsData.statusLabel}
              </Text>
            </View>
          </View>

          {/* Progress Bar Gauge */}
          <View style={styles.gaugeTrack}>
            <View
              style={[
                styles.gaugeFill,
                {
                  width: `${diagnosticsData.usagePercent}%`,
                  backgroundColor:
                    diagnosticsData.status === 'healthy'
                      ? '#10b981'
                      : diagnosticsData.status === 'moderate'
                      ? '#f59e0b'
                      : '#ef4444',
                },
              ]}
            />
          </View>

          <Text style={[styles.storageAdviceText, isRTL && styles.textRight]}>
            💡 {isRTL ? diagnosticsData.adviceAr : diagnosticsData.advice}
          </Text>

          {/* Detailed Records Breakdown */}
          <View style={styles.storageGrid}>
            <View style={styles.storageGridItem}>
              <Text style={styles.storageGridLabel}>{t('products')}</Text>
              <Text style={styles.storageGridVal}>{diagnosticsData.counts.products}</Text>
            </View>
            <View style={styles.storageGridItem}>
              <Text style={styles.storageGridLabel}>{isRTL ? 'المبيعات' : 'Ventes'}</Text>
              <Text style={styles.storageGridVal}>{diagnosticsData.counts.sales}</Text>
            </View>
            <View style={styles.storageGridItem}>
              <Text style={styles.storageGridLabel}>{t('customers')}</Text>
              <Text style={styles.storageGridVal}>{diagnosticsData.counts.customers}</Text>
            </View>
            <View style={styles.storageGridItem}>
              <Text style={styles.storageGridLabel}>{t('expenses')}</Text>
              <Text style={styles.storageGridVal}>{diagnosticsData.counts.expenses}</Text>
            </View>
            <View style={styles.storageGridItem}>
              <Text style={styles.storageGridLabel}>{t('repairs')}</Text>
              <Text style={styles.storageGridVal}>{diagnosticsData.counts.repairs}</Text>
            </View>
            <View style={styles.storageGridItem}>
              <Text style={styles.storageGridLabel}>IPTV</Text>
              <Text style={styles.storageGridVal}>{diagnosticsData.counts.iptvCodes}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 3. STORAGE LOCATIONS & ROUTING */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="folder-open" size={20} color="#7c3aed" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>{t('storageLocationsTitle') || 'Emplacements & Routage du Stockage'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.usersHelpText, isRTL && styles.textRight]}>
          {t('storageLocationsDesc') ||
            "Définissez et consultez l'emplacement de sauvegarde pour chaque module de votre projet (Local, Firebase, Cloudflare D1)."}
        </Text>

        {[
          { key: 'personalData', title: isRTL ? 'البيانات الشخصية والمستخدمين' : 'Comptes & Utilisateurs', loc: storageRouting.personalData || 'firebase', icon: 'person-circle-outline' },
          { key: 'products', title: isRTL ? 'المنتجات والمخزون' : 'Stock & Produits', loc: storageRouting.products || 'cloudflare', icon: 'cube-outline' },
          { key: 'sales', title: isRTL ? 'المبيعات والكاسة' : 'Ventes & Caisse', loc: storageRouting.sales || 'cloudflare', icon: 'cart-outline' },
          { key: 'customers', title: isRTL ? 'الزبائن والديون' : 'Clients & Dettes', loc: storageRouting.customers || 'local', icon: 'people-outline' },
          { key: 'iptv', title: isRTL ? 'سيرفرات IPTV' : 'IPTV & Abonnements', loc: storageRouting.iptv || 'cloudflare', icon: 'tv-outline' },
          { key: 'expenses', title: isRTL ? 'المصاريف والخدمات' : 'Dépenses & Frais', loc: storageRouting.expenses || 'local', icon: 'wallet-outline' },
        ].map((item) => (
          <View key={item.key} style={[styles.routingItemRow, isRTL && styles.rowReverse]}>
            <View style={[styles.routingItemLeft, isRTL && styles.rowReverse]}>
              <Ionicons name={item.icon} size={20} color="#475569" style={{ marginRight: 8 }} />
              <Text style={styles.routingItemTitle}>{item.title}</Text>
            </View>

            <View style={styles.routingPillRow}>
              {['local', 'cloudflare', 'firebase'].map((backend) => {
                const isActive = item.loc === backend;
                return (
                  <TouchableOpacity
                    key={backend}
                    style={[
                      styles.routingChoiceBtn,
                      isActive && styles.routingChoiceBtnActive,
                    ]}
                    onPress={() => updateStorageRouting({ [item.key]: backend })}
                  >
                    <Text
                      style={[
                        styles.routingChoiceText,
                        isActive && styles.routingChoiceTextActive,
                      ]}
                    >
                      {backend === 'local' ? (isRTL ? 'محلي' : 'Local') : backend === 'cloudflare' ? 'D1' : 'Firebase'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Custom JSON Backup Download & Import */}
        <View style={styles.backupActionsContainer}>
          <Text style={[styles.inputLabel, { marginTop: 10 }, isRTL && styles.textRight]}>
            {isRTL ? 'حفظ ونقل البيانات إلى ملف خارجي (قرص / فلاش ديسك):' : 'Sauvegarde Externe (Fichier JSON sur Disque ou Clé USB) :'}
          </Text>

          <View style={[styles.backupBtnRow, isRTL && styles.rowReverse]}>
            <TouchableOpacity style={styles.exportBackupBtn} onPress={exportMasterBackupJSON}>
              <Ionicons name="download-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.exportBackupBtnText}>
                {isRTL ? 'تصدير نسخة احتياطية (JSON)' : 'Exporter Sauvegarde Complète'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.importBackupBtn} onPress={handleImportBackup}>
              <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.importBackupBtnText}>
                {isRTL ? 'استيراد ملف خارجي' : 'Restaurer depuis Fichier'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 4. PROFESSIONAL EXCEL EXPORTS */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="document-text" size={20} color="#059669" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>{t('exportExcelMenu') || 'Exportations Excel Professionnelles'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.usersHelpText, isRTL && styles.textRight]}>
          {isRTL
            ? 'قم بتصدير جميع بيانات المخزون والمبيعات والحسابات المالية في جداول إكسل منسقة وجاهزة للطباعة والمحاسبة.'
            : 'Exportez toutes vos données de stock, ventes et finances dans des classeurs Excel structurés et formatés.'}
        </Text>

        <TouchableOpacity
          style={styles.masterExcelBtn}
          onPress={() =>
            exportMasterProjectExcel({
              products,
              sales,
              customers,
              expenses,
              repairs,
              iptvCodes,
              currency,
            })
          }
        >
          <Ionicons name="file-tray-full" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.masterExcelBtnTitle}>
              {t('exportAllExcelBtn') || 'Grand Export Excel Complet du Projet (All-in-One)'}
            </Text>
            <Text style={styles.masterExcelBtnSub}>
              {isRTL ? 'يشمل المخزون، المبيعات، الزبائن، الديون والمصاريف' : 'Comprend le stock, ventes, clients, dettes, réparations et dépenses'}
            </Text>
          </View>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color="#ffffff" />
        </TouchableOpacity>

        <View style={[styles.secondaryExcelRow, isRTL && styles.rowReverse]}>
          <TouchableOpacity
            style={styles.secondaryExcelBtn}
            onPress={() => exportProductsToExcel(products, currency)}
          >
            <Ionicons name="cube-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryExcelBtnText}>
              {isRTL ? 'إكسل المخزون' : 'Excel Produits'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryExcelBtn}
            onPress={() => exportSalesToExcel(sales, customers, currency)}
          >
            <Ionicons name="cart-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryExcelBtnText}>
              {isRTL ? 'إكسل المبيعات' : 'Excel Ventes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. STORE MANAGEMENT GUIDE & BEST PRACTICES */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="bulb" size={20} color="#d97706" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>{t('storeManagementGuide') || 'Guide & Conseils de Gestion Pro'}</Text>
        </View>
        <TouchableOpacity style={styles.viewGuideBtn} onPress={() => setGuideModalVisible(true)}>
          <Ionicons name="book-outline" size={15} color="#d97706" />
          <Text style={styles.viewGuideBtnText}>{isRTL ? 'فتح الدليل' : 'Consulter'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.guideTeaserCard, isRTL && styles.rowReverse]}
        onPress={() => setGuideModalVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.guideTeaserIcon}>
          <Ionicons name="school-outline" size={26} color="#d97706" />
        </View>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={[styles.guideTeaserTitle, isRTL && styles.textRight]}>
            {isRTL ? 'أفضل الممارسات لتنظيم وتسيير المحل والمخزون' : '5 Piliers Clés pour Réussir la Gestion du Magasin'}
          </Text>
          <Text style={[styles.guideTeaserSub, isRTL && styles.textRight]}>
            {isRTL
              ? 'إدارة المخزون، ضبط الكاسة اليومية، استرجاع ديون الزبائن، والنسخ الاحتياطي الدوري.'
              : 'Conseils pratiques : gestion de stock, clôture de caisse, recouvrement des crédits et sauvegardes 3-2-1.'}
          </Text>
        </View>
        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#d97706" />
      </TouchableOpacity>

      {/* DEDICATED USERS MANAGEMENT TABLE (Table 'users' Firestore) */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="people" size={20} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>{t('usersManagement')}</Text>
        </View>
        <TouchableOpacity style={styles.addUserHeaderBtn} onPress={() => setUserModalVisible(true)}>
          <Ionicons name="person-add" size={16} color="#ffffff" />
          <Text style={styles.addUserHeaderBtnText}>{t('createUser')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={[styles.usersHelpText, isRTL && styles.textRight]}>
          {isRTL
            ? 'كل مستخدم جديد يتم حفظه في جدول users الخاص في فايربيس وقاعدة البيانات المحلية.'
            : 'Chaque utilisateur est enregistré dans la table users dédiée sur Firebase et localement.'}
        </Text>

        {(users || []).map((u) => {
          const isMe = u.username === currentUser?.username;
          return (
            <View key={u.id} style={[styles.userItemRow, isRTL && styles.rowReverse]}>
              <View style={[styles.userItemLeft, isRTL && styles.rowReverse]}>
                <View
                  style={[
                    styles.userRoleDot,
                    u.role === 'admin'
                      ? styles.bgAdmin
                      : u.role === 'technician'
                      ? styles.bgTechnician
                      : styles.bgCashier,
                  ]}
                >
                  <Ionicons
                    name={
                      u.role === 'admin'
                        ? 'shield-checkmark'
                        : u.role === 'technician'
                        ? 'build'
                        : 'card-outline'
                    }
                    size={16}
                    color="#ffffff"
                  />
                </View>
                <View style={[styles.userItemDetails, isRTL && styles.alignRight]}>
                  <Text style={styles.userItemName}>
                    {u.name || u.username} {isMe ? (isRTL ? '(أنت)' : '(Vous)') : ''}
                  </Text>
                  <Text style={styles.userItemSub}>
                    @{u.username} • {u.role === 'admin' ? t('admin') : u.role === 'technician' ? t('technician') : t('cashier')}
                  </Text>
                </View>
              </View>

              {!isMe && (
                <TouchableOpacity style={styles.deleteUserBtn} onPress={() => handleDeleteUser(u)}>
                  <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* SESSION TIMEOUT CONFIGURATION */}
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
        {isRTL ? 'أمان الجلسة وتسجيل الخروج التلقائي' : 'Sécurité de Session & Déconnexion Auto'}
      </Text>
      <View style={styles.card}>
        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
          {isRTL ? 'مهلة عدم النشاط قبل تسجيل الخروج (بالدقائق):' : "Délai d'inactivité avant déconnexion automatique :"}
        </Text>
        <View style={[styles.timeoutSelectRow, isRTL && styles.rowReverse]}>
          {[15, 30, 60, 120].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.timeoutPill,
                sessionTimeoutMinutes === mins && styles.timeoutPillActive,
              ]}
              onPress={() => {
                updateSessionTimeout(mins);
                showToast(isRTL ? `تم تحديد المهلة: ${mins} دقيقة` : `Délai fixé à ${mins} minutes`);
              }}
            >
              <Text
                style={[
                  styles.timeoutPillText,
                  sessionTimeoutMinutes === mins && styles.timeoutPillTextActive,
                ]}
              >
                {mins} {isRTL ? 'دقيقة' : 'min'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Firebase Cloud Sync Card */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
        <Text style={styles.sectionTitle}>{t('firebaseSync')}</Text>
        <View
          style={[
            styles.statusPill,
            firebaseConnected ? styles.statusPillGreen : styles.statusPillGray,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: firebaseConnected ? theme.colors.success : theme.colors.danger },
            ]}
          />
          <Text
            style={[
              styles.statusPillText,
              { color: firebaseConnected ? theme.colors.success : theme.colors.danger },
            ]}
          >
            {firebaseConnected ? t('connected') : t('disconnected')}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        {/* Sync Status Banner */}
        {firebaseConnected ? (
          <View style={styles.cloudSuccessBox}>
            <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
            <Text style={[styles.cloudSuccessText, isRTL && styles.textRight]}>
              {isRTL
                ? '✅ المزامنة السحابية متصلة ونشطة ! البيانات مشتركة في الوقت الفعلي بين هاتفك وجهاز الكمبيوتر.'
                : '✅ Mégasynchronisation Cloud active ! Vos données sont partagées en direct entre ce téléphone et votre PC.'}
            </Text>
          </View>
        ) : (
          <View style={styles.cloudWarningBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="warning" size={24} color="#dc2626" />
              <Text style={[styles.cloudWarningTitle, { marginLeft: 8 }]}>
                {isRTL
                  ? '⚠️ سبب عدم ظهور البيانات على الكمبيوتر'
                  : '⚠️ Pourquoi vos données ne s\'affichent pas sur le PC ?'}
              </Text>
            </View>
            <Text style={[styles.cloudWarningDesc, isRTL && styles.textRight]}>
              {firebaseError === 'API_DISABLED'
                ? (isRTL
                    ? 'قاعدة بيانات Cloud Firestore غير مفعلة في حساب فايربيس الخاص بك. لهذا السبب، تظل المنتجات والزبائن محفوظة على هاتفك فقط دون أن تنتقل للكمبيوتر.'
                    : "La base Cloud Firestore n'est pas encore activée sur votre projet Firebase. Vos données restent donc sur la mémoire locale du téléphone et ne sont pas transmises au PC.")
                : (isRTL
                    ? 'السحابة غير متصلة حالياً. تأكد من إنشاء Firestore وصلاحيات الأمان.'
                    : "La connexion Cloud est inactive. Activez Firestore dans la console Firebase pour synchroniser vos deux appareils.")}
            </Text>

            <View style={styles.cloudStepsBox}>
              <Text style={styles.cloudStepTitle}>
                {isRTL ? 'خطوات التفعيل السريعة (3 خطوات) :' : 'Étapes d\'activation faciles (3 étapes) :'}
              </Text>
              <Text style={styles.cloudStepText}>
                {isRTL
                  ? '1. افتح الرابط في متصفحك: console.firebase.google.com/project/hadjali49-c42f4/firestore'
                  : '1. Ouvrez dans votre navigateur : console.firebase.google.com/project/' + (projectId || 'hadjali49-c42f4') + '/firestore'}
              </Text>
              <Text style={styles.cloudStepText}>
                {isRTL
                  ? '2. اضغط على « Créer une base de données » واختر « Mode test ».'
                  : '2. Cliquez sur « Créer une base de données » et activez en « Mode test ».'}
              </Text>
              <Text style={styles.cloudStepText}>
                {isRTL
                  ? '3. ارجع هنا واضغط « اختبار الاتصال » ثم « رفع كل البيانات إلى السحابة ».'
                  : '3. Revenez ici, cliquez sur « Tester la connexion », puis sur « Envoyer TOUT vers le Cloud ».'}
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Firebase API Key *</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="AIzaSy..."
          autoCapitalize="none"
        />

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Firebase Project ID *</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={projectId}
          onChangeText={setProjectId}
          placeholder="hadjali49-c42f4"
          autoCapitalize="none"
        />

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Firebase App ID</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={appId}
          onChangeText={setAppId}
          placeholder="1:505538712523:android:..."
          autoCapitalize="none"
        />

        {/* Buttons Row: Test Connection & Save Config */}
        <View style={[styles.testBtnRow, isRTL && styles.rowReverse]}>
          <TouchableOpacity
            style={[styles.testBtn, { flex: 1.3, marginRight: 8 }]}
            onPress={handleTestConnection}
            disabled={testingHealth}
          >
            {testingHealth ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="pulse" size={18} color="#ffffff" />
                <Text style={styles.testBtnText}>{t('testFirebaseConnection')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.saveConfBtn, { flex: 1 }]} onPress={handleSaveFirebaseConfig}>
            <Ionicons name="save-outline" size={18} color="#ffffff" />
            <Text style={styles.saveConfBtnText}>{t('save')}</Text>
          </TouchableOpacity>
        </View>

        {/* Cloud Sync Actions Section */}
        <View style={styles.syncActionsBox}>
          <View style={[styles.syncHeaderRow, isRTL && styles.rowReverse]}>
            <Text style={styles.syncSubTitle}>
              {isRTL ? 'إجراءات المزامنة السحابية' : 'Actions de synchronisation'}
            </Text>
            {lastSyncTime && (
              <Text style={styles.lastSyncText}>
                {isRTL ? 'آخر مزامنة:' : 'Dernière synchro:'} {lastSyncTime}
              </Text>
            )}
          </View>

          {isSyncing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.syncingText}>{t('syncing')}</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {/* Main Full Push Button */}
              <TouchableOpacity style={styles.pushAllBtn} onPress={handlePushAllData}>
                <Ionicons name="cloud-upload" size={24} color="#ffffff" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.pushAllBtnTitle}>{t('pushAllToCloud')}</Text>
                  <Text style={styles.pushAllBtnSub}>
                    {isRTL ? 'نقل كل ما في الهاتف من منتجات وزبائن ومبيعات إلى السحابة' : 'Transférer tout le contenu du téléphone vers Firebase'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Main Full Pull Button */}
              <TouchableOpacity style={styles.pullAllBtn} onPress={handlePullAllData}>
                <Ionicons name="cloud-download" size={24} color="#ffffff" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.pullAllBtnTitle}>{t('pullAllFromCloud')}</Text>
                  <Text style={styles.pullAllBtnSub}>
                    {isRTL ? 'استيراد كل بيانات السحابة إلى هذا الكمبيوتر' : 'Importer toutes les données du Cloud sur ce PC'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.syncBtnRow, isRTL && styles.rowReverse, { marginTop: 4 }]}>
                <TouchableOpacity style={styles.pushBtn} onPress={handlePushStock}>
                  <Ionicons name="arrow-up-circle" size={16} color="#ffffff" />
                  <Text style={styles.syncBtnText}>{t('pushToCloud')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.pullBtn} onPress={handlePullStock}>
                  <Ionicons name="arrow-down-circle" size={16} color="#ffffff" />
                  <Text style={styles.syncBtnText}>{t('pullFromCloud')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.refreshBtn} onPress={refreshAllFromFirebase}>
                  <Ionicons name="refresh" size={16} color="#ffffff" />
                  <Text style={styles.syncBtnText}>{isRTL ? 'تحديث' : 'Actualiser'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Cloudflare D1 Database & Hybrid Architecture Card */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse, { marginTop: 24 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="server" size={20} color="#f97316" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>{t('cloudflareDatabase') || 'Base Cloudflare D1'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {cloudflareLatency !== null && (
            <View style={styles.latencyBadge}>
              <Ionicons name="speedometer-outline" size={12} color="#059669" />
              <Text style={styles.latencyBadgeText}>{cloudflareLatency} ms</Text>
            </View>
          )}
          <View
            style={[
              styles.statusPill,
              cloudflareConnected ? styles.statusPillGreen : styles.statusPillGray,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: cloudflareConnected ? theme.colors.success : theme.colors.textMuted },
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: cloudflareConnected ? theme.colors.success : theme.colors.textMuted },
              ]}
            >
              {cloudflareConnected ? (isRTL ? 'D1 متصل' : 'D1 Connecté') : (isRTL ? 'D1 غير متصل' : 'D1 Déconnecté')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        {/* Hybrid Architecture Notice */}
        <View style={styles.hybridNoticeBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="git-branch" size={20} color="#0284c7" />
            <Text style={[styles.hybridNoticeTitle, { marginLeft: 8 }]}>
              {isRTL ? '⚡ الهيكلية الهجينة المزدوجة (Firebase + Cloudflare)' : '⚡ Architecture Hybride Découplée (Firebase + Cloudflare)'}
            </Text>
          </View>
          <Text style={[styles.hybridNoticeText, isRTL && styles.textRight]}>
            {t('hybridArchitectureNotice') ||
              'Firebase stocke et sécurise les utilisateurs, mots de passe et sessions. Cloudflare D1 stocke massivement les données métier : produits, catégories, clients, ventes, réparations, services et transactions sans limite de stockage.'}
          </Text>
          <View style={[styles.hybridRolesRow, isRTL && styles.rowReverse]}>
            <View style={styles.hybridRolePill}>
              <Ionicons name="lock-closed" size={12} color="#059669" />
              <Text style={styles.hybridRolePillText}>Firebase : Users & Auth</Text>
            </View>
            <View style={[styles.hybridRolePill, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
              <Ionicons name="cube" size={12} color="#f97316" />
              <Text style={[styles.hybridRolePillText, { color: '#c2410c' }]}>Cloudflare D1 : Stock, Ventes & Données</Text>
            </View>
          </View>
        </View>

        {/* Pure REST API Direct Notice */}
        <View style={[styles.hybridRolePill, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-start', marginBottom: 12 }]}>
          <Ionicons name="flash" size={14} color="#16a34a" />
          <Text style={[styles.hybridRolePillText, { color: '#15803d', fontSize: 11 }]}>
            {isRTL ? '⚡ اتصال مباشر عبر REST API (تلقائي ودائم - بدون Worker)' : '⚡ REST API Direct Cloudflare D1 (Auto-Actif & Sans Worker)'}
          </Text>
        </View>

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('cloudflareAccountId') || 'Cloudflare Account ID'}</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={cfAccountId}
          onChangeText={setCfAccountId}
          placeholder="ex: a1b2c3d4e5f6..."
          autoCapitalize="none"
        />

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('cloudflareDatabaseId') || 'Cloudflare Database ID (D1 UUID)'}</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={cfDatabaseId}
          onChangeText={setCfDatabaseId}
          placeholder="ex: 12345678-abcd-ef01-2345-6789abcdef01"
          autoCapitalize="none"
        />

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('cloudflareApiToken') || 'Cloudflare API Token (Permissions D1:Edit)'}</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={cfApiToken}
          onChangeText={setCfApiToken}
          placeholder="ex: token_d1_..."
          secureTextEntry
          autoCapitalize="none"
        />

        {/* Buttons Row: Test D1 & Save Config */}
        <View style={[styles.testBtnRow, isRTL && styles.rowReverse, { marginTop: 12 }]}>
          <TouchableOpacity
            style={[styles.testBtn, { backgroundColor: '#f97316', flex: 1.3, marginRight: 8 }]}
            onPress={handleTestCloudflare}
            disabled={testingCf}
          >
            {testingCf ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="pulse" size={18} color="#ffffff" />
                <Text style={styles.testBtnText}>{t('testCloudflareConnection') || 'Tester Cloudflare'}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.saveConfBtn, { flex: 1 }]} onPress={handleSaveCloudflareConfig}>
            <Ionicons name="save-outline" size={18} color="#ffffff" />
            <Text style={styles.saveConfBtnText}>{t('save')}</Text>
          </TouchableOpacity>
        </View>

        {/* SQL Tables Init & Sync */}
        <View style={styles.syncActionsBox}>
          <View style={[styles.syncHeaderRow, isRTL && styles.rowReverse]}>
            <Text style={styles.syncSubTitle}>
              {isRTL ? 'إجراءات ومزامنة Cloudflare D1' : 'Actions & Synchronisation D1'}
            </Text>
            {cloudflareLastSync && (
              <Text style={styles.lastSyncText}>
                {isRTL ? 'آخر مزامنة:' : 'Dernière synchro:'} {cloudflareLastSync}
              </Text>
            )}
          </View>

          {cfSyncing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#f97316" />
              <Text style={styles.syncingText}>{isRTL ? 'جاري الاتصال بـ Cloudflare...' : 'Opération Cloudflare D1 en cours...'}</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {/* Init SQL Tables Button */}
              <TouchableOpacity
                style={[styles.testBtn, { backgroundColor: '#334155', paddingVertical: 10 }]}
                onPress={handleInitCloudflareTables}
                disabled={testingCf}
              >
                <Ionicons name="hammer-outline" size={18} color="#ffffff" />
                <Text style={[styles.testBtnText, { marginLeft: 8 }]}>
                  {t('initCloudflareTables') || 'Créer / Mettre à jour les tables SQL D1'}
                </Text>
              </TouchableOpacity>

              {/* Push all to Cloudflare */}
              <TouchableOpacity
                style={[styles.pushAllBtn, { backgroundColor: '#ea580c' }]}
                onPress={handlePushAllCloudflare}
              >
                <Ionicons name="cloud-upload" size={24} color="#ffffff" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.pushAllBtnTitle}>
                    {t('pushToCloudflare') || 'Envoyer toutes les données vers Cloudflare'}
                  </Text>
                  <Text style={styles.pushAllBtnSub}>
                    {isRTL ? 'مزامنة وحفظ المنتجات، الزبائن، المبيعات والعمليات في قاعدة بيانات D1' : 'Sauvegarder le stock, clients, ventes et écritures dans Cloudflare D1'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Pull all from Cloudflare */}
              <TouchableOpacity
                style={[styles.pullAllBtn, { backgroundColor: '#0284c7' }]}
                onPress={handlePullAllCloudflare}
              >
                <Ionicons name="cloud-download" size={24} color="#ffffff" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.pullAllBtnTitle}>
                    {t('pullFromCloudflare') || 'Récupérer toutes les données de Cloudflare'}
                  </Text>
                  <Text style={styles.pullAllBtnSub}>
                    {isRTL ? 'استيراد كل قاعدة البيانات من D1 إلى التطبيق' : 'Rapatrier tout le contenu D1 sur cette session'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Real-Time Auto-Sync Engine Monitor */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse, { marginTop: 24 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="sync-circle" size={20} color="#0284c7" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>
            {t('autoSyncStatus') || (isRTL ? 'المزامنة التلقائية اللحظية (35 ثانية)' : 'Synchronisation Temps Réel Automatique (35s)')}
          </Text>
        </View>
        <View style={[styles.autoSyncBadge, { backgroundColor: syncMetrics?.isSyncing || autoSyncRunning ? '#fef3c7' : '#ecfdf5' }]}>
          <View style={[styles.statusDot, { backgroundColor: syncMetrics?.isSyncing || autoSyncRunning ? '#d97706' : '#059669' }]} />
          <Text style={[styles.autoSyncBadgeText, { color: syncMetrics?.isSyncing || autoSyncRunning ? '#b45309' : '#047857' }]}>
            {syncMetrics?.isSyncing || autoSyncRunning
              ? (isRTL ? 'جاري المزامنة...' : 'En cours...')
              : (isRTL ? 'نشط تلقائياً' : 'Actif en continu')}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardHelpText, isRTL && styles.textRight]}>
          {isRTL
            ? 'يقوم النظام بمزامنة فورية ثنائية الاتجاه (إرسال واستقبال التغييرات) في الخلفية كل 35 ثانية، مع حفظ آمن للمعلومات الشخصية في Firebase والبيانات التشغيلية في Cloudflare D1.'
            : 'Le moteur synchronise en continu les flux entrants et sortants en arrière-plan toutes les 35 secondes, tout en garantissant la séparation stricte des données sensibles (Firebase) et de masse (Cloudflare D1).'}
        </Text>

        <View style={[styles.autoSyncMetricsRow, isRTL && styles.rowReverse]}>
          <View style={[styles.metricCol, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <Ionicons name="arrow-up-circle" size={22} color="#16a34a" />
            <Text style={styles.metricValue}>{syncMetrics?.itemsSent || 0}</Text>
            <Text style={styles.metricLabel}>{isRTL ? 'بيانات أرسلت' : 'Données envoyées'}</Text>
          </View>

          <View style={[styles.metricCol, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <Ionicons name="arrow-down-circle" size={22} color="#2563eb" />
            <Text style={styles.metricValue}>{syncMetrics?.itemsReceived || 0}</Text>
            <Text style={styles.metricLabel}>{isRTL ? 'بيانات استقبلت' : 'Données reçues'}</Text>
          </View>

          <View style={[styles.metricCol, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}>
            <Ionicons name="speedometer-outline" size={22} color="#9333ea" />
            <Text style={styles.metricValue}>{cloudflareLatency !== null ? `${cloudflareLatency}ms` : '--'}</Text>
            <Text style={styles.metricLabel}>{isRTL ? 'زمن الاستجابة' : 'Latence D1'}</Text>
          </View>
        </View>

        {syncMetrics?.lastSyncTime ? (
          <Text style={[styles.lastSyncInfoText, isRTL && styles.textRight]}>
            {isRTL ? '🕒 آخر دورة مزامنة مكتملة: ' : '🕒 Dernière synchronisation réussie : '}
            {syncMetrics.lastSyncTime}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.manualSyncBtn, autoSyncRunning && { opacity: 0.7 }]}
          onPress={handleTriggerAutoSync}
          disabled={autoSyncRunning}
        >
          {autoSyncRunning ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.manualSyncBtnText}>
                {isRTL ? 'تشغيل المزامنة الآن فورياً' : 'Déclencher la synchronisation maintenant'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Multi-Databases Manager */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse, { marginTop: 24 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="layers-outline" size={20} color="#7c3aed" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>
            {t('multiDatabasesTitle') || (isRTL ? 'إدارة قواعد البيانات المتعددة' : 'Multi-Bases de Données (D1)')}
          </Text>
        </View>
        <TouchableOpacity style={styles.addDbHeaderBtn} onPress={handleOpenAddDatabase}>
          <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
          <Text style={styles.addDbHeaderBtnText}>{isRTL ? 'إضافة قاعدة' : 'Ajouter une base'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardHelpText, isRTL && styles.textRight]}>
          {isRTL
            ? 'يمكنك إنشاء وإدارة عدة قواعد بيانات (مثل: المتجر الرئيسي، المخزن، أرشيف سنة ماضية) والتبديل بينها بنقرة واحدة مع مزامنة الإعدادات تلقائياً عبر Firebase.'
            : 'Gérez plusieurs bases D1 indépendantes (ex: Magasin Principal, Dépôt, Archives) et basculez instantanément de l\'une à l\'autre. Toutes les configurations sont sauvegardées sur Firebase.'}
        </Text>

        {(!databasesList || databasesList.length === 0) ? (
          <View style={styles.emptyDbBox}>
            <Text style={styles.emptyDbText}>
              {isRTL ? 'قاعدة البيانات الافتراضية نشطة' : 'Une base par défaut est actuellement configurée.'}
            </Text>
          </View>
        ) : (
          databasesList.map((db) => {
            const isActive = db.id === activeDatabaseId || (!activeDatabaseId && db.id === 'default');
            const isTestingThis = testingDbId === db.id;
            return (
              <View
                key={db.id}
                style={[
                  styles.dbCardItem,
                  isActive && styles.dbCardItemActive,
                  isRTL && { alignItems: 'flex-end' },
                ]}
              >
                <View style={[styles.dbCardTopRow, isRTL && styles.rowReverse]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons
                      name="server"
                      size={18}
                      color={isActive ? '#7c3aed' : '#64748b'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.dbCardName, isActive && { color: '#7c3aed' }]}>
                      {db.name}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.dbTypePill}>
                      <Text style={styles.dbTypePillText}>
                        {db.type === 'worker' ? 'Cloudflare Worker' : 'Direct REST API'}
                      </Text>
                    </View>
                    {isActive ? (
                      <View style={styles.activePill}>
                        <Ionicons name="checkmark-circle" size={12} color="#059669" />
                        <Text style={styles.activePillText}>{isRTL ? 'نشطة' : 'Active'}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {db.workerUrl ? (
                  <Text style={styles.dbDetailText} numberOfLines={1}>
                    🔗 {db.workerUrl}
                  </Text>
                ) : db.databaseId ? (
                  <Text style={styles.dbDetailText} numberOfLines={1}>
                    🆔 {db.databaseId}
                  </Text>
                ) : null}

                {/* Actions row */}
                <View style={[styles.dbActionsRow, isRTL && styles.rowReverse]}>
                  {!isActive && (
                    <TouchableOpacity
                      style={[styles.dbActionBtn, { backgroundColor: '#7c3aed' }]}
                      onPress={() => handleSwitchDatabase(db.id)}
                    >
                      <Ionicons name="swap-horizontal" size={14} color="#ffffff" />
                      <Text style={styles.dbActionBtnText}>{isRTL ? 'تفعيل' : 'Activer'}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.dbActionBtn, { backgroundColor: '#f1f5f9' }]}
                    onPress={() => handleTestSpecificDatabase(db)}
                    disabled={isTestingThis}
                  >
                    {isTestingThis ? (
                      <ActivityIndicator size="small" color="#475569" />
                    ) : (
                      <>
                        <Ionicons name="pulse" size={14} color="#475569" />
                        <Text style={[styles.dbActionBtnText, { color: '#475569' }]}>
                          {isRTL ? 'فحص' : 'Tester'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dbActionBtn, { backgroundColor: '#f8fafc' }]}
                    onPress={() => handleOpenEditDatabase(db)}
                  >
                    <Ionicons name="pencil" size={14} color="#0284c7" />
                    <Text style={[styles.dbActionBtnText, { color: '#0284c7' }]}>
                      {isRTL ? 'تعديل' : 'Modifier'}
                    </Text>
                  </TouchableOpacity>

                  {db.id !== 'default' && (
                    <TouchableOpacity
                      style={[styles.dbActionBtn, { backgroundColor: '#fef2f2' }]}
                      onPress={() => handleDeleteDatabase(db.id)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#dc2626" />
                      <Text style={[styles.dbActionBtnText, { color: '#dc2626' }]}>
                        {isRTL ? 'حذف' : 'Supprimer'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* IPTV Supplier & Headless Automated Purchasing Section */}
      <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse, { marginTop: 24 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="hardware-chip-outline" size={20} color="#7c3aed" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>
            {t('iptvSupplierSettings') || (isRTL ? 'مزود IPTV والشراء الآلي' : 'Fournisseur IPTV & Achat Automatisé')}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
          <Ionicons name="lock-closed" size={12} color="#059669" />
          <Text style={[styles.statusPillText, { color: '#059669', fontSize: 10, marginLeft: 3 }]}>
            Firebase Encrypted
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardHelpText, isRTL && styles.textRight]}>
          {isRTL
            ? 'احفظ رابط ومستخدم وكلمة مرور موقع مزود IPTV. تُحفظ هذه البيانات الحساسة حصرياً على Firebase Firestore وتستخدم في نظام الشراء الآلي والكابتشا المدمجة دون فقدان أي بيانات.'
            : 'Enregistrez le lien HTTP, l\'identifiant et le mot de passe de votre site fournisseur IPTV. Ces données personnelles sont stockées strictement sur Firebase Firestore et permettent d\'alimenter le système d\'achat automatisé.'}
        </Text>

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
          {t('iptvSupplierUrl') || 'URL / Lien HTTP du portail fournisseur'} *
        </Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={settingSupUrl}
          onChangeText={setSettingSupUrl}
          placeholder="https://panel.fournisseur-iptv.com ou http://..."
          autoCapitalize="none"
        />

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
          {t('iptvSupplierUsername') || 'Nom d\'utilisateur fournisseur'} *
        </Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={settingSupUser}
          onChangeText={setSettingSupUser}
          placeholder="ex: revendeur_iptv"
          autoCapitalize="none"
        />

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
          {t('iptvSupplierPassword') || 'Mot de passe fournisseur'} *
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
          <TextInput
            style={[styles.inputBox, { flex: 1, marginBottom: 0 }, isRTL && styles.textRight]}
            value={settingSupPass}
            onChangeText={setSettingSupPass}
            placeholder="••••••••••••"
            secureTextEntry={!settingShowSupPass}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={{ position: 'absolute', right: 12, padding: 4 }}
            onPress={() => setSettingShowSupPass(!settingShowSupPass)}
          >
            <Ionicons
              name={settingShowSupPass ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.inputLabel, isRTL && styles.textRight, { marginTop: 12 }]}>
          {isRTL ? 'اسم السيرفر الافتراضي' : 'Nom du serveur par défaut'}
        </Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={settingSupServer}
          onChangeText={setSettingSupServer}
          placeholder="ex: Mega OTT / Trex / Strong 8K"
        />

        <View style={[styles.testBtnRow, isRTL && styles.rowReverse, { marginTop: 14 }]}>
          <TouchableOpacity
            style={[styles.saveConfBtn, { flex: 1 }]}
            onPress={handleSaveSettingSupplierConfig}
            disabled={savingSettingSup}
          >
            {savingSettingSup ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#ffffff" />
                <Text style={styles.saveConfBtnText}>
                  {isRTL ? 'حفظ في Firebase' : 'Enregistrer sur Firebase'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Store Information Section */}
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>{t('storeInfo')}</Text>
      <View style={styles.card}>
        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('storeName')}</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={name}
          onChangeText={setName}
          placeholder="Nom de votre commerce"
        />

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('storePhone')}</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="0550 00 00 00"
        />

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('storeAddress')}</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={address}
          onChangeText={setAddress}
          placeholder="Adresse du magasin"
        />

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>{t('receiptFooter')}</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={footer}
          onChangeText={setFooter}
          placeholder="Merci pour votre visite !"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveStoreInfo}>
          <Text style={styles.saveBtnText}>{t('save')}</Text>
        </TouchableOpacity>
      </View>

      {/* Language Section */}
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>{t('language')}</Text>
      <View style={[styles.languageRow, isRTL && styles.rowReverse]}>
        <TouchableOpacity
          style={[styles.langBtn, language === 'fr' && styles.langBtnActive]}
          onPress={() => setLanguage('fr')}
        >
          <Text style={[styles.langBtnText, language === 'fr' && styles.langBtnTextActive]}>
            🇫🇷 Français
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.langBtn, language === 'ar' && styles.langBtnActive]}
          onPress={() => setLanguage('ar')}
        >
          <Text style={[styles.langBtnText, language === 'ar' && styles.langBtnTextActive]}>
            🇩🇿 العربية (RTL)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Currency Section */}
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>{t('currency')}</Text>
      <View style={[styles.currencyRow, isRTL && styles.rowReverse]}>
        {['DA', '€', '$', 'MAD', 'TND'].map((curr) => (
          <TouchableOpacity
            key={curr}
            style={[styles.currChip, currency === curr && styles.currChipActive]}
            onPress={() => setCurrency(curr)}
          >
            <Text style={[styles.currChipText, currency === curr && styles.currChipTextActive]}>
              {curr === 'DA' && isRTL ? 'د.ج' : curr}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Data Management & Statistics */}
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>{t('dataManagement')}</Text>
      <View style={styles.card}>
        <View style={[styles.dataStatRow, isRTL && styles.rowReverse]}>
          <Text style={styles.statLabel}>{t('products')} :</Text>
          <Text style={styles.statVal}>{(products || []).length}</Text>
        </View>
        <View style={[styles.dataStatRow, isRTL && styles.rowReverse]}>
          <Text style={styles.statLabel}>{t('customers')} :</Text>
          <Text style={styles.statVal}>{(customers || []).length}</Text>
        </View>
        <View style={[styles.dataStatRow, isRTL && styles.rowReverse]}>
          <Text style={styles.statLabel}>{isRTL ? 'المبيعات المسجلة' : 'Ventes enregistrées'} :</Text>
          <Text style={styles.statVal}>{(sales || []).length}</Text>
        </View>
        <View style={[styles.dataStatRow, isRTL && styles.rowReverse]}>
          <Text style={styles.statLabel}>{t('services')} :</Text>
          <Text style={styles.statVal}>{(services || []).length}</Text>
        </View>
        <View style={[styles.dataStatRow, isRTL && styles.rowReverse]}>
          <Text style={styles.statLabel}>{t('repairs')} :</Text>
          <Text style={styles.statVal}>{(repairs || []).length}</Text>
        </View>
        <View style={[styles.dataStatRow, isRTL && styles.rowReverse]}>
          <Text style={styles.statLabel}>{t('expenses')} :</Text>
          <Text style={styles.statVal}>{(expenses || []).length}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.resetBtn,
            { backgroundColor: theme.colors.dangerLight, borderColor: theme.colors.danger, marginTop: 14 },
          ]}
          onPress={handleWipeAll}
        >
          <Ionicons name="trash" size={18} color={theme.colors.danger} />
          <Text style={[styles.resetBtnText, { color: theme.colors.danger }]}>
            {isRTL ? 'تصفير ومسح جميع البيانات بالكامل' : 'Vider toutes les données (Remise à zéro)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* PIN CONFIGURATION MODAL */}
      <Modal visible={pinModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="key" size={20} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle}>
                  {isPinRequired ? (isRTL ? 'تعديل رمز PIN' : 'Modifier le Code PIN') : (isRTL ? 'تعيين رمز PIN' : 'Définir un Code PIN')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPinModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {isPinRequired && (
                <>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                    {t('enterCurrentPin') || 'Code PIN Actuel *'}
                  </Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    value={currentPinForm}
                    onChangeText={setCurrentPinForm}
                    placeholder="••••"
                    keyboardType="numeric"
                    secureTextEntry={!showPinModalText}
                    maxLength={6}
                  />
                </>
              )}

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                {t('enterNewPin') || 'Nouveau Code PIN (4 chiffres) *'}
              </Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={newPinForm}
                onChangeText={setNewPinForm}
                placeholder="Ex: 1234"
                keyboardType="numeric"
                secureTextEntry={!showPinModalText}
                maxLength={6}
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                {t('confirmNewPin') || 'Confirmer le Nouveau Code PIN *'}
              </Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={confirmPinForm}
                onChangeText={setConfirmPinForm}
                placeholder="Ex: 1234"
                keyboardType="numeric"
                secureTextEntry={!showPinModalText}
                maxLength={6}
              />

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}
                onPress={() => setShowPinModalText(!showPinModalText)}
              >
                <Ionicons
                  name={showPinModalText ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={theme.colors.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {isRTL ? 'إظهار الأرقام أثناء الكتابة' : 'Afficher les chiffres'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitUserBtn} onPress={handleSavePin}>
                <Text style={styles.submitUserBtnText}>
                  {isRTL ? 'حفظ وتفعيل رمز PIN' : 'Enregistrer le Code PIN'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* STORE MANAGEMENT GUIDE MODAL */}
      <Modal visible={guideModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 540, maxHeight: '85%' }]}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="bulb" size={22} color="#d97706" style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle}>
                  {isRTL ? 'دليل ونصائح تنظيم المحل' : 'Guide d’Organisation du Magasin'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setGuideModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Guide Pills Header */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }}>
              {[
                { key: 'stock', title: isRTL ? 'المخزون' : '1. Stock', icon: 'cube' },
                { key: 'cash', title: isRTL ? 'الكاسة' : '2. Caisse', icon: 'cash' },
                { key: 'credit', title: isRTL ? 'الديون' : '3. Crédits', icon: 'people' },
                { key: 'margin', title: isRTL ? 'الأرباح' : '4. Marges', icon: 'trending-up' },
                { key: 'backup', title: isRTL ? 'الأمان' : '5. Sécurité', icon: 'shield' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.guideNavTab,
                    activeGuideTab === tab.key && styles.guideNavTabActive,
                  ]}
                  onPress={() => setActiveGuideTab(tab.key)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={activeGuideTab === tab.key ? '#ffffff' : '#64748b'}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.guideNavTabText,
                      activeGuideTab === tab.key && styles.guideNavTabTextActive,
                    ]}
                  >
                    {tab.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {activeGuideTab === 'stock' && (
                <View style={styles.guideTabBody}>
                  <Text style={styles.guideCardHeading}>📦 Gestion du Stock & Approvisionnement</Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Définissez toujours un stock minimum :</Text> Réglez le stock d'alerte (ex: 5 unités) pour chaque produit afin que la cloche de notification vous avertisse à temps.
                  </Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Priorité aux produits à forte rotation (Méthode 80/20) :</Text> 20% de vos références génèrent 80% de vos ventes. Ne laissez jamais ces produits phares tomber en rupture.
                  </Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Inventaire tournant mensuel :</Text> Au lieu d'attendre la fin d'année, comptez 1 rayon chaque semaine pour détecter immédiatement les pertes ou erreurs de saisie.
                  </Text>
                </View>
              )}

              {activeGuideTab === 'cash' && (
                <View style={styles.guideTabBody}>
                  <Text style={styles.guideCardHeading}>💵 Tenue de Caisse & Trésorerie Quotidienne</Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Clôture journalière stricte :</Text> Chaque soir, comparez les espèces réelles dans le tiroir-caisse avec le montant affiché dans l'onglet "Statistiques & Ventes".
                  </Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Enregistrez chaque sortie d'argent :</Text> Ne prenez jamais de l'argent de la caisse pour payer un café ou une facture sans l'ajouter immédiatement dans l'onglet "Dépenses".
                  </Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Fonds de roulement fixe :</Text> Gardez un fond de caisse constant chaque matin pour la monnaie (ex: 5 000 DA ou 10 000 DA).
                  </Text>
                </View>
              )}

              {activeGuideTab === 'credit' && (
                <View style={styles.guideTabBody}>
                  <Text style={styles.guideCardHeading}>👥 Maîtrise des Crédits & Dettes Clients</Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Fixez un plafond de crédit par client :</Text> Ne laissez pas un client dépasser une limite sans régler au moins une partie de son ancienne dette.
                  </Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Partagez les tickets par WhatsApp :</Text> À chaque paiement partiel ou ajout de crédit, envoyez le récapitulatif directement sur WhatsApp du client depuis l'onglet Ventes.
                  </Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Surveillez les créances anciennes :</Text> Consultez régulièrement l'indicateur "Total Dettes Clients" sur le Tableau de Bord.
                  </Text>
                </View>
              )}

              {activeGuideTab === 'margin' && (
                <View style={styles.guideTabBody}>
                  <Text style={styles.guideCardHeading}>📈 Rentabilité, Prix & Calcul des Marges</Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Marge Brute vs Bénéfice Net :</Text> Marge Brute = Prix de Vente - Prix d'Achat. Votre vrai bénéfice net déduit également les loyers, électricité, sacs et frais.
                  </Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Actualisez les prix d'achat lors des arrivages :</Text> Si votre fournisseur augmente ses prix, répercutez-le immédiatement pour ne pas vendre à perte.
                  </Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Exportez le bilan financier en Excel :</Text> Utilisez le bouton Excel chaque fin de mois pour analyser vos produits les plus rentables.
                  </Text>
                </View>
              )}

              {activeGuideTab === 'backup' && (
                <View style={styles.guideTabBody}>
                  <Text style={styles.guideCardHeading}>🛡️ Sécurité & Stratégie de Sauvegarde 3-2-1</Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Activez le Code PIN :</Text> Empêchez les employés ou caissiers d'accéder aux paramètres, aux bilans financiers et à la suppression des bases de données.
                  </Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Exportez une sauvegarde JSON chaque semaine :</Text> Utilisez le bouton "Exporter Sauvegarde Complète (JSON)" et conservez le fichier sur une clé USB ou Google Drive.
                  </Text>
                  <Text style={styles.guideItemText}>
                    • <Text style={{ fontWeight: 'bold' }}>Surveillez la jauge de saturation :</Text> Gardez l'utilisation mémoire sous les 70% pour garantir une vitesse ultra-fluide sur mobile et PC.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create User Modal (Validates & Exits Directly) */}
      <Modal visible={userModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>{t('createUser')}</Text>
              <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                {isRTL ? 'الاسم الكامل' : 'Nom & Prénom'}
              </Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={newUserName}
                onChangeText={setNewUserName}
                placeholder="Ex: Ahmed Benali"
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                {t('username')} *
              </Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={newUserUsername}
                onChangeText={setNewUserUsername}
                placeholder="Ex: caissier1"
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                {t('password')} *
              </Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={newUserPassword}
                onChangeText={setNewUserPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                {t('role')}
              </Text>
              <View style={[styles.roleSelectRow, isRTL && styles.rowReverse]}>
                <TouchableOpacity
                  style={[styles.roleChip, newUserRole === 'cashier' && styles.roleChipActive]}
                  onPress={() => setNewUserRole('cashier')}
                >
                  <Text style={[styles.roleChipText, newUserRole === 'cashier' && styles.roleChipTextActive]}>
                    💳 {t('cashier')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleChip, newUserRole === 'technician' && styles.roleChipActive]}
                  onPress={() => setNewUserRole('technician')}
                >
                  <Text style={[styles.roleChipText, newUserRole === 'technician' && styles.roleChipTextActive]}>
                    🔧 {t('technician')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleChip, newUserRole === 'admin' && styles.roleChipActive]}
                  onPress={() => setNewUserRole('admin')}
                >
                  <Text style={[styles.roleChipText, newUserRole === 'admin' && styles.roleChipTextActive]}>
                    🛡️ {t('admin')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Direct Save Button */}
              <TouchableOpacity style={styles.submitUserBtn} onPress={handleAddUser}>
                <Text style={styles.submitUserBtnText}>
                  {isRTL ? 'حفظ المستخدم في جدول users' : 'Enregistrer dans la table users'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Database Modal */}
      <Modal visible={addDbModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {editingDbId
                  ? (isRTL ? 'تعديل قاعدة البيانات' : 'Modifier la base de données')
                  : (isRTL ? 'إضافة قاعدة بيانات جديدة' : 'Ajouter une nouvelle base D1')}
              </Text>
              <TouchableOpacity onPress={() => setAddDbModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                {isRTL ? 'اسم القاعدة (مثال: المتجر الرئيسي)' : 'Nom de la base (ex: Magasin 2, Stock Central)'}
              </Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={dbFormName}
                onChangeText={setDbFormName}
                placeholder="Nom du magasin / Base D1"
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Cloudflare Account ID *</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={dbFormAccountId}
                onChangeText={setDbFormAccountId}
                placeholder="ex: a1b2c3d4e5f6..."
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Cloudflare Database ID (D1 UUID) *</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={dbFormDatabaseId}
                onChangeText={setDbFormDatabaseId}
                placeholder="ex: 12345678-abcd-ef01-2345-6789abcdef01"
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Cloudflare API Token *</Text>
              <TextInput
                style={[styles.inputBox, isRTL && styles.textRight]}
                value={dbFormApiToken}
                onChangeText={setDbFormApiToken}
                placeholder="ex: token_d1_..."
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.submitUserBtn} onPress={handleSaveDatabase}>
                <Text style={styles.submitUserBtnText}>
                  {editingDbId
                    ? (isRTL ? 'حفظ التعديلات' : 'Enregistrer les modifications')
                    : (isRTL ? 'إضافة وحفظ في Firebase' : 'Ajouter & Enregistrer sur Firebase')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
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
    borderRadius: theme.borderRadius.md,
    marginBottom: 12,
  },
  toastText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
  userSessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    elevation: 2,
  },
  userSessionInfo: {
    flex: 1,
  },
  userBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionNameText: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 6,
  },
  roleTag: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginLeft: 8,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  sessionSubText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dangerLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
  },
  logoutBtnText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginVertical: 4,
  },
  addUserHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
  },
  addUserHeaderBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  usersHelpText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  statusPillGreen: {
    backgroundColor: theme.colors.successLight,
  },
  statusPillGray: {
    backgroundColor: theme.colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    elevation: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  timeoutSelectRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  timeoutPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeoutPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeoutPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  timeoutPillTextActive: {
    color: '#ffffff',
  },
  testBtn: {
    backgroundColor: theme.colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  testBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  testBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  saveConfBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  saveConfBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 12,
  },
  cloudSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: theme.spacing.md,
  },
  cloudSuccessText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
    lineHeight: 18,
  },
  cloudWarningBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: theme.spacing.md,
  },
  cloudWarningTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#991b1b',
  },
  cloudWarningDesc: {
    fontSize: 11.5,
    color: '#7f1d1d',
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 8,
  },
  cloudStepsBox: {
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  cloudStepTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#c2410c',
    marginBottom: 4,
  },
  cloudStepText: {
    fontSize: 10.5,
    color: '#334155',
    lineHeight: 16,
    marginVertical: 2,
  },
  pushAllBtn: {
    backgroundColor: '#ea580c',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.md,
  },
  pushAllBtnTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pushAllBtnSub: {
    color: '#ffedd5',
    fontSize: 10,
    marginTop: 1,
  },
  pullAllBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.md,
  },
  pullAllBtnTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pullAllBtnSub: {
    color: '#e0f2fe',
    fontSize: 10,
    marginTop: 1,
  },
  syncActionsBox: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  syncHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  syncSubTitle: {
    fontSize: theme.typography.small,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  lastSyncText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  syncingText: {
    marginLeft: 8,
    fontSize: 12,
    color: theme.colors.primary,
  },
  syncBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  pushBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    marginRight: 4,
  },
  pullBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 4,
  },
  refreshBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    marginLeft: 4,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  userItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  userItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userRoleDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bgAdmin: {
    backgroundColor: '#4f46e5',
  },
  bgCashier: {
    backgroundColor: '#059669',
  },
  bgTechnician: {
    backgroundColor: '#d97706',
  },
  userItemDetails: {},
  userItemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  userItemSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  deleteUserBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.dangerLight,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  languageRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  langBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  langBtnText: {
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  langBtnTextActive: {
    color: '#ffffff',
  },
  currencyRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  currChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  currChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  currChipText: {
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  currChipTextActive: {
    color: '#ffffff',
  },
  dataStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
  },
  resetBtnText: {
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 12,
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
    maxWidth: 460,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
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
  roleSelectRow: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 10,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roleChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  roleChipTextActive: {
    color: '#ffffff',
  },
  submitUserBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: 14,
  },
  submitUserBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  hybridNoticeBox: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 12,
  },
  hybridNoticeTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0369a1',
  },
  hybridNoticeText: {
    fontSize: 11,
    color: '#0c4a6e',
    lineHeight: 16,
    marginBottom: 8,
  },
  hybridRolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hybridRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  hybridRolePillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#065f46',
    marginLeft: 4,
  },
  // Latency & CORS styles
  latencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    marginRight: 4,
    gap: 4,
  },
  latencyBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669',
  },
  corsAlertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: 12,
  },
  corsAlertTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#b45309',
    marginBottom: 2,
  },
  corsAlertText: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 15,
  },
  // Auto-Sync styles
  autoSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  autoSyncBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  autoSyncMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  lastSyncInfoText: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 12,
  },
  manualSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  manualSyncBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Multi-Databases styles
  addDbHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  addDbHeaderBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyDbBox: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: theme.borderRadius.md,
  },
  emptyDbText: {
    fontSize: 12,
    color: '#64748b',
  },
  dbCardItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 10,
  },
  dbCardItemActive: {
    borderColor: '#7c3aed',
    borderWidth: 1.5,
    backgroundColor: '#faf5ff',
  },
  dbCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dbCardName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  dbTypePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dbTypePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
  },
  dbDetailText: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  dbActionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dbActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  dbActionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // PIN LOCK GATE STYLES
  pinLockContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinLockCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pinLockIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinLockTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  pinLockSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  pinErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 14,
    width: '100%',
  },
  pinErrorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  pinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#f8fafc',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  pinInputMain: {
    flex: 1,
    height: 52,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#0f172a',
  },
  pinEyeBtn: {
    padding: 6,
  },
  pinSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.full,
    width: '100%',
    marginBottom: 10,
  },
  pinSubmitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pinBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pinBackBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },

  // PIN SETTINGS IN SCREEN
  pinStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  pinStatusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  pinActionBtnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  pinSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.md,
  },
  pinSetBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pinDisableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.md,
  },
  pinDisableBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pinLockNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.md,
  },
  pinLockNowBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // DATABASE SATURATION & DIAGNOSTICS
  refreshDiagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  refreshDiagBtnText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: 'bold',
  },
  storageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  storageUsageNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  storageHealthPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  storageHealthy: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  storageModerate: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  storageCritical: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  storageHealthPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  gaugeTrack: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 5,
  },
  storageAdviceText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 12,
  },
  storageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  storageGridItem: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  storageGridLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  storageGridVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },

  // STORAGE ROUTING
  routingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  routingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routingItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  routingPillRow: {
    flexDirection: 'row',
    gap: 4,
  },
  routingChoiceBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  routingChoiceBtnActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  routingChoiceText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
  },
  routingChoiceTextActive: {
    color: '#ffffff',
  },
  backupActionsContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  backupBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  exportBackupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  exportBackupBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  importBackupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  importBackupBtnText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },

  // EXCEL EXPORT STYLES
  masterExcelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 14,
    borderRadius: theme.borderRadius.md,
    marginTop: 8,
  },
  masterExcelBtnTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  masterExcelBtnSub: {
    fontSize: 10,
    color: '#d1fae5',
    marginTop: 2,
  },
  secondaryExcelRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  secondaryExcelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
    paddingVertical: 9,
    borderRadius: theme.borderRadius.md,
  },
  secondaryExcelBtnText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // STORE MANAGEMENT GUIDE
  viewGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  viewGuideBtnText: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: 'bold',
  },
  guideTeaserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: theme.borderRadius.md,
    padding: 14,
    marginBottom: 16,
  },
  guideTeaserIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideTeaserTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 2,
  },
  guideTeaserSub: {
    fontSize: 11,
    color: '#b45309',
    lineHeight: 15,
  },
  guideNavTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
  },
  guideNavTabActive: {
    backgroundColor: '#d97706',
  },
  guideNavTabText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
  },
  guideNavTabTextActive: {
    color: '#ffffff',
  },
  guideTabBody: {
    backgroundColor: '#fafaf9',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  guideCardHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 10,
  },
  guideItemText: {
    fontSize: 12,
    color: '#44403c',
    lineHeight: 18,
    marginBottom: 8,
  },
  moduleNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  moduleNavIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleNavTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  moduleNavDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
