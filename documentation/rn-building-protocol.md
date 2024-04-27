# Protcol for React Native App Building
This protocol explains how to build a React Native app from an existing unbuilt RN project. This process will create folders for both iOS and Android builds, as well as web builds in the .expo folder, but this protocol focuses on iOS building for now. Before beginning, ensure that you have sufficient disk space on your computer. 600MB - 1GB should suffice.

1. Navigate to the root directory of the project that you want to build.
```
cd hlthy
```
2. Use the build command to build from the existing files.
```
npx expo prebuild
```
3. Navigate into the iOS directory created from prebuild command.
```
cd ios
```
6. Install CocoaPods in iOS directory.
```
pod install
```
7. Navigate back to the project's root directory.
```
cd ..
```
8. Clean iOS build.
```
rm -rf ios/build/
```
9. Kill ongoing processes on port 8081, if there are any.
```
kill $(lsof -t -i:8081)
```
10. Add the metro configuration file in the projects root. Create a file named ```metro.config.js``` and write in the following:
```
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
```
11. If encountering errors, install gesture handler in the root and CocoaPods in the iOS folder.
```
npm install @react-native-community/gesture-handler 
cd ios && pod install && cd ..
```
12. Run on iOS simulator via XCode. Can substitute the simulator device if wanted.
```
react-native run-ios --simulator="iPhone 15 Pro Max"
```
13. If issues persist in the app when launching it on the simulator, follow the steps listed below. In XCode, navigate to the root directory and click 'General'. Add a Display Name to the app; "`hlthy`".
14. Click on Signings & Capabilities. Add a development team to the project. Scroll down and delete push notifications.
