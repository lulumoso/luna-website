
async function processMessage(message) {
  const text = String(message || "").trim();
  if (!text) return;

  const heard = document.getElementById("heard");
  const reply = document.getElementById("reply");
  const status = document.getElementById("status");
  const voiceStatus = document.getElementById("voiceStatus");
  const input = document.getElementById("textInput");

  if (heard) heard.textContent = text;
  if (reply) reply.textContent = "Connecting to PC Luna...";
  if (status) status.textContent = "Connecting...";
  if (voiceStatus) voiceStatus.textContent = "Luna is thinking...";

  let accessCode = sessionStorage.getItem("lunaAccessCode");

  if (!accessCode) {
    accessCode = window.prompt("Enter your Luna access code:");
    if (!accessCode) {
      if (status) status.textContent = "Ready";
      if (reply) reply.textContent = "Access code required.";
      return;
    }
    sessionStorage.setItem("lunaAccessCode", accessCode.trim());
    accessCode = accessCode.trim();
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
      throw new Error("Access code incorrect. Send again to retry.");
    }

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Luna request failed.");
    }

    if (reply) reply.textContent = data.reply;
    if (status) status.textContent = "Connected to PC Luna";
    if (voiceStatus) voiceStatus.textContent = "Luna replied";

    if (input) input.value = "";

    if ("speechSynthesis" in window && data.reply) {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(data.reply);
      speech.lang = "en-IN";
      window.speechSynthesis.speak(speech);
    }
  } catch (error) {
    console.error("Luna connection error:", error);
    if (status) status.textContent = "Connection failed";
    if (reply) reply.textContent = error.message || "Cannot connect to Luna.";
    if (voiceStatus) voiceStatus.textContent = "Please try again";
  }
}

// Connect the Send button to Luna.
const chatForm = document.getElementById("chatForm");

if (chatForm) {
  chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const input = document.getElementById("textInput");
    if (input) processMessage(input.value);
  });
}

// Connect the microphone button to speech recognition.
const orb = document.getElementById("orb");
const stopBtn = document.getElementById("stopBtn");
const voiceStatus = document.getElementById("voiceStatus");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;

if (orb) {
  orb.addEventListener("click", function () {
    if (!SpeechRecognition) {
      if (voiceStatus) {
        voiceStatus.textContent =
          "Voice recognition unavailable. Type your message below.";
      }
      return;
    }

    try {
      recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = function () {
        if (voiceStatus) voiceStatus.textContent = "Listening...";
        const status = document.getElementById("status");
        if (status) status.textContent = "Listening";
      };

      recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        processMessage(transcript);
      };

      recognition.onerror = function (event) {
        if (voiceStatus) {
          voiceStatus.textContent = "Microphone: " + event.error;
        }
      };

      recognition.onend = function () {
        recognition = null;
      };

      recognition.start();
    } catch (error) {
      if (voiceStatus) voiceStatus.textContent = "Could not start microphone.";
      console.error(error);
    }
  });
}

if (stopBtn) {
  stopBtn.addEventListener("click", function () {
    if (recognition) recognition.abort();
    recognition = null;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (voiceStatus) voiceStatus.textContent = "Stopped";
    const status = document.getElementById("status");
    if (status) status.textContent = "Ready";
  });
}
