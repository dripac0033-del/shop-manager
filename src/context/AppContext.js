import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../constants/translations';
import {
  initFirebase,
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  isFirebaseReady,
  // Products
  saveProductToFirebase,
  deleteProductFromFirebase,
  updateProductStockInFirebase,
  uploadAllProductsToFirebase,
  fetchProductsFromFirebase,
  subscribeToFirebaseProducts,
  // Categories
  saveCategoryToFirebase,
  deleteCategoryFromFirebase,
  fetchCategoriesFromFirebase,
  subscribeToFirebaseCategories,
  // Customers
  saveCustomerToFirebase,
  deleteCustomerFromFirebase,
  fetchCustomersFromFirebase,
  subscribeToFirebaseCustomers,
  // Sales
  saveSaleToFirebase,
  fetchSalesFromFirebase,
  subscribeToFirebaseSales,
  // Transactions
  saveTransactionToFirebase,
  fetchTransactionsFromFirebase,
  subscribeToFirebaseTransactions,
  // Services
  saveServiceToFirebase,
  deleteServiceFromFirebase,
  fetchServicesFromFirebase,
  subscribeToFirebaseServices,
  // Repairs
  saveRepairToFirebase,
  deleteRepairFromFirebase,
  fetchRepairsFromFirebase,
  subscribeToFirebaseRepairs,
  // Expenses
  saveExpenseToFirebase,
  deleteExpenseFromFirebase,
  fetchExpensesFromFirebase,
  subscribeToFirebaseExpenses,
  // Users
  saveUserToFirebase,
  deleteUserFromFirebase,
  fetchUsersFromFirebase,
  subscribeToFirebaseUsers,
  // Store Info
  saveStoreInfoToFirebase,
  fetchStoreInfoFromFirebase,
  subscribeToFirebaseStoreInfo,
  // Helpers
  clearFirebaseCollection,
  DEFAULT_FIREBASE_CONFIG,
} from '../services/firebase';

const AppContext = createContext();

// Default admin user
export const DEFAULT_ADMIN_USER = {
  id: 'u_admin_hadjali',
  username: 'hadjali49',
  password: 'arezki12@@',
  name: 'Hadj Ali',
  role: 'admin', // 'admin' | 'cashier' | 'technician'
  createdAt: new Date().toISOString(),
};

const DEFAULT_STORE_INFO = {
  name: 'Store Soft',
  phone: '',
  address: '',
  footer: 'Merci pour votre visite !',
};

// Default starter categories
const DEFAULT_CATEGORIES = [
  { id: 'cat_1', nameFr: 'Alimentation', nameAr: 'مواد غذائية', color: '#10b981' },
  { id: 'cat_2', nameFr: 'Boissons', nameAr: 'مشروبات', color: '#3b82f6' },
  { id: 'cat_3', nameFr: 'Cosmétique', nameAr: 'مواد تجميل', color: '#ec4899' },
  { id: 'cat_4', nameFr: 'Électronique', nameAr: 'إلكترونيات', color: '#8b5cf6' },
  { id: 'cat_5', nameFr: 'Services & Réparation', nameAr: 'خدمات وصيانة', color: '#f59e0b' },
  { id: 'cat_6', nameFr: 'Divers', nameAr: 'متنوعات', color: '#64748b' },
];

