# Store Compliance & Production Readiness

Issues to resolve before publishing to the Apple App Store and Google Play Store.
Each issue is numbered for tracking. Fix blockers before writing new features.

---

## 🔴 Category 1 — Security (fix immediately)

### 1.1 Firebase Admin SDK private key in the repository
**File:** `livsight-firebase-adminsdk-fbsvc-11b6b68e61.json`

This is a server-side private key. It must never live in a mobile app repo.
Anyone with access to the repo can impersonate your Firebase project with full admin rights.

**Actions:**
1. Go to Firebase Console → Project Settings → Service Accounts → revoke this key now.
2. Delete the file from the repo and add it to `.gitignore`.
3. This key should only ever exist on your backend server, never in the app.

### 1.2 `google-services.json` tracked in git
**File:** `google-services.json`

Lower severity than 1.1 but still not ideal. This file contains your Firebase project config
(API keys for the client SDK). It should be injected at build time via EAS secrets rather than
committed to the repo — especially if the repo is or will ever be public.

**Actions:**
1. Add `google-services.json` to `.gitignore`.
2. Upload it as an EAS secret: `eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file`.
3. Reference it in `eas.json` via the `googleServicesFile` field.

### 1.3 ngrok URL in `eas.json`
**File:** `eas.json`

Dev and preview builds point to a public ngrok tunnel (`birgit-genty-collette.ngrok-free.dev`).
Ngrok URLs expire and rotate — if this leaks into a production build the app will make requests
to a dead or potentially hijacked endpoint.

**Actions:**
1. Ensure `production` build profile in `eas.json` never inherits dev/preview env vars.
2. Set the real production API host via an EAS secret, not a hardcoded value.

---

## 🔴 Category 2 — Store Blockers (will be rejected without these)

### 2.1 Privacy Policy URL missing
Both stores require a live, publicly accessible Privacy Policy URL if the app collects
any user data. This app collects push notification tokens and likely user account data.

**Actions:**
- Write a Privacy Policy covering: push tokens, account data, device identifiers.
- Host it at a permanent URL (your website, a Notion page, etc.).
- Add the URL in App Store Connect (App Information) and Google Play Console (Store Listing).

### 2.2 Terms of Service URL missing
Required by both stores in addition to the Privacy Policy.

**Actions:**
- Write a Terms of Service document and host it at a permanent URL.
- Add it to both store listings alongside the Privacy Policy.

### 2.3 iOS App Privacy labels not filled in
**Where:** App Store Connect → Your App → App Privacy

Apple requires you to declare every category of data your app collects before submission.
Failing to declare data that the app actually collects is grounds for removal after the fact.

**Data to declare for this app:**
- Push notification tokens (Device ID / other data)
- Account data (name, phone number)
- Identifiers (user ID)

### 2.4 Android Data Safety form not filled in
**Where:** Google Play Console → Your App → Data Safety

Same requirement as 2.3 but for the Play Store. Must match what you declared in 2.3.

### 2.5 Duplicate `UIBackgroundModes` entry
**File:** `app.json` lines 16–17

`"remote-notification"` is listed twice in `UIBackgroundModes`. This is a bug that may
cause unexpected behavior and will likely trigger a warning during App Store validation.

**Fix:** Remove the duplicate entry:
```json
"UIBackgroundModes": ["remote-notification"]
```

### 2.6 Production API host not set
**File:** `eas.json`

The `production` build profile is empty (`{}`). The app will have no `EXPO_PUBLIC_API_HOST`
in production builds and all API calls will fail.

**Actions:**
1. Set the real production API base URL as an EAS secret.
2. Add it to the `production` profile in `eas.json`.

### 2.7 App Store screenshots missing
Apple requires screenshots for all mandatory device sizes before submission:
- 6.9" display (iPhone 16 Pro Max)
- 6.5" display (iPhone 14 Plus / 13 Pro Max)
- 5.5" display (iPhone 8 Plus)
- iPad Pro 13" (required if `supportsTablet: true`)

**Actions:** Capture screenshots in the iOS Simulator at each required size, or use a
tool like Fastlane Snapshot / Expo's screenshot tooling.

### 2.8 Age / content rating not set
**Where:** App Store Connect → App Information (age rating) / Play Console → Content Rating (IARC)

Both stores require a content rating before the app can go live.

**Actions:**
- Apple: fill in the age rating questionnaire in App Store Connect.
- Android: complete the IARC questionnaire in Play Console.

### 2.9 Minimum OS versions not declared
**File:** `app.json`

No `deploymentTarget` (iOS) or `minSdkVersion` (Android) is set. Stores require explicit
minimum version declarations. Expo 54 supports iOS 16+ and Android API 23+.

**Fix:**
```json
"ios": {
  "deploymentTarget": "16.0"
},
"android": {
  "minSdkVersion": 23
}
```

