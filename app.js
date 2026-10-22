
const orb = document.getElementById("orb");
const statusText = document.getElementById("status");
const voiceStatus = document.getElementById("voiceStatus");
const heard = document.getElementById("heard");
const reply = document.getElementById("reply");
const waves = document.getElementById("waves");
const chatForm = document.getElementById("chatForm");
const textInput = document.getElementById("textInput");
const stopBtn = document.getElementById("stopBtn");

let audioContext = null;
let analyser = null;
let micStream = null;
let animationId = null;
let recognition = null;
let listening = false;

function setStatus(message) {
  if (statusText) statusText.textContent = message;
}

function setListening(active) {
  listening = active;
  orb?.classList.toggle("listening", active);
  waves?.classList.toggle("active", active);
  voiceStatus.textContent = active
    ? "Luna is listening..."
    : "Tap the moon to start speaking";
}

async function startMeter() {
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: true
  });

  audioContext = new (
    window.AudioContext || window.webkitAudioContext
  )();

  await audioContext.resume();

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  const source = audioContext.createMediaStreamSource(micStream);
  source.connect(analyser);

  const bars = [...waves.querySelectorAll("i")];
  const values = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    if (!analyser) return;

    analyser.getByteFrequencyData(values);

    const average =
      values.reduce((total, value) => total + value, 0) /
      values.length;

    bars.forEach((bar, index) => {
      const value = values[index * 2] || average;
      bar.style.height = `${5 + value * 0.28}px`;
    });

    const scale = 1 + Math.min(average / 400, 0.12);
    orb.style.transform = `scale(${scale})`;

    animationId = requestAnimationFrame(draw);
  }

  draw();
}

function startSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceStatus.textContent =
      "Speech recognition is not supported in this browser.";
    reply.textContent =
      "Try an updated browser that supports speech recognition.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = event => {
    let transcript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    heard.textContent = transcript;

    const last = event.results[event.results.length - 1];

    if (last && last.isFinal) {
      processMessage(transcript);
    }
  };

  recognition.onerror = event => {
    voiceStatus.textContent =
      "Voice recognition: " + event.error;
  };

  recognition.onend = () => {
    if (listening) {
      try {
        recognition.start();
      } catch (_) {}
    }
  };

  recognition.start();
}

async function startLuna() {
  if (listening) return;

  if (!navigator.mediaDevices?.getUserMedia) {
    reply.textContent =
      "Microphone needs HTTPS and browser permission.";
    return;
  }

  try {
    setStatus("Requesting microphone");
    await startMeter();
    setListening(true);
    setStatus("Listening");
    startSpeechRecognition();
  } catch (error) {
    console.error(error);
    setStatus("Microphone unavailable");
    voiceStatus.textContent = "Microphone permission is needed.";
    reply.textContent =
      "Allow microphone access in your browser settings and try again.";
    stopLuna();
  }
}

function stopLuna() {
  listening = false;

  if (recognition) {
    const oldRecognition = recognition;
    recognition = null;
    oldRecognition.onend = null;

    try {
      oldRecognition.stop();
    } catch (_) {}
  }

  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;

  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }

  analyser = null;
  orb.style.transform = "scale(1)";
  waves.querySelectorAll("i").forEach(bar => {
    bar.style.height = "7px";
  });

  setListening(false);
  setStatus("Ready");
}

function processMessage(message) {
  const text = message.trim();
  if (!text) return;

  const lower = text.toLowerCase();

  if (lower.includes("hello") || lower.includes("hi luna")) {
    reply.textContent = "Hello Remo! I'm here to help.";
  } else if (lower.includes("your name")) {
    reply.textContent = "I'm Luna, your personal assistant.";
  } else {
    reply.textContent =
      "I heard you: “" + text +
      "”. Real AI connection is not configured yet.";
  }
}

orb.addEventListener("click", startLuna);
stopBtn.addEventListener("click", stopLuna);

chatForm.addEventListener("submit", event => {
  event.preventDefault();

  const message = textInput.value.trim();
  if (!message) return;

  heard.textContent = message;
  processMessage(message);
  textInput.value = "";
});

window.addEventListener("pagehide", stopLuna);
