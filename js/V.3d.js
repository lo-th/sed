/**   _   _____ _   _   
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_| 2015
*    @author lo.th / http://lo-th.github.io/labs/
*/

var canvas, info, debug;
var THREE, mainClick, mainDown, mainUp, mainMove, mainRay, v, shader, loader;

var V = {};
var TWEEN = TWEEN || null;
V.AR8 = typeof Uint8Array!="undefined"?Uint8Array:Array;
V.AR16 = typeof Uint16Array!="undefined"?Uint16Array:Array;
V.AR32 = typeof Float32Array!="undefined"?Float32Array:Array;

V.PI = Math.PI;
V.PI90 = V.PI*0.5;
V.PI270 = V.PI+V.PI90;
V.TwoPI = 2.0 * V.PI;
V.ToRad = V.PI / 180;
V.ToDeg = 180 / V.PI;
V.Resolution = { w:1600, h:900, d:200, z:10, f:40 };
V.sqrt = Math.sqrt;
V.abs = Math.abs;
V.max = Math.max;
V.pow = Math.pow;
V.floor = Math.floor;
V.round = Math.round;
V.lerp = function (a, b, percent) { return a + (b - a) * percent; }
V.rand = function (a, b, n) { return V.lerp(a, b, Math.random()).toFixed(n || 3)*1;}
V.randInt = function (a, b, n) { return V.lerp(a, b, Math.random()).toFixed(n || 0)*1;}
V.randColor = function () { return '#'+Math.floor(Math.random()*16777215).toString(16);}

V.hexFormat = function(v){ return Number(v.toUpperCase().replace("#", "0x")); };

V.MeshList = [ 'plane', 'sphere', 'skull', 'skullhigh', 'head', 'woman', 'babe'];
V.Main = null;

V.View = function(h,v,d,f){

    this.seriousSource = false;

    //this.emvmap = emvmap || null;

    this.dimentions = {w:window.innerWidth,  h:window.innerHeight, r:window.innerWidth/window.innerHeight };

	this.canvas = canvas;
    //this.debug = debug;

    

    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.nav = new V.Nav(this,h,v,d,f);
    this.nav.initEvents();
    this.camera = this.nav.camera;

    /*if(this.emvmap!==null){
        this.environment = THREE.ImageUtils.loadTexture( 'textures/'+ this.emvmap);
        this.environment.mapping = THREE.SphericalReflectionMapping;
    }*/

     

    //this.renderer = new THREE.WebGLRenderer({ precision:"mediump", context:context, antialias:true, alpha:false });

    this.renderer = new THREE.WebGLRenderer({ precision:"mediump", canvas:this.canvas, antialias:false, alpha:false });
    this.renderer.setSize( this.dimentions.w, this.dimentions.h );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setClearColor( V.hexFormat(bgcolor), 1 );
    this.renderer.autoClear = true;

    //this.renderer.gammaInput = true;
    //this.renderer.gammaOutput = true;

    this.seriousTextures = [];
    this.textureSerious = null;
    this.txtSetting = { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat};



    //this.f = [0,0,0,0];

	//window.onresize = function(e) {this.resize(e)}.bind(this);
    //window.addEventListener("resize", function(e) {this.resize(e)}.bind(this) );
}

