# Requirements Traceability Matrix

| Requirement ID | Requirement | Prototype Screen (Milestone 02) | Implemented Screen / File | Implemented? | Test Case IDs | Notes / Deviation |
|---|---|---|---|---|---|---|
| FR01 | Patients book OPD appointments online by selecting available date/time. | Booking; Date & Time | `BookAppointmentScreen.tsx`; `bookingService.ts` | Partial | TC-BOOK-01, 02; TC-DATE-01, 02; TC-CRUD-01; TC-E2E-01, 02 | Booking exists; verify live schedule data. |
| FR02 | Displays doctor availability and appointment slots. | Booking; Date & Time; Manage Doctors | `bookingService.ts`; `appointmentSchedule.ts`; `ManageOPD.tsx` | Partial | TC-DATE-01, 02; TC-DOCTOR-01, 02, 03; TC-E2E-02 | Derived from doctor schedule, OPD sessions and reservations. |
| FR03 | Provides appointment confirmations and reminders. | Details; Notifications | `bookingService.ts`; `notificationService.ts` | Partial | TC-BOOK-01; TC-UPCOMING-01; TC-PAST-01; TC-DETAIL-01; TC-NOTIF-01, 02; TC-CRUD-01, 03; TC-APPT-DELETE-01; TC-FEEDBACK-01; TC-E2E-01, 03 | Confirmation notification exists; scheduled reminders are not established. |
| FR04 | Patients view queue/token status and estimated consultation time. | Queue Status | `QueueStatusScreen.tsx`; `queueStatus.ts` | Partial | TC-QUEUE-01, 02; TC-E2E-01, 03 | Listeners/token fields exist; estimate accuracy needs runtime check. |
| FR05 | Sends turn-approaching notifications. | Queue Status; Notifications | `queueStatus.ts`; `notificationService.ts` | Partial | TC-QUEUE-03; TC-NOTIF-01; TC-E2E-01 | In-app creation is screen-driven; push/background delivery is not established. |
| FR06 | Real-time doctor availability and clinic delays. | Clinic Status; Broadcast Delay | `clinicStatusService.ts`; `adminService.ts` | Partial | TC-CLINIC-01, 02; TC-BROADCAST-01, 02; TC-CRUD-06; TC-E2E-02 | Snapshots support updates; verify both clients and rules. |
| FR07 | Admin monitors patient flow, waiting times and appointments. | Admin Dashboard; Appointment; Queue | Admin screen files | Partial | TC-ADMINDASH-01; TC-APPT-01, 02; TC-QUEUE-01–04; TC-CRUD-05; TC-E2E-01–03 | Operational screens exist; validate counts and dispositions together. |
| FR08 | Generates OPD reports (counts, waiting times, availability). | Admin Dashboard | `AdminDashboard.tsx` | No | TC-ADMINDASH-01 | Dashboard summary is tested; report generation/export is not evident. |
| NFR01 | Simple, user-friendly interface. | All screens | `src/screens/` | Partial | TC-LAUNCH-01; TC-DASH-01; TC-PROFILE-01, 03; TC-CRUD-04 | Requires usability study. |
| NFR02 | Multilingual support, particularly Sinhala. | Profile & Settings | `ProfileSettingsScreen.tsx`; `profileService.ts` | Partial | TC-PROFILE-02 | Preference saves; full Sinhala localization is not established. |
| NFR03 | Secure authentication and role-based access. | Login; Register; Verify; role routing | `auth.ts`; `src/app/index.tsx`; deployed rules | Partial | TC-LOGIN-01, 02; TC-REGISTER-01–03; TC-VERIFY-01, 02; TC-DETAIL-02; TC-BOOK-02; TC-CRUD-02 | Client routing exists; backend authorization depends on deployed Firestore rules. |
| NFR04 | High availability and reliability. | IT Monitoring; IT Dashboard | `monitoringService.ts`; `diagnosticsService.ts` | Partial | TC-ITDASH-01; TC-MON-01, 02; TC-E2E-01 | Checks exist; no availability guarantee. |
| NFR05 | Fast response times. | IT Monitoring | `monitoringService.ts`; `diagnosticsService.ts` | Partial | TC-MON-01, 02 | One read is timed; no representative load/latency target. |
| NFR06 | Automatic backups and recovery. | Maintenance & Backup | `backupService.ts`; IT screen | No | TC-ITDASH-01; TC-BACKUP-01, 02; TC-CRUD-08 | Manual action writes simulation metadata; scheduled backup/restore not established. |
| NFR07 | Easy for hospital staff to learn and use. | Admin screens | `src/screens/admin/` | Partial | TC-ADMINDASH-01; TC-QUEUE-01–03 | Assess with representative staff. |
| NFR08 | Maintainability, monitoring and error logging. | IT Monitoring; Error Logs; Maintenance | monitoring/error/maintenance services | Partial | TC-MON-01, 02; TC-ERROR-01–03; TC-MAINT-01, 02; TC-BACKUP-01; TC-CRUD-07, 08 | Verify operational coverage and failure paths. |

## Gaps

- **FR08:** Report generation/export is not evident. Dashboard counts are not a generated report.
- **FR03:** Confirmation notification exists; timed reminder delivery is not established.
- **FR05:** In-app turn notification logic exists, but push delivery when the app is not open is not established.
- **NFR02:** Language preference exists; full Sinhala translation across screens is not established.
- **NFR03:** Role routing is not a security boundary. Verify deployed Firestore rules, including cross-patient access.
- **NFR04/NFR05:** Current checks do not prove production availability or app-wide response-time targets.
- **NFR06:** Backup simulation does not establish automatic data backup or recovery.
- Every listed requirement has at least one planned test ID. Results remain unfilled until humans run the tests.
