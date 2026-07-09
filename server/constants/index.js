export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write'
};

export const AI_ACTIONS = {
  SUMMARIZE: 'summarize',
  TRANSLATE: 'translate',
  IMPROVE: 'improve',
  CHANGE_TONE: 'change-tone',
  FIX_GRAMMAR: 'fix-grammar',
  CONTINUE_WRITING: 'continue-writing',
  GENERATE_TITLE: 'generate-title',
  EXPLAIN_TEXT: 'explain-text',
  BRAINSTORM_IDEAS: 'brainstorm-ideas'
};

export const DEFAULT_WORKSPACE_ICON = '💼';
export const DEFAULT_DOCUMENT_EMOJI = '📄';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
};
