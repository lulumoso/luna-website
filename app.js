"use strict";

// Luna Website — Complete app.js replacement
// Uses the authenticated Cloudflare proxy and Luna Gemini Live audio.

const LUNA_PROXY =
  "https://luna-bridge-proxy.kannandonvip0.workers.dev/command";

const ACCESS_CODE_KEY = "lunaAccessCode";

const elements = {
  heard: document.getElementById("heard"),
  reply: document.getElementById("reply"),
  status: document.getElementById("status"),
  voiceStatus: document.getElementById("voiceStatus"),
  input: document.getElementById("textInput"),
  form: document.getElementById("chatForm"),
  send: document.getElementById("sendBtn"),
  orb: document.getElementById("orb"),
  stop: document.getElementById("stopBtn"),
  waves: document.getElementById("waves")
};

let isProcessing = false;
let recognition = null;
let currentAudio = null;
let currentAudioUrl = null;

function setStatus(message) {
  if (elements.status) {
    elements.status.textContent = message;
  }
}

function setVoiceStatus(message) {
  if (elements.voiceStatus) {
    elements.voiceStatus.textContent = message;
  }
}

function setReply(message) {
  if (elements.reply) {
    elements.reply.textContent = message;
  }
}

function setHeard(message) {
  if (elements.heard) {
    elements.heard.textContent = message;
  }
}

function setBusy(busy) {
  isProcessing = busy;

  if (elements.send) {
    elements.send.disabled = busy;
  }

  if (elements.input) {
    elements.input.disabled = busy;
  }

  if (elements.waves) {
    elements.waves.classList.toggle("active", busy);
  }
}

function stopLunaAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio.remove();
    currentAudio = null;
  }

  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function getAccessCode() {
  let code = sessionStorage.getItem(ACCESS_CODE_KEY);

  if (!code) {
    code = window.prompt("Enter your Luna access code:");

    if (code === null || !code.trim()) {
      return null;
    }

    code = code.trim();
    sessionStorage.setItem(ACCESS_CODE_KEY, code);
  }

  return code;
}

function decodeAudioBase64(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function playLunaAudio(base64) {
  if (!base64) {
    return false;
  }

  stopLunaAudio();

  const bytes = decodeAudioBase64(base64);
  const blob = new Blob([bytes], {
    type: "audio/wav"
  });

  currentAudioUrl = URL.createObjectURL(blob);

  const audio = new Audio(currentAudioUrl);
  audio.id = "lunaAudioPlayer";
  audio.controls = true;
  audio.preload = "auto";
  audio.style.display = "block";
  audio.style.width = "100%";
  audio.style.maxWidth = "420px";
  audio.style.margin = "12px auto";

  currentAudio = audio;

  if (elements.reply) {
    elements.reply.insertAdjacentElement("afterend", audio);
  }

  audio.addEventListener("ended", () => {
    setVoiceStatus("Luna finished speaking.");
  });

  audio.addEventListener("error", () => {
    setVoiceStatus(
      "Luna audio could not be played. Use the audio controls to retry."
    );
  });

  try {
    await audio.play();
    setVoiceStatus("Luna is speaking.");
    return true;
  } catch (error) {
    console.warn("Luna autoplay blocked:", error);
    setVoiceStatus(
      "Luna replied. Press Play on the audio player to hear her voice."
    );
    return false;
  }
}

async function processMessage(message) {
  const text = String(message || "").trim();

  if (!text || isProcessing) {
    return;
  }

  setBusy(true);
  stopLunaAudio();

  setHeard(text);
  setReply("Connecting to your PC Luna...");
  setStatus("Connecting");
  setVoiceStatus("Luna is thinking...");

  try {
    const accessCode = getAccessCode();

    if (!accessCode) {
      setStatus("Ready");
      setReply("Access code is required to connect to Luna.");
      setVoiceStatus("Connection cancelled.");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      120000
    );

    let response;

    try {
      response = await fetch(LUNA_PROXY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Luna-Access-Code": accessCode
        },
        body: JSON.stringify({
          command: text
        }),
        signal: controller.signal
      });
    } finally {
      window.clearTimeout(timeoutId);
    }

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "Luna proxy returned HTTP " +
        response.status +
        ". Response: " +
        raw.slice(0, 180)
      );
    }

    if (response.status === 401) {
      sessionStorage.removeItem(ACCESS_CODE_KEY);
      throw new Error(
        "Luna access code is incorrect. Send the message again and re-enter it."
      );
    }

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
        "Luna request failed with HTTP " + response.status
      );
    }

    setReply(data.reply || "Luna replied.");
    setStatus("Connected to PC Luna");

    if (elements.input) {
      elements.input.value = "";
    }

    if (data.audio_wav_base64) {
      await playLunaAudio(data.audio_wav_base64);
    } else {
      // Do not use the browser's generic voice as a substitute
      // for Luna's actual Gemini Live audio.
      setVoiceStatus(
        "Luna returned text but no Gemini Live audio. Check the PC Luna session."
      );
    }
  } catch (error) {
    console.error("Luna connection error:", error);

    let messageForUser = error.message || "Unable to connect to Luna.";

    if (error.name === "AbortError") {
      messageForUser =
        "Luna response timed out. Check that Luna and Cloudflare Tunnel are running.";
    }

    setStatus("Connection failed");
    setReply(messageForUser);
    setVoiceStatus("Luna connection error.");
  } finally {
    setBusy(false);
  }
}

// Connect the message form and Send button.
if (elements.form) {
  elements.form.addEventListener("submit", event => {
    event.preventDefault();

    if (elements.input) {
      processMessage(elements.input.value);
    }
  });
} else if (elements.send && elements.input) {
  elements.send.addEventListener("click", event => {
    event.preventDefault();
    processMessage(elements.input.value);
  });
}

// Enable microphone input using browser speech recognition.
const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (elements.orb) {
  elements.orb.addEventListener("click", () => {
    if (isProcessing) {
      setVoiceStatus("Luna is processing your previous message.");
      return;
    }

    if (!SpeechRecognition) {
      setVoiceStatus(
        "Voice recognition is unavailable in this browser. Type your message instead."
      );
      return;
    }

    if (recognition) {
      recognition.stop();
      return;
    }

    try {
      const instance = new SpeechRecognition();
      recognition = instance;

      instance.lang = "en-IN";
      instance.continuous = false;
      instance.interimResults = false;
      instance.maxAlternatives = 1;

      instance.onstart = () => {
        setStatus("Listening");
        setVoiceStatus("Luna is listening...");
      };

      instance.onresult = event => {
        const transcript =
          event.results[0][0].transcript.trim();

        if (transcript) {
          processMessage(transcript);
        }
      };

      instance.onerror = event => {
        console.error("Microphone error:", event.error);

        setVoiceStatus(
          "Microphone error: " + event.error
        );
      };

      instance.onend = () => {
        if (recognition === instance) {
          recognition = null;
        }

        if (!isProcessing) {
          setStatus("Ready");
        }
      };

      instance.start();
    } catch (error) {
      console.error("Cannot start microphone:", error);
      recognition = null;
      setVoiceStatus("Could not start microphone.");
    }
  });
}

// Stop microphone recognition and currently playing audio.
if (elements.stop) {
  elements.stop.addEventListener("click", () => {
    if (recognition) {
      recognition.abort();
      recognition = null;
    }

    stopLunaAudio();

    setVoiceStatus("Stopped.");
    setStatus("Ready");
  });
}

setStatus("Ready");
setVoiceStatus("Tap the moon to start speaking.");
