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
    resetDemoData,
    products,
    sales,
    customers,
    expenses,
    t,
    isRTL,
    // Firebase
    firebaseConfig,
    firebaseConnected,
    isSyncing,
    lastSyncTime,
    applyFirebaseConfig,
    uploadStockToCloud,
    downloadStockFromCloud,
  } = useApp();

  const [name, setName] = useState(storeInfo.name);
  const [phone, setPhone] = useState(storeInfo.phone);
  const [address, setAddress] = useState(storeInfo.address);
  const [footer, setFooter] = useState(storeInfo.footer);

  // Firebase form fields
  const [apiKey, setApiKey] = useState(firebaseConfig?.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey);
  const [projectId, setProjectId] = useState(firebaseConfig?.projectId || DEFAULT_FIREBASE_CONFIG.projectId);
  const [appId, setAppId] = useState(firebaseConfig?.appId || DEFAULT_FIREBASE_CONFIG.appId);
  const [authDomain, setAuthDomain] = useState(firebaseConfig?.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain);

  useEffect(() => {
    if (firebaseConfig) {
      if (firebaseConfig.apiKey) setApiKey(firebaseConfig.apiKey);
      if (firebaseConfig.projectId) setProjectId(firebaseConfig.projectId);
      if (firebaseConfig.appId) setAppId(firebaseConfig.appId);
      if (firebaseConfig.authDomain) setAuthDomain(firebaseConfig.authDomain);
    }
  }, [firebaseConfig]);

  const handleSaveStoreInfo = () => {
    setStoreInfo({ name, phone, address, footer });
    Alert.alert(
      t('storeInfo'),
      isRTL ? 'تم حفظ معلومات المحل بنجاح!' : 'Informations du magasin enregistrées avec succès !'
    );
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
      Alert.alert(
        t('firebaseSync'),
        isRTL
          ? 'تم تفعيل الاتصال بـ Firebase بنجاح!'
          : 'Connexion Firebase établie avec succès !'
      );
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
      Alert.alert(
        t('pushToCloud'),
        isRTL
          ? `تم رفع ${res.count} منتج بنجاح إلى Firebase Firestore!`
          : `${res.count} produits synchronisés avec succès sur Firebase Firestore !`
      );
    } catch (err) {
      Alert.alert(t('pushToCloud'), err.message);
    }
  };

  const handlePullStock = async () => {
    try {
      const res = await downloadStockFromCloud();
      if (res.success) {
        Alert.alert(
          t('pullFromCloud'),
          isRTL
            ? `تم استيراد ${res.count} منتج بنجاح من Firebase!`
            : `${res.count} produits récupérés avec succès depuis Firebase !`
        );
      } else {
        Alert.alert(t('pullFromCloud'), res.message);
      }
    } catch (err) {
      Alert.alert(t('pullFromCloud'), err.message);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      t('resetDemoData'),
      isRTL
        ? 'هل أنت متأكد من استعادة البيانات التجريبية للمتجر؟'
        : 'Êtes-vous sûr de vouloir réinitialiser avec les données de démonstration ?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('resetDemoData'),
          style: 'destructive',
          onPress: () => {
            resetDemoData();
            Alert.alert(
              t('dataManagement'),
              isRTL ? 'تمت استعادة البيانات بنجاح!' : 'Données réinitialisées avec succès !'
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            {firebaseConnected ? t('firebaseConnected') : t('firebaseDisconnected')}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.firebaseHelperText, isRTL && styles.textRight]}>
          {isRTL
            ? 'قم بربط قاعدة بيانات Firebase Firestore لمزامنة المخزون والمنتجات في السحابة فورياً عبر أجهزة متعددة.'
            : 'Synchronisez votre stock d\'articles en temps réel dans le Cloud Firebase Firestore pour y accéder sur plusieurs appareils.'}
        </Text>

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Firebase API Key *</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="AIzaSy..."
          secureTextEntry={false}
          autoCapitalize="none"
        />

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Firebase Project ID *</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={projectId}
          onChangeText={setProjectId}
          placeholder="mon-magasin-pos"
          autoCapitalize="none"
        />

        <Text style={[styles.inputLabel, isRTL && styles.textRight]}>Firebase App ID</Text>
        <TextInput
          style={[styles.inputBox, isRTL && styles.textRight]}
          value={appId}
          onChangeText={setAppId}
          placeholder="1:123456789:android:abcdef..."
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
                  <Ionicons name="arrow-up-circle" size={20} color="#ffffff" />
                  <Text style={styles.syncBtnText}>{t('pushToCloud')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.pullBtn} onPress={handlePullStock}>
                  <Ionicons name="arrow-down-circle" size={20} color="#ffffff" />
                  <Text style={styles.syncBtnText}>{t('pullFromCloud')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
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

      {/* Data Management & Statistics */}
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>{t('dataManagement')}</Text>
      <View style={styles.card}>
        <View style={[styles.dataStatRow, isRTL && styles.rowReverse]}>
          <Text style={styles.statLabel}>{t('products')} :</Text>
          <Text style={styles.statVal}>{products.length}</Text>
        </View>
        <View style={[styles.dataStatRow, isRTL && styles.rowReverse]}>
          <Text style={styles.statLabel}>{t('customers')} :</Text>
          <Text style={styles.statVal}>{customers.length}</Text>
        </View>
        <View style={[styles.dataStatRow, isRTL && styles.rowReverse]}>
          <Text style={styles.statLabel}>{isRTL ? 'إجمالي المبيعات' : 'Ventes enregistrées'} :</Text>
          <Text style={styles.statVal}>{sales.length}</Text>
        </View>
        <View style={[styles.dataStatRow, isRTL && styles.rowReverse]}>
          <Text style={styles.statLabel}>{t('expenses')} :</Text>
          <Text style={styles.statVal}>{expenses.length}</Text>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={handleResetData}>
          <Ionicons name="refresh" size={18} color={theme.colors.danger} />
          <Text style={styles.resetBtnText}>{t('resetDemoData')}</Text>
        </TouchableOpacity>
      </View>
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
  },
  firebaseHelperText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
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
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c', // Firebase Orange
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.md,
  },
  testBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: theme.typography.small,
  },
  syncActionsBox: {
    marginTop: theme.spacing.lg,
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
  syncBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pushBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginRight: 4,
  },
  pullBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginLeft: 4,
  },
  syncBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
    marginLeft: 6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  syncingText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  langBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
    elevation: 1,
  },
  langBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  langBtnText: {
    fontSize: theme.typography.regular,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  langBtnTextActive: {
    color: theme.colors.primaryDark,
  },
  currencyRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  currChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  currChipActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  currChipText: {
    fontSize: theme.typography.small,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  currChipTextActive: {
    color: '#ffffff',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: theme.typography.medium,
  },
  dataStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statLabel: {
    fontSize: theme.typography.small,
    color: theme.colors.textSecondary,
  },
  statVal: {
    fontSize: theme.typography.small,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.dangerLight,
  },
  resetBtnText: {
    color: theme.colors.danger,
    fontWeight: 'bold',
    fontSize: theme.typography.small,
    marginLeft: 6,
  },
});
