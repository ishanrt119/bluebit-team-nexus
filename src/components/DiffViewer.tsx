import React from 'react';
import Editor from '@monaco-editor/react';
import { X, FileCode } from 'lucide-react';

interface DiffViewerProps {
  filename: string;
  patch: string;
  onClose: () => void;
}

export function DiffViewer({ filename, patch, onClose }: DiffViewerProps) {
  // Simple diff parsing for display
  // In a real app, you'd use a dedicated diff viewer library
  // or Monaco's DiffEditor.
  
  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileCode className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{filename}</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-zinc-500" />
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="diff"
          theme="vs-dark"
          value={patch}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 }
          }}
        />
      </div>
    </div>
  );
}
