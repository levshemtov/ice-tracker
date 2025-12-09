"use client";
import React from "react";

export default function Tabs({ activeTab, setActiveTab }: { activeTab: 'active' | 'history'; setActiveTab: (t: 'active' | 'history') => void }) {
  return (
    <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
      <button 
        onClick={() => setActiveTab('active')}
        className={`flex-1 py-2 font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
      >
        Active Ledger
      </button>
      <button 
        onClick={() => setActiveTab('history')}
        className={`flex-1 py-2 font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
      >
        Vault
      </button>
    </div>
  );
}
