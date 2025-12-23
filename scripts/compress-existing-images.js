#!/usr/bin/env node

/**
 * Script to compress existing images in Firebase Storage
 * This script will:
 * 1. List all images in Firebase Storage
 * 2. Download each image
 * 3. Compress it using the enhanced WebP conversion
 * 4. Upload the compressed version back to Firebase Storage
 * 5. Update any Firestore references if needed
 */

const { initializeApp } = require('firebase/app');
const { getStorage, ref, listAll, getDownloadURL, uploadBytes, deleteObject } = require('firebase/storage');
const { getFirestore, collection, getDocs, updateDoc, query, where } = require('firebase/firestore');
const fetch = require('node-fetch');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

// Configuration
const MAX_SIZE_KB = 700; // Target maximum file size in KB
const TEMP_DIR = './temp-images';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

/**
 * Compress image using sharp (more reliable than browser-based conversion)
 */
async function compressImage(buffer, originalName) {
  try {
    // First, get image metadata
    const metadata = await sharp(buffer).metadata();
    
    let image = sharp(buffer);
    
    // If image is too large, resize it
    if (metadata.size > MAX_SIZE_KB * 1024) {
      const sizeRatio = Math.sqrt((MAX_SIZE_KB * 1024) / metadata.size);
      const targetWidth = Math.round(metadata.width * sizeRatio);
      const targetHeight = Math.round(metadata.height * sizeRatio);
      
      console.log(`Resizing ${originalName}: ${metadata.width}x${metadata.height} -> ${targetWidth}x${targetHeight}`);
      image = image.resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Convert to WebP with quality adjustment
    const webpBuffer = await image
      .webp({ quality: 70, effort: 6 })
      .toBuffer();
    
    // If still too large, try more aggressive compression
    if (webpBuffer.length > MAX_SIZE_KB * 1024) {
      console.log(`First attempt too large (${Math.round(webpBuffer.length/1024)}KB), trying more aggressive compression`);
      const moreAggressive = await sharp(buffer)
        .resize(Math.round(metadata.width * 0.7), Math.round(metadata.height * 0.7), {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 60, effort: 6 })
        .toBuffer();
      
      if (moreAggressive.length <= MAX_SIZE_KB * 1024) {
        console.log(`Success with aggressive compression: ${Math.round(moreAggressive.length/1024)}KB`);
        return moreAggressive;
      }
    }
    
    console.log(`Compression successful: ${Math.round(webpBuffer.length/1024)}KB`);
    return webpBuffer;
  } catch (error) {
    console.error('Error compressing image:', error);
    return buffer; // Return original if compression fails
  }
}

/**
 * Process a single storage path
 */
async function processStoragePath(storagePath) {
  try {
    console.log(`\nProcessing path: ${storagePath}`);
    const storageRef = ref(storage, storagePath);
    const result = await listAll(storageRef);
    
    if (result.items.length === 0) {
      console.log('No items found in this path');
      return;
    }
    
    console.log(`Found ${result.items.length} items to process`);
    
    for (const itemRef of result.items) {
      try {
        const itemPath = itemRef.fullPath;
        console.log(`\nProcessing: ${itemPath}`);
        
        // Skip if already a WebP file (but still check size)
        if (itemPath.endsWith('.webp')) {
          const url = await getDownloadURL(itemRef);
          const response = await fetch(url);
          const buffer = await response.buffer();
          
          if (buffer.length <= MAX_SIZE_KB * 1024) {
            console.log(`✅ ${itemPath} already optimized (${Math.round(buffer.length/1024)}KB)`);
            continue;
          } else {
            console.log(`🔄 ${itemPath} is WebP but too large (${Math.round(buffer.length/1024)}KB), recompressing`);
          }
        }
        
        // Download the original file
        const originalUrl = await getDownloadURL(itemRef);
        const response = await fetch(originalUrl);
        const originalBuffer = await response.buffer();
        
        console.log(`Original size: ${Math.round(originalBuffer.length/1024)}KB`);
        
        // Compress the image
        const compressedBuffer = await compressImage(originalBuffer, path.basename(itemPath));
        
        if (compressedBuffer.length > MAX_SIZE_KB * 1024) {
          console.warn(`⚠️ Could not compress ${itemPath} below ${MAX_SIZE_KB}KB (result: ${Math.round(compressedBuffer.length/1024)}KB)`);
          continue;
        }
        
        // Create backup of original
        const backupPath = `${itemPath}.backup.${Date.now()}`;
        const backupRef = ref(storage, backupPath);
        await uploadBytes(backupRef, originalBuffer);
        console.log(`Backup created: ${backupPath}`);
        
        // Upload compressed version
        const compressedRef = ref(storage, itemPath);
        await uploadBytes(compressedRef, compressedBuffer, {
          contentType: 'image/webp'
        });
        
        console.log(`✅ Compressed ${itemPath}: ${Math.round(originalBuffer.length/1024)}KB -> ${Math.round(compressedBuffer.length/1024)}KB`);
        
        // Update Firestore references if this is a product image
        if (itemPath.startsWith('products/')) {
          await updateProductReferences(itemPath, originalUrl);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${itemRef.fullPath}:`, error.message);
      }
    }
    
    // Recursively process subdirectories
    for (const prefix of result.prefixes) {
      await processStoragePath(prefix.fullPath);
    }
    
  } catch (error) {
    console.error(`Error processing path ${storagePath}:`, error.message);
  }
}

/**
 * Update product references in Firestore
 */
async function updateProductReferences(imagePath, originalUrl) {
  try {
    // Extract product ID from path (assuming format: products/userId/timestamp_filename.ext)
    const pathParts = imagePath.split('/');
    if (pathParts.length < 3) return;
    
    // The product ID might be in the path, but we need to search for products containing this URL
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('images', 'array-contains', originalUrl));
    
    const querySnapshot = await getDocs(q);
    
    for (const doc of querySnapshot.docs) {
      const productData = doc.data();
      const updatedImages = productData.images.map(img => 
        img === originalUrl ? `gs://${firebaseConfig.storageBucket}/${imagePath}` : img
      );
      
      await updateDoc(doc.ref, { images: updatedImages });
      console.log(`Updated product ${doc.id} with new image reference`);
    }
  } catch (error) {
    console.error('Error updating product references:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Firebase image compression script');
    console.log(`Target size: ${MAX_SIZE_KB}KB max`);
    
    // Process main image directories
    const directories = [
      'products',
      'collections',
      'siteAssets'
    ];
    
    for (const dir of directories) {
      await processStoragePath(dir);
    }
    
    console.log('\n🎉 Image compression script completed!');
    console.log('📝 Note: You may want to clean up backup files manually');
    
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();