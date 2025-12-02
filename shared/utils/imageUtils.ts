// Use global File type from browser environment

/**
 * Convert image to WebP format
 * @param file - Image file to convert
 * @returns Promise with WebP file
 */
export async function convertToWebP(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // Check if file is already WebP
    if (file.type === 'image/webp') {
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
            // Create canvas and convert to WebP
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Could not get canvas context');
            }

            ctx.drawImage(img, 0, 0);

            // Convert to WebP blob
            const webpBlob = await new Promise<Blob | null>((resolveBlob) => {
              canvas.toBlob(resolveBlob, 'image/webp', 0.8);
            });

            if (!webpBlob) {
              throw new Error('WebP conversion failed');
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