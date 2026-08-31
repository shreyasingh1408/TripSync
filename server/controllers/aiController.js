const Trip = require("../models/Trip");
const Itinerary = require("../models/Itinerary");


// ======================================================
// Gemini Retry + Fallback Helper
// ======================================================

const callGeminiWithFallback = async (
  ai,
  prompt,
  responseSchema
) => {
  const models = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
  ];

  let lastError;

  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(
          `Trying ${model} - attempt ${attempt}`
        );

        const response = await ai.models.generateContent({
          model,
          contents: prompt,

          config: {
            responseMimeType: "application/json",
            responseSchema,

            // Slightly conservative output
            temperature: 0.4,
          },
        });

        return response;
      } catch (error) {
        lastError = error;

        const message =
          error?.message || "";

        const isTemporaryError =
          message.includes("503") ||
          message.includes("UNAVAILABLE") ||
          message.includes("high demand") ||
          message.includes("429") ||
          message.includes("RESOURCE_EXHAUSTED");

        // Permanent error => retry useless
        if (!isTemporaryError) {
          throw error;
        }

        console.log(
          `${model} temporary error. Retry ${attempt}/3`
        );

        // 2 sec, 4 sec, 6 sec
        await new Promise((resolve) =>
          setTimeout(resolve, attempt * 2000)
        );
      }
    }

    console.log(
      `${model} failed. Trying fallback model...`
    );
  }

  throw lastError;
};


// ======================================================
// Shared Itinerary Response Schema
// ======================================================

const itineraryResponseSchema = {
  type: "object",

  properties: {
    days: {
      type: "array",

      items: {
        type: "object",

        properties: {
          day: {
            type: "integer",
          },

          date: {
            type: "string",
          },

          activities: {
            type: "array",

            items: {
              type: "object",

              properties: {
                name: {
                  type: "string",
                },

                time: {
                  type: "string",
                },

                location: {
                  type: "string",
                },

                estimatedCost: {
                  type: "number",
                },

                duration: {
                  type: "string",
                },

                reason: {
                  type: "string",
                },
              },

              required: [
                "name",
                "time",
                "location",
                "estimatedCost",
                "duration",
                "reason",
              ],
            },
          },

          estimatedDayCost: {
            type: "number",
          },
        },

        required: [
          "day",
          "date",
          "activities",
          "estimatedDayCost",
        ],
      },
    },

    estimatedTotalCost: {
      type: "number",
    },
  },

  required: [
    "days",
    "estimatedTotalCost",
  ],
};


// ======================================================
// Helper: Check Trip Authorization
// ======================================================

const checkTripAccess = (trip, userId) => {
  const isCreator =
    trip.creator.toString() ===
    userId.toString();

  const isMember =
    Array.isArray(trip.members) &&
    trip.members.some(
      (member) =>
        member.user &&
        member.user.toString() ===
          userId.toString()
    );

  return isCreator || isMember;
};


// ======================================================
// Generate AI Itinerary
// ======================================================

