/**   _   _____ _   _   
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_| 2015
*    @author lo.th / http://lo-th.github.io/labs/
*/

var canvas, info, debug;
var THREE, mainClick, mainDown, mainUp, mainMove, mainRay, v, shader, loader;

var V = V || ( function () {
    return {
        main:null,
        REVISION: '0.1',
    }
})();

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

V.View = function(h,v,d, fov, lock){

    this.lock = lock || false;

    this.imgs = {};
    this.geos = {};

    this.objs = [];

    this.input = [0,0,0,0,0,0,0,0,0,0,0];

    this.worker = null;

    this.seriousSource = false;

    this.color = V.hexFormat(bgcolor);

    //this.emvmap = emvmap || null;

    this.dimentions = {w:window.innerWidth,  h:window.innerHeight, r:window.innerWidth/window.innerHeight };

	this.canvas = canvas;

    this.girlReady = false;
    //this.debug = debug;

    V.main = this;

    

    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    this.nav = new V.Nav(h,v,d,fov , lock);
    this.nav.initEvents();

    this.camera = this.nav.camera;

    this.loader = new V.Loader();

    this.base = new THREE.Group();
    this.scene.add(this.base);

    if(this.lock){
        var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(100,100), new THREE.MeshBasicMaterial( { color:0X00FF00 }));
        mesh.visible = false;
        this.base.add(mesh);

        this.mouse = new THREE.Mesh(new THREE.PlaneBufferGeometry(0.3,0.3), new THREE.MeshBasicMaterial( { color:0XFFFFFF }));
        this.scene.add(this.mouse);
    }

    


    


    /*if(this.emvmap!==null){
        this.environment = THREE.ImageUtils.loadTexture( 'textures/'+ this.emvmap);
        this.environment.mapping = THREE.SphericalReflectionMapping;
    }*/

    this.renderer = new THREE.WebGLRenderer({ precision:"mediump", canvas:this.canvas, antialias:false, alpha:false });
    this.renderer.setSize( this.dimentions.w, this.dimentions.h );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setClearColor( this.color, 1 );
    this.renderer.autoClear = true;

    this.seriousTextures = [];
    this.textureSerious = null;
    this.txtSetting = { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat};

    this.bindKeys();
    
}

