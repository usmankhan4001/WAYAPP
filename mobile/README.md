# WAYAPP Mobile App (Expo / React Native)

Cross-platform mobile application for **WAYAPP Enterprise WhatsApp Gateway**, powered by Expo SDK 52, React Native, Expo Router, Zustand, and React Query.

## Features
- **Live 2-Way Chat Inbox**: Customer threads with 24-hour service window compliance indicator.
- **Team Collaboration**: Agent assignment badges, multi-agent filters.
- **Broadcast Monitor**: Real-time campaign delivery and read rates.
- **Push Notifications**: Instant alerts for incoming WhatsApp replies via Expo Push & FCM/APNs.
- **Zero-Config REST API**: Connects natively to the `/api/v1` backend surface.

## Quick Start (Development)

1. **Install Dependencies**:
   ```bash
   cd mobile
   npm install
   ```

2. **Start Expo Dev Server**:
   ```bash
   npx expo start
   ```

3. **Run on Device or Emulator**:
   - Press `a` for Android Emulator
   - Press `i` for iOS Simulator
   - Scan QR code with the **Expo Go** app on iOS/Android

## Building Standalone Binary (EAS Build)

```bash
# Configure EAS
npx eas-cli login
npx eas-cli build:configure

# Build APK for Android
npx eas-cli build --platform android --profile preview

# Build IPA for iOS
npx eas-cli build --platform ios --profile preview
```
