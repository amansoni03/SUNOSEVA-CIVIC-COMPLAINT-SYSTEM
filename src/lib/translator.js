/**
 * Translation Utility for SunoSeva
 * Support: Gemini AI (Primary) & Google Translate GTX (Fallback)
 */

export const translateText = async (text, targetLang = 'en') => {
  if (!text) return { translatedText: '', detectedLanguage: '' };

  // Normalize language code (e.g. 'en-US' -> 'en')
  const normalizedTarget = targetLang.split('-')[0];
  
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  // --- Path 1: Gemini AI (If API Key is available) ---
  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Translate this citizen civic complaint into exactly this language: ${normalizedTarget}. 
                Maintain the original emotion and urgency. 
                Only return the translated text. Do not add any greetings or explanations.
                
                Complaint: "${text}"`
              }]
            }],
            generationConfig: {
              temperature: 0.1,
              topK: 1,
              topP: 1,
              maxOutputTokens: 1000,
            }
          })
        }
      );

      const data = await response.json();
      const translated = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (translated) {
        return {
          translatedText: translated.trim(),
          detectedLanguage: 'AI Detected',
          engine: 'Gemini'
        };
      }
    } catch (err) {
      console.error("Gemini Translation Error:", err);
      // Fall through to Google Translate fallback
    }
  }

  // --- Path 2: Google Translate GTX (Fallback or Default) ---
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${normalizedTarget}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data && data[0]) {
      const translatedText = data[0].map(segment => segment[0]).join('');
      return {
        translatedText,
        detectedLanguage: data[2],
        engine: 'Google'
      };
    }
    
    throw new Error("Google Translation failed");
  } catch (err) {
    console.error("Final Translation Fallback Error:", err);
    return { translatedText: text, error: true };
  }
};
