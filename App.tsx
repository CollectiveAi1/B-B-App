import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Message, Booking, LogEntry, SlackNotification, Alert, MessageStatus, CleaningStatus, CleaningTask, CleaningStaff, ClockEvent, Note, IncidentReport, ChecklistItemStatus, StatFilter, MaintenanceTask, TaskStatus, MaintenanceStaff } from './types';
import { INITIAL_MESSAGES, UPCOMING_BOOKINGS, CLEANING_STAFF, MAINTENANCE_STAFF, PROPERTY_LOCATIONS } from './constants';
import { PROPERTY_CHECKLISTS } from './data/checklists';
import { generateAiResponse, generateScheduledMessage } from './services/geminiService';
import { format, formatDistanceToNow, differenceInHours, isAfter, isBefore } from 'date-fns';

import MessagesPanel from './components/MessagesPanel';
import SidePanel from './components/SidePanel';
import LogPanel from './components/LogPanel';
import CleaningPanel from './components/CleaningPanel';
import MaintenancePanel from './components/MaintenancePanel';
import DashboardStats from './components/DashboardStats';
import { CalendarIcon, SlackIcon, AlertIcon, ArrowPathIcon, AirbnbIcon, BroomIcon, WrenchScrewdriverIcon } from './components/Icons';

type Tab = 'messages' | 'cleaning';

