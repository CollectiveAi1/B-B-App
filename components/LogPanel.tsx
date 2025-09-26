import React from 'react';
import { LogEntry } from '../types';
import Card from './Card';
import { LogIcon } from './Icons';
import { format } from 'date-fns';

interface LogPanelProps {
  logs: LogEntry[];
}

const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  return (
    <Card title="Activity Log" icon={<LogIcon className="w-6 h-6" />} className="col-span-1 lg:col-span-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-3">Timestamp</th>
              <th scope="col" className="px-6 py-3">Event</th>
              <th scope="col" className="px-6 py-3">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/30">
                  <td className="px-6 py-4 font-mono text-xs">{format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}</td>
                  <td className="px-6 py-4">{log.message}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      log.outcome.includes('Responded') ? 'text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-300' :
                      log.outcome.includes('Booking Confirmed') ? 'text-sky-800 bg-sky-100 dark:bg-sky-900 dark:text-sky-300' :
                      log.outcome.includes('Provided Check-in Instructions') ? 'text-teal-800 bg-teal-100 dark:bg-teal-900 dark:text-teal-300' :
                      log.outcome.includes('Check-in/Out Request') ? 'text-orange-800 bg-orange-100 dark:bg-orange-900 dark:text-orange-300' :
                      log.outcome.includes('Cancellation Request') ? 'text-amber-800 bg-amber-100 dark:bg-amber-900 dark:text-amber-300' :
                      log.outcome.includes('Found Info') ? 'text-cyan-800 bg-cyan-100 dark:bg-cyan-900 dark:text-cyan-300' :
                      log.outcome.includes('Search No Results') ? 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300' :
                      log.outcome.includes('Escalated') ? 'text-purple-800 bg-purple-100 dark:bg-purple-900 dark:text-purple-300' :
                      'text-slate-800 bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
                    }`}>
                      {log.outcome}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-8">No activities logged yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default LogPanel;