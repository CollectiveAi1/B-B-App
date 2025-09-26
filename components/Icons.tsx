import React from 'react';

export const AirbnbIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 1000 1000" role="img" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="m499.3 135.5c-157.6 0-285.7 128.1-285.7 285.7s128.1 285.7 285.7 285.7 285.7-128.1 285.7-285.7-128.1-285.7-285.7-285.7zm0 488.1c-111.8 0-202.4-90.6-202.4-202.4s90.6-202.4 202.4-202.4 202.4 90.6 202.4 202.4-90.6 202.4-202.4 202.4zm0-345.9c-8.9 0-16.1 7.2-16.1 16.1v102.1c0 8.9 7.2 16.1 16.1 16.1s16.1-7.2 16.1-16.1v-102.1c0-8.9-7.2-16.1-16.1-16.1zm-136.6 244.7c-59.5-27.1-100.8-84.9-100.8-152.1 0-89.9 73.1-163.1 163.1-163.1s163.1 73.1 163.1 163.1c0 67.2-41.3 125-100.8 152.1-11.2 5.1-24.1 2-31-7.4-6.9-9.5-8.2-22-3.1-33.2 27.1-59.5 42.1-125.7 42.1-196.2s-15-136.6-42.1-196.2c-5.1-11.2-3.8-23.8 3.1-33.2 6.9-9.5 19.8-12.5 31-7.4 59.5 27.1 100.8 84.9 100.8 152.1 0 89.9-73.1 163.1-163.1 163.1s-163.1-73.1-163.1-163.1c0-67.2 41.3-125 100.8-152.1 11.2-5.1 24.1-2 31 7.4 6.9 9.5 8.2 22 3.1 33.2-27.1 59.5-42.1 125.7-42.1 196.2s15 136.6 42.1 196.2c5.1 11.2 3.8 23.8-3.1 33.2-6.9 9.5-19.8 12.5-31 7.4zm273.1-119.5c-45.7 0-82.7-37.1-82.7-82.7s37.1-82.7 82.7-82.7 82.7 37.1 82.7 82.7-37.1 82.7-82.7 82.7zm0-136.6c-29.8 0-53.9 24.2-53.9 53.9s24.2 53.9 53.9 53.9 53.9-24.2 53.9-53.9-24.2-53.9-53.9-53.9zm-273.1 0c-45.7 0-82.7-37.1-82.7-82.7s37.1-82.7 82.7-82.7 82.7 37.1 82.7 82.7-37.1 82.7-82.7 82.7zm0-136.6c-29.8 0-53.9 24.2-53.9 53.9s24.2 53.9 53.9 53.9 53.9-24.2 53.9-53.9-24.2-53.9-53.9-53.9z"></path>
  </svg>
);
export const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
export const SlackIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 122.8 122.8" fill="currentColor">
    <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm12.9 12.9c7.1 0 12.9-5.8 12.9-12.9V64.7H38.7c-7.1 0-12.9 5.8-12.9 12.9s5.8 12.9 12.9 12.9zM44.6 25.8c-7.1 0-12.9 5.8-12.9 12.9s5.8 12.9 12.9 12.9 12.9-5.8 12.9-12.9V25.8H44.6zm-12.9 12.9c0-7.1 5.8-12.9 12.9-12.9h12.9v12.9c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9zM97 44.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V44.6zm-12.9-12.9c-7.1 0-12.9 5.8-12.9 12.9v12.9h12.9c7.1 0 12.9-5.8 12.9-12.9s-5.8-12.9-12.9-12.9zM78.2 97c7.1 0 12.9-5.8 12.9-12.9s-5.8-12.9-12.9-12.9-12.9 5.8-12.9 12.9v12.9h12.9zm12.9-12.9c0 7.1-5.8 12.9-12.9 12.9H65.3V84.1c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v12.9z" />
  </svg>
);
export const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
export const LogIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
export const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);
export const RobotIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5v3.75c0 1.5-1.25 2.75-2.75 2.75S2.75 12.75 2.75 11.25V7.5m11.5 0v3.75c0 1.5-1.25 2.75-2.75 2.75s-2.75-1.25-2.75-2.75V7.5m-7.5 0h7.5" />
    </svg>
);
export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
export const ExclamationCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
export const ArrowPathIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-11.664 0l3.181-3.183a8.25 8.25 0 00-11.664 0l3.181 3.183" />
    </svg>
);
export const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
);
export const BroomIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);
export const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);
export const ClipboardDocumentListIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25v8.25A2.25 2.25 0 0 1 18 21h-5.25A2.25 2.25 0 0 1 10.5 18.75v-8.25A2.25 2.25 0 0 1 12.75 8.25h3.75Z" />
    </svg>
);
export const InboxIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.012-1.244h3.86M2.25 9h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512A2.25 2.25 0 0 1 16.14 9h3.86" />
    </svg>
);
export const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
);
export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);
export const WrenchScrewdriverIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.664 1.208-.766M11.42 15.17l-4.636 4.636a2.121 2.121 0 01-3 0l-1.707-1.707a2.121 2.121 0 010-3L11.42 3.99z" />
    </svg>
);
export const ChatBubbleLeftEllipsisIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
);
