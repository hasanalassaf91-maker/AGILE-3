import React, { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Loader2, User as UserIcon, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { handleStorageError } from '../lib/firestore-errors';

export default function ProfilePictureUpload() {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      // Delete old photo if it exists
      if (profile.photoURL) {
        try {
          const oldPhotoRef = ref(storage, profile.photoURL);
          await deleteObject(oldPhotoRef);
        } catch (e) {
          console.error('Error deleting old photo:', e);
        }
      }

      const storageRef = ref(storage, `profiles/${profile.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'users', profile.uid), {
        photoURL: downloadURL
      });
    } catch (error) {
      handleStorageError(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!profile?.photoURL || !window.confirm('Are you sure you want to remove your profile picture?')) return;

    setUploading(true);
    try {
      const photoRef = ref(storage, profile.photoURL);
      await deleteObject(photoRef);
      await updateDoc(doc(db, 'users', profile.uid), {
        photoURL: null
      });
    } catch (error) {
      handleStorageError(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
        {profile?.photoURL ? (
          <img 
            src={profile.photoURL} 
            alt={profile.name} 
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-[#5A5A40]/10 text-[#5A5A40]">
            <UserIcon size={20} />
          </div>
        )}
      </div>
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all border border-gray-100",
          uploading && "animate-pulse"
        )}
        title="Upload Photo"
      >
        {uploading ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
      </button>

      {profile?.photoURL && !uploading && (
        <button 
          onClick={handleDeletePhoto}
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white shadow-md flex items-center justify-center text-red-400 hover:text-red-600 transition-all border border-gray-100 opacity-0 group-hover:opacity-100"
          title="Remove Photo"
        >
          <Trash2 size={10} />
        </button>
      )}
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
}
