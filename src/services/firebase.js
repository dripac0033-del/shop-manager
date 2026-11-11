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
  } catch (err) {
    console.warn(`Failed to delete expense ${expenseId} from Firebase:`, err);
  }
}
