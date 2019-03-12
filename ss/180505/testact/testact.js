"use strict"
var Testact=(function(){
	var ret={};
	var HEIGHT=540,WIDTH=960;
	var PI=Math.PI;
	var OBJSLENGTH=1024;
	var gl;
	var onoPhy=null;
	var objs=[];
	var sky=null;
	var envtexes=null;
	var shadowTexture;
	var bufTexture;
	var emiTexture;
	var customTextures=[];
	var customBumps=[];
	var bdf;
	var bdfimage=null;
	var bane= null;
	var soundbuffer=null;
	var tsukamiZ=100;

	var obj3d=null,field=null;
	var goField,goCamera;

	var i;
	var pad =new Vec2();

	var txt="STAGE CLEAR!!";
	var txt2="ALL CLEAR!!";
	var objMan;
	var goMain;


	var ObjMan= (function(){
		var STAT_EMPTY=0
			,STAT_ENABLE=1
			,STAT_CREATE=2
		;
		var ObjMan=function(){
			this.objs= []; 
			this.pool= []; 
			this.id=0;
		}
		var ret = ObjMan;

		ret.Obj = (function(){
			var Obj = function(){
				this.p=new Vec3();
				this.scale=new Vec3();
				this.rotq = new Vec4();
				this.v=new Vec3();
				this.a=new Vec3();
				this.stat=STAT_EMPTY;
				this.type=0;
				this.hp=1;
				this.t=0;
				this.hitareas=[];
				this.matrix=new Mat43();
				this.phyObjs = [];
			}
			var ret = Obj;

			return ret;
		})();
		var Obj = ret.Obj;

		ret.prototype.createObj = function(c){
			if(!c){
				c=defObj;
			}
			if(this.pool.length==0){
				for(var i=0;i<16;i++){
					this.pool.push(new Obj());
				}
			}
			var obj = this.pool[this.pool.length-1];
			if(obj.stat<0){
				for(var i=0;i<16;i++){
					this.pool.push(new Obj());
				}
			}
			var obj = this.pool.pop();
			this.objs.push(obj);
			if(this.objs.length>1024){
				alert("objs>1024!");
			}

			Mat43.setInit(obj.matrix);
			obj.parent=null;
			Vec3.set(obj.scale,1,1,1);
			obj.angle=0;
			obj.t=0;
			obj.hp=1;
			obj.stat=STAT_CREATE;
			obj.pattern=0;
			obj.frame=0;
			obj.pos2=new Vec3();
			obj.phyObjs = [];
			obj.func=c;

			obj.id=this.id;

			obj.__proto__=c.prototype;

			obj.init();

			this.id++;
			return obj;
			
		}
		ret.prototype.deleteObj=function(obj){
			for(var i=0;i<this.objs.length;i++){
				if(obj === this.objs[i]){
					obj.stat=-10;
					this.pool.unshift(objs[i]);
					objs.splice(i,1);
					break;
				}
			}
		}
		ret.prototype.update=function(){
			objs = this.objs;
			for(var i=0;i<this.objs.length;i++){

				if(objs[i].stat===STAT_CREATE){
					objs[i].stat=STAT_ENABLE;
				}

				if(objs[i].stat===STAT_ENABLE){
					objs[i].t++;
					objs[i].frame++;
				}
			}
			for(var i=0;i<this.pool.length;i++){
				if(this.pool[i].stat<0){
					this.pool[i].stat++;
				}else{
					break;
				}
			}

		}
		
		ret.prototype.move=function(){
			var objs = this.objs;
			for(i=0;i<objs.length;i++){
				if(objs[i].stat!==STAT_ENABLE)continue;
				objs[i].move();
			}
		}

		
		return ret;
	})();
	

	var defObj = (function(){
		var defObj = function(){};
		var ret = defObj;
		ret.prototype.init=function(){};
		ret.prototype.move=function(){};
		ret.prototype.draw=function(){};
		ret.prototype.hit=function(){};
		ret.prototype.delete=function(){};
		ret.prototype.drawhud=function(){};
		return ret;
	})();

	var stage =0;
	var stages=[
		"f1.o3o"
		,"f2.o3o"
		,"f3.o3o"
		,"f4.o3o"
		,"f5.o3o"
	]
	var GoMain = (function(){
		var GoMain=function(){};
		var ret = GoMain;
		inherits(ret,defObj);
		ret.prototype.init=function(){

			bdf = Bdf.load("./k8x12.bdf",null,function(){
				bdfimage = Bdf.render(txt+"\n"+txt2,bdf,false);
				bdfimage.gltexture = Rastgl.createTexture(bdfimage);//512x512

				gl.bindTexture(gl.TEXTURE_2D,bdfimage.gltexture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);//1024x1024
				gl.viewport(0,0,1024,1024);
				gl.clearColor(.8,0.2,0.6,0.0);
				gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
				gl.enable(gl.BLEND);
				gl.blendFuncSeparate(gl.ZERO,gl.ONE,gl.ONE,gl.ONE);
				var scl=2;//1;//1/8;
				var ss=1/512;
				for(var i=0;i<3;i++){
					for(var j=0;j<3;j++){
						Rastgl.copyframe(bdfimage.gltexture,-ss*i,-ss*j,scl,scl);
					}
				}
				gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE);
				gl.enable(gl.BLEND);
				gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE);
				Rastgl.copyframe(bdfimage.gltexture,-1*ss,-1*ss,scl,scl);
				gl.bindTexture(gl.TEXTURE_2D,bdfimage.gltexture);
				gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,512,512);

			});

			stage=-1;
			GoMain.prototype.next.call(this);
		
		}
		ret.prototype.next = function(){
			stage++;
			if(stages.length<=stage){
				return;
			}

			for(var i=objMan.objs.length;i--;){
				if(this == objMan.objs[i])continue;
				objMan.deleteObj(objMan.objs[i]);
			}
			fieldpath=stages[stage];
			if(globalParam.stage){
				fieldpath=globalParam.stage;
			}


			onoPhy.init();
			goField=objMan.createObj(GoField);
			goCamera = objMan.createObj(GoCamera);

		}
		ret.prototype.delete=function(){
		}
		
		return ret;

	})();

	var blit = function(tex,x,y,w,h,u,v,u2,v2){
			Rastgl.copyframe(tex.gltexture,x,y,w*2,h*2
							,u/tex.width,(v+v2)/tex.height,u2/tex.width,-v2/tex.height);
	}
	var GoMsg = (function(){
		var GoMsg=function(){};
		var ret = GoMsg;
		inherits(ret,defObj);
		ret.prototype.init=function(){
		}
		ret.prototype.move=function(){
			if(this.t>60){
				GoMain.prototype.next.call(goMain);
			}
		}
		ret.prototype.drawhud = function(){
			if(bdfimage){
				var width=txt.length*4;
				var height=12+1;
				var scale=4;
				gl.enable(gl.BLEND);
				gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE);
				blit(bdfimage,0,0,scale*width/WIDTH,scale*height/(WIDTH*ono3d.persy/ono3d.persx)
							,0,0,width,height);
			}
		}
		return ret;
	})();
	
	var GoMsg2 = (function(){
		var GoMsg2=function(){};
		var ret = GoMsg2;
		inherits(ret,defObj);
		ret.prototype.init=function(){
		}
		ret.prototype.move=function(){
			if(this.t>60){
			}
		}
		ret.prototype.drawhud = function(){
			if(bdfimage){
				var width=txt2.length*4;
				var height=12+1;
				var scale=4;
				gl.enable(gl.BLEND);
				gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE);

				blit(bdfimage,0,0,scale*width/WIDTH,scale*height/(WIDTH*ono3d.persy/ono3d.persx)
							,0,height,width,height);
			}
		}
		return ret;
	})();
	var GoCamera= (function(){
		var GoCamera=function(){};
		var ret = GoCamera;
		inherits(ret,defObj);
		ret.prototype.init=function(){
		}
		ret.prototype.move=function(){
			if(!mobj){
				return;
			}

			var v3 = Vec3.poolAlloc();
			Vec3.set(v3,0,6,1);
			Mat43.dotVec3(v3,mobj.phyObjs[0].matrix,v3);
			Vec3.sub(v3,v3,this.p);
			Vec3.madd(this.p,this.p,v3,0.02);


			Vec3.poolFree(1);
			//onoPhy.collider.hitcheck(Collider.SPHERE,this.p);
			Vec3.sub(this.p,this.p,mobj.p);
			Vec3.norm(this.p);
			Vec3.madd(this.p,mobj.p,this.p,6);


			camera.p[0]+=(this.p[0]-camera.p[0])*0.1
			camera.p[1]+=(this.p[1]-camera.p[1])*0.1
			camera.p[2]+=(this.p[2]-camera.p[2])*0.1
			var vec3=Vec3.poolAlloc();
			Vec3.copy(vec3,mobj.p);
			homingCamera(this.a,vec3,this.p);
			var nangle=function(a){
				if(a>Math.PI){a-=Math.PI*2};
				if(a<-Math.PI){a+=Math.PI*2};
				return a;
			}
			for(var i=0;i<3;i++){
				this.a[i]=nangle(this.a[i]);
				camera.a[i]=nangle(camera.a[i]);
			}
			camera.a[0] +=nangle(this.a[0]-camera.a[0])*0.1;
			camera.a[1] +=nangle(this.a[1]-camera.a[1])*0.1;
			camera.a[2] +=nangle(this.a[2]-camera.a[2])*0.1;


			if(ono3d.lightSources.length>1){
				var light = ono3d.lightSources[1];
				Vec3.copy(vec3,light.angle);
				Vec3.norm(vec3);
				Vec3.madd(light.pos,mobj.p,vec3,-10);
			}
			Vec3.poolFree(1);
		}
		ret.prototype.draw=function(){
		}
		return ret;
	})();

	var homingCamera=function(angle,target,camera){
		var dx=target[0]-camera[0]
		var dy=target[1]-camera[1]
		var dz=target[2]-camera[2]
		angle[0]=Math.atan2(dy,Math.sqrt(dz*dz+dx*dx));
		angle[1]=Math.atan2(dx,dz);
		angle[2]=0;
		
	}
	var fieldpath="f1.o3o";
	var reset=function(){
		var o3o = field;
		ono3d.setTargetMatrix(0);
		ono3d.loadIdentity();
		ono3d.rotate(-PI*0.5,1,0,0) //blenderはzが上なのでyが上になるように補正

		var start = o3o.objectsN["_start"];
		Mat44.dotVec3(mobj.p,ono3d.worldMatrix,start.location);
		var m = Mat44.poolAlloc();
		Mat44.setInit(m);
		Mat44.dotMat43(m,m,start.matrix);
		Mat44.dot(m,ono3d.worldMatrix,m);
		Vec4.fromMat44(mobj.rotq,m);

		Mat44.poolFree(1);

		if(mobj.phyObjs.length){
			Vec3.copy(mobj.phyObjs[0].location,mobj.p);
		}

		Vec3.set(goCamera.p,0,6,2)
		var start = o3o.objectsN["_start"];
		Mat43.dotVec3(goCamera.p,start.matrix,goCamera.p);
		Mat44.dotVec3(goCamera.p,ono3d.worldMatrix,goCamera.p);

	}
	var GoField= (function(){
		var GoField =function(){};
		var ret = GoField;
		inherits(ret,defObj);
		ret.prototype.init=function(){
			var t = this;

			field =O3o.load(fieldpath,function(o3o){

				ono3d.setTargetMatrix(0);
				ono3d.loadIdentity();
				ono3d.rotate(-PI*0.5,1,0,0) //blenderはzが上なのでyが上になるように補正

				//物理シミュオブジェクトの設定
				t.phyObjs= O3o.createPhyObjs(o3o.scenes[0],onoPhy);

				ono3d.push();
				mobj=objMan.createObj(GoJiki);
				ono3d.pop();

				reset();
				Vec3.copy(camera.p,goCamera.p)

				Vec3.set(camera.a,0,PI,0)

				var m43 = Mat43.poolAlloc();
				var goalobj = o3o.objectsN["_goal"];
				var goal= onoPhy.collider.createCollision(Collider.SPHERE);
				Mat43.dotMat44Mat43(m43,ono3d.worldMatrix,goalobj.mixedmatrix);
				Mat43.toLSR(goal.location,goal.scale,goal.rotq,m43);
				goal.groups=2;
				goal.bold=1;
				goal.name="goal";
				goal.callbackFunc=function(col1,col2,pos1,pos2){
					if(!col2.parent)return;
					if(col2.parent.name!=="jiki"){
						return;
					}
					onoPhy.collider.deleteCollision(col1);
					if(stage<stages.length-1){
						objMan.createObj(GoMsg);
					}else{
						objMan.createObj(GoMsg2);
					}
				}
				var borderObj= o3o.objectsN["_border"];
				var collision= onoPhy.collider.createCollision(Collider.CUBOID);
				Mat44.dotVec3(collision.location,ono3d.worldMatrix,borderObj.location);
				Vec3.copy(collision.scale,borderObj.scale);
				var m = Mat44.poolAlloc();
				Mat44.setInit(m);
				Mat44.dotMat43(m,m,borderObj.matrix);
				Mat44.dot(m,ono3d.worldMatrix,m);
				Vec4.fromMat44(collision.rotq,m);
				collision.groups=2;
				collision.bold=0;
				collision.name="border";
				Mat44.poolFree(1);

				var light=null;
				ono3d.lightSources.splice(0,ono3d.lightSources.length);

				light = new ono3d.LightSource();
				ono3d.lightSources.push(light);
				light.type =Ono3d.LT_AMBIENT;
				Vec3.set(light.color,0.4,0.4,0.4);

				var scene = o3o.scenes[0];
				for(var i=0;i<scene.objects.length;i++){
					var object = scene.objects[i];
					if(object.type!=="LAMP")continue;
					var ol = object.data;
					light = new ono3d.LightSource();
					ono3d.lightSources.push(light);
					if(ol.type==="SUN"){
						light.type = Ono3d.LT_DIRECTION;
					}else{
						light.type = Ono3d.LT_AMBIENT;
					}

					Vec3.set(light.angle,0,0,-1);
					var m=Mat43.poolAlloc();
					Mat43.fromLSE(m,object.location,object.scale,object.rotation);
					Mat43.dotMat33Vec3(light.angle,m,light.angle);
					Mat44.dotMat33Vec3(light.angle,ono3d.worldMatrix,light.angle);

					Vec3.set(light.pos,0,0,0);
					Mat43.dotVec3(light.pos,m,light.pos);
					Mat44.dotVec3(light.pos,ono3d.worldMatrix,light.pos);
					light.power=1;
					Vec3.copy(light.color,ol.color);
					Vec3.norm(light.angle)

					Mat43.poolFree(1);
				}

				Mat43.poolFree(1);

			});
		}
		ret.prototype.move=function(){
			var obj3d=field;
			var obj = this;
			var phyObjs = obj.phyObjs;
			if(obj3d.scenes.length===0){
				return;
			}
			
			 //変換マトリクス初期化
			ono3d.setTargetMatrix(0);
			ono3d.loadIdentity();
			ono3d.rotate(-PI*0.5,1,0,0) //blenderはzが上なのでyが上になるように補正

			var scene= obj3d.scenes[0];
			O3o.setFrame(obj3d,scene,this.t/60.0*24); //アニメーション処理

			if(phyObjs && globalParam.physics){
				//物理シミュ有効の場合は物理オブジェクトにアニメーション結果を反映させる
				for(var i=0;i<scene.objects.length;i++){
					//物理オブジェクトにアニメーション結果を反映
					//(前回の物理シミュ無効の場合は強制反映する)
					if(scene.objects[i].phyObj){
						O3o.movePhyObj(scene.objects[i]
							,1.0/globalParam.fps
							,!globalParam.physics_);
					}
				}
			}

			for(var i=0;i<phyObjs.length;i++){
				var phyObj = phyObjs[i];
				var aabb;
				if(phyObj.type===OnoPhy.CLOTH){
					aabb = phyObj.AABB;
				}else{
					aabb = phyObj.collision.AABB;
				}
				if(aabb.max[1]<-10){
					O3o.movePhyObj(phyObj.parent,0,phyObj,true);
				}
			}
		}
		var scope=[
			[-1,-1,0]
			,[-1,1,0]
			,[1,1,0]
			,[1,-1,0]
			,[-2,-2,-10]
			,[-1,1,1]
			,[1,1,1]
			,[1,-1,1]
		];
		ret.prototype.draw=function(){
			var obj3d=field;
			var obj = this;
			var phyObjs = obj.phyObjs;

			ono3d.setTargetMatrix(0)
			ono3d.loadIdentity();
			ono3d.rotate(-PI*0.5,1,0,0)

			ono3d.rf=0;

			var v=Vec4.poolAlloc();
			var im = Mat44.poolAlloc();
			Mat44.getInv(im,ono3d.projectionMat);
			Vec3.copy(v,scope[0]);
			v[3]=1;
			Mat44.dotVec4(v,im,v);
			Vec3.copy(v,scope[4]);
			v[3]=1;
			Mat44.dotVec4(v,ono3d.projectionMat,v);
			Vec4.poolFree(1);
			Mat44.poolFree(1);
			camera.p;

			if(obj3d){
				if(obj3d.scenes.length>0){
					var objects = obj3d.scenes[0].objects;
					for(var i=0;i<objects.length;i++){
						if(objects[i].hide_render){
							continue;
						}
						if(globalParam.physics){
							O3o.drawObject(objects[i],phyObjs);
						}else{
							O3o.drawObject(objects[i],null);
						}
					}
				}
//
			}
		}
		return ret;
	})();

	var sourceArmature=null;
	var referenceArmature=null;
	var motionT=0;


	var assetload = function(obj3d,path,func){
		if(obj3d){
			func(obj3d);
			return obj3d;
		}
		return O3o.load(path,func);

	}

	var groundNormal = new Vec3();
	var groundVelocity = new Vec3();
	var GoJiki = (function(){
		var GoJiki =function(){
		};
		var ret = GoJiki;
		inherits(ret,defObj);

		ret.prototype.init = function(){
			var obj = this;

			var t=this;
			obj3d = assetload(obj3d,"human.o3o",function(obj3d){
				var o3o= obj3d;
				for(var i=0;i<obj3d.objects.length;i++){
					var object=obj3d.objects[i];
				}

				sourceArmature= new O3o.PoseArmature(obj3d.objectsN["アーマチュア"].data);
				referenceArmature= new O3o.PoseArmature(obj3d.objectsN["アーマチュア"].data);

				ono3d.setTargetMatrix(0);
				ono3d.loadIdentity();
				ono3d.rotate(-PI*0.5,1,0,0) //blenderはzが上なのでyが上になるように補正
				ono3d.translate(obj.p[0],obj.p[1],obj.p[2]);
				t.phyObjs= O3o.createPhyObjs(o3o.scenes[0],onoPhy);
				var phyObj = t.phyObjs[0];
				Vec3.copy(phyObj.location,t.p);
				Mat33.set(phyObj.inertiaTensorBase,1,0,0,0,1,0,0,0,1);
				Mat33.mul(phyObj.inertiaTensorBase,phyObj.inertiaTensorBase,99999999);

				phyObj.collision.groups|=3;
				phyObj.collision.callbackFunc=function(col1,col2,pos1,pos2){
					if(col2.name==="border"){
						reset();
						return;
					}
					if(!col2.parent){
						return;
					}
					var vec3 = Vec3.poolAlloc();
					Vec3.sub(vec3,pos2,pos1);
					Vec3.norm(vec3);
					if(vec3[1]>0.8){
						mobj.ground=true;//接地フラグ
						Vec3.copy(groundNormal,vec3);//接触点角度
						//接触点速度
						var phyObj = col2.parent;
						phyObj.calcVelocity(groundVelocity,pos1);

					}
					Vec3.poolFree(1);
				};
			});
			Vec4.fromRotVector(this.rotq,-Math.PI*0.5,1,0,0);
		}
		ret.prototype.move=function(){
			var obj = this;
			if(obj3d.scenes.length===0){
				return;
			}
			var phyObj = this.phyObjs[0];
			Vec3.copy(this.p,phyObj.location);

			var vec = Vec3.poolAlloc();
			var mat43 = Mat43.poolAlloc();
			vec[0]=pad[0];
			vec[2]=pad[1];
			vec[1]=0;
			var l = Vec3.scalar(vec);
			Mat43.fromRotVector(mat43,camera.a[1]-Math.PI,0,1,0)
			Mat43.dotVec3(vec,mat43,vec);

			if(vec[0]*vec[0] + vec[2]*vec[2]){
				var r = Math.atan2(vec[0],vec[2]);
				var q = Vec4.poolAlloc();
				Vec4.fromRotVector(this.rotq,-Math.PI*0.5,1,0,0);
				Vec4.fromRotVector(q,r,0,1,0);
				Vec4.qdot(this.rotq,q,this.rotq);
				Vec4.poolFree(1);
			}
			Vec4.copy(phyObj.rotq,this.rotq);

			var v2 = Vec3.poolAlloc();
			if(this.ground){
				Vec3.cross(vec,groundNormal,vec);
				Vec3.cross(vec,vec,groundNormal);
				Vec3.norm(vec);

				Vec3.mul(vec,vec,4*l);
				Vec3.sub(v2,phyObj.v,groundVelocity);
				Vec3.sub(v2,vec,v2);
				Vec3.mul(vec,v2,0.1);


			}else{
				Vec3.mul(vec,vec,0.05);
				//vec[0]=0;
				//vec[1]=0;
				//vec[2]=0;
			}
			Vec3.poolFree(1);
			vec[1]=0;

			if(Util.keyflag[4]==1 && !Util.keyflagOld[4] && this.ground){
				vec[1]=6;
			}
			Vec3.add(phyObj.v,phyObj.v,vec);

			Mat43.poolFree(1);
			Vec3.poolFree(1);

			this.ground=false;//接地フラグ
		}
		ret.prototype.draw=function(){

			ono3d.setTargetMatrix(0)
			ono3d.loadIdentity();
			ono3d.rotate(-PI*0.5,1,0,0)

			ono3d.rf=0;
			ono3d.lineWidth=1.2;
			ono3d.rf|=Ono3d.RF_OUTLINE;
			if(obj3d.scenes.length){
				var phyObj = this.phyObjs[0];

				var oldT = motionT/1000;
				var l = phyObj.v[0]*phyObj.v[0] + phyObj.v[2]*phyObj.v[2];
				if(l>0.1 && this.ground){
					motionT+=16;
				}	
				var T = motionT/1000;
				var d = (T|0) - (oldT|0);

				var dst = obj3d.objectsN["アーマチュア"].poseArmature;
				sourceArmature.reset();
				referenceArmature.reset();

				sourceArmature.setAction(obj3d.actions[1],motionT/1000.0*24);
				referenceArmature.setAction(obj3d.actions[2],motionT/1000.0*24);
			
				var vec4 = Vec4.poolAlloc();
				var vec3 = Vec3.poolAlloc();
				Vec4.qmul(vec4,phyObj.rotq,-1);
				if(mobj.ground){
					Vec3.sub(vec3,phyObj.v,groundVelocity);
					Vec4.rotVec3(vec3,vec4,vec3);
				}



				dst.setAction(obj3d.actions[0],0);
				O3o.PoseArmature.sub(sourceArmature,sourceArmature,dst);
				O3o.PoseArmature.sub(referenceArmature,referenceArmature,dst);
				O3o.PoseArmature.mul(sourceArmature,sourceArmature,vec3[1]*0.3);
				O3o.PoseArmature.mul(referenceArmature,referenceArmature,vec3[0]*0.3);
				O3o.PoseArmature.add(dst,referenceArmature,dst);
				O3o.PoseArmature.add(dst,sourceArmature,dst);

				Vec3.poolFree(1);
				Vec4.poolFree(1);

				ono3d.loadIdentity();
				var m = Mat43.poolAlloc();
				Mat43.fromLSR(m,phyObj.location,phyObj.scale,phyObj.rotq);
				Mat44.dotMat43(ono3d.worldMatrix,ono3d.worldMatrix,m);


				var e =obj3d.objectsN["jiki"];
				Mat43.getInv(m,e.mixedmatrix);
				Mat44.dotMat43(ono3d.worldMatrix,ono3d.worldMatrix,m);
				O3o.drawObject(obj3d.objectsN["human"]);
				Mat43.poolFree(1);

			}
		}
		return ret;
		//return defObj(obj,msg,param);
	})();
		var url=location.search.substring(1,location.search.length)
		globalParam.outlineWidth=0;
		globalParam.outlineColor="000000";
		globalParam.lightColor1="808080";
		globalParam.lightColor2="808080";;
		globalParam.lightThreshold1=0.;
		globalParam.lightThreshold2=1.;
		globalParam.physics=1;
		globalParam.physics_=0;
		globalParam.smoothing=0;
		globalParam.stereomode=0;
		globalParam.stereoVolume=1;
		globalParam.step=1;
		globalParam.fps=60;
		globalParam.scene=0;
		globalParam.shadow=1;
		globalParam.hdr=1;
		globalParam.model="./field.o3o";
		globalParam.materialMode = false;
		globalParam.cColor= "ffffff";
		globalParam.cReflection= 0;
		globalParam.cReflectionColor= "ffffff";
		globalParam.cRoughness= 0;
		globalParam.frenel = 0;
		globalParam.cAlpha= 1.0;
		globalParam.cRefraction = 1.1;
		globalParam.cNormal= 1.0;
		globalParam.cEmi= 0.0;
		
		globalParam.source=0;
		globalParam.target=0;
		globalParam.reference=0;
		globalParam.actionAlpha=0;

		var args=url.split("&")

		for(i=args.length;i--;){
			var arg=args[i].split("=")
			if(arg.length >1){
				if(!isNaN(arg[1]) && arg[1]!=""){
					if(arg[1].length>1 && arg[1].indexOf(0) =="0"){
						globalParam[arg[0]] = arg[1]
					}else{
						globalParam[arg[0]] = +arg[1]
					}
				}else{
					globalParam[arg[0]] = arg[1]
				}
			}
		}
	
	var mobj = null;

	
	var camera;
	var camerazoom=0.577;
	var span;
	var oldTime = 0;
	var mseccount=0;
	var framecount=0;
	var inittime=0;
	var timer=0;
	var mainloop=function(){
		var nowTime = Date.now()
		timer=nowTime-inittime;
		
		var obj;

		pad[0] = Util.padX + (Util.keyflag[2] || Util.keyflag[10])-(Util.keyflag[0] || Util.keyflag[8]);
		pad[1] = Util.padY + (Util.keyflag[3] || Util.keyflag[11])-(Util.keyflag[1] || Util.keyflag[9]);
		var l = Vec2.scalar(pad);
		if(l>1){
			Vec2.norm(pad);
		}
		

		var i;
		objMan.update();

		objMan.move();
		var phytime=0;
		if(globalParam.physics){
			for(var i=0;i<globalParam.step;i++){
				var s=Date.now();
				onoPhy.calc(1.0/globalParam.fps/globalParam.step);
				phytime=Date.now()-s;
			}
			globalParam.physics_=1;
		}



		ono3d.setTargetMatrix(1)
		ono3d.loadIdentity()
		//ono3d.scale(camerazoom,camerazoom,1)
		ono3d.rotate(-camera.a[2],0,0,1)
		ono3d.rotate(-camera.a[0],1,0,0)
		ono3d.rotate(-camera.a[1]+Math.PI,0,1,0)
		ono3d.translate(-camera.p[0],-camera.p[1],-camera.p[2])
		ono3d.setAov(camerazoom);

		var cursorr = new Vec2();
		cursorr[0] =Util.cursorX/WIDTH*2-1;
		cursorr[1] =Util.cursorY/HEIGHT*2-1;
		if(globalParam.stereomode!=0){
			cursorr[0]*=2;
			if(cursorr[0]<0){
				cursorr[0]+=1;

				ono3d.projectionMat[12]=globalParam.stereo;
				Mat44.dot(ono3d.pvMat,ono3d.projectionMat,ono3d.viewMatrix);
			}else{
				cursorr[0]-=1;
			}
		}

		ono3d.rf=0;
		ono3d.lineWidth=1.0;
		ono3d.smoothing=globalParam.smoothing;

		//var light=ono3d.lightSources[0];
		//Util.hex2rgb(light.color,globalParam.lightColor1);

		//light=ono3d.lightSources[1];
		//Util.hex2rgb(light.color,globalParam.lightColor2);

		ono3d.lightThreshold1=globalParam.lightThreshold1;
		ono3d.lightThreshold2=globalParam.lightThreshold2;

	
		var cMat = O3o.customMaterial;
		var a=new Vec3();
		Util.hex2rgb(a,globalParam.cColor);
		cMat.r=a[0];
		cMat.g=a[1];
		cMat.b=a[2];
		cMat.a=globalParam.cAlpha;
		cMat.emt=globalParam.cEmi;
		cMat.reflect=globalParam.cReflection;
		cMat.refract=globalParam.cRefraction;
		cMat.rough=globalParam.cRoughness;
		Util.hex2rgb(cMat.reflectionColor,globalParam.cReflectionColor);
		cMat.texture=globalParam.cRoughness;
		cMat.texture_slots=[];
		if(globalParam.cTexture>=0){
			var texture_slot = new O3o.Texture_slot();

			cMat.texture_slots.push(texture_slot);
			texture_slot.texture = customTextures[globalParam.cTexture];
		}
		if(globalParam.cBump>=0){
			var texture_slot = new O3o.Texture_slot();

			cMat.texture_slots.push(texture_slot);
			texture_slot.texture = customBumps[globalParam.cBump];
			texture_slot.normal= globalParam.cNormal;
		}

		O3o.useCustomMaterial = globalParam.cMaterial;

		var start = Date.now();

		for(i=0;i<objMan.objs.length;i++){
			obj = objMan.objs[i];
			ono3d.setTargetMatrix(1)
			ono3d.push();
			ono3d.setTargetMatrix(0)
			ono3d.loadIdentity()
			ono3d.rf=0;
			obj.draw();
			ono3d.setTargetMatrix(1)
			ono3d.pop();
		}
		var drawgeometry=Date.now()-start;

		start=Date.now();
//シャドウマップ描画
		gl.bindFramebuffer(gl.FRAMEBUFFER,Rastgl.frameBuffer);
		gl.viewport(0,0,1024,1024);
		gl.depthMask(true);
		gl.clearColor(1., 1., 1.,1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		if(globalParam.shadow){
			gl.enable(gl.DEPTH_TEST);
			
			ono3d.setOrtho(20.0,20.0,1.0,20.0)
			var lightSource = ono3d.lightSources.find(
				function(a){return a.type===Rastgl.LT_DIRECTION;});
			if(lightSource){
				Mat44.setInit(lightSource.matrix);
				Mat44.getRotVector(lightSource.matrix,lightSource.angle);
				var mat44 = Mat44.poolAlloc();
				Mat44.setInit(mat44);
				mat44[12]=-lightSource.pos[0]
				mat44[13]=-lightSource.pos[1]
				mat44[14]=-lightSource.pos[2]

				Mat44.dot(mat44,lightSource.matrix,mat44);
				Mat44.dot(ono3d.pvMat,ono3d.projectionMat,mat44);
				Mat44.copy(lightSource.matrix,ono3d.pvMat);
				Mat44.poolFree(1);
				
				Shadow.draw(ono3d);
			}
		}
		gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
		gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,1024,1024);
		
		globalParam.stereo=-globalParam.stereoVolume * globalParam.stereomode*0.4;

//遠景描画
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		gl.depthMask(true);
		gl.viewport(0,0,1024,1024);
		gl.clearColor(0.0,0.0,0.0,0.0);
		gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
		gl.depthMask(false);
		gl.colorMask(true,true,true,true);
		gl.disable(gl.BLEND);
		if(sky.gltexture){
			if(globalParam.stereomode==0){
				ono3d.setPers(0.577,HEIGHT/WIDTH,1,20);
				gl.viewport(0,0,WIDTH,HEIGHT);
				Env.env(envtexes[1]);
			}else{
				ono3d.setPers(0.577,HEIGHT/WIDTH*2,1,20);
				gl.viewport(0,0,WIDTH/2,HEIGHT);
				Env.env(envtexes[1]);
				gl.viewport(WIDTH/2,0,WIDTH/2,HEIGHT);
				Env.env(envtexes[1]);
				
			}
		}

		gl.viewport(0,0,WIDTH,HEIGHT);
//オブジェクト描画
		gl.depthMask(true);
		gl.enable(gl.DEPTH_TEST);
		ono3d.setViewport(0,0,WIDTH,HEIGHT);

		if(envtexes){
			MainShader.draw(ono3d,shadowTexture,envtexes,camera.p,globalParam.frenel);
		}
		Plain.draw(ono3d);
		gl.finish();
		
		//gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);


		if(globalParam.hdr){
			//描画結果をメインのバッファにコピー
			gl.depthMask(false);
			gl.disable(gl.DEPTH_TEST);
			gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
			gl.clearColor(0.0,0.0,0.0,0.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.bindTexture(gl.TEXTURE_2D, Rastgl.fTexture2);
			gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);

			var emiSize=0.25;
			//疑似HDRぼかし(α値が0が通常、1に近いほど光る)
			gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
			gl.viewport(0,0,WIDTH*emiSize,HEIGHT*emiSize);
			gl.depthMask(false);
			gl.clearColor(0.0,0.0,0.0,0.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.BLEND);
			Rastgl.copyframe(Rastgl.fTexture2,0,0,WIDTH/1024,HEIGHT/1024); //今回の
			gl.enable(gl.BLEND);
			gl.blendFuncSeparate(gl.CONSTANT_ALPHA,gl.DST_ALPHA,gl.ZERO,gl.ZERO);
			gl.blendColor(0,0,0,0.7);
			Rastgl.copyframe(emiTexture,0,0,WIDTH/1024*emiSize,HEIGHT/1024*emiSize); //既存の光テクスチャを重ねる
			gl.disable(gl.BLEND);
			gl.bindTexture(gl.TEXTURE_2D, emiTexture);
			gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH*emiSize,HEIGHT*emiSize);//結果を光テクスチャに書き込み
			Gauss.filter(emiTexture,emiTexture,10,2.0/1024,1024.0*emiSize); //光テクスチャをぼかす

			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0,0,WIDTH,HEIGHT);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE,gl.ONE);
			Rastgl.copyframe(emiTexture,0,0,WIDTH/1024*emiSize,HEIGHT/1024*emiSize); //メイン画面に合成
		}
