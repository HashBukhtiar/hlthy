# Build Protocol

Four build configurations are possible for this project:

1. **iOS App Store Build**: Generates an .ipa file, but need an Apple Developer account. This is how you would deploy the built version on your phone.
2. **iOS Simulator Build**: Builds the application for an iOS Simulator. The build can only be executed from an iOS Simulator which can only be done on MacOS.
3. **Android Build**: Need an Android device or simulator to test it.
4. **Expo Ejection**: This would also work for us, but I would not recommend it. It ejects the app from Expo's managed workflow, giving us control to the native code. This not only makes development way more complicated, but complicates the build process and we lose all of Expo's features. This includes their CI/CD pipeline workflow and OTA updates. From what I understand this bare approach is really only done for companies to write their own custom native code/modules in Swift or Kotlin, or to access modules not supported by Expo.

This protocol provides the process for Option 2.

## iOS Simulator Build Protocol

1. Visit the builds page on expo.dev to see workflows and build processes: https://expo.dev/accounts/derana1/projects/hlthy/builds

**Note: Steps 2-6 may not need to be done every time.**

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
6. Navigate to the `eas.json` file in the root directory. Find the `build` object and create a new object under the called `simulator`. Here is what the `eas.json` file should look like:
```
{
  ...
  "build": {
    ...
    "simulator": {
      "ios": {
        "simulator": true,
      }
    }
  },
  ...
}
```
7. Build through EAS using the simulator profile that was just created.
```
eas build --platform ios --profile simulator
```
8. Monitor the build through the link above or through the link provided by the CLI. Once the build completes, you can then do one of the following:
    1. Download the build from the expo.dev website after monitoring the build. Then, run the iOS simulator and drag the application onto the simulator and run it.
    2. If the CLI prompts you to run the build on the iOS simulator, click 'y' and it should do the previous option for you.