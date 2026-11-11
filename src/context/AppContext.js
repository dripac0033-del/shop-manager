import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../constants/translations';
import {
  initFirebase,
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  isFirebaseReady,
  saveProductToFirebase,
  deleteProductFromFirebase,
  updateProductStockInFirebase,
  uploadAllProductsToFirebase,
  fetchProductsFromFirebase,
  subscribeToFirebaseProducts,
  subscribeToFirebaseCustomers,
  subscribeToFirebaseExpenses,
  saveSaleToFirebase,
  saveCustomerToFirebase,
  saveExpenseToFirebase,
  deleteExpenseFromFirebase,
  DEFAULT_FIREBASE_CONFIG,
} from '../services/firebase';

const AppContext = createContext();

const INITIAL_PRODUCTS = [
  { id: '1', barcode: '6130001001', nameFr: 'Eau Minérale Lalla Khedidja 1.5L', nameAr: 'ماء معدني لالة خديجة 1.5 لتر', category: 'Boissons', buyPrice: 32, sellPrice: 40, stock: 48, minStock: 12 },
  { id: '2', barcode: '6130001002', nameFr: 'Lait Candia Silhouette 1L', nameAr: 'حليب كانديا 1 لتر', category: 'Produits Laitiers', buyPrice: 110, sellPrice: 130, stock: 24, minStock: 10 },
  { id: '3', barcode: '6130001003', nameFr: 'Huile Elio 5L', nameAr: 'زيت إيليو 5 لتر', category: 'Alimentation', buyPrice: 580, sellPrice: 650, stock: 15, minStock: 5 },
  { id: '4', barcode: '6130001004', nameFr: 'Café Moulu Bonal 250g', nameAr: 'قهوة بونال 250 غرام', category: 'Alimentation', buyPrice: 220, sellPrice: 260, stock: 30, minStock: 8 },
  { id: '5', barcode: '6130001005', nameFr: 'Fromage Tartino 16 Portions', nameAr: 'جبن تارتينو 16 قطعة', category: 'Produits Laitiers', buyPrice: 180, sellPrice: 220, stock: 18, minStock: 6 },
  { id: '6', barcode: '6130001006', nameFr: 'Biscuits Bimo Gaufritos', nameAr: 'بسكويت بيمو غوفريط', category: 'Snacks & Biscuits', buyPrice: 45, sellPrice: 60, stock: 50, minStock: 15 },
  { id: '7', barcode: '6130001007', nameFr: 'Savon Liquide Test 500ml', nameAr: 'صابون سائل تيست 500 مل', category: 'Entretien & Hygiène', buyPrice: 160, sellPrice: 210, stock: 4, minStock: 6 },
];

const INITIAL_CUSTOMERS = [
  { id: 'c1', name: 'Karim Benali', phone: '0555 12 34 56', address: 'Quartier 1er Mai', debt: 3400 },
  { id: 'c2', name: 'Ahmed Mansouri', phone: '0661 78 90 12', address: 'Rue Didouche Mourad', debt: 1200 },
  { id: 'c3', name: 'Mourad Belkacem', phone: '0770 45 67 89', address: 'Bab El Oued', debt: 0 },
];

const INITIAL_EXPENSES = [
  { id: 'e1', title: 'Facture Électricité Sonelgaz', category: 'electricity', amount: 4500, date: new Date().toISOString() },
  { id: 'e2', title: 'Achat Sacs Plastiques Emballage', category: 'maintenance', amount: 1200, date: new Date().toISOString() },
];

const INITIAL_STORE_INFO = {
  name: 'Superette El Baraka',
  phone: '0550 99 88 77',
  address: 'Rue Principale, Alger',
  footer: 'Merci de votre visite et à bientôt !'
};

