import * as aiService from '../services/aiService.js';

// Input size check helper (Max 10000 characters to prevent API exploitation)
const MAX_CHAR_LIMIT = 10000;

const validateInput = (text, res) => {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    res.status(400);
    throw new Error('Input text/prompt is required and must be a string');
  }

  if (text.length > MAX_CHAR_LIMIT) {
    res.status(400);
    throw new Error(`Input text exceeds maximum allowed limit of ${MAX_CHAR_LIMIT} characters`);
  }
};

/**
 * @desc    Summarize text
 * @route   POST /api/ai/summarize
 * @access  Private
 */
export const summarize = async (req, res, next) => {
  try {
    const { text } = req.body;
    validateInput(text, res);

    const summary = await aiService.summarizeText(text.trim());
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Rewrite or change tone of text
 * @route   POST /api/ai/rewrite
 * @access  Private
 */
export const rewrite = async (req, res, next) => {
  try {
    const { text, tone } = req.body;
    validateInput(text, res);

    const allowedTones = ['academic', 'professional', 'casual', 'technical', 'creative', 'grammar', 'improve'];
    const selectedTone = tone && allowedTones.includes(tone) ? tone : 'improve';

    const rewritten = await aiService.rewriteText(text.trim(), selectedTone);
    res.status(200).json({
      success: true,
      data: rewritten
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Continue writing text
 * @route   POST /api/ai/continue
 * @access  Private
 */
export const continueDoc = async (req, res, next) => {
  try {
    const { text } = req.body;
    validateInput(text, res);

    const continued = await aiService.continueWriting(text.trim());
    res.status(200).json({
      success: true,
      data: continued
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Translate text
 * @route   POST /api/ai/translate
 * @access  Private
 */
export const translate = async (req, res, next) => {
  try {
    const { text, language } = req.body;
    validateInput(text, res);

    if (!language || typeof language !== 'string' || language.trim() === '') {
      res.status(400);
      return next(new Error('Target language is required'));
    }

    const translated = await aiService.translateText(text.trim(), language.trim());
    res.status(200).json({
      success: true,
      data: translated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Brainstorm ideas
 * @route   POST /api/ai/brainstorm
 * @access  Private
 */
export const brainstorm = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    validateInput(prompt, res);

    const brainstormed = await aiService.brainstormIdeas(prompt.trim());
    res.status(200).json({
      success: true,
      data: brainstormed
    });
  } catch (error) {
    next(error);
  }
};
