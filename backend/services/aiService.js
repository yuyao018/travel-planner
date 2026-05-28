const { GoogleGenerativeAI } = require('@google/generative-ai');

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
        const model = this.genAI.getGenerativeModel({ model: modelName });

        const prompt = `
          You are a professional travel planner. Create a detailed daily itinerary for a trip to ${trip.destination}.
          
          Trip Details:
          - Duration: ${durationDays} days
          - Budget: ${trip.budget} ${trip.currency}
          - Preferences: ${trip.travelPreferences.join(', ') || 'General sightseeing'}
          - Notes: ${trip.notes || 'None'}
          
          Output the itinerary as a JSON array of "stop" objects. 
          Each "stop" object MUST follow this strict format:
          {
            "day": number (1 to ${durationDays}),
            "time": "HH:mm" (24-hour format),
            "activityTitle": "string",
            "location": "string",
            "category": "Food" | "Sightseeing" | "Logistics" | "Shopping" | "Transport" | "Adventure" | "Culture" | "General",
            "duration": "string (e.g., 2h, 45m)",
            "notes": "string",
            "order": number (sequential within the day)
          }
          
          Provide at least 3-5 activities per day. Ensure the activities are realistic for ${trip.destination}.
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
