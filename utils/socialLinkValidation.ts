export const VERIFIED_PLATFORMS = {
  instagram: {
    name: 'Instagram',
    icon: 'logo-instagram',
    pattern: /^https?:\/\/(www\.)?instagram\.com\/[\w.]+\/?$/,
    placeholder: 'https://instagram.com/username'
  },
  facebook: {
    name: 'Facebook',
    icon: 'logo-facebook',
    pattern: /^https?:\/\/(www\.)?(facebook|fb)\.com\/[\w.]+\/?$/,
    placeholder: 'https://facebook.com/username'
  },
  twitter: {
    name: 'Twitter/X',
    icon: 'logo-twitter',
    pattern: /^https?:\/\/(www\.)?(twitter|x)\.com\/[\w]+\/?$/,
    placeholder: 'https://twitter.com/username'
  },
  tiktok: {
    name: 'TikTok',
    icon: 'logo-tiktok',
    pattern: /^https?:\/\/(www\.)?tiktok\.com\/@[\w.]+\/?$/,
    placeholder: 'https://tiktok.com/@username'
  },
  youtube: {
    name: 'YouTube',
    icon: 'logo-youtube',
    pattern: /^https?:\/\/(www\.)?youtube\.com\/(c|channel|user|@)\/[\w-]+\/?$/,
    placeholder: 'https://youtube.com/@username'
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'logo-linkedin',
    pattern: /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/,
    placeholder: 'https://linkedin.com/in/username'
  },
  spotify: {
    name: 'Spotify',
    icon: 'musical-notes',
    pattern: /^https?:\/\/open\.spotify\.com\/(user|artist)\/[\w]+\/?$/,
    placeholder: 'https://open.spotify.com/user/username'
  },
  snapchat: {
    name: 'Snapchat',
    icon: 'logo-snapchat',
    pattern: /^https?:\/\/(www\.)?snapchat\.com\/add\/[\w.-]+\/?$/,
    placeholder: 'https://snapchat.com/add/username'
  },
  twitch: {
    name: 'Twitch',
    icon: 'logo-twitch',
    pattern: /^https?:\/\/(www\.)?twitch\.tv\/[\w]+\/?$/,
    placeholder: 'https://twitch.tv/username'
  },
  github: {
    name: 'GitHub',
    icon: 'logo-github',
    pattern: /^https?:\/\/(www\.)?github\.com\/[\w-]+\/?$/,
    placeholder: 'https://github.com/username'
  }
} as const;

export type PlatformKey = keyof typeof VERIFIED_PLATFORMS;

export const validatePlatformUrl = (platform: PlatformKey, url: string): boolean => {
  if (!url) return true; // Empty is valid (optional field)
  return VERIFIED_PLATFORMS[platform].pattern.test(url);
};

export const validateCustomUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};
