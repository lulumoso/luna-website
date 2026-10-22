async function processMessage(message) {
  const text = String(message || "").trim();
  if (!text) return;

  const heard = document.getElementById("heard");
  const reply = document.getElementById("reply");
  const status = document.getElementById("status");
  const voiceStatus = document.getElementById("voiceStatus");

  if (heard) heard.textContent = text;
  if (reply) reply.textContent = "Connecting to your PC Luna...";
  if (status) status.textContent = "Connecting";
  if (voiceStatus) voiceStatus.textContent = "Luna is thinking...";

  try {
    const response = await fetch(
      "http://127.0.0.1:8765/command",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ command: text })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Luna request failed");
    }

    if (reply) reply.textContent = data.reply;
    if (status) status.textContent = "Connected to PC Luna";
    if (voiceStatus) voiceStatus.textContent = "Luna replied";

    if ("speechSynthesis" in window && data.reply) {
      window.speechSynthesis.cancel();

      const speech = new SpeechSynthesisUtterance(data.reply);
      speech.lang = "en-IN";
      window.speechSynthesis.speak(speech);
    }
  } catch (error) {
    console.error("Luna connection error:", error);

    if (status) status.textContent = "Not connected";
    if (reply) {
      reply.textContent =
        "Cannot connect to PC Luna. Check that Luna is running and the website is allowed to connect.";
    }
    if (voiceStatus) voiceStatus.textContent = "Connection failed";
  }
}
