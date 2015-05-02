/**   _   _____ _   _   
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_| 2015
*    @author lo.th / http://lo-th.github.io/labs/
*/

'use strict';
var UI = { version:0.1 };

UI.nset = {
    width:322 , height:262, w:40, h:40, r:10, 
    sc1:'rgba(120,30,60,0.5)', fc1:'rgba(30,120,60,0.5)', tc1:'rgba(30,60,120,0.5)',
    sc2:'rgba(120,30,60,0.8)', fc2:'rgba(30,120,60,0.8)', tc2:'rgba(30,60,120,0.8)',
};

//--------------------
// TITLE
//--------------------

UI.Title = function(target, id, type, prefix ){
    this.target = target;

    this.content = document.createElement( 'div' );
    this.content.className = 'UI-title';
    
    this.t1 = document.createElement('div');
    this.t1.className = 'UI-text';
    this.t1.style.cssText ='width:200px; font-size:12px;';
    
    this.t2 = document.createElement('div');
    this.t2.className = 'UI-text';
    this.t2.style.cssText ='right:5px; text-align:right; font-size:12px;';
    
    var idt = id;
    if(id<10) idt = '0'+id;

    this.t1.innerHTML = type.replace("-", " ").toUpperCase();
    this.t2.innerHTML = prefix.toUpperCase()+' '+idt;

    this.content.appendChild(this.t1);
    this.content.appendChild(this.t2);
    this.target.appendChild( this.content );
}
UI.Title.prototype = {
    constructor: UI.Title,
    clear:function(){
        this.content.removeChild(this.t1);
        this.content.removeChild(this.t2);
        this.target.removeChild( this.content );

        this.t1 = null;
        this.t2 = null;
        this.content = null;
        this.target = null;
    }
}

//--------------------
// URL
//--------------------

UI.Url = function(target, name, callback, value ){
    this.target = target;

    this.mouseDown = false;
    this.callback = callback || function(){};
    this.content = document.createElement( 'div' );
    this.content.className = 'UI-base';
    target.appendChild( this.content );

    this.t1 = document.createElement( 'div' );
    this.t1.className = 'UI-text';
    this.t1.innerHTML = 'URL:';
    this.content.appendChild( this.t1 );

    this.t2 = document.createElement('div');
    this.t2.className = 'UI-text';
    this.t2.style.cssText ='width:200px; left:50px; pointer-events:auto;';
    this.t2.contentEditable =true;
    this.t2.innerHTML = value;
    this.content.appendChild(this.t2);

    this.fun =  function(e){ this.callback( this.t2.innerHTML ) }.bind(this)
    this.t2.addEventListener("input", this.fun, false);
}
UI.Url.prototype = {
    constructor: UI.Url,
    clear:function(){
        this.t2.removeEventListener("input", this.fun, false);
        
        this.content.removeChild( this.t1 );
        this.content.removeChild( this.t2 );
        this.target.removeChild( this.content );

        this.callback = null;
        this.fun = null;
        this.t1 = null;
        this.t2 = null;
        this.content = null;
        this.target = null;
    }
}

//--------------------
// NUMBER
//--------------------

UI.Number = function(target, name, callback, value ){
    // type 0
    
}
UI.Number.prototype = {
    constructor: UI.Number,
    clear:function(){

    }
}
//--------------------
// VECTOR2
//--------------------

UI.V2 = function(target, name, callback, value ){
    // type [0, 0]
    
}
UI.V2.prototype = {
    constructor: UI.V2,
    clear:function(){

    }
}
//--------------------
// COLOR
//--------------------

UI.Color = function(target, name, callback, value ){
    // type [0, 0, 0, 1]
    
}
UI.Color.prototype = {
    constructor: UI.Color,
    clear:function(){

    }
}
//--------------------
// BOOL
//--------------------

UI.Bool = function(target, name, callback, value ){

}
UI.Bool.prototype = {
    constructor: UI.Bool,
    clear:function(){

    }
}
//--------------------
// LIST
//--------------------

UI.List = function(target, name, callback, value, list ){
    this.target = target;

    this.colors = ['rgba(220,220,220,1)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)', 'rgba(200,200,200,0.6)', 'rgba(200,200,200,1)'];
    this.list = list || [];
    this.name = name || "list";
    this.value = value;
    this.callback = callback || function(){};
    this.lcontent = null;
    this.mouseDown = false;
    this.mover = true;
    this.dragValue = 0;
    
    this.timer = null;

    this.bg = null;
    this.pin = null;

    this.init();
}

