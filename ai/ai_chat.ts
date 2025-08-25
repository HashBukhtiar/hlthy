import { API_BASE_URL } from '@/config/api';

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

/**
 * Send a message to the HLTHY AI Coach backend service
 * @param history - Array of previous chat messages for context
 * @param currentMessage - The current message from the user
 * @param userId - The user's unique ID for profile management
 * @returns Promise<string> - AI response text
 */
export async function sendMessage(history: ChatMessage[], currentMessage: string, userId?: string): Promise<string> {
  try {
    console.log('Sending message to AI backend:', { 
      url: `${API_BASE_URL}/api/chat`,
      messageCount: history.length,
      currentMessage: currentMessage.substring(0, 100) + '...',
      userId: userId || 'anonymous'
    });

    const requestBody: any = {
      history: history
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
    
    // The backend returns {"text": "response"} format
    if (data.text) {
      return data.text;
    } else if (data.response) {
      // Fallback for alternative response format
      return data.response;
    } else {
      console.error('Invalid response format from AI service:', data);
      throw new Error(data.message || data.error || 'Invalid response from AI service');
    }
  } catch (error) {
    console.error('Error communicating with AI service:', error);
    
    // Provide helpful error messages based on the error type
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return "I'm having trouble connecting to the AI service. Please check your internet connection and try again.";
    } else if (error instanceof Error && error.message.includes('AI service error')) {
      return "The AI service is temporarily unavailable. Please try again in a moment.";
    } else {
      return "Sorry, I encountered an unexpected error. Please try again later.";
    }
  }
}

/**
 * Send a message with intent classification to the AI backend
 * @param history - Array of previous chat messages for context
 * @param currentMessage - The current message from the user
 * @param userId - The user's unique ID for profile management
 * @returns Promise<string> - AI response text with intent processing
 */
export async function sendMessageWithIntent(history: ChatMessage[], currentMessage: string, userId?: string): Promise<string> {
  try {
    console.log('Sending message with intent to AI backend:', { 
      url: `${API_BASE_URL}/api/chat`,
      messageCount: history.length,
      currentMessage: currentMessage.substring(0, 100) + '...',
      userId: userId || 'anonymous'
    });

    // First classify the intent
    const intentResult = await classifyIntent(currentMessage);
    console.log('Intent classification result:', intentResult);

    const requestBody: any = {
      history: history,
      intent: intentResult.intent,
      confidence: intentResult.confidence
    };

    // Include user_id if provided for profile management
    if (userId) {
      requestBody.user_id = userId;
    }

    // Then send the message with intent context
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
    
    // The backend returns {"text": "response"} format
    if (data.text) {
      return data.text;
    } else if (data.response) {
      // Fallback for alternative response format
      return data.response;
    } else {
      console.error('Invalid response format from AI service:', data);
      throw new Error(data.message || data.error || 'Invalid response from AI service');
    }
  } catch (error) {
    console.error('Error communicating with AI service (with intent):', error);
    
    // Fallback to regular message sending if intent processing fails
    return await sendMessage(history, currentMessage);
  }
}

/**
 * Classify the intent of a user message
 * @param message - The user's message to classify
 * @returns Promise<IntentClassificationResult> - Classification result
 */
export async function classifyIntent(message: string): Promise<IntentClassificationResult> {
  try {
    console.log('Classifying intent for message:', message.substring(0, 50) + '...');

    const response = await fetch(`${API_BASE_URL}/api/classify-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message
      }),
    });

    if (!response.ok) {
      console.error('Intent classification response not ok:', response.status, response.statusText);
      return {
        intent: 'chit_chat',
        confidence: 0.5,
        status: 'error',
        message: 'Failed to classify intent'
      };
    }

    const data = await response.json();
    
    if (data.status === 'success' && data.intent) {
      return {
        intent: data.intent,
        confidence: data.confidence || 0.5,
        status: 'success'
      };
    } else {
      console.error('Intent classification failed:', data);
      return {
        intent: 'chit_chat',
        confidence: 0.5,
        status: 'error',
        message: data.message || data.error || 'Classification failed'
      };
    }
  } catch (error) {
    console.error('Error classifying intent:', error);
    return {
      intent: 'chit_chat',
      confidence: 0.5,
      status: 'error',
      message: 'Network error during intent classification'
    };
  }
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

// ChatMessage interface is already exported above
