# LivSight — Analytics PostHog (App client)

Intégration de PostHog (EU cloud) dans l'**app client** : autocapture de navigation, identité liée à la session Keycloak, catalogue typé de 17 events métier/features, et super property `app_source: "app_client"` sur chaque event (projets PostHog partagés entre apps).

**Dernière mise à jour :** 2026-10-23
**Région :** EU — `https://eu.i.posthog.com`
**Voir aussi :** [PUSH_NOTIFICATIONS_CLIENT.md](./PUSH_NOTIFICATIONS_CLIENT.md) (event `notification_ouverte`)

---

## État de l'intégration

| Maillon | Statut |
|---------|--------|
| SDK `posthog-react-native` + provider + autocapture écrans | ✅ |
| `identify(keycloakId)` au login / `reset()` au logout | ✅ |
| Catalogue typé des 17 events (P1 métier, P2 features, P3 profondeur) | ✅ |
| Super property `app_source: "app_client"` (events manuels + autocapture) | ✅ |
| Dev local → *LivSight Development* (clé dans `.env`) | ✅ vérifié sur device |
| Build production → *LivSight Production* (variable expo.dev, env `production`) | ✅ variable en place |
| Builds preview | ⏸️ volontairement sans analytics (pas de variable créée) |

**Vérification au premier build store** : installer l'app, naviguer/se connecter, puis sur *LivSight Production → Activity* confirmer que les events arrivent avec `app_source: app_client` dans leurs propriétés.

---

## Architecture

```
lib/analytics/
├── posthogConfig.ts            # Lit EXPO_PUBLIC_POSTHOG_API_KEY/HOST ; null = désactivé
├── client.ts                   # Singleton PostHog partagé (React + code non-React)
├── AnalyticsProvider.tsx       # <PostHogProvider> dans app/_layout.tsx + autocapture écrans
├── events.ts                   # Catalogue typé AnalyticsEvents + track()
├── mappers.ts                  # Helpers purs : raisons d'échec, normalisation endpoint, scroll
├── useAnalyticsIdentity.ts     # identify(keycloakId) au login, reset() au logout
└── useQuartierLookupTracking.ts # quartier_recherche quand le lookup tarif se résout
```

**Principes :**

1. **Clé absente = tout désactivé.** `getPostHogConfig()` retourne `null` sans `EXPO_PUBLIC_POSTHOG_API_KEY` → aucun provider monté, `track()` no-op. Jest et les devs sans clé ne touchent jamais le SDK.
2. **Noms d'events figés.** Renommer un event casse l'historique PostHog. Tout nouvel event s'ajoute d'abord dans `AnalyticsEvents` (`lib/analytics/events.ts`) — capturer hors catalogue est une erreur TypeScript.
3. **Zéro PII.** Pas de noms, téléphones, adresses, montants dans les propriétés. `erreur_api` masque les IDs numériques/UUID des endpoints (`normalizeEndpoint`). L'identité = `keycloakId` (UUID technique).
4. **Fire-and-forget.** `track()` n'échoue jamais (try/catch + log) — l'analytics ne doit jamais casser une soumission.
5. **Un event = un seul point de capture** pour éviter les doublons dans les stats.
6. **`app_source: "app_client"` sur chaque event.** Les projets PostHog sont **partagés par toutes les apps LivSight** — cette super property (enregistrée via `client.register()` dans `client.ts`) identifie l'app émettrice sur les events manuels ET l'autocapture. Tout insight/dashboard doit filtrer sur `app_source`.

## Architecture des projets PostHog

**Deux projets pour tout l'écosystème LivSight — pas un projet par app :**

| Projet PostHog | Contenu |
|----------------|---------|
| **LivSight Development** | toutes les apps en dev/staging |
| **LivSight Production** | toutes les apps en production |

Chaque app se distingue par sa super property `app_source` (`app_client` pour cette app).

## Séparation dev / prod

| Build | Source de la clé `EXPO_PUBLIC_POSTHOG_API_KEY` | Projet PostHog |
|-------|------------------------------------------------|----------------|
| Dev (Xcode/Metro) | `.env` local (jamais commité — le build EAS ne le voit jamais) | LivSight Development |
| Preview/staging (EAS) | aucune variable → analytics **désactivés** (choix assumé ; créer la variable env `preview` sur expo.dev avec la clé Development le jour où on en veut) | — |
| Production (EAS) | expo.dev → Environment variables → env **production**, visibility *Plain text* (✅ en place) | LivSight Production |

