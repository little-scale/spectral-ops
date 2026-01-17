/**
 * Main Application Controller
 * Coordinates file loading, processing, visualization, and playback
 */

class App {
    constructor() {
        this.audioA = null;
        this.audioB = null;
        this.outputBuffer = null;
        this.currentSource = null;
        this.currentPlayingType = null; // 'A', 'B', or 'output'

        // UI Elements
        this.dropZoneA = document.getElementById('dropZoneA');
        this.dropZoneB = document.getElementById('dropZoneB');
        this.fileInputA = document.getElementById('fileInputA');
        this.fileInputB = document.getElementById('fileInputB');
        this.fileNameA = document.getElementById('fileNameA');
        this.fileNameB = document.getElementById('fileNameB');

        // Controls
        this.processBtn = document.getElementById('processBtn');
        this.playBtnA = document.getElementById('playBtnA');
        this.playBtnB = document.getElementById('playBtnB');
        this.playBtn = document.getElementById('playBtn');
        this.exportBtn = document.getElementById('exportBtn');

        this.operationSelect = document.getElementById('operation');
        this.phaseModeSelect = document.getElementById('phaseMode');
        this.timeMatchCheckbox = document.getElementById('timeMatch');
        this.windowSizeSelect = document.getElementById('windowSize');
        this.overlapSlider = document.getElementById('overlap');
        this.playbackRateSlider = document.getElementById('playbackRate');

        // Value displays
        this.overlapValue = document.getElementById('overlapValue');
        this.playbackRateValue = document.getElementById('playbackRateValue');

        // Loading overlay
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingText = document.getElementById('loadingText');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');

        this.init();
    }

    /**
     * Initialize application
     */
    init() {
        // Initialize modules
        audioProcessor.init();
        visualizer.init();

        // Set up event listeners
        this.setupFileUpload();
        this.setupControls();
        this.setupSliders();

        console.log('FFT Operations Processor initialized');
    }

