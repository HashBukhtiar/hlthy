import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingsItemProps {
  type: 'toggle' | 'select' | 'input' | 'button' | 'info' | 'date';
  label: string;
  value?: any;
  onValueChange?: (value: any) => void;
  onBlur?: () => void;
  options?: { label: string; value: any }[];
  placeholder?: string;
  maxLength?: number;
  helperText?: string;
  destructive?: boolean;
  disabled?: boolean;
  displayValue?: string;
  onPress?: () => void;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({
  type,
  label,
  value,
  onValueChange,
  onBlur,
  options,
  placeholder,
  maxLength,
  helperText,
  destructive = false,
  disabled = false,
  displayValue,
  onPress,
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
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor="#666"
            editable={!disabled}
            maxLength={maxLength}
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
            <Text style={[styles.selectText, !displayValue && !value && styles.placeholder, disabled && styles.disabledText]}>
              {displayValue || (value ? value.toLocaleDateString() : placeholder)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  // For date type, we don't want to duplicate the label and content
  if (type === 'date') {
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
  }

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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  labelContainer: {
    flex: 2,
    marginRight: 16,
    minWidth: 120,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
    maxWidth: 200,
    flex: 1,
  },
  selectText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
    flex: 1,
  },
  placeholder: {
    color: '#666',
  },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    minWidth: 120,
    maxWidth: 200,
    flex: 1,
    textAlignVertical: 'top',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 200,
    flex: 1,
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 14,
    marginRight: 8,
    flex: 1,
  },
  infoText: {
    color: '#999',
    fontSize: 14,
    flex: 1,
    maxWidth: 200,
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