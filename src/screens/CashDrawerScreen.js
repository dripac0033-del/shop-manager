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

const DENOMINATIONS = [
  { value: 2000, label: '2000 DA' },
  { value: 1000, label: '1000 DA' },
  { value: 500, label: '500 DA' },
  { value: 200, label: '200 DA' },
  { value: 100, label: '100 DA' },
  { value: 50, label: '50 DA' },
  { value: 20, label: '20 DA' },
  { value: 10, label: '10 DA' },
];

export default function CashDrawerScreen() {
  const navigation = useNavigation();
  const {
    t,
    formatMoney,
    currency = 'DA',
    sales = [],
    transactions = [],
    expenses = [],
    cashDrawer = {},
    openCashDrawer,
    recordCashMovement,
    closeCashDrawer,
    currentUser,
    isRTL,
    storeInfo,
  } = useApp();

  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [movementModalVisible, setMovementModalVisible] = useState(false);
  const [movementType, setMovementType] = useState('cash_in'); // 'cash_in' | 'cash_out'
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [zReportModalVisible, setZReportModalVisible] = useState(false);
  const [selectedZReport, setSelectedZReport] = useState(null);

  // Form states
  const [openingFloatInput, setOpeningFloatInput] = useState('5000');
  const [openNotes, setOpenNotes] = useState('');

  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Denomination Counting State (Billetage)
  const [denomCounts, setDenomCounts] = useState({
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });
  const [manualCountInput, setManualCountInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

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

  const activeSession = cashDrawer?.activeSession;
  const history = cashDrawer?.sessionsHistory || [];

  // Live Calculations for current active session
  let liveOpeningFloat = 0;
  let liveCashSales = 0;
  let liveDebtPayments = 0;
  let liveRepairPayments = 0;
  let liveCashIns = 0;
  let liveCashOuts = 0;
  let liveExpenses = 0;
  let liveTheoreticalCash = 0;

  if (activeSession) {
    liveOpeningFloat = Number(activeSession.openingFloat || 0);
    const shiftStart = activeSession.openedAt;

    liveCashSales = (sales || [])
      .filter((s) => (s.date || '') >= shiftStart && s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + Number(s.total || 0), 0);

    liveDebtPayments = (transactions || [])
      .filter((tx) => (tx.date || '') >= shiftStart && tx.type === 'debt_payment')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    liveRepairPayments = (transactions || [])
      .filter((tx) => (tx.date || '') >= shiftStart && tx.type === 'repair_payment')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    liveCashIns = (activeSession.cashIns || []).reduce((sum, m) => sum + Number(m.amount || 0), 0);
    liveCashOuts = (activeSession.cashOuts || []).reduce((sum, m) => sum + Number(m.amount || 0), 0);

    liveExpenses = (expenses || [])
      .filter((e) => (e.date || '') >= shiftStart)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    liveTheoreticalCash =
      liveOpeningFloat +
      liveCashSales +
      liveDebtPayments +
      liveRepairPayments +
      liveCashIns -
      liveExpenses -
      liveCashOuts;
  }

  // Calculate counted physical cash from denominations or manual input
  const totalFromDenominations = DENOMINATIONS.reduce((sum, d) => {
    const count = Number(denomCounts[d.value] || 0);
    return sum + d.value * count;
  }, 0);

  const physicalCashCounted =
    totalFromDenominations > 0 ? totalFromDenominations : Number(manualCountInput || 0);
  const liveDifference = physicalCashCounted - liveTheoreticalCash;

  const handleOpenSession = async () => {
    const num = Number(openingFloatInput);
    if (isNaN(num) || num < 0) {
      alertMsg(isRTL ? 'يرجى إدخال مبلغ صحيح' : 'Veuillez saisir un montant de fond de caisse valide.');
      return;
    }
    try {
      await openCashDrawer({
        openingFloat: num,
        notes: openNotes.trim(),
      });
      setOpenModalVisible(false);
      showToast(isRTL ? 'تم فتح جلسة الكاسة بنجاح' : 'Session de caisse ouverte !');
    } catch (e) {
      alertMsg(e.message);
    }
  };

  const handleRecordMovement = async () => {
    const num = Number(movementAmount);
    if (!num || num <= 0) {
      alertMsg(isRTL ? 'يرجى إدخال مبلغ صحيح' : 'Veuillez saisir un montant valide.');
      return;
    }
    try {
      await recordCashMovement({
        type: movementType,
        amount: num,
        reason: movementReason.trim(),
      });
      setMovementModalVisible(false);
      setMovementAmount('');
      setMovementReason('');
      showToast(
        movementType === 'cash_in'
          ? (isRTL ? 'تم تسجيل الإيداع النقدي' : 'Entrée d\'espèces enregistrée !')
          : (isRTL ? 'تم تسجيل السحب النقدي' : 'Sortie d\'espèces enregistrée !')
      );
    } catch (e) {
      alertMsg(e.message);
    }
  };

  const handleCloseSession = async () => {
    try {
      const closed = await closeCashDrawer({
        countedCash: physicalCashCounted,
        denominations: denomCounts,
        notes: closingNotes.trim(),
      });
      setCloseModalVisible(false);
      setSelectedZReport(closed);
      setZReportModalVisible(true);
      showToast(isRTL ? 'تمت clôture الكاسة بنجاح' : 'Clôture de caisse effectuée avec succès !');
    } catch (e) {
      alertMsg(e.message);
    }
  };

  const updateDenomCount = (val, delta) => {
    setDenomCounts((prev) => ({
      ...prev,
      [val]: Math.max(0, (prev[val] || 0) + delta),
    }));
  };

  const handlePrintZReport = () => {
    if (Platform.OS === 'web') {
      const report = selectedZReport;
      if (!report) return;
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Rapport Z - Clôture de Caisse</title>
          <style>
            body { font-family: monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; }
            .center { text-align: center; }
            .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center title">${storeInfo.name || 'Store Soft'}</div>
          <div class="center">RAPPORT Z - CLÔTURE DE CAISSE</div>
          <div class="center">Session #${report.id.slice(-6)}</div>
          <div class="line"></div>
          <div class="row"><span>Ouverte le :</span><span>${new Date(report.openedAt).toLocaleString()}</span></div>
          <div class="row"><span>Clôturée le :</span><span>${new Date(report.closedAt).toLocaleString()}</span></div>
          <div class="row"><span>Caissier :</span><span>${report.closedBy || 'Admin'}</span></div>
          <div class="line"></div>
          <div class="row"><span>Fond initial :</span><span>${report.summary.openingFloat} DA</span></div>
          <div class="row"><span>Ventes Espèces :</span><span>+${report.summary.cashSalesTotal} DA</span></div>
          <div class="row"><span>Règlements Dettes :</span><span>+${report.summary.shiftDebtPayments} DA</span></div>
          <div class="row"><span>Paiements SAV :</span><span>+${report.summary.shiftRepairPayments} DA</span></div>
          <div class="row"><span>Entrées manuelles :</span><span>+${report.summary.totalCashIns} DA</span></div>
          <div class="row"><span>Dépenses décaissées :</span><span>-${report.summary.shiftExpenses} DA</span></div>
          <div class="row"><span>Sorties manuelles :</span><span>-${report.summary.totalCashOuts} DA</span></div>
          <div class="line"></div>
          <div class="row bold"><span>Solde Théorique :</span><span>${report.summary.theoreticalCash} DA</span></div>
          <div class="row bold"><span>Espèces Comptées :</span><span>${report.summary.physicalCash} DA</span></div>
          <div class="row bold" style="font-size: 14px;">
            <span>Écart (Différence) :</span>
            <span>${report.summary.difference >= 0 ? '+' : ''}${report.summary.difference} DA</span>
          </div>
          <div class="line"></div>
          <div class="center">Rapport officiel archivé avec succès.</div>
        </body>
        </html>
      `;
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(printHtml);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
      }
    } else {
      alertMsg('Rapport Z généré et archivé avec succès !');
    }
  };

  return (
    <View style={styles.container}>
      {/* Toast */}
      {toastMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Header Banner */}
      <View style={[styles.headerBanner, isRTL && styles.rowReverse]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('cashDrawer') || 'Gestion de Caisse & Rapport Z'}</Text>
          <Text style={styles.headerSubtitle}>
            {t('cashDrawerDesc') || 'Suivi du fond de caisse, billetage et rapport journalier'}
          </Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* ACTIVE SESSION CARD */}
        {activeSession ? (
          <View style={styles.activeSessionCard}>
            <View style={[styles.sessionStatusHeader, isRTL && styles.rowReverse]}>
              <View style={styles.liveBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveBadgeText}>{t('shiftActive') || 'SESSION OUVERTE'}</Text>
              </View>
              <Text style={styles.shiftTime}>
                {new Date(activeSession.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            {/* Live Cash Big Display */}
            <View style={styles.mainCashDisplay}>
              <Text style={styles.cashMainLabel}>{t('theoreticalCash') || 'Solde Théorique en Caisse'}</Text>
              <Text style={styles.cashMainValue}>{formatMoney(liveTheoreticalCash)}</Text>
              <Text style={styles.cashOpenedBy}>
                {isRTL ? 'المسؤول:' : 'Ouverte par :'} @{activeSession.openedBy || 'admin'}
              </Text>
            </View>

            {/* Breakdown Grid */}
            <View style={styles.breakdownGrid}>
              <View style={styles.breakdownItem}>
                <Text style={styles.bdLabel}>{t('openingFloat') || 'Fond Initial'}</Text>
                <Text style={styles.bdVal}>{formatMoney(liveOpeningFloat)}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.bdLabel}>Ventes Espèces</Text>
                <Text style={[styles.bdVal, { color: '#10b981' }]}>+{formatMoney(liveCashSales)}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.bdLabel}>Dettes Encaissées</Text>
                <Text style={[styles.bdVal, { color: '#10b981' }]}>+{formatMoney(liveDebtPayments)}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.bdLabel}>SAV / Réparations</Text>
                <Text style={[styles.bdVal, { color: '#10b981' }]}>+{formatMoney(liveRepairPayments)}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.bdLabel}>Entrées Manuelles</Text>
                <Text style={[styles.bdVal, { color: '#3b82f6' }]}>+{formatMoney(liveCashIns)}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.bdLabel}>Dépenses Magasin</Text>
                <Text style={[styles.bdVal, { color: '#ef4444' }]}>-{formatMoney(liveExpenses)}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.bdLabel}>Sorties Manuelles</Text>
                <Text style={[styles.bdVal, { color: '#ef4444' }]}>-{formatMoney(liveCashOuts)}</Text>
              </View>
            </View>

            {/* Action Buttons for active session */}
            <View style={[styles.sessionActionsRow, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.sessionBtn, styles.cashInBtn]}
                onPress={() => { setMovementType('cash_in'); setMovementModalVisible(true); }}
              >
                <Ionicons name="arrow-down-circle" size={17} color="#ffffff" />
                <Text style={styles.sessionBtnText}>{t('cashIn') || 'Entrée Espèces'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sessionBtn, styles.cashOutBtn]}
                onPress={() => { setMovementType('cash_out'); setMovementModalVisible(true); }}
              >
                <Ionicons name="arrow-up-circle" size={17} color="#ffffff" />
                <Text style={styles.sessionBtnText}>{t('cashOut') || 'Sortie Espèces'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sessionBtn, styles.closeShiftBtn]}
                onPress={() => {
                  setDenomCounts({ 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 });
                  setManualCountInput('');
                  setClosingNotes('');
                  setCloseModalVisible(true);
                }}
              >
                <Ionicons name="lock-closed" size={17} color="#ffffff" />
                <Text style={styles.sessionBtnText}>{t('closeShift') || 'Clôturer Z'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* NO ACTIVE SESSION */
          <View style={styles.noSessionCard}>
            <Ionicons name="lock-closed-outline" size={50} color={theme.colors.textMuted} />
            <Text style={styles.noSessionTitle}>{t('shiftClosed') || 'Caisse Actuellement Fermée'}</Text>
            <Text style={styles.noSessionDesc}>
              {isRTL
                ? 'ابدأ جلسة جديدة وحدد رصيد صندوق البداية لمتابعة الإيرادات والمصروفات'
                : 'Ouvrez une session de caisse pour commencer la journée et enregistrer les flux d\'espèces.'}
            </Text>
            <TouchableOpacity
              style={styles.openSessionBtn}
              onPress={() => { setOpeningFloatInput('5000'); setOpenNotes(''); setOpenModalVisible(true); }}
            >
              <Ionicons name="key-outline" size={18} color="#ffffff" />
              <Text style={styles.openSessionBtnText}>{t('openShift') || 'Ouvrir la Caisse'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SHIFT HISTORY SECTION */}
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>{t('shiftHistory') || 'Historique des Clôtures Z'}</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyHistoryText}>
              {isRTL ? 'لا توجد جلسات مغلقة مسجلة' : 'Aucune session archivée.'}
            </Text>
          ) : (
            history.map((h) => {
              const diff = Number(h.summary?.difference || 0);
              const isBalanced = Math.abs(diff) < 1;
              const isOver = diff > 0;
              return (
                <TouchableOpacity
                  key={h.id}
                  style={styles.historyCard}
                  onPress={() => { setSelectedZReport(h); setZReportModalVisible(true); }}
                >
                  <View style={[styles.historyHeader, isRTL && styles.rowReverse]}>
                    <View>
                      <Text style={styles.historyId}>Session #{h.id.slice(-6)}</Text>
                      <Text style={styles.historyDates}>
                        {new Date(h.openedAt).toLocaleDateString()} • {h.closedBy || 'Admin'}
                      </Text>
                    </View>
                    <View style={[styles.diffBadge, isBalanced ? styles.diffBalanced : isOver ? styles.diffOver : styles.diffShort]}>
                      <Text style={[styles.diffBadgeText, isBalanced ? styles.textBalanced : isOver ? styles.textOver : styles.textShort]}>
                        {isBalanced ? 'Équilibré (0 DA)' : (isOver ? `Excédent +${diff} DA` : `Manquant ${diff} DA`)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.historyValuesRow, isRTL && styles.rowReverse]}>
                    <Text style={styles.historyValLabel}>
                      Théorique : <Text style={styles.boldText}>{formatMoney(h.summary?.theoreticalCash || 0)}</Text>
                    </Text>
                    <Text style={styles.historyValLabel}>
                      Compté : <Text style={styles.boldText}>{formatMoney(h.summary?.physicalCash || 0)}</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* OPEN SHIFT MODAL */}
      <Modal visible={openModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>{t('openShift') || 'Ouverture de Session Caisse'}</Text>
              <TouchableOpacity onPress={() => setOpenModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>{t('openingFloat') || 'Fond de Caisse Initial'} ({currency}) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="ex: 5000, 10000"
              keyboardType="numeric"
              value={openingFloatInput}
              onChangeText={setOpeningFloatInput}
            />

            <Text style={styles.fieldLabel}>{t('notes') || 'Notes d\'Ouverture'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Monnaie de départ, observations..."
              value={openNotes}
              onChangeText={setOpenNotes}
            />

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setOpenModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleOpenSession}
              >
                <Text style={styles.saveBtnText}>{t('openShift') || 'Valider Ouverture'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MOVEMENT MODAL (CASH IN / CASH OUT) */}
      <Modal visible={movementModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>
                {movementType === 'cash_in'
                  ? (t('cashIn') || 'Entrée d\'Espèces')
                  : (t('cashOut') || 'Sortie d\'Espèces')}
              </Text>
              <TouchableOpacity onPress={() => setMovementModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>{t('amount') || 'Montant'} ({currency}) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="ex: 2000"
              keyboardType="numeric"
              value={movementAmount}
              onChangeText={setMovementAmount}
            />

            <Text style={styles.fieldLabel}>{t('notes') || 'Motif / Justification'} *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={movementType === 'cash_in' ? 'Ajout petite monnaie...' : 'Prélèvement gérant, dépense...'}
              value={movementReason}
              onChangeText={setMovementReason}
            />

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setMovementModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, movementType === 'cash_out' && { backgroundColor: '#ef4444' }]}
                onPress={handleRecordMovement}
              >
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CLOSE SHIFT MODAL (BILLETAGE) */}
      <Modal visible={closeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 550, maxHeight: '92%' }]}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>{t('closeShift') || 'Clôture de Caisse & Rapport Z'}</Text>
              <TouchableOpacity onPress={() => setCloseModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {/* Theoretical vs Counted Header */}
              <View style={styles.comparisonBox}>
                <View style={styles.compColumn}>
                  <Text style={styles.compLabel}>{t('theoreticalCash') || 'Solde Théorique'}</Text>
                  <Text style={styles.compValue}>{formatMoney(liveTheoreticalCash)}</Text>
                </View>
                <View style={styles.compColumn}>
                  <Text style={styles.compLabel}>{t('physicalCash') || 'Espèces Comptées'}</Text>
                  <Text style={[styles.compValue, { color: '#3b82f6' }]}>{formatMoney(physicalCashCounted)}</Text>
                </View>
                <View style={styles.compColumn}>
                  <Text style={styles.compLabel}>{t('cashDifference') || 'Écart'}</Text>
                  <Text
                    style={[
                      styles.compValue,
                      liveDifference === 0
                        ? { color: '#10b981' }
                        : liveDifference > 0
                        ? { color: '#10b981' }
                        : { color: '#ef4444' },
                    ]}
                  >
                    {liveDifference >= 0 ? `+${liveDifference}` : liveDifference} DA
                  </Text>
                </View>
              </View>

              {/* Denomination Counter (Billetage Dinars) */}
              <Text style={styles.subHeading}>{t('denominationCount') || 'Billetage & Comptage Dinars'}</Text>
              <View style={styles.denomGrid}>
                {DENOMINATIONS.map((d) => (
                  <View key={d.value} style={styles.denomRow}>
                    <Text style={styles.denomLabel}>{d.label}</Text>
                    <View style={styles.counterBox}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => updateDenomCount(d.value, -1)}
                      >
                        <Ionicons name="remove" size={16} color="#334155" />
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{denomCounts[d.value] || 0}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => updateDenomCount(d.value, 1)}
                      >
                        <Ionicons name="add" size={16} color="#334155" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.denomSubtotal}>
                      {formatMoney(d.value * (denomCounts[d.value] || 0))}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Or manual counted input */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                Ou saisie directe du montant total compté :
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Montant total en espèces compté..."
                keyboardType="numeric"
                value={manualCountInput}
                onChangeText={setManualCountInput}
              />

              <Text style={styles.fieldLabel}>{t('notes') || 'Remarques de clôture'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Explications si écart, observations..."
                value={closingNotes}
                onChangeText={setClosingNotes}
              />
            </ScrollView>

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setCloseModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, { backgroundColor: '#ef4444' }]}
                onPress={handleCloseSession}
              >
                <Ionicons name="checkmark-done" size={17} color="#ffffff" />
                <Text style={styles.saveBtnText}>{t('closeShift') || 'Valider Rapport Z'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Z-REPORT MODAL (OFFICIAL SUMMARY TICKET) */}
      <Modal visible={zReportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 450 }]}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>📄 Ticket Officiel Clôture Z</Text>
              <TouchableOpacity onPress={() => setZReportModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedZReport && (
              <ScrollView style={{ maxHeight: 420 }}>
                <View style={styles.ticketBox}>
                  <Text style={styles.ticketStoreName}>{storeInfo.name || 'Store Soft'}</Text>
                  <Text style={styles.ticketSubtitle}>RAPPORT Z - CLÔTURE DE CAISSE</Text>
                  <Text style={styles.ticketRef}>Session #{selectedZReport.id.slice(-6)}</Text>
                  <View style={styles.ticketDivider} />

                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Ouverte :</Text>
                    <Text style={styles.ticketVal}>{new Date(selectedZReport.openedAt).toLocaleString()}</Text>
                  </View>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Clôturée :</Text>
                    <Text style={styles.ticketVal}>{new Date(selectedZReport.closedAt).toLocaleString()}</Text>
                  </View>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Par :</Text>
                    <Text style={styles.ticketVal}>{selectedZReport.closedBy || 'Admin'}</Text>
                  </View>
                  <View style={styles.ticketDivider} />

                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Fond initial :</Text>
                    <Text style={styles.ticketVal}>{formatMoney(selectedZReport.summary?.openingFloat || 0)}</Text>
                  </View>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Ventes Espèces :</Text>
                    <Text style={styles.ticketVal}>+{formatMoney(selectedZReport.summary?.cashSalesTotal || 0)}</Text>
                  </View>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Dettes Encaissées :</Text>
                    <Text style={styles.ticketVal}>+{formatMoney(selectedZReport.summary?.shiftDebtPayments || 0)}</Text>
                  </View>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Dépenses Magasin :</Text>
                    <Text style={styles.ticketVal}>-{formatMoney(selectedZReport.summary?.shiftExpenses || 0)}</Text>
                  </View>
                  <View style={styles.ticketDivider} />

                  <View style={styles.ticketRow}>
                    <Text style={[styles.ticketLabel, styles.boldText]}>Solde Théorique :</Text>
                    <Text style={[styles.ticketVal, styles.boldText]}>
                      {formatMoney(selectedZReport.summary?.theoreticalCash || 0)}
                    </Text>
                  </View>
                  <View style={styles.ticketRow}>
                    <Text style={[styles.ticketLabel, styles.boldText]}>Espèces Comptées :</Text>
                    <Text style={[styles.ticketVal, styles.boldText]}>
                      {formatMoney(selectedZReport.summary?.physicalCash || 0)}
                    </Text>
                  </View>
                  <View style={[styles.ticketRow, { marginTop: 6 }]}>
                    <Text style={[styles.ticketLabel, styles.boldText, { fontSize: 14 }]}>Écart :</Text>
                    <Text
                      style={[
                        styles.ticketVal,
                        styles.boldText,
                        { fontSize: 14 },
                        selectedZReport.summary?.difference >= 0 ? { color: '#10b981' } : { color: '#ef4444' },
                      ]}
                    >
                      {selectedZReport.summary?.difference >= 0 ? '+' : ''}
                      {formatMoney(selectedZReport.summary?.difference || 0)}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handlePrintZReport}
              >
                <Ionicons name="print-outline" size={17} color="#ffffff" />
                <Text style={styles.saveBtnText}>{t('printZReport') || 'Imprimer Rapport Z'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setZReportModalVisible(false)}
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
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  activeSessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  sessionStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#15803d',
  },
  shiftTime: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  mainCashDisplay: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 16,
  },
  cashMainLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  cashMainValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 4,
  },
  cashOpenedBy: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  breakdownItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  bdLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  bdVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  sessionActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sessionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  cashInBtn: {
    backgroundColor: '#10b981',
  },
  cashOutBtn: {
    backgroundColor: '#f59e0b',
  },
  closeShiftBtn: {
    backgroundColor: '#ef4444',
  },
  sessionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  noSessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noSessionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 12,
  },
  noSessionDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 10,
    maxWidth: 320,
  },
  openSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    marginTop: 8,
  },
  openSessionBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  historySection: {
    marginTop: 24,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyId: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  historyDates: {
    fontSize: 11,
    color: '#94a3b8',
  },
  diffBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  diffBalanced: {
    backgroundColor: '#dcfce7',
  },
  diffOver: {
    backgroundColor: '#dbeafe',
  },
  diffShort: {
    backgroundColor: '#fee2e2',
  },
  diffBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  textBalanced: {
    color: '#15803d',
  },
  textOver: {
    color: '#1d4ed8',
  },
  textShort: {
    color: '#b91c1c',
  },
  historyValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  historyValLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  comparisonBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  compColumn: {
    alignItems: 'center',
    flex: 1,
  },
  compLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  compValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 3,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  denomGrid: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  denomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  denomLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
    width: 65,
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
  },
  counterBtn: {
    padding: 6,
  },
  counterValue: {
    fontSize: 13,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    minWidth: 32,
    textAlign: 'center',
  },
  denomSubtotal: {
    fontSize: 12,
    color: '#64748b',
    width: 70,
    textAlign: 'right',
  },
  ticketBox: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
  },
  ticketStoreName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0f172a',
  },
  ticketSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#64748b',
    marginTop: 2,
  },
  ticketRef: {
    fontSize: 11,
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 2,
  },
  ticketDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  ticketLabel: {
    fontSize: 12,
    color: '#475569',
  },
  ticketVal: {
    fontSize: 12,
    color: '#0f172a',
  },
  // Modal Common
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 4,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
