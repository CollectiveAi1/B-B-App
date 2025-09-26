
import React from 'react';
import Card from './Card';

interface Item {
    id: string;
    timestamp: Date;
    content: React.ReactNode;
}

interface SidePanelProps {
  title: string;
  icon: React.ReactNode;
  items: Item[];
  emptyMessage: string;
}

const SidePanel: React.FC<SidePanelProps> = ({ title, icon, items, emptyMessage }) => {
  return (
    <Card title={title} icon={icon} className="h-full">
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-2 last:border-b-0">
              {item.content}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-slate-500 dark:text-slate-400 mt-4">{emptyMessage}</p>
      )}
    </Card>
  );
};

export default SidePanel;
