import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingsItemProps {
  type: 'toggle' | 'select' | 'input' | 'button' | 'info' | 'date';
  label: string;
  value?: any;
  onValueChange?: (value: any) => void;
  options?: { label: string; value: any }[];
  placeholder?: string;
  helperText?: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({
  type,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  helperText,
  destructive = false,
  disabled = false,
  onPress
}) => {
  const renderContent = () => {
    switch (type) {
      case 'toggle':
        return (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
            thumbColor={value ? '#fff' : '#f4f3f4'}
            disabled={disabled}
          />
        );

      case 'select':
        return (
          <TouchableOpacity 
            style={[styles.selectButton, disabled && styles.disabled]} 
            onPress={disabled ? undefined : onPress}
          >
            <Text style={[styles.selectText, disabled && styles.disabledText]}>
              {options?.find(opt => opt.value === value)?.label || placeholder || 'Select...'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>
        );

      case 'input':
        return (
          <TextInput
            style={[styles.input, disabled && styles.disabled]}
            value={value}
            onChangeText={onValueChange}
            placeholder={placeholder}
            placeholderTextColor="#666"
            editable={!disabled}
          />
        );

      case 'button':
        return (
          <TouchableOpacity 
            style={[styles.button, destructive && styles.destructiveButton, disabled && styles.disabled]} 
            onPress={disabled ? undefined : onPress}
          >
            <Text style={[styles.buttonText, destructive && styles.destructiveText, disabled && styles.disabledText]}>
              {value || label}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={destructive ? "#FF3B30" : "#999"} />
          </TouchableOpacity>
        );

      case 'info':
        return (
          <Text style={[styles.infoText, disabled && styles.disabledText]}>
            {value}
          </Text>
        );

      case 'date':
        return (
          <TouchableOpacity 
            style={[styles.selectButton, disabled && styles.disabled]} 
            onPress={disabled ? undefined : onPress}
          >
            <Text style={[styles.selectText, disabled && styles.disabledText]}>
              {value ? new Date(value).toLocaleDateString() : placeholder || 'Select date...'}
            </Text>
            <Ionicons name="calendar" size={16} color="#999" />
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <Text style={[styles.label, destructive && styles.destructiveText, disabled && styles.disabledText]}>
            {label}
          </Text>
          {helperText && (
            <Text style={styles.helperText}>{helperText}</Text>
          )}
        </View>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
  },
  selectText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
  },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    minWidth: 120,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 14,
    marginRight: 8,
  },
  infoText: {
    color: '#999',
    fontSize: 14,
  },
  destructiveButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  destructiveText: {
    color: '#FF3B30',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#666',
  },
});