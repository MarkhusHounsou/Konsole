# 🔍 Konsole – Analyseur d'Intelligence Web

> Un outil d'analyse web léger qui transforme n'importe quelle URL en intelligence commerciale exploitable : profil d'entreprise, pile technique, signaux de mise en marché et score d'adéquation ICP, en quelques secondes.

**Démo en direct → https://konsole-analyzer.netlify.app**
**GitHub → https://github.com/MarkhusHounsou/Konsole.git**

---

## 📌 Ce qu'il fait

Collez une URL et obtenez :

- 🏢 **Profil d'entreprise** : nom, secteur, modèle économique, marché cible, taille
- 🛠️ **Détection de la pile technique** : frontend, CMS, analytics, CRM, outils marketing, infrastructure
- 📊 **Score d'adéquation ICP** : évalué selon 4 segments d'acheteurs (B2B SaaS, Entreprise, Startup, E-commerce)
- 📡 **Signaux de mise en marché** : réservation de démo, page de tarification, essai gratuit, inscription en libre-service, contactez les ventes
- 📨 **Découverte de contacts** : emails, numéros de téléphone, profils sociaux, pages clés
- 👤 **Contacts Hunter.io** : emails professionnels publics avec nom, rôle, ancienneté

---

## 🧱 Choix Techniques et Raisons

### Next.js 15 (App Router) + TypeScript

Next.js nous donne une unité déployable unique : interface React + routes API — pas de backend séparé à maintenir. Les composants serveur de l'App Router et le fetch intégré facilitent l'orchestration de plusieurs sources de données asynchrones en parallèle. TypeScript était obligatoire pour une base de code professionnelle.

### TailwindCSS + shadcn/ui

Le moyen le plus rapide d'obtenir une interface polie et accessible. Les composants shadcn/ui sont sans tête et composables, offrant un contrôle total sans se battre contre un système de conception. Tailwind gère l'espacement, la réactivité et la thématisation (sombre/clair) sans surcharge de construction.

### Pipeline de Données — Approche à 2 Sources (Plus 1 Optionnelle)

| Source | Ce qu'elle fournit | Pourquoi |
|---------|-------------|-------------|
| **Scraping HTTP direct** | HTML, méta-balises, liens, emails, téléphones, titres, scripts | Zéro coût, pas d'authentification, couvre n'importe quel site public |
| **API Hunter.io** | Emails professionnels + nom/rôle/ancienneté | Meilleure découverte de contacts en niveau gratuit |
| **API CompanyEnrich (Optionnelle)** | Informations structurées sur l'entreprise | Intégré mais non fiable (étiquettes de secteur erronées, délais d'attente) ; utilisé seulement si ça améliore l'inférence locale |

### Moteur de Notation (Personnalisé, Basé sur des Règles)

Un score déterministe de 0 à 100 selon 4 segments : B2B SaaS, Entreprise, Startup, E-commerce. Chaque critère a un poids fixe. Ceci est **intentionnellement non basé sur l'IA** : il est vérifiable, reproductible et ne produit pas d'hallucinations.

### Internationalisation (next-intl)

L'interface est disponible en EN/FR. Les fichiers de traduction se trouvent dans `src/i18n/`. Les utilisateurs peuvent basculer de langue sans rechargement de page.

---

## 🚀 Exécution Locale

### Prérequis

- Node.js >= 18
- npm >= 9

### 1. Cloner et Installer

```bash
git clone https://github.com/MarkhusHounsou/Konsole.git
cd Konsole
npm install
```

### 2. Configurer les Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Optionnel — Hunter.io (niveau gratuit : 25 requêtes/mois)
HUNTER_API_KEY=votre_cle_hunter_ici

# Optionnel — CompanyEnrich (désactivé si absent)
COMPANYENRICH_API_KEY=votre_cle_companyenrich_ici
```

### 3. Démarrer le Serveur de Développement

```bash
npm run dev
```

Ouvrez http://localhost:3000

### 4. Essayer

Entrez n'importe quelle URL publique (ex: `stripe.com`, `notion.so`) et cliquez sur **Analyser**.

---

## 📁 Structure du Projet

```
Konsole/
├── docs/                          # Documentation
│   ├── README.md                  # README principal
│   ├── doc-technique.md           # Documentation technique ultra-détaillée
│   └── guide-loom.md              # Guide pour la vidéo Loom
├── src/
│   ├── app/                       # Pages App Router Next.js + routes API
│   │   └── api/analyze/           # Point de terminaison principal d'analyse
│   ├── components/
│   │   └── ResultsDashboard.tsx   # Interface complète des résultats
│   ├── lib/
│   │   ├── website-fetcher.ts     # Scraping HTTP + analyse HTML
│   │   ├── tech-detector.ts       # Détection par motif de la pile technique
│   │   ├── icp-signals.ts         # Extraction de fonctionnalités (carrières, tarification)
│   │   ├── score-engine.ts        # Notation ICP déterministe
│   │   ├── hunter-enrichment.ts   # API Hunter.io
│   │   ├── companyenrich-analyzer.ts # CompanyEnrich + solution de secours locale
│   │   ├── path-prober.ts         # Sondage /careers, /pricing, /blog
│   │   └── employee-utils.ts      # Analyse du nombre d'employés
│   ├── types/index.ts             # Interfaces TypeScript partagées
│   └── i18n/                      # Fichiers de traduction EN/FR
└── .env.local                     # Vos clés API (non versionnées)
```

---

## 📡 APIs Utilisées en Détail

### 1. API Hunter.io

**Documentation officielle :** https://hunter.io/api-documentation/v2

**Ce qu'elle fait :**
Hunter.io est un service qui trouve les adresses email professionnelles associées à un domaine.

**Endpoint utilisé :** `GET https://api.hunter.io/v2/domain-search`

