const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Extract HH:mm from a time string ("08:00") or datetime-local ("2026-07-01T09:30").
 */
function extractTime(value) {
  if (!value) return null;
  if (value.includes('T')) return value.split('T')[1].slice(0, 5);
  return value.slice(0, 5);
}

/**
 * Convert "HH:mm" to total minutes since midnight.
 */
function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Add minutes to an "HH:mm" string, clamped to 23:59.
 */
function addMinutes(t, delta) {
  const total = Math.min(timeToMinutes(t) + delta, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * AI Service for travel plan generation using Gemini.
 */
class AIService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured. AI features will be unavailable.');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Generates a travel itinerary based on trip details.
   * @param {Object} trip - Trip details (destination, startDate, endDate, etc.)
   * @returns {Promise<Array>} - Array of stops
   */
  async generateItinerary(trip) {
    if (!this.genAI) {
      throw new Error('AI Service is not configured. Please add GEMINI_API_KEY to your .env file.');
    }

    const durationDays = Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    
    // Use models available in this environment (2026-05-28 context)
    const modelNames = ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.0-flash', 'gemini-pro'];
    let lastError = null;

    for (const modelName of modelNames) {
      try {
        const model = this.genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.2, // Lower temperature for more consistent, logical routes
            topP: 0.8,
            topK: 40,
          }
        });

        const arrivalTime  = extractTime(trip.arrivalTime);
        const checkInTime  = extractTime(trip.hotelCheckIn);
        const checkOutTime = extractTime(trip.hotelCheckOut);
        const departureTime = extractTime(trip.departureTime);

        // Earliest time activities can start on day 1:
        // after hotel check-in (if set), else after arrival + 1h buffer, else no constraint
        const day1StartAfter = checkInTime
          || (arrivalTime ? addMinutes(arrivalTime, 60) : null);

        // Latest time activities can end on the last day:
        // before hotel check-out (if set), else 2h before departure, else no constraint
        const lastDayEndBefore = checkOutTime
          || (departureTime ? addMinutes(departureTime, -120) : null);

        const logisticsContext = [
          trip.arrivalAirport   ? `- Day 1 arrival at ${trip.arrivalAirport} at ${arrivalTime || 'unknown time'}` : null,
          checkInTime           ? `- Day 1 hotel check-in at ${trip.hotelLocation} at ${checkInTime}` : null,
          checkOutTime          ? `- Day ${durationDays} hotel check-out from ${trip.hotelLocation} at ${checkOutTime}` : null,
          trip.departureAirport ? `- Day ${durationDays} departure from ${trip.departureAirport} at ${departureTime || 'unknown time'}` : null,
        ].filter(Boolean).join('\n          ');

        const day1Constraint   = day1StartAfter   ? `\n          IMPORTANT: On Day 1, do NOT schedule any activities before ${day1StartAfter} — the traveller has not arrived yet.` : '';
        const lastDayConstraint = lastDayEndBefore ? `\n          IMPORTANT: On Day ${durationDays}, do NOT schedule any activities after ${lastDayEndBefore} — the traveller needs to leave for the airport.` : '';

        const prompt = `
          You are a professional travel planner specializing in geographic clustering and route optimization.
          Create a detailed daily itinerary for a trip to ${trip.destination}.
          
          Trip Details:
          - Duration: ${durationDays} days
          - Budget: ${trip.budget} ${trip.currency}
          - Preferences: ${trip.travelPreferences.join(', ') || 'General sightseeing'}
          - Notes: ${trip.notes || 'None'}
          ${logisticsContext ? `\n          Fixed logistics (DO NOT include these in your output — they are already added separately):\n          ${logisticsContext}` : ''}
          ${day1Constraint}${lastDayConstraint}
          
          STRICT ROUTE OPTIMIZATION RULES:
          1. GEOGRAPHIC CLUSTERING: Each day MUST focus on one specific, localized neighborhood or area of ${trip.destination}. Do NOT jump across the city in a single day.
          2. LOGICAL FLOW: Arrange activities in a chronological order that minimizes travel time. Start at one end of the area and move logically to the next.
          3. REALISM: Ensure travel times between activities within the cluster are realistic (e.g., 10-20 mins walking or short transit).
          4. VARIETY: While clustered, ensure a mix of food, sightseeing, and relaxation.

          Output the itinerary as a JSON array of "stop" objects. 
          Each "stop" object MUST follow this strict format:
          {
            "day": number (1 to ${durationDays}),
            "time": "HH:mm" (24-hour format),
            "activityTitle": "string",
            "location": "string (specific name or address)",
            "category": "Food" | "Sightseeing" | "Logistics" | "Shopping" | "Transport" | "Adventure" | "Culture" | "General",
            "duration": "string (e.g., 2h, 45m)",
            "notes": "string (include why this fits in the area cluster)",
            "order": number (sequential within the day)
          }
          
          Provide at least 3-5 activities per day. 
          ONLY return the JSON array, no other text.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Basic cleanup in case LLM adds markdown formatting
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const itinerary = JSON.parse(text);
        
        if (!Array.isArray(itinerary)) {
          throw new Error('Invalid AI response format: Expected an array.');
        }
        
        return itinerary;
      } catch (error) {
        console.warn(`Failed with model ${modelName}:`, error.message);
        lastError = error;
        // If it's a 404, we continue to next model
        if (error.status === 404 || error.message.includes('404') || error.message.includes('not found')) {
          continue;
        }
        // For other errors, we might want to break early, but let's try all models
      }
    }

    console.error('Gemini generation error (all models failed):', lastError);
    throw new Error('Failed to generate itinerary with AI. Please check your GEMINI_API_KEY and model availability.');
  }
}

module.exports = new AIService();
