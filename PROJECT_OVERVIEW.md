# Project Overview: E-numismatica

## Introduction
E-numismatica is a cross-platform numismatic auction application designed to facilitate the buying and selling of coins and related collectibles. The project leverages modern web and mobile technologies to provide a seamless experience across devices.

## Project Structure
The project is organized into three main directories:

1. **`shared/`**: Contains shared code and utilities used across both web and mobile platforms.
   - Services: Authentication, auction management, bidding, and more.
   - Types: Shared TypeScript types and interfaces.
   - Utilities: Helper functions for currency, image handling, etc.

2. **`web/`**: A Next.js application for the web platform.
   - Pages: Routing and UI components for the web app.
   - Components: Reusable UI components like `AuctionCard`, `BidHistoryChart`, etc.
   - Hooks: Custom React hooks for managing state and side effects.

3. **`mobile/`**: A React Native (Expo) application for mobile platforms.
   - Screens: UI components for mobile-specific screens.
   - Navigation: Mobile navigation setup.
   - Context: State management for mobile.

## Key Features

### 1. User Authentication
- Supports email/password and Google Sign-In.
- Secure authentication flow using Firebase.

### 2. Product Catalog
- Browse and search for numismatic items.
- Detailed product pages with images and descriptions.

### 3. Auction System
- Real-time bidding with live updates.
- Auto-bidding functionality for users.
- Auction management dashboard for administrators.

### 4. Cross-Platform Compatibility
- Shared business logic between web and mobile.
- Platform-specific UI components for optimal user experience.

## Technologies Used

### Frontend
- **Web**: Next.js, React, Tailwind CSS
- **Mobile**: React Native, Expo, NativeWind

### Backend
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage

### Testing
- **Unit Testing**: Jest
- **E2E Testing**: Playwright

### Other Tools
- TypeScript for type safety
- Git for version control
- Netlify for web deployment
- Expo Application Services (EAS) for mobile deployment

## Development Process

### Setup
1. Clone the repository and install dependencies for both web and mobile.
2. Configure Firebase by setting up a project and enabling Authentication and Firestore.
3. Copy `.env.example` files and fill in Firebase configuration details.

### Running the Application
- **Web**: Use `npm run dev` to start the Next.js development server.
- **Mobile**: Use `npm start` to launch the Expo development server.

### Testing
- Run unit tests using `npm test` in both web and mobile directories.
- Execute E2E tests with `npm run test:e2e` for the web application.

### Deployment
- **Web**: Deploy using `npm run build` followed by `npm run deploy` (Vercel).
- **Mobile**: Use `eas build` and `eas submit` for building and deploying mobile apps.

## Challenges Faced

### 1. Cross-Platform Development
- Ensuring consistency in functionality and UI across web and mobile.
- Handling platform-specific quirks and optimizations.

### 2. Real-Time Updates
- Implementing real-time bidding required careful handling of Firestore listeners.
- Ensuring data consistency and minimizing latency.

### 3. Authentication Flow
- Managing authentication state across different platforms.
- Handling edge cases like token expiration and user sessions.

### 4. Performance Optimization
- Optimizing image loading and caching for a smooth user experience.
- Reducing bundle size for faster load times.

## Future Enhancements

### 1. Advanced Search
- Implement filters for searching products by category, price range, and more.

### 2. Notifications
- Add push notifications for auction updates and bids.

### 3. Payment Integration
- Integrate payment gateways for seamless transactions.

### 4. Analytics
- Track user activity and auction performance for insights.

### 5. Localization
- Support for multiple languages to cater to a global audience.

## Conclusion
E-numismatica is a robust and scalable platform for numismatic auctions, built with modern technologies and a focus on cross-platform compatibility. This document provides an overview of the project's structure, features, and development process. For detailed setup and usage instructions, refer to the [README.md](README.md) file.