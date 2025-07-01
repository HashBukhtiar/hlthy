import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique ID using UUID v4
 * @returns A unique string ID
 */
export const generateId = (): string => {
  return uuidv4();
};

/**
 * Generates a unique filename with timestamp for better organization
 * @param baseName The base name for the file
 * @param extension The file extension (without dot)
 * @returns A unique filename
 */
export const generateUniqueFilename = (baseName: string, extension: string): string => {
  const timestamp = Date.now();
  const uuid = uuidv4().split('-')[0]; // Use first part of UUID for shorter filename
  return `${baseName}_${timestamp}_${uuid}.${extension}`;
};
