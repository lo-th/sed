/**   _   _____ _   _ 
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_| 2015
*    @author lo.th / http://lo-th.github.io/labs/
*/


// P2 WORKER

'use strict';
importScripts('libs/p2.min.js');
var sim = null;
var world = null;
var ar = new Float32Array(1000*3);

self.onmessage = function(e) {
    var m = e.data.m || '';
    if(sim == null) sim = new W.Simulation();

    if(m=='add') sim.add(e.data.obj);
    if(m=='addCar') sim.addCar(e.data.obj);
    if(m=='addPlayer') sim.addPlayer(e.data.obj);
    
    //else sim.isOk = true;

    if(m=='run'){
        sim.input = e.data.input;
        sim.run();
        self.postMessage({ ar:ar });
    }
}


var W = {};

W.Simulation = function () {
    this.isOk = false;
    this.input = [];
    this.torque = 0;
    this.car = false;

    this.CG = { WHEELS : 1, CHASSIS : 2, GROUND : 4, OTHER : 8 }

    this.objs = [];
    this.joints = [];
    this.mats = {};

    this.timeStep = 1/60;
    world = new p2.World({gravity : [0,-15]});
    world.defaultContactMaterial.friction = 10;
    //world.solver.iterations = 30;
    world.solver.tolerance = 0.01;
    //world.defaultContactMaterial.friction = 0.5;
    //world.setGlobalStiffness(1e5);
    //this.ground()
    this.mouseBody = new p2.Body();

    this.playerBody = null;
    this.player = false;

    this.mouseConstraint = null;

    this.mats['object'] = new p2.Material();
    this.mats['ground'] = new p2.Material();
    this.mats['player'] = new p2.Material();

    //this.add({type:'plane', pos:[0,-8]})

    var data = [];
    var numDataPoints = 10000;
    for(var i=0; i<numDataPoints; i++){
        data.push((0.5*Math.cos(0.2*i) * Math.sin(0.5*i) + 0.6*Math.sin(0.1*i) * Math.sin(0.05*i))*4);
    }
    this.add({type:'field', pos:[-100,-1], data:data })
}

