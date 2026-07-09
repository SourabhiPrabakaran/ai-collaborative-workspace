import React, { useState } from 'react';
import RoleSelector from './RoleSelector.jsx';

const InviteUserForm = ({ onInvite, loading = false }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.trim()) return;
    onInvite(email.trim(), role);
    setEmail('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center flex-wrap sm:flex-nowrap w-full select-none">
      <div className="flex-1 min-w-[200px]">
        <input
          type="email"
          placeholder="Invite by email..."
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full bg-notion-hover-light dark:bg-notion-hover-dark border border-notion-border-light dark:border-notion-border-dark text-xs rounded-lg px-3 py-1.5 outline-none focus:border-purple-500 disabled:opacity-50 text-notion-text-light dark:text-notion-text-dark"
        />
      </div>
      <div className="shrink-0">
        <RoleSelector value={role} onChange={setRole} disabled={loading} />
      </div>
      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="px-4 py-1.5 bg-purple-500 text-white text-xs rounded-lg font-bold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        Invite
      </button>
    </form>
  );
};

export default InviteUserForm;
