/**
 * Export image options and types
 */

import {
  BmpCompressionOptions,
  ImageConverter,
  ImageResizeLongestSideOptions,
  JpegCompressionOptions,
  PngCompressionOptions,
  TgaCompressionOptions,
  type ImageConverterInput,
} from '@metools/web-image-converter';

import { isNumber } from '@metools/tcheck';

export type ImageFormat = 'jpeg' | 'png' | 'bmp' | 'tga';

export interface ResolutionOptions {
  type: 'original' | 'custom';
  longestSide?: number; // Only present when type is 'custom'
}

export interface ExportOptions {
  format: ImageFormat;
  resolution: ResolutionOptions;
  compression?: number; // Only for jpeg/png, value between 1-100
}

/**
 * Process and export the image with the specified options.
 *
 * @param bmpBlob - The BMP file data exported from WebGLImageViewer
 * @param format - The desired output format (jpeg, png, bmp, tga)
 * @param resolution - Resolution options (original or custom with longest side)
 * @param compression - Compression quality (1-100), only for jpeg/png, undefined otherwise
 *
 * @returns A promise that resolves when the export is complete
 *
 * TODO: Implement this function to:
 * 1. If format is not 'bmp', convert the BMP blob to the desired format
 * 2. If resolution.type is 'custom', resize the image to match the longestSide constraint
 * 3. If compression is provided (for jpeg/png), apply the compression quality
 * 4. Trigger the download of the processed image file
 */
export async function processAndExportImage(
  bmpBlob: Blob,
  format: ImageFormat,
  resolution: ResolutionOptions,
  compression?: number,
): Promise<void> {
  // TODO: Implementation goes here
  console.log('processAndExportImage called with:', {
    bmpBlob,
    format,
    resolution,
    compression,
  });

  const imageData = new Uint8Array(await bmpBlob.arrayBuffer());

  const options: ImageConverterOptions | CompressionOptions = {
    imageData,
    longestSide: resolution.longestSide,
  };

  switch (format) {
    case 'jpeg':
      const blob = await exportJPEGImage({
        ...options,
        compression: compression ?? 75,
      });
      downloadBlobAsFile(blob, format);
      break;
    case 'png':
      await exportPNGImage({ ...options, compression: compression ?? 7 });
      break;
    case 'tga':
      await exportTGAImage(options);
      break;
    case 'bmp':
      await exportBMPImage(options);
      break;
    default:
      await exportJPEGImage({ ...options, compression: compression ?? 75 });
      break;
  }
}

