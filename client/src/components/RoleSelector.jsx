import React from 'react';

const RoleSelector = ({ value, onChange, disabled = false, showOwner = false }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-notion-hover-light dark:bg-notion-hover-dark border border-notion-border-light dark:border-notion-border-dark text-xs rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-purple-500 disabled:opacity-50 select-none text-notion-text-light dark:text-notion-text-dark"
    >
      <option value="viewer">Viewer (Read-only)</option>
      <option value="editor">Editor (Can edit)</option>
      <option value="admin">Admin (Can share/manage)</option>
      {showOwner && <option value="owner">Owner (Full control)</option>}
    </select>
  );
};

export default RoleSelector;
