// -------------------------------------------------------------
// Vocal Separator Pro - Core Studio Controller & DSP Audio Engine
// -------------------------------------------------------------

// Active State
const state = {
  audioContext: null,
  decodedAudioBuffer: null,
  audioName: "song.mp3",
  duration: 0,
  
  // DSP parameters
  vocalSharpness: 3,
  centerPan: 0.85,
  bassCut: true,
  
  // Stems buffers
  vocalBuffer: null,
  instrumentalBuffer: null,
  
  // Synced audio playing nodes
  activeNodes: [],
  gainNodes: {
    master: null,
    vocals: null,
    instrumentals: null
  },
  
  // Playback parameters
  isPlaying: false,
  isPaused: false,
  startTime: 0,
  pausedTime: 0,
  playbackPosition: 0, // current play elapsed seconds
  
  // Solo & Mute States
  channels: {
    vocals: { mute: false, solo: false, volume: 100 },
    instrumentals: { mute: false, solo: false, volume: 100 }
  },
  
  playbackInterval: null
};

// DOM References
let elDropZone, elFileInput, elThumbnail, elAudioName, elAudioDur, elBtnRemove;
let elSharpSlider, elSharpVal, elPanSlider, elPanVal, elCheckBassCut;
let elBtnPlay, elBtnPause, elBtnStop, elMasterVolSlider, elMasterVolVal;
let elPlaceholder, elMultitrackGrid, elProcessingOverlay;
let elCanvasVoc, elCanvasInst, elHeadVoc, elHeadInst;
let elBtnMuteVoc, elBtnSoloVoc, elBtnMuteInst, elBtnSoloInst;
let elVolVocSlider, elVolInstSlider;
let elBtnDloadVoc, elBtnDloadInst;
let elBtnReset, elBtnSeparate, elStudioStatusBadge;

document.addEventListener("DOMContentLoaded", () => {
  cacheDomElements();
  bindEventHandlers();
});

function cacheDomElements() {
  elDropZone = document.getElementById("drop-zone");
  elFileInput = document.getElementById("file-input");
  elThumbnail = document.getElementById("thumbnail-wrapper");
  elAudioName = document.getElementById("audio-name");
  elAudioDur = document.getElementById("audio-duration");
  elBtnRemove = document.getElementById("btn-remove-audio");
  
  elSharpSlider = document.getElementById("range-vocal-sharpness");
  elSharpVal = document.getElementById("val-vocal-sharpness");
  elPanSlider = document.getElementById("range-center-pan");
  elPanVal = document.getElementById("val-center-pan");
  elCheckBassCut = document.getElementById("check-bass-cut");
  
  elBtnPlay = document.getElementById("btn-play-all");
  elBtnPause = document.getElementById("btn-pause-all");
  elBtnStop = document.getElementById("btn-stop-all");
  elMasterVolSlider = document.getElementById("range-volume-master");
  elMasterVolVal = document.getElementById("val-volume-master");
  
  elPlaceholder = document.getElementById("editor-placeholder");
  elMultitrackGrid = document.getElementById("multitrack-container");
  elProcessingOverlay = document.getElementById("processing-overlay");
  
  elCanvasVoc = document.getElementById("canvas-vocals");
  elCanvasInst = document.getElementById("canvas-instrumentals");
  elHeadVoc = document.getElementById("head-vocals");
  elHeadInst = document.getElementById("head-instrumentals");
  
  elBtnMuteVoc = document.getElementById("btn-mute-vocals");
  elBtnSoloVoc = document.getElementById("btn-solo-vocals");
  elBtnMuteInst = document.getElementById("btn-mute-instrumentals");
  elBtnSoloInst = document.getElementById("btn-solo-instrumentals");
  
  elVolVocSlider = document.getElementById("range-volume-vocals");
  elVolInstSlider = document.getElementById("range-volume-instrumentals");
  
  elBtnDloadVoc = document.getElementById("btn-download-vocals");
  elBtnDloadInst = document.getElementById("btn-download-instrumentals");
  
  elBtnReset = document.getElementById("btn-reset");
  elBtnSeparate = document.getElementById("btn-separate");
  elStudioStatusBadge = document.getElementById("studio-status-badge");
}

