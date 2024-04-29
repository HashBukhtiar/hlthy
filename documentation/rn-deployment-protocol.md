# Protcol for React Native App Deployment
This protocol explains how to deploy a React Native app from scratch using the default RN configuration and App.js file. Before beginning, ensure that you have sufficient disk space on your computer. 600MB - 1GB should suffice.
1. Navigate to the directory in which you want to create the project's workspace.
```
cd Downloads
```
2. Create expo application workspace
```
npx create-expo-app TestApp
```
3. Navigate into the created directory.
```
cd TestApp
```
4. Prebuild to generate native code for iOS and Android.
```
npx expo prebuild
```
5. Navigate into the iOS directory created from prebuild command.
```
cd ios
```
6. Install CocoaPods in iOS directory.
```
pod install
```
7. Open ```TestApp/ios/TestApp.xcworkspace``` in XCode.
8. Build the project in XCode. TestApp should now appear as its own standalone app on the simulator. Can be simulated on an actual device by changing the build device on XCode. The app should index, then build and launches the app, but it crashes with the following error code.
```
No bundle URL present.

Make sure you're running a packager server or have included a .jsbundle file in your application bundle.

RCTFatal
__28-[RCTCxxBridge handleError:]_block_invoke
_dispatch_call_block_and_release
_dispatch_client_callout
_dispatch_main_queue_drain
_dispatch_main_queue_callback_4CF
__CFRUNLOOP_IS_SERVICING_THE_MAIN_DISPATCH_QUEUE__
__CFRunLoopRun
CFRunLoopRunSpecific
GSEventRunModal
-[UIApplication _run]
UIApplicationMain
main
start_sim
0x0
0x0
```
The following steps were resolved with [this](https://stackoverflow.com/a/44080527) solution.

9. In the terminal, navigate to the project's root directory, which in this protocol is ```TestApp```.
```
cd ..
```
10. Clean iOS build.
```
rm -rf ios/build/
```
11. Kill ongoing processes on port 8081.
```
kill $(lsof -t -i:8081)
```
12. Re-run on iOS simulator via XCode.
```
react-native run-ios --simulator="iPhone 15 Pro Max"
```
13. Add the metro configuration file in the projects root. Create a file named ```metro.config.js``` and write in the following:
```
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
```
14. In XCode, navigate to the root directory and click 'General'. Add a Display Name to the app.
15. Click on Signings & Capabilities. Add a development team to the add. Scroll down and delete push notifications.
16. If encountering errors, install gesture handler in the root and CocoaPods in the iOS folder.
```
npm install @react-native-community/gesture-handler 
cd ios && pod install && cd ..
```
