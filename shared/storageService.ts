import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebaseConfig';
import { convertToWebP } from './utils/imageUtils';

/**
 * Upload an image to Firebase Storage
 * @param file - The image file to upload
 * @param path - The storage path (e.g., 'products/userId/filename.jpg')
 * @returns The download URL of the uploaded image
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  if (!storage) throw new Error('Firebase Storage not initialized');

  // Convert to WebP format for better compression
  const webpFile = await convertToWebP(file);

  // Update path to use .webp extension
  const webpPath = path.replace(/\.[^/.]+$/, '.webp');
  const storageRef = ref(storage, webpPath);
  const snapshot = await uploadBytes(storageRef, webpFile);
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}

/**
 * Upload multiple images
 * @param files - Array of image files
 * @param basePath - Base path for storage (e.g., 'products/userId')
 * @returns Array of download URLs
 */
export async function uploadMultipleImages(files: File[], basePath: string): Promise<string[]> {
  const uploadPromises = files.map((file, index) => {
    const timestamp = Date.now();
    const filename = `${timestamp}_${index}_${file.name}`;
    const path = `${basePath}/${filename}`;
    return uploadImage(file, path);
  });

  return Promise.all(uploadPromises);
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The full download URL of the image
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  if (!storage) throw new Error('Firebase Storage not initialized');

  try {
    // Extract the path from the download URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
    
    if (pathMatch && pathMatch[1]) {
      const path = decodeURIComponent(pathMatch[1]);
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

/**
 * Delete multiple images
 * @param imageUrls - Array of image URLs to delete
 */
export async function deleteMultipleImages(imageUrls: string[]): Promise<void> {
  const deletePromises = imageUrls.map(url => deleteImage(url).catch(console.error));
  await Promise.all(deletePromises);
}

/**
 * Upload image from URL (for seeding)
 * @param imageUrl - URL of the image to fetch and upload
 * @param storagePath - Path in Firebase Storage
 * @returns Download URL
 */
export async function uploadImageFromURL(imageUrl: string, storagePath: string): Promise<string> {
  if (!storage) throw new Error('Firebase Storage not initialized');

  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image from URL:', error);
    throw error;
  }
}

/**
 * Upload local file to Firebase Storage (for seeding from local files)
 * @param localPath - Local file path
 * @param storagePath - Path in Firebase Storage
 * @returns Download URL
 */
export async function uploadLocalImage(localPath: string, storagePath: string): Promise<string> {
  if (!storage) throw new Error('Firebase Storage not initialized');
  
  // For browser environment, we need to fetch the file from public folder
  const response = await fetch(localPath);
  const blob = await response.blob();
  
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, blob);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
}

/**
 * List all images in a storage path
 * @param path - Storage path to list
 * @returns Array of download URLs
 */
export async function listImages(path: string): Promise<string[]> {
  if (!storage) throw new Error('Firebase Storage not initialized');

  const storageRef = ref(storage, path);
  const result = await listAll(storageRef);
  
  const urlPromises = result.items.map(itemRef => getDownloadURL(itemRef));
  return Promise.all(urlPromises);
}

/**
 * Validate image file
 * @param file - File to validate
 * @returns Validation result
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tip de fișier invalid. Folosește JPG, PNG sau WebP.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Fișierul este prea mare. Dimensiunea maximă este 5MB.' };
  }

  return { valid: true };
}