export const AppProvider = ({ children }) => {
  const [language, setLanguage] = useState('fr');
  const [currency, setCurrency] = useState('DA');
  const [storeInfo, setStoreInfo] = useState(INITIAL_STORE_INFO);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [sales, setSales] = useState([]);
  const [isReady, setIsReady] = useState(false);

  // Stock Notification State
  const [stockModalVisible, setStockModalVisible] = useState(false);

  // Firebase Automatic Two-Way Synchronization State
  const [firebaseConfig, setFirebaseConfigState] = useState(DEFAULT_FIREBASE_CONFIG);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState('connected'); // 'connected' | 'sending' | 'receiving' | 'offline'
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const isLocalUpdateRef = useRef(false);
  const productsRef = useRef(products);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Load from AsyncStorage on mount and init Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('@store_lang');
        const storedCurrency = await AsyncStorage.getItem('@store_currency');
        const storedProducts = await AsyncStorage.getItem('@store_products');
        const storedCustomers = await AsyncStorage.getItem('@store_customers');
        const storedExpenses = await AsyncStorage.getItem('@store_expenses');
        const storedSales = await AsyncStorage.getItem('@store_sales');
        const storedInfo = await AsyncStorage.getItem('@store_info');

        if (storedLang) setLanguage(storedLang);
        if (storedCurrency) setCurrency(storedCurrency);

        if (storedProducts) {
          try {
            const parsed = JSON.parse(storedProducts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setProducts(parsed);
              productsRef.current = parsed;
            } else {
              setProducts(INITIAL_PRODUCTS);
              productsRef.current = INITIAL_PRODUCTS;
              saveState('@store_products', INITIAL_PRODUCTS);
            }
          } catch (e) {
            setProducts(INITIAL_PRODUCTS);
            productsRef.current = INITIAL_PRODUCTS;
            saveState('@store_products', INITIAL_PRODUCTS);
          }
        } else {
          setProducts(INITIAL_PRODUCTS);
          productsRef.current = INITIAL_PRODUCTS;
          saveState('@store_products', INITIAL_PRODUCTS);
        }

        if (storedCustomers) {
          try {
            const parsed = JSON.parse(storedCustomers);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCustomers(parsed);
            } else {
              setCustomers(INITIAL_CUSTOMERS);
            }
          } catch (e) {
            setCustomers(INITIAL_CUSTOMERS);
          }
        }

        if (storedExpenses) {
          try {
            const parsed = JSON.parse(storedExpenses);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setExpenses(parsed);
            } else {
              setExpenses(INITIAL_EXPENSES);
            }
          } catch (e) {
            setExpenses(INITIAL_EXPENSES);
          }
        }

        if (storedSales) {
          try {
            const parsed = JSON.parse(storedSales);
            if (Array.isArray(parsed)) setSales(parsed);
          } catch (e) {}
        }

        if (storedInfo) {
          try {
            const parsed = JSON.parse(storedInfo);
            if (parsed && typeof parsed === 'object') setStoreInfo(parsed);
          } catch (e) {}
        }

        // Load & Initialize Firebase
        const storedFbConf = await getStoredFirebaseConfig();
        const activeConfig = (storedFbConf && storedFbConf.apiKey) ? storedFbConf : DEFAULT_FIREBASE_CONFIG;
        setFirebaseConfigState(activeConfig);
        const initRes = initFirebase(activeConfig);
        if (initRes.success) {
          setFirebaseConnected(true);
          setSyncStatus('connected');
        } else {
          setSyncStatus('offline');
        }
      } catch (err) {
        console.warn('Error loading persisted data:', err);
      } finally {
        setIsReady(true);
      }
    };
    loadData();
  }, []);

  // Save changes to local storage
  const saveState = async (key, val) => {
    try {
      await AsyncStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    } catch (e) {
      console.warn('Error saving state:', e);
    }
  };

  // ==============================================================
  // AUTOMATIC REAL-TIME TWO-WAY LISTENER (Cloud ➔ Local)
  // ==============================================================
  useEffect(() => {
    if (!firebaseConnected || !isFirebaseReady()) return;

    let unsubProducts = () => {};
    let unsubCustomers = () => {};
    let unsubExpenses = () => {};

    try {
      // 1. Products Real-time Subscription
      unsubProducts = subscribeToFirebaseProducts(
        async (cloudProducts) => {
          if (isLocalUpdateRef.current) return;

          setSyncStatus('receiving');
          if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
            // Received real-time updates from Firebase
            setProducts(cloudProducts);
            productsRef.current = cloudProducts;
            saveState('@store_products', cloudProducts);
            setLastSyncTime(new Date().toLocaleTimeString());
            setTimeout(() => setSyncStatus('connected'), 600);
          } else {
            // Cloud collection is empty on Firebase!
            // Do NOT overwrite local products with an empty list.
            // Automatically push our local catalog to Firestore to initialize the cloud database!
            const seed = (productsRef.current && productsRef.current.length > 0)
              ? productsRef.current
              : INITIAL_PRODUCTS;
            
            setProducts(seed);
            productsRef.current = seed;
            saveState('@store_products', seed);

            setSyncStatus('sending');
            try {
              await uploadAllProductsToFirebase(seed);
              setLastSyncTime(new Date().toLocaleTimeString());
            } catch (err) {
              console.warn('Auto-seed cloud error:', err);
            } finally {
              setTimeout(() => setSyncStatus('connected'), 600);
            }
          }
        },
        (err) => console.warn('Products sync listener error:', err)
      );

      // 2. Customers Real-time Subscription
      unsubCustomers = subscribeToFirebaseCustomers(
        (cloudCustomers) => {
          if (isLocalUpdateRef.current) return;

          if (cloudCustomers && cloudCustomers.length > 0) {
            setCustomers(cloudCustomers);
            saveState('@store_customers', cloudCustomers);
            setLastSyncTime(new Date().toLocaleTimeString());
          }
        },
        (err) => console.warn('Customers sync listener error:', err)
      );

      // 3. Expenses Real-time Subscription
      unsubExpenses = subscribeToFirebaseExpenses(
        (cloudExpenses) => {
          if (isLocalUpdateRef.current) return;

          if (cloudExpenses && cloudExpenses.length > 0) {
            setExpenses(cloudExpenses);
            saveState('@store_expenses', cloudExpenses);
          }
        },
        (err) => console.warn('Expenses sync listener error:', err)
      );
    } catch (e) {
      console.warn('Real-time sync setup error:', e);
    }

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubExpenses();
    };
  }, [firebaseConnected]);

  const updateLanguage = (lang) => {
    setLanguage(lang);
    saveState('@store_lang', lang);
  };

  const updateCurrency = (curr) => {
    setCurrency(curr);
    saveState('@store_currency', curr);
  };

  const updateStoreInfo = (info) => {
    setStoreInfo(info);
    saveState('@store_info', info);
  };

  const t = (key) => {
    return translations[language]?.[key] || translations['fr'][key] || key;
  };

  const formatMoney = (amount) => {
    const num = Number(amount || 0).toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-DZ');
    return language === 'ar' ? `${num} ${currency === 'DA' ? 'د.ج' : currency}` : `${num} ${currency}`;
  };

  // Firebase manual actions
  const applyFirebaseConfig = async (newConfig) => {
    setFirebaseConfigState(newConfig);
    const res = await saveFirebaseConfig(newConfig);
    if (res.success) {
      setFirebaseConnected(true);
      setSyncStatus('connected');
      return { success: true };
    } else {
      setFirebaseConnected(false);
      setSyncStatus('offline');
      return { success: false, error: res.error || res.reason };
    }
  };

  const uploadStockToCloud = async () => {
    setSyncStatus('sending');
    try {
      const res = await uploadAllProductsToFirebase(products);
      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncStatus('connected');
      return res;
    } catch (e) {
      setSyncStatus('connected');
      throw e;
    }
  };

  const downloadStockFromCloud = async () => {
    setSyncStatus('receiving');
    try {
      const cloudProducts = await fetchProductsFromFirebase();
      if (cloudProducts && cloudProducts.length > 0) {
        setProducts(cloudProducts);
        saveState('@store_products', cloudProducts);
        setLastSyncTime(new Date().toLocaleTimeString());
        setSyncStatus('connected');
        return { success: true, count: cloudProducts.length };
      }
      setSyncStatus('connected');
      return { success: false, message: 'Aucun produit trouvé sur Firebase' };
    } catch (e) {
      setSyncStatus('connected');
      throw e;
    }
  };

  // ==============================================================
  // PRODUCT CRUD (Local ➔ Cloud Auto-Push)
  // ==============================================================
  const addProduct = async (prod) => {
    const newProd = {
      ...prod,
      id: prod.id || Date.now().toString(),
      stock: Number(prod.stock || 0),
      minStock: Number(prod.minStock || 5),
      buyPrice: Number(prod.buyPrice || 0),
      sellPrice: Number(prod.sellPrice || 0),
    };

    isLocalUpdateRef.current = true;
    const updated = [newProd, ...products];
    setProducts(updated);
    saveState('@store_products', updated);

    // Auto-send to Firebase Firestore
    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await saveProductToFirebase(newProd);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase addProduct auto-send failed:', e);
      } finally {
        setTimeout(() => {
          isLocalUpdateRef.current = false;
          setSyncStatus('connected');
        }, 500);
      }
    } else {
      isLocalUpdateRef.current = false;
    }
  };

  const updateProduct = async (id, updatedFields) => {
    let target = null;
    isLocalUpdateRef.current = true;

    const updated = products.map((p) => {
      if (p.id === id) {
        const merged = { ...p, ...updatedFields };
        target = {
          ...merged,
          stock: Number(merged.stock || 0),
          minStock: Number(merged.minStock || 5),
          buyPrice: Number(merged.buyPrice || 0),
          sellPrice: Number(merged.sellPrice || 0),
        };
        return target;
      }
      return p;
    });

    setProducts(updated);
    saveState('@store_products', updated);

    // Auto-send to Firebase Firestore
    if (isFirebaseReady() && target) {
      setSyncStatus('sending');
      try {
        await saveProductToFirebase(target);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase updateProduct auto-send failed:', e);
      } finally {
        setTimeout(() => {
          isLocalUpdateRef.current = false;
          setSyncStatus('connected');
        }, 500);
      }
    } else {
      isLocalUpdateRef.current = false;
    }
  };

  const deleteProduct = async (id) => {
    isLocalUpdateRef.current = true;
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    saveState('@store_products', updated);

    // Auto-delete from Firebase Firestore
    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await deleteProductFromFirebase(id);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase deleteProduct auto-send failed:', e);
      } finally {
        setTimeout(() => {
          isLocalUpdateRef.current = false;
          setSyncStatus('connected');
        }, 500);
      }
    } else {
      isLocalUpdateRef.current = false;
    }
  };

  // ==============================================================
  // CUSTOMER CRUD (Local ➔ Cloud Auto-Push)
  // ==============================================================
  const addCustomer = async (cust) => {
    const newCust = { ...cust, id: 'c_' + Date.now().toString(), debt: Number(cust.debt || 0) };
    const updated = [newCust, ...customers];
    setCustomers(updated);
    saveState('@store_customers', updated);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await saveCustomerToFirebase(newCust);
      } catch (e) {
        console.warn('Firebase addCustomer auto-send failed:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  const updateCustomer = async (id, fields) => {
    let target = null;
    const updated = customers.map((c) => {
      if (c.id === id) {
        target = { ...c, ...fields };
        return target;
      }
      return c;
    });

    setCustomers(updated);
    saveState('@store_customers', updated);

    if (isFirebaseReady() && target) {
      setSyncStatus('sending');
      try {
        await saveCustomerToFirebase(target);
      } catch (e) {
        console.warn('Firebase updateCustomer auto-send failed:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  const recordCustomerPayment = async (customerId, paidAmount, note) => {
    const amount = Number(paidAmount);
    let targetCustomer = null;

    const updated = customers.map((c) => {
      if (c.id === customerId) {
        const remaining = Math.max(0, c.debt - amount);
        targetCustomer = { ...c, debt: remaining };
        return targetCustomer;
      }
      return c;
    });

    setCustomers(updated);
    saveState('@store_customers', updated);

    if (isFirebaseReady() && targetCustomer) {
      setSyncStatus('sending');
      try {
        await saveCustomerToFirebase(targetCustomer);
      } catch (e) {
        console.warn('Firebase recordCustomerPayment auto-send failed:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  // ==============================================================
  // EXPENSES CRUD (Local ➔ Cloud Auto-Push)
  // ==============================================================
  const addExpense = async (exp) => {
    const newExp = { ...exp, id: 'e_' + Date.now().toString(), date: new Date().toISOString() };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    saveState('@store_expenses', updated);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await saveExpenseToFirebase(newExp);
      } catch (e) {
        console.warn('Firebase addExpense auto-send failed:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  const deleteExpense = async (id) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    saveState('@store_expenses', updated);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await deleteExpenseFromFirebase(id);
      } catch (e) {
        console.warn('Firebase deleteExpense auto-send failed:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  // ==============================================================
  // COMPLETE SALE & POS (Calculations, Stock Reduction & Auto-Send)
  // ==============================================================
  const completeSale = async (saleData) => {
    const saleId = 's_' + Date.now().toString();
    const date = new Date().toISOString();

    let costOfGoods = 0;
    const updatedProducts = [...products];
    const newlyTriggeredLowStockProducts = [];

    saleData.items.forEach((item) => {
      const pIndex = updatedProducts.findIndex((p) => p.id === item.id);
      if (pIndex !== -1) {
        costOfGoods += updatedProducts[pIndex].buyPrice * item.quantity;
        const newStock = Math.max(0, updatedProducts[pIndex].stock - item.quantity);
        updatedProducts[pIndex] = {
          ...updatedProducts[pIndex],
          stock: newStock,
        };

        // Check if stock just reached or fell below minimum limit
        if (newStock <= updatedProducts[pIndex].minStock) {
          newlyTriggeredLowStockProducts.push(updatedProducts[pIndex]);
        }

        // Auto-update single product stock in Firebase Firestore
        if (isFirebaseReady()) {
          updateProductStockInFirebase(item.id, newStock);
        }
      }
    });

    const netProfit = saleData.total - costOfGoods;

    // Handle customer debt if credit or partial
    let debtorCustomer = null;
    if (saleData.customerId && (saleData.paymentMethod === 'credit' || saleData.paymentMethod === 'partial')) {
      const remainingDebt = Math.max(0, saleData.total - Number(saleData.paidAmount || 0));
      const updatedCustomers = customers.map((c) => {
        if (c.id === saleData.customerId) {
          debtorCustomer = { ...c, debt: c.debt + remainingDebt };
          return debtorCustomer;
        }
        return c;
      });
      setCustomers(updatedCustomers);
      saveState('@store_customers', updatedCustomers);

      // Auto-sync updated customer debt to Firebase
      if (isFirebaseReady() && debtorCustomer) {
        saveCustomerToFirebase(debtorCustomer);
      }
    }

    isLocalUpdateRef.current = true;
    setProducts(updatedProducts);
    saveState('@store_products', updatedProducts);

    const newSale = {
      ...saleData,
      id: saleId,
      date,
      profit: netProfit,
    };
    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    saveState('@store_sales', updatedSales);

    // Auto-save sale record to Firebase Firestore
    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await saveSaleToFirebase(newSale);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase saveSale auto-send failed:', e);
      } finally {
        setTimeout(() => {
          isLocalUpdateRef.current = false;
          setSyncStatus('connected');
        }, 500);
      }
    } else {
      isLocalUpdateRef.current = false;
    }

    return {
      sale: newSale,
      lowStockWarnings: newlyTriggeredLowStockProducts,
    };
  };

  // Restore default sample catalog
  const restoreDefaultProducts = async () => {
    isLocalUpdateRef.current = true;
    setProducts(INITIAL_PRODUCTS);
    productsRef.current = INITIAL_PRODUCTS;
    await saveState('@store_products', INITIAL_PRODUCTS);
    if (isFirebaseReady()) {
      try {
        setSyncStatus('sending');
        await uploadAllProductsToFirebase(INITIAL_PRODUCTS);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Restore products cloud sync error:', e);
      } finally {
        setTimeout(() => {
          isLocalUpdateRef.current = false;
          setSyncStatus('connected');
        }, 500);
      }
    } else {
      isLocalUpdateRef.current = false;
    }
  };

  // Reset demo
  const resetDemoData = async () => {
    isLocalUpdateRef.current = true;
    setProducts(INITIAL_PRODUCTS);
    productsRef.current = INITIAL_PRODUCTS;
    setCustomers(INITIAL_CUSTOMERS);
    setExpenses(INITIAL_EXPENSES);
    setSales([]);
    setStoreInfo(INITIAL_STORE_INFO);
    await AsyncStorage.clear();
    await saveState('@store_products', INITIAL_PRODUCTS);
    await saveState('@store_customers', INITIAL_CUSTOMERS);
    await saveState('@store_expenses', INITIAL_EXPENSES);
    await saveState('@store_info', INITIAL_STORE_INFO);

    if (isFirebaseReady()) {
      try {
        setSyncStatus('sending');
        await uploadAllProductsToFirebase(INITIAL_PRODUCTS);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Reset demo cloud upload error:', e);
      } finally {
        setTimeout(() => {
          isLocalUpdateRef.current = false;
          setSyncStatus('connected');
        }, 500);
      }
    } else {
      isLocalUpdateRef.current = false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage: updateLanguage,
        currency,
        setCurrency: updateCurrency,
        storeInfo,
        setStoreInfo: updateStoreInfo,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        restoreDefaultProducts,
        customers,
        addCustomer,
        updateCustomer,
        recordCustomerPayment,
        expenses,
        addExpense,
        deleteExpense,
        sales,
        completeSale,
        resetDemoData,
        t,
        formatMoney,
        isRTL: language === 'ar',

        // Stock Notification & Modal
        stockModalVisible,
        openStockModal: () => setStockModalVisible(true),
        closeStockModal: () => setStockModalVisible(false),

        // Automatic Two-Way Firebase Synchronization
        firebaseConfig,
        firebaseConnected,
        syncStatus, // 'connected' | 'sending' | 'receiving' | 'offline'
        lastSyncTime,
        applyFirebaseConfig,
        uploadStockToCloud,
        downloadStockFromCloud,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
