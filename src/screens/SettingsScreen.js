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
    isSyncing,
    lastSyncTime,
    applyFirebaseConfig,
    uploadStockToCloud,
    downloadStockFromCloud,
    refreshAllFromFirebase,
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

  // New User Form Modal (Dedicated 'users' collection)
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('cashier'); // 'admin' | 'cashier' | 'technician'

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
              { backgroundColor: firebaseConnected ? theme.colors.success : theme.colors.textMuted },
            ]}
          />
          <Text
            style={[
              styles.statusPillText,
              { color: firebaseConnected ? theme.colors.success : theme.colors.textMuted },
            ]}
          >
            {firebaseConnected ? t('connected') : t('disconnected')}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
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

        <TouchableOpacity style={styles.testBtn} onPress={handleSaveFirebaseConfig}>
          <Ionicons name="cloud-upload" size={18} color="#ffffff" />
          <Text style={styles.testBtnText}>{t('testConnection')}</Text>
        </TouchableOpacity>

        {/* Cloud Sync Actions */}
        {firebaseConnected && (
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
              <View style={[styles.syncBtnRow, isRTL && styles.rowReverse]}>
                <TouchableOpacity style={styles.pushBtn} onPress={handlePushStock}>
                  <Ionicons name="arrow-up-circle" size={18} color="#ffffff" />
                  <Text style={styles.syncBtnText}>{t('pushToCloud')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.pullBtn} onPress={handlePullStock}>
                  <Ionicons name="arrow-down-circle" size={18} color="#ffffff" />
                  <Text style={styles.syncBtnText}>{t('pullFromCloud')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.refreshBtn} onPress={refreshAllFromFirebase}>
                  <Ionicons name="refresh" size={18} color="#ffffff" />
                  <Text style={styles.syncBtnText}>{isRTL ? 'تحديث الكل' : 'Actualiser'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
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
    marginTop: theme.spacing.md,
  },
  testBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 6,
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
});
