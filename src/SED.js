/**   _   _____ _   _ 
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_| 2015
*    @author lo.th / http://lo-th.github.io/labs/
*/

'use strict';
var Seriously, UIL;
var SED = { REVISION:0.5 };

//SED.Sources = [ 'image', 'video', 'camera', 'scene', 'texture' ];
SED.Sources = [ 'image', 'video', 'camera', 'scene' ];

SED.Effects = [
    'reformat',  

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

    'throttle',            'temperature',   'tone',               'tvglitch',    'vibrance',   
    'vignette',            'whitebalance'
];

SED.Targets = [ 'texture', 'canvas' ];

SED.BlendMode = [
    'normal',      'lighten',     'darken',      'multiply',   'average',
    'add',         'subtract',    'divide',      'difference', 'negation', 
    'exclusion',   'screen',      'overlay',     'softlight',  'hardlight', 
    'colordodge',  'colorburn',   'lineardodge', 'linearburn', 'linearlight', 
    'vividlight',  'pinlight',    'hardmix',     'reflect',    'glow',
    'phoenix',     'hue',         'saturation',  'color',      'luminosity',
    'darkercolor', 'lightercolor'
];

SED.BlendSizeMode = [ 'bottom', 'top', 'union', 'intersection' ];

SED.BlackListed = ['colorcube', 'channels', 'layer', 'select', 'whitebalance' ];

SED.Editor = function(autorun, view3d){

    this.body = document.body;
    this.dimentions = {w:window.innerWidth,  h:window.innerHeight, r:window.innerWidth/window.innerHeight };    

    this.LAYER = 0;

    this.view3d = view3d || null;
    this.glCanvas = this.view3d.canvas || null;

    this.seriously = new Seriously();

    this.view3dTexture = null;
    this.renderCanvas = null;

    //this.viewTexture = null;
    //this.viewTextureNode = [];
    //this.viewTextureId = [];

    //this.renderCanvas = [];//null;
    //this.viewRenderId = [];
    //this.gl = null;

    //this.viewTextureNode = null;
    //this.viewTextureId = NaN; 


    if(autorun){
        this.seriously.go(
            function (now) {

                if(this.view3d) this.view3d.render();

                if(this.view3dTexture!==null && !this.isResize ){
                    //if(this.view3d) this.view3d.render();
                    this.view3dTexture.node.update();
                }

                /*if(this.viewTextureNode[this.LAYER] && !this.isResize ){
                    //if(this.view3d) this.view3d.render();
                    this.viewTextureNode[this.LAYER].update();
                }*/

                if(this.isResize)this.isResize = false;

            }.bind(this)
        );
        console.log("auto")
    }

    this.isResize = false;

    // all referency to 3d textures
    this.textures = {};
    this.texture_default = null;
    this.canvas_default = null;

    this.maxLayer = 9;
    
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
        sc1:'rgba(120,48,68,0.66)', fc1:'rgba(48,120,68,0.66)', tc1:'rgba(48,68,120,0.66)', nc1:'rgba(48,48,48,0.66)',
        sc2:'rgba(120,48,68,0.8)', fc2:'rgba(48,120,68,0.8)', tc2:'rgba(48,68,120,0.8)', nc2:'rgba(48,48,48,0.8)',
    };

    this.selectID = -1;


    this.init();
    
    window.onresize = function(e) {this.resize(e)}.bind(this);
    //window.addEventListener("resize", function(e) {this.resize(e)}.bind(this) );
}

