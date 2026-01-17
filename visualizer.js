/**
 * Visualizer Module
 * Handles canvas-based visualizations for waveforms, FFT, and spectrograms
 */

class Visualizer {
    constructor() {
        this.canvases = {};
        this.contexts = {};
    }

    /**
     * Initialize all canvases
     */
    init() {
        const canvasIds = [
            'waveformA',
            'waveformB',
            'waveformOutput',
            'spectrogramA',
            'spectrogramB',
            'spectrogramOutput'
        ];

        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                this.canvases[id] = canvas;
                this.contexts[id] = canvas.getContext('2d');
                // Set canvas resolution
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * window.devicePixelRatio;
                canvas.height = rect.height * window.devicePixelRatio;
                this.contexts[id].scale(window.devicePixelRatio, window.devicePixelRatio);
            }
        });
    }

    /**
     * Clear a canvas
     * @param {string} canvasId - Canvas identifier
     */
    clear(canvasId) {
        const ctx = this.contexts[canvasId];
        const canvas = this.canvases[canvasId];
        if (ctx && canvas) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    /**
     * Draw waveform
     * @param {string} canvasId - Canvas identifier
     * @param {AudioBuffer} buffer - Audio buffer to visualize
     */
    drawWaveform(canvasId, buffer) {
        const canvas = this.canvases[canvasId];
        const ctx = this.contexts[canvasId];
        if (!ctx || !canvas || !buffer) return;

        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;

        this.clear(canvasId);

        const channelData = buffer.getChannelData(0);
        const totalSamples = channelData.length;

        // Limit to 2000 points max for performance
        const maxPoints = Math.min(width, 2000);
        const step = Math.ceil(totalSamples / maxPoints);
        const amp = height / 2;
        const xScale = width / maxPoints;

        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        for (let i = 0; i < maxPoints; i++) {
            const start = i * step;
            const end = Math.min(start + step, totalSamples);
            let min = channelData[start] || 0;
            let max = min;

            // Sample every Nth value if step is very large
            const sampleStep = step > 1000 ? Math.ceil(step / 100) : 1;
            for (let j = start; j < end; j += sampleStep) {
                const val = channelData[j];
                if (val < min) min = val;
                if (val > max) max = val;
            }

            const x = i * xScale;
            const yMin = (1 + min) * amp;
            const yMax = (1 + max) * amp;

            if (i === 0) {
                ctx.moveTo(x, yMin);
            }
            ctx.lineTo(x, yMin);
            ctx.lineTo(x, yMax);
        }

        ctx.stroke();

        // Draw center line
        ctx.strokeStyle = '#ffffff33';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
    }

    /**
     * Draw FFT magnitude spectrum
     * @param {string} canvasId - Canvas identifier
     * @param {Float32Array} magnitude - FFT magnitude data
     * @param {number} sampleRate - Sample rate for frequency axis
     */
    drawFFT(canvasId, magnitude, sampleRate = 44100) {
        const canvas = this.canvases[canvasId];
        const ctx = this.contexts[canvasId];
        if (!ctx || !canvas || !magnitude) return;

        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;

        this.clear(canvasId);

        // Convert to dB scale - find max without spread operator
        let maxMag = 0;
        for (let i = 0; i < magnitude.length; i++) {
            if (magnitude[i] > maxMag) maxMag = magnitude[i];
        }
        const minDb = -80;
        const maxDb = 0;

        // Draw bars
        const barWidth = width / magnitude.length;
        ctx.fillStyle = '#00ff88';

        for (let i = 0; i < magnitude.length; i++) {
            const mag = magnitude[i];
            const db = mag > 0 ? 20 * Math.log10(mag / (maxMag || 1)) : minDb;
            const normalized = (db - minDb) / (maxDb - minDb);
            const barHeight = normalized * height;

            const x = i * barWidth;
            const y = height - barHeight;

            ctx.fillRect(x, y, barWidth * 0.8, barHeight);
        }

        // Draw frequency labels
        ctx.fillStyle = '#ffffff99';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';

        const freqStep = sampleRate / 2 / magnitude.length;
        const labelFreqs = [100, 1000, 5000, 10000];

        labelFreqs.forEach(freq => {
            if (freq < sampleRate / 2) {
                const bin = Math.floor(freq / freqStep);
                const x = bin * barWidth;
                const label = freq >= 1000 ? `${freq / 1000}k` : freq;
                ctx.fillText(label, x, height - 5);
            }
        });
    }

    /**
     * Get color from intensity using a heat colormap
     * @param {number} t - Intensity value 0-1
     * @returns {string} RGB color string
     */
    getHeatColor(t) {
        // Black -> Purple -> Blue -> Cyan -> Green -> Yellow -> Red -> White
        // More perceptually uniform colormap
        let r, g, b;

        if (t < 0.0) t = 0;
        if (t > 1.0) t = 1;

        if (t < 0.125) {
            // Black to dark purple
            const s = t / 0.125;
            r = Math.floor(30 * s);
            g = 0;
            b = Math.floor(60 * s);
        } else if (t < 0.25) {
            // Dark purple to blue
            const s = (t - 0.125) / 0.125;
            r = Math.floor(30 + (-30) * s);
            g = 0;
            b = Math.floor(60 + 195 * s);
        } else if (t < 0.375) {
            // Blue to cyan
            const s = (t - 0.25) / 0.125;
            r = 0;
            g = Math.floor(255 * s);
            b = 255;
        } else if (t < 0.5) {
            // Cyan to green
            const s = (t - 0.375) / 0.125;
            r = 0;
            g = 255;
            b = Math.floor(255 * (1 - s));
        } else if (t < 0.625) {
            // Green to yellow
            const s = (t - 0.5) / 0.125;
            r = Math.floor(255 * s);
            g = 255;
            b = 0;
        } else if (t < 0.75) {
            // Yellow to orange
            const s = (t - 0.625) / 0.125;
            r = 255;
            g = Math.floor(255 - 128 * s);
            b = 0;
        } else if (t < 0.875) {
            // Orange to red
            const s = (t - 0.75) / 0.125;
            r = 255;
            g = Math.floor(127 - 127 * s);
            b = 0;
        } else {
            // Red to white
            const s = (t - 0.875) / 0.125;
            r = 255;
            g = Math.floor(255 * s);
            b = Math.floor(255 * s);
        }

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Get color from intensity as RGB array (faster than string)
     * @param {number} t - Intensity value 0-1
     * @returns {number[]} [r, g, b] array
     */
    getHeatColorRGB(t) {
        let r, g, b;

        if (t < 0.0) t = 0;
        if (t > 1.0) t = 1;

        if (t < 0.125) {
            const s = t / 0.125;
            r = Math.floor(30 * s);
            g = 0;
            b = Math.floor(60 * s);
        } else if (t < 0.25) {
            const s = (t - 0.125) / 0.125;
            r = Math.floor(30 * (1 - s));
            g = 0;
            b = Math.floor(60 + 195 * s);
        } else if (t < 0.375) {
            const s = (t - 0.25) / 0.125;
            r = 0;
            g = Math.floor(255 * s);
            b = 255;
        } else if (t < 0.5) {
            const s = (t - 0.375) / 0.125;
            r = 0;
            g = 255;
            b = Math.floor(255 * (1 - s));
        } else if (t < 0.625) {
            const s = (t - 0.5) / 0.125;
            r = Math.floor(255 * s);
            g = 255;
            b = 0;
        } else if (t < 0.75) {
            const s = (t - 0.625) / 0.125;
            r = 255;
            g = Math.floor(255 - 128 * s);
            b = 0;
        } else if (t < 0.875) {
            const s = (t - 0.75) / 0.125;
            r = 255;
            g = Math.floor(127 - 127 * s);
            b = 0;
        } else {
            const s = (t - 0.875) / 0.125;
            r = 255;
            g = Math.floor(255 * s);
            b = Math.floor(255 * s);
        }

        return [r, g, b];
    }

    /**
     * Draw spectrogram
     * @param {string} canvasId - Canvas identifier
     * @param {Array} frames - Array of {magnitude, phase} frames
     * @param {number} sampleRate - Sample rate
     */
    drawSpectrogram(canvasId, frames, sampleRate = 44100) {
        const canvas = this.canvases[canvasId];
        const ctx = this.contexts[canvasId];
        if (!ctx || !canvas || !frames || frames.length === 0) return;

        // Use actual pixel dimensions for ImageData
        const pixelWidth = canvas.width;
        const pixelHeight = canvas.height;

        // Logical dimensions for label positioning
        const logicalWidth = pixelWidth / window.devicePixelRatio;
        const logicalHeight = pixelHeight / window.devicePixelRatio;

        // Clear with black
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for ImageData

        const numFrames = frames.length;
        const numBins = frames[0].magnitude.length;

        // Only display up to ~16kHz for better resolution
        const maxDisplayFreq = 16000;
        const freqPerBin = (sampleRate / 2) / numBins;
        const displayBins = Math.min(numBins, Math.ceil(maxDisplayFreq / freqPerBin));

        const frameWidth = pixelWidth / numFrames;
        const binHeight = pixelHeight / displayBins;

        // Use dB scale with dynamic range
        const minDb = -80;
        const maxDb = 0;
        const dbRange = maxDb - minDb;

        // Find global max for reference (without slow spread operator)
        let maxMag = 0;
        for (let f = 0; f < frames.length; f++) {
            const mag = frames[f].magnitude;
            for (let i = 0; i < displayBins; i++) {
                if (mag[i] > maxMag) maxMag = mag[i];
            }
        }

        // Reference level for dB calculation
        const refLevel = maxMag || 1;

        // Draw spectrogram using ImageData for better performance
        const imageData = ctx.createImageData(pixelWidth, pixelHeight);
        const data = imageData.data;

        for (let i = 0; i < numFrames; i++) {
            const frame = frames[i];
            const xStart = Math.floor(i * frameWidth);
            const xEnd = Math.floor((i + 1) * frameWidth);

            for (let j = 0; j < displayBins; j++) {
                const mag = frame.magnitude[j];

                // Convert to dB scale
                let db = minDb;
                if (mag > 0) {
                    db = 20 * Math.log10(mag / refLevel);
                    db = Math.max(minDb, Math.min(maxDb, db));
                }

                // Normalize to 0-1 range
                const normalized = (db - minDb) / dbRange;

                // Get color components directly (avoid string parsing)
                const rgb = this.getHeatColorRGB(normalized);

                // Draw from bottom (low freq) to top (high freq)
                const yStart = Math.floor(pixelHeight - (j + 1) * binHeight);
                const yEnd = Math.floor(pixelHeight - j * binHeight);

                // Fill pixels
                for (let x = xStart; x < xEnd && x < pixelWidth; x++) {
                    for (let y = yStart; y < yEnd && y < pixelHeight; y++) {
                        const idx = (y * pixelWidth + x) * 4;
                        data[idx] = rgb[0];     // R
                        data[idx + 1] = rgb[1]; // G
                        data[idx + 2] = rgb[2]; // B
                        data[idx + 3] = 255;    // A
                    }
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        ctx.restore(); // Restore the scaled transform

        // Draw frequency axis labels (using logical coordinates)
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const labelFreqs = [1000, 2000, 4000, 8000, 12000];

        labelFreqs.forEach(freq => {
            if (freq <= maxDisplayFreq) {
                const bin = freq / freqPerBin;
                const y = logicalHeight - (bin / displayBins) * logicalHeight;
                const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;

                // Draw background for readability
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(0, y - 7, 28, 14);

                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, 26, y);
            }
        });
    }

    /**
     * Clear all visualizations
     */
    clearAll() {
        Object.keys(this.canvases).forEach(id => this.clear(id));
    }

    /**
     * Draw loading placeholder
     * @param {string} canvasId - Canvas identifier
     * @param {string} message - Message to display
     */
    drawPlaceholder(canvasId, message = 'No data') {
        const canvas = this.canvases[canvasId];
        const ctx = this.contexts[canvasId];
        if (!ctx || !canvas) return;

        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;

        this.clear(canvasId);

        ctx.fillStyle = '#ffffff66';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, width / 2, height / 2);
    }

    /**
     * Update visualization for audio buffer
     * @param {string} type - 'A', 'B', or 'output'
     * @param {AudioBuffer} buffer - Audio buffer
     */
    updateAudioVisualization(type, buffer) {
        if (!buffer) return;

        const waveformId = type === 'A' ? 'waveformA' :
                          type === 'B' ? 'waveformB' : 'waveformOutput';

        this.drawWaveform(waveformId, buffer);

        // Draw FFT for a single frame from the middle of the audio (much faster!)
        const processor = audioProcessor;
        if (processor) {
            const windowSize = 4096;
            const fftResult = processor.getSingleFFT(buffer, windowSize, 0.5);

            const fftId = type === 'A' ? 'fftA' :
                         type === 'B' ? 'fftB' : 'fftOutput';
            this.drawFFT(fftId, fftResult.magnitude, buffer.sampleRate);
        }
    }
}

// Create singleton instance
const visualizer = new Visualizer();