function bindEventHandlers() {
  
  // Drag and drop audio
  elDropZone.addEventListener("click", () => elFileInput.click());
  elFileInput.addEventListener("change", handleFileSelect);
  
  elDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    elDropZone.classList.add("dragover");
  });
  
  elDropZone.addEventListener("dragleave", () => {
    elDropZone.classList.remove("dragover");
  });
  
  elDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    elDropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      elFileInput.files = e.dataTransfer.files;
      handleFileSelect();
    }
  });

  elBtnRemove.addEventListener("click", resetWorkspace);
  elBtnReset.addEventListener("click", resetControlsToDefaults);

  // Parameter controls
  elSharpSlider.addEventListener("input", (e) => {
    state.vocalSharpness = parseInt(e.target.value);
    const labels = ["Lo-Fi Wide", "Soft Mid", "Medium", "Isolated", "Surgical (Narrow)"];
    elSharpVal.textContent = labels[state.vocalSharpness - 1];
  });

  elPanSlider.addEventListener("input", (e) => {
    state.centerPan = parseFloat(e.target.value);
    elPanVal.textContent = state.centerPan.toFixed(2);
  });

  elCheckBassCut.addEventListener("change", (e) => {
    state.bassCut = e.target.checked;
  });

  // Action Separate Trigger
  elBtnSeparate.addEventListener("click", executeStemsSeparation);

  // Sync Transport Player
  elBtnPlay.addEventListener("click", startPlaybackAllNodes);
  elBtnPause.addEventListener("click", pausePlaybackAllNodes);
  elBtnStop.addEventListener("click", stopPlaybackAllNodes);

  elMasterVolSlider.addEventListener("input", (e) => {
    const vol = parseInt(e.target.value);
    elMasterVolVal.textContent = `${vol}%`;
    if (state.gainNodes.master) {
      state.gainNodes.master.gain.value = vol / 100;
    }
  });

  // Multitrack Faders
  elVolVocSlider.addEventListener("input", (e) => {
    const vol = parseInt(e.target.value);
    state.channels.vocals.volume = vol;
    e.target.nextElementSibling.textContent = `${vol}%`;
    updateChannelVolumes();
  });

  elVolInstSlider.addEventListener("input", (e) => {
    const vol = parseInt(e.target.value);
    state.channels.instrumentals.volume = vol;
    e.target.nextElementSibling.textContent = `${vol}%`;
    updateChannelVolumes();
  });

  // Solo & Mute Buttons
  elBtnMuteVoc.addEventListener("click", () => toggleChannelControl("vocals", "mute"));
  elBtnSoloVoc.addEventListener("click", () => toggleChannelControl("vocals", "solo"));
  elBtnMuteInst.addEventListener("click", () => toggleChannelControl("instrumentals", "mute"));
  elBtnSoloInst.addEventListener("click", () => toggleChannelControl("instrumentals", "solo"));

  // Downloads Stems
  elBtnDloadVoc.addEventListener("click", () => triggerStemWavDownload(state.vocalBuffer, "vocals"));
  elBtnDloadInst.addEventListener("click", () => triggerStemWavDownload(state.instrumentalBuffer, "instrumentals"));
}

// --- Audio File decoding ---
function handleFileSelect() {
  const file = elFileInput.files[0];
  if (!file) return;

  state.audioName = file.name;
  
  elDropZone.style.display = "none";
  elThumbnail.style.display = "flex";
  elAudioName.textContent = state.audioName;
  elAudioDur.textContent = "Decoding audio data...";
  elStudioStatusBadge.textContent = "Decoding...";
  elStudioStatusBadge.className = "badge";

  const reader = new FileReader();
  reader.onload = (e) => {
    // Instantiate AudioContext on user interaction to comply with modern browser autoplay policies
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    state.audioContext.decodeAudioData(e.target.result)
      .then((decodedBuffer) => {
        state.decodedAudioBuffer = decodedBuffer;
        state.duration = decodedBuffer.duration;
        
        elAudioDur.textContent = `Duration: ${formatTime(state.duration)}`;
        elStudioStatusBadge.textContent = "Loaded";
        elStudioStatusBadge.className = "badge";
        
        elBtnReset.disabled = false;
        elBtnSeparate.disabled = false;
      })
      .catch((err) => {
        console.error("Audio decoding failed.", err);
        alert("Error: Browser failed to decode this audio track. Please verify the format is standard.");
        resetWorkspace();
      });
  };
  reader.readAsArrayBuffer(file);
}

function resetWorkspace() {
  stopPlaybackAllNodes();
  state.decodedAudioBuffer = null;
  state.vocalBuffer = null;
  state.instrumentalBuffer = null;
  elFileInput.value = "";
  
  elDropZone.style.display = "flex";
  elThumbnail.style.display = "none";
  elPlaceholder.style.display = "flex";
  elMultitrackGrid.style.display = "none";
  
  elStudioStatusBadge.textContent = "No Audio Loaded";
  elStudioStatusBadge.className = "badge";

  elBtnReset.disabled = true;
  elBtnSeparate.disabled = true;
  
  // Disable transport
  elBtnPlay.disabled = true;
  elBtnPause.disabled = true;
  elBtnStop.disabled = true;
  elMasterVolSlider.disabled = true;
}

