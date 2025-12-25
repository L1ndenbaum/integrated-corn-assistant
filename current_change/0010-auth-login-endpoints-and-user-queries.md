Change log - 0010

Summary:
- Added auth login endpoint shapes (username/email/phone) and session response format.
- Added active user lookup queries by username/email/phone.
- Updated frontend login flow to target separate auth endpoints and explicit login method selection.

Files:
- docs/auth.md
- services/user-service/db/queries/users.sql
- client/app/auth/login/page.tsx
