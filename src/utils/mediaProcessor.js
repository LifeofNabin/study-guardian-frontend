// mediaProcessor.js - Utility functions for webcam and media processing

import * as tf from '@tensorflow/tfjs';

/**
 * Initialize TensorFlow.js
 */
export const initializeTensorFlow = async () => {
  try {
    await tf.ready();
    console.log('TensorFlow.js initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing TensorFlow:', error);
    return false;
  }
};

/**
 * Check if webcam is available
 */
export const checkWebcamAvailability = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    return videoDevices.length > 0;
  } catch (error) {
    console.error('Error checking webcam availability:', error);
    return false;
  }
};

/**
 * Request webcam and microphone permissions
 */
export const requestMediaPermissions = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      },
      audio: true
    });
    return stream;
  } catch (error) {
    console.error('Error requesting media permissions:', error);
    throw new Error('Camera and microphone access denied. Please enable permissions in your browser settings.');
  }
};

/**
 * Calculate eye aspect ratio for blink detection
 */
export const calculateEyeAspectRatio = (eye) => {
  if (!eye || eye.length < 6) return 0;

  // Vertical distances
  const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
  const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);

  // Horizontal distance
  const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);

  // Eye aspect ratio
  return (v1 + v2) / (2.0 * h);
};

/**
 * Detect blink from eye landmarks
 */
export const detectBlink = (leftEye, rightEye, threshold = 0.2) => {
  const leftEAR = calculateEyeAspectRatio(leftEye);
  const rightEAR = calculateEyeAspectRatio(rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2.0;

  return avgEAR < threshold;
};

/**
 * Calculate posture angle from landmarks
 */
export const calculatePostureAngle = (nose, leftShoulder, rightShoulder) => {
  if (!nose || !leftShoulder || !rightShoulder) return null;

  // Calculate shoulder midpoint
  const shoulderMidpoint = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2
  };

  // Calculate angle between nose and shoulder midpoint
  const deltaY = nose.y - shoulderMidpoint.y;
  const deltaZ = nose.z - shoulderMidpoint.z;
  
  const angle = Math.atan2(deltaY, Math.abs(deltaZ)) * (180 / Math.PI);
  
  return angle;
};

/**
 * Classify posture based on angle and position
 */
export const classifyPosture = (nose, leftShoulder, rightShoulder) => {
  if (!nose || !leftShoulder || !rightShoulder) {
    return { status: 'Unknown', confidence: 0 };
  }

  const angle = calculatePostureAngle(nose, leftShoulder, rightShoulder);
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const headShoulderDiff = nose.y - shoulderMidY;

  // Check shoulder alignment
  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);

  let status = 'Good posture';
  let confidence = 1.0;

  // Slouching detection
  if (headShoulderDiff < -0.15) {
    status = 'Slouching';
    confidence = Math.min(Math.abs(headShoulderDiff) / 0.15, 1.0);
  }
  // Leaning forward
  else if (nose.z && nose.z < -0.15) {
    status = 'Leaning forward';
    confidence = Math.min(Math.abs(nose.z) / 0.15, 1.0);
  }
  // Leaning back
  else if (nose.z && nose.z > 0.15) {
    status = 'Leaning back';
    confidence = Math.min(nose.z / 0.15, 1.0);
  }
  // Head tilted
  else if (shoulderTilt > 0.08) {
    status = 'Head tilted';
    confidence = Math.min(shoulderTilt / 0.08, 1.0);
  }

  return { status, confidence, angle };
};

/**
 * Calculate blink rate (blinks per minute)
 */
export const calculateBlinkRate = (blinkCount, durationSeconds) => {
  if (durationSeconds === 0) return 0;
  const minutes = durationSeconds / 60;
  return Math.round(blinkCount / minutes);
};

/**
 * Detect presence from face landmarks
 */
export const detectPresence = (faceLandmarks, threshold = 0.5) => {
  if (!faceLandmarks || faceLandmarks.length === 0) {
    return { present: false, confidence: 0 };
  }

  // Check if face landmarks are well-defined
  const avgZ = faceLandmarks.reduce((sum, lm) => sum + (lm.z || 0), 0) / faceLandmarks.length;
  const visibility = faceLandmarks.filter(lm => (lm.visibility || 1) > threshold).length / faceLandmarks.length;

  const present = visibility > 0.7 && Math.abs(avgZ) < 0.5;
  const confidence = visibility;

  return { present, confidence };
};

/**
 * Analyze audio level
 */
export const analyzeAudioLevel = (analyser) => {
  if (!analyser) return { level: 0, status: 'Unknown' };

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

  let status = 'Low';
  if (average > 150) {
    status = 'High';
  } else if (average > 100) {
    status = 'Medium';
  }

  return { level: Math.round(average), status };
};

/**
 * Process video frame for object detection
 */
export const processFrameForDetection = async (videoElement, model) => {
  if (!videoElement || !model) return [];

  try {
    const predictions = await model.detect(videoElement);
    return predictions.filter(pred => pred.score > 0.6);
  } catch (error) {
    console.error('Error processing frame:', error);
    return [];
  }
};

/**
 * Check for distractions in predictions
 */
