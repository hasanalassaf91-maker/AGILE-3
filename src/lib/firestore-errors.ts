import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error Details:', errInfo);
  
  // Provide user feedback
  if (errInfo.error.includes('permission') || errInfo.error.includes('insufficient')) {
    alert('خطأ في الصلاحيات: ليس لديك الإذن للقيام بهذه العملية.');
  } else {
    alert(`حدث خطأ في قاعدة البيانات: ${errInfo.error}`);
  }
}

export function handleStorageError(error: any) {
  console.error('Firebase Storage Error:', error);
  const code = error?.code || error?.message;
  
  if (code === 'storage/unauthorized' || code?.includes('permission-denied')) {
    alert('خطأ في الصلاحيات: يرجى التأكد من إعداد قوانين الحماية (Storage Rules) في Firebase.');
  } else if (code === 'storage/retry-limit-exceeded') {
    alert('انتهى وقت المحاولة. يرجى التحقق من اتصال الإنترنت.');
  } else if (code === 'storage/canceled') {
    alert('تم إلغاء الرفع.');
  } else {
    alert(`حدث خطأ أثناء رفع الملف: ${code}. تأكد من تفعيل خدمة Storage في لوحة تحكم Firebase.`);
  }
}
