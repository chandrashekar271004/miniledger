# MiniLedger

MiniLedger is a mobile application for tracking money lent to friends. It helps users record loans, monitor due dates, track overdue amounts, and mark loans as repaid.

## Features

- Phone-number login with a mock OTP flow.
- Create loan entries with a friend's name, amount, and due date.
- View saved loan entries.
- Track total money lent, total money repaid, and overdue amounts.
- Highlight overdue loans.
- Mark loans as repaid and automatically update summary totals.
- Persist loan records in PostgreSQL.
- Authenticate API requests using JSON Web Tokens (JWT).
- Validate inputs using TypeScript validation helpers.

## Technology Stack

**Backend**
- Node.js
- TypeScript
- Express.js
- PostgreSQL
- JSON Web Tokens (JWT)

**Mobile**
- React Native
- Expo
- TypeScript

**Testing**
- Vitest
- Supertest

## Important Demo Limitation

Phone authentication currently uses a **mock OTP** that is printed in the backend terminal. This is intended for local development and demonstration only.

This implementation is not production-ready phone authentication. Before deploying the application for real users, replace the mock OTP with a trusted OTP provider and implement OTP expiration, rate limiting, abuse protection, and appropriate security controls.

## Requirements

Install the following software before running the project:

- Node.js 20 or later
- npm
- PostgreSQL 14 or later
- Git
- Expo Go on a compatible mobile device, or an Android/iOS simulator
- A code editor such as Visual Studio Code

## Project Structure

```text
miniledger/
├── backend/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   ├── schema.sql
│   └── .env.example
├── mobile/
│   ├── App.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── .gitignore
└── README.md
```

The exact files and folders may vary slightly depending on the current implementation.

## 1. Clone the Repository

Replace `YOUR_USERNAME` with your GitHub username.

```bash
git clone https://github.com/YOUR_USERNAME/miniledger.git
cd miniledger
```

If you have already downloaded the project, open its root directory instead.

## 2. Backend Setup

### Step 1: Install dependencies

Open a terminal in the `backend/` directory:

```bash
cd backend
npm install
```

### Step 2: Create the PostgreSQL database

Make sure PostgreSQL is running.

Create a database named `miniledger` using `psql`:

```sql
CREATE DATABASE miniledger;
```

Alternatively, create the database using a PostgreSQL administration tool.

### Step 3: Configure environment variables

Create a `.env` file by copying `.env.example`.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Update `backend/.env` with your local PostgreSQL connection details and JWT secret. Use the variable names defined in `.env.example`.

For example, your database connection URL may look like this:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/miniledger
JWT_SECRET=replace_with_a_long_random_secret
```

Replace the example password and JWT secret with your own local values. Never commit `.env` files or real credentials to GitHub.

### Step 4: Apply the database schema

From the `backend/` directory, run:

```bash
psql "postgresql://postgres:YOUR_PASSWORD@localhost:5432/miniledger" -f schema.sql
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

If the schema has already been applied, check your existing database before running it again.

### Step 5: Start the backend

From the `backend/` directory:

```bash
npm run dev
```

The API is configured to listen on:

```text
http://localhost:4000
```

Keep this terminal running. Mock OTPs are printed here during login.

## 3. Mobile App Setup

### Step 1: Install dependencies

Open a separate terminal in the `mobile/` directory:

```bash
cd mobile
npm install
```

### Step 2: Configure the API URL

Create a `.env` file by copying `.env.example`.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to the backend's base URL.

