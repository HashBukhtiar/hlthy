import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ConnectionQualityBadgeProps {
  type: string | null;
  isConnected: boolean;
}

export const ConnectionQualityBadge: React.FC<ConnectionQualityBadgeProps> = ({
  type,
  isConnected
}) => {
  if (!isConnected) return null;

  const getQualityInfo = () => {
    switch (type?.toLowerCase()) {
      case 'wifi':
        return { icon: 'wifi', color: '#34C759', label: 'WiFi' };
      case 'cellular':
        return { icon: 'cellular', color: '#FF9500', label: 'Cellular' };
      case 'ethernet':
        return { icon: 'swap-horizontal', color: '#34C759', label: 'Ethernet' };
      default:
        return { icon: 'help-circle', color: '#999', label: 'Unknown' };
    }
  };

  const { icon, color, label } = getQualityInfo();

  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});