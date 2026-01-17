/**
 * Audio Processor Module
 * Handles FFT analysis, operations, and resynthesis
 */

class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.audioBufferA = null;
        this.audioBufferB = null;
        this.outputBuffer = null;
        this.framesA = [];
        this.framesB = [];
        this.outputFrames = [];
    }

    /**
     * Initialize audio context
     */
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * Load and decode audio file
     * @param {ArrayBuffer} arrayBuffer - Audio file data
     * @returns {Promise<AudioBuffer>}
     */
    async loadAudioFile(arrayBuffer) {
        this.init();

        // Resume context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            console.log('Resuming suspended AudioContext...');
            await this.audioContext.resume();
        }

        console.log('Starting audio decode, buffer size:', arrayBuffer.byteLength);
        const result = await this.audioContext.decodeAudioData(arrayBuffer);
        console.log('Audio decode complete');
        return result;
    }

    /**
     * Set audio buffer A
     */
    setAudioA(buffer) {
        this.audioBufferA = buffer;
    }

    /**
     * Set audio buffer B
     */
    setAudioB(buffer) {
        this.audioBufferB = buffer;
    }

    /**
     * Get Hann window
     * @param {number} size - Window size
     * @returns {Float32Array}
     */
    getHannWindow(size) {
        const window = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / size));
        }
        return window;
    }

    /**
     * Cooley-Tukey FFT (radix-2, decimation-in-time)
     * Much faster than DFT: O(n log n) vs O(n²)
     * @param {Float32Array} real - Real part (input signal)
     * @param {Float32Array} imag - Imaginary part (initialized to 0)
     */
    fft(real, imag) {
        const n = real.length;
        if (n <= 1) return;

        // Bit-reversal permutation
        let j = 0;
        for (let i = 0; i < n; i++) {
            if (i < j) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }
            let k = n >> 1;
            while (k > 0 && k <= j) {  // Added k > 0 to prevent infinite loop!
                j -= k;
                k >>= 1;
            }
            j += k;
        }

        // FFT computation
        for (let len = 2; len <= n; len <<= 1) {
            const angle = -2 * Math.PI / len;
            const wlenReal = Math.cos(angle);
            const wlenImag = Math.sin(angle);

            for (let i = 0; i < n; i += len) {
                let wReal = 1;
                let wImag = 0;

                for (let j = 0; j < len / 2; j++) {
                    const u = i + j;
                    const v = u + len / 2;

                    const tReal = real[v] * wReal - imag[v] * wImag;
                    const tImag = real[v] * wImag + imag[v] * wReal;

                    real[v] = real[u] - tReal;
                    imag[v] = imag[u] - tImag;
                    real[u] += tReal;
                    imag[u] += tImag;

                    const tempReal = wReal * wlenReal - wImag * wlenImag;
                    wImag = wReal * wlenImag + wImag * wlenReal;
                    wReal = tempReal;
                }
            }
        }
    }

    /**
     * Inverse FFT
     * @param {Float32Array} real - Real part
     * @param {Float32Array} imag - Imaginary part
     */
    ifft(real, imag) {
        const n = real.length;

        // Conjugate
        for (let i = 0; i < n; i++) {
            imag[i] = -imag[i];
        }

        // Forward FFT
        this.fft(real, imag);

        // Conjugate and scale
        for (let i = 0; i < n; i++) {
            real[i] /= n;
            imag[i] = -imag[i] / n;
        }
    }

    /**
     * Perform FFT on signal and return magnitude/phase
     * @param {Float32Array} signal - Time domain signal
     * @returns {Object} {magnitude, phase}
     */
    performFFT(signal) {
        const size = signal.length;
        const real = new Float32Array(signal);
        const imag = new Float32Array(size);

        this.fft(real, imag);

        // Calculate magnitude and phase (only need first half)
        const halfSize = size / 2;
        const magnitude = new Float32Array(halfSize);
        const phase = new Float32Array(halfSize);

        for (let i = 0; i < halfSize; i++) {
            magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
            phase[i] = Math.atan2(imag[i], real[i]);
        }

        return { magnitude, phase, real, imag };
    }

    /**
     * Perform Inverse FFT
     * @param {Float32Array} magnitude - Magnitude spectrum
     * @param {Float32Array} phase - Phase spectrum
     * @returns {Float32Array} Time domain signal
     */
    performIFFT(magnitude, phase) {
        const size = magnitude.length * 2;
        const real = new Float32Array(size);
        const imag = new Float32Array(size);

        // Reconstruct complex spectrum from magnitude and phase
        for (let i = 0; i < magnitude.length; i++) {
            real[i] = magnitude[i] * Math.cos(phase[i]);
            imag[i] = magnitude[i] * Math.sin(phase[i]);
        }

        // Mirror for negative frequencies (hermitian symmetry for real signals)
        // Note: we don't re-mirror bin 0 (DC) or set bin N/2 (Nyquist) specially
        for (let i = 1; i < magnitude.length; i++) {
            real[size - i] = real[i];
            imag[size - i] = -imag[i];
        }

        // Perform inverse FFT
        this.ifft(real, imag);

        // The IFFT result needs to be scaled up because we're using
        // single-sided spectrum reconstruction
        for (let i = 0; i < size; i++) {
            real[i] *= 2;
        }

        return real;
    }

    /**
     * Get a single FFT frame from buffer (for quick visualization)
     * @param {AudioBuffer} buffer - Audio buffer
     * @param {number} windowSize - FFT window size
     * @param {number} position - Position in buffer (0-1, default 0.5 for middle)
     * @returns {Object} {magnitude, phase}
     */
    getSingleFFT(buffer, windowSize = 4096, position = 0.5) {
        const channelData = buffer.getChannelData(0);
        const startIndex = Math.floor((channelData.length - windowSize) * position);
        const window = this.getHannWindow(windowSize);

        // Extract and window the frame
        const frame = new Float32Array(windowSize);
        for (let i = 0; i < windowSize; i++) {
            const index = Math.min(startIndex + i, channelData.length - 1);
            frame[i] = channelData[index] * window[i];
        }

        return this.performFFT(frame);
    }

    /**
     * Perform STFT on audio buffer
     * @param {AudioBuffer} buffer - Audio buffer
     * @param {number} windowSize - FFT window size
     * @param {number} overlapPercent - Overlap percentage
     * @returns {Array} Array of {magnitude, phase} frames
     */
    performSTFT(buffer, windowSize, overlapPercent) {
        const channelData = buffer.getChannelData(0); // Use first channel
        const hopSize = Math.floor(windowSize * (1 - overlapPercent / 100));
        const window = this.getHannWindow(windowSize);
        const frames = [];

        for (let i = 0; i + windowSize <= channelData.length; i += hopSize) {
            // Extract and window the frame
            const frame = new Float32Array(windowSize);
            for (let j = 0; j < windowSize; j++) {
                frame[j] = channelData[i + j] * window[j];
            }

            // Perform FFT
            const fftResult = this.performFFT(frame);
            frames.push(fftResult);
        }

        return frames;
    }

    /**
     * Combine phases from two sources
     * @param {Float32Array} phaseA - Phase from A
     * @param {Float32Array} phaseB - Phase from B
     * @param {Float32Array} magA - Magnitude from A (for weighted average)
     * @param {Float32Array} magB - Magnitude from B (for weighted average)
     * @param {string} mode - Phase mode ('a', 'b', or 'average')
     * @returns {Float32Array}
     */
    combinePhases(phaseA, phaseB, magA, magB, mode) {
        const result = new Float32Array(phaseA.length);

        switch (mode) {
            case 'a':
                return phaseA;
            case 'b':
                return phaseB;
            case 'average':
                for (let i = 0; i < phaseA.length; i++) {
                    const totalMag = magA[i] + magB[i];
                    if (totalMag > 0) {
                        const weightA = magA[i] / totalMag;
                        const weightB = magB[i] / totalMag;
                        result[i] = phaseA[i] * weightA + phaseB[i] * weightB;
                    } else {
                        result[i] = (phaseA[i] + phaseB[i]) / 2;
                    }
                }
                return result;
            default:
                return phaseA;
        }
    }

    /**
     * Process audio with FFT operations
     * @param {string} operation - Operation name
     * @param {string} phaseMode - Phase mode
     * @param {number} windowSize - FFT window size
     * @param {number} overlapPercent - Overlap percentage
     * @param {boolean} timeMatch - Whether to time-stretch to match lengths
     * @param {Function} progressCallback - Optional progress callback (percent)
     * @returns {Promise<AudioBuffer>}
     */
    async process(operation, phaseMode, windowSize, overlapPercent, timeMatch = true, progressCallback = null) {
        if (!this.audioBufferA || !this.audioBufferB) {
            throw new Error('Both audio files must be loaded');
        }

        // Perform STFT on both inputs
        if (progressCallback) progressCallback(10, 'Analyzing audio A...');
        this.framesA = this.performSTFT(this.audioBufferA, windowSize, overlapPercent);

        if (progressCallback) progressCallback(30, 'Analyzing audio B...');
        this.framesB = this.performSTFT(this.audioBufferB, windowSize, overlapPercent);

        // Determine target number of frames based on timeMatch setting
        let targetFrames;
        if (timeMatch) {
            // Time-stretch: use average of both lengths
            targetFrames = Math.ceil((this.framesA.length + this.framesB.length) / 2);
        } else {
            // No time-stretch: use shorter length, 1:1 frame mapping
            targetFrames = Math.min(this.framesA.length, this.framesB.length);
        }

        this.outputFrames = [];

        if (progressCallback) progressCallback(50, 'Applying FFT operations...');

        console.log(`Processing with operation: ${operation}, phaseMode: ${phaseMode}`);
        console.log(`Frames A: ${this.framesA.length}, Frames B: ${this.framesB.length}, Target: ${targetFrames}`);

        // Reset operation logging for this run
        if (FFTOperations.resetLog) FFTOperations.resetLog();

        // Process each frame
        for (let i = 0; i < targetFrames; i++) {
            let indexA, indexB;

            if (timeMatch) {
                // Interpolate frame indices for time stretching
                indexA = Math.min(Math.floor(i * this.framesA.length / targetFrames), this.framesA.length - 1);
                indexB = Math.min(Math.floor(i * this.framesB.length / targetFrames), this.framesB.length - 1);
            } else {
                // Direct 1:1 mapping (no time stretching)
                indexA = i;
                indexB = i;
            }

            const frameA = this.framesA[indexA];
            const frameB = this.framesB[indexB];

            // Apply operation to magnitudes
            const processedMagnitude = FFTOperations.apply(operation, frameA.magnitude, frameB.magnitude);

            // Combine phases
            const processedPhase = this.combinePhases(
                frameA.phase,
                frameB.phase,
                frameA.magnitude,
                frameB.magnitude,
                phaseMode
            );

            this.outputFrames.push({
                magnitude: processedMagnitude,
                phase: processedPhase
            });

            // Update progress every 50 frames
            if (progressCallback && i % 50 === 0) {
                const percent = 50 + Math.floor((i / targetFrames) * 30);
                progressCallback(percent, 'Processing frames...');
            }
        }

        // Debug: Log statistics about the output to verify operation worked
        if (this.outputFrames.length > 0) {
            const midFrame = Math.floor(this.outputFrames.length / 2);
            const sampleMag = this.outputFrames[midFrame].magnitude;
            let sum = 0, max = 0;
            for (let i = 0; i < sampleMag.length; i++) {
                sum += sampleMag[i];
                if (sampleMag[i] > max) max = sampleMag[i];
            }
            console.log(`Operation ${operation}: Mid-frame stats - sum: ${sum.toFixed(2)}, max: ${max.toFixed(4)}, avg: ${(sum/sampleMag.length).toFixed(4)}`);
        }

        if (progressCallback) progressCallback(80, 'Resynthesizing audio...');

        // Resynthesize audio
        const outputBuffer = this.resynthesize(windowSize, overlapPercent);
        this.outputBuffer = outputBuffer;

        if (progressCallback) progressCallback(100, 'Complete!');

        return outputBuffer;
    }

    /**
     * Resynthesize audio from FFT frames using overlap-add
     * @param {number} windowSize - FFT window size
     * @param {number} overlapPercent - Overlap percentage
     * @returns {AudioBuffer}
     */
    resynthesize(windowSize, overlapPercent) {
        const hopSize = Math.floor(windowSize * (1 - overlapPercent / 100));
        const window = this.getHannWindow(windowSize);

        // Calculate output length
        const outputLength = (this.outputFrames.length - 1) * hopSize + windowSize;
        const outputData = new Float32Array(outputLength);
        const windowSum = new Float32Array(outputLength);

        // Overlap-add synthesis (apply synthesis window for smooth transitions)
        for (let i = 0; i < this.outputFrames.length; i++) {
            const frame = this.outputFrames[i];
            const timeSignal = this.performIFFT(frame.magnitude, frame.phase);

            const offset = i * hopSize;
            for (let j = 0; j < windowSize && offset + j < outputLength; j++) {
                // Apply synthesis window and accumulate
                outputData[offset + j] += timeSignal[j] * window[j];
                windowSum[offset + j] += window[j];
            }
        }

        // Normalize by window sum (not squared) for proper reconstruction
        for (let i = 0; i < outputLength; i++) {
            if (windowSum[i] > 0.001) {
                outputData[i] /= windowSum[i];
            }
        }

        // Normalize to prevent clipping (find max without spread operator!)
        let maxAmplitude = 0;
        for (let i = 0; i < outputLength; i++) {
            const abs = Math.abs(outputData[i]);
            if (abs > maxAmplitude) maxAmplitude = abs;
        }
        if (maxAmplitude > 0) {
            const scale = 0.95 / maxAmplitude;
            for (let i = 0; i < outputLength; i++) {
                outputData[i] *= scale;
            }
        }

        // Create output buffer
        const sampleRate = this.audioBufferA.sampleRate;
        const outputBuffer = this.audioContext.createBuffer(1, outputLength, sampleRate);
        outputBuffer.copyToChannel(outputData, 0);

        return outputBuffer;
    }

    /**
     * Get current output buffer
     */
    getOutputBuffer() {
        return this.outputBuffer;
    }

    /**
     * Get frames for visualization
     */
    getFrames() {
        return {
            framesA: this.framesA,
            framesB: this.framesB,
            outputFrames: this.outputFrames
        };
    }

    /**
     * Export buffer to WAV format
     * @param {AudioBuffer} buffer - Audio buffer to export
     * @returns {Blob}
     */
    exportToWAV(buffer) {
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const length = buffer.length * numberOfChannels * 2;

        const arrayBuffer = new ArrayBuffer(44 + length);
        const view = new DataView(arrayBuffer);

        // Write WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, 1, true); // PCM format
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true); // byte rate
        view.setUint16(32, numberOfChannels * 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample
        writeString(36, 'data');
        view.setUint32(40, length, true);

        // Write audio data
        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = buffer.getChannelData(channel)[i];
                const int16 = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
                view.setInt16(offset, int16, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
}

// Create singleton instance
const audioProcessor = new AudioProcessor();