V.View.prototype = {
    constructor: V.View,
    render:function(){

        var delta = this.clock.getDelta();
        if(this.girlReady){
            if(this.input[5])this.player.rotation.y = V.PI;
            if(this.input[6])this.player.rotation.y = 0;

            if(this.input[5] || this.input[6]) this.girlWalk.update(1000 * delta);
            if(!this.input[5] && !this.input[6]) this.girlStatic.update(1000 * delta);
        } 
        //if(this.girlStatic)this.girlStatic.update(1000 * delta);
        //if(this.worker) this.worker.post();

        var t = this.seriousTextures.length;
        var i = t;
        while(i--){
            this.renderer.setRenderTarget(this.seriousTextures[i]);
        }
        if(t)this.renderer.resetGLState();

        if(this.seriousSource){
            //this.renderer.setRenderTarget(null);
            //this.renderer.resetGLState();
            this.renderer.setClearColor( this.color, 1 );
            this.renderer.render( this.scene, this.camera, this.textureSerious, true);
        } else {
            this.renderer.render( this.scene, this.camera );
        }
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
        this.scene.add(mesh);
        this.objs.push(mesh);

        if(this.worker) this.worker.add({});

        return mesh;

        
    },
    add:function( obj, map ){

        var obj = obj || {};

        var type = obj.type || 'box';

        obj.size = obj.size || [V.randInt(1, 2 ), V.randInt(1, 2 ), V.randInt(1, 2 )];
        obj.pos = obj.pos || [V.randInt(-20, 20 ), V.randInt(0, 100)];
        

        obj.mass = 1;

        var geo 

        switch(type){
            case 'box' : geo = new THREE.CubeGeometry( obj.size[0], obj.size[1], obj.size[2] ); break;
            case 'circle' : geo =  new THREE.CylinderGeometry( obj.size[0], obj.size[0], obj.size[2], 12 ); geo.applyMatrix(new THREE.Matrix4().makeRotationX(-V.PI90)); break;
            //case 'plane' : shape = new p2.Plane(); break;
            //case 'field' : shape = new p2.Heightfield(obj.data,{ elementWidth: 1 }); break;
        }
        

        var mat 
        if(map) mat = new THREE.MeshBasicMaterial( { map:map, transparent:true });
        else mat = new THREE.MeshBasicMaterial( { color:0X00FF00 });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(obj.pos[0], obj.pos[1], obj.size[2]*0.5);
        this.scene.add(mesh);
        this.objs.push(mesh);

        if(this.worker) this.worker.add(obj);
        
        //return mesh;

        
    },
    addCar:function( obj ){
        var mat = new THREE.MeshBasicMaterial( { color:0X00FF00 });
        var chassis = new THREE.Mesh(new THREE.CubeGeometry( 1, 0.5, 1 ), mat);
        var geo =  new THREE.CylinderGeometry( 0.3, 0.3, 1, 12 ); 
        geo.applyMatrix(new THREE.Matrix4().makeRotationX(-V.PI90));

        var w1 = new THREE.Mesh(geo, mat);
        var w2 = new THREE.Mesh(geo, mat);

        this.scene.add(chassis);
        this.objs.push(chassis);
        this.scene.add(w1);
        this.objs.push(w1);
        this.scene.add(w2);
        this.objs.push(w2);

        if(this.worker) this.worker.addCar(obj);
    },
    addPlayer:function( obj, txt ){
        var obj = obj || {};
        obj.size = [1.6,2.4,2];
        obj.pos = [0,2];

        var girlTexture = txt;//new THREE.ImageUtils.loadTexture( 'images/sorcery.png' );
        this.girlStatic = new V.TextureAnimator( girlTexture, 8, 8, 1, 31, 60 );
        this.girlWalk = new V.TextureAnimator( girlTexture, 8, 8, 33, 45, 60 );

        var mat = new THREE.MeshBasicMaterial( { color:0XFFFF00 });
       // mat.visible = false;
        var mat2 = new THREE.MeshBasicMaterial( { map:girlTexture, side:THREE.DoubleSide, transparent:true });
        var body = new THREE.Mesh(new THREE.CubeGeometry( obj.size[0], obj.size[1], obj.size[2] ), mat);

        this.player = new THREE.Mesh(new THREE.PlaneBufferGeometry(3,3), mat2);
        
    
        /*this.scene.add(body);
        body.add(b2);
        this.objs.push(body);*/

        this.scene.add(this.player);
        //this.player.add(body)
        this.objs.push(this.player);

        if(this.worker) this.worker.addPlayer(obj);

        this.girlReady = true;
    },
    
    initWorker:function(){

        this.worker = new V.Worker();
        this.worker.start();
        //setInterval(this.worker.w.postMessage({ m:'run' }), 1000/60);
        //setInterval(function(){this.worker.run();}.bind(this), 1000/60);
    },
    bindKeys:function(){
        window.onkeydown = function(e) {
            e = e || window.event;
            switch ( e.keyCode ) {
                case 38: case 87: case 90: this.input[3] = 1;  break; // up, W, Z
                case 40: case 83:          this.input[4] = 1;  break; // down, S
                case 37: case 65: case 81: this.input[5] = 1;  break; // left, A, Q
                case 39: case 68:          this.input[6] = 1;  break; // right, D
                case 17: case 67:          this.input[7] = 1;  break; // ctrl, C
                case 69:                   this.input[8] = 1;  break; // E
                case 32:                   this.input[9] = 1;  break; // space
                case 16:                   this.input[10] = 1;  break; // shift
            }
        }.bind(this);
        window.onkeyup = function(e) {
            e = e || window.event;
            switch( e.keyCode ) {
                case 38: case 87: case 90: this.input[3] = 0;  break; // up, W, Z
                case 40: case 83:          this.input[4] = 0;  break; // down, S
                case 37: case 65: case 81: this.input[5] = 0;  break; // left, A, Q
                case 39: case 68:          this.input[6] = 0;  break; // right, D
                case 17: case 67:          this.input[7] = 0;  break; // ctrl, C
                case 69:                   this.input[8] = 0;  break; // E
                case 32:                   this.input[9] = 0;  break; // space
                case 16:                   this.input[10] = 0;  break; // shift
            }
        }.bind(this);
    },
}

