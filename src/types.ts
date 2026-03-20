export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type UserRole = 'admin' | 'user' | 'coordinator' | 'trainer' | 'client' | 'participant' | 'sales' | 'marketing' | 'hr' | 'accountant' | 'finance';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  department?: 'Operation' | 'Sales' | 'Marketing' | 'HR';
  organizationId?: string;
  isDemo?: boolean;
  canEditAccounting?: boolean;
  canDeleteNotes?: boolean;
  photoURL?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  createdAt: string;
  courseId?: string;
  isUrgent?: boolean;
  uniqueKey?: string;
}

export interface AccountingComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface AccountingEntry {
  id: string;
  courseId: string;
  type: 'cost' | 'payment';
  value: number;
  currency: 'USD' | 'EUR' | 'SAR' | 'AED' | 'GBP';
  date: string;
  description: string;
  entryType?: string;
  isZeroValue: boolean;
  salesId?: string;
  assignedTo: string[]; // Array of UIDs
  checkRequests: string[]; // Array of UIDs
  checkedBy: string[]; // Array of UIDs
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  note?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  completedBy?: string;
  completedByName?: string;
  completedAt?: string;
  category?: 'hotel' | 'material' | 'trainer' | 'client' | 'logistics' | 'evaluation' | 'other';
  note?: string;
  noteId?: string;
  isMandatory?: boolean;
  hotelMapsUrl?: string;
  meetingRoomName?: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
  }[];
}

export interface Course {
  id: string;
  name: string;
  referenceNumber: string;
  startDate: string;
  endDate: string;
  location: string;
  hotelName?: string;
  status: 'request' | 'in_progress' | 'confirmed' | 'cancelled';
  isConfirmedBySales?: boolean;
  materialReceived?: boolean;
  trainerId?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientCompany?: string;
  salesPersonId?: string;
  salesPersonName?: string;
  marketingPersonId?: string;
  marketingPersonName?: string;
  hrPersonId?: string;
  hrPersonName?: string;
  hasCost?: boolean;
  source?: string;
  createdAt?: string;
  checklist?: ChecklistItem[];
  holidays?: string[];
}

export interface DailyLog {
  id: string;
  courseId: string;
  date: string;
  trainerArrivalTime?: string;
  participantArrivalTime?: string;
  trainerOutfit?: 'Formal' | 'Semi-Formal' | 'Casual';
  presentationUsed?: boolean;
  clientImpression?: string;
  exceptionalNotes?: string;
  incidents?: string;
  coordinatorId: string;
  images?: string[];
}

export interface Attendance {
  id: string;
  courseId: string;
  participantId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}

export interface Feedback {
  id: string;
  courseId: string;
  participantId: string;
  date: string;
  type: 'daily' | 'final';
  ratings: Record<string, number>;
  comments?: string;
}

export interface CourseNote {
  id: string;
  courseId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  isImportant?: boolean;
  category?: ChecklistItem['category'];
  seenBy?: {
    uid: string;
    name: string;
    at: string;
  }[];
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
}

export interface CourseAttachment {
  id: string;
  courseId: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedBy: string;
  uploadedByName: string;
  documentType?: string;
  createdAt: string;
}
