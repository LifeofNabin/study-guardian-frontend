// FILE: frontend/src/utils/EyeStrainDetector.js
// ✅ AI-Powered Eye Strain & Health Detection

class EyeStrainDetector {
  constructor() {
    this.blinkHistory = [];
    this.gazeHistory = [];
    this.sessionStartTime = Date.now();
    this.strainLevel = 0;
    this.healthScore = 100;
    this.recommendations = [];
  }

  // Update with current metrics
  updateMetrics(metrics) {
    const now = Date.now();
    const sessionDuration = (now - this.sessionStartTime) / 60000; // minutes

    // Track blink rate
    if (metrics.blinkRate !== undefined) {
      this.blinkHistory.push({
        timestamp: now,
        rate: metrics.blinkRate,
        isNormal: this.isNormalBlinkRate(metrics.blinkRate)
      });
      
      // Keep only last 5 minutes of data
      const fiveMinutesAgo = now - 300000;
      this.blinkHistory = this.blinkHistory.filter(b => b.timestamp > fiveMinutesAgo);
    }

    // Track gaze stability
    if (metrics.lookingAtScreen !== undefined) {
      this.gazeHistory.push({
        timestamp: now,
        looking: metrics.lookingAtScreen
      });
      
      // Keep recent history
      if (this.gazeHistory.length > 60) {
        this.gazeHistory.shift();
      }
    }

    // Calculate eye strain
    this.calculateStrain(sessionDuration, metrics);
    
    // Generate health recommendations
    this.generateRecommendations(sessionDuration, metrics);
    
    return this.getEyeHealthReport();
  }

  // Calculate comprehensive eye strain
  calculateStrain(sessionDuration, metrics) {
    let strain = 0;

    // 1. Blink Rate Analysis (40% weight)
    const blinkStrain = this.analyzeBlinkPattern(metrics.blinkRate);
    strain += blinkStrain * 0.4;

    // 2. Screen Time Analysis (30% weight)
    const timeStrain = this.analyzeScreenTime(sessionDuration);
    strain += timeStrain * 0.3;

    // 3. Gaze Stability Analysis (20% weight)
    const gazeStrain = this.analyzeGazeStability();
    strain += gazeStrain * 0.2;

    // 4. Ambient Conditions (10% weight - simulated)
    const ambientStrain = this.analyzeAmbientConditions();
    strain += ambientStrain * 0.1;

    // 5. Fatigue Impact
    if (metrics.fatigueLevel > 30) {
      strain += metrics.fatigueLevel * 0.2;
    }

    this.strainLevel = Math.min(100, Math.round(strain));
    this.healthScore = Math.max(0, 100 - this.strainLevel);
  }

  analyzeBlinkPattern(blinkRate) {
    if (!blinkRate) return 0;
    
    let strain = 0;
    
    // Ideal blink rate: 12-20 blinks/minute
    if (blinkRate < 8) { // Very low - severe dry eyes risk
      strain = 50 + (8 - blinkRate) * 5;
    } else if (blinkRate < 12) { // Low - dry eyes
      strain = 30 + (12 - blinkRate) * 4;
    } else if (blinkRate > 25) { // High - eye fatigue
      strain = 20 + (blinkRate - 25) * 2;
    } else if (blinkRate > 30) { // Very high - excessive blinking
      strain = 40 + (blinkRate - 30) * 3;
    }
    
    // Check for irregular patterns
    if (this.blinkHistory.length > 10) {
      const recentBlinks = this.blinkHistory.slice(-10);
      const rates = recentBlinks.map(b => b.rate);
      const variance = this.calculateVariance(rates);
      
      if (variance > 5) { // Irregular blinking pattern
        strain += 15;
      }
    }
    
    return Math.min(70, strain);
  }

  analyzeScreenTime(sessionDuration) {
    let strain = 0;
    
    // Progressive strain based on continuous screen time
    if (sessionDuration > 20) strain = 10;
    if (sessionDuration > 40) strain = 25;
    if (sessionDuration > 60) strain = 45;
    if (sessionDuration > 90) strain = 60;
    if (sessionDuration > 120) strain = 75;
    
    return strain;
  }

