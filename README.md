# LivSight — Client mobile (Expo)

Application mobile **client** LivSight : livraisons, expéditions, stock, rapports.
UI en **français**.

**Stack :** React Native · Expo 56 · Expo Router · TypeScript · NativeWind · Jest

---

## Démarrage rapide

```bash
nvm use                # Node 20+ (voir .nvmrc)
npm install
cp .env.example .env   # puis éditer EXPO_PUBLIC_GATEWAY_URL
npx expo start --clear
```

| Contexte | `EXPO_PUBLIC_GATEWAY_URL` |
|----------|--------------------------|
| Simulateur local | `http://localhost:4040` |
| Appareil physique | `http://<IP-LAN>:4040` |
| Staging | `https://staging-gateway.livsight.com` |

---

## Commandes

### Développement

```bash
npm start              # Expo Go
npm run start:dev      # Dev client (build natif custom)
npm run ios            # Simulateur iOS (npx expo run:ios)
npm run android        # Émulateur Android (npx expo run:android)
npm run lint           # ESLint
npm test               # Jest — obligatoire avant toute PR
```

### Builds locaux (simulateur / émulateur)

```bash
npx expo run:ios       # Build + install sur simulateur iOS
npx expo run:android   # Build + install sur émulateur Android
```

Une fois le build installé, lancer Metro pour le développement :

```bash
npm run start:dev      # Connecte Metro au dev client installé
```

### Builds EAS (dev client, preview, production)

```bash
# Dev client — build natif pour Metro (appareil physique ou simulateur)
npm run eas:build:dev:ios
npm run eas:build:dev:android
# Puis : npm run start:dev

# Preview — APK staging (distribution interne, testeurs)
npm run eas:build:preview:ios
npm run eas:build:preview:android

# Production — AAB/IPA pour les stores
npm run eas:build:production          # Android + iOS
```

### Soumission stores

```bash
npx eas-cli submit --platform ios     # App Store Connect
npx eas-cli submit --platform android # Google Play Console
```

Détails complets (profils EAS, builds manuels) : [`docs/BUILD_CI.md`](docs/BUILD_CI.md)

La CI GitHub Actions exécute **lint + tests** sur chaque push/PR. Les builds EAS sont **manuels** (CLI ou dashboard Expo).

---

## Structure du projet

```
app/                   # Écrans (Expo Router file-based)
├── (tabs)/            # Onglets : Accueil, Courses, Rapports, Stock
├── livraison-detail/  # Détail livraison
├── expedition-detail/ # Détail expédition
└── ...

lib/                   # Logique métier
├── api/               # Clients API (transactions, packages, users...)
├── auth/              # Session Keycloak, tokens, guards
├── push/              # Push notifications

components/            # Composants réutilisables (AppText, cards, forms...)
theme/                 # Tokens (couleurs, typo, spacing) + styles partagés
__tests__/             # Tests Jest (miroir de lib/)
docs/                  # Documentation technique (index : docs/README.md)
```

---

## Documentation

| Doc | Contenu |
|-----|---------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setup, branches, conventions, checklist PR |
| [CLAUDE.md](CLAUDE.md) | Architecture détaillée (auth, API, navigation, design system) |
| [docs/README.md](docs/README.md) | Index de toute la documentation technique |
| [docs/BUILD_CI.md](docs/BUILD_CI.md) | Pipeline CI/CD, profils EAS, secrets |