V.View.prototype = {
    constructor: V.View,
    render:function(){
        var t = this.seriousTextures.length;
        var i = t;
        while(i--){
            this.renderer.setRenderTarget(this.seriousTextures[i]);
        }
        if(t)this.renderer.resetGLState();

        
        
        // render
        //this.renderer.render( this.scene, this.camera );

        if(this.seriousSource){
            //this.renderer.setRenderTarget(null);
            //this.renderer.resetGLState();
            //v.renderer.setClearColor( ('0x'+bgcolor)*1, 1 )
            this.renderer.setClearColor( V.hexFormat(bgcolor), 1 );
            this.renderer.render( this.scene, this.camera, this.textureSerious, true);          
            //this.seriousEditor.byID(0).update();
            //this.seriousEditor.render();
            
        } else {
            this.renderer.render( this.scene, this.camera );
        }

        //var f = this.f;
        //f[0] = Date.now();
        //if (f[0]-1000 > f[1]){ f[1] = f[0]; f[3] = f[2]; f[2] = 0; } f[2]++;

        //this.debug.innerHTML ='THREE ' + f[3];
    },
    resize:function(dimentions){
        this.dimentions = dimentions;
        //this.dimentions.w = w;//window.innerWidth;
        //this.dimentions.h = h;//window.innerHeight;
        //this.dimentions.r = r;//this.dimentions.w/this.dimentions.h;
        if(this.renderer)this.renderer.setSize( this.dimentions.w, this.dimentions.h );
        this.nav.camera.aspect = this.dimentions.r;
        this.nav.camera.updateProjectionMatrix();

        if(this.seriousSource){
          
            //this.textureSerious.dispose();
            this.textureSerious = new THREE.WebGLRenderTarget( this.dimentions.w, this.dimentions.h, this.txtSetting );
            this.textureSerious.generateMipmaps = false;
           
            //this.seriousEditor.addOnAll('texture', {id:0, texture:this.textureSerious});

            //this.seriousEditor.byID(1).width = this.dimentions.w;
            //this.seriousEditor.byID(1).height = this.dimentions.h;

            //this.seriousEditor.applyLinks();


        }

        //console.log("threeResize")

    },
    addSeriousSource:function(){
        this.textureSerious = new THREE.WebGLRenderTarget( this.dimentions.w, this.dimentions.h, this.txtSetting );
        this.textureSerious.generateMipmaps = false;

        this.seriousSource = true;

        return this.textureSerious;
    },
    addSeriousTexture:function(w,h){
        var texture = new THREE.WebGLRenderTarget( w || 512, h || 512, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat} );//, depthBuffer:false, stencilBuffer:false, anisotropy:1 } );
        texture.generateMipmaps = false;
        //texture.needsUpdate = true;
        this.seriousTextures.push(texture);
        return texture;
    },
    addPlane:function(map, w,h ){
        var geo = new THREE.PlaneBufferGeometry(w || 10,h || 10);
        var mat 
        if(map) mat = new THREE.MeshBasicMaterial( { map:map, transparent:true });
        else mat = new THREE.MeshBasicMaterial( { color:0X00FF00 });
        var mesh = new THREE.Mesh(geo, mat);
        v.scene.add(mesh);
        return mesh;
        //geo.ground.applyMatrix(new THREE.Matrix4().makeRotationX(-V.PI90));
    },
    addSphere:function( map, r ){
        var geo = new THREE.SphereGeometry( r || 6, 30, 26 );
        var mat 
        if(map) mat = new THREE.MeshBasicMaterial( { map:map, transparent:true });
        else mat = new THREE.MeshBasicMaterial( { color:0X00FF00 });
        var mesh = new THREE.Mesh(geo, mat);
        v.scene.add(mesh);
        return mesh;
    }
}


//---------------------------------------------------
//   NAVIGATION
//---------------------------------------------------

V.Nav = function(parent, h, v, d, f){
	this.isFocus = false;
    this.isRevers = false;
    this.cammode = 'normal';
    this.EPS = 0.000001;
	this.root = parent;

	this.cursor = new V.Cursor();
    this.lockView = false;

	this.camera = new THREE.PerspectiveCamera( f||40, this.root.dimentions.r, 0.1, 2000 );
	this.mouse3d = new THREE.Vector3();
	this.selectName = '';

	this.rayVector = new THREE.Vector3( 0, 0, 1 );
	this.raycaster = new THREE.Raycaster();
	this.target = new THREE.Vector3();
    this.position = new THREE.Vector3();
	this.cam = { horizontal:h||0, vertical:v||90, distance:d||20, automove:false, theta:0, phi:0 };
    this.mouse = { x:0, y:0, ox:0, oy:0, h:0, v:0, mx:0, my:0, px:0, py:0, pz:0, r:0, down:false, move:true, button:0 };

    this.key = { up:0, down:0, left:0, right:0, ctrl:0, action:0, space:0, shift:0 };
    //this.imput = new V.UserImput(this);

    this.moveCamera();

    
    
}