**Paramètres :**
- `domain` : Le domaine à analyser (ex: `stripe.com`)
- `limit` : Nombre maximum de contacts à renvoyer (10 dans Konsole)
- `api_key` : Votre clé API Hunter.io

**Exemple de requête :**
```
https://api.hunter.io/v2/domain-search?domain=stripe.com&limit=10&api_key=VOTRE_CLE
```

**Exemple de réponse (simplifiée) :**
```json
{
  "data": {
    "domain": "stripe.com",
    "organization": "Stripe",
    "pattern": "{first}.{last}",
    "disposable": false,
    "webmail": false,
    "accept_all": false,
    "emails": [
      {
        "value": "patrick@stripe.com",
        "type": "personal",
        "confidence": 98,
        "first_name": "Patrick",
        "last_name": "Collison",
        "position": "CEO",
        "department": "management",
        "seniority": "executive"
      }
    ]
  }
}
```

**Ce que Konsole extrait :**
- Nom de l'organisation
- Pattern des emails
- Si c'est un domaine webmail (gmail.com, yahoo.com...)
- Si le domaine accepte tous les emails ("accept all")
- La liste des contacts avec email, prénom, nom, poste, département, seniorité et score de confiance

**Niveau gratuit :** 25 requêtes par mois.

---

### 2. API CompanyEnrich (Optionnelle)

**Ce qu'elle fait :**
CompanyEnrich est un service qui fournit des informations structurées sur une entreprise à partir de son domaine (secteur, taille, chiffre d'affaires, emplacement...).

**Important :**
Cette API est **totalement optionnelle** ! Konsole fonctionne parfaitement sans elle grâce à son analyse locale de secours.

**Endpoint utilisé :** `GET https://api.companyenrich.com/v2/companies/enrich` (et aussi l'ancien endpoint sans `/v2` au cas où)

**Paramètres :**
- `domain` : Le domaine à analyser
- Headers : `Authorization: Bearer VOTRE_CLE`

**Si l'API échoue ou n'est pas configurée :**
Konsole utilise son **analyse locale intelligente** qui :
- Devine le secteur d'activité à partir du contenu du site
- Détecte le modèle économique
- Estime la taille de l'entreprise
- Et bien plus !

---

## Limites Actuelles

| Limite | Détail |
|---------|-------------|
| Sites lourds en JavaScript | Les sites qui s'affichent entièrement via JavaScript côté client peuvent renvoyer un contenu minimal — le scraper ne voit que le HTML initial |
| Sites protégés | Les sites derrière une connexion, des défis Cloudflare ou des CAPTCHA renverront des erreurs |
| Niveau gratuit Hunter.io | Limité à 25 requêtes/mois |
| Détection du secteur | Heuristique basée sur des motifs — les secteurs de niche peuvent être mal classés |
| Pas de cache | Chaque analyse récupère à nouveau toutes les sources |

---

## Ce que je pourrais améliorer avec plus de temps

1. **Couche de cache** : Redis ou Vercel KV pour mettre en cache les analyses par domaine (TTL : 24h)
2. **Tâches en arrière-plan** : Décharger les API lentes vers une file d'attente pour que l'interface ne se bloque pas
3. **Détection technique étendue** : API BuiltWith ou Wappalyzer pour une empreinte plus riche de la pile
4. **Signaux LinkedIn** : Taille du personnel vérifiée, embauches récentes, stade de financement
5. **Suivi historique** : Enregistrer les résultats dans une base de données et suivre les changements au fil du temps
6. **Export CRM** : Export en un clic vers HubSpot/Salesforce
7. **Analyse en masse** : Téléchargement CSV pour analyser une liste de domaines en lot
8. **Interface de réglage des scores** : Permettre aux utilisateurs de définir leurs propres poids ICP

---

## Licence

MIT