W.Simulation.prototype = {
    constructor: W.Simulation,
    add : function (obj) {
        obj = obj || {};

        var shape, body;
        var type = obj.type || 'box';
        var mass = obj.mass || 0;
        var pos = obj.pos || [0,0];
        var size = obj.size || [1,1];

        switch(type){
            case 'box' : shape = new p2.Rectangle(size[0],size[1]); break;
            case 'circle' : shape = new p2.Circle(size[0]); break;
            case 'plane' : shape = new p2.Plane(); break;
            case 'field' : 
                shape = new p2.Heightfield(obj.data,{ elementWidth: 1 });
                this.heightfieldShape = shape; 
            break;
        }
        
        body = new p2.Body({ mass:mass, position:pos, angularVelocity:obj.angularVelocity || 0, fixedRotation: obj.fixedRotation || false });//angularDamping
        body.addShape(shape);
        world.addBody(body);

        if(type=='box' || type=='circle'){
            shape.collisionGroup = this.CG.OTHER;
            shape.collisionMask =  this.CG.GROUND | this.CG.WHEELS | this.CG.CHASSIS | this.CG.OTHER;
            shape.material = this.mats.object;
        }else if(type=='field'){
            
            shape.collisionGroup =   this.CG.GROUND;
            shape.collisionMask =    this.CG.WHEELS | this.CG.CHASSIS | this.CG.OTHER;
            shape.material = this.mats.ground;
        }

       //shape.material = new p2.Material();

        if(mass!==0) this.objs.push(body);
    },
    addJoint:function(obj){
        obj = obj || {};
        var joint;
        var type = obj.type || 'distance';
        var body1 = obj.body1;
        var body2 = obj.body2;
        switch(type){
            case 'distance' : joint = new p2.DistanceConstraint(body1, body2,  { distance: dist }); break;
            case 'Revolute' : joint = new p2.RevoluteConstraint(body1, body2,  { worldPivot: this.position, collideConnected:false }); break;
            case 'Prismatic': joint = new p2.PrismaticConstraint(body1, body2, { localAnchorA : [-0.5,-0.3], localAnchorB : [0,0], localAxisA : [0,1], disableRotationalLock : true }); break;
        }
        world.addConstraint(joint);
        this.joints.push(joint);

    },
    removeJoint:function(id){
        var c = this.joints[id];
        world.removeConstraint(c);
        this.joints.splice(this.joints.indexOf(c),1);
    },
    addPlayer:function(obj){
        obj = obj || {};

        var pos = obj.pos || [0,0];
        var size = obj.size || [1,1];

        this.jumpSpeed=10;
        this.walkSpeed=4;
        this.yAxis = p2.vec2.fromValues(0,1);
        this.inJump = false;
        
        var shape = new p2.Rectangle(size[0],size[1]);
        this.playerBody = new p2.Body({ mass: 1, position:obj.pos, fixedRotation: true });
        this.playerBody.addShape(shape);
        world.addBody(this.playerBody);
        shape.material = this.mats.player;
        this.playerBody.damping = 0.5;
        shape.collisionGroup = this.CG.OTHER;
        shape.collisionMask =  this.CG.GROUND | this.CG.WHEELS | this.CG.CHASSIS | this.CG.OTHER;

        this.objs.push(this.playerBody);

        var groundCharacterCM = new p2.ContactMaterial(this.mats.ground, this.mats.player,{ friction : 0.0 });
        var boxCharacterCM = new p2.ContactMaterial(this.mats.object, this.mats.player,{ friction : 0.0 });
        var boxGroundCM = new p2.ContactMaterial(this.mats.object, this.mats.ground,{ friction : 0.6 });
        world.addContactMaterial(groundCharacterCM);
        world.addContactMaterial(boxCharacterCM);
        world.addContactMaterial(boxGroundCM);

        this.player = true;
    },
    upPlayer : function(){
        if(!this.player) return;
        if(this.input[4]>0) this.playerBody.velocity[0] = (this.input[4]+this.input[10])*10;
        if(this.input[4]<0) this.playerBody.velocity[0] = (this.input[4]-this.input[10])*10;
        if(this.input[4]==0) this.playerBody.velocity[0] = 0;

        if(this.input[9] || this.input[3]>0) if(this.checkIfCanJump() && !this.inJump){ 
            this.playerBody.velocity[1] = this.jumpSpeed;
            this.inJump = true;
        } else {
            this.inJump = false;
        }
    },
    checkIfCanJump : function(){
        var result = false;
        for(var i=0; i<world.narrowphase.contactEquations.length; i++){
            var c = world.narrowphase.contactEquations[i];
            if(c.bodyA === this.playerBody || c.bodyB === this.playerBody){
                var d = p2.vec2.dot(c.normalA, this.yAxis); // Normal dot Y-axis
                if(c.bodyA === this.playerBody) d *= -1;
                if(d > 0.5) result = true;
            }
        }
        return result;
    },
    addContactMaterial:function(){
        //var contactMaterial1 = new p2.ContactMaterial(boxShape.material,platformShape1.material,{ surfaceVelocity:-0.5, });
        //world.addContactMaterial(contactMaterial1);
    },
    addMouseJoint:function(body){
        if(this.mouseConstraint!==null) return;
        this.mouseConstraint = new p2.RevoluteConstraint(this.mouseBody, body, { worldPivot: this.position, collideConnected:false });
        world.addConstraint(this.mouseConstraint);
    },
    removeMouseJoint:function(){
        if(this.mouseConstraint==null) return;
        world.removeConstraint(this.mouseConstraint);
        this.mouseConstraint = null;
    },
    addCharacter:function(){
    },
    addCar:function(){
        // Create chassis
        var chassisBody = new p2.Body({ mass : 1, position:[-4,10] }),
            chassisShape = new p2.Rectangle(1,0.5);
        chassisBody.addShape(chassisShape);
        world.addBody(chassisBody);

        // Create wheels
        var wheelBody1 = new p2.Body({ mass : 1, position:[chassisBody.position[0] - 0.5,0.7] }),
            wheelBody2 = new p2.Body({ mass : 1, position:[chassisBody.position[0] + 0.5,0.7] }),
            wheelShape = new p2.Circle(0.3);
        wheelBody1.addShape(wheelShape);
        wheelBody2.addShape(wheelShape);
        world.addBody(wheelBody1);
        world.addBody(wheelBody2);

        wheelShape.collisionGroup =   this.CG.WHEELS; // Assign groups
        chassisShape.collisionGroup =   this.CG.CHASSIS;

        wheelShape.collisionMask =    this.CG.GROUND | this.CG.OTHER;             // Wheels can only collide with ground
        chassisShape.collisionMask =    this.CG.GROUND | this.CG.OTHER;             // Chassis can only collide with ground

        // Constrain wheels to chassis
        var c1 = new p2.PrismaticConstraint(chassisBody,wheelBody1,{
            localAnchorA : [-0.5,-0.3],
            localAnchorB : [0,0],
            localAxisA : [0,1],
            disableRotationalLock : true,
        });
        var c2 = new p2.PrismaticConstraint(chassisBody,wheelBody2,{
            localAnchorA : [ 0.5,-0.3],
            localAnchorB : [0,0],
            localAxisA : [0,1],
            disableRotationalLock : true,
        });
        c1.setLimits(-0.4, 0.2);
        c2.setLimits(-0.4, 0.2);
        world.addConstraint(c1);
        world.addConstraint(c2);

        // Add springs for the suspension
        var stiffness = 100,
            damping = 5,
            restLength = 0.5;
        // Left spring
        world.addSpring(new p2.LinearSpring(chassisBody, wheelBody1, {
            restLength : restLength,
            stiffness : stiffness,
            damping : damping,
            localAnchorA : [-0.5,0],
            localAnchorB : [0,0],
        }));
        // Right spring
        world.addSpring(new p2.LinearSpring(chassisBody, wheelBody2, {
            restLength : restLength,
            stiffness : stiffness,
            damping : damping,
            localAnchorA : [0.5,0],
            localAnchorB : [0,0],
        }));

        

        // Apply current engine torque after each step
        this.torque = 0;
        this.wheelBody1 = wheelBody1;
        this.wheelBody2 = wheelBody2;
        this.chassisBody = chassisBody;

        this.objs.push(this.chassisBody);
        this.objs.push(this.wheelBody1);
        this.objs.push(this.wheelBody2);

        this.car = true;

        //world.on("addBody",function(e){ e.body.setDensity(1); });
    },
    upCar : function(){
        if(!this.car) return;
        if(this.input[4]>0) this.torque = (this.input[4]+this.input[10])*10;
        else if(this.input[4]<0) this.torque = (this.input[4]-this.input[10])*10;
        else this.torque = 0;


        this.wheelBody1.angularForce -= this.torque;
        this.wheelBody2.angularForce -= this.torque;
    },
    clear : function(){
       // world.clear();
    },
    run:function(){

        this.position = [this.input[1], this.input[2]];
        this.mouseBody.position[0] = this.input[1];
        this.mouseBody.position[1] = this.input[2];

        if(this.input[0]){
            var hitBodies = world.hitTest(this.position, this.objs);
            if(hitBodies.length){
                this.addMouseJoint(hitBodies[0])
            }
        } else {
            this.removeMouseJoint();
        }

        //world.step(1)

        world.step(this.timeStep);

        var i = this.objs.length, id;
        while(i--){
            id = i*3;
            ar[id] = this.objs[i].position[0].toFixed(3)*1;
            ar[id+1] = this.objs[i].position[1].toFixed(3)*1;
            ar[id+2] = this.objs[i].angle.toFixed(3)*1;
        }


        this.upCar();
        this.upPlayer();

    }
}