export const checkForDistractions = (predictions) => {
  const distractionObjects = ['cell phone', 'phone', 'book', 'bottle', 'cup', 'laptop'];
  const detectedDistractions = [];

  predictions.forEach(pred => {
    if (distractionObjects.some(obj => pred.class.toLowerCase().includes(obj))) {
      detectedDistractions.push({
        type: pred.class,
        confidence: pred.score,
        position: pred.bbox
      });
    }
  });

  return detectedDistractions;
};

/**
 * Calculate engagement score based on multiple metrics
 */
export const calculateEngagementScore = (metrics) => {
  const {
    presenceTime = 0,
    totalTime = 1,
    highlightCount = 0,
    pageChanges = 0,
    goodPostureTime = 0,
    blinkRate = 15
  } = metrics;

  // Normalize metrics (0-1 scale)
  const presenceScore = Math.min(presenceTime / totalTime, 1.0);
  const activityScore = Math.min((highlightCount * 2 + pageChanges) / 50, 1.0);
  const postureScore = Math.min(goodPostureTime / totalTime, 1.0);
  
  // Blink rate score (optimal 15-20 blinks/min)
  const blinkScore = blinkRate >= 10 && blinkRate <= 25 ? 1.0 : 0.5;

  // Weighted average
  const engagementScore = (
    presenceScore * 0.4 +
    activityScore * 0.3 +
    postureScore * 0.2 +
    blinkScore * 0.1
  );

  return Math.round(engagementScore * 100);
};

/**
 * Format time duration
 */
export const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

/**
 * Calculate average from array
 */
export const calculateAverage = (arr) => {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

/**
 * Draw landmarks on canvas
 */
export const drawLandmarks = (ctx, landmarks, color = 'rgba(0, 255, 0, 0.5)', radius = 2) => {
  if (!ctx || !landmarks) return;

  ctx.fillStyle = color;
  landmarks.forEach(landmark => {
    const x = landmark.x * ctx.canvas.width;
    const y = landmark.y * ctx.canvas.height;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
  });
};

/**
 * Draw skeleton connections
 */
export const drawSkeleton = (ctx, landmarks, connections, color = 'rgba(0, 150, 255, 0.7)', lineWidth = 2) => {
  if (!ctx || !landmarks || !connections) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  connections.forEach(([startIdx, endIdx]) => {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];

    if (start && end) {
      ctx.beginPath();
      ctx.moveTo(start.x * ctx.canvas.width, start.y * ctx.canvas.height);
      ctx.lineTo(end.x * ctx.canvas.width, end.y * ctx.canvas.height);
      ctx.stroke();
    }
  });
};

/**
 * Create session summary
 */
export const createSessionSummary = (sessionData) => {
  const {
    startTime,
    endTime,
    highlights = [],
    pageVisits = {},
    totalTimeOnPage = {},
    presenceLog = [],
    postureLog = [],
    blinkCount = 0
  } = sessionData;

  const duration = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
  const totalPages = Object.keys(pageVisits).length;
  const mostVisitedPage = Object.entries(pageVisits).sort((a, b) => b[1] - a[1])[0]?.[0];
  
  // Calculate presence percentage
  const presentTime = presenceLog.filter(log => log.status === 'Present').length;
  const presencePercentage = Math.round((presentTime / presenceLog.length) * 100) || 0;

  // Calculate good posture percentage
  const goodPostureTime = postureLog.filter(log => log.status === 'Good posture').length;
  const posturePercentage = Math.round((goodPostureTime / postureLog.length) * 100) || 0;

  // Calculate blink rate
  const blinkRate = calculateBlinkRate(blinkCount, duration);

  // Calculate engagement score
  const engagementScore = calculateEngagementScore({
    presenceTime: presentTime,
    totalTime: presenceLog.length,
    highlightCount: highlights.length,
    pageChanges: totalPages,
    goodPostureTime: goodPostureTime,
    blinkRate
  });

  return {
    duration: formatDuration(duration),
    durationSeconds: duration,
    totalHighlights: highlights.length,
    totalPages,
    mostVisitedPage,
    presencePercentage,
    posturePercentage,
    blinkRate,
    engagementScore,
    averageTimePerPage: totalPages > 0 ? Math.round(duration / totalPages) : 0
  };
};

/**
 * Cleanup media streams
 */
export const cleanupMediaStreams = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log(`Stopped ${track.kind} track`);
    });
  }
};

/**
 * Get device list
 */
export const getMediaDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      videoDevices: devices.filter(d => d.kind === 'videoinput'),
      audioDevices: devices.filter(d => d.kind === 'audioinput')
    };
  } catch (error) {
    console.error('Error getting media devices:', error);
    return { videoDevices: [], audioDevices: [] };
  }
};

/**
 * Switch camera device
 */
export const switchCamera = async (deviceId) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
      audio: true
    });
    return stream;
  } catch (error) {
    console.error('Error switching camera:', error);
    throw error;
  }
};

export default {
  initializeTensorFlow,
  checkWebcamAvailability,
  requestMediaPermissions,
  calculateEyeAspectRatio,
  detectBlink,
  calculatePostureAngle,
  classifyPosture,
  calculateBlinkRate,
  detectPresence,
  analyzeAudioLevel,
  processFrameForDetection,
  checkForDistractions,
  calculateEngagementScore,
  formatDuration,
  calculateAverage,
  drawLandmarks,
  drawSkeleton,
  createSessionSummary,
  cleanupMediaStreams,
  getMediaDevices,
  switchCamera
};