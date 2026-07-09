import { Mark, mergeAttributes } from '@tiptap/core';
import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Heading1, Heading2, Heading3, List, ListOrdered, 
  Quote, Code, Minus, Undo, Redo, CloudOff, CloudCheck,
  Sparkles, Loader, RefreshCw, CheckCircle, Trash2, X, History,
  MessageSquare
} from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import CommentBubble from '../CommentBubble.jsx';

// Custom ProseMirror / TipTap Mark to highlight comments and hold database references
const CommentMark = Mark.create({
  name: 'comment',

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => {
          if (!attributes.commentId) return {};
          return { 
            'data-comment-id': attributes.commentId, 
            class: 'bg-yellow-100 dark:bg-yellow-500/25 border-b-2 border-yellow-400 cursor-pointer select-text' 
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

const CollabEditor = ({ 
  documentId, 
  readOnly = false, 
  onHighlightClick, 
  onCommentCreated, 
  allowViewerComments = false,
  previewVersion = null
}) => {
  const { user } = useAuth();
  const { socket, connected, joinDocument, leaveDocument } = useSocket();
  const { showToast } = useToast();
  
  const isPreview = !!previewVersion;
  const isEditable = !readOnly && !isPreview;
  
  // Custom Comment bubble trigger
  const [commentBubbleOpen, setCommentBubbleOpen] = useState(false);
  
  // Custom Slash command menu states
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const [slashCoords, setSlashCoords] = useState({ top: 0, left: 0 });

  // Custom Bubble selection menu states
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [bubbleCoords, setBubbleCoords] = useState({ top: 0, left: 0 });

  // AI Writing Assistant states
  const [aiState, setAiState] = useState(null); // null | 'menu' | 'loading' | 'result' | 'error'
  const [aiAction, setAiAction] = useState(null); // 'summarize' | 'rewrite' | 'continue' | 'translate' | 'brainstorm'
  const [aiTone, setAiTone] = useState(null); // rewrite option
  const [aiLanguage, setAiLanguage] = useState(null); // translate option
  const [aiContextType, setAiContextType] = useState('paragraph'); // 'selection' | 'paragraph' | 'document'
  const [aiInputText, setAiInputText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiHistory, setAiHistory] = useState([]); // Keep last 10 operations

  // 1. Maintain stable Y.Doc and Yjs Awareness instances for this session
  const ydocRef = useRef(null);
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }
  const ydoc = ydocRef.current;

  const awarenessRef = useRef(null);
  if (!awarenessRef.current) {
    awarenessRef.current = new awarenessProtocol.Awareness(ydoc);
  }
  const awareness = awarenessRef.current;

  // 2. Assign a random distinct color for local cursor presence
  const colors = [
    '#f783ac', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', 
    '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'
  ];
  const randomColor = useRef(colors[Math.floor(Math.random() * colors.length)]).current;

  // Slash commands definitions (including the new Advanced AI Slash Commands)
  const slashCommands = [
    { label: 'Heading 1', desc: 'Large section heading', action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Heading 2', desc: 'Medium section heading', action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Heading 3', desc: 'Small section heading', action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Bullet List', desc: 'Create a simple bulleted list', action: (editor) => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered List', desc: 'Create a list with numbering', action: (editor) => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Quote', desc: 'Capture a blockquote text', action: (editor) => editor.chain().focus().toggleBlockquote().run() },
    { label: 'Code Block', desc: 'Insert preformatted code block', action: (editor) => editor.chain().focus().toggleCodeBlock().run() },
    { label: 'Divider', desc: 'Insert a horizontal line divider', action: (editor) => editor.chain().focus().setHorizontalRule().run() },
    
    // AI Commands
    { label: '🤖 AI Summarize', desc: 'Summarize target text context', action: (editor) => triggerAISlashCommand('summarize') },
    { label: '🤖 AI Rewrite / Tone', desc: 'Change style tone of text', action: (editor) => triggerAISlashCommand('rewrite') },
    { label: '🤖 AI Continue Writing', desc: 'Autocomplete content flow', action: (editor) => triggerAISlashCommand('continue') },
    { label: '🤖 AI Translate', desc: 'Translate selected content', action: (editor) => triggerAISlashCommand('translate') },
    { label: '🤖 AI Brainstorm', desc: 'Generate ideas based on text', action: (editor) => triggerAISlashCommand('brainstorm') }
  ];

  // Initialize TipTap Editor with Collaboration & CollaborationCursor Extensions
  const editor = useEditor({
    editable: isEditable,
    content: isPreview ? previewVersion.content : undefined,
    extensions: isPreview ? [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: "Viewing historical version (Read-Only)..."
      }),
      CommentMark
    ] : [
      StarterKit.configure({
        history: false
      }),
      Underline,
      Placeholder.configure({
        placeholder: readOnly ? "" : "Type '/' for formatting commands...",
        emptyNodeClass: 'my-custom-placeholder-class',
      }),
      Collaboration.configure({
        document: ydoc,
        field: 'default'
      }),
      CollaborationCursor.configure({
        awareness,
        user: {
          name: user?.fullName || 'Collaborator',
          color: randomColor
        }
      }),
      CommentMark
    ],
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[500px] text-sm leading-relaxed pb-24 text-notion-text-light dark:text-notion-text-dark',
      },
      handleClick: (view, pos, event) => {
        const node = view.state.doc.nodeAt(pos);
        if (node) {
          const commentMark = node.marks.find(m => m.type.name === 'comment');
          if (commentMark && commentMark.attrs.commentId && onHighlightClick) {
            onHighlightClick(commentMark.attrs.commentId);
          }
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        if (readOnly) return true;
        if (commentBubbleOpen && event.key === 'Escape') {
          setCommentBubbleOpen(false);
          return true;
        }
        if (slashMenuOpen) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSlashMenuIndex((prev) => (prev + 1) % slashCommands.length);
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSlashMenuIndex((prev) => (prev - 1 + slashCommands.length) % slashCommands.length);
            return true;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            triggerSlashCommand(slashMenuIndex);
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setSlashMenuOpen(false);
            return true;
          }
        }
        return false;
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (readOnly) return;
      const { selection } = editor.state;
      if (selection && !selection.empty) {
        const coords = editor.view.coordsAtPos(selection.from);
        setBubbleCoords({
          top: coords.top + window.scrollY - 42,
          left: coords.left + window.scrollX
        });
        setBubbleOpen(true);
        // Automatically default context selector to 'selection' if text is highlighted
        setAiContextType('selection');
      } else {
        setBubbleOpen(false);
        setCommentBubbleOpen(false);
        if (aiState !== 'loading' && aiState !== 'result' && aiState !== 'error') {
          setAiState(null);
        }
      }
    },
    onUpdate: ({ editor }) => {
      if (readOnly) return;
      const { selection } = editor.state;
      const { $from } = selection;
      const textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset, null, ' ');

      if (textBefore === '/') {
        const coords = editor.view.coordsAtPos(selection.from);
        setSlashCoords({
          top: coords.bottom + window.scrollY,
          left: coords.left + window.scrollX
        });
        setSlashMenuOpen(true);
        setSlashMenuIndex(0);
      } else if (textBefore === ' ' || !textBefore) {
        setSlashMenuOpen(false);
      }
    }
  });

  // Dynamic Read-Only state update
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditable);
    }
  }, [readOnly, isPreview, editor]);

  // Apply selected slash command formatting
  const triggerSlashCommand = (index) => {
    if (!editor) return;
    const cmd = slashCommands[index];

    const { selection } = editor.state;
    editor.chain().focus().deleteRange({ from: selection.from - 1, to: selection.from }).run();
    cmd.action(editor);
    setSlashMenuOpen(false);
  };

  // Resolve active AI text context selection
  const getAIContextText = (contextType) => {
    if (!editor) return '';
    if (contextType === 'selection') {
      const { selection } = editor.state;
      return editor.state.doc.textBetween(selection.from, selection.to, ' ');
    }
    if (contextType === 'paragraph') {
      return editor.state.selection.$from.parent.textContent;
    }
    if (contextType === 'document') {
      return editor.getText();
    }
    return '';
  };

  // Trigger from slash commands list
  const triggerAISlashCommand = async (action) => {
    if (!editor) return;
    const { selection } = editor.state;
    const coords = editor.view.coordsAtPos(selection.from);
    
    setBubbleCoords({
      top: coords.bottom + window.scrollY + 10,
      left: coords.left + window.scrollX
    });
    setBubbleOpen(true);
    setAiContextType('paragraph'); // Default slash commands to current paragraph context
    setAiAction(action);
    
    // For parameterized actions, open parameters screen. Otherwise trigger directly.
    if (action === 'translate' || action === 'rewrite') {
      setAiState('menu');
    } else {
      const textContext = editor.state.selection.$from.parent.textContent;
      if (!textContext || !textContext.trim()) {
        showToast('Current paragraph context is empty', 'warning');
        setAiState('menu');
        return;
      }
      setAiInputText(textContext);
      setAiState('loading');
      await executeAICall(action, textContext, null);
    }
  };

  // AI Helper logic
  const handleAIRequest = async (action, option = null) => {
    const textContext = getAIContextText(aiContextType);

    if (!textContext || !textContext.trim()) {
      showToast('Text context is empty. Please verify selection, paragraph, or document contents.', 'warning');
      return;
    }

    if (textContext.length > 5000) {
      showToast('Context text is too long (max 5000 characters)', 'warning');
      return;
    }

    setAiAction(action);
    setAiInputText(textContext);
    setAiTone(action === 'rewrite' ? option : null);
    setAiLanguage(action === 'translate' ? option : null);
    setAiState('loading');

    await executeAICall(action, textContext, option);
  };

  const executeAICall = async (action, text, option) => {
    try {
      let endpoint = '';
      let payload = { text };

      if (action === 'summarize') endpoint = '/ai/summarize';
      else if (action === 'continue') endpoint = '/ai/continue';
      else if (action === 'rewrite') {
        endpoint = '/ai/rewrite';
        payload.tone = option;
      } else if (action === 'translate') {
        endpoint = '/ai/translate';
        payload.language = option;
      } else if (action === 'brainstorm') {
        endpoint = '/ai/brainstorm';
        payload.prompt = text;
      }

      const response = await api.post(endpoint, payload);
      if (response.success && response.data) {
        setAiResponse(response.data);
        setAiState('result');

        // Save successful operation to history
        const operation = {
          timestamp: Date.now(),
          action,
          inputText: text,
          outputText: response.data,
          option: option || ''
        };
        setAiHistory(prev => [operation, ...prev].slice(0, 10));
      } else {
        throw new Error(response.message || 'AI request failed');
      }
    } catch (err) {
      setAiState('error');
      showToast(err.message || 'AI response failed', 'error');
    }
  };

  const handleAIRetry = async () => {
    setAiState('loading');
    const option = aiAction === 'rewrite' ? aiTone : (aiAction === 'translate' ? aiLanguage : null);
    await executeAICall(aiAction, aiInputText, option);
  };

  const handleAIReplace = () => {
    if (!editor) return;
    editor.chain().focus().insertContent(aiResponse).run();
    closeAI();
    showToast('Replaced selection', 'success');
  };

  const handleAIInsertBelow = () => {
    if (!editor) return;
    const { selection } = editor.state;
    editor.chain().focus().insertContentAt(selection.to, `\n\n${aiResponse}`).run();
    closeAI();
    showToast('Inserted below', 'success');
  };

  const closeAI = () => {
    setAiState(null);
    setAiAction(null);
    setAiTone(null);
    setAiLanguage(null);
    setAiInputText('');
    setAiResponse('');
  };

  // Submit comment draft and set TipTap highlight mark
  const handleCommentSubmit = async (content) => {
    if (readOnly && !allowViewerComments) {
      showToast('Viewers are not permitted to comment on this document', 'error');
      return;
    }

    try {
      const res = await api.post(`/comments/${documentId}`, { content });
      if (res.success && res.data) {
        const commentId = res.data._id;
        
        // Overlapping Comment Support
        const hasMark = editor.state.doc.rangeHasMark(
          editor.state.selection.from, 
          editor.state.selection.to, 
          editor.schema.marks.comment
        );
        let commentIdString = commentId;

        if (hasMark) {
          let currentIds = [];
          editor.state.doc.nodesBetween(editor.state.selection.from, editor.state.selection.to, (node) => {
            const m = node.marks.find(mark => mark.type.name === 'comment');
            if (m && m.attrs.commentId) {
              currentIds.push(m.attrs.commentId);
            }
          });
          if (currentIds.length > 0) {
            const merged = Array.from(new Set([...currentIds.join(',').split(','), commentId])).filter(Boolean);
            commentIdString = merged.join(',');
          }
        }

        // Apply mark
        editor.chain().focus().setMark('comment', { commentId: commentIdString }).run();
        showToast('Comment added successfully', 'success');
        setCommentBubbleOpen(false);

        if (onCommentCreated) {
          onCommentCreated(commentId);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit comment', 'error');
    }
  };

  // Configure local user details inside awareness state field
  useEffect(() => {
    if (awareness && user) {
      awareness.setLocalStateField('user', {
        name: user.fullName,
        color: randomColor
      });
    }
  }, [awareness, user, randomColor]);

  // Connect document room session and vector syncing listeners
  useEffect(() => {
    if (isPreview) return;
    if (!socket || !connected || !documentId) return;

    joinDocument(documentId, ydoc.clientID);

    // Sync Vector triggers
    const handleSyncStep2 = ({ documentId: docId, update }) => {
      if (docId !== documentId) return;
      ydoc.transact(() => {
        Y.applyUpdate(ydoc, new Uint8Array(update));
      }, 'socket');
    };

    const handleRequestUpdates = ({ documentId: docId, stateVector }) => {
      if (docId !== documentId) return;
      const update = Y.encodeStateAsUpdate(ydoc, new Uint8Array(stateVector));
      socket.emit('yjs-sync-step-2', { documentId, update });
    };

    const handleUpdate = ({ documentId: docId, update }) => {
      if (docId !== documentId) return;
      ydoc.transact(() => {
        Y.applyUpdate(ydoc, new Uint8Array(update));
      }, 'socket');
    };

    // Awareness triggers
    const handleSocketAwarenessUpdate = ({ documentId: docId, update }) => {
      if (docId !== documentId) return;
      try {
        awarenessProtocol.applyAwarenessUpdate(awareness, new Uint8Array(update), 'socket');
      } catch (err) {
        console.error('[Yjs Client] Apply awareness error:', err.message);
      }
    };

    const handleSocketAwarenessRemove = ({ documentId: docId, clientIds }) => {
      if (docId !== documentId) return;
      try {
        awarenessProtocol.removeAwarenessStates(awareness, clientIds, 'socket');
      } catch (err) {
        console.error('[Yjs Client] Remove awareness error:', err.message);
      }
    };

    // Bind listeners
    socket.on('yjs-sync-step-2', handleSyncStep2);
    socket.on('yjs-request-updates', handleRequestUpdates);
    socket.on('yjs-update', handleUpdate);
    socket.on('yjs-awareness-update', handleSocketAwarenessUpdate);
    socket.on('yjs-awareness-remove', handleSocketAwarenessRemove);

    const handleLocalUpdate = (update, origin) => {
      if (origin !== 'socket') {
        socket.emit('yjs-update', { documentId, update });
      }
    };
    ydoc.on('update', handleLocalUpdate);

    const handleLocalAwarenessUpdate = ({ added, updated, removed }, origin) => {
      if (origin !== 'socket') {
        try {
          const update = awarenessProtocol.encodeAwarenessUpdate(awareness, [ydoc.clientID]);
          socket.emit('yjs-awareness-update', { documentId, update });
        } catch (err) {
          console.error('[Yjs Client] Encode awareness error:', err.message);
        }
      }
    };
    awareness.on('update', handleLocalAwarenessUpdate);

    // Request initial content sync step
    const stateVector = Y.encodeStateVector(ydoc);
    socket.emit('yjs-sync-step-1', { documentId, stateVector });

    return () => {
      leaveDocument(documentId);
      socket.off('yjs-sync-step-2', handleSyncStep2);
      socket.off('yjs-request-updates', handleRequestUpdates);
      socket.off('yjs-update', handleUpdate);
      socket.off('yjs-awareness-update', handleSocketAwarenessUpdate);
      socket.off('yjs-awareness-remove', handleSocketAwarenessRemove);
      ydoc.off('update', handleLocalUpdate);
      awareness.off('update', handleLocalAwarenessUpdate);
    };
  }, [socket, connected, documentId, ydoc, awareness]);

  // Clean Y.Doc resources on component destroy
  useEffect(() => {
    return () => {
      if (ydoc) {
        ydoc.destroy();
      }
    };
  }, [ydoc]);

  return (
    <div className="relative min-h-[500px]">
      {/* Save Status indicator bar */}
      <div className="absolute top-0 right-0 z-15 flex items-center gap-1.5 text-[10px] text-notion-text-mutedLight select-none">
        {connected ? (
          <span className="flex items-center gap-1 text-green-500/70 font-medium">
            <CloudCheck className="w-3.5 h-3.5 text-green-500" />
            Live Collaboration Active
          </span>
        ) : (
          <span className="flex items-center gap-1 text-red-500 font-medium">
            <CloudOff className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            Offline Mode
          </span>
        )}
      </div>

      {/* Manual Toolbar */}
      {!readOnly && (
        <div className="border-b border-notion-border-light dark:border-notion-border-dark pb-2 mb-4 flex flex-wrap gap-1 items-center select-none">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark ${editor?.isActive('bold') ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500' : ''}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark ${editor?.isActive('italic') ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500' : ''}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark ${editor?.isActive('underline') ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500' : ''}`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark ${editor?.isActive('strike') ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500' : ''}`}
            title="Strike"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-notion-border-light dark:bg-notion-border-dark mx-1"></span>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark ${editor?.isActive('heading', { level: 1 }) ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500' : ''}`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark ${editor?.isActive('heading', { level: 2 }) ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500' : ''}`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark ${editor?.isActive('heading', { level: 3 }) ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500' : ''}`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-notion-border-light dark:bg-notion-border-dark mx-1"></span>

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark ${editor?.isActive('bulletList') ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500' : ''}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark ${editor?.isActive('orderedList') ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500' : ''}`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark ${editor?.isActive('blockquote') ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500' : ''}`}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark ${editor?.isActive('codeBlock') ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500' : ''}`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-notion-border-light dark:bg-notion-border-dark mx-1"></span>

          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark"
            title="Divider line"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().undo().run()}
            className="p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            className="p-1.5 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Selection Bubble Menu & Nested AI Panel */}
      {bubbleOpen && !readOnly && (
        <div 
          className="absolute z-35 bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark shadow-md rounded-lg overflow-hidden flex flex-col p-1.5 select-none w-auto"
          style={{ 
            top: `${bubbleCoords.top - 120}px`,
            left: `${bubbleCoords.left}px`
          }}
        >
          {aiState === null ? (
            /* Basic Formatting + AI Spark option */
            <div className="flex divide-x divide-notion-border-light dark:divide-notion-border-dark items-center">
              <div className="flex">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`px-2 py-1 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-[11px] font-bold ${editor?.isActive('bold') ? 'text-blue-500' : ''}`}
                >
                  B
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`px-2 py-1 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-[11px] italic ${editor?.isActive('italic') ? 'text-blue-500' : ''}`}
                >
                  I
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={`px-2 py-1 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-[11px] underline ${editor?.isActive('underline') ? 'text-blue-500' : ''}`}
                >
                  U
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={`px-2 py-1 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-[11px] line-through ${editor?.isActive('strike') ? 'text-blue-500' : ''}`}
                >
                  S
                </button>
              </div>
              <button
                onClick={() => setAiState('menu')}
                className="px-2 py-1 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-[10px] text-purple-500 font-bold flex items-center gap-1 transition-colors pl-2"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                AI Assistant
              </button>
              {(!readOnly || allowViewerComments) && (
                <button
                  onClick={() => setCommentBubbleOpen(true)}
                  className="px-2 py-1 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-[10px] text-blue-500 font-bold flex items-center gap-1 transition-colors pl-2"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Comment
                </button>
              )}
            </div>
          ) : (
            /* Context Selector Header (drawn on all AI states except Loading/Results) */
            (aiState === 'menu') && (
              <div className="flex items-center gap-1.5 text-[9px] text-notion-text-mutedLight dark:text-notion-text-mutedDark border-b border-notion-border-light dark:border-notion-border-dark pb-1.5 mb-1.5 select-none pl-1">
                <span>Context:</span>
                <select 
                  value={aiContextType} 
                  onChange={(e) => setAiContextType(e.target.value)}
                  className="bg-notion-hover-light dark:bg-notion-hover-dark/40 px-1.5 py-0.5 rounded outline-none cursor-pointer border border-notion-border-light dark:border-notion-border-dark text-[9px]"
                >
                  <option value="paragraph">Current Paragraph</option>
                  <option value="document">Entire Document</option>
                  {editor && !editor.state.selection.empty && (
                    <option value="selection">Selection</option>
                  )}
                </select>
              </div>
            )
          )}

          {aiState === 'menu' && (
            /* Nested AI Assistant Menu with Style Prompt Templates */
            <div className="flex flex-col min-w-[170px] text-[10px] space-y-0.5 select-none">
              <div className="flex justify-between items-center px-2 py-1 border-b border-notion-border-light dark:border-notion-border-dark text-[9px] uppercase tracking-wider text-purple-500 font-bold">
                <span>Advanced AI Actions</span>
                <button onClick={closeAI} className="text-notion-text-mutedLight hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={() => handleAIRequest('summarize')}
                className="w-full text-left px-2 py-1.5 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark font-medium"
              >
                📝 Summarize Context
              </button>
              <button
                onClick={() => handleAIRequest('continue')}
                className="w-full text-left px-2 py-1.5 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark font-medium"
              >
                ✍️ Continue Writing
              </button>
              <button
                onClick={() => handleAIRequest('brainstorm')}
                className="w-full text-left px-2 py-1.5 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark font-medium"
              >
                💡 Brainstorm Ideas
              </button>
              <div className="border-t border-notion-border-light dark:border-notion-border-dark my-0.5" />
              
              {/* Rewrite Prompt Templates */}
              <div className="px-2 py-0.5 text-[8px] uppercase tracking-wider text-notion-text-mutedLight dark:text-notion-text-mutedDark">
                Rewrite Style templates:
              </div>
              <div className="grid grid-cols-2 gap-1 px-1.5 py-0.5">
                {[
                  { key: 'improve', label: '✨ Improve' },
                  { key: 'grammar', label: '✅ Grammar' },
                  { key: 'professional', label: '💼 Business' },
                  { key: 'academic', label: '🎓 Academic' },
                  { key: 'technical', label: '💻 Technical' },
                  { key: 'creative', label: '🎨 Creative' },
                  { key: 'casual', label: '💬 Casual' }
                ].map(style => (
                  <button
                    key={style.key}
                    onClick={() => handleAIRequest('rewrite', style.key)}
                    className="px-1.5 py-0.5 text-center bg-notion-hover-light dark:bg-notion-hover-dark hover:bg-purple-100 dark:hover:bg-purple-950/20 rounded font-medium truncate"
                  >
                    {style.label}
                  </button>
                ))}
              </div>
              
              <div className="border-t border-notion-border-light dark:border-notion-border-dark my-0.5" />
              <div className="px-2 py-0.5 text-[8px] uppercase tracking-wider text-notion-text-mutedLight dark:text-notion-text-mutedDark">
                Translate:
              </div>
              <div className="grid grid-cols-2 gap-1 px-1.5 pb-1">
                {['Spanish', 'French', 'German', 'Japanese'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleAIRequest('translate', lang)}
                    className="px-1.5 py-0.5 text-center bg-notion-hover-light dark:bg-notion-hover-dark hover:bg-purple-100 dark:hover:bg-purple-950/20 rounded font-medium truncate"
                  >
                    {lang}
                  </button>
                ))}
              </div>

              {/* History Sub-Panel */}
              {aiHistory.length > 0 && (
                <div className="border-t border-notion-border-light dark:border-notion-border-dark mt-1.5 pt-1.5 max-w-[170px]">
                  <div className="px-2 py-0.5 text-[8px] uppercase tracking-wider text-notion-text-mutedLight dark:text-notion-text-mutedDark font-bold flex items-center gap-1">
                    <History className="w-2.5 h-2.5" />
                    AI History (Last 10)
                  </div>
                  <div className="max-h-20 overflow-y-auto space-y-0.5 mt-1 pl-1">
                    {aiHistory.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setAiResponse(item.outputText);
                          setAiAction(item.action);
                          setAiState('result');
                        }}
                        className="w-full text-left px-1.5 py-1 bg-notion-hover-light dark:bg-notion-hover-dark/40 hover:bg-purple-100 dark:hover:bg-purple-950/20 rounded truncate flex justify-between items-center text-[7px]"
                      >
                        <span className="truncate">{item.action === 'rewrite' ? `Rewrite (${item.option})` : item.action}</span>
                        <span className="text-[6px] text-notion-text-mutedLight pl-1 select-none">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {aiState === 'loading' && (
            /* AI Request Loading View */
            <div className="flex items-center gap-2 p-2 min-w-[200px] text-[10px]">
              <Loader className="w-4 h-4 text-purple-500 animate-spin shrink-0" />
              <span className="flex-1 font-semibold text-purple-500 animate-pulse truncate">Generating AI response...</span>
              <button 
                onClick={closeAI} 
                className="px-2 py-0.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {aiState === 'result' && (
            /* AI Output Result Preview & Insertion actions (Preserves valid HTML tags) */
            <div className="flex flex-col min-w-[240px] max-w-sm p-3 text-[10px] space-y-3 select-none">
              <div className="flex justify-between items-center text-purple-500 font-bold border-b border-notion-border-light dark:border-notion-border-dark pb-1.5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gemini AI Output
                </span>
                <button onClick={closeAI} className="text-notion-text-mutedLight hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div 
                className="max-h-[140px] overflow-y-auto bg-notion-hover-light dark:bg-notion-hover-dark/40 border border-notion-border-light dark:border-notion-border-dark p-2 rounded-lg text-xs leading-relaxed select-text cursor-text break-words prose dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: aiResponse }}
              />

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleAIReplace}
                  className="flex-1 flex items-center justify-center gap-1 py-1 bg-purple-500 text-white rounded font-bold hover:bg-purple-600 transition-colors"
                >
                  <CheckCircle className="w-3 h-3" />
                  Replace Selection
                </button>
                <button
                  onClick={handleAIInsertBelow}
                  className="flex-1 flex items-center justify-center gap-1 py-1 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 transition-colors"
                >
                  <CheckCircle className="w-3 h-3" />
                  Insert Below
                </button>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleAIRetry}
                  className="flex-1 flex items-center justify-center gap-1 py-1 border border-notion-border-light dark:border-notion-border-dark rounded font-semibold hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
                <button
                  onClick={closeAI}
                  className="flex-1 flex items-center justify-center gap-1 py-1 border border-red-200 dark:border-red-950/20 text-red-500 rounded font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Discard
                </button>
              </div>
            </div>
          )}

          {aiState === 'error' && (
            /* AI Error View */
            <div className="flex flex-col min-w-[200px] p-3 text-[10px] space-y-2">
              <span className="font-semibold text-red-500">Operation failed. Rate limits or connection issue.</span>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAIRetry}
                  className="flex-1 flex items-center justify-center gap-1 py-1 bg-purple-500 text-white rounded font-semibold hover:bg-purple-600 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
                <button
                  onClick={closeAI}
                  className="flex-1 flex items-center justify-center py-1 border border-notion-border-light dark:border-notion-border-dark rounded font-semibold hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slash Command Overlay */}
      {slashMenuOpen && !readOnly && (
        <div 
          className="absolute z-40 bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark rounded-xl shadow-lg w-56 py-1 select-none flex flex-col"
          style={{ 
            top: `${slashCoords.top - 120}px`,
            left: `${slashCoords.left}px`
          }}
        >
          <div className="fixed inset-0 z-10" onClick={() => setSlashMenuOpen(false)} />
          <div className="z-20 max-h-48 overflow-y-auto space-y-0.5">
            {slashCommands.map((cmd, idx) => (
              <button
                key={cmd.label}
                onClick={() => triggerSlashCommand(idx)}
                className={`w-full text-left px-3 py-1.5 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark flex flex-col transition-colors ${slashMenuIndex === idx ? 'bg-notion-hover-light dark:bg-notion-hover-dark' : ''}`}
              >
                <span className="font-semibold text-xs text-notion-text-light dark:text-notion-text-dark">{cmd.label}</span>
                <span className="text-[9px] text-notion-text-mutedLight dark:text-notion-text-mutedDark mt-0.5">{cmd.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actual TipTap Core Editor */}
      <div className="pt-4">
        <EditorContent editor={editor} />
      </div>

      {/* Floating Comment Draft Bubble */}
      {commentBubbleOpen && !readOnly && (
        <CommentBubble
          coords={bubbleCoords}
          onSubmit={handleCommentSubmit}
          onClose={() => setCommentBubbleOpen(false)}
        />
      )}
    </div>
  );
};

export default CollabEditor;
