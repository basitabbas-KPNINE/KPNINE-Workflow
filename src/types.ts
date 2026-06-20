export enum TaskStage {
  PLANNING = 'planning',
  EDITING = 'editing',
  WRITING = 'writing',
  PUBLISHING = 'publishing',
  COMPLETED = 'completed',
}

export type RoleType = 'Planner' | 'Editor' | 'Writer' | 'Designer' | 'Publisher' | 'Dashboard';

export interface UserProfile {
  id: string;
  name: string;
  role: RoleType;
  avatar: string;
}

export interface TaskLog {
  id: string;
  userId: string;
  userName: string;
  userRole: RoleType;
  action: string;
  timestamp: string;
  note?: string;
}

export interface Revision {
  id: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  stage: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface Task {
  id: string;
  clientName: string;
  title: string;
  description: string;
  format: 'Video' | 'Graphic' | 'Carousel';
  stage: TaskStage;
  createdAt: string;
  updatedAt: string;
  deadline?: string; // Project completion deadline date (YYYY-MM-DD)

  // Assigned Members
  assignedEditor?: string;
  assignedWriter?: string;

  // Local folder paths (opens in File Explorer)
  rawFootagePath?: string;   // e.g. D:\Footage\ClientName\VideoX
  editedFilePath?: string;   // e.g. D:\Edits\ClientName\VideoX

  // Legacy URL links (Google Drive etc)
  rawFootageLink?: string;
  editedFileLink?: string;

  // Videographer
  videographerName?: string;
  footageNotes?: string;
  videographerSubmittedAt?: string;

  // Editor
  editorName?: string;
  editorNotes?: string;
  editorSubmittedAt?: string;

  // Writer
  writerName?: string;
  captionText?: string;
  hashtags?: string;
  writerNotes?: string;
  writerSubmittedAt?: string;

  // Publisher
  publishedPlatform?: string;
  publishedLink?: string;
  publisherNotes?: string;
  publisherSubmittedAt?: string;

  // Revisions
  revisions?: Revision[];
  revisionCount?: number;

  // Multi-platform submissions
  submissions?: Array<{
    platform: string;
    link: string;
    notes?: string;
    publishedAt?: string;
  }>;

  isViewedByNextRole?: boolean;
}

export interface ActivityChange {
  id: string;
  taskId: string;
  taskTitle: string;
  clientName: string;
  userId: string;
  userName: string;
  userRole: RoleType;
  action: string;
  timestamp: string;
  details?: string;
}

export interface AgencyUser {
  id: string;
  name: string;
  role: RoleType;
  avatar: string;
  passcode: string;
  description: string;
  slackMemberId?: string;  // Personal Slack member ID for DMs
}

// Team member config
export interface TeamMember {
  name: string;
  role: RoleType;
  slackMemberId?: string;
}
