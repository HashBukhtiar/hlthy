## Cloud Functions for hlthy

This document provides important instructions and commands for working with Firebase Cloud Functions in the `hlthy` project.

### Overview

Cloud Functions provide backend logic that runs in response to events or direct calls. In this project, they are primarily used for:

1.  **Callable Functions**: Functions invoked directly from the client application (e.g., accepting a follow request). These are defined in callableFunctions.ts.
2.  **Trigger Functions**: Functions that execute in response to events in Firestore (e.g., creating an activity feed item when a user creates a new post). These are defined in activityTriggers.ts.

### Project Structure & Initialization

*   **Entry Point**: index.ts is the main entry point for all Cloud Functions. It exports all the functions to be deployed.
*   **Firebase Admin SDK**: The Firebase Admin SDK is initialized in firebaseAdmin.ts via the `initializeDbAndAuth` function. This is called by the `onInit` lifecycle hook in index.ts to ensure the Admin SDK (for `db` and `auth` access) is ready when functions execute.
    *   Use `getDb()` and `getAuth()` from firebaseAdmin.ts to access Firestore and Auth services within your functions.
*   **Configuration**:
    *   package.json: Manages Node.js dependencies and defines scripts for building, testing (emulating), and deploying functions.
    *   firebase.json: Configures Firebase services. The functions section specifies the source directory (functions) and predeploy hooks (like `npm run build`).

### Development Workflow

1.  **Write/Modify Functions**:
    *   For client-invoked logic, add/edit functions in callableFunctions.ts.
    *   For Firestore event-driven logic, add/edit functions in activityTriggers.ts.
    *   Remember to export new functions from index.ts.
2.  **Build TypeScript**: Cloud Functions are written in TypeScript and need to be compiled to JavaScript.
    ```bash
    # Navigate to the functions directory
    cd functions
    npm run build
    ```
    This script is also run automatically during deployment as a predeploy hook (see `firebase.json`).

### Testing & Troubleshooting

*   **Local Emulation**: Test your functions locally using the Firebase Emulator Suite. This is highly recommended to catch issues before deployment.
    ```bash
    # Navigate to the functions directory
    cd functions
    # Ensure functions are built (npm run build)
    # Then, from the project root or functions directory:
    firebase emulators:start --only functions
    ```
    The `serve` script in package.json combines build and emulate: `npm run serve` (run from functions directory).

*   **Viewing Logs**:
    *   **Local Emulator**: Logs will appear directly in the terminal where the emulator is running.
    *   **Deployed Functions**: View logs for deployed functions in the Google Cloud Console or using the Firebase CLI:
        ```bash
        firebase functions:log
        ```
        You can also filter logs by function name.

### Deployment

*   **Deploy All Functions**:
    ```bash
    # From the project root directory
    firebase deploy --only functions
    ```
    This command will first run the `lint` and `build` scripts defined in the `predeploy` hook in firebase.json (which correspond to scripts in `functions/package.json`).

*   **Deploy Specific Functions**: To deploy only certain functions, you can specify them:
    ```bash
    firebase deploy --only functions:myFunction1,functions:myFunction2
    ```
    (Replace `myFunction1`, `myFunction2` with the exported names of your functions, e.g., `acceptfollowrequest`).

### Important Considerations

*   **Region**: Functions in this project are typically deployed to `northamerica-northeast2` as specified in their definitions (e.g., in `functions/src/callableFunctions.ts`).
*   **Authentication**: Callable functions (`onCall`) automatically handle Firebase Authentication context (`request.auth`). Ensure you check for `request.auth?.uid` for authenticated operations.
*   **Error Handling**: Use `HttpsError` for callable functions to propagate errors correctly to the client.
*   **Idempotency**: Design functions to be idempotent where possible, meaning calling them multiple times with the same input produces the same result without unintended side effects.
*   **Cold Starts**: Be aware of cold starts, which can add latency to the first invocation of a function after a period of inactivity or after deployment.
*   **Dependencies**: All Node.js dependencies must be declared in package.json.