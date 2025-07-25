import { UserSettings } from '@/types/settings';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateSettings = (settings: Partial<UserSettings>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Display Name validation
  if (settings.displayName) {
    if (settings.displayName.length < 2) {
      errors.push('Display name must be at least 2 characters long');
    }
    if (settings.displayName.length > 50) {
      errors.push('Display name cannot exceed 50 characters');
    }
    if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(settings.displayName)) {
      errors.push('Display name contains invalid characters');
    }
  }

  if (!settings.displayName || settings.displayName.trim() === '') {
    errors.push('Display name cannot be empty.');
  }

  // Bio validation
  if (settings.bio && settings.bio.length > 500) {
    errors.push('Bio cannot exceed 500 characters');
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
  const validVisibilities = ['public', 'followers', 'private'];
  if (settings.profileVisibility && !validVisibilities.includes(settings.profileVisibility)) {
    errors.push('Invalid profile visibility setting');
  }

  const validPermissions = ['everyone', 'followers'];
  if (settings.commentPermission && !validPermissions.includes(settings.commentPermission)) {
    errors.push('Invalid comment permission setting');
  }

  if (settings.messagePermission && !validPermissions.includes(settings.messagePermission)) {
    errors.push('Invalid message permission setting');
  }

  const validFollowPermissions = ['anyone', 'approval'];
  if (settings.followPermission && !validFollowPermissions.includes(settings.followPermission)) {
    errors.push('Invalid follow permission setting');
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

  // Ensure notification settings are boolean
  if (sanitized.notifications) {
    Object.keys(sanitized.notifications).forEach(key => {
      sanitized.notifications![key as keyof typeof sanitized.notifications] = 
        Boolean(sanitized.notifications![key as keyof typeof sanitized.notifications]);
    });
  }

  return sanitized;
};