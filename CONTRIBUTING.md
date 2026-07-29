# Contribuer à LivSight Client

Bienvenue ! Ce guide t'aide à configurer ton environnement et à respecter les conventions du projet.

---

## Setup local

### Prérequis

- **Node 20+** (voir `.nvmrc`)
- npm (livré avec Node)
- Expo CLI : `npx expo`
- Un simulateur iOS (Xcode) ou un émulateur Android (Android Studio), ou un appareil physique

### Installation

```bash
nvm use            # charge la version Node du projet
npm install
cp .env.example .env
```

Éditer `.env` avec l'URL du gateway :

| Contexte | `EXPO_PUBLIC_GATEWAY_URL` |
|----------|--------------------------|
| Simulateur local | `http://localhost:4040` |
| Appareil physique | `http://<IP-LAN>:4040` (même réseau que le téléphone) |
| Staging distant | `https://staging-gateway.livsight.com` |

Redémarrer Metro après modification du `.env` : `npx expo start --clear`.

### Commandes courantes

```bash
npm start              # Expo dev server (Expo Go)
npm run start:dev      # Dev client (build natif custom)
npm run ios            # Simulateur iOS
npm run android        # Émulateur Android
npm run lint           # ESLint
npm test               # Jest — doit passer avant toute PR
npm run test:watch     # Mode watch pendant le dev
npm run test:coverage  # Couverture (branches lib/)
```

---

## Modèle de branches

```
main        ← production (Play Store / App Store)
staging     ← intégration, APK preview interne
feature/*   ← développement courant
```

1. Créer `feature/<nom-court>` depuis `staging`.
2. Développer, pusher, ouvrir une PR vers `staging`.
3. Après validation : merger dans `staging`.
4. Release : merger `staging` → `main`, puis build EAS **manuel** si besoin (`npm run eas:build:production`).

Détails CI et builds : [`docs/BUILD_CI.md`](docs/BUILD_CI.md).

---

## Convention de commits

Nous suivons **[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)** (détails : `.cursor/rules/conventional-commits.mdc`).

**Langue :** anglais. **Style :** impératif, ~72 caractères max.

```
<type>[optional scope]: <description>

[optional body]
```

### Types courants

| Type | Usage |
|------|--------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `test` | Tests |
| `refactor` | Refactor sans changement de comportement |
| `ci` | GitHub Actions |
| `build` | Dépendances, EAS |
| `chore` | Maintenance |

### Exemples

```
feat(stock): normalize product names to sentence case
fix(auth): retry once after silent refresh on 401
ci: replace EAS build job with lint and test only
docs: add CONTRIBUTING and docs index
```

**Breaking change :** `feat(api)!: remove legacy endpoint` ou footer `BREAKING CHANGE: …`

- Un commit = un changement logique.
- Ne pas commiter `.env`, secrets, `google-services.json`.
- Squash PR : le message final doit aussi respecter ce format.

---

## Test-Driven Development (obligatoire)

**Toute nouvelle logique, bug fix ou refacto nécessite des tests écrits en premier.**

1. **Red** — Écrire un test qui échoue décrivant le comportement attendu.
2. **Green** — Écrire le minimum de code pour faire passer le test.
3. **Refactor** — Nettoyer en gardant les tests verts.

Tests miroir de `lib/` → `__tests__/`. Détails complets : `.cursor/rules/tdd-mandatory.mdc`.

Exceptions (rares) : styling pur sans logique, config-only (`eas.json`), spikes exploratoires (tests avant merge).

---

## Règles de code

Les conventions détaillées sont dans `.cursor/rules/` (chargées automatiquement par Cursor) :

| Fichier | Résumé |
|---------|--------|
| `conventional-commits.mdc` | Format des messages de commit (Conventional Commits) |
| `tdd-mandatory.mdc` | TDD obligatoire, structure des tests, commandes |
| `livsight-styling-and-logging.mdc` | Fonts (Montserrat/Palanquin), tokens centralisés, logger |
| `hig-permissions-performance.mdc` | Apple HIG, Dynamic Type, permissions, performance |

**Points critiques :**

- **`AppText`** au lieu de `Text` (enforced par ESLint) — Dynamic Type.
- **`AppTextInput`** au lieu de `TextInput`.
- **`fontFamily`** au lieu de `fontWeight` — sinon fallback sur la font système.
- **`logger`** au lieu de `console.log` — `import { logger } from "@/lib/logger"`.
- Tokens de style dans `theme/tokens.ts` et `theme/styles.ts` — éviter les valeurs magiques.

---

## Checklist PR

Avant de demander une review, vérifier :

- [ ] Test(s) écrit(s) **avant** le code (TDD red → green → refactor)
- [ ] `npm test` passe
- [ ] `npm run lint` passe
- [ ] Pas de nouveau `console.log` dans le code app (utiliser `logger`)
- [ ] Pas de `fontWeight` sans `fontFamily` correspondant
- [ ] Captures d'écran jointes si changement UI (iOS + Android si possible)

Le template de PR (`.github/PULL_REQUEST_TEMPLATE.md`) reprend cette checklist.

---

## Structure du projet

Voir le [README.md](README.md) pour l'arborescence détaillée et la description des fonctionnalités.
Voir [`docs/README.md`](docs/README.md) pour l'index de la documentation technique.

---

## Questions ?

Ouvre une issue ou demande dans le channel de l'équipe.
