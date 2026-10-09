# OPD Link

OPD Link is a mobile app for outpatient department (OPD) appointment booking and queue tracking. Patients can manage appointments and view clinic and queue information. Hospital administrators can manage appointments and queues, and IT support staff can monitor system health and maintenance.

This project was developed for IT3060 Human Computer Interaction, Milestone 03, SLIIT (Group 107).

## Tech stack

- React Native with Expo SDK 57 and Expo Router
- TypeScript
- Firebase Authentication and Cloud Firestore
- EmailJS for email verification

## Requirements

- Node.js 22.13 or later (Expo SDK 57 requirement)
- npm
- Git
- Expo Go on an Android or iOS device, or an Android emulator / iOS simulator

For device testing, connect the phone and computer to the same network. Expo Go must support this project's SDK version; otherwise use an emulator or a compatible development build.

## Get the source

```bash
git clone https://github.com/ChenulMarasinghe/opd-link-mobile-app.git
cd opd-link-mobile-app
```

To contribute, create a branch and push it to the shared Git repository:

```bash
git switch -c feature/your-change
git add .
git commit -m "Describe your change"
git push -u origin feature/your-change
```

## Install dependencies

Install the versions recorded in `package-lock.json`:

```bash
npm ci
```

## Configure services

Create a local `.env` file by copying `.env.example`, then fill in the Firebase web app configuration and EmailJS values supplied by your project administrator.

```bash
cp .env.example .env
```

On PowerShell, use `Copy-Item .env.example .env` instead. The app reads these variables:

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase web app API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase web app ID |
| `EXPO_PUBLIC_EMAILJS_SERVICE_ID` | EmailJS service ID |
| `EXPO_PUBLIC_EMAILJS_TEMPLATE_ID` | EmailJS template ID |
| `EXPO_PUBLIC_EMAILJS_PUBLIC_KEY` | EmailJS public key |
| `EXPO_PUBLIC_EMAILJS_PRIVATE_KEY` | EmailJS access token used by the current verification implementation |

All `EXPO_PUBLIC_` variables are included in the client app bundle and are visible to app users. Do not put credentials or secrets in them. In particular, the EmailJS private key should be moved behind a trusted server before using real accounts or production data. Keep `.env` out of commits; the repository's ignore rules exclude local env files.

## Start the app

```bash
npm start
```

This starts Expo's development server. Scan its QR code with Expo Go, or press `a` to open Android or `i` to open the iOS simulator. If the phone cannot reach the computer over the local network, start the server with a tunnel:

```bash
npm start -- --tunnel
```

Platform-specific shortcuts are also available:

```bash
npm run android
npm run ios
npm run web
```

These scripts start Expo for the selected platform. Native modules beyond those bundled in Expo Go may require a development build.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
```

## Project structure

- `src/app/` — Expo Router routes and layouts
- `src/screens/` — patient, administrator, and IT support screens
- `src/components/` — shared and feature-specific UI components
- `src/services/` — Firebase and application service logic
- `src/context/` — shared React context
- `docs/testing/` — test plans, cases, traceability, and review findings

## Team

| Student ID | Name | Responsibility |
| --- | --- | --- |
| IT23722040 | Randiya M A C | Patient login, dashboard, appointments, details, and queue status |
| IT23750906 | Bandara J M R N | Patient booking, date and time selection, notifications, clinic status, and profile settings |
| IT23756700 | Kavinth M | Hospital administrator screens |
| IT23739666 | Gampalage D T P | Hospital IT support screens |

## License

See [LICENSE](LICENSE).
