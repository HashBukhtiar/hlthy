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
