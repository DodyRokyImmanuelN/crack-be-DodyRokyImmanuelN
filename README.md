# LMS Backend Documentation

Backend service for the LMS application. This project provides APIs for authentication, course management, learning progress, quizzes, payments, certificates, and AI learning assistance.

## Live Deployment

- Backend API: https://crack-be-dodyrokyimmanueln-production.up.railway.app
- Frontend: https://learnexa-ten.vercel.app/

## Tech Stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Xendit Payment Gateway
- Google Gemini AI
- Nodemailer
## Project Structure

```text
lms-backend/
├─ prisma/              # Database schema, migrations, and seed
├─ src/
│  ├─ common/           # Guards and decorators
│  ├─ database/         # Prisma module and service
│  ├─ modules/          # Feature modules
│  ├─ app.module.ts
│  └─ main.ts
└─ test/
```

## Main Features

- User registration, login, logout, and token refresh
- Forgot password and reset password flow
- Role-based access for admin and user
- Learning path, module, and lesson management
- Reading lessons and quiz lessons
- Quiz submission and attempt tracking
- User learning progress tracking
- Payment invoice creation with Xendit
- Automatic enrollment after successful payment
- Certificate listing and verification
- AI learning chatbot with Gemini fallback support

## Getting Started

Install dependencies:

```bash
cd crack-be-DodyRokyImmanuelN/lms-backend
npm install
```

Create a `.env` file:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME?schema=public"

JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

MAIL_HOST=smtp.example.com
MAIL_PORT=2525
MAIL_USER=your_mail_user
MAIL_PASS=your_mail_password
MAIL_FROM="LMS <no-reply@example.com>"
RESET_PASSWORD_URL=http://localhost:3000/reset-password

XENDIT_SECRET_KEY=your_xendit_secret_key
XENDIT_WEBHOOK_TOKEN=your_xendit_webhook_token

GEMINI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-2.5-flash
```

For production deployment, use:

```env
FRONTEND_URL=https://learnexa-ten.vercel.app
RESET_PASSWORD_URL=https://learnexa-ten.vercel.app/reset-password
```

Prepare the database:

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

Run the development server:

```bash
npm run start:dev
```

The API will be available at:

```bash
http://localhost:3001
```


## Available Scripts

```bash
npm run start        # Start the app
npm run start:dev    # Start in watch mode
npm run build        # Build the project
npm run start:prod   # Run production build
```

## Main API Groups

- `/auth` - Authentication and password reset
- `/users` - User profile and admin user management
- `/learning-paths` - Learning path CRUD and public course list
- `/modules` - Course module management
- `/lessons` - Lesson management
- `/quizzes` - Quiz data, submission, and attempts
- `/progress` - Lesson and module progress
- `/payments` - Xendit invoice and webhook
- `/enrollments` - User enrollments
- `/certificates` - User certificates and verification
- `/ai` - Learning chatbot

## Notes

- Do not commit `.env` files.
- Make sure `FRONTEND_URL` matches the frontend origin.
- Payment webhook requests must include the configured Xendit callback token.
- If `GEMINI_API_KEY` is not provided, the chatbot still works with contextual fallback responses.
