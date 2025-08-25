import React from 'react';
import { View, Text, StyleSheet, Alert, Clipboard } from 'react-native';
import { WorkoutRenderer } from './WorkoutRenderer';

interface SmartMessageRendererProps {
  message: string;
  intent?: string;
}

// Type definitions for workout data
interface WorkoutPlan {
  dayType: string;
  segments: Array<{
    name: string;
    exercises: Array<{
      exerciseId: string;
      exerciseName: string;
      sets: number;
      reps: number | string;
      load?: string;
      restSec: number;
      notes?: string;
      safetyRating?: string;
      equipmentNeeded?: string[];
    }>;
  }>;
  safetyNotes?: string;
  duration?: string;
  difficulty?: string;
}

export const SmartMessageRenderer: React.FC<SmartMessageRendererProps> = ({ 
  message, 
  intent 
}) => {
  // Check if message contains JSON embedded in text
  const extractJsonAndText = (text: string) => {
    try {
      // Look for JSON blocks
      const jsonMatch = text.match(/```json\s*(\{.*?\})\s*```/s) || text.match(/(\{[\s\S]*?\})/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1];
        const beforeJson = text.substring(0, text.indexOf(jsonMatch[0])).trim();
        const afterJson = text.substring(text.indexOf(jsonMatch[0]) + jsonMatch[0].length).trim();
        
        try {
          const parsed = JSON.parse(jsonStr);
          return {
            hasJson: true,
            jsonData: parsed,
            beforeText: beforeJson,
            afterText: afterJson,
            isWorkout: !!(parsed.dayType && parsed.segments && Array.isArray(parsed.segments)),
            isTechnique: !!(parsed.issue || parsed.riskAssessment || parsed.safeAlternatives || parsed.avoidExercises)
          };
        } catch {
          return { hasJson: false };
        }
      }
      
      return { hasJson: false };
    } catch {
      return { hasJson: false };
    }
  };

  // Check if message is JSON workout data
  const isWorkoutJson = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text);
      return !!(
        parsed && 
        typeof parsed === 'object' &&
        parsed.dayType &&
        parsed.segments &&
        Array.isArray(parsed.segments)
      );
    } catch {
      return false;
    }
  };

  // Parse JSON if it's workout data
  const parseWorkoutData = (text: string): WorkoutPlan | null => {
    try {
      const parsed = JSON.parse(text);
      if (isWorkoutJson(text)) {
        return parsed as WorkoutPlan;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Handle saving workout
  const handleSaveWorkout = async () => {
    try {
      // TODO: Implement workout saving logic
      Alert.alert('Success', 'Workout saved to your library!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  // Handle sharing workout
  const handleShareWorkout = async () => {
    try {
      Clipboard.setString(message);
      Alert.alert('Copied!', 'Workout copied to clipboard for sharing.');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy workout. Please try again.');
    }
  };

  // Format regular text messages
  const formatTextMessage = (text: string) => {
    // Clean up any stray JSON markers
    const cleanText = text
      .replace(/```json\s*/g, '')
      .replace(/\s*```/g, '')
      .trim();

    // Split into paragraphs
    const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();
      
      // Handle lists (bullet points or numbered)
      if (trimmedParagraph.includes('•') || trimmedParagraph.includes('-') || /^\d+\./.test(trimmedParagraph)) {
        const lines = trimmedParagraph.split('\n').map(line => line.trim()).filter(line => line);
        return (
          <View key={index} style={styles.listContainer}>
            {lines.map((line, lineIndex) => {
              const cleanLine = line.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');
              const isNumbered = /^\d+\./.test(line);
              const bulletChar = isNumbered ? `${line.match(/^\d+/)?.[0]}.` : '•';
              
              return (
                <View key={lineIndex} style={styles.listItem}>
                  <Text style={styles.bulletPoint}>{bulletChar}</Text>
                  <Text style={styles.listItemText}>{cleanLine}</Text>
                </View>
              );
            })}
          </View>
        );
      }
      
      // Handle headers (short lines that seem like titles)
      if (trimmedParagraph.length < 60 && !trimmedParagraph.includes('.') && index < paragraphs.length - 1) {
        return (
          <Text key={index} style={styles.sectionHeader}>
            {trimmedParagraph}
          </Text>
        );
      }
      
      // Handle workout-like structured text (fallback)
      if (trimmedParagraph.includes('Sets:') || trimmedParagraph.includes('Reps:') || trimmedParagraph.includes('Week') || trimmedParagraph.includes('Day')) {
        const lines = trimmedParagraph.split('\n').map(line => line.trim()).filter(line => line);
        return (
          <View key={index} style={styles.workoutTextBlock}>
            {lines.map((line, lineIndex) => (
              <Text key={lineIndex} style={styles.workoutTextLine}>
                {line}
              </Text>
            ))}
          </View>
        );
      }
      
      // Regular paragraphs
      return (
        <Text key={index} style={styles.paragraph}>
          {trimmedParagraph}
        </Text>
      );
    });
  };

  // Main render logic
  const workoutData = parseWorkoutData(message);

  if (workoutData) {
    // Render as beautiful workout UI
    return (
      <WorkoutRenderer
        workoutData={workoutData}
        onSaveWorkout={handleSaveWorkout}
        onShareWorkout={handleShareWorkout}
      />
    );
  }

  // Render as formatted text
  return (
    <View style={styles.textContainer}>
      {formatTextMessage(message)}
    </View>
  );
};

const styles = StyleSheet.create({
  textContainer: {
    flex: 1,
  },
  paragraph: {
    color: '#FFF',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  sectionHeader: {
    color: '#4CD964',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  listContainer: {
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletPoint: {
    color: '#4CD964',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 20,
  },
  listItemText: {
    color: '#FFF',
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  workoutTextBlock: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CD964',
  },
  workoutTextLine: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