  analyzeGazeStability() {
    if (this.gazeHistory.length < 10) return 0;
    
    const recentGaze = this.gazeHistory.slice(-20);
    const lookingPercentage = recentGaze.filter(g => g.looking).length / recentGaze.length;
    
    // High gaze stability = low strain
    if (lookingPercentage > 0.8) return 5;
    if (lookingPercentage > 0.6) return 15;
    if (lookingPercentage > 0.4) return 30;
    return 50; // Poor gaze stability
  }

  analyzeAmbientConditions() {
    // Simulated ambient conditions
    // In real app, you'd integrate with light sensors
    const hour = new Date().getHours();
    let strain = 0;
    
    // Evening/night study increases strain
    if (hour >= 18 || hour <= 6) {
      strain += 20;
    }
    
    // Assume moderate lighting (you can adjust based on actual conditions)
    strain += 10; // Base ambient strain
    
    return strain;
  }

  generateRecommendations(sessionDuration, metrics) {
    this.recommendations = [];
    
    // Screen time recommendations
    if (sessionDuration > 20 && sessionDuration <= 25) {
      this.recommendations.push({
        type: 'break',
        priority: 'medium',
        message: 'Consider taking a 20-second break to look at something 20 feet away',
        action: '20-20-20 rule'
      });
    }
    
    if (sessionDuration > 50) {
      this.recommendations.push({
        type: 'break',
        priority: 'high',
        message: 'Time for a 5-10 minute break to reduce eye strain',
        action: 'Take a short walk'
      });
    }
    
    // Blink rate recommendations
    if (metrics.blinkRate < 10) {
      this.recommendations.push({
        type: 'health',
        priority: 'high',
        message: 'You\'re blinking less than normal. Try to blink consciously.',
        action: 'Blink exercises'
      });
    }
    
    if (metrics.blinkRate > 28) {
      this.recommendations.push({
        type: 'health',
        priority: 'medium',
        message: 'Excessive blinking detected. Your eyes might be tired.',
        action: 'Rest eyes for 2 minutes'
      });
    }
    
    // High strain recommendations
    if (this.strainLevel > 60) {
      this.recommendations.push({
        type: 'urgent',
        priority: 'critical',
        message: 'High eye strain detected. Consider ending your session soon.',
        action: 'Stop screen work for 15+ minutes'
      });
    }
    
    // Fatigue-based recommendations
    if (metrics.fatigueLevel > 40) {
      this.recommendations.push({
        type: 'health',
        priority: 'high',
        message: 'High fatigue level detected. Eye muscles need rest.',
        action: 'Close eyes for 30 seconds'
      });
    }
  }

  getEyeHealthReport() {
    const blinkHistoryLength = this.blinkHistory.length;
    const normalBlinks = this.blinkHistory.filter(b => b.isNormal).length;
    const blinkHealth = blinkHistoryLength > 0 ? (normalBlinks / blinkHistoryLength) * 100 : 100;
    
    const gazeStability = this.gazeHistory.length > 0 ?
      (this.gazeHistory.filter(g => g.looking).length / this.gazeHistory.length) * 100 : 100;
    
    return {
      strainLevel: this.strainLevel,
      healthScore: this.healthScore,
      blinkHealth: Math.round(blinkHealth),
      gazeStability: Math.round(gazeStability),
      recommendations: this.recommendations,
      riskLevel: this.getRiskLevel(),
      nextBreakTime: this.calculateNextBreakTime()
    };
  }

  getRiskLevel() {
    if (this.strainLevel > 70) return 'high';
    if (this.strainLevel > 40) return 'medium';
    if (this.strainLevel > 20) return 'low';
    return 'minimal';
  }

  calculateNextBreakTime() {
    const sessionDuration = (Date.now() - this.sessionStartTime) / 60000;
    
    if (sessionDuration < 20) return 20 - Math.floor(sessionDuration);
    if (sessionDuration < 50) return 50 - Math.floor(sessionDuration);
    return 0; // Already past recommended breaks
  }

  isNormalBlinkRate(rate) {
    return rate >= 12 && rate <= 20;
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  reset() {
    this.blinkHistory = [];
    this.gazeHistory = [];
    this.sessionStartTime = Date.now();
    this.strainLevel = 0;
    this.healthScore = 100;
    this.recommendations = [];
  }
}

export default new EyeStrainDetector();