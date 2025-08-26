import { useAuth } from '@/context/AuthContext';

export interface UnitPreferences {
  weight: 'metric' | 'imperial';
  distance: 'metric' | 'imperial';
}

export const useUnits = () => {
  const { userProfile } = useAuth();
  
  const units: UnitPreferences = {
    weight: userProfile?.units?.weight || 'imperial', // Default to imperial (lbs)
    distance: userProfile?.units?.distance || 'imperial', // Default to imperial (miles)
  };

  const getWeightUnit = () => {
    return units.weight === 'metric' ? 'kg' : 'lbs';
  };

  const getDistanceUnit = () => {
    return units.distance === 'metric' ? 'km' : 'miles';
  };

  const convertWeight = (value: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs') => {
    if (fromUnit === toUnit) return value;
    
    if (fromUnit === 'lbs' && toUnit === 'kg') {
      return value * 0.453592; // lbs to kg
    } else if (fromUnit === 'kg' && toUnit === 'lbs') {
      return value * 2.20462; // kg to lbs
    }
    
    return value;
  };

  const convertDistance = (value: number, fromUnit: 'km' | 'miles', toUnit: 'km' | 'miles') => {
    if (fromUnit === toUnit) return value;
    
    if (fromUnit === 'miles' && toUnit === 'km') {
      return value * 1.60934; // miles to km
    } else if (fromUnit === 'km' && toUnit === 'miles') {
      return value * 0.621371; // km to miles
    }
    
    return value;
  };

  const formatWeight = (value: number, showUnit: boolean = true) => {
    const unit = getWeightUnit();
    const rounded = Math.round(value * 10) / 10; // Round to 1 decimal place
    return showUnit ? `${rounded} ${unit}` : rounded.toString();
  };

  const formatDistance = (value: number, showUnit: boolean = true) => {
    const unit = getDistanceUnit();
    const rounded = Math.round(value * 10) / 10; // Round to 1 decimal place
    return showUnit ? `${rounded} ${unit}` : rounded.toString();
  };

  return {
    units,
    getWeightUnit,
    getDistanceUnit,
    convertWeight,
    convertDistance,
    formatWeight,
    formatDistance,
  };
};