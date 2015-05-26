/**   _   _____ _   _   
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_| 2015
*    @author lo.th / http://lo-th.github.io/labs/
*/

'use strict';
var UIsr = { version:0.1 };

UIsr.nset = {
    width:322 , height:262, w:40, h:40, r:10, 
    sc1:'rgba(120,30,60,0.5)', fc1:'rgba(30,120,60,0.5)', tc1:'rgba(30,60,120,0.5)',
    sc2:'rgba(120,30,60,0.8)', fc2:'rgba(30,120,60,0.8)', tc2:'rgba(30,60,120,0.8)',
};

UIsr.DocClick = false;


//--------------------
// TITLE
//--------------------

UIsr.Title = function(target, id, type, prefix ){
    this.target = target;

    this.content = document.createElement( 'div' );
    this.content.className = 'UIsr-title';
    
    this.t1 = document.createElement('div');
    this.t1.className = 'UIsr-text';
    this.t1.style.cssText ='width:200px; font-size:12px;';
    
    this.t2 = document.createElement('div');
    this.t2.className = 'UIsr-text';
    this.t2.style.cssText ='right:5px; text-align:right; font-size:12px;';
    
    var idt = id;
    if(id<10) idt = '0'+id;

    this.t1.innerHTML = type.replace("-", " ").toUpperCase();
    this.t2.innerHTML = prefix.toUpperCase()+' '+idt;

    this.content.appendChild(this.t1);
    this.content.appendChild(this.t2);
    this.target.appendChild( this.content );
}
UIsr.Title.prototype = {
    constructor: UIsr.Title,
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

UIsr.Url = function(target, name, callback, value ){
    this.target = target;

    this.mouseDown = false;
    this.callback = callback || function(){};
    this.content = document.createElement( 'div' );
    this.content.className = 'UIsr-base';
    target.appendChild( this.content );

    this.t1 = document.createElement( 'div' );
    this.t1.className = 'UIsr-text';
    this.t1.innerHTML = 'URL:';
    this.content.appendChild( this.t1 );

    this.t2 = document.createElement('input');
    this.t2.className = 'UIsr-url';
    this.t2.style.cssText ='width:200px; left:50px; pointer-events:auto;';
    //this.t2.contentEditable =true;
    this.t2.value = value;
    this.content.appendChild(this.t2);

    //this.fun =  function(e){ this.callback( this.t2.innerHTML ) }.bind(this);
    this.fun =  function(e){
        e.stopPropagation();
        this.callback( this.t2.value );
        if ( e.keyCode === 13 ) e.target.blur();
    }.bind(this);

    this.change =  function(e){
        this.callback( this.t2.value );
    }.bind(this);

    this.t2.addEventListener("keydown", this.fun, false);
    this.t2.addEventListener("change", this.change, false);
}
UIsr.Url.prototype = {
    constructor: UIsr.Url,
    clear:function(){
        this.t2.removeEventListener("keydown", this.fun, false);
        this.t2.removeEventListener("change", this.change, false);
        
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

UIsr.Number = function(target, name, callback, value, min, max ){
     this.target = target;

    this.mouseDown = false;
    this.callback = callback || function(){};
    this.content = document.createElement( 'div' );
    this.content.className = 'UIsr-base';
    target.appendChild( this.content );

    this.t1 = document.createElement( 'div' );
    this.t1.className = 'UIsr-text';
    this.t1.innerHTML = name+':';
    this.content.appendChild( this.t1 );

    this.t2 = document.createElement('input');
    this.t2.className = 'UIsr-number';
    this.t2.style.cssText ='width:80px; left:100px; pointer-events:auto;  border:none;';
    this.t2.value = value;
    this.content.appendChild(this.t2);

    this.fun =  function(e){
        e.stopPropagation();
        this.callback( this.t2.value );
        if ( e.keyCode === 13 ) e.target.blur();
    }.bind(this);

    this.change =  function(e){
        this.callback( this.t2.value );
    }.bind(this);

    this.t2.addEventListener( 'keydown', this.fun, false );
    this.t2.addEventListener( 'change', this.change, false );
}
UIsr.Number.prototype = {
    constructor: UIsr.Number,
    clear:function(){
        //this.t2.removeEventListener("input", this.fun, false);
        this.t2.removeEventListener( 'keydown', this.fun, false );
        this.t2.removeEventListener( 'change', this.change, false );
        
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
// VECTOR2
//--------------------

UIsr.V2 = function(target, name, callback, value1, value2 ){
    this.target = target;

    this.mouseDown = false;
    this.callback = callback || function(){};
    this.content = document.createElement( 'div' );
    this.content.className = 'UIsr-base';
    target.appendChild( this.content );

    this.t1 = document.createElement( 'div' );
    this.t1.className = 'UIsr-text';
    this.t1.innerHTML = name+':';
    this.content.appendChild( this.t1 );

    this.t2 = document.createElement('input');
    this.t2.className = 'UIsr-number';
    this.t2.style.cssText ='width:60px; left:100px; pointer-events:auto; border:none;';
    this.t2.value = value1;
    this.content.appendChild(this.t2);

    this.t3 = document.createElement('input');
    this.t3.className = 'UIsr-number';
    this.t3.style.cssText ='width:60px; left:170px; pointer-events:auto; border:none;';
    this.t3.value = value2;
    this.content.appendChild(this.t3);

    this.fun =  function(e){
        e.stopPropagation();
        this.callback( [this.t2.value, this.t3.value] );
        if ( e.keyCode === 13 ) e.target.blur();
    }.bind(this);

    this.change =  function(e){
        this.callback( [this.t2.value, this.t3.value] );
    }.bind(this);

    this.t2.addEventListener("keydown", this.fun, false);
    this.t3.addEventListener("keydown", this.fun, false);
    this.t2.addEventListener("change", this.change, false);
    this.t3.addEventListener("change", this.change, false);
    
}
UIsr.V2.prototype = {
    constructor: UIsr.V2,
    clear:function(){
        this.t2.removeEventListener("keydown", this.fun, false);
        this.t3.removeEventListener("keydown", this.fun, false);
        this.t2.removeEventListener("change", this.change, false);
        this.t3.removeEventListener("change", this.change, false)
        
        this.content.removeChild( this.t1 );
        this.content.removeChild( this.t2 );
        this.content.removeChild( this.t3 );
        this.target.removeChild( this.content );

        this.callback = null;
        this.fun = null;
        this.t1 = null;
        this.t2 = null;
        this.t3 = null;
        this.content = null;
        this.target = null;
    }
}
//--------------------
// COLOR
//--------------------

UIsr.Color = function(target, name, callback, value ){
    // type [0, 0, 0, 1]
    this.target = target;

    this.mouseDown = false;
    this.callback = callback || function(){};
    this.content = document.createElement( 'div' );
    this.content.className = 'UIsr-base';
    target.appendChild( this.content );

    this.t1 = document.createElement( 'div' );
    this.t1.className = 'UIsr-text';
    this.t1.innerHTML = name+':';
    this.content.appendChild( this.t1 );

    this.t2 = document.createElement('input');
    this.t2.className = 'UIsr-number';
    this.t2.style.cssText ='width:40px; left:100px; pointer-events:auto; border:none;';
    this.t2.value = (value[0]*255).toFixed(0);
    this.content.appendChild(this.t2);

    this.t3 = document.createElement('input');
    this.t3.className = 'UIsr-number';
    this.t3.style.cssText ='width:40px; left:145px; pointer-events:auto; border:none;';
    this.t3.value = (value[1]*255).toFixed(0);
    this.content.appendChild(this.t3);

    this.t4 = document.createElement('input');
    this.t4.className = 'UIsr-number';
    this.t4.style.cssText ='width:40px; left:190px; pointer-events:auto; border:none;';
    this.t4.value = (value[2]*255).toFixed(0);
    this.content.appendChild(this.t4);

    this.t5 = document.createElement('input');
    this.t5.className = 'UIsr-number';
    this.t5.style.cssText ='width:40px; left:235px; pointer-events:auto; border:none;';
    this.t5.value = (value[3]*255).toFixed(0);
    this.content.appendChild(this.t5);

    this.fun =  function(e){
        e.stopPropagation();
        this.callback( [this.t2.value/255, this.t3.value/255, this.t4.value/255, this.t5.value/255] );
        if ( e.keyCode === 13 ) e.target.blur();
    }.bind(this);
    this.change =  function(e){
        this.callback( [this.t2.value/255, this.t3.value/255, this.t4.value/255, this.t5.value/255] );
    }.bind(this);

    this.t2.addEventListener("keydown", this.fun, false);
    this.t3.addEventListener("keydown", this.fun, false);
    this.t4.addEventListener("keydown", this.fun, false);
    this.t5.addEventListener("keydown", this.fun, false);
    this.t2.addEventListener( 'change', this.change, false );
    this.t3.addEventListener( 'change', this.change, false );
    this.t4.addEventListener( 'change', this.change, false );
    this.t5.addEventListener( 'change', this.change, false );
}
UIsr.Color.prototype = {
    constructor: UIsr.Color,
    clear:function(){
        this.t2.removeEventListener("keydown", this.fun, false);
        this.t3.removeEventListener("keydown", this.fun, false);
        this.t4.removeEventListener("keydown", this.fun, false);
        this.t5.removeEventListener("keydown", this.fun, false);
        this.t2.removeEventListener( 'change', this.change, false );
        this.t3.removeEventListener( 'change', this.change, false );
        this.t4.removeEventListener( 'change', this.change, false );
        this.t5.removeEventListener( 'change', this.change, false );
        
        this.content.removeChild( this.t1 );
        this.content.removeChild( this.t2 );
        this.content.removeChild( this.t3 );
        this.content.removeChild( this.t4 );
        this.content.removeChild( this.t5 );
        this.target.removeChild( this.content );

        this.callback = null;
        this.fun = null;
        this.t1 = null;
        this.t2 = null;
        this.t3 = null;
        this.t4 = null;
        this.t5 = null;
        this.content = null;
        this.target = null;
    }
}
//--------------------
// BOOL
//--------------------

UIsr.Bool = function(target, name, callback, value ){
    this.target = target;

    this.value = value;

    this.mouseDown = false;
    this.callback = callback || function(){};
    this.content = document.createElement( 'div' );
    this.content.className = 'UIsr-base';
    target.appendChild( this.content );

    this.t1 = document.createElement( 'div' );
    this.t1.className = 'UIsr-text';
    this.t1.innerHTML = name+':';
    this.content.appendChild( this.t1 );

    this.t2 = document.createElement('div');
    this.t2.className = 'UIsr-box';
    if(this.value) this.t2.style.background = '#FFF';
    this.content.appendChild(this.t2);

    this.t2.onclick = function(e){
        if(this.value){
            this.value = false;
            this.t2.style.background = 'none';
        } else {
            this.value = true;
            this.t2.style.background = '#FFF';
        }
        this.callback( this.value );
    }.bind(this);
}
UIsr.Bool.prototype = {
    constructor: UIsr.Bool,
    clear:function(){
        this.t2.onclick = null;
        
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
// LIST
//--------------------

UIsr.List = function(target, name, callback, value, list ){
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

UIsr.List.prototype = {
    constructor: UIsr.List,
    init:function(){
        this.content = document.createElement( 'div' );
        this.content.className = 'UIsr-base';
        this.target.appendChild( this.content );

        this.txt = document.createElement( 'div' );
        this.txt.className = 'UIsr-text';
        this.txt.innerHTML = this.name.substring(0,1).toUpperCase()+this.name.substring(1,this.name.length)+':';
        this.content.appendChild( this.txt );

        this.sel = document.createElement( 'div' );
        this.sel.className = 'UIsr-textList';
        this.sel.innerHTML = this.value.toUpperCase();
        this.content.appendChild( this.sel );
        this.sel.onclick=function(e){ this.displayList(); }.bind(this);

        /*this.target.onmouseover = function(){
		   console.log('out over')
		}*/
    },
    displayList:function(){
        if(this.lcontent!==null){
            this.lcontent.style.display = 'block';
            this.lcontent.style.zIndex = 1;
        }else{
            this.lcontent = document.createElement( 'div' );
            this.lcontent.className = 'UIsr-list';
            this.content.appendChild(this.lcontent);

            this.lin = document.createElement( 'div' );
            this.lin.className = 'UIsr-listInner';
            this.lcontent.appendChild(this.lin);

            var item, name;
            for(var i=0; i<this.list.length; i++){
                name = this.list[i];
                item = document.createElement( 'div' );
                item.className = 'UIsr-listItem';
                item.innerHTML = name.toUpperCase();
                item.name = name;
                this.lin.appendChild(item);
            }

            this.lin.onclick=function(e){ this.value = e.target.name; this.closeList(); }.bind(this);
            this.lin.onmouseover=function(e){ this.mover = true; clearTimeout(this.timer); }.bind(this);
            this.lin.onmouseout=function(e){ 
                if(this.mover) this.timer = setTimeout(function(e){this.closeList()}.bind(this), 1000);
            }.bind(this);

            this.listHeight = this.list.length * 16;
            this.lcontent.style.zIndex = 1;

            if(this.listHeight<80) this.lcontent.style.height = this.listHeight +'px';
            else this.addScroll(); 
        }
    },
    addScroll:function(){
        this.bg = document.createElement( 'div' );
        this.bg.className = 'UIsr-listScroll';
        this.lcontent.appendChild(this.bg);

        this.pin = document.createElement( 'div' );
        this.pin.className = 'UIsr-listPin';
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
    	this.mover = true; clearTimeout(this.timer);
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

UIsr.Slide = function(target, name, callback, value, min, max, precision, type, set){
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
    this.width = 170;
    this.height = 16;
    this.w = this.width-8;
    this.value = value || 0;
    this.mouseDown = false;
    this.init();
};

UIsr.Slide.prototype = {
    constructor: UIsr.Slide,
    init:function(){
    	
        this.content = document.createElement( 'div' );
        this.content.className = 'UIsr-base';
        
        this.txt = document.createElement( 'div' );
        this.txt.className = 'UIsr-text';
        this.txt.innerHTML = this.name.substring(0,1).toUpperCase()+this.name.substring(1,this.name.length)+':';

        this.result = document.createElement( 'div' );
        this.result.className = 'UIsr-text';
        this.result.style.cssText ='right:10px; text-align:right;';

        this.bg = document.createElement( 'div' );
        this.bg.className = 'UIsr-scroll-bg';
        this.bg.style.width = this.width+'px';
        this.bg.style.height = this.height+'px';
        this.bg.style.background = this.colors[1];

        this.sel = document.createElement( 'div' );
        this.sel.className = 'UIsr-scroll-sel';
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

UIsr.createClass = function(name,rules,noAdd){
    var adds = '.';
    if(noAdd)adds='';
    if(name == '*') adds = '';
    var style = document.createElement('style');
    style.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(style);
    if(!(style.sheet||{}).insertRule) (style.styleSheet || style.sheet).addRule(adds+name, rules);
    else style.sheet.insertRule(adds+name+"{"+rules+"}",0);
}

/*UIsr.applyClass = function (name,element,doRemove){
    if(typeof element.valueOf() == "string") element = document.getElementById(element);
    if(!element) return;
    if(doRemove) element.className = element.className.replace(new RegExp("\\b"+name+"\\b","g"),"");
    else element.className = element.className+" "+name;
}*/
var str = 'box-sizing:border-box; -moz-box-sizing:border-box; -webkit-box-sizing:border-box; letter-spacing:-0.3px; color:#FFF;';
UIsr.createClass('UIsr-base', 'width:'+(UIsr.nset.width-4)+'px; height:20px; position:relative; left:0px; pointer-events:none; background:'+UIsr.nset.fc1+'; padding-left:5px; padding-right:5px; margin-bottom:1px;'+str);
UIsr.createClass('UIsr-title', 'width:'+(UIsr.nset.width-4)+'px; height:30px; position:relative; left:0px; pointer-events:none; padding-left:5px; padding-right:5px; margin-bottom:1px; padding-top:8px;'+str);

UIsr.createClass('UIsr-box', 'position:absolute; left:100px; top:3px; width:14px; height:14px; pointer-events:auto; cursor:pointer; border:2px solid rgba(255,255,255,0.4); '+str);
UIsr.createClass('UIsr-text', 'font-size:12px; position:absolute; width:80px; height:16px; pointer-events:none; margin-top:2px; padding-left:4px; padding-top:2px; text-align:Left;'+str);
UIsr.createClass('input.UIsr-number', 'font-size:12px; position:absolute; width:80px; height:16px; pointer-events:none; margin-top:2px; padding-left:4px; padding-top:2px; text-align:Left; background:rgba(0,0,0,0.2);'+str, true);
UIsr.createClass('input.UIsr-url', 'font-size:12px; position:absolute; width:80px; height:16px; pointer-events:none; margin-top:2px; padding-left:4px; padding-top:2px; text-align:Left; background:rgba(0,0,0,0.2);'+str, true);
UIsr.createClass('UIsr-textList', 'border:1px solid '+UIsr.nset.fc1+'; background:'+UIsr.nset.fc2+'; left:100px; font-size:12px; position:absolute; cursor:pointer; width:170px; height:16px; pointer-events:auto; margin-top:2px; text-align:center;'+str);
UIsr.createClass('UIsr-textList:hover', 'border:1px solid #FFF;'+str);
UIsr.createClass('UIsr-list', 'border:1px solid #FFF; position:absolute; left:100px; top:17px; width:170px; height:80px; background:#000; overflow:hidden; pointer-events:none; '+str);
UIsr.createClass('UIsr-listInner', 'position:absolute; left:0; top:0; width:170px; background:#060; pointer-events:none;'+str);
UIsr.createClass('UIsr-listItem', 'position:relative; width:170px; height:15px; background:#020; margin-bottom:1px; pointer-events:auto; cursor:pointer;'+str);
UIsr.createClass('UIsr-listItem:hover', 'background:#050; color:#FFF;'+str)
UIsr.createClass('UIsr-listScroll', 'position:absolute; right:0px; background:#000; width:20px; height:80px;cursor:pointer;pointer-events:auto;'+str);
UIsr.createClass('UIsr-listPin', 'position:absolute; right:1px; background:#0F0; width:18px; height:20px; pointer-events:none;'+str);

UIsr.createClass('UIsr-scroll-bg', 'position:absolute; left:100px; top:2px; cursor:w-resize; pointer-events:auto;'+str);
UIsr.createClass('UIsr-scroll-sel', 'position:absolute; pointer-events:none; left:4px; top:4px;'+str);