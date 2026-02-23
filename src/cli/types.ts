export interface ExtractedQueueConfig {
  retry?: number;
  retryDelay?: string | number;
  deadLetter?: string;
  deliveryDelay?: string | number;
  batchMaxSize?: number;
  batchTimeout?: string | number;
  maxConcurrency?: number;
  visibilityTimeout?: string | number;
  consumerType?: 'worker' | 'http_pull';
  hasHandler: boolean;
  hasBatchHandler: boolean;
  isMultiJob: boolean;
}

export interface DiscoveredQueue {
  exportName: string;
  queueName: string;
  bindingName: string;
  filePath: string;
  absoluteFilePath: string;
  isDefaultExport: boolean;
  importName: string;
  config: ExtractedQueueConfig;
}

export type DiagnosticLevel = 'error' | 'warning';

export interface DiscoveryDiagnostic {
  level: DiagnosticLevel;
  code:
    | 'QUEUE_NAME_CONFLICT'
    | 'BINDING_NAME_CONFLICT'
    | 'INVALID_HANDLER_MODE'
    | 'INVALID_PULL_MODE_HANDLER'
    | 'UNSUPPORTED_PULL_MULTIJOB'
    | 'SCANNER_FILE_ERROR'
    | 'NO_QUEUES_FOUND'
    | 'NON_STATIC_CONFIG'
    | 'INVALID_DURATION';
  message: string;
  filePath?: string;
  hint?: string;
}

export interface DiscoveryResult {
  queues: DiscoveredQueue[];
  diagnostics: DiscoveryDiagnostic[];
}

export interface CliConfig {
  rootDir: string;
  ignore: string[];
  workerEntry?: string;
  legacyServiceWorker?: boolean;
  inferEnvTypes?: boolean;
}

export interface GenerateResult {
  discovery: DiscoveryResult;
  generatedEntryPath: string;
  generatedTypesPath: string;
  wranglerConfigPath: string;
  autoEnvPath: string;
}

export interface CliErrorOptions {
  code: string;
  summary: string;
  file?: string;
  details?: string;
  hint?: string;
  docsUrl?: string;
  cause?: unknown;
}
