# LivSight — Analytics PostHog (App client)

Intégration de PostHog (EU cloud) dans l'**app client** : `$screen` à noms stables, identité liée à la session Keycloak, catalogue typé de **20** events métier/features/UX, et super property `app_source: "app_client"` sur chaque event (projets PostHog partagés entre apps).

**Dernière mise à jour :** 2026-11-28  
**Région :** EU — `https://eu.i.posthog.com`  
**Plan LIV-132 :** [SCREEN_UX_ANALYTICS_PLAN.md](./SCREEN_UX_ANALYTICS_PLAN.md)  
**Plan LIV-135 :** [OPERATIONAL_ENGAGEMENT_ANALYTICS_PLAN.md](./OPERATIONAL_ENGAGEMENT_ANALYTICS_PLAN.md)  
**Voir aussi :** [PUSH_NOTIFICATIONS_CLIENT.md](./PUSH_NOTIFICATIONS_CLIENT.md) (events `notification_*`)

---

## État de l'intégration

| Maillon | Statut |
|---------|--------|
| SDK `posthog-react-native` + provider | ✅ |
| `$screen` manuel (noms stables + dedupe) — `captureScreens: false` | ✅ (LIV-132) |
| `identify(keycloakId)` au login / `reset()` au logout | ✅ |
| Catalogue typé des **20** events (P1–P4) | ✅ |
| Super property `app_source: "app_client"` | ✅ |
| Dev local → *LivSight Development* (clé dans `.env`) | ✅ |
| Staging / preview (EAS) → *LivSight Development* | ✅ clé présente (confirmé produit) |
| Build production → *LivSight Production* (expo.dev, env `production`) | ✅ |
| Dashboard engagement opérationnel (Development) | ✅ (LIV-135) — [board Dev](https://eu.posthog.com/project/309706/dashboard/1159076) |
| Dashboard engagement opérationnel (Production) | ⏳ twin à créer (Phase 5 LIV-135) sur [309875](https://eu.posthog.com/project/309875) |

**Après rollout store :** confirmer sur *LivSight Production → Activity* que les events arrivent avec `app_source: app_client`.

---

## Architecture

```
lib/analytics/
├── posthogConfig.ts             # Lit EXPO_PUBLIC_POSTHOG_API_KEY/HOST ; null = désactivé
├── client.ts                    # Singleton PostHog + register(app_source)
├── AnalyticsProvider.tsx        # <PostHogProvider> ; captureScreens: false
├── events.ts                    # Catalogue typé AnalyticsEvents + track()
├── mappers.ts                   # Raisons d'échec, normalisation endpoint, scroll
├── screenNames.ts               # Pathname → nom d'écran stable + dedupe $screen
├── emptyUx.ts                   # Classification recherche vide / état vide
├── useAnalyticsIdentity.ts      # identify / reset
├── useScreenAnalytics.ts        # $screen sur navigation Expo Router
├── useEmptyUxTracking.ts        # recherche_sans_resultat / etat_vide_affiche
└── useQuartierLookupTracking.ts # quartier_recherche
```

**Principes :**

1. **Clé absente = tout désactivé.** `getPostHogConfig()` → `null` sans `EXPO_PUBLIC_POSTHOG_API_KEY` → pas de provider, `track()` / `screen()` no-op.
2. **Noms d'events figés.** Tout nouvel event s'ajoute d'abord dans `AnalyticsEvents` (`lib/analytics/events.ts`).
3. **Zéro PII.** Pas de noms, téléphones, adresses, montants, **ni requête de recherche brute** dans les propriétés des events UX. `erreur_api` masque les IDs (`normalizeEndpoint`). Identité = `keycloakId` (UUID technique).
4. **Fire-and-forget.** `track()` / capture écran n'échouent jamais vers l'UI.
5. **Un event = un point de capture** (+ dedupe explicite pour `$screen` et empty/search).
6. **`app_source: "app_client"`** via `client.register()` — filtrer tous les insights dessus.

## Architecture des projets PostHog

| Projet PostHog | Contenu |
|----------------|---------|
| **LivSight Development** | apps en dev / staging |
| **LivSight Production** | apps en production |

Filtrer par `app_source` (`app_client` pour cette app).

## Séparation des environnements

| Build | Source de la clé | Projet PostHog |
|-------|------------------|----------------|
| Dev (Xcode/Metro) | `.env` local (jamais commité) | LivSight Development |
| Staging / preview (EAS) | variable expo.dev (clé Development) | LivSight Development |
| Production (EAS) | expo.dev → env **production** | LivSight Production |

⚠️ **Repo public** : pas de clés dans `eas.json` (seul `EXPO_PUBLIC_POSTHOG_HOST` y est). Clés d'ingestion sur expo.dev / `.env` local uniquement.

```bash
# .env (dev) — jamais commité
EXPO_PUBLIC_POSTHOG_API_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

## Navigation — `$screen`

- **Pas** d'autocapture d'écrans (`captureScreens: false`) pour éviter les doublons.
- `useScreenAnalytics(pathname)` appelle `client.screen(stableName)` une fois par navigation réelle (dedupe re-render).
- Noms stables : table dans [SCREEN_UX_ANALYTICS_PLAN.md — appendix C](./SCREEN_UX_ANALYTICS_PLAN.md#c-proposed-stable-screen-names-phase-2) (`accueil`, `courses`, `livraison_detail`, …). Les segments dynamiques (id, uuid) sont exclus du nom.
- Toujours avec `app_source: app_client` (super property).
- Autres lifecycle SDK : Application Opened/Backgrounded/Installed/Updated, device context, `$identify` / `reset`.

## Catalogue des events (20)

### P1 — Métier

| Event | Déclencheur | Propriétés |
|-------|-------------|------------|
| `demande_soumise` | succès `createTransaction` (écrans resume) | `flow`, `source`, `nb_produits` |
| `demande_echouee` | échec `createTransaction` | `flow`, `source`, `erreur` (≤120c) |
| `demande_abandonnee` | démontage resume sans soumission | `flow`, `etape` (`resume`) |
| `connexion_reussie` | succès `login()` | — |
| `connexion_echouee` | échec `login()` | `raison` : identifiants / serveur / reseau / inconnue |
| `annulation_demandee` | succès `cancelTransaction` | `raison` |
| `ajout_stock_soumis` | succès `createPackage` | `nb_produits` |
| `ajout_stock_echoue` | échec `createPackage` | `erreur` |

### P2 — Features

| Event | Déclencheur | Propriétés |
|-------|-------------|------------|
| `quartier_recherche` | lookup tarif résolu (resume), 1×/quartier | `terme`, `trouve` — `trouve: false` = hors couverture (expansion) |
| `rapport_visualise` | PDF chargé | `type_rapport`, `periode` |
| `document_telecharge` | partage ou téléchargement PDF | `type_rapport`, `periode`, `action` |
| `document_echec` | échec PDF | `type_rapport`, `erreur` |
| `courses_filtrees` | filtre Mes Courses | `filtre_statut`, `filtre_periode` |
| `notification_recue` | push reçue | `type` |
| `notification_ouverte` | tap push | `type`, `ecran_cible` |
| `tarif_zone_consulte` | ouverture tarifs-zone | `zone` (id) |

### P3 — Profondeur

| Event | Déclencheur | Propriétés |
|-------|-------------|------------|
| `rapport_scroll` | paliers 50/100 sur Rapports | `profondeur` |
| `conversation_ouverte` | montage inbox/[id] | — |
| `erreur_api` | 5xx dans `apiFetch` | `endpoint` normalisé, `statut` |

### P4 — UX empty / search (LIV-132)

| Event | Déclencheur | Propriétés |
|-------|-------------|------------|
| `recherche_sans_resultat` | recherche libre → 0 résultat (stock, tarifs, conversations) | `contexte` uniquement — **pas** la requête |
| `etat_vide_affiche` | liste / filtre vide affiché | `ecran`, `motif` (`liste_vide` \| `filtre`) |

**Exclusion mutuelle :** si une recherche active explique le vide → seulement `recherche_sans_resultat`, jamais les deux.

Écrans `etat_vide_affiche` : `stock`, `tarifs`, `courses`, `conversations`, `notifications`, `tarifs_zone`, `rapports`.

## Alias et features indisponibles

| Nom demandé / générique | Statut |
|-------------------------|--------|
| `action_echouee` | **Non ajouté** — utiliser `demande_echouee`, `connexion_echouee`, `ajout_stock_echoue`, `document_echec`, `erreur_api` |
| `support_contacte` | **Indisponible** — pas de surface « contacter le support » dans l'app |
| Recherche quartier hors zone | Rester sur `quartier_recherche` + `trouve: false` (pas `recherche_sans_resultat`) |
| Notification lifecycle avancé | **LIV-23** |
| Session replay | **LIV-31** |
| `rapport_consulte` (legacy) | **Ne pas utiliser** pour l'app client — trafic `app_agent` ; client = `rapport_visualise` |
| Taux d'erreur API (%) | **Indisponible** — pas de volume d'appels réussis ; dashboard = **count** `erreur_api` |
| Livraisons terminées / user | **Indisponible** — utiliser « demandes soumises » (`demande_soumise`), pas le statut transporteur |

---

## Dashboard engagement opérationnel (LIV-135)

Board PostHog pour mesurer l'usage opérationnel réel (pas seulement les opens).  
**Development :** [Client operational engagement](https://eu.posthog.com/project/309706/dashboard/1159076) (projet `309706`, TZ **UTC**).  
**Production :** recreer le même board sur [309875](https://eu.posthog.com/project/309875) (projets séparés — pas de copie auto).

### Règles communes

- Filtrer **toujours** `app_source = app_client` (projet Dev partagé avec d'autres apps).
- Semaines **lundi–dimanche** (UTC sur Development).
- Identité = utilisateur Keycloak (`keycloakId`) — **pas** d'entité « merchant ».
- **Aucun nouvel event** pour v1 : réutilisation du catalogue des 20 events + `$screen` + `Application Opened`.

### Métriques → events

| Métrique (board) | Signal | Dénominateur / notes |
|------------------|--------|----------------------|
| Active users (W/M) | Unique users avec `$screen` | Semaine / mois complets |
| Engaged users (hebdo) | Unique users avec `demande_soumise` **OU** (`$screen` ∧ `$screen_name = stock`) **OU** `rapport_visualise` | OR PostHog `GroupNode` |
| Feature adoption | Unique users par `$screen_name` | Breakdown sur `$screen` |
| Active days | Stickiness sur `$screen` | Jours d'activité sur 30 j |
| Rétention 30 j | Retention `$screen` → `$screen` | First-time cohorts |
| Inactive | Lifecycle `$screen` — statut **dormant** | Proxy « inactif » |
| Opens / user | `Application Opened` total ÷ unique openers | Formule `A/B` |
| Report downloads | `document_telecharge` | Peut être vide si flux non exercé en Dev |
| API reliability | Count `erreur_api` | **Pas** un % |
| Demandes / user | `demande_soumise` total ÷ unique requesters | Soumissions, pas livraisons terminées |

Détail phases / handoff agents : [OPERATIONAL_ENGAGEMENT_ANALYTICS_PLAN.md](./OPERATIONAL_ENGAGEMENT_ANALYTICS_PLAN.md).

## Ajouter un nouvel event

1. Déclarer le nom + propriétés dans `AnalyticsEvents` (`lib/analytics/events.ts`).
2. Appeler `track("mon_event", { ... })` au point de capture **unique**.
3. Logique non triviale → helper pur (`mappers.ts`, `emptyUx.ts`, `screenNames.ts`, …) + test sous `__tests__/lib/analytics/`.

## Latence & debug

- Batch SDK : ~20 events ou ~10 s ; flush en arrière-plan.
- Visible dans **Activity** (eu.posthog.com) en < 1 min.
- VPN / bloqueurs DNS peuvent empêcher `eu.i.posthog.com`.

## Tests

`__tests__/lib/analytics/` — config, client (`app_source`), `track`, mappers, identité, **screenNames**, **emptyUx**.

```bash
npm test -- --testPathPattern=lib/analytics
```

## Historique (résumé)

1. SDK + env + identité + catalogue métier/features/profondeur.
2. Projets partagés Development/Production + `app_source: app_client`.
3. **LIV-132** — `$screen` stable + dedupe ; `recherche_sans_resultat` / `etat_vide_affiche` ; docs alias / indisponibles.
4. **LIV-135** — dashboard engagement opérationnel (Development) ; métriques documentées ; twin Production à suivre.
