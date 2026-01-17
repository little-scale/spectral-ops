# FFT Operations Processor

A web-based audio processing tool that applies FFT-based operations to create hybrid sounds from two audio files.

## Features

- **Dual Audio Input**: Load two audio files via drag-and-drop or file selection
- **FFT Operations**: Apply spectral operations (AND, OR, XOR, multiply, etc.) to magnitude bins
- **Real-time Visualization**: View waveforms, FFT spectra, and spectrograms
- **Configurable Processing**: Adjust window size, overlap, and phase handling
- **Variable Playback**: Play results at different speeds (0.5x - 2.0x) with pitch preservation
- **WAV Export**: Download processed audio as WAV file

## Getting Started

### Running the Application

1. Open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari)
2. No server required - runs entirely in the browser

### Using the Application

#### 1. Load Audio Files
- Drag and drop audio files onto the "Audio File A" and "Audio File B" zones
- Or click the zones to select files from your computer
- Supported formats: MP3, WAV, OGG, M4A, FLAC (browser-dependent)

#### 2. Configure Processing Parameters

**FFT Operation** - Choose how to combine the spectral content:
- **AND (min)**: Extracts common spectral content between A and B
- **OR (max)**: Combines all spectral content from both files
- **XOR (diff)**: Extracts spectral differences
- **Multiply (A*B)**: Emphasizes shared frequencies (often most musical)
- **Average**: Blends spectral content equally
- **NOT A/B**: Inverts spectrum
- **A²/B²**: Enhances harmonics
- **Subtract**: Extracts A's unique content

**Phase Mode**:
- **Use Phase from A**: Uses timing/phase information from file A
- **Use Phase from B**: Uses timing/phase information from file B
- **Average Phase**: Weighted average based on magnitude contribution

**Window Size** (512-8192):
- Smaller values: Better time resolution, worse frequency resolution
- Larger values: Better frequency resolution, worse time resolution
- Default: 4096 (good balance)

**Overlap** (0-90%):
- Higher values: Smoother transitions, more processing time
- Default: 75%

**Playback Rate** (0.5x-2.0x):
- Adjusts playback speed without changing pitch
- Default: 1.0x (normal speed)

#### 3. Process Audio
- Click "PROCESS AUDIO" button
- Wait for processing to complete
- View updated visualizations

#### 4. Listen and Export
- Click "▶️ PLAY" to hear the result
- Adjust playback rate if desired
- Click "💾 EXPORT WAV" to download the processed audio

## Visualizations

### Waveform Displays
- Shows time-domain representation of audio
- Green line indicates amplitude over time

### FFT Spectrum
- Shows frequency-domain representation
- Height indicates magnitude at each frequency
- Frequency labels: 100Hz, 1kHz, 5kHz, 10kHz

### Spectrogram
- Time-frequency representation (time on X-axis, frequency on Y-axis)
- Color indicates magnitude (blue=low, red=high)
- Shows how spectral content evolves over time

## Technical Details

### Processing Pipeline

1. **STFT Analysis**: Short-Time Fourier Transform with Hann windowing
2. **Operation Application**: Selected operation applied to magnitude bins
3. **Phase Combination**: Phases combined according to selected mode
4. **Time Stretching**: Output duration averaged between input lengths
5. **IFFT Resynthesis**: Inverse FFT with overlap-add reconstruction
6. **Normalization**: Output normalized to prevent clipping

### Recommended Operations

- **AND/Multiply**: Create hybrid sounds emphasizing common elements
- **OR**: Combine all spectral content (additive)
- **XOR**: Extract differences (subtractive)
- **Subtract**: Remove one sound from another (spectral subtraction)

### Tips for Best Results

1. **Start Simple**: Try AND or Multiply operations first
2. **Similar Sources**: Works best with audio of similar length and style
3. **Phase Mode**: Start with "Use Phase from A" or "Average Phase"
4. **Window Size**: Increase for tonal/harmonic content, decrease for percussive
5. **Experiment**: Try different combinations - results can be surprising!

## Browser Compatibility

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari (may have some audio format limitations)
- ❌ Internet Explorer (not supported)

## File Structure

```
spectral-ops/
├── index.html          # Main HTML structure
├── styles.css          # Application styling
├── app.js             # Main application controller
├── audio-processor.js # FFT analysis and resynthesis engine
├── operations.js      # FFT bin operations
├── visualizer.js      # Canvas visualizations
└── README.md          # This file
```

## Troubleshooting

### Audio won't load
- Check file format is supported by your browser
- Try converting to WAV or MP3
- Check file isn't corrupted

### Processing takes too long
- Reduce window size
- Reduce overlap percentage
- Use shorter audio files

### Output is silent or distorted
- Try different operation
- Try different phase mode
- Check input files aren't silent or corrupted

### Visualizations don't show
- Refresh the page
- Check browser console for errors
- Try a different browser

## Technical Requirements

- Modern web browser with Web Audio API support
- JavaScript enabled
- Minimum 4GB RAM recommended for large files
- No internet connection required (runs offline)

## Performance Notes

- Processing time depends on:
  - Audio file length
  - Window size (larger = slower)
  - Overlap percentage (higher = slower)
- Large files (>2 minutes) may take 10-30 seconds to process
- Consider using Web Workers for improved responsiveness (future enhancement)

## Future Enhancements

- [ ] Web Worker for background processing
- [ ] Real-time preview while adjusting parameters
- [ ] Additional operations (convolution, phase vocoder)
- [ ] Frequency band selection
- [ ] Stereo processing
- [ ] Batch processing multiple file pairs

## License

MIT License - Free to use and modify

## Credits

Built with:
- Web Audio API
- HTML5 Canvas
- Vanilla JavaScript

---

**Enjoy creating hybrid sounds!**