V.TextureAnimator = function (texture, tilesHoriz, tilesVert, start, end, tileDispDuration) {   
    this.texture = texture;
    this.start = start;

        
    this.tilesHorizontal = tilesHoriz;
    this.tilesVertical = tilesVert;
    // how many images does this spritesheet contain?
    //  usually equals tilesHoriz * tilesVert, but not necessarily,
    //  if there at blank tiles at the bottom of the spritesheet. 
    this.numberOfTiles = end;
    //this.texture.flipY = false;
    this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping; 
    this.texture.repeat.set( 1 / this.tilesHorizontal, 1 / this.tilesVertical );

    this.texture.offset.x = 0/ this.tilesHorizontal;
    this.texture.offset.y = 7/ this.tilesVertical;

    // how long should each image be displayed?
    this.tileDisplayDuration = tileDispDuration;

    // how long has the current image been displayed?
    this.currentDisplayTime = 0;

    // which image is currently being displayed?
    this.currentTile = this.start;//0;

    //this.show(1)
}

V.TextureAnimator.prototype = {
    constructor: V.TextureAnimator,
    show:function(n){
        n = n-1;
        var Column = n % this.tilesHorizontal;
        var Row = (this.tilesVertical-1) - Math.floor( n / this.tilesHorizontal );
        this.texture.offset.x = Column/ this.tilesHorizontal;
        this.texture.offset.y = Row/ this.tilesVertical;
    },
    update:function(milliSec){
        this.currentDisplayTime += milliSec;
        while (this.currentDisplayTime > this.tileDisplayDuration) {
            this.currentDisplayTime -= this.tileDisplayDuration;
            this.show(this.currentTile);
            this.currentTile++;
            if (this.currentTile == this.numberOfTiles) this.currentTile = this.start;
        }
    }
}

//---------------------------------------------------
//   NAVIGATION
//---------------------------------------------------

