/**
 * Audio Analyzer Utility
 * Handles microphone access, noise detection, and audio level monitoring
 */

class AudioAnalyzer {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.bufferLength = null;
    this.stream = null;
    this.isActive = false;
    this.noiseThreshold = 50; // Default threshold (0-100)
    this.callbacks = {
      onNoiseDetected: null,
      onSilence: null,
      onLevelChange: null
    };
  }

  /**
   * Initialize audio context and get microphone access
   */
  async initialize() {
    try {
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);

      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      this.isActive = true;
      console.log('Audio analyzer initialized successfully');
      
      return { success: true };

    } catch (error) {
      console.error('Error initializing audio analyzer:', error);
      return { 
        success: false, 
        error: error.message,
        errorType: error.name
      };
    }
  }

  /**
   * Start analyzing audio
   */
  startAnalyzing() {
    if (!this.isActive) {
      console.error('Audio analyzer not initialized');
      return;
    }

    this.analyze();
  }

  /**
   * Analyze audio data
   */
  analyze() {
    if (!this.isActive) return;

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average volume
    const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.bufferLength;
    
    // Normalize to 0-100 scale
    const normalizedLevel = Math.min(100, (average / 255) * 100);

    // Trigger callbacks
    if (this.callbacks.onLevelChange) {
      this.callbacks.onLevelChange(normalizedLevel);
    }

    if (normalizedLevel > this.noiseThreshold) {
      if (this.callbacks.onNoiseDetected) {
        this.callbacks.onNoiseDetected(normalizedLevel);
      }
    } else {
      if (this.callbacks.onSilence) {
        this.callbacks.onSilence(normalizedLevel);
      }
    }

    // Continue analyzing
    requestAnimationFrame(() => this.analyze());
  }

  /**
   * Get current audio level (0-100)
   */
  getCurrentLevel() {
    if (!this.isActive || !this.analyser) return 0;

    this.analyser.getByteFrequencyData(this.dataArray);
    const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.bufferLength;
    return Math.min(100, (average / 255) * 100);
  }

  /**
   * Get frequency distribution
   */
  getFrequencyData() {
    if (!this.isActive || !this.analyser) return null;

    this.analyser.getByteFrequencyData(this.dataArray);
    return Array.from(this.dataArray);
  }

  /**
   * Get time domain data (waveform)
   */
  getWaveformData() {
    if (!this.isActive || !this.analyser) return null;

    const waveformData = new Uint8Array(this.bufferLength);
    this.analyser.getByteTimeDomainData(waveformData);
    return Array.from(waveformData);
  }

  /**
   * Detect if audio is speech or noise
   * Returns: 'speech', 'noise', or 'silence'
   */
  detectAudioType() {
    if (!this.isActive) return 'silence';

    const frequencyData = this.getFrequencyData();
    if (!frequencyData) return 'silence';

    const level = this.getCurrentLevel();

    if (level < 10) return 'silence';

    // Analyze frequency distribution
    // Speech typically has energy in 300-3400 Hz range
    const lowFreqEnergy = frequencyData.slice(0, 50).reduce((sum, val) => sum + val, 0) / 50;
    const midFreqEnergy = frequencyData.slice(50, 150).reduce((sum, val) => sum + val, 0) / 100;
    const highFreqEnergy = frequencyData.slice(150, 300).reduce((sum, val) => sum + val, 0) / 150;

    // Speech has more mid-frequency energy
    if (midFreqEnergy > lowFreqEnergy && midFreqEnergy > highFreqEnergy) {
      return 'speech';
    }

    return 'noise';
  }

  /**
   * Calculate noise statistics over a time period
   */
  getNoiseStatistics(duration = 5000) {
    return new Promise((resolve) => {
      const samples = [];
      const startTime = Date.now();
      const sampleInterval = 100; // Sample every 100ms

      const sampleAudio = () => {
        const level = this.getCurrentLevel();
        samples.push(level);

        if (Date.now() - startTime < duration) {
          setTimeout(sampleAudio, sampleInterval);
        } else {
          // Calculate statistics
          const average = samples.reduce((sum, val) => sum + val, 0) / samples.length;
          const max = Math.max(...samples);
          const min = Math.min(...samples);
          const variance = samples.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / samples.length;
          const standardDeviation = Math.sqrt(variance);

          // Determine noise quality
          let quality;
          if (average < 20) quality = 'quiet';
          else if (average < 40) quality = 'moderate';
          else if (average < 60) quality = 'noisy';
          else quality = 'very_noisy';

          resolve({
            average: Math.round(average),
            max: Math.round(max),
            min: Math.round(min),
            standardDeviation: Math.round(standardDeviation),
            quality,
            samples: samples.length,
            duration
          });
        }
      };

      sampleAudio();
    });
  }

  /**
   * Detect sudden loud noises (spikes)
   */
  detectSpike(threshold = 80, duration = 1000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let spikeDetected = false;

      const checkSpike = () => {
        const level = this.getCurrentLevel();

        if (level > threshold) {
          spikeDetected = true;
          resolve({
            detected: true,
            level,
            timestamp: Date.now()
          });
        } else if (Date.now() - startTime < duration) {
          setTimeout(checkSpike, 50);
        } else {
          resolve({
            detected: false,
            maxLevel: 0
          });
        }
      };

      checkSpike();
    });
  }

  /**
   * Set noise threshold (0-100)
   */
  setNoiseThreshold(threshold) {
    this.noiseThreshold = Math.max(0, Math.min(100, threshold));
  }

  /**
   * Register callbacks
   */
  onNoiseDetected(callback) {
    this.callbacks.onNoiseDetected = callback;
  }

  onSilence(callback) {
    this.callbacks.onSilence = callback;
  }

  onLevelChange(callback) {
    this.callbacks.onLevelChange = callback;
  }

  /**
   * Check if audio is available
   */
  static async isAudioAvailable() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Error checking audio availability:', error);
      return false;
    }
  }

  /**
   * Get available audio input devices
   */
  static async getAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          id: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId
        }));
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }

  /**
   * Switch to a different audio input device
   */
  async switchDevice(deviceId) {
    try {
      // Stop current stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }

      // Get new stream with specified device
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Reconnect to analyser
      if (this.microphone) {
        this.microphone.disconnect();
      }
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      return { success: true };

    } catch (error) {
      console.error('Error switching audio device:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get audio quality score (0-100)
   * Based on clarity, consistency, and noise level
   */
  async getAudioQualityScore(duration = 3000) {
    const stats = await this.getNoiseStatistics(duration);
    
    // Lower average noise is better
    const noiseScore = Math.max(0, 100 - stats.average);
    
    // Lower standard deviation (more consistent) is better
    const consistencyScore = Math.max(0, 100 - stats.standardDeviation);
    
    // Weighted average
    const qualityScore = (noiseScore * 0.7) + (consistencyScore * 0.3);
    
    return {
      score: Math.round(qualityScore),
      noiseLevel: stats.average,
      consistency: 100 - stats.standardDeviation,
      quality: qualityScore >= 80 ? 'excellent' :
               qualityScore >= 60 ? 'good' :
               qualityScore >= 40 ? 'fair' : 'poor'
    };
  }

  /**
   * Mute/unmute audio monitoring (doesn't stop mic access)
   */
  setMuted(muted) {
    if (!this.stream) return;
    
    this.stream.getAudioTracks().forEach(track => {
      track.enabled = !muted;
    });
  }

  /**
   * Check if currently muted
   */
  isMuted() {
    if (!this.stream) return true;
    
    const tracks = this.stream.getAudioTracks();
    return tracks.length === 0 || !tracks[0].enabled;
  }

  /**
   * Stop audio analyzer and release resources
   */
  stop() {
    this.isActive = false;

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    
    console.log('Audio analyzer stopped');
  }

  /**
   * Resume audio context (needed after user interaction)
   */
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('Audio context resumed');
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isActive: this.isActive,
      isMuted: this.isMuted(),
      contextState: this.audioContext?.state || 'closed',
      noiseThreshold: this.noiseThreshold,
      currentLevel: this.getCurrentLevel()
    };
  }
}