    /**
     * Set up file upload handlers
     */
    setupFileUpload() {
        // File A
        this.dropZoneA.addEventListener('click', () => this.fileInputA.click());
        this.fileInputA.addEventListener('change', (e) => this.handleFileSelect(e, 'A'));

        this.dropZoneA.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZoneA.classList.add('dragover');
        });

        this.dropZoneA.addEventListener('dragleave', () => {
            this.dropZoneA.classList.remove('dragover');
        });

        this.dropZoneA.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZoneA.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileDrop(e.dataTransfer.files[0], 'A');
            }
        });

        // File B
        this.dropZoneB.addEventListener('click', () => this.fileInputB.click());
        this.fileInputB.addEventListener('change', (e) => this.handleFileSelect(e, 'B'));

        this.dropZoneB.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZoneB.classList.add('dragover');
        });

        this.dropZoneB.addEventListener('dragleave', () => {
            this.dropZoneB.classList.remove('dragover');
        });

        this.dropZoneB.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZoneB.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileDrop(e.dataTransfer.files[0], 'B');
            }
        });
    }

    /**
     * Set up control buttons
     */
    setupControls() {
        this.processBtn.addEventListener('click', () => this.processAudio());
        this.playBtnA.addEventListener('click', () => this.togglePlay('A'));
        this.playBtnB.addEventListener('click', () => this.togglePlay('B'));
        this.playBtn.addEventListener('click', () => this.togglePlay('output'));
        this.exportBtn.addEventListener('click', () => this.exportAudio());
    }

    /**
     * Set up slider value displays
     */
    setupSliders() {
        this.overlapSlider.addEventListener('input', (e) => {
            this.overlapValue.textContent = e.target.value;
        });

        this.playbackRateSlider.addEventListener('input', (e) => {
            this.playbackRateValue.textContent = parseFloat(e.target.value).toFixed(1);
        });
    }

    /**
     * Handle file selection from input
     */
    async handleFileSelect(event, type) {
        const file = event.target.files[0];
        if (file) {
            await this.loadAudioFile(file, type);
        }
    }

    /**
     * Handle file drop
     */
    async handleFileDrop(file, type) {
        if (file && file.type.startsWith('audio/')) {
            await this.loadAudioFile(file, type);
        } else {
            alert('Please drop an audio file');
        }
    }

    /**
     * Helper to yield to browser for UI updates
     */
    async yieldToUI() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    /**
     * Load audio file
     */
    async loadAudioFile(file, type) {
        try {
            this.showLoading(true);
            this.loadingText.textContent = `Loading ${file.name}...`;
            this.progressFill.style.width = '30%';
            this.progressText.textContent = '30%';

            await this.yieldToUI();

            const arrayBuffer = await file.arrayBuffer();

            this.progressFill.style.width = '60%';
            this.progressText.textContent = '60%';
            this.loadingText.textContent = 'Decoding audio...';

            await this.yieldToUI();

            const audioBuffer = await audioProcessor.loadAudioFile(arrayBuffer);
            console.log('Audio decoded:', audioBuffer.duration, 'seconds');

            this.progressFill.style.width = '80%';
            this.progressText.textContent = '80%';
            this.loadingText.textContent = 'Generating waveform...';

            await this.yieldToUI();

            if (type === 'A') {
                this.audioA = audioBuffer;
                audioProcessor.setAudioA(audioBuffer);
                this.fileNameA.textContent = file.name;
                this.dropZoneA.classList.add('active');
                this.playBtnA.disabled = false;
            } else {
                this.audioB = audioBuffer;
                audioProcessor.setAudioB(audioBuffer);
                this.fileNameB.textContent = file.name;
                this.dropZoneB.classList.add('active');
                this.playBtnB.disabled = false;
            }

            console.log('Drawing waveform...');
            const waveformStart = performance.now();
            visualizer.drawWaveform(
                type === 'A' ? 'waveformA' : 'waveformB',
                audioBuffer
            );
            console.log('Waveform done in', performance.now() - waveformStart, 'ms');

            await this.yieldToUI();

            this.progressFill.style.width = '95%';
            this.progressText.textContent = '95%';
            this.loadingText.textContent = 'Generating spectrogram...';

            await this.yieldToUI();

            console.log('Computing spectrogram...');
            const spectrogramStart = performance.now();
            // Generate spectrogram with reduced resolution for faster display
            const spectrogramFrames = audioProcessor.performSTFT(audioBuffer, 2048, 50);
            console.log('Spectrogram computed in', performance.now() - spectrogramStart, 'ms,', spectrogramFrames.length, 'frames');

            visualizer.drawSpectrogram(
                type === 'A' ? 'spectrogramA' : 'spectrogramB',
                spectrogramFrames,
                audioBuffer.sampleRate
            );
            console.log('Spectrogram drawn');

            // Enable process button if both files loaded
            if (this.audioA && this.audioB) {
                this.processBtn.disabled = false;
            }

            this.progressFill.style.width = '100%';
            this.progressText.textContent = '100%';
            this.loadingText.textContent = 'Complete!';

            setTimeout(() => this.showLoading(false), 300);
        } catch (error) {
            console.error('Error loading audio file:', error);
            alert('Error loading audio file. Please try another file.');
            this.showLoading(false);
        }
    }

    /**
     * Process audio with selected operation
     */
    async processAudio() {
        if (!this.audioA || !this.audioB) {
            alert('Please load both audio files first');
            return;
        }

        try {
            this.showLoading(true);

            const operation = this.operationSelect.value;
            const phaseMode = this.phaseModeSelect.value;
            const timeMatch = this.timeMatchCheckbox.checked;
            const windowSize = parseInt(this.windowSizeSelect.value);
            const overlap = parseInt(this.overlapSlider.value);

            // Progress callback
            const updateProgress = (percent, message) => {
                this.loadingText.textContent = message;
                this.progressFill.style.width = `${percent}%`;
                this.progressText.textContent = `${percent}%`;
            };

            // Process audio with progress updates
            this.outputBuffer = await audioProcessor.process(
                operation,
                phaseMode,
                windowSize,
                overlap,
                timeMatch,
                updateProgress
            );

            // Update visualizations
            updateProgress(90, 'Updating visualizations...');

            // Draw output waveform
            visualizer.drawWaveform('waveformOutput', this.outputBuffer);

            // Draw output spectrogram
            const frames = audioProcessor.getFrames();
            if (frames.outputFrames.length > 0) {
                visualizer.drawSpectrogram('spectrogramOutput', frames.outputFrames, this.outputBuffer.sampleRate);
            }

            // Enable playback and export
            this.playBtn.disabled = false;
            this.exportBtn.disabled = false;

            updateProgress(100, 'Complete!');
            setTimeout(() => this.showLoading(false), 500);

            console.log('Audio processing complete');
        } catch (error) {
            console.error('Error processing audio:', error);
            alert('Error processing audio: ' + error.message);
            this.showLoading(false);
        }
    }

    /**
     * Toggle play/stop for a specific audio type
     * @param {string} type - 'A', 'B', or 'output'
     */
    togglePlay(type) {
        // If currently playing this type, stop it
        if (this.currentPlayingType === type) {
            this.stopAudio();
            return;
        }

        // Stop any currently playing audio
        if (this.currentSource) {
            this.stopAudio();
        }

        // Get the buffer to play
        let buffer;
        if (type === 'A') {
            buffer = this.audioA;
        } else if (type === 'B') {
            buffer = this.audioB;
        } else {
            buffer = this.outputBuffer;
        }

        if (!buffer) {
            return;
        }

        try {
            const playbackRate = parseFloat(this.playbackRateSlider.value);

            this.currentSource = audioProcessor.audioContext.createBufferSource();
            this.currentSource.buffer = buffer;
            this.currentSource.playbackRate.value = playbackRate;
            this.currentSource.connect(audioProcessor.audioContext.destination);

            this.currentSource.onended = () => {
                this.resetPlayButtons();
                this.currentSource = null;
                this.currentPlayingType = null;
            };

            this.currentSource.start(0);
            this.currentPlayingType = type;

            // Update button states
            this.updatePlayButtons(type);

            console.log(`Playing ${type} at ${playbackRate}x speed`);
        } catch (error) {
            console.error('Error playing audio:', error);
            alert('Error playing audio: ' + error.message);
        }
    }

    /**
     * Stop audio playback
     */
    stopAudio() {
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) {
                // Already stopped
            }
            this.currentSource = null;
        }
        this.currentPlayingType = null;
        this.resetPlayButtons();
    }

    /**
     * Update play button states
     * @param {string} playingType - Which type is currently playing
     */
    updatePlayButtons(playingType) {
        if (playingType === 'A') {
            this.playBtnA.textContent = 'Stop';
            this.playBtnA.classList.remove('btn-play');
            this.playBtnA.classList.add('btn-stop');
        } else if (playingType === 'B') {
            this.playBtnB.textContent = 'Stop';
            this.playBtnB.classList.remove('btn-play');
            this.playBtnB.classList.add('btn-stop');
        } else if (playingType === 'output') {
            this.playBtn.textContent = 'Stop';
            this.playBtn.classList.remove('btn-play');
            this.playBtn.classList.add('btn-stop');
        }
    }

    /**
     * Reset all play buttons to default state
     */
    resetPlayButtons() {
        this.playBtnA.textContent = 'Play';
        this.playBtnA.classList.remove('btn-stop');
        this.playBtnA.classList.add('btn-play');

        this.playBtnB.textContent = 'Play';
        this.playBtnB.classList.remove('btn-stop');
        this.playBtnB.classList.add('btn-play');

        this.playBtn.textContent = 'Play';
        this.playBtn.classList.remove('btn-stop');
        this.playBtn.classList.add('btn-play');
    }

    /**
     * Export audio to WAV file
     */
    exportAudio() {
        if (!this.outputBuffer) {
            alert('Please process audio first');
            return;
        }

        try {
            const wavBlob = audioProcessor.exportToWAV(this.outputBuffer);
            const url = URL.createObjectURL(wavBlob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `fft-output-${Date.now()}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);

            console.log('Audio exported successfully');
        } catch (error) {
            console.error('Error exporting audio:', error);
            alert('Error exporting audio: ' + error.message);
        }
    }

    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
        if (show) {
            this.progressFill.style.width = '0%';
            this.progressText.textContent = '0%';
            this.loadingText.textContent = 'Processing audio...';
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.app = app; // Make available globally for debugging
});
