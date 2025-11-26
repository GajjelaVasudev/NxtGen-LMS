# Server: Authentication & Submission Model

This file documents the (dev/demo) authentication assumptions used by the server API endpoints in this repository.

Important: this project uses an explicit user-id-based auth model for submissions and grading endpoints in the current branch.

Design summary

- Students submit assignments by including their `userId` in the request (either as a form field for multipart uploads, or in JSON body). No bearer token is required for these flows.
- Instructors fetch submissions and grade using their `userId` as well. The server validates the user's role by reading the `users` table and requires the role to be `instructor` or `admin` before returning or modifying instructor-only resources.

Why this approach was chosen

- Removes dependency on browser Supabase sessions for submission and grading flows during local development and demos.
- Keeps the frontend lightweight: the UI sends a canonical `user.id` (from `AuthContext`) rather than relying on persisted Supabase tokens.

Endpoints & behavior (high-level)

- POST `/api/assignments/:assignmentId/submissions`
  - Expect: multipart form or JSON payload that includes `userId` (student DB UUID).
  - Files uploaded via multipart are stored in Supabase Storage; the server writes the storage path to `content.filePath` in the `assignment_submissions` row.
  - Returns the created submission record.

- GET `/api/instructor/submissions?userId=<INSTRUCTOR_DB_UUID>`
  - Server checks `users` table for `role` equal to `instructor` or `admin` for the supplied id.
  - Returns submissions for assignments created by that instructor.

- PATCH `/api/submissions/:submissionId/grade`
  - Expect: JSON body containing `graderId` (instructor DB UUID), `grade`, and optional `feedback`.
  - Server verifies `graderId` role and assignment ownership (unless admin), then writes grade/feedback.

- GET `/api/submissions/:submissionId/file`
  - Returns the submitted file. For server-stored files it will generate a signed URL from Supabase Storage and redirect the client. Legacy `fileUrl` and data URLs are still supported.

Security note

- This user-id-based approach is suitable for local development, demos, and environments where clients are trusted. It is NOT a replacement for proper authentication in production.
- For production deployments you should secure these endpoints with an authentication mechanism (bearer tokens, API keys, signed requests, or server-side session verification) and not rely solely on client-supplied `userId` values.

Migration suggestion

- If you later re-introduce Supabase session validation, consider a hybrid approach: accept `userId` for convenience in dev, but require a bearer token in production (controlled by `NODE_ENV`) or require an HMAC signature for server-to-server calls.

Contact

- See `Server/index.ts` and `Server/routes/submissions.ts` for the implementation details.
