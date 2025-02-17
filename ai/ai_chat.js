export async function sendMessage(prompt) {
  try {
    console.log("Sending request to Flask (Cloud Run):", prompt);
    const response = await fetch('https://hlthy-ai-service-375457000023.northamerica-northeast2.run.app/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
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

module.exports = { sendMessage };