UI.List.prototype = {
    constructor: UI.List,
    init:function(){
        this.content = document.createElement( 'div' );
        this.content.className = 'UI-base';
        this.target.appendChild( this.content );

        this.txt = document.createElement( 'div' );
        this.txt.className = 'UI-text';
        this.txt.innerHTML = this.name.substring(0,1).toUpperCase()+this.name.substring(1,this.name.length)+':';
        this.content.appendChild( this.txt );

        this.sel = document.createElement( 'div' );
        this.sel.className = 'UI-textList';
        this.sel.innerHTML = this.value.toUpperCase();
        this.content.appendChild( this.sel );
        this.sel.onclick=function(e){ this.displayList(); }.bind(this);
    },
    displayList:function(){
        if(this.lcontent!==null){
            this.lcontent.style.display = 'block';
            this.lcontent.style.zIndex = 1;
        }else{
            this.lcontent = document.createElement( 'div' );
            this.lcontent.className = 'UI-list';
            this.content.appendChild(this.lcontent);

            this.lin = document.createElement( 'div' );
            this.lin.className = 'UI-listInner';
            this.lcontent.appendChild(this.lin);

            var item, name;
            for(var i=0; i<this.list.length; i++){
                name = this.list[i];
                item = document.createElement( 'div' );
                item.className = 'UI-listItem';
                item.innerHTML = name.toUpperCase();
                item.name = name;
                this.lin.appendChild(item);
            }

            this.lin.onclick=function(e){ this.value = e.target.name; this.closeList(); }.bind(this);
            this.lin.onmouseover=function(e){ this.mover = true; clearTimeout(this.timer) }.bind(this);
            this.lin.onmouseout=function(e){ 
                if(this.mover) this.timer = setTimeout(function(e){this.closeList()}.bind(this), 100);
            }.bind(this);

            this.listHeight = this.list.length * 16;
            this.lcontent.style.zIndex = 1;

            if(this.listHeight<80) this.lcontent.style.height = this.listHeight +'px';
            else this.addScroll(); 
        }
    },
    addScroll:function(){
        this.bg = document.createElement( 'div' );
        this.bg.className = 'UI-listScroll';
        this.lcontent.appendChild(this.bg);

        this.pin = document.createElement( 'div' );
        this.pin.className = 'UI-listPin';
        this.bg.appendChild(this.pin);

        this.bg.oncontextmenu = function(e){ e.preventDefault(); }.bind(this);
        this.bg.onmouseover = function(e){ this.over(e); }.bind(this);
        this.bg.onmouseout = function(e){ this.out(e); }.bind(this);
        this.bg.onmouseup = function(e){ this.up(e); }.bind(this);
        this.bg.onmousedown = function(e){ this.down(e); }.bind(this);
        this.bg.onmousemove = function(e){ this.drag(e); }.bind(this);

        this.ratio = this.listHeight / 70;
        this.scrollHeight = 20;
        this.min = 10;
        this.max = 70;
        this.valueRange = this.max - this.min;
        this.h = 60;
        this.pin.style.height = this.scrollHeight +'px';
    },
    closeList:function(){
        this.mover = false;
        this.lcontent.style.display = 'none';
        this.sel.innerHTML = this.value.toUpperCase();
        this.callback(this.value);
        this.lcontent.style.zIndex = 0;
    },
    updatePosition:function(){
        this.pin.style.top = (this.dragValue-10) +'px';
        this.lin.style.top = -((this.dragValue-10)*this.ratio)+'px';
    },
    out:function(e){
        this.mouseDown = false;
        //this.bg.style.backgroundColor = this.colors[1]; 
        this.bg.childNodes[0].style.backgroundColor = this.colors[3];
        e.preventDefault(); 
    },
    over:function(e){
        //this.bg.style.backgroundColor = this.colors[2]; 
        this.bg.childNodes[0].style.backgroundColor = this.colors[4];
        e.preventDefault(); 
    },
    up:function(e){
        this.mouseDown = false;
        e.preventDefault(); 
    },
    down:function(e){
        this.mouseDown = true;
        this.drag(e);
        e.preventDefault();
    },
    drag:function(e){
        if(this.mouseDown){
            var rect = this.bg.getBoundingClientRect();
            this.dragValue = (((e.clientY-rect.top-17)/this.h)*this.valueRange+this.min);//.toFixed(0))*1;
            if(this.dragValue<this.min) this.dragValue = this.min;
            if(this.dragValue>this.max) this.dragValue = this.max;
            this.updatePosition();
        }
        e.preventDefault();
    },
    clear:function(){
       
        if(this.lcontent!==null){
            if(this.bg!==null){
                this.bg.oncontextmenu = null;
                this.bg.onmouseover = null;
                this.bg.onmouseout = null;
                this.bg.onmouseup = null;
                this.bg.onmousedown = null;
                this.bg.onmousemove = null;
                this.bg.removeChild(this.pin);
                this.lcontent.removeChild(this.bg);
                this.pin = null;
                this.bg = null;
            }
            while(this.lin.firstChild) { this.lin.removeChild(this.lin.firstChild); }
            this.lin.onclick=null;
            this.lin.onmouseover=null;
            this.lin.onmouseout=null;
            this.lcontent.removeChild(this.lin);

            this.lin = null;
            this.lcontent = null;
        }
        
        this.content.removeChild( this.sel );
        this.content.removeChild( this.txt );
        this.sel.onclick = null;
        this.sel = null;
        this.txt = null;
        this.callback = null;
        this.target.removeChild( this.content );
        this.list = null;
        this.content = null;
        this.target = null;
    }
}