For example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
```

Replace `192.168.1.10` with your computer's actual local network IP address.

**Important for physical devices:**

- Do not use `localhost` or `127.0.0.1` as the API host on your phone. Those addresses refer to the phone itself.
- Connect your phone and computer to the same Wi-Fi network.
- Ensure your firewall allows the phone to reach the backend port.
- Keep the backend running while using the mobile app.

### Step 3: Start Expo

From the `mobile/` directory:

```bash
npx expo start
```

Open Expo Go on your phone and scan the QR code to launch MiniLedger.

If the app cannot connect to the backend, verify the API URL, network connection, firewall settings, and backend terminal.

## 4. Authentication Flow

MiniLedger uses a mock OTP authentication flow for demonstration.

1. Enter a phone number in the mobile app.
2. Request an OTP.
3. Read the mock OTP printed in the backend terminal.
4. Enter the OTP in the mobile app.
5. After successful verification, the backend returns a JWT.
6. Authenticated API requests use the token in the `Authorization` header.

Example request:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

The mock OTP is not sent as an SMS.

## 5. API Documentation

The backend provides the following endpoints.

| Method |       Endpoint      |         Description          |
|--------|---------------------|------------------------------|
| POST   | `/auth/request-otp` | Request a mock OTP           |
| POST   | `/auth/verify-otp`  | Verify OTP and obtain a JWT  |
| GET    | `/loans`            | Retrieve loan entries        |
| POST   | `/loans`            | Create a loan entry          |
| PATCH  | `/loans/:id/repay`  | Mark a loan as repaid        |
| GET    | `/summary`          | Retrieve loan summary totals |
| GET    | `/health`           | Check API health             |

All loan endpoints require a valid bearer token.

### Request an OTP

`POST /auth/request-otp`

Example JSON body:

```json
{
  "phone": "+919876543210"
}
```

Check the backend terminal for the mock OTP.

### Verify an OTP

`POST /auth/verify-otp`

Example JSON body:

```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

Use the actual OTP printed by the backend. A successful verification returns an authentication token.

### Create a Loan

`POST /loans`

Example JSON body:

```json
{
  "friendName": "Asha",
  "amount": 500,
  "dueDate": "2026-11-01"
}
```

The amount must be a positive number, the friend's name must be valid, and the due date must satisfy the backend's validation rules.

### Retrieve Loans

`GET /loans`

Returns the authenticated user's loan entries.

### Mark a Loan as Repaid

`PATCH /loans/:id/repay`

Replace `:id` with the loan entry's ID. A successful request marks that loan as repaid.

### Retrieve the Summary

`GET /summary`

Returns the summary values:

- `totalLent`
- `totalRepaid`
- `overdueAmount`

The overdue amount represents unpaid loans whose due dates have passed, according to the backend's date-handling logic.

### Health Check

`GET /health`

Use this endpoint to check whether the API is responding.

## 6. Data and Calculations

MiniLedger tracks loan amounts and repayment status separately.

For example, if a user lends ₹800 in total and ₹500 has been repaid:

- Total Lent: ₹800
- Total Repaid: ₹500
- Outstanding Balance: ₹300

If the remaining ₹300 is unpaid and overdue, the overdue amount is ₹300.

Marking that loan as repaid should increase the repaid total and reduce the overdue amount to zero, assuming no other loans are overdue.

Loan amounts are stored in PostgreSQL using `NUMERIC(12,2)` in the database schema.

## 7. Run Tests

Open a terminal in the `backend/` directory:

```bash
npm test
```

The included tests cover input-validation helpers.

API integration tests requiring a configured test database are not included in this starter project.

## 8. Troubleshooting

### The mobile app cannot connect to the backend

- Confirm that the backend is running.
- Verify `EXPO_PUBLIC_API_URL` in `mobile/.env`.
- Use your computer's LAN IP address when testing on a physical phone.
- Check that the phone and computer are connected to the same network.
- Check firewall rules for the backend port.

### OTP login does not work

- Check that the backend is running.
- Read the OTP from the backend terminal.
- Ensure the phone number used for verification matches the one used to request the OTP.

### PostgreSQL connection errors

- Verify that PostgreSQL is running.
- Confirm that the database exists.
- Check the `DATABASE_URL` in `backend/.env`.
- Ensure the database credentials are correct.
- Confirm that the schema has been applied.

### TypeScript or Expo configuration errors

- Install dependencies from the `mobile/` directory.
- Restart the TypeScript server in Visual Studio Code if the editor displays stale errors.
- Use an Expo Go version compatible with the project's installed Expo SDK.

## 9. Future Improvements

Possible improvements include:

- Production-ready OTP authentication.
- Stronger authentication and authorization tests.
- Receipt image uploads.
- Loan editing and deletion.
- Notifications and reminders for approaching due dates.
- More detailed loan history and reporting.
- Improved automated API integration tests.
- Production deployment and monitoring.

## Disclaimer

MiniLedger is a development and demonstration project. The mock OTP flow is not suitable for production authentication. Configure the database, secrets, and network access securely before any deployment.

## Author

Developed as a personal loan-tracking application using React Native, Expo, Node.js, TypeScript, Express, and PostgreSQL.
