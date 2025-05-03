# Building

Four build configurations are possible for this project:

1. **iOS App Store Build**: Generates an .ipa file, but need an Apple Developer account. This is how you would deploy the built version on your phone via the App Store / TestFlight.
2. **iOS Simulator Build**: Builds the application for an iOS Simulator. The build can only be executed from an iOS Simulator which can only be done on MacOS.
3. **Android Build**: Need an Android device or simulator to test it.
4. **Expo Ejection**: This would also work for us, but I would not recommend it. It ejects the app from Expo's managed workflow, giving us control to the native code. This not only makes development way more complicated, but complicates the build process and we lose all of Expo's features. This includes their CI/CD pipeline workflow and OTA updates. From what I understand this bare approach is really only done for companies to write their own custom native code/modules in Swift or Kotlin, or to access modules not supported by Expo.

## Build Protocol

This protocol provides the process for Options 2 and 3 outlined above, specifically building under the `preview` profile.

### Prerequisites

1. Visit the [builds page on expo.dev](https://expo.dev/accounts/hlthy/projects/hlthy/builds) to see workflows and build processes.

**Note: Steps 2-6 do not need to be done every time when building. They only need to be performed once, at the start.**

2. Install EAS CLI globally
```
npm install -g eas-cli
```
3. Login to EAS through the CLI. Need to provide the username/email and password here.
```
eas login
```
4. Check if login was successful. This should provide the username of whoever is logged in.
```
eas whoami
```
5. Configure build
```
eas build:configure
```
6. Navigate to the `eas.json` file in the root directory. The file should already include `preview` profile. Here is what the relevant section should look like:
```
{
  ...
  "build": {
    ...
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "image": "stable",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },
    ...
  },
  ...
}
```

We can then continue using the iOS Simulator or using an Android build.

### iOS Simulator
7. Build through EAS using the `preview` profile with platform iOS.
```
eas build --platform ios --profile preview
```
8. Monitor the build through the link above or through the link provided by the CLI. Once the build completes, you can then do one of the following:
    - Download the build from the expo.dev website after monitoring the build. Then, run the iOS simulator and drag the application onto the simulator and run it.
    - If the CLI prompts you to run the build on the iOS simulator, click 'y' and it should do the previous option for you.

### Android

7. Build through EAS using the `preview` profile with the Android platform selected.
```
eas build --platform android --profile preview
```

8. Monitor the build through the link above or through the link provided by the CLI. Once the build completes, you can then download the APK file from [expo.dev](https://expo.dev/accounts/hlthy/projects/hlthy/builds) and install it on your Android device or emulator.

## Running Development Client
We use Expo Go for the majority of our development, rather than a custom development client through Expo. For now, we don't have any custom native modules and thus Expo Go will suffice. However, we have still created a profile for the building of a development client This is done through the `development` profile.

To use this, build the app once using the `development` profile. This essentially creates a local instance of Expo Go specialized with any custom modules.
```
eas build --profile development
```

Then, spin up the development client so that a full build is not needed for every change.
```
npm start --dev-client
```

Using this approach, we would have to rebuild after adding or removing native modules. 

## Relevant Docs:
- [eas.json and Build Profiles, by expo.dev](https://docs.expo.dev/build/eas-json/)