function App() {
  // Core State
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [bookings, setBookings] = useState<Booking[]>(UPCOMING_BOOKINGS);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [slackNotifications, setSlackNotifications] = useState<SlackNotification[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('messages');
  const [activeFilter, setActiveFilter] = useState<StatFilter>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Cleaning Crew State
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTask[]>([]);
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);

  // Maintenance State
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);

  const isCheckingRef = useRef(isChecking);
  isCheckingRef.current = isChecking;
  const assignmentCounters = useRef<Record<string, number>>({});
  
  // Generate cleaning tasks from bookings
  useEffect(() => {
    const now = new Date();
    const tasks: CleaningTask[] = bookings
      .filter(b => b.checkOut <= now)
      .map(b => {
        const checklistTemplate = PROPERTY_CHECKLISTS[b.property] || [];
        const checklist = checklistTemplate.map(item => ({
            itemId: item.id,
            completed: false,
        }));
        return {
            id: `task_${b.id}`,
            bookingId: b.id,
            property: b.property,
            guestName: b.guestName,
            checkOutDate: b.checkOut,
            status: CleaningStatus.PENDING,
            checklist: checklist,
        };
      });
      
    setCleaningTasks(prevTasks => {
        const existingTaskIds = new Set(prevTasks.map(t => t.id));
        const newTasks = tasks.filter(t => !existingTaskIds.has(t.id));
        return [...prevTasks, ...newTasks].sort((a,b) => b.checkOutDate.getTime() - a.checkOutDate.getTime());
    });
  }, [bookings]);


  const addLog = useCallback((message: string, outcome: string) => {
    setLogEntries(prev => [{ id: `log_${Date.now()}`, timestamp: new Date(), message, outcome }, ...prev]);
  }, []);

  const addSlackNotification = useCallback((message: string) => {
    setSlackNotifications(prev => [{ id: `slack_${Date.now()}`, timestamp: new Date(), channel: '#airbnb-staff', message }, ...prev]);
  }, []);

  const addAlert = useCallback((subject: string, body: string) => {
    setAlerts(prev => [{ id: `alert_${Date.now()}`, timestamp: new Date(), recipient: 'management@airbnb-assist.com', subject, body }, ...prev]);
  }, []);
  
  const assignMaintenanceTask = useCallback((description: string, property: string, currentTasks: MaintenanceTask[]): { staffId: string, staffName: string } | null => {
      const lowercasedDescription = description.toLowerCase();
      const propertyLocation = PROPERTY_LOCATIONS[property];

      // 1. Find all specialists who match keywords
      const potentialSpecialists = MAINTENANCE_STAFF.filter(staff =>
          staff.specializations.some(spec => lowercasedDescription.includes(spec) && spec !== 'general')
      );

      // 2. Prioritize by location
      let candidates = potentialSpecialists.filter(staff => staff.location === propertyLocation);
      if (candidates.length === 0) {
          // If no specialist in the right location, fall back to any specialist from the potential list
          candidates = potentialSpecialists;
      }
      
      // If no specialists are found at all, assign to the generalist
      if (candidates.length === 0) {
        const generalist = MAINTENANCE_STAFF.find(s => s.specializations.includes('general'));
        return generalist ? { staffId: generalist.id, staffName: generalist.name } : null;
      }

      // 3. Prioritize by workload for candidates
      if (candidates.length > 1) {
          const workloads = candidates.map(staff => ({
              staff,
              activeTasks: currentTasks.filter(task =>
                  task.assignedToStaffId === staff.id &&
                  (task.status === TaskStatus.TO_DO || task.status === TaskStatus.IN_PROGRESS)
              ).length
          }));

          workloads.sort((a, b) => a.activeTasks - b.activeTasks);
          
          const minWorkload = workloads[0].activeTasks;
          const leastBusyStaff = workloads
              .filter(w => w.activeTasks === minWorkload)
              .map(w => w.staff);

          // If there's a tie for the lowest workload, use round-robin
          const primarySpec = candidates[0].specializations[0];
          if (!assignmentCounters.current[primarySpec]) {
              assignmentCounters.current[primarySpec] = 0;
          }

          const nextIndex = assignmentCounters.current[primarySpec] % leastBusyStaff.length;
          const chosenStaff = leastBusyStaff[nextIndex];
          assignmentCounters.current[primarySpec]++;
          
          return { staffId: chosenStaff.id, staffName: chosenStaff.name };
      }

      // Only one candidate found
      const chosenStaff = candidates[0];
      return { staffId: chosenStaff.id, staffName: chosenStaff.name };
  }, []);

  const handleProcessMessage = useCallback(async (messageId: string) => {
    let messageToProcess: Message | null = null;
    
    setMessages(prev => {
        const message = prev.find(m => m.id === messageId);
        if (message && message.status === MessageStatus.NEW) {
            messageToProcess = message;
            return prev.map(m => m.id === messageId ? { ...m, status: MessageStatus.PROCESSING } : m);
        }
        return prev;
    });

    if (!messageToProcess) return;
    
    const currentMessage = messageToProcess;

    try {
      const relevantBooking = bookings.find(b => b.guestName === currentMessage.guestName);

      let bookingContext: string;
      if (relevantBooking) {
        const { property, checkIn, checkOut } = relevantBooking;
        bookingContext = `Context: The guest '${currentMessage.guestName}' has a booking for '${property}' from ${format(checkIn, 'MMM d, yyyy')} to ${format(checkOut, 'MMM d, yyyy')}.`;
      } else {
        bookingContext = 'Context: No booking context available.';
      }
      
      const searchKeywords = ['recommend', 'attractions', 'restaurants', 'events', 'what to do', 'local spots', 'best place', 'open hours'];
      const shouldUseSearch = searchKeywords.some(keyword => currentMessage.content.toLowerCase().includes(keyword));
      
      if(shouldUseSearch) {
        addLog(`Searching Google for "${currentMessage.guestName}"`, 'Querying...');
      }

      const { text: responseText, sources } = await generateAiResponse(currentMessage.content, bookingContext, shouldUseSearch);
      
      const isTaskEscalation = responseText.startsWith('ESCALATE_TASK:');
      const isGeneralEscalation = responseText.startsWith('ESCALATE:');

      if (isTaskEscalation) {
        const taskDescription = responseText.substring(15).trim();
        if (relevantBooking) {
            setMaintenanceTasks(prevTasks => {
                const assignment = assignMaintenanceTask(taskDescription, relevantBooking.property, prevTasks);
                const newTask: MaintenanceTask = {
                    id: `maint_${Date.now()}`,
                    timestamp: new Date(),
                    property: relevantBooking.property,
                    description: taskDescription,
                    status: TaskStatus.TO_DO,
                    sourceMessageId: currentMessage.id,
                    ...(assignment && { assignedToStaffId: assignment.staffId, assignedToStaffName: assignment.staffName }),
                };
                
                if (assignment) {
                    addLog(`AI assigned task to ${assignment.staffName}`, `Maintenance`);
                    addSlackNotification(`🔧 New Task Assigned to ${assignment.staffName}: ${taskDescription} at ${relevantBooking.property}.`);
                } else {
                    addLog(`AI created task for ${currentMessage.guestName}`, `Maintenance`);
                    addSlackNotification(`🔧 New Maintenance Task: ${taskDescription} at ${relevantBooking.property}.`);
                }

                return [newTask, ...prevTasks];
            });
        }
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: MessageStatus.ESCALATED, aiResponse: `Task Created: ${taskDescription}` } : m));
        addAlert(`New Maintenance Task Created for ${relevantBooking?.property}`, `Guest: ${currentMessage.guestName}\nMessage: "${currentMessage.content}"\n\nTask: ${taskDescription}`);

      } else if (isGeneralEscalation) {
        const cleanResponse = responseText.substring(10).trim();
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: MessageStatus.ESCALATED, aiResponse: cleanResponse } : m));
        addLog(`Processed message from ${currentMessage.guestName}`, `Escalated`);
        addSlackNotification(`🚨 High-priority issue escalated from ${currentMessage.guestName}. Please review.`);
        addAlert(`Escalated Issue from ${currentMessage.guestName}`, `Original message:\n"${currentMessage.content}"\n\nAI Reason: ${cleanResponse}`);
      
      } else {
        const cleanResponse = responseText;
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: MessageStatus.RESPONDED, aiResponse: cleanResponse, groundingSources: sources } : m));
        
        let outcome = 'Responded';
        if (shouldUseSearch) {
          if (sources && sources.length > 0) {
            outcome = 'Found Info (Search)';
          } else {
            outcome = 'Search No Results';
          }
        } else {
            const lowerCaseResponse = cleanResponse.toLowerCase();
            if (lowerCaseResponse.includes('cancel')) outcome = 'Cancellation Request';
            else if (lowerCaseResponse.includes('check-in is usually after 3 pm')) outcome = 'Provided Check-in Instructions';
            else if (lowerCaseResponse.includes('early check-in') || lowerCaseResponse.includes('late check-out')) outcome = 'Check-in/Out Request';
            else if (lowerCaseResponse.includes('booking') && lowerCaseResponse.includes('confirmed')) outcome = 'Booking Confirmed';
        }

        addLog(`Processed message from ${currentMessage.guestName}`, outcome);
      }
    } catch (error) {
      console.error("Failed to process message:", error);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: MessageStatus.FAILED } : m));
      addLog(`Processing message from ${currentMessage.guestName}`, `Failed`);
    }
  }, [bookings, addLog, addSlackNotification, addAlert, assignMaintenanceTask]);

  useEffect(() => {
    const processNewMessages = () => {
        setMessages(currentMessages => {
            const messagesToProcess = currentMessages.filter(
                m => m.status === MessageStatus.NEW
            );
            if (messagesToProcess.length > 0) {
                messagesToProcess.forEach(msg => handleProcessMessage(msg.id));
            }
            return currentMessages;
        });
    };
    const initialTimeout = setTimeout(processNewMessages, 1000);
    const intervalId = setInterval(processNewMessages, 5000);
    return () => {
        clearTimeout(initialTimeout);
        clearInterval(intervalId);
    };
  }, [handleProcessMessage]);
  
  // Automated Scheduled Messaging
  useEffect(() => {
    const sendSystemMessage = async (booking: Booking, type: 'preArrival' | 'midStay' | 'preDeparture') => {
        const content = await generateScheduledMessage(type, booking.guestName, booking.property);
        if (!content) return;

        const newMessage: Message = {
            id: `sys_${booking.id}_${type}`,
            guestName: booking.guestName,
            platform: 'Airbnb',
            content: `[Automated ${type} Message]`,
            timestamp: new Date(),
            status: MessageStatus.RESPONDED,
            aiResponse: content,
            author: 'system',
        };

        setMessages(prev => [newMessage, ...prev]);
        setBookings(prev => prev.map(b => 
            b.id === booking.id 
            ? { ...b, automatedMessagesSent: { ...b.automatedMessagesSent, [type]: true } } 
            : b
        ));
        addLog(`Sent AI automated ${type} message to ${booking.guestName}`, 'System AI Message');
    };

    const checkAndSendAutomatedMessages = async () => {
        const now = new Date();
        for (const booking of bookings) {
            if (!booking.automatedMessagesSent) continue;

            // Pre-arrival: 24 hours before check-in
            const hoursToCheckIn = differenceInHours(booking.checkIn, now);
            if (hoursToCheckIn > 0 && hoursToCheckIn <= 24 && !booking.automatedMessagesSent.preArrival) {
                await sendSystemMessage(booking, 'preArrival');
            }

            // Mid-stay: 24 hours after check-in
            const hoursSinceCheckIn = differenceInHours(now, booking.checkIn);
            if (hoursSinceCheckIn >= 24 && isBefore(now, booking.checkOut) && !booking.automatedMessagesSent.midStay) {
                await sendSystemMessage(booking, 'midStay');
            }

            // Pre-departure: 24 hours before check-out
            const hoursToCheckout = differenceInHours(booking.checkOut, now);
            if (hoursToCheckout > 0 && hoursToCheckout <= 24 && !booking.automatedMessagesSent.preDeparture) {
                await sendSystemMessage(booking, 'preDeparture');
            }
        }
    };
    
    const intervalId = setInterval(checkAndSendAutomatedMessages, 60 * 1000); // Check every minute
    checkAndSendAutomatedMessages();
    return () => clearInterval(intervalId);
  }, [bookings, addLog]);

  const handleCheckForNewMessages = useCallback((source: 'Manual' | 'Scheduled') => {
    if (isCheckingRef.current) {
        if (source === 'Scheduled') {
            addLog("Scheduled check skipped", "A check is already in progress.");
        }
        return;
    }
    setIsChecking(true);
    addLog(`${source} check triggered`, "Checking for new messages...");
    setTimeout(() => {
      const newSearchMessage: Message = {
        id: `msg_${Date.now()}`,
        guestName: 'Eva Green',
        platform: 'Airbnb',
        content: "Hi! Can you recommend some good vegetarian restaurants near the Cozy Cottage?",
        timestamp: new Date(),
        status: MessageStatus.NEW,
        author: 'guest'
      };
      setMessages(prev => [newSearchMessage, ...prev.map(m => m.status !== MessageStatus.NEW ? { ...m, status: MessageStatus.NEW, id: `${m.id}_${Date.now()}`, author: 'guest' as 'guest' } : m )]);
      addLog("Message check complete", "System refreshed with new messages.");
      setIsChecking(false);
    }, 1500);
  }, [addLog]);

  useEffect(() => {
    const intervalId = setInterval(() => handleCheckForNewMessages('Scheduled'), 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [handleCheckForNewMessages]);

  const clockedInStaff = useMemo(() => {
    const clockStatus = new Map<string, ClockEvent>();
    clockEvents.forEach(event => {
        if(event.type === 'in') {
            clockStatus.set(event.staffId, event);
        } else {
            clockStatus.delete(event.staffId);
        }
    });
    return Array.from(clockStatus.values());
  }, [clockEvents]);

  // Cleaning Crew Handlers
  const handleClockInOut = (staffId: string, type: 'in' | 'out') => {
    const staffMember = CLEANING_STAFF.find(s => s.id === staffId);
    if (!staffMember) return;

    const event: ClockEvent = {
        id: `clock_${Date.now()}`,
        staffId,
        staffName: staffMember.name,
        type,
        timestamp: new Date(),
    };
    setClockEvents(prev => [...prev, event]);
    addLog(`${staffMember.name} clocked ${type}`, 'Cleaning Crew');
  };

  const handleUpdateTaskStatus = (taskId: string, status: CleaningStatus) => {
    setCleaningTasks(prev => prev.map(t => t.id === taskId ? {...t, status} : t));
    const task = cleaningTasks.find(t => t.id === taskId);
    if(task) {
      addLog(`Task for ${task.property} updated`, status);
    }
  };
  
  const handleUpdateChecklistItem = (taskId: string, itemId: string, completed: boolean, photoUrl?: string) => {
    setCleaningTasks(prevTasks => prevTasks.map(task => {
        if (task.id === taskId) {
            const updatedChecklist = task.checklist.map(item => {
                if (item.itemId === itemId) {
                    return { ...item, completed, ...(photoUrl && { photoUrl }) };
                }
                return item;
            });
            return { ...task, checklist: updatedChecklist };
        }
        return task;
    }));
  };

  const handleAddNote = (content: string) => {
    const newNote: Note = { id: `note_${Date.now()}`, content, timestamp: new Date() };
    setNotes(prev => [newNote, ...prev]);
    addLog('New note for cleaners added', 'Management');
  };

  const handleAddIncident = (report: { staffName: string; content: string; property: string; }) => {
    const newIncident: IncidentReport = { ...report, id: `incident_${Date.now()}`, timestamp: new Date() };
    setIncidents(prev => [newIncident, ...prev]);
    addLog(`Incident reported at ${report.property}`, `By ${report.staffName}`);
    addSlackNotification(`🧹 INCIDENT: ${report.staffName} reported an issue at ${report.property}.`);
  };

  const handleUpdateMaintenanceTaskStatus = (taskId: string, status: TaskStatus) => {
    setMaintenanceTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    const task = maintenanceTasks.find(t => t.id === taskId);
    if(task) {
      addLog(`Maintenance task for ${task.property} updated to ${status}`, 'System');
    }
  };

  const handleViewSourceMessage = useCallback((messageId: string) => {
    setActiveTab('messages');
    setActiveFilter(null);
    setHighlightedMessageId(messageId);
  }, []);

  const { filteredCalendarItems, calendarTitle, calendarEmptyMessage } = useMemo(() => {
    const now = new Date();
    let filteredBookings: Booking[];
    let title = "Upcoming Bookings";
    let emptyMessage = "No upcoming bookings.";

    switch(activeFilter) {
        case 'activeStays':
            filteredBookings = bookings.filter(b => b.checkIn <= now && b.checkOut >= now);
            title = "Active Stays";
            emptyMessage = "No active stays.";
            break;
        case 'upcomingCheckIns':
            filteredBookings = bookings.filter(b => b.checkIn > now);
            title = "Upcoming Check-Ins";
            emptyMessage = "No upcoming check-ins.";
            break;
        default:
            filteredBookings = bookings.filter(b => b.checkIn > now);
    }

    const items = filteredBookings
        .sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime())
        .map(b => ({
            id: b.id,
            timestamp: b.checkIn,
            content: (
                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{b.property}</p>
                    <p>{b.guestName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{format(b.checkIn, 'MMM d')} - {format(b.checkOut, 'MMM d, yyyy')}</p>
                </div>
            )
        }));

    return { filteredCalendarItems: items, calendarTitle: title, calendarEmptyMessage: emptyMessage };
  }, [bookings, activeFilter]);
  
  const slackItems = slackNotifications.map(n => ({ id: n.id, timestamp: n.timestamp, content: (
    <div>
      <p className="text-slate-500 dark:text-slate-400 font-mono text-xs">{n.channel}</p>
      <p>{n.message}</p>
    </div>
  )}));

  const alertItems = alerts.map(a => ({ id: a.id, timestamp: a.timestamp, content: (
      <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{a.subject}</p>
          <p className="truncate">{a.body}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">To: {a.recipient}</p>
      </div>
  )}));
  
  const stats = useMemo(() => {
      const now = new Date();
      return {
          activeStays: bookings.filter(b => b.checkIn <= now && b.checkOut >= now).length,
          pendingCheckIns: bookings.filter(b => b.checkIn > now).length,
          pendingCleanings: cleaningTasks.filter(t => t.status !== CleaningStatus.COMPLETED).length,
          newMessages: messages.filter(m => m.status === MessageStatus.NEW).length
      }
  }, [bookings, cleaningTasks, messages]);
  
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [messages]);

  const taskSourceMessageIds = useMemo(() => {
    return new Set(maintenanceTasks.map(task => task.sourceMessageId));
  }, [maintenanceTasks]);
  
  const handleFilterChange = useCallback((filter: Exclude<StatFilter, null>) => {
    setActiveFilter(currentFilter => {
        const newFilter = currentFilter === filter ? null : filter;
        if (newFilter === 'pendingCleanings') {
            setActiveTab('cleaning');
        } else if (newFilter) { // for newMessages, activeStays, upcomingCheckIns
            setActiveTab('messages');
        }
        return newFilter;
    });
  }, []);

  const filteredCleaningTasks = useMemo(() => {
    if (activeFilter !== 'pendingCleanings') {
        return cleaningTasks;
    }
    return cleaningTasks.filter(t => t.status !== CleaningStatus.COMPLETED);
  }, [cleaningTasks, activeFilter]);

  const finalFilteredMessages = useMemo(() => {
    const now = new Date();
    switch (activeFilter) {
        case 'newMessages':
            return sortedMessages.filter(m => m.status === MessageStatus.NEW);
        case 'activeStays':
            const activeGuests = new Set(bookings
                .filter(b => b.checkIn <= now && b.checkOut >= now)
                .map(b => b.guestName));
            return sortedMessages.filter(m => activeGuests.has(m.guestName));
        case 'upcomingCheckIns':
            const upcomingGuests = new Set(bookings
                .filter(b => b.checkIn > now)
                .map(b => b.guestName));
            return sortedMessages.filter(m => upcomingGuests.has(m.guestName));
        default:
            return sortedMessages;
    }
  }, [sortedMessages, bookings, activeFilter]);


  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4 lg:p-8">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reservation Assistant</h1>
            <p className="text-slate-500 dark:text-slate-400">Automated Guest Communication & Property Management Dashboard</p>
        </div>
        <button
          onClick={() => handleCheckForNewMessages('Manual')}
          disabled={isChecking}
          className="mt-4 sm:mt-0 flex items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowPathIcon className={`w-5 h-5 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Check for New Messages'}
        </button>
      </header>

      <DashboardStats stats={stats} onFilterClick={handleFilterChange} activeFilter={activeFilter} />
      
      <div className="my-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('messages')}
            className={`whitespace-nowrap flex items-center py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${
              activeTab === 'messages'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-500'
            }`}
          >
            <AirbnbIcon className="w-5 h-5 mr-2" />
            Guest Messages
          </button>
          <button
            onClick={() => setActiveTab('cleaning')}
            className={`whitespace-nowrap flex items-center py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${
              activeTab === 'cleaning'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-500'
            }`}
          >
            <BroomIcon className="w-5 h-5 mr-2" />
            Cleaning Crew
          </button>
        </nav>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            {activeTab === 'messages' && 
                <MessagesPanel 
                    messages={finalFilteredMessages} 
                    highlightedMessageId={highlightedMessageId}
                    setHighlightedMessageId={setHighlightedMessageId}
                    taskSourceMessageIds={taskSourceMessageIds}
                />
            }
            {activeTab === 'cleaning' && (
                <CleaningPanel 
                    tasks={filteredCleaningTasks}
                    staff={CLEANING_STAFF}
                    notes={notes}
                    incidents={incidents}
                    clockedInStaff={clockedInStaff}
                    checklistTemplates={PROPERTY_CHECKLISTS}
                    onClockInOut={handleClockInOut}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                    onAddNote={handleAddNote}
                    onAddIncident={handleAddIncident}
                    onUpdateChecklistItem={handleUpdateChecklistItem}
                />
            )}
        </div>
        
        <div className="flex flex-col gap-6">
          <MaintenancePanel tasks={maintenanceTasks} onUpdateStatus={handleUpdateMaintenanceTaskStatus} onViewSourceMessage={handleViewSourceMessage} />
          <SidePanel title={calendarTitle} icon={<CalendarIcon className="w-6 h-6" />} items={filteredCalendarItems} emptyMessage={calendarEmptyMessage} />
          <SidePanel title="Slack Notifications" icon={<SlackIcon className="w-6 h-6" />} items={slackItems} emptyMessage="No new notifications." />
          <SidePanel title="Management Alerts" icon={<AlertIcon className="w-6 h-6" />} items={alertItems} emptyMessage="No alerts." />
        </div>

        <div className="lg:col-span-3">
            <LogPanel logs={logEntries} />
        </div>
      </main>
    </div>
  );
}

export default App;