### 2.10 Deep link scheme is too generic
**File:** `app.json` — `"scheme": "appclient"`

`appclient` is a generic name. If another app on the device registers the same scheme,
deep links will silently break or open the wrong app.

**Fix:** Change to something unique:
```json
"scheme": "livsight"
```

---

## 🟡 Category 3 — Accessibility (Apple actively tests this)

### 3.1 No `accessibilityLabel` on interactive elements
Every `Pressable` that contains only an icon (no visible text) needs an `accessibilityLabel`
so VoiceOver / TalkBack can announce what it does. Examples: back buttons, close buttons,
the avatar/profile button on the home screen, the edit pencil on profile, filter chips.

**Fix pattern:**
```tsx
<Pressable accessibilityLabel="Retour" accessibilityRole="button" onPress={...}>
  <ArrowLeft />
</Pressable>
```

### 3.2 Color contrast likely below WCAG AA on some elements
WCAG AA requires a 4.5:1 contrast ratio for normal text. The following are at risk:
- `colors.muted` (`#3C4A3C`) on `colors.bg` (`#F8F9FA`) — borderline
- `opacity: 0.4` on muted text (version string in profile)
- `color: "#8A8F98"` on white backgrounds (order card labels)
- `color: "#94A3B8"` (tab inactive icons)

**Actions:** Run the palette through a contrast checker (e.g. WebAIM) and adjust colors
that fall below 4.5:1 for body text or 3:1 for large text/UI components.

### 3.3 Push permission asked too early
If `usePushNotifications` requests permission immediately on first launch (before the user
understands the app's value), Apple will flag this in review. The permission prompt must
be contextual — shown after the user has seen a reason to allow it.

**Action:** Verify when the permission prompt fires. Delay it until after login/onboarding
or trigger it from a specific user action.

### 3.4 Minimum tap target sizes
Apple HIG requires 44×44pt minimum for all interactive elements. Several icon buttons
in the app use exactly `width: 44, height: 44` which is the minimum — audit that none
are smaller, especially on the delivery detail and profile screens.

---

## 🟡 Category 4 — iPad Support

### 4.1 `supportsTablet: true` but layout is phone-only
**File:** `app.json`

`supportsTablet: true` means Apple will test the app on iPad and expect a usable layout.
The current design is single-column and will stretch awkwardly on a 12" screen.

**Choose one:**
- Set `supportsTablet: false` if iPad is out of scope.
- Or implement a responsive layout (split view, wider content columns) for iPad.

---

## 🟡 Category 5 — Legal & Privacy

### 5.1 GDPR / CCPA compliance
If any users are in the EU or California, you are legally required to:
- Obtain consent before collecting data (push tokens count).
- Allow users to request deletion of their data.
- Disclose data sharing with third parties (Firebase, any analytics).

**Actions:**
- Add an in-app consent screen shown on first launch.
- Implement a "Delete my account / data" option in the profile screen.
- Document your data retention and deletion policy.

---

## 🟡 Category 6 — Build & Release

### 6.1 Support URL / contact email missing
Both stores require a support URL or contact email in the store listing.
This is a required field — submission will be blocked without it.

### 6.2 iOS app icon must have no alpha channel
**File:** `assets/images/logo.png`

Apple rejects app icons that contain transparency. Open the file in any image editor
and verify it has no alpha channel, or export a flattened version specifically for the icon.

### 6.3 No crash reporting in production
The app has no Sentry, Bugsnag, or Firebase Crashlytics integration. You will be blind
to production crashes. Firebase is already configured — adding Crashlytics is minimal work.

**Actions:**
1. Add `@react-native-firebase/crashlytics` (or Sentry via `@sentry/react-native`).
2. Initialize it in `app/_layout.tsx`.

### 6.4 No root-level error boundary
An uncaught JavaScript error shows a blank white screen with no recovery path.
React requires an `ErrorBoundary` component at the root to catch and display a
fallback UI instead.

**Fix:** Wrap the root layout in an `ErrorBoundary` that shows a "something went wrong,
restart the app" screen with a button to reload.

---

## Summary

| Priority | Count | Action |
|----------|-------|--------|
| 🔴 Fix immediately (security) | 3 | 1.1 → 1.3 |
| 🔴 Fix before submission (blockers) | 10 | 2.1 → 2.10 |
| 🟡 Fix before submission (accessibility) | 4 | 3.1 → 3.4 |
| 🟡 Fix before submission (iPad) | 1 | 4.1 |
| 🟡 Fix before submission (legal) | 1 | 5.1 |
| 🟡 Fix before submission (build/release) | 4 | 6.1 → 6.4 |
| **Total** | **23** | |

**Start with 1.1** — revoke the Firebase admin SDK key before anything else.
