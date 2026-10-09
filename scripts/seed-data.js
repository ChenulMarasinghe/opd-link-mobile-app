/**
 * Seed script to populate Firebase Firestore with initial OPD-Link data.
 * Run with: node scripts/seed-data.js
 */
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const inTwoDays = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

const doctors = [
  {
    name: 'Dr. Amanda Silva',
    department: 'General OPD',
    hospital: 'Colombo National Hospital',
    room: 'Room 12',
    maxTokens: 45,
    consultingSlots: ['08:30 AM - 12:00 PM', '01:30 PM - 04:30 PM'],
    consultingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    active: true,
  },
  {
    name: 'Dr. Rohan Perera',
    department: 'General OPD',
    hospital: 'Colombo National Hospital',
    room: 'Room 14',
    maxTokens: 40,
    consultingSlots: ['08:30 AM - 12:30 PM'],
    consultingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    active: true,
  },
  {
    name: 'Dr. Priyantha Silva',
    department: 'Cardiology',
    hospital: 'Colombo National Hospital',
    room: 'Room 04',
    maxTokens: 35,
    consultingSlots: ['09:00 AM - 01:00 PM', '03:00 PM - 06:00 PM'],
    consultingDays: ['Mon', 'Wed', 'Fri'],
    active: true,
  },
  {
    name: 'Dr. Kanchana Jayawardena',
    department: 'Cardiology',
    hospital: 'Colombo National Hospital',
    room: 'Room 06',
    maxTokens: 30,
    consultingSlots: ['08:00 AM - 12:00 PM'],
    consultingDays: ['Tue', 'Thu', 'Sat'],
    active: true,
  },
  {
    name: 'Dr. Niluka Senaratne',
    department: 'Dental',
    hospital: 'Colombo National Hospital',
    room: 'Room 21',
    maxTokens: 25,
    consultingSlots: ['09:00 AM - 01:30 PM'],
    consultingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    active: true,
  },
  {
    name: 'Dr. Kamal Fernando',
    department: 'Dental',
    hospital: 'Colombo National Hospital',
    room: 'Room 22',
    maxTokens: 28,
    consultingSlots: ['01:00 PM - 05:00 PM'],
    consultingDays: ['Mon', 'Wed', 'Fri', 'Sat'],
    active: true,
  },
  {
    name: 'Dr. Anoma Wijesinghe',
    department: 'ENT',
    hospital: 'Colombo National Hospital',
    room: 'Room 08',
    maxTokens: 35,
    consultingSlots: ['08:30 AM - 12:30 PM'],
    consultingDays: ['Mon', 'Tue', 'Thu', 'Fri'],
    active: true,
  },
  {
    name: 'Dr. Suneth Bandara',
    department: 'Orthopedics',
    hospital: 'Colombo National Hospital',
    room: 'Room 18',
    maxTokens: 30,
    consultingSlots: ['09:00 AM - 02:00 PM'],
    consultingDays: ['Tue', 'Wed', 'Thu', 'Sat'],
    active: true,
  },
];

const clinicWings = [
  {
    name: 'General OPD Unit 1',
    building: 'Outpatient Complex B',
    floor: 'Ground Floor',
    rooms: 'Rooms 11 - 16',
    maxDailyTokens: 120,
    clinicHead: 'Dr. Amanda Silva',
    operatingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    active: true,
  },
  {
    name: 'Cardiology Wing A',
    building: 'Main Hospital Tower A',
    floor: '2nd Floor',
    rooms: 'Rooms 01 - 06',
    maxDailyTokens: 70,
    clinicHead: 'Dr. Priyantha Silva',
    operatingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    active: true,
  },
  {
    name: 'Dental Clinic Suite',
    building: 'Dental Health Institute',
    floor: '1st Floor',
    rooms: 'Rooms 21 - 25',
    maxDailyTokens: 60,
    clinicHead: 'Dr. Niluka Senaratne',
    operatingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    active: true,
  },
  {
    name: 'ENT Special Care Wing',
    building: 'Specialized Clinics Wing',
    floor: '3rd Floor',
    rooms: 'Rooms 07 - 10',
    maxDailyTokens: 50,
    clinicHead: 'Dr. Anoma Wijesinghe',
    operatingDays: ['Mon', 'Tue', 'Thu', 'Fri'],
    active: true,
  },
  {
    name: 'Orthopedics & Trauma Center',
    building: 'Surgical & Ortho Complex',
    floor: 'Ground Floor',
    rooms: 'Rooms 17 - 20',
    maxDailyTokens: 60,
    clinicHead: 'Dr. Suneth Bandara',
    operatingDays: ['Tue', 'Wed', 'Thu', 'Sat'],
    active: true,
  },
];

async function seed() {
  console.log('Seeding doctors...');
  for (const doc of doctors) {
    await addDoc(collection(db, 'doctors'), doc);
  }

  console.log('Seeding clinic wings...');
  for (const wing of clinicWings) {
    await addDoc(collection(db, 'clinicWings'), { ...wing, createdAt: serverTimestamp() });
  }

  console.log('Done!');
}

seed().catch(console.error);
