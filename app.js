
const orb = document.getElementById("orb");
const status = document.getElementById("voiceStatus");
const heard = document.getElementById("heard");
const reply = document.getElementById("reply");

let audioContext;
let analyser;
let microphone;
let animationId;

async function startLunaVoice() {
  try {
    status.textContent = "Requesting microphone permission...";

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    function animateWaves() {
      analyser.getByteFrequencyData(data);

      const volume =
        data.reduce((sum, value) => sum + value, 0) /
        data.length;

      const scale = 1 + Math.min(volume / 180, 0.35);

      if (orb) {
        orb.style.transform = `scale(${scale})`;
        orb.style.boxShadow =
          `0 0 ${25 + volume}px rgba(130, 90, 255, 0.8)`;
      }

      animationId = requestAnimationFrame(animateWaves);
    }

    animateWaves();

    status.textContent = "Luna is listening";
    reply.textContent = "Microphone connected. Speak now.";

  } catch (error) {
    status.textContent = "Microphone access failed";
    reply.textContent =
      "Allow microphone access in your browser settings, then try again.";
    console.error(error);
  }
}

function stopLunaVoice() {
  cancelAnimationFrame(animationId);

  if (microphone) {
    microphone.mediaStream.getTracks().forEach(track => track.stop());
    microphone.disconnect();
    microphone = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  if (orb) {
    orb.style.transform = "scale(1)";
    orb.style.boxShadow = "";
  }

  status.textContent = "Luna is waiting";
}

document.addEventListener("DOMContentLoaded", () => {
  const talkButton = document.getElementById("talkBtn");
  const stopButton = document.getElementById("stopBtn");

  if (talkButton) {
    talkButton.textContent = "🎙 Enable microphone";
    talkButton.addEventListener("click", startLunaVoice);
  }

  if (stopButton) {
    stopButton.addEventListener("click", stopLunaVoice);
  }
});
