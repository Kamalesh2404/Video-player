/**
 * WebGLRenderer
 * Converts YUV420p frames (from ffmpeg) to RGB and paints on <canvas>
 * GPU-accelerated — handles 4K/8K without killing the CPU
 */
class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') ||
               canvas.getContext('webgl') ||
               canvas.getContext('experimental-webgl');

    if (!this.gl) {
      console.warn('WebGL not available, falling back to 2D canvas');
      this.ctx2d = canvas.getContext('2d');
    } else {
      this._initGL();
    }
  }

  _initGL() {
    const gl = this.gl;

    // Vertex shader
    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    // Fragment shader — BT.601 YUV → RGB conversion
    const fsSource = `
      precision mediump float;
      uniform sampler2D u_textureY;
      uniform sampler2D u_textureU;
      uniform sampler2D u_textureV;
      varying vec2 v_texCoord;

      void main() {
        float y = texture2D(u_textureY, v_texCoord).r;
        float u = texture2D(u_textureU, v_texCoord).r - 0.5;
        float v = texture2D(u_textureV, v_texCoord).r - 0.5;

        // BT.601 matrix
        float r = y + 1.402 * v;
        float g = y - 0.344 * u - 0.714 * v;
        float b = y + 1.772 * u;

        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `;

    this.program = this._buildProgram(vsSource, fsSource);
    gl.useProgram(this.program);

    // Full-screen quad
    const positions = new Float32Array([
      -1,-1,  1,-1,  -1,1,
       1,-1,  1, 1,  -1,1
    ]);
    const texCoords = new Float32Array([
      0,1,  1,1,  0,0,
      1,1,  1,0,  0,0
    ]);

    this._createBuffer(gl.ARRAY_BUFFER, positions,
      gl.getAttribLocation(this.program, 'a_position'), 2);
    this._createBuffer(gl.ARRAY_BUFFER, texCoords,
      gl.getAttribLocation(this.program, 'a_texCoord'), 2);

    // Create Y, U, V textures
    this.texY = this._createTexture();
    this.texU = this._createTexture();
    this.texV = this._createTexture();

    gl.uniform1i(gl.getUniformLocation(this.program,'u_textureY'), 0);
    gl.uniform1i(gl.getUniformLocation(this.program,'u_textureU'), 1);
    gl.uniform1i(gl.getUniformLocation(this.program,'u_textureV'), 2);
  }

  /**
   * Draw a YUV420p frame
   * @param {Uint8Array} yData
   * @param {Uint8Array} uData
   * @param {Uint8Array} vData
   * @param {number} width
   * @param {number} height
   */
  drawFrame(yData, uData, vData, width, height) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      if (this.gl) this.gl.viewport(0, 0, width, height);
    }

    if (this.gl) {
      this._drawGL(yData, uData, vData, width, height);
    } else {
      this._draw2D(yData, uData, vData, width, height);
    }
  }

  _drawGL(yData, uData, vData, width, height) {
    const gl = this.gl;
    const hw = width >> 1, hh = height >> 1;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texY);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE,
                  width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, yData);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texU);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE,
                  hw, hh, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, uData);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.texV);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE,
                  hw, hh, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, vData);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  _draw2D(yData, uData, vData, width, height) {
    // Software YUV→RGB fallback
    const ctx = this.ctx2d;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const hw = width >> 1;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const yIdx = row * width + col;
        const uvIdx = (row >> 1) * hw + (col >> 1);

        const y = yData[yIdx];
        const u = uData[uvIdx] - 128;
        const v = vData[uvIdx] - 128;

        const i = yIdx * 4;
        data[i]   = Math.max(0, Math.min(255, y + 1.402 * v));
        data[i+1] = Math.max(0, Math.min(255, y - 0.344 * u - 0.714 * v));
        data[i+2] = Math.max(0, Math.min(255, y + 1.772 * u));
        data[i+3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ── GL helpers ────────────────────────────────────────────────
  _buildProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this._compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      throw new Error('Shader link failed: ' + gl.getProgramInfoLog(prog));
    return prog;
  }

  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(shader));
    return shader;
  }

  _createBuffer(target, data, attribLocation, size) {
    const gl = this.gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(target, buf);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(attribLocation);
    gl.vertexAttribPointer(attribLocation, size, gl.FLOAT, false, 0, 0);
    return buf;
  }

  _createTexture() {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }
}