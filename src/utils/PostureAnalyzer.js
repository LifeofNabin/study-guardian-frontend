// FILE: frontend/src/utils/PostureAnalyzer.js
// ✅ AI-Powered Posture & Ergonomics Analysis

class PostureAnalyzer {
  constructor() {
    this.postureHistory = [];
    this.alertHistory = [];
    this.sessionStartTime = Date.now();
    this.currentPosture = 'neutral';
    this.healthScore = 100;
    this.recommendations = [];
  }

  // Analyze posture from pose landmarks
  analyzePose(poseLandmarks, faceDetected) {
    if (!poseLandmarks || poseLandmarks.length < 33 || !faceDetected) {
      return this.getSimulatedPosture();
    }

    const analysis = {
      timestamp: Date.now(),
      neckAlignment: this.analyzeNeckAlignment(poseLandmarks),
      shoulderAlignment: this.analyzeShoulderAlignment(poseLandmarks),
      backPosture: this.analyzeBackPosture(poseLandmarks),
      headTilt: this.analyzeHeadTilt(poseLandmarks),
      overallScore: 0,
      postureType: 'neutral'
    };

    // Calculate overall score
    analysis.overallScore = Math.round(
      (analysis.neckAlignment.score + 
       analysis.shoulderAlignment.score + 
       analysis.backPosture.score) / 3
    );

    // Determine posture type
    analysis.postureType = this.determinePostureType(analysis);

    // Store in history
    this.postureHistory.push(analysis);
    if (this.postureHistory.length > 50) {
      this.postureHistory.shift();
    }

    // Update health score
    this.updateHealthScore(analysis);

    // Generate recommendations if needed
    this.generatePostureRecommendations(analysis);

    return analysis;
  }

  analyzeNeckAlignment(landmarks) {
    // Key points: left ear (7), right ear (8), left shoulder (11), right shoulder (12)
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    if (!leftEar || !rightEar || !leftShoulder || !rightShoulder) {
      return { score: 70, angle: 0, status: 'unknown', issue: null };
    }

    // Calculate neck angle (forward/backward tilt)
    const earCenterY = (leftEar.y + rightEar.y) / 2;
    const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
    const neckAngle = Math.abs(earCenterY - shoulderCenterY) * 100;

    // Calculate side tilt
    const earDifference = Math.abs(leftEar.y - rightEar.y) * 100;
    const shoulderDifference = Math.abs(leftShoulder.y - rightShoulder.y) * 100;

    let score = 100;
    let issue = null;
    let status = 'good';

    // Forward head posture (text neck)
    if (earCenterY > shoulderCenterY + 0.05) {
      score -= 30;
      issue = 'forward_head';
      status = 'poor';
    }

    // Side tilt
    if (earDifference > 0.03) {
      score -= 20;
      issue = issue ? 'multiple' : 'head_tilt';
      status = 'fair';
    }

    // Shoulder imbalance
    if (shoulderDifference > 0.05) {
      score -= 25;
      issue = issue ? 'multiple' : 'shoulder_imbalance';
      status = 'fair';
    }

    return {
      score: Math.max(30, score),
      angle: Math.round(neckAngle),
      tilt: Math.round(earDifference),
      status,
      issue
    };
  }

  analyzeShoulderAlignment(landmarks) {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    if (!leftShoulder || !rightShoulder) {
      return { score: 70, difference: 0, status: 'unknown', issue: null };
    }

    const yDifference = Math.abs(leftShoulder.y - rightShoulder.y) * 100;
    const xDifference = Math.abs(leftShoulder.x - rightShoulder.x);

    let score = 100;
    let issue = null;
    let status = 'good';

    // Shoulder height difference
    if (yDifference > 3) {
      score -= (yDifference - 3) * 5;
      issue = 'shoulder_height';
      status = 'fair';
    }

    // Shoulder rounding (forward shoulders)
    if (xDifference < 0.15) {
      score -= 25;
      issue = issue ? 'multiple' : 'rounded_shoulders';
      status = 'poor';
    }

    // Excessive shoulder width
    if (xDifference > 0.25) {
      score -= 15;
      issue = issue ? 'multiple' : 'wide_stance';
      status = 'fair';
    }

    return {
      score: Math.max(30, score),
      difference: Math.round(yDifference),
      width: Math.round(xDifference * 100),
      status,
      issue
    };
  }

