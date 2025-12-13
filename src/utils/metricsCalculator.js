/**
 * FILE PATH: frontend/src/utils/metricsCalculator.js
 * * * Corrected Utility functions to process raw, time-series metric data (face_metric) 
 * into derived, aggregate analytics for real-time display, using NAMED EXPORTS.
 */

// Weights for the overall Engagement Score calculation
const ENGAGEMENT_WEIGHTS = {
    attentionRate: 0.5,
    postureScore: 0.3,
    blinkRateCompliance: 0.2,
};

// Ideal blink rate range in BPM
const IDEAL_BLINK_RATE_MIN = 15;
const IDEAL_BLINK_RATE_MAX = 25;

/**
 * Calculates a score (0-100) based on how compliant the current blink rate is 
 * with the ideal range (15-25 BPM).
 * @param {number} blinkRate Current blink rate in BPM.
 * @returns {number} Compliance score (0 to 100).
 */
const calculateBlinkCompliance = (blinkRate) => {
    if (blinkRate >= IDEAL_BLINK_RATE_MIN && blinkRate <= IDEAL_BLINK_RATE_MAX) {
        return 100;
    }
    
    // Scale compliance penalty based on distance from the ideal range
    const distanceToIdeal = Math.min(
        Math.abs(blinkRate - IDEAL_BLINK_RATE_MIN),
        Math.abs(blinkRate - IDEAL_BLINK_RATE_MAX)
    );
    
    // Max penalty at 50 BPM difference
    const MAX_DISTANCE = 50; 
    const penalty = Math.min(distanceToIdeal / MAX_DISTANCE, 1);
    
    return Math.max(0, 100 * (1 - penalty));
};

/**
 * Calculates aggregate analytics based on a history of raw metric data.
 * * This function is now correctly exported as a NAMED EXPORT.
 * @param {Array<Object>} metricsHistory Array of raw metric objects ({..., timestamp})
 * @param {number} startTime Timestamp of when the session started
 * @returns {Object} Calculated aggregate analytics
 */
export const calculateCurrentAnalytics = (metricsHistory, startTime) => {
    if (!metricsHistory || metricsHistory.length === 0) {
        return {
            engagementScore: 0,
            attentionRate: 0,
            blinkRate: 0,
            distractionCount: 0,
            duration: Date.now() - startTime,
        };
    }

    const totalMetrics = metricsHistory.length;
    let focusedCount = 0;
    let postureScoreSum = 0;
    let totalBlinks = 0;
    let distractionCount = 0;
    
    // Get the duration of the entire recorded metric history in seconds
    const firstTimestamp = metricsHistory[0].timestamp;
    const lastTimestamp = metricsHistory[metricsHistory.length - 1].timestamp;
    const historyDurationSeconds = (lastTimestamp - firstTimestamp) / 1000;
    
    let phoneDetectedFlag = false; 

    // 1. Accumulate totals
    metricsHistory.forEach((metric) => {
        // Attention (based on lookingAtScreen property from backend)
        if (metric.data.lookingAtScreen) {
            focusedCount++;
        }

        // Posture (based on postureScore property from backend)
        postureScoreSum += metric.data.postureScore || 0; 
        
        // Blink Rate (based on blinkRate property from backend, use a cumulative sum for average)
        totalBlinks += metric.data.blinkRate || 0;
        
        // Distractions
        if (metric.data.hasPhone && !phoneDetectedFlag) {
            distractionCount++;
            phoneDetectedFlag = true;
        } else if (!metric.data.hasPhone) {
            phoneDetectedFlag = false;
        }
    });
    
    // Note: We are using the blinkRate value sent from the webcam component, 
    // which is already a calculated BPM for the last window. Let's use the average.
    
    // 2. Calculate Averages and Rates
    
    const attentionRate = Math.round((focusedCount / totalMetrics) * 100);
    const avgPostureScore = postureScoreSum / totalMetrics;
    const avgBlinkRateBPM = Math.round(totalBlinks / totalMetrics); 
    
    const blinkComplianceScore = calculateBlinkCompliance(avgBlinkRateBPM);

    // 3. Calculate Overall Engagement Score (Composite Score)
    const engagementScore = Math.round(
        (attentionRate * ENGAGEMENT_WEIGHTS.attentionRate) +
        (avgPostureScore * ENGAGEMENT_WEIGHTS.postureScore) +
        (blinkComplianceScore * ENGAGEMENT_WEIGHTS.blinkRateCompliance)
    );
    
    // 4. Calculate Duration
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);

    // 5. Return Final Analytics
    return {
        engagementScore: Math.min(100, Math.max(0, engagementScore)),
        attentionRate: attentionRate,
        blinkRate: avgBlinkRateBPM,
        distractionCount: distractionCount,
        duration: durationSeconds,
    };
};


/**
 * Processes an incoming raw metric. 
 * * This function is now correctly exported as a NAMED EXPORT.
 * @param {Object} rawMetric The single, latest metric object
 * @returns {Object} The processed metric (often just the raw metric itself)
 */
export const processIncomingMetric = (rawMetric) => {
    // For the real-time panel, we pass the raw metric through to be added to the history array
    return rawMetric; 
};