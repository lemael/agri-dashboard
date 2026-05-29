# Facilitar — Rôles & Responsabilités

Ce document décrit les rôles disponibles sur la plateforme Facilitar, leurs accès et leurs tâches quotidiennes.

---

## 👑 CEO 
**Accès : total — toutes les pages de la plateforme**

### Responsabilités
- Supervise l'ensemble des activités commerciales et financières
- Valide ou rejette les nouveaux comptes utilisateurs (agents Call Center, etc.)
- Consulte tous les tableaux de bord : ventes, commandes, producteurs, produits
- Prend les décisions stratégiques basées sur les rapports financiers et commerciaux
- Gère les utilisateurs du dashboard (création, modification, suppression)
- Importe des données en masse (produits, commandes, ventes)

### Pages accessibles
- Dashboard général
- Commandes grossistes
- Commandes revendeurs
- Ventes
- Produits
- Producteurs
- Comptabilité (module complet)
- Gestion des utilisateurs
- Import de données

---

## 📊 Comptable

**Accès : Dashboard + Module Comptabilité**

### Responsabilités

Le comptable est le **garant financier et commercial** de la plateforme. Son rôle dépasse la simple comptabilité — il agit comme analyste financier, contrôleur commercial et superviseur de confiance.

#### 1. Vue d'ensemble financière
- Suit le chiffre d'affaires total (grossistes + revendeurs)
- Calcule le résultat net : gains − dépenses
- Surveille les crédits ouverts (montants non encore encaissés)
- Consulte l'état de toutes les commandes par statut

#### 2. Suivi des ventes
- Vérifie combien chaque grossiste a commandé et payé
- Compare le CA confirmé vs en attente pour détecter les anomalies
- Identifie les villes les plus actives commercialement
- Analyse les produits les plus commandés

#### 3. Gestion des paiements
- Enregistre les paiements reçus (grossistes, revendeurs)
- Suit les dettes, crédits accordés et retards de paiement
- Reçoit des alertes visuelles pour les échéances dépassées
- Met à jour le statut de chaque dossier (En attente / Partiel / Payé / En retard / Crédit)

#### 4. Contrôle des agents commerciaux
- Enregistre les commissions dues à chaque agent Call Center
- Calcule automatiquement la commission (CA réalisé × taux %)
- Valide les preuves de livraison et rapports terrain
- Gère le workflow : En attente → Validé → Payé
- Détecte les faux rapports ou ventes inventées

#### 5. Analyse des produits
- Identifie les produits les plus rentables (top CA)
- Mesure la rotation du stock (taux de vente par produit)
- Repère les produits qui stagnent

#### 6. Gestion des promotions
- Suit le budget total des promotions
- Calcule le ratio promo/CA pour évaluer la rentabilité
- Vérifie si une promotion reste profitable (règle : ratio < 15–20%)
- Répartit les coûts promos par niveau (producteur / grossiste / revendeur)

#### 7. Dépenses opérationnelles
- Enregistre toutes les dépenses : téléphone, taxi, assesoir, promos
- Filtre par catégorie et consulte les totaux par type

### Pages accessibles
- Dashboard général
- Module Comptabilité (7 onglets complets)

---

## 📱 Call Center — Groupe 1 (Grossistes)

**Accès : Dashboard + Producteurs + Produits + Commandes Grossiste**

### Responsabilités
Les agents Call Center Groupe 1 gèrent la relation avec les **grossistes** (acheteurs en gros).

#### Tâches quotidiennes
- Contacte les grossistes pour prendre ou confirmer leurs commandes
- Enregistre et suit les commandes grossiste (statut : En attente → Livrée / Annulée)
- Consulte le catalogue produits pour informer les grossistes sur les disponibilités
- Consulte la liste des producteurs pour orienter les grossistes vers les bonnes sources
- Renseigne son profil Call Center (ville, secteur principal, orientation)
- Gère sa liste de clients personnelle (ajout, suivi, date de prochain ravitaillement)

#### Espace personnel (Mon Espace CC)
- Profil complet (ville, secteur, orientation commerciale)
- Liste de clients avec géolocalisation, produits, dates de ravitaillement
- Indicateurs de tendance de ses clients

### Pages accessibles
- Dashboard général
- Mon Espace CC (tableau de bord personnel)
- Producteurs
- Produits
- Commandes Grossiste

---

## 📱 Call Center — Groupe 2 (Revendeurs)

**Accès : Dashboard + Ventes + Commandes Revendeur**

### Responsabilités
Les agents Call Center Groupe 2 gèrent la relation avec les **revendeurs** (détaillants, marchés locaux).

#### Tâches quotidiennes
- Contacte les revendeurs pour promouvoir les produits disponibles
- Enregistre et suit les commandes revendeur (statut : En attente → Livrée / Annulée)
- Consulte les ventes disponibles pour informer les revendeurs sur les stocks
- Renseigne son profil Call Center et sa liste de clients

#### Espace personnel (Mon Espace CC)
- Même structure que le Groupe 1 (profil, clients, tendances)

### Pages accessibles
- Dashboard général
- Mon Espace CC (tableau de bord personnel)
- Ventes terrain
- Commandes Revendeur

---

## 🌿 Marketing

**Accès : Dashboard + Produits + Producteurs + Ventes**

### Responsabilités
- Consulte le catalogue produits et les producteurs pour préparer les campagnes
- Analyse les ventes disponibles pour orienter les actions marketing
- Identifie les produits à promouvoir en fonction des stocks

---

## 👥 RH (Ressources Humaines)

**Accès : Dashboard + Gestion des utilisateurs**

### Responsabilités
- Gère les comptes utilisateurs de la plateforme
- Consulte la liste des agents enregistrés
- Peut créer, modifier ou désactiver des comptes

---

## Tableau récapitulatif des accès

| Page | CEO | Comptable | CC Grp 1 | CC Grp 2 | Marketing | RH |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comptabilité | ✅ | ✅ | — | — | — | — |
| Commandes Grossiste | ✅ | — | ✅ | — | — | — |
| Commandes Revendeur | ✅ | — | — | ✅ | — | — |
| Ventes | ✅ | — | — | ✅ | ✅ | — |
| Produits | ✅ | — | ✅ | — | ✅ | — |
| Producteurs | ✅ | — | ✅ | — | ✅ | — |
| Utilisateurs | ✅ | — | — | — | — | ✅ |
| Import | ✅ | — | — | — | — | — |
| Mon Espace CC | — | — | ✅ | ✅ | — | — |

---

## Connexion à la plateforme

URL locale : `http://localhost:5173`  
URL production : déployée sur Railway

Les comptes sont gérés par l'administrateur de la plateforme.
