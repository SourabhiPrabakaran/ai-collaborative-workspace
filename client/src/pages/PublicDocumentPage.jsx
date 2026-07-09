import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Sparkles, Globe, ArrowLeft, Loader } from 'lucide-react';
import api from '../services/api.js';

const PublicDocumentPage = () => {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize TipTap Editor in Read-only mode
  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: ''
      })
    ],
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[400px] text-sm leading-relaxed pb-24 text-notion-text-light dark:text-notion-text-dark',
      }
    }
  });

  useEffect(() => {
    const fetchPublicDoc = async () => {
      try {
        setLoading(true);
        // Direct unprotected endpoint call
        const res = await api.get(`/public/document/${token}`);
        if (res.success && res.data) {
          setDoc(res.data);
          if (editor) {
            editor.commands.setContent(res.data.content);
          }
        } else {
          throw new Error(res.message || 'Failed to retrieve public document');
        }
      } catch (err) {
        setError(err.message || 'Public link is invalid or has expired');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicDoc();
  }, [token, editor]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-notion-bg-dark flex flex-col justify-center items-center select-none">
        <Loader className="w-8 h-8 text-purple-500 animate-spin" />
        <span className="text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark mt-2 font-medium">
          Retrieving public document...
        </span>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-white dark:bg-notion-bg-dark flex flex-col justify-center items-center px-4 select-none">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
            <Globe className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-notion-text-light dark:text-notion-text-dark">
            Public Document Unavailable
          </h2>
          <p className="text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark">
            {error || 'This link may have been disabled by the owner, or is invalid.'}
          </p>
          <div className="pt-2">
            <Link 
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go to Workspace Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-notion-bg-dark flex flex-col relative select-text">
      {/* Top Banner */}
      <header className="border-b border-notion-border-light dark:border-notion-border-dark px-6 py-3 flex items-center justify-between glass-effect sticky top-0 z-30 select-none">
        <div className="flex items-center gap-2">
          <span className="text-xl">{doc.workspace?.icon || '💼'}</span>
          <span className="text-xs font-bold text-notion-text-light dark:text-notion-text-dark truncate max-w-[120px] sm:max-w-xs">
            {doc.workspace?.name}
          </span>
          <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ml-2">
            <Globe className="w-3 h-3" />
            Public Read-Only
          </span>
        </div>
        <div>
          <Link 
            to="/login"
            className="text-[10px] text-notion-text-mutedLight dark:text-notion-text-mutedDark hover:text-purple-500 font-bold transition-colors"
          >
            Log In
          </Link>
        </div>
      </header>

      {/* Main Document Content Area */}
      <main className="flex-1 overflow-y-auto px-16 py-12 max-w-4xl w-full mx-auto space-y-6">
        <div className="space-y-6 text-left">
          {/* Title and Emoji */}
          <div className="flex items-center gap-4 border-b border-notion-border-light dark:border-notion-border-dark pb-6">
            <span className="text-5xl select-none" role="img" aria-label="Document Emoji">
              {doc.emoji || '📄'}
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-notion-text-light dark:text-notion-text-dark">
              {doc.title || 'Untitled Document'}
            </h1>
          </div>

          {/* TipTap Render */}
          <div className="pt-2">
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>

      {/* Brand Footer */}
      <footer className="py-4 text-center border-t border-notion-border-light dark:border-notion-border-dark text-[9px] text-notion-text-mutedLight dark:text-notion-text-mutedDark select-none">
        Powered by <strong className="text-purple-500 inline-flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" /> Antigravity Workspace</strong>
      </footer>
    </div>
  );
};

export default PublicDocumentPage;
