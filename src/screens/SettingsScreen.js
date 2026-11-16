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
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_FIREBASE_CONFIG } from '../services/firebase';

export default function SettingsScreen() {
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

  const [name, setName] = useState(storeInfo.name || '');
  const [phone, setPhone] = useState(storeInfo.phone || '');
  const [address, setAddress] = useState(storeInfo.address || '');
  const [footer, setFooter] = useState(storeInfo.footer || '');
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

  // Cloudflare D1 Handlers
  const handleSaveCloudflareConfig = async () => {
    if (!cfWorkerUrl.trim() && (!cfAccountId.trim() || !cfDatabaseId.trim() || !cfApiToken.trim())) {
      Alert.alert(
        'Cloudflare D1',
        isRTL
          ? 'يرجى إدخال إما رابط Cloudflare Worker أو (Account ID + Database ID + API Token)!'
          : 'Veuillez saisir soit une URL Worker Cloudflare, soit (Account ID + Database ID + API Token) !'
      );
      return;
    }

    const conf = {
      accountId: cfAccountId.trim(),
      databaseId: cfDatabaseId.trim(),
      apiToken: cfApiToken.trim(),
      workerUrl: cfWorkerUrl.trim(),
    };

    const res = await applyCloudflareConfig(conf);
    if (res.success) {
      showToast(isRTL ? '✅ تم حفظ إعدادات Cloudflare بنجاح' : '✅ Configuration Cloudflare D1 enregistrée');
    } else {
      Alert.alert('Cloudflare', res.error || 'Erreur');
    }
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

        {Platform.OS === 'web' && !cfWorkerUrl.trim() && (
          <View style={styles.corsAlertBox}>
            <Ionicons name="warning" size={18} color="#d97706" style={{ marginTop: 2 }} />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={styles.corsAlertTitle}>
                {isRTL ? 'تنبيه قيود المتصفح (CORS)' : 'Attention Navigateur Web (CORS)'}
              </Text>
              <Text style={styles.corsAlertText}>
                {isRTL
                  ? 'المتصفح يحجب الاتصال المباشر بـ Cloudflare بسبب قيود CORS. يرجى إدخال رابط Cloudflare Worker لضمان اتصال مستقر وسريع 100%.'
                  : 'Sur navigateur web, Cloudflare bloque les requêtes REST directes (CORS). Renseignez l\'URL de votre Cloudflare Worker pour un accès 100% stable sans blocage.'}
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Cloudflare Worker URL ({isRTL ? 'اختياري في حال استخدام وركر' : 'Optionnel si Worker déployé'})</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={cfWorkerUrl}
          onChangeText={setCfWorkerUrl}
          placeholder="https://shop-manager-d1.votre-nom.workers.dev"
          autoCapitalize="none"
        />

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

              <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                {isRTL ? 'طريقة الاتصال' : 'Mode de connexion'}
              </Text>
              <View style={[styles.roleSelectRow, isRTL && styles.rowReverse]}>
                <TouchableOpacity
                  style={[styles.roleChip, dbFormType === 'worker' && styles.roleChipActive]}
                  onPress={() => setDbFormType('worker')}
                >
                  <Text style={[styles.roleChipText, dbFormType === 'worker' && styles.roleChipTextActive]}>
                    Cloudflare Worker ({isRTL ? 'موصى به' : 'Recommandé'})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleChip, dbFormType === 'direct' && styles.roleChipActive]}
                  onPress={() => setDbFormType('direct')}
                >
                  <Text style={[styles.roleChipText, dbFormType === 'direct' && styles.roleChipTextActive]}>
                    REST Direct
                  </Text>
                </TouchableOpacity>
              </View>

              {dbFormType === 'worker' ? (
                <>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>
                    URL Worker Cloudflare
                  </Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    value={dbFormWorkerUrl}
                    onChangeText={setDbFormWorkerUrl}
                    placeholder="https://shop-manager-d1.votre-nom.workers.dev"
                    autoCapitalize="none"
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Cloudflare Account ID</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    value={dbFormAccountId}
                    onChangeText={setDbFormAccountId}
                    placeholder="ex: a1b2c3d4e5f6..."
                    autoCapitalize="none"
                  />

                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Cloudflare Database ID (UUID)</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    value={dbFormDatabaseId}
                    onChangeText={setDbFormDatabaseId}
                    placeholder="ex: 12345678-abcd-ef01-2345-6789abcdef01"
                    autoCapitalize="none"
                  />

                  <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Cloudflare API Token</Text>
                  <TextInput
                    style={[styles.inputBox, isRTL && styles.textRight]}
                    value={dbFormApiToken}
                    onChangeText={setDbFormApiToken}
                    placeholder="ex: token_d1_..."
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </>
              )}

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
});
