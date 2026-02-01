# 🏗️ Architecture OAuth 2.0 - Microsoft 365 (Local-First)

## 🚨 Architecture Local-First vs SaaS : Différence Critique

### DataScope = Application LOCAL-FIRST

**Cela change TOUT pour OAuth 2.0 !**

```
┌─────────────────────────────────────────────────────────────────┐
│ Application SaaS (ex: Trello, Notion, Slack)                   │
│ - Hébergée sur serveur central                                  │
│ - TOUS les utilisateurs utilisent la MÊME instance             │
│ - OAuth Client ID : UN SEUL, hardcodé dans l'app               │
│ - Développeur crée App Registration UNE FOIS                    │
│ - Tous les utilisateurs partagent ce Client ID                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Application LOCAL-FIRST (DataScope)                             │
│ - Tourne dans le navigateur de chaque utilisateur              │
│ - Chaque ENTREPRISE a son propre tenant O365                    │
│ - OAuth Client ID : DIFFÉRENT pour chaque entreprise           │
│ - IT de chaque entreprise crée sa propre App Registration      │
│ - Client ID CONFIGURÉ PAR UTILISATEUR dans Settings            │
└─────────────────────────────────────────────────────────────────┘
```

### Pourquoi le Client ID ne peut PAS être hardcodé ?

**Exemple concret :**

```
Entreprise A (Acme Corp)
└─ Tenant O365 : acme.onmicrosoft.com
└─ App Registration : "DataScope Acme"
└─ Client ID : aaaaa-1111-2222-3333-bbbbbbbbbbbb

Entreprise B (TechCorp)
└─ Tenant O365 : techcorp.onmicrosoft.com
└─ App Registration : "DataScope TechCorp"
└─ Client ID : ccccc-4444-5555-6666-dddddddddddd

❌ IMPOSSIBLE d'utiliser le même Client ID pour les deux !
✅ SOLUTION : Chaque utilisateur configure le Client ID de SON entreprise
```

---

## 🎯 Le modèle correct : Client ID Configurable par Utilisateur

### **Ce qui se passe en réalité**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. IT de l'Entreprise A (Acme Corp)                        │
│    - Crée App Registration Azure AD dans le tenant Acme    │
│    - Name : "DataScope"                                     │
│    - Permissions : User.Read, Files.ReadWrite (Delegated)  │
│    - Client ID obtenu : aaaaa-1111-2222-3333-bbbbbbbbbbbb  │
│    - Communique ce Client ID aux employés (email, wiki IT) │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Marie (employée Acme Corp - STANDARD, pas admin)        │
│    - Ouvre DataScope dans son navigateur                    │
│    - Va dans Settings → Microsoft 365                       │
│    - Voit : "Configuration requise"                         │
│    - Clique "Configurer Client ID"                          │
│    - Entre : aaaaa-1111-2222-3333-bbbbbbbbbbbb             │
│    - Clique "Enregistrer"                                   │
│    - Client ID stocké dans localStorage                     │
│    - Page se recharge → Microsoft 365 configuré ✅         │
│    - Clique "Se connecter à Microsoft 365"                 │
│    - Popup OAuth Microsoft s'ouvre :                       │
│      "DataScope (Acme Corp) veut accéder à votre OneDrive" │
│      Permissions : User.Read, Files.ReadWrite              │
│      [Annuler] [Accepter]                                  │
│    - Marie clique "Accepter"                                │
│    - Token OAuth généré → Accès OneDrive de Marie ✅       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. IT de l'Entreprise B (TechCorp)                         │
│    - Crée App Registration Azure AD dans le tenant TechCorp│
│    - Name : "DataScope"                                     │
│    - Client ID obtenu : ccccc-4444-5555-6666-dddddddddddd  │
│    - Communique ce Client ID aux employés                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Paul (employé TechCorp - STANDARD, pas admin)           │
│    - Ouvre DataScope dans son navigateur                    │
│    - Va dans Settings → Microsoft 365                       │
│    - Clique "Configurer Client ID"                          │
│    - Entre : ccccc-4444-5555-6666-dddddddddddd (TechCorp) │
│    - Enregistre → Client ID stocké dans localStorage       │
│    - Clique "Se connecter à Microsoft 365"                 │
│    - Popup OAuth Microsoft s'ouvre :                       │
│      "DataScope (TechCorp) veut accéder à votre OneDrive"  │
│    - Paul accepte → Accès OneDrive de Paul ✅              │
└─────────────────────────────────────────────────────────────┘
```

### **Résultat**

- ✅ **Marie (Acme)** accède UNIQUEMENT à **SON** OneDrive Acme
- ✅ **Paul (TechCorp)** accède UNIQUEMENT à **SON** OneDrive TechCorp
- ✅ **Marie et Paul** utilisent des Client IDs DIFFÉRENTS (tenants différents)
- ✅ **Les utilisateurs configurent** leur Client ID une seule fois dans Settings
- ✅ **Aucun utilisateur n'a besoin de droits admin** Azure AD
- ✅ **Les données sont isolées** (Token de Marie ≠ Token de Paul, tenants différents)
- ✅ **Pas de serveur central** DataScope (local-first)
- ✅ **Pas de base de données partagée**
- ✅ **Client ID stocké localement** dans le navigateur de chaque utilisateur

---

## 🔑 Pourquoi OAuth 2.0 exige une App Registration ?

### **Microsoft doit savoir :**

1. **Qui est cette application ?**
   - → Client ID (identifiant unique)
   - Exemple : `abc-123-456-789-def`

2. **Quelles permissions elle demande ?**
   - → Scopes
   - Exemple : `User.Read`, `Files.ReadWrite`

3. **Où rediriger après login ?**
   - → Redirect URI
   - Exemple : `https://votreapp.com` ou `http://localhost:5173`

