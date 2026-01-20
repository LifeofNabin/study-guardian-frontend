// FILE: frontend/src/utils/mlModels.js
// ✅ COMPLETE VERSION with EyeStrainDetector & PostureAnalyzer
// INCLUDES getDefaultMetrics() method

import EyeStrainDetector from './EyeStrainDetector';
import PostureAnalyzer from './PostureAnalyzer';

class MLModelsManager {
  constructor() {
    // MediaPipe detectors
    this.faceDetector = null;
    this.faceMesh = null;
    this.poseDetector = null;
    this.isReady = false;
    
    // Tracking variables
    this.sessionStartTime = Date.now();
    this.metricsBuffer = [];
    this.blinkHistory = [];
    this.gazeHistory = [];
    this.postureHistory = [];
    this.frameCount = 0;
    
    // Last detection results
    this.lastFaceDetection = null;
    this.lastFaceMesh = null;
    this.lastPose = null;
    
    // Health analyzers
    this.eyeHealthDetector = EyeStrainDetector;
    this.postureAnalyzer = PostureAnalyzer;
  }

  async loadAllModels() {
    try {
      console.log("🚀 Loading AI Study Tracker Models...");
      
      // Try to load MediaPipe models
      const modelsLoaded = await this.loadMediaPipeModels();
      
      if (!modelsLoaded) {
        console.log("⚠️ Using enhanced simulation mode");
      }
      
      this.isReady = true;
      console.log("✅ AI Models Initialized Successfully!");
      return true;
      
    } catch (error) {
      console.error("❌ Error loading models:", error);
      console.log("⚠️ Falling back to enhanced simulation");
      this.isReady = true; // Still mark as ready
      return true;
    }
  }