//メインのバッファのアルファ値を1にする
		gl.viewport(0,0,WIDTH,HEIGHT);
		gl.colorMask(false,false,false,true);
		gl.clearColor(0.0,0.0,0.0,1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.colorMask(true,true,true,true);

		gl.finish();
		ono3d.clear();

		for(i=0;i<objMan.objs.length;i++){
			obj = objMan.objs[i];
			ono3d.setTargetMatrix(1)
			ono3d.push();
			ono3d.setTargetMatrix(0)
			ono3d.loadIdentity()
			ono3d.rf=0;
			obj.drawhud();
			ono3d.setTargetMatrix(1)
			ono3d.pop();
		}

		var drawrasterise=Date.now()-start;

		mseccount += (Date.now() - nowTime)
		framecount++
		if(nowTime-oldTime > 1000){
			var mspf=0;
			var fps = framecount*1000/(nowTime-oldTime)
			if(framecount!==0)mspf = mseccount/framecount
			
			Util.setText(span,fps.toFixed(2) + "fps " + mspf.toFixed(2) + "msec/f"
				   +"\n AABB " + onoPhy.collider.AABBTime+"ms(" + onoPhy.collider.collisions.length + ")"
				   +"\n Collision " + onoPhy.collider.collisionTime + "ms(" + onoPhy.collider.collisionCount+ ")"
				   +"\n Impulse " + onoPhy.impulseTime+"ms ,repetition " + onoPhy.repetition
				   +"\n PhyTime" + phytime
				   +"\n draw geometry " + drawgeometry +"ms"
				   +"\n draw rasterise " + drawrasterise +"ms" 
				   )
	
			framecount = 0
			mseccount=0
			oldTime = nowTime
		}
	}
	var parentnode = (function (scripts) {
		return scripts[scripts.length - 1].parentNode;
	}) (document.scripts || document.getElementsByTagName('script'));


	ret.loadModel=function(){
		obj3d=O3o.load(globalParam.model,function(){

			for(var i=0;i<obj3d.objects.length;i++){
				var object=obj3d.objects[i];
			}

			var sceneSelect = document.getElementById("scene");
			var option;
			for(var i=0;i<obj3d.scenes.length;i++){
				if(obj3d.scenes[i].name.indexOf("_",0)==0){
					continue;
				}
				option = document.createElement('option');
				option.setAttribute('value', i);
				option.innerHTML = obj3d.scenes[i].name;
				sceneSelect.appendChild(option);
			}
		});
		
	}
	ret.start = function(){
		var select = document.getElementById("cTexture");
		var option;
		//soundbuffer = WebAudio.loadSound('se.mp3');
		sky = Ono3d.loadCubemap("skybox.jpg",function(image){
			var envsize=16;

			var envs=[0.1,0.2,0.4,0.8,1.0];
			gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
			envtexes=[];
			envtexes.push(0);
			envtexes.push(image.gltexture);
			

			envsize=image.images[0].width;
			envsize=16;
			var envsizeorg=envsize;
			var ii=1;
			var fazy=Math.atan2(envsizeorg/envsize,envsizeorg*0.5)/(Math.PI*0.5)*2.0;
			for(var i=0;i<envs.length;i++){
				//envsize=envsize>>1;
				var tex = gl.createTexture();
				gl.bindTexture(gl.TEXTURE_CUBE_MAP,tex);
			
				//envs[i]=Math.atan2(ii,envsizeorg*0.5)/(Math.PI*0.5);
				//ii*=2;

				Rough.draw(tex,image.gltexture,envs[i],envsizeorg,envsizeorg);
				var tex2 = gl.createTexture();
				gl.bindTexture(gl.TEXTURE_CUBE_MAP,tex2);
				Rough.draw(tex2,tex,fazy,envsize,envsize);
				envtexes.push(envs[i]);
				envtexes.push(tex2);

			}
			
			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		});
		emiTexture = Rastgl.createTexture(null,1024,1024);

		
		Util.setFps(globalParam.fps,mainloop);
		Util.fpsman();
	
		var checkbox=document.getElementById("notstereo");
		if(globalParam.stereomode==-1){
			checkbox=document.getElementById("parallel");
		}else if(globalParam.stereomode==1){
			checkbox=document.getElementById("cross");
		}
		checkbox.checked=1;
			
		var tags=["smoothing"
			,"lightColor1"
			,"lightColor2"
			,"lightThreshold1"
			,"lightThreshold2"
			,"outlineWidth"
			,"outlineColor"
			,"stereoVolume"
			,"shadow"
			,"hdr"

		];
		for(var i=0;i<tags.length;i++){
			(function(tag){
				var element = document.getElementById(tag);
				if(element.className=="colorpicker"){
					element.value=globalParam[tag];
					element.addEventListener("change",function(evt){globalParam[tag] = this.value},false);
				}else if(element.type=="checkbox"){
					element.checked=Boolean(globalParam[tag]);
					element.addEventListener("change",function(evt){globalParam[tag] = this.checked},false);
				}else{
					element.value=globalParam[tag];
					element.addEventListener("change",function(evt){globalParam[tag] = parseFloat(this.value)},false);
					if(!element.value){
						return;
					}
				}
				Util.fireEvent(element,"change");
			})(tags[i]);
		}

		var userAgent = window.navigator.userAgent.toLowerCase();
		if (navigator.platform.indexOf("Win") != -1) {
			globalParam.windows=true;
		}else{
			globalParam.windows=false;
		}

	}
		var canvas =document.createElement("canvas");
		canvas.width=WIDTH;
		canvas.height=HEIGHT;
		parentnode.appendChild(canvas);
		var canvasgl =document.createElement("canvas");
		canvasgl.width=WIDTH;
		canvasgl.height=HEIGHT;
		parentnode.appendChild(canvasgl);
		var ctx=canvas.getContext("2d");
		gl = canvasgl.getContext('webgl') || canvasgl.getContext('experimental-webgl');

		Util.init(canvas,canvasgl,parentnode);
		var ono3d = new Ono3d()
		O3o.setOno3d(ono3d)
		ono3d.init(canvas,ctx);

		ono3d.rendercanvas=canvas;
		if(gl){
			globalParam.enableGL=true;
		}else{
			globalParam.enableGL=false;
		}
		globalParam.gl=gl;


		if(globalParam.enableGL){
			Rastgl.init(gl,ono3d);
			canvas.style.width="0px";
			canvasgl.style.display="inline";
			Ono3d.setDrawMethod(3);
		}else{
			canvasgl.style.display="none";
			canvas.style.display="inline";
		}

		gl.clearColor(1, 1, 1,1.0);
		gl.clearColor(0.0,0.0,0.0,1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
	
		shadowTexture=Rastgl.createTexture(null,1024,1024);
		gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		bufTexture=Rastgl.createTexture(null,1024,1024);
		gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		
		onoPhy = new OnoPhy();
		objMan = new ObjMan();

		goMain = objMan.createObj(GoMain);
		camera = objMan.createObj();
		inittime=Date.now();

		span=document.getElementById("cons");
		
	return ret;
})()
