import './style.css';

// Vertex shader: positions the image quad
const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform vec2 u_scale;
  varying vec2 v_texCoord;
  
  void main() {
    gl_Position = vec4(a_position * u_scale, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// Fragment shader: applies distortion and zoom
const fragmentShaderSource = `
  precision mediump float;
  
  uniform sampler2D u_image;
  uniform float u_distortion;
  uniform float u_zoom;
  uniform vec2 u_resolution;
  uniform vec2 u_imageSize;
  
  varying vec2 v_texCoord;
  
  void main() {
    vec2 uv = v_texCoord;
    
    // Apply zoom first (zoom into center)
    uv = (uv - 0.5) / u_zoom + 0.5;
    
    // Apply lens distortion correction
    if (u_distortion != 0.0) {
      vec2 centered = uv - 0.5;
      float r2 = dot(centered, centered);
      float distortionFactor = 1.0 + u_distortion * r2;
      uv = centered * distortionFactor + 0.5;
    }
    
    // Check bounds and discard if outside
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    
    gl_FragColor = texture2D(u_image, uv);
  }
`;

class WebGLImageViewer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private image: HTMLImageElement | null = null;

  private desqueeze = 1.0;
  private distortion = 0.0;
  private zoom = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    this.gl = gl;

    this.initWebGL();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private initWebGL() {
    const gl = this.gl;

    // Compile shaders
    const vertexShader = this.compileShader(
      gl.VERTEX_SHADER,
      vertexShaderSource,
    );
    const fragmentShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );

    // Create program
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create program');

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error('Program link error: ' + info);
    }

    this.program = program;
    gl.useProgram(program);

    // Set up geometry (full-screen quad)
    const positions = new Float32Array([
      -1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Set up attributes
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

    // Create texture
    this.texture = gl.createTexture();
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Shader compile error: ' + info);
    }

    return shader;
  }

  private resizeCanvas() {
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;

    if (
      this.canvas.width !== displayWidth ||
      this.canvas.height !== displayHeight
    ) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.gl.viewport(0, 0, displayWidth, displayHeight);
      this.render();
    }
  }

  loadImage(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        this.uploadTexture(img);
        this.render();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  private uploadTexture(image: HTMLImageElement) {
    const gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Don't flip - display image as-is
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  setDesqueeze(value: number) {
    this.desqueeze = value;
    this.render();
  }

  setDistortion(value: number) {
    this.distortion = value;
    this.render();
  }

  setZoom(value: number) {
    this.zoom = value;
    this.render();
  }

  render() {
    if (!this.program || !this.image) return;

    const gl = this.gl;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    // Calculate scale to fit image in canvas without stretching
    const canvasAspect = this.canvas.width / this.canvas.height;
    const imageAspect = this.image.width / this.image.height;

    let scaleX = 1.0;
    let scaleY = 1.0;

    if (imageAspect > canvasAspect) {
      // Image is wider than canvas
      scaleX = 1.0;
      scaleY = canvasAspect / imageAspect;
    } else {
      // Image is taller than canvas
      scaleX = imageAspect / canvasAspect;
      scaleY = 1.0;
    }

    // Apply desqueeze to the vertical scale to change aspect ratio
    // Divide by desqueeze to compress vertically (inverse operation)
    scaleY /= this.desqueeze;

    // Set uniforms
    const scaleLocation = gl.getUniformLocation(this.program, 'u_scale');
    const distortionLocation = gl.getUniformLocation(
      this.program,
      'u_distortion',
    );
    const zoomLocation = gl.getUniformLocation(this.program, 'u_zoom');
    const resolutionLocation = gl.getUniformLocation(
      this.program,
      'u_resolution',
    );
    const imageSizeLocation = gl.getUniformLocation(
      this.program,
      'u_imageSize',
    );

    gl.uniform2f(scaleLocation, scaleX, scaleY);
    gl.uniform1f(distortionLocation, this.distortion);
    gl.uniform1f(zoomLocation, this.zoom);
    gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    gl.uniform2f(imageSizeLocation, this.image.width, this.image.height);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  exportAsBMP(): Blob {
    const gl = this.gl;

    if (!this.image) {
      throw new Error('No image loaded');
    }

    // Calculate output dimensions at full resolution with desqueeze applied
    const outputWidth = this.image.width;
    const outputHeight = Math.round(this.image.height / this.desqueeze);

    // Create offscreen framebuffer for full-resolution rendering
    const framebuffer = gl.createFramebuffer();
    const renderTexture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, renderTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      outputWidth,
      outputHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      renderTexture,
      0,
    );

    // Check framebuffer status
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Framebuffer not complete');
    }

    // Set viewport to full resolution
    gl.viewport(0, 0, outputWidth, outputHeight);

    // Clear and render to framebuffer
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.program) throw new Error('Program not initialized');
    gl.useProgram(this.program);

    // Bind the original image texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Set uniforms for full-resolution render (no aspect ratio fitting needed)
    const scaleLocation = gl.getUniformLocation(this.program, 'u_scale');
    const distortionLocation = gl.getUniformLocation(
      this.program,
      'u_distortion',
    );
    const zoomLocation = gl.getUniformLocation(this.program, 'u_zoom');
    const resolutionLocation = gl.getUniformLocation(
      this.program,
      'u_resolution',
    );
    const imageSizeLocation = gl.getUniformLocation(
      this.program,
      'u_imageSize',
    );

    gl.uniform2f(scaleLocation, 1.0, 1.0); // Full image, no scaling
    gl.uniform1f(distortionLocation, this.distortion);
    gl.uniform1f(zoomLocation, this.zoom);
    gl.uniform2f(resolutionLocation, outputWidth, outputHeight);
    gl.uniform2f(imageSizeLocation, this.image.width, this.image.height);

    // Draw to framebuffer
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Read pixels from framebuffer
    const pixels = new Uint8Array(outputWidth * outputHeight * 4);
    gl.readPixels(
      0,
      0,
      outputWidth,
      outputHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );

    // Restore canvas rendering
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.render(); // Restore display

    // Cleanup
    gl.deleteTexture(renderTexture);
    gl.deleteFramebuffer(framebuffer);

    // BMP rows must be padded to 4-byte boundaries
    const bytesPerRow = outputWidth * 3;
    const paddingPerRow = (4 - (bytesPerRow % 4)) % 4;
    const rowStride = bytesPerRow + paddingPerRow;
    const pixelDataSize = rowStride * outputHeight;

    // Convert RGBA to BGR (BMP format) - no vertical flip needed
    const bgrPixels = new Uint8Array(pixelDataSize);
    for (let y = 0; y < outputHeight; y++) {
      for (let x = 0; x < outputWidth; x++) {
        const srcIdx = (y * outputWidth + x) * 4;
        // BMP is stored bottom-to-top, WebGL reads bottom-to-top, so no flip
        const dstIdx = y * rowStride + x * 3;
        bgrPixels[dstIdx + 0] = pixels[srcIdx + 2]; // B
        bgrPixels[dstIdx + 1] = pixels[srcIdx + 1]; // G
        bgrPixels[dstIdx + 2] = pixels[srcIdx + 0]; // R
      }
      // Padding bytes are already 0 from Uint8Array initialization
    }

    // Create BMP file
    const fileSize = 54 + pixelDataSize;
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // BMP Header
    view.setUint8(0, 0x42); // 'B'
    view.setUint8(1, 0x4d); // 'M'
    view.setUint32(2, fileSize, true); // File size
    view.setUint32(6, 0, true); // Reserved
    view.setUint32(10, 54, true); // Pixel data offset

    // DIB Header (BITMAPINFOHEADER)
    view.setUint32(14, 40, true); // Header size
    view.setInt32(18, outputWidth, true); // Width
    view.setInt32(22, outputHeight, true); // Height
    view.setUint16(26, 1, true); // Planes
    view.setUint16(28, 24, true); // Bits per pixel
    view.setUint32(30, 0, true); // Compression (none)
    view.setUint32(34, pixelDataSize, true); // Image size with padding
    view.setInt32(38, 2835, true); // X pixels per meter
    view.setInt32(42, 2835, true); // Y pixels per meter
    view.setUint32(46, 0, true); // Colors in palette
    view.setUint32(50, 0, true); // Important colors

    // Pixel data
    const pixelArray = new Uint8Array(buffer, 54);
    pixelArray.set(bgrPixels);

    return new Blob([buffer], { type: 'image/bmp' });
  }
}

