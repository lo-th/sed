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
        this.ui = new UIL.Gui('height:calc(100% - 270px); position:absolute; right:0px; top:270px; pointer-events:auto; background:none; display:none; overflow:auto; overflow-x:hidden;');
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
        this.ui.show();
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
        this.ui.hide();
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

        this.addUIS(id, 'title', {id:id, name:type, prefix:prefix})

       // this.addTitle(id, type, prefix );

       switch(type){
            case 'image': this.addUIS(id, 'string', {name:'src', color:'R'}); break;
          //  case 'video': this.addUIS(id, 'string', {}); break;
            case 'texture-3D': this.addUIS(id, 'string', {name:'texture', color:'B'}); break;
            case 'accumulator':
                //this.addSlide(id, 'opacity', 0, 1, 2);
                //this.addList(id, 'blendMode', Serious.BlendMode);
                //this.addBool(id, 'clear');
                this.addUIS(id, 'slide', {name:'opacity', min:0, max:1, precision:2 });
                this.addUIS(id, 'list', {name:'blendMode', list:Serious.BlendMode});
                this.addUIS(id, 'bool', {name:'clear'});
            break;
            case 'ascii':
                //this.addColor(id, 'background');
                this.addUIS(id, 'color', {name:'background'});
            break;
            case 'bleach-bypass': 
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2 });
             //this.addSlide(id, 'amount', 0, 1, 2); 
            break;
            case 'blend':
                this.addUIS(id, 'slide', {name:'opacity', min:0, max:1, precision:2 });
                this.addUIS(id, 'list', {name:'mode', list:Serious.BlendMode});
                this.addUIS(id, 'list', {name:'sizeMode', list:Serious.BlendSizeMode});
                //this.addSlide(id, 'opacity', 0, 1, 2);
                //this.addList(id, 'mode', Serious.BlendMode);
                //this.addList(id, 'sizeMode', Serious.BlendSizeMode);
            break;
            case 'blur': 
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2 });
            //this.addSlide(id, 'amount', 0, 1, 2); 
            break;
            case 'brightness-contrast':
                this.addUIS(id, 'slide', {name:'brightness', min:0, max:1, precision:2 });
                this.addUIS(id, 'slide', {name:'contrast', min:0, max:1, precision:2 });
                //this.addSlide(id, 'brightness', 0, 1, 2);
                //this.addSlide(id, 'contrast', 0, 1, 2);
            break;
            case 'channels':
                var l = ['red', 'green', 'blue', 'alpha', 'union', 'intersection']
                this.addUIS(id, 'list', {name:'red', list:l});
                this.addUIS(id, 'list', {name:'green', list:l});
                this.addUIS(id, 'list', {name:'blue', list:l});
                this.addUIS(id, 'list', {name:'alpha', list:l});
                /// ? //// +  4 sources redSource greenSource blueSource alphaSource
                /*this.addList(id, 'red', ['red', 'green', 'blue', 'alpha', 'union', 'intersection']);
                this.addList(id, 'green', ['red', 'green', 'blue', 'alpha', 'union', 'intersection']);
                this.addList(id, 'blue', ['red', 'green', 'blue', 'alpha', 'union', 'intersection']);
                this.addList(id, 'alpha', ['red', 'green', 'blue', 'alpha', 'union', 'intersection']);*/
            break;
            case 'checkerboard':
                this.addUIS(id, 'number', {name:'anchor'});
                this.addUIS(id, 'number', {name:'size'});
                this.addUIS(id, 'color', {name:'color1'});
                this.addUIS(id, 'color', {name:'color2'});
                this.addUIS(id, 'number', {name:'width', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'height', min:0, precision:0 });

                /*this.addV2(id, 'anchor');
                this.addV2(id, 'size');
                this.addColor(id, 'color1');
                this.addColor(id, 'color2');
                this.addNumber(id, 'width', 0, 2000, 0, 1);
                this.addNumber(id, 'height', 0, 2000, 0, 1);*/
            break;
            case 'chroma':
                this.addUIS(id, 'color', {name:'screen'});
                this.addUIS(id, 'number', {name:'weight'});
                this.addUIS(id, 'slide', {name:'balance', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'clipBlack', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'clipWhite', min:0, max:1, precision:2});
                this.addUIS(id, 'bool', {name:'mask'});

                /*this.addColor(id, 'screen');
                this.addNumber(id, 'weight');
                this.addSlide(id, 'balance', 0, 1, 2);
                this.addSlide(id, 'clipBlack', 0, 1, 2);
                this.addSlide(id, 'clipWhite', 0, 1, 2);
                this.addBool(id, 'mask');*/
            break;
            case 'color':
                this.addUIS(id, 'color', {name:'color'});
                this.addUIS(id, 'number', {name:'width', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'height', min:0, precision:0 });

                //this.addColor(id, 'color');
                //this.addNumber(id, 'width');
                //this.addNumber(id, 'height');
            break;
            case 'colorcomplements':
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'concentration', min:0.1, max:4, precision:2});
                this.addUIS(id, 'slide', {name:'correlation', min:0, max:1, precision:2});
                this.addUIS(id, 'color', {name:'guideColor'});

                //this.addSlide(id, 'amount', 0, 1, 2);
                //this.addSlide(id, 'concentration', 0.1, 4, 2);
                //this.addSlide(id, 'correlation', 0, 1, 2);
                //this.addColor(id, 'guideColor');
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


                /*this.addNumber(id, 'hueMin');
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
                this.addBool(id, 'mask');*/
            break;
            case 'crop':
                this.addUIS(id, 'number', {name:'top', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'left', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'bottom', min:0, precision:0 });
                this.addUIS(id, 'number', {name:'right', min:0, precision:0 });

                /*this.addNumber(id, 'top', 0, 1);
                this.addNumber(id, 'left', 0, 1);
                this.addNumber(id, 'bottom', 0, 1);
                this.addNumber(id, 'right', 0, 1);*/
            break;
            case 'daltonize': 
                this.addUIS(id, 'list', {name:'type', list:['0.0', '0.2', '0.6', '0.8']});
                //this.addList(id, 'type', ['0.0', '0.2', '0.6', '0.8']);
            break;
            case 'directionblur':
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
                this.addUIS(id, 'number', {name:'angle', min:-360, max:360, precision:0, isAngle:true});

                //this.addSlide(id, 'amount', 0, 1, 2);
                //this.addNumber(id, 'angle', 0, 360, 0, 1, true);
            break;
            case 'displacement':
                this.addUIS(id, 'list', {name:'xChannel', list:['red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none' ]});
                this.addUIS(id, 'list', {name:'yChannel', list:['red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none' ]});
                this.addUIS(id, 'list', {name:'fillMode', list:['color', 'wrap', 'clamp', 'ignore' ]});
                this.addUIS(id, 'color', {name:'color'});
                this.addUIS(id, 'number', {name:'offset', min:0, max:10, precision:2, step:0.01 });
                this.addUIS(id, 'number', {name:'mapScale', min:0, precision:0 });
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});


                /*this.addList(id, 'xChannel', ['red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none' ]);
                this.addList(id, 'yChannel', ['red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none' ]);
                this.addList(id, 'fillMode', ['color', 'wrap', 'clamp', 'ignore' ]);
                this.addColor(id, 'color');
                this.addNumber(id, 'offset', 0, 10, 2, 0.01);
                this.addV2(id, 'mapScale');
                this.addSlide(id, 'amount', 0, 1, 2);*/
            break;




            case 'dither': break;
            case 'edge': 
                this.addUIS(id, 'list', {name:'mode', list:['sobel', 'frei-chen']});
                //this.addList(id, 'mode', ['sobel', 'frei-chen']); 
            break;
            case 'emboss': 
                this.addUIS(id, 'slide', {name:'amount', min:-255/3, max:255/3, precision:0});
                //this.addSlide(id, 'amount', -255/3,  255/3, 0);
            break;
            case 'exposure': 
                this.addUIS(id, 'slide', {name:'exposure', min:-8, max:8, precision:1});
                //this.addSlide(id, 'exposure', -8,  8, 1); 
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
                /*this.addNumber(id, 'a', 0);
                this.addNumber(id, 'b', 0);
                this.addNumber(id, 'c', 0);
                this.addNumber(id, 'd', 0);
                this.addString(id, 'rgb');
                this.addString(id, 'red');
                this.addString(id, 'green');
                this.addString(id, 'blue');
                this.addString(id, 'alpha');*/
            break;
            case 'fader':
                this.addUIS(id, 'color', {name:'color'});
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
                //this.addColor(id, 'color');
                //this.addSlide(id, 'amount', 0, 1, 2);
            break;
            case 'falsecolor':
                this.addUIS(id, 'color', {name:'black'});
                this.addUIS(id, 'color', {name:'white'});
                //this.addColor(id, 'black');
                //this.addColor(id, 'white');
            break;
            case 'filmgrain':
                this.addUIS(id, 'number', {name:'time'});
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
                this.addUIS(id, 'bool', {name:'colored'});
                //this.addNumber(id, 'time');
                //this.addSlide(id, 'amount', 0, 1, 2);
                //this.addBool(id, 'colored');
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
                //this.addImage(id, 'gradient');
                //this.addNumber(id, 'transition');
                //this.addBool(id, 'invert');
                //this.addSlide(id, 'smoothness', 0, 1, 2);
            break;
            case 'hex':
                this.addUIS(id, 'slide', {name:'size', min:0, max:0.4, precision:2});
                this.addUIS(id, 'number', {name:'center',precision:0});
                //this.addSlide(id, 'size', 0, 0.4, 2);
                //this.addV2(id, 'center');
            break;
            case 'highlights-shadows':
                this.addUIS(id, 'slide', {name:'highlights', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'shadows', min:0, max:1, precision:2});
                //this.addSlide(id, 'highlights', 0, 1, 2);
                //this.addSlide(id, 'shadows', 0, 1, 2);
            break;
            case 'hue-saturation':
                this.addUIS(id, 'slide', {name:'hue', min:-1, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'saturation', min:-1, max:1, precision:2});
                //this.addSlide(id, 'hue', -1, 1, 2);
                //this.addSlide(id, 'saturation', -1, 1, 2);
            break;
            case 'invert':break;
            case 'kaleidoscope':
                this.addUIS(id, 'number', {name:'segments', precision:0});
                this.addUIS(id, 'number', {name:'offset', precision:0});
                //this.addNumber(id, 'segments');
                //this.addNumber(id, 'offset');
            break;
            case 'layer':
                this.addUIS(id, 'number', {name:'count', precision:0});
                //this.addNumber(id, 'count');
                /// ? ////
            break;
            case 'linear-transfer':
                this.addUIS(id, 'number', {name:'slope'});
                this.addUIS(id, 'number', {name:'intercept'});
                //this.addV4(id, 'slope');
                //this.addV4(id, 'intercept');
            break;
            case 'lumakey':
                this.addUIS(id, 'slide', {name:'clipBlack', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'clipWhite', min:0, max:1, precision:2});
                this.addUIS(id, 'bool', {name:'invert'});

                //this.addSlide(id, 'clipBlack', 0, 1, 2);
                //this.addSlide(id, 'clipWhite', 0, 1, 2);
                //this.addBool(id, 'invert');
            break;
            case 'mirror': break;
            case 'nightvision':
                this.addUIS(id, 'number', {name:'timer', min:0});
                this.addUIS(id, 'slide', {name:'luminanceThreshold', min:0, max:1, precision:2});
                this.addUIS(id, 'number', {name:'amplification', min:0});
                this.addUIS(id, 'color', {name:'color'});

                //this.addNumber(id, 'timer');
                //this.addSlide(id, 'luminanceThreshold', 0, 1, 2);
                //this.addNumber(id, 'amplification', 0);
                //this.addColor(id, 'color');
            break;
            case 'noise':
                this.addUIS(id, 'bool', {name:'overlay'});
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2});
                this.addUIS(id, 'number', {name:'timer', min:0 });

                //this.addBool(id, 'overlay');
                //this.addSlide(id, 'amount', 0, 1, 2);
                //this.addNumber(id, 'timer', NaN, 1);
            break;
            case 'panorama':
                this.addUIS(id, 'number', {name:'width', min:0, precision:0});
                this.addUIS(id, 'number', {name:'height', min:0, precision:0});
                this.addUIS(id, 'slide', {name:'yaw', min:0, max:360, precision:0});
                this.addUIS(id, 'slide', {name:'fov', min:0, max:180, precision:0});
                this.addUIS(id, 'slide', {name:'pitch', min:-90, max:90, precision:0});

                //this.addNumber(id, 'width', 0, 1);
                //this.addNumber(id, 'height', 0, 1);
                //this.addSlide(id, 'yaw', 0, 360, 0);
                //this.addSlide(id, 'fov', 0, 180, 0);
                //this.addSlide(id, 'pitch', -90, 90, 0);
            break;
            case 'pixelate':
                this.addUIS(id, 'number', {name:'pixelSize', min:0, precision:0});
                //this.addV2(id, 'pixelSize', 0);
            break;
            case 'polar': 
                this.addUIS(id, 'number', {name:'angle', min:-360, max:360, isAngle:true})
                //this.addSlide(id, 'angle', 0, 360, 0, 1, true); 
            break;
            case 'repeat':
                this.addUIS(id, 'number', {name:'repeat', min:0, precision:0});
                this.addUIS(id, 'number', {name:'width', min:0, precision:0});
                this.addUIS(id, 'number', {name:'height', min:0, precision:0});

                //this.addNumber(id, 'repeat', 0, 1);
                //this.addNumber(id, 'width', 0, 1);
                //this.addNumber(id, 'height', 0, 1);
            break;
            case 'ripple':
                this.addUIS(id, 'number', {name:'wave', precision:2});
                this.addUIS(id, 'number', {name:'distortion', precision:2});
                this.addUIS(id, 'number', {name:'center'});
                //his.addNumber(id, 'wave', 0, 1);
                //this.addNumber(id, 'distortion', 0, 1);
                //this.addV2(id, 'center');
            break;
            case 'scanlines':
                this.addUIS(id, 'number', {name:'lines'});
                this.addUIS(id, 'slide', {name:'size', min:0, max:1, precision:2});
                this.addUIS(id, 'slide', {name:'intensity', min:0, max:1, precision:2});

                //this.addNumber(id, 'lines');
                //this.addSlide(id, 'size', 0, 1, 2);
                //this.addSlide(id, 'intensity', 0, 1, 2);
            break;
            case 'select':
                /// ? //// no SOURCE
                this.addUIS(id, 'slide', {name:'active', min:0, max:3, precision:0});
                this.addUIS(id, 'list', {name:'sizeMode', list:['union', 'intersection', 'active']});
                //this.addSlide(id, 'active', 0, 3, 0);
                //this.addList(id, 'sizeMode', ['union', 'intersection', 'active']);
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

                /*this.addV2(id, 'noiseScale');
                this.addV2(id, 'noiseOffset');
                this.addSlide(id, 'octaves', 1, 8, 0);
                this.addSlide(id, 'persistence', 0, 0.5, 2);
                this.addSlide(id, 'amount', 0, 1, 2);
                this.addNumber(id, 'time');
                this.addNumber(id, 'width');
                this.addNumber(id, 'height');
                this.addColor(id, 'black');
                this.addColor(id, 'white');*/
            break;
            case 'sketch': break;
            case 'split':
                this.addUIS(id, 'list', {name:'sizeMode', list:['a', 'b', 'union', 'intersection']});
                this.addUIS(id, 'slide', {name:'split', min:0, max:1, precision:2});
                this.addUIS(id, 'number', {name:'angle', min:-360, max:360, isAngle:true});
                this.addUIS(id, 'slide', {name:'fuzzy', min:0, max:1, precision:2});

                //this.addList(id, 'sizeMode', ['a', 'b', 'union', 'intersection']);
                //this.addSlide(id, 'split', 0, 1, 2);
                //this.addNumber(id, 'angle', 0, 360, 0, 1, true);
                //this.addSlide(id, 'fuzzy', 0, 1, 2);
            break;
            case 'throttle':
                //this.addNumber(id, 'frameRate', 0);
                this.addUIS(id, 'number', {name:'frameRate', min:0});
            break;
            case 'tone':
                this.addUIS(id, 'color', {name:'light'});
                this.addUIS(id, 'color', {name:'dark'});
                this.addUIS(id, 'slide', {name:'toned', min:0, max:1, precision:2 });
                this.addUIS(id, 'slide', {name:'desat', min:0, max:1, precision:2 });
                //this.addColor(id, 'light');
                //this.addColor(id, 'dark');
                //this.addSlide(id, 'toned', 0, 1, 2);
                //this.addSlide(id, 'desat', 0, 1, 2);
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


                /*this.addSlide(id, 'distortion', 0, 1, 2);
                this.addSlide(id, 'verticalSync', 0, 1, 2);
                this.addSlide(id, 'lineSync', 0, 1, 2);
                this.addSlide(id, 'scanlines', 0, 1, 2);
                this.addSlide(id, 'bars', 0, 1, 2);
                this.addSlide(id, 'frameShape', 0, 2, 2);
                this.addSlide(id, 'frameLimit', -1, 1, 2);
                this.addSlide(id, 'frameSharpness', 0, 40, 1);
                this.addColor(id, 'frameColor');*/
            break;
            case 'vignette':
                this.addUIS(id, 'slide', {name:'amount', min:0, max:1, precision:2 });
              //  this.addSlide(id, 'amount', 0, 1, 2); 
            break;
            case 'vibrance': 
                this.addUIS(id, 'slide', {name:'amount', min:-1, max:1, precision:2 });
                //this.addSlide(id, 'amount', -1, 1, 2); 
            break;
            case 'whitebalance':
                this.addUIS(id, 'color', {name:'white'});
                this.addUIS(id, 'bool', {name:'auto'});
                //this.addColor(id, 'white');
                //this.addBool(id, 'auto');
            break;
        }
    },
    clearSelector:function(){
        this.selectID = -1;
        this.select.style.display = 'none';

        if(this.ui)this.ui.clear();
        //while(this.menu.firstChild) { this.menu.removeChild(this.menu.firstChild); }
        /*var i = this.sels.length;
        while(i--){ 
            this.sels[i].clear(); 
            this.sels.pop();
        }*/
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
                obj.callback = function(v){ node.node[name] = v; }.bind(this);
                obj.value = node.node[name];
            }
            
        }
        this.ui.add(type, obj);
    },




    /*addOption:function(id, name, list){
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
        var s = new UIL.String(this.bmenu, name, callback, node.obj.src, 'S' );
        this.sels.push( s );
    },*/
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