const generateItinerary = async (req, res) => {
  try {
    const { tripId } = req.body;

    // --------------------------------------------------
    // Validate Trip ID
    // --------------------------------------------------

    if (!tripId) {
      return res.status(400).json({
        message: "Trip ID is required",
      });
    }

    // --------------------------------------------------
    // Find Trip
    // --------------------------------------------------

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    // --------------------------------------------------
    // Authorization
    // --------------------------------------------------

    const hasAccess =
      checkTripAccess(
        trip,
        req.user._id
      );

    if (!hasAccess) {
      return res.status(403).json({
        message:
          "Not authorized to generate itinerary for this trip",
      });
    }

    // --------------------------------------------------
    // Gemini API Key Check
    // --------------------------------------------------

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message:
          "Gemini API key is not configured",
      });
    }

    // --------------------------------------------------
    // Gemini SDK
    // --------------------------------------------------

    const { GoogleGenAI } = await import(
      "@google/genai"
    );

    const ai = new GoogleGenAI({
      apiKey:
        process.env.GEMINI_API_KEY,
    });

    // --------------------------------------------------
    // Prepare Member Preferences
    // --------------------------------------------------

    const memberPreferences =
      Array.isArray(trip.members)
        ? trip.members.map(
            (member) => ({
              name: member.name,
              ageGroup:
                member.ageGroup,
              interests:
                member.interests,
              food: member.food,
              walking:
                member.walking,
            })
          )
        : [];

    // --------------------------------------------------
    // Dates
    // --------------------------------------------------

    const startDate =
      new Date(
        trip.startDate
      )
        .toISOString()
        .split("T")[0];

    const endDate =
      new Date(
        trip.endDate
      )
        .toISOString()
        .split("T")[0];

    // --------------------------------------------------
    // Prompt
    // --------------------------------------------------

    const prompt = `
You are the AI travel planner inside an application called TripSync.

Generate a practical and realistic day-wise travel itinerary.

TRIP DETAILS

Destination:
${trip.destination}

Start Date:
${startDate}

End Date:
${endDate}

Trip Type:
${trip.tripType}

Number of Travellers:
${trip.travellers}

Maximum Total Budget:
INR ${trip.budget}


GENERAL TRIP PREFERENCES

Interests:
${
  trip.preferences?.interests?.length
    ? trip.preferences.interests.join(", ")
    : "No specific preference"
}

Food Preference:
${trip.preferences?.food || "No preference"}

Walking Level:
${trip.preferences?.walking || "No preference"}

Travel Style:
${trip.preferences?.travelStyle || "balanced"}


MEMBER PREFERENCES

${JSON.stringify(
  memberPreferences,
  null,
  2
)}


PLANNING RULES

1. Create exactly one itinerary day for every date from the start date to the end date.

2. Keep the total estimated itinerary cost reasonably within INR ${trip.budget}.

3. Consider all traveller and member preferences.

4. If senior citizens are present, avoid excessive walking and physically demanding activities.

5. If children are present, include suitable family-friendly activities.

6. Respect food preferences.

7. If walking level is low, reduce long walking-heavy activities.

8. If travel style is relaxed, do not overload the day.

9. Keep geographically nearby activities together when practical.

10. Give realistic activity timings.

11. estimatedCost must always be a numeric value in INR.

12. estimatedDayCost must represent the approximate total cost of that day.

13. estimatedTotalCost must represent the approximate total itinerary cost.

14. Costs are estimates only.

15. Do not invent exact live ticket prices, hotel availability, weather, or transport schedules.

16. Give a short reason explaining why each activity fits this trip.

17. Activity locations should be specific enough to later show on a map.

18. Return the complete itinerary.

Return only data matching the required JSON structure.
`;

    // --------------------------------------------------
    // Gemini Call
    // --------------------------------------------------

    const response =
      await callGeminiWithFallback(
        ai,
        prompt,
        itineraryResponseSchema
      );

    if (!response?.text) {
      throw new Error(
        "Gemini returned an empty response"
      );
    }

    // --------------------------------------------------
    // Parse JSON
    // --------------------------------------------------

    let generatedData;

    try {
      generatedData =
        JSON.parse(
          response.text
        );
    } catch (parseError) {
      console.error(
        "Gemini JSON parse error:",
        response.text
      );

      return res.status(500).json({
        message:
          "AI returned invalid itinerary data",
      });
    }

    // --------------------------------------------------
    // Validate AI Response
    // --------------------------------------------------

    if (
      !generatedData ||
      !Array.isArray(
        generatedData.days
      ) ||
      generatedData.days.length === 0
    ) {
      return res.status(500).json({
        message:
          "AI generated an invalid itinerary",
      });
    }

    if (
      typeof generatedData
        .estimatedTotalCost !==
      "number"
    ) {
      return res.status(500).json({
        message:
          "AI generated an invalid total cost",
      });
    }

    // --------------------------------------------------
    // Save / Update MongoDB
    // --------------------------------------------------

    const itinerary =
      await Itinerary.findOneAndUpdate(
        {
          tripId: trip._id,
        },

        {
          tripId: trip._id,

          days:
            generatedData.days,

          estimatedTotalCost:
            generatedData
              .estimatedTotalCost,

          aiGenerated: true,
        },

        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    // --------------------------------------------------
    // Success
    // --------------------------------------------------

    return res.status(200).json({
      message:
        "AI itinerary generated successfully",

      itinerary,
    });
  } catch (error) {
    console.error(
      "Generate itinerary error:",
      error
    );

    const errorMessage =
      error?.message || "";

    const isTemporaryGeminiError =
      errorMessage.includes("503") ||
      errorMessage.includes(
        "UNAVAILABLE"
      ) ||
      errorMessage.includes(
        "high demand"
      ) ||
      errorMessage.includes("429") ||
      errorMessage.includes(
        "RESOURCE_EXHAUSTED"
      );

    if (
      isTemporaryGeminiError
    ) {
      return res.status(503).json({
        message:
          "AI service is temporarily busy. Please try again in a moment.",
      });
    }

    return res.status(500).json({
      message:
        "Failed to generate itinerary",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};


// ======================================================
// Re-plan Existing Itinerary
// ======================================================

const replanItinerary = async (req, res) => {
  try {
    const {
      tripId,
      instruction,
    } = req.body;

    // --------------------------------------------------
    // Validation
    // --------------------------------------------------

    if (
      !tripId ||
      !instruction ||
      !instruction.trim()
    ) {
      return res.status(400).json({
        message:
          "Trip ID and instruction are required",
      });
    }

    // --------------------------------------------------
    // Find Trip
    // --------------------------------------------------

    const trip =
      await Trip.findById(
        tripId
      );

    if (!trip) {
      return res.status(404).json({
        message:
          "Trip not found",
      });
    }

    // --------------------------------------------------
    // Authorization
    // --------------------------------------------------

    const hasAccess =
      checkTripAccess(
        trip,
        req.user._id
      );

    if (!hasAccess) {
      return res.status(403).json({
        message:
          "Not authorized to re-plan this trip",
      });
    }

    // --------------------------------------------------
    // Existing Itinerary
    // --------------------------------------------------

    const existingItinerary =
      await Itinerary.findOne({
        tripId: trip._id,
      });

    if (!existingItinerary) {
      return res.status(404).json({
        message:
          "Generate an itinerary first before re-planning",
      });
    }

    // --------------------------------------------------
    // Gemini API Key Check
    // --------------------------------------------------

    if (
      !process.env.GEMINI_API_KEY
    ) {
      return res.status(500).json({
        message:
          "Gemini API key is not configured",
      });
    }

    // --------------------------------------------------
    // Gemini SDK
    // --------------------------------------------------

    const { GoogleGenAI } =
      await import(
        "@google/genai"
      );

    const ai =
      new GoogleGenAI({
        apiKey:
          process.env
            .GEMINI_API_KEY,
      });

    // --------------------------------------------------
    // Member Preferences
    // --------------------------------------------------

    const memberPreferences =
      Array.isArray(trip.members)
        ? trip.members.map(
            (member) => ({
              name:
                member.name,

              ageGroup:
                member.ageGroup,

              interests:
                member.interests,

              food:
                member.food,

              walking:
                member.walking,
            })
          )
        : [];

    // --------------------------------------------------
    // Dates
    // --------------------------------------------------

    const startDate =
      new Date(
        trip.startDate
      )
        .toISOString()
        .split("T")[0];

    const endDate =
      new Date(
        trip.endDate
      )
        .toISOString()
        .split("T")[0];

    // --------------------------------------------------
    // Re-plan Prompt
    // --------------------------------------------------

    const prompt = `
You are the AI dynamic travel re-planning engine inside TripSync.

The user already has a saved itinerary.

Your job is to modify the existing itinerary according to the user's new request.

Do not create a completely unrelated trip.

Preserve existing activities whenever they do not need to change.


TRIP DETAILS

Destination:
${trip.destination}

Start Date:
${startDate}

End Date:
${endDate}

Trip Type:
${trip.tripType}

Number of Travellers:
${trip.travellers}

Current Total Budget:
INR ${trip.budget}


GENERAL PREFERENCES

Interests:
${
  trip.preferences?.interests?.length
    ? trip.preferences.interests.join(", ")
    : "No preference"
}

Food Preference:
${trip.preferences?.food || "No preference"}

Walking Level:
${trip.preferences?.walking || "No preference"}

Travel Style:
${trip.preferences?.travelStyle || "balanced"}


MEMBER DETAILS

${JSON.stringify(
  memberPreferences,
  null,
  2
)}


CURRENT ITINERARY

${JSON.stringify(
  existingItinerary.days,
  null,
  2
)}


CURRENT ESTIMATED ITINERARY COST

INR ${
      existingItinerary
        .estimatedTotalCost
    }


USER'S NEW REQUEST

${instruction.trim()}


RE-PLANNING RULES

1. Modify the itinerary according to the user's new request.

2. Return the COMPLETE updated itinerary, not only the changed activity or day.

3. Preserve activities that do not need modification.

4. Keep exactly one itinerary day for every date between ${startDate} and ${endDate}.

5. Respect the current maximum total budget of INR ${trip.budget}.

6. Respect member age groups, interests, food preferences and walking limitations.

7. Senior citizens should not be given excessive walking or physically demanding activities.

8. Keep children's activities family-friendly when children are present.

9. Keep activity timings realistic.

10. Keep geographically nearby places together when practical.

11. Avoid unnecessary long-distance travel between consecutive activities.

12. estimatedCost must always be a numeric INR value.

13. estimatedDayCost must represent the approximate cost of that day.

14. estimatedTotalCost must represent the approximate cost of the complete updated itinerary.

15. Costs are estimates only.

16. Do not invent exact live ticket prices, hotel availability, current weather, or transport schedules.

17. Only make unrelated changes if they are necessary to keep the updated itinerary practical.

18. The reason field should briefly explain why that activity now fits the updated trip.

Return only data matching the required JSON structure.
`;

    // --------------------------------------------------
    // Gemini Call with Retry + Fallback
    // --------------------------------------------------

    const response =
      await callGeminiWithFallback(
        ai,
        prompt,
        itineraryResponseSchema
      );

    if (!response?.text) {
      throw new Error(
        "Gemini returned an empty response"
      );
    }

    // --------------------------------------------------
    // Parse Response
    // --------------------------------------------------

    let updatedData;

    try {
      updatedData =
        JSON.parse(
          response.text
        );
    } catch (parseError) {
      console.error(
        "Gemini re-plan JSON parse error:",
        response.text
      );

      return res.status(500).json({
        message:
          "AI returned invalid re-plan data",
      });
    }

    // --------------------------------------------------
    // Validate AI Output
    // --------------------------------------------------

    if (
      !updatedData ||
      !Array.isArray(
        updatedData.days
      ) ||
      updatedData.days.length === 0
    ) {
      return res.status(500).json({
        message:
          "AI returned an invalid itinerary",
      });
    }

    if (
      typeof updatedData
        .estimatedTotalCost !==
      "number"
    ) {
      return res.status(500).json({
        message:
          "AI returned an invalid estimated total cost",
      });
    }

    // --------------------------------------------------
    // Update Saved Itinerary
    // --------------------------------------------------

    existingItinerary.days =
      updatedData.days;

    existingItinerary
      .estimatedTotalCost =
      updatedData
        .estimatedTotalCost;

    existingItinerary
      .aiGenerated = true;

    // --------------------------------------------------
    // Save Re-plan History
    // --------------------------------------------------

    if (
      !Array.isArray(
        existingItinerary
          .replanHistory
      )
    ) {
      existingItinerary
        .replanHistory = [];
    }

    existingItinerary
      .replanHistory.push({
        instruction:
          instruction.trim(),

        replannedAt:
          new Date(),
      });

    // --------------------------------------------------
    // Save MongoDB
    // --------------------------------------------------

    await existingItinerary.save();

    // --------------------------------------------------
    // Success
    // --------------------------------------------------

    return res.status(200).json({
      message:
        "Itinerary re-planned successfully",

      instruction:
        instruction.trim(),

      itinerary:
        existingItinerary,
    });
  } catch (error) {
    console.error(
      "Re-plan itinerary error:",
      error
    );

    const errorMessage =
      error?.message || "";

    const isTemporaryGeminiError =
      errorMessage.includes("503") ||
      errorMessage.includes(
        "UNAVAILABLE"
      ) ||
      errorMessage.includes(
        "high demand"
      ) ||
      errorMessage.includes("429") ||
      errorMessage.includes(
        "RESOURCE_EXHAUSTED"
      );

    if (
      isTemporaryGeminiError
    ) {
      return res.status(503).json({
        message:
          "AI service is temporarily busy. Please try again in a moment.",
      });
    }

    return res.status(500).json({
      message:
        "Failed to re-plan itinerary",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  generateItinerary,
  replanItinerary,
};