SED.Editor.prototype = {
    constructor: SED.Editor,
    resize:function(e){
        this.isResize = true;
        this.dimentions.w = window.innerWidth;
        this.dimentions.h = window.innerHeight;
        this.dimentions.r = this.dimentions.w/this.dimentions.h;

        this.view3d.resize(this.dimentions);

        if(this.renderCanvas!==null){

            this.renderCanvas.node.width = this.dimentions.w;
            this.renderCanvas.node.height = this.dimentions.h;

        }

        if(this.view3dTexture!==null){

            this.view3dTexture.active = false;
            this.activeNodes( this.view3dTexture );
            
            this.applyLinks();

        }
    },
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
        var str = 'box-sizing:border-box; -moz-box-sizing:border-box; -webkit-box-sizing:border-box; font-family:"Open Sans", sans-serif; font-size:11px; color:#CCCCCC;';
        SED.CC('S-editor', 'width:40px; height:40px; position:absolute; right:10px; top:20px; border:5px solid #282828; cursor:move; overflow:hidden; background:#1a1a1a;' + str );
        SED.CC('S-editor:hover', 'box-shadow:inset 0 0 0 1px #000');

        SED.CC('S-icc', 'position:absolute; left:-5px; top:-4px; text-align:center; width:40px; height:40px; pointer-events:none;'+ str);

        SED.CC('S-grid','position:absolute; left:0px; top:0px; pointer-events:none; width:'+this.gridsize.x+'px; height:'+this.gridsize.y+'px;'+ str);
        SED.CC('S-grid-plus', 'position:absolute; left:0px; top:0px; pointer-events:none;'+ str);

        SED.CC('S-menu', 'width:300px; height:20px; position:absolute; right:0px; top:0px; pointer-events:auto; background:#282828; display:none; '+ str);
        SED.CC('S-rmenu', 'width:300px; height:50px; position:absolute; right:0px; top:270px; pointer-events:none; background:#282828; display:none;'+ str);
        SED.CC('S-amenu', 'width:300px; height:auto; position:absolute; padding:3px; right:0px; top:50px; pointer-events:none; background:#282828; display:none; text-align:center;'+ str);
        SED.CC('S-delmenu', 'width:300px; height:30px; position:absolute; right:0px; top:270px; pointer-events:none; display:none;');

        // node
        SED.CC('S-S', 'width:'+this.nset.w+'px; height:'+this.nset.h+'px; position:absolute; background:'+this.nset.sc1+'; border-radius:'+this.nset.r+'px; cursor:default; pointer-events:auto;'+ str);
        SED.CC('S-E', 'width:'+this.nset.w+'px; height:'+this.nset.h+'px; position:absolute; background:'+this.nset.fc1+'; border-radius:'+this.nset.r+'px; cursor:default; pointer-events:auto;'+ str);
        SED.CC('S-T', 'width:'+this.nset.w+'px; height:'+this.nset.h+'px; position:absolute; background:'+this.nset.tc1+'; border-radius:'+this.nset.r+'px; cursor:default; pointer-events:auto;'+ str);
        // node over
        SED.CC('S-S:hover', 'background:'+this.nset.sc2+'; ');
        SED.CC('S-E:hover', 'background:'+this.nset.fc2+'; ');
        SED.CC('S-T:hover', 'background:'+this.nset.tc2+'; ');
        // node icon
        SED.CC('S-icon', 'width:'+this.nset.w+'px; height:'+this.nset.h+'px; position:absolute; left:0px; top:0px; pointer-events:none;'+ str);
        // selected
        SED.CC('S-select', 'margin-left:-1px; margin-top:-1px; width:'+(this.nset.w+2)+'px; height:'+(this.nset.h+2)+'px; position:absolute; border:2px solid #FFF; border-radius:'+(this.nset.r+1)+'px; display:none; pointer-events:none;'+ str);
        // link
        SED.CC('S-in', 'width:8px; height:8px; position:absolute; left:16px; top:-4px; border:2px solid #0F0; background:#000; border-radius:8px; cursor:alias; pointer-events:auto;'+ str);
        SED.CC('S-out', 'width:8px; height:8px; position:absolute; left:16px; bottom:-4px; border:2px solid #FF0; background:#000; border-radius:8px; cursor:alias; pointer-events:auto;'+ str);

        SED.CC('S-closeButton', 'position:absolute; left:0px; top:0px; width:25px; height:20px; font-size:14px; padding-top:5px; background:#none; pointer-events:auto; cursor:pointer; text-align:center;');
        SED.CC('S-closeButton:hover', 'background:#422; color:#F00;');

        SED.CC('S-sideButton', 'position:absolute; width:29px; height:20px; padding-top:5px; background:#282828; pointer-events:auto; cursor:pointer; font-size:14px; text-align:center; border-left:1px solid #333; color:#e2e2e2;');
        SED.CC('S-sideButton:hover', 'background:#404040;');
        SED.CC('S-sideButton-select:hover', 'background:#404040;');
        SED.CC('sideselect', ' background:#1a1a1a; color:#F0F; height:22px; border-right:1px solid #000;');

        SED.CC('root-button', 'position:absolute; left:10px; top:0px; width:26px; height:26px; border:1px solid #333; pointer-events:auto; cursor:pointer; overflow: hidden;'+ str);
        SED.CC('root-button-inner', 'position:absolute; left:-8px; top:-8px; pointer-events:none;')
        SED.CC('root-button:hover', 'background:#F0F;');
        SED.CC('root-button.select', 'background:#808;');

        SED.CC('root-text', 'position:absolute; left:10px; top:28px; width:280px; height:18px; pointer-events:none; padding-top:2px; padding-left:10px; background:rgba(0,0,0,0.2);'+ str);


        SED.CC('saveout', 'pointer-events:auto; cursor: pointer; width:90px; height:20px; position:absolute; top:6px; left: 132px; color:#F80; text-decoration:none;');

        SED.CC('hidden', 'opacity: 0; -moz-opacity: 0; filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0)');
        SED.CC('fileInput', 'cursor:pointer; height: 100%; position:absolute; top: 0; right: 0; font-size:50px;');

        SED.CC('mini-button', 'width:30px; height:30px; position:relative; margin-top:-3px; display:inline-block; background:#0F0; border:2px solid #282828; pointer-events:auto; cursor:pointer; border-radius:3px; overflow: hidden;'+ str);
        SED.CC('mini-button:hover', 'border:2px solid #e2e2e2;');
        SED.CC('mini-button-inner', 'position:absolute; left:-2px; top:-2px; pointer-events:none;');

        this.content = this.element('S-editor');
        this.content.name = 'root';

        this.menu = this.element('S-menu');
        

        //this.bmenu = this.element('S-bmenu');
        this.rmenu = this.element('S-rmenu');
        this.amenu = this.element('S-amenu');

        this.delmenu = this.element('S-delmenu');

        this.grid = this.element('S-grid');
        this.gridBottom = this.element('S-gris-plus', 'canvas');
        this.select = this.element('S-select');
        this.gridTop = this.element('S-grid-plus');
        this.icc = this.element('S-icc');

        this.gridBottom.width = this.gridsize.x;
        this.gridBottom.height = this.gridsize.y;
        this.gridBottom.style.display = 'none';
        this.linkcontext = this.gridBottom.getContext('2d');
        this.icc.innerHTML = SED.Logo(36, '#e2e2e2');

        this.initMenu();
        this.initRootMenu();

        this.body.appendChild( this.content );
        this.body.appendChild( this.menu );
        //this.body.appendChild( this.bmenu );
        this.ui = new UIL.Gui('right:0px; top:270px; display:none;');
        this.body.appendChild( this.rmenu );
        this.body.appendChild( this.delmenu );

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

        this.icc.innerHTML = SED.Logo(256, '#111');
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
        this.ui.show();
        //this.bmenu.style.display = 'block';
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

        this.icc.innerHTML = SED.Logo(36, '#e2e2e2');
        this.icc.style.top = '-4px';
        this.icc.style.left = '-5px';

        this.menu.style.display = 'none';
        this.ui.hide();
        //this.bmenu.style.display = 'none';
        this.rmenu.style.display = 'none';
        this.gridBottom.style.display = 'none';

        this.clearNodeDiv();
        this.isFirst = false;
    },

    // CLEAR

    clearNodeDiv:function(){
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
        this.tell();

        this.delB = this.element('root-button', 'div', 'left:264px; top:2px; border-radius:13px; border:1px solid rgba(0,0,0,0);');
        this.delmenu.appendChild(this.delB);
        this.delB.onclick = function(e) { this.deleteSelected(); }.bind(this);

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

        i = 4
        while(i--){
            b = this.element('root-button-inner');
            switch(i){
                case 0 :
                b.innerHTML = SED.Icon('add');
                this.addB.appendChild(b);
                break;
                case 1 :
                b.innerHTML = SED.Icon('load');
                this.loadB.appendChild(b);
                break;
                case 2 :
                b.innerHTML = SED.Icon('save');
                this.saveB.appendChild(b);
                break;
                case 3 :
                b.innerHTML = SED.Icon('del', 40, '#CCC');
                this.delB.appendChild(b);
                break;
            }
        }

        var bb = [], name;
        for(i=0; i<SED.Sources.length; i++){
            b = this.element('mini-button', 'div', 'background:'+this.nset.sc1+';');
            b.name = SED.Sources[i];
            b.id = 1;
            bb.push(b);
        }
        var notAdd = false;
        for(i=0; i<SED.Effects.length; i++){
            notAdd =false;
            name = SED.Effects[i];
            for(var j=0; j<SED.BlackListed.length; j++){
                if(name == SED.BlackListed[j]) notAdd =true;
            }
            if(notAdd) b = this.element('mini-button', 'div', 'background:'+this.nset.nc1+';');
            else b = this.element('mini-button', 'div', 'background:'+this.nset.fc1+';');
            b.name = name;
            b.id = 1;
            if(notAdd) b.id = 0;
            bb.push(b);
        }

        
        for(i=0; i<SED.Targets.length; i++){
            b = this.element('mini-button', 'div', 'background:'+this.nset.tc1+';');
            b.name = SED.Targets[i];
            b.id = 1;
            bb.push(b);
        }

        for(i=0; i<bb.length; i++){
            b = bb[i];
            c = this.element('mini-button-inner');
            c.innerHTML = SED.Icon(b.name, 30);
            b.appendChild(c);
            this.amenu.appendChild(b);
            if(b.id==1){
                b.onmousedown = function(e) { this.addItem(e.target.name); }.bind(this);
                b.onmouseover = function(e) { this.tell('+ ' + e.target.name.substr(0,1).toUpperCase() + e.target.name.substr(1) ); }.bind(this);
                b.onmouseout =  function(e) { this.tell(); }.bind(this);
            } else {
                b.onmouseover = function(e) { this.tell('x ' + e.target.name.substr(0,1).toUpperCase() + e.target.name.substr(1) ); }.bind(this);
                b.onmouseout =  function(e) { this.tell(); }.bind(this);
            }
            
        }

    },

    tell:function(string){
        if(!string) string = 'SED ' + SED.REVISION;
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

        var i = 0;

        layer = layer || 0;

        obj = obj || {};

        var prefix;
        for(i=0; i<SED.Sources.length; i++){ if(type == SED.Sources[i] ) prefix = 'S'; }
        for(i=0; i<SED.Effects.length; i++){ if(type == SED.Effects[i] ) prefix = 'E'; }
        for(i=0; i<SED.Targets.length; i++){ if(type == SED.Targets[i] ) prefix = 'T'; }


        var id = obj.id || this.tmp[layer].nodes.length;
        //if( obj.id !== undefined ) id = obj.id;
        //else id = this.tmp[layer].nodes.length;

        var name = prefix +'_'+ id + '.' + type;

        // remove old
        if(this.tmp[layer].nodes[id] !== undefined){
            obj.x = this.tmp[layer].nodes[id].x;
            obj.y = this.tmp[layer].nodes[id].y;
            //this.tmp[layer].nodes[id].node.destroy();
            /*switch(prefix){
                case 'S': this.xprevdecale[layer][0]-=this.xDecale; break;
                case 'E': this.xprevdecale[layer][1]-=this.xDecale; break;
                case 'T': this.xprevdecale[layer][2]-=this.xDecale; break;
            }*/
            //console.log('destroy', obj.x, obj.y);
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

        //this.tmp[layer].nodes[id] = { n:obj.n || prefix +'_'+ id, name:name, node:node, x:obj.x || x, y:obj.y || y, obj:obj };

        this.tmp[layer].nodes[id] = { n:obj.n || prefix +'_'+ id, name:name, node:null, x:obj.x || x, y:obj.y || y, obj:obj, active:false };


        if( layer==this.LAYER ) this.activeNodes( this.tmp[layer].nodes[id] );
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

    // NODE ACTIVATION 

    activeNodes:function(nodes){

        var node, obj = nodes.obj, type = this.getType(nodes.name);

        //console.log(type);
        if(nodes.active) return;

        if(nodes.node!==null && type!=='canvas'){ 
            if(nodes.node.destroy){
                //console.log('destroy', nodes.type);
                nodes.node.destroy();
            }
        }

        //nodes.type;


        switch(type){
            case 'image': node = document.createElement('img'); break;
            case 'video': node = document.createElement('video'); break;
            case 'camera': node = this.seriously.source('camera'); break;
            case 'scene':
                node = this.seriously.source(this.view3d.addSeriousSource());
                this.view3dTexture = nodes;
            break;
            
            //--------------------------------- target
            case 'texture':
                node = this.seriously.target( this.textures[obj.texture], { canvas:obj.canvas || this.glCanvas });
            break;
            case 'canvas':
                node = this.seriously.target( obj.canvas || this.glCanvas );
                node.width = this.dimentions.w;
                node.height = this.dimentions.h;
                this.renderCanvas = nodes;
            break;
            //--------------------------------- filter
            case 'reformat': node = this.seriously.transform('reformat'); break;
            case 'transform-2d': node = this.seriously.transform('2d'); break;
            default: node = this.seriously.effect(type); 
        }

        for(var e in obj){
            if(e!=='texture' && e!=='canvas' && e!=='id' && e!=='n' && e!=='x' && e!=='y' && e in node){
                node[e] = obj[e];
            }
        }

        nodes.node = node;
        nodes.active = true;

        //console.log(type, node)

    },

    destroyLayerNodes:function(){ 
        var i = this.tmp[this.LAYER].nodes.length, nodes, type;
        while(i--){ 
            nodes = this.tmp[this.LAYER].nodes[i];
            type = this.getType(nodes.name);
            if(nodes.node.destroy && type!=='canvas') nodes.node.destroy();
            nodes.node = null;
            nodes.active = false;
        }

        this.view3dTexture = null;
        this.renderCanvas = null;
    },

    removeNode:function(n){
        var nodes;
        if(this.tmp[this.LAYER].nodes[n]){
            nodes = this.tmp[this.LAYER].nodes[n];
            if(nodes.node.destroy && nodes.type!=='canvas') nodes.node.destroy();
            //this.tmp[this.LAYER].nodes[n].clear();
            this.tmp[this.LAYER].nodes.splice(n, 1);
            nodes = null;
        }
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

        //this.seriously.destroy();
        this.clearNodeDiv();

        layer = layer || 0;

        if(layer!==this.LAYER || first){
            this.destroyLayerNodes();
            this.LAYER = layer;
        }

        var i = this.tmp[this.LAYER].nodes.length;

        while(i--){
            this.activeNodes( this.tmp[this.LAYER].nodes[i] );
            this.showNode( this.tmp[this.LAYER].nodes[i].name );
        }
        
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
        var i = this.tmp[layer].nodes.length, id;
        while(i--){
            id = this.getID( this.tmp[layer].nodes[i].name );
            if(ID == id) return this.tmp[layer].nodes[i];//.node;
            //if(ID == i) return this.tmp[layer].nodes[i].node; 
        }
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
        icon.innerHTML =  SED.Icon(type);
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

        //this.activeNodes(type, this.tmp[this.LAYER].nodes[id] );
    },

    switchIndex:function(NAME){
        var i = this.nodesDiv.length, node, name, id;
        while(i--){
            node = this.nodesDiv[i];
            name = node.name;
            if(NAME==name) node.style.zIndex = 1;
            else node.style.zIndex = 0;
        }
    },

    deleteNode:function(n){
        var i = this.nodesDiv.length, node, name, id;
        while(i--){
            node = this.nodesDiv[i];
            name = node.name;
            id = this.getID(name);
            if(n==id){
                this.removeNode(n);
                this.gridTop.removeChild(node);
                this.nodesDiv.splice(n, 1);
                node = null;
            }
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
            var link = new SED.Link(this, obj);
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
        var link = new SED.Link(this, obj);
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

    deleteLink:function(id){
        var i = this.tmp[this.LAYER].links.length;
        var oldStart=null, oldEnd=null;
        var link, m;
        while(i--){
            link = this.tmp[this.LAYER].links[i]
            m = link.obj;
            if(m.source == id){ this.removeLink(i); oldStart=m;}
            if(m.target == id){ this.removeLink(i); oldEnd = m;}
        }
        if(oldStart!==null && oldEnd!==null){
            //console.log(oldStart, oldEnd, id);
            this.addLink(oldStart.target, oldEnd.source, oldStart.targetN || 0, oldEnd.sourceN || 0,  this.LAYER);
        }
        
    },


    //-----------------------------------------------------------

    // SELECTOR

    selector:function(name){
        this.clearSelector();
        if(name=='root'){
            this.selectID = -1;
            this.select.style.display = 'none';
            this.delmenu.style.display = 'none';
            //this.menu.style.height = 'auto';//50 + 'px';
            this.rmenu.style.display = 'block';
            //this.showRootMenu();

        } else {
            var id = this.getID(name);
            this.select.style.display = 'block';
            this.delmenu.style.display = 'block';

            this.select.style.left = this.tmp[this.LAYER].nodes[id].x + 'px';
            this.select.style.top = this.tmp[this.LAYER].nodes[id].y + 'px';
            this.selectID = id;
            //this.menu.style.height = 'auto';

            this.rmenu.style.display = 'none';
            this.showSelector(name);
        }
    },

    showSelector:function(name){

        var id = this.getID(name);
        var prefix = this.getPrefix(name);
        var type = this.getType(name);

        this.addUIS(id, 'title', {id:id, name:type, prefix:prefix, color:'G'});

       switch(type){
            case 'reformat':
                this.addUIS(id, 'list', {name:'mode', list:['contain', 'cover', 'distort', 'width', 'height', 'none']});
                this.addUIS(id, 'number', {name:'width', min:0, precision:0});
                this.addUIS(id, 'number', {name:'height', min:0, precision:0});
                //this.addUIS(id, 'number', {name:'translateX' , precision:0});
                //this.addUIS(id, 'number', {name:'translateY', precision:0});
                //this.addUIS(id, 'bool', {name:'none'});

            break;
            case 'transform-2d':
                this.addUIS(id, 'number', {name:'translateX' , precision:0});
                this.addUIS(id, 'number', {name:'translateY', precision:0});
            break;
            case 'image': this.addUIS(id, 'string', {name:'src', color:'R'}); break;
            case 'texture-3D': this.addUIS(id, 'string', {name:'texture', color:'B'}); break;
            case 'accumulator':
                this.addUIS(id, 'slide', {name:'opacity', min:0, max:1, precision:2 });
                this.addUIS(id, 'list', {name:'blendMode', list:SED.BlendMode});
                this.addUIS(id, 'bool', {name:'clear'});
            break;
            case 'ascii':
                this.addUIS(id, 'color', {name:'background'});
            break;
            case 'bleach-bypass': 
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2 });
            break;
            case 'blend':
                this.addUIS(id, 'slide', {name:'opacity', min:0, max:1, precision:2 });
                this.addUIS(id, 'list', {name:'mode', list:SED.BlendMode});
                this.addUIS(id, 'list', {name:'sizeMode', list:SED.BlendSizeMode});
            break;
            case 'blur': 
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2 });
                this.addUIS(id, 'slide', {name:'blendGamma', min:0, max:4, precision:2});
            break;
            case 'brightness-contrast':
                this.addUIS(id, 'slide', {name:'brightness', min:0, max:1, precision:2 });
                this.addUIS(id, 'slide', {name:'contrast', min:0, max:1, precision:2 });
            break;
            case 'channels':
                var l = ['red', 'green', 'blue', 'alpha', 'union', 'intersection']
                this.addUIS(id, 'list', {name:'red', list:l});
                this.addUIS(id, 'list', {name:'green', list:l});
                this.addUIS(id, 'list', {name:'blue', list:l});
                this.addUIS(id, 'list', {name:'alpha', list:l});
            break;
            case 'checkerboard':
                this.addUIS(id, 'number', {name:'anchor', precision:0});
                this.addUIS(id, 'number', {name:'size', precision:0});
                this.addUIS(id, 'color', {name:'color1'});
                this.addUIS(id, 'color', {name:'color2'});
                this.addUIS(id, 'number', {name:'width', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'height', min:0, precision:0 });
            break;
            case 'chroma':
                this.addUIS(id, 'color', {name:'screen'});
                this.addUIS(id, 'number', {name:'weight'});
                this.addUIS(id, 'slide', {name:'balance', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'clipBlack', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'clipWhite', min:0, max:1, precision:2});
                this.addUIS(id, 'bool', {name:'mask'});
            break;
            case 'color':
                this.addUIS(id, 'color', {name:'color'});
                this.addUIS(id, 'number', {name:'width', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'height', min:0, precision:0 });
            break;
            case 'colorcomplements':
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'concentration', min:0.1, max:4, precision:2});
                this.addUIS(id, 'slide', {name:'correlation', min:0, max:1, precision:2});
                this.addUIS(id, 'color', {name:'guideColor'});
            break;
            case 'colorcube':
                /// ? ////
            break;
            case 'color-select':
                this.addUIS(id, 'number', {name:'hueMin', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'hueMax', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'hueMinFalloff', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'hueMaxFalloff', min:0, precision:0 });
                this.addUIS(id, 'slide', {name:'saturationMin', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'saturationMax', min:0, max:1, precision:2});
                this.addUIS(id, 'number', {name:'saturationMinFalloff', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'saturationMaxFalloff', min:0, precision:0 });
                this.addUIS(id, 'slide', {name:'lightnessMin', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'lightnessMax', min:0, max:1, precision:2});
                this.addUIS(id, 'number', {name:'lightnessMinFalloff', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'lightnessMaxFalloff', min:0, precision:0 });
                this.addUIS(id, 'bool', {name:'mask'});
            break;
            case 'crop':
                this.addUIS(id, 'number', {name:'top', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'left', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'bottom', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'right', min:0, precision:0 });
            break;
            case 'daltonize': 
                this.addUIS(id, 'list', {name:'type', list:['0.0', '0.2', '0.6', '0.8']});
            break;
            case 'directionblur':
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
                this.addUIS(id, 'number', {name:'angle', min:-360, max:360, isAngle:true, precision:0});
                this.addUIS(id, 'slide', {name:'blendGamma', min:0, max:4, precision:2});
            break;
            case 'displacement':
                this.addUIS(id, 'list', {name:'xChannel', list:['red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none' ]});
                this.addUIS(id, 'list', {name:'yChannel', list:['red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none' ]});
                this.addUIS(id, 'list', {name:'fillMode', list:['color', 'wrap', 'clamp', 'ignore' ]});
                this.addUIS(id, 'color', {name:'color'});
                this.addUIS(id, 'number', {name:'offset', min:0, max:10, precision:2, step:0.01 });
                this.addUIS(id, 'number', {name:'mapScale', min:0, precision:0 });
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
            break;
            case 'dither': break;
            case 'edge': 
                this.addUIS(id, 'list', {name:'mode', list:['sobel', 'frei-chen']});
            break;
            case 'emboss': 
                this.addUIS(id, 'slide', {name:'amount', min:-255/3, max:255/3, precision:0});
            break;
            case 'exposure': 
                this.addUIS(id, 'slide', {name:'exposure', min:-8, max:8, precision:1});
            break;
            case 'expression':
                this.addUIS(id, 'number', {name:'a'});
                this.addUIS(id, 'number', {name:'b'});
                this.addUIS(id, 'number', {name:'c'});
                this.addUIS(id, 'number', {name:'d'});
                this.addUIS(id, 'string', {name:'rgb'});
                this.addUIS(id, 'string', {name:'red'});
                this.addUIS(id, 'string', {name:'green'});
                this.addUIS(id, 'string', {name:'blue'});
                this.addUIS(id, 'string', {name:'alpha'});
            break;
            case 'fader':
                this.addUIS(id, 'color', {name:'color'});
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
            break;
            case 'falsecolor':
                this.addUIS(id, 'color', {name:'black'});
                this.addUIS(id, 'color', {name:'white'});
            break;
            case 'filmgrain':
                this.addUIS(id, 'number', {name:'time'});
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
                this.addUIS(id, 'bool', {name:'colored'});
            break;
            case 'freeze':
                this.addUIS(id, 'bool', {name:'frozen'});
                //this.addBool(id, 'frozen');
            break;
            case 'fxaa': break;
            case 'gradientwipe':
                this.addUIS(id, 'string', {name:'gradient'});
                this.addUIS(id, 'number', {name:'transition'});
                this.addUIS(id, 'bool', {name:'invert'});
                this.addUIS(id, 'slide', {name:'smoothness', min:0, max:1, precision:2});
            break;
            case 'hex':
                this.addUIS(id, 'slide', {name:'size', min:0, max:0.4, precision:2});
                this.addUIS(id, 'number', {name:'center',precision:0});
            break;
            case 'highlights-shadows':
                this.addUIS(id, 'slide', {name:'highlights', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'shadows', min:0, max:1, precision:2});
            break;
            case 'hue-saturation':
                this.addUIS(id, 'slide', {name:'hue', min:-1, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'saturation', min:-1, max:1, precision:2});
            break;
            case 'invert':break;
            case 'kaleidoscope':
                this.addUIS(id, 'number', {name:'segments', precision:0});
                this.addUIS(id, 'number', {name:'offset', precision:0});
            break;
            case 'layer':
                this.addUIS(id, 'number', {name:'count', precision:0});
                //this.addNumber(id, 'count');
                /// ? ////
            break;
            case 'linear-transfer':
                this.addUIS(id, 'number', {name:'slope'});
                this.addUIS(id, 'number', {name:'intercept'});
            break;
            case 'lumakey':
                this.addUIS(id, 'slide', {name:'clipBlack', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'clipWhite', min:0, max:1, precision:2});
                this.addUIS(id, 'bool', {name:'invert'});
            break;
            case 'mirror': break;
            case 'nightvision':
                this.addUIS(id, 'number', {name:'timer', min:0});
                this.addUIS(id, 'slide', {name:'luminanceThreshold', min:0, max:1, precision:2});
                this.addUIS(id, 'number', {name:'amplification', min:0});
                this.addUIS(id, 'color', {name:'color'});
            break;
            case 'noise':
                this.addUIS(id, 'bool', {name:'overlay'});
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
                this.addUIS(id, 'number', {name:'timer', min:0 });
            break;
            case 'panorama':
                this.addUIS(id, 'number', {name:'width', min:0, precision:0});
                this.addUIS(id, 'number', {name:'height', min:0, precision:0});
                this.addUIS(id, 'slide', {name:'yaw', min:0, max:360, precision:0});
                this.addUIS(id, 'slide', {name:'fov', min:0, max:180, precision:0});
                this.addUIS(id, 'slide', {name:'pitch', min:-90, max:90, precision:0});
            break;
            case 'pixelate':
                this.addUIS(id, 'number', {name:'pixelSize', min:0, precision:0});
            break;
            case 'polar': 
                this.addUIS(id, 'number', {name:'angle', min:-360, max:360, isAngle:true, precision:0});
            break;
            case 'repeat':
                this.addUIS(id, 'number', {name:'repeat', min:0, precision:0});
                this.addUIS(id, 'number', {name:'width', min:0, precision:0});
                this.addUIS(id, 'number', {name:'height', min:0, precision:0});
            break;
            case 'ripple':
                this.addUIS(id, 'number', {name:'wave', precision:2});
                this.addUIS(id, 'number', {name:'distortion', precision:2});
                this.addUIS(id, 'number', {name:'center'});
            break;
            case 'scanlines':
                this.addUIS(id, 'number', {name:'lines'});
                this.addUIS(id, 'slide', {name:'size', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'intensity', min:0, max:1, precision:2});
            break;
            case 'select':
                /// ? //// no SOURCE
                this.addUIS(id, 'slide', {name:'active', min:0, max:3, precision:0});
                this.addUIS(id, 'list', {name:'sizeMode', list:['union', 'intersection', 'active']});
            break;
            case 'sepia': break;
            case 'simplex':
                this.addUIS(id, 'number', {name:'noiseScale'});
                this.addUIS(id, 'number', {name:'noiseOffset'});
                this.addUIS(id, 'slide', {name:'octaves', min:1, max:8, precision:0});
                this.addUIS(id, 'slide', {name:'persistence', min:0, max:0.5, precision:2});
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
                this.addUIS(id, 'number', {name:'time'});
                this.addUIS(id, 'number', {name:'width', min:0});
                this.addUIS(id, 'number', {name:'height', min:0});
                this.addUIS(id, 'color', {name:'black'});
                this.addUIS(id, 'color', {name:'white'});
            break;
            case 'sketch': break;
            case 'split':
                this.addUIS(id, 'list', {name:'sizeMode', list:['a', 'b', 'union', 'intersection']});
                this.addUIS(id, 'slide', {name:'split', min:0, max:1, precision:2});
                this.addUIS(id, 'number', {name:'angle', min:-360, max:360, isAngle:true, precision:0});
                this.addUIS(id, 'slide', {name:'fuzzy', min:0, max:1, precision:2});
            break;
            case 'throttle':
                this.addUIS(id, 'number', {name:'frameRate', min:0, precision:0});
            break;
            case 'temperature':
                this.addUIS(id, 'slide', {name:'temperature', min:3000, max:25000, precision:0});
            break;
            case 'tone':
                this.addUIS(id, 'color', {name:'light'});
                this.addUIS(id, 'color', {name:'dark'});
                this.addUIS(id, 'slide', {name:'toned', min:0, max:1, precision:2 });
                this.addUIS(id, 'slide', {name:'desat', min:0, max:1, precision:2 });
            break;
            case 'tvglitch':
                this.addUIS(id, 'slide', {name:'distortion', min:0, max:1, precision:2 });
                this.addUIS(id, 'slide', {name:'verticalSync', min:0, max:1, precision:2 });
                this.addUIS(id, 'slide', {name:'lineSync', min:0, max:1, precision:2 });
                this.addUIS(id, 'slide', {name:'scanlines', min:0, max:1, precision:2 });
                this.addUIS(id, 'slide', {name:'bars', min:0, max:1, precision:2 });
                this.addUIS(id, 'slide', {name:'frameShape', min:0, max:2, precision:2 });
                this.addUIS(id, 'slide', {name:'frameLimit', min:-1, max:1, precision:2 });
                this.addUIS(id, 'slide', {name:'frameSharpness', min:0, max:40, precision:1 });
                this.addUIS(id, 'color', {name:'frameColor'});
            break;
            case 'vignette':
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2 });
            break;
            case 'vibrance': 
                this.addUIS(id, 'slide', {name:'amount', min:-1, max:1, precision:2 });
            break;
            case 'whitebalance':
                this.addUIS(id, 'color', {name:'white'});
                this.addUIS(id, 'bool', {name:'auto'});
            break;
        }
    },

    deleteSelected:function(){
        // remove link
        this.deleteLink(this.selectID);
        this.deleteNode(this.selectID);

        this.clearSelector();

        this.updateLink();
        this.applyLinks();
        //console.log('delete', this.selectID );
    },

    clearSelector:function(){
        this.selectID = -1;
        this.select.style.display = 'none';
        this.delmenu.style.display = 'none';

        if(this.ui)this.ui.clear();
    },

    // FROM UIL
    addUIS:function(id, type, obj){
        if(type!=='title'){
            var name = obj.name;
            var node = this.tmp[this.LAYER].nodes[id];
            if(obj.name == 'src'){
                obj.callback = function(v){ node.obj.src = v; node.node[name] = v; }.bind(this);
                obj.value = node.obj.src;
            }else if(obj.name=='texture'){
                obj.callback = function(v){ node.obj.texture = v; node.node.destroy(); node.node = this.seriously.target(this.textures[v]); this.updateLink(); this.applyLinks(); }.bind(this);
                obj.value = node.obj.texture;
            }else{
                obj.callback = function(v){ node.node[name] = v; node.obj[name] = v; }.bind(this);
                obj.value = node.node[name];
            }
            
        }
        this.ui.add(type, obj);
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
        //var s = new UIL.String(this.bmenu, name, callback, node.obj.src , 'S');
        //this.sels.push( s );
    },
    /*addTextureLink:function(id){ //this.textures[obj.texture]
        var name = 'Texture';
        var node = this.tmp[this.LAYER].nodes[id];
        var callback = function(v){ console.log(v, node); node.obj.texture = v; node.node.destroy(); node.node = this.seriously.target(this.textures[v]); this.updateLink(); this.applyLinks(); }.bind(this);
        var s = new UIL.String(this.bmenu, name, callback, node.obj.texture, 'T' );
        this.sels.push( s );
    },*/


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
            var np = name.substring(1, 2)*1;
            
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