V.Nav = function( h, v, d, f, lock){
	this.isFocus = false;
    this.isRevers = false;
    this.cammode = 'normal';
    this.EPS = 0.000001;

	this.cursor = new V.Cursor();
    this.lockView = lock || false;

	this.camera = new THREE.PerspectiveCamera( f||40, V.main.dimentions.r, 0.1, 2000 );
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
        var dom = V.main.canvas;
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
        V.main.input[0] = 1;
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
        V.main.input[0] = 0;
        this.mouse.down = false;
        this.cursor.change();
        if (typeof mainUp == 'function') { mainUp(); }
        e.preventDefault();
        e.stopPropagation();
    },
    onMouseOut:function(e){
        V.main.input[0] = 0;
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
        
        if(this.lockView) this.rayTest();
        
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
    },
    rayTest:function(e){
        this.rayVector.x = ( this.mouse.x / V.main.dimentions.w ) * 2 - 1;
        this.rayVector.y = - ( this.mouse.y / V.main.dimentions.h ) * 2 + 1;
        this.rayVector.unproject( this.camera );
        this.raycaster.ray.set( this.camera.position, this.rayVector.sub( this.camera.position ).normalize() );
        var intersects = this.raycaster.intersectObjects( V.main.base.children );
        if ( intersects.length > 0 ) {
            //this.mouse.move = false;
            //this.selectName = intersects[0].object.name;
            //this.mouse3d.copy(intersects[0].point);

            V.main.mouse.position.copy(intersects[0].point);

            V.main.input[1] = intersects[0].point.x;
            V.main.input[2] = intersects[0].point.y;

           // if (typeof mainRay == 'function') { mainRay(this.mouse3d, this.selectName); }
            
        } else {
            this.selectName = '';
        }
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

//---------------------------------------------------
//   LOADER
//---------------------------------------------------

V.Loader = function(){
    //this.info = info || null;
    //this.callback = callback;

    //this.MESH_PATH = 'models/';
    //this.IMAGE_PATH = 'textures/';

    //this.SEA = [];
    //this.PLY = [];
    //this.IMG = [];
    
    //this.loadPLY();
}

V.Loader.prototype = {
    constructor: V.Loader,
    sea:function(url, txt, callback, size){
        var loader = new THREE.SEA3D( {
                    container : V.main.scene,
                    //parser : THREE.SEA3D.DEFAULT
                });
        size = size || 1;
        var name = url.substring(url.lastIndexOf("/")+1, url.lastIndexOf("."));
        //var mtx = new THREE.Matrix4().makeScale(size,size,-size);
        //V.main.geos[name] = {};
        loader.onComplete = function(e) {
            var i = loader.meshes.length, m, g;
            while(i--){
                m = loader.meshes[i];
               // m.material = new THREE.MeshBasicMaterial( { map:txt, transparent:true });
               // g = m.geometry;
               // g.applyMatrix(mtx);
              // V.main.geos[name][m.name] = g;

                
            }
            //if(callback) callback();
        }.bind(this);
        //loader.parser = THREE.SEA3D.DEFAULT;
        loader.load( url );
    },
    /*loadPLY : function(){
        var loader = new THREE.PLYLoader();
        var name = this.PLY[0];
        var mtx = new THREE.Matrix4().makeScale(40,40,40);
        if(name == 'torus' || name == 'brain' || name == 'cone' || name == 'cube' || name == 'knot'|| name == 'sphere')mtx = new THREE.Matrix4().makeScale(10,10,10);
        var g;
        loader.addEventListener( 'load', function (e){
            g = e.content;
            g.applyMatrix(mtx);
            V.main.geos['ply'][name] = g;
            this.PLY.shift();
            if(this.PLY.length) this.loadPLY();
            else this.loadSEA();
        }.bind(this), false);
        loader.load( this.MESH_PATH + name+'.ply' );
        if(this.info)this.info.innerHTML = 'LOAD PLY: ' + name;
    },
    loadSEA : function(){
        var loader = new THREE.SEA3D( true );
        var mtx = new THREE.Matrix4().makeScale(2,2,-2);
        var name = this.SEA[0];
        if(name == 'object') mtx = new THREE.Matrix4().makeScale(10,10,-10);
        loader.onComplete = function( e ) {
            V.main.geos[name] = {};
            var i = loader.meshes.length, m, g;
            while(i--){
                m = loader.meshes[i];
                if(name !== 'avatar'){
                    g = m.geometry;
                    g.applyMatrix(mtx);
                    V.main.geos[name][m.name] = g;
                }else{
                    V.main.geos[name][m.name] = m;
                }
            }
            this.SEA.shift();
            if(this.SEA.length) this.loadSEA();
            else this.loadIMAGE();
        }.bind(this);
        loader.parser = THREE.SEA3D.DEFAULT;
        loader.load( this.MESH_PATH + name+'.sea' );
        if(this.info)this.info.innerHTML = 'LOAD SEA: ' + name;
    },
    loadIMAGE : function(){
        var img = new Image();
        var nameUrl = this.IMG[0];
        var name = nameUrl.substring(0, nameUrl.lastIndexOf("."));
        img.onload = function(){
            V.main.imgs[name] = img;
            this.IMG.shift();
            if(this.IMG.length) this.loadIMAGE();
            else this.loadEND();
        }.bind(this);
        img.src = this.IMAGE_PATH+nameUrl;
        if(this.info)this.info.innerHTML = 'LOAD IMAGE: ' + name;
    },
    loadEND : function(){
        if(this.info)this.info.innerHTML = 'END LOADING'
        this.callback();
    }*/
}


//---------------------------------------------------
//   WORKER
//---------------------------------------------------

V.Worker = function(){

    this.data = null;
    this.w = new Worker('js/p2.worker.js');

    this.w.postMessage = this.w.webkitPostMessage || this.w.postMessage;
    this.w.onmessage = function(e){this.update(e)}.bind( this );

}

V.Worker.prototype = {
    constructor: V.Worker,

    clear:function(){
        this.w.postMessage({m:'clear'});
    },

    start:function(){
        //this.inter = setInterval(function(){this.w.postMessage({ m:'run' })}.bind(this), 1000/60);
        var w = this.w;
        this.inter = setInterval( function(){
           
            w.postMessage({ m:'run', input:V.main.input })
        } , 1000/60);
    },

    post:function(){;
        this.w.postMessage({});
    },

    run:function(){
        this.w.postMessage({ m:'run' });
    },

    add:function(obj){
        this.w.postMessage({ m:'add', obj:obj });
    },

    addCar:function(obj){
        this.w.postMessage({ m:'addCar', obj:obj });
    },

    addPlayer:function(obj){
        this.w.postMessage({ m:'addPlayer', obj:obj });
    },

    update:function(e){
        if(e.data.clear){
            this.w.terminate();
            return;
        }

        this.data = e.data.ar;

        var i = V.main.objs.length, id;
        while(i--){
            id = i*3;
            V.main.objs[i].position.x = this.data[id];
            V.main.objs[i].position.y = this.data[id+1];
            V.main.objs[i].rotation.z = this.data[id+2];
        }
    }
}