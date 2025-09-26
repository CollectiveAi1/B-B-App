import React from 'react';
import { MaintenanceTask, TaskStatus } from '../types';
import Card from './Card';
import { WrenchScrewdriverIcon, ChatBubbleLeftEllipsisIcon, UserIcon } from './Icons';
import { formatDistanceToNow } from 'date-fns';

interface MaintenancePanelProps {
  tasks: MaintenanceTask[];
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onViewSourceMessage: (messageId: string) => void;
}

const getStatusBadge = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.TO_DO:
      return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full dark:bg-red-900 dark:text-red-300">To Do</span>;
    case TaskStatus.IN_PROGRESS:
      return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">In Progress</span>;
    case TaskStatus.COMPLETED:
      return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300">Completed</span>;
  }
};

const TaskItem: React.FC<{ task: MaintenanceTask; onUpdateStatus: (taskId: string, status: TaskStatus) => void; onViewSourceMessage: (messageId: string) => void; }> = ({ task, onUpdateStatus, onViewSourceMessage }) => {
  return (
    <li className="py-3 sm:py-4">
      <div className="flex items-start space-x-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate dark:text-white">
            {task.description}
          </p>
          <p className="text-sm text-slate-500 truncate dark:text-slate-400">
            {task.property} - {formatDistanceToNow(task.timestamp, { addSuffix: true })}
          </p>
           {task.assignedToStaffName && (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-1">
                <UserIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span>Assigned to: <span className="font-medium text-slate-600 dark:text-slate-300">{task.assignedToStaffName}</span></span>
            </div>
          )}
        </div>
        <div className="inline-flex items-center space-x-2 text-base font-semibold text-slate-900 dark:text-white">
          <button 
            onClick={() => onViewSourceMessage(task.sourceMessageId)} 
            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            title="View Original Message"
          >
            <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
          </button>
          <select
            value={task.status}
            onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
            className="text-xs border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            onClick={(e) => e.stopPropagation()} // Prevent card click-through if any
          >
            <option value={TaskStatus.TO_DO}>To Do</option>
            <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
            <option value={TaskStatus.COMPLETED}>Completed</option>
          </select>
        </div>
      </div>
    </li>
  );
};

const MaintenancePanel: React.FC<MaintenancePanelProps> = ({ tasks, onUpdateStatus, onViewSourceMessage }) => {
  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by status first (To Do > In Progress > Completed), then by timestamp
    const statusOrder = { [TaskStatus.TO_DO]: 1, [TaskStatus.IN_PROGRESS]: 2, [TaskStatus.COMPLETED]: 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return (
    <Card title="Maintenance Tasks" icon={<WrenchScrewdriverIcon className="w-6 h-6" />}>
      {sortedTasks.length > 0 ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {sortedTasks.map((task) => (
            <TaskItem key={task.id} task={task} onUpdateStatus={onUpdateStatus} onViewSourceMessage={onViewSourceMessage} />
          ))}
        </ul>
      ) : (
        <p className="text-center text-slate-500 dark:text-slate-400 mt-4">No maintenance tasks.</p>
      )}
    </Card>
  );
};

export default MaintenancePanel;