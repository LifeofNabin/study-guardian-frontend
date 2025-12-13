/**
 * FILE PATH: frontend/src/utils/pdfAnnotationUtils.js
 * * Utility functions for managing PDF interactions, annotations, and logging 
 * behavioral events to the backend via the Interactions API.
 */

import { interactionsAPI } from '../services/api';
import { getCurrentTimestamp } from './timeUtils'; // Assuming a time utility exists

// Throttle configuration for high-frequency events (e.g., scroll, zoom)
const THROTTLE_INTERVAL_MS = 5000; // Log scroll/zoom events every 5 seconds
let lastLogTime = {
    scroll: 0,
    zoom: 0,
};

/**
 * Logs a general behavioral interaction event to the backend.
 * Handles throttling for high-frequency events.
 * * @param {string} sessionId The ID of the current study session.
 * @param {string} type The type of interaction (e.g., 'page_turn', 'scroll', 'zoom', 'break').
 * @param {object} data Specific payload data for the interaction.
 */
export const logInteraction = async (sessionId, type, data = {}) => {
    if (!sessionId) {
        console.error('Cannot log interaction: sessionId is missing.');
        return;
    }
    
    const now = Date.now();
    let shouldLog = true;

    // Apply throttling logic
    if (type === 'scroll' || type === 'zoom') {
        if (now - lastLogTime[type] < THROTTLE_INTERVAL_MS) {
            shouldLog = false;
        } else {
            lastLogTime[type] = now;
        }
    }

    if (shouldLog) {
        try {
            const payload = {
                ...data,
                timestamp: getCurrentTimestamp(), // Use server-friendly timestamp
                page: data.page || 1, // Ensure page number is always logged
            };
            
            // Call the shared interactions API endpoint
            await interactionsAPI.saveInteraction(sessionId, type, payload);
            
            console.log(`[Interaction] Logged ${type} for session ${sessionId}.`);

        } catch (error) {
            console.error(`Failed to log interaction type ${type}:`, error);
            // Optionally, implement a local queue for failed logs
        }
    }
};


/**
 * Saves a new highlight or annotation associated with a PDF page.
 * * @param {string} sessionId The ID of the current study session.
 * @param {object} highlightData The data describing the highlight/annotation.
 * @returns {Promise<object | null>} The saved annotation object from the server.
 */
export const saveHighlight = async (sessionId, highlightData) => {
    if (!sessionId || !highlightData) {
        console.error('Cannot save highlight: Session ID or data is missing.');
        return null;
    }

    const type = 'highlight';

    try {
        const payload = {
            ...highlightData,
            timestamp: getCurrentTimestamp(),
            // Ensure fields like 'page', 'text', 'color', 'position' are present
        };

        // Reuse the generic interaction logging endpoint for annotations
        const response = await interactionsAPI.saveInteraction(sessionId, type, payload);
        
        console.log(`[Annotation] Highlight saved for page ${highlightData.page}.`);
        
        return response.data; // Return the created interaction record

    } catch (error) {
        console.error('Failed to save highlight:', error);
        return null;
    }
};

/**
 * Updates an existing highlight or annotation.
 * * NOTE: This assumes the backend's interactionsAPI has an endpoint for updating 
 * a specific interaction/highlight. Since we only defined a generic POST, 
 * we'll use a placeholder structure here.
 * * In a complete system, this would call: `annotationsAPI.updateHighlight(highlightId, data)`
 */
export const updateHighlight = async (sessionId, interactionId, updateData) => {
     if (!sessionId || !interactionId) {
        console.error('Cannot update highlight: IDs are missing.');
        return false;
    }
    
    // Placeholder implementation (should ideally hit a specific PUT route)
    console.warn(`[Annotation] Update Highlight not fully implemented in current API service. Interaction ID: ${interactionId}`);
    try {
        // Assume a PATCH endpoint exists on the backend:
        // await interactionsAPI.updateInteraction(interactionId, updateData);
        return true;
    } catch (error) {
        console.error('Failed to update highlight:', error);
        return false;
    }
};

// NOTE: This utility assumes the existence of 'frontend/src/utils/timeUtils.js' 
// for the `getCurrentTimestamp` function.