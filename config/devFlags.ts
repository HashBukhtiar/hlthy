/**
 * Developer Flags Configuration
 * 
 * This file contains flags that developers can toggle for testing purposes.
 * 
 * ⚠️ WARNING: All flags in this file should be set to their safe/production values
 * before deploying to production. Never commit enabled bypass/debug flags to main.
 */

export const devFlags = {
  /**
   * Login Bypass
   * 
   * When enabled, automatically logs in with the specified dev credentials
   * without requiring manual login. Useful for rapid development iteration.
   * 
   * ⚠️ MUST BE FALSE IN PRODUCTION
   */
  bypassAuth: false,
  
  /**
   * Dev Account Credentials
   * 
   * Email and password used when bypassAuth is enabled.
   * These credentials should point to a test account.
   */
  devEmail: 'dev2@gmail.com',
  devPassword: 'dev1232',
  
  /**
   * Email Verification Bypass
   * 
   * When enabled, shows a bypass button on the email verification screen
   * that allows developers to skip email verification during testing.
   * Also prevents the Cloud Function from deleting unverified accounts.
   * 
   * ⚠️ MUST BE FALSE IN PRODUCTION
   */
  bypassEmailVerification: false,
  
  /**
   * Add more developer flags here as needed, for example:
   * 
   * - enableDebugLogging: boolean
   * - mockApiResponses: boolean
   * - skipOnboarding: boolean
   * - enableExperimentalFeatures: boolean
   */
} as const;

/**
 * Type for dev flags
 */
export type DevFlags = typeof devFlags;
