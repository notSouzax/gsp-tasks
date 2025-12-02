import React from 'react';

export const Toggle = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-300">{label}</span>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}
        >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
    </div>
);