//--------------------
// SLIDER
//--------------------

UI.Slide = function(target, name, callback, value, min, max, precision, type, set){
    this.target = target;

    this.colors = ['rgba(220,220,220,1)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)', 'rgba(200,200,200,0.6)', 'rgba(200,200,200,1)'];
    //this.radius = "-moz-border-radius: 16px; -webkit-border-radius: 16px; border-radius: 16px;";
    this.precision = precision || 0;
    this.min = min || 0;
    this.max = max || 100;
    this.name = name || "slider";
    this.type = type || '';
    this.valueRange = this.max - this.min;
    this.set = set || [10,100,180,10];
    this.callback = callback || function(){}; 
    this.width = 180;
    this.height = 16;
    this.w = this.width-8;
    this.value = value || 0;
    this.mouseDown = false;
    this.init();
};

UI.Slide.prototype = {
    constructor: UI.Slide,
    init:function(){
        this.content = document.createElement( 'div' );
        this.content.className = 'UI-base';
        
        this.txt = document.createElement( 'div' );
        this.txt.className = 'UI-text';
        this.txt.innerHTML = this.name.substring(0,1).toUpperCase()+this.name.substring(1,this.name.length)+':';

        this.result = document.createElement( 'div' );
        this.result.className = 'UI-text';
        this.result.style.cssText ='right:10px; text-align:right;';

        this.bg = document.createElement( 'div' );
        this.bg.className = 'UI-scroll-bg';
        this.bg.style.width = this.width+'px';
        this.bg.style.height = this.height+'px';
        this.bg.style.background = this.colors[1];

        this.sel = document.createElement( 'div' );
        this.sel.className = 'UI-scroll-sel';
        this.sel.style.height = (this.height-8)+'px';
        this.sel.style.background = this.colors[3];
        
        this.bg.appendChild( this.sel );
        this.content.appendChild( this.result );
        this.content.appendChild( this.txt );
        this.content.appendChild( this.bg );
        this.target.appendChild( this.content );

        //bg.oncontextmenu = function(e){ e.preventDefault(); }.bind(this);
        this.bg.onmouseover = function(e){ this.over(e); }.bind(this);
        this.bg.onmouseout = function(e){ this.out(e); }.bind(this);
        this.bg.onmouseup = function(e){ this.up(e); }.bind(this);
        this.bg.onmousedown = function(e){ this.down(e); }.bind(this);
        this.bg.onmousemove = function(e){ this.drag(e); }.bind(this);
        //bg.onmousewheel = function(e) {this.mousewheel(e)}.bind( this );

        this.updatePosition();
    },
    updatePosition:function(){
        this.sel.style.width = (this.w * ((this.value-this.min)/this.valueRange))+'px';
        this.result.innerHTML = this.value+this.type;
        this.callback(this.value);
    },
    out:function(e){
        this.mouseDown = false;
        this.bg.style.backgroundColor = this.colors[1]; 
        this.bg.childNodes[0].style.backgroundColor = this.colors[3];
        e.preventDefault(); 
    },
    over:function(e){
        this.bg.style.backgroundColor = this.colors[2]; 
        this.bg.childNodes[0].style.backgroundColor = this.colors[4];
        e.preventDefault(); 
    },
    up:function(e){
        this.mouseDown = false;
        e.preventDefault(); 
    },
    down:function(e){
        this.mouseDown = true;
        this.drag(e);
        e.preventDefault();
    },
    drag:function(e){
        if(this.mouseDown){
            var rect = this.bg.getBoundingClientRect();
            this.value = ((((e.clientX-rect.left)/this.w)*this.valueRange+this.min).toFixed(this.precision))*1;
            if(this.value<this.min) this.value = this.min;
            if(this.value>this.max) this.value = this.max;
            this.updatePosition();
        }
        e.preventDefault();
    },
    clear:function(){
        this.bg.onmouseover = null;
        this.bg.onmouseout = null;
        this.bg.onmouseup = null;
        this.bg.onmousedown = null;
        this.bg.onmousemove = null;

        this.bg.removeChild(this.sel);
        this.content.removeChild(this.result);
        this.content.removeChild(this.txt);
        this.content.removeChild(this.bg);
        this.target.removeChild( this.content );
        this.bg = null;
        this.sel = null;
        this.txt = null;
        this.result = null;
        this.content = null;
        this.target = null;
    }
};

