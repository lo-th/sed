/**   _   _____ _   _   
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_| 2015
*    @author lo.th / http://lo-th.github.io/labs/
*/

'use strict';
var UIsr = { version:0.2 };

UIsr.nset = {
    width:300 , height:262, w:40, h:40, r:10, 
    sc1:'rgba(120,30,60,0.5)', fc1:'rgba(30,120,60,0.5)', tc1:'rgba(30,60,120,0.5)', nc1:'rgba(40,40,40,0.5)',
    sc2:'rgba(120,30,60,0.8)', fc2:'rgba(30,120,60,0.8)', tc2:'rgba(30,60,120,0.8)', nc2:'rgba(40,40,40,0.8)',
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
    this.t2.style.cssText ='right:25px; text-align:right; font-size:12px;';
    
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
    this.h = 20;
    
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

        

        this.sel.onmousedown=function(e){ this.displayList(); }.bind(this);

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
                item.innerHTML = name;//.toUpperCase();
                item.name = name;
                this.lin.appendChild(item);
            }

            /*document.addEventListener('mouseup', onMouseUp, false);
            var onMouseUp = function(e) {
                this.closeList();
                //onMouseMove(event);
                //this.marks.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }.bind(this);*/

            this.lin.onclick=function(e){ this.value = e.target.name; this.closeList(); }.bind(this);
            this.lin.onmouseover=function(e){ this.mover = true; clearTimeout(this.timer); }.bind(this);

            this.lin.onmousemove=function(e){ this.mouveOn(e); }.bind(this);
            /*this.lin.onmouseout=function(e){ 
                if(this.mover) this.timer = setTimeout(function(e){this.closeList()}.bind(this), 1000);
            }.bind(this);*/

            //this.lin.onmouseout=function(e){ this.closeList(); e.stopPropagation(); }.bind(this);
            
            //document.onclick=function(e){ this.closeList(); e.stopPropagation(); }.bind(this);

            this.listHeight = this.list.length * 16;
            this.lcontent.style.zIndex = 1;

            if(this.listHeight<80){ 
                this.lcontent.style.height = this.listHeight +'px';
                this.h = (this.listHeight+20);
            } else {
                this.addScroll();
                this.h = 100;
            }
        }
        this.content.style.height = this.h+'px';
    },
    mouveOn:function(e){
        //console.log(e.target.name);
        //if(!e.target.name)this.closeList();

        //this.lin.onmouseout=function(e){ this.closeList(); e.preventDefault(); }.bind(this);
        //document.onmouseup = function(e){console.log('ffff'); this.closeList(); e.stopPropagation(); }.bind(this);
        document.onclick = function(e){ if(!this.listUp) this.closeList(); e.stopPropagation(); }.bind(this);
        e.stopPropagation();
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
        //document.onclick = null;
        document.onclick = null;
        this.content.style.height = '20px';
    },
    updatePosition:function(){
        this.pin.style.top = (this.dragValue-10) +'px';
        this.lin.style.top = -((this.dragValue-10)*this.ratio)+'px';
    },
    out:function(e){
        this.listUp = false;
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
        this.listUp = true;
        this.mouseDown = false;
        e.preventDefault(); 
    },
    down:function(e){
        this.listUp = false;
        this.mouseDown = true;
        this.drag(e);
        e.preventDefault();
        e.stopPropagation();
    },
    drag:function(e){
        if(this.mouseDown){
            var rect = this.bg.getBoundingClientRect();
            this.dragValue = (((e.pageY-rect.top)/this.h)*this.valueRange+this.min);//.toFixed(0))*1;
            //this.dragValue = (((e.pageY-rect.top-17)/this.h)*this.valueRange+this.min);//.toFixed(0))*1;
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
        this.sel.onmousedown = null;
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
    this.width = 140;
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
        this.result.style.cssText ='right:25px; text-align:right; width:40px;';

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
// COLOR PICKER
//--------------------

UIsr.Color = function(target, name, callback, value ){

    this.target = target;
    this.content = document.createElement( 'div' );
    this.content.className = 'UIsr-base';
    this.width = 170;
    this.wheelWidth = this.width /10;
    this.callback = callback || function(){};

    this.value = this.pack(value);
    this.color = null;
    this.dragging = false;
    this.isShow = false;
    this.decalLeft = 100;
    this.decal = 22;
    this.radius = (this.width - this.wheelWidth) * 0.5 - 1;
    this.square = Math.floor((this.radius - this.wheelWidth * 0.5) * 0.7) - 1;
    this.mid = Math.floor(this.width * 0.5 );
    this.markerSize = this.wheelWidth * 0.3;

    this.t1 = document.createElement( 'div' );
    this.t1.className = 'UIsr-text';
    this.t1.innerHTML = name+':';
    
    
    this.t2 = document.createElement('div');
    this.t2.className = 'UIsr-text';
    this.t2.style.cssText ='position:absolute; width:'+(this.width)+'px; left:'+this.decalLeft+'px; height:16px; padding-left:10px; font-size:12px; pointer-events:auto; cursor:pointer; font-family:Monospace; ';

    this.c0 = document.createElement('div');
    this.c1 = document.createElement('canvas');
    this.c2 = document.createElement('canvas');

    this.c1.width = this.c1.height = this.width;
    this.c2.width = this.c2.height = this.width;
    
    this.c0.style.cssText = 'position:absolute; width:'+(this.square * 2 - 1)+'px; ' + 'height:'+(this.square * 2 - 1)+'px; ' + 'left:'+((this.mid - this.square)+this.decalLeft)+'px; '+ 'top:'+((this.mid - this.square)+this.decal)+'px;  display:none;';
    this.c1.style.cssText = 'position:absolute; left:'+this.decalLeft+'px;  top:'+this.decal+'px;  display:none;';
    this.c2.style.cssText = 'position:absolute; left:'+this.decalLeft+'px;  top:'+this.decal+'px;  pointer-events:auto; cursor:pointer; display:none;';

    this.ctxMask = this.c1.getContext('2d');
    this.ctxOverlay = this.c2.getContext('2d');
    this.ctxMask.translate(this.mid, this.mid);
    this.ctxOverlay.translate(this.mid, this.mid);

    this.drawCircle();
    this.drawMask();
 
    this.content.appendChild(this.c0);
    this.content.appendChild(this.c1);
    this.content.appendChild(this.c2);
    this.content.appendChild(this.t1);
    this.content.appendChild(this.t2);
    this.target.appendChild( this.content );

    this.updateValue(this.value);
    this.updateDisplay();

    this.t2.onclick = function(e){
        if(!this.isShow)this.show();
        else this.hide();
    }.bind(this);
    //this.init();
}
UIsr.Color.prototype = {
    constructor: UIsr.Color,
    updateDisplay:function(){
        this.invert = (this.rgb[0] * 0.3 + this.rgb[1] * .59 + this.rgb[2] * .11) <= 0.6;
        this.c0.style.background = this.pack(this.HSLToRGB([this.hsl[0], 1, 0.5]));
        this.drawMarkers();
        
        this.value = this.color;
        this.t2.innerHTML = this.hexFormat(this.value);//this.value;
        this.t2.style.background = this.color;
        var cc = this.invert ? '#fff' : '#000';
        this.t2.style.color = cc;
        //this.t2.style.border = '1px solid '+ cc;

        this.callback( this.rgb );
    },
    hide:function(){
        this.isShow = false;
        this.content.style.height = '20px';
        this.c0.style.display = 'none';
        this.c1.style.display = 'none';
        this.c2.style.display = 'none';

        this.c2.onmousedown = null;
    },
    show:function(){
        this.isShow = true;
        this.content.style.height = '194px';
        this.c0.style.display = 'block';
        this.c1.style.display = 'block';
        this.c2.style.display = 'block';

        this.c2.onmousedown = function(e){this.mousedown(e);}.bind(this);
    },
    updateValue:function(e){
        if (this.value && this.value != this.color) {
            this.setColor(this.value);
            this.t2.innerHTML = this.hexFormat(this.value);
        }
    },
    hexFormat:function(v){
        return v.replace("#", "0x");
    },
    setColor:function(color){
        var unpack = this.unpack(color);
        if (this.color != color && unpack) {
            this.color = color;
            this.rgb = unpack;
            this.hsl = this.RGBToHSL(this.rgb);
            this.updateDisplay();
        }
        return this;
    },
    setHSL:function(hsl){
        this.hsl = hsl;
        this.rgb = this.HSLToRGB(hsl);
        this.color = this.pack(this.rgb);
        this.updateDisplay();
        return this;
    },
    calculateMask:function(sizex, sizey, outputPixel){
        var isx = 1 / sizex, isy = 1 / sizey;
        for (var y = 0; y <= sizey; ++y) {
            var l = 1 - y * isy;
            for (var x = 0; x <= sizex; ++x) {
                var s = 1 - x * isx;
                // From sat/lum to alpha and color (grayscale)
                var a = 1 - 2 * Math.min(l * s, (1 - l) * s);
                var c = (a > 0) ? ((2 * l - 1 + a) * .5 / a) : 0;
                outputPixel(x, y, c, a);
            }
        }
    },
    drawMask:function(){
        var size = this.square * 2, sq = this.square;
        // Create half-resolution buffer.
        var sz = Math.floor(size / 2);
        var buffer = document.createElement('canvas');
        buffer.width = buffer.height = sz + 1;
        var ctx = buffer.getContext('2d');
        var frame = ctx.getImageData(0, 0, sz + 1, sz + 1);

        var i = 0;
        this.calculateMask(sz, sz, function (x, y, c, a) {
            frame.data[i++] = frame.data[i++] = frame.data[i++] = c * 255;
            frame.data[i++] = a * 255;
        });

        ctx.putImageData(frame, 0, 0);
        this.ctxMask.drawImage(buffer, 0, 0, sz + 1, sz + 1, -sq, -sq, sq * 2, sq * 2);
    },
    drawCircle:function(){
        var n = 24,r = this.radius, w = this.wheelWidth, nudge = 8 / r / n * Math.PI, m = this.ctxMask, angle1 = 0, color1, d1;
        var x1, x2, y1, y2, ym, am, tan, xm, color2, d2, angle2;
        m.save();
        m.lineWidth = w / r;
        m.scale(r, r);
        // Each segment goes from angle1 to angle2.
        for (var i = 0; i <= n; ++i) {
            d2 = i / n;
            angle2 = d2 * Math.PI * 2;
            // Endpoints
            x1 = Math.sin(angle1);
            y1 = -Math.cos(angle1);
            x2 = Math.sin(angle2);
            y2 = -Math.cos(angle2);
            // Midpoint chosen so that the endpoints are tangent to the circle.
            am = (angle1 + angle2) * 0.5;
            tan = 1 / Math.cos((angle2 - angle1) * 0.5);
            xm = Math.sin(am) * tan, ym = -Math.cos(am) * tan;
            // New color
            color2 = this.pack(this.HSLToRGB([d2, 1, 0.5]));
            if (i > 0) {
                var grad = m.createLinearGradient(x1, y1, x2, y2);
                grad.addColorStop(0, color1);
                grad.addColorStop(1, color2);
                m.strokeStyle = grad;
                // Draw quadratic curve segment.
                m.beginPath();
                m.moveTo(x1, y1);
                m.quadraticCurveTo(xm, ym, x2, y2);
                m.stroke();
            }
            // Prevent seams where curves join.
            angle1 = angle2 - nudge; color1 = color2; d1 = d2;
        }
        m.restore();
    },
    drawMarkers:function(){
        var sz = this.width, lw = Math.ceil(this.markerSize / 4), r = this.markerSize - lw + 1;
        var angle = this.hsl[0] * 6.28,
        x1 =  Math.sin(angle) * this.radius,
        y1 = -Math.cos(angle) * this.radius,
        x2 = 2 * this.square * (.5 - this.hsl[1]),
        y2 = 2 * this.square * (.5 - this.hsl[2]),
        c1 = this.invert ? '#fff' : '#000',
        c2 = this.invert ? '#000' : '#fff';
        var circles = [
            { x: x2, y: y2, r: this.markerSize, c: c1,     lw: lw },
            { x: x2, y: y2, r: r,             c: c2,     lw: lw + 1 },
            { x: x1, y: y1, r: this.markerSize, c: '#fff', lw: lw },
            { x: x1, y: y1, r: r,             c: '#000', lw: lw + 1 },
        ];
        // Update the overlay canvas.
        this.ctxOverlay.clearRect(-this.mid, -this.mid, sz, sz);
        var i = circles.length;
        while(i--){
        //for (var i = 0; i < circles.length; i++) {
            var c = circles[i];
            this.ctxOverlay.lineWidth = c.lw;
            this.ctxOverlay.strokeStyle = c.c;
            this.ctxOverlay.beginPath();
            this.ctxOverlay.arc(c.x, c.y, c.r, 0, Math.PI * 2, true);
            this.ctxOverlay.stroke();
        }
    },
    widgetCoords:function(e){
        return { x: e.pageX - this.offset.left - this.mid, y: e.pageY - this.offset.top - this.mid };
    },
    mousedown:function(e){
        if(!this.dragging){
            this.dragging = true;
            this.c2.onmousemove = function(e){ this.mousemove(e); }.bind(this);
            this.c2.onmouseup = function(e){ this.mouseup(e);}.bind(this);
        }
        this.offset = this.c1.getBoundingClientRect();
        //this.offset = this.content.offset();
        var pos = this.widgetCoords(e);
        this.circleDrag = Math.max(Math.abs(pos.x), Math.abs(pos.y)) > (this.square + 2);
        this.mousemove(e);
        return false;
    },
    mousemove:function(e){
        var pos = this.widgetCoords(e);
        if (this.circleDrag) {
            var hue = Math.atan2(pos.x, -pos.y) / 6.28;
            this.setHSL([(hue + 1) % 1, this.hsl[1], this.hsl[2]]);
        } else {
            var sat = Math.max(0, Math.min(1, -(pos.x / this.square * 0.5) + .5));
            var lum = Math.max(0, Math.min(1, -(pos.y / this.square * 0.5) + .5));
            this.setHSL([this.hsl[0], sat, lum]);
        }
        return false;
    },
    mouseup:function(e){
        this.c2.onmouseup = null;
        this.c2.onmousemove = null;
        this.dragging = false;
    },
    pack:function(rgb){
        var r = Math.round(rgb[0] * 255);
        var g = Math.round(rgb[1] * 255);
        var b = Math.round(rgb[2] * 255);
        return '#' + this.dec2hex(r) + this.dec2hex(g) + this.dec2hex(b);
    },
    u255:function(color, i){
        return parseInt(color.substring(i, i + 2), 16) / 255;
    },
    u16:function(color, i){
        return parseInt(color.substring(i, i + 1), 16) / 15;
    },
    unpack:function(color){
        if (color.length == 7) {
            return [ this.u255(color, 1), this.u255(color, 3), this.u255(color, 5) ];
        }
        else if (color.length == 4) {
            return [ this.u16(color,1), this.u16(color,2), this.u16(color,3) ];
        }
    },
    packDX:function(c, a){
        return '#' + this.dec2hex(a) + this.dec2hex(c) + this.dec2hex(c) + this.dec2hex(c);
    },
    dec2hex:function(x){
        return (x < 16 ? '0' : '') + x.toString(16);
    },
    HSLToRGB:function(hsl){
        var m1, m2, r, g, b;
        var h = hsl[0], s = hsl[1], l = hsl[2];
        m2 = (l <= 0.5) ? l * (s + 1) : l + s - l * s;
        m1 = l * 2 - m2;
        return [ this.hueToRGB(m1, m2, h + 0.33333), this.hueToRGB(m1, m2, h), this.hueToRGB(m1, m2, h - 0.33333) ];
    },
    hueToRGB:function(m1, m2, h){
        h = (h + 1) % 1;
        if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
        if (h * 2 < 1) return m2;
        if (h * 3 < 2) return m1 + (m2 - m1) * (0.66666 - h) * 6;
        return m1;
    },
    RGBToHSL:function(rgb){
        var r = rgb[0], g = rgb[1], b = rgb[2], min = Math.min(r, g, b), max = Math.max(r, g, b), delta = max - min,
        h = 0, s = 0, l = (min + max) / 2;
        if (l > 0 && l < 1) {
            s = delta / (l < 0.5 ? (2 * l) : (2 - 2 * l));
        }
        if (delta > 0) {
            if (max == r && max != g) h += (g - b) / delta;
            if (max == g && max != b) h += (2 + (b - r) / delta);
            if (max == b && max != r) h += (4 + (r - g) / delta);
            h /= 6;
        }
        return [h, s, l];
    },
    clear:function(){
        if(this.isShow) this.hide();
        this.content.removeChild(this.c0);
        this.content.removeChild(this.c1);
        this.content.removeChild(this.c2);
        this.content.removeChild(this.t1);
        this.content.removeChild(this.t2);
        this.target.removeChild( this.content );
        this.t2.onclick = null;

        this.t2 = null;
        this.c0 = null;
        this.c1 = null;
        this.c2 = null;
        this.content = null;
        this.target = null;
    }
}


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
var str = 'box-sizing:border-box; -moz-box-sizing:border-box; -webkit-box-sizing:border-box; font-family:Helvetica, Arial, sans-serif; font-size:12px; color:#e2e2e2;';
UIsr.createClass('UIsr-base', 'width:'+(UIsr.nset.width)+'px; height:20px; position:relative; left:0px; pointer-events:none; background:'+UIsr.nset.fc1+'; margin-bottom:1px;'+str);
UIsr.createClass('UIsr-title', 'width:'+(UIsr.nset.width)+'px; height:30px; position:relative; left:0px; pointer-events:none; padding-top:5px; margin-bottom:1px;'+str);

UIsr.createClass('UIsr-box', 'position:absolute; left:100px; top:3px; width:14px; height:14px; pointer-events:auto; cursor:pointer; border:2px solid rgba(255,255,255,0.4); '+str);
UIsr.createClass('UIsr-text', 'position:absolute; width:80px; height:16px; pointer-events:none; margin-top:2px; padding-left:10px; padding-left:10px; padding-right:5px; padding-top:2px; text-align:Left;'+str);
UIsr.createClass('input.UIsr-number', 'position:absolute; width:80px; height:16px; pointer-events:none; margin-top:2px; padding-left:5px; padding-top:2px; background:rgba(0,0,0,0.2);'+str, true);
UIsr.createClass('input.UIsr-url', 'position:absolute; width:80px; height:16px; pointer-events:none; margin-top:2px; padding-left:4px; padding-top:2px; background:rgba(0,0,0,0.2);'+str, true);
UIsr.createClass('UIsr-textList', 'border:1px solid '+UIsr.nset.fc1+'; background:'+UIsr.nset.fc2+'; left:100px; font-size:12px; position:absolute; cursor:pointer; width:170px; height:16px; pointer-events:auto; margin-top:2px; text-align:center;'+str);
UIsr.createClass('UIsr-textList:hover', 'border:1px solid #FFF;'+str);
UIsr.createClass('UIsr-list', 'border:1px solid #FFF; position:absolute; left:100px; top:17px; width:170px; height:80px; background:#000; overflow:hidden; pointer-events:none; '+str);
UIsr.createClass('UIsr-listInner', 'position:absolute; left:0; top:0; width:170px; background:#060; pointer-events:none;'+str);
UIsr.createClass('UIsr-listItem', 'position:relative; width:170px; height:15px; background:#020; margin-bottom:1px; pointer-events:auto; cursor:pointer;'+str);
UIsr.createClass('UIsr-listItem:hover', 'background:#050; color:#e2e2e2;'+str)
UIsr.createClass('UIsr-listScroll', 'position:absolute; right:0px; background:#000; width:20px; height:80px;cursor:pointer;pointer-events:auto;'+str);
UIsr.createClass('UIsr-listPin', 'position:absolute; right:1px; background:#0F0; width:18px; height:20px; pointer-events:none;'+str);

UIsr.createClass('UIsr-scroll-bg', 'position:absolute; left:100px; top:2px; cursor:w-resize; pointer-events:auto;'+str);
UIsr.createClass('UIsr-scroll-sel', 'position:absolute; pointer-events:none; left:4px; top:4px;'+str);