**Sans ces informations, Microsoft refuse la connexion.**

C'est **exactement le même modèle** que :
- Google OAuth (Client ID Google)
- GitHub OAuth (Client ID GitHub)
- Slack OAuth (Client ID Slack)
- Dropbox OAuth (Client ID Dropbox)

Tous nécessitent qu'un **développeur** crée une "application" une fois, puis le Client ID est **partagé par tous les utilisateurs**.

---

## ✅ Ce que les principes garantissent

### 1. **Données isolées**

Chaque utilisateur a son propre **Token OAuth** :
```
Token de Marie = eyJ0eXAiOiJKV...ABC (valide pour OneDrive de Marie uniquement)
Token de Paul  = eyJ0eXAiOiJKV...XYZ (valide pour OneDrive de Paul uniquement)
```

**Impossible techniquement** pour Marie d'accéder au OneDrive de Paul, même si elle essaye.

### 2. **Aucun serveur central**

```
                OneDrive de Marie (Microsoft)
               /
Marie → DataScope (navigateur local)
               \
                OneDrive de Paul (Microsoft)
               /
Paul → DataScope (navigateur local)
```

DataScope ne passe **jamais** par un serveur intermédiaire. C'est du navigateur → Microsoft directement.

### 3. **Permissions gérées par Microsoft**

Quand Marie partage un fichier via le lien OneDrive :
- C'est **OneDrive** qui gère les permissions (organisation, public, expiration)
- Pas DataScope
- Marie peut révoquer l'accès dans son OneDrive

### 4. **Tokens séparés**

```
Marie login → Microsoft génère Token A → Stocké dans navigateur de Marie
Paul login  → Microsoft génère Token B → Stocké dans navigateur de Paul

Token A ≠ Token B
Token A ne peut PAS accéder aux données de Token B
```

### 5. **Consentement individuel**

Chaque utilisateur **accepte ou refuse** les permissions individuellement :
- Marie accepte → Elle peut utiliser O365 dans DataScope
- Paul refuse → Il ne peut pas, mais DataScope fonctionne quand même (mode local)

---

## 🛠️ Guide : Créer votre App Registration (15 minutes)

### Étape 1 : Accéder à Azure Portal

1. Aller sur https://portal.azure.com
2. Se connecter avec un compte Microsoft (personnel ou organisationnel)

⚠️ **Note :** Si vous n'avez pas de tenant Azure AD, Microsoft en créera un automatiquement (gratuit).

### Étape 2 : Créer l'App Registration

1. Cliquer sur **Azure Active Directory** (dans le menu de gauche)
2. Menu **App registrations** → **New registration**

### Étape 3 : Configurer l'application

**Name :**
```
DataScope OneDrive Integration
```

**Supported account types :** (TRÈS IMPORTANT)
```
✅ Accounts in any organizational directory and personal Microsoft accounts
   (Any Azure AD directory - Multitenant - and personal Microsoft accounts)
```

**Pourquoi multi-tenant ?**
- Permet à N'IMPORTE QUEL utilisateur Microsoft de se connecter
- Pas seulement votre organisation
- Utilisateurs avec comptes personnels (Outlook.com, Hotmail) peuvent aussi se connecter

**Redirect URI :**
```
Type : Single-page application (SPA)
URI  : http://localhost:5173  (pour développement)
```

