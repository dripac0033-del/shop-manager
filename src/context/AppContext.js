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
  subscribeToFirebaseSales,
  fetchSalesFromFirebase,
  fetchCustomersFromFirebase,
  fetchExpensesFromFirebase,
  saveSaleToFirebase,
  saveCustomerToFirebase,
  deleteCustomerFromFirebase,
  saveExpenseToFirebase,
  deleteExpenseFromFirebase,
  clearFirebaseCollection,
  saveStoreInfoToFirebase,
  fetchStoreInfoFromFirebase,
  subscribeToFirebaseStoreInfo,
  saveUserToFirebase,
  deleteUserFromFirebase,
  fetchUsersFromFirebase,
  subscribeToFirebaseUsers,
  DEFAULT_FIREBASE_CONFIG,
} from '../services/firebase';

const AppContext = createContext();

// Default admin user credentials requested by the user
export const DEFAULT_ADMIN_USER = {
  id: 'u_admin_hadjali',
  username: 'hadjali49',
  password: 'arezki12@@',
  name: 'Hadj Ali',
  role: 'admin', // 'admin' | 'cashier'
};

const DEFAULT_STORE_INFO = {
  name: 'Store Soft',
  phone: '',
  address: '',
  footer: 'Merci pour votre visite !',
};

export const AppProvider = ({ children }) => {
  const [language, setLanguage] = useState('fr');
  const [currency, setCurrency] = useState('DA');
  const [storeInfo, setStoreInfo] = useState(DEFAULT_STORE_INFO);

  // Core Data - 100% from Firebase Firestore (Starts empty, no local mock data)
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [sales, setSales] = useState([]);
  const [isReady, setIsReady] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([DEFAULT_ADMIN_USER]);

  // Stock Notification Modal State
  const [stockModalVisible, setStockModalVisible] = useState(false);

  // Firebase Synchronization State
  const [firebaseConfig, setFirebaseConfigState] = useState(DEFAULT_FIREBASE_CONFIG);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState('connected'); // 'connected' | 'sending' | 'receiving' | 'offline'
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const isLocalUpdateRef = useRef(false);
  const productsRef = useRef(products);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Save changes to AsyncStorage helper
  const saveState = async (key, val) => {
    try {
      await AsyncStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    } catch (e) {
      console.warn('Error saving state:', e);
    }
  };

  // ==============================================================
  // INITIAL DATA LOAD & FIREBASE HYDRATION
  // ==============================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('@store_lang');
        const storedCurrency = await AsyncStorage.getItem('@store_currency');
        const storedUser = await AsyncStorage.getItem('@session_user');
        const storedProducts = await AsyncStorage.getItem('@store_products');
        const storedCustomers = await AsyncStorage.getItem('@store_customers');
        const storedExpenses = await AsyncStorage.getItem('@store_expenses');
        const storedSales = await AsyncStorage.getItem('@store_sales');
        const storedInfo = await AsyncStorage.getItem('@store_info');

        if (storedLang) setLanguage(storedLang);
        if (storedCurrency) setCurrency(storedCurrency);
        if (storedUser) {
          try {
            setCurrentUser(JSON.parse(storedUser));
          } catch (e) {}
        }
        if (storedProducts) {
          try {
            const p = JSON.parse(storedProducts);
            if (Array.isArray(p)) setProducts(p);
          } catch (e) {}
        }
        if (storedCustomers) {
          try {
            const c = JSON.parse(storedCustomers);
            if (Array.isArray(c)) setCustomers(c);
          } catch (e) {}
        }
        if (storedExpenses) {
          try {
            const exp = JSON.parse(storedExpenses);
            if (Array.isArray(exp)) setExpenses(exp);
          } catch (e) {}
        }
        if (storedSales) {
          try {
            const s = JSON.parse(storedSales);
            if (Array.isArray(s)) setSales(s);
          } catch (e) {}
        }
        if (storedInfo) {
          try {
            const inf = JSON.parse(storedInfo);
            if (inf && typeof inf === 'object') setStoreInfo(inf);
          } catch (e) {}
        }

        // Initialize Firebase
        const storedFbConf = await getStoredFirebaseConfig();
        const activeConfig = storedFbConf && storedFbConf.apiKey ? storedFbConf : DEFAULT_FIREBASE_CONFIG;
        setFirebaseConfigState(activeConfig);
        const initRes = initFirebase(activeConfig);

        if (initRes.success) {
          setFirebaseConnected(true);
          setSyncStatus('connected');

          // Download all 6 collections directly from Firebase Firestore
          await refreshAllFromFirebase();
        } else {
          setSyncStatus('offline');
        }
      } catch (err) {
        console.warn('Error loading initial data:', err);
      } finally {
        setIsReady(true);
      }
    };

    loadData();
  }, []);

  // ==============================================================
  // PULL ALL FRESH DATA FROM FIREBASE
  // ==============================================================
  const refreshAllFromFirebase = async () => {
    if (!isFirebaseReady()) return;
    setSyncStatus('receiving');
    try {
      const [fbProducts, fbCustomers, fbExpenses, fbSales, fbInfo, fbUsers] = await Promise.all([
        fetchProductsFromFirebase().catch(() => []),
        fetchCustomersFromFirebase().catch(() => []),
        fetchExpensesFromFirebase().catch(() => []),
        fetchSalesFromFirebase().catch(() => []),
        fetchStoreInfoFromFirebase().catch(() => null),
        fetchUsersFromFirebase().catch(() => []),
      ]);

      if (Array.isArray(fbProducts)) {
        setProducts(fbProducts);
        productsRef.current = fbProducts;
        saveState('@store_products', fbProducts);
      }

      if (Array.isArray(fbCustomers)) {
        setCustomers(fbCustomers);
        saveState('@store_customers', fbCustomers);
      }

      if (Array.isArray(fbExpenses)) {
        // Exclude obsolete mock IDs e1 and e2
        const cleaned = fbExpenses.filter((e) => e.id !== 'e1' && e.id !== 'e2');
        setExpenses(cleaned);
        saveState('@store_expenses', cleaned);
      }

      if (Array.isArray(fbSales)) {
        setSales(fbSales);
        saveState('@store_sales', fbSales);
      }

      if (fbInfo && typeof fbInfo === 'object') {
        setStoreInfo(fbInfo);
        saveState('@store_info', fbInfo);
      }

      // Handle users
      if (Array.isArray(fbUsers) && fbUsers.length > 0) {
        setUsers(fbUsers);
      } else {
        // Initialize default admin user in Firestore if collection is empty
        await saveUserToFirebase(DEFAULT_ADMIN_USER).catch(console.warn);
        setUsers([DEFAULT_ADMIN_USER]);
      }

      setLastSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setSyncStatus('connected'), 500);
    } catch (err) {
      console.warn('Refresh all data error:', err);
      setSyncStatus('connected');
    }
  };

  // ==============================================================
  // AUTOMATIC REAL-TIME TWO-WAY LISTENERS (Cloud ➔ Local)
  // ==============================================================
  useEffect(() => {
    if (!firebaseConnected || !isFirebaseReady()) return;

    let unsubProducts = () => {};
    let unsubCustomers = () => {};
    let unsubExpenses = () => {};
    let unsubSales = () => {};
    let unsubStoreInfo = () => {};
    let unsubUsers = () => {};

    try {
      // 1. Products Subscription
      unsubProducts = subscribeToFirebaseProducts(
        (cloudProducts) => {
          if (isLocalUpdateRef.current) return;
          if (Array.isArray(cloudProducts)) {
            setProducts(cloudProducts);
            productsRef.current = cloudProducts;
            saveState('@store_products', cloudProducts);
            setLastSyncTime(new Date().toLocaleTimeString());
          }
        },
        (err) => console.warn('Products sync error:', err)
      );

      // 2. Customers Subscription
      unsubCustomers = subscribeToFirebaseCustomers(
        (cloudCustomers) => {
          if (isLocalUpdateRef.current) return;
          if (Array.isArray(cloudCustomers)) {
            setCustomers(cloudCustomers);
            saveState('@store_customers', cloudCustomers);
            setLastSyncTime(new Date().toLocaleTimeString());
          }
        },
        (err) => console.warn('Customers sync error:', err)
      );

      // 3. Expenses Subscription
      unsubExpenses = subscribeToFirebaseExpenses(
        (cloudExpenses) => {
          if (isLocalUpdateRef.current) return;
          if (Array.isArray(cloudExpenses)) {
            const cleaned = cloudExpenses.filter((e) => e.id !== 'e1' && e.id !== 'e2');
            setExpenses(cleaned);
            saveState('@store_expenses', cleaned);
            setLastSyncTime(new Date().toLocaleTimeString());
          }
        },
        (err) => console.warn('Expenses sync error:', err)
      );

      // 4. Sales Subscription
      unsubSales = subscribeToFirebaseSales(
        (cloudSales) => {
          if (isLocalUpdateRef.current) return;
          if (Array.isArray(cloudSales)) {
            setSales(cloudSales);
            saveState('@store_sales', cloudSales);
            setLastSyncTime(new Date().toLocaleTimeString());
          }
        },
        (err) => console.warn('Sales sync error:', err)
      );

      // 5. Store Info Subscription
      unsubStoreInfo = subscribeToFirebaseStoreInfo((cloudInfo) => {
        if (isLocalUpdateRef.current) return;
        if (cloudInfo) {
          setStoreInfo(cloudInfo);
          saveState('@store_info', cloudInfo);
        }
      });

      // 6. Users Subscription
      unsubUsers = subscribeToFirebaseUsers((cloudUsers) => {
        if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          setUsers(cloudUsers);
        }
      });
    } catch (e) {
      console.warn('Real-time sync setup error:', e);
    }

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubExpenses();
      unsubSales();
      unsubStoreInfo();
      unsubUsers();
    };
  }, [firebaseConnected]);

  // ==============================================================
  // AUTHENTICATION & USER MANAGEMENT
  // ==============================================================
  const login = async (usernameInput, passwordInput) => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    // 1. Check in state / Firestore users list
    let userList = [...users];
    let found = userList.find(
      (u) =>
        (u.username || '').trim().toLowerCase() === cleanUser &&
        (u.password || '') === cleanPass
    );

    // If not found in memory, query Firestore fresh
    if (!found && isFirebaseReady()) {
      try {
        const freshUsers = await fetchUsersFromFirebase();
        if (Array.isArray(freshUsers) && freshUsers.length > 0) {
          setUsers(freshUsers);
          found = freshUsers.find(
            (u) =>
              (u.username || '').trim().toLowerCase() === cleanUser &&
              (u.password || '') === cleanPass
          );
        }
      } catch (err) {
        console.warn('Login fresh users fetch error:', err);
      }
    }

    if (found) {
      setCurrentUser(found);
      await saveState('@session_user', found);
      return { success: true, user: found };
    }

    // 2. Check fallback default admin
    if (
      cleanUser === DEFAULT_ADMIN_USER.username.toLowerCase() &&
      cleanPass === DEFAULT_ADMIN_USER.password
    ) {
      setCurrentUser(DEFAULT_ADMIN_USER);
      await saveState('@session_user', DEFAULT_ADMIN_USER);
      return { success: true, user: DEFAULT_ADMIN_USER };
    }

    return {
      success: false,
      error:
        language === 'ar'
          ? 'اسم المستخدم أو كلمة المرور غير صحيحة!'
          : 'Identifiant ou mot de passe incorrect !',
    };
  };

  const logout = async () => {
    setCurrentUser(null);
    await AsyncStorage.removeItem('@session_user');
  };

  const addUser = async (userData) => {
    const newUser = {
      ...userData,
      id: 'u_' + Date.now().toString(),
      role: userData.role || 'cashier',
    };

    const updated = [...users, newUser];
    setUsers(updated);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await saveUserToFirebase(newUser);
      } catch (e) {
        console.warn('Add user to Firebase error:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  const deleteUser = async (userId) => {
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await deleteUserFromFirebase(userId);
      } catch (e) {
        console.warn('Delete user from Firebase error:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  // ==============================================================
  // GENERAL SETTINGS & STORE INFO
  // ==============================================================
  const updateLanguage = (lang) => {
    setLanguage(lang);
    saveState('@store_lang', lang);
  };

  const updateCurrency = (curr) => {
    setCurrency(curr);
    saveState('@store_currency', curr);
  };

  const updateStoreInfo = async (info) => {
    isLocalUpdateRef.current = true;
    setStoreInfo(info);
    saveState('@store_info', info);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await saveStoreInfoToFirebase(info);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Save store info error:', e);
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

  const t = (key) => {
    return translations[language]?.[key] || translations['fr'][key] || key;
  };

  const formatMoney = (amount) => {
    const num = Number(amount || 0).toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-DZ');
    return language === 'ar' ? `${num} ${currency === 'DA' ? 'د.ج' : currency}` : `${num} ${currency}`;
  };

  // ==============================================================
  // FIREBASE CONFIGURATION ACTIONS
  // ==============================================================
  const applyFirebaseConfig = async (newConfig) => {
    setFirebaseConfigState(newConfig);
    const res = await saveFirebaseConfig(newConfig);
    if (res.success) {
      setFirebaseConnected(true);
      setSyncStatus('connected');
      await refreshAllFromFirebase();
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
      if (cloudProducts) {
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
      createdBy: currentUser?.username || 'admin',
    };

    isLocalUpdateRef.current = true;
    const updated = [newProd, ...products];
    setProducts(updated);
    saveState('@store_products', updated);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await saveProductToFirebase(newProd);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase addProduct failed:', e);
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

    if (isFirebaseReady() && target) {
      setSyncStatus('sending');
      try {
        await saveProductToFirebase(target);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase updateProduct failed:', e);
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

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await deleteProductFromFirebase(id);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase deleteProduct failed:', e);
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

  const adjustProductStock = async (id, delta) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;
    const newStock = Math.max(0, Number(existing.stock || 0) + Number(delta));
    await updateProduct(id, { ...existing, stock: newStock });
  };

  // ==============================================================
  // CUSTOMER CRUD (Local ➔ Cloud Auto-Push)
  // ==============================================================
  const addCustomer = async (cust) => {
    const newCust = {
      ...cust,
      id: 'c_' + Date.now().toString(),
      debt: Number(cust.debt || 0),
      createdBy: currentUser?.username || 'admin',
    };
    const updated = [newCust, ...customers];
    setCustomers(updated);
    saveState('@store_customers', updated);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await saveCustomerToFirebase(newCust);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase addCustomer failed:', e);
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
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase updateCustomer failed:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  const deleteCustomer = async (id) => {
    isLocalUpdateRef.current = true;
    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    saveState('@store_customers', updated);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await deleteCustomerFromFirebase(id);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase deleteCustomer failed:', e);
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
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase recordCustomerPayment failed:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  // ==============================================================
  // EXPENSES CRUD (Local ➔ Cloud Auto-Push)
  // ==============================================================
  const addExpense = async (exp) => {
    const newExp = {
      ...exp,
      id: 'e_' + Date.now().toString(),
      date: new Date().toISOString(),
      createdBy: currentUser?.username || 'admin',
      createdByName: currentUser?.name || 'Hadj Ali',
    };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    saveState('@store_expenses', updated);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await saveExpenseToFirebase(newExp);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase addExpense failed:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  const updateExpense = async (id, fields) => {
    let target = null;
    const updated = expenses.map((e) => {
      if (e.id === id) {
        target = { ...e, ...fields, amount: Number(fields.amount || e.amount) };
        return target;
      }
      return e;
    });

    setExpenses(updated);
    saveState('@store_expenses', updated);

    if (isFirebaseReady() && target) {
      setSyncStatus('sending');
      try {
        await saveExpenseToFirebase(target);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase updateExpense failed:', e);
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
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase deleteExpense failed:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  const clearAllExpenses = async () => {
    setExpenses([]);
    await saveState('@store_expenses', []);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await clearFirebaseCollection('expenses');
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase clearAllExpenses error:', e);
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

        if (newStock <= updatedProducts[pIndex].minStock) {
          newlyTriggeredLowStockProducts.push(updatedProducts[pIndex]);
        }

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
      costOfGoods,
      cashier: currentUser?.username || 'hadjali49',
      cashierName: currentUser?.name || 'Hadj Ali',
      userId: currentUser?.id || 'u_admin_hadjali',
    };

    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    saveState('@store_sales', updatedSales);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await saveSaleToFirebase(newSale);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase saveSale failed:', e);
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

  // Wipe all data completely (Local + Firebase)
  const wipeAllData = async () => {
    isLocalUpdateRef.current = true;
    setProducts([]);
    productsRef.current = [];
    setCustomers([]);
    setExpenses([]);
    setSales([]);
    await AsyncStorage.removeItem('@store_products');
    await AsyncStorage.removeItem('@store_customers');
    await AsyncStorage.removeItem('@store_expenses');
    await AsyncStorage.removeItem('@store_sales');

    if (isFirebaseReady()) {
      try {
        setSyncStatus('sending');
        await Promise.all([
          clearFirebaseCollection('products').catch(() => {}),
          clearFirebaseCollection('customers').catch(() => {}),
          clearFirebaseCollection('expenses').catch(() => {}),
          clearFirebaseCollection('sales').catch(() => {}),
        ]);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Wipe all data error:', e);
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
        adjustProductStock,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        recordCustomerPayment,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        clearAllExpenses,
        sales,
        completeSale,
        wipeAllData,
        refreshAllFromFirebase,
        t,
        formatMoney,
        isRTL: language === 'ar',

        // Authentication & Users
        currentUser,
        users,
        login,
        logout,
        addUser,
        deleteUser,

        // Stock Notification & Modal
        stockModalVisible,
        openStockModal: () => setStockModalVisible(true),
        closeStockModal: () => setStockModalVisible(false),

        // Automatic Two-Way Firebase Synchronization
        firebaseConfig,
        firebaseConnected,
        syncStatus, // 'connected' | 'sending' | 'receiving' | 'offline'
        isSyncing: syncStatus === 'sending' || syncStatus === 'receiving',
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
