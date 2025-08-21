import { UserSettings } from '@/types/settings';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const DISPLAY_NAME_RULES = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 30,
  ALLOWED_CHARACTERS: 'Letters, numbers, spaces, hyphens, underscores, periods, and apostrophes',
  EXAMPLES: {
    VALID: ['John Doe', 'María García', 'Alex-123', "O'Connor", 'Jean-Pierre'],
    INVALID: ['@username', 'user#123', 'test$name', '___', '...']
  }
};

export const validateSettings = (settings: Partial<UserSettings>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Display Name validation
  if (settings.displayName) {
    if (settings.displayName.length < 2) {
      errors.push('Display name must be at least 2 characters long');
    }
    if (settings.displayName.length > 30) {
      errors.push('Display name cannot exceed 30 characters');
    }
    if (/[@#$%^&*()+=\[\]{}|\\:";?/<>~`]/.test(settings.displayName)) {
      errors.push('Display name cannot contain special symbols like @, #, $, %, etc.');
    }
  }

  if (!settings.displayName?.trim()) {
    errors.push('Display name cannot be empty.');
  } else {
    const trimmedName = settings.displayName.trim();
    
    if (trimmedName.length < DISPLAY_NAME_RULES.MIN_LENGTH) {
      errors.push(`Display name must be at least ${DISPLAY_NAME_RULES.MIN_LENGTH} characters long`);
    }
    if (trimmedName.length > DISPLAY_NAME_RULES.MAX_LENGTH) {
      errors.push(`Display name cannot exceed ${DISPLAY_NAME_RULES.MAX_LENGTH} characters`);
    }
    if (/[@#$%^&*()+=\[\]{}|\\:";?/<>~`]/.test(trimmedName)) {
      errors.push('Display name cannot contain special symbols like @, #, $, %, etc.');
    }
    if (!/[a-zA-Z0-9]/.test(trimmedName)) {
      errors.push('Display name must contain at least one letter or number');
    }
    if (/[.\-_']{3,}/.test(trimmedName)) {
      warnings.push('Display name contains many consecutive special characters');
    }
  }

  // Bio validation
  if (settings.bio && settings.bio.length > 300) {
    errors.push('Bio cannot exceed 300 characters');
  }

  // Date of birth validation
  if (settings.dateOfBirth) {
    const now = new Date();
    const age = now.getFullYear() - settings.dateOfBirth.getFullYear();
    
    if (settings.dateOfBirth > now) {
      errors.push('Date of birth cannot be in the future');
    }
    
    if (age < 13) {
      errors.push('You must be at least 13 years old to use this app');
    }
    
    if (age > 120) {
      warnings.push('Please verify your date of birth is correct');
    }
  }

  // Privacy settings validation
  const validVisibilities = ['public', 'private'];
  if (settings.profileVisibility && !validVisibilities.includes(settings.profileVisibility)) {
    errors.push('Invalid profile visibility setting');
  }

  // Message permission validation
  const validMessagePermissions = ['everyone', 'followers'];
  if (settings.messagePermission && !validMessagePermissions.includes(settings.messagePermission)) {
    errors.push('Invalid message permission setting');
  }

  // Theme validation
  const validThemes = ['light', 'dark', 'system'];
  if (settings.theme && !validThemes.includes(settings.theme)) {
    errors.push('Invalid theme setting');
  }

  // Language validation
  const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'nl'];
  if (settings.language && !validLanguages.includes(settings.language)) {
    warnings.push('Selected language may not be fully supported');
  }

  // Units validation
  const validUnits = ['metric', 'imperial'];
  if (settings.units) {
    if (settings.units.weight && !validUnits.includes(settings.units.weight)) {
      errors.push('Invalid weight unit');
    }
    if (settings.units.distance && !validUnits.includes(settings.units.distance)) {
      errors.push('Invalid distance unit');
    }
  }

  // Archetype validation (optional, we can add specific valid archetypes)
  if (settings.archetype) {
    const validArchetypes = ['athlete', 'bodybuilder', 'crossfitter', 'generalist', 'powerlifter'];
    if (!validArchetypes.includes(settings.archetype.toLowerCase())) {
      warnings.push('Selected archetype may not be recognized');
    }
  }

  // Email validation (basic check)
  if (settings.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.email)) {
      errors.push('Invalid email format');
    }
  }

  // Notifications validation
  if (settings.notifications) {
    const requiredNotificationKeys = [
      'newFollowers', 'likesAndComments', 'directMessages', 
      'followRequestAccepted', 'taggedInComments', 'mentionedInReplies'
    ];
    
    for (const key of requiredNotificationKeys) {
      if (settings.notifications[key as keyof typeof settings.notifications] === undefined) {
        warnings.push(`Notification setting '${key}' is not defined`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const sanitizeSettings = (settings: Partial<UserSettings>): Partial<UserSettings> => {
  const sanitized = { ...settings };

  // Trim string fields
  if (sanitized.displayName) {
    sanitized.displayName = sanitized.displayName.trim();
  }
  
  if (sanitized.bio) {
    sanitized.bio = sanitized.bio.trim();
  }

  if (sanitized.email) {
    sanitized.email = sanitized.email.trim().toLowerCase();
  }

  // Ensure notification settings are boolean
  if (sanitized.notifications) {
    Object.keys(sanitized.notifications).forEach(key => {
      sanitized.notifications![key as keyof typeof sanitized.notifications] = 
        Boolean(sanitized.notifications![key as keyof typeof sanitized.notifications]);
    });
  }

  // Ensure archetype is lowercase for consistency
  if (sanitized.archetype) {
    sanitized.archetype = sanitized.archetype.toLowerCase();
  }

  return sanitized;
};