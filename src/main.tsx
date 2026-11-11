import '@fontsource-variable/space-grotesk';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { createAssistantClient } from './services/assistantClient';

const container = document.getElementById('root');
if (!container) {
  throw new Error('index.html is missing the #root element the app mounts into.');
}

const assistant = createAssistantClient();

createRoot(container).render(
  <StrictMode>
    <App client={assistant} />
  </StrictMode>,
);
