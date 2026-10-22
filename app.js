
const talkBtn = document.getElementById("talkBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("status");
const voiceStatus = document.getElementById("voiceStatus");
const heardText = document.getElementById("heard");
const replyText = document.getElementById("reply");

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let recognition = null;

function speak(message) {
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "en-IN";
  utterance.rate = 1;

  utterance.onstart = () => {
    voiceStatus.textContent = "Luna is speaking...";
  };

  utterance.onend = () => {
    voiceStatus.textContent = "Luna is waiting";
    statusText.textContent = "Ready when you are";
  };

  window.speechSynthesis.speak(utterance);
}

talkBtn.addEventListener("click", () => {
  if (!SpeechRecognition) {
    replyText.textContent =
      "Voice recognition is not supported by this browser. Try Chrome.";
    speak("Please open Luna in Google Chrome.");
    return;
  }

  if (recognition) {
    recognition.stop();
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    statusText.textContent = "Listening";
    voiceStatus.textContent = "I'm listening, Remo...";
    heardText.textContent = "Listening for your voice...";
  };

  recognition.onresult = (event) => {
    const words = event.results[0][0].transcript;

    heardText.textContent = "You said: " + words;
    const message =
      "I heard you say: " + words +
      ". My online AI brain is not connected yet.";

    replyText.textContent = message;
    speak(message);
  };

  recognition.onerror = (event) => {
    statusText.textContent = "Voice error";
    voiceStatus.textContent = "Please try again";
    replyText.textContent =
      "Microphone error: " + event.error +
      ". Check microphone permission and try again.";
  };

  recognition.onend = () => {
    if (voiceStatus.textContent !== "Luna is speaking...") {
      statusText.textContent = "Ready when you are";
      voiceStatus.textContent = "Luna is waiting";
    }
  };

  try {
    recognition.start();
  } catch (error) {
    replyText.textContent =
      "Please wait a moment, then tap the microphone again.";
  }
});

stopBtn.addEventListener("click", () => {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }

  window.speechSynthesis.cancel();
  statusText.textContent = "Stopped";
  voiceStatus.textContent = "Luna is waiting";
});

window.addEventListener("beforeunload", () => {
  if (recognition) recognition.stop();
  window.speechSynthesis.cancel();
});
