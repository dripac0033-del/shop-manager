import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIREBASE_CONFIG_KEY = '@firebase_config';

let appInstance = null;
let dbInstance = null;

// Default project credentials configured from user's google-services.json
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCBRRE4pYcruumTYFvzz2kwtrceSqvN0vg',
  authDomain: 'hadjali49-c42f4.firebaseapp.com',
  projectId: 'hadjali49-c42f4',
  storageBucket: 'hadjali49-c42f4.firebasestorage.app',
  messagingSenderId: '505538712523',
  appId: '1:505538712523:android:3c4a7af1a5d3df5e4c5c4e',
};

/**
 * Helper to strip undefined values so Firestore setDoc / updateDoc never throws
 */
export function sanitizeDoc(data) {
  if (!data || typeof data !== 'object') return data;
  const clean = {};
  Object.keys(data).forEach((key) => {
    const val = data[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        clean[key] = sanitizeDoc(val);
      } else if (Array.isArray(val)) {
        clean[key] = val.map((item) => (typeof item === 'object' && item !== null ? sanitizeDoc(item) : item));
      } else {
        clean[key] = val;
      }
    }
  });
  return clean;
}

/**
 * Get stored Firebase configuration from AsyncStorage
 */
export async function getStoredFirebaseConfig() {
  try {
    const raw = await AsyncStorage.getItem(FIREBASE_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to read firebase config:', err);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

/**
 * Save Firebase configuration to AsyncStorage and initialize
 */
export async function saveFirebaseConfig(config) {
  try {
    await AsyncStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
    return initFirebase(config);
  } catch (err) {
    console.warn('Failed to save firebase config:', err);
    throw err;
  }
}

/**
 * Initialize Firebase App and Firestore with given or stored config
 */
export function initFirebase(config) {
  if (!config || !config.apiKey || !config.projectId) {
    return { success: false, reason: 'missing_config' };
  }

  try {
    if (!getApps().length) {
      appInstance = initializeApp(config);
    } else {
      appInstance = getApp();
    }
    dbInstance = getFirestore(appInstance);
    return { success: true, db: dbInstance };
  } catch (err) {
    console.warn('Firebase init error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if Firebase is currently active and initialized
 */
export function isFirebaseReady() {
  return dbInstance !== null;
}

/* ==============================================================
 * GENERIC SAFE FIRESTORE HELPERS
 * ============================================================== */

export async function saveItemToCollection(colName, item) {
  if (!dbInstance || !item || !item.id) return;
  try {
    const docRef = doc(dbInstance, colName, String(item.id));
    const cleaned = sanitizeDoc({
      ...item,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, cleaned, { merge: true });
    return { success: true };
  } catch (err) {
    console.warn(`Firestore save to ${colName} error:`, err);
  }
}

export async function deleteItemFromCollection(colName, itemId) {
  if (!dbInstance || !itemId) return;
  try {
    const docRef = doc(dbInstance, colName, String(itemId));
    await deleteDoc(docRef);
    return { success: true };
  } catch (err) {
    console.warn(`Firestore delete from ${colName} error:`, err);
  }
}

export async function fetchCollectionItems(colName) {
  if (!dbInstance) return [];
  try {
    const colRef = collection(dbInstance, colName);
    const snapshot = await getDocs(colRef);
    const items = [];
    snapshot.forEach((docSnap) => {
      items.push({
        ...docSnap.data(),
        id: docSnap.id,
      });
    });
    return items;
  } catch (err) {
    console.warn(`Firestore fetch ${colName} error:`, err);
    return [];
  }
}

export function subscribeToCollection(colName, onUpdate, onError) {
  if (!dbInstance) return () => {};
  try {
    const colRef = collection(dbInstance, colName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({
            ...docSnap.data(),
            id: docSnap.id,
          });
        });
        if (onUpdate) onUpdate(items);
      },
      (err) => {
        console.warn(`Firestore onSnapshot ${colName} error:`, err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn(`Subscribe error ${colName}:`, err);
    return () => {};
  }
}

/* ==============================================================
 * REAL-TIME LISTENERS
 * ============================================================== */

export function subscribeToFirebaseProducts(onUpdate, onError) {
  return subscribeToCollection('products', onUpdate, onError);
}

export function subscribeToFirebaseCategories(onUpdate, onError) {
  return subscribeToCollection('categories', onUpdate, onError);
}

export function subscribeToFirebaseCustomers(onUpdate, onError) {
  return subscribeToCollection('customers', onUpdate, onError);
}

export function subscribeToFirebaseExpenses(onUpdate, onError) {
  return subscribeToCollection('expenses', onUpdate, onError);
}

export function subscribeToFirebaseSales(onUpdate, onError) {
  return subscribeToCollection('sales', (items) => {
    // Sort by date desc
    items.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    if (onUpdate) onUpdate(items);
  }, onError);
}

export function subscribeToFirebaseTransactions(onUpdate, onError) {
  return subscribeToCollection('transactions', (items) => {
    items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    if (onUpdate) onUpdate(items);
  }, onError);
}

export function subscribeToFirebaseServices(onUpdate, onError) {
  return subscribeToCollection('services', onUpdate, onError);
}

export function subscribeToFirebaseRepairs(onUpdate, onError) {
  return subscribeToCollection('repairs', (items) => {
    items.sort((a, b) => new Date(b.createdAt || b.dateReceived || 0) - new Date(a.createdAt || a.dateReceived || 0));
    if (onUpdate) onUpdate(items);
  }, onError);
}

export function subscribeToFirebaseUsers(onUpdate) {
  return subscribeToCollection('users', onUpdate);
}

export function subscribeToFirebaseStoreInfo(onUpdate) {
  if (!dbInstance) return () => {};
  try {
    const infoRef = doc(dbInstance, 'settings', 'store_info');
    return onSnapshot(infoRef, (snap) => {
      if (snap.exists() && onUpdate) {
        onUpdate(snap.data());
      }
    });
  } catch (err) {
    console.warn('Error subscribing to store info:', err);
    return () => {};
  }
}

/* ==============================================================
 * SPECIFIC CRUD CALLS
 * ============================================================== */

// Products
export async function saveProductToFirebase(product) {
  return saveItemToCollection('products', product);
}

export async function deleteProductFromFirebase(productId) {
  return deleteItemFromCollection('products', productId);
}

export async function updateProductStockInFirebase(productId, newStock) {
  if (!dbInstance) return;
  try {
    const productRef = doc(dbInstance, 'products', String(productId));
    await updateDoc(productRef, {
      stock: newStock,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`Failed to update stock for product ${productId} in Firebase:`, err);
  }
}

export async function uploadAllProductsToFirebase(products) {
  if (!dbInstance) throw new Error('Firebase Firestore non initialisé.');
  let count = 0;
  for (const p of products) {
    await saveItemToCollection('products', p);
    count++;
  }
  return { success: true, count };
}

export async function fetchProductsFromFirebase() {
  return fetchCollectionItems('products');
}

// Categories
export async function saveCategoryToFirebase(category) {
  return saveItemToCollection('categories', category);
}

export async function deleteCategoryFromFirebase(categoryId) {
  return deleteItemFromCollection('categories', categoryId);
}

export async function fetchCategoriesFromFirebase() {
  return fetchCollectionItems('categories');
}

// Customers
export async function saveCustomerToFirebase(customer) {
  return saveItemToCollection('customers', customer);
}

export async function deleteCustomerFromFirebase(customerId) {
  return deleteItemFromCollection('customers', customerId);
}

export async function fetchCustomersFromFirebase() {
  return fetchCollectionItems('customers');
}

// Sales & Returns
export async function saveSaleToFirebase(sale) {
  return saveItemToCollection('sales', sale);
}

export async function fetchSalesFromFirebase() {
  const sales = await fetchCollectionItems('sales');
  sales.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  return sales;
}

// Transactions (Ledger entry for each sale, return, payment, expense)
export async function saveTransactionToFirebase(tx) {
  return saveItemToCollection('transactions', tx);
}

export async function fetchTransactionsFromFirebase() {
  const list = await fetchCollectionItems('transactions');
  list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return list;
}

// Services
export async function saveServiceToFirebase(service) {
  return saveItemToCollection('services', service);
}

export async function deleteServiceFromFirebase(serviceId) {
  return deleteItemFromCollection('services', serviceId);
}

export async function fetchServicesFromFirebase() {
  return fetchCollectionItems('services');
}

// Repairs
export async function saveRepairToFirebase(repair) {
  return saveItemToCollection('repairs', repair);
}

export async function deleteRepairFromFirebase(repairId) {
  return deleteItemFromCollection('repairs', repairId);
}

export async function fetchRepairsFromFirebase() {
  const repairs = await fetchCollectionItems('repairs');
  repairs.sort((a, b) => new Date(b.createdAt || b.dateReceived || 0) - new Date(a.createdAt || a.dateReceived || 0));
  return repairs;
}

// Expenses
export async function saveExpenseToFirebase(expense) {
  return saveItemToCollection('expenses', expense);
}

export async function deleteExpenseFromFirebase(expenseId) {
  return deleteItemFromCollection('expenses', expenseId);
}

export async function fetchExpensesFromFirebase() {
  const expenses = await fetchCollectionItems('expenses');
  expenses.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  return expenses;
}

// Users (Dedicated Table)
export async function saveUserToFirebase(user) {
  return saveItemToCollection('users', user);
}

export async function deleteUserFromFirebase(userId) {
  return deleteItemFromCollection('users', userId);
}

export async function fetchUsersFromFirebase() {
  return fetchCollectionItems('users');
}

// Store Info
export async function saveStoreInfoToFirebase(info) {
  if (!dbInstance) return;
  try {
    const infoRef = doc(dbInstance, 'settings', 'store_info');
    await setDoc(infoRef, sanitizeDoc({
      ...info,
      updatedAt: new Date().toISOString(),
    }), { merge: true });
    return { success: true };
  } catch (err) {
    console.warn('Failed to save store info to Firebase:', err);
  }
}

export async function fetchStoreInfoFromFirebase() {
  if (!dbInstance) return null;
  try {
    const infoRef = doc(dbInstance, 'settings', 'store_info');
    const snap = await getDoc(infoRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('Failed to fetch store info from Firebase:', err);
  }
  return null;
}

// Clear Collection
export async function clearFirebaseCollection(collectionName) {
  if (!dbInstance) return;
  try {
    const colRef = collection(dbInstance, collectionName);
    const snapshot = await getDocs(colRef);
    const promises = [];
    snapshot.forEach((docSnap) => {
      promises.push(deleteDoc(doc(dbInstance, collectionName, docSnap.id)));
    });
    await Promise.all(promises);
    return { success: true, count: promises.length };
  } catch (err) {
    console.warn(`Failed to clear collection ${collectionName} in Firebase:`, err);
  }
}
