import type {
  CompletionDetectionMethod,
  ExtractionMethod,
  InputStrategy,
  SubmitMethod,
} from '../types/driver';

export const inputStrategyOptions: InputStrategy[] = [
  'contenteditable',
  'textarea',
  'prompt box selector',
  'active focused element',
];

export const submitMethodOptions: SubmitMethod[] = [
  'Enter',
  'Ctrl+Enter',
  'click send button',
  'custom JavaScript fallback',
];

export const completionDetectionOptions: CompletionDetectionMethod[] = [
  'response text stable',
  'stop button disappears',
  'send button re-enabled',
  'fixed timeout fallback',
];

export const extractionMethodOptions: ExtractionMethod[] = [
  'latest assistant message',
  'contribution marker',
  'full page cleaned text',
  'custom selector',
];
