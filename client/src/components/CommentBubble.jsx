import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

const CommentBubble = ({ coords, onSubmit, onClose }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text || !text.trim()) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <div 
      className="absolute z-45 bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark shadow-lg rounded-xl p-2 select-none flex flex-col gap-1.5 w-60 text-left"
      style={{ 
        top: `${coords.top - 120}px`, 
        left: `${coords.left}px` 
      }}
    >
      <div className="flex justify-between items-center border-b border-notion-border-light dark:border-notion-border-dark pb-1 text-[10px] font-bold text-notion-text-mutedLight dark:text-notion-text-mutedDark">
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3 text-purple-500" />
          Add Comment
        </span>
        <button onClick={onClose} className="hover:text-red-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-1.5 items-center">
        <input
          type="text"
          placeholder="Type comment (use @name)..."
          autoFocus
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 bg-notion-hover-light dark:bg-notion-hover-dark border border-notion-border-light dark:border-notion-border-dark text-[10px] rounded-lg px-2 py-1 outline-none text-notion-text-light dark:text-notion-text-dark"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};

export default CommentBubble;