V.Nav.prototype = {
	constructor: V.Nav,
    initEvents:function(){
        //var dom = document.body;
        var dom = this.root.canvas;
        //
        dom.oncontextmenu = function(e){e.preventDefault()};
        dom.onclick = function(e) {this.onMouseClick(e)}.bind( this );
        dom.onmousemove = function(e) {this.onMouseMove(e)}.bind( this );
        dom.onmousedown = function(e) {this.onMouseDown(e)}.bind( this );
        dom.onmouseout = function(e) {this.onMouseOut(e)}.bind( this );
        dom.onmouseup = function(e) {this.onMouseUp(e)}.bind( this );
        dom.onmousewheel = function(e) {this.onMouseWheel(e)}.bind( this );
        //this.root.canvas.onDOMMouseScroll = function(e) {this.onMouseWheel(e)}.bind( this );
        dom.addEventListener('DOMMouseScroll', function(e){this.onMouseWheel(e)}.bind( this ), false );

    },
	moveCamera:function(){
        this.orbit();
        this.camera.position.copy(this.position);
        this.camera.lookAt(this.target);
    },
    moveSmooth:function(){
        this.orbit();
        this.camera.position.lerp(this.position, 0.3);
        this.camera.lookAt(this.target);
    },
    revers:function(){
        this.isRevers = true;
        this.camera.scale.x = -1; 
    },
    orbit:function(){
        var p = this.position;
        var d = this.cam.distance;
        var phi = this.cam.vertical*V.ToRad;
        var theta = this.cam.horizontal*V.ToRad;
        phi = Math.max( this.EPS, Math.min( Math.PI - this.EPS, phi ) );
        this.cam.theta = theta;
        this.cam.phi = phi;
        p.x = d * Math.sin(phi) * Math.cos(theta);
        p.y = d * Math.cos(phi);
        p.z = d * Math.sin(phi) * Math.sin(theta);
        p.add(this.target);
    },
    mode:function(){
        if(this.cammode == 'normal'){
            this.cammode = 'fps';
            this.cam.distance = 0.1;
        }else{
            this.cammode = 'normal';
            this.cam.distance = 20;
        }
        this.moveSmooth();
    },
    move:function(v){
        this.target.copy(v);
        this.moveCamera();
    },
    moveto:function(x,y,z){
        this.target.set(x,y,z);
        this.moveCamera();
    },
    onMouseClick:function(e){
        e.preventDefault();
        if (typeof mainClick == 'function') { mainClick(); }
    },
    onMouseDown:function(e){
        this.mouse.down = true;
        this.mouse.button = e.which;
        //console.log(e.which)
        this.mouse.ox = e.clientX;
        this.mouse.oy = e.clientY;
        this.mouse.h = this.cam.horizontal;
        this.mouse.v = this.cam.vertical;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.px = this.target.x;
        this.mouse.pz = this.target.z;
        this.mouse.py = this.target.y;
        
	    //this.rayTest();
        //if (typeof mainDown == 'function') { mainDown(); }
        e.preventDefault();
        e.stopPropagation();
        //document.body.contentEditable=true
        //window.top.focus();
    },
    onMouseUp:function(e){
        this.mouse.down = false;
        this.cursor.change();
        if (typeof mainUp == 'function') { mainUp(); }
        e.preventDefault();
        e.stopPropagation();
    },
    onMouseOut:function(e){
    	this.isFocus = false;
        this.mouse.down = false;
        this.cursor.change();
        if (typeof mainUp == 'function') { mainUp(); }
        e.preventDefault();
        e.stopPropagation();
    },
    onMouseMove:function(e){
    	if(!this.isFocus){
    		self.focus();
    		//window.top.main.blur();
    		this.isFocus = true;
    	}
        if (this.mouse.down && this.mouse.move && !this.lockView) {
            if(this.mouse.button==3){
                this.cursor.change('drag');
                var px = -((e.clientX - this.mouse.ox) * 0.3);
                if(this.isRevers){
                    this.target.x = -(Math.sin(this.cam.theta) * px) +  this.mouse.px;
                    this.target.z = (Math.cos(this.cam.theta) * px) +  this.mouse.pz;
                }else{
                    this.target.x = (Math.sin(this.cam.theta) * px) +  this.mouse.px;
                    this.target.z = -(Math.cos(this.cam.theta) * px) +  this.mouse.pz;
                }
                this.target.y = ((e.clientY - this.mouse.oy) * 0.3) + this.mouse.py;
            }else{
                this.cursor.change('rotate');
                if(this.isRevers) this.cam.horizontal = -((e.clientX - this.mouse.ox) * 0.3) + this.mouse.h;
                else this.cam.horizontal = ((e.clientX - this.mouse.ox) * 0.3) + this.mouse.h;
                this.cam.vertical = (-(e.clientY - this.mouse.oy) * 0.3) + this.mouse.v;
                if (this.cam.vertical < 0){ this.cam.vertical = 0; }
            }
            this.moveCamera();
        }
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        //this.rayTest();
        //if (typeof mainMove == 'function') { mainMove(); }
        e.preventDefault();
        e.stopPropagation();
    },
    onMouseWheel:function(e){
        if(this.cammode=='fps') return;
        var delta = 0;
        if(e.wheelDeltaY){delta=e.wheelDeltaY*0.01;}
        else if(e.wheelDelta){delta=e.wheelDelta*0.05;}
        else if(e.detail){delta=-e.detail*1.0;}
        this.cam.distance -= delta;
        if(this.cam.distance<0.5)this.cam.distance = 0.5;
        this.moveCamera();
        e.preventDefault();
        e.stopPropagation();
    }
}

//---------------------------------------------------
//   CURSOR
//---------------------------------------------------

V.Cursor = function(){
	this.current = 'auto';
	this.type = {
		drag : 'move',
        rotate  : 'move',
		move : 'move',
		auto : 'auto'
	}
}

V.Cursor.prototype = {
	constructor: V.Cursor,
	change: function(name){
		name = name || 'auto';
		if(name!==this.current){
			this.current = name;
			document.body.style.cursor = this.type[this.current];
		}
	}
}