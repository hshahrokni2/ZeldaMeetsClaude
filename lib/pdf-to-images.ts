/**
 * PDF to Images Converter
 *
 * Converts PDF pages to base64-encoded images for vision models.
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Convert PDF to images using ImageMagick/pdftoppm
 */
export async function convertPdfToImages(pdfPath: string): Promise<string[]> {
  console.log(`[PDF Converter] Converting ${pdfPath} to images...`);

  // Create temporary directory for images
  const tempDir = path.join(process.cwd(), '.temp-images');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const basename = path.basename(pdfPath, '.pdf');
  const outputPrefix = path.join(tempDir, `${basename}-page`);

  try {
    // Try pdftoppm first (faster and better quality)
    try {
      await execAsync(`pdftoppm -png -r 150 "${pdfPath}" "${outputPrefix}"`);
    } catch {
      // Fallback to ImageMagick convert
      console.log('[PDF Converter] pdftoppm not available, trying ImageMagick...');
      await execAsync(`convert -density 150 "${pdfPath}" "${outputPrefix}-%03d.png"`);
    }

    // Read generated images
    const files = fs.readdirSync(tempDir)
      .filter(f => f.startsWith(path.basename(outputPrefix)) && f.endsWith('.png'))
      .sort();

    if (files.length === 0) {
      throw new Error('No images were generated from PDF');
    }

    console.log(`[PDF Converter] Generated ${files.length} images`);

    // Convert to base64
    const images: string[] = [];
    for (const file of files) {
      const imagePath = path.join(tempDir, file);
      const imageBuffer = fs.readFileSync(imagePath);
      const base64 = imageBuffer.toString('base64');
      images.push(base64);
    }

    // Clean up temp files
    for (const file of files) {
      fs.unlinkSync(path.join(tempDir, file));
    }

    return images;
  } catch (error: any) {
    console.error('[PDF Converter] Error:', error.message);
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
}

/**
 * Simple mock sectionizer that treats whole document as one section
 */
export function createSimpleSectionMap(pageCount: number): any {
  return {
    level_1: [
      {
        title: 'Full Document',
        start_page: 1,
        end_page: pageCount,
      },
    ],
    level_2: [],
    level_3: [],
  };
}
