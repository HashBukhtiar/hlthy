
/**
 * AI Chat module for hlthy app
 * This file contains functionality for sending messages to the AI service with intent classification.
 */

// Local Message interface for AI chat
interface Message {
  text: string;
  role: 'user' | 'model';
}

import { API_BASE_URL } from "@/config/api";

export interface IntentClassificationResult {
  intent: 'planner' | 'technique' | 'explain' | 'schedule' | 'chit_chat';
  confidence?: number;
  error?: string;
}

export interface ChatResponse {
  text: string;
  intent?: string;
  error?: string;
}

/**
 * Classify the intent of a user's message
 * @param message The message to classify
 * @returns A promise that resolves to the intent classification result
 */
export async function classifyIntent(message: string): Promise<IntentClassificationResult> {
  try {
    console.log("Classifying intent for message:", message);
    console.log("Using API URL:", API_BASE_URL);
    
    const response = await fetch(`${API_BASE_URL}/api/classify-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    
    console.log("Intent classification response status:", response.status, response.statusText);

    if (!response.ok) {
      console.error(`Intent classification failed: ${response.status} ${response.statusText}`);
      return {
        intent: 'explain',
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log("Intent classification result:", data);

    // Ensure we return a properly formatted result
    return {
      intent: data.intent || 'explain',
      confidence: data.confidence,
    };
  } catch (error) {
    console.error("Error classifying intent:", error);
    return {
      intent: 'explain',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a message to the AI service and get a response with intent classification
 * @param history The user's message history to send to the AI
 * @param userMessage Optional current user message for intent classification
 * @returns A promise that resolves to the AI's response with intent info
 */
export async function sendMessage(history: Message[], userMessage?: string): Promise<string> {
  try {
    console.log("Sending request to AI service:", history);
    console.log("Using API URL:", API_BASE_URL);
    
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        history,
        user_id: 'mobile_user' // Add user ID for better context
      }),
    });
    console.log("Response from AI service:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Data received from Flask:", data);

    return data.response || data.text || "Sorry, I didn't understand that.";
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Send message with integrated intent classification and response
 * @param history The user's message history
 * @param userMessage The current user message
 * @returns Promise with both intent classification and AI response
 */
export async function sendMessageWithIntent(
  history: Message[], 
  userMessage: string
): Promise<{ response: string; intent: IntentClassificationResult }> {
  try {
    // Step 1: Classify intent
    const intentResult = await classifyIntent(userMessage);
    
    // Step 2: Get AI response  
    const response = await sendMessage(history, userMessage);
    
    return {
      response,
      intent: intentResult,
    };
  } catch (error) {
    console.error("Error in sendMessageWithIntent:", error);
    
    // Fallback response
    return {
      response: "Sorry, I'm having trouble connecting. Please try again later.",
      intent: {
        intent: 'explain',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