function resetControlsToDefaults() {
  stopPlaybackAllNodes();
  
  state.vocalSharpness = 3;
  elSharpSlider.value = 3;
  elSharpVal.textContent = "Medium";
  
  state.centerPan = 0.85;
  elPanSlider.value = 0.85;
  elPanVal.textContent = "0.85";
  
  state.bassCut = true;
  elCheckBassCut.checked = true;

  if (state.decodedAudioBuffer) {
    elBtnSeparate.disabled = false;
    elBtnPlay.disabled = true;
    elBtnPause.disabled = true;
    elBtnStop.disabled = true;
    elMultitrackGrid.style.display = "none";
    elPlaceholder.style.display = "flex";
  }
}

// --- Synced audio mixing node managers ---
function updateChannelVolumes() {
  if (!state.isPlaying || !state.gainNodes.vocals || !state.gainNodes.instrumentals) return;

  const voc = state.channels.vocals;
  const inst = state.channels.instrumentals;

  let vocVol = voc.volume / 100;
  let instVol = inst.volume / 100;

  // Apply Mute rules
  if (voc.mute) vocVol = 0;
  if (inst.mute) instVol = 0;

  // Apply Solo rules: if any channel is soloed, non-soloed channels are muted!
  const anySolo = voc.solo || inst.solo;
  if (anySolo) {
    if (!voc.solo) vocVol = 0;
    if (!inst.solo) instVol = 0;
  }

  // Linear ramp to avoid audio clicks
  const t = state.audioContext.currentTime;
  state.gainNodes.vocals.gain.setValueAtTime(vocVol, t);
  state.gainNodes.instrumentals.gain.setValueAtTime(instVol, t);
}

function toggleChannelControl(ch, type) {
  const channel = state.channels[ch];
  
  if (type === "mute") {
    channel.mute = !channel.mute;
    const btn = ch === "vocals" ? elBtnMuteVoc : elBtnMuteInst;
    btn.classList.toggle("active", channel.mute);
  } 
  else if (type === "solo") {
    channel.solo = !channel.solo;
    const btn = ch === "vocals" ? elBtnSoloVoc : elBtnSoloInst;
    btn.classList.toggle("active", channel.solo);
  }

  updateChannelVolumes();
}