// Initialize application
const canvas = document.getElementById('glCanvas') as HTMLCanvasElement;
const viewer = new WebGLImageViewer(canvas);

// Set up controls
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const desqueezeSlider = document.getElementById(
  'desqueeze',
) as HTMLInputElement;
const desqueezeValue = document.getElementById(
  'desqueezeValue',
) as HTMLInputElement;
const distortionSlider = document.getElementById(
  'distortion',
) as HTMLInputElement;
const distortionValue = document.getElementById(
  'distortionValue',
) as HTMLInputElement;
const zoomSlider = document.getElementById('zoom') as HTMLInputElement;
const zoomValue = document.getElementById('zoomValue') as HTMLInputElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;

// Image loading
imageInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    viewer.loadImage(file);
    exportBtn.disabled = false;
  }
});

// Desqueeze controls
desqueezeSlider.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  desqueezeValue.value = value.toFixed(2);
  viewer.setDesqueeze(value);
});

desqueezeValue.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  if (!isNaN(value)) {
    desqueezeSlider.value = value.toString();
    viewer.setDesqueeze(value);
  }
});

// Distortion controls
distortionSlider.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  distortionValue.value = value.toFixed(2);
  viewer.setDistortion(value);
});

distortionValue.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  if (!isNaN(value)) {
    distortionSlider.value = value.toString();
    viewer.setDistortion(value);
  }
});

// Zoom controls
zoomSlider.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  zoomValue.value = value.toFixed(2);
  viewer.setZoom(value);
});

zoomValue.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  if (!isNaN(value)) {
    zoomSlider.value = value.toString();
    viewer.setZoom(value);
  }
});

// Export
exportBtn.addEventListener('click', () => {
  const blob = viewer.exportAsBMP();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exported-image-${Date.now()}.bmp`;
  a.click();
  URL.revokeObjectURL(url);
});

exportBtn.disabled = true;
