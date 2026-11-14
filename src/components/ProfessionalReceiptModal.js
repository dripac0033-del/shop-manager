import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { printReceiptDirectly, formatReceiptMoney } from '../services/receiptPrinter';

export default function ProfessionalReceiptModal({
  visible,
  onClose,
  sale,
  storeInfo = {},
  customers = [],
  currency = 'DA',
  isRTL = false,
  t,
}) {
  const [copied, setCopied] = useState(false);

  if (!visible || !sale) return null;

  const ticketNo = sale.id ? `#${sale.id.slice(-8).toUpperCase()}` : '#FAC-0001';
  const saleDate = sale.date ? new Date(sale.date) : new Date();
  const dateStr = saleDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = saleDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const customer = (customers || []).find((c) => c.id === sale.customerId);
  const customerName = customer ? customer.name : sale.customerName || (sale.customerId ? 'Client Enregistré' : 'Client Comptoir');
  const cashier = sale.cashierName || sale.cashier || 'Admin';

  const paidAmount = Number(sale.paidAmount || (sale.paymentMethod === 'cash' ? sale.total : 0));
  const change = Math.max(0, paidAmount - sale.total);
  const remainingDebt = Math.max(0, sale.total - paidAmount);

  const handlePrint = () => {
    const success = printReceiptDirectly({ sale, storeInfo, customer, currency, isRTL });
    if (!success && Platform.OS !== 'web') {
      Alert.alert(
        isRTL ? 'طباعة التذكرة' : 'Impression Reçu',
        isRTL ? 'تم تجهيز أمر الطباعة للمحرر الحراري' : 'Ticket transmis à l\'imprimante'
      );
    }
  };

  const generatePlainText = () => {
    const lines = [];
    lines.push(`🧾 *${storeInfo.name || 'Store Soft'}*`);
    if (storeInfo.address) lines.push(`📍 ${storeInfo.address}`);
    if (storeInfo.phone) lines.push(`📞 ${storeInfo.phone}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`Ticket: ${ticketNo} • Date: ${dateStr} ${timeStr}`);
    lines.push(`Caissier: ${cashier} • Client: ${customerName}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🛒 ARTICLES :`);
    (sale.items || []).forEach((item) => {
      const name = item.nameFr || item.nameAr || 'Article';
      lines.push(`• ${name} x${item.quantity} = ${formatReceiptMoney(item.sellPrice * item.quantity, currency)}`);
    });
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    if (sale.discount > 0) lines.push(`Remise: -${formatReceiptMoney(sale.discount, currency)}`);
    lines.push(`💰 *TOTAL NET : ${formatReceiptMoney(sale.total, currency)}*`);
    lines.push(`Mode: ${sale.paymentMethod === 'credit' ? 'Crédit' : 'Espèces'}`);
    if (change > 0) lines.push(`Monnaie rendue: ${formatReceiptMoney(change, currency)}`);
    if (remainingDebt > 0) lines.push(`Reste dû: ${formatReceiptMoney(remainingDebt, currency)}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(storeInfo.footer || 'Merci pour votre visite !');
    return lines.join('\n');
  };

  const handleCopy = () => {
    const text = generatePlainText();
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      Alert.alert(isRTL ? 'تم نسخ التذكرة' : 'Ticket copié', text);
    }
  };

  const handleWhatsApp = () => {
    const text = generatePlainText();
    const phone = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const intlPhone = phone ? (phone.startsWith('0') ? '213' + phone.substring(1) : phone) : '';
    const url = intlPhone ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => Alert.alert('WhatsApp', text));
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="receipt" size={22} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>
                {isRTL ? 'تذكرة البيع الاحترافية' : 'Reçu de Caisse Professionnel'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Thermal Receipt Paper Card Preview */}
          <ScrollView style={styles.paperScroll} contentContainerStyle={styles.paperContent}>
            <View style={styles.thermalPaper}>
              {/* Store Title */}
              <Text style={styles.storeName}>{storeInfo.name || 'STORE SOFT'}</Text>
              {storeInfo.address ? <Text style={styles.storeSub}>{storeInfo.address}</Text> : null}
              {storeInfo.phone ? <Text style={styles.storeSub}>Tél : {storeInfo.phone}</Text> : null}
              {storeInfo.nif ? <Text style={styles.storeSub}>NIF: {storeInfo.nif} {storeInfo.rc ? `• RC: ${storeInfo.rc}` : ''}</Text> : null}

              <View style={styles.dashedDivider} />

              {/* Meta Grid */}
              <View style={styles.metaRow}>
                <Text style={styles.metaLeft}>TICKET : {ticketNo}</Text>
                <Text style={styles.metaRight}>DATE : {dateStr}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLeft}>CAISSE : {cashier}</Text>
                <Text style={styles.metaRight}>HEURE : {timeStr}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLeft} numberOfLines={1}>
                  CLIENT : {customerName}
                </Text>
              </View>

              <View style={styles.doubleDivider} />

              {/* Items Table */}
              <View style={styles.itemsHeader}>
                <Text style={[styles.itemColHeader, { flex: 2 }]}>DÉSIGNATION</Text>
                <Text style={[styles.itemColHeader, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
              </View>
              <View style={styles.solidDivider} />

              {(sale.items || []).map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.itemName}>{item.nameFr || item.nameAr || 'Article'}</Text>
                    <Text style={styles.itemSub}>
                      {item.quantity} x {formatReceiptMoney(item.sellPrice, currency)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>
                    {formatReceiptMoney(item.sellPrice * item.quantity, currency)}
                  </Text>
                </View>
              ))}

              <View style={styles.dashedDivider} />

              {/* Totals */}
              {sale.discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Sous-total :</Text>
                  <Text style={styles.summaryValue}>
                    {formatReceiptMoney((sale.subtotal || sale.total + sale.discount), currency)}
                  </Text>
                </View>
              )}
              {sale.discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#dc2626' }]}>Remise :</Text>
                  <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
                    -{formatReceiptMoney(sale.discount, currency)}
                  </Text>
                </View>
              )}

              <View style={styles.grandTotalBox}>
                <Text style={styles.grandTotalLabel}>NET À PAYER :</Text>
                <Text style={styles.grandTotalValue}>{formatReceiptMoney(sale.total, currency)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Mode de règlement :</Text>
                <Text style={styles.summaryValue}>
                  {sale.paymentMethod === 'credit' ? 'CRÉDIT' : sale.paymentMethod === 'partial' ? 'PARTIEL' : 'ESPÈCES'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Montant versé :</Text>
                <Text style={styles.summaryValue}>{formatReceiptMoney(paidAmount, currency)}</Text>
              </View>

              {change > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#16a34a' }]}>Monnaie rendue :</Text>
                  <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{formatReceiptMoney(change, currency)}</Text>
                </View>
              )}

              {remainingDebt > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#dc2626' }]}>Reste dû (Dette) :</Text>
                  <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{formatReceiptMoney(remainingDebt, currency)}</Text>
                </View>
              )}

              {/* Visual barcode mockup on ticket */}
              <View style={styles.barcodeBox}>
                <Ionicons name="barcode" size={48} color="#000000" />
                <Text style={styles.barcodeText}>*{ticketNo.replace('#', '')}*</Text>
              </View>

              <View style={styles.dashedDivider} />

              {/* Footer notes */}
              <Text style={styles.footerNote}>{storeInfo.footer || 'Merci pour votre visite et à bientôt !'}</Text>
              <Text style={styles.footerSubNote}>
                Les articles vendus ne sont repris que sur présentation de ce ticket sous 48h.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons Toolbar */}
          <View style={styles.actionsBar}>
            <TouchableOpacity style={styles.printActionBtn} onPress={handlePrint}>
              <Ionicons name="print" size={20} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.printActionBtnText}>
                {isRTL ? 'طباعة التذكرة' : 'Imprimer le Reçu'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.waActionBtn} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.copyActionBtn} onPress={handleCopy}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={18}
                color={copied ? '#16a34a' : theme.colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{isRTL ? 'إغلاق' : 'Fermer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  paperScroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  paperContent: {
    padding: 16,
    alignItems: 'center',
  },
  thermalPaper: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  storeName: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  storeSub: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 1,
  },
  dashedDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    marginVertical: 10,
  },
  doubleDivider: {
    borderTopWidth: 2,
    borderColor: '#0f172a',
    marginVertical: 8,
  },
  solidDivider: {
    borderTopWidth: 1,
    borderColor: '#0f172a',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  metaLeft: {
    fontSize: 10.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    color: '#334155',
  },
  metaRight: {
    fontSize: 10.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#334155',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  itemColHeader: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemName: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  itemSub: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  itemTotal: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  grandTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginVertical: 6,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#0f172a',
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  grandTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  barcodeBox: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  barcodeText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  footerNote: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#334155',
  },
  footerSubNote: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  printActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginRight: 8,
  },
  printActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  waActionBtn: {
    padding: 10,
    backgroundColor: '#25D366',
    borderRadius: 12,
    marginRight: 6,
  },
  copyActionBtn: {
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginRight: 6,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});