// --- Sync DAW Player Transport ---
function startPlaybackAllNodes() {
  if (!state.vocalBuffer || !state.instrumentalBuffer) return;
  if (state.isPlaying) return;

  if (!state.audioContext) {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (state.audioContext.state === "suspended") {
    state.audioContext.resume();
  }

  // Define Gain nodes to mix on the fly
  state.gainNodes.master = state.audioContext.createGain();
  state.gainNodes.master.gain.value = parseInt(elMasterVolSlider.value) / 100;
  state.gainNodes.master.connect(state.audioContext.destination);

  state.gainNodes.vocals = state.audioContext.createGain();
  state.gainNodes.vocals.connect(state.gainNodes.master);

  state.gainNodes.instrumentals = state.audioContext.createGain();
  state.gainNodes.instrumentals.connect(state.gainNodes.master);

  // Instantiate sources
  const srcVoc = state.audioContext.createBufferSource();
  srcVoc.buffer = state.vocalBuffer;
  srcVoc.connect(state.gainNodes.vocals);

  const srcInst = state.audioContext.createBufferSource();
  srcInst.buffer = state.instrumentalBuffer;
  srcInst.connect(state.gainNodes.instrumentals);

  state.activeNodes = [srcVoc, srcInst];

  // Adjust volumes according to Mute/Solo
  updateChannelVolumes();

  // Playback offsets
  let offset = 0;
  if (state.isPaused) {
    offset = state.pausedTime;
  }
  
  state.startTime = state.audioContext.currentTime - offset;
  state.playbackPosition = offset;
  
  srcVoc.start(0, offset);
  srcInst.start(0, offset);

  state.isPlaying = true;
  state.isPaused = false;

  elBtnPlay.classList.add("active");
  elBtnPause.classList.remove("active");

  // Sync scrolling timeline playback head
  startPlaybackClock();

  // Reset sources when track completes
  srcVoc.onended = () => {
    // If the song finished naturally, stop transport
    const elapsed = state.audioContext.currentTime - state.startTime;
    if (elapsed >= state.duration - 0.2) {
      stopPlaybackAllNodes();
    }
  };
}

function pausePlaybackAllNodes() {
  if (!state.isPlaying) return;

  state.activeNodes.forEach(node => {
    try { node.stop(); } catch(e) {}
  });
  state.activeNodes = [];

  state.pausedTime = state.audioContext.currentTime - state.startTime;
  state.playbackPosition = state.pausedTime;
  state.isPlaying = false;
  state.isPaused = true;

  elBtnPlay.classList.remove("active");
  elBtnPause.classList.add("active");

  clearInterval(state.playbackInterval);
}

function stopPlaybackAllNodes() {
  state.activeNodes.forEach(node => {
    try { node.stop(); } catch(e) {}
  });
  state.activeNodes = [];

  state.pausedTime = 0;
  state.playbackPosition = 0;
  state.isPlaying = false;
  state.isPaused = false;

  elBtnPlay.classList.remove("active");
  elBtnPause.classList.remove("active");

  clearInterval(state.playbackInterval);
  
  // Reset scroll heads
  elHeadVoc.style.left = "0%";
  elHeadInst.style.left = "0%";
}

function startPlaybackClock() {
  clearInterval(state.playbackInterval);
  
  state.playbackInterval = setInterval(() => {
    if (!state.isPlaying) return;
    
    state.playbackPosition = state.audioContext.currentTime - state.startTime;
    if (state.playbackPosition > state.duration) {
      state.playbackPosition = state.duration;
    }

    const pct = (state.playbackPosition / state.duration) * 100;
    elHeadVoc.style.left = `${pct}%`;
    elHeadInst.style.left = `${pct}%`;
  }, 100);
}

// --- Lossless WAV File compilation and exporter ---
function triggerStemWavDownload(buffer, stemName) {
  if (!buffer) return;

  elProcessingOverlay.style.display = "flex";
  document.querySelector("#processing-overlay h3").textContent = "Encoding WAV File...";
  document.querySelector("#processing-overlay p").textContent = "Writing lossless studio headers...";

  setTimeout(() => {
    try {
      const wavBlob = compileWavFileBlob(buffer);
      const url = URL.createObjectURL(wavBlob);

      const baseName = state.audioName.substring(0, state.audioName.lastIndexOf(".")) || "audio";
      const downloadName = `${baseName}_${stemName}.wav`;

      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("WAV compile failed.", err);
      alert("Error: Lossless PCM compiler encountered memory limits.");
    } finally {
      elProcessingOverlay.style.display = "none";
    }
  }, 50);
}

function compileWavFileBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // raw 16-bit signed PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferLength = result.length * 2;
  const arrayArr = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(arrayArr);
  
  // Write WAV RIFF Chunk
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + bufferLength, true);
  writeString(view, 8, "WAVE");
  
  // Write Format Chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  
  // Write Data Chunk
  writeString(view, 36, "data");
  view.setUint32(40, bufferLength, true);
  
  // Write Float32 samples converted to 16-bit signed PCM
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([view], { type: "audio/wav" });
}