//--------------------
// CLASS
//--------------------

UI.createClass = function(name,rules){
    var adds = '.';
    if(name == '*') adds = '';
    var style = document.createElement('style');
    style.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(style);
    if(!(style.sheet||{}).insertRule) (style.styleSheet || style.sheet).addRule(adds+name, rules);
    else style.sheet.insertRule(adds+name+"{"+rules+"}",0);
}

/*UI.applyClass = function (name,element,doRemove){
    if(typeof element.valueOf() == "string") element = document.getElementById(element);
    if(!element) return;
    if(doRemove) element.className = element.className.replace(new RegExp("\\b"+name+"\\b","g"),"");
    else element.className = element.className+" "+name;
}*/

UI.createClass('UI-base', 'width:'+(UI.nset.width-4)+'px; height:20px; position:relative; left:0px; pointer-events:none; background:'+UI.nset.fc1+'; padding-left:10px; padding-right:10px; margin-bottom:1px;');
UI.createClass('UI-title', 'width:'+(UI.nset.width-4)+'px; height:30px; position:relative; left:0px; pointer-events:none; padding-left:5px; padding-right:5px; margin-bottom:1px; padding-top:8px;');

UI.createClass('UI-text', 'font-size:12px; position:absolute; width:80px; height:12px; pointer-events:none; margin-top:4px; text-align:Left;');
UI.createClass('UI-textList', 'border:1px solid '+UI.nset.fc1+'; background:'+UI.nset.fc2+'; left:90px; font-size:12px; position:absolute; cursor:pointer; width:180px; height:16px; pointer-events:auto; margin-top:2px; text-align:center;');
UI.createClass('UI-textList:hover', 'border:1px solid #FFF;');
UI.createClass('UI-list', 'border:1px solid #FFF; position:absolute; left:90px; top:17px; width:180px; height:80px; background:#000; overflow:hidden; pointer-events:none; ');
UI.createClass('UI-listInner', 'position:absolute; left:0; top:0; width:180px; background:#060; pointer-events:none;');
UI.createClass('UI-listItem', 'position:relative; width:180px; height:15px; background:#020; margin-bottom:1px; pointer-events:auto; cursor:pointer;');
UI.createClass('UI-listItem:hover', 'background:#050; color:#FFF;')
UI.createClass('UI-listScroll', 'position:absolute; right:0px; background:#000; width:20px; height:80px;cursor:pointer;pointer-events:auto;');
UI.createClass('UI-listPin', 'position:absolute; right:1px; background:#0F0; width:18px; height:20px; pointer-events:none;');

UI.createClass('UI-scroll-bg', 'position:absolute; left:90px; top:2px; cursor:w-resize; pointer-events:auto;');
UI.createClass('UI-scroll-sel', 'position:absolute; pointer-events:none; left:4px; top:4px;');