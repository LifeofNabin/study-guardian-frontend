/**
 * FILE PATH: frontend/src/utils/timeUtils.js
 * * Minimal utility for standardizing time formats.
 */

/**
 * Gets the current timestamp formatted for backend storage (ISO 8601 string).
 * @returns {string} ISO 8601 timestamp string.
 */
export const getCurrentTimestamp = () => {
    return new Date().toISOString();
};

/**
 * Converts a duration in seconds to a human-readable string (e.g., "01:05:30" or "5m 30s").
 * @param {number} totalSeconds Duration in seconds.
 * @returns {string} Formatted duration string.
 */
export const formatDuration = (totalSeconds) => {
    if (totalSeconds === undefined || totalSeconds === null || totalSeconds < 0) {
        return "00:00";
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');

    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    
    return `${pad(minutes)}:${pad(seconds)}`;
};