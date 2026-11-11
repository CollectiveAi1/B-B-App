import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// jsdom does not implement these browser APIs. The app only needs them to exist.
Element.prototype.scrollIntoView = () => {};
URL.createObjectURL = () => 'blob:test-photo';
URL.revokeObjectURL = () => {};
