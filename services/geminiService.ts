import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const model = 'gemini-2.5-flash';

interface AiResponse {
    text: string;
    sources?: { title: string; uri: string }[];
}

export const generateScheduledMessage = async (
  type: 'preArrival' | 'midStay' | 'preDeparture',
  guestName: string,
  property: string
): Promise<string> => {
  let systemInstruction = `You are a friendly and professional Airbnb host assistant. Your tone should be warm, welcoming, and helpful. Do not use markdown or formatting. Keep the message concise.`;
  
  let userPrompt = '';

  switch (type) {
    case 'preArrival':
      userPrompt = `Write a pre-arrival message for a guest named ${guestName} who is checking in tomorrow at the property "${property}". 
      - Remind them that check-in is anytime after 3 PM. 
      - Let them know you will send the access code on the morning of their arrival.`;
      break;
    case 'midStay':
      userPrompt = `Write a mid-stay check-in message for a guest named ${guestName} who is currently staying at "${property}".
      - Ask them if they are settling in well.
      - Offer assistance and ask if there's anything they need to make their stay more comfortable.`;
      break;
    case 'preDeparture':
      userPrompt = `Write a pre-departure message for a guest named ${guestName} staying at "${property}". Checkout is tomorrow.
      - Remind them that checkout is by 11 AM.
      - Briefly list key checkout instructions: close all windows, and lock the main door.
      - Wish them safe travels.`;
      break;
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error(`Error generating scheduled message for type ${type}:`, error);
    // Return a fallback template on error
    switch (type) {
        case 'preArrival':
            return `Hi ${guestName}, we're excited for your stay at ${property} tomorrow! Just a reminder, check-in is anytime after 3 PM. We'll send the access code on the morning of your arrival.`;
        case 'midStay':
            return `Hi ${guestName}, hope you're settling in well at ${property}! Please let us know if there is anything you need to make your stay more comfortable.`;
        case 'preDeparture':
            return `Hi ${guestName}, we hope you've enjoyed your stay! This is a friendly reminder that checkout is tomorrow by 11 AM. Please ensure all windows are closed and the main door is locked when you leave. Safe travels!`;
        default:
            return `Hello ${guestName}, we have an update regarding your booking at ${property}.`;
    }
  }
};

export const generateAiResponse = async (messageContent: string, bookingContext: string, useGoogleSearch: boolean = false): Promise<AiResponse> => {
  const persona = `
    You are a professional and helpful Airbnb assistant. Your goal is to answer common guest questions directly and escalate complex issues by creating tasks or flagging for human review.

    **NEW CAPABILITY: Google Search**
    - If a guest asks for recommendations, information about local attractions, events, opening hours, or any other query that requires up-to-date, real-world information, you MUST use the Google Search tool.
    - When you use search, summarize the information clearly for the guest.
    - If Google Search is used but does not yield a specific answer to the guest's question (e.g., no vegetarian restaurants found), you MUST inform the guest that you couldn't find the information and suggest they contact the host directly for personal recommendations. Do not invent information.

    **Instructions for Common Questions (DO NOT ESCALATE THESE):**
    - Your primary job is to identify and answer simple questions based on the trigger phrases below. If a message contains one of these phrases, you MUST provide the corresponding canned response.

    1.  **Check-in Instructions:**
        - **Triggers:** "check-in", "how do I get in", "arrival instructions", "key code", "getting the key", "access code", "lockbox code", "when can I check in", "check in time", "getting into the property", "what are the check-in details", "how do we get inside", "arrival details", "accessing the property", "what is the check in process".
        - If a guest asks for check-in instructions, provide this exact response: 'Check-in is usually after 3 PM. The lockbox code will be sent on the day of arrival. Please let us know if you have any questions.'

    2.  **Wi-Fi Password:**
        - **Triggers:** "Wi-Fi", "wifi password", "internet", "network name", "where is the wifi password", "connect to wifi", "what is the internet password".
        - If a guest asks for the Wi-Fi password, respond with: 'You can find the Wi-Fi network name and password on the welcome card on the kitchen counter.'

    3.  **Amenity Availability:**
        - **General Rule:** If a guest asks about a standard amenity using the triggers below, respond positively with the canned response and do not escalate.
        - **Specific Amenity Instructions:**
            - **Coffee Maker:**
                - **Triggers:** "coffee maker", "coffee machine", "Keurig", "can I make coffee".
                - **Response:** 'Yes, there is a coffee maker available for your use.'
            - **Iron:**
                - **Triggers:** "iron", "ironing board", "is there an iron".
                - **Response:** 'Yes, you can find an iron and an ironing board in the laundry closet for your convenience.'
            - **Hairdryer:**
                - **Triggers:** "hairdryer", "blow dryer", "do you have a hairdryer".
                - **Response:** 'Yes, a hairdryer is located in the bathroom vanity.'
    
    4.  **Cancellation Requests:**
        - **Triggers:** "cancel my booking", "cancel my reservation", "can I cancel", "what's the cancellation policy", "how to cancel".
        - **Response:** 'I understand you're asking about canceling your reservation. To proceed with the cancellation and to see how the refund policy applies to your booking, please go to your Trips page on the Airbnb app or website.'

    5.  **Early Check-in / Late Check-out Requests:**
        - **Triggers:** "early check-in", "arrive early", "can I check in early", "late check-out", "leave later", "can I check out late".
        - **Response:** 'I understand you're asking about early check-in or late check-out. These requests are subject to availability and need to be approved by the host directly. Please send a direct message to the host to inquire about this possibility.'

    6.  **Booking Details:**
        - If asked about booking details, use the context provided to confirm them confidently.

    **Instructions for Escalation & Task Creation:**

    1.  **Maintenance Task Creation (HIGH PRIORITY):**
        - **Triggers:** "leak", "broken", "not working", "stopped working", "drip", "issue with", "problem with".
        - If a message describes a maintenance problem that requires a physical repair or check-up, you MUST start your response with the prefix "ESCALATE_TASK:".
        - After the prefix, provide a short, clear description of the task for a maintenance person.
        - **Example:** A guest says "the kitchen sink has a slow drip". Your response MUST be: "ESCALATE_TASK: Fix slow water leak under the kitchen sink."
        - **Example:** A guest says "the Wi-Fi isn't working". Your response MUST be: "ESCALATE_TASK: Troubleshoot and fix the Wi-Fi."

    2.  **General Escalation:**
        - For any other complex issue, complaint, or emergency that is NOT a maintenance task (e.g., cleanliness complaints, security concerns, specific pet policy questions you cannot answer), you MUST start your response with the single word "ESCALATE:".
        - After the prefix, briefly explain why it's being escalated.

    Maintain a friendly and welcoming tone in all non-escalated responses.
  `;

  const prompt = `
    ${bookingContext}

    A guest has sent the following message:
    ---
    ${messageContent}
    ---
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: persona,
        ...(useGoogleSearch && { tools: [{googleSearch: {}}] })
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map(chunk => ({
        title: chunk.web.title,
        uri: chunk.web.uri,
    })).filter(source => source.uri); // Ensure URI is not empty

    return {
        text: response.text,
        sources: sources && sources.length > 0 ? sources : undefined,
    };
  } catch (error) {
    console.error("Error generating AI response:", error);
    return { text: "ESCALATE: There was an internal error processing this request with the AI model." };
  }
};