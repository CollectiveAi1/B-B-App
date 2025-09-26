import React from 'react';
import { CalendarIcon, BroomIcon, InboxIcon } from './Icons';
import { StatFilter } from '../types';

type FilterType = Exclude<StatFilter, null>;

interface DashboardStatsProps {
    stats: {
        activeStays: number;
        pendingCheckIns: number;
        pendingCleanings: number;
        newMessages: number;
    };
    onFilterClick: (filter: FilterType) => void;
    activeFilter: StatFilter;
}

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; onClick: () => void; isActive: boolean; }> = ({ title, value, icon, onClick, isActive }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full bg-white dark:bg-slate-800 shadow-lg rounded-xl p-5 flex items-center space-x-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${isActive ? 'ring-2 ring-indigo-500' : 'hover:shadow-xl hover:-translate-y-1'}`}
        >
            <div className="flex-shrink-0">
                <div className="w-12 h-12 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                    {icon}
                </div>
            </div>
            <div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</div>
                <div className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
            </div>
        </button>
    );
};


const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, onFilterClick, activeFilter }) => {
    const { activeStays, pendingCheckIns, pendingCleanings, newMessages } = stats;
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Active Stays" 
                value={activeStays} 
                icon={<CalendarIcon className="w-6 h-6" />}
                onClick={() => onFilterClick('activeStays')}
                isActive={activeFilter === 'activeStays'}
            />
            <StatCard 
                title="Pending Cleanings" 
                value={pendingCleanings} 
                icon={<BroomIcon className="w-6 h-6" />}
                onClick={() => onFilterClick('pendingCleanings')}
                isActive={activeFilter === 'pendingCleanings'}
            />
            <StatCard 
                title="Upcoming Check-Ins" 
                value={pendingCheckIns} 
                icon={<CalendarIcon className="w-6 h-6" />}
                onClick={() => onFilterClick('upcomingCheckIns')}
                isActive={activeFilter === 'upcomingCheckIns'}
            />
            <StatCard 
                title="New Messages" 
                value={newMessages} 
                icon={<InboxIcon className="w-6 h-6" />}
                onClick={() => onFilterClick('newMessages')}
                isActive={activeFilter === 'newMessages'}
            />
        </div>
    );
};

export default DashboardStats;