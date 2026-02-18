
export type Impact = 'critical' | 'serious' | 'moderate' | 'minor' | 'info';

export type IssueCategory = 'Development' | 'Design' | 'Content';
export type IssueStatus = 'Confirmed' | 'Potential';
export type ConformanceLevel = 'A' | 'AA' | 'AAA' | 'S';

export interface AccessibilityNode {
  html: string;
  target: string[];
  failureSummary?: string;
  liveHTML?: string;
}

export interface AccessibilityIssue {
  id: string;
  engine: 'axe' | 'siteimprove' | 'alfa';
  impact: Impact;
  description: string;
  help: string;
  helpUrl?: string;
  tags: string[];
  nodes: AccessibilityNode[];
  wcag?: string;
  conformance?: ConformanceLevel;
  issueType?: string;
  category?: IssueCategory;
  status?: IssueStatus;
  confidenceScore?: number;
}

export interface PageScanResult {
  scanId: string;
  batchId: string;
  mode: ScanMode;
  path: string;
  title: string;
  url: string;
  issues: AccessibilityIssue[];
  timestamp: number;
  htmlSnapshot?: string;
}

export enum ScanMode {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  BATCH = 'batch'
}

// New Batch Job Types
export type JobStatus = 'idle' | 'running' | 'paused' | 'completed' | 'aborted';

export interface BatchJobItem {
  id: string;
  url: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  error?: string;
  result?: PageScanResult;
}

export interface BatchJob {
  id: string;
  name: string;
  items: BatchJobItem[];
  status: JobStatus;
  progress: number;
  startTime: number;
  endTime?: number;
}