SED.Link = function(root, obj){
    this.pos = [0,0,0,0];
    this.root = root;
    this.obj = obj;
}
SED.Link.prototype = {
    constructor: SED.Link,
    getLink:function(){
        return [this.obj.target, this.obj.source, this.obj.targetN, this.obj.sourceN];
    },
    clear:function(){
        var sourceNode = this.root.byID(this.obj.source);
        var targetNode = this.root.byID(this.obj.target);
        //var targetNode = this.root.tmp[this.root.LAYER].nodes[this.obj.target];
        //var sourceNode = this.root.tmp[this.root.LAYER].nodes[this.obj.source];

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


        var sourceNode = this.root.byID(this.obj.source);
        var targetNode = this.root.byID(this.obj.target);

        //var sourceNode = this.root.tmp[this.root.LAYER].nodes[this.obj.source];
        //var targetNode = this.root.tmp[this.root.LAYER].nodes[this.obj.target];

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

SED.CC = function(name,rules){
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

SED.Icon = function(type, size, color){
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
        case 'scene' : t[1]="<path fill='"+color+"' d='M 27.9 15.8 L 28 24.5 26 25.5 26 27.6 30 26 30 14 21 10 20 10 10 14 10 26 14 27.75 14 25.5 12 24.5 12 15.9 19 19 19 25 20 25 20 19 27.9 15.8 M 21 12 L 27.75 14.9 20 18 19 18 12.15 14.95 20 12 21 12 M 16 30 L 20 34 24 30 16 30 M 16 27 L 16 29 24 29 24 27 16 27 Z'/>";break;

        //target
        case 'texture': t[1]="<path fill='"+color+"' d='M 30 10 L 25 10 20 15 15 10 10 10 10 30 30 30 30 10 M 24 12 L 26 12 26 14 28 14 28 17 27 17 27 18 28 18 28 28 18 28 18 27 17 27 17 28 14 28 14 26 12 26 12 24 14 24 14 22 16 22 16 20 18 20 18 18 20 18 20 16 22 16 22 14 24 14 24 12 M 20 25 L 19 25 19 26 20 26 20 25 M 25 19 L 25 20 26 20 26 19 25 19 M 24 21 L 23 21 23 22 24 22 24 21 M 22 23 L 21 23 21 24 22 24 22 23 M 16 24 L 14 24 14 26 16 26 16 24 M 16 22 L 16 24 18 24 18 22 16 22 M 20 20 L 18 20 18 22 20 22 20 20 M 22 20 L 22 18 20 18 20 20 22 20 M 22 16 L 22 18 24 18 24 16 22 16 M 26 16 L 26 14 24 14 24 16 26 16 M 24 8 L 24 6 16 6 16 8 24 8 M 16 9 L 20 13 24 9 16 9 Z'/>";break; 
        case 'canvas': t[1]="<path fill='"+color+"' d='M 25 18 L 25 16 23 14 18 14 15 17 15 23 18 26 23 26 25 24 25 22 24 22 22 24 20 24 18 22 18 18 20 16 22 16 24 18 25 18 M 16 9 L 20 13 24 9 16 9 M 24 8 L 24 6 16 6 16 8 24 8 M 30 10 L 25 10 22 13 25 13 26 12 28 12 28 28 12 28 12 12 14 12 15 13 18 13 15 10 10 10 10 30 30 30 30 10 Z'/>";break;

        case 18: t[1]="<path fill='"+color+"' d='M 16 11 L 14 11 14 14 11 14 11 16 14 16 14 19 16 19 16 16 19 16 19 14 16 14 16 11 Z'/>";break;

        case 'nightvision': t[1]="<path fill='"+color+"' d='M 24 27 L 24 29 26 29 26 27 24 27 M 14 27 L 14 29 16 29 16 27 14 27 M 16 11 L 14 11 14 13 16 13 16 11 M 28 15 L 26 15 26 14 24 14 24 15 16 15 16 14 14 14 14 15 12 15 10 17 10 23 13 26 18 26 20 24 22 26 27 26 30 23 30 17 28 15 M 27 17 L 28 18 28 22 26 24 23 24 21 22 19 22 17 24 14 24 12 22 12 18 13 17 27 17 M 14 21 L 15 21 15 22 16 22 16 21 17 21 17 20 16 20 16 19 15 19 15 20 14 20 14 21 M 24 20 L 23 20 23 21 24 21 24 22 25 22 25 21 26 21 26 20 25 20 25 19 24 19 24 20 M 26 11 L 24 11 24 13 26 13 26 11 Z'/>";break;
        case 'sepia': t[1]="<path fill='"+color+"' d='M 23 12 L 23 10 17 10 17 12 23 12 M 30 20 L 25 15 15 15 10 20 10 26 14 30 26 30 30 26 30 20 M 24 17 L 28 21 28 25 25 28 15 28 12 25 12 21 16 17 24 17 M 23 23 L 22 22 20 22 20 21 23 21 23 19 18 19 17 20 17 22 18 23 20 23 20 24 17 24 17 26 22 26 23 25 23 23 M 23 14 L 23 13 17 13 17 14 23 14 Z'/>";break;
        case 'pixelate': t[1]="<path fill='"+color+"' d='M 24 26 L 22 26 22 24 20 24 20 28 24 28 24 26 M 12 24 L 12 20 10 20 10 30 20 30 20 28 16 28 16 24 12 24 M 26 30 L 26 28 24 28 24 30 26 30 M 10 14 L 10 16 12 16 12 14 10 14 M 14 18 L 14 16 12 16 12 20 16 20 16 18 14 18 M 20 22 L 18 22 18 20 16 20 16 24 20 24 20 22 M 28 26 L 26 26 26 28 28 28 28 26 M 30 28 L 28 28 28 30 30 30 30 28 M 16 16 L 16 14 14 14 14 16 16 16 M 20 18 L 18 18 18 20 20 20 20 18 M 16 16 L 16 18 18 18 18 16 16 16 M 14 12 L 12 12 12 14 14 14 14 12 M 12 12 L 12 10 10 10 10 12 12 12 M 26 24 L 24 24 24 26 26 26 26 24 M 22 22 L 22 24 24 24 24 22 22 22 M 22 22 L 22 20 20 20 20 22 22 22 Z'/>";break;
        case 'hex': t[1]="<path fill='"+color+"' d='M 21 11.5 L 21 10 19 10 19 11.55 13 14.95 10 13.3 10 15.55 12 16.65 12 23.2 10 24.3 10 26.55 12.85 25 19 28.4 19 30 21 30 21 28.45 27.15 25 30 26.55 30 24.3 28.05 23.2 28.05 16.6 30 15.55 30 13.3 27 14.9 21 11.5 M 24.65 15.9 L 24.85 16 26 16.65 26 23.35 20.05 26.7 14.05 23.35 14.05 16.65 20.05 13.3 24.65 15.9 Z'/>";break;
        case 'daltonize': t[1]="<path fill='"+color+"' d='M 30 22 L 30 18 Q 27.348 12.241 20 12 12.649 12.198 10 18 L 10 22 Q 13.461 28.316 20 28 26.665 27.865 30 22 M 11 20 Q 13.617 14.019 20 14 26.075 14.056 29 20 25.551 26.005 20 26 14.113 25.799 11 20 M 23.5 23.5 Q 25 22.05 25 20 25 17.95 23.5 16.45 22.05 15 20 15 17.95 15 16.45 16.45 15 17.95 15 20 15 22.05 16.45 23.5 17.95 25 20 25 22.05 25 23.5 23.5 M 23 20 Q 23 21.25 22.1 22.1 21.25 23 20 23 18.75 23 17.85 22.1 17 21.25 17 20 17 18.75 17.85 17.85 18.75 17 20 17 21.25 17 22.1 17.85 23 18.75 23 20 Z'/>";break;
        case 'filmgrain': t[1]="<path fill='"+color+"' d='M 10 30 L 30 30 30 10 10 10 10 30 M 29 27 L 11 27 11 13 29 13 29 27 M 21 11 L 24 11 24 12 21 12 21 11 M 26 11 L 29 11 29 12 26 12 26 11 M 11 12 L 11 11 14 11 14 12 11 12 M 16 12 L 16 11 19 11 19 12 16 12 M 16 29 L 16 28 19 28 19 29 16 29 M 11 29 L 11 28 14 28 14 29 11 29 M 26 29 L 26 28 29 28 29 29 26 29 M 21 29 L 21 28 24 28 24 29 21 29 M 16 18 L 15 18 15 19 16 19 16 18 M 16 24 L 15 24 15 25 16 25 16 24 M 20 24 L 19 24 19 25 20 25 20 24 M 18 21 L 17 21 17 22 18 22 18 21 M 14 21 L 13 21 13 22 14 22 14 21 M 13 15 L 13 16 14 16 14 15 13 15 M 18 16 L 18 15 17 15 17 16 18 16 M 20 18 L 19 18 19 19 20 19 20 18 M 28 24 L 27 24 27 25 28 25 28 24 M 24 24 L 23 24 23 25 24 25 24 24 M 25 21 L 25 22 26 22 26 21 25 21 M 22 22 L 22 21 21 21 21 22 22 22 M 24 18 L 23 18 23 19 24 19 24 18 M 22 15 L 21 15 21 16 22 16 22 15 M 26 16 L 26 15 25 15 25 16 26 16 M 28 18 L 27 18 27 19 28 19 28 18 Z'/>";break;
        case 'tvglitch': t[1]="<path fill='"+color+"' d='M 30 14 L 28 12 18 12 18 9 17 9 17 12 12 12 10 14 10 27 12 29 15 29 15 30 17 30 17 29 23 29 23 30 25 30 25 29 28 29 30 27 30 14 M 27 14 L 28 15 28 26 27 27 13 27 12 26 12 15 13 14 27 14 M 23 24 L 14 24 14 25 23 25 23 24 M 21 17 L 21 16 14 16 14 17 21 17 M 26 19 L 26 18 16 18 16 19 26 19 M 26 23 L 26 22 19 22 19 23 26 23 M 22 21 L 22 20 14 20 14 21 22 21 Z'/>";break;
        case 'checkerboard': t[1]="<path fill='"+color+"' d='M 20 10 L 10 10 10 20 20 20 20 10 M 30 20 L 20 20 20 30 30 30 30 20 Z'/>";break;
        case 'chroma': t[1]="<path fill='"+color+"' d='M 23 16.4 L 23 16.6 Q 23 17.7 22.4 18.6 22.3 18.75 22.15 18.95 21.8 19.35 21.35 19.65 L 21 20 21 21 25 22 26 24 26 30 30 30 30 10 10 10 10 30 14 30 14 24 15 22 19 21 19 20 18.6 19.6 Q 18.205 19.364 17.85 18.95 17.692 18.765 17.55 18.55 17.023 17.717 17 16.6 L 17 16.4 Q 17.021 15.333 17.5 14.45 17.661 14.232 17.85 14 18.223 13.584 18.65 13.35 19.242 13.0150 19.9 13 L 20.05 13 Q 20.75 13 21.35 13.35 21.8 13.6 22.15 14 22.35 14.25 22.45 14.5 23 15.35 23 16.4 Z'/>";break;
        case 'freeze': t[1]="<path fill='"+color+"' d='M 23 11 L 22 10 20 12 18 10 17 11 19 13 19 15 16 12 15 13 19 17 17 19 16 18 16 18.05 13 15 12 16 15 19 13 19 11 17 10 18 12 20 10 22 11 23 13 21 15 21 12 24 13 25 17 21 19 23 15 27 16 28 19 25 19 27 17 29 18 30 20 28 22 30 23 29 21 27 21 25 24 28 25 27 21 23 23 21 27 25 28 24 25 21 27 21 29 23 30 22 28 20 30 18 29 17 27 19 25 19 28 16 27 15 23 19 21 17 25 13 24 12 21 15 21 13 23 11 M 20 22 L 18 20 20 18 22 20 20 22 Z'/>";break;
        case 'brightness-contrast': t[1]="<path fill='"+color+"' d='M 30 20 Q 30 15.867 27.05 12.9 L 27.05 12.9 Q 24.15 10 20 10 15.85 10 12.9 12.9 10 15.85 10 20 10 24.15 12.9 27.05 L 12.9 27.05 Q 15.867 30 20 30 24.15 30 27.05 27.05 30 24.15 30 20 M 25.65 14.35Q 28 16.7 28 20 28 23.3 25.65 25.65 23.3 28 20 28 16.7 28 14.35 25.65L 25.65 14.35 Z'/>";break;
        case 'color': t[1]="<path fill='"+color+"' d='M 30 12 L 28 10 24 10 23 11 23 13 22 14 21 13 20 14 21 15 12 24 11 27 10 28 10.75 28.75 12.25 27.25 13 25 22 16 24 18 15 27 12.75 27.75 11.25 29.25 12 30 13 29 16 28 25 19 26 20 27 19 26 18 27 17 29 17 30 16 30 12 M 25 11 L 27 11 29 13 29 15 28 16 26 16 25 17 23 15 24 14 24 12 25 11 Z'/>";break;
        case 'polar': t[1]="<path fill='"+color+"' d='M 30 20 Q 30 15.85 27.05 12.9 24.15 10 20 10 15.85 10 12.9 12.9 10 15.85 10 20 10 24.15 12.9 27.05 15.85 30 20 30 24.15 30 27.05 27.05 30 24.15 30 20 M 24 24 Q 24 22.35 22.8 21.15 21.667 20.017 20.05 20 L 19.95 20 Q 18.33125 19.98125 17.15 18.8 16 17.65 16 16 16 14.35 17.15 13.15 18.257 12.088 19.75 12 L 20.2 12 Q 23.373 12.073 25.65 14.35 28 16.7 28 20 28 23.3 25.65 25.65 23.373 27.926 20.2 28 21.721 27.925 22.8 26.8 24 25.65 24 24 Z'/>";break;
        case 'sketch': t[1]="<path fill='"+color+"' d='M 28 10 L 26 10 12 24 10 30 16 28 30 14 30 12 28 10 M 13 25 L 15 27 12 28 13 25 M 29 13 L 27 15 25 13 27 11 29 13 M 24 14 L 26 16 16 26 14 24 24 14 Z'/>";break;
        case 'highlights-shadows': t[1]="<path fill='"+color+"' d='M 12.95 27.05 L 15.05 24.95 14.35 24.25 12.25 26.35 12.95 27.05 M 26 20 Q 26 17.5 24.25 15.75 22.5 14 20 14 17.5 14 15.75 15.75 14 17.5 14 20 14 22.5 15.75 24.25 17.5 26 20 26 22.5 26 24.25 24.25 26 22.5 26 20 M 22.8 17.15 L 22.8 17.15 17.15 22.8 17.15 22.8 Q 16 21.65 16 20 16 18.35 17.15 17.15 18.35 16 20 16 21.65 16 22.8 17.15 M 24.25 14.35 L 24.95 15.05 27.1 12.9 26.4 12.2 24.25 14.35 M 14.3 15.7 L 14.35 15.75 15.75 14.35 13.6 12.2 12.2 13.6 14.3 15.7 M 10 19 L 10 21 13 21 13 19 10 19 M 21 13 L 21 10 19 10 19 13 21 13 Z'/>";break;
        case 'exposure': t[1]="<path fill='"+color+"' d='M 25.65 15.75 L 27.75 13.65 26.4 12.2 24.25 14.35 25.65 15.75 M 12.25 26.35 L 13.6 27.8 15.75 25.65 14.35 24.25 12.25 26.35 M 24.25 24.25 Q 26 22.5 26 20 26 17.5 24.25 15.75 22.5 14 20 14 17.5 14 15.75 15.75 14 17.5 14 20 14 22.5 15.75 24.25 17.5 26 20 26 22.5 26 24.25 24.25 M 22.8 17.15 L 22.85 17.2 Q 24 18.35 24 20 24 21.65 22.85 22.85 21.65 24 20 24 18.35 24 17.2 22.85 L 17.15 22.8 Q 16 21.65 16 20 16 18.35 17.15 17.15 18.35 16 20 16 21.65 16 22.8 17.15 M 24.25 25.65 L 26.4 27.8 27.8 26.4 25.65 24.25 24.25 25.65 M 19 27 L 19 30 21 30 21 27 19 27 M 27 21 L 30 21 30 19 27 19 27 21 M 12.2 13.6 L 14.35 15.75 15.75 14.35 13.6 12.2 12.2 13.6 M 10 19 L 10 21 13 21 13 19 10 19 M 21 13 L 21 10 19 10 19 13 21 13 Z'/>";break;
        case 'scanlines': t[1]="<path fill='"+color+"' d='M 30 25 L 30 23 10 23 10 25 30 25 M 10 27 L 10 29 30 29 30 27 10 27 M 30 13 L 30 11 10 11 10 13 30 13 M 30 17 L 30 15 10 15 10 17 30 17 M 30 21 L 30 19 10 19 10 21 30 21 Z'/>";break;
        case 'fxaa': t[1]="<path fill='"+color+"' d='M 21 14 L 24 11 12 11 12 29 15 29 15 20 18 20 18 18 15 18 15 14 21 14 M 28.5 16.5 L 27 15 24 18 21 15 19.5 16.5 22.5 19.5 19.5 22.5 21 24 24 21 27 24 28.5 22.5 25.5 19.5 28.5 16.5 M 28 29 L 28 26 25 26 25 29 28 29 M 26 27 L 27 27 27 28 26 28 26 27 M 20 26 L 20 29 23 29 23 26 20 26 M 21 27 L 22 27 22 28 21 28 21 27 Z'/>";break;
        case 'vibrance': t[1]="<path fill='"+color+"' d='M 30 12 L 28 10 26 10 22 14 21 13 20 14 21 15 12 24 11 27 10 28 10.75 28.75 12.25 27.25 13 25 22 16 24 18 15 27 12.75 27.75 11.25 29.25 12 30 13 29 16 28 25 19 26 20 27 19 26 18 30 14 30 12 M 25 17 L 23 15 27 11 29 13 25 17 M 25.1 20.9 L 21.8 23.9 20 28 19.35 26.6 18.05 27.9 19 30 21 30 25.1 20.9 M 14.35 19.65 L 15.7 18.3 12 10 10 10 14.35 19.65 Z'/>";break;
        case 'noise': t[1]="<path fill='"+color+"' d='M 22 15 L 26 19 29 16 29 13 26 16 23 13 21 13 18 16 15 13 11 13 11 15 14 15 18 19 22 15 M 14 21 L 11 24 11 27 14 24 17 27 19 27 22 24 25 27 29 27 29 25 26 25 22 21 18 25 14 21 Z'/>";break;
        case 'fader': t[1]="<path fill='"+color+"' d='M 23.1 23.65 Q 22.9 22.2 23 21 L 24 21 24 19 19 19 19 18 20 15 20 12 19 11 17 11 16 12 16 15 17 18 17 19 12 19 12 21 13 21 Q 12.9 22.2 13.05 23.65 13.2 25.2 13.5 26 14.479 28.117 17 29 L 29 29 29 28 25.45 28 Q 24.423 27.157 23.8 26.1 23.78 26.055 23.75 26 23.3 25.2 23.1 23.65 M 22 21 Q 21.9 22.2 22.1 23.65 22.253 24.84 22.55 25.6 21.173 27.1 18.85 25.7 16.58 24.304 14.25 25.25 13.8 23.65 14 21 L 22 21 M 18 12 Q 18.4 12 18.7 12.3 19 12.6 19 13 19 13.4 18.7 13.7 18.4 14 18 14 17.6 14 17.3 13.7 17 13.4 17 13 17 12.6 17.3 12.3 17.6 12 18 12 Z'/>";break;
        case 'kaleidoscope': t[1]="<path fill='"+color+"' d='M 21 17 L 22 14 21 12 20 11 19 12 18 14 19 17 20 19 21 17 M 12 21 L 14 22 17 21 19 20 17 19 14 18 12 19 11 20 12 21 M 20 21 L 19 23 18 26 19 28 20 29 21 28 22 26 21 23 20 21 M 23 19 L 21 20 23 21 26 22 28 21 29 20 28 19 26 18 23 19 M 18.6 22.8 L 19.3 20.7 17.2 21.4 14.35 22.85 13.65 24.95 13.65 26.35 15.05 26.35 17.15 25.65 18.6 22.8 M 18.55 17.15 L 17.15 14.35 15.05 13.65 13.65 13.65 13.65 15.05 14.35 17.15 17.15 18.55 19.3 19.3 18.55 17.15 M 22.8 21.4 L 20.7 20.7 21.4 22.8 22.85 25.65 24.95 26.35 26.35 26.35 26.35 24.95 25.65 22.85 22.8 21.4 M 26.35 15.05 L 26.35 13.65 24.95 13.65 22.85 14.35 21.45 17.15 20.7 19.3 22.85 18.55 25.65 17.15 26.35 15.05 Z'/>";break;
        case 'invert': t[1]="<path fill='"+color+"' d='M 26.95 21.95 Q 26.95 19.05 24.95 17.1 L 24.9 17.05 Q 21.7 14.05 20 11 18.25 14.25 15.1 17 15.05 17 15.05 17.05 13 19.05 13 21.95 13 24.85 15.05 26.9 17.05 28.95 19.95 28.95 L 20 28.95 Q 22.85 28.95 24.9 26.9 26.95 24.85 26.95 21.95 M 16.1 18.85 Q 18.85 16.3 20 14 L 20 27 Q 17.95 27 16.45 25.5 15 24.05 15 22 15 20.3 16 19 16.05 18.9 16.1 18.85 Z'/>";break;
        case 'mirror': t[1]="<path fill='"+color+"' d='M 21 25 L 21 23 19 23 19 25 21 25 M 19 27 L 19 29 21 29 21 27 19 27 M 17 11 L 15 11 10 27 10 29 17 29 17 11 M 15 27 L 11.7 27 15 17 15 27 M 21 13 L 21 11 19 11 19 13 21 13 M 21 17 L 21 15 19 15 19 17 21 17 M 21 21 L 21 19 19 19 19 21 21 21 M 25 11 L 23 11 23 29 30 29 30 27 25 11 M 28.35 27 L 25 27 25 17 28.35 27 Z'/>";break;
        case 'hue-saturation': t[1]="<path fill='"+color+"' d='M 24.9 17.05 Q 24.387 16.569 23.9 16.05 21.427 13.561 20 11 18.25 14.25 15.1 17 15.05 17 15.05 17.05 13 19.05 13 21.95 13 24.134 14.15 25.8 14.544 26.394 15.05 26.9 17.05 28.95 19.95 28.95 22.85 28.95 24.9 26.9 26.95 24.85 26.95 21.95 26.95 19.05 24.95 17.1 L 24.9 17.05 M 22.5 17.45 Q 23.213 18.261 24 19 25 20.3 25 22 25 24.05 23.5 25.5 22.05 27 20 27 17.95 27 16.45 25.5 15.935 24.9855 15.6 24.4 L 22.5 17.45 Z'/>";break;
        case 'emboss': t[1]="<path fill='"+color+"' d='M 13 27 L 13 28 15 30 28 30 28 26 27 25 27 29 15 29 13 27 M 21 20 L 21 18 17 18 16 17 16 15 18 13 26 13 26 11 15 11 14 12 14 27 15 28 26 28 26 26 18 26 16 24 16 21 17 20 21 20 M 23 18 L 22 17 22 21 17 21 17 24 18 25 18 22 23 22 23 18 M 28 11 L 27 10 27 14 18 14 17 15 17 17 18 17 18 15 28 15 28 11 Z'/>";break;
        case 'edge': t[1]="<path fill='"+color+"' d='M 27 14 L 27 10 15 10 13 12 13 27 15 29 27 29 27 25 18 25 17 24 17 21 22 21 22 17 17 17 17 15 18 14 27 14 M 26 11 L 26 13 18 13 16 15 16 17 17 18 21 18 21 20 17 20 16 21 16 24 18 26 26 26 26 28 15 28 14 27 14 12 15 11 26 11 Z'/>";break;
        case 'ripple': t[1]="<path fill='"+color+"' d='M 30 13 Q 28.65 16.25 25 16 21.65 16.15 20 13 18.2 10.05 15 10 11.75 9.85 10 13 L 10 15 Q 11.75 11.85 15 12 18.2 12.05 20 15 21.65 18.15 25 18 28.65 18.25 30 15 L 30 13 M 10 25 L 10 27 Q 11.74 23.871 15 24 18.186 24.032 20 27 21.645 30.163 25 30 28.664 30.247 30 27 L 30 25 Q 28.65 28.25 25 28 21.65 28.15 20 25 18.2 22.05 15 22 11.75 21.85 10 25 M 30 21 L 30 19 Q 28.65 22.25 25 22 21.65 22.15 20 19 18.2 16.05 15 16 11.75 15.85 10 19 L 10 21 Q 11.75 17.85 15 18 18.2 18.05 20 21 21.65 24.15 25 24 28.65 24.25 30 21 Z'/>";break;
        case 'ascii': t[1]="<path fill='"+color+"' d='M 19 24 L 17 24 17 30 19 30 19 24 M 19 22 L 17 22 17 23 19 23 19 22 M 15 12 L 12 12 10 18 10 20 11 20 12 18 15 18 16 20 17 20 17 18 15 12 M 13 17 L 13 14 14 14 14 17 13 17 M 23 24 L 21 24 21 30 23 30 23 24 M 23 22 L 21 22 21 23 23 23 23 22 M 23 14 L 23 13 22 12 19 12 18 13 18 15 21 18 21 19 20 19 19 18 18 18 18 19 19 20 22 20 23 19 23 17 20 14 20 13 21 13 22 14 23 14 M 29 12 L 26 12 24 14 24 18 26 20 29 20 30 19 30 18 29 18 28 19 27 19 26 18 26 14 27 13 28 13 29 14 30 14 30 13 29 12 Z'/>";break;
        case 'bleach-bypass': t[1]="<path fill='"+color+"' d='M 26.95 21.95 Q 26.95 19.05 24.95 17.1 L 24.9 17.05 Q 21.7 14.05 20 11 18.25 14.25 15.1 17 15.05 17 15.05 17.05 13 19.05 13 21.95 13 24.85 15.05 26.9 17.05 28.95 19.95 28.95 22.85 28.95 24.9 26.9 26.95 24.85 26.95 21.95 M 15 22 Q 15 20.3 16 19 16.05 18.9 16.1 18.85 18.85 16.3 20 14 19.3 16.3 17.65 18.85 17.65 18.9 17.6 19 17 20.3 17 22 17 24.05 17.85 25.5 18.721 26.953 19.9 27 17.921 26.971 16.45 25.5 15 24.05 15 22 Z'/>";break;
        case 'blur': t[1]="<path fill='"+color+"' d='M 22 30 Q 22.486 30.016 23 30 L 23 28 Q 22.488 28.018 22 28 L 22 30 M 18.9 27.25 Q 18.529 27.067 18.15 26.85 L 16.05 28.9 Q 16.943 29.378 18.1 29.65 L 18.9 27.25 M 19.6 27.5 L 19.05 29.8 19.1 29.8 Q 19.973 29.955 21 30 L 21 27.85 Q 20.295 27.759 19.6 27.5 M 26 10 L 24 10 26 18 26 22 25 23 21 23 22 22 24 22 24 19 22 19 21 20 16 26 14 26 14 25 18.6 20 15.15 17.45 19.45 10 17.6 10 13 18 14 19 16 20 16 21 12 25 12 26 13.75 27.4 16.3 27.4 17.55 26.45 20 24 21 25 25 25 28 22 28 18 26 10 M 23 20 L 23 21 21.15 21 22 20 23 20 Z'/>";break;
        case 'directionblur': t[1]="<path fill='"+color+"' d='M 19.6 27.5 L 19.6 27.55 Q 18.524 27.065 18.15 26.85 L 16.05 28.9 Q 16.943 29.378 19.05 29.85 L 19.05 29.8 19.1 29.8 Q 19.923 29.948 20.95 30 21.035 29.997 21.1 30 22.553 29.926 23.45 29.45 L 23.85 30.55 25.95 27.45 22.4 26.5 22.8 27.55 Q 21.56 27.859 20.85 27.8 20.073 27.7236 19.6 27.5 M 26 10 L 24 10 26 18 26 22 25 23 21 23 22 22 24 22 24 19 22 19 21 20 16 26 14 26 14 25 18.6 20 15.15 17.45 19.45 10 17.6 10 13 18 14 19 16 20 16 21 12 25 12 26 13.75 27.4 16.3 27.4 17.55 26.45 20 24 21 25 25 25 28 22 28 18 26 10 M 23 20 L 23 21 21.15 21 22 20 23 20 Z'/>";break;
        case 'vignette': t[1]="<path fill='"+color+"' d='M 30 14 L 26 10 14 10 10 14 10 26 14 30 26 30 30 26 30 14 M 25 12 L 28 15 28 25 25 28 15 28 12 25 12 15 15 12 25 12 M 27 15 L 25 13 15 13 13 15 13 25 15 27 25 27 27 25 27 15 M 25 14 L 26 15 26 25 25 26 15 26 14 25 14 15 15 14 25 14 Z'/>";break;
        case 'reformat': t[1]="<path fill='"+color+"' d='M 14 26 L 26 26 26 14 14 14 14 26 M 24 16 L 24 24 16 24 16 16 24 16 M 26 29 L 26 30 30 30 30 26 29 26 29 29 26 29 M 14 30 L 14 29 11 29 11 26 10 26 10 30 14 30 M 18 29 L 18 30 22 30 22 29 18 29 M 10 18 L 10 22 11 22 11 18 10 18 M 14 11 L 14 10 10 10 10 14 11 14 11 11 14 11 M 30 18 L 29 18 29 22 30 22 30 18 M 26 11 L 29 11 29 14 30 14 30 10 26 10 26 11 M 22 11 L 22 10 18 10 18 11 22 11 Z'/>";break;
        case 'lumakey': t[1]="<path fill='"+color+"' d='M 10 30 L 28 30 28 12 10 12 10 30 M 26 28 L 12 28 12 14 26 14 26 28 M 23 23 L 23 22 24 22 24 20 18 20 16 18 14 18 14 24 16 24 18 22 22 22 22 23 23 23 M 15 23 L 15 19 16 19 17 20 17 22 16 23 15 23 M 29 24 L 30 24 30 10 16 10 16 11 29 11 29 24 Z'/>";break;
        case 'simplex': t[1]="<path fill='"+color+"' d='M 30 22 L 30 20 28 22 25 19 22 22 15 14 10 19 10 21 15 16 22 24 25 21 28 24 30 22 M 15 18 L 10 23 10 25 15 20 22 28 25 25 28 28 30 26 30 24 28 26 25 23 22 26 15 18 Z'/>";break;
        case 'throttle': t[1]="<path fill='"+color+"' d='M 30 22 Q 30 17.85 27.05 14.9 24.15 12 20 12 15.85 12 12.9 14.9 10 17.85 10 22 10 24.15 10.8 26 11.25 27.05 12 28 L 28 28 Q 28.75 27.05 29.2 26 30 24.15 30 22 M 25.65 16.35 Q 28 18.7 28 22 28 24.2 26.95 26 L 13.05 26 Q 12 24.2 12 22 12 18.7 14.35 16.35 16.7 14 20 14 23.3 14 25.65 16.35 M 20.4 22.95 Q 20.75 22.8 20.9 22.4 21.1 21.95 20.95 21.6 20.9 21.45 20.85 21.35 L 18.95 18.1 Q 18.85 17.9 18.65 17.8 18.5 17.75 18.3 17.85 18.1 17.95 18.05 18.1 17.95 18.3 18.05 18.5 L 19 22.1 Q 19 22.25 19.05 22.4 19.2 22.75 19.6 22.9 20.05 23.1 20.4 22.95 M 15 22.5 L 15 21.5 13 21.5 13 22.5 15 22.5 M 16.8 18.1 L 15.4 16.7 14.7 17.4 16.1 18.8 16.8 18.1 M 25 21.5 L 25 22.5 27 22.5 27 21.5 25 21.5 M 25.3 17.4 L 24.6 16.7 23.2 18.1 23.9 18.8 25.3 17.4 M 20.5 17 L 20.5 15 19.5 15 19.5 17 20.5 17 Z'/>";break;
        case 'tone': t[1]="<path fill='"+color+"' d='M 26 24 L 26 22.55 Q 22.45 24.25 20 22.6 17.75 21 14 22 L 14 24 16 25 24 25 26 24 M 21 12 L 21 17 27 22 27 24 24 26 16 26 13 24 13 22 19 17 19 12 17 12 17 16 11 21 11 25 15 28 25 28 29 25 29 21 23 16 23 12 21 12 Z'/>";break;
        case 'layer': t[1]="<path fill='"+color+"' d='M 30 15 L 30 14 21 10 19 10 10 14 10 15 19 20 21 20 30 15 M 28 14 L 28 15 21 18.75 19 18.75 12 15 12 14 19 11 21 11 28 14 M 26.55 17.45 L 25.6 17.95 28 19 28 20 21 23.75 19 23.75 12 20 12 19 14.35 17.95 13.45 17.45 10 19 10 20 19 25 21 25 30 20 30 19 26.55 17.45 M 26.55 22.45 L 25.6 22.95 28 24 28 25 21 28.75 19 28.75 12 25 12 24 14.35 22.95 13.45 22.45 10 24 10 25 19 30 21 30 30 25 30 24 26.55 22.45 Z'/>";break;
        case 'whitebalance': t[1]="<path fill='"+color+"' d='M 30 12 L 26 12 24 14 28 14 28 16 12 16 12 14 22 14 20 12 10 12 10 18 30 18 30 12 M 20 22 L 18 24 28 24 28 26 12 26 12 24 16 24 14 22 10 22 10 28 30 28 30 22 20 22 M 23 14 L 27 10 19 10 23 14 M 13 20 L 17 24 21 20 13 20 Z'/>";break;
        case 'color-select': t[1]="<path fill='"+color+"' d='M 28 10 L 26 10 Q 24.975 13.072 22 14 L 21 13 20 14 21 15 12 24 11 27 10 28 10.75 28.75 12.25 27.25 13 25 22 16 24 18 15 27 12.75 27.75 11.25 29.25 12 30 13 29 16 28 25 19 26 20 27 19 26 18 Q 26.59 14.875 30 14 L 30 12 28 10 M 29 13 Q 25.67 13.955 25 17 L 23 15 Q 26.29 14.093 27 11 L 29 13 M 18.65 22.35 L 16.55 22.35 13.5 25.4 13 26.95 14.85 26.2 18.65 22.35 Z'/>";break;
        case 'colorcube': t[1]="<path fill='"+color+"' d='M 30 14 L 21 10 20 10 10 14 10 26 20 30 30 26 30 14 M 21 12 L 27.75 14.9 20 18 19 18 12.15 14.95 20 12 21 12 M 27.9 15.8 L 28 24.5 20 27.95 20 19 27.9 15.8 M 12 24.5 L 12 15.9 19 19 19 27.55 12 24.5 Z'/>";break;
        case 'select': t[1]="<path fill='"+color+"' d='M 12 12 L 14 12 14 10 10 10 10 14 12 14 12 12 M 22 12 L 22 10 18 10 18 12 22 12 M 26 12 L 28 12 28 14 30 14 30 10 26 10 26 12 M 28 18 L 28 22 30 22 30 18 28 18 M 28 26 L 28 28 26 28 26 30 30 30 30 26 28 26 M 18 28 L 18 30 22 30 22 28 18 28 M 14 28 L 12 28 12 26 10 26 10 30 14 30 14 28 M 10 18 L 10 22 12 22 12 18 10 18 Z'/>";break;
        case 'split': t[1]="<path fill='"+color+"' d='M 12 30 L 30 30 30 12 12 30 M 15 28 L 28 15 28 28 15 28 M 10 10 L 10 28 28 10 10 10 M 12 25 L 12 12 25 12 12 25 Z'/>";break;
        case 'repeat': t[1]="<path fill='"+color+"' d='M 27 10 L 26 10 29 13 29 27 26 30 27 30 30 27 30 13 27 10 M 23 10 L 21 10 24 13 24 27 21 30 23 30 26 27 26 13 23 10 M 19 10 L 13 10 10 13 10 27 13 30 19 30 22 27 22 13 19 10 M 14 12 L 18 12 20 14 20 26 18 28 14 28 12 26 12 14 14 12 Z'/>";break;
        case 'panorama': t[1]="<path fill='"+color+"' d='M 30 16 Q 27.85 13.4 25.75 12.3 23.65 11.15 20 11 16.15 11.25 14 12.4 11.8 13.5 10 16 L 10 29 Q 20.1 17.9 30 29 L 30 16 M 20 22 Q 14.9 22.3 12 25.2 L 12 16 Q 20.2 8.1 28 16 L 28 25.35 Q 24.95 22.2 20 22 Z'/>";break;
        case 'linear-transfer': t[1]="<path fill='"+color+"' d='M 30 10 L 10 10 10 30 30 30 30 10 M 21 12 L 21 11 29 11 29 19 28 19 28 21 29 21 29 29 21 29 21 28 19 28 19 29 11 29 11 21 12 21 12 19 11 19 11 11 19 11 19 12 21 12 M 27 16 L 27 14 13 25 13 27 27 16 Z'/>";break;
        case 'falsecolor': t[1]="<path fill='"+color+"' d='M 28 10 L 26 10 22 14 21 13 20 14 21 15 18.5 17.5 14.5 13.5 13.5 14.5 17.5 18.5 12 24 11 27 10 28 10.75 28.75 12.25 27.25 13 25 18.5 19.5 20.5 21.5 15 27 12.75 27.75 11.25 29.25 12 30 13 29 16 28 21.5 22.5 25.5 26.5 26.5 25.5 22.5 21.5 25 19 26 20 27 19 26 18 30 14 30 12 28 10 M 25 17 L 23 15 27 11 29 13 25 17 M 22 16 L 24 18 21.5 20.5 19.5 18.5 22 16 Z'/>";break;
        case 'dither': t[1]="<path fill='"+color+"' d='M 20 25 L 20 30 25 30 25 25 20 25 M 20 20 L 15 20 15 25 20 25 20 20 M 20 10 L 15 10 15 15 20 15 20 10 M 30 20 L 25 20 25 25 30 25 30 20 M 25 20 L 25 15 20 15 20 20 25 20 M 25 10 L 25 15 30 15 30 10 25 10 M 10 25 L 10 30 15 30 15 25 10 25 M 10 15 L 10 20 15 20 15 15 10 15 Z'/>";break;
        case 'expression': t[1]="<path fill='"+color+"' d='M 30 20 Q 30 15.85 27.05 12.9 24.15 10 20 10 15.85 10 12.9 12.9 10 15.85 10 20 10 24.15 12.9 27.05 15.85 30 20 30 24.15 30 27.05 27.05 30 24.15 30 20 M 25.65 14.35 Q 28 16.7 28 20 28 23.3 25.65 25.65 23.3 28 20 28 16.7 28 14.35 25.65 12 23.3 12 20 12 16.7 14.35 14.35 16.7 12 20 12 23.3 12 25.65 14.35 M 24.55 18.55 Q 25 18.1 25 17.5 25 16.9 24.55 16.45 24.1 16 23.5 16 22.9 16 22.45 16.45 22 16.9 22 17.5 22 18.1 22.45 18.55 22.9 19 23.5 19 24.1 19 24.55 18.55 M 17.55 18.55 Q 18 18.1 18 17.5 18 16.9 17.55 16.45 17.1 16 16.5 16 15.9 16 15.45 16.45 15 16.9 15 17.5 15 18.1 15.45 18.55 15.9 19 16.5 19 17.1 19 17.55 18.55 M 25 23 L 25 21 Q 20.15 25.05 15 21 L 15 23 Q 20.15 27.05 25 23 Z'/>";break;
        case 'displacement': t[1]="<path fill='"+color+"' d='M 17.2 17.35 L 17.2 16.6 16.65 16.35 16.1 16.65 14.55 17.45 13.7 17.9 13.7 24.35 14.55 24.8 16.1 25.65 17.2 25.05 17.2 24.45 16.5 24.85 16.5 18.95 17.2 18.55 17.2 18.15 16.7 18.45 16.1 18.75 14.8 18.05 16.1 17.4 16.65 17.1 17.2 17.35 M 14.55 18.35 L 15.7 18.95 15.7 24.85 14.55 24.25 14.55 18.35 M 26.3 11.95 L 22.1 10.15 19.05 11.65 17.8 12.3 17.8 24.7 17.75 24.75 22.1 26.6 25.1 25 25.6 24.75 26.25 24.35 26.3 24.35 26.3 11.95 M 24.7 12.4 L 22.1 13.8 19.4 12.6 22.1 11.25 24.7 12.4 M 22.5 14 L 25.1 12.55 25.1 24.4 22.5 25.8 22.5 14 M 19.05 24.6 L 19.05 12.8 21.7 14 21.7 25.85 19.05 24.6 M 26.95 22.65 L 27 23.55 28 24 28 25 21 28.75 19 28.75 12 25 12 24 13 23.55 13 22.65 10 24 10 25 19 30 21 30 30 25 30 24 26.95 22.65 Z'/>";break;
        case 'crop': t[1]="<path fill='"+color+"' d='M 25 14 L 27 12 14 12 14 10 12 10 12 12 10 12 10 14 12 14 12 27 14 25 14 14 25 14 M 28 13 L 26 15 26 26 15 26 13 28 26 28 26 30 28 30 28 28 30 28 30 26 28 26 28 13 Z'/>";break;
        case 'colorcomplements': t[1]="<path fill='"+color+"' d='M 24 10 L 23 11 23 13 22 14 21 13 20 14 21 15 12 24 11 27 10 28 10.75 28.75 12.25 27.25 13 25 22 16 24 18 15 27 12.75 27.75 11.25 29.25 12 30 13 29 16 28 25 19 26 20 27 19 26 18 27 17 29 17 30 16 30 12 28 10 24 10 M 25 11 L 27 11 29 13 29 15 28 16 26 16 25 17 23 15 24 14 24 12 25 11 M 22 12.2 L 22 10.15 Q 21.039 10 20 10 15.85 10 12.9 12.9 10 15.85 10 20 10 22.188 10.8 24 L 16.45 17.85 Q 16 17.033 16 16 16 14.35 17.15 13.15 18.257 12.088 19.75 12 L 20.2 12 Q 21.139 12.021 22 12.2 M 29.8 18 L 27.75 18 Q 28 18.952 28 20 28 23.3 25.65 25.65 23.373 27.926 20.2 28 21.721 27.925 22.8 26.8 24 25.65 24 24 24 23.109 23.65 22.35 L 16.55 29.4 Q 18.17 30 20 30 24.15 30 27.05 27.05 30 24.15 30 20 30 18.9625 29.8 18 Z'/>";break;
        case 'channels': t[1]="<path fill='"+color+"' d='M 30 20 Q 30 15.85 27.05 12.9 24.15 10 20 10 15.85 10 12.9 12.9 10 15.85 10 20 10 24.15 12.9 27.05 15.85 30 20 30 24.15 30 27.05 27.05 30 24.15 30 20 M 25.65 14.35 Q 26.415 15.115 26.9 15.95 28 17.774 28 20 28 22.21 26.95 24 26.425 24.875 25.65 25.65 23.3 28 20 28 16.7 28 14.35 25.65 13.575 24.875 13.05 24 12 22.211 12 20 12 17.774 13.05 15.95 13.584 15.115 14.35 14.35 16.7 12 20 12 23.3 12 25.65 14.35 M 25.45 24.3 L 21.1 21.8 21.1 27 Q 23.15 26.75 24.65 25.25 25.1 24.8 25.45 24.3 M 24.7 14.75 Q 23.2 13.25 21.15 13.05 L 21.15 18.2 25.5 15.7 Q 25.15 15.2 24.7 14.75 M 18.9 21.8 L 14.6 24.3 Q 14.9 24.8 15.35 25.25 16.85 26.75 18.9 27 L 18.9 21.8 M 18.95 13.05 Q 16.9 13.25 15.4 14.75 14.95 15.2 14.65 15.7 L 18.95 18.2 18.95 13.05 M 26.4 22.65 Q 27 21.45 27 20 27 18.55 26.4 17.35 L 21.8 20 26.4 22.65 M 13 20 Q 13 21.45 13.6 22.65 L 18.2 20 13.6 17.35 Q 13 18.55 13 20 Z'/>";break;
        case 'gradientwipe': t[1]="<path fill='"+color+"' d='M 20 26 L 18 26 18 30 20 30 20 26 M 16 26 L 14 26 14 30 16 30 16 26 M 20 10 L 18 10 18 14 20 14 20 10 M 16 10 L 14 10 14 14 16 14 16 10 M 30 20 L 25 15 25 17 14 17 14 23 25 23 25 25 30 20 M 12 10 L 10 10 10 30 12 30 12 10 Z'/>";break;
        case 'accumulator': t[1]="<path fill='"+color+"' d='M 27 18 L 27 17 20 10 13 17 13 18 20 11 27 18 M 27 21 L 27 19 20 12 13 19 13 21 20 14 27 21 M 13 23 L 20 30 27 23 20 16 13 23 M 24 23 L 20 27 16 23 20 19 24 23 Z'/>";break;
        case 'temperature': t[1]="<path fill='"+color+"' d='M 23.5 21.45 Q 23.256 21.206 23 21 L 23 13 Q 23 11.75 22.1 10.85 21.25 10 20 10 18.75 10 17.85 10.85 17 11.75 17 13 L 17 20.95 Q 16.716 21.192 16.45 21.45 15 22.95 15 25 15 27.05 16.45 28.5 17.95 30 20 30 22.05 30 23.5 28.5 25 27.05 25 25 25 22.95 23.5 21.45 M 21 22.15 Q 21.615 22.365 22.1 22.85 23 23.75 23 25 23 26.25 22.1 27.1 21.25 28 20 28 18.75 28 17.85 27.1 17 26.25 17 25 17 23.75 17.85 22.85 18.367 22.3615 19 22.15 L 19 13 Q 19 12.6 19.3 12.3 19.6 12 20 12 20.4 12 20.7 12.3 21 12.6 21 13 L 21 22.15 M 20.5 23.05 L 20.5 19 19.5 19 19.5 23.05 Q 18.96 23.16 18.55 23.55 18 24.15 18 25 18 25.85 18.55 26.4 19.15 27 20 27 20.85 27 21.4 26.4 22 25.85 22 25 22 24.15 21.4 23.55 21.02 23.17 20.5 23.05 Z'/>";break;


        case 'time': t[1]="<path fill='"+color+"' d='M 30 20 Q 30 15.85 27.05 12.9 24.15 10 20 10 15.85 10 12.9 12.9 10 15.85 10 20 10 24.15 12.9 27.05 15.85 30 20 30 24.15 30 27.05 27.05 30 24.15 30 20 M 25.65 14.35 Q 28 16.7 28 20 28 22.935 26.15 25.1 25.909 25.39 25.65 25.65 25.390 25.909 25.1 26.15 22.935 28 20 28 16.7 28 14.35 25.65 12 23.3 12 20 12 16.7 14.35 14.35 16.7 12 20 12 23.3 12 25.65 14.35 M 21 19 L 21 14 20 13 19 14 19 19 20 18 21 19 M 20 19 L 19 20 24.5 25.5 25.5 24.5 20 19 Z'/>";break;


        // root menu
        case 'load': t[1]="<path fill='"+color+"' d='M 22 20 L 25 20 20 15 15 20 18 20 18 26 22 26 22 20 M 30 24 L 28 24 28 28 12 28 12 24 10 24 10 30 30 30 30 24 M 27 13 L 27 10 13 10 13 13 27 13 Z'/>";break;
        case 'save': t[1]="<path fill='"+color+"' d='M 22 16 L 22 10 18 10 18 16 15 16 20 21 25 16 22 16 M 30 24 L 28 24 28 28 12 28 12 24 10 24 10 30 30 30 30 24 M 27 27 L 27 24 13 24 13 27 27 27 Z'/>";break;
        case 'del': t[1]="<path fill='"+color+"' d='M 30 20 Q 30 15.85 27.05 12.9 24.15 10 20 10 15.85 10 12.9 12.9 10 15.85 10 20 10 24.15 12.9 27.05 15.85 30 20 30 24.15 30 27.05 27.05 30 24.15 30 20 M 25.65 14.35 Q 28 16.7 28 20 28 23.3 25.65 25.65 23.3 28 20 28 16.7 28 14.35 25.65 12 23.3 12 20 12 16.7 14.35 14.35 16.7 12 20 12 23.3 12 25.65 14.35 M 22.1 23.5 L 23.5 22.1 21.4 20 23.55 17.85 22.15 16.45 20 18.6 17.85 16.45 16.45 17.85 18.6 20 16.5 22.1 17.9 23.5 20 21.4 22.1 23.5 Z'/>";break;
        case 'add': t[1]="<path fill='"+color+"' d='M 30 12 L 28 10 12 10 10 12 10 28 12 30 28 30 30 28 30 12 M 27 12 L 28 13 28 27 27 28 13 28 12 27 12 13 13 12 27 12 M 21 24 L 21 21 24 21 24 19 21 19 21 16 19 16 19 19 16 19 16 21 19 21 19 24 21 24 Z'/>";break;

        //filter
        default: t[1]="<path fill='"+color+"' d='M 21 20 Q 24.4 17 23 13 22.5 11.6 20.9 10 L 18.9 10 Q 20.4 11.5 20.95 13 22.4 16.95 19 20 15.35 23.4 16.45 27 16.9 28.2 17.85 29.1 18.35 29.55 19 30 L 21 30 Q 19.1 28.3 18.5 27 17.05 23.65 21 20 M 20.2 14 Q 20.14 13.51 20 13 L 19.55 12 10 12 10 28 16.05 28 15.5 27 Q 15.28 26.50 15.15 26 L 12 26 12 14 20.2 14 M 21.9 10 Q 23.3 11.4 23.6 12 L 28 12 28 28 20.05 28 Q 20.4 28.5 20.9 29 21.4 29.5 22 30 L 30 30 30 10 21.9 10 Z'/>";break;
    }
    t[2] = "</g></svg>";
    return t.join("\n");
}


// LOGO SVG

SED.Logo = function(size, color){
    color = color || '#FFF';
    var width = size || 36;
    var Kwidth = '0 0 256 256';
    var t = [];
    t[0] = "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' preserveAspectRatio='none' x='0px' y='0px' width='"+width+"px' height='"+width+"px' viewBox='"+Kwidth+"';'><g>";
    t[1] = "<path fill='"+color+"' d='M 184.75 66.95 L 189.75 54.95 149.05 38.1 Q 128.05 29.35 107 38.15 86 46.8 77.25 67.85 68.55 88.85 77.25 110.05 85.95 130.95 106.95 139.7 L 134.45 151.4 Q 140.85 154.1 143.6 160.55 146.3 167.1 143.6 173.6 140.9 180.05 134.4 182.8 127.85 185.5 121.45 182.8 L 80.75 165.95 75.75 177.95 116.45 194.8 Q 116.6994140625 194.90390625 116.95 195 128.1015625 199.444921875 139.35 194.75 150.85 190.05 155.6 178.6 160.35 167.1 155.6 155.55 150.85 144.15 139.45 139.4 L 139.4 139.35 111.95 127.7 Q 95.9 121.05 89.25 105.05 82.6 88.95 89.25 72.85 95.9 56.75 112 50.15 128 43.45 144.05 50.1 L 184.75 66.95 M 175.2 90.05 L 180.2 78.05 139.5 61.2 Q 128.1 56.45 116.6 61.25 105.1 65.95 100.35 77.4 95.6 88.9 100.35 100.45 105.1 111.85 116.55 116.6 L 144 128.3 Q 160.05 134.95 166.7 150.95 173.35 167.05 166.7 183.15 160.05 199.25 143.95 205.85 127.95 212.55 111.9 205.9 L 71.2 189.05 66.2 201.05 106.9 217.9 Q 127.9 226.65 148.95 217.85 169.95 209.2 178.7 188.15 187.4 167.15 178.7 145.95 170 125.05 149 116.3 L 121.5 104.6 Q 115.1 101.9 112.35 95.45 109.65 88.9 112.35 82.4 115.05 75.95 121.55 73.2 128.1 70.5 134.5 73.2 L 175.2 90.05 Z'/>";
    t[2] = "</g></svg>";
    return t.join("\n");
}