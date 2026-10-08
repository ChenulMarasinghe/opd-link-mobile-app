# OPD Link

A mobile application that lets patients book OPD appointments online and track their queue status in real time, while giving hospital administrators and IT support staff the tools to manage patient flow and monitor the system.

Built for IT3060 Human Computer Interaction, Milestone 03, SLIIT (Group 107).

## Tech Stack

- React Native (Expo, Expo Router)
- Cloud Firestore

## Team

| Student ID | Name            | Responsibility                                                                           |
| ---------- | --------------- | ---------------------------------------------------------------------------------------- |
| IT23722040 | Randiya M A C   | Patient: Login, Dashboard, Upcoming/Past Appointments, Appointment Details, Queue Status |
| IT23750906 | Bandara J M R N | Patient: Book Appointment, Date & Time, Notifications, Clinic Status, Profile & Settings |
| IT23756700 | Kavinth M       | Hospital Administrator screens                                                           |
| IT23739666 | Gampalage D T P | Hospital IT Support screens                                                              |

## Prerequisites

- Node.js (LTS) and npm
- Git
- Expo Go app on an Android/iOS phone (same Wi-Fi as your computer)

## Setup

```bash
git clone https://github.com/<owner>/opd-link-mobile-app.git
cd opd-link-mobile-app
npm install
```

## Run the app

```bash
npx expo start
```

Scan the QR code with Expo Go. If it won't connect, use `npx expo start --tunnel`.

## System diagnostics

The IT Monitoring page includes a **System Diagnostics** card for IT Supporter
accounts. `Run Diagnostics` performs a real server-only Firestore read against
`systemHealth/current`, measures the request round-trip time, reports backend
and database connectivity, and classifies the overall result as healthy,
warning, critical, or unavailable. Failed checks are written to the existing
`errorLogs` collection using stable diagnostic document IDs so repeated checks
do not create duplicate failure records.

This repository does not contain a separate Express, Node, or MongoDB backend;
Firebase Authentication and Cloud Firestore are the application's backend
services. The diagnostics service therefore uses Firestore's server read
operation as the backend health boundary instead of inventing an `/api/it`
endpoint. The action is limited in the client to profiles with the `it` role;
Firestore security rules should enforce the same role restriction in deployed
Firebase configuration.

To demonstrate the feature:

1. Sign in with an IT Supporter account.
2. Open **IT Monitoring** and select **Run Diagnostics**.
3. Confirm the loading spinner, four status rows, response time, and last
   checked timestamp.
4. Select **Run Again** to verify repeat execution.
5. To demonstrate an unavailable result, run with Firebase configuration
   unavailable or Firestore access denied; the UI reports the failure and
   allows retrying without displaying a false healthy result.

## Firebase configuration

Create the environment file at the project root (not inside `src/`) using the
Firebase Web App configuration shared by the team. The IT dashboard uses these
values for its Firestore monitoring and diagnostics:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

Expo loads `.env` files from the project root. Never commit this file or share
its values publicly.

## Build the APK

_(To be added.)_

## Branching

- `main` is protected. Work on your own `feature/...` branch and open a pull request.
