import { API_BASE_URL } from '@/config/api';
import { db } from '@/firebaseConfig';
import { doc, updateDoc, deleteDoc, collection, query, writeBatch } from 'firebase/firestore';

export interface IntentClassificationResult {
  intent: string;
  confidence: number;
  status: 'success' | 'error';
  message?: string;
}

export interface ChatMessage {
  text: string;
  role: 'user' | 'model';
}

export interface AIResponse {
  text: string;
  type?: string;
  workoutPlan?: any;
  interviewMode?: boolean;
  responseType?: string;
}

/**
 * Send a message to the HLTHY AI Coach backend service
 * @param history - Array of previous chat messages for context
 * @param currentMessage - The current message from the user
 * @param userId - The user's unique ID for profile management
 * @returns Promise<AIResponse> - AI response with text and optional structured data
 */
export async function sendMessage(history: ChatMessage[], currentMessage: string, userId?: string): Promise<AIResponse> {
  try {
    console.log('Sending message to AI backend:', { 
      url: `${API_BASE_URL}/api/chat`,
      messageCount: history.length,
      currentMessage: currentMessage.substring(0, 100) + '...',
      userId: userId || 'anonymous'
    });

    const requestBody: any = {
      message: currentMessage,
      conversation_history: history
    };

    // Include user_id if provided for profile management
    if (userId) {
      requestBody.user_id = userId;
    }

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error('AI service response not ok:', response.status, response.statusText);
      throw new Error(`AI service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw API response:', data);
    
    // Handle different response formats from the AI service
    const responseText = data.response || data.text || data.message;
    
    if (responseText) {
      return {
        text: responseText,
        type: data.workoutPlan ? 'workout_plan' : (data.response_type || 'text'),
        workoutPlan: data.workoutPlan || data.workout_plan,
        interviewMode: data.interview_mode || false,
        responseType: data.response_type
      };
    } else {
      console.error('Invalid response format from AI service:', data);
      throw new Error(data.error || 'Invalid response from AI service');
    }
  } catch (error) {
    console.error('Error communicating with AI service:', error);
    
    // Provide helpful error messages based on the error type
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { text: "I'm having trouble connecting to the AI service. Please check your internet connection and try again." };
    } else if (error instanceof Error && error.message.includes('AI service error')) {
      return { text: "The AI service is temporarily unavailable. Please try again in a moment." };
    } else {
      return { text: "Sorry, I encountered an unexpected error. Please try again later." };
    }
  }
}

/**
 * @deprecated Use sendMessage() directly instead. Intent classification has been removed.
 * This function now just calls sendMessage() for backward compatibility.
 */
/**
 * @deprecated Use sendMessage() directly instead. Intent classification has been removed.
 * This function now just calls sendMessage() for backward compatibility.
 */
export async function sendMessageWithIntent(history: ChatMessage[], currentMessage: string, userId?: string): Promise<AIResponse> {
  console.log('⚠️ sendMessageWithIntent is deprecated. Use sendMessage() instead.');
  return sendMessage(history, currentMessage, userId);
}

/**
 * @deprecated Intent classification has been removed. This function always returns a default result.
 * The AI now handles all intent detection internally.
 */
export async function classifyIntent(message: string): Promise<IntentClassificationResult> {
  console.log('⚠️ classifyIntent is deprecated and no longer used.');
  return {
    intent: 'chit_chat',
    confidence: 1.0,
    status: 'success',
    message: 'Intent classification is now handled by the AI directly'
  };
}

/**
 * Check if the AI service is healthy and available
 * @returns Promise<boolean> - True if service is healthy
 */
export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('AI service health check failed:', error);
    return false;
  }
}

/**
 * Clear the AI conversation history for a user
 * @param userId - The user's unique ID
 * @returns Promise<boolean> - Success status
 */
export async function clearConversationHistory(userId: string): Promise<boolean> {
  try {
    console.log('Clearing conversation history for user:', userId);
    
    const conversationId = `${userId}_ai_conversation`;
    
    // Delete the entire conversation document
    const conversationRef = doc(db, 'conversations', conversationId);
    await deleteDoc(conversationRef);
    
    console.log('✅ Conversation history cleared successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error clearing conversation history:', error);
    return false;
  }
}

// ChatMessage interface is already exported above