// Session timeout default: 30 minutes in milliseconds
const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export const AppProvider = ({ children }) => {
  const [language, setLanguage] = useState('fr');
  const [currency, setCurrency] = useState('DA');
  const [storeInfo, setStoreInfo] = useState(DEFAULT_STORE_INFO);

  // Core Data Tables (Offline-First: Local storage is king, syncs to Firebase)
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [services, setServices] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [users, setUsers] = useState([DEFAULT_ADMIN_USER]);
  const [isReady, setIsReady] = useState(false);

  // Authentication & Session
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);

  // Stock Notification Modal State
  const [stockModalVisible, setStockModalVisible] = useState(false);

  // Firebase Synchronization State
  const [firebaseConfig, setFirebaseConfigState] = useState(DEFAULT_FIREBASE_CONFIG);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState('connected'); // 'connected' | 'sending' | 'receiving' | 'offline'
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const isLocalUpdateRef = useRef(false);
  const lastActivityRef = useRef(Date.now());

  // Save changes to AsyncStorage safely
  const saveState = async (key, val) => {
    try {
      await AsyncStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    } catch (e) {
      console.warn(`Error saving ${key}:`, e);
    }
  };

  // Activity pulse for session management
  const touchActivity = () => {
    lastActivityRef.current = Date.now();
  };

  // Session inactivity watchdog
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      const timeoutMs = (sessionTimeoutMinutes || 30) * 60 * 1000;
      if (Date.now() - lastActivityRef.current > timeoutMs) {
        logout(true);
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [currentUser, sessionTimeoutMinutes]);

  // ==============================================================
  // INITIAL DATA LOAD (Offline-First: Local first, then Cloud hydration)
  // ==============================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('@store_lang');
        const storedCurrency = await AsyncStorage.getItem('@store_currency');
        const storedUser = await AsyncStorage.getItem('@session_user');
        const storedLastActive = await AsyncStorage.getItem('@last_activity_time');
        const storedTimeout = await AsyncStorage.getItem('@session_timeout');

        const storedProducts = await AsyncStorage.getItem('@store_products');
        const storedCategories = await AsyncStorage.getItem('@store_categories');
        const storedCustomers = await AsyncStorage.getItem('@store_customers');
        const storedSales = await AsyncStorage.getItem('@store_sales');
        const storedTransactions = await AsyncStorage.getItem('@store_transactions');
        const storedServices = await AsyncStorage.getItem('@store_services');
        const storedRepairs = await AsyncStorage.getItem('@store_repairs');
        const storedExpenses = await AsyncStorage.getItem('@store_expenses');
        const storedUsers = await AsyncStorage.getItem('@store_users');
        const storedInfo = await AsyncStorage.getItem('@store_info');

        if (storedLang) setLanguage(storedLang);
        if (storedCurrency) setCurrency(storedCurrency);

        let activeTimeout = 30;
        if (storedTimeout) {
          activeTimeout = Number(storedTimeout) || 30;
          setSessionTimeoutMinutes(activeTimeout);
        }

        // Check if previous session expired
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            const lastTime = storedLastActive ? Number(storedLastActive) : 0;
            const now = Date.now();
            if (lastTime > 0 && now - lastTime > activeTimeout * 60 * 1000) {
              // Session expired
              await AsyncStorage.removeItem('@session_user');
              setSessionExpiredNotice(true);
            } else {
              setCurrentUser(parsedUser);
              lastActivityRef.current = Date.now();
            }
          } catch (e) {}
        }

        // Hydrate local data safely (never wipe!)
        if (storedProducts) {
          try {
            const p = JSON.parse(storedProducts);
            if (Array.isArray(p)) setProducts(p);
          } catch (e) {}
        }
        if (storedCategories) {
          try {
            const cat = JSON.parse(storedCategories);
            if (Array.isArray(cat) && cat.length > 0) setCategories(cat);
          } catch (e) {}
        }
        if (storedCustomers) {
          try {
            const c = JSON.parse(storedCustomers);
            if (Array.isArray(c)) setCustomers(c);
          } catch (e) {}
        }
        if (storedSales) {
          try {
            const s = JSON.parse(storedSales);
            if (Array.isArray(s)) setSales(s);
          } catch (e) {}
        }
        if (storedTransactions) {
          try {
            const t = JSON.parse(storedTransactions);
            if (Array.isArray(t)) setTransactions(t);
          } catch (e) {}
        }
        if (storedServices) {
          try {
            const srv = JSON.parse(storedServices);
            if (Array.isArray(srv)) setServices(srv);
          } catch (e) {}
        }
        if (storedRepairs) {
          try {
            const rep = JSON.parse(storedRepairs);
            if (Array.isArray(rep)) setRepairs(rep);
          } catch (e) {}
        }
        if (storedExpenses) {
          try {
            const exp = JSON.parse(storedExpenses);
            if (Array.isArray(exp)) setExpenses(exp);
          } catch (e) {}
        }
        if (storedUsers) {
          try {
            const u = JSON.parse(storedUsers);
            if (Array.isArray(u) && u.length > 0) setUsers(u);
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
          // Refresh from Firebase safely (without wiping local data)
          await refreshAllFromFirebase();
        } else {
          setSyncStatus('offline');
        }
      } catch (err) {
        console.warn('Error during loadData:', err);
      } finally {
        setIsReady(true);
      }
    };

    loadData();
  }, []);

  // ==============================================================
  // SAFE REFRESH FROM CLOUD (NEVER OVERWRITES LOCAL DATA WITH EMPTY!)
  // ==============================================================
  const refreshAllFromFirebase = async () => {
    if (!isFirebaseReady()) return;
    setSyncStatus('receiving');
    try {
      const [
        fbProducts,
        fbCategories,
        fbCustomers,
        fbSales,
        fbTransactions,
        fbServices,
        fbRepairs,
        fbExpenses,
        fbUsers,
        fbInfo,
      ] = await Promise.all([
        fetchProductsFromFirebase().catch(() => []),
        fetchCategoriesFromFirebase().catch(() => []),
        fetchCustomersFromFirebase().catch(() => []),
        fetchSalesFromFirebase().catch(() => []),
        fetchTransactionsFromFirebase().catch(() => []),
        fetchServicesFromFirebase().catch(() => []),
        fetchRepairsFromFirebase().catch(() => []),
        fetchExpensesFromFirebase().catch(() => []),
        fetchUsersFromFirebase().catch(() => []),
        fetchStoreInfoFromFirebase().catch(() => null),
      ]);

      // 1. Products: only overwrite if cloud returned products, otherwise preserve local!
      if (Array.isArray(fbProducts) && fbProducts.length > 0) {
        setProducts(fbProducts);
        saveState('@store_products', fbProducts);
      }

      // 2. Categories
      if (Array.isArray(fbCategories) && fbCategories.length > 0) {
        setCategories(fbCategories);
        saveState('@store_categories', fbCategories);
      }

      // 3. Customers
      if (Array.isArray(fbCustomers) && fbCustomers.length > 0) {
        setCustomers(fbCustomers);
        saveState('@store_customers', fbCustomers);
      }

      // 4. Sales
      if (Array.isArray(fbSales) && fbSales.length > 0) {
        setSales(fbSales);
        saveState('@store_sales', fbSales);
      }

      // 5. Transactions
      if (Array.isArray(fbTransactions) && fbTransactions.length > 0) {
        setTransactions(fbTransactions);
        saveState('@store_transactions', fbTransactions);
      }

      // 6. Services
      if (Array.isArray(fbServices) && fbServices.length > 0) {
        setServices(fbServices);
        saveState('@store_services', fbServices);
      }

      // 7. Repairs
      if (Array.isArray(fbRepairs) && fbRepairs.length > 0) {
        setRepairs(fbRepairs);
        saveState('@store_repairs', fbRepairs);
      }

      // 8. Expenses
      if (Array.isArray(fbExpenses) && fbExpenses.length > 0) {
        setExpenses(fbExpenses);
        saveState('@store_expenses', fbExpenses);
      }

      // 9. Users
      if (Array.isArray(fbUsers) && fbUsers.length > 0) {
        setUsers(fbUsers);
        saveState('@store_users', fbUsers);
      } else {
        // Ensure default admin user is saved to Firestore
        await saveUserToFirebase(DEFAULT_ADMIN_USER).catch(() => {});
      }

      // 10. Store Info
      if (fbInfo && typeof fbInfo === 'object') {
        setStoreInfo(fbInfo);
        saveState('@store_info', fbInfo);
      }

      setLastSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setSyncStatus('connected'), 400);
    } catch (err) {
      console.warn('Refresh all data error:', err);
      setSyncStatus('connected');
    }
  };

  // ==============================================================
  // REAL-TIME TWO-WAY LISTENERS (Cloud -> Local Safe Sync)
  // ==============================================================
  useEffect(() => {
    if (!firebaseConnected || !isFirebaseReady()) return;

    let unsubProducts = () => {};
    let unsubCategories = () => {};
    let unsubCustomers = () => {};
    let unsubSales = () => {};
    let unsubTransactions = () => {};
    let unsubServices = () => {};
    let unsubRepairs = () => {};
    let unsubExpenses = () => {};
    let unsubUsers = () => {};
    let unsubStoreInfo = () => {};

    try {
      unsubProducts = subscribeToFirebaseProducts((cloud) => {
        if (isLocalUpdateRef.current) return;
        if (Array.isArray(cloud) && cloud.length > 0) {
          setProducts(cloud);
          saveState('@store_products', cloud);
        }
      });

      unsubCategories = subscribeToFirebaseCategories((cloud) => {
        if (isLocalUpdateRef.current) return;
        if (Array.isArray(cloud) && cloud.length > 0) {
          setCategories(cloud);
          saveState('@store_categories', cloud);
        }
      });

      unsubCustomers = subscribeToFirebaseCustomers((cloud) => {
        if (isLocalUpdateRef.current) return;
        if (Array.isArray(cloud) && cloud.length > 0) {
          setCustomers(cloud);
          saveState('@store_customers', cloud);
        }
      });

      unsubSales = subscribeToFirebaseSales((cloud) => {
        if (isLocalUpdateRef.current) return;
        if (Array.isArray(cloud) && cloud.length > 0) {
          setSales(cloud);
          saveState('@store_sales', cloud);
        }
      });

      unsubTransactions = subscribeToFirebaseTransactions((cloud) => {
        if (isLocalUpdateRef.current) return;
        if (Array.isArray(cloud) && cloud.length > 0) {
          setTransactions(cloud);
          saveState('@store_transactions', cloud);
        }
      });

      unsubServices = subscribeToFirebaseServices((cloud) => {
        if (isLocalUpdateRef.current) return;
        if (Array.isArray(cloud) && cloud.length > 0) {
          setServices(cloud);
          saveState('@store_services', cloud);
        }
      });

      unsubRepairs = subscribeToFirebaseRepairs((cloud) => {
        if (isLocalUpdateRef.current) return;
        if (Array.isArray(cloud) && cloud.length > 0) {
          setRepairs(cloud);
          saveState('@store_repairs', cloud);
        }
      });

      unsubExpenses = subscribeToFirebaseExpenses((cloud) => {
        if (isLocalUpdateRef.current) return;
        if (Array.isArray(cloud) && cloud.length > 0) {
          setExpenses(cloud);
          saveState('@store_expenses', cloud);
        }
      });

      unsubUsers = subscribeToFirebaseUsers((cloud) => {
        if (Array.isArray(cloud) && cloud.length > 0) {
          setUsers(cloud);
          saveState('@store_users', cloud);
        }
      });

      unsubStoreInfo = subscribeToFirebaseStoreInfo((cloud) => {
        if (isLocalUpdateRef.current) return;
        if (cloud) {
          setStoreInfo(cloud);
          saveState('@store_info', cloud);
        }
      });
    } catch (e) {
      console.warn('Real-time sync subscription error:', e);
    }

    return () => {
      unsubProducts();
      unsubCategories();
      unsubCustomers();
      unsubSales();
      unsubTransactions();
      unsubServices();
      unsubRepairs();
      unsubExpenses();
      unsubUsers();
      unsubStoreInfo();
    };
  }, [firebaseConnected]);

  // ==============================================================
  // AUTHENTICATION & USERS (Dedicated Collection `users`)
  // ==============================================================
  const login = async (usernameInput, passwordInput) => {
    touchActivity();
    setSessionExpiredNotice(false);
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    let userList = [...users];
    let found = userList.find(
      (u) =>
        (u.username || '').trim().toLowerCase() === cleanUser &&
        (u.password || '') === cleanPass
    );

    if (!found && isFirebaseReady()) {
      try {
        const freshUsers = await fetchUsersFromFirebase();
        if (Array.isArray(freshUsers) && freshUsers.length > 0) {
          setUsers(freshUsers);
          saveState('@store_users', freshUsers);
          found = freshUsers.find(
            (u) =>
              (u.username || '').trim().toLowerCase() === cleanUser &&
              (u.password || '') === cleanPass
          );
        }
      } catch (err) {
        console.warn('Login fresh fetch error:', err);
      }
    }

    // Default admin fallback
    if (!found && cleanUser === DEFAULT_ADMIN_USER.username.toLowerCase() && cleanPass === DEFAULT_ADMIN_USER.password) {
      found = DEFAULT_ADMIN_USER;
    }

    if (found) {
      setCurrentUser(found);
      lastActivityRef.current = Date.now();
      await saveState('@session_user', found);
      await saveState('@last_activity_time', String(Date.now()));
      return { success: true, user: found };
    }

    return {
      success: false,
      error: language === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صحيحة!' : 'Identifiant ou mot de passe incorrect !',
    };
  };

  const logout = async (isExpired = false) => {
    setCurrentUser(null);
    await AsyncStorage.removeItem('@session_user');
    await AsyncStorage.removeItem('@last_activity_time');
    if (isExpired) {
      setSessionExpiredNotice(true);
    }
  };

  const addUser = async (userData) => {
    touchActivity();
    const newUser = {
      ...userData,
      id: 'u_' + Date.now().toString(),
      role: userData.role || 'cashier',
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    setUsers(updated);
    saveState('@store_users', updated);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await saveUserToFirebase(newUser);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Add user to Firebase error:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
    return newUser;
  };

  const deleteUser = async (userId) => {
    touchActivity();
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    saveState('@store_users', updated);

    if (isFirebaseReady()) {
      setSyncStatus('sending');
      try {
        await deleteUserFromFirebase(userId);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Delete user from Firebase error:', e);
      } finally {
        setSyncStatus('connected');
      }
    }
  };

  // ==============================================================
  // TRANSACTION LEDGER (Every Sale, Return, Payment, Expense)
  // ==============================================================
  const recordTransaction = async (txData) => {
    const newTx = {
      ...txData,
      id: 'tx_' + Date.now().toString() + '_' + Math.floor(Math.random() * 1000),
      date: txData.date || new Date().toISOString(),
      cashier: currentUser?.username || 'admin',
      cashierName: currentUser?.name || 'Admin',
    };

    const updated = [newTx, ...transactions];
    setTransactions(updated);
    saveState('@store_transactions', updated);

    if (isFirebaseReady()) {
      try {
        await saveTransactionToFirebase(newTx);
      } catch (e) {
        console.warn('recordTransaction error:', e);
      }
    }
    return newTx;
  };

  // ==============================================================
  // PRODUCTS CRUD
  // ==============================================================
  const addProduct = async (prod) => {
    touchActivity();
    const newProd = {
      ...prod,
      id: prod.id || Date.now().toString(),
      stock: Number(prod.stock || 0),
      minStock: Number(prod.minStock || 5),
      buyPrice: Number(prod.buyPrice || 0),
      sellPrice: Number(prod.sellPrice || 0),
      createdBy: currentUser?.username || 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    return newProd;
  };

  const updateProduct = async (id, updatedFields) => {
    touchActivity();
    let target = null;
    isLocalUpdateRef.current = true;

    const updated = products.map((p) => {
      if (p.id === id) {
        target = {
          ...p,
          ...updatedFields,
          stock: Number(updatedFields.stock !== undefined ? updatedFields.stock : p.stock),
          minStock: Number(updatedFields.minStock !== undefined ? updatedFields.minStock : p.minStock),
          buyPrice: Number(updatedFields.buyPrice !== undefined ? updatedFields.buyPrice : p.buyPrice),
          sellPrice: Number(updatedFields.sellPrice !== undefined ? updatedFields.sellPrice : p.sellPrice),
          updatedAt: new Date().toISOString(),
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
    return target;
  };

  const deleteProduct = async (id) => {
    touchActivity();
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
    touchActivity();
    const existing = products.find((p) => p.id === id);
    if (!existing) return;
    const newStock = Math.max(0, Number(existing.stock || 0) + Number(delta));
    await updateProduct(id, { ...existing, stock: newStock });
  };

  // ==============================================================
  // CATEGORIES CRUD
  // ==============================================================
  const addCategory = async (catData) => {
    touchActivity();
    const newCat = {
      ...catData,
      id: 'cat_' + Date.now().toString(),
      nameFr: catData.nameFr.trim(),
      nameAr: (catData.nameAr || catData.nameFr).trim(),
      color: catData.color || '#10b981',
      createdAt: new Date().toISOString(),
    };

    const updated = [...categories, newCat];
    setCategories(updated);
    saveState('@store_categories', updated);

    if (isFirebaseReady()) {
      try {
        await saveCategoryToFirebase(newCat);
      } catch (e) {
        console.warn('saveCategory error:', e);
      }
    }
    return newCat;
  };

  const deleteCategory = async (catId) => {
    touchActivity();
    const updated = categories.filter((c) => c.id !== catId);
    setCategories(updated);
    saveState('@store_categories', updated);

    if (isFirebaseReady()) {
      try {
        await deleteCategoryFromFirebase(catId);
      } catch (e) {
        console.warn('deleteCategory error:', e);
      }
    }
  };

  // ==============================================================
  // CUSTOMERS CRUD
  // ==============================================================
  const addCustomer = async (cust) => {
    touchActivity();
    const newCust = {
      ...cust,
      id: 'c_' + Date.now().toString(),
      debt: Number(cust.debt || 0),
      createdBy: currentUser?.username || 'admin',
      createdAt: new Date().toISOString(),
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
    return newCust;
  };

  const updateCustomer = async (id, fields) => {
    touchActivity();
    let target = null;
    const updated = customers.map((c) => {
      if (c.id === id) {
        target = { ...c, ...fields, updatedAt: new Date().toISOString() };
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
    return target;
  };

  const deleteCustomer = async (id) => {
    touchActivity();
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
    touchActivity();
    const amount = Number(paidAmount);
    let targetCustomer = null;

    const updated = customers.map((c) => {
      if (c.id === customerId) {
        const remaining = Math.max(0, c.debt - amount);
        targetCustomer = { ...c, debt: remaining, updatedAt: new Date().toISOString() };
        return targetCustomer;
      }
      return c;
    });

    setCustomers(updated);
    saveState('@store_customers', updated);

    // Record in transaction ledger
    await recordTransaction({
      type: 'debt_payment',
      amount,
      referenceId: customerId,
      customerId,
      description: `Règlement dette client ${targetCustomer?.name || ''} - Note: ${note || 'Versement'}`,
    });

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
  // COMPLETE SALE & RETURNS
  // ==============================================================
  const completeSale = async (saleData) => {
    touchActivity();
    const saleId = 's_' + Date.now().toString();
    const date = new Date().toISOString();

    let costOfGoods = 0;
    const updatedProducts = [...products];
    const newlyTriggeredLowStockProducts = [];

    // Decrement stock for physical items
    saleData.items.forEach((item) => {
      const pIndex = updatedProducts.findIndex((p) => p.id === item.id);
      if (pIndex !== -1) {
        costOfGoods += (Number(updatedProducts[pIndex].buyPrice) || 0) * Number(item.quantity);
        const newStock = Math.max(0, updatedProducts[pIndex].stock - item.quantity);
        updatedProducts[pIndex] = {
          ...updatedProducts[pIndex],
          stock: newStock,
          updatedAt: new Date().toISOString(),
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
          debtorCustomer = { ...c, debt: c.debt + remainingDebt, updatedAt: new Date().toISOString() };
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
      status: 'completed', // 'completed' | 'returned' | 'partial_return'
      profit: netProfit,
      costOfGoods,
      cashier: currentUser?.username || 'admin',
      cashierName: currentUser?.name || 'Admin',
      userId: currentUser?.id || 'u_admin_hadjali',
      returns: [], // Return history
    };

    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    saveState('@store_sales', updatedSales);

    // Record in immutable transactions ledger
    await recordTransaction({
      type: 'sale',
      amount: saleData.total,
      referenceId: saleId,
      customerId: saleData.customerId || null,
      description: `Vente #${saleId.slice(-6)} (${saleData.items.length} articles) - Mode: ${saleData.paymentMethod}`,
    });

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

  // Process Sales Return (Date de retour, réintégration au stock, remboursement)
  const processSaleReturn = async (saleId, { itemsToReturn, returnReason, refundAmount }) => {
    touchActivity();
    const returnDate = new Date().toISOString();
    let targetSale = null;

    // 1. Re-increment product stock for returned items
    const updatedProducts = [...products];
    (itemsToReturn || []).forEach((rItem) => {
      const idx = updatedProducts.findIndex((p) => p.id === rItem.id);
      if (idx !== -1) {
        const restoredStock = Number(updatedProducts[idx].stock || 0) + Number(rItem.quantity || 1);
        updatedProducts[idx] = {
          ...updatedProducts[idx],
          stock: restoredStock,
          updatedAt: returnDate,
        };
        if (isFirebaseReady()) {
          updateProductStockInFirebase(rItem.id, restoredStock);
        }
      }
    });

    setProducts(updatedProducts);
    saveState('@store_products', updatedProducts);

    // 2. Update sale record with return entry
    const returnRecord = {
      id: 'ret_' + Date.now().toString(),
      dateRetour: returnDate,
      reason: returnReason || 'Retour client',
      refundAmount: Number(refundAmount || 0),
      items: itemsToReturn,
      cashier: currentUser?.username || 'admin',
    };

    const updatedSales = sales.map((s) => {
      if (s.id === saleId) {
        const existingReturns = s.returns || [];
        targetSale = {
          ...s,
          status: 'returned',
          returns: [returnRecord, ...existingReturns],
          updatedAt: returnDate,
        };
        return targetSale;
      }
      return s;
    });

    setSales(updatedSales);
    saveState('@store_sales', updatedSales);

    // 3. Log return in ledger transactions
    await recordTransaction({
      type: 'return',
      amount: -Number(refundAmount || 0),
      referenceId: saleId,
      description: `Retour vente #${saleId.slice(-6)} - Motif: ${returnReason || 'Retour'}`,
    });

    if (isFirebaseReady() && targetSale) {
      try {
        await saveSaleToFirebase(targetSale);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Firebase processSaleReturn error:', e);
      }
    }

    return { success: true, returnRecord };
  };

  // ==============================================================
  // SERVICES CRUD
  // ==============================================================
  const addService = async (serviceData) => {
    touchActivity();
    const newService = {
      ...serviceData,
      id: 'srv_' + Date.now().toString(),
      price: Number(serviceData.price || 0),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.username || 'admin',
    };

    const updated = [newService, ...services];
    setServices(updated);
    saveState('@store_services', updated);

    if (isFirebaseReady()) {
      try {
        await saveServiceToFirebase(newService);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('saveService error:', e);
      }
    }
    return newService;
  };

  const updateService = async (id, fields) => {
    touchActivity();
    let target = null;
    const updated = services.map((s) => {
      if (s.id === id) {
        target = { ...s, ...fields, price: Number(fields.price || s.price), updatedAt: new Date().toISOString() };
        return target;
      }
      return s;
    });

    setServices(updated);
    saveState('@store_services', updated);

    if (isFirebaseReady() && target) {
      try {
        await saveServiceToFirebase(target);
      } catch (e) {
        console.warn('updateService error:', e);
      }
    }
    return target;
  };

  const deleteService = async (id) => {
    touchActivity();
    const updated = services.filter((s) => s.id !== id);
    setServices(updated);
    saveState('@store_services', updated);

    if (isFirebaseReady()) {
      try {
        await deleteServiceFromFirebase(id);
      } catch (e) {
        console.warn('deleteService error:', e);
      }
    }
  };

  // ==============================================================
  // REPAIRS CRUD (Atelier Maintenance)
  // ==============================================================
  const addRepair = async (repairData) => {
    touchActivity();
    const ticketNo = 'REP-' + (1000 + repairs.length + 1);
    const newRepair = {
      ...repairData,
      id: 'rep_' + Date.now().toString(),
      ticketNumber: ticketNo,
      status: repairData.status || 'received', // 'received' | 'in_progress' | 'waiting_parts' | 'repaired' | 'delivered' | 'cancelled'
      estimatedCost: Number(repairData.estimatedCost || 0),
      finalCost: Number(repairData.finalCost || repairData.estimatedCost || 0),
      depositPaid: Number(repairData.depositPaid || 0),
      dateReceived: repairData.dateReceived || new Date().toISOString(),
      dateDelivered: repairData.dateDelivered || null,
      technician: currentUser?.username || 'admin',
      createdAt: new Date().toISOString(),
    };

    const updated = [newRepair, ...repairs];
    setRepairs(updated);
    saveState('@store_repairs', updated);

    // If deposit was paid, record transaction
    if (newRepair.depositPaid > 0) {
      await recordTransaction({
        type: 'repair_payment',
        amount: newRepair.depositPaid,
        referenceId: newRepair.id,
        description: `Acompte réparation #${ticketNo} - ${newRepair.deviceModel} (${newRepair.customerName})`,
      });
    }

    if (isFirebaseReady()) {
      try {
        await saveRepairToFirebase(newRepair);
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('addRepair error:', e);
      }
    }
    return newRepair;
  };

  const updateRepair = async (id, fields) => {
    touchActivity();
    let target = null;
    const updated = repairs.map((r) => {
      if (r.id === id) {
        target = {
          ...r,
          ...fields,
          estimatedCost: Number(fields.estimatedCost !== undefined ? fields.estimatedCost : r.estimatedCost),
          finalCost: Number(fields.finalCost !== undefined ? fields.finalCost : r.finalCost),
          depositPaid: Number(fields.depositPaid !== undefined ? fields.depositPaid : r.depositPaid),
          updatedAt: new Date().toISOString(),
        };
        return target;
      }
      return r;
    });

    setRepairs(updated);
    saveState('@store_repairs', updated);

    if (isFirebaseReady() && target) {
      try {
        await saveRepairToFirebase(target);
      } catch (e) {
        console.warn('updateRepair error:', e);
      }
    }
    return target;
  };

  const deleteRepair = async (id) => {
    touchActivity();
    const updated = repairs.filter((r) => r.id !== id);
    setRepairs(updated);
    saveState('@store_repairs', updated);

    if (isFirebaseReady()) {
      try {
        await deleteRepairFromFirebase(id);
      } catch (e) {
        console.warn('deleteRepair error:', e);
      }
    }
  };

  // Close repair and record balance payment
  const completeRepairAndPay = async (repairId, balancePaid) => {
    touchActivity();
    const amount = Number(balancePaid || 0);
    const existing = repairs.find((r) => r.id === repairId);
    if (!existing) return;

    const updated = await updateRepair(repairId, {
      status: 'delivered',
      dateDelivered: new Date().toISOString(),
    });

    if (amount > 0) {
      await recordTransaction({
        type: 'repair_payment',
        amount,
        referenceId: repairId,
        description: `Solde final réparation #${existing.ticketNumber} - ${existing.deviceModel}`,
      });
    }
    return updated;
  };

  // ==============================================================
  // EXPENSES CRUD
  // ==============================================================
  const addExpense = async (exp) => {
    touchActivity();
    const newExp = {
      ...exp,
      id: 'e_' + Date.now().toString(),
      date: new Date().toISOString(),
      createdBy: currentUser?.username || 'admin',
      createdByName: currentUser?.name || 'Admin',
    };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    saveState('@store_expenses', updated);

    // Record in ledger transactions
    await recordTransaction({
      type: 'expense',
      amount: -Number(newExp.amount || 0),
      referenceId: newExp.id,
      description: `Dépense: ${newExp.title} (${newExp.category})`,
    });

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
    return newExp;
  };

  const updateExpense = async (id, fields) => {
    touchActivity();
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
    return target;
  };

  const deleteExpense = async (id) => {
    touchActivity();
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
    touchActivity();
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
  // GENERAL SETTINGS & STORE INFO
  // ==============================================================
  const updateLanguage = (lang) => {
    touchActivity();
    setLanguage(lang);
    saveState('@store_lang', lang);
  };

  const updateCurrency = (curr) => {
    touchActivity();
    setCurrency(curr);
    saveState('@store_currency', curr);
  };

  const updateStoreInfo = async (info) => {
    touchActivity();
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

  const updateSessionTimeout = (minutes) => {
    const mins = Number(minutes) || 30;
    setSessionTimeoutMinutes(mins);
    saveState('@session_timeout', String(mins));
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

  // Wipe all data completely (Local + Firebase)
  const wipeAllData = async () => {
    isLocalUpdateRef.current = true;
    setProducts([]);
    setCategories(DEFAULT_CATEGORIES);
    setCustomers([]);
    setExpenses([]);
    setSales([]);
    setTransactions([]);
    setServices([]);
    setRepairs([]);

    await AsyncStorage.removeItem('@store_products');
    await AsyncStorage.removeItem('@store_categories');
    await AsyncStorage.removeItem('@store_customers');
    await AsyncStorage.removeItem('@store_expenses');
    await AsyncStorage.removeItem('@store_sales');
    await AsyncStorage.removeItem('@store_transactions');
    await AsyncStorage.removeItem('@store_services');
    await AsyncStorage.removeItem('@store_repairs');

    if (isFirebaseReady()) {
      try {
        setSyncStatus('sending');
        await Promise.all([
          clearFirebaseCollection('products').catch(() => {}),
          clearFirebaseCollection('categories').catch(() => {}),
          clearFirebaseCollection('customers').catch(() => {}),
          clearFirebaseCollection('expenses').catch(() => {}),
          clearFirebaseCollection('sales').catch(() => {}),
          clearFirebaseCollection('transactions').catch(() => {}),
          clearFirebaseCollection('services').catch(() => {}),
          clearFirebaseCollection('repairs').catch(() => {}),
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
        t,
        formatMoney,
        isRTL: language === 'ar',
        touchActivity,

        // Core Data
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustProductStock,

        categories,
        addCategory,
        deleteCategory,

        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        recordCustomerPayment,

        sales,
        completeSale,
        processSaleReturn,

        transactions,
        recordTransaction,

        services,
        addService,
        updateService,
        deleteService,

        repairs,
        addRepair,
        updateRepair,
        deleteRepair,
        completeRepairAndPay,

        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        clearAllExpenses,

        wipeAllData,
        refreshAllFromFirebase,

        // Authentication & Users
        currentUser,
        users,
        login,
        logout,
        addUser,
        deleteUser,
        sessionExpiredNotice,
        setSessionExpiredNotice,
        sessionTimeoutMinutes,
        updateSessionTimeout,

        // Stock Notification & Modal
        stockModalVisible,
        openStockModal: () => setStockModalVisible(true),
        closeStockModal: () => setStockModalVisible(false),

        // Firebase Sync
        firebaseConfig,
        firebaseConnected,
        syncStatus,
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
