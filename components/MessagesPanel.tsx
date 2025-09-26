import React, { useEffect, useRef } from 'react';
import { Message, MessageStatus } from '../types';
import { UserIcon, RobotIcon, CheckCircleIcon, ExclamationCircleIcon, ArrowPathIcon, AirbnbIcon, LinkIcon, WrenchScrewdriverIcon } from './Icons';
import { formatDistanceToNow } from 'date-fns';

interface MessagesPanelProps {
  messages: Message[];
  highlightedMessageId: string | null;
  setHighlightedMessageId: (id: string | null) => void;
  taskSourceMessageIds: Set<string>;
}

const getStatusBadge = (status: MessageStatus) => {
  switch (status) {
    case MessageStatus.NEW:
      return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">New</span>;
    case MessageStatus.PROCESSING:
      return <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full dark:bg-yellow-900 dark:text-yellow-300">Processing...</span>;
    case MessageStatus.RESPONDED:
      return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300">Responded</span>;
    case MessageStatus.ESCALATED:
      return <span className="px-2 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-full dark:bg-purple-900 dark:text-purple-300">Escalated</span>;
    case MessageStatus.FAILED:
      return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full dark:bg-red-900 dark:text-red-300">Failed</span>;
  }
};

const MessageItem = React.forwardRef<HTMLDivElement, { message: Message; isHighlighted: boolean; hasTask: boolean; }>(({ message, isHighlighted, hasTask }, ref) => {
  const systemMessageClasses = "p-4 bg-indigo-50 dark:bg-slate-700/50 rounded-lg mb-4";
  const guestMessageClasses = `p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg mb-4 transition-all duration-300 ${isHighlighted ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800' : ''}`;

  if (message.author === 'system') {
    return (
       <div className={systemMessageClasses} ref={ref}>
        <div className="flex items-center mb-2">
          <RobotIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400 mr-2 flex-shrink-0" />
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">Automated Message Sent to {message.guestName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap pl-8">{message.aiResponse}</p>
      </div>
    );
  }

  return (
    <div className={guestMessageClasses} ref={ref}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center mb-2">
            <UserIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 mr-2" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{message.guestName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-300">{message.content}</p>
        </div>
        <div className="flex flex-col items-end ml-4 space-y-2">
          {getStatusBadge(message.status)}
          {hasTask && (
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded-full" title="Maintenance task created from this message">
                <WrenchScrewdriverIcon className="w-3.5 h-3.5 mr-1.5" />
                <span>Task Created</span>
            </div>
          )}
        </div>
      </div>

      {message.status === MessageStatus.PROCESSING && (
         <div className="mt-4 border-t border-slate-200 dark:border-slate-600 pt-4 flex items-center text-slate-500 dark:text-slate-400 animate-pulse">
            <ArrowPathIcon className="w-5 h-5 mr-3 animate-spin" />
            <span>AI is thinking...</span>
        </div>
      )}
      
      {message.status === MessageStatus.RESPONDED && message.aiResponse && (
        <div className="mt-4 border-t border-slate-200 dark:border-slate-600 pt-4">
          <div className="flex items-center mb-2 text-green-600 dark:text-green-400">
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            <h4 className="font-semibold text-sm">AI Generated Response</h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{message.aiResponse}</p>
          {message.groundingSources && message.groundingSources.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Sources:</h5>
              <ul className="space-y-1">
                {message.groundingSources.map((source, index) => (
                  <li key={index}>
                    <a 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <LinkIcon className="w-3 h-3 mr-1.5 flex-shrink-0"/>
                      <span className="truncate">{source.title || source.uri}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {message.status === MessageStatus.ESCALATED && (
        <div className="mt-4 border-t border-slate-200 dark:border-slate-600 pt-4">
          <div className="flex items-center mb-2 text-purple-600 dark:text-purple-400">
            <ExclamationCircleIcon className="w-5 h-5 mr-2" />
            <h4 className="font-semibold text-sm">Action: Escalated to Staff</h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {message.aiResponse || "This issue requires human attention and has been forwarded to the management team."}
          </p>
        </div>
      )}
    </div>
  );
});


const MessagesPanel: React.FC<MessagesPanelProps> = ({ messages, highlightedMessageId, setHighlightedMessageId, taskSourceMessageIds }) => {
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (highlightedMessageId) {
        const ref = messageRefs.current[highlightedMessageId];
        if (ref) {
            ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const timer = setTimeout(() => {
                setHighlightedMessageId(null);
            }, 3000); // Highlight for 3 seconds
            return () => clearTimeout(timer);
        } else {
             // If ref not yet available, try again after a short delay
            setTimeout(() => {
                messageRefs.current[highlightedMessageId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 const timer = setTimeout(() => setHighlightedMessageId(null), 3000);
                 // No cleanup here as it might clear the outer timeout
            }, 100);
        }
    }
  }, [highlightedMessageId, setHighlightedMessageId]);
  
  return (
    <div className="h-full flex flex-col">
       <div className="flex items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-xl">
        <div className="text-pink-600"><AirbnbIcon className="w-8 h-8"/></div>
        <h2 className="ml-3 text-lg font-semibold text-slate-800 dark:text-slate-200">Guest Messages</h2>
      </div>
      <div className="p-4 flex-grow overflow-y-auto bg-white dark:bg-slate-800 rounded-b-xl">
      {messages.length > 0 ? (
          messages.map(msg => {
            // FIX: The ref callback for a forwarded ref should not return a value. The original
            // concise arrow function `(el => ...)` implicitly returned a value, causing a type error.
            // This is fixed by using a block body `{}` for the callback, ensuring it returns `void`.
            return <MessageItem 
                key={msg.id} 
                message={msg} 
                isHighlighted={msg.id === highlightedMessageId}
                hasTask={taskSourceMessageIds.has(msg.id)}
                ref={el => { messageRefs.current[msg.id] = el; }}
            />
          })
      ) : (
          <p className="text-center text-slate-500 dark:text-slate-400 mt-8">No new messages.</p>
      )}
      </div>
    </div>
  );
};

export default MessagesPanel;