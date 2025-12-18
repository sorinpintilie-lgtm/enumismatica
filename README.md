# E-numismatica

A cross-platform numismatic auction application built with React Native (Expo) for mobile and Next.js for web.

## Features

- User authentication (Email/Password, Google Sign-In)
- Product catalog browsing
- Live auctions with real-time bidding
- Auto-bidding system
- Dashboard for managing auctions
- Cross-platform compatibility (Web and Mobile)

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project
- Expo CLI (for mobile)

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd _E-numismatica.ro
   ```

2. Install dependencies for web:
   ```bash
   cd web
   npm install
   ```

3. Install dependencies for mobile:
   ```bash
   cd ../mobile
   npm install
   ```

4. Set up Firebase:
   - Create a Firebase project
   - Enable Authentication and Firestore
   - Copy `.env.example` to `.env.local` (web) and `.env` (mobile)
   - Fill in your Firebase config

### Running the Application

#### Web
```bash
cd web
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

#### Mobile
```bash
cd mobile
npm start
```
Use Expo Go app to scan QR code.

### Testing

#### Unit Tests
```bash
cd web
npm test

cd ../mobile
npm test
```

#### E2E Tests
```bash
cd web
npm run test:e2e
```

## Deployment

### Web
```bash
cd web
npm run build
npm run deploy  # Uses Vercel
```

### Mobile
```bash
cd mobile
eas build --platform all
eas submit --platform all
```

## Project Structure

- `shared/` - Shared code between web and mobile
- `web/` - Next.js web application
- `mobile/` - React Native (Expo) mobile application

## Technologies Used

- React, Next.js, React Native, Expo
- Firebase (Auth, Firestore)
- Tailwind CSS, NativeWind
- Jest, Playwright
- TypeScript

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run tests
5. Submit a pull request

## License

MIT License

<!-- Test comment -->
<!-- Confirmation comment for git push test -->