function downloadBlobAsFile(blob: Blob, format: ImageFormat) {
  // Placeholder: For now, just download the BMP as-is
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exported-image-${Date.now()}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ImageConverterOptions {
  imageData: Uint8Array;
  longestSide?: number;
}
interface CompressionOptions extends ImageConverterOptions {
  compression: number;
}

async function exportJPEGImage(options: CompressionOptions): Promise<Blob> {
  const { imageData, compression, longestSide } = options;

  const fixedCompression = Math.max(1, Math.min(100, compression));

  const convertOptions: ImageConverterInput = {
    compression: new JpegCompressionOptions(fixedCompression),
  };

  if (isNumber(longestSide) && longestSide > 0) {
    convertOptions.resize = new ImageResizeLongestSideOptions({
      longest_side: longestSide,
    });
  }

  const converter = new ImageConverter(convertOptions);

  const result = (await converter.convertImageBytes(
    imageData,
  )) as Uint8Array<ArrayBuffer>;

  return new Blob([result], { type: 'image/jpeg' });
}

async function exportPNGImage(options: CompressionOptions) {
  const { imageData, compression, longestSide } = options;

  const fixedCompression = Math.max(1, Math.min(100, compression));

  const convertOptions: ImageConverterInput = {
    compression: new PngCompressionOptions(fixedCompression),
  };

  if (isNumber(longestSide) && longestSide > 0) {
    convertOptions.resize = new ImageResizeLongestSideOptions({
      longest_side: longestSide,
    });
  }

  const converter = new ImageConverter(convertOptions);

  const result = (await converter.convertImageBytes(
    imageData,
  )) as Uint8Array<ArrayBuffer>;

  return new Blob([result], { type: 'image/png' });
}

async function exportBMPImage(options: ImageConverterOptions) {
  const { imageData, longestSide } = options;

  const convertOptions: ImageConverterInput = {
    compression: new BmpCompressionOptions(),
  };

  if (isNumber(longestSide) && longestSide > 0) {
    convertOptions.resize = new ImageResizeLongestSideOptions({
      longest_side: longestSide,
    });
  }

  const converter = new ImageConverter(convertOptions);

  const result = (await converter.convertImageBytes(
    imageData,
  )) as Uint8Array<ArrayBuffer>;

  return new Blob([result], { type: 'image/bmp' });
}

async function exportTGAImage(options: ImageConverterOptions) {
  const { imageData, longestSide } = options;

  const convertOptions: ImageConverterInput = {
    compression: new TgaCompressionOptions(),
  };

  if (isNumber(longestSide) && longestSide > 0) {
    convertOptions.resize = new ImageResizeLongestSideOptions({
      longest_side: longestSide,
    });
  }

  const converter = new ImageConverter(convertOptions);

  const result = (await converter.convertImageBytes(
    imageData,
  )) as Uint8Array<ArrayBuffer>;

  return new Blob([result], { type: 'image/tga' });
}

/**
 * Export modal UI controller
 */
export class ExportModal {
  private modal: HTMLElement;
  private formatSelect: HTMLSelectElement;
  private resolutionRadios: NodeListOf<HTMLInputElement>;
  private longestSideInput: HTMLInputElement;
  private compressionInput: HTMLInputElement;
  private okBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;

  private resolveCallback: ((options: ExportOptions | null) => void) | null =
    null;

  constructor() {
    this.modal = document.getElementById('exportModal') as HTMLElement;
    this.formatSelect = document.getElementById(
      'formatSelect',
    ) as HTMLSelectElement;
    this.resolutionRadios = document.querySelectorAll(
      'input[name="resolution"]',
    ) as NodeListOf<HTMLInputElement>;
    this.longestSideInput = document.getElementById(
      'longestSide',
    ) as HTMLInputElement;
    this.compressionInput = document.getElementById(
      'compressionInput',
    ) as HTMLInputElement;
    this.okBtn = document.getElementById('exportOkBtn') as HTMLButtonElement;
    this.cancelBtn = document.getElementById(
      'exportCancelBtn',
    ) as HTMLButtonElement;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Format change - enable/disable compression
    this.formatSelect.addEventListener('change', () => {
      this.updateCompressionState();
    });

    // Resolution radio change - enable/disable longest side input
    this.resolutionRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        this.updateLongestSideState();
      });
    });

    // OK button
    this.okBtn.addEventListener('click', () => {
      const options = this.getOptions();
      this.hide();
      if (this.resolveCallback) {
        this.resolveCallback(options);
        this.resolveCallback = null;
      }
    });

    // Cancel button
    this.cancelBtn.addEventListener('click', () => {
      this.hide();
      if (this.resolveCallback) {
        this.resolveCallback(null);
        this.resolveCallback = null;
      }
    });

    // Close on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
        if (this.resolveCallback) {
          this.resolveCallback(null);
          this.resolveCallback = null;
        }
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('show')) {
        this.hide();
        if (this.resolveCallback) {
          this.resolveCallback(null);
          this.resolveCallback = null;
        }
      }
    });
  }

  private updateCompressionState() {
    const format = this.formatSelect.value as ImageFormat;
    const shouldEnable = format === 'jpeg' || format === 'png';
    this.compressionInput.disabled = !shouldEnable;
  }

  private updateLongestSideState() {
    const customSelected =
      Array.from(this.resolutionRadios).find((r) => r.checked)?.value ===
      'custom';
    this.longestSideInput.disabled = !customSelected;
  }

  private getOptions(): ExportOptions {
    const format = this.formatSelect.value as ImageFormat;

    const resolutionType = Array.from(this.resolutionRadios).find(
      (r) => r.checked,
    )?.value as 'original' | 'custom';
    const resolution: ResolutionOptions = {
      type: resolutionType,
    };

    if (resolutionType === 'custom') {
      const longestSide = parseInt(this.longestSideInput.value);
      if (!isNaN(longestSide) && longestSide > 0) {
        resolution.longestSide = longestSide;
      }
    }

    let compression: number | undefined = undefined;
    if (format === 'jpeg' || format === 'png') {
      const compressionValue = parseInt(this.compressionInput.value);
      if (!isNaN(compressionValue)) {
        compression = Math.max(1, Math.min(100, compressionValue));
      }
    }

    return { format, resolution, compression };
  }

  /**
   * Show the modal and return a promise that resolves with the user's options or null if cancelled
   */
  show(): Promise<ExportOptions | null> {
    this.modal.classList.add('show');
    this.updateCompressionState();
    this.updateLongestSideState();

    return new Promise((resolve) => {
      this.resolveCallback = resolve;
    });
  }

  private hide() {
    this.modal.classList.remove('show');
  }
}
