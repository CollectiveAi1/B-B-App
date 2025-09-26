import React, { useState, useRef } from 'react';
import { CleaningTask, CleaningStaff, Note, IncidentReport, ClockEvent, CleaningStatus, ChecklistItem, ChecklistItemStatus } from '../types';
import Card from './Card';
import { BroomIcon, ClockIcon, ClipboardDocumentListIcon, ExclamationCircleIcon, CameraIcon, ChevronDownIcon, CheckCircleIcon } from './Icons';
import { format, formatDistanceToNow } from 'date-fns';

interface CleaningPanelProps {
  tasks: CleaningTask[];
  staff: CleaningStaff[];
  notes: Note[];
  incidents: IncidentReport[];
  clockedInStaff: ClockEvent[];
  checklistTemplates: Record<string, ChecklistItem[]>;
  onClockInOut: (staffId: string, type: 'in' | 'out') => void;
  onUpdateTaskStatus: (taskId: string, status: CleaningStatus) => void;
  onAddNote: (content: string) => void;
  onAddIncident: (report: { staffName: string; content: string; property: string }) => void;
  onUpdateChecklistItem: (taskId: string, itemId: string, completed: boolean, photoUrl?: string) => void;
}

// Helper Components
const getStatusBadge = (status: CleaningStatus) => {
  switch (status) {
    case CleaningStatus.PENDING:
      return <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full dark:bg-yellow-900 dark:text-yellow-300">Pending</span>;
    case CleaningStatus.IN_PROGRESS:
      return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">In Progress</span>;
    case CleaningStatus.COMPLETED:
      return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300">Completed</span>;
  }
};

const ChecklistItemRow: React.FC<{
    task: CleaningTask;
    itemStatus: ChecklistItemStatus;
    itemTemplate: ChecklistItem;
    onUpdateChecklistItem: (taskId: string, itemId: string, completed: boolean, photoUrl?: string) => void;
}> = ({ task, itemStatus, itemTemplate, onUpdateChecklistItem }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const photoUrl = e.target?.result as string;
                onUpdateChecklistItem(task.id, itemTemplate.id, true, photoUrl); // Mark as complete when photo is added
            };
            reader.readAsDataURL(file);
        }
    };
    
    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0">
            <div className="flex items-center">
                <input
                    type="checkbox"
                    checked={itemStatus.completed}
                    onChange={(e) => onUpdateChecklistItem(task.id, itemTemplate.id, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label className="ml-3 text-sm text-slate-600 dark:text-slate-300">{itemTemplate.text}</label>
            </div>
            <div className="flex items-center space-x-2">
                {itemStatus.photoUrl && (
                     <img src={itemStatus.photoUrl} alt="verification" className="w-10 h-10 rounded-md object-cover" />
                )}
                {itemTemplate.photoRequired && (
                    <>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                            aria-label="Upload photo"
                        >
                           <CameraIcon className="w-5 h-5" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*"
                        />
                    </>
                )}
            </div>
        </div>
    );
};

