import type { DiscoveryDiagnostic, ExtractedQueueConfig } from './types.js';

export interface ModernDiscoveredBase {
  id: string;
  exportName: string;
  filePath: string;
  absoluteFilePath: string;
  description?: string;
}

export interface ModernDiscoveredDurableObject extends ModernDiscoveredBase {
  objectName: string;
  bindingName: string;
  className: string;
  version?: number;
}

export interface ModernDiscoveredDurableRegistration extends ModernDiscoveredBase {
  ownerId: string;
  ownerExportName: string;
  kind: 'fn' | 'internal' | 'fetch' | 'alarm' | 'init' | 'websocket';
}

export interface ModernDiscoveredQueue extends ModernDiscoveredBase {
  kind: 'single' | 'multi';
  queueName: string;
  bindingName: string;
  config: ExtractedQueueConfig;
  jobNames: string[];
}

export interface ModernDiscoveredQueueConsumer extends ModernDiscoveredBase {
  ownerId: string;
  ownerExportName: string;
  kind: 'message' | 'batch' | 'job-message';
  jobName?: string;
}

export interface ModernDiscoveryResult {
  hasModernSurface: boolean;
  durableObjects: ModernDiscoveredDurableObject[];
  durableRegistrations: ModernDiscoveredDurableRegistration[];
  queues: ModernDiscoveredQueue[];
  queueConsumers: ModernDiscoveredQueueConsumer[];
  diagnostics: DiscoveryDiagnostic[];
}