/**
 * Helper function to create and manage a global audio analyzer instance
 */
let globalAudioAnalyzer = null;

export const getAudioAnalyzer = async () => {
  if (!globalAudioAnalyzer) {
    globalAudioAnalyzer = new AudioAnalyzer();
    await globalAudioAnalyzer.initialize();
  }
  return globalAudioAnalyzer;
};

export const stopAudioAnalyzer = () => {
  if (globalAudioAnalyzer) {
    globalAudioAnalyzer.stop();
    globalAudioAnalyzer = null;
  }
};

/**
 * React Hook for audio analysis
 */
export const useAudioAnalyzer = () => {
  const [audioLevel, setAudioLevel] = React.useState(0);
  const [noiseDetected, setNoiseDetected] = React.useState(false);
  const [audioType, setAudioType] = React.useState('silence');
  const [analyzer, setAnalyzer] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    let analyzerInstance = null;

    const initAnalyzer = async () => {
      analyzerInstance = new AudioAnalyzer();
      const result = await analyzerInstance.initialize();
      
      if (result.success && mounted) {
        analyzerInstance.onLevelChange((level) => {
          if (mounted) setAudioLevel(level);
        });

        analyzerInstance.onNoiseDetected((level) => {
          if (mounted) setNoiseDetected(true);
        });

        analyzerInstance.onSilence(() => {
          if (mounted) setNoiseDetected(false);
        });

        analyzerInstance.startAnalyzing();
        setAnalyzer(analyzerInstance);

        // Update audio type periodically
        const typeInterval = setInterval(() => {
          if (mounted && analyzerInstance.isActive) {
            const type = analyzerInstance.detectAudioType();
            setAudioType(type);
          }
        }, 1000);

        return () => {
          clearInterval(typeInterval);
        };
      }
    };

    initAnalyzer();

    return () => {
      mounted = false;
      if (analyzerInstance) {
        analyzerInstance.stop();
      }
    };
  }, []);

  return {
    audioLevel,
    noiseDetected,
    audioType,
    analyzer,
    isActive: analyzer?.isActive || false
  };
};

/**
 * Simple noise detector for quick checks
 */
export const detectNoise = async (duration = 2000, threshold = 50) => {
  const analyzer = new AudioAnalyzer();
  await analyzer.initialize();
  
  return new Promise((resolve) => {
    let maxLevel = 0;
    const startTime = Date.now();

    analyzer.onLevelChange((level) => {
      maxLevel = Math.max(maxLevel, level);
    });

    analyzer.startAnalyzing();

    setTimeout(() => {
      analyzer.stop();
      resolve({
        noiseDetected: maxLevel > threshold,
        maxLevel,
        threshold
      });
    }, duration);
  });
};

/**
 * Record audio sample for quality testing
 */
export const testAudioQuality = async (duration = 5000) => {
  const analyzer = new AudioAnalyzer();
  const initResult = await analyzer.initialize();
  
  if (!initResult.success) {
    return {
      success: false,
      error: initResult.error
    };
  }

  analyzer.startAnalyzing();
  
  const stats = await analyzer.getNoiseStatistics(duration);
  const quality = await analyzer.getAudioQualityScore(duration);
  
  analyzer.stop();

  return {
    success: true,
    stats,
    quality
  };
};

export default AudioAnalyzer;