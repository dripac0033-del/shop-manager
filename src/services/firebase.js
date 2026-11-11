import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
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
 * REAL-TIME TWO-WAY LISTENERS (Cloud ➔ Local)
 * ============================================================== */

/**
 * Listen in real-time to changes in 'products' collection
 */
export function subscribeToFirebaseProducts(onUpdate, onError) {
  if (!dbInstance) return () => {};

  try {
    const productsCollection = collection(dbInstance, 'products');
    return onSnapshot(
      productsCollection,
      (snapshot) => {
        const updated = [];
        snapshot.forEach((docSnap) => {
          updated.push({
            ...docSnap.data(),
            id: docSnap.id,
          });
        });
        if (onUpdate) onUpdate(updated);
      },
      (error) => {
        console.warn('Firestore products onSnapshot error:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('Error subscribing to products:', err);
    return () => {};
  }
}

/**
 * Listen in real-time to changes in 'customers' collection
 */
export function subscribeToFirebaseCustomers(onUpdate, onError) {
  if (!dbInstance) return () => {};

  try {
    const customersCollection = collection(dbInstance, 'customers');
    return onSnapshot(
      customersCollection,
      (snapshot) => {
        const updated = [];
        snapshot.forEach((docSnap) => {
          updated.push({
            ...docSnap.data(),
            id: docSnap.id,
          });
        });
        if (onUpdate) onUpdate(updated);
      },
      (error) => {
        console.warn('Firestore customers onSnapshot error:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('Error subscribing to customers:', err);
    return () => {};
  }
}

/**
 * Listen in real-time to changes in 'expenses' collection
 */
export function subscribeToFirebaseExpenses(onUpdate, onError) {
  if (!dbInstance) return () => {};

  try {
    const expensesCollection = collection(dbInstance, 'expenses');
    return onSnapshot(
      expensesCollection,
      (snapshot) => {
        const updated = [];
        snapshot.forEach((docSnap) => {
          updated.push({
            ...docSnap.data(),
            id: docSnap.id,
          });
        });
        if (onUpdate) onUpdate(updated);
      },
      (error) => {
        console.warn('Firestore expenses onSnapshot error:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('Error subscribing to expenses:', err);
    return () => {};
  }
}

/**
 * Listen in real-time to changes in 'sales' collection
 */
export function subscribeToFirebaseSales(onUpdate, onError) {
  if (!dbInstance) return () => {};

  try {
    const salesCollection = collection(dbInstance, 'sales');
    return onSnapshot(
      salesCollection,
      (snapshot) => {
        const updated = [];
        snapshot.forEach((docSnap) => {
          updated.push({
            ...docSnap.data(),
            id: docSnap.id,
          });
        });
        // Sort by date desc
        updated.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
        if (onUpdate) onUpdate(updated);
      },
      (error) => {
        console.warn('Firestore sales onSnapshot error:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('Error subscribing to sales:', err);
    return () => {};
  }
}

/* ==============================================================
 * PRODUCT AUTO-PUSH OPERATIONS (Local ➔ Cloud)
 * ============================================================== */

/**
 * Save or Update a single product in Firebase Firestore
 */
export async function saveProductToFirebase(product) {
  if (!dbInstance) return;
  try {
    const productRef = doc(dbInstance, 'products', product.id);
    await setDoc(productRef, {
      ...product,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return { success: true };
  } catch (err) {
    console.warn(`Failed to save product ${product.id} to Firebase:`, err);
    throw err;
  }
}

/**
 * Delete a product from Firebase Firestore
 */
export async function deleteProductFromFirebase(productId) {
  if (!dbInstance) return;
  try {
    const productRef = doc(dbInstance, 'products', productId);
    await deleteDoc(productRef);
    return { success: true };
  } catch (err) {
    console.warn(`Failed to delete product ${productId} from Firebase:`, err);
    throw err;
  }
}

/**
 * Update stock quantity for a single product in Firebase Firestore
 */
export async function updateProductStockInFirebase(productId, newStock) {
  if (!dbInstance) return;
  try {
    const productRef = doc(dbInstance, 'products', productId);
    await updateDoc(productRef, {
      stock: newStock,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`Failed to update stock for product ${productId} in Firebase:`, err);
  }
}

/**
 * Bulk upload products to Firebase Firestore
 */
export async function uploadAllProductsToFirebase(products) {
  if (!dbInstance) {
    throw new Error('Firebase Firestore non configuré.');
  }

  const productsCollection = collection(dbInstance, 'products');
  const results = [];

  for (const product of products) {
    const productRef = doc(productsCollection, product.id);
    await setDoc(productRef, {
      ...product,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    results.push(product.id);
  }

  return { success: true, count: results.length };
}

/**
 * Fetch all products once from Firebase Firestore
 */
export async function fetchProductsFromFirebase() {
  if (!dbInstance) {
    throw new Error('Firebase Firestore non configuré.');
  }

  const productsCollection = collection(dbInstance, 'products');
  const snapshot = await getDocs(productsCollection);
  const cloudProducts = [];

  snapshot.forEach((docSnapshot) => {
    cloudProducts.push({
      ...docSnapshot.data(),
      id: docSnapshot.id,
    });
  });

  return cloudProducts;
}

/* ==============================================================
 * SALES, CUSTOMERS & EXPENSES AUTO-PUSH
 * ============================================================== */

/**
 * Record a completed sale in Firebase Firestore 'sales' collection
 */
export async function saveSaleToFirebase(sale) {
  if (!dbInstance) return;
  try {
    const saleRef = doc(dbInstance, 'sales', sale.id);
    await setDoc(saleRef, {
      ...sale,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`Failed to save sale ${sale.id} to Firebase:`, err);
  }
}

/**
 * Save or update customer in Firebase Firestore 'customers' collection
 */
export async function saveCustomerToFirebase(customer) {
  if (!dbInstance) return;
  try {
    const custRef = doc(dbInstance, 'customers', customer.id);
    await setDoc(custRef, {
      ...customer,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn(`Failed to save customer ${customer.id} to Firebase:`, err);
  }
}

/**
 * Save an expense record in Firebase Firestore 'expenses' collection
 */
export async function saveExpenseToFirebase(expense) {
  if (!dbInstance) return;
  try {
    const expRef = doc(dbInstance, 'expenses', expense.id);
    await setDoc(expRef, {
      ...expense,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`Failed to save expense ${expense.id} in Firebase:`, err);
  }
}

/**
 * Delete an expense record from Firebase Firestore
 */
export async function deleteExpenseFromFirebase(expenseId) {
  if (!dbInstance) return;
  try {
    const expRef = doc(dbInstance, 'expenses', expenseId);
    await deleteDoc(expRef);
    return { success: true };
  } catch (err) {
    console.warn(`Failed to delete expense ${expenseId} from Firebase:`, err);
    throw err;
  }
}

/**
 * Delete a customer record from Firebase Firestore
 */
export async function deleteCustomerFromFirebase(customerId) {
  if (!dbInstance) return;
  try {
    const custRef = doc(dbInstance, 'customers', customerId);
    await deleteDoc(custRef);
    return { success: true };
  } catch (err) {
    console.warn(`Failed to delete customer ${customerId} from Firebase:`, err);
    throw err;
  }
}

/**
 * Fetch all sales once from Firebase Firestore
 */
export async function fetchSalesFromFirebase() {
  if (!dbInstance) return [];
  try {
    const salesCollection = collection(dbInstance, 'sales');
    const snapshot = await getDocs(salesCollection);
    const cloudSales = [];
    snapshot.forEach((docSnapshot) => {
      cloudSales.push({
        ...docSnapshot.data(),
        id: docSnapshot.id,
      });
    });
    cloudSales.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    return cloudSales;
  } catch (err) {
    console.warn('Failed to fetch sales from Firebase:', err);
    return [];
  }
}

/**
 * Fetch all customers once from Firebase Firestore
 */
export async function fetchCustomersFromFirebase() {
  if (!dbInstance) return [];
  try {
    const custCollection = collection(dbInstance, 'customers');
    const snapshot = await getDocs(custCollection);
    const cloudCustomers = [];
    snapshot.forEach((docSnapshot) => {
      cloudCustomers.push({
        ...docSnapshot.data(),
        id: docSnapshot.id,
      });
    });
    return cloudCustomers;
  } catch (err) {
    console.warn('Failed to fetch customers from Firebase:', err);
    return [];
  }
}

/**
 * Fetch all expenses once from Firebase Firestore
 */
export async function fetchExpensesFromFirebase() {
  if (!dbInstance) return [];
  try {
    const expCollection = collection(dbInstance, 'expenses');
    const snapshot = await getDocs(expCollection);
    const cloudExpenses = [];
    snapshot.forEach((docSnapshot) => {
      cloudExpenses.push({
        ...docSnapshot.data(),
        id: docSnapshot.id,
      });
    });
    cloudExpenses.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    return cloudExpenses;
  } catch (err) {
    console.warn('Failed to fetch expenses from Firebase:', err);
    return [];
  }
}

/**
 * Clear an entire collection in Firebase Firestore (e.g., reset or clear all expenses)
 */
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
    throw err;
  }
}
