# Setup and Installation Guide

## Prerequisites
Before setting up the E-numismatica project, ensure you have the following installed on your system:

1. **Node.js**: Version 18 or higher. Download from [Node.js official website](https://nodejs.org/).
2. **npm or yarn**: npm is included with Node.js. Alternatively, you can use yarn.
3. **Firebase Project**: You need a Firebase project for authentication and database services.
4. **Expo CLI**: Required for mobile development. Install it globally using:
   ```bash
   npm install -g expo-cli
   ```

## Installation Steps

### 1. Clone the Repository
Clone the project repository to your local machine:

```bash
git clone <repository-url>
cd _E-numismatica.ro
```

### 2. Install Dependencies

#### Web Application
Navigate to the `web` directory and install dependencies:

```bash
cd web
npm install
```

#### Mobile Application
Navigate to the `mobile` directory and install dependencies:

```bash
cd ../mobile
npm install
```

### 3. Configure Firebase

#### Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click on "Add project" and follow the prompts to create a new project.

#### Enable Firebase Services
1. **Authentication**: Enable Email/Password and Google Sign-In methods.
2. **Firestore**: Create a Firestore database in test mode for development.
3. **Storage**: Enable Firebase Storage for storing images and other assets.

#### Configure Firebase in the Project
1. Copy the Firebase configuration object from the Firebase Console.
2. Create `.env.local` in the `web` directory and `.env` in the `mobile` directory.
3. Add the Firebase configuration to the respective `.env` files:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 4. Run the Application

#### Web Application
Start the Next.js development server:

```bash
cd web
npm run dev
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

#### Mobile Application
Start the Expo development server:

```bash
cd mobile
npm start
```

Use the Expo Go app on your mobile device to scan the QR code displayed in the terminal.

### 5. Testing

#### Unit Tests
Run unit tests for both web and mobile applications:

```bash
# Web
cd web
npm test

# Mobile
cd ../mobile
npm test
```

#### End-to-End Tests
Run E2E tests for the web application using Playwright:

```bash
cd web
npm run test:e2e
```

### 6. Deployment

#### Web Application
Deploy the web application using Vercel:

```bash
cd web
npm run build
npm run deploy
```

#### Mobile Application
Deploy the mobile application using Expo Application Services (EAS):

```bash
cd mobile
npm run build
npm run deploy
```

## Troubleshooting

### Common Issues

1. **Firebase Configuration Errors**: Ensure the `.env` files are correctly configured with your Firebase project details.

2. **Dependency Conflicts**: If you encounter dependency conflicts, delete the `node_modules` directory and `package-lock.json` file, then run `npm install` again.

3. **Expo CLI Issues**: If Expo CLI is not recognized, ensure it is installed globally and added to your system's PATH.

4. **Port Conflicts**: If the development server fails to start due to port conflicts, change the port in the respective configuration files.

### Debugging

- **Web**: Use the browser's developer tools to debug the web application.
- **Mobile**: Use Expo's built-in debugging tools or connect a physical device for debugging.

## Conclusion
This guide provides step-by-step instructions for setting up and installing the E-numismatica project. Follow these instructions to get the project running locally and deploy it to production. For more details on the project's architecture and features, refer to the [Project Overview](PROJECT_OVERVIEW.md) document.