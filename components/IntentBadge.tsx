import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface IntentBadgeProps {
  intent: string;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

// Intent configurations
const intentConfigs = {
  planner: {
    icon: '🏋️',
    color: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    label: 'PLANNER',
  },
  technique: {
    icon: '🎯',
    color: '#F7931E',
    backgroundColor: 'rgba(247, 147, 30, 0.2)',
    label: 'TECHNIQUE',
  },
  explain: {
    icon: '📚',
    color: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    label: 'EDUCATION',
  },
  schedule: {
    icon: '📅',
    color: '#45B7D1',
    backgroundColor: 'rgba(69, 183, 209, 0.2)',
    label: 'SCHEDULE',
  },
  chit_chat: {
    icon: '💬',
    color: '#96CEB4',
    backgroundColor: 'rgba(150, 206, 180, 0.2)',
    label: 'CHAT',
  },
} as const;

export const IntentBadge: React.FC<IntentBadgeProps> = ({
  intent,
  size = 'small',
  showLabel = false,
}) => {
  const config = intentConfigs[intent as keyof typeof intentConfigs];
  
  if (!config) return null;

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.color,
          paddingHorizontal: isSmall ? 6 : 8,
          paddingVertical: isSmall ? 2 : 4,
        }
      ]}
    >
      <Text style={[styles.icon, { fontSize: isSmall ? 10 : 12 }]}>
        {config.icon}
      </Text>
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              color: config.color,
              fontSize: isSmall ? 8 : 10,
              marginLeft: 3,
            }
          ]}
        >
          {config.label}
        </Text>
      )}
    </View>
  );
};

interface IntentMessageWrapperProps {
  children: React.ReactNode;
  intent?: string;
  isUserMessage?: boolean;
  showIntentBadge?: boolean;
}

export const IntentMessageWrapper: React.FC<IntentMessageWrapperProps> = ({
  children,
  intent,
  isUserMessage = false,
  showIntentBadge = true,
}) => {
  const config = intent ? intentConfigs[intent as keyof typeof intentConfigs] : null;

  return (
    <View style={styles.messageWrapper}>
      {children}
      {showIntentBadge && intent && config && (
        <View
          style={[
            styles.intentBadgeContainer,
            isUserMessage
              ? { alignSelf: 'flex-end', marginRight: 5 }
              : { alignSelf: 'flex-start', marginLeft: 5 }
          ]}
        >
          <IntentBadge intent={intent} size="small" showLabel />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageWrapper: {
    marginVertical: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    lineHeight: 16,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  intentBadgeContainer: {
    marginTop: 3,
    opacity: 0.8,
  },
});
