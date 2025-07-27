
/**
 * AI Chat module for hlthy app
 * This file contains functionality for sending messages to the AI service.
 */

import { Message } from "@/types";
import { API_BASE_URL } from "@/config/api";

/**
 * Send a message to the AI service and get a response
 * @param history The user's message history to send to the AI
 * @returns A promise that resolves to the AI's response text
 */
export async function sendMessage(history: Message[]): Promise<string> {
  try {
    console.log("Sending request to AI service:", history);
    console.log("Using API URL:", API_BASE_URL);
    
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history }),
    });
    console.log("Response from AI service:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Data received from Flask:", data);

    return data.text;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}
