
/**
 * AI Chat module for hlthy app
 * This file contains functionality for sending messages to the AI service.
 */

import { Message } from "@/types";

/**
 * Send a message to the AI service and get a response
 * @param history The user's message history to send to the AI
 * @returns A promise that resolves to the AI's response text
 */
export async function sendMessage(history: Message[]): Promise<string> {
  try {
    console.log("Sending request to Flask (Cloud Run):", history);
    const response = await fetch('https://hlthy-ai-service-375457000023.northamerica-northeast2.run.app/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history }),
    });
    console.log("Response from Flask:", response.status, response.statusText);

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
