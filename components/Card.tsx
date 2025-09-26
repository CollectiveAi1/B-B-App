
import React from 'react';

interface CardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, icon, children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 shadow-lg rounded-xl flex flex-col ${className}`}>
      <div className="flex items-center p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="text-slate-500 dark:text-slate-400">{icon}</div>
        <h2 className="ml-3 text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h2>
      </div>
      <div className="p-4 flex-grow overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default Card;
