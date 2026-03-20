import { ChecklistItem } from './types';

export const DAILY_REPORT_TEMPLATE = `Trainer arrival time: 
Participant arrival time: 
Trainer outfit: 
Presentation: `;

export const SHIPMENT_DETAILS_TEMPLATE = `Reciver Name: 
Reciver Phone:
Reciver Mail: 
Reciver Address:`;

export const DEFAULT_TASKS: { task: string; category: ChecklistItem['category']; note?: string }[] = [
  { task: 'Trainer confirmed', category: 'trainer' },
  { task: 'Hotel reserved', category: 'hotel' },
  { task: 'Arrival Shuttle reserved', category: 'logistics' },
  { task: 'Departure Shuttle reserved', category: 'logistics' },
  { task: 'Assignment Letter sent to trainer', category: 'trainer' },
  { task: 'Received trainer ID and Signed Assignment Letter', category: 'trainer' },
  { task: 'Shipment Delivered', category: 'logistics' },
  { task: 'First Day impression', category: 'client' },
  { task: 'Upload Course Presentation', category: 'material' },
  { task: 'Shipment Details:', category: 'other', note: SHIPMENT_DETAILS_TEMPLATE },
];
