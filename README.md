# 🏪 Store Manager (Point de Vente & Gestion de Magasin)

Application mobile et web complète de gestion de commerce, caisse et inventaire (inspirée de l'expérience de **Store Soft - Shop Manager**), développée avec **React Native / Expo**.

---

## 🌟 Fonctionnalités Clés

### 1. 🛒 Point de Vente & Caisse (POS)
* **Recherche & Scan rapide** : Recherche instantanée par nom ou code-barres, avec filtrage par catégorie.
* **Gestion du Panier** : Ajustement direct des quantités, calcul du sous-total et gestion des remises.
* **Modes de règlement flexibles** :
  * **Espèces (Comptant / كاش)** : Calcul automatique de la monnaie à rendre (*change*).
  * **Crédit (Dette / كريدي)** : Sélection obligatoire d'un client et affectation automatique de la créance.
  * **Paiement Partiel** : Encaissement d'une avance et report du reste en dette client.
* **Reçu de caisse thermique (Ticket 58mm/80mm)** : Prévisualisation et impression instantanée du ticket de caisse.

### 2. 📦 Produits & Gestion des Stocks
* **Fiches produits détaillées** : Nom en Français et Arabe, Code-barres (avec générateur aléatoire ou scan), Prix d'achat, Prix de vente, Stock actuel et Seuil d'alerte.
* **Calcul des marges en temps réel** : Affichage automatique du bénéfice unitaire prévisionnel par produit.
* **Indicateurs visuels d'état** : Badges *En stock* (vert), *Stock faible* (orange) et *Rupture* (rouge).

### 3. 👥 Clients & Suivi des Dettes (Kredy / ديون الزبائن)
* **Tableau de bord des créances** : Visualisation globale des dettes en cours à recouvrer.
* **Encaissement des versements** : Enregistrement des remboursements partiels ou totaux avec historique.
* **Rappel WhatsApp en 1 clic** : Génération et envoi automatique d'un message poli de rappel de solde en Arabe ou en Français.

### 4. 💸 Dépenses Quotidiennes (المصاريف)
* Suivi des charges fixes et variables du commerce : Loyer, Électricité/Gaz (Sonelgaz), Salaires, Transport et Fournitures.
* Calcul déductible des dépenses pour obtenir le bénéfice net réel.

### 5. 📊 Rapports & Statistiques Financières
* Filtre par période : Aujourd'hui, Cette semaine, Ce mois-ci, Historique global.
* **Bénéfice Net Réel** : $\text{Bénéfice} = \text{Chiffre d'Affaires} - \text{Coût d'Achat des Marchandises} - \text{Dépenses}$.
* **Évaluation du capital stock** : Valeur totale au prix d'achat vs valeur potentielle au prix de vente.
* **Classement des meilleures ventes** : Top 5 des produits les plus vendus.

### 6. 🔥 Synchronisation Cloud Firebase (Optionnelle)
* **Stockage Cloud Firestore** : Mémorisation et synchronisation en temps réel de votre stock d'articles sur Firebase.
* **Multi-appareils** : Les modifications de stocks (ajouts, modifications, ventes en caisse) sont répercutées instantanément dans la collection `products`.
* **Synchronisation bidirectionnelle** :
  * **Envoyer le stock (Push)** : Téléverse tout le catalogue local vers Firestore.
  * **Récupérer le stock (Pull)** : Télécharge le catalogue depuis Firestore pour restaurer ou synchroniser un nouvel appareil.
* **Mode Hybride Hors-ligne / En ligne** : Même sans connexion Internet, l'application fonctionne à 100 % grâce au cache local `AsyncStorage`, et synchronise dès que la connexion ou Firebase est active.

### 7. 🌐 Bilingue & 100% Hors-Ligne (Offline-First)
* **Français et Arabe** : Bascule instantanée de la langue avec prise en charge du sens de lecture **RTL (Right-to-Left)**.
* **Devise personnalisable** : Dinar Algérien (`DA` / `د.ج`), Euro (`€`), Dollar (`$`), etc.
* **Stockage local persistant** : Fonctionne entièrement sans connexion Internet via `AsyncStorage`.

---

## 🚀 Comment Lancer et Tester l'Application

### Option A : Tester dans votre navigateur sur PC (Recommandé)
Le projet est déjà compilé et prêt. Dans le dossier `shop-manager`, lancez :
```cmd
npx expo start --web
```
L'application s'ouvrira directement dans votre navigateur web avec l'affichage responsive mobile.

### Option B : Tester sur votre smartphone Android avec Expo Go
1. Installez l'application **Expo Go** depuis le Google Play Store sur votre téléphone.
2. Connectez votre PC et votre téléphone au même réseau Wi-Fi.
3. Lancez dans le terminal :
```cmd
npx expo start
```
4. Scannez le QR Code affiché dans le terminal avec l'application Expo Go pour ouvrir l'application immédiatement.

### Option C : Générer un fichier APK autonome pour Android
Pour créer un fichier `.apk` installable directement :
```cmd
npx eas-cli build --platform android --profile preview
```
ou en utilisant le prebuild natif Android :
```cmd
npx expo prebuild --platform android
cd android && gradlew assembleRelease
```
Le fichier `.apk` généré se trouvera dans `android/app/build/outputs/apk/release/`.

---

## 📁 Structure du Projet

```text
shop-manager/
├── App.js                   # Navigation principale (Bottom Tabs & Stack)
├── app.json                 # Configuration Expo & Métadonnées Android
├── package.json             # Dépendances React Native & Expo
├── src/
│   ├── constants/
│   │   ├── theme.js         # Palette de couleurs & styles
│   │   └── translations.js  # Dictionnaire bilingue Français / Arabe (RTL)
│   ├── context/
│   │   └── AppContext.js    # Moteur de données, persistance locale & calculs POS
│   └── screens/
│       ├── DashboardScreen.js  # Tableau de bord principal (KPIs & Ventes)
│       ├── POSScreen.js        # Caisse, panier & impression de ticket
│       ├── ProductsScreen.js   # Gestion du catalogue & alertes stock
│       ├── CustomersScreen.js  # Suivi des clients & dettes (Kredy)
│       ├── ExpensesScreen.js   # Enregistrement des dépenses
│       ├── ReportsScreen.js    # Statistiques, chiffre d'affaires & bénéfices
│       └── SettingsScreen.js   # Réglages langue, devise & infos magasin
```
