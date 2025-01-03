export async function sendMessage(prompt) {
  try {
    console.log("Sending request to Flask:", prompt);
    const response = await fetch('http://10.0.0.207:5000/api/ask', {
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