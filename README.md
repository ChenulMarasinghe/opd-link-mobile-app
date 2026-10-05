# OPD Link

A mobile application that lets patients book OPD appointments online and track their queue status in real time, while giving hospital administrators and IT support staff the tools to manage patient flow and monitor the system.

Built for IT3060 Human Computer Interaction, Milestone 03, SLIIT (Group 107).

## Tech Stack

- React Native (Expo, Expo Router)
- Firebase Authentication
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

## Firebase configuration

_(To be added: create a `.env` file with the Firebase keys shared by the team. Never commit it.)_

## Build the APK

_(To be added.)_

## Branching

- `main` is protected. Work on your own `feature/...` branch and open a pull request.
