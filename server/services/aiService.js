import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API Client
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

// Retry helper function
const retryWithDelay = async (fn, retries = 2, delayMs = 1000) => {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    console.warn(`[AI Service] API request failed. Retrying in ${delayMs}ms... (Retries left: ${retries})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryWithDelay(fn, retries - 1, delayMs * 1.5);
  }
};

// Timeout wrapper
const withTimeout = (promise, timeoutMs = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI Request timed out')), timeoutMs)
    )
  ]);
};

// Formatting instructions to guarantee clean HTML rendering in TipTap
const FORMAT_INSTRUCTION = `
IMPORTANT FORMATTING RULES:
1. Output your response as valid, clean HTML tags ONLY (e.g. <p>, <ul>, <ol>, <li>, <h3>, <h4>, <strong>, <em>, <pre><code>).
2. Do NOT wrap your output in markdown syntax code blocks (do not use \`\`\`html or \`\`\`). Return the raw HTML string directly.
3. Preserve all paragraph breaks, lists, headings, and formatting structures.
`;

// Main AI execution function
const generateAIResponse = async (prompt, modelName = 'gemini-1.5-flash') => {
  const genAI = getGenAIClient();
  
  // Fallback simulator for local developers without active API keys
  if (!genAI) {
    console.info('[AI Service] GEMINI_API_KEY is not configured. Running simulation mode.');
    // Return mock HTML matching prompt structure
    return `<p><strong>[SIMULATED AI RESPONSE - Configure GEMINI_API_KEY inside server/.env to resolve]</strong></p>
    <p>Based on your prompt instructions, here is a structured layout:</p>
    <ul>
      <li><strong>Input snippet:</strong> <em>"${prompt.slice(0, 100).replace(/[<>&"]/g, '')}..."</em></li>
      <li>CRDT algorithms resolve concurrent ProseMirror changes automatically.</li>
      <li>Gemini API facilitates summarizes, rewrites, and translations.</li>
    </ul>`;
  }

  const model = genAI.getGenerativeModel({ model: modelName });

  const executeCall = async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  };

  // Run with retry logic and timeout wrapper
  return withTimeout(retryWithDelay(executeCall, 2, 1000), 15000);
};

/**
 * 1. Summarize Text
 */
export const summarizeText = async (text) => {
  const prompt = `Summarize the following text clearly, concisely, and objectively. Maintain the key facts and represent the output in neat paragraphs or bullet points:\n\n"${text}"\n${FORMAT_INSTRUCTION}`;
  return generateAIResponse(prompt);
};

/**
 * 2. Rewrite Text / Tone Styles
 */
export const rewriteText = async (text, style = 'professional') => {
  let styleInstruction = '';
  switch (style) {
    case 'academic':
      styleInstruction = 'Rewrite the following text in an academic style (scholarly, formal, objective, using precise terminology and scholarly framing).';
      break;
    case 'professional':
      styleInstruction = 'Rewrite the following text in a professional business style (clear, polished, polite, and corporate).';
      break;
    case 'casual':
      styleInstruction = 'Rewrite the following text in a casual style (friendly, warm, conversational, and natural).';
      break;
    case 'technical':
      styleInstruction = 'Rewrite the following text in a technical style (clear, structured, precise, objective, and developer-friendly).';
      break;
    case 'creative':
      styleInstruction = 'Rewrite the following text in a creative style (expressive, engaging, descriptive, and vivid).';
      break;
    case 'grammar':
      styleInstruction = 'Correct any spelling, grammar, and punctuation mistakes in the following text, keeping the original wording and layout as closely as possible.';
      break;
    case 'improve':
    default:
      styleInstruction = 'Improve the general writing flow, clarity, structure, and coherence of the following text.';
      break;
  }

  const prompt = `${styleInstruction}\n\nText: "${text}"\n${FORMAT_INSTRUCTION}`;
  return generateAIResponse(prompt);
};

/**
 * 3. Continue Writing
 */
export const continueWriting = async (text) => {
  const prompt = `Continue writing the following text naturally, matching its vocabulary, tone, and formatting style. Return only the continued part (do not repeat the original context text):\n\n"${text}"\n${FORMAT_INSTRUCTION}`;
  return generateAIResponse(prompt);
};

/**
 * 4. Translate Text
 */
export const translateText = async (text, language) => {
  const prompt = `Translate the following text into ${language}. Maintain the exact original paragraph structures, formatting, and style. Output only the translated content:\n\n"${text}"\n${FORMAT_INSTRUCTION}`;
  return generateAIResponse(prompt);
};

/**
 * 5. Brainstorm Ideas
 */
export const brainstormIdeas = async (topic) => {
  const prompt = `Brainstorm a list of creative ideas, outlines, or suggestions related to the topic: "${topic}". Structure the response in a readable outline with bullet points:\n${FORMAT_INSTRUCTION}`;
  return generateAIResponse(prompt);
};