**Pour production, ajouter aussi :**
```
https://votredomaine.com
```

### Étape 4 : Copier le Client ID

Après avoir cliqué "Register" :
1. Vous arrivez sur la page de l'application
2. **COPIER** l'**Application (client) ID**
3. Exemple : `abc12345-1234-1234-1234-1234567890ab`

### Étape 5 : Configurer les permissions

1. Menu **API permissions** (gauche)
2. **Add a permission**
3. **Microsoft Graph**
4. **Delegated permissions** (IMPORTANT, pas "Application permissions")
5. Rechercher et cocher :
   - ✅ `User.Read`
   - ✅ `Files.ReadWrite`
6. **Add permissions**

**Pourquoi "Delegated" et pas "Application" ?**
- **Delegated** = L'application agit AU NOM de l'utilisateur
- Chaque utilisateur donne son consentement individuel
- L'app accède UNIQUEMENT aux données de l'utilisateur connecté

**Application permissions** (ce qu'on NE veut PAS) :
- L'application a accès aux données de TOUS les utilisateurs
- Nécessite un admin consent global
- Risque de sécurité si l'app est compromise

### Étape 6 : (Optionnel mais recommandé) Admin Consent

Si vous êtes **admin** de votre organisation Azure AD :
1. Cliquer sur **Grant admin consent for [Organization]**
2. Cliquer "Yes"

**Effet :**
- Les utilisateurs de votre organisation ne voient plus "Unverified app" warning
- Ils voient juste la popup de consentement standard

Si vous n'êtes **pas admin** :
- Pas grave, ça marchera quand même
- Les utilisateurs verront juste un avertissement "This app is not verified"
- Ils peuvent quand même accepter

### Étape 7 : Configurer DataScope

**En développement :**

Éditer `/home/user/DataAnalyse/.env.local` :
```bash
VITE_O365_CLIENT_ID=abc12345-1234-1234-1234-1234567890ab
```

Redémarrer le serveur dev :
```bash
npm run dev
```

**En production :**

Configurer la variable d'environnement au moment du build :
```bash
export VITE_O365_CLIENT_ID=abc12345-1234-1234-1234-1234567890ab
npm run build
```

Ou via CI/CD (GitHub Actions, GitLab CI, etc.) :
```yaml
env:
  VITE_O365_CLIENT_ID: ${{ secrets.O365_CLIENT_ID }}
```

---

## 🚀 Déploiement et rollout (Local-First)

### Scénario : Entreprise Acme Corp déploie DataScope à 100 employés

1. **IT Acme** crée l'App Registration Azure AD (15 minutes, une fois)
   - Dans le tenant acme.onmicrosoft.com
   - Configure les permissions : User.Read, Files.ReadWrite (Delegated)
   - Obtient le Client ID : aaaaa-1111-2222-3333-bbbbbbbbbbbb

2. **IT Acme** communique le Client ID aux employés :
   - Email interne : "Pour activer O365 dans DataScope, utilisez ce Client ID : aaaaa-..."
   - Ou page wiki IT : "Configuration DataScope → Microsoft 365"

3. **Les 100 employés** (une fois) :
   - Ouvrent DataScope
   - Vont dans Settings → Microsoft 365
   - Cliquent "Configurer Client ID"
   - Collent : aaaaa-1111-2222-3333-bbbbbbbbbbbb
   - Cliquent "Enregistrer" → Page recharge
   - Cliquent "Se connecter à Microsoft 365"
   - Acceptent les permissions (1 clic)
   - C'est tout ! ✅

**Temps par utilisateur : 30 secondes** (configuration unique)

### Scénario : 10 entreprises utilisent DataScope

Chaque entreprise suit le même processus **indépendamment** :
- Entreprise A : IT crée App Registration → Donne Client ID A aux employés
- Entreprise B : IT crée App Registration → Donne Client ID B aux employés
- ...
- Entreprise J : IT crée App Registration → Donne Client ID J aux employés

**Résultat** : 10 Client IDs différents, 10 tenants isolés, 0 conflit

---

## 🔒 Sécurité et révocation

### Un utilisateur veut révoquer l'accès de DataScope

**Méthode 1 : Depuis DataScope**
```
Settings → Microsoft 365 → Déconnecter
```
→ Supprime le token local

**Méthode 2 : Depuis Microsoft (DÉFINITIF)**
```
https://account.microsoft.com/privacy
→ Apps and services
→ Trouver "DataScope"
→ Remove access
```
→ Token révoqué côté Microsoft, DataScope ne peut plus accéder

**Méthode 3 : Admin IT peut bloquer l'app entière**
```
Azure AD → Enterprise applications
→ Trouver "DataScope"
→ Properties → "Enabled for users to sign in?" → NO
```
→ Tous les utilisateurs de l'organisation sont bloqués

---

## 📊 Comparaison avec d'autres services

| Service | Client ID partagé ? | Utilisateur configure ? |
|---------|---------------------|-------------------------|
| **Google Drive Picker** | ✅ Oui (par dev) | ❌ Non (juste consentement) |
| **Dropbox OAuth** | ✅ Oui (par dev) | ❌ Non (juste consentement) |
| **GitHub OAuth** | ✅ Oui (par dev) | ❌ Non (juste consentement) |
| **Slack OAuth** | ✅ Oui (par dev) | ❌ Non (juste consentement) |
| **DataScope + O365** | ✅ Oui (par dev) | ❌ Non (juste consentement) |

**C'est le standard OAuth 2.0 universel.**

---

## ❓ FAQ

### Q1 : Est-ce sûr de partager le Client ID ?

**Oui, totalement.** Le Client ID n'est **pas un secret**.

Il est :
- Visible dans le code source (JavaScript compilé)
- Visible dans les requêtes réseau (DevTools)
- Conçu pour être public

**Ce qui protège l'accès :**
- Le **Token OAuth** est secret (généré par Microsoft pour chaque utilisateur)
- Le **Redirect URI** est verrouillé (Microsoft vérifie l'origine)
- Le **Consentement utilisateur** est obligatoire

### Q2 : Un utilisateur peut-il voler le token d'un autre ?

**Non, techniquement impossible.**

Chaque token est :
- Généré par Microsoft pour un utilisateur spécifique
- Signé cryptographiquement par Microsoft
- Vérifié à chaque requête API

Si Marie essaye d'utiliser le token de Paul, Microsoft retourne une erreur 401 Unauthorized.

### Q3 : Que se passe-t-il si je régénère le Client ID ?

**Tous les utilisateurs doivent se reconnecter.**

- Les tokens existants deviennent invalides
- Les utilisateurs cliquent "Se connecter à Microsoft 365" à nouveau
- Nouveaux tokens générés avec le nouveau Client ID

### Q4 : Je peux avoir plusieurs Client IDs (dev, prod) ?

**Oui, recommandé.**

```
# .env.local (dev)
VITE_O365_CLIENT_ID=abc-dev-client-id

# Production
VITE_O365_CLIENT_ID=xyz-prod-client-id
```

**Avantages :**
- Séparer les environnements
- Tester sans impacter la prod
- Redirect URIs différents (localhost vs domaine prod)

### Q5 : Mon entreprise bloque les apps non vérifiées. Que faire ?

**Deux options :**

**Option A : Publisher Verification (gratuit, recommandé)**
1. Azure AD → App registrations → Votre app
2. Menu "Branding"
3. "Verify publisher"
4. Suivre le processus (nécessite compte Microsoft Partner Network gratuit)

**Effet :** Badge "Verified" dans la popup OAuth, plus de warning.

**Option B : Demander à l'admin IT d'ajouter l'app à la whitelist**
1. Donner le Client ID à votre admin IT
2. Il ajoute l'app dans Azure AD Enterprise Applications
3. Approuve pour toute l'organisation

---

## 🎯 Résumé exécutif (Local-First)

### **Ce que l'IT de CHAQUE ENTREPRISE fait : UNE FOIS (15 minutes)**
1. Créer App Registration Azure AD dans leur tenant
2. Copier le Client ID
3. Communiquer le Client ID aux employés (email, wiki)

### **Ce que CHAQUE UTILISATEUR fait : UNE FOIS (30 secondes)**
1. Ouvrir DataScope → Settings → Microsoft 365
2. Cliquer "Configurer Client ID"
3. Coller le Client ID fourni par l'IT
4. Enregistrer (page recharge)
5. Cliquer "Se connecter à Microsoft 365"
6. Accepter les permissions (popup OAuth)
7. C'est tout !

### **Après cette configuration unique**
L'utilisateur peut :
- Sauvegarder ses analyses sur OneDrive
- Restaurer depuis OneDrive
- Partager des dashboards avec des collègues
- Le tout sans reconfigurer !

### **Garanties de sécurité**
- ✅ Données isolées (Token par utilisateur)
- ✅ Pas de serveur central
- ✅ Révocation facile
- ✅ Permissions Microsoft standard
- ✅ Audit trail Microsoft natif

---

**Date :** 2026-02-01
**Auteur :** Claude Code Agent
**Version :** 1.0
