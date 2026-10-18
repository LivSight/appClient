# LivSight — Analytics PostHog (App client)

Intégration de PostHog (EU cloud) dans l'**app client** : autocapture de navigation, identité liée à la session Keycloak, et catalogue typé de 17 events métier/features.

**Dernière mise à jour :** 2026-10-18
**Région :** EU — `https://eu.i.posthog.com`
**Voir aussi :** [PUSH_NOTIFICATIONS_CLIENT.md](./PUSH_NOTIFICATIONS_CLIENT.md) (event `notification_ouverte`)

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

## Séparation dev / prod

| Build | Source de la clé | Projet PostHog |
|-------|------------------|----------------|
| Dev (Xcode/Metro) | `.env` local | projet dev |
| Production (EAS) | bloc `env` du profil `production` dans `eas.json` | projet prod (**à créer — clé pas encore ajoutée dans eas.json**) |

Même mécanisme que `EXPO_PUBLIC_GATEWAY_URL`. Les données dev et prod ne se mélangent jamais.

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

`__tests__/lib/analytics/` — 24 tests : config (clé/host), client (memoization, désactivé sans clé), `track` (no-op, props, jamais de throw), mappers (raisons login, normalisation endpoint, paliers scroll), hook identité (identify/reset/none).
