import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function BarcodeGeneratorScreen() {
  const navigation = useNavigation();
  const {
    t,
    formatMoney,
    currency = 'DA',
    products = [],
    storeInfo,
    isRTL,
  } = useApp();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Custom Tag Fields
  const [labelName, setLabelName] = useState('Écouteurs Sans Fil Pro');
  const [labelPrice, setLabelPrice] = useState('2500');
  const [labelBarcode, setLabelBarcode] = useState('613245678901');
  const [labelOldPrice, setLabelOldPrice] = useState('3200');
  const [labelCategory, setLabelCategory] = useState('Accessoires');

  // Format: 'shelf' | 'mini' | 'promo'
  const [tagFormat, setTagFormat] = useState('shelf');
  const [printQuantity, setPrintQuantity] = useState(6);

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setLabelName(prod.nameFr || prod.nameAr || 'Article');
    setLabelPrice(prod.sellPrice ? String(prod.sellPrice) : '0');
    setLabelBarcode(prod.barcode || generateRandomBarcode());
    setLabelCategory(prod.category || 'Général');
    setShowProductDropdown(false);
  };

  const generateRandomBarcode = () => {
    // Generate standard 12-digit EAN-like code
    const prefix = '200';
    const rand = Math.floor(100000000 + Math.random() * 900000000);
    const code = `${prefix}${rand}`;
    setLabelBarcode(code);
    return code;
  };

  const filteredCatalog = (products || []).filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      (p.nameFr || '').toLowerCase().includes(q) ||
      (p.nameAr || '').includes(q) ||
      (p.barcode || '').includes(q)
    );
  }).slice(0, 10);

  // Print Action
  const handlePrint = () => {
    if (Platform.OS === 'web') {
      const storeName = storeInfo.name || 'Store Soft';
      const storePhone = storeInfo.phone || '';
      const todayDate = new Date().toLocaleDateString();

      let tagHtml = '';
      for (let i = 0; i < printQuantity; i++) {
        if (tagFormat === 'shelf') {
          tagHtml += `
            <div class="tag shelf-tag">
              <div class="store-hdr">${storeName}</div>
              <div class="prod-title">${labelName}</div>
              <div class="cat-name">${labelCategory}</div>
              <div class="price-box">${labelPrice} <span class="currency">${currency}</span></div>
              <div class="barcode-svg">
                <div class="bars"></div>
                <div class="code-txt">${labelBarcode}</div>
              </div>
              <div class="tag-footer">Réf: ${labelBarcode.slice(-6)} • ${todayDate}</div>
            </div>
          `;
        } else if (tagFormat === 'promo') {
          tagHtml += `
            <div class="tag promo-tag">
              <div class="promo-badge">PROMOTION</div>
              <div class="prod-title">${labelName}</div>
              <div class="old-price">Ancien: ${labelOldPrice} ${currency}</div>
              <div class="promo-price">${labelPrice} <span class="currency">${currency}</span></div>
              <div class="barcode-svg">
                <div class="bars"></div>
                <div class="code-txt">${labelBarcode}</div>
              </div>
            </div>
          `;
        } else {
          // Mini tag
          tagHtml += `
            <div class="tag mini-tag">
              <div class="prod-title-mini">${labelName}</div>
              <div class="price-mini">${labelPrice} ${currency}</div>
              <div class="code-mini">${labelBarcode}</div>
            </div>
          `;
        }
      }

      const fullPrintDoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Impression Étiquettes - ${labelName}</title>
          <style>
            @media print {
              @page { margin: 6mm; size: auto; }
              body { margin: 0; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; }
            .grid { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start; }
            .tag {
              box-sizing: border-box;
              border: 1px dashed #475569;
              background: #fff;
              page-break-inside: avoid;
              text-align: center;
              position: relative;
            }
            .shelf-tag {
              width: 58mm;
              height: 38mm;
              padding: 4px 6px;
              border-radius: 4px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .store-hdr { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
            .prod-title { font-size: 11px; font-weight: bold; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
            .cat-name { font-size: 8px; color: #94a3b8; }
            .price-box { font-size: 18px; font-weight: 900; color: #000; letter-spacing: -0.5px; }
            .currency { font-size: 11px; font-weight: bold; }
            .bars {
              height: 14px;
              background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 5px, #fff 5px, #fff 8px);
              margin: 2px auto;
              width: 80%;
            }
            .code-txt { font-family: monospace; font-size: 8px; letter-spacing: 1px; color: #334155; }
            .tag-footer { font-size: 7px; color: #94a3b8; }

            .promo-tag {
              width: 58mm;
              height: 42mm;
              padding: 6px;
              border: 2px solid #ef4444;
              border-radius: 6px;
            }
            .promo-badge { background: #ef4444; color: #fff; font-weight: 900; font-size: 10px; padding: 2px; border-radius: 3px; letter-spacing: 1px; }
            .old-price { font-size: 10px; color: #94a3b8; text-decoration: line-through; margin-top: 2px; }
            .promo-price { font-size: 20px; font-weight: 900; color: #ef4444; }

            .mini-tag {
              width: 40mm;
              height: 25mm;
              padding: 3px;
              border: 1px solid #94a3b8;
              border-radius: 3px;
            }
            .prod-title-mini { font-size: 9px; font-weight: bold; }
            .price-mini { font-size: 13px; font-weight: 900; color: #000; }
            .code-mini { font-family: monospace; font-size: 8px; }
          </style>
        </head>
        <body>
          <div class="grid">
            ${tagHtml}
          </div>
        </body>
        </html>
      `;

      const win = window.open('', '_blank');
      if (win) {
        win.document.write(fullPrintDoc);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 350);
      }
    } else {
      Alert.alert(
        isRTL ? 'طباعة الملصقات' : 'Impression',
        isRTL
          ? `جاهز لطباعة ${printQuantity} ملصق للمنتج "${labelName}"`
          : `Prêt à imprimer ${printQuantity} étiquettes pour "${labelName}"`
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={[styles.headerBanner, isRTL && styles.rowReverse]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('barcodeGenerator') || 'Étiquettes Prix & Codes-Barres'}</Text>
          <Text style={styles.headerSubtitle}>
            {t('barcodeGeneratorDesc') || 'Générez et imprimez des étiquettes pour vos rayons et produits'}
          </Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* SELECT FROM CATALOG */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeading}>Choisir un Produit du Catalogue (Optionnel)</Text>
          <View style={[styles.catalogSearchRow, isRTL && styles.rowReverse]}>
            <TextInput
              style={styles.catalogSearchInput}
              placeholder="Rechercher par nom ou code-barres..."
              value={productSearch}
              onChangeText={(txt) => {
                setProductSearch(txt);
                setShowProductDropdown(true);
              }}
              onFocus={() => setShowProductDropdown(true)}
            />
            {productSearch ? (
              <TouchableOpacity onPress={() => { setProductSearch(''); setShowProductDropdown(false); }}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {showProductDropdown && filteredCatalog.length > 0 ? (
            <View style={styles.dropdownList}>
              {filteredCatalog.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectProduct(p)}
                >
                  <Text style={styles.dropdownItemName}>{p.nameFr || p.nameAr}</Text>
                  <Text style={styles.dropdownItemPrice}>{formatMoney(p.sellPrice)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {/* LABEL CONFIGURATION FORM */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeading}>Personnalisation de l'Étiquette</Text>

          <Text style={styles.fieldLabel}>{t('productName') || 'Nom du Produit'} *</Text>
          <TextInput
            style={styles.formInput}
            value={labelName}
            onChangeText={setLabelName}
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.fieldLabel}>{t('price') || 'Prix de Vente'} ({currency}) *</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={labelPrice}
                onChangeText={setLabelPrice}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{t('category') || 'Catégorie'}</Text>
              <TextInput
                style={styles.formInput}
                value={labelCategory}
                onChangeText={setLabelCategory}
              />
            </View>
          </View>

          {tagFormat === 'promo' && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.fieldLabel}>Ancien Prix (Barré) ({currency})</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={labelOldPrice}
                onChangeText={setLabelOldPrice}
              />
            </View>
          )}

          <Text style={styles.fieldLabel}>{t('barcode') || 'Code-barres (Chiffres)'}</Text>
          <View style={[styles.barcodeInputRow, isRTL && styles.rowReverse]}>
            <TextInput
              style={[styles.formInput, { flex: 1, marginRight: 8 }]}
              value={labelBarcode}
              onChangeText={setLabelBarcode}
            />
            <TouchableOpacity style={styles.genBarcodeBtn} onPress={generateRandomBarcode}>
              <Ionicons name="dice-outline" size={16} color="#ffffff" />
              <Text style={styles.genBarcodeBtnText}>Générer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FORMAT SELECTOR */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeading}>{t('shelfTagFormat') || 'Format d\'Étiquette'}</Text>
          <View style={styles.formatPillsRow}>
            <TouchableOpacity
              style={[styles.formatPill, tagFormat === 'shelf' && styles.formatPillActive]}
              onPress={() => setTagFormat('shelf')}
            >
              <Ionicons name="pricetag-outline" size={16} color={tagFormat === 'shelf' ? '#ffffff' : '#475569'} />
              <Text style={[styles.formatPillText, tagFormat === 'shelf' && styles.formatPillTextActive]}>
                Rayon 50x30mm
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.formatPill, tagFormat === 'promo' && styles.formatPillActive]}
              onPress={() => setTagFormat('promo')}
            >
              <Ionicons name="flame-outline" size={16} color={tagFormat === 'promo' ? '#ffffff' : '#ef4444'} />
              <Text style={[styles.formatPillText, tagFormat === 'promo' && styles.formatPillTextActive]}>
                Spécial Promo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.formatPill, tagFormat === 'mini' && styles.formatPillActive]}
              onPress={() => setTagFormat('mini')}
            >
              <Ionicons name="barcode-outline" size={16} color={tagFormat === 'mini' ? '#ffffff' : '#475569'} />
              <Text style={[styles.formatPillText, tagFormat === 'mini' && styles.formatPillTextActive]}>
                Mini Bijou / Câble
              </Text>
            </TouchableOpacity>
          </View>

          {/* QUANTITY PICKER */}
          <View style={[styles.qtyRow, isRTL && styles.rowReverse]}>
            <Text style={styles.qtyLabel}>Quantité à imprimer :</Text>
            <View style={styles.qtyOptions}>
              {[1, 4, 6, 12, 24].map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.qtyBtn, printQuantity === q && styles.qtyBtnActive]}
                  onPress={() => setPrintQuantity(q)}
                >
                  <Text style={[styles.qtyBtnText, printQuantity === q && styles.qtyBtnTextActive]}>
                    {q}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* LIVE VISUAL PREVIEW CARD */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Aperçu Réel Avant Impression</Text>
          <View style={styles.tagWrapper}>
            {tagFormat === 'shelf' && (
              <View style={styles.previewShelfTag}>
                <Text style={styles.previewStoreHdr}>{storeInfo.name || 'Store Soft'}</Text>
                <Text style={styles.previewProdName} numberOfLines={1}>{labelName}</Text>
                <Text style={styles.previewCatName}>{labelCategory}</Text>
                <Text style={styles.previewPriceVal}>
                  {labelPrice} <Text style={{ fontSize: 13 }}>{currency}</Text>
                </Text>
                {/* Simulated Barcode Lines */}
                <View style={styles.simBarcode}>
                  <View style={styles.simLines} />
                  <Text style={styles.simCodeText}>{labelBarcode}</Text>
                </View>
              </View>
            )}

            {tagFormat === 'promo' && (
              <View style={styles.previewPromoTag}>
                <View style={styles.previewPromoBadge}>
                  <Text style={styles.previewPromoBadgeText}>PROMOTION</Text>
                </View>
                <Text style={styles.previewProdName} numberOfLines={1}>{labelName}</Text>
                <Text style={styles.previewOldPrice}>{labelOldPrice} {currency}</Text>
                <Text style={[styles.previewPriceVal, { color: '#ef4444' }]}>
                  {labelPrice} <Text style={{ fontSize: 13 }}>{currency}</Text>
                </Text>
                <View style={styles.simBarcode}>
                  <View style={styles.simLines} />
                  <Text style={styles.simCodeText}>{labelBarcode}</Text>
                </View>
              </View>
            )}

            {tagFormat === 'mini' && (
              <View style={styles.previewMiniTag}>
                <Text style={[styles.previewProdName, { fontSize: 11 }]} numberOfLines={1}>{labelName}</Text>
                <Text style={[styles.previewPriceVal, { fontSize: 16 }]}>
                  {labelPrice} {currency}
                </Text>
                <Text style={styles.simCodeText}>{labelBarcode}</Text>
              </View>
            )}
          </View>
        </View>

        {/* PRINT BUTTON */}
        <TouchableOpacity style={styles.printBigBtn} onPress={handlePrint}>
          <Ionicons name="print" size={20} color="#ffffff" />
          <Text style={styles.printBigBtnText}>
            {t('printTags') || 'Lancer l\'Impression'} ({printQuantity} étiquettes)
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
  },
  catalogSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catalogSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  dropdownList: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    marginTop: 6,
    maxHeight: 180,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemName: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  dropdownItemPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
  },
  formRow: {
    flexDirection: 'row',
  },
  barcodeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  genBarcodeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  formatPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  formatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 6,
  },
  formatPillActive: {
    backgroundColor: theme.colors.primary,
  },
  formatPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 4,
  },
  formatPillTextActive: {
    color: '#ffffff',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  qtyLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  qtyOptions: {
    flexDirection: 'row',
  },
  qtyBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginLeft: 6,
  },
  qtyBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  qtyBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  qtyBtnTextActive: {
    color: '#ffffff',
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
  },
  tagWrapper: {
    padding: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
  },
  previewShelfTag: {
    width: 220,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewStoreHdr: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewProdName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginVertical: 3,
    textAlign: 'center',
  },
  previewCatName: {
    fontSize: 9,
    color: '#64748b',
  },
  previewPriceVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginVertical: 4,
  },
  simBarcode: {
    alignItems: 'center',
    marginTop: 2,
    width: '100%',
  },
  simLines: {
    width: 140,
    height: 18,
    backgroundColor: '#000',
    borderRadius: 2,
  },
  simCodeText: {
    fontSize: 10,
    color: '#334155',
    letterSpacing: 1,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewPromoTag: {
    width: 220,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  previewPromoBadge: {
    backgroundColor: '#ef4444',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  previewPromoBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  previewOldPrice: {
    fontSize: 11,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  previewMiniTag: {
    width: 160,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  printBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  printBigBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
