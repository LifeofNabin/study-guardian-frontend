/**
 * FILE PATH: frontend/src/utils/mlModels.js
 * 
 * Machine Learning Models Manager
 * Loads and manages MediaPipe, TensorFlow.js, and other ML models
 * for face detection, pose estimation, and object detection
 */

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { 
  FaceDetection,
  FaceMesh,
  Pose,
  Results as FaceResults,
  Results as PoseResults
} from '@mediapipe/tasks-vision';

/**
 * ML Models Manager Class
 */
class MLModelsManager {
  constructor() {
    this.models = {
      faceDetection: null,
      faceMesh: null,
      pose: null,
      cocoSsd: null
    };

    this.isInitialized = {
      faceDetection: false,
      faceMesh: false,
      pose: false,
      cocoSsd: false,
      tensorflow: false
    };

    this.loadingPromises = {};
    
    // MediaPipe configuration
    this.mediaPipeConfig = {
      faceDetection: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU',
        minDetectionConfidence: 0.5,
        minSuppressionThreshold: 0.3
      },
      faceMesh: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true
      },
      pose: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false
      }
    };
  }

  /**
   * Initialize TensorFlow.js backend
   */
  async initializeTensorFlow() {
    if (this.isInitialized.tensorflow) {
      return true;
    }

    try {
      console.log('🔧 Initializing TensorFlow.js...');
      
      // Set backend (prefer WebGL for GPU acceleration)
      await tf.setBackend('webgl');
      await tf.ready();
      
      this.isInitialized.tensorflow = true;
      console.log('✅ TensorFlow.js initialized');
      console.log(`Backend: ${tf.getBackend()}`);
      console.log(`Memory: ${JSON.stringify(tf.memory())}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize TensorFlow:', error);
      
      // Fallback to CPU backend
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        this.isInitialized.tensorflow = true;
        console.log('⚠️ Using CPU backend as fallback');
        return true;
      } catch (fallbackError) {
        console.error('❌ All backends failed:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Load MediaPipe Face Detection
   */
  async loadFaceDetection() {
    if (this.isInitialized.faceDetection) {
      return this.models.faceDetection;
    }

    if (this.loadingPromises.faceDetection) {
      return this.loadingPromises.faceDetection;
    }

    this.loadingPromises.faceDetection = (async () => {
      try {
        console.log('🔧 Loading MediaPipe Face Detection...');

        const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
        
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        this.models.faceDetection = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: this.mediaPipeConfig.faceDetection.modelAssetPath,
            delegate: this.mediaPipeConfig.faceDetection.delegate
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: this.mediaPipeConfig.faceDetection.minDetectionConfidence
        });

        this.isInitialized.faceDetection = true;
        console.log('✅ Face Detection loaded');
        
        return this.models.faceDetection;
      } catch (error) {
        console.error('❌ Failed to load Face Detection:', error);
        this.isInitialized.faceDetection = false;
        throw error;
      }
    })();

    return this.loadingPromises.faceDetection;
  }

  /**
   * Load MediaPipe Face Mesh (for detailed facial landmarks)
   */
  async loadFaceMesh() {
    if (this.isInitialized.faceMesh) {
      return this.models.faceMesh;
    }

    if (this.loadingPromises.faceMesh) {
      return this.loadingPromises.faceMesh;
    }

    this.loadingPromises.faceMesh = (async () => {
      try {
        console.log('🔧 Loading MediaPipe Face Mesh...');

        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        this.models.faceMesh = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: this.mediaPipeConfig.faceMesh.modelAssetPath,
            delegate: this.mediaPipeConfig.faceMesh.delegate
          },
          runningMode: 'VIDEO',
          numFaces: this.mediaPipeConfig.faceMesh.numFaces,
          minFaceDetectionConfidence: this.mediaPipeConfig.faceMesh.minFaceDetectionConfidence,
          minFacePresenceConfidence: this.mediaPipeConfig.faceMesh.minFacePresenceConfidence,
          minTrackingConfidence: this.mediaPipeConfig.faceMesh.minTrackingConfidence,
          outputFaceBlendshapes: this.mediaPipeConfig.faceMesh.outputFaceBlendshapes,
          outputFacialTransformationMatrixes: this.mediaPipeConfig.faceMesh.outputFacialTransformationMatrixes
        });

        this.isInitialized.faceMesh = true;
        console.log('✅ Face Mesh loaded');
        
        return this.models.faceMesh;
      } catch (error) {
        console.error('❌ Failed to load Face Mesh:', error);
        this.isInitialized.faceMesh = false;
        throw error;
      }
    })();

    return this.loadingPromises.faceMesh;
  }

  /**
   * Load MediaPipe Pose Estimation
   */
  async loadPoseEstimation() {
    if (this.isInitialized.pose) {
      return this.models.pose;
    }

    if (this.loadingPromises.pose) {
      return this.loadingPromises.pose;
    }

    this.loadingPromises.pose = (async () => {
      try {
        console.log('🔧 Loading MediaPipe Pose Estimation...');

        const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        this.models.pose = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: this.mediaPipeConfig.pose.modelAssetPath,
            delegate: this.mediaPipeConfig.pose.delegate
          },
          runningMode: 'VIDEO',
          numPoses: this.mediaPipeConfig.pose.numPoses,
          minPoseDetectionConfidence: this.mediaPipeConfig.pose.minPoseDetectionConfidence,
          minPosePresenceConfidence: this.mediaPipeConfig.pose.minPosePresenceConfidence,
          minTrackingConfidence: this.mediaPipeConfig.pose.minTrackingConfidence
        });

        this.isInitialized.pose = true;
        console.log('✅ Pose Estimation loaded');
        
        return this.models.pose;
      } catch (error) {
        console.error('❌ Failed to load Pose Estimation:', error);
        this.isInitialized.pose = false;
        throw error;
      }
    })();

    return this.loadingPromises.pose;
  }

  /**
   * Load COCO-SSD Object Detection (for detecting phones, books, etc.)
   */
  async loadObjectDetection() {
    if (this.isInitialized.cocoSsd) {
      return this.models.cocoSsd;
    }

    if (this.loadingPromises.cocoSsd) {
      return this.loadingPromises.cocoSsd;
    }

    this.loadingPromises.cocoSsd = (async () => {
      try {
        console.log('🔧 Loading COCO-SSD Object Detection...');
        
        await this.initializeTensorFlow();
        
        this.models.cocoSsd = await cocoSsd.load({
          base: 'lite_mobilenet_v2' // Faster, lighter model
        });

        this.isInitialized.cocoSsd = true;
        console.log('✅ Object Detection loaded');
        
        return this.models.cocoSsd;
      } catch (error) {
        console.error('❌ Failed to load Object Detection:', error);
        this.isInitialized.cocoSsd = false;
        throw error;
      }
    })();

    return this.loadingPromises.cocoSsd;
  }

  /**
   * Load all models at once
   */
  async loadAllModels(options = {}) {
    const {
      faceDetection = true,
      faceMesh = true,
      pose = true,
      objectDetection = true
    } = options;

    console.log('🚀 Loading all ML models...');
    const startTime = Date.now();

    const promises = [];

    if (faceDetection) promises.push(this.loadFaceDetection().catch(e => console.warn('Face Detection failed:', e)));
    if (faceMesh) promises.push(this.loadFaceMesh().catch(e => console.warn('Face Mesh failed:', e)));
    if (pose) promises.push(this.loadPoseEstimation().catch(e => console.warn('Pose Estimation failed:', e)));
    if (objectDetection) promises.push(this.loadObjectDetection().catch(e => console.warn('Object Detection failed:', e)));

    await Promise.allSettled(promises);

    const loadTime = Date.now() - startTime;
    console.log(`✅ Models loaded in ${loadTime}ms`);
    
    return this.getLoadedModels();
  }

  /**
   * Detect faces in video frame
   */
  async detectFaces(videoElement, timestamp) {
    if (!this.isInitialized.faceDetection) {
      throw new Error('Face Detection model not loaded');
    }

    try {
      const results = this.models.faceDetection.detectForVideo(videoElement, timestamp);
      return this.processFaceDetectionResults(results);
    } catch (error) {
      console.error('Face detection error:', error);
      return null;
    }
  }

  /**
   * Get facial landmarks
   */
  async getFacialLandmarks(videoElement, timestamp) {
    if (!this.isInitialized.faceMesh) {
      throw new Error('Face Mesh model not loaded');
    }

    try {
      const results = this.models.faceMesh.detectForVideo(videoElement, timestamp);
      return this.processFaceMeshResults(results);
    } catch (error) {
      console.error('Face mesh error:', error);
      return null;
    }
  }

  /**
   * Detect pose/body landmarks
   */
  async detectPose(videoElement, timestamp) {
    if (!this.isInitialized.pose) {
      throw new Error('Pose Estimation model not loaded');
    }

    try {
      const results = this.models.pose.detectForVideo(videoElement, timestamp);
      return this.processPoseResults(results);
    } catch (error) {
      console.error('Pose detection error:', error);
      return null;
    }
  }

  /**
   * Detect objects in frame
   */
  async detectObjects(videoElement) {
    if (!this.isInitialized.cocoSsd) {
      throw new Error('Object Detection model not loaded');
    }

    try {
      const predictions = await this.models.cocoSsd.detect(videoElement);
      return this.processObjectDetectionResults(predictions);
    } catch (error) {
      console.error('Object detection error:', error);
      return null;
    }
  }

  /**
   * Process face detection results
   */
  processFaceDetectionResults(results) {
    if (!results || !results.detections || results.detections.length === 0) {
      return {
        faceDetected: false,
        faceCount: 0,
        faces: []
      };
    }

    const faces = results.detections.map(detection => ({
      boundingBox: detection.boundingBox,
      confidence: detection.categories[0]?.score || 0,
      keypoints: detection.keypoints || []
    }));

    return {
      faceDetected: true,
      faceCount: faces.length,
      faces,
      primaryFace: faces[0]
    };
  }

  /**
   * Process face mesh results
   */
  processFaceMeshResults(results) {
    if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
      return null;
    }

    const faceLandmarks = results.faceLandmarks[0];
    const blendshapes = results.faceBlendshapes?.[0];

    // Calculate Eye Aspect Ratio (EAR) for blink detection
    const ear = this.calculateEyeAspectRatio(faceLandmarks);
    
    // Calculate head pose
    const headPose = this.calculateHeadPose(faceLandmarks);

    // Estimate gaze direction
    const gazeDirection = this.estimateGazeDirection(faceLandmarks);

    return {
      landmarks: faceLandmarks,
      blendshapes: blendshapes?.categories || [],
      eyeAspectRatio: ear,
      headPose,
      gazeDirection,
      isBlink: ear < 0.2,
      isLookingAtScreen: Math.abs(gazeDirection.horizontal) < 0.3 && Math.abs(gazeDirection.vertical) < 0.3
    };
  }

  /**
   * Process pose estimation results
   */
  processPoseResults(results) {
    if (!results || !results.landmarks || results.landmarks.length === 0) {
      return null;
    }

    const landmarks = results.landmarks[0];
    
    // Calculate posture metrics
    const neckAngle = this.calculateNeckAngle(landmarks);
    const backAngle = this.calculateBackAngle(landmarks);
    const shoulderAlignment = this.calculateShoulderAlignment(landmarks);

    // Determine posture quality
    const postureScore = this.calculatePostureScore(neckAngle, backAngle, shoulderAlignment);

    return {
      landmarks,
      posture: {
        neckAngle,
        backAngle,
        shoulderAlignment,
        score: postureScore,
        quality: postureScore > 80 ? 'good' : postureScore > 60 ? 'acceptable' : 'poor'
      },
      visibility: this.calculateLandmarkVisibility(landmarks)
    };
  }

  /**
   * Process object detection results
   */
  processObjectDetectionResults(predictions) {
    const relevantObjects = ['cell phone', 'book', 'laptop', 'cup', 'bottle'];
    
    const detectedObjects = predictions
      .filter(pred => pred.score > 0.5)
      .map(pred => ({
        class: pred.class,
        confidence: pred.score,
        bbox: pred.bbox
      }));

    const objectTypes = detectedObjects.map(obj => obj.class);
    const hasDistractingObject = objectTypes.some(type => 
      ['cell phone', 'cup', 'bottle'].includes(type)
    );

    return {
      objects: detectedObjects,
      objectTypes,
      hasPhone: objectTypes.includes('cell phone'),
      hasDistractingObject,
      count: detectedObjects.length
    };
  }

  // ==================== HELPER CALCULATIONS ====================

  /**
   * Calculate Eye Aspect Ratio for blink detection
   */
  calculateEyeAspectRatio(landmarks) {
    // Simplified EAR calculation using eye landmarks
    // MediaPipe Face Mesh has 468 landmarks
    // Left eye: 33, 160, 158, 133, 153, 144
    // Right eye: 362, 385, 387, 263, 373, 380
    
    if (!landmarks || landmarks.length < 468) return 0.3;

    const leftEye = {
      top: landmarks[159],
      bottom: landmarks[145],
      left: landmarks[133],
      right: landmarks[33]
    };

    const rightEye = {
      top: landmarks[386],
      bottom: landmarks[374],
      left: landmarks[362],
      right: landmarks[263]
    };

    const leftEAR = this.calculateSingleEyeAspectRatio(leftEye);
    const rightEAR = this.calculateSingleEyeAspectRatio(rightEye);

    return (leftEAR + rightEAR) / 2;
  }

  /**
   * Calculate EAR for single eye
   */
  calculateSingleEyeAspectRatio(eye) {
    const verticalDist = Math.abs(eye.top.y - eye.bottom.y);
    const horizontalDist = Math.abs(eye.right.x - eye.left.x);
    return verticalDist / (horizontalDist + 0.001); // Prevent division by zero
  }

  /**
   * Calculate head pose (pitch, yaw, roll)
   */
  calculateHeadPose(landmarks) {
    // Simplified head pose estimation
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];

    const eyeCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2
    };

    // Yaw (left-right rotation)
    const yaw = (nose.x - eyeCenter.x) * 100;

    // Pitch (up-down rotation)
    const pitch = (nose.y - eyeCenter.y) * 100;

    // Roll (tilt)
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

    return { pitch, yaw, roll };
  }

  /**
   * Estimate gaze direction
   */
  estimateGazeDirection(landmarks) {
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    const eyeCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2
    };

    return {
      horizontal: (nose.x - eyeCenter.x) * 2,
      vertical: (nose.y - eyeCenter.y) * 2
    };
  }

  /**
   * Calculate neck angle
   */
  calculateNeckAngle(landmarks) {
    // Pose landmarks: nose(0), neck(approximate between shoulders)
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    const shoulderMid = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    const angle = Math.abs(Math.atan2(
      nose.y - shoulderMid.y,
      nose.x - shoulderMid.x
    ) * (180 / Math.PI) - 90);

    return angle;
  }

  /**
   * Calculate back angle
   */
  calculateBackAngle(landmarks) {
    const leftShoulder = landmarks[11];
    const leftHip = landmarks[23];

    const angle = Math.abs(Math.atan2(
      leftShoulder.y - leftHip.y,
      leftShoulder.x - leftHip.x
    ) * (180 / Math.PI) - 90);

    return angle;
  }

  /**
   * Calculate shoulder alignment
   */
  calculateShoulderAlignment(landmarks) {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    const heightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    return Math.max(0, 1 - heightDiff * 5); // Normalize to 0-1
  }

  /**
   * Calculate overall posture score
   */
  calculatePostureScore(neckAngle, backAngle, shoulderAlignment) {
    let score = 100;

    // Penalize poor neck angle
    if (neckAngle > 30) score -= 30;
    else if (neckAngle > 15) score -= 15;

    // Penalize poor back angle
    if (backAngle > 20) score -= 25;
    else if (backAngle > 10) score -= 10;

    // Penalize poor shoulder alignment
    if (shoulderAlignment < 0.8) score -= 15;

    return Math.max(0, score);
  }

  /**
   * Calculate landmark visibility
   */
  calculateLandmarkVisibility(landmarks) {
    const visibleCount = landmarks.filter(lm => lm.visibility > 0.5).length;
    return (visibleCount / landmarks.length).toFixed(2);
  }

  /**
   * Get status of all loaded models
   */
  getLoadedModels() {
    return {
      faceDetection: this.isInitialized.faceDetection,
      faceMesh: this.isInitialized.faceMesh,
      pose: this.isInitialized.pose,
      objectDetection: this.isInitialized.cocoSsd,
      tensorflow: this.isInitialized.tensorflow
    };
  }

  /**
   * Check if models are ready
   */
  isReady() {
    return this.isInitialized.faceDetection || 
           this.isInitialized.faceMesh || 
           this.isInitialized.pose;
  }

  /**
   * Unload all models to free memory
   */
  unloadModels() {
    console.log('🗑️ Unloading ML models...');

    if (this.models.faceDetection) {
      this.models.faceDetection.close();
      this.models.faceDetection = null;
    }

    if (this.models.faceMesh) {
      this.models.faceMesh.close();
      this.models.faceMesh = null;
    }

    if (this.models.pose) {
      this.models.pose.close();
      this.models.pose = null;
    }

    if (this.models.cocoSsd) {
      this.models.cocoSsd.dispose();
      this.models.cocoSsd = null;
    }

    // Dispose TensorFlow tensors
    if (this.isInitialized.tensorflow) {
      tf.disposeVariables();
    }

    Object.keys(this.isInitialized).forEach(key => {
      this.isInitialized[key] = false;
    });

    console.log('✅ Models unloaded');
  }

  /**
   * Get memory usage
   */
  getMemoryInfo() {
    if (this.isInitialized.tensorflow) {
      return tf.memory();
    }
    return null;
  }
}

// Export singleton instance
export default new MLModelsManager();