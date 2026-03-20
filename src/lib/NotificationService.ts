import { collection, query, where, getDocs, addDoc, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Course, Notification } from '../types';
import { format, isSameDay, addDays, subDays, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { handleFirestoreError, OperationType } from './firestore-errors';

export const NotificationService = {
  async checkAndGenerateNotifications(profile: UserProfile, courses: Course[]) {
    if (profile.department !== 'Operation' && profile.role !== 'coordinator') return;

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    for (const course of courses) {
      // Only process courses assigned to this user
      if (course.coordinatorId !== profile.uid) continue;

      const startDate = parseISO(course.startDate);
      const endDate = parseISO(course.endDate);

      // 1. Pre-course reminder (1 day before start)
      const preCourseDate = subDays(startDate, 1);
      if (isSameDay(today, preCourseDate)) {
        await this.ensureNotification(
          profile.uid,
          course.id,
          'PRE_COURSE',
          'Upcoming Course Reminder',
          'Dont forget to remind the trainers about their next week upcoming course , send them the TNA, and reserve the shuttle form',
          'error',
          true
        );
      }

      // 2. Daily reminder (During course, after 14:00)
      if (isWithinInterval(today, { start: startOfDay(startDate), end: startOfDay(endDate) })) {
        const currentHour = today.getHours();
        if (currentHour >= 14) {
          await this.ensureNotification(
            profile.uid,
            course.id,
            `DAILY_${todayStr}`,
            'Daily Course Follow-up',
            'Dont forget to follow up your assigned courses ( upload photos , reports , and financial entries )',
            'info',
            false
          );
        }
      }
    }
  },

  async ensureNotification(
    userId: string,
    courseId: string,
    uniqueKey: string,
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success',
    isUrgent: boolean
  ) {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('courseId', '==', courseId),
      where('uniqueKey', '==', uniqueKey)
    );

    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        const newNotification = {
          userId,
          courseId,
          uniqueKey, // Used to prevent duplicates for the same day/event
          title,
          message,
          type,
          isRead: false,
          isUrgent,
          createdAt: new Date().toISOString()
        };

        await addDoc(notificationsRef, newNotification);
        
        // Simulate Email Sending
        this.sendEmailReminder(userId, title, message);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    }
  },

  sendEmailReminder(userId: string, title: string, message: string) {
    console.log(`[EMAIL REMINDER] To User: ${userId} | Subject: ${title} | Message: ${message}`);
    // In a real app, this would call a cloud function or backend API
  }
};
