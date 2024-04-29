# Protcol for React Native App Building
This protocol explains how to build a React Native app from an existing unbuilt RN project. This process will create folders for both iOS and Android builds, as well as web builds in the .expo folder, but this protocol focuses on iOS building for now. Before beginning, ensure that you have sufficient disk space on your computer. 600MB - 1GB should suffice.

Clone the repository.
```
git clone https://github.com/HashBukhtiar/hlthy
```
Navigate to the root directory of the project that you want to build.
```
cd hlthy
```
Switch to the building branch.
```
git checkout building
```
Fetch the latest nonbuilt version.
```
git fetch origin nonbuilt-versions
```
Push the building branch back to the latest nonbuilt version.
```
git reset --hard origin/nonbuilt-versions
```
Push the changes to the remote repository.
```
git push origin building --force
```
Install npm.
```
npm install
```
Use the build command to build from the existing files.
```
npx expo prebuild
```
Update the `metro.config.js` file.
```
npx expo customize metro.config.js
```
Kill ongoing processes on port 8081, if there are any.
```
kill $(lsof -t -i:8081)
```
Run the build and wait for the app to build until proceeding.
```
react-native run-ios --simulator="iPhone 15 Pro Max
```
Clean iOS build folder.
```
rm -rf ios/build/
```
Kill ongoing processes on port 8081, if there are any.
```
kill $(lsof -t -i:8081)
```
Remove the node modules folder from npm.
```
rm -rf node_modules package-lock.json
```
Re-install dependencies.
```
npm install
npm install expo-auth-session
npm install react-native-linear-gradient
npm install react-native-gesture-handler
```
Re-install CocoaPods in iOS directory.
```
cd ios && pod install && cd ..
```
Run on iOS simulator via XCode. Can substitute the simulator device if wanted.
```
react-native run-ios --simulator="iPhone 15 Pro Max"
```
