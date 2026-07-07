export type InputStrategy =
  | 'contenteditable'
  | 'textarea'
  | 'prompt box selector'
  | 'active focused element';

export type SubmitMethod =
  | 'Enter'
  | 'Ctrl+Enter'
  | 'click send button'
  | 'custom JavaScript fallback';

export type CompletionDetectionMethod =
  | 'response text stable'
  | 'stop button disappears'
  | 'send button re-enabled'
  | 'fixed timeout fallback';

export type ExtractionMethod =
  | 'latest assistant message'
  | 'contribution marker'
  | 'full page cleaned text'
  | 'custom selector';

export type DriverHealth = 'ready' | 'needs review' | 'untested';

export type DriverConfig = {
  participantId: string;
  urlPattern: string;
  inputStrategy: InputStrategy;
  submitMethod: SubmitMethod;
  completionDetectionMethod: CompletionDetectionMethod;
  extractionMethod: ExtractionMethod;
  cleanupRules: string;
  health: DriverHealth;
};