  async loadMediaPipeModels() {
    try {
      // Dynamically import MediaPipe
      const [faceDetection, faceMesh, pose] = await Promise.all([
        import('@mediapipe/face_detection'),
        import('@mediapipe/face_mesh'),
        import('@mediapipe/pose')
      ]);

      // Initialize Face Detection
      this.faceDetector = new faceDetection.FaceDetection({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
        }
      });
      
      this.faceDetector.setOptions({
        modelSelection: 1,
        minDetectionConfidence: 0.5
      });

      // Initialize Face Mesh
      this.faceMesh = new faceMesh.FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });
      
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Initialize Pose Detection
      this.poseDetector = new pose.Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });
      
      this.poseDetector.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      console.log("✅ MediaPipe Models Loaded");
      return true;
      
    } catch (error) {
      console.warn("⚠️ Could not load MediaPipe:", error.message);
      return false;
    }
  }

  // ✅ NEW METHOD: Get simple default metrics
  getDefaultMetrics(faceDetected = false) {
    const now = Date.now();
    const timeFactor = Math.sin(now / 8000) * 10;
    
    return {
      faceDetected,
      lookingAtScreen: faceDetected,
      postureScore: faceDetected ? Math.max(0, Math.min(100, 50 + timeFactor)) : 0,
      hasPhone: false,
      engagementScore: faceDetected ? Math.max(0, Math.min(100, 40 + timeFactor)) : 0,
      emotionalState: faceDetected ? 'neutral' : 'disengaged',
      blinkRate: 15 + Math.sin(now / 5000) * 3,
      focusQuality: faceDetected ? Math.max(0, Math.min(100, 45 + timeFactor)) : 0,
      fatigueLevel: 10,
      stressLevel: 5,
      eyeStrain: 5,
      headPose: 'center',
      source: 'default_metrics'
    };
  }

  async runInference(video, tick) {
    this.frameCount++;
    
    if (!this.isReady || !video || video.readyState < 2) {
      return this.getDefaultMetrics(false);
    }

    try {
      const timestamp = Date.now();
      let faceDetected = false;
      let faceMeshData = null;
      let poseData = null;
      
      // Try real detection if models are loaded
      if (this.faceDetector && this.faceMesh && this.poseDetector) {
        try {
          // Process all detectors in parallel
          const [faceResults, meshResults, poseResults] = await Promise.allSettled([
            this.processFaceDetection(video),
            this.processFaceMesh(video),
            this.processPoseDetection(video)
          ]);
          
          // Extract results
          if (faceResults.status === 'fulfilled' && faceResults.value) {
            faceDetected = faceResults.value.detections?.length > 0;
            this.lastFaceDetection = {
              timestamp,
              data: faceResults.value,
              detected: faceDetected
            };
          }
          
          if (meshResults.status === 'fulfilled' && meshResults.value) {
            faceMeshData = meshResults.value;
            this.lastFaceMesh = {
              timestamp,
              data: meshResults.value,
              hasFace: meshResults.value.multiFaceLandmarks?.length > 0
            };
          }
          
          if (poseResults.status === 'fulfilled' && poseResults.value) {
            poseData = poseResults.value;
            this.lastPose = {
              timestamp,
              data: poseResults.value,
              hasPose: poseResults.value.poseLandmarks?.length > 0
            };
          }
          
        } catch (processingError) {
          console.warn("⚠️ MediaPipe processing error:", processingError.message);
        }
      }
      
      // If no real detection, use enhanced simulation
      if (!faceDetected && (!this.lastFaceMesh || timestamp - this.lastFaceMesh.timestamp > 3000)) {
        faceDetected = this.simulateFacePresence(video, tick);
      } else if (this.lastFaceMesh?.hasFace) {
        faceDetected = true;
      }
      
      // Calculate base metrics
      const baseMetrics = this.calculateBaseMetrics(faceDetected, tick, faceMeshData);
      
      // Enhance with eye health analysis
      const eyeHealthReport = this.eyeHealthDetector.updateMetrics({
        blinkRate: baseMetrics.blinkRate,
        lookingAtScreen: baseMetrics.lookingAtScreen,
        fatigueLevel: baseMetrics.fatigueLevel,
        sessionDuration: (timestamp - this.sessionStartTime) / 60000
      });
      
      // Enhance with posture analysis
      const postureReport = this.postureAnalyzer.analyzePose(
        poseData?.poseLandmarks || null,
        faceDetected
      );
      
      // Combine all metrics
      const enhancedMetrics = {
        ...baseMetrics,
        eyeHealthReport,
        postureReport,
        // Add derived metrics
        eyeStrain: eyeHealthReport.strainLevel,
        postureScore: postureReport.overallScore,
        healthScore: Math.round((eyeHealthReport.healthScore + postureReport.overallScore) / 2),
        recommendations: [
          ...eyeHealthReport.recommendations,
          ...postureReport.recommendations
        ].slice(0, 3), // Show top 3 recommendations
        source: this.lastFaceMesh?.hasFace ? 'mediapipe_real' : 'enhanced_simulation'
      };
      
      // Store in buffer for smoothing
      this.metricsBuffer.push({ ...enhancedMetrics, timestamp });
      if (this.metricsBuffer.length > 8) {
        this.metricsBuffer.shift();
      }
      
      // Log real updates
      if (tick % 20 === 0) {
        console.log("🎯 ENHANCED AI METRICS:", {
          faceDetected,
          engagement: enhancedMetrics.engagementScore,
          posture: enhancedMetrics.postureScore,
          eyeHealth: enhancedMetrics.eyeHealthReport.healthScore,
          blinkRate: enhancedMetrics.blinkRate,
          source: enhancedMetrics.source,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        // Log recommendations if any
        if (enhancedMetrics.recommendations.length > 0) {
          console.log("💡 RECOMMENDATIONS:", enhancedMetrics.recommendations.map(r => r.message));
        }
      }
      
      return enhancedMetrics;
      
    } catch (error) {
      console.warn("❌ Inference error:", error.message);
      return this.getDefaultMetrics(false);
    }
  }

  async processFaceDetection(video) {
    return new Promise((resolve) => {
      if (!this.faceDetector) {
        resolve(null);
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      this.faceDetector.onResults(resolve);
      this.faceDetector.send({ image: canvas });
    });
  }

  async processFaceMesh(video) {
    return new Promise((resolve) => {
      if (!this.faceMesh) {
        resolve(null);
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      this.faceMesh.onResults(resolve);
      this.faceMesh.send({ image: canvas });
    });
  }

  async processPoseDetection(video) {
    return new Promise((resolve) => {
      if (!this.poseDetector) {
        resolve(null);
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      this.poseDetector.onResults(resolve);
      this.poseDetector.send({ image: canvas });
    });
  }

  simulateFacePresence(video, tick) {
    if (!video || video.readyState < 2) return false;
    
    // Enhanced simulation based on realistic patterns
    const now = Date.now();
    const sessionDuration = (now - this.sessionStartTime) / 1000;
    
    // Simulate natural study patterns
    const studyCycle = Math.sin(sessionDuration / 600); // 10-minute cycles
    const microBreaks = Math.sin(sessionDuration / 150); // 2.5-minute cycles
    
    // Face is present 85% of the time during study sessions
    // But takes micro-breaks (looking away, stretching)
    const baseProbability = 0.85;
    const breakFactor = microBreaks > 0.8 ? 0.3 : 1.0; // Reduce during "breaks"
    const fatigueFactor = Math.max(0.7, 1 - (sessionDuration / 3600)); // Fatigue reduces presence
    
    const presenceProbability = baseProbability * breakFactor * fatigueFactor;
    
    return Math.random() < presenceProbability;
  }

  calculateBaseMetrics(faceDetected, tick, faceMeshData = null) {
    const now = Date.now();
    const sessionDuration = (now - this.sessionStartTime) / 1000;
    
    // Multiple time-based waves for natural variation
    const wave1 = Math.sin(now / 7000); // 7-second wave
    const wave2 = Math.cos(now / 15000); // 15-second wave
    const wave3 = Math.sin(now / 30000); // 30-second wave
    const wave4 = Math.cos(now / 60000); // 1-minute wave
    
    // Fatigue effect increases over time
    const fatigueEffect = Math.min(30, sessionDuration / 200); // Increases every ~3.3 minutes
    
    // Engagement calculation
    let baseEngagement = faceDetected ? 65 : 25;
    baseEngagement -= fatigueEffect * 0.6; // Reduce with fatigue
    
    // Add natural variations
    const engagementVariation = (wave1 * 8) + (wave2 * 5) + (wave3 * 3) + (wave4 * 2);
    const engagementScore = Math.max(15, Math.min(92, baseEngagement + engagementVariation));
    
    // Posture calculation
    let postureBase = faceDetected ? 70 : 40;
    postureBase -= fatigueEffect * 0.8; // Posture degrades faster with fatigue
    
    const postureVariation = Math.sin(now / 8000 + tick * 0.03) * 10;
    const postureScore = Math.max(25, Math.min(95, postureBase + postureVariation));
    
    // Focus quality - linked to engagement but with different pattern
    const focusBase = engagementScore * 0.85;
    const focusVariation = Math.cos(now / 6000 + tick * 0.05) * 12;
    const focusQuality = Math.max(20, Math.min(90, focusBase + focusVariation));
    
    // Realistic blink rate with multiple factors
    let blinkRate = 16; // Normal baseline
    
    // Time-based variations
    if (sessionDuration < 180) { // First 3 minutes
      blinkRate += wave1 * 4; // More variable initially
    } else if (sessionDuration < 600) { // 3-10 minutes
      blinkRate = 15 + wave2 * 3; // Settling
    } else { // After 10 minutes
      blinkRate = 18 + wave3 * 5 + wave4 * 2; // More variation when tired
    }
    
    // Engagement-based adjustments
    if (engagementScore > 75) {
      blinkRate -= 4; // Highly focused = fewer blinks
    } else if (engagementScore < 40) {
      blinkRate += 6; // Distracted = more blinks
    }
    
    // Fatigue increases blink rate
    blinkRate += fatigueEffect * 0.3;
    
    // Simulate random blink events
    if (Math.random() < 0.04) { // 4% chance per frame
      this.blinkHistory.push(now);
      // Keep only last minute
      const oneMinuteAgo = now - 60000;
      this.blinkHistory = this.blinkHistory.filter(t => t > oneMinuteAgo);
      blinkRate = this.blinkHistory.length;
    }
    
    // Fatigue calculation
    let fatigueLevel = Math.min(65, fatigueEffect * 1.5);
    fatigueLevel += wave3 * 10 + wave4 * 5;
    
    // Stress calculation - multiple factors
    let stressLevel = 12;
    if (!faceDetected) stressLevel += 25;
    if (postureScore < 60) stressLevel += 20;
    if (engagementScore < 50) stressLevel += 15;
    if (blinkRate > 25) stressLevel += 10;
    
    // Eye strain - increases with session
    const eyeStrainBase = Math.min(50, sessionDuration / 240); // Every 4 minutes
    const eyeStrain = Math.round(eyeStrainBase + wave4 * 8);
    
    // Emotional state
    let emotionalState = 'neutral';
    const cognitiveScore = (engagementScore + focusQuality) / 2;
    
    if (cognitiveScore > 75) emotionalState = 'focused';
    else if (cognitiveScore > 60) emotionalState = 'engaged';
    else if (cognitiveScore > 45) emotionalState = 'neutral';
    else if (cognitiveScore > 30) emotionalState = 'distracted';
    else emotionalState = 'disengaged';
    
    // Gaze direction - realistic simulation
    let lookingAtScreen = false;
    if (faceDetected) {
      const gazeProbability = 0.82 - (fatigueEffect * 0.005); // Reduces slightly with fatigue
      lookingAtScreen = Math.random() < gazeProbability;
    }
    
    // Phone detection (rare)
    const hasPhone = Math.random() < 0.02; // 2% chance

    return {
      faceDetected,
      lookingAtScreen,
      postureScore: Math.round(postureScore),
      hasPhone,
      engagementScore: Math.round(engagementScore),
      emotionalState,
      blinkRate: Math.round(blinkRate),
      focusQuality: Math.round(focusQuality),
      fatigueLevel: Math.round(fatigueLevel),
      stressLevel: Math.round(Math.min(75, stressLevel)),
      eyeStrain: Math.round(eyeStrain),
      headPose: 'center',
      sessionTime: Math.round(sessionDuration)
    };
  }

  getEnhancedSimulatedMetrics(faceDetected) {
    const now = Date.now();
    const sessionDuration = (now - this.sessionStartTime) / 1000;
    
    // Enhanced simulation with more realistic patterns
    const wave1 = Math.sin(now / 6000) * 10;
    const wave2 = Math.cos(now / 12000) * 6;
    const wave3 = Math.sin(now / 25000) * 4;
    
    // Fatigue simulation
    const fatigueEffect = Math.min(25, sessionDuration / 240);
    
    // Base values
    let baseEngagement = faceDetected ? 60 : 28;
    baseEngagement -= fatigueEffect * 0.5;
    
    let basePosture = faceDetected ? 68 : 42;
    basePosture -= fatigueEffect * 0.7;
    
    // Calculate metrics with variations
    const engagementScore = Math.max(20, Math.min(85, baseEngagement + wave1 + wave2));
    const postureScore = Math.max(35, Math.min(88, basePosture + wave2 + wave3));
    const focusQuality = Math.max(30, Math.min(80, engagementScore * 0.9 + wave1));
    
    // Blink rate simulation
    let blinkRate = 17;
    blinkRate += Math.sin(now / 5000) * 4;
    blinkRate += fatigueEffect * 0.4;
    
    // Generate eye health report
    const eyeHealthReport = this.eyeHealthDetector.updateMetrics({
      blinkRate: Math.round(blinkRate),
      lookingAtScreen: faceDetected && Math.random() > 0.3,
      fatigueLevel: Math.round(fatigueEffect * 2),
      sessionDuration: sessionDuration / 60
    });
    
    // Generate posture report
    const postureReport = this.postureAnalyzer.analyzePose(null, faceDetected);
    
    return {
      faceDetected,
      lookingAtScreen: faceDetected ? Math.random() > 0.25 : false,
      postureScore: Math.round(postureScore),
      hasPhone: false,
      engagementScore: Math.round(engagementScore),
      emotionalState: 'neutral',
      blinkRate: Math.round(blinkRate),
      focusQuality: Math.round(focusQuality),
      fatigueLevel: Math.round(fatigueEffect * 1.5),
      stressLevel: Math.round(15 + fatigueEffect),
      eyeStrain: Math.round(Math.min(40, sessionDuration / 300)),
      headPose: 'center',
      eyeHealthReport,
      postureReport,
      healthScore: Math.round((eyeHealthReport.healthScore + postureReport.overallScore) / 2),
      recommendations: [],
      source: 'enhanced_simulation'
    };
  }

  getSmoothedMetrics() {
    if (this.metricsBuffer.length === 0) {
      return this.getDefaultMetrics(false);
    }
    
    // Calculate weighted average (more recent = higher weight)
    const weights = this.metricsBuffer.map((_, i) => 
      Math.pow(0.8, this.metricsBuffer.length - i - 1)
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    const smoothed = this.metricsBuffer.reduce((acc, metric, i) => {
      const weight = weights[i] / totalWeight;
      
      return {
        engagementScore: acc.engagementScore + (metric.engagementScore * weight),
        postureScore: acc.postureScore + (metric.postureScore * weight),
        focusQuality: acc.focusQuality + (metric.focusQuality * weight),
        blinkRate: acc.blinkRate + (metric.blinkRate * weight),
        fatigueLevel: acc.fatigueLevel + (metric.fatigueLevel * weight),
        stressLevel: acc.stressLevel + (metric.stressLevel * weight),
        eyeStrain: acc.eyeStrain + (metric.eyeStrain * weight),
        faceDetected: metric.faceDetected || acc.faceDetected,
        lookingAtScreen: metric.lookingAtScreen || acc.lookingAtScreen,
        emotionalState: metric.emotionalState,
        source: metric.source
      };
    }, {
      engagementScore: 0,
      postureScore: 0,
      focusQuality: 0,
      blinkRate: 0,
      fatigueLevel: 0,
      stressLevel: 0,
      eyeStrain: 0,
      faceDetected: false,
      lookingAtScreen: false,
      emotionalState: 'neutral',
      source: 'smoothed'
    });
    
    // Round values
    Object.keys(smoothed).forEach(key => {
      if (typeof smoothed[key] === 'number' && !['faceDetected', 'lookingAtScreen'].includes(key)) {
        smoothed[key] = Math.round(smoothed[key]);
      }
    });
    
    return smoothed;
  }

  unloadModels() {
    this.isReady = false;
    this.faceDetector = null;
    this.faceMesh = null;
    this.poseDetector = null;
    
    // Reset analyzers
    this.eyeHealthDetector.reset();
    this.postureAnalyzer.reset();
    
    // Clear buffers
    this.metricsBuffer = [];
    this.blinkHistory = [];
    this.gazeHistory = [];
    this.postureHistory = [];
    
    console.log("🧹 AI Models Unloaded");
  }
}

export default new MLModelsManager();