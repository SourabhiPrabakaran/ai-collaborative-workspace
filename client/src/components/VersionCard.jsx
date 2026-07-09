import React from 'react';
import { History, Eye, RotateCcw } from 'lucide-react';

const VersionCard = ({ version, onPreview, onRestore, isCurrent = false, isPreviewing = false }) => {
  return (
    <div className={`p-3 rounded-xl border select-none transition-all flex flex-col gap-2 ${
      isPreviewing 
        ? 'border-purple-500 bg-purple-500/5 dark:bg-purple-950/10' 
        : isCurrent 
          ? 'border-green-500 bg-green-500/5 dark:bg-green-950/10'
          : 'border-notion-border-light dark:border-notion-border-dark bg-notion-hover-light/10 dark:bg-notion-hover-dark/5 hover:bg-notion-hover-light/35 dark:hover:bg-notion-hover-dark/20'
    }`}>
      <div className="flex justify-between items-start gap-1">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-purple-500/10 text-purple-500 shrink-0">
            <History className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-notion-text-light dark:text-notion-text-dark flex items-center gap-1">
              Version v{version.version}
              {isCurrent && <span className="text-[8px] px-1 bg-green-500 text-white rounded font-bold">Current</span>}
              {isPreviewing && <span className="text-[8px] px-1 bg-purple-500 text-white rounded font-bold">Previewing</span>}
            </div>
            <div className="text-[8px] text-notion-text-mutedLight dark:text-notion-text-mutedDark">
              {new Date(version.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="text-[9px] text-notion-text-light dark:text-notion-text-dark leading-relaxed pl-6.5 italic">
        "{version.description || 'No description provided'}"
      </div>

      <div className="text-[8px] text-notion-text-mutedLight dark:text-notion-text-mutedDark pl-6.5">
        Saved by: <span className="font-semibold">{version.createdBy?.fullName || 'Auto-save'}</span>
      </div>

      <div className="flex gap-2 pl-6.5 pt-1 mt-auto shrink-0">
        <button
          onClick={() => onPreview(version)}
          disabled={isPreviewing}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[8px] font-bold transition-all ${
            isPreviewing 
              ? 'bg-purple-500 text-white cursor-default' 
              : 'bg-notion-hover-light dark:bg-notion-hover-dark hover:opacity-85 text-notion-text-light dark:text-notion-text-dark'
          }`}
        >
          <Eye className="w-2.5 h-2.5" />
          Preview
        </button>
        
        {!isCurrent && (
          <button
            onClick={() => onRestore(version)}
            className="flex items-center gap-1 px-2 py-1 bg-purple-500 text-white hover:bg-purple-600 rounded text-[8px] font-bold transition-all"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Restore
          </button>
        )}
      </div>
    </div>
  );
};

export default VersionCard;