  analyzeBackPosture(landmarks) {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return { score: 70, curvature: 0, status: 'unknown', issue: null };
    }

    const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipCenterX = (leftHip.x + rightHip.x) / 2;
    const backCurvature = Math.abs(shoulderCenterX - hipCenterX) * 100;

    let score = 100;
    let issue = null;
    let status = 'good';

    // Leaning forward/backward
    if (backCurvature > 5) {
      score -= backCurvature * 2;
      issue = shoulderCenterX > hipCenterX ? 'leaning_forward' : 'leaning_back';
      status = 'fair';
    }

    // Severe curvature
    if (backCurvature > 15) {
      score -= 30;
      status = 'poor';
    }

    // Check for spinal alignment
    const leftAlignment = Math.abs(leftShoulder.x - leftHip.x) * 100;
    const rightAlignment = Math.abs(rightShoulder.x - rightHip.x) * 100;
    const alignmentDifference = Math.abs(leftAlignment - rightAlignment);

    if (alignmentDifference > 8) {
      score -= 20;
      issue = issue ? 'multiple' : 'spinal_misalignment';
      status = 'fair';
    }

    return {
      score: Math.max(30, score),
      curvature: Math.round(backCurvature),
      alignment: Math.round(alignmentDifference),
      status,
      issue
    };
  }

  analyzeHeadTilt(landmarks) {
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const nose = landmarks[0];

    if (!leftEar || !rightEar || !nose) {
      return { score: 70, angle: 0, direction: 'neutral' };
    }

    const earCenterX = (leftEar.x + rightEar.x) / 2;
    const headTiltAngle = Math.abs(earCenterX - nose.x) * 100;
    const direction = earCenterX > nose.x ? 'right' : 'left';

    let score = 100;
    
    // Deduct points for significant tilt
    if (headTiltAngle > 3) {
      score -= headTiltAngle * 3;
    }

    return {
      score: Math.max(40, Math.round(score)),
      angle: Math.round(headTiltAngle),
      direction: headTiltAngle > 2 ? direction : 'neutral'
    };
  }

  determinePostureType(analysis) {
    const { neckAlignment, shoulderAlignment, backPosture } = analysis;

    if (neckAlignment.score < 50 || shoulderAlignment.score < 50 || backPosture.score < 50) {
      return 'poor';
    }

    if (neckAlignment.score < 70 || shoulderAlignment.score < 70 || backPosture.score < 70) {
      return 'fair';
    }

    // Check for specific issues
    if (neckAlignment.issue === 'forward_head') return 'forward_head';
    if (shoulderAlignment.issue === 'rounded_shoulders') return 'rounded_shoulders';
    if (backPosture.issue === 'leaning_forward') return 'leaning_forward';

    return 'good';
  }

  updateHealthScore(analysis) {
    // Calculate rolling average of last 10 posture scores
    const recentScores = this.postureHistory.slice(-10).map(p => p.overallScore);
    const currentScore = analysis.overallScore;
    
    if (recentScores.length > 0) {
      const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      this.healthScore = Math.round((avgScore + currentScore) / 2);
    } else {
      this.healthScore = currentScore;
    }

    this.currentPosture = analysis.postureType;
  }

  generatePostureRecommendations(analysis) {
    this.recommendations = [];

    const sessionDuration = (Date.now() - this.sessionStartTime) / 60000;

    // Time-based recommendations
    if (sessionDuration > 30) {
      this.recommendations.push({
        type: 'movement',
        priority: 'medium',
        message: 'Time to stretch! Try shoulder rolls and neck stretches.',
        action: '30-second stretch break'
      });
    }

    // Posture-specific recommendations
    if (analysis.neckAlignment.issue === 'forward_head') {
      this.recommendations.push({
        type: 'correction',
        priority: 'high',
        message: 'Your head is too far forward. Try to align your ears with your shoulders.',
        action: 'Chin tucks exercise'
      });
    }

    if (analysis.shoulderAlignment.issue === 'rounded_shoulders') {
      this.recommendations.push({
        type: 'correction',
        priority: 'medium',
        message: 'Shoulders are rounded forward. Try to pull your shoulder blades together.',
        action: 'Shoulder blade squeeze'
      });
    }

    if (analysis.backPosture.issue === 'leaning_forward') {
      this.recommendations.push({
        type: 'correction',
        priority: 'medium',
        message: 'You\'re leaning too far forward. Sit back in your chair.',
        action: 'Adjust seating position'
      });
    }

    // Poor overall posture
    if (analysis.overallScore < 60) {
      this.recommendations.push({
        type: 'urgent',
        priority: 'high',
        message: 'Poor posture detected. Take a break and reset your position.',
        action: 'Stand up and walk for 1 minute'
      });
    }

    // High fatigue impact
    if (sessionDuration > 60 && analysis.overallScore < 70) {
      this.recommendations.push({
        type: 'break',
        priority: 'high',
        message: 'Extended session with declining posture. Consider a longer break.',
        action: '10-15 minute break recommended'
      });
    }
  }

  getSimulatedPosture() {
    const now = Date.now();
    const timeFactor = Math.sin(now / 8000) * 15;
    const randomFactor = Math.random() * 10;

    const simulatedScore = Math.max(40, Math.min(85, 65 + timeFactor + randomFactor));

    return {
      timestamp: now,
      neckAlignment: {
        score: Math.round(simulatedScore),
        angle: 0,
        status: 'simulated',
        issue: null
      },
      shoulderAlignment: {
        score: Math.round(simulatedScore * 0.9),
        difference: 0,
        status: 'simulated',
        issue: null
      },
      backPosture: {
        score: Math.round(simulatedScore * 0.95),
        curvature: 0,
        status: 'simulated',
        issue: null
      },
      headTilt: {
        score: 85,
        angle: 0,
        direction: 'neutral'
      },
      overallScore: Math.round(simulatedScore),
      postureType: simulatedScore > 70 ? 'good' : simulatedScore > 50 ? 'fair' : 'poor'
    };
  }

  getPostureReport() {
    const recentPostures = this.postureHistory.slice(-20);
    const avgScore = recentPostures.length > 0 ?
      recentPostures.reduce((sum, p) => sum + p.overallScore, 0) / recentPostures.length : 70;

    const commonIssues = this.getCommonIssues();
    const postureTrend = this.calculateTrend();

    return {
      currentScore: this.healthScore,
      averageScore: Math.round(avgScore),
      postureType: this.currentPosture,
      commonIssues,
      recommendations: this.recommendations,
      alertCount: this.alertHistory.length,
      postureTrend,
      sessionDuration: Math.round((Date.now() - this.sessionStartTime) / 60000)
    };
  }

  getCommonIssues() {
    const issues = [];
    const recentPostures = this.postureHistory.slice(-15);

    recentPostures.forEach(posture => {
      if (posture.neckAlignment.issue && !issues.includes(posture.neckAlignment.issue)) {
        issues.push(posture.neckAlignment.issue);
      }
      if (posture.shoulderAlignment.issue && !issues.includes(posture.shoulderAlignment.issue)) {
        issues.push(posture.shoulderAlignment.issue);
      }
      if (posture.backPosture.issue && !issues.includes(posture.backPosture.issue)) {
        issues.push(posture.backPosture.issue);
      }
    });

    return issues.slice(0, 3); // Return top 3 issues
  }

  calculateTrend() {
    if (this.postureHistory.length < 10) return 'stable';

    const recentScores = this.postureHistory.slice(-10).map(p => p.overallScore);
    const olderScores = this.postureHistory.slice(-20, -10).map(p => p.overallScore);

    if (olderScores.length === 0) return 'stable';

    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;

    if (recentAvg > olderAvg + 5) return 'improving';
    if (recentAvg < olderAvg - 5) return 'declining';
    return 'stable';
  }

  reset() {
    this.postureHistory = [];
    this.alertHistory = [];
    this.sessionStartTime = Date.now();
    this.currentPosture = 'neutral';
    this.healthScore = 100;
    this.recommendations = [];
  }
}

export default new PostureAnalyzer();