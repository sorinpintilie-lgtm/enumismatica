// Use global File type from browser environment

/**
 * Convert image to WebP format with size optimization
 * @param file - Image file to convert
 * @param maxSizeKB - Maximum file size in KB (default: 700KB)
 * @returns Promise with optimized WebP file
 */
export async function convertToWebP(file: File, maxSizeKB: number = 700): Promise<File> {
  return new Promise((resolve, reject) => {
    // Check if file is already WebP and within size limits
    if (file.type === 'image/webp' && file.size <= maxSizeKB * 1024) {
      console.log(`[ImageOptimization] File already optimized: ${file.name} (${Math.round(file.size/1024)}KB)`);
      resolve(file);
      return;
    }
 
    // Check if browser supports WebP conversion
    if (!window.createImageBitmap || !window.OffscreenCanvas) {
      console.warn('WebP conversion not supported in this browser, using original file');
      resolve(file);
      return;
    }
 
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const img = new Image();
        img.src = event.target?.result as string;
 
        img.onload = async () => {
          try {
            // Calculate dimensions for resizing if needed
            let targetWidth = img.width;
            let targetHeight = img.height;
            
            // If original file is too large, calculate appropriate resize dimensions
            if (file.size > maxSizeKB * 1024) {
              // Calculate scaling factor based on file size
              const sizeRatio = Math.sqrt((maxSizeKB * 1024) / file.size);
              targetWidth = Math.round(img.width * sizeRatio);
              targetHeight = Math.round(img.height * sizeRatio);
              
              // Ensure minimum dimensions
              targetWidth = Math.max(targetWidth, 800);
              targetHeight = Math.max(targetHeight, 600);
              
              console.log(`[ImageOptimization] Resizing ${file.name}: ${img.width}x${img.height} -> ${targetWidth}x${targetHeight}`);
            }
 
            // Create canvas and convert to WebP
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
 
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Could not get canvas context');
            }
 
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
 
            // Start with aggressive compression and adjust if needed
            let quality = 0.7; // Start with 70% quality
            let webpBlob: Blob | null = null;
            let attempts = 0;
            const maxAttempts = 3;
 
            // Try different quality levels to achieve target file size
            while (attempts < maxAttempts) {
              webpBlob = await new Promise<Blob | null>((resolveBlob) => {
                canvas.toBlob(resolveBlob, 'image/webp', quality);
              });
 
              if (webpBlob && webpBlob.size <= maxSizeKB * 1024) {
                console.log(`[ImageOptimization] Success: ${file.name} -> ${Math.round(webpBlob.size/1024)}KB (quality: ${quality})`);
                break;
              } else if (webpBlob) {
                console.log(`[ImageOptimization] Attempt ${attempts + 1}: ${Math.round(webpBlob.size/1024)}KB too large, reducing quality`);
                quality -= 0.1; // Reduce quality by 10% for next attempt
                attempts++;
              } else {
                throw new Error('WebP conversion failed');
              }
            }
 
            if (!webpBlob) {
              throw new Error('WebP conversion failed after multiple attempts');
            }
 
            // Create new WebP file
            const webpFile = new File(
              [webpBlob],
              file.name.replace(/\.[^/.]+$/, '.webp'),
              { type: 'image/webp' }
            );
 
            resolve(webpFile);
          } catch (error) {
            console.error('Error during WebP conversion:', error);
            resolve(file); // Fallback to original file
          }
        };
 
        img.onerror = () => {
          console.error('Error loading image for WebP conversion');
          resolve(file); // Fallback to original file
        };
      } catch (error) {
        console.error('Error in WebP conversion process:', error);
        resolve(file); // Fallback to original file
      }
    };
 
    reader.onerror = () => {
      console.error('Error reading file for WebP conversion');
      resolve(file); // Fallback to original file
    };
 
    reader.readAsDataURL(file);
  });
}

/**
 * Check if browser supports WebP format
 * @returns Promise resolving to boolean
 */
export function checkWebPSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    const webPData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    const img = new Image();

    img.onload = () => resolve(img.width === 1 && img.height === 1);
    img.onerror = () => resolve(false);

    img.src = webPData;
  });
}