// Main Panel Components
const ClockInOutCard: React.FC<{ staff: CleaningStaff[], clockedInStaff: ClockEvent[], onClockInOut: (staffId: string, type: 'in' | 'out') => void }> = ({ staff, clockedInStaff, onClockInOut }) => {
    const [selectedStaffId, setSelectedStaffId] = useState<string>(staff[0]?.id || '');
    const isClockedIn = clockedInStaff.some(s => s.staffId === selectedStaffId);

    const handleClock = () => {
        if (!selectedStaffId) return;
        onClockInOut(selectedStaffId, isClockedIn ? 'out' : 'in');
    };

    return (
        <Card title="Time Clock" icon={<ClockIcon className="w-6 h-6" />}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="staff-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Select Staff</label>
                    <select
                        id="staff-select"
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <button
                    onClick={handleClock}
                    disabled={!selectedStaffId}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isClockedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
                >
                    {isClockedIn ? 'Clock Out' : 'Clock In'}
                </button>
                <div className="pt-2">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Currently Clocked In:</h4>
                    {clockedInStaff.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm">
                            {clockedInStaff.map(s => (
                                <li key={s.id} className="flex justify-between items-center">
                                    <span>{s.staffName}</span>
                                    <span className="text-xs text-slate-400">{formatDistanceToNow(s.timestamp, { addSuffix: true })}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Nobody is clocked in.</p>}
                </div>
            </div>
        </Card>
    );
};

const NotesCard: React.FC<{ notes: Note[], onAddNote: (content: string) => void }> = ({ notes, onAddNote }) => {
    const [newNote, setNewNote] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(newNote.trim()) {
            onAddNote(newNote.trim());
            setNewNote('');
        }
    };

    return (
        <Card title="Notes for Crew" icon={<ClipboardDocumentListIcon className="w-6 h-6" />}>
             <form onSubmit={handleSubmit} className="mb-4">
                <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Leave a new note for the crew..."
                    rows={2}
                    className="w-full text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                ></textarea>
                <button type="submit" className="mt-2 w-full text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none">Add Note</button>
            </form>
            <ul className="space-y-3 max-h-48 overflow-y-auto">
                {notes.length > 0 ? notes.map(note => (
                    <li key={note.id} className="text-sm p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        <p>{note.content}</p>
                        <p className="text-xs text-right text-slate-400 mt-1">{format(note.timestamp, 'MMM d, h:mm a')}</p>
                    </li>
                )) : <p className="text-center text-slate-500 dark:text-slate-400">No notes.</p>}
            </ul>
        </Card>
    );
};

const IncidentReportCard: React.FC<{ staff: CleaningStaff[], properties: string[], onAddIncident: (report: { staffName: string; content: string; property: string }) => void }> = ({ staff, properties, onAddIncident }) => {
    const [reporter, setReporter] = useState(staff[0]?.name || '');
    const [property, setProperty] = useState(properties[0] || '');
    const [content, setContent] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(reporter && property && content.trim()) {
            onAddIncident({ staffName: reporter, property, content: content.trim() });
            setContent('');
        }
    };

    return (
        <Card title="Report Incident" icon={<ExclamationCircleIcon className="w-6 h-6 text-red-500" />}>
            <form onSubmit={handleSubmit} className="space-y-3">
                 <div>
                    <label className="text-sm font-medium">Your Name</label>
                    <select value={reporter} onChange={e => setReporter(e.target.value)} className="mt-1 block w-full text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md">
                       {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-medium">Property</label>
                    <select value={property} onChange={e => setProperty(e.target.value)} className="mt-1 block w-full text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md">
                       {properties.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Describe the incident..."
                    rows={3}
                    className="w-full text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                ></textarea>
                <button type="submit" className="w-full text-sm px-3 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none">Submit Report</button>
            </form>
        </Card>
    )
}

const CleaningPanel: React.FC<CleaningPanelProps> = (props) => {
  const { tasks, staff, notes, incidents, clockedInStaff, checklistTemplates, onClockInOut, onUpdateTaskStatus, onAddNote, onAddIncident, onUpdateChecklistItem } = props;
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  const uniqueProperties = Array.from(new Set(tasks.map(t => t.property)));
  
  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(prev => (prev === taskId ? null : taskId));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2">
            <Card title="Cleaning Schedule" icon={<BroomIcon className="w-6 h-6" />}>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-3 w-1/4">Property</th>
                                <th className="px-4 py-3">Guest Checkout</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Progress</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800">
                            {tasks.map(task => {
                                const checklistTemplate = checklistTemplates[task.property] || [];
                                const completedItems = task.checklist.filter(i => i.completed).length;
                                const progress = checklistTemplate.length > 0 ? Math.round((completedItems / checklistTemplate.length) * 100) : 100;

                                return (
                                <React.Fragment key={task.id}>
                                    <tr className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{task.property}</td>
                                        <td className="px-4 py-3">{task.guestName}</td>
                                        <td className="px-4 py-3">{format(task.checkOutDate, 'MMM d, yyyy')}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center">
                                                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                                                </div>
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-2">{progress}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(task.status)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => toggleExpand(task.id)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                                                <ChevronDownIcon className={`w-5 h-5 transition-transform ${expandedTaskId === task.id ? 'rotate-180' : ''}`} />
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedTaskId === task.id && (
                                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                                            <td colSpan={6} className="p-4">
                                                <h4 className="font-semibold mb-2">Checklist for {task.property}</h4>
                                                <div>
                                                    {checklistTemplate.map(itemTemplate => {
                                                        const itemStatus = task.checklist.find(i => i.itemId === itemTemplate.id);
                                                        if (!itemStatus) return null;
                                                        return (
                                                            <ChecklistItemRow
                                                                key={itemTemplate.id}
                                                                task={task}
                                                                itemStatus={itemStatus}
                                                                itemTemplate={itemTemplate}
                                                                onUpdateChecklistItem={onUpdateChecklistItem}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                                <div className="mt-4 flex justify-end space-x-2">
                                                    {task.status === CleaningStatus.PENDING && <button onClick={() => onUpdateTaskStatus(task.id, CleaningStatus.IN_PROGRESS)} className="text-sm font-semibold px-3 py-1 rounded-md text-white bg-blue-600 hover:bg-blue-700">Start Cleaning</button>}
                                                    {task.status === CleaningStatus.IN_PROGRESS && <button onClick={() => onUpdateTaskStatus(task.id, CleaningStatus.COMPLETED)} className="text-sm font-semibold px-3 py-1 rounded-md text-white bg-green-600 hover:bg-green-700">Mark as Complete</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )})}
                        </tbody>
                    </table>
                 </div>
            </Card>
        </div>
        <div className="space-y-6">
            <ClockInOutCard staff={staff} clockedInStaff={clockedInStaff} onClockInOut={onClockInOut} />
            <NotesCard notes={notes} onAddNote={onAddNote}/>
            <IncidentReportCard staff={staff} properties={uniqueProperties} onAddIncident={onAddIncident} />
        </div>
    </div>
  );
};

export default CleaningPanel;