import React, { useState, useMemo, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function IPTVStockScreen() {
  const {
    t,
    formatMoney,
    iptvCodes = [],
    customers = [],
    addIptvCode,
    updateIptvCode,
    deleteIptvCode,
    assignIptvCodeToCustomer,
    parseAndImportIptvText,
    isRTL,
    cloudflareConnected,
    cloudflareConfig,
    refreshAllFromCloudflare,
    syncMetrics,
    iptvSupplierConfig,
    saveIptvSupplierConfig,
    openSupplierSession,
    getSupplierAutomationScript,
  } = useApp();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in_stock' | 'sold' | 'expiring' | 'expired'
  const [selectedServer, setSelectedServer] = useState('All');

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [smartParserVisible, setSmartParserVisible] = useState(false);
  const [rawPastedText, setRawPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);

  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [selectedCodeToSell, setSelectedCodeToSell] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [sellPriceInput, setSellPriceInput] = useState('');
  const [sellDurationInput, setSellDurationInput] = useState('12');

  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [bookmarkletModalVisible, setBookmarkletModalVisible] = useState(false);

  // Supplier Portal & Headless Purchasing State
  const [supplierTab, setSupplierTab] = useState('config'); // 'config' | 'system' | 'script'
  const [supUrl, setSupUrl] = useState(iptvSupplierConfig?.url || '');
  const [supUser, setSupUser] = useState(iptvSupplierConfig?.username || '');
  const [supPass, setSupPass] = useState(iptvSupplierConfig?.password || '');
  const [supApiKey, setSupApiKey] = useState(iptvSupplierConfig?.apiKey || '');
  const [supServer, setSupServer] = useState(iptvSupplierConfig?.defaultServerName || '');
  const [showSupPass, setShowSupPass] = useState(false);
  const [savingSup, setSavingSup] = useState(false);

  useEffect(() => {
    if (iptvSupplierConfig) {
      if (iptvSupplierConfig.url) setSupUrl(iptvSupplierConfig.url);
      if (iptvSupplierConfig.username) setSupUser(iptvSupplierConfig.username);
      if (iptvSupplierConfig.password) setSupPass(iptvSupplierConfig.password);
      if (iptvSupplierConfig.apiKey) setSupApiKey(iptvSupplierConfig.apiKey);
      if (iptvSupplierConfig.defaultServerName) setSupServer(iptvSupplierConfig.defaultServerName);
    }
  }, [iptvSupplierConfig]);

  // Form fields for Add/Edit
  const [formServerName, setFormServerName] = useState('Trex IPTV');
  const [formServiceType, setFormServiceType] = useState('xtream'); // 'xtream' | 'code' | 'm3u' | 'portal'
  const [formCode, setFormCode] = useState('');
  const [formHost, setFormHost] = useState('');
  const [formPort, setFormPort] = useState('80');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formM3uUrl, setFormM3uUrl] = useState('');
  const [formMacAddress, setFormMacAddress] = useState('');
  const [formDuration, setFormDuration] = useState('12');
  const [formBuyPrice, setFormBuyPrice] = useState('');
  const [formSellPrice, setFormSellPrice] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Popular server suggestions
  const serverSuggestions = ['Trex IPTV', 'Crystal OTT', 'Pure IPTV', 'Mega OTT', 'Dino OTT', 'King365', 'Iron Pro', 'SmartOne'];

  // Calculate statistics
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const stats = useMemo(() => {
    let inStock = 0;
    let sold = 0;
    let expiring = 0;
    let expired = 0;
    let totalStockValue = 0;
    let totalSoldProfit = 0;

    iptvCodes.forEach((item) => {
      const expDate = item.expirationDate ? new Date(item.expirationDate) : null;
      const isExpired = expDate && expDate < now;
      const isExpiringSoon = expDate && expDate >= now && expDate <= sevenDaysFromNow;

      if (item.status === 'in_stock') {
        inStock++;
        totalStockValue += Number(item.buyPrice || 0);
      } else if (item.status === 'sold') {
        sold++;
        totalSoldProfit += (Number(item.sellPrice || 0) - Number(item.buyPrice || 0));
      }

      if (isExpired) expired++;
      else if (isExpiringSoon) expiring++;
    });

    return { inStock, sold, expiring, expired, totalStockValue, totalSoldProfit };
  }, [iptvCodes]);

  // Unique list of servers for filtering
  const existingServers = useMemo(() => {
    const set = new Set();
    iptvCodes.forEach((c) => {
      if (c.serverName) set.add(c.serverName);
    });
    return Array.from(set);
  }, [iptvCodes]);

  // Filtered & Sorted items
  const filteredCodes = useMemo(() => {
    return iptvCodes.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (item.serverName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.host || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesServer = selectedServer === 'All' || item.serverName === selectedServer;

      const expDate = item.expirationDate ? new Date(item.expirationDate) : null;
      const isExpired = expDate && expDate < now;
      const isExpiringSoon = expDate && expDate >= now && expDate <= sevenDaysFromNow;

      let matchesStatus = true;
      if (statusFilter === 'in_stock') matchesStatus = item.status === 'in_stock';
      else if (statusFilter === 'sold') matchesStatus = item.status === 'sold';
      else if (statusFilter === 'expiring') matchesStatus = isExpiringSoon;
      else if (statusFilter === 'expired') matchesStatus = isExpired;

      return matchesSearch && matchesServer && matchesStatus;
    });
  }, [iptvCodes, searchQuery, selectedServer, statusFilter]);

  // Clipboard copy helper
  const copyToClipboard = (text, label) => {
    if (!text) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      Alert.alert(isRTL ? 'تم النسخ' : 'Copié', `${label} ${isRTL ? 'تم نسخه للحافظة' : 'a été copié dans le presse-papier !'}`);
    } else {
      Alert.alert(isRTL ? 'تم النسخ' : 'Copié', `${label} : ${text}`);
    }
  };

  // WhatsApp formatted share helper
  const handleShareWhatsApp = (item) => {
    let msg = `*Bonjour ${item.customerName || 'Cher Client'} !*\n\nVoici les accès de votre abonnement *${item.serverName}* :\n`;

    if (item.serviceType === 'xtream') {
      msg += `\n🌐 *Serveur / Host :* ${item.host}${item.port ? ':' + item.port : ''}`;
      msg += `\n👤 *Nom d'utilisateur :* ${item.username}`;
      msg += `\n🔑 *Mot de passe :* ${item.password}`;
    } else if (item.serviceType === 'code') {
      msg += `\n🔢 *Code d'activation PIN :* ${item.code}`;
    } else if (item.serviceType === 'm3u') {
      msg += `\n🔗 *Lien Playlist M3U :* ${item.m3uUrl}`;
    } else if (item.serviceType === 'portal') {
      msg += `\n📟 *Adresse MAC :* ${item.macAddress}`;
      if (item.host) msg += `\n🌐 *Portail URL :* ${item.host}`;
    }

    if (item.expirationDate) {
      const expFormatted = new Date(item.expirationDate).toLocaleDateString();
      msg += `\n\n📅 *Date d'expiration :* ${expFormatted} (${item.durationMonths || 12} Mois)`;
    }

    msg += `\n\nMerci pour votre confiance ! Pour toute assistance, nous restons à votre écoute.`;

    const encoded = encodeURIComponent(msg);
    const phone = (item.customerPhone || '').replace(/[^0-9]/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => Alert.alert('WhatsApp', 'Impossible d\'ouvrir WhatsApp'));
    }
  };

  // Supplier Portal Handlers (Strictly Firebase Saved)
  const handleSaveSupplierConfig = async () => {
    setSavingSup(true);
    try {
      await saveIptvSupplierConfig({
        url: supUrl.trim(),
        username: supUser.trim(),
        password: supPass.trim(),
        apiKey: supApiKey.trim(),
        defaultServerName: supServer.trim(),
      });
      Alert.alert(
        isRTL ? 'تم الحفظ' : 'Succès',
        isRTL
          ? '✅ تم حفظ بيانات الدخول للمزود على فايربيس بنجاح!'
          : '✅ Identifiants du portail fournisseur sauvegardés sur Firebase !'
      );
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSavingSup(false);
    }
  };

  const handleLaunchSupplierSession = async () => {
    try {
      if (!supUrl.trim()) {
        Alert.alert(
          'Information',
          isRTL
            ? 'يرجى إدخال رابط المزود أولاً في الإعدادات.'
            : 'Veuillez renseigner le lien HTTP/HTTPS du fournisseur avant de lancer la session.'
        );
        return;
      }
      await saveIptvSupplierConfig({
        url: supUrl.trim(),
        username: supUser.trim(),
        password: supPass.trim(),
        apiKey: supApiKey.trim(),
        defaultServerName: supServer.trim(),
      });
      await openSupplierSession();
    } catch (err) {
      Alert.alert('Erreur', err.message);
    }
  };

  // Open modal to add
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormServerName('Trex IPTV');
    setFormServiceType('xtream');
    setFormCode('');
    setFormHost('');
    setFormPort('80');
    setFormUsername('');
    setFormPassword('');
    setFormM3uUrl('');
    setFormMacAddress('');
    setFormDuration('12');
    setFormBuyPrice('');
    setFormSellPrice('');
    setFormNotes('');
    setAddModalVisible(true);
  };

  // Open modal to edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormServerName(item.serverName || 'Serveur IPTV');
    setFormServiceType(item.serviceType || 'xtream');
    setFormCode(item.code || '');
    setFormHost(item.host || '');
    setFormPort(String(item.port || '80'));
    setFormUsername(item.username || '');
    setFormPassword(item.password || '');
    setFormM3uUrl(item.m3uUrl || '');
    setFormMacAddress(item.macAddress || '');
    setFormDuration(String(item.durationMonths || 12));
    setFormBuyPrice(String(item.buyPrice || ''));
    setFormSellPrice(String(item.sellPrice || ''));
    setFormNotes(item.notes || '');
    setAddModalVisible(true);
  };

  // Save add/edit
  const handleSaveForm = async () => {
    if (formServiceType === 'xtream' && !formUsername.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir au moins le nom d\'utilisateur Xtream.');
      return;
    }
    if (formServiceType === 'code' && !formCode.trim()) {
      Alert.alert('Erreur', 'Veuillez renseigner le code PIN d\'activation.');
      return;
    }

    const payload = {
      serverName: formServerName.trim() || 'Serveur IPTV',
      serviceType: formServiceType,
      code: formCode.trim(),
      host: formHost.trim(),
      port: formPort.trim(),
      username: formUsername.trim(),
      password: formPassword.trim(),
      m3uUrl: formM3uUrl.trim(),
      macAddress: formMacAddress.trim(),
      durationMonths: Number(formDuration || 12),
      buyPrice: Number(formBuyPrice || 0),
      sellPrice: Number(formSellPrice || 0),
      notes: formNotes.trim(),
    };

    try {
      if (editingItem) {
        await updateIptvCode(editingItem.id, payload);
      } else {
        await addIptvCode(payload);
      }
      setAddModalVisible(false);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  // Smart Parser live update
  const handleParseTextChange = (text) => {
    setRawPastedText(text);
    if (!text.trim()) {
      setParsedPreview(null);
      return;
    }
    const detected = parseAndImportIptvText(text, 'Serveur Détecté');
    setParsedPreview(detected);
  };

  // Confirm smart import
  const handleSaveSmartImport = async () => {
    if (!parsedPreview) return;
    try {
      await addIptvCode(parsedPreview);
      setSmartParserVisible(false);
      setRawPastedText('');
      setParsedPreview(null);
      Alert.alert(isRTL ? 'نجاح' : 'Succès', isRTL ? 'تم حفظ الكود في قاعدة البيانات بنجاح' : 'Le code IPTV a été enregistré et synchronisé avec succès !');
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  // Open Sell Modal
  const handleOpenSell = (item) => {
    setSelectedCodeToSell(item);
    setSelectedCustomerId('');
    setSellPriceInput(String(item.sellPrice || ''));
    setSellDurationInput(String(item.durationMonths || 12));
    setSellModalVisible(true);
  };

  // Confirm Sell
  const handleConfirmSell = async () => {
    if (!selectedCodeToSell) return;
    try {
      await assignIptvCodeToCustomer(
        selectedCodeToSell.id,
        selectedCustomerId,
        Number(sellPriceInput || 0),
        Number(sellDurationInput || 12)
      );
      setSellModalVisible(false);
      Alert.alert(
        isRTL ? 'تمت العملية' : 'Vente Validée !',
        isRTL ? 'تم بيع وتعيين الاشتراك وتسجيل العملية في المبيعات بنجاح' : 'L\'abonnement a été assigné au client et la vente est enregistrée dans votre caisse POS !'
      );
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  // Delete confirmation
  const handleDelete = (item) => {
    const confirmMsg = isRTL ? 'هل تريد بالتأكيد حذف هذا الكود؟' : `Supprimer définitivement ce code (${item.serverName}) ?`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmMsg)) {
        deleteIptvCode(item.id);
      }
      return;
    }
    Alert.alert(
      isRTL ? 'تأكيد الحذف' : 'Confirmation',
      confirmMsg,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: isRTL ? 'حذف' : 'Supprimer', style: 'destructive', onPress: () => deleteIptvCode(item.id) },
      ]
    );
  };

  // Generate Bookmarklet JavaScript Code
  const workerBase = cloudflareConfig?.workerUrl || 'https://VOTRE-WORKER.workers.dev';
  const bookmarkletScript = `javascript:(function(){try{var code=prompt('Code IPTV ou ligne Xtream reçue du site :');if(!code)return;var server=prompt('Nom du serveur :','Trex IPTV')||'IPTV';fetch('${workerBase}/api/iptv',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code,serverName:server,notes:'Acheté sur '+location.hostname})}).then(r=>r.json()).then(d=>alert('✅ Code IPTV synchronisé avec succès dans Shop Manager !')).catch(e=>alert('❌ Erreur : '+e.message));}catch(err){alert('Erreur: '+err);}})();`;

  return (
    <View style={styles.container}>
      {/* Top Stats Banner */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          {/* Card 1: En Stock */}
          <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
            <View style={styles.statIconRow}>
              <Ionicons name="checkbox-outline" size={18} color="#10b981" />
              <Text style={styles.statLabel}>{t('availableCodes')}</Text>
            </View>
            <Text style={styles.statValue}>{stats.inStock}</Text>
            <Text style={styles.statSub}>{formatMoney(stats.totalStockValue)} coût</Text>
          </View>

          {/* Card 2: Vendus / Actifs */}
          <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
            <View style={styles.statIconRow}>
              <Ionicons name="people-outline" size={18} color="#3b82f6" />
              <Text style={styles.statLabel}>{t('soldCodes')}</Text>
            </View>
            <Text style={styles.statValue}>{stats.sold}</Text>
            <Text style={styles.statSub}>+{formatMoney(stats.totalSoldProfit)} gain</Text>
          </View>

          {/* Card 3: Expirations Proches */}
          <View style={[styles.statCard, { borderLeftColor: stats.expiring > 0 ? '#f59e0b' : '#9ca3af' }]}>
            <View style={styles.statIconRow}>
              <Ionicons name="time-outline" size={18} color={stats.expiring > 0 ? '#f59e0b' : '#9ca3af'} />
              <Text style={styles.statLabel}>{t('expiringSoon')}</Text>
            </View>
            <Text style={[styles.statValue, stats.expiring > 0 ? { color: '#b45309' } : {}]}>{stats.expiring}</Text>
            <Text style={styles.statSub}>{'< 7 jours'}</Text>
          </View>

          {/* Card 4: Cloudflare D1 Sync Indicator */}
          <View style={[styles.statCard, { borderLeftColor: cloudflareConnected ? '#ea580c' : '#9ca3af' }]}>
            <View style={styles.statIconRow}>
              <Ionicons name="server-outline" size={18} color="#ea580c" />
              <Text style={styles.statLabel}>Cloudflare D1</Text>
            </View>
            <Text style={[styles.statValue, { fontSize: 13, marginTop: 4, color: cloudflareConnected ? '#15803d' : '#b91c1c' }]}>
              {cloudflareConnected ? 'Connecté' : 'Inactif'}
            </Text>
            <Text style={styles.statSub}>{syncMetrics?.itemsReceived || iptvCodes.length} codes synchro</Text>
          </View>
        </ScrollView>
      </View>

      {/* Action Buttons Toolbar */}
      <View style={[styles.toolbar, isRTL && styles.rowReverse]}>
        <TouchableOpacity
          style={[styles.actionBtnPrimary, { backgroundColor: '#8b5cf6' }]}
          onPress={() => setSmartParserVisible(true)}
        >
          <Ionicons name="clipboard-outline" size={18} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('smartPaste')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnPrimary, { backgroundColor: theme.colors.primary }]}
          onPress={handleOpenAdd}
        >
          <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('addIptvCode')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnSecondary, { borderColor: '#7c3aed', backgroundColor: '#faf5ff' }]}
          onPress={() => setSupplierModalVisible(true)}
        >
          <Ionicons name="hardware-chip-outline" size={17} color="#7c3aed" />
          <Text style={[styles.actionBtnSecondaryText, { color: '#7c3aed', fontWeight: 'bold' }]}>
            {isRTL ? '🤖 المزود والشراء الآلي' : '🤖 Fournisseur & Achat Automatisé'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtnSecondary}
          onPress={() => setBookmarkletModalVisible(true)}
        >
          <Ionicons name="code-slash-outline" size={17} color="#059669" />
          <Text style={[styles.actionBtnSecondaryText, { color: '#059669' }]}>Extension Web</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar & Filter Chips */}
      <View style={styles.filterSection}>
        <View style={[styles.searchBox, isRTL && styles.rowReverse]}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.textRight]}
            placeholder={isRTL ? 'بحث بالسيرفر، الكود، المستخدم أو الزبون...' : 'Recherche par serveur, code, utilisateur, client...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {[
            { id: 'all', label: isRTL ? 'الكل' : 'Tous' },
            { id: 'in_stock', label: isRTL ? 'في المخزون (متاح)' : 'En Stock (Dispo)' },
            { id: 'sold', label: isRTL ? 'تم البيع / مفعل' : 'Vendus / Actifs' },
            { id: 'expiring', label: isRTL ? 'قريب الانتهاء (<7 أيام)' : 'Expire Bientôt (<7j)' },
            { id: 'expired', label: isRTL ? 'منتهي' : 'Expirés' },
          ].map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={[styles.chip, statusFilter === chip.id && styles.chipActive]}
              onPress={() => setStatusFilter(chip.id)}
            >
              <Text style={[styles.chipText, statusFilter === chip.id && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* IPTV Codes List */}
      <FlatList
        data={filteredCodes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="tv-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyStateTitle}>
              {isRTL ? 'لا توجد أكواد أو سيرفرات مطابقة' : 'Aucun code IPTV trouvé'}
            </Text>
            <Text style={styles.emptyStateDesc}>
              {isRTL
                ? 'استخدم زر "لصق واكتشاف" أو أضف كود جديد من موقع المورد'
                : 'Cliquez sur "Coller & Détecter" ou ajoutez un nouveau code pour commencer à gérer votre stock IPTV.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const expDate = item.expirationDate ? new Date(item.expirationDate) : null;
          const isExpired = expDate && expDate < now;
          const isExpiringSoon = expDate && expDate >= now && expDate <= sevenDaysFromNow;
          const daysLeft = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

          return (
            <View style={[styles.card, isExpired && styles.cardExpired]}>
              {/* Card Header: Server & Status */}
              <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
                <View style={styles.serverBadge}>
                  <Ionicons name="tv" size={14} color="#8b5cf6" style={{ marginRight: 4 }} />
                  <Text style={styles.serverBadgeText}>{item.serverName}</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{(item.serviceType || 'code').toUpperCase()}</Text>
                  </View>
                </View>

                {/* Status Badge */}
                <View style={[
                  styles.statusBadge,
                  item.status === 'in_stock' ? styles.statusInStock : (isExpired ? styles.statusExpired : styles.statusSold)
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    item.status === 'in_stock' ? styles.statusInStockText : (isExpired ? styles.statusExpiredText : styles.statusSoldText)
                  ]}>
                    {item.status === 'in_stock' ? t('statusInStock') : (isExpired ? t('statusExpired') : t('statusSold'))}
                  </Text>
                </View>
              </View>

              {/* Card Body: Credentials */}
              <View style={styles.cardBody}>
                {item.serviceType === 'xtream' ? (
                  <View style={styles.credContainer}>
                    {item.host ? (
                      <TouchableOpacity style={styles.credRow} onPress={() => copyToClipboard(item.host, 'Host')}>
                        <Text style={styles.credLabel}>Host:</Text>
                        <Text style={styles.credValue} numberOfLines={1}>{item.host}{item.port ? ':' + item.port : ''}</Text>
                        <Ionicons name="copy-outline" size={14} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.credRow} onPress={() => copyToClipboard(item.username, 'User')}>
                      <Text style={styles.credLabel}>User:</Text>
                      <Text style={[styles.credValue, styles.boldMono]} numberOfLines={1}>{item.username}</Text>
                      <Ionicons name="copy-outline" size={14} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.credRow} onPress={() => copyToClipboard(item.password, 'Pass')}>
                      <Text style={styles.credLabel}>Pass:</Text>
                      <Text style={[styles.credValue, styles.boldMono]} numberOfLines={1}>{item.password}</Text>
                      <Ionicons name="copy-outline" size={14} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : item.serviceType === 'code' ? (
                  <TouchableOpacity style={styles.codeBox} onPress={() => copyToClipboard(item.code, 'Code PIN')}>
                    <Text style={styles.codeBoxLabel}>CODE PIN / ACTIVATION :</Text>
                    <Text style={styles.codeBoxValue}>{item.code}</Text>
                    <Ionicons name="copy-outline" size={18} color="#8b5cf6" style={{ marginTop: 2 }} />
                  </TouchableOpacity>
                ) : item.serviceType === 'm3u' ? (
                  <TouchableOpacity style={styles.credRow} onPress={() => copyToClipboard(item.m3uUrl, 'Lien M3U')}>
                    <Text style={styles.credLabel}>M3U:</Text>
                    <Text style={styles.credValue} numberOfLines={1}>{item.m3uUrl}</Text>
                    <Ionicons name="copy-outline" size={14} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.credRow} onPress={() => copyToClipboard(item.macAddress, 'MAC')}>
                    <Text style={styles.credLabel}>MAC:</Text>
                    <Text style={[styles.credValue, styles.boldMono]}>{item.macAddress}</Text>
                    <Ionicons name="copy-outline" size={14} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                )}

                {/* Expiration and Pricing Row */}
                <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
                  <View style={styles.durationPill}>
                    <Text style={styles.durationPillText}>{item.durationMonths || 12} Mois</Text>
                  </View>

                  {expDate && (
                    <View style={[
                      styles.expPill,
                      isExpired ? styles.expPillExpired : (isExpiringSoon ? styles.expPillWarning : styles.expPillOk)
                    ]}>
                      <Ionicons
                        name={isExpired ? 'alert-circle' : (isExpiringSoon ? 'time' : 'calendar-outline')}
                        size={12}
                        color={isExpired ? '#dc2626' : (isExpiringSoon ? '#d97706' : '#15803d')}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[
                        styles.expPillText,
                        isExpired ? { color: '#dc2626' } : (isExpiringSoon ? { color: '#d97706' } : { color: '#15803d' })
                      ]}>
                        {isExpired
                          ? (isRTL ? 'منتهي الصلاحية' : 'Expiré')
                          : (daysLeft !== null ? `${isRTL ? 'باقي' : 'Reste'} ${daysLeft} j (${expDate.toLocaleDateString()})` : expDate.toLocaleDateString())}
                      </Text>
                    </View>
                  )}

                  {/* Pricing info */}
                  <View style={styles.priceContainer}>
                    {Number(item.sellPrice || 0) > 0 && (
                      <Text style={styles.sellPriceText}>{formatMoney(item.sellPrice)}</Text>
                    )}
                    {Number(item.buyPrice || 0) > 0 && (
                      <Text style={styles.buyPriceText}>Coût: {formatMoney(item.buyPrice)}</Text>
                    )}
                  </View>
                </View>

                {/* Customer Assignment (if sold) */}
                {item.status === 'sold' && (
                  <View style={[styles.assignedBox, isRTL && styles.rowReverse]}>
                    <Ionicons name="person" size={13} color="#2563eb" />
                    <Text style={styles.assignedText}>
                      {isRTL ? 'الزبون :' : 'Client :'} <Text style={styles.bold}>{item.customerName || 'Client'}</Text>
                      {item.customerPhone ? ` (${item.customerPhone})` : ''}
                    </Text>
                  </View>
                )}
              </View>

              {/* Card Footer Actions */}
              <View style={[styles.cardFooter, isRTL && styles.rowReverse]}>
                {item.status === 'in_stock' ? (
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.sellBtn]}
                    onPress={() => handleOpenSell(item)}
                  >
                    <Ionicons name="pricetag-outline" size={15} color="#ffffff" />
                    <Text style={styles.sellBtnText}>{t('sellToCustomer')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.whatsAppBtn]}
                    onPress={() => handleShareWhatsApp(item)}
                  >
                    <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                    <Text style={styles.whatsAppBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.footerBtn, styles.editBtn]}
                  onPress={() => handleOpenEdit(item)}
                >
                  <Ionicons name="create-outline" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.footerBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* ============================================================== */}
      {/* MODAL 1: ADD / EDIT IPTV CODE                                 */}
      {/* ============================================================== */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {editingItem ? (isRTL ? 'تعديل الكود / السيرفر' : 'Modifier le Code IPTV') : (isRTL ? 'إضافة كود / سيرفر جديد' : 'Nouveau Code / Serveur')}
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {/* Server Name with quick suggestions */}
              <Text style={styles.formLabel}>{t('serverName')} *</Text>
              <TextInput
                style={styles.formInput}
                value={formServerName}
                onChangeText={setFormServerName}
                placeholder="Ex: Trex IPTV, Crystal, Pure..."
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serverChipsRow}>
                {serverSuggestions.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.serverChip, formServerName === s && styles.serverChipActive]}
                    onPress={() => setFormServerName(s)}
                  >
                    <Text style={[styles.serverChipText, formServerName === s && styles.serverChipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Service Format Tabs */}
              <Text style={styles.formLabel}>{t('serviceType')}</Text>
              <View style={styles.formatTabs}>
                {[
                  { id: 'xtream', label: 'Xtream' },
                  { id: 'code', label: 'Code PIN' },
                  { id: 'm3u', label: 'Lien M3U' },
                  { id: 'portal', label: 'MAC / Portal' },
                ].map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.formatTab, formServiceType === tab.id && styles.formatTabActive]}
                    onPress={() => setFormServiceType(tab.id)}
                  >
                    <Text style={[styles.formatTabText, formServiceType === tab.id && styles.formatTabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Conditional Fields based on service type */}
              {formServiceType === 'xtream' && (
                <>
                  <Text style={styles.formLabel}>Serveur / Host (DNS)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formHost}
                    onChangeText={setFormHost}
                    placeholder="http://line.ott.com"
                    autoCapitalize="none"
                  />
                  <View style={styles.rowTwoCols}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.formLabel}>Nom d'utilisateur *</Text>
                      <TextInput
                        style={styles.formInput}
                        value={formUsername}
                        onChangeText={setFormUsername}
                        placeholder="username"
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Mot de passe</Text>
                      <TextInput
                        style={styles.formInput}
                        value={formPassword}
                        onChangeText={setFormPassword}
                        placeholder="password"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </>
              )}

              {formServiceType === 'code' && (
                <>
                  <Text style={styles.formLabel}>Code PIN d'activation *</Text>
                  <TextInput
                    style={[styles.formInput, styles.codeHighlightInput]}
                    value={formCode}
                    onChangeText={setFormCode}
                    placeholder="Ex: 8371928471"
                  />
                </>
              )}

              {formServiceType === 'm3u' && (
                <>
                  <Text style={styles.formLabel}>Lien de la Playlist M3U</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formM3uUrl}
                    onChangeText={setFormM3uUrl}
                    placeholder="http://server.com/get.php?username=..."
                    autoCapitalize="none"
                  />
                </>
              )}

              {formServiceType === 'portal' && (
                <>
                  <Text style={styles.formLabel}>Adresse MAC</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formMacAddress}
                    onChangeText={setFormMacAddress}
                    placeholder="00:1A:79:..."
                    autoCapitalize="characters"
                  />
                  <Text style={styles.formLabel}>Portail URL</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formHost}
                    onChangeText={setFormHost}
                    placeholder="http://mag.portal.com/c/"
                    autoCapitalize="none"
                  />
                </>
              )}

              {/* Duration selection */}
              <Text style={styles.formLabel}>{t('durationMonths')}</Text>
              <View style={styles.durationRow}>
                {['1', '3', '6', '12', '24'].map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[styles.durationChip, formDuration === dur && styles.durationChipActive]}
                    onPress={() => setFormDuration(dur)}
                  >
                    <Text style={[styles.durationChipText, formDuration === dur && styles.durationChipTextActive]}>
                      {dur}M
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price Fields */}
              <View style={styles.rowTwoCols}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>{t('buyPrice')} ({t('currency') || 'DA'})</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formBuyPrice}
                    onChangeText={setFormBuyPrice}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>{t('sellPrice')} ({t('currency') || 'DA'})</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formSellPrice}
                    onChangeText={setFormSellPrice}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>

              <Text style={styles.formLabel}>Notes & Fournisseur</Text>
              <TextInput
                style={[styles.formInput, { height: 60 }]}
                value={formNotes}
                onChangeText={setFormNotes}
                multiline
                placeholder="Fournisseur, compte panel, détails..."
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveForm}>
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: SMART PASTE & DETECT FROM CLIPBOARD                   */}
      {/* ============================================================== */}
      <Modal visible={smartParserVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>📋 {t('smartParserTitle')}</Text>
              <TouchableOpacity onPress={() => setSmartParserVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.smartHelpText}>{t('smartParserDesc')}</Text>

              <TextInput
                style={styles.pasteArea}
                value={rawPastedText}
                onChangeText={handleParseTextChange}
                placeholder="Collez ici le texte brut ou l'URL copié depuis le site du fournisseur..."
                multiline
                numberOfLines={5}
                autoFocus
              />

              {/* Real-time Parsed Preview Card */}
              {parsedPreview && (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>✨ Données Détectées :</Text>

                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Format :</Text>
                    <Text style={styles.previewValue}>{parsedPreview.serviceType.toUpperCase()}</Text>
                  </View>

                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Serveur :</Text>
                    <Text style={styles.previewValue}>{parsedPreview.serverName}</Text>
                  </View>

                  {parsedPreview.host ? (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Host :</Text>
                      <Text style={styles.previewValue}>{parsedPreview.host}</Text>
                    </View>
                  ) : null}

                  {parsedPreview.username ? (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Username :</Text>
                      <Text style={[styles.previewValue, styles.boldMono]}>{parsedPreview.username}</Text>
                    </View>
                  ) : null}

                  {parsedPreview.password ? (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Password :</Text>
                      <Text style={[styles.previewValue, styles.boldMono]}>{parsedPreview.password}</Text>
                    </View>
                  ) : null}

                  {parsedPreview.code ? (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Code PIN :</Text>
                      <Text style={[styles.previewValue, styles.boldMono]}>{parsedPreview.code}</Text>
                    </View>
                  ) : null}

                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Durée estimée :</Text>
                    <Text style={styles.previewValue}>{parsedPreview.durationMonths} Mois</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSmartParserVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !parsedPreview && { opacity: 0.5 }]}
                disabled={!parsedPreview}
                onPress={handleSaveSmartImport}
              >
                <Text style={styles.saveBtnText}>Enregistrer dans Cloudflare D1</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: ASSIGN & SELL CODE TO CUSTOMER                        */}
      {/* ============================================================== */}
      <Modal visible={sellModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>🏷️ {t('sellToCustomer')}</Text>
              <TouchableOpacity onPress={() => setSellModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedCodeToSell && (
                <View style={styles.sellItemPreview}>
                  <Text style={styles.sellItemTitle}>{selectedCodeToSell.serverName}</Text>
                  <Text style={styles.sellItemSub}>
                    {selectedCodeToSell.serviceType === 'xtream'
                      ? `User: ${selectedCodeToSell.username}`
                      : `Code: ${selectedCodeToSell.code}`}
                  </Text>
                </View>
              )}

              {/* Customer Selector */}
              <Text style={styles.formLabel}>{t('selectCustomer')} (Optionnel)</Text>
              <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                <TouchableOpacity
                  style={[styles.customerPickerItem, !selectedCustomerId && styles.customerPickerItemActive]}
                  onPress={() => setSelectedCustomerId('')}
                >
                  <Text style={!selectedCustomerId ? styles.bold : {}}>Vente Comptoir (Sans fiche client)</Text>
                </TouchableOpacity>
                {customers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.customerPickerItem, selectedCustomerId === c.id && styles.customerPickerItemActive]}
                    onPress={() => setSelectedCustomerId(c.id)}
                  >
                    <Text style={selectedCustomerId === c.id ? styles.bold : {}}>{c.name} {c.phone ? `(${c.phone})` : ''}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Sell Price */}
              <Text style={[styles.formLabel, { marginTop: 12 }]}>{t('sellPrice')} ({t('currency') || 'DA'})</Text>
              <TextInput
                style={styles.formInput}
                value={sellPriceInput}
                onChangeText={setSellPriceInput}
                keyboardType="numeric"
                placeholder="Montant payé par le client"
              />

              {/* Duration */}
              <Text style={styles.formLabel}>Durée de l'abonnement</Text>
              <View style={styles.durationRow}>
                {['1', '3', '6', '12', '24'].map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[styles.durationChip, sellDurationInput === dur && styles.durationChipActive]}
                    onPress={() => setSellDurationInput(dur)}
                  >
                    <Text style={[styles.durationChipText, sellDurationInput === dur && styles.durationChipTextActive]}>
                      {dur}M
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSellModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10b981' }]} onPress={handleConfirmSell}>
                <Text style={styles.saveBtnText}>Valider la Vente</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: SUPPLIER PORTAL & HEADLESS AUTOMATED PURCHASING       */}
      {/* ============================================================== */}
      <Modal visible={supplierModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 640 }]}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="hardware-chip-outline" size={22} color="#7c3aed" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>
                  {t('iptvSupplierSettings') || 'Fournisseur IPTV & Achat Automatisé'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSupplierModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Sub-tabs header */}
            <View style={[styles.supplierSubTabsRow, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.supplierSubTab, supplierTab === 'config' && styles.supplierSubTabActive]}
                onPress={() => setSupplierTab('config')}
              >
                <Ionicons name="key-outline" size={15} color={supplierTab === 'config' ? '#7c3aed' : '#64748b'} />
                <Text style={[styles.supplierSubTabText, supplierTab === 'config' && styles.supplierSubTabTextActive]}>
                  {isRTL ? 'بيانات الدخول (Firebase)' : '1. Identifiants Firebase'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.supplierSubTab, supplierTab === 'system' && styles.supplierSubTabActive]}
                onPress={() => setSupplierTab('system')}
              >
                <Ionicons name="flash-outline" size={15} color={supplierTab === 'system' ? '#7c3aed' : '#64748b'} />
                <Text style={[styles.supplierSubTabText, supplierTab === 'system' && styles.supplierSubTabTextActive]}>
                  {isRTL ? 'الشراء والكابتشا' : '2. Achat & Captcha Combiné'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.supplierSubTab, supplierTab === 'script' && styles.supplierSubTabActive]}
                onPress={() => setSupplierTab('script')}
              >
                <Ionicons name="code-working-outline" size={15} color={supplierTab === 'script' ? '#7c3aed' : '#64748b'} />
                <Text style={[styles.supplierSubTabText, supplierTab === 'script' && styles.supplierSubTabTextActive]}>
                  {isRTL ? 'سكريبت الأتمتة' : '3. Script Navigateur'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {supplierTab === 'config' && (
                <View style={{ paddingVertical: 4 }}>
                  <View style={styles.firebasePrivateBox}>
                    <Ionicons name="lock-closed" size={16} color="#059669" />
                    <Text style={styles.firebasePrivateText}>
                      {isRTL
                        ? '🔒 معلوماتك الشخصية وبيانات الدخول للمزود مشفرة ومحفوظة حصرياً في Firebase Firestore.'
                        : '🔒 Vos informations personnelles et identifiants du fournisseur sont enregistrés strictement sur Firebase Firestore.'}
                    </Text>
                  </View>

                  <Text style={[styles.formLabel, isRTL && styles.textRight]}>
                    {t('iptvSupplierUrl') || 'URL / Lien du site fournisseur (HTTP/HTTPS)'} *
                  </Text>
                  <TextInput
                    style={[styles.formInput, isRTL && styles.textRight]}
                    value={supUrl}
                    onChangeText={setSupUrl}
                    placeholder="ex: https://panel.mon-fournisseur.com ou http://192.168.1.1..."
                    autoCapitalize="none"
                  />

                  <Text style={[styles.formLabel, isRTL && styles.textRight]}>
                    {t('iptvSupplierUsername') || 'Nom d\'utilisateur (Username)'} *
                  </Text>
                  <TextInput
                    style={[styles.formInput, isRTL && styles.textRight]}
                    value={supUser}
                    onChangeText={setSupUser}
                    placeholder="ex: revendeur_algerie"
                    autoCapitalize="none"
                  />

                  <Text style={[styles.formLabel, isRTL && styles.textRight]}>
                    {t('iptvSupplierPassword') || 'Mot de passe (Password)'} *
                  </Text>
                  <View style={styles.passInputContainer}>
                    <TextInput
                      style={[styles.formInput, { flex: 1, marginBottom: 0 }, isRTL && styles.textRight]}
                      value={supPass}
                      onChangeText={setSupPass}
                      placeholder="••••••••••••"
                      secureTextEntry={!showSupPass}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowSupPass(!showSupPass)}
                    >
                      <Ionicons
                        name={showSupPass ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.formLabel, isRTL && styles.textRight, { marginTop: 10 }]}>
                    {isRTL ? 'اسم السيرفر الافتراضي' : 'Nom du serveur par défaut'}
                  </Text>
                  <TextInput
                    style={[styles.formInput, isRTL && styles.textRight]}
                    value={supServer}
                    onChangeText={setSupServer}
                    placeholder="ex: Mega OTT / Trex / Strong 8K"
                  />

                  <Text style={[styles.formLabel, isRTL && styles.textRight]}>
                    {t('iptvSupplierApiKey') || 'Clé API Revendeur (Optionnel si panel Xtream / ZapX)'}
                  </Text>
                  <TextInput
                    style={[styles.formInput, isRTL && styles.textRight]}
                    value={supApiKey}
                    onChangeText={setSupApiKey}
                    placeholder="ex: key_abc123..."
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    style={[styles.saveSupBtn, savingSup && { opacity: 0.7 }]}
                    onPress={handleSaveSupplierConfig}
                    disabled={savingSup}
                  >
                    {savingSup ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.saveSupBtnText}>
                          {isRTL ? 'حفظ البيانات في Firebase' : 'Enregistrer sur Firebase Firestore'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {supplierTab === 'system' && (
                <View style={{ paddingVertical: 4 }}>
                  <View style={styles.headlessHeroBox}>
                    <Ionicons name="git-network" size={28} color="#7c3aed" style={{ marginBottom: 6 }} />
                    <Text style={styles.headlessHeroTitle}>
                      {t('headlessSystemTitle') || 'Système d\'Achat Automatisé & Captcha Combiné'}
                    </Text>
                    <Text style={[styles.headlessHeroText, isRTL && styles.textRight]}>
                      {t('headlessSystemDesc') || 'Intégration e-commerce headless assistée : vos identifiants sont pré-remplis automatiquement, vous résolvez le Captcha anti-robot en un clic, et les codes achetés sont instantanément interceptés et intégrés à votre stock sans aucune perte de données.'}
                    </Text>
                  </View>

                  <View style={styles.flowStepsContainer}>
                    <View style={styles.flowStepRow}>
                      <View style={[styles.stepCircle, { backgroundColor: '#7c3aed' }]}>
                        <Text style={styles.stepCircleText}>1</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.flowStepTitle}>{isRTL ? 'ملء تلقائي للبيانات' : '1. Pré-remplissage Automatique'}</Text>
                        <Text style={styles.flowStepDesc}>{isRTL ? 'يتم إدخال اسم المستخدم وكلمة المرور فورياً دون إعادة كتابتها.' : 'Vos identifiants enregistrés sur Firebase sont injectés dans les champs.'}</Text>
                      </View>
                    </View>

                    <View style={styles.flowStepRow}>
                      <View style={[styles.stepCircle, { backgroundColor: '#d97706' }]}>
                        <Text style={styles.stepCircleText}>2</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.flowStepTitle}>{isRTL ? 'حل الكابتشا المدمجة' : '2. Captcha Combiné (Vérification Humaine)'}</Text>
                        <Text style={styles.flowStepDesc}>{isRTL ? 'تحل الكابتشا بسهولة بنقرة واحدة لتجاوز حماية الموقع بأمان.' : 'Vous validez le Captcha en 1 seconde pour franchir la sécurité.'}</Text>
                      </View>
                    </View>

                    <View style={styles.flowStepRow}>
                      <View style={[styles.stepCircle, { backgroundColor: '#059669' }]}>
                        <Text style={styles.stepCircleText}>3</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.flowStepTitle}>{isRTL ? 'التقاط الشراء وحفظه في المخزون' : '3. Capture Automatique de la Commande'}</Text>
                        <Text style={styles.flowStepDesc}>{isRTL ? 'الاشتراك المشترى يرسل فورياً إلى قاعدة بيانات D1 وتطبيقك.' : 'Le code IPTV généré est transmis par Webhook directement dans D1 sans saisie manuelle.'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Webhook Endpoint Info */}
                  <View style={styles.webhookStatusBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={[styles.statusDot, { backgroundColor: '#059669', marginRight: 6 }]} />
                      <Text style={styles.webhookStatusTitle}>
                        {t('iptvWebhookLive') || 'Écouteur Webhook actif : Prêt à recevoir vos achats'}
                      </Text>
                    </View>
                    <Text style={styles.webhookStatusUrl} numberOfLines={1}>
                      🔗 {cloudflareConfig?.workerUrl ? `${cloudflareConfig.workerUrl.replace(/\/+$/, '')}/api/iptv` : 'https://votre-worker.workers.dev/api/iptv'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.launchSessionBtn}
                    onPress={handleLaunchSupplierSession}
                  >
                    <Ionicons name="open-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.launchSessionBtnText}>
                      {t('launchSupplierSession') || '🚀 Lancer la Session Fournisseur & Achat Automatisé'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {supplierTab === 'script' && (
                <View style={{ paddingVertical: 4 }}>
                  <Text style={[styles.smartHelpText, isRTL && styles.textRight]}>
                    {isRTL
                      ? 'ثبّت سكريبت الأتمتة هذا في متصفحك (عبر إضافة Tampermonkey أو كإشارة في المتصفح). سيقوم تلقائياً بتسجيل الدخول والتقاط أي كود تشتريه!'
                      : 'Ce script compagnon autonome s\'exécute dans votre navigateur (via l\'extension Tampermonkey ou comme Bookmarklet). Il injecte vos identifiants et capture instantanément vos commandes !'}
                  </Text>

                  <View style={styles.bookmarkletCodeBox}>
                    <Text style={styles.bookmarkletCodeText} selectable numberOfLines={10}>
                      {getSupplierAutomationScript()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.copyScriptBtn}
                    onPress={() => copyToClipboard(getSupplierAutomationScript(), 'Script d\'automatisation')}
                  >
                    <Ionicons name="copy-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.copyScriptBtnText}>
                      {t('automatedScriptCopy') || 'Copier le Script d\'Automatisation'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instTitle}>Comment l'utiliser avec Tampermonkey / Chrome :</Text>
                    <Text style={styles.instItem}>1. Installez l'extension gratuite Tampermonkey sur Chrome / Edge.</Text>
                    <Text style={styles.instItem}>2. Cliquez sur "Créer un nouveau script" et collez le code copié ci-dessus.</Text>
                    <Text style={styles.instItem}>3. Désormais, sur le site de votre fournisseur, vos identifiants sont pré-remplis, et dès que vous achetez un code, il est synchronisé directement dans Shop Manager !</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSupplierModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: BOOKMARKLET / WEB EXTENSION HELPER                    */}
      {/* ============================================================== */}
      <Modal visible={bookmarkletModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>⚡ {t('bookmarkletTitle')}</Text>
              <TouchableOpacity onPress={() => setBookmarkletModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.smartHelpText}>{t('bookmarkletDesc')}</Text>

              <View style={styles.bookmarkletCodeBox}>
                <Text style={styles.bookmarkletCodeText} selectable numberOfLines={8}>
                  {bookmarkletScript}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.copyScriptBtn}
                onPress={() => copyToClipboard(bookmarkletScript, 'Script Bookmarklet')}
              >
                <Ionicons name="copy-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.copyScriptBtnText}>Copier le Bookmarklet</Text>
              </TouchableOpacity>

              <View style={styles.instructionsContainer}>
                <Text style={styles.instTitle}>Comment l'installer dans Google Chrome / Edge :</Text>
                <Text style={styles.instItem}>1. Créez un nouveau favori (bookmark) dans votre barre de favoris.</Text>
                <Text style={styles.instItem}>2. Nommez-le "Envoyer à Shop Manager".</Text>
                <Text style={styles.instItem}>3. Collez le script ci-dessus dans le champ URL.</Text>
                <Text style={styles.instItem}>4. Sur votre site fournisseur, cliquez sur ce favori dès que vous achetez un code : il sera envoyé directement dans votre base D1 !</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookmarkletModalVisible(false)}>
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
  statsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 10,
  },
  statsScroll: {
    paddingHorizontal: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    minWidth: 135,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  statSub: {
    fontSize: 10.5,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#f1f5f9',
  },
  actionBtnSecondaryText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 4,
  },
  filterSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginTop: 4,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginLeft: 6,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 12,
    paddingBottom: 30,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: 12,
  },
  emptyStateDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardExpired: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffafb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  serverBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7e22ce',
  },
  typeBadge: {
    backgroundColor: '#e9d5ff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b21a8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusInStock: {
    backgroundColor: '#dcfce7',
  },
  statusInStockText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#15803d',
  },
  statusSold: {
    backgroundColor: '#dbeafe',
  },
  statusSoldText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  statusExpired: {
    backgroundColor: '#fee2e2',
  },
  statusExpiredText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#b91c1c',
  },
  cardBody: {
    marginBottom: 10,
  },
  credContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  credLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    width: 45,
  },
  credValue: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  boldMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
  codeBox: {
    backgroundColor: '#f3e8ff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  codeBoxLabel: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#7e22ce',
    marginBottom: 2,
  },
  codeBoxValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#581c87',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  durationPill: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  durationPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  expPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  expPillOk: {
    backgroundColor: '#ecfdf5',
  },
  expPillWarning: {
    backgroundColor: '#fffbeb',
  },
  expPillExpired: {
    backgroundColor: '#fef2f2',
  },
  expPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sellPriceText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#059669',
  },
  buyPriceText: {
    fontSize: 10.5,
    color: theme.colors.textMuted,
  },
  assignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  assignedText: {
    fontSize: 11.5,
    color: '#1e40af',
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    gap: 8,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  sellBtn: {
    backgroundColor: theme.colors.primary,
  },
  sellBtnText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 4,
  },
  whatsAppBtn: {
    backgroundColor: '#25D366',
  },
  whatsAppBtnText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 4,
  },
  editBtn: {
    backgroundColor: '#f1f5f9',
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  modalScroll: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  codeHighlightInput: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#6b21a8',
    backgroundColor: '#faf5ff',
    borderColor: '#d8b4fe',
  },
  serverChipsRow: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 4,
  },
  serverChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
  },
  serverChipActive: {
    backgroundColor: '#8b5cf6',
  },
  serverChipText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  serverChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  formatTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
    marginBottom: 6,
  },
  formatTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  formatTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  formatTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  formatTabTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  durationChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  durationChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  rowTwoCols: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smartHelpText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  pasteArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12.5,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  previewContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#15803d',
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  previewLabel: {
    fontSize: 11.5,
    color: '#166534',
    width: 90,
    fontWeight: '600',
  },
  previewValue: {
    flex: 1,
    fontSize: 12,
    color: '#14532d',
  },
  sellItemPreview: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sellItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  sellItemSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  customerPickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  customerPickerItemActive: {
    backgroundColor: '#eff6ff',
  },
  supplierCard: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  supplierHeadline: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  supplierText: {
    fontSize: 12.5,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 14,
  },
  stepBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 8,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    lineHeight: 17,
  },
  bookmarkletCodeBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  bookmarkletCodeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  copyScriptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    marginVertical: 6,
  },
  copyScriptBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  instructionsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  instTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  instItem: {
    fontSize: 11.5,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 3,
  },
  bold: {
    fontWeight: 'bold',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
  // Headless Supplier & Automated Purchasing Styles
  supplierSubTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 12,
  },
  supplierSubTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  supplierSubTabActive: {
    borderBottomColor: '#7c3aed',
  },
  supplierSubTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  supplierSubTabTextActive: {
    color: '#7c3aed',
    fontWeight: 'bold',
  },
  firebasePrivateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  firebasePrivateText: {
    flex: 1,
    fontSize: 11,
    color: '#065f46',
    fontWeight: '500',
    lineHeight: 16,
  },
  passInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  saveSupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 14,
    marginBottom: 6,
  },
  saveSupBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  headlessHeroBox: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  headlessHeroTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6b21a8',
    marginBottom: 6,
    textAlign: 'center',
  },
  headlessHeroText: {
    fontSize: 11.5,
    color: '#581c87',
    lineHeight: 17,
    textAlign: 'center',
  },
  flowStepsContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    gap: 12,
  },
  flowStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepCircleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  flowStepTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  flowStepDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
  webhookStatusBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  webhookStatusTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  webhookStatusUrl: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  launchSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  launchSessionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});