⚠️ **Le repo est public** : les clés ne vont jamais dans `eas.json` (seul `EXPO_PUBLIC_POSTHOG_HOST`, non sensible, y est). Elles vivent dans le dashboard expo.dev (visibility "Plain text" — ce sont des clés d'ingestion publiques, pas des secrets ; une clé dans `eas.json` écraserait celle du dashboard, ne jamais y laisser une valeur vide). Les clés personnelles PostHog (`phx_...`) ne doivent exister nulle part dans le projet. Sans clé définie, les analytics sont proprement désactivés.

```bash
# .env (dev) — jamais commité
EXPO_PUBLIC_POSTHOG_API_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

## Collecté automatiquement (autocapture)

- `$screen` à chaque navigation (Expo Router) — `captureTouches: false` (pas de taps individuels)
- `Application Opened/Backgrounded/Installed/Updated`, durée de session
- Contexte device : modèle, OS, version app, langue, timezone
- `$identify` avec le `keycloakId` au login ; `reset()` au logout (`useAnalyticsIdentity`)

## Catalogue des events (17)

### P1 — Métier

| Event | Déclencheur | Propriétés |
|-------|-------------|------------|
| `demande_soumise` | succès `createTransaction` (2 écrans resume) | `flow` (livraison/expedition), `source` (stock/ramasse), `nb_produits` |
| `demande_echouee` | échec `createTransaction` | `flow`, `source`, `erreur` (message tronqué 120c) |
| `demande_abandonnee` | démontage d'un écran resume sans soumission | `flow`, `etape` ("resume" uniquement — l'abandon au formulaire n'est pas tracké) |
| `connexion_reussie` | succès `login()` (AuthProvider) | — |
| `connexion_echouee` | échec `login()` | `raison` : identifiants (4xx) / serveur (5xx) / reseau / inconnue |
| `annulation_demandee` | succès `cancelTransaction` (annulation.tsx) | `raison` (label prédéfini) |
| `ajout_stock_soumis` | succès `createPackage` (ajouter-au-stock.tsx) | `nb_produits` |
| `ajout_stock_echoue` | échec `createPackage` | `erreur` |

### P2 — Features

| Event | Déclencheur | Propriétés |
|-------|-------------|------------|
| `quartier_recherche` | lookup tarif résolu sur un écran resume (1×/quartier distinct) | `terme`, `trouve` — **`trouve: false` = quartier hors couverture → signal d'expansion** |
| `rapport_visualise` | PDF chargé dans rapport-pdf-preview | `type_rapport`, `periode` |
| `document_telecharge` | partage (preview) ou téléchargement direct (rapports) | `type_rapport`, `periode`, `action` (partage/telechargement) |
| `document_echec` | échec chargement/partage/téléchargement PDF | `type_rapport`, `erreur` |
| `courses_filtrees` | changement de filtre sur Mes Courses | `filtre_statut`, `filtre_periode` |
| `notification_ouverte` | tap sur une push (usePushNotifications) | `type` (data.type), `ecran_cible` (inbox/livraison-detail/expedition-detail) |
| `tarif_zone_consulte` | ouverture tarifs-zone/[zone] | `zone` (id) |

### P3 — Profondeur

| Event | Déclencheur | Propriétés |
|-------|-------------|------------|
| `rapport_scroll` | paliers de scroll sur Rapports, 1×/palier/visite (reset au focus) | `profondeur` (50 \| 100) |
| `conversation_ouverte` | montage inbox/[id] | — |
| `erreur_api` | réponse 5xx dans `apiFetch` (lib/api/client.ts) | `endpoint` (normalisé, IDs masqués), `statut` |

## Ajouter un nouvel event

1. Déclarer le nom + ses propriétés dans `AnalyticsEvents` (`lib/analytics/events.ts`).
2. Appeler `track("mon_event", { ... })` au point de capture **unique**.
3. Logique non triviale (mapping d'erreur, debounce, paliers) → fonction pure dans `mappers.ts` + test dans `__tests__/lib/analytics/`.

## Latence & debug

- Le SDK envoie par batch : 20 events ou ~10 s, flush forcé au passage en arrière-plan ; file persistée sur disque si l'app est tuée.
- Visible dans **Activity** (eu.posthog.com) en < 1 min. Rien après 2-3 min = vrai problème réseau.
- ⚠️ **Bloqueurs/VPN** (NordVPN Threat Protection, etc.) bloquent la résolution DNS de `eu.i.posthog.com` → `PostHogFetchNetworkError` dans Metro. Désactiver le VPN ou ajouter une exception.
- Pour un flush quasi instantané en debug : mettre l'app en arrière-plan après l'action.

## Tests

`__tests__/lib/analytics/` — 30 tests : config (clé/host), client (memoization, désactivé sans clé, `register` de `app_source` appelé une seule fois), `track` (no-op, props, jamais de throw), mappers (raisons login, normalisation endpoint, paliers scroll), hook identité (identify/reset/none).

## Historique de l'intégration (résumé)

1. **SDK + env** — `posthog-react-native` installé, provider dans `app/_layout.tsx`, clé lue depuis `EXPO_PUBLIC_POSTHOG_API_KEY` (host EU par défaut), plugin `expo-localization` ajouté à `app.json`.
2. **Identité** — `useAnalyticsIdentity` synchronise identify/reset avec la session (`keycloakId` uniquement, pas de PII).
3. **Events** — catalogue typé de 17 events implémentés en 3 phases (métier → features → profondeur), chacun à un point de capture unique, helpers purs testés.
4. **Projets partagés** — architecture à 2 projets PostHog pour tout l'écosystème (Development/Production) ; `app_source: "app_client"` enregistré en super property à la création du client.
5. **Repo public** — clés retirées de `eas.json` avant tout push ; la clé Production vit sur expo.dev (env `production`), la clé Development dans `.env` local.