function interleave(lChan, rChan) {
  const length = lChan.length + rChan.length;
  const interleaved = new Float32Array(length);
  
  let index = 0, inputIndex = 0;
  while (index < length) {
    interleaved[index++] = lChan[inputIndex];
    interleaved[index++] = rChan[inputIndex];
    inputIndex++;
  }
  return interleaved;
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// --- Synced Stems DSP separation engine ---
function executeStemsSeparation() {
  if (!state.decodedAudioBuffer) return;

  stopPlaybackAllNodes();
  elProcessingOverlay.style.display = "flex";
  document.querySelector("#processing-overlay h3").textContent = "Extracting stems locally...";
  document.querySelector("#processing-overlay p").textContent = "Decoding multi-channel floats and canceling phase vectors...";

  setTimeout(() => {
    try {
      const srcBuf = state.decodedAudioBuffer;
      const length = srcBuf.length;
      const rate = srcBuf.sampleRate;

      // Allocate fresh float audio buffers
      state.vocalBuffer = state.audioContext.createBuffer(2, length, rate);
      state.instrumentalBuffer = state.audioContext.createBuffer(2, length, rate);

      const leftSrc = srcBuf.getChannelData(0);
      const rightSrc = srcBuf.getChannelData(1);

      const leftVoc = state.vocalBuffer.getChannelData(0);
      const rightVoc = state.vocalBuffer.getChannelData(1);

      const leftInst = state.instrumentalBuffer.getChannelData(0);
      const rightInst = state.instrumentalBuffer.getChannelData(1);

      // --- 1. INSTRUMENTAL STEM: Out of Phase Stereo (L - R) Phase cancellation ---
      const panFactor = state.centerPan;
      for (let i = 0; i < length; i++) {
        // centered signals (vocals) subtract completely
        leftInst[i] = leftSrc[i] - rightSrc[i] * panFactor;
        rightInst[i] = rightSrc[i] - leftSrc[i] * panFactor;
      }

      // --- 2. VOCAL STEM: Center Mid-Side Sum + Human Vocal Bandpass Filtering ---
      // We calculate Mid = (L + R) / 2 to focus centered vocals.
      // We then convolve an RC Low-Pass and RC High-Pass filter centered around vocal bands:
      // High Pass Cutoff: focus on keeping vocal range (> 220Hz), cuts out bass/kicks.
      // Low Pass Cutoff: focus on keeping vocal core (< 3800Hz), cuts out cymbal sizzles.
      // Adjust cutoffs slightly based on sharpness slider!
      let hpCut = 200;
      let lpCut = 4400;
      
      if (state.vocalSharpness === 1) { hpCut = 120; lpCut = 7000; } // Lo-Fi Wide
      else if (state.vocalSharpness === 2) { hpCut = 160; lpCut = 5200; }
      else if (state.vocalSharpness === 4) { hpCut = 240; lpCut = 3800; }
      else if (state.vocalSharpness === 5) { hpCut = 300; lpCut = 3200; } // Surgical

      const dt = 1 / rate;
      
      // HP RC filter coefficient: alpha = tau / (tau + dt)
      const tauHp = 1 / (2 * Math.PI * hpCut);
      const alphaHp = tauHp / (tauHp + dt);
      
      // LP RC filter coefficient: alpha = dt / (tau + dt)
      const tauLp = 1 / (2 * Math.PI * lpCut);
      const alphaLp = dt / (tauLp + dt);

      let hp_prev_in = 0, hp_prev_out = 0;
      let lp_prev_out = 0;

      const isBassCut = state.bassCut;

      for (let i = 0; i < length; i++) {
        // Mid sum isolating panned center
        const mid = (leftSrc[i] + rightSrc[i]) / 2;
        
        let filtered = mid;

        if (isBassCut) {
          // 1. High Pass filter convolution
          const hp_out = alphaHp * (hp_prev_out + mid - hp_prev_in);
          hp_prev_in = mid;
          hp_prev_out = hp_out;
          
          // 2. Low Pass filter convolution
          const lp_out = lp_prev_out + alphaLp * (hp_out - lp_prev_out);
          lp_prev_out = lp_out;
          
          filtered = lp_out;
        } else {
          // LP only
          const lp_out = lp_prev_out + alphaLp * (mid - lp_prev_out);
          lp_prev_out = lp_out;
          filtered = lp_out;
        }

        leftVoc[i] = filtered;
        rightVoc[i] = filtered;
      }

      // --- 3. Render glowing Scrolling DAW Waveforms ---
      drawAudioWaveformOnCanvas(state.vocalBuffer, elCanvasVoc, "rgba(168, 85, 247, 0.75)");
      drawAudioWaveformOnCanvas(state.instrumentalBuffer, elCanvasInst, "rgba(34, 211, 248, 0.75)");

      // Toggle UI console strips
      elPlaceholder.style.display = "none";
      elMultitrackGrid.style.display = "flex";
      elStudioStatusBadge.textContent = "Separated";
      elStudioStatusBadge.className = "badge green";

      // Enable players
      elBtnPlay.disabled = false;
      elBtnPause.disabled = false;
      elBtnStop.disabled = false;
      elMasterVolSlider.disabled = false;

    } catch (err) {
      console.error("DSP processing failed.", err);
      alert("Error: Audio processing failed. Please verify file is a stereo audio track.");
    } finally {
      elProcessingOverlay.style.display = "none";
    }
  }, 100);
}

function drawAudioWaveformOnCanvas(audioBuffer, canvas, color) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);

  // We analyze the left channel peaks
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.beginPath();

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    
    for (let j = 0; j < step; j++) {
      const datum = data[i * step + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    
    // Draw centered vertical peaks lines
    const yMin = (1 + min) * amp;
    const yMax = (1 + max) * amp;
    ctx.moveTo(i, yMin);
    ctx.lineTo(i, yMax);
  }
  ctx.stroke();
}

// Helpers
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
