export async function sendMessage(prompt) {
  try {
    const response = await fetch('http://10.0.0.207:5000/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

module.exports = { sendMessage };