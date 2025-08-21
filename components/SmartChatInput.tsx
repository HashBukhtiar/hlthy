import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { classifyIntent, IntentClassificationResult } from '@/ai/ai_chat';

interface SmartChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (message: string, intent?: IntentClassificationResult) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Intent configurations for UI
const intentConfigs = {
  planner: {
    icon: '🏋️',
    color: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    label: 'WORKOUT PLANNER',
  },
  technique: {
    icon: '🎯',
    color: '#F7931E', 
    backgroundColor: 'rgba(247, 147, 30, 0.15)',
    label: 'TECHNIQUE HELP',
  },
  explain: {
    icon: '📚',
    color: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    label: 'EDUCATION',
  },
  schedule: {
    icon: '📅',
    color: '#45B7D1',
    backgroundColor: 'rgba(69, 183, 209, 0.15)',
    label: 'SCHEDULING',
  },
  chit_chat: {
    icon: '💬',
    color: '#96CEB4',
    backgroundColor: 'rgba(150, 206, 180, 0.15)',
    label: 'CHAT',
  },
} as const;

export const SmartChatInput: React.FC<SmartChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder = "Ask me anything about fitness...",
  disabled = false,
}) => {
  const [currentIntent, setCurrentIntent] = useState<IntentClassificationResult | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [intentOpacity] = useState(new Animated.Value(0));
  const [inputBorderColor] = useState(new Animated.Value(0));

  // Debounced intent classification
  useEffect(() => {
    if (!value.trim() || value.length < 3) {
      setCurrentIntent(null);
      hideIntentIndicator();
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsClassifying(true);
      try {
        const result = await classifyIntent(value);
        setCurrentIntent(result);
        showIntentIndicator();
        animateBorderColor(result.intent);
      } catch (error) {
        console.error('Intent classification failed:', error);
        setCurrentIntent(null);
        hideIntentIndicator();
      } finally {
        setIsClassifying(false);
      }
    }, 800); // Debounce delay

    return () => clearTimeout(timeoutId);
  }, [value]);

  const showIntentIndicator = () => {
    Animated.timing(intentOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const hideIntentIndicator = () => {
    Animated.timing(intentOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    
    Animated.timing(inputBorderColor, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const animateBorderColor = (intent: string) => {
    Animated.timing(inputBorderColor, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleSend = () => {
    if (value.trim()) {
      // Only pass currentIntent if it exists and has an intent property
      const intentToPass = currentIntent?.intent ? currentIntent : undefined;
      onSend(value.trim(), intentToPass);
    }
  };

  const config = currentIntent ? intentConfigs[currentIntent.intent] : null;
  
  const borderColor = inputBorderColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#333', config?.color || '#333'],
  });

  return (
    <View style={styles.container}>
      {/* Intent Indicator */}
      <Animated.View 
        style={[
          styles.intentIndicator,
          {
            opacity: intentOpacity,
            backgroundColor: config?.backgroundColor || 'transparent',
          }
        ]}
      >
        {isClassifying ? (
          <View style={styles.classifyingContainer}>
            <ActivityIndicator size="small" color="#4ECDC4" />
            <Text style={styles.classifyingText}>Understanding...</Text>
          </View>
        ) : config ? (
          <View style={styles.intentContent}>
            <Text style={styles.intentIcon}>{config.icon}</Text>
            <Text style={[styles.intentLabel, { color: config.color }]}>
              {config.label}
            </Text>
            {currentIntent?.confidence && (
              <Text style={styles.confidenceText}>
                {Math.round(currentIntent.confidence * 100)}%
              </Text>
            )}
          </View>
        ) : null}
      </Animated.View>

      {/* Input Row */}
      <Animated.View 
        style={[
          styles.inputRow,
          { borderColor }
        ]}
      >
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#888"
          multiline
          maxLength={500}
          editable={!disabled}
          autoCorrect
          spellCheck
          autoCapitalize="sentences"
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: value.trim() && !disabled ? '#007AFF' : '#444',
            }
          ]}
          onPress={handleSend}
          disabled={!value.trim() || disabled}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={value.trim() && !disabled ? 'white' : '#888'} 
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Error indicator */}
      {currentIntent?.error && (
        <Text style={styles.errorText}>
          Classification unavailable • Continuing without smart features
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#1E1E1E',
  },
  intentIndicator: {
    marginBottom: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    minHeight: 28,
    justifyContent: 'center',
  },
  classifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classifyingText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: '600',
  },
  intentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  intentIcon: {
    fontSize: 14,
  },
  intentLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confidenceText: {
    fontSize: 10,
    color: '#888',
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#333',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 2,
    gap: 10,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
  },
  errorText: {
    color: '#888',
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
