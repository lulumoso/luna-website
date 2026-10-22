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

  let accessCode = sessionStorage.getItem("lunaAccessCode");

  if (!accessCode) {
    accessCode = window.prompt("Enter your Luna access code:");
    if (!accessCode) {
      if (status) status.textContent = "Cancelled";
      if (reply) reply.textContent = "Access code required to connect to Luna.";
      if (voiceStatus) voiceStatus.textContent = "Connection cancelled";
      return;
    }
    sessionStorage.setItem("lunaAccessCode", accessCode);
  }

  try {
    const response = await fetch(
      "https://luna-bridge-proxy.kannandonvip0.workers.dev/command",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Luna-Access-Code": accessCode
        },
        body: JSON.stringify({ command: text })
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      sessionStorage.removeItem("lunaAccessCode");
      throw new Error("Invalid access code. Try again.");
    }

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
    if (reply) reply.textContent = error.message || "Cannot connect to PC Luna.";
    if (voiceStatus) voiceStatus.textContent = "Connection failed";
  }
}
