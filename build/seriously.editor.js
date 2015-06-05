var URL;
var require, WeakMap, module, exports, define;
/*jslint devel: true, bitwise: true, browser: true, white: true, nomen: true, plusplus: true, maxerr: 50, indent: 4, todo: true */
/*global Float32Array, Uint8Array, Uint16Array, WebGLTexture, HTMLInputElement, HTMLSelectElement, HTMLElement, WebGLFramebuffer, HTMLCanvasElement, WebGLRenderingContext, define, module, exports */
(function (root, factory) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define('seriously', function () {
			var Seriously = factory(root);
			if (!root.Seriously) {
				root.Seriously = Seriously;
			}
			return Seriously;
		});
	} else if (typeof exports === 'object') {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like enviroments that support module.exports,
		// like Node.
		module.exports = factory(root);
	} else if (typeof root.Seriously !== 'function') {
		// Browser globals
		root.Seriously = factory(root);
	}
}(this, function (window) {
	'use strict';

	var document = window.document,
		console = window.console,

	/*
		Global-ish look-up variables
	*/

	testContext,
	colorElement,
	incompatibility,
	seriousEffects = {},
	seriousTransforms = {},
	seriousSources = {},
	seriousTargets = {},
	timeouts = [],
	allEffectsByHook = {},
	allTransformsByHook = {},
	allSourcesByHook = {
		canvas: [],
		image: [],
		video: []
	},
	allTargetsByHook = {},
	allTargets = window.WeakMap && new WeakMap(),
	identity,
	maxSeriouslyId = 0,
	nop = function () {},
	noVideoTextureSupport,

	/*
		Global reference variables
	*/

	// http://www.w3.org/TR/css3-color/#svg-color
	colorNames = {
		transparent: [0, 0, 0, 0],
		black: [0, 0, 0, 1],
		red: [1, 0, 0, 1],
		green: [0, 128 / 255, 0, 1],
		blue: [0, 0, 1, 1],
		white: [1, 1, 1, 1],
		silver: [192 / 255, 192 / 255, 192 / 255, 1],
		gray: [128 / 255, 128 / 255, 128 / 255, 1],
		maroon: [128 / 255, 0, 0, 1],
		purple: [128 / 255, 0, 128 / 255, 1],
		fuchsia: [1, 0, 1, 1],
		lime: [0, 1, 0, 1],
		olive: [128 / 255, 128 / 255, 0, 1],
		yellow: [1, 1, 0, 1],
		navy: [0, 0, 128 / 255, 1],
		teal: [0, 128 / 255, 128 / 255, 1],
		aqua: [0, 1, 1, 1],
		orange: [1, 165 / 255, 0, 1]
	},

	vectorFields = ['x', 'y', 'z', 'w'],
	colorFields = ['r', 'g', 'b', 'a'],

	outputRenderOptions = {
		srcRGB: 0x0302, //SRC_ALPHA
		dstRGB: 0x0303, //ONE_MINUS_SRC_ALPHA
		srcAlpha: 0x01, //ONE
		dstAlpha: 0x0303 //ONE_MINUS_SRC_ALPHA
	},

	baseVertexShader,
	baseFragmentShader,

	/*
		utility functions
	*/

	/*
	mat4 matrix functions borrowed from gl-matrix by toji
	https://github.com/toji/gl-matrix
	License: https://github.com/toji/gl-matrix/blob/master/LICENSE.md
	*/
	mat4 = {
		/*
		 * mat4.frustum
		 * Generates a frustum matrix with the given bounds
		 *
		 * Params:
		 * left, right - scalar, left and right bounds of the frustum
		 * bottom, top - scalar, bottom and top bounds of the frustum
		 * near, far - scalar, near and far bounds of the frustum
		 * dest - Optional, mat4 frustum matrix will be written into
		 *
		 * Returns:
		 * dest if specified, a new mat4 otherwise
		 */
		frustum: function (left, right, bottom, top, near, far, dest) {
			if(!dest) { dest = mat4.create(); }
			var rl = (right - left),
				tb = (top - bottom),
				fn = (far - near);
			dest[0] = (near*2) / rl;
			dest[1] = 0;
			dest[2] = 0;
			dest[3] = 0;
			dest[4] = 0;
			dest[5] = (near*2) / tb;
			dest[6] = 0;
			dest[7] = 0;
			dest[8] = (right + left) / rl;
			dest[9] = (top + bottom) / tb;
			dest[10] = -(far + near) / fn;
			dest[11] = -1;
			dest[12] = 0;
			dest[13] = 0;
			dest[14] = -(far*near*2) / fn;
			dest[15] = 0;
			return dest;
		},

		perspective: function (fovy, aspect, near, far, dest) {
			var top = near*Math.tan(fovy*Math.PI / 360.0),
				right = top*aspect;
			return mat4.frustum(-right, right, -top, top, near, far, dest);
		},
		multiply: function (dest, mat, mat2) {
			// Cache the matrix values (makes for huge speed increases!)
			var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
				a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
				a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
				a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

			// Cache only the current line of the second matrix
			b0 = mat2[0], b1 = mat2[1], b2 = mat2[2], b3 = mat2[3];
			dest[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			dest[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			dest[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			dest[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = mat2[4];
			b1 = mat2[5];
			b2 = mat2[6];
			b3 = mat2[7];
			dest[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			dest[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			dest[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			dest[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = mat2[8];
			b1 = mat2[9];
			b2 = mat2[10];
			b3 = mat2[11];
			dest[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			dest[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			dest[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			dest[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = mat2[12];
			b1 = mat2[13];
			b2 = mat2[14];
			b3 = mat2[15];
			dest[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			dest[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			dest[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			dest[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			return dest;
		},
		identity: function (dest) {
			dest[0] = 1;
			dest[1] = 0;
			dest[2] = 0;
			dest[3] = 0;
			dest[4] = 0;
			dest[5] = 1;
			dest[6] = 0;
			dest[7] = 0;
			dest[8] = 0;
			dest[9] = 0;
			dest[10] = 1;
			dest[11] = 0;
			dest[12] = 0;
			dest[13] = 0;
			dest[14] = 0;
			dest[15] = 1;
			return dest;
		},
		copy: function (out, a) {
			out[0] = a[0];
			out[1] = a[1];
			out[2] = a[2];
			out[3] = a[3];
			out[4] = a[4];
			out[5] = a[5];
			out[6] = a[6];
			out[7] = a[7];
			out[8] = a[8];
			out[9] = a[9];
			out[10] = a[10];
			out[11] = a[11];
			out[12] = a[12];
			out[13] = a[13];
			out[14] = a[14];
			out[15] = a[15];
			return out;
		}
	},

	requestAnimationFrame = (function (){
		var lastTime = 0;
		return  window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				function (callback) {
					var currTime, timeToCall, id;

					function timeoutCallback() {
						callback(currTime + timeToCall);
					}

					currTime = new Date().getTime();
					timeToCall = Math.max(0, 16 - (currTime - lastTime));
					id = window.setTimeout(timeoutCallback, timeToCall);
					lastTime = currTime + timeToCall;
					return id;
				};
	}()),

	cancelAnimFrame = (function (){
		return  window.cancelAnimationFrame ||
				window.webkitCancelAnimationFrame ||
				window.mozCancelAnimationFrame ||
				window.oCancelAnimationFrame ||
				window.msCancelAnimationFrame ||
				function (id) {
					window.cancelTimeout(id);
				};
	}()),

	reservedEffectProperties = [
		'alias',
		'destroy',
		'effect',
		'id',
		'initialize',
		'inputs',
		'isDestroyed',
		'isReady',
		'matte',
		'off',
		'on',
		'readPixels',
		'render',
		'title',
		'update'
	],

	reservedTransformProperties = [
		'alias',
		'destroy',
		'id',
		'inputs',
		'isDestroyed',
		'isReady',
		'off',
		'on',
		'source',
		'title',
		'update'
	],

	reservedNames = [
		'aliases',
		'defaults',
		'destroy',
		'effect',
		'go',
		'id',
		'incompatible',
		'isDestroyed',
		'isEffect',,
		'isNode',
		'isSource',
		'isTarget',
		'isTransform',
		'removeAlias',
		'render',
		'source',
		'stop',
		'target',
		'transform'
	];

	function getElement(input, tags) {
		var element,
			tag;
		if (typeof input === 'string') {
			//element = document.getElementById(input) || document.getElementsByTagName(input)[0];
			element = document.querySelector(input);
		} else if (!input) {
			return false;
		}

		if (input.tagName) {
			element = input;
		}

		if (!element) {
			return input;
		}

		tag = element.tagName.toLowerCase();
		if (tags && tags.indexOf(tag) < 0) {
			return input;
		}

		return element;
	}

	function extend(dest, src) {
		var property,
			descriptor;

		//todo: are we sure this is safe?
		if (dest.prototype && src.prototype && dest.prototype !== src.prototype) {
			extend(dest.prototype, src.prototype);
		}

		for (property in src) {
			if (src.hasOwnProperty(property)) {
				descriptor = Object.getOwnPropertyDescriptor(src, property);

				if (descriptor.get || descriptor.set) {
					Object.defineProperty(dest, property, {
						configurable: true,
						enumerable: true,
						get: descriptor.get,
						set: descriptor.set
					});
				} else {
					dest[property] = src[property];
				}
			}
		}

		return dest;
	}

	function consoleMethod(name) {
		var method;
		if (!console) {
			return nop;
		}

		if (typeof console[name] === 'function') {
			method = console[name];
		} else if (typeof console.log === 'function') {
			method = console.log;
		} else {
			return nop;
		}

		if (method.bind) {
			return method.bind(console);
		}

		return function () {
			method.apply(console, arguments);
		};
	}

	//http://www.w3.org/TR/css3-color/#hsl-color
	function hslToRgb(h, s, l, a, out) {
		function hueToRgb(m1, m2, h) {
			h = h % 1;
			if (h < 0) {
				h += 1;
			}
			if (h < 1 / 6) {
				return m1 + (m2 - m1) * h * 6;
			}
			if (h < 1 / 2) {
				return m2;
			}
			if (h < 2 / 3) {
				return m1 + (m2 - m1) * (2/3 - h) * 6;
			}
			return m1;
		}

		var m1, m2;
		if (l < 0.5) {
			m2 = l * (s + 1);
		} else {
			m2 = l + s - l * s;
		}
		m1 = l * 2 - m2;

		if (!out) {
			out = [];
		}

		out[0] = hueToRgb(m1, m2, h + 1/3);
		out[1] = hueToRgb(m1, m2, h);
		out[2] = hueToRgb(m1, m2, h - 1/3);
		out[3] = a;

		return out;
	}

	function colorArrayToHex(color) {
		var i,
			val,
			hex,
			s = '#',
			len = color[3] < 1 ? 4 : 3;

		for (i = 0; i < len; i++) {
			val = Math.min(255, Math.round(color[i] * 255 || 0));
			hex = val.toString(16);
			if (val < 16) {
				hex = '0' + hex;
			}
			s += hex;
		}
		return s;
	}

	function isArrayLike(obj) {
		return Array.isArray(obj) ||
			(obj && obj.BYTES_PER_ELEMENT && 'length' in obj);
	}

	/*
	faster than setTimeout(fn, 0);
	http://dbaron.org/log/20100309-faster-timeouts
	*/
	function setTimeoutZero(fn) {
		/*
		Workaround for postMessage bug in Firefox if the page is loaded from the file system
		https://bugzilla.mozilla.org/show_bug.cgi?id=740576
		Should run fine, but maybe a few milliseconds slower per frame.
		*/
		function timeoutFunction() {
			if (timeouts.length) {
				(timeouts.shift())();
			}
		}

		if (typeof fn !== 'function') {
			throw new Error('setTimeoutZero argument is not a function');
		}

		timeouts.push(fn);
		if (window.location.protocol === 'file:') {
			setTimeout(timeoutFunction, 0);
			return;
		}

		window.postMessage('seriously-timeout-message', window.location);
	}

	window.addEventListener('message', function (event) {
		if (event.source === window && event.data === 'seriously-timeout-message') {
			event.stopPropagation();
			if (timeouts.length > 0) {
				var fn = timeouts.shift();
				fn();
			}
		}
	}, true);

	function getWebGlContext(canvas, options) {
		var context;
		try {
			if (window.WebGLDebugUtils && options && options.debugContext) {
				context = window.WebGLDebugUtils.makeDebugContext(canvas.getContext('webgl', options));
			} else {
				context = canvas.getContext('webgl', options);
			}
		} catch (expError) {
		}

		if (!context) {
			try {
				context = canvas.getContext('experimental-webgl', options);
			} catch (error) {
			}
		}
		return context;
	}

	function getTestContext() {
		var canvas;

		if (testContext && testContext.getError() === testContext.CONTEXT_LOST_WEBGL) {
			/*
			Test context was lost already, and the webglcontextlost event maybe hasn't fired yet
			so try making a new context
			*/
			testContext = undefined;
		}

		if (testContext || !window.WebGLRenderingContext || incompatibility) {
			return testContext;
		}

		canvas = document.createElement('canvas');
		testContext = getWebGlContext(canvas);

		if (testContext) {
			canvas.addEventListener('webglcontextlost', function contextLost(event) {
				/*
				If/When context is lost, just clear testContext and create
				a new one the next time it's needed
				*/
				event.preventDefault();
				if (testContext && testContext.canvas === this) {
					testContext = undefined;
					canvas.removeEventListener('webglcontextlost', contextLost, false);
				}
			}, false);
		} else {
			Seriously.logger.warn('Unable to access WebGL.');
		}

		return testContext;
	}

	function checkSource(source) {
		var element, canvas, ctx, texture;

		//todo: don't need to create a new array every time we do this
		element = getElement(source, ['img', 'canvas', 'video']);
		if (!element) {
			return false;
		}

		canvas = document.createElement('canvas');
		if (!canvas) {
			Seriously.logger.warn('Browser does not support canvas or Seriously.js');
			return false;
		}

		if (element.naturalWidth === 0 && element.tagName === 'IMG') {
			Seriously.logger.warn('Image not loaded');
			return false;
		}

		if (element.readyState === 0 && element.videoWidth === 0 && element.tagName === 'VIDEO') {
			Seriously.logger.warn('Video not loaded');
			return false;
		}

		ctx = getTestContext();
		if (ctx) {
			texture = ctx.createTexture();
			if (!texture) {
				Seriously.logger.error('Test WebGL context has been lost');
			}

			ctx.bindTexture(ctx.TEXTURE_2D, texture);

			try {
				ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, element);
			} catch (textureError) {
				if (textureError.code === window.DOMException.SECURITY_ERR) {
					Seriously.logger.log('Unable to access cross-domain image');
				} else {
					Seriously.logger.error('Error storing image to texture: ' + textureError.message);
				}
				ctx.deleteTexture(texture);
				return false;
			}
			ctx.deleteTexture(texture);
		} else {
			ctx = canvas.getContext('2d');
			try {
				ctx.drawImage(element, 0, 0);
				ctx.getImageData(0, 0, 1, 1);
			} catch (drawImageError) {
				if (drawImageError.code === window.DOMException.SECURITY_ERR) {
					Seriously.logger.log('Unable to access cross-domain image');
				} else {
					Seriously.logger.error('Error drawing image to canvas: ' + drawImageError.message);
				}
				return false;
			}
		}

		// This method will return a false positive for resources that aren't
		// actually images or haven't loaded yet

		return true;
	}

	function validateInputSpecs(plugin) {
		var input,
			options,
			name;

		function normalizeEnumOption(option, i) {
			var key,
				name;

			if (isArrayLike(option)) {
				key = option[0];
				name = option[1] || key;
			} else {
				key = option;
			}

			if (typeof key === 'string') {
				key = key.toLowerCase();
			} else if (typeof key === 'number') {
				key = String(key);
			} else if (!key) {
				key = '';
			}

			options[key] = name;

			if (!i) {
				input.firstValue = key;
			}
		}

		function passThrough(value) {
			return value;
		}

		for (name in plugin.inputs) {
			if (plugin.inputs.hasOwnProperty(name)) {
				if (plugin.reserved.indexOf(name) >= 0 || Object.prototype[name]) {
					throw new Error('Reserved input name: ' + name);
				}

				input = plugin.inputs[name];
				input.name = name;

				if (isNaN(input.min)) {
					input.min = -Infinity;
				}

				if (isNaN(input.max)) {
					input.max = Infinity;
				}

				if (isNaN(input.minCount)) {
					input.minCount = -Infinity;
				}

				if (isNaN(input.maxCount)) {
					input.maxCount = Infinity;
				}

				if (isNaN(input.step)) {
					input.step = 0;
				}

				if (input.type === 'enum') {
					/*
					Normalize options to make validation easy
					- all items will have both a key and a name
					- all keys will be lowercase strings
					*/
					if (input.options && isArrayLike(input.options) && input.options.length) {
						options = {};
						input.options.forEach(normalizeEnumOption);
						input.options = options;
					}
				}

				if (input.type === 'vector') {
					if (input.dimensions < 2) {
						input.dimensions = 2;
					} else if (input.dimensions > 4) {
						input.dimensions = 4;
					} else if (!input.dimensions || isNaN(input.dimensions)) {
						input.dimensions = 4;
					} else {
						input.dimensions = Math.round(input.dimensions);
					}
				} else {
					input.dimensions = 1;
				}

				input.shaderDirty = !!input.shaderDirty;

				if (typeof input.validate !== 'function') {
					input.validate = Seriously.inputValidators[input.type] || passThrough;
				}

				if (!plugin.defaultImageInput && input.type === 'image') {
					plugin.defaultImageInput = name;
				}
			}
		}
	}

	/*
		helper Classes
	*/

	function FrameBuffer(gl, width, height, options) {
		var frameBuffer,
			renderBuffer,
			tex,
			status,
			useFloat = options === true ? options : (options && options.useFloat);

		useFloat = false;//useFloat && !!gl.getExtension('OES_texture_float'); //useFloat is not ready!
		if (useFloat) {
			this.type = gl.FLOAT;
		} else {
			this.type = gl.UNSIGNED_BYTE;
		}

		frameBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

		if (options && options.texture) {
			this.texture = options.texture;
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			this.ownTexture = false;
		} else {
			this.texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			this.ownTexture = true;
		}

		try {
			if (this.type === gl.FLOAT) {
				tex = new Float32Array(width * height * 4);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, tex);
			} else {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
				this.type = gl.UNSIGNED_BYTE;
			}
		} catch (e) {
			// Null rejected
			this.type = gl.UNSIGNED_BYTE;
			tex = new Uint8Array(width * height * 4);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, tex);
		}

		renderBuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);

		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

		status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

		if (status === gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT) {
			throw new Error('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT');
		}

		if (status === gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT) {
			throw new Error('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT');
		}

		if (status === gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS) {
			throw new Error('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS');
		}

		if (status === gl.FRAMEBUFFER_UNSUPPORTED) {
			throw new Error('Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED');
		}

		if (status !== gl.FRAMEBUFFER_COMPLETE) {
			throw new Error('Incomplete framebuffer: ' + status);
		}

		//clean up
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		this.gl = gl;
		this.frameBuffer = frameBuffer;
		this.renderBuffer = renderBuffer;
		this.width = width;
		this.height = height;
	}

	FrameBuffer.prototype.resize = function (width, height) {
		var gl = this.gl;

		if (this.width === width && this.height === height) {
			return;
		}

		this.width = width;
		this.height = height;

		if (!gl) {
			return;
		}

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);

		//todo: handle float
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};

	FrameBuffer.prototype.destroy = function () {
		var gl = this.gl;

		if (gl) {
			gl.deleteFramebuffer(this.frameBuffer);
			gl.deleteRenderbuffer(this.renderBuffer);
			if (this.ownTexture) {
				gl.deleteTexture(this.texture);
			}
		}

		delete this.frameBuffer;
		delete this.renderBuffer;
		delete this.texture;
		delete this.gl;
	};

	/* ShaderProgram - utility class for building and accessing WebGL shaders */

	function ShaderProgram(gl, vertexShaderSource, fragmentShaderSource) {
		var program, vertexShader, fragmentShader,
			programError = '',
			shaderError,
			i, l,
			obj;

		function compileShader(source, fragment) {
			var shader, j;
			if (fragment) {
				shader = gl.createShader(gl.FRAGMENT_SHADER);
			} else {
				shader = gl.createShader(gl.VERTEX_SHADER);
			}

			gl.shaderSource(shader, source);
			gl.compileShader(shader);

			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				source = source.split(/[\n\r]/);
				for (j = 0; j < source.length; j++) {
					source[j] = (j + 1) + ':\t' + source[j];
				}
				source.unshift('Error compiling ' + (fragment ? 'fragment' : 'vertex') + ' shader:');
				Seriously.logger.error(source.join('\n'));
				throw new Error('Shader error: ' + gl.getShaderInfoLog(shader));
			}

			return shader;
		}

		function makeShaderSetter(info, loc) {
			if (info.type === gl.SAMPLER_2D) {
				return function (value) {
					info.glTexture = gl['TEXTURE' + value];
					gl.uniform1i(loc, value);
				};
			}

			if (info.type === gl.BOOL|| info.type === gl.INT) {
				if (info.size > 1) {
					return function (value) {
						gl.uniform1iv(loc, value);
					};
				}

				return function (value) {
					gl.uniform1i(loc, value);
				};
			}

			if (info.type === gl.FLOAT) {
				if (info.size > 1) {
					return function (value) {
						gl.uniform1fv(loc, value);
					};
				}

				return function (value) {
					gl.uniform1f(loc, value);
				};
			}

			if (info.type === gl.FLOAT_VEC2) {
				return function (obj) {
					gl.uniform2f(loc, obj[0], obj[1]);
				};
			}

			if (info.type === gl.FLOAT_VEC3) {
				return function (obj) {
					gl.uniform3f(loc, obj[0], obj[1], obj[2]);
				};
			}

			if (info.type === gl.FLOAT_VEC4) {
				return function (obj) {
					gl.uniform4f(loc, obj[0], obj[1], obj[2], obj[3]);
				};
			}

			if (info.type === gl.FLOAT_MAT3) {
				return function (mat3) {
					gl.uniformMatrix3fv(loc, false, mat3);
				};
			}

			if (info.type === gl.FLOAT_MAT4) {
				return function (mat4) {
					gl.uniformMatrix4fv(loc, false, mat4);
				};
			}

			throw new Error('Unknown shader uniform type: ' + info.type);
		}

		function makeShaderGetter(loc) {
			return function () {
				return gl.getUniform(program, loc);
			};
		}

		vertexShader = compileShader(vertexShaderSource);
		fragmentShader = compileShader(fragmentShaderSource, true);

		program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		shaderError = gl.getShaderInfoLog(vertexShader);
		if (shaderError) {
			programError += 'Vertex shader error: ' + shaderError + '\n';
		}
		gl.attachShader(program, fragmentShader);
		shaderError = gl.getShaderInfoLog(fragmentShader);
		if (shaderError) {
			programError += 'Fragment shader error: ' + shaderError + '\n';
		}
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			programError += gl.getProgramInfoLog(program);
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			throw new Error('Could not initialise shader: ' + programError);
		}

		gl.useProgram(program);

		this.uniforms = {};

		l = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
		for (i = 0; i < l; ++i) {
			obj = {
				info: gl.getActiveUniform(program, i)
			};

			obj.name = obj.info.name;
			obj.loc = gl.getUniformLocation(program, obj.name);
			obj.set = makeShaderSetter(obj.info, obj.loc);
			obj.get = makeShaderGetter(obj.loc);
			this.uniforms[obj.name] = obj;

			if (!this[obj.name]) {
				//for convenience
				this[obj.name] = obj;
			}
		}

		this.attributes = {};
		this.location = {};
		l = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
		for (i = 0; i < l; ++i) {
			obj = {
				info: gl.getActiveAttrib(program, i)
			};

			obj.name = obj.info.name;
			obj.location = gl.getAttribLocation(program, obj.name);
			this.attributes[obj.name] = obj;
			this.location[obj.name] = obj.location;
		}

		this.gl = gl;
		this.program = program;

		this.destroy = function () {
			var key;

			if (gl) {
				gl.deleteProgram(program);
				gl.deleteShader(vertexShader);
				gl.deleteShader(fragmentShader);
			}

			for (key in this) {
				if (this.hasOwnProperty(key)) {
					delete this[key];
				}
			}

			program = null;
			vertexShader = null;
			fragmentShader = null;
		};
	}

	ShaderProgram.prototype.use = function () {
		this.gl.useProgram(this.program);
	};

	/*
		main class: Seriously
	*/

	function Seriously(options) {

		//if called without 'new', make a new object and return that
		if (window === this || !(this instanceof Seriously) || this.id !== undefined) {
			return new Seriously(options);
		}

		//initialize object, private properties
		var id = ++maxSeriouslyId,
			seriously = this,
			nodes = [],
			nodesById = {},
			nodeId = 0,
			sources = [],
			targets = [],
			transforms = [],
			effects = [],
			aliases = {},
			preCallbacks = [],
			postCallbacks = [],
			defaultInputs = {},
			glCanvas,
			gl,
			primaryTarget,
			rectangleModel,
			commonShaders = {},
			baseShader,
			Node, SourceNode, EffectNode, TransformNode, TargetNode,
			Effect, Source, Transform, Target,
			auto = false,
			isDestroyed = false,
			rafId;

		function makeGlModel(shape, gl) {
			var vertex, index, texCoord;

			if (!gl) {
				return false;
			}

			vertex = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
			gl.bufferData(gl.ARRAY_BUFFER, shape.vertices, gl.STATIC_DRAW);
			vertex.size = 3;

			index = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, shape.indices, gl.STATIC_DRAW);

			texCoord = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, texCoord);
			gl.bufferData(gl.ARRAY_BUFFER, shape.coords, gl.STATIC_DRAW);
			texCoord.size = 2;

			return {
				vertex: vertex,
				index: index,
				texCoord: texCoord,
				length: shape.indices.length,
				mode: shape.mode || gl.TRIANGLES
			};
		}

		function buildRectangleModel(gl) {
			var shape = {};

			shape.vertices = new Float32Array([
				-1, -1, 0,
				1, -1, 0,
				1, 1, 0,
				-1, 1, 0
			]);

			shape.indices = new Uint16Array([
				0, 1, 2,
				0, 2, 3	// Front face
			]);

			shape.coords = new Float32Array([
				0, 0,
				1, 0,
				1, 1,
				0, 1
			]);

			return makeGlModel(shape, gl);
		}

		function attachContext(context) {
			var i, node;

			if (gl) {
				return;
			}

			context.canvas.addEventListener('webglcontextlost', destroyContext, false);
			context.canvas.addEventListener('webglcontextrestored', restoreContext, false);

			if (context.isContextLost()) {
				Seriously.logger.warn('Unable to attach lost WebGL context. Will try again when context is restored.');
				return;
			}

			gl = context;
			glCanvas = context.canvas;

			rectangleModel = buildRectangleModel(gl);

			baseShader = new ShaderProgram(gl, baseVertexShader, baseFragmentShader);

			for (i = 0; i < effects.length; i++) {
				node = effects[i];
				node.gl = gl;
				node.initialize();
				node.buildShader();
			}

			for (i = 0; i < sources.length; i++) {
				node = sources[i];
				node.initialize();
			}

			for (i = 0; i < targets.length; i++) {
				node = targets[i];

				if (!node.model) {
					node.model = rectangleModel;
					node.shader = baseShader;
				}

				//todo: initialize frame buffer if not main canvas
			}
		}

		function restoreContext() {
			var context,
				target,
				i,
				node;

			if (primaryTarget && !gl) {
				target = primaryTarget.target;

				//todo: if too many webglcontextlost events fired in too short a time, abort
				//todo: consider allowing "manual" control of restoring context

				if (target instanceof WebGLFramebuffer) {
					Seriously.logger.error('Unable to restore target built on WebGLFramebuffer');
					return;
				}

				context = getWebGlContext(target, {
					alpha: true,
					premultipliedAlpha: true,
					preserveDrawingBuffer: true,
					stencil: true,
					debugContext: primaryTarget.debugContext
				});

				if (context) {
					if (context.isContextLost()) {
						Seriously.logger.error('Unable to restore WebGL Context');
						return;
					}

					attachContext(context);

					if (primaryTarget.renderToTexture) {
						primaryTarget.frameBuffer = new FrameBuffer(gl, primaryTarget.width, primaryTarget.height, false);
					} else {
						primaryTarget.frameBuffer = {
							frameBuffer: null
						};
					}

					/*
					Set all nodes dirty. In most cases, it should only be necessary
					to set sources dirty, but we want to make sure unattached nodes are covered

					This should get renderDaemon running again if necessary.
					*/
					for (i = 0; i < nodes.length; i++) {
						node = nodes[i];
						node.setDirty();
						node.emit('webglcontextrestored');
					}

					Seriously.logger.log('WebGL context restored');
				}
			}
		}

		function destroyContext(event) {
			// either webglcontextlost or primary target node has been destroyed
			var i, node;

			/*
			todo: once multiple shared webgl resources are supported,
			see if we can switch context to another existing one and
			rebuild immediately
			*/

			if (event) {
				Seriously.logger.warn('WebGL context lost');
				/*
				todo: if too many webglcontextlost events fired in too short a time,
				don't preventDefault
				*/
				event.preventDefault();
			}

			//don't draw anymore until context is restored
			if (rafId) {
				cancelAnimFrame(rafId);
				rafId = 0;
			}

			if (glCanvas) {
				glCanvas.removeEventListener('webglcontextlost', destroyContext, false);
			}

			for (i = 0; i < effects.length; i++) {
				node = effects[i];
				node.gl = null;
				node.initialized = false;
				node.baseShader = null;
				node.model = null;
				node.frameBuffer = null;
				node.texture = null;
				if (node.shader && node.shader.destroy) {
					node.shader.destroy();
				}
				node.shaderDirty = true;
				node.shader = null;
				if (node.effect.lostContext) {
					node.effect.lostContext.call(node);
				}

				/*
				todo: do we need to set nodes to uready?
				if so, make sure nodes never get set to ready unless gl exists
				and make sure to set ready again when context is restored
				*/

				if (event) {
					node.emit('webglcontextlost');
				}
			}

			for (i = 0; i < sources.length; i++) {
				node = sources[i];
				//node.setUnready();
				node.texture = null;
				node.initialized = false;
				node.allowRefresh = false;
				if (event) {
					node.emit('webglcontextlost');
				}
			}

			for (i = 0; i < transforms.length; i++) {
				node = transforms[i];
				node.frameBuffer = null;
				node.texture = null;
				if (event) {
					node.emit('webglcontextlost');
				}
			}

			for (i = 0; i < targets.length; i++) {
				node = targets[i];
				node.model = false;
				node.frameBuffer = null;
				//texture?
				if (event) {
					node.emit('webglcontextlost');
				}
			}

			if (baseShader && baseShader.destroy) {
				baseShader.destroy();
			}

			//clean up rectangleModel
			if (gl) {
				gl.deleteBuffer(rectangleModel.vertex);
				gl.deleteBuffer(rectangleModel.texCoord);
				gl.deleteBuffer(rectangleModel.index);
			}

			if (rectangleModel) {
				delete rectangleModel.vertex;
				delete rectangleModel.texCoord;
				delete rectangleModel.index;
			}

			rectangleModel = null;
			baseShader = null;
			gl = null;
			glCanvas = null;
		}

		/*
		runs on every frame, as long as there are media sources (img, video, canvas, etc.) to check,
		dirty target nodes or pre/post callbacks to run. any sources that are updated are set to dirty,
		forcing all dependent nodes to render
		*/
		function renderDaemon(now) {
			var i, node, media,
				keepRunning = false;

			rafId = 0;

			if (preCallbacks.length) {
				keepRunning = true;
				for (i = 0; i < preCallbacks.length; i++) {
					preCallbacks[i].call(seriously, now);
				}
			}

			if (sources && sources.length) {
				keepRunning = true;
				for (i = 0; i < sources.length; i++) {
					node = sources[i];

					media = node.source;
					if (node.dirty ||
							node.checkDirty && node.checkDirty()) {
						node.dirty = false;
						node.setDirty();
					}
				}
			}

			for (i = 0; i < targets.length; i++) {
				node = targets[i];
				if (node.auto && node.dirty) {
					node.render();
				}
			}

			if (postCallbacks.length) {
				keepRunning = true;
				for (i = 0; i < postCallbacks.length; i++) {
					postCallbacks[i].call(seriously);
				}
			}

			//rafId may have been set again by a callback or in target.setDirty()
			if (keepRunning && !rafId) {
				rafId = requestAnimationFrame(renderDaemon);
			}
		}

		function draw(shader, model, uniforms, frameBuffer, node, options) {
			var numTextures = 0,
				name, value, shaderUniform,
				width, height,
				nodeGl = (node && node.gl) || gl,
				srcRGB, srcAlpha,
				dstRGB, dstAlpha;

			if (!nodeGl) {
				return;
			}

			if (node) {
				width = options && options.width || node.width || nodeGl.canvas.width;
				height = options && options.height || node.height || nodeGl.canvas.height;
			} else {
				width = options && options.width || nodeGl.canvas.width;
				height = options && options.height || nodeGl.canvas.height;
			}

			shader.use();

			nodeGl.viewport(0, 0, width, height);

			nodeGl.bindFramebuffer(nodeGl.FRAMEBUFFER, frameBuffer);

			/* todo: do this all only once at the beginning, since we only have one model? */
			nodeGl.enableVertexAttribArray(shader.location.position);
			nodeGl.enableVertexAttribArray(shader.location.texCoord);

			if (model.texCoord) {
				nodeGl.bindBuffer(nodeGl.ARRAY_BUFFER, model.texCoord);
				nodeGl.vertexAttribPointer(shader.location.texCoord, model.texCoord.size, nodeGl.FLOAT, false, 0, 0);
			}

			nodeGl.bindBuffer(nodeGl.ARRAY_BUFFER, model.vertex);
			nodeGl.vertexAttribPointer(shader.location.position, model.vertex.size, nodeGl.FLOAT, false, 0, 0);

			nodeGl.bindBuffer(nodeGl.ELEMENT_ARRAY_BUFFER, model.index);

			//default for depth is disable
			if (options && options.depth) {
				gl.enable(gl.DEPTH_TEST);
			} else {
				gl.disable(gl.DEPTH_TEST);
			}

			//default for blend is enabled
			if (!options) {
				gl.enable(gl.BLEND);
				gl.blendFunc(
					gl.ONE,
					gl.ZERO
				);
				gl.blendEquation(gl.FUNC_ADD);
			} else if (options.blend === undefined || options.blend) {
				gl.enable(gl.BLEND);

				srcRGB = options.srcRGB === undefined ? gl.ONE : options.srcRGB;
				dstRGB = options.dstRGB || gl.ZERO;
				srcAlpha = options.srcAlpha === undefined ? srcRGB : options.srcAlpha;
				dstAlpha = options.dstAlpha === undefined ? dstRGB : options.dstAlpha;

				gl.blendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha);
				gl.blendEquation(options.blendEquation || gl.FUNC_ADD);
			} else {
				gl.disable(gl.BLEND);
			}

			/* set uniforms to current values */
			for (name in uniforms) {
				if (uniforms.hasOwnProperty(name)) {
					value = uniforms[name];
					shaderUniform = shader.uniforms[name];
					if (shaderUniform) {
						if (value instanceof WebGLTexture) {
							nodeGl.activeTexture(nodeGl.TEXTURE0 + numTextures);
							nodeGl.bindTexture(nodeGl.TEXTURE_2D, value);
							shaderUniform.set(numTextures);
							numTextures++;
						} else if (value instanceof SourceNode ||
								value instanceof EffectNode ||
								value instanceof TransformNode) {
							if (value.texture) {
								nodeGl.activeTexture(nodeGl.TEXTURE0 + numTextures);
								nodeGl.bindTexture(nodeGl.TEXTURE_2D, value.texture);
								shaderUniform.set(numTextures);
								numTextures++;
							}
						} else if(value !== undefined && value !== null) {
							shaderUniform.set(value);
						}
					}
				}
			}

			//default for clear is true
			if (!options || options.clear === undefined || options.clear) {
				nodeGl.clearColor(0.0, 0.0, 0.0, 0.0);
				nodeGl.clear(nodeGl.COLOR_BUFFER_BIT | nodeGl.DEPTH_BUFFER_BIT);
			}

			// draw!
			nodeGl.drawElements(model.mode, model.length, nodeGl.UNSIGNED_SHORT, 0);

			//to protect other 3D libraries that may not remember to turn their depth tests on
			gl.enable(gl.DEPTH_TEST);
		}

		function findInputNode(hook, source, options) {
			var node, i;

			if (typeof hook !== 'string' || !source && source !== 0) {
				if (!options || typeof options !== 'object') {
					options = source;
				}
				source = hook;
			}

			if (typeof hook !== 'string' || !seriousSources[hook]) {
				hook = null;
			}

			if (source instanceof SourceNode ||
					source instanceof EffectNode ||
					source instanceof TransformNode) {
				node = source;
			} else if (source instanceof Effect ||
					source instanceof Source ||
					source instanceof Transform) {
				node = nodesById[source.id];

				if (!node) {
					throw new Error('Cannot connect a foreign node');
				}
			} else {
				if (typeof source === 'string' && isNaN(source)) {
					source = getElement(source, ['canvas', 'img', 'video']);
				}

				for (i = 0; i < sources.length; i++) {
					node = sources[i];
					if ((!hook || hook === node.hook) && node.compare && node.compare(source, options)) {
						return node;
					}
				}

				node = new SourceNode(hook, source, options);
			}

			return node;
		}

		//trace back all sources to make sure we're not making a cyclical connection
		function traceSources(node, original) {
			var i,
				source,
				nodeSources;

			if (!(node instanceof EffectNode) && !(node instanceof TransformNode)) {
				return false;
			}

			if (node === original) {
				return true;
			}

			nodeSources = node.sources;

			for (i in nodeSources) {
				if (nodeSources.hasOwnProperty(i)) {
					source = nodeSources[i];

					if (source === original || traceSources(source, original)) {
						return true;
					}
				}
			}

			return false;
		}

		Node = function () {
			this.ready = false;
			this.width = 1;
			this.height = 1;

			this.gl = gl;

			this.uniforms = {
				resolution: [this.width, this.height],
				transform: null
			};

			this.dirty = true;
			this.isDestroyed = false;

			this.seriously = seriously;

			this.listeners = {};

			this.id = nodeId;
			nodeId++;
		};

		Node.prototype.setReady = function () {
			var i;

			if (!this.ready) {
				this.ready = true;
				this.emit('ready');
				if (this.targets) {
					for (i = 0; i < this.targets.length; i++) {
						this.targets[i].setReady();
					}
				}
			}
		};

		Node.prototype.setUnready = function () {
			var i;

			if (this.ready) {
				this.ready = false;
				this.emit('unready');
				if (this.targets) {
					for (i = 0; i < this.targets.length; i++) {
						this.targets[i].setUnready();
					}
				}
			}
		};

		Node.prototype.setDirty = function () {
			//loop through all targets calling setDirty (depth-first)
			var i;

			if (!this.dirty) {
				this.emit('dirty');
				this.dirty = true;
				if (this.targets) {
					for (i = 0; i < this.targets.length; i++) {
						this.targets[i].setDirty();
					}
				}
			}
		};

		Node.prototype.initFrameBuffer = function (useFloat) {
			if (gl) {
				this.frameBuffer = new FrameBuffer(gl, this.width, this.height, useFloat);
			}
		};

		Node.prototype.readPixels = function (x, y, width, height, dest) {
			var nodeGl = this.gl || gl;

			if (!gl) {
				//todo: is this the best approach?
				throw new Error('Cannot read pixels until a canvas is connected');
			}

			//todo: check on x, y, width, height

			if (!this.frameBuffer) {
				this.initFrameBuffer();
				this.setDirty();
			}

			//todo: should we render here?
			this.render();

			//todo: figure out formats and types
			if (dest === undefined) {
				dest = new Uint8Array(width * height * 4);
			} else if (!dest instanceof Uint8Array) {
				throw new Error('Incompatible array type');
			}

			nodeGl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer.frameBuffer);
			nodeGl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, dest);

			return dest;
		};

		Node.prototype.resize = function () {
			var width,
				height;

			if (this.source) {
				width = this.source.width;
				height = this.source.height;
			} else if (this.sources && this.sources.source) {
				width = this.sources.source.width;
				height = this.sources.source.height;
			} else if (this.inputs && this.inputs.width) {
				width = this.inputs.width;
				height = this.inputs.height || width;
			} else if (this.inputs && this.inputs.height) {
				width = height = this.inputs.height;
			} else {
				//this node will be responsible for calculating its own size
				width = 1;
				height = 1;
			}

			width = Math.floor(width);
			height = Math.floor(height);

			if (this.width !== width || this.height !== height) {
				this.width = width;
				this.height = height;

				this.emit('resize');
				this.setDirty();
			}

			if (this.uniforms && this.uniforms.resolution) {
				this.uniforms.resolution[0] = width;
				this.uniforms.resolution[1] = height;
			}

			if (this.frameBuffer && this.frameBuffer.resize) {
				this.frameBuffer.resize(width, height);
			}
		};

		Node.prototype.on = function (eventName, callback) {
			var listeners,
				index = -1;

			if (!eventName || typeof callback !== 'function') {
				return;
			}

			listeners = this.listeners[eventName];
			if (listeners) {
				index = listeners.indexOf(callback);
			} else {
				listeners = this.listeners[eventName] = [];
			}

			if (index < 0) {
				listeners.push(callback);
			}
		};

		Node.prototype.off = function (eventName, callback) {
			var listeners,
				index = -1;

			if (!eventName || typeof callback !== 'function') {
				return;
			}

			listeners = this.listeners[eventName];
			if (listeners) {
				index = listeners.indexOf(callback);
				if (index >= 0) {
					listeners.splice(index, 1);
				}
			}
		};

		Node.prototype.emit = function (eventName) {
			var i,
				listeners = this.listeners[eventName];

			if (listeners && listeners.length) {
				for (i = 0; i < listeners.length; i++) {
					setTimeoutZero(listeners[i]);
				}
			}
		};

		Node.prototype.destroy = function () {
			var i,
				key;

			delete this.gl;
			delete this.seriously;

			//remove all listeners
			for (key in this.listeners) {
				if (this.listeners.hasOwnProperty(key)) {
					delete this.listeners[key];
				}
			}

			//clear out uniforms
			for (i in this.uniforms) {
				if (this.uniforms.hasOwnProperty(i)) {
					delete this.uniforms[i];
				}
			}

			//clear out list of targets and disconnect each
			if (this.targets) {
				delete this.targets;
			}

			//clear out frameBuffer
			if (this.frameBuffer && this.frameBuffer.destroy) {
				this.frameBuffer.destroy();
				delete this.frameBuffer;
			}

			//remove from main nodes index
			i = nodes.indexOf(this);
			if (i >= 0) {
				nodes.splice(i, 1);
			}
			delete nodesById[this.id];

			this.isDestroyed = true;
		};

		Effect = function (effectNode) {
			var name, me = effectNode;

			function setInput(inputName, input) {
				var lookup, value, effectInput, i;

				effectInput = me.effect.inputs[inputName];

				lookup = me.inputElements[inputName];

				if (typeof input === 'string' && isNaN(input)) {
					if (effectInput.type === 'enum') {
						if (!effectInput.options.hasOwnProperty(input)) {
							input = getElement(input, ['select']);
						}
					} else if (effectInput.type === 'number' || effectInput.type === 'boolean') {
						input = getElement(input, ['input', 'select']);
					} else if (effectInput.type === 'image') {
						input = getElement(input, ['canvas', 'img', 'video']);
					}
					//todo: color? date/time?
				}

				if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
					value = input.value;

					if (lookup && lookup.element !== input) {
						lookup.element.removeEventListener('change', lookup.listener, true);
						lookup.element.removeEventListener('input', lookup.listener, true);
						delete me.inputElements[inputName];
						lookup = null;
					}

					if (!lookup) {
						lookup = {
							element: input,
							listener: (function (name, element) {
								return function () {
									var oldValue, newValue;

									if (input.type === 'checkbox') {
										//special case for check box
										oldValue = input.checked;
									} else {
										oldValue = element.value;
									}
									newValue = me.setInput(name, oldValue);

									//special case for color type
									if (effectInput.type === 'color') {
										newValue = colorArrayToHex(newValue).substr(0, 7);
									}

									//if input validator changes our value, update HTML Element
									//todo: make this optional...somehow
									if (newValue !== oldValue) {
										element.value = newValue;
									}
								};
							}(inputName, input))
						};

						me.inputElements[inputName] = lookup;
						if (input.type === 'range') {
							input.addEventListener('input', lookup.listener, true);
							input.addEventListener('change', lookup.listener, true);
						} else {
							input.addEventListener('change', lookup.listener, true);
						}
					}

					if (lookup && input.type === 'checkbox') {
						value = input.checked;
					}
				} else {
					if (lookup) {
						lookup.element.removeEventListener('change', lookup.listener, true);
						lookup.element.removeEventListener('input', lookup.listener, true);
						delete me.inputElements[inputName];
					}
					value = input;
				}

				me.setInput(inputName, value);
				return me.inputs[inputName];
			}

			function makeImageSetter(inputName) {
				return function (value) {
					var val = setInput(inputName, value);
					return val && val.pub;
				};
			}

			function makeImageGetter(inputName) {
				return function () {
					var val = me.inputs[inputName];
					return val && val.pub;
				};
			}

			function makeSetter(inputName) {
				return function (value) {
					return setInput(inputName, value);
				};
			}

			function makeGetter(inputName) {
				return function () {
					return me.inputs[inputName];
				};
			}

			//priveleged publicly accessible methods/setters/getters
			//todo: provide alternate set/get methods
			for (name in me.effect.inputs) {
				if (me.effect.inputs.hasOwnProperty(name)) {
					if (this[name] === undefined) {
						if (me.effect.inputs[name].type === 'image') {
							Object.defineProperty(this, name, {
								configurable: true,
								enumerable: true,
								get: makeImageGetter(name),
								set: makeImageSetter(name)
							});
						} else {
							Object.defineProperty(this, name, {
								configurable: true,
								enumerable: true,
								get: makeGetter(name),
								set: makeSetter(name)
							});
						}
					} else {
						//todo: this is temporary. get rid of it.
						throw new Error('Cannot overwrite Seriously.' + name);
					}
				}
			}

			Object.defineProperties(this, {
				effect: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.hook;
					}
				},
				title: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.effect.title || me.hook;
					}
				},
				width: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.width;
					}
				},
				height: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.height;
					}
				},
				id: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.id;
					}
				}
			});

			this.render = function () {
				me.render();
				return this;
			};

			this.readPixels = function (x, y, width, height, dest) {
				return me.readPixels(x, y, width, height, dest);
			};

			this.on = function (eventName, callback) {
				me.on(eventName, callback);
			};

			this.off = function (eventName, callback) {
				me.off(eventName, callback);
			};

			this.inputs = function (name) {
				var result,
					input,
					inputs,
					i,
					key;

				inputs = me.effect.inputs;

				if (name) {
					input = inputs[name];
					if (!input) {
						return null;
					}

					result = {
						type: input.type,
						defaultValue: input.defaultValue,
						title: input.title || name
					};

					if (input.type === 'number') {
						result.min = input.min;
						result.max = input.max;
						result.step = input.step;
					} else if (input.type === 'enum') {
						//make a copy
						result.options = extend({}, input.options);
					} else if (input.type === 'vector') {
						result.dimensions = input.dimensions;
					}

					if (input.description) {
						result.description = input.description;
					}

					return result;
				}

				result = {};
				for (key in inputs) {
					if (inputs.hasOwnProperty(key)) {
						result[key] = this.inputs(key);
					}
				}
				return result;
			};

			this.alias = function (inputName, aliasName) {
				me.alias(inputName, aliasName);
				return this;
			};

			this.matte = function (polygons) {
				me.matte(polygons);
			};

			this.destroy = function () {
				var i,
					descriptor;

				me.destroy();

				for (i in this) {
					if (this.hasOwnProperty(i) && i !== 'isDestroyed' && i !== 'id') {
						descriptor = Object.getOwnPropertyDescriptor(this, i);
						if (descriptor.get || descriptor.set ||
								typeof this[i] !== 'function') {
							delete this[i];
						} else {
							this[i] = nop;
						}
					}
				}
			};

			this.isDestroyed = function () {
				return me.isDestroyed;
			};

			this.isReady = function () {
				return me.ready;
			};
		};

		EffectNode = function (hook, options) {
			var key, name, input,
				defaultValue,
				defaults,
				defaultSources = {};

			Node.call(this, options);
			this.gl = gl;

			this.effectRef = seriousEffects[hook];
			this.sources = {};
			this.targets = [];
			this.inputElements = {};
			this.dirty = true;
			this.shaderDirty = true;
			this.hook = hook;
			this.options = options;
			this.transform = null;

			this.effect = extend({}, this.effectRef);
			if (this.effectRef.definition) {
				/*
				todo: copy over inputs object separately in case some are specified
				in advance and some are specified in definition function
				*/
				extend(this.effect, this.effectRef.definition.call(this, options));
			}
			validateInputSpecs(this.effect);

			this.uniforms.transform = identity;
			this.inputs = {};
			defaults = defaultInputs[hook];
			for (name in this.effect.inputs) {
				if (this.effect.inputs.hasOwnProperty(name)) {
					input = this.effect.inputs[name];

					if (input.defaultValue === undefined || input.defaultValue === null) {
						if (input.type === 'number') {
							input.defaultValue = Math.min(Math.max(0, input.min), input.max);
						} else if (input.type === 'color') {
							input.defaultValue = [0, 0, 0, 0];
						} else if (input.type === 'boolean') {
							input.defaultValue = false;
						} else if (input.type === 'string') {
							input.defaultValue = '';
						} else if (input.type === 'enum') {
							input.defaultValue = input.firstValue;
						}
					}

					defaultValue = input.validate.call(this, input.defaultValue, input);
					if (defaults && defaults[name] !== undefined) {
						defaultValue = input.validate.call(this, defaults[name], input, input.defaultValue, defaultValue);
						defaults[name] = defaultValue;
						if (input.type === 'image') {
							defaultSources[name] = defaultValue;
						}
					}

					this.inputs[name] = defaultValue;
					if (input.uniform) {
						this.uniforms[input.uniform] = input.defaultValue;
					}
				}
			}

			if (gl) {
				this.initialize();
				if (this.effect.commonShader) {
					/*
					this effect is unlikely to need to be modified again
					by changing parameters, so build it now to avoid jank later
					*/
					this.buildShader();
				}
			}

			this.updateReady();
			this.inPlace = this.effect.inPlace;

			this.pub = new Effect(this);

			nodes.push(this);
			nodesById[this.id] = this;
			effects.push(this);

			allEffectsByHook[hook].push(this);

			for (name in defaultSources) {
				if (defaultSources.hasOwnProperty(name)) {
					this.setInput(name, defaultSources[name]);
				}
			}
		};

		EffectNode.prototype = Object.create(Node.prototype);

		EffectNode.prototype.initialize = function () {
			if (!this.initialized) {
				var that = this;

				this.baseShader = baseShader;

				if (this.shape) {
					this.model = makeGlModel(this.shape, this.gl);
				} else {
					this.model = rectangleModel;
				}

				if (typeof this.effect.initialize === 'function') {
					this.effect.initialize.call(this, function () {
						that.initFrameBuffer(true);
					}, gl);
				} else {
					this.initFrameBuffer(true);
				}

				if (this.frameBuffer) {
					this.texture = this.frameBuffer.texture;
				}

				this.initialized = true;
			}
		};

		EffectNode.prototype.resize = function () {
			var i;

			Node.prototype.resize.call(this);

			if (this.effect.resize) {
				this.effect.resize.call(this);
			}

			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}
		};

		EffectNode.prototype.updateReady = function () {
			var i,
				input,
				key,
				effect,
				ready = true,
				method;

			effect = this.effect;
			for (key in effect.inputs) {
				if (effect.inputs.hasOwnProperty(key)) {
					input = this.effect.inputs[key];
					if (input.type === 'image' &&
							(!this.sources[key] || !this.sources[key].ready) &&
							(!effect.requires || effect.requires.call(this, key, this.inputs))
							) {
						ready = false;
						break;
					}
				}
			}

			if (this.ready !== ready) {
				this.ready = ready;
				this.emit(ready ? 'ready' : 'unready');
				method = ready ? 'setReady' : 'setUnready';

				if (this.targets) {
					for (i = 0; i < this.targets.length; i++) {
						this.targets[i][method]();
					}
				}
			}
		};

		EffectNode.prototype.setReady = EffectNode.prototype.updateReady;

		EffectNode.prototype.setUnready = EffectNode.prototype.updateReady;

		EffectNode.prototype.addTarget = function (target) {
			var i;
			for (i = 0; i < this.targets.length; i++) {
				if (this.targets[i] === target) {
					return;
				}
			}

			this.targets.push(target);
		};

		EffectNode.prototype.removeTarget = function (target) {
			var i = this.targets && this.targets.indexOf(target);
			if (i >= 0) {
				this.targets.splice(i, 1);
			}
		};

		EffectNode.prototype.removeSource = function (source) {
			var i, pub = source && source.pub;

			for (i in this.inputs) {
				if (this.inputs.hasOwnProperty(i) &&
					(this.inputs[i] === source || this.inputs[i] === pub)) {
					this.inputs[i] = null;
				}
			}

			for (i in this.sources) {
				if (this.sources.hasOwnProperty(i) &&
					(this.sources[i] === source || this.sources[i] === pub)) {
					this.sources[i] = null;
				}
			}
		};

		EffectNode.prototype.buildShader = function () {
			var shader, effect = this.effect;
			if (this.shaderDirty) {
				if (effect.commonShader && commonShaders[this.hook]) {
					if (!this.shader) {
						commonShaders[this.hook].count++;
					}
					this.shader = commonShaders[this.hook].shader;
				} else if (effect.shader) {
					if (this.shader && !effect.commonShader) {
						this.shader.destroy();
					}
					shader = effect.shader.call(this, this.inputs, {
						vertex: baseVertexShader,
						fragment: baseFragmentShader
					}, Seriously.util);

					if (shader instanceof ShaderProgram) {
						this.shader = shader;
					} else if (shader && shader.vertex && shader.fragment) {
						this.shader = new ShaderProgram(gl, shader.vertex, shader.fragment);
					} else {
						this.shader = baseShader;
					}

					if (effect.commonShader) {
						commonShaders[this.hook] = {
							count: 1,
							shader: this.shader
						};
					}
				} else {
					this.shader = baseShader;
				}

				this.shaderDirty = false;
			}
		};

		EffectNode.prototype.render = function () {
			var key,
				frameBuffer,
				effect = this.effect,
				that = this,
				inPlace;

			function drawFn(shader, model, uniforms, frameBuffer, node, options) {
				draw(shader, model, uniforms, frameBuffer, node || that, options);
			}

			if (!gl) {
				return;
			}

			if (!this.initialized) {
				this.initialize();
			}

			if (this.shaderDirty) {
				this.buildShader();
			}

			if (this.dirty && this.ready) {
				for (key in this.sources) {
					if (this.sources.hasOwnProperty(key) &&
						(!effect.requires || effect.requires.call(this, key, this.inputs))) {

						//todo: set source texture in case it changes?
						//sourcetexture = this.sources[i].render() || this.sources[i].texture

						inPlace = typeof this.inPlace === 'function' ? this.inPlace(key) : this.inPlace;
						this.sources[key].render(!inPlace);
					}
				}

				if (this.frameBuffer) {
					frameBuffer = this.frameBuffer.frameBuffer;
				}

				if (typeof effect.draw === 'function') {
					effect.draw.call(this, this.shader, this.model, this.uniforms, frameBuffer, drawFn);
					this.emit('render');
				} else if (frameBuffer) {
					draw(this.shader, this.model, this.uniforms, frameBuffer, this);
					this.emit('render');
				}

				this.dirty = false;
			}

			return this.texture;
		};

		EffectNode.prototype.setInput = function (name, value) {
			var input, uniform,
				sourceKeys,
				source,
				me = this,
				defaultValue;

			function disconnectSource() {
				var previousSource = me.sources[name],
					key;

				/*
				remove this node from targets of previously connected source node,
				but only if the source node is not being used as another input
				*/
				if (previousSource) {
					for (key in me.sources) {
						if (key !== name &&
								me.sources.hasOwnProperty(key) &&
								me.sources[key] === previousSource) {
							return;
						}
					}
					previousSource.removeTarget(me);
				}
			}

			if (this.effect.inputs.hasOwnProperty(name)) {
				input = this.effect.inputs[name];
				if (input.type === 'image') {
					//&& !(value instanceof Effect) && !(value instanceof Source)) {

					if (value) {
						value = findInputNode(value);

						if (value !== this.sources[name]) {
							disconnectSource();

							if (traceSources(value, this)) {
								throw new Error('Attempt to make cyclical connection.');
							}

							this.sources[name] = value;
							value.addTarget(this);
						}
					} else {
						delete this.sources[name];
						value = false;
					}

					uniform = this.sources[name];

					sourceKeys = Object.keys(this.sources);
					if (this.inPlace === true && sourceKeys.length === 1) {
						source = this.sources[sourceKeys[0]];
						this.uniforms.transform = source && source.cumulativeMatrix || identity;
					} else {
						this.uniforms.transform = identity;
					}
				} else {
					if (defaultInputs[this.hook] && defaultInputs[this.hook][name] !== undefined) {
						defaultValue = defaultInputs[this.hook][name];
					} else {
						defaultValue = input.defaultValue;
					}
					value = input.validate.call(this, value, input, defaultValue, this.inputs[name]);
					uniform = value;
				}

				if (this.inputs[name] === value && input.type !== 'color' && input.type !== 'vector') {
					return value;
				}

				this.inputs[name] = value;

				if (input.uniform) {
					this.uniforms[input.uniform] = uniform;
				}

				if (input.type === 'image') {
					this.resize();
					this.updateReady();
				} else if (input.updateSources) {
					this.updateReady();
				}

				if (input.shaderDirty) {
					this.shaderDirty = true;
				}

				this.setDirty();

				if (input.update) {
					input.update.call(this, value);
				}

				return value;
			}
		};

		EffectNode.prototype.alias = function (inputName, aliasName) {
			var that = this;

			if (reservedNames.indexOf(aliasName) >= 0) {
				throw new Error('\'' + aliasName + '\' is a reserved name and cannot be used as an alias.');
			}

			if (this.effect.inputs.hasOwnProperty(inputName)) {
				if (!aliasName) {
					aliasName = inputName;
				}

				seriously.removeAlias(aliasName);

				aliases[aliasName] = {
					node: this,
					input: inputName
				};

				Object.defineProperty(seriously, aliasName, {
					configurable: true,
					enumerable: true,
					get: function () {
						return that.inputs[inputName];
					},
					set: function (value) {
						return that.setInput(inputName, value);
					}
				});
			}

			return this;
		};

		/*
		matte function to be assigned as a method to EffectNode and TargetNode
		*/
		EffectNode.prototype.matte = function (poly) {
			var polys,
				polygons = [],
				polygon,
				vertices = [],
				i, j, v,
				vert, prev,
				//triangles = [],
				shape = {};

			//detect whether it's multiple polygons or what
			function makePolygonsArray(poly) {
				if (!poly || !poly.length || !Array.isArray(poly)) {
					return [];
				}

				if (!Array.isArray(poly[0])) {
					return [poly];
				}

				if (Array.isArray(poly[0]) && !isNaN(poly[0][0])) {
					return [poly];
				}

				return poly;
			}

			function linesIntersect(a1, a2, b1, b2) {
				var ua_t, ub_t, u_b, ua, ub;
				ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
				ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
				u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
				if (u_b) {
					ua = ua_t / u_b;
					ub = ub_t / u_b;
					if (ua > 0 && ua <= 1 && ub > 0 && ub <= 1) {
						return {
							x: a1.x + ua * (a2.x - a1.x),
							y: a1.y + ua * (a2.y - a1.y)
						};
					}
				}
				return false;
			}

			function makeSimple(poly) {
				/*
				this uses a slow, naive approach to detecting line intersections.
				Use Bentley-Ottmann Algorithm
				see: http://softsurfer.com/Archive/algorithm_0108/algorithm_0108.htm#Bentley-Ottmann Algorithm
				see: https://github.com/tokumine/sweepline
				*/
				var i, j,
					edge1, edge2,
					intersect,
					intersections = [],
					newPoly,
					head, point,
					newPolygons,
					point1, point2;

				if (poly.simple) {
					return;
				}

				for (i = 0; i < poly.edges.length; i++) {
					edge1 = poly.edges[i];
					for (j = i + 1; j < poly.edges.length; j++) {
						edge2 = poly.edges[j];
						intersect = linesIntersect(edge1[0], edge1[1], edge2[0], edge2[1]);
						if (intersect) {
							intersect.edge1 = edge1;
							intersect.edge2 = edge2;
							intersections.push(intersect);
						}
					}
				}

				if (intersections.length) {
					newPolygons = [];

					for (i = 0; i < intersections.length; i++) {
						intersect = intersections[i];
						edge1 = intersect.edge1;
						edge2 = intersect.edge2;

						//make new points
						//todo: set ids for points
						point1 = {
							x: intersect.x,
							y: intersect.y,
							prev: edge1[0],
							next: edge2[1],
							id: vertices.length
						};
						poly.vertices.push(point1);
						vertices.push(point1);

						point2 = {
							x: intersect.x,
							y: intersect.y,
							prev: edge2[0],
							next: edge1[1],
							id: vertices.length
						};
						poly.vertices.push(point2);
						vertices.push(point1);

						//modify old points
						point1.prev.next = point1;
						point1.next.prev = point1;
						point2.prev.next = point2;
						point2.next.prev = point2;

						//don't bother modifying the old edges. we're just gonna throw them out
					}

					//make new polygons
					do {
						newPoly = {
							edges: [],
							vertices: [],
							simple: true
						};
						newPolygons.push(newPoly);
						point = poly.vertices[0];
						head = point;
						//while (point.next !== head && poly.vertices.length) {
						do {
							i = poly.vertices.indexOf(point);
							poly.vertices.splice(i, 1);
							newPoly.edges.push([point, point.next]);
							newPoly.vertices.push(point);
							point = point.next;
						} while (point !== head);
					} while (poly.vertices.length);

					//remove original polygon from list
					i = polygons.indexOf(poly);
					polygons.splice(i, 1);

					//add new polygons to list
					for (i = 0; i < newPolygons.length; i++) {
						polygons.push(newPolygons[i]);
					}
				} else {
					poly.simple = true;
				}
			}

			function clockWise(poly) {
				var p, q, n = poly.vertices.length,
					pv, qv, sum = 0;
				for (p = n - 1, q = 0; q < n; p = q, q++) {
					pv = poly.vertices[p];
					qv = poly.vertices[q];
					//sum += (next.x - v.x) * (next.y + v.y);
					//sum += (v.next.x + v.x) * (v.next.y - v.y);
					sum += pv.x * qv.y - qv.x * pv.y;
				}
				return sum > 0;
			}

			function triangulate(poly) {
				var v, points = poly.vertices,
					n, V = [], indices = [],
					nv, count, m, u, w,

					//todo: give these variables much better names
					a, b, c, s, t;

				function pointInTriangle(a, b, c, p) {
					var ax, ay, bx, by, cx, cy, apx, apy, bpx, bpy, cpx, cpy,
						cXap, bXcp, aXbp;

					ax = c.x - b.x;
					ay = c.y - b.y;
					bx = a.x - c.x;
					by = a.y - c.y;
					cx = b.x - a.x;
					cy = b.y - a.y;
					apx = p.x - a.x;
					apy = p.y - a.y;
					bpx = p.x - b.x;
					bpy = p.y - b.y;
					cpx = p.x - c.x;
					cpy = p.y - c.y;

					aXbp = ax * bpy - ay * bpx;
					cXap = cx * apy - cy * apx;
					bXcp = bx * cpy - by * cpx;

					return aXbp >= 0 && bXcp >=0 && cXap >=0;
				}

				function snip(u, v, w, n, V) {
					var p, a, b, c, point;
					a = points[V[u]];
					b = points[V[v]];
					c = points[V[w]];
					if (0 > (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) {
						return false;
					}
					for (p = 0; p < n; p++) {
						if (!(p === u || p === v || p === w)) {
							point = points[V[p]];
							if (pointInTriangle(a, b, c, point)) {
								return false;
							}
						}
					}
					return true;
				}

				//copy points
				//for (v = 0; v < poly.vertices.length; v++) {
				//	points.push(poly.vertices[v]);
				//}
				n = points.length;

				if (poly.clockWise) {
					for (v = 0; v < n; v++) {
						V[v] = v;
					}
				} else {
					for (v = 0; v < n; v++) {
						V[v] = (n - 1) - v;
					}
				}

				nv = n;
				count = 2 * nv;
				m = 0;
				v = nv - 1;
				while (nv > 2) {
					if ((count--) <= 0) {
						return indices;
					}

					u = v;
					if (nv <= u) {
						u = 0;
					}

					v = u + 1;
					if (nv <= v) {
						v = 0;
					}

					w = v + 1;
					if (nv < w) {
						w = 0;
					}

					if (snip(u, v, w, nv, V)) {
						a = V[u];
						b = V[v];
						c = V[w];
						if (poly.clockWise) {
							indices.push(points[a]);
							indices.push(points[b]);
							indices.push(points[c]);
						} else {
							indices.push(points[c]);
							indices.push(points[b]);
							indices.push(points[a]);
						}
						m++;
						for (s = v, t = v + 1; t < nv; s++, t++) {
							V[s] = V[t];
						}
						nv--;
						count = 2 * nv;
					}
				}

				polygon.indices = indices;
			}

			polys = makePolygonsArray(poly);

			for (i = 0; i < polys.length; i++) {
				poly = polys[i];
				prev = null;
				polygon = {
					vertices: [],
					edges: []
				};

				for (j = 0; j < poly.length; j++) {
					v = poly[j];
					if (typeof v ==='object' && !isNaN(v.x) && !isNaN(v.y)) {
						vert = {
							x: v.x,
							y: v.y,
							id: vertices.length
						};
					} else if (v.length >= 2 && !isNaN(v[0]) && !isNaN(v[1])) {
						vert = {
							x: v[0],
							y: v[1],
							id: vertices.length
						};
					}
					if (vert) {
						if (prev) {
							prev.next = vert;
							vert.prev = prev;
							vert.next = polygon.vertices[0];
							polygon.vertices[0].prev = vert;
						} else {
							polygon.head = vert;
							vert.next = vert;
							vert.prev = vert;
						}
						vertices.push(vert);
						polygon.vertices.push(vert);
						prev = vert;
					}
				}

				if (polygon.vertices.length > 2) {
					if (polygon.vertices.length === 3) {
						polygon.simple = true;
					}

					polygons.push(polygon);

					//save edges
					for (j = 0; j < polygon.vertices.length; j++) {
						vert = polygon.vertices[j];
						polygon.edges.push([
							vert, vert.next
						]);
					}
				}
			}

			for (i = polygons.length - 1; i >= 0; i--) {
				polygon = polygons[i];
				makeSimple(polygon);
			}

			for (i = 0; i < polygons.length; i++) {
				polygon = polygons[i];
				polygon.clockWise = clockWise(polygon);
				triangulate(polygon);
			}

			//build shape
			shape.vertices = [];
			shape.coords = [];
			for (i = 0; i < vertices.length; i++) {
				v = vertices[i];
				shape.vertices.push(v.x * 2 - 1);
				shape.vertices.push(v.y * -2 + 1);
				shape.vertices.push(-1);

				shape.coords.push(v.x);
				shape.coords.push(v.y * -1 + 1);
			}
			shape.vertices = new Float32Array(shape.vertices);
			shape.coords = new Float32Array(shape.coords);

			shape.indices = [];
			for (i = 0; i < polygons.length; i++) {
				polygon = polygons[i];
				for (j = 0; j < polygon.indices.length; j++) {
					v = polygon.indices[j];
					shape.indices.push(v.id);
					//shape.indices.push(v[1].id);
					//shape.indices.push(v[2].id);
				}
			}
			shape.indices = new Uint16Array(shape.indices);

			this.shape = shape;
			if (this.gl) {
				makeGlModel(shape, this.gl);
			}
		};

		EffectNode.prototype.destroy = function () {
			var i, key, item, hook = this.hook;

			//let effect destroy itself
			if (this.effect.destroy && typeof this.effect.destroy === 'function') {
				this.effect.destroy.call(this);
			}
			delete this.effect;

			//shader
			if (commonShaders[hook]) {
				commonShaders[hook].count--;
				if (!commonShaders[hook].count) {
					delete commonShaders[hook];
				}
			}
			if (this.shader && this.shader.destroy && this.shader !== baseShader && !commonShaders[hook]) {
				this.shader.destroy();
			}
			delete this.shader;

			//stop watching any input elements
			for (key in this.inputElements) {
				if (this.inputElements.hasOwnProperty(key)) {
					item = this.inputElements[key];
					item.element.removeEventListener('change', item.listener, true);
					item.element.removeEventListener('input', item.listener, true);
				}
			}

			//sources
			for (key in this.sources) {
				if (this.sources.hasOwnProperty(key)) {
					item = this.sources[key];
					if (item && item.removeTarget) {
						item.removeTarget(this);
					}
					delete this.sources[key];
				}
			}

			//targets
			while (this.targets.length) {
				item = this.targets.pop();
				if (item && item.removeSource) {
					item.removeSource(this);
				}
			}

			for (key in this) {
				if (this.hasOwnProperty(key) && key !== 'id') {
					delete this[key];
				}
			}

			//remove any aliases
			for (key in aliases) {
				if (aliases.hasOwnProperty(key)) {
					item = aliases[key];
					if (item.node === this) {
						seriously.removeAlias(key);
					}
				}
			}

			//remove self from master list of effects
			i = effects.indexOf(this);
			if (i >= 0) {
				effects.splice(i, 1);
			}

			i = allEffectsByHook[hook].indexOf(this);
			if (i >= 0) {
				allEffectsByHook[hook].splice(i, 1);
			}

			Node.prototype.destroy.call(this);
		};

		Source = function (sourceNode) {
			var me = sourceNode;

			//priveleged accessor methods
			Object.defineProperties(this, {
				original: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.source;
					}
				},
				id: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.id;
					}
				},
				width: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.width;
					}
				},
				height: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.height;
					}
				}
			});

			this.render = function () {
				me.render();
			};

			this.update = function () {
				me.setDirty();
			};

			this.readPixels = function (x, y, width, height, dest) {
				return me.readPixels(x, y, width, height, dest);
			};

			this.on = function (eventName, callback) {
				me.on(eventName, callback);
			};

			this.off = function (eventName, callback) {
				me.off(eventName, callback);
			};

			this.destroy = function () {
				var i,
					descriptor;

				me.destroy();

				for (i in this) {
					if (this.hasOwnProperty(i) && i !== 'isDestroyed' && i !== 'id') {
						descriptor = Object.getOwnPropertyDescriptor(this, i);
						if (descriptor.get || descriptor.set ||
								typeof this[i] !== 'function') {
							delete this[i];
						} else {
							this[i] = nop;
						}
					}
				}
			};

			this.isDestroyed = function () {
				return me.isDestroyed;
			};

			this.isReady = function () {
				return me.ready;
			};
		};

		/*
			possible sources: img, video, canvas (2d or 3d), texture, ImageData, array, typed array
		*/
		SourceNode = function (hook, source, options) {
			var opts = options || {},
				flip = opts.flip === undefined ? true : opts.flip,
				width = opts.width,
				height = opts.height,
				deferTexture = false,
				that = this,
				matchedType = false,
				key,
				plugin;

			function sourcePlugin(hook, source, options, force) {
				var p = seriousSources[hook];
				if (p.definition) {
					p = p.definition.call(that, source, options, force);
					if (p) {
						p = extend(extend({}, seriousSources[hook]), p);
					} else {
						return null;
					}
				}
				return p;
			}

			function compareSource(source) {
				return that.source === source;
			}

			Node.call(this);

			if (hook && typeof hook !== 'string' || !source && source !== 0) {
				if (!options || typeof options !== 'object') {
					options = source;
				}
				source = hook;
			}

			if (typeof source === 'string' && isNaN(source)) {
				source = getElement(source, ['canvas', 'img', 'video']);
			}

			// forced source type?
			if (typeof hook === 'string' && seriousSources[hook]) {
				plugin = sourcePlugin(hook, source, options, true);
				if (plugin) {
					this.hook = hook;
					matchedType = true;
					deferTexture = plugin.deferTexture;
					this.plugin = plugin;
					this.compare = plugin.compare;
					this.checkDirty = plugin.checkDirty;
					if (plugin.source) {
						source = plugin.source;
					}
				}
			}

			//todo: could probably stand to re-work and re-indent this whole block now that we have plugins
			if (!plugin && source instanceof HTMLElement) {
				if (source.tagName === 'CANVAS') {
					this.width = source.width;
					this.height = source.height;

					this.render = this.renderImageCanvas;
					matchedType = true;
					this.hook = 'canvas';
					this.compare = compareSource;
				} else if (source.tagName === 'IMG') {
					this.width = source.naturalWidth || 1;
					this.height = source.naturalHeight || 1;

					if (!source.complete || !source.naturalWidth) {
						deferTexture = true;
					}

					source.addEventListener('load', function () {
						if (!that.isDestroyed) {
							if (that.width !== source.naturalWidth || that.height !== source.naturalHeight) {
								that.width = source.naturalWidth;
								that.height = source.naturalHeight;
								that.resize();
							}

							that.setDirty();
							that.setReady();
						}
					}, true);

					this.render = this.renderImageCanvas;
					matchedType = true;
					this.hook = 'image';
					this.compare = compareSource;
				}
			} else if (!plugin && source instanceof WebGLTexture) {
				if (gl && !gl.isTexture(source)) {
					throw new Error('Not a valid WebGL texture.');
				}

				//different defaults
				if (!isNaN(width)) {
					if (isNaN(height)) {
						height = width;
					}
				} else if (!isNaN(height)) {
					width = height;
				}/* else {
					//todo: guess based on dimensions of target canvas
					//throw new Error('Must specify width and height when using a WebGL texture as a source');
				}*/

				this.width = width;
				this.height = height;

				if (opts.flip === undefined) {
					flip = false;
				}
				matchedType = true;

				this.texture = source;
				this.initialized = true;
				this.hook = 'texture';
				this.compare = compareSource;

				//todo: if WebGLTexture source is from a different context render it and copy it over
				this.render = function () {};
			}

			if (!matchedType && !plugin) {
				for (key in seriousSources) {
					if (seriousSources.hasOwnProperty(key) && seriousSources[key]) {
						plugin = sourcePlugin(key, source, options, false);
						if (plugin) {
							this.hook = key;
							matchedType = true;
							deferTexture = plugin.deferTexture;
							this.plugin = plugin;
							this.compare = plugin.compare;
							this.checkDirty = plugin.checkDirty;
							if (plugin.source) {
								source = plugin.source;
							}

							break;
						}
					}
				}
			}

			if (!matchedType) {
				throw new Error('Unknown source type');
			}

			this.source = source;
			if (this.flip === undefined) {
				this.flip = flip;
			}

			this.targets = [];

			if (!deferTexture) {
				that.setReady();
			}

			this.pub = new Source(this);

			nodes.push(this);
			nodesById[this.id] = this;
			sources.push(this);
			allSourcesByHook[this.hook].push(this);

			if (sources.length && !rafId) {
				renderDaemon();
			}
		};

		SourceNode.prototype = Object.create(Node.prototype);

		SourceNode.prototype.initialize = function () {
			var texture;

			if (!gl || this.texture || !this.ready) {
				return;
			}

			texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.bindTexture(gl.TEXTURE_2D, null);

			this.texture = texture;
			this.initialized = true;
			this.allowRefresh = true;
			this.setDirty();
		};

		SourceNode.prototype.initFrameBuffer = function (useFloat) {
			if (gl) {
				this.frameBuffer = new FrameBuffer(gl, this.width, this.height, {
					texture: this.texture,
					useFloat: useFloat
				});
			}
		};

		SourceNode.prototype.addTarget = function (target) {
			var i;
			for (i = 0; i < this.targets.length; i++) {
				if (this.targets[i] === target) {
					return;
				}
			}

			this.targets.push(target);
		};

		SourceNode.prototype.removeTarget = function (target) {
			var i = this.targets && this.targets.indexOf(target);
			if (i >= 0) {
				this.targets.splice(i, 1);
			}
		};

		SourceNode.prototype.resize = function () {
			var i,
				target;

			this.uniforms.resolution[0] = this.width;
			this.uniforms.resolution[1] = this.height;

			if (this.framebuffer) {
				this.framebuffer.resize(this.width, this.height);
			}

			this.emit('resize');
			this.setDirty();

			if (this.targets) {
				for (i = 0; i < this.targets.length; i++) {
					target = this.targets[i];
					target.resize();
					if (target.setTransformDirty) {
						target.setTransformDirty();
					}
				}
			}
		};

		SourceNode.prototype.setReady = function () {
			var i;
			if (!this.ready) {
				this.ready = true;
				this.resize();
				this.initialize();

				this.emit('ready');
				if (this.targets) {
					for (i = 0; i < this.targets.length; i++) {
						this.targets[i].setReady();
					}
				}

			}
		};

		SourceNode.prototype.render = function () {
			var media = this.source;

			if (!gl || !media && media !== 0 || !this.ready) {
				return;
			}

			if (!this.initialized) {
				this.initialize();
			}

			if (!this.allowRefresh) {
				return;
			}

			if (this.plugin && this.plugin.render &&
					(this.dirty || this.checkDirty && this.checkDirty()) &&
					this.plugin.render.call(this, gl, draw, rectangleModel, baseShader)) {

				this.dirty = false;
				this.emit('render');
			}
		};

		SourceNode.prototype.renderImageCanvas = function () {
			var media = this.source;

			if (!gl || !media || !this.ready) {
				return;
			}

			if (!this.initialized) {
				this.initialize();
			}

			if (!this.allowRefresh) {
				return;
			}

			if (this.dirty) {
				gl.bindTexture(gl.TEXTURE_2D, this.texture);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flip);
				gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
				try {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);

					this.dirty = false;
					this.emit('render');
					return true;
				} catch (securityError) {
					if (securityError.code === window.DOMException.SECURITY_ERR) {
						this.allowRefresh = false;
						Seriously.logger.error('Unable to access cross-domain image');
					}
				}

				return false;
			}
		};

		SourceNode.prototype.destroy = function () {
			var i, key, item;

			if (this.plugin && this.plugin.destroy) {
				this.plugin.destroy.call(this);
			}

			if (gl && this.texture) {
				gl.deleteTexture(this.texture);
			}

			//targets
			while (this.targets.length) {
				item = this.targets.pop();
				if (item && item.removeSource) {
					item.removeSource(this);
				}
			}

			//remove self from master list of sources
			i = sources.indexOf(this);
			if (i >= 0) {
				sources.splice(i, 1);
			}

			i = allSourcesByHook[this.hook].indexOf(this);
			if (i >= 0) {
				allSourcesByHook[this.hook].splice(i, 1);
			}

			for (key in this) {
				if (this.hasOwnProperty(key) && key !== 'id') {
					delete this[key];
				}
			}

			Node.prototype.destroy.call(this);
		};

		//todo: implement render for array and typed array

		Target = function (targetNode) {
			var me = targetNode;

			//priveleged accessor methods
			Object.defineProperties(this, {
				source: {
					enumerable: true,
					configurable: true,
					get: function () {
						if (me.source) {
							return me.source.pub;
						}
					},
					set: function (value) {
						me.setSource(value);
					}
				},
				original: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.target;
					}
				},
				width: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.width;
					},
					set: function (value) {
						if (!isNaN(value) && value >0 && me.width !== value) {
							me.width = value;
							me.resize();
							me.setTransformDirty();
						}
					}
				},
				height: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.height;
					},
					set: function (value) {
						if (!isNaN(value) && value >0 && me.height !== value) {
							me.height = value;
							me.resize();
							me.setTransformDirty();
						}
					}
				},
				id: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.id;
					}
				}
			});

			this.render = function () {
				me.render();
			};

			this.readPixels = function (x, y, width, height, dest) {
				return me.readPixels(x, y, width, height, dest);
			};

			this.on = function (eventName, callback) {
				me.on(eventName, callback);
			};

			this.off = function (eventName, callback) {
				me.off(eventName, callback);
			};

			this.go = function (options) {
				me.go(options);
			};

			this.stop = function () {
				me.stop();
			};

			this.getTexture = function () {
				return me.frameBuffer.texture;
			};

			this.destroy = function () {
				var i,
					descriptor;

				me.destroy();

				for (i in this) {
					if (this.hasOwnProperty(i) && i !== 'isDestroyed' && i !== 'id') {
						descriptor = Object.getOwnPropertyDescriptor(this, i);
						if (descriptor.get || descriptor.set ||
								typeof this[i] !== 'function') {
							delete this[i];
						} else {
							this[i] = nop;
						}
					}
				}
			};

			this.inputs = function (name) {
				return {
					source: {
						type: 'image'
					}
				};
			};

			this.isDestroyed = function () {
				return me.isDestroyed;
			};

			this.isReady = function () {
				return me.ready;
			};
		};

		/*
			possible targets: canvas (2d or 3d), gl render buffer (must be same canvas)
		*/
		TargetNode = function (hook, target, options) {
			var opts,
				flip,
				width,
				height,
				that = this,
				matchedType = false,
				i, element, elements, context,
				debugContext,
				frameBuffer,
				targetList,
				triedWebGl = false,
				key;

			function targetPlugin(hook, target, options, force) {
				var plugin = seriousTargets[hook];
				if (plugin.definition) {
					plugin = plugin.definition.call(that, target, options, force);
					if (!plugin) {
						return null;
					}
					plugin = extend(extend({}, seriousTargets[hook]), plugin);
					that.hook = key;
					matchedType = true;
					that.plugin = plugin;
					that.compare = plugin.compare;
					if (plugin.target) {
						target = plugin.target;
					}
					if (plugin.gl && !that.gl) {
						that.gl = plugin.gl;
						if (!gl) {
							attachContext(plugin.gl);
						}
					}
					if (that.gl === gl) {
						that.model = rectangleModel;
						that.shader = baseShader;
					}
				}
				return plugin;
			}

			function compareTarget(target) {
				return that.target === target;
			}

			Node.call(this);

			if (hook && typeof hook !== 'string' || !target && target !== 0) {
				if (!options || typeof options !== 'object') {
					options = target;
				}
				target = hook;
			}

			opts = options || {};
			flip = opts.flip === undefined ? true : opts.flip;
			width = parseInt(opts.width, 10);
			height = parseInt(opts.height, 10);
			debugContext = opts.debugContext;

			// forced target type?
			if (typeof hook === 'string' && seriousTargets[hook]) {
				targetPlugin(hook, target, opts, true);
			}

			this.renderToTexture = opts.renderToTexture;

			if (target instanceof WebGLFramebuffer) {
				frameBuffer = target;

				if (opts instanceof HTMLCanvasElement) {
					target = opts;
				} else if (opts instanceof WebGLRenderingContext) {
					target = opts.canvas;
				} else if (opts.canvas instanceof HTMLCanvasElement) {
					target = opts.canvas;
				} else if (opts.context instanceof WebGLRenderingContext) {
					target = opts.context.canvas;
				} else {
					//todo: search all canvases for matching contexts?
					throw new Error('Must provide a canvas with WebGLFramebuffer target');
				}
			}

			if (target instanceof HTMLElement && target.tagName === 'CANVAS') {
				width = target.width;
				height = target.height;

				//try to get a webgl context.
				if (!gl || gl.canvas !== target && opts.allowSecondaryWebGL) {
					triedWebGl = true;
					context = getWebGlContext(target, {
						alpha: true,
						premultipliedAlpha: true,
						preserveDrawingBuffer: true,
						stencil: true,
						debugContext: debugContext
					});
				}

				if (!context) {
					if (!opts.allowSecondaryWebGL && gl && gl.canvas !== target) {
						throw new Error('Only one WebGL target canvas allowed. Set allowSecondaryWebGL option to create secondary context.');
					}

					this.render = nop;
					Seriously.logger.log('Unable to create WebGL context.');
					//throw new Error('Unable to create WebGL context.');
				} else if (!gl || gl === context) {
					//this is our main WebGL canvas
					if (!primaryTarget) {
						primaryTarget = this;
					}
					if (!gl) {
						attachContext(context);
					}
					this.render = this.renderWebGL;

					/*
					Don't remember what this is for. Maybe we should remove it
					*/
					if (opts.renderToTexture) {
						if (gl) {
							this.frameBuffer = new FrameBuffer(gl, width, height, false);
						}
					} else {
						this.frameBuffer = {
							frameBuffer: frameBuffer || null
						};
					}
				} else {
					//set up alternative drawing method using ArrayBufferView
					this.gl = context;

					//this.pixels = new Uint8Array(width * height * 4);
					//todo: probably need another framebuffer for renderToTexture?
					//todo: handle lost context on secondary webgl
					this.frameBuffer = {
						frameBuffer: frameBuffer || null
					};
					this.shader = new ShaderProgram(this.gl, baseVertexShader, baseFragmentShader);
					this.model = buildRectangleModel.call(this, this.gl);
					this.pixels = null;

					this.texture = this.gl.createTexture();
					this.gl.bindTexture(gl.TEXTURE_2D, this.texture);
					this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
					this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
					this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

					this.render = this.renderSecondaryWebGL;
				}

				matchedType = true;
			}

			if (!matchedType) {
				for (key in seriousTargets) {
					if (seriousTargets.hasOwnProperty(key) && seriousTargets[key]) {
						if (targetPlugin(key, target, opts, false)) {
							break;
						}
					}
				}
			}

			if (!matchedType) {
				throw new Error('Unknown target type');
			}

			if (allTargets) {
				targetList = allTargets.get(target);
				if (targetList) {
					Seriously.logger.warn(
						'Target already in use by another instance',
						target,
						Object.keys(targetList).map(function (key) {
							return targetList[key];
						})
					);
				} else {
					targetList = {};
					allTargets.set(target, targetList);
				}
				targetList[seriously.id] = seriously;
			}

			this.target = target;
			this.transform = null;
			this.transformDirty = true;
			this.flip = flip;
			if (width) {
				this.width = width;
			}
			if (height) {
				this.height = height;
			}

			this.uniforms.resolution[0] = this.width;
			this.uniforms.resolution[1] = this.height;

			if (opts.auto !== undefined) {
				this.auto = opts.auto;
			} else {
				this.auto = auto;
			}
			this.frames = 0;

			this.pub = new Target(this);

			nodes.push(this);
			nodesById[this.id] = this;
			targets.push(this);
		};

		TargetNode.prototype = Object.create(Node.prototype);

		TargetNode.prototype.setSource = function (source) {
			var newSource;

			//todo: what if source is null/undefined/false

			newSource = findInputNode(source);

			//todo: check for cycles

			if (newSource !== this.source) {
				if (this.source) {
					this.source.removeTarget(this);
				}
				this.source = newSource;
				newSource.addTarget(this);

				if (newSource) {
					this.resize();
					if (newSource.ready) {
						this.setReady();
					} else {
						this.setUnready();
					}
				}

				this.setDirty();
			}
		};

		TargetNode.prototype.setDirty = function () {
			this.dirty = true;

			if (this.auto && !rafId) {
				rafId = requestAnimationFrame(renderDaemon);
			}
		};

		TargetNode.prototype.resize = function () {
			//if target is a canvas, reset size to canvas size
			if (this.target instanceof HTMLCanvasElement) {
				if (this.width !== this.target.width || this.height !== this.target.height) {
					this.target.width = this.width;
					this.target.height = this.height;
					this.uniforms.resolution[0] = this.width;
					this.uniforms.resolution[1] = this.height;
					this.emit('resize');
					this.setTransformDirty();
				}
			} else if (this.plugin && this.plugin.resize) {
				this.plugin.resize.call(this);
			}

			if (this.source &&
				(this.source.width !== this.width || this.source.height !== this.height)) {
				if (!this.transform) {
					this.transform = new Float32Array(16);
				}
			}
		};

		TargetNode.prototype.setTransformDirty = function () {
			this.transformDirty = true;
			this.setDirty();
		};

		TargetNode.prototype.go = function () {
			this.auto = true;
			this.setDirty();
		};

		TargetNode.prototype.stop = function () {
			this.auto = false;
		};

		TargetNode.prototype.render = function () {
			if (gl && this.plugin && this.plugin.render) {
				this.plugin.render.call(this, draw, baseShader, rectangleModel);
			}
		};

		TargetNode.prototype.renderWebGL = function () {
			var matrix, x, y;

			this.resize();

			if (gl && this.dirty && this.ready) {
				if (!this.source) {
					return;
				}

				this.source.render();

				this.uniforms.source = this.source.texture;

				if (this.source.width === this.width && this.source.height === this.height) {
					this.uniforms.transform = this.source.cumulativeMatrix || identity;
				} else if (this.transformDirty) {
					matrix = this.transform;
					mat4.copy(matrix, this.source.cumulativeMatrix || identity);
					x = this.source.width / this.width;
					y = this.source.height / this.height;
					matrix[0] *= x;
					matrix[1] *= x;
					matrix[2] *= x;
					matrix[3] *= x;
					matrix[4] *= y;
					matrix[5] *= y;
					matrix[6] *= y;
					matrix[7] *= y;
					this.uniforms.transform = matrix;
					this.transformDirty = false;
				}

				draw(baseShader, rectangleModel, this.uniforms, this.frameBuffer.frameBuffer, this, outputRenderOptions);

				this.emit('render');
				this.dirty = false;
			}
		};

		TargetNode.prototype.renderSecondaryWebGL = function () {
			var sourceWidth,
				sourceHeight,
				matrix,
				x,
				y;

			if (this.dirty && this.ready && this.source) {
				this.emit('render');
				this.source.render(true);

				sourceWidth = this.source.width;
				sourceHeight = this.source.height;

				if (!this.pixels || this.pixels.length !== sourceWidth * sourceHeight * 4) {
					this.pixels = new Uint8Array(sourceWidth * sourceHeight * 4);
				}

				this.source.readPixels(0, 0, sourceWidth, sourceHeight, this.pixels);

				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, sourceWidth, sourceHeight, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);

				if (sourceWidth === this.width && sourceHeight === this.height) {
					this.uniforms.transform = identity;
				} else if (this.transformDirty) {
					matrix = this.transform;
					mat4.copy(matrix, identity);
					x = this.source.width / this.width;
					y = this.source.height / this.height;
					matrix[0] *= x;
					matrix[1] *= x;
					matrix[2] *= x;
					matrix[3] *= x;
					matrix[4] *= y;
					matrix[5] *= y;
					matrix[6] *= y;
					matrix[7] *= y;
					this.uniforms.transform = matrix;
					this.transformDirty = false;
				}

				this.uniforms.source = this.texture;
				draw(this.shader, this.model, this.uniforms, null, this, outputRenderOptions);

				this.dirty = false;
			}
		};

		TargetNode.prototype.removeSource = function (source) {
			if (this.source === source || this.source === source.pub) {
				this.source = null;
			}
		};

		TargetNode.prototype.destroy = function () {
			var i,
				targetList;

			//source
			if (this.source && this.source.removeTarget) {
				this.source.removeTarget(this);
			}

			if (allTargets) {
				targetList = allTargets.get(this.target);
				delete targetList[seriously.id];
				if (!Object.keys(targetList).length) {
					allTargets.delete(this.target);
				}
			}

			if (this.plugin && this.plugin.destroy) {
				this.plugin.destroy.call(this);
			}

			delete this.source;
			delete this.target;
			delete this.pub;
			delete this.uniforms;
			delete this.pixels;
			delete this.auto;

			//remove self from master list of targets
			i = targets.indexOf(this);
			if (i >= 0) {
				targets.splice(i, 1);
			}

			Node.prototype.destroy.call(this);

			//clear out context so we can start over
			if (this === primaryTarget) {
				glCanvas.removeEventListener('webglcontextrestored', restoreContext, false);
				destroyContext();
				primaryTarget = null;
			}
		};

		Transform = function (transformNode) {
			var me = transformNode,
				self = this,
				key;

			function setInput(inputName, def, input) {
				var inputKey, lookup, value;

				lookup = me.inputElements[inputName];

				//todo: there is some duplicate code with Effect here. Consolidate.
				if (typeof input === 'string' && isNaN(input)) {
					if (def.type === 'enum') {
						if (!def.options.hasOwnProperty(input)) {
							input = getElement(input, ['select']);
						}
					} else if (def.type === 'number' || def.type === 'boolean') {
						input = getElement(input, ['input', 'select']);
					} else if (def.type === 'image') {
						input = getElement(input, ['canvas', 'img', 'video']);
					}
				}

				if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
					value = input.value;

					if (lookup && lookup.element !== input) {
						lookup.element.removeEventListener('change', lookup.listener, true);
						lookup.element.removeEventListener('input', lookup.listener, true);
						delete me.inputElements[inputName];
						lookup = null;
					}

					if (!lookup) {
						lookup = {
							element: input,
							listener: (function (element) {
								return function () {
									var oldValue, newValue;

									if (input.type === 'checkbox') {
										//special case for check box
										oldValue = input.checked;
									} else {
										oldValue = element.value;
									}
									newValue = me.setInput(inputName, oldValue);

									//special case for color type
									if (input.type === 'color') {
										newValue = colorArrayToHex(newValue);
									}

									//if input validator changes our value, update HTML Element
									//todo: make this optional...somehow
									if (newValue !== oldValue) {
										element.value = newValue;
									}
								};
							}(input))
						};

						me.inputElements[inputName] = lookup;
						if (input.type === 'range') {
							input.addEventListener('input', lookup.listener, true);
							input.addEventListener('change', lookup.listener, true);
						} else {
							input.addEventListener('change', lookup.listener, true);
						}
					}

					if (lookup && input.type === 'checkbox') {
						value = input.checked;
					}
				} else {
					if (lookup) {
						lookup.element.removeEventListener('change', lookup.listener, true);
						lookup.element.removeEventListener('input', lookup.listener, true);
						delete me.inputElements[inputName];
					}
					value = input;
				}

				me.setInput(inputName, value);
			}

			function setProperty(name, def) {
				// todo: validate value passed to 'set'
				Object.defineProperty(self, name, {
					configurable: true,
					enumerable: true,
					get: function () {
						return def.get.call(me);
					},
					set: function (val) {
						setInput(name, def, val);
					}
				});
			}

			function makeMethod(method) {
				return function () {
					if (method.apply(me, arguments)) {
						me.setTransformDirty();
					}
				};
			}

			//priveleged accessor methods
			Object.defineProperties(this, {
				transform: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.hook;
					}
				},
				title: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.plugin.title || me.hook;
					}
				},
				width: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.width;
					}
				},
				height: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.height;
					}
				},
				id: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.id;
					}
				},
				source: {
					enumerable: true,
					configurable: true,
					get: function () {
						return me.source && me.source.pub;
					},
					set: function (source) {
						me.setSource(source);
					}
				}
			});

			// attach methods
			for (key in me.methods) {
				if (me.methods.hasOwnProperty(key)) {
					this[key] = makeMethod(me.methods[key].bind(me));
				}
			}

			for (key in me.inputs) {
				if (me.inputs.hasOwnProperty(key)) {
					setProperty(key, me.inputs[key]);
				}
			}

			this.update = function () {
				me.setDirty();
			};

			this.inputs = function (name) {
				var result,
					input,
					inputs,
					i,
					key;

				inputs = me.plugin.inputs;

				/*
				Only reports setter/getter inputs, not methods
				*/

				if (name) {
					input = inputs[name];
					if (!input || input.method) {
						return null;
					}

					result = {
						type: input.type,
						defaultValue: input.defaultValue,
						title: input.title || name
					};

					if (input.type === 'number') {
						result.min = input.min;
						result.max = input.max;
						result.step = input.step;
					} else if (input.type === 'enum') {
						//make a copy
						result.options = extend({}, input.options);
					} else if (input.type === 'vector') {
						result.dimensions = input.dimensions;
					}

					if (input.description) {
						result.description = input.description;
					}

					return result;
				}

				result = {};
				for (key in inputs) {
					if (inputs.hasOwnProperty(key) && !inputs[key].method) {
						result[key] = this.inputs(key);
					}
				}
				return result;
			};

			this.alias = function (inputName, aliasName) {
				me.alias(inputName, aliasName);
				return this;
			};

			this.on = function (eventName, callback) {
				me.on(eventName, callback);
			};

			this.off = function (eventName, callback) {
				me.off(eventName, callback);
			};

			this.destroy = function () {
				var i,
					descriptor;

				me.destroy();

				for (i in this) {
					if (this.hasOwnProperty(i) && i !== 'isDestroyed' && i !== 'id') {
						//todo: probably can simplify this if the only setter/getter is id
						descriptor = Object.getOwnPropertyDescriptor(this, i);
						if (descriptor.get || descriptor.set ||
								typeof this[i] !== 'function') {
							delete this[i];
						} else {
							this[i] = nop;
						}
					}
				}
			};

			this.isDestroyed = function () {
				return me.isDestroyed;
			};

			this.isReady = function () {
				return me.ready;
			};
		};

		TransformNode = function (hook, options) {
			var key,
				input,
				initialValue,
				defaultValue,
				defaults;

			this.matrix = new Float32Array(16);
			this.cumulativeMatrix = new Float32Array(16);

			this.ready = false;
			this.width = 1;
			this.height = 1;

			this.seriously = seriously;

			this.transformRef = seriousTransforms[hook];
			this.hook = hook;
			this.id = nodeId;
			nodeId++;

			this.options = options;
			this.sources = null;
			this.targets = [];
			this.inputElements = {};
			this.inputs = {};
			this.methods = {};
			this.listeners = {};

			this.texture = null;
			this.frameBuffer = null;
			this.uniforms = null;

			this.dirty = true;
			this.transformDirty = true;
			this.renderDirty = false;
			this.isDestroyed = false;
			this.transformed = false;

			this.plugin = extend({}, this.transformRef);
			if (this.transformRef.definition) {
				extend(this.plugin, this.transformRef.definition.call(this, options));
			}

			// set up inputs and methods
			for (key in this.plugin.inputs) {
				if (this.plugin.inputs.hasOwnProperty(key)) {
					input = this.plugin.inputs[key];

					if (input.method && typeof input.method === 'function') {
						this.methods[key] = input.method;
					} else if (typeof input.set === 'function' && typeof input.get === 'function') {
						this.inputs[key] = input;
					}
				}
			}
			validateInputSpecs(this.plugin);

			// set default value for all inputs (no defaults for methods)
			defaults = defaultInputs[hook];
			for (key in this.plugin.inputs) {
				if (this.plugin.inputs.hasOwnProperty(key)) {
					input = this.plugin.inputs[key];

					if (typeof input.set === 'function' && typeof input.get === 'function' &&
							typeof input.method !== 'function') {

						initialValue = input.get.call(this);
						defaultValue = input.defaultValue === undefined ? initialValue : input.defaultValue;
						defaultValue = input.validate.call(this, defaultValue, input, initialValue);
						if (defaults && defaults[key] !== undefined) {
							defaultValue = input.validate.call(this, defaults[key], input, input.defaultValue, defaultValue);
							defaults[key] = defaultValue;
						}
						if (defaultValue !== initialValue) {
							input.set.call(this, defaultValue);
						}
					}
				}
			}

			nodes.push(this);
			nodesById[this.id] = this;

			this.pub = new Transform(this);

			transforms.push(this);

			allTransformsByHook[hook].push(this);
		};

		TransformNode.prototype = Object.create(Node.prototype);

		TransformNode.prototype.setDirty = function () {
			this.renderDirty = true;
			Node.prototype.setDirty.call(this);
		};

		TransformNode.prototype.setTransformDirty = function () {
			var i,
				target;
			this.transformDirty = true;
			this.dirty = true;
			this.renderDirty = true;
			for (i = 0; i < this.targets.length; i++) {
				target = this.targets[i];
				if (target.setTransformDirty) {
					target.setTransformDirty();
				} else {
					target.setDirty();
				}
			}
		};

		TransformNode.prototype.resize = function () {
			var i;

			Node.prototype.resize.call(this);

			if (this.plugin.resize) {
				this.plugin.resize.call(this);
			}

			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}

			this.setTransformDirty();
		};

		TransformNode.prototype.setSource = function (source) {
			var newSource;

			//todo: what if source is null/undefined/false

			newSource = findInputNode(source);

			if (newSource === this.source) {
				return;
			}

			if (traceSources(newSource, this)) {
				throw new Error('Attempt to make cyclical connection.');
			}

			if (this.source) {
				this.source.removeTarget(this);
			}
			this.source = newSource;
			newSource.addTarget(this);

			if (newSource && newSource.ready) {
				this.setReady();
			} else {
				this.setUnready();
			}
			this.resize();
		};

		TransformNode.prototype.addTarget = function (target) {
			var i;
			for (i = 0; i < this.targets.length; i++) {
				if (this.targets[i] === target) {
					return;
				}
			}

			this.targets.push(target);
		};

		TransformNode.prototype.removeTarget = function (target) {
			var i = this.targets && this.targets.indexOf(target);
			if (i >= 0) {
				this.targets.splice(i, 1);
			}

			if (this.targets && this.targets.length) {
				this.resize();
			}
		};

		TransformNode.prototype.setInput = function (name, value) {
			var input,
				defaultValue,
				previous;

			if (this.plugin.inputs.hasOwnProperty(name)) {
				input = this.plugin.inputs[name];

				if (defaultInputs[this.hook] && defaultInputs[this.hook][name] !== undefined) {
					defaultValue = defaultInputs[this.hook][name];
				} else {
					defaultValue = input.defaultValue;
				}

				previous = input.get.call(this);
				if (defaultValue === undefined) {
					defaultValue = previous;
				}
				value = input.validate.call(this, value, input, defaultValue, previous);

				if (input.set.call(this, value)) {
					this.setTransformDirty();
				}

				return input.get.call(this);
			}
		};

		TransformNode.prototype.alias = function (inputName, aliasName) {
			var me = this,
				input,
				def;

			if (reservedNames.indexOf(aliasName) >= 0) {
				throw new Error('\'' + aliasName + '\' is a reserved name and cannot be used as an alias.');
			}

			if (this.plugin.inputs.hasOwnProperty(inputName)) {
				if (!aliasName) {
					aliasName = inputName;
				}

				seriously.removeAlias(aliasName);

				input = this.inputs[inputName];
				if (input) {
					def = me.inputs[inputName];
					Object.defineProperty(seriously, aliasName, {
						configurable: true,
						enumerable: true,
						get: function () {
							return def.get.call(me);
						},
						set: function (val) {
							if (def.set.call(me, val)) {
								me.setTransformDirty();
							}
						}
					});
				} else {
					input = this.methods[inputName];
					if (input) {
						def = input;
						seriously[aliasName] = function () {
							if (def.apply(me, arguments)) {
								me.setTransformDirty();
							}
						};
					}
				}

				if (input) {
					aliases[aliasName] = {
						node: this,
						input: inputName
					};
				}
			}

			return this;
		};

		TransformNode.prototype.render = function (renderTransform) {
			if (!this.source) {
				if (this.transformDirty) {
					mat4.copy(this.cumulativeMatrix, this.matrix);
					this.transformDirty = false;
				}
				this.texture = null;
				this.dirty = false;

				return;
			}

			this.source.render();

			if (this.transformDirty) {
				if (this.transformed) {
					//use this.matrix
					if (this.source.cumulativeMatrix) {
						mat4.multiply(this.cumulativeMatrix, this.matrix, this.source.cumulativeMatrix);
					} else {
						mat4.copy(this.cumulativeMatrix, this.matrix);
					}
				} else {
					//copy source.cumulativeMatrix
					mat4.copy(this.cumulativeMatrix, this.source.cumulativeMatrix || identity);
				}

				this.transformDirty = false;
			}

			if (renderTransform && gl) {
				if (this.renderDirty) {
					if (!this.frameBuffer) {
						this.uniforms = {
							resolution: [this.width, this.height]
						};
						this.frameBuffer = new FrameBuffer(gl, this.width, this.height);
					}

					this.uniforms.source = this.source.texture;
					this.uniforms.transform = this.cumulativeMatrix || identity;
					draw(baseShader, rectangleModel, this.uniforms, this.frameBuffer.frameBuffer, this);

					this.renderDirty = false;
				}
				this.texture = this.frameBuffer.texture;
			} else if (this.source) {
				this.texture = this.source.texture;
			} else {
				this.texture = null;
			}

			this.dirty = false;

			return this.texture;
		};

		TransformNode.prototype.readPixels = function (x, y, width, height, dest) {
			var nodeGl = this.gl || gl;

			if (!gl) {
				//todo: is this the best approach?
				throw new Error('Cannot read pixels until a canvas is connected');
			}

			//todo: check on x, y, width, height
			this.render(true);

			if (dest === undefined) {
				dest = new Uint8Array(width * height * 4);
			} else if (!dest instanceof Uint8Array) {
				throw new Error('Incompatible array type');
			}

			nodeGl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer.frameBuffer);
			nodeGl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, dest);

			return dest;
		};

		TransformNode.prototype.destroy = function () {
			var i, key, item, hook = this.hook;

			//let effect destroy itself
			if (this.plugin.destroy && typeof this.plugin.destroy === 'function') {
				this.plugin.destroy.call(this);
			}
			delete this.effect;

			if (this.frameBuffer) {
				this.frameBuffer.destroy();
				delete this.frameBuffer;
				delete this.texture;
			}

			//stop watching any input elements
			for (i in this.inputElements) {
				if (this.inputElements.hasOwnProperty(i)) {
					item = this.inputElements[i];
					item.element.removeEventListener('change', item.listener, true);
					item.element.removeEventListener('input', item.listener, true);
				}
			}

			//sources
			if (this.source) {
				this.source.removeTarget(this);
			}

			//targets
			while (this.targets.length) {
				item = this.targets.pop();
				if (item && item.removeSource) {
					item.removeSource(this);
				}
			}

			for (key in this) {
				if (this.hasOwnProperty(key) && key !== 'id') {
					delete this[key];
				}
			}

			//remove any aliases
			for (key in aliases) {
				if (aliases.hasOwnProperty(key)) {
					item = aliases[key];
					if (item.node === this) {
						seriously.removeAlias(key);
					}
				}
			}

			//remove self from master list of effects
			i = transforms.indexOf(this);
			if (i >= 0) {
				transforms.splice(i, 1);
			}

			i = allTransformsByHook[hook].indexOf(this);
			if (i >= 0) {
				allTransformsByHook[hook].splice(i, 1);
			}

			Node.prototype.destroy.call(this);
		};

		TransformNode.prototype.setReady = Node.prototype.setReady;
		TransformNode.prototype.setUnready = Node.prototype.setUnready;
		TransformNode.prototype.on = Node.prototype.on;
		TransformNode.prototype.off = Node.prototype.off;
		TransformNode.prototype.emit = Node.prototype.emit;

		/*
		Initialize Seriously object based on options
		*/

		if (options instanceof HTMLCanvasElement) {
			options = {
				canvas: options
			};
		} else {
			options = options || {};
		}

		//if (options.canvas) { }

		/*
		priveleged methods
		*/
		this.effect = function (hook, options) {
			if (!seriousEffects[hook]) {
				throw new Error('Unknown effect: ' + hook);
			}

			var effectNode = new EffectNode(hook, options);
			return effectNode.pub;
		};

		this.source = function (hook, source, options) {
			var sourceNode = findInputNode(hook, source, options);
			return sourceNode.pub;
		};

		this.transform = function (hook, opts) {
			var transformNode;

			if (typeof hook !== 'string') {
				opts = hook;
				hook = false;
			}

			if (hook) {
				if (!seriousTransforms[hook]) {
					throw new Error('Unknown transform: ' + hook);
				}
			} else {
				hook = options && options.defaultTransform || '2d';
				if (!seriousTransforms[hook]) {
					throw new Error('No transform specified');
				}
			}

			transformNode = new TransformNode(hook, opts);
			return transformNode.pub;
		};

		this.target = function (hook, target, options) {
			var targetNode,
				element,
				i;

			if (hook && typeof hook === 'string' && !seriousTargets[hook]) {
				element = document.querySelector(hook);
			}

			if (typeof hook !== 'string' || !target && target !== 0 || element) {
				if (!options || typeof options !== 'object') {
					options = target;
				}
				target = element || hook;
				hook = null;
			}

			if (typeof target === 'string' && isNaN(target)) {
				target = document.querySelector(target);
			}

			for (i = 0; i < targets.length; i++) {
				targetNode = targets[i];
				if ((!hook || hook === targetNode.hook) &&
						(targetNode.target === target || targetNode.compare && targetNode.compare(target, options))) {

					return targetNode.pub;
				}
			}

			targetNode = new TargetNode(hook, target, options);

			return targetNode.pub;
		};

		this.aliases = function () {
			return Object.keys(aliases);
		};

		this.removeAlias = function (name) {
			if (aliases[name]) {
				delete this[name];
				delete aliases[name];
			}
		};

		this.defaults = function (hook, options) {
			var key;

			if (!hook) {
				if (hook === null) {
					for (key in defaultInputs) {
						if (defaultInputs.hasOwnProperty(key)) {
							delete defaultInputs[key];
						}
					}
				}
				return;
			}

			if (typeof hook === 'object') {
				for (key in hook) {
					if (hook.hasOwnProperty(key)) {
						this.defaults(key, hook[key]);
					}
				}

				return;
			}

			if (options === null) {
				delete defaultInputs[hook];
			} else if (typeof options === 'object') {
				defaultInputs[hook] = extend({}, options);
			}
		};

		this.go = function (pre, post) {
			var i;

			if (typeof pre === 'function' && preCallbacks.indexOf(pre) < 0) {
				preCallbacks.push(pre);
			}

			if (typeof post === 'function' && postCallbacks.indexOf(post) < 0) {
				postCallbacks.push(post);
			}

			auto = true;
			for (i = 0; i < targets.length; i++) {
				targets[i].go();
			}

			if (!rafId && (preCallbacks.length || postCallbacks.length)) {
				renderDaemon();
			}
		};

		this.stop = function () {
			preCallbacks.length = 0;
			postCallbacks.length = 0;
			cancelAnimFrame(rafId);
			rafId = 0;
		};

		this.render = function () {
			var i;
			for (i = 0; i < targets.length; i++) {
				targets[i].render(options);
			}
		};

		this.destroy = function () {
			var i,
				node,
				descriptor;

			while (nodes.length) {
				node = nodes.shift();
				node.destroy();
			}

			for (i in this) {
				if (this.hasOwnProperty(i) && i !== 'isDestroyed' && i !== 'id') {
					descriptor = Object.getOwnPropertyDescriptor(this, i);
					if (descriptor.get || descriptor.set ||
							typeof this[i] !== 'function') {
						delete this[i];
					} else {
						this[i] = nop;
					}
				}
			}

			seriously = null;

			//todo: do we really need to allocate new arrays here?
			sources = [];
			targets = [];
			effects = [];
			nodes = [];

			preCallbacks.length = 0;
			postCallbacks.length = 0;
			cancelAnimFrame(rafId);
			rafId = 0;

			isDestroyed = true;
		};

		this.isDestroyed = function () {
			return isDestroyed;
		};

		this.incompatible = function (hook) {
			var key,
				plugin,
				failure = false;

			failure = Seriously.incompatible(hook);

			if (failure) {
				return failure;
			}

			if (!hook) {
				for (key in allEffectsByHook) {
					if (allEffectsByHook.hasOwnProperty(key) && allEffectsByHook[key].length) {
						plugin = seriousEffects[key];
						if (plugin && typeof plugin.compatible === 'function' &&
								!plugin.compatible.call(this)) {
							return 'plugin-' + key;
						}
					}
				}

				for (key in allSourcesByHook) {
					if (allSourcesByHook.hasOwnProperty(key) && allSourcesByHook[key].length) {
						plugin = seriousSources[key];
						if (plugin && typeof plugin.compatible === 'function' &&
								!plugin.compatible.call(this)) {
							return 'source-' + key;
						}
					}
				}
			}

			return false;
		};

		/*
		Informational utility methods
		*/

		this.isNode = function (candidate) {
			var node;
			if (candidate) {
				node = nodesById[candidate.id];
				if (node && !node.isDestroyed) {
					return true;
				}
			}
			return false;
		};

		this.isSource = function (candidate) {
			return this.isNode(candidate) && candidate instanceof Source;
		};

		this.isEffect = function (candidate) {
			return this.isNode(candidate) && candidate instanceof Effect;
		};

		this.isTransform = function (candidate) {
			return this.isNode(candidate) && candidate instanceof Transform;
		};

		this.isTarget = function (candidate) {
			return this.isNode(candidate) && candidate instanceof Target;
		};

		Object.defineProperties(this, {
			id: {
				enumerable: true,
				configurable: true,
				get: function () {
					return id;
				}
			}
		});

		//todo: load, save, find

		this.defaults(options.defaults);
	}

	Seriously.incompatible = function (hook) {
		var canvas, gl, plugin;

		if (incompatibility === undefined) {
			canvas = document.createElement('canvas');
			if (!canvas || !canvas.getContext) {
				incompatibility = 'canvas';
			} else if (!window.WebGLRenderingContext) {
				incompatibility = 'webgl';
			} else {
				gl = getTestContext();
				if (!gl) {
					incompatibility = 'context';
				}
			}
		}

		if (incompatibility) {
			return incompatibility;
		}

		if (hook) {
			plugin = seriousEffects[hook];
			if (plugin && typeof plugin.compatible === 'function' &&
				!plugin.compatible(gl)) {

				return 'plugin-' + hook;
			}

			plugin = seriousSources[hook];
			if (plugin && typeof plugin.compatible === 'function' &&
				!plugin.compatible(gl)) {

				return 'source-' + hook;
			}
		}

		return false;
	};

	Seriously.plugin = function (hook, definition, meta) {
		var effect;

		if (seriousEffects[hook]) {
			Seriously.logger.warn('Effect [' + hook + '] already loaded');
			return;
		}

		if (meta === undefined && typeof definition === 'object') {
			meta = definition;
		}

		if (!meta) {
			return;
		}

		effect = extend({}, meta);

		if (typeof definition === 'function') {
			effect.definition = definition;
		}

		effect.reserved = reservedEffectProperties;

		if (effect.inputs) {
			validateInputSpecs(effect);
		}

		if (!effect.title) {
			effect.title = hook;
		}

		/*
		if (typeof effect.requires !== 'function') {
			effect.requires = false;
		}
		*/

		seriousEffects[hook] = effect;
		allEffectsByHook[hook] = [];

		return effect;
	};

	Seriously.removePlugin = function (hook) {
		var all, effect, plugin;

		if (!hook) {
			return this;
		}

		plugin = seriousEffects[hook];

		if (!plugin) {
			return this;
		}

		all = allEffectsByHook[hook];
		if (all) {
			while (all.length) {
				effect = all.shift();
				effect.destroy();
			}
			delete allEffectsByHook[hook];
		}

		delete seriousEffects[hook];

		return this;
	};

	Seriously.source = function (hook, definition, meta) {
		var source;

		if (seriousSources[hook]) {
			Seriously.logger.warn('Source [' + hook + '] already loaded');
			return;
		}

		if (meta === undefined && typeof definition === 'object') {
			meta = definition;
		}

		if (!meta && !definition) {
			return;
		}

		source = extend({}, meta);

		if (typeof definition === 'function') {
			source.definition = definition;
		}

		if (!source.title) {
			source.title = hook;
		}


		seriousSources[hook] = source;
		allSourcesByHook[hook] = [];

		return source;
	};

	Seriously.removeSource = function (hook) {
		var all, source, plugin;

		if (!hook) {
			return this;
		}

		plugin = seriousSources[hook];

		if (!plugin) {
			return this;
		}

		all = allSourcesByHook[hook];
		if (all) {
			while (all.length) {
				source = all.shift();
				source.destroy();
			}
			delete allSourcesByHook[hook];
		}

		delete seriousSources[hook];

		return this;
	};

	Seriously.transform = function (hook, definition, meta) {
		var transform;

		if (seriousTransforms[hook]) {
			Seriously.logger.warn('Transform [' + hook + '] already loaded');
			return;
		}

		if (meta === undefined && typeof definition === 'object') {
			meta = definition;
		}

		if (!meta && !definition) {
			return;
		}

		transform = extend({}, meta);

		if (typeof definition === 'function') {
			transform.definition = definition;
		}

		transform.reserved = reservedTransformProperties;

		//todo: validate method definitions
		if (transform.inputs) {
			validateInputSpecs(transform);
		}

		if (!transform.title) {
			transform.title = hook;
		}

		seriousTransforms[hook] = transform;
		allTransformsByHook[hook] = [];

		return transform;
	};

	Seriously.removeTransform = function (hook) {
		var all, transform, plugin;

		if (!hook) {
			return this;
		}

		plugin = seriousTransforms[hook];

		if (!plugin) {
			return this;
		}

		all = allTransformsByHook[hook];
		if (all) {
			while (all.length) {
				transform = all.shift();
				transform.destroy();
			}
			delete allTransformsByHook[hook];
		}

		delete seriousTransforms[hook];

		return this;
	};

	Seriously.target = function (hook, definition, meta) {
		var target;

		if (seriousTargets[hook]) {
			Seriously.logger.warn('Target [' + hook + '] already loaded');
			return;
		}

		if (meta === undefined && typeof definition === 'object') {
			meta = definition;
		}

		if (!meta && !definition) {
			return;
		}

		target = extend({}, meta);

		if (typeof definition === 'function') {
			target.definition = definition;
		}

		if (!target.title) {
			target.title = hook;
		}


		seriousTargets[hook] = target;
		allTargetsByHook[hook] = [];

		return target;
	};

	Seriously.removeTarget = function (hook) {
		var all, target, plugin;

		if (!hook) {
			return this;
		}

		plugin = seriousTargets[hook];

		if (!plugin) {
			return this;
		}

		all = allTargetsByHook[hook];
		if (all) {
			while (all.length) {
				target = all.shift();
				target.destroy();
			}
			delete allTargetsByHook[hook];
		}

		delete seriousTargets[hook];

		return this;
	};

	//todo: validators should not allocate new objects/arrays if input is valid
	Seriously.inputValidators = {
		color: function (value, input, defaultValue, oldValue) {
			var s, a, i, computed, bg;

			a = oldValue || [];

			if (typeof value === 'string') {
				//todo: support percentages, decimals
				s = (/^(rgb|hsl)a?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*(\d+(\.\d*)?)\s*)?\)/i).exec(value);
				if (s && s.length) {
					if (s.length < 3) {
						a[0] = a[1] = a[2] = a[3] = 0;
						return a;
					}

					a[3] = 1;
					for (i = 0; i < 3; i++) {
						a[i] = parseFloat(s[i+2]) / 255;
					}
					if (!isNaN(s[6])) {
						a[3] = parseFloat(s[6]);
					}
					if (s[1].toLowerCase() === 'hsl') {
						return hslToRgb(a[0], a[1], a[2], a[3], a);
					}
					return a;
				}

				s = (/^#(([0-9a-fA-F]{3,8}))/).exec(value);
				if (s && s.length) {
					s = s[1];
					if (s.length === 3) {
						a[0] = parseInt(s[0], 16) / 15;
						a[1] = parseInt(s[1], 16) / 15;
						a[2] = parseInt(s[2], 16) / 15;
						a[3] = 1;
					} else if (s.length === 4) {
						a[0] = parseInt(s[0], 16) / 15;
						a[1] = parseInt(s[1], 16) / 15;
						a[2] = parseInt(s[2], 16) / 15;
						a[3] = parseInt(s[3], 16) / 15;
					} else if (s.length === 6) {
						a[0] = parseInt(s.substr(0, 2), 16) / 255;
						a[1] = parseInt(s.substr(2, 2), 16) / 255;
						a[2] = parseInt(s.substr(4, 2), 16) / 255;
						a[3] = 1;
					} else if (s.length === 8) {
						a[0] = parseInt(s.substr(0, 2), 16) / 255;
						a[1] = parseInt(s.substr(2, 2), 16) / 255;
						a[2] = parseInt(s.substr(4, 2), 16) / 255;
						a[3] = parseInt(s.substr(6, 2), 16) / 255;
					} else {
						a[0] = a[1] = a[2] = a[3] = 0;
					}
					return a;
				}

				s = colorNames[value.toLowerCase()];
				if (s) {
					for (i = 0; i < 4; i++) {
						a[i] = s[i];
					}
					return a;
				}

				if (!colorElement) {
					colorElement = document.createElement('a');
				}
				colorElement.style.backgroundColor = '';
				colorElement.style.backgroundColor = value;
				computed = window.getComputedStyle(colorElement);
				bg = computed.getPropertyValue('background-color') ||
					computed.getPropertyValue('backgroundColor') ||
					colorElement.style.backgroundColor;
				if (bg && bg !== value) {
					return Seriously.inputValidators.color(bg, input, oldValue);
				}

				a[0] = a[1] = a[2] = a[3] = 0;
				return a;
			}

			if (isArrayLike(value)) {
				a = value;
				if (a.length < 3) {
					a[0] = a[1] = a[2] = a[3] = 0;
					return a;
				}
				for (i = 0; i < 3; i++) {
					if (isNaN(a[i])) {
						a[0] = a[1] = a[2] = a[3] = 0;
						return a;
					}
				}
				if (a.length < 4) {
					a.push(1);
				}
				return a;
			}

			if (typeof value === 'number') {
				a[0] = a[1] = a[2] = value;
				a[3] = 1;
				return a;
			}

			if (typeof value === 'object') {
				for (i = 0; i < 4; i++) {
					s = colorFields[i];
					if (value[s] === null || isNaN(value[s])) {
						a[i] = i === 3 ? 1 : 0;
					} else {
						a[i] = value[s];
					}
				}
				return a;
			}

			a[0] = a[1] = a[2] = a[3] = 0;
			return a;
		},
		number: function (value, input, defaultValue) {
			if (isNaN(value)) {
				return defaultValue || 0;
			}

			value = parseFloat(value);

			if (value < input.min) {
				return input.min;
			}

			if (value > input.max) {
				return input.max;
			}

			if (input.step) {
				return Math.round(value / input.step) * input.step;
			}

			return value;
		},
		'enum': function (value, input, defaultValue) {
			var options = input.options || [],
				i,
				opt;

			if (typeof value === 'string') {
				value = value.toLowerCase();
			} else if (typeof value === 'number') {
				value = value.toString();
			} else if (!value) {
				value = '';
			}

			if (options.hasOwnProperty(value)) {
				return value;
			}

			return defaultValue || '';
		},
		vector: function (value, input, defaultValue, oldValue) {
			var a, i, s, n = input.dimensions || 4;

			a = oldValue || [];
			if (isArrayLike(value)) {
				for (i = 0; i < n; i++) {
					a[i] = value[i] || 0;
				}
				return a;
			}

			if (typeof value === 'object') {
				for (i = 0; i < n; i++) {
					s = vectorFields[i];
					if (value[s] === undefined) {
						s = colorFields[i];
					}
					a[i] = value[s] || 0;
				}
				return a;
			}

			value = parseFloat(value) || 0;
			for (i = 0; i < n; i++) {
				a[i] = value;
			}

			return a;
		},
		'boolean': function (value) {
			if (!value) {
				return false;
			}

			if (value && value.toLowerCase && value.toLowerCase() === 'false') {
				return false;
			}

			return true;
		},
		'string': function (value) {
			if (typeof value === 'string') {
				return value;
			}

			if (value !== 0 && !value) {
				return '';
			}

			if (value.toString) {
				return value.toString();
			}

			return String(value);
		}
		//todo: date/time
	};

	Seriously.prototype.effects = Seriously.effects = function () {
		var name,
			effect,
			manifest,
			effects = {},
			input,
			i;

		for (name in seriousEffects) {
			if (seriousEffects.hasOwnProperty(name)) {
				effect = seriousEffects[name];
				manifest = {
					title: effect.title || name,
					description: effect.description || '',
					inputs: {}
				};

				for (i in effect.inputs) {
					if (effect.inputs.hasOwnProperty(i)) {
						input = effect.inputs[i];
						manifest.inputs[i] = {
							type: input.type,
							defaultValue: input.defaultValue,
							step: input.step,
							min: input.min,
							max: input.max,
							minCount: input.minCount,
							maxCount: input.maxCount,
							dimensions: input.dimensions,
							title: input.title || i,
							description: input.description || '',
							options: input.options || []
						};
					}
				}

				effects[name] = manifest;
			}
		}

		return effects;
	};

	if (window.Float32Array) {
		identity = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]);
	}

	//check for plugins loaded out of order
	if (window.Seriously) {
		if (typeof window.Seriously === 'object') {
			(function () {
				var i;
				for (i in window.Seriously) {
					if (window.Seriously.hasOwnProperty(i) &&
						i !== 'plugin' &&
						typeof window.Seriously[i] === 'object') {

						Seriously.plugin(i, window.Seriously[i]);
					}
				}
			}());
		}
	}

	/*

	*/
	Seriously.logger = {
		log: consoleMethod('log'),
		info: consoleMethod('info'),
		warn: consoleMethod('warn'),
		error: consoleMethod('error')
	};

	Seriously.util = {
		mat4: mat4,
		checkSource: checkSource,
		hslToRgb: hslToRgb,
		colors: colorNames,
		setTimeoutZero: setTimeoutZero,
		ShaderProgram: ShaderProgram,
		FrameBuffer: FrameBuffer,
		requestAnimationFrame: requestAnimationFrame,
		shader: {
			makeNoise: 'float makeNoise(float u, float v, float timer) {\n' +
						'	float x = u * v * mod(timer * 1000.0, 100.0);\n' +
						'	x = mod(x, 13.0) * mod(x, 127.0);\n' +
						'	float dx = mod(x, 0.01);\n' +
						'	return clamp(0.1 + dx * 100.0, 0.0, 1.0);\n' +
						'}\n',
			random: '#ifndef RANDOM\n' +
				'#define RANDOM\n' +
				'float random(vec2 n) {\n' +
				'	return 0.5 + 0.5 * fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453);\n' +
				'}\n' +
				'#endif\n'
		}
	};

	Seriously.source('video', function (video, options, force) {
		var me = this,
			//video,
			key,
			opts,

			canvas,
			ctx2d,

			destroyed = false,
			deferTexture = false,

			isSeeking = false,
			lastRenderTime = 0;

		function initializeVideo() {
			video.removeEventListener('loadedmetadata', initializeVideo, true);

			if (destroyed) {
				return;
			}

			if (video.videoWidth) {
				if (me.width !== video.videoWidth || me.height !== video.videoHeight) {
					me.width = video.videoWidth;
					me.height = video.videoHeight;
					me.resize();
				}

				if (deferTexture) {
					me.setReady();
				}
			} else {
				//Workaround for Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=926753
				deferTexture = true;
				setTimeout(initializeVideo, 50);
			}
		}

		function seeking() {
			// IE doesn't report .seeking properly so make our own
			isSeeking = true;
		}

		function seeked() {
			isSeeking = false;
			me.setDirty();
		}

		if (video instanceof window.HTMLVideoElement) {
			if (video.readyState) {
				initializeVideo();
			} else {
				deferTexture = true;
				video.addEventListener('loadedmetadata', initializeVideo, true);
			}

			video.addEventListener('seeking', seeking, false);
			video.addEventListener('seeked', seeked, false);

			return {
				deferTexture: deferTexture,
				source: video,
				render: function renderVideo(gl) {
					var source,
						error;

					lastRenderTime = video.currentTime;

					if (!video.videoHeight || !video.videoWidth) {
						return false;
					}

					if (noVideoTextureSupport) {
						if (!ctx2d) {
							ctx2d = document.createElement('canvas').getContext('2d');
							canvas = ctx2d.canvas;
							canvas.width = me.width;
							canvas.height = me.height;
						}
						source = canvas;
						ctx2d.drawImage(video, 0, 0, me.width, me.height);
					} else {
						source = video;
					}

					gl.bindTexture(gl.TEXTURE_2D, me.texture);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, me.flip);
					gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
					try {
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

						//workaround for lack of video texture support in IE
						if (noVideoTextureSupport === undefined) {
							error = gl.getError();
							if (error === gl.INVALID_VALUE) {
								noVideoTextureSupport = true;
								return renderVideo(gl);
							}
							noVideoTextureSupport = false;
						}
						return true;
					} catch (securityError) {
						if (securityError.code === window.DOMException.SECURITY_ERR) {
							me.allowRefresh = false;
							Seriously.logger.error('Unable to access cross-domain image');
						} else {
							Seriously.logger.error('Error rendering video source', securityError);
						}
					}
					return false;
				},
				checkDirty: function () {
					return !isSeeking && video.currentTime !== lastRenderTime;
				},
				compare: function (source) {
					return me.source === source;
				},
				destroy: function () {
					destroyed = true;
					video.removeEventListener('seeking', seeking, false);
					video.removeEventListener('seeked', seeked, false);
					video.removeEventListener('loadedmetadata', initializeVideo, true);
				}
			};
		}
	}, {
		title: 'Video'
	});

	/*
	Default transform - 2D
	Affine transforms
	- translate
	- rotate (degrees)
	- scale
	- skew

	todo: move this to a different file when we have a build tool
	*/
	Seriously.transform('2d', function (options) {
		var me = this,
			degrees = !(options && options.radians),

			centerX = 0,
			centerY = 0,
			scaleX = 1,
			scaleY = 1,
			translateX = 0,
			translateY = 0,
			rotation = 0,
			skewX = 0,
			skewY = 0;

		//todo: skew order
		//todo: invert?

		function recompute() {
			var matrix = me.matrix,
				angle,
				s, c,
				m00,
				m01,
				m02,
				m03,
				m10,
				m11,
				m12,
				m13;

			function translate(x, y) {
				matrix[12] = matrix[0] * x + matrix[4] * y + matrix[12];
				matrix[13] = matrix[1] * x + matrix[5] * y + matrix[13];
				matrix[14] = matrix[2] * x + matrix[6] * y + matrix[14];
				matrix[15] = matrix[3] * x + matrix[7] * y + matrix[15];
			}

			if (!translateX &&
					!translateY &&
					!rotation &&
					!skewX &&
					!skewY &&
					scaleX === 1 &&
					scaleY === 1
					) {
				me.transformed = false;
				return;
			}

			//calculate transformation matrix
			mat4.identity(matrix);

			translate(translateX + centerX, translateY + centerY);

			//skew
			if (skewX) {
				matrix[4] = skewX / me.width;
			}
			if (skewY) {
				matrix[1] = skewY / me.height;
			}

			if (rotation) {
				m00 = matrix[0];
				m01 = matrix[1];
				m02 = matrix[2];
				m03 = matrix[3];
				m10 = matrix[4];
				m11 = matrix[5];
				m12 = matrix[6];
				m13 = matrix[7];

				//rotate
				angle = -(degrees ? rotation * Math.PI / 180 : rotation);
				//...rotate
				s = Math.sin(angle);
				c = Math.cos(angle);
				matrix[0] = m00 * c + m10 * s;
				matrix[1] = m01 * c + m11 * s;
				matrix[2] = m02 * c + m12 * s;
				matrix[3] = m03 * c + m13 * s;
				matrix[4] = m10 * c - m00 * s;
				matrix[5] = m11 * c - m01 * s;
				matrix[6] = m12 * c - m02 * s;
				matrix[7] = m13 * c - m03 * s;
			}

			//scale
			if (scaleX !== 1) {
				matrix[0] *= scaleX;
				matrix[1] *= scaleX;
				matrix[2] *= scaleX;
				matrix[3] *= scaleX;
			}
			if (scaleY !== 1) {
				matrix[4] *= scaleY;
				matrix[5] *= scaleY;
				matrix[6] *= scaleY;
				matrix[7] *= scaleY;
			}

			translate(-centerX, -centerY);

			me.transformed = true;
		}

		return {
			inputs: {
				reset: {
					method: function () {
						centerX = 0;
						centerY = 0;
						scaleX = 1;
						scaleY = 1;
						translateX = 0;
						translateY = 0;
						rotation = 0;
						skewX = 0;
						skewY = 0;

						if (me.transformed) {
							me.transformed = false;
							return true;
						}

						return false;
					}
				},
				translate: {
					method: function (x, y) {
						if (isNaN(x)) {
							x = translateX;
						}

						if (isNaN(y)) {
							y = translateY;
						}

						if (x === translateX && y === translateY) {
							return false;
						}

						translateX = x;
						translateY = y;

						recompute();
						return true;
					},
					type: [
						'number',
						'number'
					]
				},
				translateX: {
					get: function () {
						return translateX;
					},
					set: function (x) {
						if (x === translateX) {
							return false;
						}

						translateX = x;

						recompute();
						return true;
					},
					type: 'number'
				},
				translateY: {
					get: function () {
						return translateY;
					},
					set: function (y) {
						if (y === translateY) {
							return false;
						}

						translateY = y;

						recompute();
						return true;
					},
					type: 'number'
				},
				rotation: {
					get: function () {
						return rotation;
					},
					set: function (angle) {
						if (angle === rotation) {
							return false;
						}

						//todo: fmod 360deg or Math.PI * 2 radians
						rotation = parseFloat(angle);

						recompute();
						return true;
					},
					type: 'number'
				},
				center: {
					method: function (x, y) {
						if (isNaN(x)) {
							x = centerX;
						}

						if (isNaN(y)) {
							y = centerY;
						}

						if (x === centerX && y === centerY) {
							return false;
						}

						centerX = x;
						centerY = y;

						recompute();
						return true;
					},
					type: [
						'number',
						'number'
					]
				},
				centerX: {
					get: function () {
						return centerX;
					},
					set: function (x) {
						if (x === centerX) {
							return false;
						}

						centerX = x;

						recompute();
						return true;
					},
					type: 'number'
				},
				centerY: {
					get: function () {
						return centerY;
					},
					set: function (y) {
						if (y === centerY) {
							return false;
						}

						centerY = y;

						recompute();
						return true;
					},
					type: 'number'
				},
				skew: {
					method: function (x, y) {
						if (isNaN(x)) {
							x = skewX;
						}

						if (isNaN(y)) {
							y = skewY;
						}

						if (x === skewX && y === skewY) {
							return false;
						}

						skewX = x;
						skewY = y;

						recompute();
						return true;
					},
					type: [
						'number',
						'number'
					]
				},
				skewX: {
					get: function () {
						return skewX;
					},
					set: function (x) {
						if (x === skewX) {
							return false;
						}

						skewX = x;

						recompute();
						return true;
					},
					type: 'number'
				},
				skewY: {
					get: function () {
						return skewY;
					},
					set: function (y) {
						if (y === skewY) {
							return false;
						}

						skewY = y;

						recompute();
						return true;
					},
					type: 'number'
				},
				scale: {
					method: function (x, y) {
						var newX, newY;

						if (isNaN(x)) {
							newX = scaleX;
						} else {
							newX = x;
						}

						/*
						if only one value is specified, set both x and y to the same scale
						*/
						if (isNaN(y)) {
							if (isNaN(x)) {
								return false;
							}

							newY = newX;
						} else {
							newY = y;
						}

						if (newX === scaleX && newY === scaleY) {
							return false;
						}

						scaleX = newX;
						scaleY = newY;

						recompute();
						return true;
					},
					type: [
						'number',
						'number'
					]
				},
				scaleX: {
					get: function () {
						return scaleX;
					},
					set: function (x) {
						if (x === scaleX) {
							return false;
						}

						scaleX = x;

						recompute();
						return true;
					},
					type: 'number'
				},
				scaleY: {
					get: function () {
						return scaleY;
					},
					set: function (y) {
						if (y === scaleY) {
							return false;
						}

						scaleY = y;

						recompute();
						return true;
					},
					type: 'number'
				}
			}
		};
	}, {
		title: '2D Transform',
		description: 'Translate, Rotate, Scale, Skew'
	});

	/*
	todo: move this to a different file when we have a build tool
	*/
	Seriously.transform('flip', function () {
		var me = this,
			horizontal = true;

		function recompute() {
			var matrix = me.matrix;

			//calculate transformation matrix
			//mat4.identity(matrix);

			//scale
			if (horizontal) {
				matrix[0] = -1;
				matrix[5] = 1;
			} else {
				matrix[0] = 1;
				matrix[5] = -1;
			}
		}

		mat4.identity(me.matrix);
		recompute();

		me.transformDirty = true;

		me.transformed = true;

		return {
			inputs: {
				direction: {
					get: function () {
						return horizontal ? 'horizontal' : 'vertical';
					},
					set: function (d) {
						var horiz;
						if (d === 'vertical') {
							horiz = false;
						} else {
							horiz = true;
						}

						if (horiz === horizontal) {
							return false;
						}

						horizontal = horiz;
						recompute();
						return true;
					},
					type: 'string'
				}
			}
		};
	}, {
		title: 'Flip',
		description: 'Flip Horizontal/Vertical'
	});

	/*
	Reformat
	todo: move this to a different file when we have a build tool
	*/
	Seriously.transform('reformat', function () {
		var me = this,
			forceWidth,
			forceHeight,
			mode = 'contain';

		function recompute() {
			var matrix = me.matrix,
				width = forceWidth || me.width,
				height = forceHeight || me.height,
				scaleX,
				scaleY,
				source = me.source,
				sourceWidth = source && source.width || 1,
				sourceHeight = source && source.height || 1,
				aspectIn,
				aspectOut;

			if (mode === 'distort' || width === sourceWidth && height === sourceHeight) {
				me.transformed = false;
				return;
			}

			aspectIn = sourceWidth / sourceHeight;

			aspectOut = width / height;

			if (mode === 'none') {
				scaleX = sourceWidth / width;
				scaleY = sourceHeight / height;
			} else if (mode === 'width' || mode === 'contain' && aspectOut <= aspectIn) {
				scaleX = 1;
				scaleY = aspectOut / aspectIn;
			} else if (mode === 'height' || mode === 'contain' && aspectOut > aspectIn) {
				scaleX = aspectIn / aspectOut;
				scaleY = 1;
			} else {
				//mode === 'cover'
				if (aspectOut > aspectIn) {
					scaleX = 1;
					scaleY = aspectOut / aspectIn;
				} else {
					scaleX = aspectIn / aspectOut;
					scaleY = 1;
				}
			}

			if (scaleX === 1 && scaleY === 1) {
				me.transformed = false;
				return;
			}

			//calculate transformation matrix
			mat4.identity(matrix);

			//scale
			if (scaleX !== 1) {
				matrix[0] *= scaleX;
				matrix[1] *= scaleX;
				matrix[2] *= scaleX;
				matrix[3] *= scaleX;
			}
			if (scaleY !== 1) {
				matrix[4] *= scaleY;
				matrix[5] *= scaleY;
				matrix[6] *= scaleY;
				matrix[7] *= scaleY;
			}
			me.transformed = true;
		}

		function getWidth() {
			return forceWidth || me.source && me.source.width || 1;
		}

		function getHeight() {
			return forceHeight || me.source && me.source.height || 1;
		}

		this.resize = function () {
			var width = getWidth(),
				height = getHeight(),
				i;

			if (this.width !== width || this.height !== height) {
				this.width = width;
				this.height = height;

				if (this.uniforms && this.uniforms.resolution) {
					this.uniforms.resolution[0] = width;
					this.uniforms.resolution[1] = height;
				}

				if (this.frameBuffer && this.frameBuffer.resize) {
					this.frameBuffer.resize(width, height);
				}

				for (i = 0; i < this.targets.length; i++) {
					this.targets[i].resize();
				}
			}

			this.setTransformDirty();

			recompute();
		};

		return {
			inputs: {
				width: {
					get: getWidth,
					set: function (x) {
						x = Math.floor(x);
						if (x === forceWidth) {
							return false;
						}

						forceWidth = x;

						this.resize();

						//don't need to run setTransformDirty again
						return false;
					},
					type: 'number'
				},
				height: {
					get: getHeight,
					set: function (y) {
						y = Math.floor(y);
						if (y === forceHeight) {
							return false;
						}

						forceHeight = y;

						this.resize();

						//don't need to run setTransformDirty again
						return false;
					},
					type: 'number'
				},
				mode: {
					get: function () {
						return mode;
					},
					set: function (m) {
						if (m === mode) {
							return false;
						}

						mode = m;

						recompute();
						return true;
					},
					type: 'enum',
					options: [
						'cover',
						'contain',
						'distort',
						'width',
						'height',
						'none'
					]
				}
			}
		};
	}, {
		title: 'Reformat',
		description: 'Change output dimensions'
	});

	/*
	todo: additional transform node types
	- perspective
	- matrix
	- crop? - maybe not - probably would just scale.
	*/

	baseVertexShader = [
		'precision mediump float;',

		'attribute vec4 position;',
		'attribute vec2 texCoord;',

		'uniform vec2 resolution;',
		'uniform mat4 transform;',

		'varying vec2 vTexCoord;',

		'void main(void) {',
		// first convert to screen space
		'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
		'	screenPosition = transform * screenPosition;',

		// convert back to OpenGL coords
		'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
		'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
		'	gl_Position.w = screenPosition.w;',
		'	vTexCoord = texCoord;',
		'}\n'
	].join('\n');

	baseFragmentShader = [
		'precision mediump float;',

		'varying vec2 vTexCoord;',

		'uniform sampler2D source;',

		'void main(void) {',
		/*
		'	if (any(lessThan(vTexCoord, vec2(0.0))) || any(greaterThanEqual(vTexCoord, vec2(1.0)))) {',
		'		gl_FragColor = vec4(0.0);',
		'	} else {',
		*/
		'		gl_FragColor = texture2D(source, vTexCoord);',
		//'	}',
		'}'
	].join('\n');

	/*
	 * simplex noise shaders
	 * https://github.com/ashima/webgl-noise
	 * Copyright (C) 2011 by Ashima Arts (Simplex noise)
	 * Copyright (C) 2011 by Stefan Gustavson (Classic noise)
	 */

	Seriously.util.shader.noiseHelpers = '#ifndef NOISE_HELPERS\n' +
		'#define NOISE_HELPERS\n' +
		'vec2 mod289(vec2 x) {\n' +
		'	return x - floor(x * (1.0 / 289.0)) * 289.0;\n' +
		'}\n' +
		'vec3 mod289(vec3 x) {\n' +
		'	return x - floor(x * (1.0 / 289.0)) * 289.0;\n' +
		'}\n' +
		'vec4 mod289(vec4 x) {\n' +
		'	return x - floor(x * (1.0 / 289.0)) * 289.0;\n' +
		'}\n' +
		'vec3 permute(vec3 x) {\n' +
		'	return mod289(((x*34.0)+1.0)*x);\n' +
		'}\n' +
		'vec4 permute(vec4 x) {\n' +
		'	return mod289(((x*34.0)+1.0)*x);\n' +
		'}\n' +
		'vec4 taylorInvSqrt(vec4 r) {\n' +
		'	return 1.79284291400159 - 0.85373472095314 * r;\n' +
		'}\n' +
		'float taylorInvSqrt(float r) {\n' +
		'	return 1.79284291400159 - 0.85373472095314 * r;\n' +
		'}\n' +
		'#endif\n';

	Seriously.util.shader.snoise2d = '#ifndef NOISE2D\n' +
		'#define NOISE2D\n' +
		'float snoise(vec2 v) {\n' +
		'	const vec4 C = vec4(0.211324865405187, // (3.0-sqrt(3.0))/6.0\n' +
		'		0.366025403784439, // 0.5*(sqrt(3.0)-1.0)\n' +
		'		-0.577350269189626, // -1.0 + 2.0 * C.x\n' +
		'		0.024390243902439); // 1.0 / 41.0\n' +
		'	vec2 i = floor(v + dot(v, C.yy));\n' +
		'	vec2 x0 = v - i + dot(i, C.xx);\n' +
		'	vec2 i1;\n' +
		'	//i1.x = step(x0.y, x0.x); // x0.x > x0.y ? 1.0 : 0.0\n' +
		'	//i1.y = 1.0 - i1.x;\n' +
		'	i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n' +
		'	// x0 = x0 - 0.0 + 0.0 * C.xx ;\n' +
		'	// x1 = x0 - i1 + 1.0 * C.xx ;\n' +
		'	// x2 = x0 - 1.0 + 2.0 * C.xx ;\n' +
		'	vec4 x12 = x0.xyxy + C.xxzz;\n' +
		'	x12.xy -= i1;\n' +
		'	i = mod289(i); // Avoid truncation effects in permutation\n' +
		'	vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));\n' +
		'	vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);\n' +
		'	m = m*m ;\n' +
		'	m = m*m ;\n' +
		'	vec3 x = 2.0 * fract(p * C.www) - 1.0;\n' +
		'	vec3 h = abs(x) - 0.5;\n' +
		'	vec3 ox = floor(x + 0.5);\n' +
		'	vec3 a0 = x - ox;\n' +
		'	m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);\n' +
		'	vec3 g;\n' +
		'	g.x = a0.x * x0.x + h.x * x0.y;\n' +
		'	g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n' +
		'	return 130.0 * dot(m, g);\n' +
		'}\n' +
		'#endif\n';

	Seriously.util.shader.snoise3d = '#ifndef NOISE3D\n' +
		'#define NOISE3D\n' +
		'float snoise(vec3 v) {\n' +
		'	const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;\n' +
		'	const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);\n' +

		// First corner
		'	vec3 i = floor(v + dot(v, C.yyy));\n' +
		'	vec3 x0 = v - i + dot(i, C.xxx) ;\n' +

		// Other corners
		'	vec3 g = step(x0.yzx, x0.xyz);\n' +
		'	vec3 l = 1.0 - g;\n' +
		'	vec3 i1 = min(g.xyz, l.zxy);\n' +
		'	vec3 i2 = max(g.xyz, l.zxy);\n' +

		'	// x0 = x0 - 0.0 + 0.0 * C.xxx;\n' +
		'	// x1 = x0 - i1 + 1.0 * C.xxx;\n' +
		'	// x2 = x0 - i2 + 2.0 * C.xxx;\n' +
		'	// x3 = x0 - 1.0 + 3.0 * C.xxx;\n' +
		'	vec3 x1 = x0 - i1 + C.xxx;\n' +
		'	vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n' +
		'	vec3 x3 = x0 - D.yyy; // -1.0+3.0*C.x = -0.5 = -D.y\n' +

		// Permutations
		'	i = mod289(i);\n' +
		'	vec4 p = permute(permute(permute(\n' +
		'						i.z + vec4(0.0, i1.z, i2.z, 1.0))\n' +
		'						+ i.y + vec4(0.0, i1.y, i2.y, 1.0))\n' +
		'						+ i.x + vec4(0.0, i1.x, i2.x, 1.0));\n' +

		// Gradients: 7x7 points over a square, mapped onto an octahedron.
		// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
		'	float n_ = 0.142857142857; // 1.0/7.0\n' +
		'	vec3 ns = n_ * D.wyz - D.xzx;\n' +

		'	vec4 j = p - 49.0 * floor(p * ns.z * ns.z); // mod(p, 7 * 7)\n' +

		'	vec4 x_ = floor(j * ns.z);\n' +
		'	vec4 y_ = floor(j - 7.0 * x_); // mod(j, N)\n' +

		'	vec4 x = x_ * ns.x + ns.yyyy;\n' +
		'	vec4 y = y_ * ns.x + ns.yyyy;\n' +
		'	vec4 h = 1.0 - abs(x) - abs(y);\n' +

		'	vec4 b0 = vec4(x.xy, y.xy);\n' +
		'	vec4 b1 = vec4(x.zw, y.zw);\n' +

		'	//vec4 s0 = vec4(lessThan(b0, 0.0)) * 2.0 - 1.0;\n' +
		'	//vec4 s1 = vec4(lessThan(b1, 0.0)) * 2.0 - 1.0;\n' +
		'	vec4 s0 = floor(b0) * 2.0 + 1.0;\n' +
		'	vec4 s1 = floor(b1) * 2.0 + 1.0;\n' +
		'	vec4 sh = -step(h, vec4(0.0));\n' +

		'	vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy ;\n' +
		'	vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww ;\n' +

		'	vec3 p0 = vec3(a0.xy, h.x);\n' +
		'	vec3 p1 = vec3(a0.zw, h.y);\n' +
		'	vec3 p2 = vec3(a1.xy, h.z);\n' +
		'	vec3 p3 = vec3(a1.zw, h.w);\n' +

		//Normalise gradients
		'	vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));\n' +
		'	p0 *= norm.x;\n' +
		'	p1 *= norm.y;\n' +
		'	p2 *= norm.z;\n' +
		'	p3 *= norm.w;\n' +

		// Mix final noise value
		'	vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);\n' +
		'	m = m * m;\n' +
		'	return 42.0 * dot(m*m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));\n' +
		'}\n' +
		'#endif\n';

	Seriously.util.shader.snoise4d = '#ifndef NOISE4D\n' +
		'#define NOISE4D\n' +
		'vec4 grad4(float j, vec4 ip)\n' +
		'	{\n' +
		'	const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);\n' +
		'	vec4 p, s;\n' +
		'\n' +
		'	p.xyz = floor(fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;\n' +
		'	p.w = 1.5 - dot(abs(p.xyz), ones.xyz);\n' +
		'	s = vec4(lessThan(p, vec4(0.0)));\n' +
		'	p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;\n' +
		'\n' +
		'	return p;\n' +
		'	}\n' +
		'\n' +
		// (sqrt(5) - 1)/4 = F4, used once below\n
		'#define F4 0.309016994374947451\n' +
		'\n' +
		'float snoise(vec4 v)\n' +
		'	{\n' +
		'	const vec4 C = vec4(0.138196601125011, // (5 - sqrt(5))/20 G4\n' +
		'						0.276393202250021, // 2 * G4\n' +
		'						0.414589803375032, // 3 * G4\n' +
		'						-0.447213595499958); // -1 + 4 * G4\n' +
		'\n' +
		// First corner
		'	vec4 i = floor(v + dot(v, vec4(F4)));\n' +
		'	vec4 x0 = v - i + dot(i, C.xxxx);\n' +
		'\n' +
		// Other corners
		'\n' +
		// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
		'	vec4 i0;\n' +
		'	vec3 isX = step(x0.yzw, x0.xxx);\n' +
		'	vec3 isYZ = step(x0.zww, x0.yyz);\n' +
		// i0.x = dot(isX, vec3(1.0));
		'	i0.x = isX.x + isX.y + isX.z;\n' +
		'	i0.yzw = 1.0 - isX;\n' +
		// i0.y += dot(isYZ.xy, vec2(1.0));
		'	i0.y += isYZ.x + isYZ.y;\n' +
		'	i0.zw += 1.0 - isYZ.xy;\n' +
		'	i0.z += isYZ.z;\n' +
		'	i0.w += 1.0 - isYZ.z;\n' +
		'\n' +
			// i0 now contains the unique values 0, 1, 2, 3 in each channel
		'	vec4 i3 = clamp(i0, 0.0, 1.0);\n' +
		'	vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);\n' +
		'	vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);\n' +
		'\n' +
		'	vec4 x1 = x0 - i1 + C.xxxx;\n' +
		'	vec4 x2 = x0 - i2 + C.yyyy;\n' +
		'	vec4 x3 = x0 - i3 + C.zzzz;\n' +
		'	vec4 x4 = x0 + C.wwww;\n' +
		'\n' +
		// Permutations
		'	i = mod289(i);\n' +
		'	float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);\n' +
		'	vec4 j1 = permute(permute(permute(permute (\n' +
		'					i.w + vec4(i1.w, i2.w, i3.w, 1.0))\n' +
		'					+ i.z + vec4(i1.z, i2.z, i3.z, 1.0))\n' +
		'					+ i.y + vec4(i1.y, i2.y, i3.y, 1.0))\n' +
		'					+ i.x + vec4(i1.x, i2.x, i3.x, 1.0));\n' +
		'\n' +
		// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
		// 7*7*6 = 294, which is close to the ring size 17*17 = 289.
		'	vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;\n' +
		'\n' +
		'	vec4 p0 = grad4(j0, ip);\n' +
		'	vec4 p1 = grad4(j1.x, ip);\n' +
		'	vec4 p2 = grad4(j1.y, ip);\n' +
		'	vec4 p3 = grad4(j1.z, ip);\n' +
		'	vec4 p4 = grad4(j1.w, ip);\n' +
		'\n' +
		// Normalise gradients
		'	vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));\n' +
		'	p0 *= norm.x;\n' +
		'	p1 *= norm.y;\n' +
		'	p2 *= norm.z;\n' +
		'	p3 *= norm.w;\n' +
		'	p4 *= taylorInvSqrt(dot(p4, p4));\n' +
		'\n' +
		// Mix contributions from the five corners
		'	vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);\n' +
		'	vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);\n' +
		'	m0 = m0 * m0;\n' +
		'	m1 = m1 * m1;\n' +
		'	return 49.0 * (dot(m0*m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)))\n' +
		'							+ dot(m1*m1, vec2(dot(p3, x3), dot(p4, x4)))) ;\n' +
		'}\n' +
		'#endif\n';

	return Seriously;
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.source('array', function (source, options, force) {
		var width,
			height,
			typedArray;

		if (options && (Array.isArray(source) ||
				(source && source.BYTES_PER_ELEMENT && 'length' in source))) {

			width = options.width;
			height = options.height;

			if (!width || !height) {
				if (force) {
					throw 'Height and width must be provided with an Array';
				}
				return;
			}

			if (width * height * 4 !== source.length) {
				if (force) {
					throw 'Array length must be height x width x 4.';
				}
				return;
			}

			this.width = width;
			this.height = height;

			//use opposite default for flip
			if (options.flip === undefined) {
				this.flip = false;
			}

			if (!(source instanceof Uint8Array)) {
				typedArray = new Uint8Array(source.length);
			}

			return {
				render: function (gl) {
					var i;
					if (this.dirty) {
						//pixel array can be updated, but we need to load from the typed array
						//todo: see if there's a faster copy method
						if (typedArray) {
							for (i = 0; i < typedArray.length; i++) {
								typedArray[i] = source[i];
							}
						}

						gl.bindTexture(gl.TEXTURE_2D, this.texture);
						gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flip);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, typedArray || source);

						this.lastRenderTime = Date.now() / 1000;

						return true;
					}
				}
			};
		}
	}, {
		title: 'Array',
		description: 'Array or Uint8Array'
	});
}));
/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia,

	// detect browser-prefixed window.URL
	URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

	Seriously.source('camera', function (source, options, force) {
		var me = this,
			video,
			key,
			opts,
			destroyed = false,
			stream,

			lastRenderTime = 0;

		function cleanUp() {
			if (video) {
				video.pause();
				video.src = '';
				video.load();
			}

			if (stream && stream.stop) {
				stream.stop();
			}
			stream = null;
		}

		function initialize() {
			if (destroyed) {
				return;
			}

			if (video.videoWidth) {
				me.width = video.videoWidth;
				me.height = video.videoHeight;
				me.setReady();
			} else {
				//Workaround for Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=926753
				setTimeout(initialize, 50);
			}
		}

		//todo: support options for video resolution, etc.

		if (force) {
			if (!getUserMedia) {
				throw 'Camera source type unavailable. Browser does not support getUserMedia';
			}

			opts = {};
			if (source && typeof source === 'object') {
				//copy over constraints
				for (key in source) {
					if (source.hasOwnProperty(key)) {
						opts[key] = source[key];
					}
				}
			}
			if (!opts.video) {
				opts.video = true;
			}

			video = document.createElement('video');

			getUserMedia.call(navigator, opts, function (s) {
				stream = s;

				if (destroyed) {
					cleanUp();
					return;
				}

				// check for firefox
				if (video.mozCaptureStream) {
					video.mozSrcObject = stream;
				} else {
					video.src = (URL && URL.createObjectURL(stream)) || stream;
				}

				if (video.readyState) {
					initialize();
				} else {
					video.addEventListener('loadedmetadata', initialize, false);
				}

				video.play();
			}, function (evt) {
				//todo: emit error event
				console.log('Unable to access video camera', evt);
			});

			return {
				deferTexture: true,
				source: video,
				render: function (gl) {
					lastRenderTime = video.currentTime;

					gl.bindTexture(gl.TEXTURE_2D, this.texture);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flip);
					gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
					try {
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
						return true;
					} catch (error) {
						Seriously.logger.error('Error rendering camera video source', error);
					}

					return false;
				},
				checkDirty: function () {
					return video.currentTime !== lastRenderTime;
				},
				destroy: function () {
					destroyed = true;
					cleanUp();
				}
			};
		}
	}, {
		compatible: function () {
			return !!getUserMedia;
		},
		title: 'Camera'
	});
}));
/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*
	Load depth map from JPG file
	https://developers.google.com/depthmap-metadata/

	Depth maps can be generated by Android Camera app
	http://googleresearch.blogspot.sg/2014/04/lens-blur-in-new-google-camera-app.html

	Method for loading depth image from jpg borrowed from Jaume Sanchez Elias (@thespite)
	http://www.clicktorelease.com/tools/lens-blur-depth-extractor/
	*/

	function ab2str(buf) {
		return String.fromCharCode.apply(null, new Uint8Array(buf));
	}

	function memcpy(dst, dstOffset, src, srcOffset, length) {
		var dstU8 = new Uint8Array(dst, dstOffset, length),
			srcU8 = new Uint8Array(src, srcOffset, length);

		dstU8.set(srcU8);
	}

	var depthRegex = /GDepth:Data="([\S]*)"/;

	Seriously.source('depth', function (source, options, force) {
		var that = this,
			element,
			url,
			xhr,
			depthImage,

			destroyed = false;

		/*
		todo: what happens if src of source image changes? can we adapt?
		*/

		function initialize() {
			if (!destroyed) {
				that.width = depthImage.naturalWidth;
				that.height = depthImage.naturalHeight;
				that.setReady();
			}
		}

		function parseArrayBuffer(arrayBuffer) {
			var byteArray = new Uint8Array(arrayBuffer), // this.response == uInt8Array.buffer
				boundaries = [],

				str = '',
				i, j,
				tmp,
				tmpStr,
				length,
				offset,
				match;

			if (byteArray[0] == 0xff && byteArray[1] == 0xd8) {
				//look for boundaries
				for (i = 0; i < byteArray.byteLength; i++) {
					if (byteArray[i] === 0xff && byteArray[i + 1] === 0xe1) {
						boundaries.push(i);
						i++;
					}
				}
				boundaries.push(byteArray.byteLength);

				for (j = 0; j < boundaries.length - 1; j++) {
					if (byteArray[boundaries[j]] === 0xff && byteArray[boundaries[j] + 1] === 0xe1) {
						length = byteArray[boundaries[j] + 2] * 256 + byteArray[boundaries[j] + 3];
						offset = 79;
						if (offset > length) {
							offset = 0;
						}
						length += 2;

						tmp = new ArrayBuffer(length - offset);
						memcpy(tmp, 0, arrayBuffer, boundaries[j] + offset, length - offset);
						tmpStr = ab2str(tmp);
						str += tmpStr;
					}
				}

				match = depthRegex.exec(str);
				if (match === null) {
					Seriously.logger.error('JPEG file does not include depth image.');
					return false;
				}

				if (!depthImage) {
					depthImage = document.createElement('img');
				}

				depthImage.src = 'data:image/png;base64,' + match[1];

				if (!depthImage.complete || !depthImage.naturalWidth) {
					depthImage.addEventListener('load', initialize, true);
					depthImage.addEventListener('error', function (evt) {
						Seriously.logger.error('Error loading depth image.', evt);
					}, true);
				} else {
					initialize();
				}
			} else {
				Seriously.logger.error('Unable to load depth image. File is not a JPEG.');
				return false;
			}
		}

		if (force) {
			if (typeof source === 'string') {
				element = document.querySelector(source);
			} else {
				element = source;
			}

			if (element instanceof window.ArrayBuffer) {
				parseArrayBuffer(source);
			} else if (options && options.url) {
				url = options.url;
			} else if (element && element instanceof window.HTMLImageElement &&
					(element.tagName === 'IMG' || force)) {

				url = element.src;
				//todo: validate url
			}

			if (!url && typeof source === 'string') {
				url = source;
			}

			if (url) {
				depthImage = document.createElement('img');

				xhr = new XMLHttpRequest();
				xhr.open('GET', url, true);
				xhr.responseType = 'arraybuffer';

				xhr.onload = function() {
					parseArrayBuffer(this.response);
				};

				xhr.send();
			}

			return !depthImage ? false : {
				deferTexture: true,
				source: depthImage,
				render: Object.getPrototypeOf(this).renderImageCanvas,
				destroy: function () {
					destroyed = true;
				}
			};

		}
	}, {
		title: 'Depth Image'
	});
}));
/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.source('imagedata', function (source) {
		if (source instanceof Object && source.data &&
			source.width && source.height &&
			source.width * source.height * 4 === source.data.length
			) {

			//Because of this bug, Firefox doesn't recognize ImageData, so we have to duck type
			//https://bugzilla.mozilla.org/show_bug.cgi?id=637077

			this.width = source.width;
			this.height = source.height;

			return {
				render: function (gl) {
					if (this.dirty) {
						gl.bindTexture(gl.TEXTURE_2D, this.texture);
						gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flip);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
						this.lastRenderTime = Date.now() / 1000;
						return true;
					}
				}
			};
		}
	}, {
		title: 'ImageData',
		description: '2D Canvas ImageData'
	});
}));
/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously', 'three'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'), require('three'));
	} else {
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously, root.THREE);
	}
}(this, function (Seriously, THREE) {
	'use strict';

	Seriously.source('three', function (source, options, force) {
		var width,
			height,
			typedArray,
			me = this,
			setDirty = this.setDirty;

		function initialize() {
			var texture = source.__webglTexture,
				gl = me.gl;

			if (!texture || !gl || me.initialized) {
				// not ready yet
				return;
			}

			if (!gl.isTexture(texture)) {
				throw new Error('Failed to create Three.js source. WebGL texture is from a different context');
			}

			me.texture = texture;
			me.initialized = true;
			me.allowRefresh = true;
			me.setReady();
		}

		if (THREE && source instanceof THREE.WebGLRenderTarget) {

			width = source.width;
			height = source.height;

			this.width = width;
			this.height = height;

			/*
			Three.js doesn't set up a WebGL texture until the first time it renders,
			and there's no way to be notified. So we place a hook on setDirty, which
			gets called by update or by renderDaemon
			*/
			initialize();
			if (!this.initialized) {
				this.setDirty = function () {
					initialize();
					if (this.initialized) {
						this.setDirty = setDirty;
					}
					setDirty.call(this);
				};
			}

			return {
				deferTexture: !this.initialized,
				//todo: compare?
				render: function (gl) {
					this.lastRenderTime = Date.now() / 1000;
					this.dirty = false;
					this.emit('render');
				}
			};
		}
	}, {
		title: 'Three.js WebGLRenderTarget Source'
	});
}));
/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously', 'three'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'), require('three'));
	} else {
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously, root.THREE);
	}
}(this, function (Seriously, THREE) {
	'use strict';

	/*
	There is currently no way to resize a THREE.WebGLRenderTarget,
	so we won't allow resizing of this kind of target node until that gets fixed
	*/

	var identity = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]),
		mat4 = Seriously.util.mat4;

	Seriously.target('three', function (target, options) {
		var me = this,
			gl,
			frameBuffer;

		function initialize() {
			if (!frameBuffer || !gl || me.initialized) {
				// not ready yet
				return;
			}

			me.initialized = true;
			me.allowRefresh = true;
			me.setReady();
		}

		if (THREE && target instanceof THREE.WebGLRenderTarget) {
			/*
			if not passed a canvas or gl by options and we don't have one already,
			throw an error
			*/
			if (me.gl) {
				gl = me.gl;
			} else if (options) {
				if (options.gl) {
					gl = options.gl;
				} else if (options.canvas && options.canvas.getContext) {
					try {
						gl = options.canvas.getContext('webgl');
					} catch (ignore) {
					}

					if (!gl) {
						try {
							gl = options.canvas.getContext('experimental-webgl');
						} catch (ignore) {
						}
					}
				}
			}

			if (!gl) {
				throw new Error('Failed to create Three.js target. Missing WebGL context');
			}

			this.ready = false;
			this.width = target.width;
			this.height = target.height;

			if (target.__webglFramebuffer) {
				if (!gl.isFramebuffer(target.__webglFramebuffer)) {
					throw new Error('Failed to create Three.js target. WebGL texture is from a different context');
				}
				frameBuffer = target.__webglFramebuffer;
				initialize();
			} else {
				Object.defineProperty(target, '__webglFramebuffer', {
					configurable: true,
					enumerable: true,
					get: function () {
						return frameBuffer;
					},
					set: function (fb) {
						if (fb) {
							frameBuffer = fb;
							initialize();
						}
					}
				});
			}

			this.setReady = function () {
				if (frameBuffer && this.source && this.source.ready && !this.ready) {
					this.emit('ready');
					this.ready = true;
				}
			};

			this.target = target;

			return {
				gl: gl,
				resize: function () {
					this.width = target.width;
					this.height = target.height;
				},
				render: function (draw, shader, model) {
					var matrix, x, y;
					if (gl && this.dirty && this.ready && this.source) {

						this.source.render();
						this.uniforms.source = this.source.texture;

						if (this.source.width === this.width && this.source.height === this.height) {
							this.uniforms.transform = this.source.cumulativeMatrix || identity;
						} else if (this.transformDirty) {
							matrix = this.transform;
							mat4.copy(matrix, this.source.cumulativeMatrix || identity);
							x = this.source.width / this.width;
							y = this.source.height / this.height;
							matrix[0] *= x;
							matrix[1] *= x;
							matrix[2] *= x;
							matrix[3] *= x;
							matrix[4] *= y;
							matrix[5] *= y;
							matrix[6] *= y;
							matrix[7] *= y;
							this.uniforms.transform = matrix;
							this.transformDirty = false;
						}

						draw(shader, model, this.uniforms, frameBuffer, this);

						this.emit('render');
						this.dirty = false;
						if (target.onUpdate) {
							target.onUpdate();
						}
					}
				},
				destroy: function () {
					Object.defineProperty(target, '__webglFramebuffer', {
						configurable: true,
						enumerable: true,
						value: frameBuffer
					});
				}
			};
		}
	}, {
		title: 'THREE.js WebGLRenderTarget Target'
	});
}));
/* global define */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([], factory);
	} else {
		root.MediaLoader = factory();
	}
}(this, function () {
	'use strict';

	var typeRegex = /^[a-z\-]+/i,
		typeElements = {
			video: 'video',
			audio: 'audio',
			image: 'img'
		};

	function MediaLoader(callback, options) {
		var target,
			input,
			format,
			types;

		function dragover(evt) {
			evt.preventDefault();
			return false;
		}

		function upload(file) {
			var reader,
				element,
				type;

			// reject unacceptable file types
			if (types && types.indexOf(file.type) < 0) {
				if (options.error) {
					options.error(file.type);
				}
				return;
			}

			type = typeRegex.exec(file.type);
			type = type && type[0];
			if (format === 'file') {
				callback(file);
			} else if (format === 'contents' || !typeElements[type]) {
				reader = new FileReader();
				reader.onload = function () {
					callback(reader.result, file);
				};
				reader.readAsArrayBuffer(file);
			} else {
				// format === 'element'
				element = document.createElement(typeElements[type]);
				element.src = URL.createObjectURL(file);
				callback(element, file);
			}
		}

		function drop(evt) {
			evt.preventDefault();
			if (evt.dataTransfer.files.length) {
				upload(evt.dataTransfer.files[0]);
			}
			return false;
		}

		function fileInput(evt) {
			if (evt.target.files.length) {
				upload(evt.target.files[0]);
			}
		}

		if (typeof callback === 'object') {
			options = callback;
			callback = options.callback;
		}

		if (!callback) {
			throw new Error('MediaLoader does not work without a callback function');
		}

		if (!options) {
			options = {};
		}

		types = options.types || [
			'video/webm',
			'video/mp4',
			'video/ogg',
			'audio/ogg',
			'audio/mp3',
			'image/jpeg',
			'image/png'
		];

		format = options.format;

		if (!options.target) {
			target = document.body;
		} else if (typeof target === 'string') {
			target = document.querySelector(options.target);
		} else {
			target = options.target;
		}

		if (target) {
			target.addEventListener('dragover', dragover, false);
			target.addEventListener('drop', drop, true);
		}

		input = options.input;
		if (input && typeof input === 'string') {
			input = document.querySelector(input);
		}
		if (input) {
			input.addEventListener('change', fileInput, false);
		}

		this.destroy = function () {
			if (target) {
				target.removeEventListener('dragover', dragover, false);
				target.removeEventListener('drop', drop, true);
			}

			if (input) {
				input.removeEventListener('change', fileInput, false);
			}
		};
	}

	return MediaLoader;
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*
	Adapted from blend mode shader by Romain Dura
	http://mouaif.wordpress.com/2009/01/05/photoshop-math-with-glsl-shaders/
	*/

	function vectorBlendFormula(formula, base, blend) {
		function replace(channel) {
			var r = {
				base: (base || 'base') + '.' + channel,
				blend: (blend || 'blend') + '.' + channel
			};
			return function (match) {
				return r[match] || match;
			};
		}

		return 'vec3(' +
			formula.replace(/blend|base/g, replace('r')) + ', ' +
			formula.replace(/blend|base/g, replace('g')) + ', ' +
			formula.replace(/blend|base/g, replace('b')) +
			')';
	}

	var blendModes = {
		normal: 'blend',
		lighten: 'max(blend, base)',
		darken: 'min(blend, base)',
		multiply: '(base * blend)',
		average: '(base + blend / TWO)',
		add: 'min(base + blend, ONE)',
		subtract: 'max(base - blend, ZERO)',
		divide: 'base / blend',
		difference: 'abs(base - blend)',
		negation: '(ONE - abs(ONE - base - blend))',
		exclusion: '(base + blend - TWO * base * blend)',
		screen: '(ONE - ((ONE - base) * (ONE - blend)))',
		lineardodge: 'min(base + blend, ONE)',
		phoenix: '(min(base, blend) - max(base, blend) + ONE)',
		linearburn: 'max(base + blend - ONE, ZERO)', //same as subtract?

		hue: 'BlendHue(base, blend)',
		saturation: 'BlendSaturation(base, blend)',
		color: 'BlendColor(base, blend)',
		luminosity: 'BlendLuminosity(base, blend)',
		darkercolor: 'BlendDarkerColor(base, blend)',
		lightercolor: 'BlendLighterColor(base, blend)',

		overlay: vectorBlendFormula('base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend))'),
		softlight: vectorBlendFormula('blend < 0.5 ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend))'),
		hardlight: vectorBlendFormula('base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend))', 'blend', 'base'),
		colordodge: vectorBlendFormula('blend == 1.0 ? blend : min(base / (1.0 - blend), 1.0)'),
		colorburn: vectorBlendFormula('blend == 0.0 ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0)'),
		linearlight: vectorBlendFormula('BlendLinearLightf(base, blend)'),
		vividlight: vectorBlendFormula('BlendVividLightf(base, blend)'),
		pinlight: vectorBlendFormula('BlendPinLightf(base, blend)'),
		hardmix: vectorBlendFormula('BlendHardMixf(base, blend)'),
		reflect: vectorBlendFormula('BlendReflectf(base, blend)'),
		glow: vectorBlendFormula('BlendReflectf(blend, base)')
	},

	/*
	All blend modes other than "normal" effectively act as adjustment layers,
	so the alpha channel of the resulting image is just a copy of the "bottom"
	or "destination" layer. The "top" or "source" alpha is only used to dampen
	the color effect.
	*/
	mixAlpha = {
		normal: true
	};

	Seriously.plugin('accumulator', function () {
		var drawOpts = {
			clear: false
		},
		frameBuffers,
		fbIndex = 0;

		return {
			initialize: function (initialize, gl) {
				initialize();
				frameBuffers = [
					this.frameBuffer,
					new Seriously.util.FrameBuffer(gl, this.width, this.height)
				];
			},
			shader: function (inputs, shaderSource) {
				var mode = inputs.blendMode || 'normal';
				mode = mode.toLowerCase();

				shaderSource.fragment = [
					'precision mediump float;',

					'const vec3 ZERO = vec3(0.0);',
					'const vec3 ONE = vec3(1.0);',
					'const vec3 HALF = vec3(0.5);',
					'const vec3 TWO = vec3(2.0);',

					'#define BlendAddf(base, blend)			min(base + blend, 1.0)',
					'#define BlendLinearDodgef(base, blend)	BlendAddf(base, blend)',
					'#define BlendLinearBurnf(base, blend)	max(base + blend - 1.0, 0.0)',
					'#define BlendLightenf(base, blend)		max(blend, base)',
					'#define BlendDarkenf(base, blend)		min(blend, base)',
					'#define BlendLinearLightf(base, blend)	(blend < 0.5 ? BlendLinearBurnf(base, (2.0 * blend)) : BlendLinearDodgef(base, (2.0 * (blend - 0.5))))',
					'#define BlendScreenf(base, blend)		(1.0 - ((1.0 - base) * (1.0 - blend)))',
					'#define BlendOverlayf(base, blend)		(base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))',
					'#define BlendSoftLightf(base, blend)	((blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend)))',
					'#define BlendColorDodgef(base, blend)	((blend == 1.0) ? blend : min(base / (1.0 - blend), 1.0))',
					'#define BlendColorBurnf(base, blend)	((blend == 0.0) ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0))',
					'#define BlendVividLightf(base, blend)	((blend < 0.5) ? BlendColorBurnf(base, (2.0 * blend)) : BlendColorDodgef(base, (2.0 * (blend - 0.5))))',
					'#define BlendPinLightf(base, blend)	((blend < 0.5) ? BlendDarkenf(base, (2.0 * blend)) : BlendLightenf(base, (2.0 *(blend - 0.5))))',
					'#define BlendHardMixf(base, blend)		((BlendVividLightf(base, blend) < 0.5) ? 0.0 : 1.0)',
					'#define BlendReflectf(base, blend)		((blend == 1.0) ? blend : min(base * base / (1.0 - blend), 1.0))',

					/*
					Linear Light is another contrast-increasing mode
					If the blend color is darker than midgray, Linear Light darkens the image
					by decreasing the brightness. If the blend color is lighter than midgray,
					the result is a brighter image due to increased brightness.
					*/

					/*
					RGB/HSL conversion functions needed for Color, Saturation, Hue, Luminosity, etc.
					*/

					'vec3 RGBToHSL(vec3 color) {',
					'	vec3 hsl;', // init to 0 to avoid warnings ? (and reverse if + remove first part)

					'	float fmin = min(min(color.r, color.g), color.b);',    //Min. value of RGB
					'	float fmax = max(max(color.r, color.g), color.b);',    //Max. value of RGB
					'	float delta = fmax - fmin;',             //Delta RGB value

					'	hsl.z = (fmax + fmin) / 2.0;', // Luminance

					'	if (delta == 0.0) {',		//This is a gray, no chroma...
					'		hsl.x = 0.0;',	// Hue
					'		hsl.y = 0.0;',	// Saturation
					'	} else {',                                    //Chromatic data...
					'		if (hsl.z < 0.5)',
					'			hsl.y = delta / (fmax + fmin);', // Saturation
					'		else',
					'			hsl.y = delta / (2.0 - fmax - fmin);', // Saturation

					'		float deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;',
					'		float deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;',
					'		float deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;',

					'		if (color.r == fmax )',
					'			hsl.x = deltaB - deltaG;', // Hue
					'		else if (color.g == fmax)',
					'			hsl.x = (1.0 / 3.0) + deltaR - deltaB;', // Hue
					'		else if (color.b == fmax)',
					'			hsl.x = (2.0 / 3.0) + deltaG - deltaR;', // Hue

					'		if (hsl.x < 0.0)',
					'			hsl.x += 1.0;', // Hue
					'		else if (hsl.x > 1.0)',
					'			hsl.x -= 1.0;', // Hue
					'	}',

					'	return hsl;',
					'}',

					'float HueToRGB(float f1, float f2, float hue) {',
					'	if (hue < 0.0)',
					'		hue += 1.0;',
					'	else if (hue > 1.0)',
					'		hue -= 1.0;',
					'	float res;',
					'	if ((6.0 * hue) < 1.0)',
					'		res = f1 + (f2 - f1) * 6.0 * hue;',
					'	else if ((2.0 * hue) < 1.0)',
					'		res = f2;',
					'	else if ((3.0 * hue) < 2.0)',
					'		res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;',
					'	else',
					'		res = f1;',
					'	return res;',
					'}',

					'vec3 HSLToRGB(vec3 hsl) {',
					'	vec3 rgb;',

					'	if (hsl.y == 0.0)',
					'		rgb = vec3(hsl.z);', // Luminance
					'	else {',
					'		float f2;',

					'		if (hsl.z < 0.5)',
					'			f2 = hsl.z * (1.0 + hsl.y);',
					'		else',
					'			f2 = (hsl.z + hsl.y) - (hsl.y * hsl.z);',

					'		float f1 = 2.0 * hsl.z - f2;',

					'		rgb.r = HueToRGB(f1, f2, hsl.x + (1.0/3.0));',
					'		rgb.g = HueToRGB(f1, f2, hsl.x);',
					'		rgb.b= HueToRGB(f1, f2, hsl.x - (1.0/3.0));',
					'	}',

					'	return rgb;',
					'}',

					// Hue Blend mode creates the result color by combining the luminance and saturation of the base color with the hue of the blend color.
					'vec3 BlendHue(vec3 base, vec3 blend) {',
					'	vec3 baseHSL = RGBToHSL(base);',
					'	return HSLToRGB(vec3(RGBToHSL(blend).r, baseHSL.g, baseHSL.b));',
					'}',

					// Saturation Blend mode creates the result color by combining the luminance and hue of the base color with the saturation of the blend color.
					'vec3 BlendSaturation(vec3 base, vec3 blend) {',
					'	vec3 baseHSL = RGBToHSL(base);',
					'	return HSLToRGB(vec3(baseHSL.r, RGBToHSL(blend).g, baseHSL.b));',
					'}',

					// Color Mode keeps the brightness of the base color and applies both the hue and saturation of the blend color.
					'vec3 BlendColor(vec3 base, vec3 blend) {',
					'	vec3 blendHSL = RGBToHSL(blend);',
					'	return HSLToRGB(vec3(blendHSL.r, blendHSL.g, RGBToHSL(base).b));',
					'}',

					// Luminosity Blend mode creates the result color by combining the hue and saturation of the base color with the luminance of the blend color.
					'vec3 BlendLuminosity(vec3 base, vec3 blend) {',
					'	vec3 baseHSL = RGBToHSL(base);',
					'	return HSLToRGB(vec3(baseHSL.r, baseHSL.g, RGBToHSL(blend).b));',
					'}',

					// Compares the total of all channel values for the blend and base color and displays the higher value color.
					'vec3 BlendLighterColor(vec3 base, vec3 blend) {',
					'	float baseTotal = base.r + base.g + base.b;',
					'	float blendTotal = blend.r + blend.g + blend.b;',
					'	return blendTotal > baseTotal ? blend : base;',
					'}',

					// Compares the total of all channel values for the blend and base color and displays the lower value color.
					'vec3 BlendDarkerColor(vec3 base, vec3 blend) {',
					'	float baseTotal = base.r + base.g + base.b;',
					'	float blendTotal = blend.r + blend.g + blend.b;',
					'	return blendTotal < baseTotal ? blend : base;',
					'}',

					'#define BlendFunction(base, blend) ' + blendModes[mode],
					(mixAlpha[mode] ? '#define MIX_ALPHA' : ''),

					'varying vec2 vTexCoord;',

					'uniform sampler2D source;',
					'uniform sampler2D previous;',

					'uniform float opacity;',

					'vec3 BlendOpacity(vec4 base, vec4 blend, float opacity) {',
					//apply blend, then mix by (opacity * blend.a)
					'	vec3 blendedColor = BlendFunction(base.rgb, blend.rgb);',
					'	return mix(base.rgb, blendedColor, opacity * blend.a);',
					'}',

					'void main(void) {',
					'	vec4 topPixel = texture2D(source, vTexCoord);',
					'	vec4 bottomPixel = texture2D(previous, vTexCoord);',

					'	if (topPixel.a == 0.0) {',
					'		gl_FragColor = bottomPixel;',
					'	} else {',
					'		float alpha;',
					'#ifdef MIX_ALPHA',
					'		alpha = topPixel.a * opacity;',
					'		alpha = alpha + bottomPixel.a * (1.0 - alpha);',
					'#else',
					'		alpha = bottomPixel.a;',
					'#endif',
					'		gl_FragColor = vec4(BlendOpacity(bottomPixel, topPixel, opacity), alpha);',
					'	}',
					'}'
				].join('\n');

				return shaderSource;
			},
			resize: function () {
				if (frameBuffers) {
					frameBuffers[0].resize(this.width, this.height);
					frameBuffers[1].resize(this.width, this.height);
				}
			},
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				var fb;

				// ping-pong textures
				this.uniforms.previous = this.frameBuffer.texture;
				fbIndex = (fbIndex + 1) % 2;
				fb = frameBuffers[fbIndex];
				this.frameBuffer = fb;
				this.texture = fb.texture;

				if (this.inputs.clear) {
					draw(this.baseShader, model, uniforms, fb.frameBuffer, null);
					return;
				}

				draw(shader, model, uniforms, fb.frameBuffer, null, drawOpts);
			},
			destroy: function () {
				if (frameBuffers) {
					frameBuffers[0].destroy();
					frameBuffers[1].destroy();
					frameBuffers.length = 0;
				}
			}
		};
	}, {
		inPlace: false,
		title: 'Accumulator',
		description: 'Draw on top of previous frame',
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			clear: {
				type: 'boolean',
				defaultValue: false
			},
			opacity: {
				type: 'number',
				uniform: 'opacity',
				defaultValue: 1,
				min: 0,
				max: 1
			},
			blendMode: {
				type: 'enum',
				shaderDirty: true,
				defaultValue: 'normal',
				options: [
					['normal', 'Normal'],
					['lighten', 'Lighten'],
					['darken', 'Darken'],
					['multiply', 'Multiply'],
					['average', 'Average'],
					['add', 'Add'],
					['subtract', 'Subtract'],
					['divide', 'Divide'],
					['difference', 'Difference'],
					['negation', 'Negation'],
					['exclusion', 'Exclusion'],
					['screen', 'Screen'],
					['overlay', 'Overlay'],
					['softlight', 'Soft Light'],
					['hardlight', 'Hard Light'],
					['colordodge', 'Color Dodge'],
					['colorburn', 'Color Burn'],
					['lineardodge', 'Linear Dodge'],
					['linearburn', 'Linear Burn'],
					['linearlight', 'Linear Light'],
					['vividlight', 'Vivid Light'],
					['pinlight', 'Pin Light'],
					['hardmix', 'Hard Mix'],
					['reflect', 'Reflect'],
					['glow', 'Glow'],
					['phoenix', 'Phoenix'],
					['hue', 'Hue'],
					['saturation', 'Saturation'],
					['color', 'color'],
					['luminosity', 'Luminosity'],
					['darkercolor', 'Darker Color'],
					['lightercolor', 'Lighter Color']
				]
			}
		}
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*
	todo: consider an alternative algorithm:
	http://tllabs.io/asciistreetview/
	http://sol.gfxile.net/textfx/index.html
	*/

	var identity, letters;

	letters = document.createElement('img');
	letters.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAvAAAAAICAYAAACf+MsnAAAFY0lEQVR4Xu2Z644bOwyDN+//0NsOigEMQdRHyU6CFDnA+bHVWNaFojiTx8/Pz+/f/4/89/v7z9Xj8Tjib3XyTN9usFcMz8gt3h9zXf/O6nD/W1V7Vb9uXad+nHucZ9xenX7OqTHdSfmRXfmPsSn8xPMrllcfCkdVfHSe7Ned0/yp7jv2GPfqK+MCByc0zzvxKi5RPq8cuvE4+JrwpFM7N78K2yu+qb9kd3qV+ZjUx5n/+xnXP81ctW/UHQ5P3Gd360vxKf+n8dGpxXTeKu6h2ansFT6pvo5G2/FP99NsUf9d/xleInfetcj629m9cf9WOV5K+78R8ERGRLYO8VQiecd/1vwKEJV46JBJRzhRfXftVL/MTgM48UmL0l2OSmzs9kctAJfE4/1KkNFzbj8cjFHsJ/u460vhnPDfqddujJ27poLCWWBuHt0YKr/ki+yOKJnk5Z7pPLfLf4TZif+qvi7XuDWg+HbtNEe79ds9H7m1m2/3+YzLK5Hc9e/gYxdfNP+ZfdV9lT3usWn+9310/qiAdxa1O5gTEqVhoLudxVwVNPrvCqDp/ZX4d0Uk1Y7sbgyU4zooCk8nB3i9Y61V5wWpIjDlP+ZJsxPvmLxEOD2sntk5Pz1LBOb0L+sPfQGs6ksYpt7QAiHuUwtkgl+F3Qyf2YxTX53+Vdjfjc8VYIq7KT+abzof7ervZ8fX8d/Jyc3PmTcnRrrPEbyVTnD8T+Y38pH624mfNIr6muzO95S/sh1Gvog/XmW/a6N+scww43zgqLjcOX9cwFeESQK3Gpx32QggTlwk8Ei8OXfE4VMLeCLQiLBjfJM7VA069XefnZBGJz7Vr24dK3GwEoqLD7p/1+4IMWdRdxaMK9CmP4E62F7nm8S7s4B3BMCkBzQPVQ0IM06+2WLvzlDlI+NfF4d0ljiHuF/Zb/4m/4ojTgnA6f0qfiWA135P5l/NoFv/7txm+5ZyyOw0e1R/skd8ZKKwwnjXf9xLrkBV+2x3Pib9Vz3JOMaNL/KZ+oCkXhDUTLxEwLsC41OfI5DEYe9+mXfr0l2mJH5ISHTOUw2U8IjD5LyVUtxEmrvi4V5ejvijWNWicBbOyfsrYejkMMXmdIFEAZH19ASWnNyrPlBdKH+yU3y0gGjGKf4Mv51ft9zzKk83vul5qr9r7+CT9gHx2zvs0/yofpGX1AuC4svqhYJeJJydNZk/urcSxet91dfiUy94HX6oBHCHi5+F38svCeg1h+zZ6nyF5VUzVC8Q0X9LwE/IkMjmpJ3i27XvxuqQ0c4dp/JTfnb9T847AoNIW/nokIYrYKvnJvln/siPwtD0XAeTU+x0luEugWdLNeY4ecl260vxK8Efl3OnZi4uaZZIMBFeJ/hw6xrFvppvV1Q559d8MwwR50cskIBQ2KhE3y7/ZeddAUjxOr3diZ/8U3+I953z7uzR7Lj4rvjl9HxXvaHaOflSfSkf93y24xx94PpX89I5H2t9+fwK+KVzNOwdIeM+e905+ZqqRIj7pYHiU3FNFnBnkO+41EKige3cpX7GunwoARfjIwKrxNhEJFLfMrsbI+G/smfkojAa60vxPcNeCZCqhjSra6ydBaAWSFzaqnb01c4VEdVCWWPM7svstKDWuKrZpwUb7dVsOzPcxUeGdYdfdgV8Vr+Mv1R8Tn/iHcSNWR8jjjv9URzama9qbp0XlBP4y2Jw6u/E577AZTVz/BM/OfySzSjl79o73FRxaFdfuPG5/XE58PbXEvAT8UBn1HKuSIB8ThYwiZfJnd8z768Aib/3R/iN4J0VeMXcVwvynbl/735OBV6BKTfyT+e/T4/f7dP3uW8F3Aqs/PIHbWXeeeKjnSsAAAAASUVORK5CYII=';
	identity = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);

	Seriously.plugin('ascii', function () {
		var baseShader,
			scaledBuffer,
			lettersTexture,
			gl,
			width,
			height,
			scaledWidth,
			scaledHeight,
			unif = {},
			me = this;

		function resize() {
			//set up scaledBuffer if (width or height have changed)
			height = me.height;
			width = me.width;
			scaledWidth = Math.ceil(width / 8);
			scaledHeight = Math.ceil(height / 8);

			unif.resolution = me.uniforms.resolution;
			unif.transform = identity;

			if (scaledBuffer) {
				scaledBuffer.resize(scaledWidth, scaledHeight);
			}
		}

		return {
			initialize: function (parent) {
				function setLetters() {
					gl.bindTexture(gl.TEXTURE_2D, lettersTexture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, letters);
					gl.bindTexture(gl.TEXTURE_2D, null);
				}

				var me = this;

				parent();
				this.texture = this.frameBuffer.texture;

				gl = this.gl;

				lettersTexture = gl.createTexture();
				if (letters.naturalWidth) {
					setLetters();
				} else {
					letters.addEventListener('load', function () {
						setLetters();
						me.setDirty();
					});
				}

				unif.letters = lettersTexture;

				//when the output scales up, don't smooth it out
				gl.bindTexture(gl.TEXTURE_2D, this.texture || this.frameBuffer && this.frameBuffer.texture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.bindTexture(gl.TEXTURE_2D, null);

				resize();

				scaledBuffer = new Seriously.util.FrameBuffer(gl, scaledWidth, scaledHeight);

				//so it stays blocky
				gl.bindTexture(gl.TEXTURE_2D, scaledBuffer.texture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

				this.uniforms.transform = identity;

				baseShader = this.baseShader;
			},
			commonShader: true,
			shader: function (inputs, shaderSource) {
				shaderSource.fragment = [
					'precision mediump float;',

					'varying vec2 vTexCoord;',

					'uniform sampler2D source;',
					'uniform sampler2D letters;',
					'uniform vec4 background;',
					'uniform vec2 resolution;',

					'const vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);',
					'const vec2 fontSize = vec2(8.0, 8.0);',

					'vec4 lookup(float ascii) {',
					'	vec2 pos = mod(vTexCoord * resolution, fontSize) / vec2(752.0, fontSize.x) + vec2(ascii, 0.0);',
					'	return texture2D(letters, pos);',
					'}',

					'void main(void) {',
					'	vec4 sample = texture2D(source, vTexCoord);',
					'	vec4 clamped = vec4(floor(sample.rgb * 8.0) / 8.0, sample.a);',

					'	float luma = dot(sample.rgb,lumcoeff);',
					'	float char = floor(luma * 94.0) / 94.0;',

					'	gl_FragColor = mix(background, clamped, lookup(char).r);',
					'}'
				].join('\n');

				return shaderSource;
			},
			resize: resize,
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				draw(baseShader, model, uniforms, scaledBuffer.frameBuffer, false, {
					width: scaledWidth,
					height: scaledHeight,
					blend: false
				});

				unif.source = scaledBuffer.texture;
				unif.background = uniforms.background;

				draw(shader, model, unif, frameBuffer);
			},
			destroy: function () {
				if (scaledBuffer) {
					scaledBuffer.destroy();
				}
				if (gl && lettersTexture) {
					gl.deleteTexture(lettersTexture);
				}
			}
		};
	},
	{
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			background: {
				type: 'color',
				uniform: 'background',
				defaultValue: [0, 0, 0, 1]
			}
		},
		description: 'Display image as ascii text in 8-bit color.',
		title: 'Ascii Text'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*
	Shader code:
	* Copyright vade - Anton Marini
	* Creative Commons, Attribution - Non Commercial - Share Alike 3.0

	http://v002.info/?page_id=34

	Modified to keep alpha channel constant
	*/

	Seriously.plugin('bleach-bypass', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',

				'uniform float amount;',

				//constants
				'const vec4 one = vec4(1.0);',
				'const vec4 two = vec4(2.0);',
				'const vec4 lumcoeff = vec4(0.2125,0.7154,0.0721,0.0);',

				'vec4 overlay(vec4 myInput, vec4 previousmix, vec4 amount) {',
				'	float luminance = dot(previousmix,lumcoeff);',
				'	float mixamount = clamp((luminance - 0.45) * 10.0, 0.0, 1.0);',

				'	vec4 branch1 = two * previousmix * myInput;',
				'	vec4 branch2 = one - (two * (one - previousmix) * (one - myInput));',

				'	vec4 result = mix(branch1, branch2, vec4(mixamount) );',

				'	return mix(previousmix, result, amount);',
				'}',

				'void main (void)  {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	vec4 luma = vec4(vec3(dot(pixel,lumcoeff)), pixel.a);',
				'	gl_FragColor = overlay(luma, pixel, vec4(amount));',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 1,
				min: 0,
				max: 1
			}
		},
		title: 'Bleach Bypass',
		categories: ['film'],
		description: [
			'Bleach Bypass film treatment',
			'http://en.wikipedia.org/wiki/Bleach_bypass',
			'see: "Saving Private Ryan", "Minority Report"'
		].join('\n')
	});
}));

/* global define, require, exports, Float32Array */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*
	todo: if transforms are used, do multiple passes and enable depth testing?
	todo: for now, only supporting float blend modes. Add complex ones
	todo: apply proper credit and license

	Adapted from blend mode shader by Romain Dura
	http://mouaif.wordpress.com/2009/01/05/photoshop-math-with-glsl-shaders/
	*/

	function vectorBlendFormula(formula, base, blend) {
		function replace(channel) {
			var r = {
				base: (base || 'base') + '.' + channel,
				blend: (blend || 'blend') + '.' + channel
			};
			return function (match) {
				return r[match] || match;
			};
		}

		return 'vec3(' +
			formula.replace(/blend|base/g, replace('r')) + ', ' +
			formula.replace(/blend|base/g, replace('g')) + ', ' +
			formula.replace(/blend|base/g, replace('b')) +
			')';
	}

	var blendModes = {
		normal: 'blend',
		lighten: 'max(blend, base)',
		darken: 'min(blend, base)',
		multiply: '(base * blend)',
		average: '(base + blend / TWO)',
		add: 'min(base + blend, ONE)',
		subtract: 'max(base - blend, ZERO)',
		divide: 'base / blend',
		difference: 'abs(base - blend)',
		negation: '(ONE - abs(ONE - base - blend))',
		exclusion: '(base + blend - TWO * base * blend)',
		screen: '(ONE - ((ONE - base) * (ONE - blend)))',
		lineardodge: 'min(base + blend, ONE)',
		phoenix: '(min(base, blend) - max(base, blend) + ONE)',
		linearburn: 'max(base + blend - ONE, ZERO)',

		hue: 'BlendHue(base, blend)',
		saturation: 'BlendSaturation(base, blend)',
		color: 'BlendColor(base, blend)',
		luminosity: 'BlendLuminosity(base, blend)',
		darkercolor: 'BlendDarkerColor(base, blend)',
		lightercolor: 'BlendLighterColor(base, blend)',

		overlay: vectorBlendFormula('base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend))'),
		softlight: vectorBlendFormula('blend < 0.5 ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend))'),
		hardlight: vectorBlendFormula('base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend))', 'blend', 'base'),
		colordodge: vectorBlendFormula('blend == 1.0 ? blend : min(base / (1.0 - blend), 1.0)'),
		colorburn: vectorBlendFormula('blend == 0.0 ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0)'),
		linearlight: vectorBlendFormula('BlendLinearLightf(base, blend)'),
		vividlight: vectorBlendFormula('BlendVividLightf(base, blend)'),
		pinlight: vectorBlendFormula('BlendPinLightf(base, blend)'),
		hardmix: vectorBlendFormula('BlendHardMixf(base, blend)'),
		reflect: vectorBlendFormula('BlendReflectf(base, blend)'),
		glow: vectorBlendFormula('BlendReflectf(blend, base)')
	},
	nativeBlendModes = {
		normal: ['FUNC_ADD', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'SRC_ALPHA', 'DST_ALPHA']/*,
		add: ['FUNC_ADD', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'SRC_ALPHA', 'DST_ALPHA']*/
		//todo: multiply, screen
	},
	identity = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);

	Seriously.plugin('blend', function () {
		var topUniforms,
			bottomUniforms,
			topOpts = {
				clear: false
			},
			inputs,
			gl;

		function updateDrawFunction() {
			var nativeMode = inputs && nativeBlendModes[inputs.mode];
			if (nativeMode && gl) {
				topOpts.blendEquation = gl[nativeMode[0]];
				topOpts.srcRGB = gl[nativeMode[1]];
				topOpts.dstRGB = gl[nativeMode[2]];
				topOpts.srcAlpha = gl[nativeMode[3]];
				topOpts.dstAlpha = gl[nativeMode[4]];
			}
		}

		// custom resize method
		this.resize = function () {
			var width,
				height,
				mode = this.inputs.sizeMode,
				node,
				fn,
				i,
				bottom = this.inputs.bottom,
				top = this.inputs.top;

			if (mode === 'bottom' || mode === 'top') {
				node = this.inputs[mode];
				if (node) {
					width = node.width;
					height = node.height;
				} else {
					width = 1;
					height = 1;
				}
			} else {
				if (bottom) {
					if (top) {
						fn = (mode === 'union' ? Math.max : Math.min);
						width = fn(bottom.width, top.width);
						height = fn(bottom.height, top.height);
					} else {
						width = bottom.width;
						height = bottom.height;
					}
				} else if (top) {
					width = top.width;
					height = top.height;
				} else {
					width = 1;
					height = 1;
				}
			}

			if (this.width !== width || this.height !== height) {
				this.width = width;
				this.height = height;

				this.uniforms.resolution[0] = width;
				this.uniforms.resolution[1] = height;

				if (this.frameBuffer) {
					this.frameBuffer.resize(width, height);
				}

				this.emit('resize');
				this.setDirty();
			}

			this.uniforms.resBottom[0] = bottom && bottom.width || 1;
			this.uniforms.resBottom[1] = bottom && bottom.height || 1;
			this.uniforms.resTop[0] = top && top.width || 1;
			this.uniforms.resTop[1] = top && top.height || 1;

			if (topUniforms) {
				if (bottom) {
					bottomUniforms.resolution[0] = bottom.width;
					bottomUniforms.resolution[1] = bottom.height;
				}
				if (top) {
					topUniforms.resolution[0] = top.width;
					topUniforms.resolution[1] = top.height;
				}
			}

			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}
		};

		this.uniforms.resTop = [1, 1];
		this.uniforms.resBottom = [1, 1];

		return {
			initialize: function (initialize) {
				inputs = this.inputs;
				initialize();
				gl = this.gl;
				updateDrawFunction();
			},
			shader: function (inputs, shaderSource) {
				var mode = inputs.mode || 'normal',
					node;
				mode = mode.toLowerCase();

				if (nativeBlendModes[mode]) {
					//todo: move this to an 'update' event for 'mode' input
					if (!topUniforms) {
						node = this.inputs.top;
						topUniforms = {
							resolution: [
								node && node.width || 1,
								node && node.height || 1
							],
							targetRes: this.uniforms.resolution,
							source: node,
							transform: node && node.cumulativeMatrix || identity,
							opacity: this.inputs.opacity
						};

						node = this.inputs.bottom;
						bottomUniforms = {
							resolution: [
								node && node.width || 1,
								node && node.height || 1
							],
							targetRes: this.uniforms.resolution,
							source: node,
							transform: node && node.cumulativeMatrix || identity,
							opacity: 1
						};
					}

					shaderSource.vertex = [
						'precision mediump float;',

						'attribute vec4 position;',
						'attribute vec2 texCoord;',

						'uniform vec2 resolution;',
						'uniform vec2 targetRes;',
						'uniform mat4 transform;',

						'varying vec2 vTexCoord;',

						'void main(void) {',
						// first convert to screen space
						'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
						'	screenPosition = transform * screenPosition;',

						// convert back to OpenGL coords
						'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
						'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
						'	gl_Position.xy *= resolution / targetRes;',
						'	gl_Position.w = screenPosition.w;',
						'	vTexCoord = texCoord;',
						'}\n'
					].join('\n');

					shaderSource.fragment = [
						'precision mediump float;',
						'varying vec2 vTexCoord;',
						'uniform sampler2D source;',
						'uniform float opacity;',
						'void main(void) {',
						'	gl_FragColor = texture2D(source, vTexCoord);',
						'	gl_FragColor.a *= opacity;',
						'}'
					].join('\n');

					return shaderSource;
				}

				topUniforms = null;
				bottomUniforms = null;

				//todo: need separate texture coords for different size top/bottom images
				shaderSource.vertex = [
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform vec2 resBottom;',
					'uniform vec2 resTop;',

					'varying vec2 texCoordBottom;',
					'varying vec2 texCoordTop;',

					'const vec2 HALF = vec2(0.5);',

					'void main(void) {',
					//we don't need to do a transform in this shader, since this effect is not "inPlace"
					'	gl_Position = position;',

					'	vec2 adjusted = (texCoord - HALF) * resolution;',

					'	texCoordBottom = adjusted / resBottom + HALF;',
					'	texCoordTop = adjusted / resTop + HALF;',
					'}'
				].join('\n');

				shaderSource.fragment = [
					'precision mediump float;',

					'const vec3 ZERO = vec3(0.0);',
					'const vec3 ONE = vec3(1.0);',
					'const vec3 HALF = vec3(0.5);',
					'const vec3 TWO = vec3(2.0);',

					/*
					Linear Light is another contrast-increasing mode
					If the blend color is darker than midgray, Linear Light darkens the image
					by decreasing the brightness. If the blend color is lighter than midgray,
					the result is a brighter image due to increased brightness.
					*/

					'#define BlendAddf(base, blend)			min(base + blend, 1.0)',
					'#define BlendLinearDodgef(base, blend)	BlendAddf(base, blend)',
					'#define BlendLinearBurnf(base, blend)	max(base + blend - 1.0, 0.0)',
					'#define BlendLightenf(base, blend)		max(blend, base)',
					'#define BlendDarkenf(base, blend)		min(blend, base)',
					'#define BlendLinearLightf(base, blend)	(blend < 0.5 ? BlendLinearBurnf(base, (2.0 * blend)) : BlendLinearDodgef(base, (2.0 * (blend - 0.5))))',
					'#define BlendScreenf(base, blend)		(1.0 - ((1.0 - base) * (1.0 - blend)))',
					'#define BlendOverlayf(base, blend)		(base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))',
					'#define BlendSoftLightf(base, blend)	((blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend)))',
					'#define BlendColorDodgef(base, blend)	((blend == 1.0) ? blend : min(base / (1.0 - blend), 1.0))',
					'#define BlendColorBurnf(base, blend)	((blend == 0.0) ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0))',
					'#define BlendVividLightf(base, blend)	((blend < 0.5) ? BlendColorBurnf(base, (2.0 * blend)) : BlendColorDodgef(base, (2.0 * (blend - 0.5))))',
					'#define BlendPinLightf(base, blend)	((blend < 0.5) ? BlendDarkenf(base, (2.0 * blend)) : BlendLightenf(base, (2.0 *(blend - 0.5))))',
					'#define BlendHardMixf(base, blend)		((BlendVividLightf(base, blend) < 0.5) ? 0.0 : 1.0)',
					'#define BlendReflectf(base, blend)		((blend == 1.0) ? blend : min(base * base / (1.0 - blend), 1.0))',

					/*
					RGB/HSL conversion functions needed for Color, Saturation, Hue, Luminosity, etc.
					*/

					'vec3 RGBToHSL(vec3 color) {',
					'	vec3 hsl;', // init to 0 to avoid warnings ? (and reverse if + remove first part)

					'	float fmin = min(min(color.r, color.g), color.b);',    //Min. value of RGB
					'	float fmax = max(max(color.r, color.g), color.b);',    //Max. value of RGB
					'	float delta = fmax - fmin;',             //Delta RGB value

					'	hsl.z = (fmax + fmin) / 2.0;', // Luminance

					'	if (delta == 0.0) {',		//This is a gray, no chroma...
					'		hsl.x = 0.0;',	// Hue
					'		hsl.y = 0.0;',	// Saturation
					'	} else {',                                    //Chromatic data...
					'		if (hsl.z < 0.5)',
					'			hsl.y = delta / (fmax + fmin);', // Saturation
					'		else',
					'			hsl.y = delta / (2.0 - fmax - fmin);', // Saturation

					'		float deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;',
					'		float deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;',
					'		float deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;',

					'		if (color.r == fmax )',
					'			hsl.x = deltaB - deltaG;', // Hue
					'		else if (color.g == fmax)',
					'			hsl.x = (1.0 / 3.0) + deltaR - deltaB;', // Hue
					'		else if (color.b == fmax)',
					'			hsl.x = (2.0 / 3.0) + deltaG - deltaR;', // Hue

					'		if (hsl.x < 0.0)',
					'			hsl.x += 1.0;', // Hue
					'		else if (hsl.x > 1.0)',
					'			hsl.x -= 1.0;', // Hue
					'	}',

					'	return hsl;',
					'}',

					'float HueToRGB(float f1, float f2, float hue) {',
					'	if (hue < 0.0)',
					'		hue += 1.0;',
					'	else if (hue > 1.0)',
					'		hue -= 1.0;',
					'	float res;',
					'	if ((6.0 * hue) < 1.0)',
					'		res = f1 + (f2 - f1) * 6.0 * hue;',
					'	else if ((2.0 * hue) < 1.0)',
					'		res = f2;',
					'	else if ((3.0 * hue) < 2.0)',
					'		res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;',
					'	else',
					'		res = f1;',
					'	return res;',
					'}',

					'vec3 HSLToRGB(vec3 hsl) {',
					'	vec3 rgb;',

					'	if (hsl.y == 0.0)',
					'		rgb = vec3(hsl.z);', // Luminance
					'	else {',
					'		float f2;',

					'		if (hsl.z < 0.5)',
					'			f2 = hsl.z * (1.0 + hsl.y);',
					'		else',
					'			f2 = (hsl.z + hsl.y) - (hsl.y * hsl.z);',

					'		float f1 = 2.0 * hsl.z - f2;',

					'		rgb.r = HueToRGB(f1, f2, hsl.x + (1.0/3.0));',
					'		rgb.g = HueToRGB(f1, f2, hsl.x);',
					'		rgb.b= HueToRGB(f1, f2, hsl.x - (1.0/3.0));',
					'	}',

					'	return rgb;',
					'}',

					// Hue Blend mode creates the result color by combining the luminance and saturation of the base color with the hue of the blend color.
					'vec3 BlendHue(vec3 base, vec3 blend) {',
					'	vec3 baseHSL = RGBToHSL(base);',
					'	return HSLToRGB(vec3(RGBToHSL(blend).r, baseHSL.g, baseHSL.b));',
					'}',

					// Saturation Blend mode creates the result color by combining the luminance and hue of the base color with the saturation of the blend color.
					'vec3 BlendSaturation(vec3 base, vec3 blend) {',
					'	vec3 baseHSL = RGBToHSL(base);',
					'	return HSLToRGB(vec3(baseHSL.r, RGBToHSL(blend).g, baseHSL.b));',
					'}',

					// Color Mode keeps the brightness of the base color and applies both the hue and saturation of the blend color.
					'vec3 BlendColor(vec3 base, vec3 blend) {',
					'	vec3 blendHSL = RGBToHSL(blend);',
					'	return HSLToRGB(vec3(blendHSL.r, blendHSL.g, RGBToHSL(base).b));',
					'}',

					// Luminosity Blend mode creates the result color by combining the hue and saturation of the base color with the luminance of the blend color.
					'vec3 BlendLuminosity(vec3 base, vec3 blend) {',
					'	vec3 baseHSL = RGBToHSL(base);',
					'	return HSLToRGB(vec3(baseHSL.r, baseHSL.g, RGBToHSL(blend).b));',
					'}',

					// Compares the total of all channel values for the blend and base color and displays the higher value color.
					'vec3 BlendLighterColor(vec3 base, vec3 blend) {',
					'	float baseTotal = base.r + base.g + base.b;',
					'	float blendTotal = blend.r + blend.g + blend.b;',
					'	return blendTotal > baseTotal ? blend : base;',
					'}',

					// Compares the total of all channel values for the blend and base color and displays the lower value color.
					'vec3 BlendDarkerColor(vec3 base, vec3 blend) {',
					'	float baseTotal = base.r + base.g + base.b;',
					'	float blendTotal = blend.r + blend.g + blend.b;',
					'	return blendTotal < baseTotal ? blend : base;',
					'}',

					'#define BlendFunction(base, blend) ' + blendModes[mode],

					'varying vec2 texCoordBottom;',
					'varying vec2 texCoordTop;',

					'uniform sampler2D top;',
					'uniform sampler2D bottom;',
					'uniform float opacity;',

					'vec3 BlendOpacity(vec4 base, vec4 blend, float opacity) {',
					//apply blend, then mix by (opacity * blend.a)
					'	vec3 blendedColor = BlendFunction(base.rgb, blend.rgb);',
					'	return mix(base.rgb, blendedColor, opacity * blend.a);',
					'}',

					'void main(void) {',
					'	vec4 topPixel = texture2D(top, texCoordTop);',
					'	vec4 bottomPixel = texture2D(bottom, texCoordBottom);',

					'	if (topPixel.a == 0.0) {',
					'		gl_FragColor = bottomPixel;',
					'	} else {',
					'		gl_FragColor = vec4(BlendOpacity(bottomPixel, topPixel, opacity), bottomPixel.a);',
					'	}',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				if (nativeBlendModes[this.inputs.mode]) {
					if (this.inputs.bottom) {
						draw(shader, model, bottomUniforms, frameBuffer);
					} else {
						//just clear
						gl.viewport(0, 0, this.width, this.height);
						gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
						gl.clearColor(0.0, 0.0, 0.0, 0.0);
						gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
					}

					if (this.inputs.top && this.inputs.opacity) {
						draw(shader, model, topUniforms, frameBuffer, null, topOpts);
					}
				} else {
					draw(shader, model, uniforms, frameBuffer);
				}
			},
			requires: function (sourceName) {
				if (!this.inputs.opacity && sourceName === 'top') {
					return false;
				}
				return true;
			},
			inputs: {
				top: {
					type: 'image',
					uniform: 'top',
					update: function () {
						if (topUniforms) {
							topUniforms.source = this.inputs.top;
							topUniforms.transform = this.inputs.top.cumulativeMatrix || identity;
						}
						this.resize();
					}
				},
				bottom: {
					type: 'image',
					uniform: 'bottom',
					update: function () {
						if (bottomUniforms) {
							bottomUniforms.source = this.inputs.bottom;
							bottomUniforms.transform = this.inputs.bottom.cumulativeMatrix || identity;
						}
						this.resize();
					}
				},
				opacity: {
					type: 'number',
					uniform: 'opacity',
					defaultValue: 1,
					min: 0,
					max: 1,
					updateSources: true,
					update: function (opacity) {
						if (topUniforms) {
							topUniforms.opacity = opacity;
						}
					}
				},
				sizeMode: {
					type: 'enum',
					defaultValue: 'bottom',
					options: [
						'bottom',
						'top',
						'union',
						'intersection'
					],
					update: function () {
						this.resize();
					}
				},
				mode: {
					type: 'enum',
					shaderDirty: true,
					defaultValue: 'normal',
					options: [
						['normal', 'Normal'],
						['lighten', 'Lighten'],
						['darken', 'Darken'],
						['multiply', 'Multiply'],
						['average', 'Average'],
						['add', 'Add'],
						['subtract', 'Subtract'],
						['divide', 'Divide'],
						['difference', 'Difference'],
						['negation', 'Negation'],
						['exclusion', 'Exclusion'],
						['screen', 'Screen'],
						['overlay', 'Overlay'],
						['softlight', 'Soft Light'],
						['hardlight', 'Hard Light'],
						['colordodge', 'Color Dodge'],
						['colorburn', 'Color Burn'],
						['lineardodge', 'Linear Dodge'],
						['linearburn', 'Linear Burn'],
						['linearlight', 'Linear Light'],
						['vividlight', 'Vivid Light'],
						['pinlight', 'Pin Light'],
						['hardmix', 'Hard Mix'],
						['reflect', 'Reflect'],
						['glow', 'Glow'],
						['phoenix', 'Phoenix'],
						['hue', 'Hue'],
						['saturation', 'Saturation'],
						['color', 'color'],
						['luminosity', 'Luminosity'],
						['darkercolor', 'Darker Color'],
						['lightercolor', 'Lighter Color']
					],
					update: function () {
						updateDrawFunction();
					}
				}
			}
		};
	},
	{
		inPlace: function () {
			return !!nativeBlendModes[this.inputs.mode];
		},
		description: 'Blend two layers',
		title: 'Blend'
	});
}));

/* global define, require */
/*
Blur

Adapted from v002 by Anton Marini and Tom Butterworth
* Copyright vade - Anton Marini
* Creative Commons, Attribution - Non Commercial - Share Alike 3.0

http://v002.info/plugins/v002-blurs/
*/
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	var passes = [0.2, 0.3, 0.5, 0.8, 1],
		finalPass = passes.length - 1,
		horizontal = [1, 0],
		vertical = [0, 1],
		identity = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]);

	Seriously.plugin('blur', function (options) {
		var fbHorizontal,
			fbVertical,
			baseShader,
			loopUniforms = {
				amount: 0,
				inputScale: 1,
				resolution: [this.width, this.height],
				transform: identity,
				direction: null
			};

		return {
			initialize: function (parent) {
				var gl;

				parent();

				gl = this.gl;

				if (!gl) {
					return;
				}

				baseShader = this.baseShader;

				fbHorizontal = new Seriously.util.FrameBuffer(gl, this.width, this.height);
				fbVertical = new Seriously.util.FrameBuffer(gl, this.width, this.height);
			},
			commonShader: true,
			shader: function (inputs, shaderSource) {
				var gl = this.gl,
					/*
					Some devices or browsers (e.g. IE11 preview) don't support enough
					varying vectors, so we need to fallback to a less efficient method
					*/
					maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS),
					defineVaryings = (maxVaryings >= 10 ? '#define USE_VARYINGS' : '');

				shaderSource.vertex = [
					defineVaryings,
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform mat4 transform;',

					'uniform vec2 direction;',
					'uniform float amount;',
					'uniform float inputScale;',

					'const vec2 zero = vec2(0.0, 0.0);',

					'varying vec2 vTexCoord;',

					'#ifdef USE_VARYINGS',
					'vec2 one;',
					'vec2 amount1;',
					'varying vec2 vTexCoord1;',
					'varying vec2 vTexCoord2;',
					'varying vec2 vTexCoord3;',
					'varying vec2 vTexCoord4;',
					'varying vec2 vTexCoord5;',
					'varying vec2 vTexCoord6;',
					'varying vec2 vTexCoord7;',
					'varying vec2 vTexCoord8;',
					'#else',
					'varying vec2 one;',
					'varying vec2 amount1;',
					'#endif',

					'void main(void) {',
					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
					'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position = screenPosition;',
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
					'	vTexCoord = texCoord;',

					'	one = vec2(1.0, 1.0) * inputScale;',
					'	if (inputScale < 1.0) {',
					'		one -= 1.0 / resolution;',
					'	}',

					'	vTexCoord = max(zero, min(one, texCoord.st * inputScale));',
					'	amount1 = direction * (inputScale * amount * 5.0 / resolution);',

					'#ifdef USE_VARYINGS',
					'	vec2 amount2 = amount1 * 3.0;',
					'	vec2 amount3 = amount1 * 6.0;',
					'	vec2 amount4 = amount1 * 9.0;',
					'	vec2 amount5 = -amount1;',
					'	vec2 amount6 = amount5 * 3.0;',
					'	vec2 amount7 = amount5 * 6.0;',
					'	vec2 amount8 = amount5 * 9.0;',
					'	vTexCoord1 = max(zero, min(one, vTexCoord + amount1));',
					'	vTexCoord2 = max(zero, min(one, vTexCoord + amount2));',
					'	vTexCoord3 = max(zero, min(one, vTexCoord + amount3));',
					'	vTexCoord4 = max(zero, min(one, vTexCoord + amount4));',
					'	vTexCoord5 = max(zero, min(one, vTexCoord + amount5));',
					'	vTexCoord6 = max(zero, min(one, vTexCoord + amount6));',
					'	vTexCoord7 = max(zero, min(one, vTexCoord + amount7));',
					'	vTexCoord8 = max(zero, min(one, vTexCoord + amount8));',
					'#endif',
					'}'
				].join('\n');
				shaderSource.fragment = [
					defineVaryings,

					'precision mediump float;\n',

					'varying vec2 vTexCoord;',

					'uniform sampler2D source;',

					'#ifdef USE_VARYINGS',
					'varying vec2 vTexCoord1;',
					'varying vec2 vTexCoord2;',
					'varying vec2 vTexCoord3;',
					'varying vec2 vTexCoord4;',
					'varying vec2 vTexCoord5;',
					'varying vec2 vTexCoord6;',
					'varying vec2 vTexCoord7;',
					'varying vec2 vTexCoord8;',
					'#else',
					'varying vec2 amount1;',
					'varying vec2 one;',
					'const vec2 zero = vec2(0.0, 0.0);',
					'#endif',

					'void main(void) {',
					'#ifndef USE_VARYINGS',
					'	vec2 vTexCoord1 = max(zero, min(one, vTexCoord + amount1));',
					'	vec2 vTexCoord2 = max(zero, min(one, vTexCoord + amount1 * 3.0));',
					'	vec2 vTexCoord3 = max(zero, min(one, vTexCoord + amount1 * 6.0));',
					'	vec2 vTexCoord4 = max(zero, min(one, vTexCoord + amount1 * 9.0));',
					'	vec2 vTexCoord5 = max(zero, min(one, vTexCoord - amount1));',
					'	vec2 vTexCoord6 = max(zero, min(one, vTexCoord - amount1 * 3.0));',
					'	vec2 vTexCoord7 = max(zero, min(one, vTexCoord - amount1 * 6.0));',
					'	vec2 vTexCoord8 = max(zero, min(one, vTexCoord - amount1 * 9.0));',
					'#endif',
					'	gl_FragColor = texture2D(source, vTexCoord) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord1) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord2) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord3) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord4) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord5) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord6) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord7) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord8) / 9.0;',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				var i,
					pass,
					amount,
					width,
					height,
					opts = {
						width: 0,
						height: 0,
						blend: false
					},
					previousPass = 1;

				amount = this.inputs.amount;
				if (!amount) {
					uniforms.source = this.inputs.source.texture;
					parent(baseShader, model, uniforms, frameBuffer);
					return;
				}

				if (amount <= 0.01) {
					//horizontal pass
					uniforms.inputScale = 1;
					uniforms.direction = horizontal;
					uniforms.source = this.inputs.source.texture;
					parent(shader, model, uniforms, fbHorizontal.frameBuffer);

					//vertical pass
					uniforms.direction = vertical;
					uniforms.source = fbHorizontal.texture;
					parent(shader, model, uniforms, frameBuffer);
					return;
				}

				loopUniforms.amount = amount;
				loopUniforms.source = this.inputs.source.texture;

				for (i = 0; i < passes.length; i++) {
					pass = Math.min(1, passes[i] / amount);
					width = Math.floor(pass * this.width);
					height = Math.floor(pass * this.height);

					loopUniforms.resolution[0] = width;
					loopUniforms.resolution[1] = height;
					loopUniforms.inputScale = previousPass;
					previousPass = pass;

					opts.width = width;
					opts.height = height;

					//horizontal pass
					loopUniforms.direction = horizontal;
					parent(shader, model, loopUniforms, fbHorizontal.frameBuffer, null, opts);

					//vertical pass
					loopUniforms.inputScale = pass;
					loopUniforms.source = fbHorizontal.texture;
					loopUniforms.direction = vertical;
					parent(shader, model, loopUniforms, i === finalPass ? frameBuffer : fbVertical.frameBuffer, null, opts);

					loopUniforms.source = fbVertical.texture;
				}
			},
			resize: function () {
				loopUniforms.resolution[0] = this.width;
				loopUniforms.resolution[1] = this.height;
				if (fbHorizontal) {
					fbHorizontal.resize(this.width, this.height);
					fbVertical.resize(this.width, this.height);
				}
			},
			destroy: function () {
				if (fbHorizontal) {
					fbHorizontal.destroy();
					fbVertical.destroy();
					fbHorizontal = null;
					fbVertical = null;
				}

				loopUniforms = null;
			}
		};
	},
	{
		inputs: {
			source: {
				type: 'image',
				shaderDirty: false
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 0.2,
				min: 0,
				max: 1
			}
		},
		title: 'Gaussian Blur'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('brightness-contrast', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float brightness;',
				'uniform float saturation;',
				'uniform float contrast;',

				'const vec3 half3 = vec3(0.5);',

				'void main(void) {',
				'	vec4 pixel = texture2D(source, vTexCoord);',

				//adjust brightness
				'	vec3 color = pixel.rgb * brightness;',

				//adjust contrast
				'	color = (color - half3) * contrast + half3;',

				//keep alpha the same
				'	gl_FragColor = vec4(color, pixel.a);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			brightness: {
				type: 'number',
				uniform: 'brightness',
				defaultValue: 1,
				min: 0
			},
			contrast: {
				type: 'number',
				uniform: 'contrast',
				defaultValue: 1,
				min: 0
			}
		},
		title: 'Brightness/Contrast',
		description: 'Multiply brightness and contrast values. Works the same as CSS filters.'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	var channelOptions = [
			'Red',
			'Green',
			'Blue',
			'Alpha'
		],
		channelLookup = {
			r: 0,
			g: 1,
			b: 2,
			a: 3,
			x: 0,
			y: 1,
			z: 2,
			w: 3
		};

	Seriously.plugin('channels', function () {
		var sources = [],
			shaders = [],
			matrices = [],
			me = this;

		function validateChannel(value, input, name) {
			var val;
			if (typeof value === 'string') {
				val = value.charAt(0).toLowerCase();
				val = channelLookup[val];
				if (val === undefined) {
					val = -1;
				}
				if (val < 0) {
					val = parseFloat(value);
				}
			} else {
				val = value;
			}

			if (val === 0 || val === 1 || val === 2 || val === 3) {
				return val;
			}

			return me.inputs[name];
		}

		function updateChannels() {
			var inputs = me.inputs,
				i, j,
				source,
				matrix;

			for (i = 0; i < sources.length; i++) {
				source = sources[i];
				matrix = matrices[i];
				if (!matrix) {
					matrix = matrices[i] = [];
					me.uniforms['channels' + i] = matrix;
				}

				for (j = 0; j < 16; j++) {
					matrix[j] = 0;
				}

				matrix[inputs.red] = (inputs.redSource === source) ? 1 : 0;
				matrix[4 + inputs.green] = (inputs.greenSource === source) ? 1 : 0;
				matrix[8 + inputs.blue] = (inputs.blueSource === source) ? 1 : 0;
				matrix[12 + inputs.alpha] = (inputs.alphaSource === source) ? 1 : 0;
			}
		}

		function updateSources() {
			var inputs = me.inputs;

			function validateSource(name) {
				var s, j;
				s = inputs[name];
				if (!s) {
					s = me.sources[name] = inputs[name] = inputs.source;
				}

				j = sources.indexOf(s);
				if (j < 0) {
					j = sources.length;
					sources.push(s);
					me.uniforms['source' + j] = s;
				}
			}
			sources.length = 0;

			validateSource('redSource');
			validateSource('greenSource');
			validateSource('blueSource');
			validateSource('alphaSource');

			me.resize();

			updateChannels();
		}

		// custom resize method
		this.resize = function () {
			var width,
				height,
				mode = this.inputs.sizeMode,
				i,
				resolution,
				source;

			if (!sources.length) {
				width = 1;
				height = 1;
			} else if (sources.length === 1) {
				source = sources[0];
				width = source.width;
				height = source.height;
			} else if (mode === 'union') {
				width = 0;
				height = 0;
				for (i = 0; i < sources.length; i++) {
					source = sources[0];
					width = Math.max(width, source.width);
					height = Math.max(height, source.height);
				}
			} else if (mode === 'intersection') {
				width = Infinity;
				height = Infinity;
				for (i = 0; i < sources.length; i++) {
					source = sources[0];
					width = Math.min(width, source.width);
					height = Math.min(height, source.height);
				}
			} else {
				source = me.inputs[mode + 'Source'];
				if (source) {
					width = source.width;
					height = source.height;
				} else {
					width = 1;
					height = 1;
				}
			}

			for (i = 0; i < sources.length; i++) {
				source = sources[i];
				resolution = me.uniforms['resolution' + i];
				if (resolution) {
					resolution[0] = source.width;
					resolution[1] = source.height;
				} else {
					me.uniforms['resolution' + i] = [source.width, source.height];
				}
			}

			if (this.width !== width || this.height !== height) {
				this.width = width;
				this.height = height;

				this.uniforms.resolution[0] = width;
				this.uniforms.resolution[1] = height;

				if (this.frameBuffer) {
					this.frameBuffer.resize(width, height);
				}

				this.emit('resize');
				this.setDirty();
			}

			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}
		};

		return {
			shader: function () {
				var i,
					frag,
					vert,
					shader,
					uniforms = '',
					samples = '',
					varyings = '',
					position = '';

				/*
				We'll restore this and the draw function below if we ever figure out a way to
				add/& multiple renders without screwing up the brightness
				shaderSource.fragment = [
					'precision mediump float;',

					'varying vec2 vTexCoord;',
					'uniform mat4 channels;',
					'uniform sampler2D source;',
					//'uniform sampler2D previous;',
					'void main(void) {',
					'	vec4 pixel;',
					'	if (any(lessThan(vTexCoord, vec2(0.0))) || any(greaterThanEqual(vTexCoord, vec2(1.0)))) {',
					'		pixel = vec4(0.0);',
					'	} else {',
					'		pixel = texture2D(source, vTexCoord) * channels;',
					//'		if (gl_FragColor.a == 0.0) gl_FragColor.a = 1.0;',
					'	}',
					'	gl_FragColor = pixel;',
					'}'
				].join('\n');

				return shaderSource;
				*/
				if (shaders[sources.length]) {
					return shaders[sources.length];
				}

				for (i = 0; i < sources.length; i++) {
					varyings += 'varying vec2 vTexCoord' + i + ';\n';

					uniforms += 'uniform sampler2D source' + i + ';\n' +
						'uniform mat4 channels' + i + ';\n' +
						'uniform vec2 resolution' + i + ';\n\n';

					position += '    vTexCoord' + i + ' = (position.xy * resolution / resolution' + i + ') * 0.5 + 0.5;\n';

					samples += '    if (all(greaterThanEqual(vTexCoord' + i + ', vec2(0.0))) && all(lessThan(vTexCoord' + i + ', vec2(1.0)))) {\n' +
						'        gl_FragColor += texture2D(source' + i + ', vTexCoord' + i + ') * channels' + i + ';\n    }\n';
				}

				vert = [
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					uniforms,

					varyings,

					'void main(void) {',
					position,
					'	gl_Position = position;',
					'}\n'
				].join('\n');

				frag = [
					'precision mediump float;',

					varyings,
					uniforms,

					'void main(void) {',
					'	gl_FragColor = vec4(0.0);',
					samples,
					'}'
				].join('\n');

				shader = new Seriously.util.ShaderProgram(this.gl,
					vert,
					frag);

				shaders[sources.length] = shader;
				return shader;
			},
			/*
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				var i,
					source;

				options.clear = true;
				for (i = 0; i < sources.length; i++) {
				//for (i = sources.length - 1; i >= 0; i--) {
					uniforms.channels = matrices[i];
					source = sources[i];
					uniforms.source = sources[i];
					//uniforms.resolution[]

					draw(shader, model, uniforms, frameBuffer, null, options);
					options.clear = false;
				}
			},
			*/
			inputs: {
				sizeMode: {
					type: 'enum',
					defaultValue: 'red',
					options: [
						'red',
						'green',
						'blue',
						'alpha',
						'union',
						'intersection'
					],
					update: function () {
						this.resize();
					}
				},
				source: {
					type: 'image',
					update: updateSources,
					shaderDirty: true
				},
				redSource: {
					type: 'image',
					update: updateSources,
					shaderDirty: true
				},
				greenSource: {
					type: 'image',
					update: updateSources,
					shaderDirty: true
				},
				blueSource: {
					type: 'image',
					update: updateSources,
					shaderDirty: true
				},
				alphaSource: {
					type: 'image',
					update: updateSources,
					shaderDirty: true
				},
				red: {
					type: 'enum',
					options: channelOptions,
					validate: validateChannel,
					update: updateChannels,
					defaultValue: 0
				},
				green: {
					type: 'enum',
					options: channelOptions,
					validate: validateChannel,
					update: updateChannels,
					defaultValue: 1
				},
				blue: {
					type: 'enum',
					options: channelOptions,
					validate: validateChannel,
					update: updateChannels,
					defaultValue: 2
				},
				alpha: {
					type: 'enum',
					options: channelOptions,
					validate: validateChannel,
					update: updateChannels,
					defaultValue: 3
				}
			}
		};
	},
	{
		inPlace: false,
		title: 'Channel Mapping'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('checkerboard', function () {
		var me = this;

		function resize() {
			me.resize();
		}

		return {
			initialize: function (initialize) {
				initialize();
				resize();
			},
			shader: function (inputs, shaderSource) {
				shaderSource.vertex = [
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform mat4 transform;',

					'uniform vec2 size;',
					'uniform vec2 anchor;',

					'vec2 pixelCoord;', //based in center
					'varying vec2 vGridCoord;', //based in center

					'void main(void) {',
					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
					'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
					'	gl_Position.w = screenPosition.w;',

					'	pixelCoord = resolution * (texCoord - 0.5) / 2.0;',
					'	vGridCoord = (pixelCoord - anchor) / size;',
					'}\n'
				].join('\n');
				shaderSource.fragment = [
					'precision mediump float;',

					'varying vec2 vTexCoord;',
					'varying vec2 vPixelCoord;',
					'varying vec2 vGridCoord;',

					'uniform vec2 resolution;',
					'uniform vec2 anchor;',
					'uniform vec2 size;',
					'uniform vec4 color1;',
					'uniform vec4 color2;',


					'void main(void) {',
					'	vec2 modGridCoord = floor(mod(vGridCoord, 2.0));',
					'	if (modGridCoord.x == modGridCoord.y) {',
					'		gl_FragColor = color1;',
					'	} else  {',
					'		gl_FragColor = color2;',
					'	}',
					'}'
				].join('\n');
				return shaderSource;
			},
			inPlace: true,
			inputs: {
				anchor: {
					type: 'vector',
					uniform: 'anchor',
					dimensions: 2,
					defaultValue: [0, 0]
				},
				size: {
					type: 'vector',
					uniform: 'size',
					dimensions: 2,
					defaultValue: [4, 4]
				},
				color1: {
					type: 'color',
					uniform: 'color1',
					defaultValue: [1, 1, 1, 1]
				},
				color2: {
					type: 'color',
					uniform: 'color2',
					defaultValue: [187 / 255, 187 / 255, 187 / 255, 1]
				},
				width: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 640
				},
				height: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 360
				}
			},
		};
	}, {
		commonShader: true,
		title: 'Checkerboard',
		categories: ['generator']
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*
		experimental chroma key algorithm
		todo: try allowing some color despill on opaque pixels
		todo: add different modes?
	*/

	Seriously.plugin('chroma', {
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 transform;',

				'varying vec2 vTexCoord;',

				'uniform vec4 screen;',
				'uniform float balance;',
				'varying float screenSat;',
				'varying vec3 screenPrimary;',

				'void main(void) {',
				'	float fmin = min(min(screen.r, screen.g), screen.b);', //Min. value of RGB
				'	float fmax = max(max(screen.r, screen.g), screen.b);', //Max. value of RGB
				'	float secondaryComponents;',

				'	screenPrimary = step(fmax, screen.rgb);',
				'	secondaryComponents = dot(1.0 - screenPrimary, screen.rgb);',
				'	screenSat = fmax - mix(secondaryComponents - fmin, secondaryComponents / 2.0, balance);',

				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position = screenPosition;',
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	vTexCoord = texCoord;',
				'}'
			].join('\n');
			shaderSource.fragment = [
				this.inputs.mask ? '#define MASK' : '',
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec4 screen;',
				'uniform float screenWeight;',
				'uniform float balance;',
				'uniform float clipBlack;',
				'uniform float clipWhite;',
				'uniform bool mask;',

				'varying float screenSat;',
				'varying vec3 screenPrimary;',

				'void main(void) {',
				'	float pixelSat, secondaryComponents;',
				'	vec4 sourcePixel = texture2D(source, vTexCoord);',

				'	float fmin = min(min(sourcePixel.r, sourcePixel.g), sourcePixel.b);', //Min. value of RGB
				'	float fmax = max(max(sourcePixel.r, sourcePixel.g), sourcePixel.b);', //Max. value of RGB
				//	luminance = fmax

				'	vec3 pixelPrimary = step(fmax, sourcePixel.rgb);',

				'	secondaryComponents = dot(1.0 - pixelPrimary, sourcePixel.rgb);',
				'	pixelSat = fmax - mix(secondaryComponents - fmin, secondaryComponents / 2.0, balance);', // Saturation

				// solid pixel if primary color component is not the same as the screen color
				'	float diffPrimary = dot(abs(pixelPrimary - screenPrimary), vec3(1.0));',
				'	float solid = step(1.0, step(pixelSat, 0.1) + step(fmax, 0.1) + diffPrimary);',

				/*
				Semi-transparent pixel if the primary component matches but if saturation is less
				than that of screen color. Otherwise totally transparent
				*/
				'	float alpha = max(0.0, 1.0 - pixelSat / screenSat);',
				'	alpha = smoothstep(clipBlack, clipWhite, alpha);',
				'	vec4 semiTransparentPixel = vec4((sourcePixel.rgb - (1.0 - alpha) * screen.rgb * screenWeight) / max(0.00001, alpha), alpha);',

				'	vec4 pixel = mix(semiTransparentPixel, sourcePixel, solid);',

				/*
				Old branching code
				'	if (pixelSat < 0.1 || fmax < 0.1 || any(notEqual(pixelPrimary, screenPrimary))) {',
				'		pixel = sourcePixel;',

				'	} else if (pixelSat < screenSat) {',
				'		float alpha = max(0.0, 1.0 - pixelSat / screenSat);',
				'		alpha = smoothstep(clipBlack, clipWhite, alpha);',
				'		pixel = vec4((sourcePixel.rgb - (1.0 - alpha) * screen.rgb * screenWeight) / alpha, alpha);',
				'	}',
				//*/


				'#ifdef MASK',
				'	gl_FragColor = vec4(vec3(pixel.a), 1.0);',
				'#else',
				'	gl_FragColor = pixel;',
				'#endif',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			screen: {
				type: 'color',
				uniform: 'screen',
				defaultValue: [66 / 255, 195 / 255, 31 / 255, 1]
			},
			weight: {
				type: 'number',
				uniform: 'screenWeight',
				defaultValue: 1,
				min: 0
			},
			balance: {
				type: 'number',
				uniform: 'balance',
				defaultValue: 1,
				min: 0,
				max: 1
			},
			clipBlack: {
				type: 'number',
				uniform: 'clipBlack',
				defaultValue: 0,
				min: 0,
				max: 1
			},
			clipWhite: {
				type: 'number',
				uniform: 'clipWhite',
				defaultValue: 1,
				min: 0,
				max: 1
			},
			mask: {
				type: 'boolean',
				defaultValue: false,
				uniform: 'mask',
				shaderDirty: true
			}
		},
		title: 'Chroma Key',
		description: ''
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('color', function () {
		var me = this,
			drawOpts = {
				width: 1,
				height: 1
			},
			colorDirty = true;

		function resize() {
			me.resize();
		}

		/*
		Similar to the EffectNode prototype resize method, but does not resize the FrameBuffer
		*/
		this.resize = function () {
			var width,
				height,
				i,
				target;

			if (this.inputs && this.inputs.width) {
				width = this.inputs.width;
				height = this.inputs.height || width;
			} else if (this.inputs && this.inputs.height) {
				width = height = this.inputs.height;
			} else {
				width = 1;
				height = 1;
			}

			width = Math.floor(width);
			height = Math.floor(height);

			if (this.width !== width || this.height !== height) {
				this.width = width;
				this.height = height;

				this.emit('resize');
				this.setDirty();
			}

			for (i = 0; i < this.targets.length; i++) {
				target = this.targets[i];
				target.resize();
				if (target.setTransformDirty) {
					target.setTransformDirty();
				}
			}
		};

		return {
			initialize: function (initialize) {
				/*
				No reason to use anything bigger than 1x1, since it's a single color.
				This should make look-ups on this texture very fast
				*/
				this.frameBuffer = new Seriously.util.FrameBuffer(this.gl, 1, 1);
				resize();
				colorDirty = true;
			},
			commonShader: true,
			shader: function(inputs, shaderSource) {
				shaderSource.vertex = [
					'precision mediump float;',

					'attribute vec4 position;',

					'void main(void) {',
					'	gl_Position = position;',
					'}\n'
				].join('\n');
				shaderSource.fragment = [
					'precision mediump float;\n',

					'uniform vec4 color;',

					'void main(void) {',
					'	gl_FragColor = color;',
					'}'
				].join('\n');
				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				/*
				Node will be dirty if size changes, but we only need to redraw if
				the color changes...not that it matters much, since we're only drawing
				a single pixel.
				*/
				if (colorDirty) {
					draw(shader, model, uniforms, frameBuffer, null, drawOpts);
					colorDirty = false;
				}
			},
			inPlace: true,
			inputs: {
				color: {
					type: 'color',
					uniform: 'color',
					defaultValue: [0, 0, 0, 1],
					update: function () {
						colorDirty = true;
					}
				},
				width: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 640
				},
				height: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 360
				}
			},
		};
	}, {
		title: 'Color',
		description: 'Generate color',
		categories: ['generator']
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('colorcomplements', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec4 guideColor;',
				'uniform float correlation;',
				'uniform float amount;',
				'uniform float concentration;',

				'float hueLerp(float h1, float h2, float v) {',
				'	float d = abs(h1 - h2);',
				'	if (d <= 0.5) {',
				'		return mix(h1, h2, v);',
				'	} else if (h1 < h2) {',
				'		return fract(mix((h1 + 1.0), h2, v));',
				'	} else {',
				'		return fract(mix(h1, (h2 + 1.0), v));',
				'	}',
				'}',

				//conversion functions borrowed from http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
				'vec3 rgbToHsv(vec3 c) {',
				'	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);',
				'	vec4 p = c.g < c.b ? vec4(c.bg, K.wz) : vec4(c.gb, K.xy);',
				'	vec4 q = c.r < p.x ? vec4(p.xyw, c.r) : vec4(c.r, p.yzx);',

				'	float d = q.x - min(q.w, q.y);',
				'	float e = 1.0e-10;',
				'	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);',
				'}',

				'vec3 hsvToRgb(vec3 c) {',
				'	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);',
				'	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);',
				'	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);',
				'}',

				'vec3 hsvComplement(vec3 hsv) {',
				'	vec3 compl = hsv;',
				'	compl.x = mod(compl.x - 0.5, 1.0);',
				'	return compl;',
				'}',

				'void main(void) {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	vec3 hsv = rgbToHsv(pixel.rgb);',
				'	vec3 hsvPole1 = rgbToHsv(guideColor.rgb);',
				'	vec3 hsvPole2 = hsvPole1;',
				'	hsvPole2 = hsvComplement(hsvPole1);',
				'	float dist1 = abs(hsv.x - hsvPole1.x);',
				'	dist1 = dist1 > 0.5 ? 1.0 - dist1 : dist1;',
				'	float dist2 = abs(hsv.x - hsvPole2.x);',
				'	dist2 = dist2 > 0.5 ? 1.0 - dist2 : dist2;',

				'	float descent = smoothstep(0.0, correlation, hsv.y);',
				'	vec3 outputHsv = hsv;',
				'	vec3 pole = dist1 < dist2 ? hsvPole1 : hsvPole2;',
				'	float dist = min(dist1, dist2);',
				'	float c = descent * amount * (1.0 - pow((dist * 2.0), 1.0 / concentration));',
				'	outputHsv.x = hueLerp(hsv.x, pole.x, c);',
				'	outputHsv.y = mix(hsv.y, pole.y, c);',

				'	gl_FragColor = vec4(hsvToRgb(outputHsv), pixel.a);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				min: 0,
				max: 1,
				defaultValue: 0.8
			},
			concentration: {
				type: 'number',
				uniform: 'concentration',
				min: 0.1,
				max: 4,
				defaultValue: 2
			},
			correlation: {
				type: 'number',
				uniform: 'correlation',
				min: 0,
				max: 1,
				defaultValue: 0.5
			},
			guideColor: {
				type: 'color',
				uniform: 'guideColor',
				defaultValue: [1, 0.5, 0, 1]
			}
		},
		title: 'Color Complements',
		categories: ['color'],
		description: 'http://theabyssgazes.blogspot.com/2010/03/teal-and-orange-hollywood-please-stop.html'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	//based on tutorial by to Gregg Tavares 
	//http://www.youtube.com/watch?v=rfQ8rKGTVlg&t=24m30s
	//todo: find a way to not invert every single texture

	Seriously.plugin('colorcube', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'uniform sampler2D source;',
				'uniform sampler2D colorCube;',
				'varying vec2 vTexCoord;',

				'vec3 sampleAs3DTexture(sampler2D tex, vec3 coord, float size) {',
				'	float sliceSize = 1.0 / size;', // space of 1 slice
				'	float slicePixelSize = sliceSize / size;', // space of 1 pixel
				'	float sliceInnerSize = slicePixelSize * (size - 1.0);', // space of size pixels
				'	float zSlice0 = min(floor(coord.z * size), size - 1.0);',
				'	float zSlice1 = min(zSlice0 + 1.0, size - 1.0);',
				'	float xOffset = slicePixelSize * 0.5 + coord.x * sliceInnerSize;',
				'	float s0 = xOffset + (zSlice0 * sliceSize);',
				'	float s1 = xOffset + (zSlice1 * sliceSize);',
				'	vec3 slice0Color = texture2D(tex, vec2(s0, 1.0 - coord.y)).rgb;',
				'	vec3 slice1Color = texture2D(tex, vec2(s1, 1.0 - coord.y)).rgb;',
				'	float zOffset = mod(coord.z * size, 1.0);',
				'	return mix(slice0Color, slice1Color, zOffset);',
				'}',

				'void main(void) {',
				'	vec4 originalColor = texture2D(source, vTexCoord);',
				'	vec3 color = sampleAs3DTexture(colorCube, originalColor.rgb, 8.0);',
				'	gl_FragColor = vec4(color, originalColor.a);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			cube: {
				type: 'image',
				uniform: 'colorCube'
			}
		},
		title: 'Color Cube',
		description: ''
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('color-select', {
		shader: function(inputs, shaderSource, utilities) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 transform;',

				'uniform float hueMin;',
				'uniform float hueMax;',
				'uniform float hueMinFalloff;',
				'uniform float hueMaxFalloff;',
				'uniform float saturationMin;',
				'uniform float saturationMax;',
				'uniform float saturationMinFalloff;',
				'uniform float saturationMaxFalloff;',
				'uniform float lightnessMin;',
				'uniform float lightnessMax;',
				'uniform float lightnessMinFalloff;',
				'uniform float lightnessMaxFalloff;',

				'varying vec2 vTexCoord;',
				'varying vec4 adjustedHueRange;',
				'varying vec4 saturationRange;',
				'varying vec4 lightnessRange;',

				'void main(void) {',
				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	gl_Position.w = screenPosition.w;',
				'	vTexCoord = texCoord;',

				'	float hueOffset = hueMin - hueMinFalloff;',
				'	adjustedHueRange = mod(vec4(' +
						'hueOffset, ' +
						'hueMin - hueOffset, ' +
						'hueMax - hueOffset, ' +
						'hueMax + hueMaxFalloff - hueOffset' +
					'), 360.0);',
				'	if (hueMin != hueMax) {',
				'		if (adjustedHueRange.z == 0.0) {',
				'			adjustedHueRange.z = 360.0;',
				'			adjustedHueRange.w += 360.0;',
				'		} else if (adjustedHueRange.w == 0.0) {',
				'			adjustedHueRange.w += 360.0;',
				'		}',
				'	}',
				'	saturationRange = vec4(' +
						'saturationMin - saturationMinFalloff, ' +
						'saturationMin, ' +
						'saturationMax, ' +
						'saturationMax + saturationMaxFalloff ' +
					');',

				'	lightnessRange = vec4(' +
						'lightnessMin - lightnessMinFalloff, ' +
						'lightnessMin, ' +
						'lightnessMax, ' +
						'lightnessMax + lightnessMaxFalloff ' +
					');',
				'}'
			].join('\n');

			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform bool mask;',

				'varying vec4 adjustedHueRange;',
				'varying vec4 saturationRange;',
				'varying vec4 lightnessRange;',

				'vec3 calcHSL(vec3 c) {',
				'	float minColor = min(c.r, min(c.g, c.b));',
				'	float maxColor = max(c.r, max(c.g, c.b));',
				'	float delta = maxColor - minColor;',
				'	vec3 hsl = vec3(0.0, 0.0, (maxColor + minColor) / 2.0);',
				'	if (delta > 0.0) {',
				'		if (hsl.z < 0.5) {',
				'			hsl.y = delta / (maxColor + minColor);',
				'		} else {',
				'			hsl.y = delta / (2.0 - maxColor - minColor);',
				'		}',
				'		if (c.r == maxColor) {',
				'			hsl.x = (c.g - c.b) / delta;',
				'		} else if (c.g == maxColor) {',
				'			hsl.x = 2.0 + (c.b - c.r) / delta;',
				'		} else {',
				'			hsl.x = 4.0 + (c.r - c.g) / delta;',
				'		}',
				'		hsl.x = hsl.x * 360.0 / 6.0;',
				'		if (hsl.x < 0.0) {',
				'			hsl.x += 360.0;',
				'		} else {',
				'			hsl.x = mod(hsl.x, 360.0);',
				'		}',
				'	}',
				'	return hsl;',
				'}',

				'void main(void) {',
				'	vec4 color = texture2D(source, vTexCoord);',
				'	vec3 hsl = calcHSL(color.rgb);',
				'	float adjustedHue = mod(hsl.x - adjustedHueRange.x, 360.0);',

				// calculate hue mask
				'	float maskValue;',
				'	if (adjustedHue < adjustedHueRange.y) {',
				'		maskValue = smoothstep(0.0, adjustedHueRange.y, adjustedHue);',
				'	} else if (adjustedHue < adjustedHueRange.z) {',
				'		maskValue = 1.0;',
				'	} else {',
				'		maskValue = 1.0 - smoothstep(adjustedHueRange.z, adjustedHueRange.w, adjustedHue);',
				'	}',

				// calculate saturation maskValue
				'	if (maskValue > 0.0) {',
				'		if (hsl.y < saturationRange.y) {',
				'			maskValue = min(maskValue, smoothstep(saturationRange.x, saturationRange.y, hsl.y));',
				'		} else {',
				'			maskValue = min(maskValue, 1.0 - smoothstep(saturationRange.z, saturationRange.w, hsl.y));',
				'		}',
				'	}',

				// calculate lightness maskValue
				'	if (maskValue > 0.0) {',
				'		if (hsl.z < lightnessRange.y) {',
				'			maskValue = min(maskValue, smoothstep(lightnessRange.x, lightnessRange.z, hsl.y));',
				'		} else {',
				'			maskValue = min(maskValue, 1.0 - smoothstep(lightnessRange.z, lightnessRange.w, hsl.z));',
				'		}',
				'	}',

				'	if (mask) {',
				'		gl_FragColor = vec4(maskValue, maskValue, maskValue, 1.0);',
				'	} else {',
				'		color.a = min(color.a, maskValue);',
				'		gl_FragColor = color;',
				'	}',
				'}'
			].join('\n');

			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			hueMin: {
				type: 'number',
				uniform: 'hueMin',
				defaultValue: 0
			},
			hueMax: {
				type: 'number',
				uniform: 'hueMax',
				defaultValue: 360
			},
			hueMinFalloff: {
				type: 'number',
				uniform: 'hueMinFalloff',
				defaultValue: 0,
				min: 0
			},
			hueMaxFalloff: {
				type: 'number',
				uniform: 'hueMaxFalloff',
				defaultValue: 0,
				min: 0
			},
			saturationMin: {
				type: 'number',
				uniform: 'saturationMin',
				defaultValue: 0,
				min: 0,
				max: 1
			},
			saturationMax: {
				type: 'number',
				uniform: 'saturationMax',
				defaultValue: 1,
				min: 0,
				max: 1
			},
			saturationMinFalloff: {
				type: 'number',
				uniform: 'saturationMinFalloff',
				defaultValue: 0,
				min: 0
			},
			saturationMaxFalloff: {
				type: 'number',
				uniform: 'saturationMaxFalloff',
				defaultValue: 0,
				min: 0
			},
			lightnessMin: {
				type: 'number',
				uniform: 'lightnessMin',
				defaultValue: 0,
				min: 0,
				max: 1
			},
			lightnessMax: {
				type: 'number',
				uniform: 'lightnessMax',
				defaultValue: 1,
				min: 0,
				max: 1
			},
			lightnessMinFalloff: {
				type: 'number',
				uniform: 'lightnessMinFalloff',
				defaultValue: 0,
				min: 0
			},
			lightnessMaxFalloff: {
				type: 'number',
				uniform: 'lightnessMaxFalloff',
				defaultValue: 0,
				min: 0
			},
			mask: {
				type: 'boolean',
				defaultValue: false,
				uniform: 'mask'
			}
		},
		title: 'Color Select',
		description: 'Create a mask by hue, saturation and lightness range.'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('crop', function () {
		var me = this;

		// custom resize method
		function resize() {
			var width = 1,
				height = 1,
				source = me.inputs.source,
				target,
				i;

			if (me.source) {
				width = me.source.width;
				height = me.source.height;
			} else if (me.sources && me.sources.source) {
				width = me.sources.source.width;
				height = me.sources.source.height;
			}

			width = width - me.inputs.left - me.inputs.right;
			height = height - me.inputs.top - me.inputs.bottom;

			width = Math.max(1, Math.floor(width));
			height = Math.max(1, Math.floor(height));


			if (me.width !== width || me.height !== height) {
				me.width = width;
				me.height = height;

				me.uniforms.resolution[0] = width;
				me.uniforms.resolution[1] = height;

				if (me.frameBuffer) {
					me.frameBuffer.resize(me.width, me.height);
				}

				me.emit('resize');
				me.setDirty();
			}

			for (i = 0; i < me.targets.length; i++) {
				target = me.targets[i];
				target.resize();
				if (target.setTransformDirty) {
					target.setTransformDirty();
				}
			}
		}

		me.resize = resize;

		return {
			commonShader: true,
			shader: function (inputs, shaderSource) {
				shaderSource.vertex = [
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform mat4 transform;',

					'uniform float top;',
					'uniform float left;',
					'uniform float bottom;',
					'uniform float right;',

					'varying vec2 vTexCoord;',

					'const vec2 ZERO = vec2(0.0);',
					'const vec2 ONE = vec2(1.0);',

					'void main(void) {',
					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
					'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
					'	gl_Position.w = screenPosition.w;',

					'	vec2 dim = resolution + vec2(right + left, bottom + top);',
					'	vec2 scale = dim / resolution;',
					'	vec2 offset = vec2(left, bottom) / resolution;',

					'	vTexCoord = max(ZERO, (texCoord + offset) / scale);',
					'}\n'
				].join('\n');
				return shaderSource;
			},
			inputs: {
				source: {
					type: 'image',
					uniform: 'source',
					update: resize
				},
				top: {
					type: 'number',
					uniform: 'top',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 0
				},
				left: {
					type: 'number',
					uniform: 'left',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 0
				},
				bottom: {
					type: 'number',
					uniform: 'bottom',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 0
				},
				right: {
					type: 'number',
					uniform: 'right',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 0
				}
			}
		};
	},
	{
		inPlace: true,
		title: 'Crop'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		var Seriously = root.Seriously;
		if (!Seriously) {
			Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(Seriously);
	}
}(this, function (Seriously) {
	'use strict';

//todo: add Simulate mode http://mudcu.be/labs/Color/Vision/Javascript/Color.Vision.Simulate.js

/*
* Daltonization algorithm from:
* Digital Video Colourmaps for Checking the Legibility of Displays by Dichromats
* http://vision.psychol.cam.ac.uk/jdmollon/papers/colourmaps.pdf
*
* JavaScript implementation:
* http://mudcu.be/labs/Color/Vision/Javascript/Color.Vision.Daltonize.js
*
* Copyright (c) 2013 David Lewis, British Broadcasting Corporation
* (http://www.bbc.co.uk)
*
* MIT Licence:
* Permission is hereby granted, free of charge, to any person obtaining
* a copy of this software and associated documentation files (the
* "Software"), to deal in the Software without restriction, including
* without limitation the rights to use, copy, modify, merge, publish,
* distribute, sublicense, and/or sell copies of the Software, and to
* permit persons to whom the Software is furnished to do so, subject to
* the following conditions:

* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.

* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
* LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
* OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
* WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
* 
	*/
	Seriously.plugin('daltonize', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			//Vertex shader
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec3 position;',
				'attribute vec2 texCoord;',

				'uniform mat4 transform;',

				'varying vec2 vTexCoord;',

				'void main(void) {',
				'	gl_Position = transform * vec4(position, 1.0);',
				'	vTexCoord = vec2(texCoord.s, texCoord.t);',
				'}'
			].join('\n');
			//Fragment shader
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float cbtype;',

				'void main(void) {',
				'	vec4 color = texture2D(source, vTexCoord);',

				//No change, skip the rest
				'	if (cbtype == 0.0) {',
				'		gl_FragColor = color;',
				'		return;',
				'	}',

				// RGB to LMS matrix conversion
				'	const mat3 RGBLMS = mat3( ' +
				'		17.8824, 43.5161, 4.11935,' +
				'		3.45565, 27.1554, 3.86714,' +
				'		0.0299566, 0.184309, 1.46709' +
				'	);',
				'	vec3 LMS = color.rgb * RGBLMS;',

				'	vec3 lms = vec3(0.0,0.0,0.0);',
				//Protanope
				'	if (cbtype < 0.33) {',
				'		lms = vec3(	' +
				'			(2.02344 * LMS.g) + (-2.52581 * LMS.b),' +
				'			LMS.g,' +
				'			LMS.b' +
				'		);',
				'	}',
				//Deuteranope
				'	if (cbtype > 0.33 && cbtype < 0.66) {',
				'		lms = vec3(	' +
				'			LMS.r,' +
				'			(0.494207 * LMS.r) + (1.24827 * LMS.b),' +
				'			LMS.b' +
				'		);',
				'	}',
				//Tritanope
				'	if (cbtype > 0.66) {',
				'		lms = vec3(	' +
				'			LMS.r,' +
				'			LMS.g,' +
				'			(-0.395913 * LMS.r) + (0.801109 * LMS.g)' +
				'		);',
				'	}',

				// LMS to RGB matrix operation
				'	const mat3 LMSRGB = mat3(    ' +
				'		0.0809444479, -0.130504409, 0.116721066,' +
				'		-0.0102485335, 0.0540193266, -0.113614708,' +
				'		-0.000365296938, -0.00412161469, 0.693511405' +
				'	);',

				'	vec3 RGB = lms * LMSRGB;',

				// Colour shift
				// values may go over 1.0 but will get automatically clamped on output	
				'	RGB.rgb = color.rgb - RGB.rgb;',
				'	RGB.g = 0.7*RGB.r + RGB.g;',
				'	RGB.b = 0.7*RGB.r + RGB.b;',
				'	color.rgb = color.rgb + RGB.rgb;',

				//Output
				'	gl_FragColor = color;',

				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			type: {
				title: 'Type',
				type: 'enum',
				uniform: 'cbtype',
				defaultValue: '0.2',
				options: [
					['0.0', 'Off'],
					['0.2', 'Protanope'],
					['0.6', 'Deuteranope'],
					['0.8', 'Tritanope']
				]
			}
		},
		title: 'Daltonize',
		description: 'Add contrast to colours to assist CVD (colour-blind) users.'
	});
}));
/* global define, require */
/*
Directional Motion Blur

Adapted from v002 by Anton Marini and Tom Butterworth
* Copyright vade - Anton Marini
* Creative Commons, Attribution - Non Commercial - Share Alike 3.0

http://v002.info/plugins/v002-blurs/
*/
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	var passes = [0.2, 0.3, 0.5, 0.8],
		identity = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]);

	Seriously.plugin('directionblur', function (options) {
		var fbs,
			baseShader,
			loopUniforms = {
				amount: 0,
				angle: 0,
				inputScale: 1,
				resolution: [this.width, this.height],
				transform: identity,
				projection: new Float32Array([
					1, 0, 0, 0,
					0, 1, 0, 0,
					0, 0, 1, 0,
					0, 0, 0, 1
				])
			};

		return {
			initialize: function (parent) {
				var gl;

				parent();

				gl = this.gl;

				if (!gl) {
					return;
				}

				fbs = [
					new Seriously.util.FrameBuffer(gl, this.width, this.height),
					new Seriously.util.FrameBuffer(gl, this.width, this.height)
				];
			},
			commonShader: true,
			shader: function (inputs, shaderSource) {
				var gl = this.gl,
					/*
					Some devices or browsers (e.g. IE11 preview) don't support enough
					varying vectors, so we need to fallback to a less efficient method
					*/
					maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS),
					defineVaryings = (maxVaryings >= 10 ? '#define USE_VARYINGS' : '');

				baseShader = this.baseShader;

				shaderSource.vertex = [
					defineVaryings,
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform mat4 projection;',
					'uniform mat4 transform;',

					'varying vec2 vTexCoord;',

					'uniform float angle;',
					'uniform float amount;',
					'uniform float inputScale;',

					'const vec2 zero = vec2(0.0, 0.0);',
					'#ifdef USE_VARYINGS',
					'vec2 one;',
					'vec2 amount1;',
					'varying vec2 vTexCoord1;',
					'varying vec2 vTexCoord2;',
					'varying vec2 vTexCoord3;',
					'varying vec2 vTexCoord4;',
					'varying vec2 vTexCoord5;',
					'varying vec2 vTexCoord6;',
					'varying vec2 vTexCoord7;',
					'varying vec2 vTexCoord8;',
					'#else',
					'varying vec2 one;',
					'varying vec2 amount1;',
					'#endif',

					'void main(void) {',
					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
					'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position = screenPosition;',
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
					'	vTexCoord = texCoord;',

					'	one = vec2(1.0, 1.0) * inputScale;',
					'	if (inputScale < 1.0) {',
					'		one -= 1.0 / resolution;',
					'	}',
					'	vTexCoord = max(zero, min(one, texCoord.st * inputScale));',
					'	amount1 = vec2(cos(angle), sin(angle)) * amount * 5.0 / resolution;',

					'#ifdef USE_VARYINGS',
					'	vec2 amount2 = amount1 * 3.0;',
					'	vec2 amount3 = amount1 * 6.0;',
					'	vec2 amount4 = amount1 * 9.0;',
					'	vec2 amount5 = -amount1;',
					'	vec2 amount6 = amount5 * 3.0;',
					'	vec2 amount7 = amount5 * 6.0;',
					'	vec2 amount8 = amount5 * 9.0;',
					'	vTexCoord1 = max(zero, min(one, vTexCoord + amount1));',
					'	vTexCoord2 = max(zero, min(one, vTexCoord + amount2));',
					'	vTexCoord3 = max(zero, min(one, vTexCoord + amount3));',
					'	vTexCoord4 = max(zero, min(one, vTexCoord + amount4));',
					'	vTexCoord5 = max(zero, min(one, vTexCoord + amount5));',
					'	vTexCoord6 = max(zero, min(one, vTexCoord + amount6));',
					'	vTexCoord7 = max(zero, min(one, vTexCoord + amount7));',
					'	vTexCoord8 = max(zero, min(one, vTexCoord + amount8));',
					'#endif',
					'}'
				].join('\n');
				shaderSource.fragment = [
					defineVaryings,

					'precision mediump float;\n',

					'varying vec2 vTexCoord;',

					'uniform sampler2D source;',
					'uniform float angle;',
					'uniform float amount;',
					'uniform float inputScale;',

					'#ifdef USE_VARYINGS',
					'varying vec2 vTexCoord1;',
					'varying vec2 vTexCoord2;',
					'varying vec2 vTexCoord3;',
					'varying vec2 vTexCoord4;',
					'varying vec2 vTexCoord5;',
					'varying vec2 vTexCoord6;',
					'varying vec2 vTexCoord7;',
					'varying vec2 vTexCoord8;',
					'#else',
					'varying vec2 amount1;',
					'varying vec2 one;',
					'const vec2 zero = vec2(0.0, 0.0);',
					'#endif',

					'void main(void) {',
					'#ifndef USE_VARYINGS',
					'	vec2 vTexCoord1 = max(zero, min(one, vTexCoord + amount1));',
					'	vec2 vTexCoord2 = max(zero, min(one, vTexCoord + amount1 * 3.0));',
					'	vec2 vTexCoord3 = max(zero, min(one, vTexCoord + amount1 * 6.0));',
					'	vec2 vTexCoord4 = max(zero, min(one, vTexCoord + amount1 * 9.0));',
					'	vec2 vTexCoord5 = max(zero, min(one, vTexCoord - amount1));',
					'	vec2 vTexCoord6 = max(zero, min(one, vTexCoord - amount1 * 3.0));',
					'	vec2 vTexCoord7 = max(zero, min(one, vTexCoord - amount1 * 6.0));',
					'	vec2 vTexCoord8 = max(zero, min(one, vTexCoord - amount1 * 9.0));',
					'#endif',
					'	gl_FragColor = texture2D(source, vTexCoord) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord1) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord2) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord3) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord4) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord5) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord6) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord7) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord8) / 9.0;',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				var i,
					fb,
					pass,
					amount,
					width,
					height,
					opts = {
						width: 0,
						height: 0,
						blend: false
					},
					previousPass = 1;

				amount = this.inputs.amount;
				if (!amount) {
					parent(baseShader, model, uniforms, frameBuffer);
					return;
				}

				if (amount <= 0.01) {
					parent(shader, model, uniforms, frameBuffer);
					return;
				}

				loopUniforms.amount = amount;
				loopUniforms.angle = this.inputs.angle;
				loopUniforms.projection[0] = this.height / this.width;

				for (i = 0; i < passes.length; i++) {
					pass = Math.min(1, passes[i] / amount);
					width = Math.floor(pass * this.width);
					height = Math.floor(pass * this.height);

					loopUniforms.source = fb ? fb.texture : this.inputs.source.texture;

					fb = fbs[i % 2];
					loopUniforms.inputScale = previousPass;//pass;
					previousPass = pass;
					opts.width = width;
					opts.height = height;

					parent(shader, model, loopUniforms, fb.frameBuffer, null, opts);
				}

				loopUniforms.source = fb.texture;
				loopUniforms.inputScale = previousPass;
				parent(shader, model, loopUniforms, frameBuffer);
			},
			resize: function () {
				loopUniforms.resolution[0] = this.width;
				loopUniforms.resolution[1] = this.height;
				if (fbs) {
					fbs[0].resize(this.width, this.height);
					fbs[1].resize(this.width, this.height);
				}
			},
			destroy: function () {
				if (fbs) {
					fbs[0].destroy();
					fbs[1].destroy();
					fbs = null;
				}

				if (baseShader) {
					baseShader.destroy();
				}

				loopUniforms = null;
			}
		};
	},
	{
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 0.4,
				min: 0,
				max: 1
			},
			angle: {
				type: 'number',
				uniform: 'angle',
				defaultValue: 0
			}
		},
		title: 'Directional Motion Blur'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	var fillModes = {
		wrap: 'pos = mod(pos, 1.0);',
		clamp: 'pos = min(max(pos, 0.0), 1.0);',
		ignore: 'pos = texCoordSource;',
		color: 'gl_FragColor = color;\n\treturn;'
	},
	channelVectors = {
		none: [0, 0, 0, 0],
		red: [1, 0, 0, 0],
		green: [0, 1, 0, 0],
		blue: [0, 0, 1, 0],
		alpha: [0, 0, 0, 1],
		luma: [0.2125, 0.7154, 0.0721, 0],
		lightness: [1 / 3, 1 / 3, 1 / 3, 0]
	};

	Seriously.plugin('displacement', function () {
		this.uniforms.resMap = [1, 1];
		this.uniforms.resSource = [1, 1];
		this.uniforms.xVector = channelVectors.red;
		this.uniforms.yVector = channelVectors.green;

		return {
			shader: function (inputs, shaderSource) {
				var fillMode = fillModes[inputs.fillMode];

					shaderSource.vertex = [
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform vec2 resSource;',
					'uniform vec2 resMap;',

					'varying vec2 texCoordSource;',
					'varying vec2 texCoordMap;',

					'const vec2 HALF = vec2(0.5);',

					'void main(void) {',
					//we don't need to do a transform in this shader, since this effect is not "inPlace"
					'	gl_Position = position;',

					'	vec2 adjusted = (texCoord - HALF) * resolution;',

					'	texCoordSource = adjusted / resSource + HALF;',
					'	texCoordMap = adjusted / resMap + HALF;',
					'}'
				].join('\n');

				shaderSource.fragment = [
					'precision mediump float;\n',

					'varying vec2 texCoordSource;',
					'varying vec2 texCoordMap;',

					'uniform sampler2D source;',
					'uniform sampler2D map;',

					'uniform float amount;',
					'uniform float offset;',
					'uniform vec2 mapScale;',
					'uniform vec4 color;',
					'uniform vec4 xVector;',
					'uniform vec4 yVector;',

					'void main(void) {',
					'	vec4 mapPixel = texture2D(map, texCoordMap);',
					'	vec2 mapVector = vec2(dot(mapPixel, xVector), dot(mapPixel, yVector));',
					'	vec2 pos = texCoordSource + (mapVector.xy - offset) * mapScale * amount;',

					'	if (pos.x < 0.0 || pos.x > 1.0 || pos.y < 0.0 || pos.y > 1.0) {',
					'		' + fillMode,
					'	}',

					'	gl_FragColor = texture2D(source, pos);',
					'}'
				].join('\n');

				return shaderSource;
			},
			requires: function (sourceName) {
				if (!this.inputs.mapScale && sourceName === 'map') {
					return false;
				}
				return true;
			},
			resize: function () {
				var source = this.inputs.source,
					map = this.inputs.map;

				if (source) {
					this.uniforms.resSource[0] = source.width;
					this.uniforms.resSource[1] = source.height;
				} else {
					this.uniforms.resSource[0] = 1;
					this.uniforms.resSource[1] = 1;
				}

				if (map) {
					this.uniforms.resMap[0] = map.width;
					this.uniforms.resMap[1] = map.height;
				} else {
					this.uniforms.resMap[0] = 1;
					this.uniforms.resMap[1] = 1;
				}
			}
		};
	},
	{
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			map: {
				type: 'image',
				uniform: 'map'
			},
			xChannel: {
				type: 'enum',
				defaultValue: 'red',
				options: [
					'red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none'
				],
				update: function (val) {
					this.uniforms.xVector = channelVectors[val];
				}
			},
			yChannel: {
				type: 'enum',
				defaultValue: 'green',
				options: [
					'red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none'
				],
				update: function (val) {
					this.uniforms.yVector = channelVectors[val];
				}
			},
			fillMode: {
				type: 'enum',
				shaderDirty: true,
				defaultValue: 'color',
				options: [
					'color', 'wrap', 'clamp', 'ignore'
				]
			},
			color: {
				type: 'color',
				uniform: 'color',
				defaultValue: [0, 0, 0, 0]
			},
			offset: {
				type: 'number',
				uniform: 'offset',
				defaultValue: 0.5
			},
			mapScale: {
				type: 'vector',
				dimensions: 2,
				uniform: 'mapScale',
				defaultValue: [1, 1],
				updateSources: true
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 1
			}
		},
		title: 'Displacement Map',
		description: ''
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*
	Shader code:
	Adapted from a blog post by Martin Upitis
	http://devlog-martinsh.blogspot.com.es/2011/03/glsl-dithering.html
	*/

	Seriously.plugin('dither', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'#define mod4(a) (a >= 4 ? a - 4 : a)',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec2 resolution;',

				'const mat4 dither = mat4(' +
					'1.0, 33.0, 9.0, 41.0,' +
					'49.0, 17.0, 57.0, 25.0,' +
					'13.0, 45.0, 5.0, 37.0,' +
					'61.0, 29.0, 53.0, 21.0' +
				');',

				'float find_closest(int x, int y, float c0) {',
				'	float limit = 0.0;',
				'	int x4 = mod4(x);',
				'	int y4 = mod4(y);',
				//annoying hack since GLSL ES doesn't support variable array index
				'	for (int i = 0; i < 4; i++) {',
				'		if (i == x4) {',
				'			for (int j = 0; j < 4; j++) {',
				'				if (j == y4) {',
				'					limit = dither[i][j];',
				'					break;',
				'				}',
				'			}',
				'		}',
				'	}',
				'	if (x < 4) {',
				'		if (y >= 4) {',
				'			limit += 3.0;',
				'		}',
				'	} else {',
				'		if (y >= 4) {',
				'			limit += 1.0;',
				'		} else {',
				'			limit += 2.0;',
				'		}',
				'	}',
				'	limit /= 65.0;',
				'	return c0 < limit ? 0.0 : 1.0;',
				'}',

				'void main (void)  {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	vec2 coord = vTexCoord * resolution;',
				'	int x = int(mod(coord.x, 8.0));',
				'	int y = int(mod(coord.y, 8.0));',
				'	pixel.r = find_closest(x, y, pixel.r);',
				'	pixel.g = find_closest(x, y, pixel.g);',
				'	pixel.b = find_closest(x, y, pixel.b);',
				'	gl_FragColor = pixel;',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			}
		},
		title: 'Dither'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	//	Adapted from http://rastergrid.com/blog/2011/01/frei-chen-edge-detector/
	var sqrt = Math.sqrt,
		i, j,
		flatMatrices = [],
		matrices,
		freiChenMatrixConstants,
		sobelMatrixConstants;

	//initialize shader matrix arrays
	function multiplyArray(factor, a) {
		var i;
		for (i = 0; i < a.length; i++) {
			a[i] *= factor;
		}
		return a;
	}

	matrices = [
		multiplyArray(1.0 / (2.0 * sqrt(2.0)), [ 1.0, sqrt(2.0), 1.0, 0.0, 0.0, 0.0, -1.0, -sqrt(2.0), -1.0 ]),
		multiplyArray(1.0 / (2.0 * sqrt(2.0)), [1.0, 0.0, -1.0, sqrt(2.0), 0.0, -sqrt(2.0), 1.0, 0.0, -1.0]),
		multiplyArray(1.0 / (2.0 * sqrt(2.0)), [0.0, -1.0, sqrt(2.0), 1.0, 0.0, -1.0, -sqrt(2.0), 1.0, 0.0]),
		multiplyArray(1.0 / (2.0 * sqrt(2.0)), [sqrt(2.0), -1.0, 0.0, -1.0, 0.0, 1.0, 0.0, 1.0, -sqrt(2.0)]),
		multiplyArray(1.0 / 2.0, [0.0, 1.0, 0.0, -1.0, 0.0, -1.0, 0.0, 1.0, 0.0]),
		multiplyArray(1.0 / 2.0, [-1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, -1.0]),
		multiplyArray(1.0 / 6.0, [1.0, -2.0, 1.0, -2.0, 4.0, -2.0, 1.0, -2.0, 1.0]),
		multiplyArray(1.0 / 6.0, [-2.0, 1.0, -2.0, 1.0, 4.0, 1.0, -2.0, 1.0, -2.0]),
		multiplyArray(1.0 / 3.0, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0])
	];

	for (i = 0; i < matrices.length; i++) {
		for (j = 0; j < matrices[i].length; j++) {
			flatMatrices.push(matrices[i][j]);
		}
	}

	freiChenMatrixConstants = new Float32Array(flatMatrices);

	sobelMatrixConstants = new Float32Array([
		1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0,
		1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0
	]);

	Seriously.plugin('edge', {
		initialize: function (initialize) {
			initialize();

			this.uniforms.pixelWidth = 1 / this.width;
			this.uniforms.pixelHeight = 1 / this.height;

			if (this.inputs.mode === 'sobel') {
				this.uniforms['G[0]'] = sobelMatrixConstants;
			} else {
				this.uniforms['G[0]'] = freiChenMatrixConstants;
			}
		},
		shader: function (inputs, shaderSource) {
			var defines;

			if (inputs.mode === 'sobel') {
				defines = '#define N_MATRICES 2\n' +
					'#define SOBEL\n';
			} else {
				//frei-chen
				defines = '#define N_MATRICES 9\n';
			}

			shaderSource.fragment = [
				defines,
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float pixelWidth;',
				'uniform float pixelHeight;',
				'uniform mat3 G[9];',

				'void main(void) {',
				'	mat3 I;',
				'	float dp3, cnv[9];',
				'	vec3 tc;',

				// fetch the 3x3 neighbourhood and use the RGB vector's length as intensity value
				'	float fi = 0.0, fj = 0.0;',
				'	for (int i = 0; i < 3; i++) {',
				'		fj = 0.0;',
				'		for (int j = 0; j < 3; j++) {',
				'			I[i][j] = length( ' +
							'texture2D(source, ' +
								'vTexCoord + vec2((fi - 1.0) * pixelWidth, (fj - 1.0) * pixelHeight)' +
							').rgb );',
				'			fj += 1.0;',
				'		};',
				'		fi += 1.0;',
				'	};',

				// calculate the convolution values for all the masks

				'	for (int i = 0; i < N_MATRICES; i++) {',
				'		dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);',
				'		cnv[i] = dp3 * dp3;',
				'	};',

				//Sobel
				'#ifdef SOBEL',
				'	tc = vec3(0.5 * sqrt(cnv[0]*cnv[0]+cnv[1]*cnv[1]));',
				'#else',

				//Frei-Chen
				// Line detector
				'	float M = (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]);',
				'	float S = (cnv[0] + cnv[1]) + (cnv[2] + cnv[3]) + (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]) + cnv[8];',
				'	tc = vec3(sqrt(M/S));',
				'#endif',

				'	gl_FragColor = vec4(tc, 1.0);',
				'}'
			].join('\n');

			return shaderSource;
		},
		resize: function () {
			this.uniforms.pixelWidth = 1 / this.width;
			this.uniforms.pixelHeight = 1 / this.height;
		},
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			mode: {
				type: 'enum',
				shaderDirty: true,
				defaultValue: 'sobel',
				options: [
					['sobel', 'Sobel'],
					['frei-chen', 'Frei-Chen']
				],
				update: function () {
					if (this.inputs.mode === 'sobel') {
						this.uniforms['G[0]'] = sobelMatrixConstants;
					} else {
						this.uniforms['G[0]'] = freiChenMatrixConstants;
					}
				}
			}
		},
		description: 'Edge Detect',
		title: 'Edge Detect'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('emboss', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 transform;',

				'varying vec2 vTexCoord1;',
				'varying vec2 vTexCoord2;',

				'void main(void) {',
				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	gl_Position.w = screenPosition.w;',

				'	vec2 offset = 1.0 / resolution;',
				'	vTexCoord1 = texCoord - offset;',
				'	vTexCoord2 = texCoord + offset;',
				'}'
			].join('\n');

			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord1;',
				'varying vec2 vTexCoord2;',

				'uniform sampler2D source;',
				'uniform float amount;',

				'const vec3 average = vec3(1.0 / 3.0);',

				'void main (void)  {',
				'	vec4 pixel = vec4(0.5, 0.5, 0.5, 1.0);',

				'	pixel -= texture2D(source, vTexCoord1) * amount;',
				'	pixel += texture2D(source, vTexCoord2) * amount;',
				'	pixel.rgb = vec3(dot(pixel.rgb, average));',

				'	gl_FragColor = pixel;',
				'}'
			].join('\n');
			return shaderSource;
		},
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 1,
				min: -255 / 3,
				max: 255 / 3
			}
		},
		title: 'Emboss',
		categories: [],
		description: 'Emboss'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('exposure', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',

				'uniform float exposure;',

				'void main (void)  {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	gl_FragColor = vec4(pow(2.0, exposure) * pixel.rgb, pixel.a);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			exposure: {
				type: 'number',
				uniform: 'exposure',
				defaultValue: 1,
				min: -8,
				max: 8
			}
		},
		title: 'Exposure',
		categories: ['film'],
		description: 'Exposure control'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('fader', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec4 color;',
				'uniform float amount;',

				'void main(void) {',
				'	gl_FragColor = texture2D(source, vTexCoord);',
				'	gl_FragColor = mix(gl_FragColor, color, amount);',
				'}'
			].join('\n');
			return shaderSource;
		},
		requires: function (sourceName, inputs) {
			return inputs.amount < 1;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			color: {
				type: 'color',
				uniform: 'color',
				defaultValue: [0, 0, 0, 1]
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 0.5,
				min: 0,
				max: 1
			}
		},
		title: 'Fader',
		description: 'Fade image to a color'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('falsecolor', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float amount;',
				'uniform vec4 black;',
				'uniform vec4 white;',

				'const vec3 luma = vec3(0.2125, 0.7154, 0.0721);',

				'void main(void) {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	float luminance = dot(pixel.rgb, luma);',
				'	vec4 result = mix(black, white, luminance);',
				'	gl_FragColor = vec4(result.rgb, pixel.a * result.a);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			black: {
				type: 'color',
				uniform: 'black',
				defaultValue: [0, 0, 0.5, 1]
			},
			white: {
				type: 'color',
				uniform: 'white',
				defaultValue: [1, 0, 0, 1]
			}
		},
		title: 'False Color'
	});
}));

/* global define, require */
/*
Film Grain

Shader:
* Copyright Martins Upitis (martinsh) devlog-martinsh.blogspot.com
* Creative Commons Attribution 3.0 Unported License
http://devlog-martinsh.blogspot.com/2013/05/image-imperfections-and-film-grain-post.html

Modified to preserve alpha

*/
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('filmgrain', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec2 resolution;',
				'uniform float time;',
				'uniform float amount;',
				'uniform bool colored;',

				'float timer;',

				// Perm texture texel-size
				'const float permTexUnit = 1.0/256.0;',

				// Half perm texture texel-size
				'const float permTexUnitHalf = 0.5/256.0;',

				'vec4 rnm(in vec2 tc) {',
				'	float noise = sin(dot(tc + vec2(timer,timer),vec2(12.9898,78.233))) * 43758.5453;',

				'	float noiseR = fract(noise)*2.0-1.0;',
				'	float noiseG = fract(noise*1.2154)*2.0-1.0; ',
				'	float noiseB = fract(noise*1.3453)*2.0-1.0;',
				'	float noiseA = fract(noise*1.3647)*2.0-1.0;',
				'	',
				'	return vec4(noiseR,noiseG,noiseB,noiseA);',
				'}',

				'float fade(in float t) {',
				'	return t*t*t*(t*(t*6.0-15.0)+10.0);',
				'}',

				'float pnoise3D(in vec3 p) {',
					// Integer part, scaled so +1 moves permTexUnit texel
				'	vec3 pi = permTexUnit*floor(p)+permTexUnitHalf;',

				// and offset 1/2 texel to sample texel centers
				// Fractional part for interpolation'
				'	vec3 pf = fract(p);',

				// Noise contributions from (x=0, y=0), z=0 and z=1
				'	float perm00 = rnm(pi.xy).a ;',
				'	vec3 grad000 = rnm(vec2(perm00, pi.z)).rgb * 4.0 - 1.0;',
				'	float n000 = dot(grad000, pf);',
				'	vec3 grad001 = rnm(vec2(perm00, pi.z + permTexUnit)).rgb * 4.0 - 1.0;',
				'	float n001 = dot(grad001, pf - vec3(0.0, 0.0, 1.0));',

				// Noise contributions from (x=0, y=1), z=0 and z=1
				'	float perm01 = rnm(pi.xy + vec2(0.0, permTexUnit)).a ;',
				'	vec3 grad010 = rnm(vec2(perm01, pi.z)).rgb * 4.0 - 1.0;',
				'	float n010 = dot(grad010, pf - vec3(0.0, 1.0, 0.0));',
				'	vec3 grad011 = rnm(vec2(perm01, pi.z + permTexUnit)).rgb * 4.0 - 1.0;',
				'	float n011 = dot(grad011, pf - vec3(0.0, 1.0, 1.0));',

				// Noise contributions from (x=1, y=0), z=0 and z=1
				'	float perm10 = rnm(pi.xy + vec2(permTexUnit, 0.0)).a ;',
				'	vec3 grad100 = rnm(vec2(perm10, pi.z)).rgb * 4.0 - 1.0;',
				'	float n100 = dot(grad100, pf - vec3(1.0, 0.0, 0.0));',
				'	vec3 grad101 = rnm(vec2(perm10, pi.z + permTexUnit)).rgb * 4.0 - 1.0;',
				'	float n101 = dot(grad101, pf - vec3(1.0, 0.0, 1.0));',

				// Noise contributions from (x=1, y=1), z=0 and z=1
				'	float perm11 = rnm(pi.xy + vec2(permTexUnit, permTexUnit)).a ;',
				'	vec3 grad110 = rnm(vec2(perm11, pi.z)).rgb * 4.0 - 1.0;',
				'	float n110 = dot(grad110, pf - vec3(1.0, 1.0, 0.0));',
				'	vec3 grad111 = rnm(vec2(perm11, pi.z + permTexUnit)).rgb * 4.0 - 1.0;',
				'	float n111 = dot(grad111, pf - vec3(1.0, 1.0, 1.0));',

				// Blend contributions along x
				'	vec4 n_x = mix(vec4(n000, n001, n010, n011), vec4(n100, n101, n110, n111), fade(pf.x));',

				// Blend contributions along y
				'	vec2 n_xy = mix(n_x.xy, n_x.zw, fade(pf.y));',

				//Blend contributions along z
				'	float n_xyz = mix(n_xy.x, n_xy.y, fade(pf.z));',

				'	return n_xyz;',
				'}',

				'void main(void) {',
				'	timer = mod(time, 10000.0) / 10000.0;',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	vec3 noise = vec3(pnoise3D(vec3(vTexCoord * resolution, timer + 0.0)));',
				'	if (colored) {',
				'		noise.g = pnoise3D(vec3(vTexCoord * resolution, timer + 1.0));',
				'		noise.b = pnoise3D(vec3(vTexCoord * resolution, timer + 2.0));',
				'	}',
				'	gl_FragColor = vec4(pixel.rgb + noise * amount, pixel.a);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			time: {
				type: 'number',
				uniform: 'time'
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				min: 0,
				max: 1,
				defaultValue: 0.03
			},
			colored: {
				type: 'boolean',
				uniform: 'colored',
				defaultValue: false
			}
		},
		title: 'Film Grain',
		description: 'Don\'t over-do it.'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('freeze', {
		draw: function (shader, model, uniforms, frameBuffer, draw) {
			if (!this.inputs.frozen) {
				draw(shader, model, uniforms, frameBuffer);
			}
		},
		requires: function () {
			return !this.inputs.frozen;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			frozen: {
				type: 'boolean',
				defaultValue: false,
				updateSources: true
			}
		},
		title: 'Freeze',
		description: 'Freeze Frame'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*
	http://en.wikipedia.org/wiki/Fast_approximate_anti-aliasing

	adapted from:
	http://horde3d.org/wiki/index.php5?title=Shading_Technique_-_FXAA
	*/

	Seriously.plugin('fxaa', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 transform;',

				'varying vec2 vTexCoord;',
				'varying vec2 vTexCoordNW;',
				'varying vec2 vTexCoordNE;',
				'varying vec2 vTexCoordSW;',
				'varying vec2 vTexCoordSE;',

				'const vec2 diag = vec2(1.0, -1.0);',

				'void main(void) {',
				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	gl_Position.w = screenPosition.w;',

				'	vTexCoord = texCoord;',

				'	vec2 invRes = 1.0 / resolution;',
				'	vTexCoordNW = texCoord - invRes;',
				'	vTexCoordNE = texCoord + invRes * diag;',
				'	vTexCoordSW = texCoord - invRes * diag;',
				'	vTexCoordSE = texCoord + invRes;',
				'}\n'
			].join('\n');

			shaderSource.fragment = [
				'precision mediump float;',

				'#define FXAA_REDUCE_MIN (1.0 / 128.0)',
				'#define FXAA_REDUCE_MUL (1.0 / 8.0)',
				'#define FXAA_SPAN_MAX 8.0',

				'varying vec2 vTexCoord;',
				'varying vec2 vTexCoordNW;',
				'varying vec2 vTexCoordNE;',
				'varying vec2 vTexCoordSW;',
				'varying vec2 vTexCoordSE;',

				'uniform vec2 resolution;',
				'uniform sampler2D source;',

				'const vec3 luma = vec3(0.299, 0.587, 0.114);',

				'void main(void) {',
				'	vec4 original = texture2D(source, vTexCoord);',
				'	vec3 rgbNW = texture2D(source, vTexCoordNW).rgb;',
				'	vec3 rgbNE = texture2D(source, vTexCoordNE).rgb;',
				'	vec3 rgbSW = texture2D(source, vTexCoordSW).rgb;',
				'	vec3 rgbSE = texture2D(source, vTexCoordSE).rgb;',

				'	float lumaNW = dot(rgbNW, luma);',
				'	float lumaNE = dot(rgbNE, luma);',
				'	float lumaSW = dot(rgbSW, luma);',
				'	float lumaSE = dot(rgbSE, luma);',
				'	float lumaM = dot(original.rgb, luma);',

				'	float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));',
				'	float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));',

				'	vec2 dir = vec2(' +
					'-((lumaNW + lumaNE) - (lumaSW + lumaSE)), ' +
					'((lumaNW + lumaSW) - (lumaNE + lumaSE))' +
					');',

				'	float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 0.25 * FXAA_REDUCE_MUL, FXAA_REDUCE_MIN);',

				'	float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);',

				'	dir = min(vec2(FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX), dir * rcpDirMin)) / resolution;',

				'	vec3 rgbA = 0.5 * (',
				'		texture2D(source, vTexCoord + dir * (1.0 / 3.0 - 0.5)).rgb +',
				'		texture2D(source, vTexCoord + dir * (2.0 / 3.0 - 0.5)).rgb);',

				'	vec3 rgbB = rgbA * 0.5 + 0.25 * (',
				'		texture2D(source, vTexCoord - dir * 0.5).rgb +',
				'		texture2D(source, vTexCoord + dir * 0.5).rgb);',

				'	float lumaB = dot(rgbB, luma);',
				'	if (lumaB < lumaMin || lumaB > lumaMax) {',
				'		gl_FragColor = vec4(rgbA, original.a);',
				'	} else {',
				'		gl_FragColor = vec4(rgbB, original.a);',
				'	}',
				'}'
			].join('\n');

			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			}
		},
		title: 'FXAA',
		description: 'Fast approximate anti-aliasing'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('gradientwipe', function () {
		this.uniforms.resGradient = [1, 1];
		this.uniforms.resSource = [1, 1];

		return {
			shader: function (inputs, shaderSource) {
					shaderSource.vertex = [
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform vec2 resSource;',
					'uniform vec2 resGradient;',

					'varying vec2 texCoordSource;',
					'varying vec2 texCoordGradient;',

					'const vec2 HALF = vec2(0.5);',

					'void main(void) {',
					//we don't need to do a transform in this shader, since this effect is not "inPlace"
					'	gl_Position = position;',

					'	vec2 adjusted = (texCoord - HALF) * resolution;',

					'	texCoordSource = adjusted / resSource + HALF;',
					'	texCoordGradient = adjusted / resGradient + HALF;',
					'}'
				].join('\n');

				shaderSource.fragment = [
					'precision mediump float;\n',

					'varying vec2 texCoordSource;',
					'varying vec2 texCoordGradient;',

					'uniform sampler2D source;',
					'uniform sampler2D gradient;',

					'uniform float transition;',
					'uniform float smoothness;',
					'uniform bool invert;',

					'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);',

					'void main(void) {',
					'	float gradientVal = 1.0 - dot(texture2D(gradient, texCoordGradient).rgb, lumcoeff);',

					'	if (invert) {',
					'		gradientVal = 1.0 - gradientVal;',
					'	}',

					'	float amount = 1.0 - transition;',

					'	float mn = (amount - smoothness * (1.0 - amount));',
					'	float mx = (amount + smoothness * amount);',

					'	if (gradientVal <= mn) {',
					'		gl_FragColor = texture2D(source, texCoordSource);',
					'		return;',
					'	}',

					'	if (gradientVal >= mx) {',
					'		gl_FragColor = vec4(0.0);',
					'		return;',
					'	}',

					'	float alpha = mix(1.0, 0.0, smoothstep(mn, mx, gradientVal));',
					'	vec4 pixel = texture2D(source, texCoordSource);',

					'	gl_FragColor = vec4(pixel.rgb, pixel.a * alpha);',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				var gl;

				//*
				if (uniforms.transition <= 0) {
					//uniforms.source = uniforms.sourceB;
					parent(this.baseShader, model, uniforms, frameBuffer);
					return;
				}
				//*/

				//*
				if (uniforms.transition >= 1) {
					gl = this.gl;

					gl.viewport(0, 0, this.width, this.height);
					gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
					gl.clearColor(0.0, 0.0, 0.0, 0.0);
					gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

					return;
				}
				//*/

				parent(shader, model, uniforms, frameBuffer);
			},
			inPlace: false,
			requires: function (sourceName, inputs) {

				if (sourceName === 'source' && inputs.transition >= 1) {
					return false;
				}

				if (sourceName === 'gradient' &&
						(inputs.transition <= 0 || inputs.transition >= 1)) {
					return false;
				}

				return true;
			},
			resize: function () {
				var source = this.inputs.source,
					gradient = this.inputs.gradient;

				if (source) {
					this.uniforms.resSource[0] = source.width;
					this.uniforms.resSource[1] = source.height;
				} else {
					this.uniforms.resSource[0] = 1;
					this.uniforms.resSource[1] = 1;
				}

				if (gradient) {
					this.uniforms.resGradient[0] = gradient.width;
					this.uniforms.resGradient[1] = gradient.height;
				} else {
					this.uniforms.resGradient[0] = 1;
					this.uniforms.resGradient[1] = 1;
				}
			}
		};
	},
	{
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			gradient: {
				type: 'image',
				uniform: 'gradient'
			},
			transition: {
				type: 'number',
				uniform: 'transition',
				defaultValue: 0
			},
			invert: {
				type: 'boolean',
				uniform: 'invert',
				defaultValue: false
			},
			smoothness: {
				type: 'number',
				uniform: 'smoothness',
				defaultValue: 0,
				min: 0,
				max: 1
			}
		},
		title: 'Gradient Wipe'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*

	Shader adapted from glfx.js by Evan Wallace
	License: https://github.com/evanw/glfx.js/blob/master/LICENSE
	*/

	Seriously.plugin('hex', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;\n',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec2 resolution;',
				'uniform vec2 center;',
				'uniform float size;',

				'void main(void) {',
				'	vec2 aspect = normalize(resolution);',
				'	vec2 tex = (vTexCoord * aspect - center) / size;',
				'	tex.y /= 0.866025404;',
				'	tex.x -= tex.y * 0.5;',
				'	vec2 a;',
				'	if (tex.x + tex.y - floor(tex.x) - floor(tex.y) < 1.0) {',
				'		a = vec2(floor(tex.x), floor(tex.y));',
				'	} else {',
				'		a = vec2(ceil(tex.x), ceil(tex.y));',
				'	}',
				'	vec2 b = vec2(ceil(tex.x), floor(tex.y));',
				'	vec2 c = vec2(floor(tex.x), ceil(tex.y));',
				'	vec3 tex3 = vec3(tex.x, tex.y, 1.0 - tex.x - tex.y);',
				'	vec3 a3 = vec3(a.x, a.y, 1.0 - a.x - a.y);',
				'	vec3 b3 = vec3(b.x, b.y, 1.0 - b.x - b.y);',
				'	vec3 c3 = vec3(c.x, c.y, 1.0 - c.x - c.y);',
				'	float alen =length(tex3 - a3);',
				'	float blen =length(tex3 - b3);',
				'	float clen =length(tex3 - c3);',
				'	vec2 choice;',
				'	if (alen < blen) {',
				'		if (alen < clen) {',
				'			choice = a;',
				'		} else {',
				'			choice = c;',
				'		}',
				'	} else {',
				'		if (blen < clen) {',
				'			choice = b;',
				'		} else {',
				'			choice = c;',
				'		}',
				'	}',
				'	choice.x += choice.y * 0.5;',
				'	choice.y *= 0.866025404;',
				'	choice *= size / aspect;',
				'	gl_FragColor = texture2D(source, choice + center / aspect);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			size: {
				type: 'number',
				uniform: 'size',
				min: 0,
				max: 0.4,
				defaultValue: 0.01
			},
			center: {
				type: 'vector',
				uniform: 'center',
				dimensions: 2,
				defaultValue: [0, 0]
			}
		},
		title: 'Hex',
		description: 'Hexagonal Pixelate'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('highlights-shadows', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float shadows;',
				'uniform float highlights;',

				'const vec3 luma = vec3(0.2125, 0.7154, 0.0721);',

				'void main(void) {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	float luminance = dot(pixel.rgb, luma);',
				'	float shadow = clamp((pow(luminance, 1.0 / (shadows + 1.0)) + (-0.76) * pow(luminance, 2.0 / (shadows + 1.0))) - luminance, 0.0, 1.0);',
				'	float highlight = clamp((1.0 - (pow(1.0 - luminance, 1.0 / (2.0 - highlights)) + (-0.8) * pow(1.0 - luminance, 2.0 / (2.0 - highlights)))) - luminance, -1.0, 0.0);',
				'	vec3 rgb = (luminance + shadow + highlight) * (pixel.rgb / vec3(luminance));',
				//'	vec3 rgb = vec3(0.0, 0.0, 0.0) + ((luminance + shadow + highlight) - 0.0) * ((pixel.rgb - vec3(0.0, 0.0, 0.0))/(luminance - 0.0));',
				'	gl_FragColor = vec4(rgb, pixel.a);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			highlights: {
				type: 'number',
				uniform: 'highlights',
				min: 0,
				max: 1,
				defaultValue: 1
			},
			shadows: {
				type: 'number',
				uniform: 'shadows',
				min: 0,
				max: 1,
				defaultValue: 0
			}
		},
		title: 'Highlights/Shadows',
		description: 'Darken highlights, lighten shadows'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	//inspired by Evan Wallace (https://github.com/evanw/glfx.js)

	Seriously.plugin('hue-saturation', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 projection;',
				'uniform mat4 transform;',

				'uniform float hue;',
				'uniform float saturation;',

				'varying vec2 vTexCoord;',

				'varying vec3 weights;',

				'void main(void) {',
				'	float angle = hue * 3.14159265358979323846264;',
				'	float s = sin(angle);',
				'	float c = cos(angle);',
				'	weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;',

				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position = screenPosition;',
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	vTexCoord = texCoord;',
				'}'
			].join('\n');
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'varying vec3 weights;',

				'uniform sampler2D source;',
				'uniform float hue;',
				'uniform float saturation;',

				'void main(void) {',
				'	vec4 color = texture2D(source, vTexCoord);',

				//adjust hue
				'	float len = length(color.rgb);',
				'	color.rgb = vec3(' +
						'dot(color.rgb, weights.xyz), ' +
						'dot(color.rgb, weights.zxy), ' +
						'dot(color.rgb, weights.yzx) ' +
				');',

				//adjust saturation
				'	vec3 adjustment = (color.r + color.g + color.b) / 3.0 - color.rgb;',
				'	if (saturation > 0.0) {',
				'		adjustment *= (1.0 - 1.0 / (1.0 - saturation));',
				'	} else {',
				'		adjustment *= (-saturation);',
				'	}',
				'	color.rgb += adjustment;',

				'	gl_FragColor = color;',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			hue: {
				type: 'number',
				uniform: 'hue',
				defaultValue: 0.4,
				min: -1,
				max: 1
			},
			saturation: {
				type: 'number',
				uniform: 'saturation',
				defaultValue: 0,
				min: -1,
				max: 1
			}
		},
		title: 'Hue/Saturation',
		description: 'Rotate hue and multiply saturation.'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('invert', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',

				'void main(void) {',
				'	gl_FragColor = texture2D(source, vTexCoord);',
				'	gl_FragColor = vec4(1.0 - gl_FragColor.rgb, gl_FragColor.a);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			}
		},
		title: 'Invert',
		description: 'Invert image color'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('kaleidoscope', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float segments;',
				'uniform float offset;',

				'const float PI = ' + Math.PI + ';',
				'const float TAU = 2.0 * PI;',

				'void main(void) {',
				'	if (segments == 0.0) {',
				'		gl_FragColor = texture2D(source, vTexCoord);',
				'	} else {',
				'		vec2 centered = vTexCoord - 0.5;',

				//to polar
				'		float r = length(centered);',
				'		float theta = atan(centered.y, centered.x);',
				'		theta = mod(theta, TAU / segments);',
				'		theta = abs(theta - PI / segments);',

				//back to cartesian
				'		vec2 newCoords = r * vec2(cos(theta), sin(theta)) + 0.5;',
				'		gl_FragColor = texture2D(source, mod(newCoords - offset, 1.0));',
				'	}',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			segments: {
				type: 'number',
				uniform: 'segments',
				defaultValue: 6
			},
			offset: {
				type: 'number',
				uniform: 'offset',
				defaultValue: 0
			}
		},
		title: 'Kaleidoscope'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	var identity = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]),
		intRegex = /\d+/;

	Seriously.plugin('layers', function (options) {
		var count,
			me = this,
			topOpts = {
				clear: false
			},
			i,
			inputs;

		function update() {
			me.resize();
		}

		if (typeof options === 'number' && options >= 2) {
			count = options;
		} else {
			count = options && options.count || 4;
			count = Math.max(2, count);
		}

		inputs = {
			sizeMode: {
				type: 'enum',
				defaultValue: '0',
				options: [
					'union',
					'intersection'
				],
				update: function () {
					this.resize();
				}
			}
		};

		for (i = 0; i < count; i++) {
			inputs.sizeMode.options.push(i.toString());
			inputs.sizeMode.options.push('source' + i);

			//source
			inputs['source' + i] = {
				type: 'image',
				update: update
			};

			//opacity
			inputs['opacity' + i] = {
				type: 'number',
				defaultValue: 1,
				min: 0,
				max: 1,
				updateSources: true
			};
		}

		this.uniforms.layerResolution = [1, 1];

		// custom resize method
		this.resize = function () {
			var width,
				height,
				mode = this.inputs.sizeMode,
				i,
				n,
				source,
				a;

			if (mode === 'union') {
				width = 0;
				height = 0;
				for (i = 0; i < count; i++) {
					source = this.inputs['source' + i];
					if (source) {
						width = Math.max(width, source.width);
						height = Math.max(height, source.height);
					}
				}
			} else if (mode === 'intersection') {
				width = Infinity;
				height = Infinity;
				for (i = 0; i < count; i++) {
					source = this.inputs['source' + i];
					if (source) {
						width = Math.min(width, source.width);
						height = Math.min(height, source.height);
					}
				}
			} else {
				width = 1;
				height = 1;
				n = count - 1;
				a = intRegex.exec(this.inputs.sizeMode);
				if (a) {
					n = Math.min(parseInt(a[0], 10), n);
				}

				source = this.inputs['source' + n];
				if (source) {
					width = source.width;
					height = source.height;
				}
			}

			if (this.width !== width || this.height !== height) {
				this.width = width;
				this.height = height;

				this.uniforms.resolution[0] = width;
				this.uniforms.resolution[1] = height;

				if (this.frameBuffer) {
					this.frameBuffer.resize(width, height);
				}

				this.emit('resize');
				this.setDirty();

				for (i = 0; i < this.targets.length; i++) {
					this.targets[i].resize();
				}
			}
		};

		return {
			initialize: function (initialize) {
				var gl = this.gl;
				initialize();

				topOpts.blendEquation = gl.FUNC_ADD;
				topOpts.srcRGB = gl.SRC_ALPHA;
				topOpts.dstRGB = gl.ONE_MINUS_SRC_ALPHA;
				topOpts.srcAlpha = gl.SRC_ALPHA;
				topOpts.dstAlpha = gl.DST_ALPHA;
			},
			commonShader: true,
			shader: function (inputs, shaderSource) {
				shaderSource.vertex = [
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform vec2 layerResolution;',
					'uniform mat4 transform;',

					'varying vec2 vTexCoord;',

					'void main(void) {',
					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * layerResolution / 2.0, position.z, position.w);',
					'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position.xy = screenPosition.xy * 2.0 / layerResolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (layerResolution.x / layerResolution.y);',
					'	gl_Position.xy *= layerResolution / resolution;',
					'	gl_Position.w = screenPosition.w;',
					'	vTexCoord = texCoord;',
					'}\n'
				].join('\n');

				shaderSource.fragment = [
					'precision mediump float;',
					'varying vec2 vTexCoord;',
					'uniform sampler2D source;',
					'uniform float opacity;',
					'void main(void) {',
					'	if (any(lessThan(vTexCoord, vec2(0.0))) || any(greaterThanEqual(vTexCoord, vec2(1.0)))) {',
					'		gl_FragColor = vec4(0.0);',
					'	} else {',
					'		gl_FragColor = texture2D(source, vTexCoord);',
					'		gl_FragColor *= opacity;',
					'	}',
					'}'
				].join('\n');

				return shaderSource;
			},
			requires: function (sourceName, inputs) {
				var a, index = count;

				a = intRegex.exec(this.inputs.sizeMode);
				if (a) {
					index = parseInt(a[0], 10);
				}
				if (index >= count) {
					return false;
				}

				return !!(inputs[sourceName] && inputs['opacity' + index]);
			},
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				var i,
					opacity,
					source,
					gl = this.gl;

				//clear in case we have no layers to draw
				gl.viewport(0, 0, this.width, this.height);
				gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
				gl.clearColor(0.0, 0.0, 0.0, 0.0);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

				for (i = 0; i < count; i++) {
					source = this.inputs['source' + i];
					opacity = this.inputs['opacity' + i];

					//don't draw if layer is disconnected or opacity is 0
					if (source && opacity) {
						uniforms.opacity = opacity;
						uniforms.layerResolution[0] = source.width;
						uniforms.layerResolution[1] = source.height;
						uniforms.source = source;
						uniforms.transform = source.cumulativeMatrix || identity;

						draw(shader, model, uniforms, frameBuffer, null, topOpts);
					}
				}
			},
			inputs: inputs
		};
	},
	{
		inPlace: true,
		description: 'Multiple layers',
		title: 'Layers'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('linear-transfer', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec4 slope;',
				'uniform vec4 intercept;',

				'const vec3 half3 = vec3(0.5);',

				'void main(void) {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	gl_FragColor = pixel * slope + intercept;',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			slope: {
				type: 'vector',
				dimensions: 4,
				uniform: 'slope',
				defaultValue: [1, 1, 1, 1]
			},
			intercept: {
				type: 'vector',
				uniform: 'intercept',
				dimensions: 4,
				defaultValue: [0, 0, 0, 0]
			}
		},
		title: 'Linear Transfer',
		description: 'For each color channel: [slope] * [value] + [intercept]'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('lumakey', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',

				'uniform float threshold;',
				'uniform float clipBlack;',
				'uniform float clipWhite;',
				'uniform bool invert;',

				'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);',

				'void main (void)  {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	float luma = dot(pixel.rgb,lumcoeff);',
				'	float alpha = 1.0 - smoothstep(clipBlack, clipWhite, luma);',
				'	if (invert) alpha = 1.0 - alpha;',
				'	gl_FragColor = vec4(pixel.rgb, min(pixel.a, alpha) );',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			clipBlack: {
				type: 'number',
				uniform: 'clipBlack',
				defaultValue: 0.9,
				min: 0,
				max: 1
			},
			clipWhite: {
				type: 'number',
				uniform: 'clipWhite',
				defaultValue: 1,
				min: 0,
				max: 1
			},
			invert: {
				type: 'boolean',
				uniform: 'invert',
				defaultValue: false
			}
		},
		title: 'Luma Key',
		categories: ['key'],
		description: ''
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('mirror', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'uniform vec2 resolution;',
				'uniform sampler2D source;',

				'varying vec2 vTexCoord;',

				'void main(void) {',
				'	gl_FragColor = texture2D(source, vec2(0.5 - abs(0.5 - vTexCoord.x), vTexCoord.y));',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			}
		},
		title: 'Mirror',
		description: 'Shader Mirror Effect'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	//based on tutorial: http://www.geeks3d.com/20091009/shader-library-night-vision-post-processing-filter-glsl/
	//todo: make noise better?

	Seriously.plugin('nightvision', {
		commonShader: true,
		shader: function (inputs, shaderSource, utilities) {
			shaderSource.fragment = [
					'precision mediump float;',

					'varying vec2 vTexCoord;',

					'uniform sampler2D source;',
					'uniform float timer;',
					'uniform float luminanceThreshold;',
					'uniform float amplification;',
					'uniform vec3 nightVisionColor;',

					utilities.shader.makeNoise,

					'void main(void) {',
					'	vec3 noise = vec3(' +
							'makeNoise(vTexCoord.x, vTexCoord.y, timer), ' +
							'makeNoise(vTexCoord.x, vTexCoord.y, timer * 200.0 + 1.0), ' +
							'makeNoise(vTexCoord.x, vTexCoord.y, timer * 100.0 + 3.0)' +
						');',
					'	vec4 pixel = texture2D(source, vTexCoord + noise.xy * 0.0025);',
					'	float luminance = dot(vec3(0.299, 0.587, 0.114), pixel.rgb);',
					'	pixel.rgb *= step(luminanceThreshold, luminance) * amplification;',
					'	gl_FragColor = vec4( (pixel.rgb + noise * 0.1) * nightVisionColor, pixel.a);',
					'}'
			].join('\n');
			return shaderSource;
		},
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			timer: {
				type: 'number',
				uniform: 'timer',
				defaultValue: 0
			},
			luminanceThreshold: {
				type: 'number',
				uniform: 'luminanceThreshold',
				defaultValue: 0.1,
				min: 0,
				max: 1
			},
			amplification: {
				type: 'number',
				uniform: 'amplification',
				defaultValue: 1.4,
				min: 0
			},
			color: {
				type: 'color',
				uniform: 'nightVisionColor',
				defaultValue: [0.1, 0.95, 0.2]
			}
		},
		title: 'Night Vision',
		description: ''
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('noise', {
		shader: function (inputs, shaderSource, utilities) {
			var frag = [
				'precision mediump float;',

				'#define Blend(base, blend, funcf)		vec3(funcf(base.r, blend.r), funcf(base.g, blend.g), funcf(base.b, blend.b))',
				'#define BlendOverlayf(base, blend) (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))',
				'#define BlendOverlay(base, blend)		Blend(base, blend, BlendOverlayf)',
				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',

				'uniform vec2 resolution;',
				'uniform float amount;',
				'uniform float timer;',

				utilities.shader.noiseHelpers,
				utilities.shader.snoise3d,
				utilities.shader.random,

				'void main(void) {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	float r = random(vec2(timer * vTexCoord.xy));',
				'	float noise = snoise(vec3(vTexCoord * (1024.4 + r * 512.0), timer)) * 0.5;'
			];

			if (inputs.overlay) {
				frag.push('	vec3 overlay = BlendOverlay(pixel.rgb, vec3(noise));');
				frag.push('	pixel.rgb = mix(pixel.rgb, overlay, amount);');
			} else {
				frag.push('	pixel.rgb += noise * amount;');
			}
			frag.push('	gl_FragColor = pixel;}');

			shaderSource.fragment = frag.join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			overlay: {
				type: 'boolean',
				shaderDirty: true,
				defaultValue: true
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				min: 0,
				max: 1,
				defaultValue: 1
			},
			timer: {
				type: 'number',
				uniform: 'timer',
				defaultValue: 0,
				step: 1
			}
		},
		title: 'Noise',
		description: 'Add noise'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('panorama', function () {
		var me = this;

		function resize() {
			me.resize();
		}

		// custom resize method
		this.resize = function () {
			var width = this.width,
				height = this.height,
				source = me.inputs.source,
				i;

			if (this.source) {
				width = this.source.width;
				height = this.source.height;
			} else if (this.sources && this.sources.source) {
				width = this.sources.source.width;
				height = this.sources.source.height;
			} else {
				width = 1;
				height = 1;
			}

			if (me.inputs.width) {
				width = me.inputs.width;
				if (me.inputs.height) {
					height = me.inputs.height;
				} else if (source) {
					//match source aspect ratio
					height = width * source.height / source.width;
				}
			} else if (me.inputs.height) {
				height = me.inputs.height;
				if (source) {
					//match source aspect ratio
					width = height * source.width / source.height;
				}
			}

			width = Math.floor(width);
			height = Math.floor(height);

			if (source) {
				this.uniforms.resolution[0] = width;
				this.uniforms.resolution[1] = height;
			}

			if (this.width !== width || this.height !== height) {
				this.width = width;
				this.height = height;

				if (this.frameBuffer) {
					this.frameBuffer.resize(this.width, this.height);
				}

				this.emit('resize');
				this.setDirty();
			}

			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}
		};

		return {
			shader: function (inputs, shaderSource) {
				shaderSource.fragment = [
					'precision mediump float;',

					'varying vec2 vTexCoord;',

					'uniform vec2 resolution;',
					'uniform sampler2D source;',

					'uniform float fov;',
					'uniform float yaw;',
					'uniform float pitch;',

					'const float M_PI = 3.141592653589793238462643;',
					'const float M_TWOPI = 6.283185307179586476925286;',

					'mat3 rotationMatrix(vec2 euler) {',
					'	vec2 se = sin(euler);',
					'	vec2 ce = cos(euler);',

					'	return mat3(ce.x, 0, -se.x, 0, 1, 0, se.x, 0, ce.x) * ',
					'			mat3(1, 0, 0, 0, ce.y, -se.y, 0, se.y, ce.y);',
					'}',

					'vec3 toCartesian( vec2 st ) {',
					'	return normalize(vec3(st.x, st.y, 0.5 / tan(0.5 * radians(fov))));',
					'}',

					'vec2 toSpherical(vec3 cartesianCoord) {',
					'	vec2 st = vec2(',
					'		atan(cartesianCoord.x, cartesianCoord.z),',
					'		acos(cartesianCoord.y)',
					'	);',
					'	if(st.x < 0.0)',
					'		st.x += M_TWOPI;',

					'	return st;',
					'}',

					'void main(void) {',
					'	vec2 sphericalCoord = gl_FragCoord.xy / resolution - vec2(0.5);',
					'	sphericalCoord.y *= -resolution.y / resolution.x;',

					'	vec3 cartesianCoord = rotationMatrix(radians(vec2(yaw + 180., -pitch))) * toCartesian(sphericalCoord);',

					'	gl_FragColor = texture2D(source, toSpherical( cartesianCoord )/vec2(M_TWOPI, M_PI));',
					'}'
				].join('\n');
				return shaderSource;
			},
			inPlace: false,
			inputs: {
				source: {
					type: 'image',
					uniform: 'source',
					shaderDirty: false
				},
				width: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 640
				},
				height: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 360
				},
				yaw: {
					type: 'number',
					uniform: 'yaw',
					min: 0,
					max: 360,
					defaultValue: 0
				},
				fov: {
					type: 'number',
					uniform: 'fov',
					min: 0,
					max: 180,
					defaultValue: 80
				},
				pitch: {
					type: 'number',
					uniform: 'pitch',
					min: -90,
					max: 90,
					defaultValue: 0
				}
			}
		};
	}, {
		commonShader: true,
		title: 'Panorama'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('pixelate', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec2 resolution;',
				'uniform vec2 pixelSize;',

				'void main(void) {',
				'	vec2 delta = pixelSize / resolution;',
				'	gl_FragColor = texture2D(source, delta * floor(vTexCoord / delta));',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			pixelSize: {
				type: 'vector',
				dimensions: 2,
				defaultValue: [8, 8],
				min: 0,
				uniform: 'pixelSize'
			}
		},
		title: 'Pixelate'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('polar', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float angle;',

				'const float PI = ' + Math.PI + ';',

				'void main(void) {',
				'	vec2 norm = (1.0 - vTexCoord) * 2.0 - 1.0;',
				'	float theta = mod(PI + atan(norm.x, norm.y) - angle * (PI / 180.0), PI * 2.0);',
				'	vec2 polar = vec2(theta / (2.0 * PI), length(norm));',
				'	gl_FragColor = texture2D(source, polar);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			angle: {
				type: 'number',
				uniform: 'angle',
				defaultValue: 0
			}
		},
		title: 'Polar Coordinates',
		description: 'Convert cartesian to polar coordinates'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	//http://msdn.microsoft.com/en-us/library/bb313868(v=xnagamestudio.10).aspx
	Seriously.plugin('ripple', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float wave;',
				'uniform float distortion;',
				'uniform vec2 center;',

				'void main(void) {',
				//todo: can at least move scalar into vertex shader
				'	float scalar = abs(1.0 - abs(distance(vTexCoord, center)));',
				'	float sinOffset = sin(wave / scalar);',
				'	sinOffset = clamp(sinOffset, 0.0, 1.0);',
				'	float sinSign = cos(wave / scalar);',
				'	sinOffset = sinOffset * distortion / 32.0;',
				'	gl_FragColor = texture2D(source, vTexCoord + sinOffset * sinSign);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			wave: {
				type: 'number',
				uniform: 'wave',
				defaultValue: Math.PI / 0.75
			},
			distortion: {
				type: 'number',
				uniform: 'distortion',
				defaultValue: 1
			},
			center: {
				type: 'vector',
				uniform: 'center',
				dimensions: 2,
				defaultValue: [0.5, 0.5]
			}
		},
		title: 'Ripple Distortion',
		description: ''
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('scanlines', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
					'precision mediump float;',

					'varying vec2 vTexCoord;',

					'uniform sampler2D source;',
					'uniform float lines;',
					'uniform float width;',
					'uniform float intensity;',

					//todo: add vertical offset for animating

					'void main(void) {',
					'	vec4 pixel = texture2D(source, vTexCoord);',
					'	float darken = 2.0 * abs( fract(vTexCoord.y * lines / 2.0) - 0.5);',
					'	darken = clamp(darken - width + 0.5, 0.0, 1.0);',
					'	darken = 1.0 - ((1.0 - darken) * intensity);',
					'	gl_FragColor = vec4(pixel.rgb * darken, 1.0);',
					'}'
				].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			lines: {
				type: 'number',
				uniform: 'lines',
				defaultValue: 60
			},
			size: {
				type: 'number',
				uniform: 'size',
				defaultValue: 0.2,
				min: 0,
				max: 1
			},
			intensity: {
				type: 'number',
				uniform: 'intensity',
				defaultValue: 0.1,
				min: 0,
				max: 1
			}
		},
		title: 'Scan Lines',
		description: ''
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	var intRegex = /\d+/;

	Seriously.plugin('select', function (options) {
		var count,
			me = this,
			i,
			inputs;

		function resize() {
			me.resize();
		}

		function update() {
			var i = me.inputs.active,
				source;

			source = me.inputs['source' + i];
			me.texture = source && source.texture;

			resize();
		}

		if (typeof options === 'number' && options >= 2) {
			count = options;
		} else {
			count = options && options.count || 4;
			count = Math.max(2, count);
		}

		inputs = {
			active: {
				type: 'number',
				step: 1,
				min: 0,
				max: count - 1,
				defaultValue: 0,
				update: update,
				updateSources: true
			},
			sizeMode: {
				type: 'enum',
				defaultValue: '0',
				options: [
					'union',
					'intersection',
					'active'
				],
				update: resize
			}
		};

		for (i = 0; i < count; i++) {
			inputs.sizeMode.options.push(i.toString());
			inputs.sizeMode.options.push('source' + i);

			//source
			inputs['source' + i] = {
				type: 'image',
				update: update
			};
		}

		this.uniforms.layerResolution = [1, 1];

		// custom resize method
		this.resize = function () {
			var width,
				height,
				mode = this.inputs.sizeMode,
				i,
				n,
				source,
				a;

			if (mode === 'union') {
				width = 0;
				height = 0;
				for (i = 0; i < count; i++) {
					source = this.inputs['source' + i];
					if (source) {
						width = Math.max(width, source.width);
						height = Math.max(height, source.height);
					}
				}
			} else if (mode === 'intersection') {
				width = Infinity;
				height = Infinity;
				for (i = 0; i < count; i++) {
					source = this.inputs['source' + i];
					if (source) {
						width = Math.min(width, source.width);
						height = Math.min(height, source.height);
					}
				}
			} else if (mode === 'active') {
				i = this.inputs.active;
				source = this.inputs['source' + i];
				width = Math.max(1, source && source.width || 1);
				height = Math.max(1, source && source.height || 1);
			} else {
				width = 1;
				height = 1;
				n = count - 1;
				a = intRegex.exec(this.inputs.sizeMode);
				if (a) {
					n = Math.min(parseInt(a[0], 10), n);
				}

				for (i = 0; i <= n; i++) {
					source = this.inputs['source' + i];
					if (source) {
						width = source.width;
						height = source.height;
						break;
					}
				}
			}

			if (this.width !== width || this.height !== height) {
				this.width = width;
				this.height = height;

				this.emit('resize');
				this.setDirty();
			}

			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}
		};

		return {
			initialize: function () {
				this.initialized = true;
				this.shaderDirty = false;
			},
			requires: function (sourceName) {
				return !!(this.inputs[sourceName] && sourceName === 'source' + this.inputs.active);
			},

			//check the source texture on every draw just in case the source nodes pulls
			//shenanigans with its texture.
			draw: function () {
				var i = me.inputs.active,
					source;

				source = me.inputs['source' + i];
				me.texture = source && source.texture;
			},
			inputs: inputs
		};
	},
	{
		title: 'Select',
		description: 'Select a single source image from a list of source nodes.',
		inPlace: false,
		commonShader: true
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	// sepia coefficients borrowed from:
	// http://www.techrepublic.com/blog/howdoi/how-do-i-convert-images-to-grayscale-and-sepia-tone-using-c/120

	Seriously.plugin('sepia', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec4 light;',
				'uniform vec4 dark;',
				'uniform float desat;',
				'uniform float toned;',

				'const mat4 coeff = mat4(' +
					'0.393, 0.349, 0.272, 1.0,' +
					'0.796, 0.686, 0.534, 1.0, ' +
					'0.189, 0.168, 0.131, 1.0, ' +
					'0.0, 0.0, 0.0, 1.0 ' +
				');',

				'void main(void) {',
				'	vec4 sourcePixel = texture2D(source, vTexCoord);',
				'	gl_FragColor = coeff * sourcePixel;',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			}
		},
		title: 'Sepia',
		description: ''
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('simplex', function () {
		var me = this;

		function resize() {
			me.resize();
		}

		return {
			shader: function (inputs, shaderSource, utilities) {
				var frequency = 1,
					amplitude = 1,
					i,
					adjust = 0;

				function fmtFloat(n) {
					if (n - Math.floor(n) === 0) {
						return n + '.0';
					}
					return n;
				}

				shaderSource.fragment = [
					'precision mediump float;',

					'varying vec2 vTexCoord;',

					'uniform float amount;',
					'uniform vec2 noiseScale;',
					'uniform vec2 noiseOffset;',
					'uniform float time;',
					'uniform vec4 black;',
					'uniform vec4 white;',

					utilities.shader.noiseHelpers,
					utilities.shader.snoise3d,
					//utilities.shader.random,

					'void main(void) {',
					'	float total = 0.0;',
					'	vec3 pos = vec3(vTexCoord.xy * noiseScale + noiseOffset, time);'
				].join('\n');

				for (i = 0; i < inputs.octaves; i++) {
					frequency = Math.pow(2, i);
					amplitude = Math.pow(inputs.persistence, i);
					adjust += amplitude;
					shaderSource.fragment += '\ttotal += snoise(pos * ' + fmtFloat(frequency) + ') * ' + fmtFloat(amplitude) + ';\n';
				}
				shaderSource.fragment += [
					'	total *= amount / ' + fmtFloat(adjust) + ';',
					'	total = (total + 1.0)/ 2.0;',
					'	gl_FragColor = mix(black, white, total);',
					'}'
				].join('\n');

				return shaderSource;
			},
			inputs: {
				noiseScale: {
					type: 'vector',
					dimensions: 2,
					uniform: 'noiseScale',
					defaultValue: [1, 1]
				},
				noiseOffset: {
					type: 'vector',
					dimensions: 2,
					uniform: 'noiseOffset',
					defaultValue: [0, 0]
				},
				octaves: {
					type: 'number',
					shaderDirty: true,
					min: 1,
					max: 8,
					step: 1,
					defaultValue: 1
				},
				persistence: {
					type: 'number',
					defaultValue: 0.5,
					min: 0,
					max: 0.5
				},
				amount: {
					type: 'number',
					uniform: 'amount',
					min: 0,
					defaultValue: 1
				},
				time: {
					type: 'number',
					uniform: 'time',
					defaultValue: 0
				},
				width: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 0
				},
				height: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 0
				},
				black: {
					type: 'color',
					uniform: 'black',
					defaultValue: [0, 0, 0, 1]
				},
				white: {
					type: 'color',
					uniform: 'white',
					defaultValue: [1, 1, 1, 1]
				}
			}
		};
	}, {
		title: 'Simplex Noise',
		description: 'Generate Simplex Noise'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/* inspired by http://lab.adjazent.com/2009/01/09/more-pixel-bender/ */

	Seriously.plugin('sketch', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				//todo: make adjust adjustable
				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec2 resolution;',

				'float res = resolution.x;',
				'float n0 = 97.0 / res;',
				'float n1 = 15.0 / res;',
				'float n2 = 97.0 / res;',
				'float n3 = 9.7 / res;',
				'float total = n2 + ( 4.0 * n0 ) + ( 4.0 * n1 );',

				'const vec3 div3 = vec3(1.0 / 3.0);',

				'void main(void) {',
				'	float offset, temp1, temp2;',
				'	vec4 m, p0, p1, p2, p3, p4, p5, p6, p7, p8;',
				'	offset = n3;',

				'	p0=texture2D(source,vTexCoord);',
				'	p1=texture2D(source,vTexCoord+vec2(-offset,-offset));',
				'	p2=texture2D(source,vTexCoord+vec2( offset,-offset));',
				'	p3=texture2D(source,vTexCoord+vec2( offset, offset));',
				'	p4=texture2D(source,vTexCoord+vec2(-offset, offset));',

				'	offset=n3*2.0;',

				'	p5=texture2D(source,vTexCoord+vec2(-offset,-offset));',
				'	p6=texture2D(source,vTexCoord+vec2( offset,-offset));',
				'	p7=texture2D(source,vTexCoord+vec2( offset, offset));',
				'	p8=texture2D(source,vTexCoord+vec2(-offset, offset));',
				'	m = (p0 * n2 + (p1 + p2 + p3 + p4) * n0 + (p5 + p6 + p7 + p8) * n1) / total;',

					//convert to b/w
				'	temp1 = dot(p0.rgb, div3);',
				'	temp2 = dot(m.rgb, div3);',

					//color dodge blend mode
				'	if (temp2 <= 0.0005) {',
				'		gl_FragColor = vec4( 1.0, 1.0, 1.0, p0.a);',
				'	} else {',
				'		gl_FragColor = vec4( vec3(min(temp1 / temp2, 1.0)), p0.a);',
				'	}',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			}
		},
		title: 'Sketch',
		description: 'Pencil/charcoal sketch'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('split', function () {
		var baseShader,
			resolutionA = [1, 1],
			resolutionB = [1, 1];

		// custom resize method
		this.resize = function () {
			var width,
				height,
				mode = this.inputs.sizeMode,
				node,
				fn,
				i,
				sourceA = this.inputs.sourceA,
				sourceB = this.inputs.sourceB;

			if (mode === 'a' || mode === 'b') {
				node = mode === 'a' ? sourceA : sourceB;
				if (node) {
					width = node.width;
					height = node.height;
				} else {
					width = 1;
					height = 1;
				}
			} else {
				if (sourceA) {
					if (sourceB) {
						fn = (mode === 'union' ? Math.max : Math.min);
						width = fn(sourceA.width, sourceB.width);
						height = fn(sourceA.height, sourceB.height);
					} else {
						width = sourceA.width;
						height = sourceA.height;
					}
				} else if (sourceB) {
					width = sourceB.width;
					height = sourceB.height;
				} else {
					width = 1;
					height = 1;
				}
			}

			if (this.width !== width || this.height !== height) {
				this.width = width;
				this.height = height;

				this.uniforms.resolution[0] = width;
				this.uniforms.resolution[1] = height;

				if (this.frameBuffer) {
					this.frameBuffer.resize(width, height);
				}

				this.emit('resize');
				this.setDirty();
			}

			if (sourceA) {
				resolutionA[0] = sourceA.width;
				resolutionA[1] = sourceA.height;
			}
			if (sourceB) {
				resolutionB[0] = sourceB.width;
				resolutionB[1] = sourceB.height;
			}

			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}
		};

		return {
			initialize: function (initialize) {
				initialize();
				this.uniforms.resolutionA = resolutionA;
				this.uniforms.resolutionB = resolutionB;
				baseShader = this.baseShader;
			},
			commonShader: true,
			shader: function (inputs, shaderSource) {
				shaderSource.vertex = [
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform vec2 resolutionA;',
					'uniform vec2 resolutionB;',
					'uniform mat4 projection;',
					//'uniform mat4 transform;',

					'varying vec2 vTexCoord;',
					'varying vec2 vTexCoordA;',
					'varying vec2 vTexCoordB;',

					'uniform float angle;',
					'varying float c;',
					'varying float s;',
					'varying float t;',

					'void main(void) {',
					'   c = cos(angle);',
					'   s = sin(angle);',
					'	t = abs(c + s);',

					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
					//'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
					'	gl_Position.w = screenPosition.w;',

					'	vec2 adjustedTexCoord = (texCoord - 0.5) * resolution;',
					'	vTexCoordA = adjustedTexCoord / resolutionA + 0.5;',
					'	vTexCoordB = adjustedTexCoord / resolutionB + 0.5;',
					'	vTexCoord = texCoord;',
					'}'
				].join('\n');
				shaderSource.fragment = [
					'precision mediump float;\n',

					'varying vec2 vTexCoord;',
					'varying vec2 vTexCoordA;',
					'varying vec2 vTexCoordB;',

					'varying float c;',
					'varying float s;',
					'varying float t;',

					'uniform sampler2D sourceA;',
					'uniform sampler2D sourceB;',
					'uniform float split;',
					'uniform float angle;',
					'uniform float fuzzy;',

					'vec4 textureLookup(sampler2D tex, vec2 texCoord) {',
					'	if (any(lessThan(texCoord, vec2(0.0))) || any(greaterThan(texCoord, vec2(1.0)))) {',
					'		return vec4(0.0);',
					'	} else {',
					'		return texture2D(tex, texCoord);',
					'	}',
					'}',

					'void main(void) {',
					'	vec4 pixel1 = textureLookup(sourceA, vTexCoordA);',
					'	vec4 pixel2 = textureLookup(sourceB, vTexCoordB);',
					'	float mn = (split - fuzzy * (1.0 - split));',
					'	float mx = (split + fuzzy * split);;',
					'	vec2 coords = vTexCoord - vec2(0.5);',
					'	coords = vec2(coords.x * c - coords.y * s, coords.x * s + coords.y * c);',
					'	float scale = max(abs(c - s), abs(s + c));',
					'	coords /= scale;',
					'	coords += vec2(0.5);',
					'	float x = coords.x;;',
					'	gl_FragColor = mix(pixel2, pixel1, smoothstep(mn, mx, x));',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				if (uniforms.split >= 1) {
					uniforms.source = uniforms.sourceB;
					parent(baseShader, model, uniforms, frameBuffer);
					return;
				}

				if (uniforms.split <= 0) {
					uniforms.source = uniforms.sourceA;
					parent(baseShader, model, uniforms, frameBuffer);
					return;
				}

				parent(shader, model, uniforms, frameBuffer);
			},
			inPlace: false,
			requires: function (sourceName, inputs) {
				if (sourceName === 'sourceA' && inputs.split >= 1) {
					return false;
				}

				if (sourceName === 'sourceB' && inputs.split <= 0) {
					return false;
				}

				return true;
			}
		};
	},
	{
		inputs: {
			sourceA: {
				type: 'image',
				uniform: 'sourceA',
				shaderDirty: false,
				update: function () {
					this.resize();
				}
			},
			sourceB: {
				type: 'image',
				uniform: 'sourceB',
				shaderDirty: false,
				update: function () {
					this.resize();
				}
			},
			sizeMode: {
				type: 'enum',
				defaultValue: 'a',
				options: [
					'a',
					'b',
					'union',
					'intersection'
				],
				update: function () {
					this.resize();
				}
			},
			split: {
				type: 'number',
				uniform: 'split',
				defaultValue: 0.5,
				min: 0,
				max: 1,
				updateSources: true
			},
			angle: {
				type: 'number',
				uniform: 'angle',
				defaultValue: 0
			},
			fuzzy: {
				type: 'number',
				uniform: 'fuzzy',
				defaultValue: 0,
				min: 0,
				max: 1
			}
		},
		description: 'Split screen or wipe',
		title: 'Split'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('throttle', function () {
		var lastDrawTime = 0;
		return {
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				if (this.inputs.frameRate && Date.now() - lastDrawTime >= 1000 / this.inputs.frameRate) {
					draw(shader, model, uniforms, frameBuffer);
					lastDrawTime = Date.now();
				}
			},
			requires: function (sourceName, inputs) {
				if (inputs.frameRate && Date.now() - lastDrawTime >= 1000 / inputs.frameRate) {
					return true;
				}

				return false;
			}
		};
	}, {
		inPlace: true,
		commonShader: true,
		title: 'Throttle',
		description: 'Throttle frame rate',
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			frameRate: {
				type: 'number',
				uniform: 'opacity',
				defaultValue: 15,
				min: 0
			}
		}
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('tone', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec4 light;',
				'uniform vec4 dark;',
				'uniform float desat;',
				'uniform float toned;',

				'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);',

				'void main(void) {',
				'	vec4 sourcePixel = texture2D(source, vTexCoord);',
				'	vec3 sceneColor = light.rgb * sourcePixel.rgb;',
				'	vec3 gray = vec3(dot(lumcoeff, sceneColor));',
				'	vec3 muted = mix(sceneColor, gray, desat);',
				'	vec3 tonedColor = mix(dark.rgb, light.rgb, gray);',
				'	gl_FragColor = vec4(mix(muted, tonedColor, toned), sourcePixel.a);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			light: {
				type: 'color',
				uniform: 'light',
				defaultValue: [1, 0.9, 0.5, 1]
			},
			dark: {
				type: 'color',
				uniform: 'dark',
				defaultValue: [0.2, 0.05, 0, 1]
			},
			toned: {
				type: 'number',
				uniform: 'toned',
				defaultValue: 1,
				minimumRange: 0,
				maximumRange: 1
			},
			desat: {
				type: 'number',
				uniform: 'desat',
				defaultValue: 0.5,
				minimumRange: 0,
				maximumRange: 1
			}
		},
		title: 'Tone',
		description: ''
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	//particle parameters
	var minVelocity = 0.2,
		maxVelocity = 0.8,
		minSize = 0.02,
		maxSize = 0.3,
		particleCount = 20;

	Seriously.plugin('tvglitch', function () {
		var lastHeight,
			lastTime,
			particleBuffer,
			particleShader,
			particleFrameBuffer,
			gl;

		return {
			initialize: function (parent) {
				var i,
					sizeRange,
					velocityRange,
					particleVertex,
					particleFragment,
					particles;

				gl = this.gl;

				lastHeight = this.height;

				//initialize particles
				particles = [];
				sizeRange = maxSize - minSize;
				velocityRange = maxVelocity - minVelocity;
				for (i = 0; i < particleCount; i++) {
					particles.push(Math.random() * 2 - 1); //position
					particles.push(Math.random() * velocityRange + minVelocity); //velocity
					particles.push(Math.random() * sizeRange + minSize); //size
					particles.push(Math.random() * 0.2); //intensity
				}

				particleBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particles), gl.STATIC_DRAW);
				particleBuffer.itemSize = 4;
				particleBuffer.numItems = particleCount;

				particleVertex = [
					'precision mediump float;',

					'attribute vec4 particle;',

					'uniform float time;',
					'uniform float height;',

					'varying float intensity;',

					'void main(void) {',
					'	float y = particle.x + time * particle.y;',
					'	y = fract((y + 1.0) / 2.0) * 4.0 - 2.0;',
					'	intensity = particle.w;',
					'	gl_Position = vec4(0.0, -y , 1.0, 2.0);',
					//'	gl_Position = vec4(0.0, 1.0 , 1.0, 1.0);',
					'	gl_PointSize = height * particle.z;',
					'}'
				].join('\n');

				particleFragment = [
					'precision mediump float;',

					'varying float intensity;',

					'void main(void) {',
					'	gl_FragColor = vec4(1.0);',
					'	gl_FragColor.a = 2.0 * intensity * (1.0 - abs(gl_PointCoord.y - 0.5));',
					'}'
				].join('\n');

				particleShader = new Seriously.util.ShaderProgram(gl, particleVertex, particleFragment);

				particleFrameBuffer = new Seriously.util.FrameBuffer(gl, 1, Math.max(1, this.height / 2));
				parent();
			},
			commonShader: true,
			shader: function (inputs, shaderSource) {
				shaderSource.fragment = [
					'precision mediump float;',

					'#define HardLight(top, bottom)  (1.0 - 2.0 * (1.0 - top) * (1.0 - bottom))',

					'varying vec2 vTexCoord;',

					'uniform sampler2D source;',
					'uniform sampler2D particles;',
					'uniform float time;',
					'uniform float scanlines;',
					'uniform float lineSync;',
					'uniform float lineHeight;', //for scanlines and distortion
					'uniform float distortion;',
					'uniform float vsync;',
					'uniform float bars;',
					'uniform float frameSharpness;',
					'uniform float frameShape;',
					'uniform float frameLimit;',
					'uniform vec4 frameColor;',

					//todo: need much better pseudo-random number generator
					Seriously.util.shader.noiseHelpers +
					Seriously.util.shader.snoise2d +

					'void main(void) {',
					'	vec2 texCoord = vTexCoord;',

						//distortion
					'	float drandom = snoise(vec2(time * 50.0, texCoord.y /lineHeight));',
					'	float distortAmount = distortion * (drandom - 0.25) * 0.5;',
						//line sync
					'	vec4 particleOffset = texture2D(particles, vec2(0.0, texCoord.y));',
					'	distortAmount -= lineSync * (2.0 * particleOffset.a - 0.5);',

					'	texCoord.x -= distortAmount;',
					'	texCoord.x = mod(texCoord.x, 1.0);',

						//vertical sync
					'	float roll;',
					'	if (vsync != 0.0) {',
					'		roll = fract(time / vsync);',
					'		texCoord.y = mod(texCoord.y - roll, 1.0);',
					'	}',

					'	vec4 pixel = texture2D(source, texCoord);',

						//horizontal bars
					'	float barsAmount = particleOffset.r;',
					'	if (barsAmount > 0.0) {',
					'		pixel = vec4(pixel.r + bars * barsAmount,' +
								'pixel.g + bars * barsAmount,' +
								'pixel.b + bars * barsAmount,' +
								'pixel.a);',
					'	}',

					'	if (mod(texCoord.y / lineHeight, 2.0) < 1.0 ) {',
					'		pixel.rgb *= (1.0 - scanlines);',
					'	}',

					'	float f = (1.0 - gl_FragCoord.x * gl_FragCoord.x) * (1.0 - gl_FragCoord.y * gl_FragCoord.y);',
					'	float frame = clamp( frameSharpness * (pow(f, frameShape) - frameLimit), 0.0, 1.0);',

					'	gl_FragColor = mix(frameColor, pixel, frame);',
					'}'
				].join('\n');

				return shaderSource;
			},
			resize: function () {
				if (particleFrameBuffer) {
					particleFrameBuffer.resize(1, Math.max(1, this.height / 2));
				}
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				var doParticles = (lastTime !== this.inputs.time),
					vsyncPeriod;

				if (lastHeight !== this.height) {
					lastHeight = this.height;
					doParticles = true;
				}

				//todo: make this configurable?
				uniforms.lineHeight = 1 / this.height;

				if (this.inputs.verticalSync) {
					vsyncPeriod = 0.2 / this.inputs.verticalSync;
					uniforms.vsync = vsyncPeriod;
				} else {
					vsyncPeriod = 1;
					uniforms.vsync = 0;
				}
				uniforms.time = (this.inputs.time % (1000 * vsyncPeriod));
				uniforms.distortion = Math.random() * this.inputs.distortion;

				//render particle canvas and attach uniform
				//todo: this is a good spot for parallel processing. ParallelArray maybe?
				if (doParticles && (this.inputs.lineSync || this.inputs.bars)) {
					particleShader.use();
					gl.viewport(0, 0, 1, this.height / 2);
					gl.bindFramebuffer(gl.FRAMEBUFFER, particleFrameBuffer.frameBuffer);
					gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
					gl.enableVertexAttribArray(particleShader.location.particle);
					gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
					gl.vertexAttribPointer(particleShader.location.particle, particleBuffer.itemSize, gl.FLOAT, false, 0, 0);
					gl.enable(gl.BLEND);
					gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
					particleShader.time.set(uniforms.time);
					particleShader.height.set(this.height);
					gl.drawArrays(gl.POINTS, 0, particleCount);

					lastTime = this.inputs.time;
				}
				uniforms.particles = particleFrameBuffer.texture;

				parent(shader, model, uniforms, frameBuffer);
			},
			destroy: function () {
				particleBuffer = null;
				if (particleFrameBuffer) {
					particleFrameBuffer.destroy();
					particleFrameBuffer = null;
				}
			}
		};
	},
	{
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			time: {
				type: 'number',
				defaultValue: 0
			},
			distortion: {
				type: 'number',
				defaultValue: 0.1,
				min: 0,
				max: 1
			},
			verticalSync: {
				type: 'number',
				defaultValue: 0.1,
				min: 0,
				max: 1
			},
			lineSync: {
				type: 'number',
				uniform: 'lineSync',
				defaultValue: 0.2,
				min: 0,
				max: 1
			},
			scanlines: {
				type: 'number',
				uniform: 'scanlines',
				defaultValue: 0.3,
				min: 0,
				max: 1
			},
			bars: {
				type: 'number',
				uniform: 'bars',
				defaultValue: 0,
				min: 0,
				max: 1
			},
			frameShape: {
				type: 'number',
				uniform: 'frameShape',
				min: 0,
				max: 2,
				defaultValue: 0.27
			},
			frameLimit: {
				type: 'number',
				uniform: 'frameLimit',
				min: -1,
				max: 1,
				defaultValue: 0.34
			},
			frameSharpness: {
				type: 'number',
				uniform: 'frameSharpness',
				min: 0,
				max: 40,
				defaultValue: 8.4
			},
			frameColor: {
				type: 'color',
				uniform: 'frameColor',
				defaultValue: [0, 0, 0, 1]
			}
		},
		title: 'TV Glitch'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*
	Vibrance is similar to saturation, but it has less effect on skin tones
	http://www.iceflowstudios.com/2013/tips/vibrance-vs-saturation-in-photoshop/

	Shader adapted from glfx.js by Evan Wallace
	License: https://github.com/evanw/glfx.js/blob/master/LICENSE
	*/

	Seriously.plugin('vibrance', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float amount;',

				'void main(void) {',
				'	vec4 color = texture2D(source, vTexCoord);',

				'	float average = (color.r + color.g + color.b) / 3.0;',
				'	float mx = max(color.r, max(color.g, color.b));',
				'	float amt = (mx - average) * (-3.0 * amount);',
				'	color.rgb = mix(color.rgb, vec3(mx), amt);',
				'	gl_FragColor = color;',

				/*
				https://github.com/v002/v002-Color-Controls
				doesn't work so well with values < 0
				'	const vec4 lumacoeff = vec4(0.299,0.587,0.114, 0.);',
				'	vec4 luma = vec4(dot(color, lumacoeff));',
				'	vec4 mask = clamp(color - luma, 0.0, 1.0);',
				'	float lumaMask = 1.0 - dot(lumacoeff, mask);',
				'	gl_FragColor = mix(luma, color, 1.0 + amount * lumaMask);',
				*/
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 0,
				min: -1,
				max: 1
			}
		},
		title: 'Vibrance',
		description: 'Non-peaking saturation effect'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('vignette', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float amount;',

				'void main(void) {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	vec2 pos = vTexCoord.xy - 0.5;',
				'	float vignette = 1.0 - (dot(pos, pos) * amount);',
				'	gl_FragColor = vec4(pixel.rgb * vignette, pixel.a);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 1,
				min: 0
			}
		},
		title: 'Vignette',
		description: 'Vignette'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*

	Math references:
	en.wikipedia.org/wiki/Color_balance
	http://scien.stanford.edu/pages/labsite/2010/psych221/projects/2010/JasonSu/adaptation.html
	https://github.com/ikaros-project/ikaros/blob/master/Source/Modules/VisionModules/WhiteBalance/WhiteBalance.cc

	*/

	var identity = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);

	Seriously.plugin('whitebalance', function () {
		var pyramidShader,
			pyramidBuffers = [],
			width,
			height,
			pyramidSize,
			log2 = Math.log(2),
			me = this,
			//baseShader, //todo: share one with main object
			gl,

			MAX_TEXTURE_SIZE;

		/*
		todo: handle special case where node is square and power of two. save on one pyramid iteration
		*/

		function updateSize(w, h) {
			var size, numLevels, n,
				i;

			if (width === w && height === h) {
				return;
			}

			width = w;
			height = h;

			numLevels = Math.ceil(Math.log(Math.max(h, w)) / log2);
			size = Math.pow(2, numLevels);

			if (size > MAX_TEXTURE_SIZE) {
				numLevels = Math.ceil(Math.log(MAX_TEXTURE_SIZE) / log2);
				size = MAX_TEXTURE_SIZE;
			}

			numLevels++;
			if (pyramidSize === size) {
				return;
			}

			pyramidSize = size;

			while (pyramidBuffers.length > numLevels) {
				(pyramidBuffers.pop()).fb.destroy();
			}

			while (pyramidBuffers.length < numLevels) {
				i = pyramidBuffers.length;
				n = Math.pow(2, i);
				pyramidBuffers.push({
					fb: new Seriously.util.FrameBuffer(me.gl, n, n),//, true),
					opts: {
						width: n,
						height: n
					},
					uniforms: {
						level: pyramidBuffers.length,
						offset: 0.25 / n,
						transform: identity,
						projection: identity,
						resolution: [n, n]
					}
				});

				if (i) {
					pyramidBuffers[i - 1].uniforms.source = pyramidBuffers[i].fb.texture;
				}
			}
		}


		return {
			initialize: function (initialize) {
				gl = this.gl;

				MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE);

				if (this.inputs.auto) {
					updateSize(this.width, this.height);
				}

				initialize();
			},
			shader: function (inputs, shaderSource) {
				var auto = inputs.auto;
				//todo: gl.getExtension('OES_texture_float_linear')

				if (auto && !pyramidShader) {
					pyramidShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex, [
						'precision mediump float;',

						'varying vec2 vTexCoord;',

						'uniform sampler2D source;',
						'uniform float offset;',
						'uniform int level;',

						'void main(void) {',
						//gl.getExtension("OES_texture_float"), gl.getExtension("OES_texture_float_linear")
						//'	vec4 pixel = texture2D(source, vTexCoord);',

						'	vec4 pixel = texture2D(source, vTexCoord - vec2(offset)) +',
						'		texture2D(source, vTexCoord + vec2(offset, -offset)) +',
						'		texture2D(source, vTexCoord + vec2(offset)) +',
						'		texture2D(source, vTexCoord + vec2(-offset, offset));',
						'	pixel /= 4.0;',
						'	gl_FragColor = pixel;',
						'}'
					].join('\n'));
				}

				shaderSource.fragment = [
					auto ? '#define AUTO' : '',
					'precision mediump float;',

					'varying vec2 vTexCoord;',

					'uniform sampler2D source;',
					'#ifdef AUTO',
					'uniform sampler2D whiteSource;',
					'#else',
					'uniform vec4 white;',
					'#endif',

					// matrices from: http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
					/*
					raw RGB just seems to work better so let's use that until we figure Bradford out
					'const mat3 rgbToBradford = mat3(',
					'	0.4360747, 0.2225045, 0.0139322,',
					'	0.3850649, 0.7168786, 0.0971045,',
					'	0.1430804, 0.0606169, 0.7141733',
					');',

					'const mat3 bradfordToRgb = mat3(',
					'	3.1338561, -0.9787684, 0.0719453,',
					'	-1.6168667, 1.9161415, -0.2289914,',
					'	-0.4906146, 0.033454, 1.4052427',
					');',
					*/

					'const vec3 luma = vec3(0.2125, 0.7154, 0.0721);',

					'void main(void) {',
					'	vec4 pixel = texture2D(source, vTexCoord);',
					'#ifdef AUTO',
					'	vec4 white = texture2D(whiteSource, vTexCoord);',
					'#endif',
					/*
					'	vec3 whiteBradford = rgbToBradford * white.rgb;',
					'	vec3 targetBradford = rgbToBradford * vec3(dot(white.rgb, luma));',
					'	vec3 colorBradford = rgbToBradford * pixel.rgb;',
					'	pixel.rgb = clamp(bradfordToRgb * (colorBradford * targetBradford / whiteBradford), 0.0, 1.0);',
					*/
					'	vec3 target = vec3(dot(white.rgb, luma));',
					'	pixel.rgb = pixel.rgb * target / white.rgb;',
					'	gl_FragColor = pixel;',
					'}'
				].join('\n');

				return shaderSource;
			},
			resize: function () {
				if (this.gl && this.inputs.auto) {
					updateSize(this.width, this.height);
				}
			},
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				var i,
					buf;

				if (this.inputs.auto) {
					i = pyramidBuffers.length - 1;
					pyramidBuffers[i].uniforms.source = uniforms.source;
					while (i >= 0) {
						buf = pyramidBuffers[i];
						draw(pyramidShader, model, buf.uniforms, buf.fb.frameBuffer, null, buf.opts);
						i--;
					}

					uniforms.whiteSource = pyramidBuffers[0].fb.texture;
				}

				draw(shader, model, uniforms, frameBuffer);
			},
			destroy: function () {
				while (pyramidBuffers.length) {
					pyramidBuffers.pop().destroy();
				}
			},
			inPlace: false,
			inputs: {
				source: {
					type: 'image',
					uniform: 'source',
					shaderDirty: false
				},
				white: {
					type: 'color',
					uniform: 'white',
					defaultValue: [1, 1, 1]
				},
				auto: {
					type: 'boolean',
					shaderDirty: true,
					defaultValue: true
				}
			}
		};
	},
	{
		title: 'White Balance'
	});
}));

/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*
	Camera Shake
	- amplitude (x/y)
	- rotation (degrees)
	- frequency
	- octaves
	- autoScale (true/false)
	*/


	/*
	Simplex Noise
	adapted from https://github.com/jwagner/simplex-noise.js
	*/

	var mat4 = Seriously.util.mat4,

		PI = Math.PI,

		f2 = 0.5 * (Math.sqrt(3.0) - 1.0),
		g2 = (3.0 - Math.sqrt(3.0)) / 6.0,

		random = Math.random,
		p,
		perm,
		permMod12,
		grad3,
		initialized = false;

	function initializeSimplex() {
		//initialize simplex lookup tables
		var i;
		if (!initialized) {
			p = new Uint8Array(256);
			perm = new Uint8Array(512);
			permMod12  = new Uint8Array(512);
			grad3 = new Float32Array([
				1, 1, 0,
				- 1, 1, 0,
				1, - 1, 0,

				- 1, - 1, 0,
				1, 0, 1,
				- 1, 0, 1,

				1, 0, - 1,
				- 1, 0, - 1,
				0, 1, 1,

				0, - 1, 1,
				0, 1, - 1,
				0, - 1, - 1
			]);

			for (i = 0; i < 256; i++) {
				p[i] = random() * 256;
			}
			for (i = 0; i < 512; i++) {
				perm[i] = p[i & 255];
				permMod12[i] = perm[i] % 12;
			}
			initialized = true;
		}
	}

	function noise2D(xin, yin) {
		var n0 = 0, // Noise contributions from the three corners
			n1 = 0, // Skew the input space to determine which simplex cell we're in
			n2 = 0,

			s = (xin + yin) * f2, // Hairy factor for 2D
			i = Math.floor(xin + s),
			j = Math.floor(yin + s),
			t = (i + j) * g2,

			xx0 = i - t, // Unskew the cell origin back to (x,y) space
			yy0 = j - t,

			x0 = xin - xx0,
			y0 = yin - yy0,

			/*
			For the 2D case, the simplex shape is an equilateral triangle.
			Determine which simplex we are in.

			Offsets for second (middle) corner of simplex in (i,j) coords
			*/
			i1 = x0 > y0 ? 1 : 0,
			j1 = (i1 + 1) % 2, //opposite of i1

			x1 = x0 - i1 + g2,
			y1 = y0 - j1 + g2,
			x2 = x0 - 1 + 2 * g2,
			y2 = y0 - 1 + 2 * g2,

			ii = i & 255,
			jj = j & 255,

			t0 = 0.5 - x0 * x0 - y0 * y0,

			t1,
			t2,

			gi;

		if (t0 >= 0) {
            gi = permMod12[ii + perm[jj]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi] * x0 + grad3[gi + 1] * y0); // (x,y) of grad3 used for 2D gradient
        }

        t1 = 0.5 - x1 * x1 - y1 * y1;
		if (t1 >= 0) {
			gi = permMod12[ii + i1 + perm[jj + j1]] * 3;
			t1 *= t1;
			n1 = t1 * t1 * (grad3[gi] * x1 + grad3[gi + 1] * y1);
		}

		t2 = 0.5 - x2 * x2 - y2 * y2;
		if (t2 >= 0) {
			gi = permMod12[ii + 1 + perm[jj + 1]] * 3;
			t2 *= t2;
			n2 = t2 * t2 * (grad3[gi] * x2 + grad3[gi + 1] * y2);
		}

		return 70.0 * (n0 + n1 + n2);
	}

	Seriously.transform('camerashake', function () {
		var me = this,
			octaves = 1,
			time = 0,
			amplitudeX = 0,
			amplitudeY = 0,
			frequency = 1,
			rotation = 0,
			preScale = 0,
			autoScale = true,
			maxScale = 1;

		function calcScale(x, y, angle) {
			var width = me.width,
				height = me.height,
				scale = 1,
				x0, y0,
				x1, y1,
				x2, y2,
				sin,
				cos;

			// angle mod 180
			angle = angle - PI * Math.floor(angle / PI);

			if (angle) {
				sin = Math.sin(angle);
				cos = Math.sqrt(1 - sin * sin);

				/*
				Take two top corner points, rotate them and find absolute value.
				This should find the bounding box of the rotated recangle,
				assuming it's centered at 0, 0
				*/

				// rotate point top right corner
				x0 = width / 2;
				y0 = height / 2;
				x1 = Math.abs(x0 * cos - y0 * sin);
				y1 = Math.abs(x0 * sin + y0 * cos);

				// rotate point top left corner
				x0 = -x0;
				x2 = Math.abs(x0 * cos - y0 * sin);
				y2 = Math.abs(x0 * sin + y0 * cos);

				// find maximum scale
				scale = 2 * Math.max(x1 / width, x2 / width, y1 / height, y2 / height);
			}

			scale *= Math.max(
				(2 * Math.abs(x) + width) / width,
				(2 * Math.abs(y) + height) / height
			);

			return scale;
		}

		function recompute() {
			var matrix = me.matrix,
				s, c,
				t,
				freq,
				amp,
				adjust = 0,
				i,
				scale = 1,
				translateX = 0,
				translateY = 0,
				rotationZ = 0,
				angle = 0,
				m00,
				m01,
				m02,
				m03,
				m10,
				m11,
				m12,
				m13;

			function translate(x, y) {
				matrix[12] = matrix[0] * x + matrix[4] * y + matrix[12];
				matrix[13] = matrix[1] * x + matrix[5] * y + matrix[13];
				matrix[14] = matrix[2] * x + matrix[6] * y + matrix[14];
				matrix[15] = matrix[3] * x + matrix[7] * y + matrix[15];
			}

			function rotateZ() {
				if (!rotationZ) {
					return;
				}

				s = Math.sin(angle);
				c = Math.cos(angle);

				m00 = matrix[0];
				m01 = matrix[1];
				m02 = matrix[2];
				m03 = matrix[3];
				m10 = matrix[4];
				m11 = matrix[5];
				m12 = matrix[6];
				m13 = matrix[7];

				matrix[0] = m00 * c + m10 * s;
				matrix[1] = m01 * c + m11 * s;
				matrix[2] = m02 * c + m12 * s;
				matrix[3] = m03 * c + m13 * s;
				matrix[4] = m10 * c - m00 * s;
				matrix[5] = m11 * c - m01 * s;
				matrix[6] = m12 * c - m02 * s;
				matrix[7] = m13 * c - m03 * s;
			}

			if (!amplitudeX &&
					!amplitudeY &&
					!rotation
					) {
				me.transformed = false;
				return;
			}

			t = time * frequency;

			for (i = 0; i < octaves; i++) {
				freq = Math.pow(2, i);
				amp = Math.pow(0.5, i);
				adjust += amp;
				if (rotation) {
					rotationZ += noise2D(t * freq, 7 * freq) * amp;
				}
				if (amplitudeX) {
					translateX += noise2D(t * freq, 11 * freq) * amp;
				}
				if (amplitudeY) {
					translateY += noise2D(t * freq, 13 * freq) * amp;
				}
			}
			rotationZ *= rotation / adjust;
			translateX *= amplitudeX / adjust;
			translateY *= amplitudeY / adjust;
			angle = rotationZ * PI / 180;

			//calculate transformation matrix
			mat4.identity(matrix);

			translate(translateX, translateY);

			rotateZ();

			if (autoScale) {
				if (preScale === 1) {
					scale = maxScale;
				} else {
					scale = calcScale(translateX, translateY, angle);
					scale = preScale * maxScale + (1 - preScale) * scale;
				}

				//scale
				if (scale !== 1) {
					matrix[0] *= scale;
					matrix[1] *= scale;
					matrix[2] *= scale;
					matrix[3] *= scale;
					matrix[4] *= scale;
					matrix[5] *= scale;
					matrix[6] *= scale;
					matrix[7] *= scale;
				}
			}

			me.transformed = true;
		}

		initializeSimplex();

		return {
			resize: recompute,
			inputs: {
				time: {
					get: function () {
						return time;
					},
					set: function (t) {
						if (t === time) {
							return false;
						}

						time = t;

						recompute();
						return true;
					},
					type: 'number'
				},
				frequency: {
					get: function () {
						return frequency;
					},
					set: function (f) {
						if (f === frequency) {
							return false;
						}

						frequency = f;

						recompute();
						return true;
					},
					type: 'number'
				},
				octaves: {
					get: function () {
						return octaves;
					},
					set: function (o) {
						o = Math.max(1, o);
						if (o === octaves) {
							return false;
						}

						octaves = o;

						recompute();
						return true;
					},
					type: 'number'
				},
				rotation: {
					get: function () {
						return rotation;
					},
					set: function (r) {
						if (r === rotation) {
							return false;
						}

						rotation = r;

						maxScale = calcScale(amplitudeX, amplitudeY, rotation * PI / 180);
						recompute();
						return true;
					},
					type: 'number'
				},
				amplitudeX: {
					get: function () {
						return amplitudeX;
					},
					set: function (x) {
						x = Math.max(0, x);
						if (x === amplitudeX) {
							return false;
						}

						amplitudeX = x;

						maxScale = calcScale(amplitudeX, amplitudeY, rotation * PI / 180);
						recompute();
						return true;
					},
					type: 'number'
				},
				amplitudeY: {
					get: function () {
						return amplitudeY;
					},
					set: function (y) {
						y = Math.max(0, y);
						if (y === amplitudeY) {
							return false;
						}

						amplitudeY = y;

						maxScale = calcScale(amplitudeX, amplitudeY, rotation * PI / 180);
						recompute();
						return true;
					},
					type: 'number'
				},
				autoScale: {
					get: function () {
						return autoScale;
					},
					set: function (a) {
						a = !!a;
						if (a === autoScale) {
							return false;
						}

						autoScale = a;

						recompute();
						return true;
					},
					type: 'boolean'
				},
				preScale: {
					get: function () {
						return preScale;
					},
					set: function (ps) {
						ps = Math.max(0, Math.min(1, ps));
						if (ps === preScale) {
							return false;
						}

						preScale = ps;

						recompute();
						return true;
					},
					type: 'number'
				}
			}
		};
	}, {
		title: 'Camera Shake'
	});
}));
/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	var mat4 = Seriously.util.mat4;

	/*
	3D transform
	- translate
	- rotate (degrees)
	- scale
	*/
	Seriously.transform('3d', function (options) {
		var me = this,
			degrees = !(options && options.radians),
			centerX = 0,
			centerY = 0,
			centerZ = 0,
			scaleX = 1,
			scaleY = 1,
			scaleZ = 1,
			translateX = 0,
			translateY = 0,
			translateZ = 0,
			rotationX = 0,
			rotationY = 0,
			rotationZ = 0,
			rotationOrder = 'XYZ';

		function recompute() {
			var matrix = me.matrix,
				s, c,
				m00,
				m01,
				m02,
				m03,
				m10,
				m11,
				m12,
				m13,
				m20,
				m21,
				m22,
				m23;

			function translate(x, y, z) {
				matrix[12] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
				matrix[13] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
				matrix[14] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
				matrix[15] = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
			}

			function rotateX() {
				var angle;

				if (!rotationX) {
					return;
				}

				angle = -(degrees ? rotationX * Math.PI / 180 : rotationX);

				s = Math.sin(angle);
				c = Math.cos(angle);

				m10 = matrix[4];
				m11 = matrix[5];
				m12 = matrix[6];
				m13 = matrix[7];
				m20 = matrix[8];
				m21 = matrix[9];
				m22 = matrix[10];
				m23 = matrix[11];

				matrix[4] = m10 * c + m20 * s;
				matrix[5] = m11 * c + m21 * s;
				matrix[6] = m12 * c + m22 * s;
				matrix[7] = m13 * c + m23 * s;
				matrix[8] = m20 * c - m10 * s;
				matrix[9] = m21 * c - m11 * s;
				matrix[10] = m22 * c - m12 * s;
				matrix[11] = m23 * c - m13 * s;
			}

			function rotateY() {
				var angle;

				if (!rotationY) {
					return;
				}

				angle = -(degrees ? rotationY * Math.PI / 180 : rotationY);

				s = Math.sin(angle);
				c = Math.cos(angle);

				m00 = matrix[0];
				m01 = matrix[1];
				m02 = matrix[2];
				m03 = matrix[3];
				m20 = matrix[8];
				m21 = matrix[9];
				m22 = matrix[10];
				m23 = matrix[11];

				matrix[0] = m00 * c - m20 * s;
				matrix[1] = m01 * c - m21 * s;
				matrix[2] = m02 * c - m22 * s;
				matrix[3] = m03 * c - m23 * s;
				matrix[8] = m00 * s + m20 * c;
				matrix[9] = m01 * s + m21 * c;
				matrix[10] = m02 * s + m22 * c;
				matrix[11] = m03 * s + m23 * c;
			}

			function rotateZ() {
				var angle;

				if (!rotationZ) {
					return;
				}

				angle = -(degrees ? rotationZ * Math.PI / 180 : rotationZ);

				s = Math.sin(angle);
				c = Math.cos(angle);

				m00 = matrix[0];
				m01 = matrix[1];
				m02 = matrix[2];
				m03 = matrix[3];
				m10 = matrix[4];
				m11 = matrix[5];
				m12 = matrix[6];
				m13 = matrix[7];

				matrix[0] = m00 * c + m10 * s;
				matrix[1] = m01 * c + m11 * s;
				matrix[2] = m02 * c + m12 * s;
				matrix[3] = m03 * c + m13 * s;
				matrix[4] = m10 * c - m00 * s;
				matrix[5] = m11 * c - m01 * s;
				matrix[6] = m12 * c - m02 * s;
				matrix[7] = m13 * c - m03 * s;
			}

			if (!translateX &&
					!translateY &&
					!translateZ &&
					!rotationX &&
					!rotationY &&
					!rotationZ &&
					scaleX === 1 &&
					scaleY === 1 &&
					scaleZ === 1
					) {
				me.transformed = false;
				return;
			}

			//calculate transformation matrix
			mat4.identity(matrix);

			translate(translateX + centerX, translateY + centerY, translateZ + centerZ);

			if (rotationOrder === 'XYZ') {
				rotateX();
				rotateY();
				rotateZ();
			} else if (rotationOrder === 'XZY') {
				rotateX();
				rotateZ();
				rotateY();
			} else if (rotationOrder === 'YXZ') {
				rotateY();
				rotateX();
				rotateZ();
			} else if (rotationOrder === 'YZX') {
				rotateY();
				rotateZ();
				rotateX();
			} else if (rotationOrder === 'ZXY') {
				rotateZ();
				rotateX();
				rotateY();
			} else { //ZYX
				rotateZ();
				rotateY();
				rotateX();
			}

			//scale
			if (scaleX !== 1) {
				matrix[0] *= scaleX;
				matrix[1] *= scaleX;
				matrix[2] *= scaleX;
				matrix[3] *= scaleX;
			}
			if (scaleY !== 1) {
				matrix[4] *= scaleY;
				matrix[5] *= scaleY;
				matrix[6] *= scaleY;
				matrix[7] *= scaleY;
			}
			if (scaleZ !== 1) {
				matrix[8] *= scaleZ;
				matrix[9] *= scaleZ;
				matrix[10] *= scaleZ;
				matrix[11] *= scaleZ;
			}

			translate(-centerX, -centerY, -centerZ);

			me.transformed = true;
		}

		return {
			inputs: {
				reset: {
					method: function () {
						centerX = 0;
						centerY = 0;
						centerZ = 0;
						scaleX = 1;
						scaleY = 1;
						scaleZ = 1;
						translateX = 0;
						translateY = 0;
						translateZ = 0;
						rotationX = 0;
						rotationY = 0;
						rotationZ = 0;

						if (me.transformed) {
							me.transformed = false;
							return true;
						}

						return false;
					}
				},
				translate: {
					method: function (x, y, z) {
						if (isNaN(x)) {
							x = translateX;
						}

						if (isNaN(y)) {
							y = translateY;
						}

						if (isNaN(z)) {
							z = translateZ;
						}

						if (x === translateX && y === translateY && z === translateZ) {
							return false;
						}

						translateX = x;
						translateY = y;
						translateZ = z;

						recompute();
						return true;
					},
					type: [
						'number',
						'number',
						'number'
					]
				},
				translateX: {
					get: function () {
						return translateX;
					},
					set: function (x) {
						if (x === translateX) {
							return false;
						}

						translateX = x;

						recompute();
						return true;
					},
					type: 'number'
				},
				translateY: {
					get: function () {
						return translateY;
					},
					set: function (y) {
						if (y === translateY) {
							return false;
						}

						translateY = y;

						recompute();
						return true;
					},
					type: 'number'
				},
				translateZ: {
					get: function () {
						return translateZ;
					},
					set: function (z) {
						if (z === translateZ) {
							return false;
						}

						translateZ = z;

						recompute();
						return true;
					},
					type: 'number'
				},
				rotationOrder: {
					get: function () {
						return rotationOrder;
					},
					set: function (order) {
						if (order === rotationOrder) {
							return false;
						}

						rotationOrder = order;

						recompute();
						return true;
					},
					type: 'number'
				},
				rotationX: {
					get: function () {
						return rotationX;
					},
					set: function (angle) {
						if (angle === rotationX) {
							return false;
						}

						//todo: fmod 360deg or Math.PI * 2 radians
						rotationX = angle;

						recompute();
						return true;
					},
					type: 'number'
				},
				rotationY: {
					get: function () {
						return rotationY;
					},
					set: function (angle) {
						if (angle === rotationY) {
							return false;
						}

						//todo: fmod 360deg or Math.PI * 2 radians
						rotationY = angle;

						recompute();
						return true;
					},
					type: 'number'
				},
				rotationZ: {
					get: function () {
						return rotationZ;
					},
					set: function (angle) {
						if (angle === rotationZ) {
							return false;
						}

						//todo: fmod 360deg or Math.PI * 2 radians
						rotationZ = angle;

						recompute();
						return true;
					},
					type: 'number'
				},
				center: {
					method: function (x, y, z) {
						if (isNaN(x)) {
							x = centerX;
						}

						if (isNaN(y)) {
							y = centerY;
						}

						if (isNaN(z)) {
							z = centerZ;
						}

						if (x === centerX && y === centerY && z === centerZ) {
							return false;
						}

						centerX = x;
						centerY = y;
						centerZ = z;

						recompute();
						return true;
					},
					type: [
						'number',
						'number',
						'number'
					]
				},
				centerX: {
					get: function () {
						return centerX;
					},
					set: function (x) {
						if (x === centerX) {
							return false;
						}

						centerX = x;

						recompute();
						return true;
					},
					type: 'number'
				},
				centerY: {
					get: function () {
						return centerY;
					},
					set: function (y) {
						if (y === centerY) {
							return false;
						}

						centerY = y;

						recompute();
						return true;
					},
					type: 'number'
				},
				centerZ: {
					get: function () {
						return centerZ;
					},
					set: function (z) {
						if (z === centerZ) {
							return false;
						}

						centerZ = z;

						recompute();
						return true;
					},
					type: 'number'
				},
				scale: {
					method: function (x, y, z) {
						var newX, newY, newZ;

						if (isNaN(x)) {
							newX = scaleX;
						} else {
							newX = x;
						}

						/*
						if only one value is specified, set all to the same scale
						*/
						if (isNaN(y)) {
							if (!isNaN(x) && isNaN(z)) {
								newY = newX;
								newZ = newX;
							} else {
								newY = scaleY;
							}
						} else {
							newY = y;
						}

						if (isNaN(z)) {
							if (newZ === undefined) {
								newZ = scaleZ;
							}
						} else {
							newZ = z;
						}

						if (newX === scaleX && newY === scaleY && newZ === scaleZ) {
							return false;
						}

						scaleX = newX;
						scaleY = newY;
						scaleZ = newZ;

						recompute();
						return true;
					},
					type: [
						'number',
						'number',
						'number'
					]
				},
				scaleX: {
					get: function () {
						return scaleX;
					},
					set: function (x) {
						if (x === scaleX) {
							return false;
						}

						scaleX = x;

						recompute();
						return true;
					},
					type: 'number'
				},
				scaleY: {
					get: function () {
						return scaleY;
					},
					set: function (y) {
						if (y === scaleY) {
							return false;
						}

						scaleY = y;

						recompute();
						return true;
					},
					type: 'number'
				},
				scaleZ: {
					get: function () {
						return scaleZ;
					},
					set: function (z) {
						if (z === scaleZ) {
							return false;
						}

						scaleZ = z;

						recompute();
						return true;
					},
					type: 'number'
				}
			}
		};
	}, {
		title: '3D Transform',
		description: 'Translate, Rotate, Scale'
	});
}));
/**   _   _____ _   _ 
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_| 2015
*    @author lo.th / http://lo-th.github.io/labs/
*/

'use strict';
var Seriously, UIL;
var Serious = { version:0.7 };

Serious.Sources = [ 'image', 'video', 'camera', 'scene', 'texture' ];

Serious.Effects = [
    'accumulator',         'ascii',         'bleach-bypass',      'blend',       'blur', 
    'brightness-contrast', 'channels',      'checkerboard',       'chroma',      'color', 

    'colorcomplements',    'colorcube',     'color-select',       'crop',        'daltonize', 
    'directionblur',       'displacement',  'dither',             'edge',        'emboss',

    'exposure',            'expression',    'fader',              'falsecolor',  'filmgrain',
    'freeze',              'fxaa',          'gradientwipe',       'hex',         'highlights-shadows',

    'hue-saturation',      'invert',        'kaleidoscope',       'layer',       'linear-transfer',
    'lumakey',             'mirror',        'nightvision',        'noise',       'panorama',

    'pixelate',            'polar',         'repeat',             'ripple',      'scanlines',   
    'select',              'sepia',         'simplex',            'sketch',      'split',       

    'throttle',            'tone',          'tvglitch',           'vibrance',    'vignette',    
    'whitebalance'
];

Serious.Targets = [ 'texture-3D', 'canvas-3D' ];

Serious.BlendMode = [
    'normal',      'lighten',     'darken',      'multiply',   'average',
    'add',         'subtract',    'divide',      'difference', 'negation', 
    'exclusion',   'screen',      'overlay',     'softlight',  'hardlight', 
    'colordodge',  'colorburn',   'lineardodge', 'linearburn', 'linearlight', 
    'vividlight',  'pinlight',    'hardmix',     'reflect',    'glow',
    'phoenix',     'hue',         'saturation',  'color',      'luminosity',
    'darkercolor', 'lightercolor'
];

Serious.BlendSizeMode = [ 'bottom', 'top', 'union', 'intersection' ];

Serious.Editor = function(autorun, canvas ){

    this.body = document.body;

    this.glCanvas = canvas || null;
    this.seriously = new Seriously();
    if(autorun){
        this.seriously.go();
        console.log("auto")
    }

    // all referency to 3d textures
    this.textures = {};
    this.texture_default = null;
    this.canvas_default = null;

    this.maxLayer = 9;
    this.LAYER = 0;

    this.tmp = [];

    this.xDecale = 50;
    this.xprevdecale = [];

    this.isFirst = true;

    this.visible = true;

    this.size = {x:300, y:250};
    this.gridsize = {x:1000, y:1000};

    this.linkTest = {source:-1, target:-1, sourceN:0, targetN:0};

    this.startIn = -1;
    this.startOut = -1;

    this.startInN = 0;
    this.startOutN = 0;

    this.interval = null;

    this.root_source = '';
    this.root_target = '';
    this.current_source_node = '';

    this.nodesDiv = [];

    this.current = 'close';
    this.move = {name:'', element:null, down:false, test:false,  x:0,y:0, tx:0, ty:0, mx:0, my:0};
    this.nset = { 
        w:40, h:40, r:6, 
        sc1:'rgba(120,30,60,0.5)', fc1:'rgba(30,120,60,0.5)', tc1:'rgba(30,60,120,0.5)', nc1:'rgba(40,40,40,0.5)',
        sc2:'rgba(120,30,60,0.8)', fc2:'rgba(30,120,60,0.8)', tc2:'rgba(30,60,120,0.8)', nc2:'rgba(40,40,40,0.8)',
    };

    this.selectID = -1;

    this.sels = [];

    this.init();
}

Serious.Editor.prototype = {
    constructor: Serious.Editor,
    showInterface:function(b){
        if(b){
            if( this.current !== 'close' )this.menu.style.display = 'block';
            this.content.style.display = 'block';
        }else{
            this.menu.style.display = 'none';
            this.content.style.display = 'none';
        }
    },
    render:function(){
        this.seriously.render();
    },
    element:function(className, type, css){
        type = type || 'div';
        var dom = document.createElement(type);
        if(className) dom.className = className;
        if(css) dom.style.cssText = css;
        return dom;
    },
    init:function(){
        var str = 'box-sizing:border-box; -moz-box-sizing:border-box; -webkit-box-sizing:border-box; font-family:Helvetica, Arial, sans-serif; font-size:12px; color:#e2e2e2;';
        Serious.createClass('S-editor', 'width:40px; height:40px; position:absolute; right:10px; top:20px; border:5px solid #282828; cursor:move; overflow:hidden; background:#1a1a1a;' + str );
        Serious.createClass('S-editor:hover', 'box-shadow:inset 0 0 0 1px #000');

        Serious.createClass('S-icc', 'position:absolute; left:-5px; top:-4px; text-align:center; width:40px; height:40px; pointer-events:none;'+ str);

        Serious.createClass('S-grid','position:absolute; left:0px; top:0px; pointer-events:none; width:'+this.gridsize.x+'px; height:'+this.gridsize.y+'px;'+ str);
        Serious.createClass('S-grid-plus', 'position:absolute; left:0px; top:0px; pointer-events:none;'+ str);

        Serious.createClass('S-menu', 'width:300px; height:20px; position:absolute; right:0px; top:0px; pointer-events:auto; background:#282828; display:none; '+ str);
        Serious.createClass('S-bmenu', 'width:300px; height:calc(100% - 270px); position:absolute; right:0px; top:270px; pointer-events:none; background:none; display:none; overflow:auto; overflow-x:hidden;'+ str);
        Serious.createClass('S-rmenu', 'width:300px; height:50px; position:absolute; right:0px; top:270px; pointer-events:none; background:#282828; display:none;'+ str);
        Serious.createClass('S-amenu', 'width:300px; height:auto; position:absolute; padding:3px; right:0px; top:50px; pointer-events:none; background:#282828; display:none; text-align:center;'+ str);

        // node
        Serious.createClass('S-S', 'width:'+this.nset.w+'px; height:'+this.nset.h+'px; position:absolute; background:'+this.nset.sc1+'; border-radius:'+this.nset.r+'px; cursor:default; pointer-events:auto;'+ str);
        Serious.createClass('S-E', 'width:'+this.nset.w+'px; height:'+this.nset.h+'px; position:absolute; background:'+this.nset.fc1+'; border-radius:'+this.nset.r+'px; cursor:default; pointer-events:auto;'+ str);
        Serious.createClass('S-T', 'width:'+this.nset.w+'px; height:'+this.nset.h+'px; position:absolute; background:'+this.nset.tc1+'; border-radius:'+this.nset.r+'px; cursor:default; pointer-events:auto;'+ str);
        // node over
        Serious.createClass('S-S:hover', 'background:'+this.nset.sc2+'; ');
        Serious.createClass('S-E:hover', 'background:'+this.nset.fc2+'; ');
        Serious.createClass('S-T:hover', 'background:'+this.nset.tc2+'; ');
        // node icon
        Serious.createClass('S-icon', 'width:'+this.nset.w+'px; height:'+this.nset.h+'px; position:absolute; left:0px; top:0px; pointer-events:none;'+ str);
        // selected
        Serious.createClass('S-select', 'margin-left:-1px; margin-top:-1px; width:'+(this.nset.w+2)+'px; height:'+(this.nset.h+2)+'px; position:absolute; border:2px solid #FFF; border-radius:'+(this.nset.r+1)+'px; display:none; pointer-events:none;'+ str);
        // link
        Serious.createClass('S-in', 'width:8px; height:8px; position:absolute; left:16px; top:-4px; border:2px solid #0F0; background:#000; border-radius:8px; cursor:alias; pointer-events:auto;'+ str);
        Serious.createClass('S-out', 'width:8px; height:8px; position:absolute; left:16px; bottom:-4px; border:2px solid #FF0; background:#000; border-radius:8px; cursor:alias; pointer-events:auto;'+ str);

        Serious.createClass('S-closeButton', 'position:absolute; left:0px; top:0px; width:25px; height:20px; font-size:14px; padding-top:5px; background:#none; pointer-events:auto; cursor:pointer; text-align:center;');
        Serious.createClass('S-closeButton:hover', 'background:#422; color:#F00;');

        Serious.createClass('S-sideButton', 'position:absolute; width:29px; height:20px; padding-top:5px; background:#282828; pointer-events:auto; cursor:pointer; font-size:14px; text-align:center; border-left:1px solid #333; color:#e2e2e2;');
        Serious.createClass('S-sideButton:hover', 'background:#404040;');
        Serious.createClass('S-sideButton-select:hover', 'background:#404040;');
        Serious.createClass('sideselect', ' background:#1a1a1a; color:#F0F; height:22px; border-right:1px solid #000;');

        Serious.createClass('root-button', 'position:absolute; left:10px; top:0px; width:26px; height:26px; border:1px solid #333; pointer-events:auto; cursor:pointer; overflow: hidden;'+ str);
        Serious.createClass('root-button-inner', 'position:absolute; left:-8px; top:-8px; pointer-events:none;')
        Serious.createClass('root-button:hover', 'background:#F0F;');
        Serious.createClass('root-button.select', 'background:#808;');

        Serious.createClass('root-text', 'position:absolute; left:10px; top:28px; width:280px; height:18px; pointer-events:none; padding-top:2px; padding-left:10px; background:rgba(0,0,0,0.2);'+ str);


        Serious.createClass('saveout', 'pointer-events:auto; cursor: pointer; width:90px; height:20px; position:absolute; top:6px; left: 132px; color:#F80; text-decoration:none;');

        Serious.createClass('hidden', 'opacity: 0; -moz-opacity: 0; filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0)');
        Serious.createClass('fileInput', 'cursor:pointer; height: 100%; position:absolute; top: 0; right: 0; font-size:50px;');

        Serious.createClass('mini-button', 'width:30px; height:30px; position:relative; margin-top:-3px; display:inline-block; background:#0F0; border:2px solid #282828; pointer-events:auto; cursor:pointer; border-radius:3px; overflow: hidden;'+ str);
        Serious.createClass('mini-button:hover', 'border:2px solid #e2e2e2;');
        Serious.createClass('mini-button-inner', 'position:absolute; left:-2px; top:-2px; pointer-events:none;');

        this.content = this.element('S-editor');
        this.content.name = 'root';

        this.menu = this.element('S-menu');
        this.bmenu = this.element('S-bmenu');
        this.rmenu = this.element('S-rmenu');
        this.amenu = this.element('S-amenu');
        this.grid = this.element('S-grid');
        this.gridBottom = this.element('S-gris-plus', 'canvas');
        this.select = this.element('S-select');
        this.gridTop = this.element('S-grid-plus');
        this.icc = this.element('S-icc');

        this.gridBottom.width = this.gridsize.x;
        this.gridBottom.height = this.gridsize.y;
        this.gridBottom.style.display = 'none';
        this.linkcontext = this.gridBottom.getContext('2d');
        this.icc.innerHTML = Serious.Logo(36, '#e2e2e2');

        this.initMenu();
        this.initRootMenu();

        this.body.appendChild( this.content );
        this.body.appendChild( this.menu );
        this.body.appendChild( this.bmenu );
        this.body.appendChild( this.rmenu );

        this.rmenu.appendChild( this.amenu );
        this.content.appendChild( this.icc );
        this.content.appendChild( this.grid );
        this.grid.appendChild( this.gridBottom );
        this.grid.appendChild( this.select );
        this.grid.appendChild( this.gridTop );
        
        this.content.oncontextmenu = function(e){ this.contextmenu(e); }.bind(this);
        this.content.onmouseover = function(e){ this.mouseover(e); }.bind(this);
        this.content.onmouseout = function(e){ this.mouseout(e); }.bind(this);
        this.content.onmouseup = function(e){ this.mouseup(e); }.bind(this);
        this.content.onmousedown = function(e){ this.mousedown(e); }.bind(this);
        this.content.onmousemove = function(e){ this.mousemove(e); }.bind(this);
        this.content.onmousewheel = function(e) {this.mousewheel(e)}.bind( this );
        this.content.addEventListener('DOMMouseScroll', function(e){ this.onmousewheel(e)}.bind( this ), false );
    },

    initMenu:function(){
        this.bclose = this.element('S-closeButton');
        this.bclose.innerHTML = 'X';
        this.bclose.onclick = function(e){ this.close(); }.bind(this);

        this.menu.appendChild( this.bclose );

        this.optionButton = [];
        var b;
        for(var i=0; i<this.maxLayer; i++){
            b = this.element('S-sideButton');
            b.innerHTML = i;
            b.style.left = 25+(i*30)+ 'px';
            b.name = i;
            this.menu.appendChild( b );
            b.onclick = function(e){  this.menuSelect(e.target.name);  }.bind(this);
            this.optionButton.push(b);

            // prepa variables
            this.xprevdecale.push( [-30,-30,-30] );
            this.tmp.push( { nodes:[], links:[] } );
        }
        this.menuSelect(0);
    },

    menuSelect:function(n, only){
        var i = this.optionButton.length;
        while(i--){
            if(n == i) this.optionButton[i].className = 'S-sideButton sideselect';
            else this.optionButton[i].className = 'S-sideButton';
        }
        if(!only)this.refresh(n);
    },


    // OPEN

    open:function(){
        this.current= 'open';
        this.content.style.width = this.size.x + 'px';
        this.content.style.height = this.size.y + 'px';
        this.content.style.right = '0px';
        this.content.style.top = '20px';

        this.icc.innerHTML = Serious.Logo(256, '#111');
        this.icc.style.top = '-7px';
        this.icc.style.left = '20px';

        var self = this;
        this.grid.style.background = 'url(' + (function() {
            var canvas = self.element(null,'canvas');
            canvas.width = 10;
            canvas.height = 10;
            var context = canvas.getContext('2d');
            context.fillStyle = 'rgba(0,0,0,0.2)';
            context.fillRect(9, 0, 1, 10);
            context.fillRect(0, 9, 10, 1);
            context.fillStyle = 'rgba(60,60,60,0.2)';
            context.fillRect(0, 0, 1, 9);
            context.fillRect(0, 0, 9, 1);
            return canvas.toDataURL();
        }()) + ')';

        this.menu.style.display = 'block';
        this.bmenu.style.display = 'block';
        this.rmenu.style.display = 'block';
        this.gridBottom.style.display = 'block';
        

        if(this.isFirst)this.refresh(0, true);
        else this.refresh(this.LAYER);
    },

    // CLOSE

    close:function(){
        this.current= 'close';
        this.content.style.width = '40px';
        this.content.style.height = '40px'
        this.content.style.right = '10px';
        this.content.style.top = '20px';

        this.grid.style.background = 'none';

        this.icc.innerHTML = Serious.Logo(36, '#e2e2e2');
        this.icc.style.top = '-4px';
        this.icc.style.left = '-5px';

        this.menu.style.display = 'none';
        this.bmenu.style.display = 'none';
        this.rmenu.style.display = 'none';
        this.gridBottom.style.display = 'none';

        this.clear();
        this.isFirst = false;
    },

    // CLEAR

    clear:function(){
        this.clearSelector();
        while(this.gridTop.firstChild) { this.gridTop.removeChild(this.gridTop.firstChild); }
        this.nodesDiv = [];
    },

    //------------------------
    // EXPORT
    //------------------------

    save:function(){
        var layer = this.LAYER;
        var i = 0, node, name, type, id, parametre;
        var predata = { "nodes": [], "links": [] };

        for(i=0; i<this.tmp[layer].nodes.length; i++){
            node = this.tmp[layer].nodes[i];
            name = node.name;
            type = this.getType(name);
            parametre = node.obj;//{id:this.getID(name)};
            parametre.id = this.getID(name);
            parametre.x = node.x;
            parametre.y = node.y;
            //prefix = this.getPrefix(name);
            predata.nodes.push( [type, parametre] );
        }
        for(i=0; i<this.tmp[layer].links.length; i++){
            predata.links.push(this.tmp[layer].links[i].getLink());
        }

        var data = JSON.stringify(predata, null, "\t");
        var blob = new Blob([data], { type: 'text/plain' });
        var objectURL = URL.createObjectURL(blob);

        //var a = document.createElement('a');
        var a = this.element('saveout', 'a');
        a.download = 'nono.json';//container.querySelector('input[type="text"]').value;
        a.href = objectURL;//window.URL.createObjectURL(bb);
        a.textContent = 'Download ready';
        //a.className = 'saveout'

        a.dataset.downloadurl = ['text/plain', a.download, a.href].join(':');
        a.draggable = true; // Don't really need, but good practice.
        //a.classList.add('dragout');
        this.rmenu.appendChild(a);

        a.onclick = function(e) {
            //URL.revokeObjectURL(a.href);
            this.rmenu.removeChild(a);
        }.bind(this);

        document.body.addEventListener('dragstart', function(e) {
          var a = e.target;
          if (a.classList.contains('saveout')) {
            e.dataTransfer.setData('DownloadURL', a.dataset.downloadurl);
          }
        }, false);

        //this.outsave = document.createElement('div');
        //this.outsave.className = 'saveout';
        //this.outsave.innerHTML = '<a href="'+objectURL+'" download="MyGoogleLogo">download me</a>';
        

        //fileWriter.write(blob)
        //window.open(objectURL, '_blank');
        //window.focus();
    },

    load:function(data){
        var i, l;
        this.reset( this.LAYER );
        //console.log(data);

        for(i=0; i<data.nodes.length; i++){
            this.add(data.nodes[i][0], data.nodes[i][1], this.LAYER);
        }
        for(i=0; i<data.links.length; i++){
            l = data.links[i];
            this.addLink(l[0], l[1], l[2], l[3],  this.LAYER);
        }
        this.refresh(this.LAYER);
    },


    initRootMenu:function(target){
        var i, b, c;
        this.isAddMenu = false;
        this.rText = this.element('root-text');
        this.rmenu.appendChild(this.rText);

        this.addB = this.element('root-button', 'div');
        this.loadB = this.element('root-button', 'div', 'left:40px');
        this.saveB = this.element('root-button', 'div', 'left:70px');

        this.rmenu.appendChild(this.addB);
        this.rmenu.appendChild(this.saveB);
        this.rmenu.appendChild(this.loadB);

        this.addB.onclick = function(e) { this.showAddMenu(); }.bind(this);
        this.addB.onmouseover = function(e) { if(this.isAddMenu)this.tell('hide add menu'); else this.tell('show add menu'); }.bind(this);
        this.addB.onmouseout = function(e) {  this.tell(); }.bind(this);

        this.saveB.onclick = function(e) { this.save(); }.bind(this);
        this.saveB.onmouseover = function(e) { this.tell('save to json'); }.bind(this);
        this.saveB.onmouseout = function(e) {  this.tell(); }.bind(this);

        this.loader = this.element('fileInput hidden', 'input');
        this.loader.type = "file";
        this.loadB.appendChild(this.loader);
        this.loadB.onmouseover = function(e) { this.tell('load json'); }.bind(this);
        this.loadB.onmouseout = function(e) {  this.tell(); }.bind(this);

        this.loadB.onchange = function(e) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var jsonTXT = e.target.result;
                var data = JSON.parse(jsonTXT);
                this.load(data);
            }.bind(this);
            reader.readAsText(this.loader.files[0]);
        }.bind(this);

        i = 3
        while(i--){
            b = this.element('root-button-inner');
            switch(i){
                case 0 :
                b.innerHTML = Serious.Icon('add');
                this.addB.appendChild(b);
                break;
                case 1 :
                b.innerHTML = Serious.Icon('load');
                this.loadB.appendChild(b);
                break;
                case 2 :
                b.innerHTML = Serious.Icon('save');
                this.saveB.appendChild(b);
                break;
            }
        }

        var bb = [], name;
        for(i=0; i<Serious.Sources.length; i++){
            b = this.element('mini-button', 'div', 'background:'+this.nset.sc1+';');
            b.name = Serious.Sources[i];
            bb.push(b);
        }
        for(i=0; i<Serious.Effects.length; i++){
            name = Serious.Effects[i];
            if(name == 'colorcube' || name == 'channels' || name == 'layer' || name == 'select') b = this.element('mini-button', 'div', 'background:'+this.nset.nc1+';');
            else b = this.element('mini-button', 'div', 'background:'+this.nset.fc1+';');
            b.name = name;
            bb.push(b);
        }
        for(i=0; i<Serious.Targets.length; i++){
            b = this.element('mini-button', 'div', 'background:'+this.nset.tc1+';');
            b.name = Serious.Targets[i];
            bb.push(b);
        }

        for(i=0; i<bb.length; i++){
            b = bb[i];
            c = this.element('mini-button-inner');
            c.innerHTML = Serious.Icon(b.name, 30);
            b.appendChild(c);
            this.amenu.appendChild(b);
            b.onmousedown = function(e) { this.addItem(e.target.name); }.bind(this);
            b.onmouseover = function(e) { this.tell('+ ' + e.target.name.substr(0,1).toUpperCase() + e.target.name.substr(1) ); }.bind(this);
            b.onmouseout =  function(e) { this.tell(); }.bind(this);
        }

    },

    tell:function(string){
        if(!string) string = 'Seriously editor v' + Serious.version;
        this.rText.innerHTML = string;
    },

    showAddMenu:function(){
        if(this.isAddMenu){
            this.isAddMenu = false;
            this.amenu.style.display = 'none';
            this.addB.className = 'root-button';
        }else{
            this.isAddMenu = true;
            this.amenu.style.display = 'block';
            this.addB.className = 'root-button select';
        }
    },


    //------------------------
    // ADD
    //------------------------

    addItem:function(type){
        if(type == 'texture-3D') this.add(type, { texture:this.texture_default }, this.LAYER);
        else this.add(type, {}, this.LAYER); 
        this.refresh(this.LAYER);
    },

    add:function(type, obj, layer){

        layer = layer || 0;

        obj = obj || {};
        var node, prefix;
        switch(type){
            case 'camera':
                prefix = 'S';
                node = this.seriously.source('camera'); 
            break;
            case 'texture':
                prefix = 'S';
                node = this.seriously.source(obj.texture, null , {}); 
            break;
            case 'video':
                prefix = 'S';
                node = document.createElement('video');
                //node.autoPlay = true;
                //node.loop = true;
                //node.play();
            break;
            case 'image':
                prefix = 'S'; 
                node = document.createElement('img');
                //node.url = obj.src;
            break;
            //--------------------------------- target
            case 'texture-3D':
                prefix = 'T';
                node = this.seriously.target( this.textures[obj.texture], { canvas:obj.canvas || this.glCanvas });
            break;
            case 'canvas-3D':
                prefix = 'T';
                node = this.seriously.target( obj.canvas || this.glCanvas );
            break;
            //--------------------------------- filter
            case 'reformat':
                prefix = 'E';
                node = this.seriously.transform('reformat');
            break;
            default:
                prefix = 'E';
                node = this.seriously.effect(type);
        }

        for(var e in obj){
            if(e!=='texture' && e!=='canvas' && e!=='id' && e!=='n' && e!=='x' && e!=='y' && e in node){
                node[e] = obj[e];
            }
        }

        var id = obj.id || this.tmp[layer].nodes.length;
        //if( obj.id !== undefined ) id = obj.id;
        //else id = this.tmp[layer].nodes.length;

        var name = prefix +'_'+ id + '.' + type;

        // remove old
        if(this.tmp[layer].nodes[id] !== undefined){
            this.tmp[layer].nodes[id].node.destroy();
            switch(prefix){
                case 'S': this.xprevdecale[layer][0]-=this.xDecale; break;
                case 'E': this.xprevdecale[layer][1]-=this.xDecale; break;
                case 'T': this.xprevdecale[layer][2]-=this.xDecale; break;
            }
            console.log('destroy')
        }

        var x, y;

        switch(prefix){
            case 'S': 
                this.xprevdecale[layer][0]+=this.xDecale;   
                x = this.xprevdecale[layer][0];   
                y = 20;
            break;
            case 'E': 
                this.xprevdecale[layer][1]+=this.xDecale;
                x = this.xprevdecale[layer][1];
                y = 100;
            break;
            case 'T': 
                this.xprevdecale[layer][2]+=this.xDecale;
                x = this.xprevdecale[layer][2];   
                y = 180;
            break;
        }

       // console.log(obj.x, obj.y)

        this.tmp[layer].nodes[id] = { n:obj.n || prefix +'_'+ id, name:name, node:node, x:obj.x || x, y:obj.y || y, obj:obj }
        //console.log(this.tmp[layer].nodes[id])
        
        return node;
    },

    addOnAll:function(type, obj ){
        var i = this.maxLayer;
        while(i--) this.add(type, obj, i);
    },

    reset:function(layer){
        this.xprevdecale[layer] = [-30,-30,-30];
        this.tmp[layer] = { nodes:[], links:[] };
    },

    //-----------------------------------------------------------

    // DISPLAY 

    refreshOnly:function(layer, force){
        layer = layer || 0;
        if(layer!==this.LAYER || force){
            this.LAYER = layer;
            this.applyLinks();
            this.menuSelect(layer,true);
        }
        this.isFirst = false;
    },
    
    refresh:function(layer, first){
        this.clear();

        layer = layer || 0;

        if(layer!==this.LAYER || first) this.LAYER = layer;

        var i = this.tmp[this.LAYER].nodes.length;

        while(i--) this.showNode( this.tmp[this.LAYER].nodes[i].name );
        
        this.updateLink();
        this.applyLinks();
    },

    
    //-----------------------------------------------------------

    // TOOLS

    getPrefix:function(name){
        return name.substring(0, name.lastIndexOf("_"));
    },
    getID:function(name){
        return name.substring(name.lastIndexOf("_")+1, name.lastIndexOf("."))*1;
    },
    getType:function(name){
        return name.substring(name.lastIndexOf(".")+1, name.length);
    },

    getIDByN:function(n){
        var i = this.tmp[this.LAYER].nodes.length;
        while(i--){ if(n == this.tmp[this.LAYER].nodes[i].n ) return i; }
    },
 
    byID:function(ID, layer){
        layer = layer || this.LAYER;
        var i = this.tmp[layer].nodes.length;
        while(i--){ if(ID == i) return this.tmp[layer].nodes[i].node; }
    },
    byN:function(n, layer){
        layer = layer || this.LAYER;
        var i = this.tmp[layer].nodes.length;
        while(i--){ if(n == this.tmp[layer].nodes[i].n ) return this.tmp[layer].nodes[i].node; }
    },

    //-----------------------------------------------------------

    // SHOW NODE

    showNode:function(name){
        var basedecal = 60;
        var inner = false, outer=false, inner2 = false, outer2 = false;
        var inn, out, inn2;

        var id = this.getID(name);
        var type = this.getType(name);
        var prefix = this.getPrefix(name);

        var node = this.element('S-'+ prefix);
        node.name = name;

        this.gridTop.appendChild(node);
        
        this.nodesDiv[id] = node;

        var icon = this.element('S-icon');
        icon.innerHTML =  Serious.Icon(type);
        node.appendChild(icon);
        node.style.left = this.tmp[this.LAYER].nodes[id].x + 'px';
        node.style.top = this.tmp[this.LAYER].nodes[id].y + 'px';

        switch(prefix){
            case 'S':
                outer = true;
            break;
            case 'E':
                inner = true; outer = true;
                if(type=='blend' || type=='split' || type=='displacement') inner2 = true;
                if(type=='filter') outer2 = true;
                if(type=='checkerboard' || type=='color' || type=='select') inner = false;
            break;
            case 'T':
                inner = true;
            break;
        }

        if(inner){
            inn = this.element('S-in');
            if(type=='blend' || type=='split' || type=='displacement') inn.name = 'I1_'+id+'.'+type;
            else inn.name = 'I0_'+id+'.'+type;
            node.appendChild(inn);
        }
        if(outer){
            out = this.element('S-out');
            out.name = 'O0_'+id+'.'+type;
            node.appendChild(out);
        }
        if(inner2){
            inn2 = this.element('S-in');
            inn2.name = 'I2_'+id+'.'+type;
            inn2.style.left = '24px';
            inn.style.left = '6px';
            node.appendChild(inn2);
        }
    },

    switchIndex:function(NAME){
        var node, name, id;
        var i = this.nodesDiv.length;
        while(i--){
            node = this.nodesDiv[i];
            name = node.name;
            if(NAME==name) node.style.zIndex = 1;
            else node.style.zIndex = 0;
        }
    },


    //-----------------------------------------------------------

    // LINK

    addLink:function(target, source, st, sn, layer){
        if(isNaN(target)) target = this.getIDByN(target);
        if(isNaN(source)) source = this.getIDByN(source);

        layer = layer || 0;
        var obj = {source:source, target:target, sourceN:sn || 0, targetN:sn || 0};
        if(obj.source!==-1 && obj.target!==-1){
            this.testIfExist();
            var link = new Serious.Link(this, obj);
            //this.links.push(link);
            //this.TMP[n].links.push(link);
            this.tmp[layer].links.push(link);
        }
    },

    testLink:function(){
        var l = this.linkTest;
        if(l.source!==-1 && l.target!==-1){
            this.testIfExist();
            this.createLink(this.linkTest);
            this.move.test = false;
            this.linkTest = {source:-1, target:-1, sourceN:0, targetN:0};
        }
    },
    createLink:function(obj){
        var link = new Serious.Link(this, obj);
        link.apply();
        this.tmp[this.LAYER].links.push(link);
        this.updateLink();
    },
    removeLink:function(n){
        if(this.tmp[this.LAYER].links[n]){
            this.tmp[this.LAYER].links[n].clear();
            this.tmp[this.LAYER].links.splice(n, 1);
        }
    },
    applyLinks:function(){
        var i = this.tmp[this.LAYER].links.length;
        while(i--) this.tmp[this.LAYER].links[i].apply();
    },
    updateLink:function(){
        this.linkcontext.clearRect(0, 0, 2000, 2000);
        var i = this.tmp[this.LAYER].links.length;
        while(i--) this.tmp[this.LAYER].links[i].draw();
    },
    testIfExist:function(s, t){
        var l = this.linkTest;
        var rem = [];
        var m, r1, r2, j, a1= false, a2= false;
       // var i = this.links.length;
        var i = this.tmp[this.LAYER].links.length;
        //var i = this.TMP[this.LAYER].links.length;
        while(i--){
            a1 = false;
            a2 = false;

            m = this.tmp[this.LAYER].links[i].obj;
            if(m.source == l.source && m.sourceN == l.sourceN){ r1 = i; a1 = true;}
            // hey whe can have multiple targets :)
            //if(m.target == l.target && m.targetN == l.targetN){ r2 = i; a2 = true;}
            j = rem.length;
            while(j--){ 
                if(r1 == rem[j]) a1 = false;
                if(r2 == rem[j]) a2 = false;
            }
            if(a1) rem.push(r1);
            if(a2) rem.push(r2);
        }
        //console.log(rem)
        rem.sort();
        //console.log(rem)
        i = rem.length;
        while(i--) this.removeLink(rem[i]);
    },


    //-----------------------------------------------------------

    // SELECTOR

    selector:function(name){
        this.clearSelector();
        if(name=='root'){
            this.selectID = -1;
            this.select.style.display = 'none';
            //this.menu.style.height = 'auto';//50 + 'px';

            this.showRootMenu();

        } else {
            var id = this.getID(name);
            this.select.style.display = 'block';
            this.select.style.left = this.tmp[this.LAYER].nodes[id].x + 'px';
            this.select.style.top = this.tmp[this.LAYER].nodes[id].y + 'px';
            this.selectID = id;
            //this.menu.style.height = 'auto';

            this.rmenu.style.display = 'none';
            this.showSelector(name);
        }
    },
    showRootMenu:function(){
        this.rmenu.style.display = 'block';
        //this.addTitle('', 'SERIOUSLY ROOT' );
        //this.addOption(0, 'source', Serious.Sources);
        //this.addOption(1, 'effect', Serious.Effects);
        //this.addOption(2, 'target', Serious.Targets);
    },
    showSelector:function(name){

        var id = this.getID(name);
        var prefix = this.getPrefix(name);
        var type = this.getType(name);

        this.addTitle(id, type, prefix );

        switch(type){
            case 'image': this.addURL(id); break;
            case 'video': this.addVideoURL(id); break;
            case 'texture-3D': this.addTextureLink(id); break;
            case 'accumulator':
                this.addSlide(id, 'opacity', 0, 1, 2);
                this.addList(id, 'blendMode', Serious.BlendMode);
                this.addBool(id, 'clear');
            break;
            case 'ascii':
                this.addColor(id, 'background');
            break;
            case 'bleach-bypass': this.addSlide(id, 'amount', 0, 1, 2); break;
            case 'blend':
                this.addSlide(id, 'opacity', 0, 1, 2);
                this.addList(id, 'mode', Serious.BlendMode);
                this.addList(id, 'sizeMode', Serious.BlendSizeMode);
            break;
            case 'blur': this.addSlide(id, 'amount', 0, 1, 2); break;
            case 'brightness-contrast':
                this.addSlide(id, 'brightness', 0, 1, 2);
                this.addSlide(id, 'contrast', 0, 1, 2);
            break;
            case 'channels':
                /// ? //// +  4 sources redSource greenSource blueSource alphaSource
                this.addList(id, 'red', ['red', 'green', 'blue', 'alpha', 'union', 'intersection']);
                this.addList(id, 'green', ['red', 'green', 'blue', 'alpha', 'union', 'intersection']);
                this.addList(id, 'blue', ['red', 'green', 'blue', 'alpha', 'union', 'intersection']);
                this.addList(id, 'alpha', ['red', 'green', 'blue', 'alpha', 'union', 'intersection']);
            break;
            case 'checkerboard':
                this.addV2(id, 'anchor');
                this.addV2(id, 'size');
                this.addColor(id, 'color1');
                this.addColor(id, 'color2');
                this.addNumber(id, 'width', 0, 2000, 0, 1);
                this.addNumber(id, 'height', 0, 2000, 0, 1);
            break;
            case 'chroma':
                this.addColor(id, 'screen');
                this.addNumber(id, 'weight');
                this.addSlide(id, 'balance', 0, 1, 2);
                this.addSlide(id, 'clipBlack', 0, 1, 2);
                this.addSlide(id, 'clipWhite', 0, 1, 2);
                this.addBool(id, 'mask');
            break;
            case 'color':
                this.addColor(id, 'color');
                this.addNumber(id, 'width');
                this.addNumber(id, 'height');
            break;
            case 'colorcomplements':
                this.addSlide(id, 'amount', 0, 1, 2);
                this.addSlide(id, 'concentration', 0.1, 4, 2);
                this.addSlide(id, 'correlation', 0, 1, 2);
                this.addColor(id, 'guideColor');
            break;
            case 'colorcube':
                /// ? ////
            break;
            case 'color-select':
                this.addNumber(id, 'hueMin');
                this.addNumber(id, 'hueMax');
                this.addNumber(id, 'hueMinFalloff', 0);
                this.addNumber(id, 'hueMaxFalloff', 0);
                this.addSlide(id, 'saturationMin', 0, 1, 2);
                this.addSlide(id, 'saturationMax', 0, 1, 2);
                this.addNumber(id, 'saturationMinFalloff', 0);
                this.addNumber(id, 'saturationMaxFalloff', 0);
                this.addSlide(id, 'lightnessMin', 0, 1, 2);
                this.addSlide(id, 'lightnessMax', 0, 1, 2);
                this.addNumber(id, 'lightnessMinFalloff', 0);
                this.addNumber(id, 'lightnessMaxFalloff', 0);
                this.addBool(id, 'mask');
            break;
            case 'crop':
                this.addNumber(id, 'top', 0, 1);
                this.addNumber(id, 'left', 0, 1);
                this.addNumber(id, 'bottom', 0, 1);
                this.addNumber(id, 'right', 0, 1);
            break;
            case 'daltonize': this.addList(id, 'type', ['0.0', '0.2', '0.6', '0.8']); break;
            case 'directionblur':
                this.addSlide(id, 'amount', 0, 1, 2);
                this.addNumber(id, 'angle', 0, 360, 0, 1, true);
            break;
            case 'displacement':
                this.addList(id, 'xChannel', ['red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none' ]);
                this.addList(id, 'yChannel', ['red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none' ]);
                this.addList(id, 'fillMode', ['color', 'wrap', 'clamp', 'ignore' ]);
                this.addColor(id, 'color');
                this.addNumber(id, 'offset', 0, 10, 2, 0.01);
                this.addV2(id, 'mapScale');
                this.addSlide(id, 'amount', 0, 1, 2);
            break;
            case 'dither': break;
            case 'edge': this.addList(id, 'mode', ['sobel', 'frei-chen']); break;
            case 'emboss': this.addSlide(id, 'amount', -255/3,  255/3, 0); break;
            case 'exposure': this.addSlide(id, 'exposure', -8,  8, 1); break;
            case 'expression':
                this.addNumber(id, 'a', 0);
                this.addNumber(id, 'b', 0);
                this.addNumber(id, 'c', 0);
                this.addNumber(id, 'd', 0);
                this.addString(id, 'rgb');
                this.addString(id, 'red');
                this.addString(id, 'green');
                this.addString(id, 'blue');
                this.addString(id, 'alpha');
            break;
            case 'fader':
                this.addColor(id, 'color');
                this.addSlide(id, 'amount', 0, 1, 2);
            break;
            case 'falsecolor':
                this.addColor(id, 'black');
                this.addColor(id, 'white');
            break;
            case 'filmgrain':
                this.addNumber(id, 'time');
                this.addSlide(id, 'amount', 0, 1, 2);
                this.addBool(id, 'colored');
            break;
            case 'freeze':
                this.addBool(id, 'frozen');
            break;
            case 'fxaa': break;
            case 'gradientwipe':
                this.addImage(id, 'gradient');
                this.addNumber(id, 'transition');
                this.addBool(id, 'invert');
                this.addSlide(id, 'smoothness', 0, 1, 2);
            break;
            case 'hex':
                this.addSlide(id, 'size', 0, 0.4, 2);
                this.addV2(id, 'center');
            break;
            case 'highlights-shadows':
                this.addSlide(id, 'highlights', 0, 1, 2);
                this.addSlide(id, 'shadows', 0, 1, 2);
            break;
            case 'hue-saturation':
                this.addSlide(id, 'hue', -1, 1, 2);
                this.addSlide(id, 'saturation', -1, 1, 2);
            break;
            case 'invert':break;
            case 'kaleidoscope':
                this.addNumber(id, 'segments');
                this.addNumber(id, 'offset');
            break;
            case 'layer':
                this.addNumber(id, 'count');
                /// ? ////
            break;
            case 'linear-transfer':
                this.addV4(id, 'slope');
                this.addV4(id, 'intercept');
            break;
            case 'lumakey':
                this.addSlide(id, 'clipBlack', 0, 1, 2);
                this.addSlide(id, 'clipWhite', 0, 1, 2);
                this.addBool(id, 'invert');
            break;
            case 'mirror': break;
            case 'nightvision':
                this.addNumber(id, 'timer');
                this.addSlide(id, 'luminanceThreshold', 0, 1, 2);
                this.addNumber(id, 'amplification', 0);
                this.addColor(id, 'color');
            break;
            case 'noise':
                this.addBool(id, 'overlay');
                this.addSlide(id, 'amount', 0, 1, 2);
                this.addNumber(id, 'timer', NaN, 1);
            break;
            case 'panorama':
                this.addNumber(id, 'width', 0, 1);
                this.addNumber(id, 'height', 0, 1);
                this.addSlide(id, 'yaw', 0, 360, 0);
                this.addSlide(id, 'fov', 0, 180, 0);
                this.addSlide(id, 'pitch', -90, 90, 0);
            break;
            case 'pixelate':
                this.addV2(id, 'pixelSize', 0);
            break;
            case 'polar': this.addSlide(id, 'angle', 0, 360, 0, 1, true); break;
            case 'repeat':
                this.addNumber(id, 'repeat', 0, 1);
                this.addNumber(id, 'width', 0, 1);
                this.addNumber(id, 'height', 0, 1);
            break;
            case 'ripple':
                this.addNumber(id, 'wave', 0, 1);
                this.addNumber(id, 'distortion', 0, 1);
                this.addV2(id, 'center');
            break;
            case 'scanlines':
                this.addNumber(id, 'lines');
                this.addSlide(id, 'size', 0, 1, 2);
                this.addSlide(id, 'intensity', 0, 1, 2);
            break;
            case 'select':
                /// ? //// no SOURCE
                this.addSlide(id, 'active', 0, 3, 0);
                this.addList(id, 'sizeMode', ['union', 'intersection', 'active']);
            break;
            case 'sepia': break;
            case 'simplex':
                this.addV2(id, 'noiseScale');
                this.addV2(id, 'noiseOffset');
                this.addSlide(id, 'octaves', 1, 8, 0);
                this.addSlide(id, 'persistence', 0, 0.5, 2);
                this.addSlide(id, 'amount', 0, 1, 2);
                this.addNumber(id, 'time');
                this.addNumber(id, 'width');
                this.addNumber(id, 'height');
                this.addColor(id, 'black');
                this.addColor(id, 'white');
            break;
            case 'sketch': break;
            case 'split':
                this.addList(id, 'sizeMode', ['a', 'b', 'union', 'intersection']);
                this.addSlide(id, 'split', 0, 1, 2);
                this.addNumber(id, 'angle', 0, 360, 0, 1, true);
                this.addSlide(id, 'fuzzy', 0, 1, 2);
            break;
            case 'throttle':
                this.addNumber(id, 'frameRate', 0);
            break;
            case 'tone':
                this.addColor(id, 'light');
                this.addColor(id, 'dark');
                this.addSlide(id, 'toned', 0, 1, 2);
                this.addSlide(id, 'desat', 0, 1, 2);
            break;
            case 'tvglitch':
                this.addSlide(id, 'distortion', 0, 1, 2);
                this.addSlide(id, 'verticalSync', 0, 1, 2);
                this.addSlide(id, 'lineSync', 0, 1, 2);
                this.addSlide(id, 'scanlines', 0, 1, 2);
                this.addSlide(id, 'bars', 0, 1, 2);
                this.addSlide(id, 'frameShape', 0, 2, 2);
                this.addSlide(id, 'frameLimit', -1, 1, 2);
                this.addSlide(id, 'frameSharpness', 0, 40, 1);
                this.addColor(id, 'frameColor');
            break;
            case 'vignette': this.addSlide(id, 'amount', 0, 1, 2); break;
            case 'vibrance': this.addSlide(id, 'amount', -1, 1, 2); break;
            case 'whitebalance':
                this.addColor(id, 'white');
                this.addBool(id, 'auto');
            break;
        }
    },
    clearSelector:function(){
        this.selectID = -1;
        this.select.style.display = 'none';
        //while(this.menu.firstChild) { this.menu.removeChild(this.menu.firstChild); }
        var i = this.sels.length;
        while(i--){ 
            this.sels[i].clear(); 
            this.sels.pop();
        }
    },

    // FROM UIL
    addOption:function(id, name, list){
        var callback = function(v){  }.bind(this);
        this.sels.push( new UIL.List(this.bmenu, name, callback, name, list) );
    },

    addImage:function(id, name){

    },

    addTitle:function(id, type, prefix){
        prefix = prefix || '';
        var s = new UIL.Title( this.bmenu, type, id, prefix );
        this.sels.push(s);
    },
    addString:function(id, name){
        var node = this.tmp[this.LAYER].nodes[id];
        var callback = function(v){ node.node[name] = v; }.bind(this);
        //this.sels.push(new UIL.Number(this.menu, name, callback, this.nodes[id][name]));
    },
    addNumber:function(id, name, min, max, precision, step, isAngle){
        var node = this.tmp[this.LAYER].nodes[id];
        var callback = function(v){ node.node[name] = v; }.bind(this);
        this.sels.push(new UIL.Number(this.bmenu, name, callback, node.node[name], min, max, precision, step, isAngle));
    },
    addV2:function(id, name, min, max, precision, step){
        var node = this.tmp[this.LAYER].nodes[id];
        var callback = function(v){ node.node[name]=v; }.bind(this);
        this.sels.push( new UIL.Vector(this.bmenu, name, callback, node.node[name] ));
    },
    addV4:function(id, name, min, max, precision, step){
    },
    addColor:function(id, name){
        var node = this.tmp[this.LAYER].nodes[id];
        var callback = function(v){ node.node[name] = v; }.bind(this);
        this.sels.push( new UIL.Color(this.bmenu, name, callback, node.node[name] ));
    },
    addBool:function(id, name){
        var node = this.tmp[this.LAYER].nodes[id];
        var callback = function(v){ node.node[name] = v; }.bind(this);
        this.sels.push( new UIL.Bool(this.bmenu, name, callback, node.node[name] ));
    },  
    addList:function(id, name, list){
        var node = this.tmp[this.LAYER].nodes[id];
        var callback = function(v){ node.node[name] = v; }.bind(this);
        this.sels.push( new UIL.List(this.bmenu, name, callback, node.node[name], list ));
    },
    addSlide:function(id, name, min, max, precision, step){
        var node = this.tmp[this.LAYER].nodes[id];
        var callback = function(v){ node.node[name] = v; }.bind(this);
        this.sels.push( new UIL.Slide(this.bmenu, name, callback, node.node[name], min, max, precision, step ));
    },
    addURL:function(id){
        var name = 'URL';
        var node = this.tmp[this.LAYER].nodes[id];
        var callback = function(v){  node.obj.src = v; node.node.src = v; }.bind(this);
        var s = new UIL.Url(this.bmenu, name, callback, node.obj.src, 'S' );
        this.sels.push( s );
    },
    addVideoURL:function(id){
        var name = 'URL';
        var node = this.tmp[this.LAYER].nodes[id];
        var callback = function(v){
             node.obj.src = v;

            if(v.substring(0,3)=='YT:' || v.substring(0,3)=='yt:' ){ 
                var stream = "http://youtube-download.bl.ee/getvideo.mp4?videoid="+v.substring(3);
                if (window.webkitURL) {
                    node.node.src = window.webkitURL.createObjectURL(stream);
                } else {
                    node.node.src = stream;
                }
                //node.node.src = //"http://youtube-download.bl.ee/getvideo.php?videoid="+v.substring(3)+"&type=redirect";
                node.node.load();
                node.node.autoPlay = true;
                node.node.play();
            }else{
               // node.obj.src = v;
                node.node.src = v; 
            }
        }.bind(this);
        var s = new UIL.String(this.bmenu, name, callback, node.obj.src , 'S');
        this.sels.push( s );
    },
    addTextureLink:function(id){ //this.textures[obj.texture]
        var name = 'Texture';
        var node = this.tmp[this.LAYER].nodes[id];
        var callback = function(v){ console.log(v, node); node.obj.texture = v; node.node.destroy(); node.node = this.seriously.target(this.textures[v]); this.updateLink(); this.applyLinks(); }.bind(this);
        var s = new UIL.String(this.bmenu, name, callback, node.obj.texture, 'T' );
        this.sels.push( s );
    },


    //-----------------------------------------------------------

    // MOUSE

    contextmenu:function(e){
        e.preventDefault();
    },
    mouseover:function(e){
        if(this.current=='close'){
            this.open(); 
        }
    },
    mouseout:function(e){
        /*if(this.current=='open'){
            this.close();
        }*/
        //this.move.test = false;
        //this.move.down = false;
        //this.move.element = null;
        //this.move.name = '';
    },
    mouseup:function(e){
        this.linkTest = {source:-1, target:-1, sourceN:0, targetN:0};
        this.move.test = false;
        this.move.down = false;
        this.move.element = null;
        this.move.name = '';
        e.preventDefault();
    },
    mousedown:function(e){
        var el = e.target;
        var name = el.name;
         
        //e = e || window.event;
        var l = this.linkTest;
        var n = name.substring(0, 1);
        var id = this.getID(name);

        if(n=='O'){
            l.target = id;
            l.targetN = name.substring(1, 2)*1;
            this.move.test = true;
            return;
        } else if(n=='I'){
            l.source = id;
            l.sourceN = name.substring(1, 2)*1;
            this.move.test = true;
            return;
        } else {
            this.move.name = name;
            this.move.x=e.pageX;//e.clientX;
            this.move.y=e.pageY;//e.clientY;

            if(name=='root') this.move.element = this.grid;
            else this.move.element = el;
            if(this.move.element!==null){
                this.selector(name);
                var p = this.move.element.getBoundingClientRect();
                var g = this.grid.getBoundingClientRect();
                if(name=='root') g = this.content.getBoundingClientRect();
                else this.switchIndex(this.move.name);
                this.move.tx = p.left - g.left;
                this.move.ty = p.top - g.top;
                this.move.down = true;
            }
        }

        
        
        e.preventDefault();
    },
    mousemove:function(e){
        //e = e || window.event;
        var name = e.target.name;
       
        var x = e.pageX;//clientX;
        var y = e.pageY;//clientY;

        var l, id;
        

        if(this.move.test){
            l = this.linkTest;
            id = this.getID(name);
            var n = name.substring(0, 1);
            var np = name.substring(1, 2);
            
            if(l.source!==-1) if(id!==l.source && n=='O'){ l.target = id; l.targetN = np; }
            if(l.target!==-1) if(id!==l.target && n=='I'){ l.source = id; l.sourceN = np; }

            this.testLink();
        }

        if(this.move.down){

            name = this.move.name;
            id = this.getID(name);

            this.move.mx=this.move.tx+x-this.move.x;
            this.move.my=this.move.ty+y-this.move.y;

            if(name=='root'){
                if(this.move.mx>0) this.move.mx=0;
                if(this.move.my>0) this.move.my=0;
                if(this.move.mx<-(this.gridsize.x-this.size.x)) this.move.mx=-(this.gridsize.x-this.size.x);
                if(this.move.my<-(this.gridsize.y-this.size.y)) this.move.my=-(this.gridsize.y-this.size.y);
            }else{
                //this.move.mx = (this.move.mx * 0.05).toFixed(0) * 20;
                //this.move.my = (this.move.my * 0.05).toFixed(0) * 20;

                this.move.mx = (this.move.mx * 0.1).toFixed(0) * 10;
                this.move.my = (this.move.my * 0.1).toFixed(0) * 10;

                this.tmp[this.LAYER].nodes[id].x = this.move.mx;
                this.tmp[this.LAYER].nodes[id].y = this.move.my;

                this.select.style.left = this.move.mx + 'px';
                this.select.style.top = this.move.my + 'px';
                this.updateLink();
            }
            if(this.move.element!==null){
                this.move.element.style.left=this.move.mx+"px";
                this.move.element.style.top=this.move.my+"px";
            }
        }
        e.preventDefault();
    },
    mousewheel:function(e){
        e.preventDefault();
    },
    getMousePosition:function(e){

    }
}






//-----------------------------------------------------------


//--------------------
// LINK
//--------------------

Serious.Link = function(root, obj){
    this.pos = [0,0,0,0];
    this.root = root;
    this.obj = obj;
}
Serious.Link.prototype = {
    constructor: Serious.Link,
    getLink:function(){
        return [this.obj.target, this.obj.source, this.obj.targetN, this.obj.sourceN];
    },
    clear:function(){
        var targetNode = this.root.tmp[this.root.LAYER].nodes[this.obj.target];
        var sourceNode = this.root.tmp[this.root.LAYER].nodes[this.obj.source];

        //var targetNode = this.root.TMP[this.root.LAYER].nodes[this.obj.target];
        //var sourceNode = this.root.TMP[this.root.LAYER].nodes[this.obj.source];
        //var targetNode = this.root.nodes[this.obj.target];
        //var sourceNode = this.root.nodes[this.obj.source];

        //var type = this.root.getType(sourceNode.name);

        // !!! TEST
        //if(this.obj.sourceN == 0) sourceNode.source.destroy();
        /*if(this.obj.sourceN == 1){ 
            if(type=='blend') sourceNode.bottom.destroy();
            if(type=='split') sourceNode.sourceA.destroy();
        }
        if(this.obj.sourceN == 2){ 
            if(type=='blend') sourceNode.top.destroy();  
            if(type=='split') sourceNode.sourceB.destroy();
        }*/
        //sourceNode.removeSource(targetNode);
        //this.root.seriously.removeSource(targetNode);
        //sourceNode.destroy()
        //targetNode.destroy()
        //sourceNode.source = false;
        /*if(this.obj.sourceN == 0) sourceNode.source.clear()// = undefined;
        if(this.obj.sourceN == 1) sourceNode.bottom = undefined;
        if(this.obj.sourceN == 2) sourceNode.top = undefined;*/
    },
    apply:function(){

        var sourceNode = this.root.tmp[this.root.LAYER].nodes[this.obj.source];
        var targetNode = this.root.tmp[this.root.LAYER].nodes[this.obj.target];

        var type = this.root.getType(sourceNode.name);

        if(this.obj.sourceN == 0) sourceNode.node.source = targetNode.node;
        if(this.obj.sourceN == 1){ 
            if(type=='displacement') sourceNode.node.source = targetNode.node;
            if(type=='blend') sourceNode.node.bottom = targetNode.node;
            if(type=='split') sourceNode.node.sourceA = targetNode.node;
        }
        if(this.obj.sourceN == 2){ 
            if(type=='displacement') sourceNode.node.map = targetNode.node;  
            if(type=='blend') sourceNode.node.top = targetNode.node;  
            if(type=='split') sourceNode.node.sourceB = targetNode.node;
        }

        //targetNode.parent = sourceNode.name;
    },
    draw:function(){
        var sx = 0;
        var tx = 0;
        //if(this.obj.targetN == 1) tx = -8;
        if(this.obj.sourceN == 1) sx = -8;
        //if(this.obj.targetN == 2) tx = 8;
        if(this.obj.sourceN == 2) sx = 8;


        this.pos[0] = this.root.tmp[this.root.LAYER].nodes[this.obj.source].x+20+sx;
        this.pos[1] = this.root.tmp[this.root.LAYER].nodes[this.obj.source].y;
        this.pos[2] = this.root.tmp[this.root.LAYER].nodes[this.obj.target].x+20+tx;
        this.pos[3] = this.root.tmp[this.root.LAYER].nodes[this.obj.target].y+40;

        var ctx = this.root.linkcontext;
        ctx.beginPath();
        //ctx.moveTo(this.start.x, this.start.y);
        //ctx.bezierCurveTo(this.start.x, this.start.y-20, this.end.x, this.end.y+20, this.end.x, this.end.y);

        ctx.moveTo(this.pos[0], this.pos[1]);
        ctx.bezierCurveTo(this.pos[0], this.pos[1]-20, this.pos[2], this.pos[3]+20, this.pos[2], this.pos[3]);
        //ctx.lineTo(this.end.x, this.end.y);
        //ctx.closePath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'white';
        ctx.stroke();
    }
}






//-----------------------------------------------------------


//--------------------
// CSS CLASS
//--------------------

Serious.createClass = function(name,rules){
    var adds = '.';
    if(name == '*') adds = '';
    var style = document.createElement('style');
    style.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(style);
    if(!(style.sheet||{}).insertRule) (style.styleSheet || style.sheet).addRule(adds+name, rules);
    else style.sheet.insertRule(adds+name+"{"+rules+"}",0);
}

//__________________________________

//--------------------
//  SVG ICON
//--------------------

Serious.Icon = function(type, size, color){
    color = color || '#FFF';
    var width = size || 40;
    var Kwidth = '0 0 40 40';
    var t = [];
    t[0] = "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' preserveAspectRatio='none' x='0px' y='0px' width='"+width+"px' height='"+width+"px' viewBox='"+Kwidth+"';'><g>";
    switch(type){
        // source
        case 'image' : t[1]="<path fill='"+color+"' d='M 16 30 L 20 34 24 30 16 30 M 16 27 L 16 29 24 29 24 27 16 27 M 27 23 L 27 20 Q 25.2 17.15 23 20 21.4 22.1 18 20 15.7 18.75 13 20 L 13 22 Q 16.32 21.27 19 22.7 21.73 24.17 23.7 21.55 25.65 18.96 27 23 M 30 11 L 29 10 11 10 10 11 10 29 11 30 14 30 14 28 12 28 12 12 28 12 28 28 26 28 26 30 29 30 30 29 30 11 Z'/>";break;
        case 'video' : t[1]="<path fill='"+color+"' d='M 16 30 L 20 34 24 30 16 30 M 16 27 L 16 29 24 29 24 27 16 27 M 30 11 L 30 10 10 10 10 30 14 30 14 29 13 29 13 28 14 28 14 27 11 27 11 13 29 13 29 27 26 27 26 30 30 30 30 29 29 29 29 28 30 28 30 12 29 12 29 11 30 11 M 21 12 L 21 11 22 11 22 12 21 12 M 23 12 L 23 11 24 11 24 12 23 12 M 25 12 L 25 11 26 11 26 12 25 12 M 27 12 L 27 11 28 11 28 12 27 12 M 11 11 L 12 11 12 12 11 12 11 11 M 15 12 L 15 11 16 11 16 12 15 12 M 13 11 L 14 11 14 12 13 12 13 11 M 17 12 L 17 11 18 11 18 12 17 12 M 19 11 L 20 11 20 12 19 12 19 11 M 12 29 L 11 29 11 28 12 28 12 29 M 27 29 L 27 28 28 28 28 29 27 29 Z'/>";break;
        case 'camera': t[1]="<path fill='"+color+"' d='M 16 30 L 20 34 24 30 16 30 M 16 27 L 16 29 24 29 24 27 16 27 M 29 12 L 23 12 23 10 17 10 17 12 11 12 10 13 10 28 11 29 14 29 14 27 12 27 12 14 18 14 18 11 22 11 22 14 28 14 28 27 26 27 26 29 29 29 30 28 30 13 29 12 M 21 14 L 21 12 19 12 19 14 21 14 M 23.5 23.5 Q 25 22.05 25 20 25 17.95 23.5 16.45 22.05 15 20 15 17.95 15 16.45 16.45 15 17.95 15 20 15 22.05 16.45 23.5 17.95 25 20 25 22.05 25 23.5 23.5 M 22.8 17.15 Q 24 18.35 24 20 24 21.65 22.8 22.8 21.65 24 20 24 18.35 24 17.15 22.8 16 21.65 16 20 16 18.35 17.15 17.15 18.35 16 20 16 21.65 16 22.8 17.15 M 22.1 22.1 Q 23 21.25 23 20 23 18.75 22.1 17.85 21.25 17 20 17 18.75 17 17.85 17.85 17 18.75 17 20 17 21.25 17.85 22.1 18.75 23 20 23 21.25 23 22.1 22.1 Z'/>";break;
        case 'texture' : t[1]="<path fill='"+color+"' d='M 27.9 15.8 L 28 24.5 26 25.5 26 27.6 30 26 30 14 21 10 20 10 10 14 10 26 14 27.75 14 25.5 12 24.5 12 15.9 19 19 19 25 20 25 20 19 27.9 15.8 M 21 12 L 27.75 14.9 20 18 19 18 12.15 14.95 20 12 21 12 M 16 30 L 20 34 24 30 16 30 M 16 27 L 16 29 24 29 24 27 16 27 Z'/>";break;

        //target
        case 'texture-3D': t[1]="<path fill='"+color+"' d='M 30 10 L 25 10 20 15 15 10 10 10 10 30 30 30 30 10 M 24 12 L 26 12 26 14 28 14 28 17 27 17 27 18 28 18 28 28 18 28 18 27 17 27 17 28 14 28 14 26 12 26 12 24 14 24 14 22 16 22 16 20 18 20 18 18 20 18 20 16 22 16 22 14 24 14 24 12 M 20 25 L 19 25 19 26 20 26 20 25 M 25 19 L 25 20 26 20 26 19 25 19 M 24 21 L 23 21 23 22 24 22 24 21 M 22 23 L 21 23 21 24 22 24 22 23 M 16 24 L 14 24 14 26 16 26 16 24 M 16 22 L 16 24 18 24 18 22 16 22 M 20 20 L 18 20 18 22 20 22 20 20 M 22 20 L 22 18 20 18 20 20 22 20 M 22 16 L 22 18 24 18 24 16 22 16 M 26 16 L 26 14 24 14 24 16 26 16 M 24 8 L 24 6 16 6 16 8 24 8 M 16 9 L 20 13 24 9 16 9 Z'/>";break; 
        case 'canvas-3D': t[1]="<path fill='"+color+"' d='M 25 18 L 25 16 23 14 18 14 15 17 15 23 18 26 23 26 25 24 25 22 24 22 22 24 20 24 18 22 18 18 20 16 22 16 24 18 25 18 M 16 9 L 20 13 24 9 16 9 M 24 8 L 24 6 16 6 16 8 24 8 M 30 10 L 25 10 22 13 25 13 26 12 28 12 28 28 12 28 12 12 14 12 15 13 18 13 15 10 10 10 10 30 30 30 30 10 Z'/>";break;

        case 18: t[1]="<path fill='"+color+"' d='M 16 11 L 14 11 14 14 11 14 11 16 14 16 14 19 16 19 16 16 19 16 19 14 16 14 16 11 Z'/>";break;

        case 'time': t[1]="<path fill='"+color+"' d='M 30 20 Q 30 15.85 27.05 12.9 24.15 10 20 10 15.85 10 12.9 12.9 10 15.85 10 20 10 24.15 12.9 27.05 15.85 30 20 30 24.15 30 27.05 27.05 30 24.15 30 20 M 25.65 14.35 Q 28 16.7 28 20 28 22.9353515625 26.15 25.1 25.9095703125 25.3904296875 25.65 25.65 25.390234375 25.909765625 25.1 26.15 22.9353515625 28 20 28 16.7 28 14.35 25.65 12 23.3 12 20 12 16.7 14.35 14.35 16.7 12 20 12 23.3 12 25.65 14.35 M 21 19 L 21 14 20 13 19 14 19 19 20 18 21 19 M 20 19 L 19 20 24.5 25.5 25.5 24.5 20 19 Z'/>";break;

        // root menu
        case 'load': t[1]="<path fill='"+color+"' d='M 22 20 L 25 20 20 15 15 20 18 20 18 26 22 26 22 20 M 30 24 L 28 24 28 28 12 28 12 24 10 24 10 30 30 30 30 24 M 27 13 L 27 10 13 10 13 13 27 13 Z'/>";break;
        case 'save': t[1]="<path fill='"+color+"' d='M 22 16 L 22 10 18 10 18 16 15 16 20 21 25 16 22 16 M 30 24 L 28 24 28 28 12 28 12 24 10 24 10 30 30 30 30 24 M 27 27 L 27 24 13 24 13 27 27 27 Z'/>";break;
        case 'del': t[1]="<path fill='"+color+"' d='M 30 12 L 28 10 12 10 10 12 10 28 12 30 28 30 30 28 30 12 M 27 12 L 28 13 28 27 27 28 13 28 12 27 12 13 13 12 27 12 M 23.55 17.85 L 22.15 16.45 20 18.6 17.85 16.45 16.45 17.85 18.6 20 16.5 22.1 17.9 23.5 20 21.4 22.1 23.5 23.5 22.1 21.4 20 23.55 17.85 Z'/>";break;
        case 'add': t[1]="<path fill='"+color+"' d='M 30 12 L 28 10 12 10 10 12 10 28 12 30 28 30 30 28 30 12 M 27 12 L 28 13 28 27 27 28 13 28 12 27 12 13 13 12 27 12 M 21 24 L 21 21 24 21 24 19 21 19 21 16 19 16 19 19 16 19 16 21 19 21 19 24 21 24 Z'/>";break;

        //filter
        default: t[1]="<path fill='"+color+"' d='M 21 20 Q 24.4 17 23 13 22.5 11.6 20.9 10 L 18.9 10 Q 20.4 11.5 20.95 13 22.4 16.95 19 20 15.35 23.4 16.45 27 16.9 28.2 17.85 29.1 18.35 29.55 19 30 L 21 30 Q 19.1 28.3 18.5 27 17.05 23.65 21 20 M 20.2 14 Q 20.14 13.51 20 13 L 19.55 12 10 12 10 28 16.05 28 15.5 27 Q 15.28 26.50 15.15 26 L 12 26 12 14 20.2 14 M 21.9 10 Q 23.3 11.4 23.6 12 L 28 12 28 28 20.05 28 Q 20.4 28.5 20.9 29 21.4 29.5 22 30 L 30 30 30 10 21.9 10 Z'/>";break;
    }
    t[2] = "</g></svg>";
    return t.join("\n");
}


// LOGO SVG

Serious.Logo = function(size, color){
    color = color || '#FFF';
    var width = size || 36;
    var Kwidth = '0 0 256 256';
    var t = [];
    t[0] = "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' preserveAspectRatio='none' x='0px' y='0px' width='"+width+"px' height='"+width+"px' viewBox='"+Kwidth+"';'><g>";
    t[1] = "<path fill='"+color+"' d='M 184.75 66.95 L 189.75 54.95 149.05 38.1 Q 128.05 29.35 107 38.15 86 46.8 77.25 67.85 68.55 88.85 77.25 110.05 85.95 130.95 106.95 139.7 L 134.45 151.4 Q 140.85 154.1 143.6 160.55 146.3 167.1 143.6 173.6 140.9 180.05 134.4 182.8 127.85 185.5 121.45 182.8 L 80.75 165.95 75.75 177.95 116.45 194.8 Q 116.6994140625 194.90390625 116.95 195 128.1015625 199.444921875 139.35 194.75 150.85 190.05 155.6 178.6 160.35 167.1 155.6 155.55 150.85 144.15 139.45 139.4 L 139.4 139.35 111.95 127.7 Q 95.9 121.05 89.25 105.05 82.6 88.95 89.25 72.85 95.9 56.75 112 50.15 128 43.45 144.05 50.1 L 184.75 66.95 M 175.2 90.05 L 180.2 78.05 139.5 61.2 Q 128.1 56.45 116.6 61.25 105.1 65.95 100.35 77.4 95.6 88.9 100.35 100.45 105.1 111.85 116.55 116.6 L 144 128.3 Q 160.05 134.95 166.7 150.95 173.35 167.05 166.7 183.15 160.05 199.25 143.95 205.85 127.95 212.55 111.9 205.9 L 71.2 189.05 66.2 201.05 106.9 217.9 Q 127.9 226.65 148.95 217.85 169.95 209.2 178.7 188.15 187.4 167.15 178.7 145.95 170 125.05 149 116.3 L 121.5 104.6 Q 115.1 101.9 112.35 95.45 109.65 88.9 112.35 82.4 115.05 75.95 121.55 73.2 128.1 70.5 134.5 73.2 L 175.2 90.05 Z'/>";
    t[2] = "</g></svg>";
    return t.join("\n");
}
