"use strict"
var Testact=(function(){
	var ret={};
	var HEIGHT=512,WIDTH=960;
	var gl;
	var onoPhy=null;
	var objs=[];
	var skyTexture=null;
	var bufTexture;
	var customTextures=[];
	var customBumps=[];
	var bdf;
	var bdfimage=null;
	var soundbuffer=null;
	var bane= null;
	var tsukamiZ=100;
	var customMaterial = new Ono3d.Material();
	var probs = new Collider();

	var obj3d=null,field=null;
	var goField,goCamera;

	var i;
	var pad =new Vec2();

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
		ret.prototype.drawShadow=function(){
			this.draw();
		};
		ret.prototype.hit=function(){};
		ret.prototype.delete=function(){};
		ret.prototype.drawhud=function(){};
		return ret;
	})();

	var GoMain = (function(){
		var GoMain=function(){};
		var ret = GoMain;
		inherits(ret,defObj);
		ret.prototype.init=function(){

			for(var i=objMan.objs.length;i--;){
				if(this == objMan.objs[i])continue;
				objMan.deleteObj(objMan.objs[i]);
			}

			onoPhy.init();
			goCamera = objMan.createObj(GoCamera);
			goField= objMan.createObj(GoField);
		
		}
		ret.prototype.move=function(){
			var mat44 = Mat44.poolAlloc();
			var vec4 = Vec4.poolAlloc();
			var cursorr = Vec2.poolAlloc();

			cursorr[0] =Util.cursorX/WIDTH*2-1;
			cursorr[1] =Util.cursorY/HEIGHT*2-1;
			if(globalParam.stereomode!=0){
				cursorr[0]*=2;
				if(cursorr[0]<0){
					cursorr[0]+=1;

					ono3d.projectionMatrix[12]=globalParam.stereo;
					Mat44.dot(ono3d.pvMatrix,ono3d.projectionMatrix,ono3d.viewMatrix);
				}else{
					cursorr[0]-=1;
				}
			}
			if(Util.pressCount == 1){
				var p0 = Vec3.poolAlloc();
				var p1 = Vec3.poolAlloc();
				var bV2 = Vec3.poolAlloc();

				Mat44.getInv(mat44,ono3d.pvMatrix);
				Vec4.set(vec4,cursorr[0],-cursorr[1],-1,1);
				Mat44.dotVec4(vec4,mat44,vec4);
				Vec3.set(p0,vec4[0],vec4[1],vec4[2]);

				Vec4.set(vec4,cursorr[0],-cursorr[1],1,1);
				Vec4.mul(vec4,vec4,80);
				Mat44.dotVec4(vec4,mat44,vec4);
				Vec3.set(p1,vec4[0],vec4[1],vec4[2]);

				bane= null;
				tsukamiZ= 1;
				var targetPhyObj = null;
				var res2={};
				var phyObjs = goField.phyObjs;
				for(var i=0;i<phyObjs.length;i++){
					var phyObj = phyObjs[i];
					if(phyObj.type===OnoPhy.CLOTH){
						var res={};
						var z = phyObj.ray(res,p0,p1);
						if(z>0&& z>-1){
							if(z<tsukamiZ){
								tsukamiZ = z;
								res2.face=res.face;
								res2.p1=res.p1;
								res2.p2=res.p2;
								res2.p3=res.p3;
								targetPhyObj = phyObj;
							}
						}

					}else{
						if(phyObj.fix){
							continue;
						}
						var collision= phyObj.collision;
						if(!collision){
							continue;
							
						}
						var z = collision.ray(p0,p1);
						if(z>0&& z>-1){
							if(z<tsukamiZ){
								tsukamiZ = z;
								targetPhyObj = collision.parent;
							}
						}
					}
				}
				if(targetPhyObj){
					bane = onoPhy.createSpring();
					bane.con1 = null;
					bane.defaultLength=0;
					bane.f=50*targetPhyObj.mass;
					bane.c=1*targetPhyObj.mass;

					Vec3.sub(bV2,p1,p0);
					Vec3.madd(bV2,p0,bV2,tsukamiZ);

					if(targetPhyObj.type===OnoPhy.CLOTH){
						bane.con2=targetPhyObj.getPhyFace(res2.p1,res2.p2,res2.p3,res2.face,bV2);
						Vec3.set(bane.con2Pos,0,0,0);
					}else{
						bane.con2 = targetPhyObj;
						var im=Mat43.poolAlloc();
						Mat43.getInv(im,targetPhyObj.matrix);
						Mat43.dotVec3(bane.con2Pos,im,bV2);
						Mat43.poolFree(1);
					}

				}
				Vec3.poolFree(3);
			}

			if(bane){
				if(!Util.pressOn){
					if(bane.con2.type===OnoPhy.FACE){
						OnoPhy.Cloth.disablePhyFace.push(bane.con2);
					}
					onoPhy.deleteSpring(bane);
					bane= null;

				}else{
					Mat44.getInv(mat44,ono3d.pvMatrix);
			
					var w=(tsukamiZ*79+1);
					var z =  -ono3d.projectionMatrix[10] + ono3d.projectionMatrix[14]/w;
					Vec4.set(vec4,cursorr[0],-cursorr[1],z,1);
					Vec4.mul(vec4,vec4,w);
					Mat44.dotVec4(vec4,mat44,vec4);
					Vec3.copy(bane.p0,vec4);

					if(Util.pressCount==1){
						Vec3.copy(bane._p0,vec4);
					}
				}
				
			}
			Vec4.poolFree(1);
			Vec2.poolFree(1);
			Mat44.poolFree(1);
		}
		ret.prototype.delete=function(){
		}
		
		return ret;

	})();

	var blit = function(tex,x,y,w,h,u,v,u2,v2){
			//Rastgl.copyframe(tex.glTexture,x,y,w*2,h*2
			//				,u/tex.width,(v+v2)/tex.height,u2/tex.width,-v2/tex.height);
			Ono3d.drawCopy(x,y,w*2,h*2
							,tex,u/tex.width,(v+v2)/tex.height,u2/tex.width,-v2/tex.height);
	}

	var Camera= (function(){
		var Camera = function(){
			this.p=new Vec3();
			this.a=new Vec3();
			this.zoom = 0.577;
			this.cameracol=new Collider.ConvexHull();
			this.cameracol2=new Collider.ConvexHull();
			for(var i=0;i<8;i++){
				this.cameracol.poses.push(new Vec3());
				this.cameracol2.poses.push(new Vec3());
			}
		}
		var ret = Camera;
		var scope=[
			[-1,-1,-1]
			,[-1,1,-1]
			,[1,1,-1]
			,[1,-1,-1]
			,[-1,-1,1]
			,[-1,1,1]
			,[1,1,1]
			,[1,-1,1]
		];
		ret.prototype.calcMatrix=function(){
			ono3d.setPers(this.zoom,HEIGHT/WIDTH);
			ono3d.setTargetMatrix(1);
			ono3d.loadIdentity();
			ono3d.rotate(-this.a[2],0,0,1);
			ono3d.rotate(-this.a[0],1,0,0);
			ono3d.rotate(-this.a[1]+Math.PI,0,1,0);
			ono3d.translate(-this.p[0],-this.p[1],-this.p[2]);
			ono3d.setAov(this.zoom);
		}
		ret.prototype.calcCollision=function(collision,matrix){
			var im = Mat44.poolAlloc();
			var v4=Vec4.poolAlloc();
			if(!matrix){
				Mat44.dot(im,ono3d.projectionMatrix,ono3d.viewMatrix);
				Mat44.getInv(im,im);
			}else{
				Mat44.getInv(im,matrix);
			}

			for(var i=0;i<8;i++){
				Vec3.copy(v4,scope[i]);
				v4[3]=1;
				if(v4[2]<0){
					Vec4.mul(v4,v4,ono3d.znear);
				}else{
					Vec4.mul(v4,v4,ono3d.zfar);
				}
				Mat44.dotVec4(v4,im,v4);
				Vec3.copy(collision.poses[i],v4);
			}
			collision.update();
			Vec4.poolFree(1);
			Mat44.poolFree(1);
		}

		return ret;
	})();
	var camera = new Camera();

	var GoCamera= (function(){
		var GoCamera=function(){};
		var ret = GoCamera;
		inherits(ret,defObj);
		ret.prototype.init=function(){
			Vec3.set(this.p,0,0,20);
			this.target = new Vec3();
			Vec3.set(this.target,0,0,0);
			this.cameralen=8;


		}
		ret.prototype.move=function(){
			var vec3=this.target;




			if(Util.pressOn && !bane){
				this.a[1]-=(Util.cursorX-Util.oldcursorX)/WIDTH;
				this.a[0]-=((Util.cursorY-Util.oldcursorY)/HEIGHT);

			}
			this.a[0] =Math.min(this.a[0],Math.PI/2);
			this.a[0] =Math.max(this.a[0],-Math.PI/2);
			this.p[2]=Math.cos(this.a[0]);
			this.p[1]=-Math.sin(this.a[0]);
			this.p[0]=-Math.sin(this.a[1])*this.p[2];
			this.p[2]=-Math.cos(this.a[1])*this.p[2];

			Vec3.mul(this.p,this.p,this.cameralen);


			camera.p[0]+=(this.p[0]-camera.p[0])*0.3
			camera.p[1]+=(this.p[1]-camera.p[1])*0.3
			camera.p[2]+=(this.p[2]-camera.p[2])*0.3


			homingCamera(camera.a,vec3,camera.p);

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
	var GoField= (function(){
		var GoField =function(){};
		var ret = GoField;
		inherits(ret,defObj);
		ret.prototype.init=function(){
			var t = this;

			field =O3o.load(globalParam.model,function(o3o){

				var scene= o3o.scenes[0];
				O3o.setFrame(o3o,scene,0); //アニメーション処理

				ono3d.setTargetMatrix(0);
				ono3d.loadIdentity();
				ono3d.rotate(-Math.PI*0.5,1,0,0) //blenderはzが上なのでyが上になるように補正

				//物理シミュオブジェクトの設定
				t.phyObjs= O3o.createPhyObjs(o3o.scenes[0],onoPhy);



				var scene = o3o.scenes[0];

				//光源エリア判定作成
				for(var i=0;i<scene.objects.length;i++){
					var object = scene.objects[i];
					if(object.name.indexOf("prob_")==0){
						var collider= new Collider.Cuboid;
						Mat43.dotMat44Mat43(collider.matrix
								,ono3d.worldMatrix,object.matrix);
						Mat43.getInv(collider.inv_matrix,collider.matrix);
						collider.update();
						probs.addCollision(collider);
					}	
				}
				probs.sortList();

				ono3d.environments_index=1;

				O3o.setEnvironments(scene); //光源セット


				//0番目の光源セットをコントロールに反映
				var env = ono3d.environments[0];
				for(var i=0;i<2;i++){
					var ol = [env.sun,env.area][i];
					var el = document.getElementById("lightColor"+(i+1));
					el.value = Util.rgb(ol.color[0],ol.color[1],ol.color[2]).slice(1);
					Util.fireEvent(el,"change");
				}

				var co=  scene.objects.find(function(a){return a.name===this;},"Camera");
				if(co){
					goCamera.p[0]=co.mixedmatrix[9];
					goCamera.p[1]=co.mixedmatrix[10];
					goCamera.p[2]=co.mixedmatrix[11];
					Mat44.dotVec3(goCamera.p,ono3d.worldMatrix,goCamera.p);
					goCamera.a[0]=co.mixedmatrix[6];
					goCamera.a[1]=co.mixedmatrix[7];
					goCamera.a[2]=co.mixedmatrix[8];
					Mat44.dotVec3(goCamera.a,ono3d.worldMatrix,goCamera.a);
					goCamera.target[0] = goCamera.p[0] - goCamera.a[0]* goCamera.p[2]/goCamera.a[2];
					goCamera.target[1] =  goCamera.p[1] - goCamera.a[1]* goCamera.p[2]/goCamera.a[2];
					goCamera.target[2] = 0;

					homingCamera(goCamera.a,goCamera.target,goCamera.p);
					
				}

				Vec3.copy(camera.p,goCamera.p)
				Vec3.copy(camera.a,goCamera.a)


				var envTexture = ono3d.createEnv(0,0,0,drawSub);

				for(var i=0;i<ono3d.environments_index;i++){
					//環境マップ
					ono3d.environments[i].envTexture=envTexture;

					//ライトマップ
					ono3d.environments[i].lightMap =scene.lightMap;
				}

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
			ono3d.rotate(-Math.PI*0.5,1,0,0) //blenderはzが上なのでyが上になるように補正

			var scene= obj3d.scenes[0];
			O3o.setFrame(obj3d,scene,this.t/60.0*60.0); //アニメーション処理

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
					O3o.movePhyObj(phyObj,phyObj.parent,0,true);
				}
			}
		}
		var cuboidcol = new Collider.Cuboid;
		var col = new Collider.Sphere();
		ret.prototype.draw=function(){
			var phyObjs = this.phyObjs;

			ono3d.setTargetMatrix(0)
			ono3d.loadIdentity();
			ono3d.rotate(-Math.PI*0.5,1,0,0)

			ono3d.rf=0;

			var m43 = Mat43.poolAlloc();
			if(field){
				if(field.scenes.length>0){
					var objects = field.scenes[0].objects;
					for(var i=0;i<objects.length;i++){
						if(objects[i].hide_render){
							continue;
						}
						var b =objects[i].bound_box;
						Mat43.setInit(m43);
						m43[0]=(b[3] - b[0])*0.5;
						m43[4]=(b[4] - b[1])*0.5;
						m43[8]=(b[5] - b[2])*0.5;
						m43[9]=b[0]+m43[0];
						m43[10]=b[1]+m43[4];
						m43[11]=b[2]+m43[8];
						var phyObj = null;
						if(globalParam.physics){
							phyObj= phyObjs.find(function(a){return a.name===this;},objects[i].name);
						}
						if(phyObj){
							Mat43.dot(cuboidcol.matrix,phyObj.matrix,m43);
						}else{
							Mat43.dot(m43,objects[i].mixedmatrix,m43);
							Mat43.dotMat44Mat43(cuboidcol.matrix,ono3d.worldMatrix,m43);
						}
						cuboidcol.update();
						var l = 1;
						if(AABB.hitCheck(camera.cameracol.AABB,cuboidcol.AABB)){
							//l=-1;
							l = Collider.checkHit(camera.cameracol,cuboidcol);
						}
						var l2 = 1;
						if(globalParam.shadow){
							if(AABB.hitCheck(camera.cameracol2.AABB,cuboidcol.AABB)){
								//l2=-1;
								l2 = Collider.checkHit(camera.cameracol2,cuboidcol);
							}
						}
						if(l>0 && l2>0){
							continue;
						}
						ono3d.rf&=~Ono3d.RF_OUTLINE;
						if(globalParam.outline_bold){
							ono3d.lineWidth=globalParam.outline_bold;
							ono3d.rf|=Ono3d.RF_OUTLINE;
							Util.hex2rgb(ono3d.lineColor,globalParam.outline_color);
						}
						if(bane){
							if(bane.con2.name == objects[i].name){
								ono3d.lineWidth=1;
								ono3d.rf|=Ono3d.RF_OUTLINE;
								Vec4.set(ono3d.lineColor,1,4,1,0);
							}
						}

						Mat43.setInit(col.matrix);
						Mat43.mul(col.matrix,col.matrix,0);
						col.matrix[9]=objects[i].location[0];
						col.matrix[10]=objects[i].location[2];
						col.matrix[11]=-objects[i].location[1];
						col.update();

						var l =probs.checkHitAll(col)
						var env = null;
						if(probs.hitListIndex>0){
							env = ono3d.environments[1];
						}
						if(globalParam.physics){
							O3o.drawObject(objects[i],phyObjs,env);
						}else{
							O3o.drawObject(objects[i],null,env);
						}
					}
				}
			}
			Mat43.poolFree(1);
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

		var url=location.search.substring(1,location.search.length)
		globalParam.outline_bold=0;
		globalParam.outline_color="000000";
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
		globalParam.model="./f1.o3o";
		globalParam.materialMode = false;
	//カスタムマテリアル
		globalParam.baseColor= "ffffff";
		globalParam.metallic= 0;
		globalParam.metalColor= "ffffff";
		globalParam.roughness= 0;
		globalParam.subRoughness= 0;
		globalParam.frenel = 0;
		globalParam.opacity= 1.0;
		globalParam.ior= 1.1;
		globalParam.cNormal= 1.0;
		globalParam.emi= 0.0;

		globalParam.shader= 0;

	//カメラ露光
		globalParam.autoExposure=1;
		globalParam.exposure_level=0.5;
		globalParam.exposure_upper=2;
		globalParam.exposure_bloom=0.1;
		
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
	
	var physicsTime;
	var span;
	var oldTime = 0;
	var nowTime =0;
	var drawgeometryTime=0;
	var drawrasteriseTime=0;
	var drawTime=0;
	var mseccount=0;
	var framecount=0;
	var inittime=0;
	var afID=0;
	var mainloop=function(){
		
		nowTime = Date.now()
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
		physicsTime=Date.now();
		if(globalParam.physics){
			for(var i=0;i<globalParam.step;i++){
				onoPhy.calc(1.0/globalParam.fps/globalParam.step);
			}
			globalParam.physics_=1;
		}
		physicsTime=Date.now()-physicsTime;

		//if(!afID){
		////	window.cancelAnimationFrame(afID);
		//	afID = window.requestAnimationFrame(drawFunc);
		//}
		drawFunc();

		mseccount += (Date.now() - nowTime)
		framecount++
		if(nowTime-oldTime > 1000){
			var mspf=0;
			var fps = framecount*1000/(nowTime-oldTime)
			if(framecount!==0)mspf = mseccount/framecount
			
			Util.setText(span,fps.toFixed(2) + "fps " + mspf.toFixed(2) + "ms/frame"
				   +"\nPhyisics " + physicsTime +"ms"
				   +"\n AABB " + onoPhy.collider.AABBTime+"ms (Object " + onoPhy.collider.collisions.length + ")"
				   +"\n Collision " + onoPhy.collider.collisionTime + "ms (Target " + onoPhy.collider.collisionCount+ ")"
				   +"\n Impulse " + onoPhy.impulseTime+"ms (repetition " + onoPhy.repetition +")"
				   +"\nDrawTime " + drawTime +"ms"
				   +"\n geometry " + drawgeometryTime +"ms"
				   +"\n rasterise " + drawrasteriseTime +"ms" 
				   )
	
			framecount = 0
			mseccount=0
			oldTime = nowTime
		}

	}
	var parentnode = (function (scripts) {
		return scripts[scripts.length - 1].parentNode;
	}) (document.scripts || document.getElementsByTagName('script'));

	var drawSub = function(x,y,w,h){

//遠景描画
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		gl.depthMask(true);
		ono3d.setViewport(x,y,w,h);
		ono3d.getProjectionMatrix(ono3d.projectionMatrix);
//		gl.clearColor(0.0,0.0,0.0,0.0);
//		gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
		gl.depthMask(false);
		gl.disable(gl.BLEND);
		if(skyTexture.glTexture){
			if(globalParam.stereomode==0){
				ono3d.drawCelestialSphere(skyTexture);
			}else{
				ono3d.setPers(0.577,HEIGHT/WIDTH*2,1,20);
				ono3d.setViewport(0,0,WIDTH/2,HEIGHT);
				ono3d.drawCelestialSphere(skyTexture);
				ono3d.setViewport(WIDTH/2,0,WIDTH/2,HEIGHT);
				ono3d.drawCelestialSphere(skyTexture);
				
			}
		}

		ono3d.setViewport(x,y,w,h);
//オブジェクト描画
		gl.depthMask(true);
		gl.enable(gl.DEPTH_TEST);

		if(skyTexture.glTexture){
			if(globalParam.shader===0){
				if(globalParam.cMaterial){
					ono3d.render(camera.p,customMaterial);
				}else{
					ono3d.render(camera.p);
				}
			}
		}
		gl.finish();
	}
	var drawFunc = function(){
		afID = 0;

		drawTime=Date.now();


		ono3d.rf=0;
		ono3d.lineWidth=1.0;
		ono3d.smoothing=globalParam.smoothing;

		ono3d.lightThreshold1=globalParam.lightThreshold1;
		ono3d.lightThreshold2=globalParam.lightThreshold2;

		var environment = ono3d.environments[0];
		Util.hex2rgb(environment.sun.color,globalParam.lightColor1)
		Util.hex2rgb(environment.area.color,globalParam.lightColor2)

		if(globalParam.cMaterial){
			var cMat = customMaterial;
			var a=new Vec3();
			Util.hex2rgb(cMat.baseColor,globalParam.baseColor);
			cMat.opacity=globalParam.opacity;
			cMat.emt=globalParam.emi;
			cMat.metallic=globalParam.metallic;
			cMat.ior=globalParam.ior;
			cMat.roughness=globalParam.roughness;
			cMat.subRoughness=globalParam.subRoughness;
			Util.hex2rgb(cMat.metalColor,globalParam.metalColor);
			cMat.texture=globalParam.cTexture;
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
		}

			
		var start = Date.now();

		camera.calcMatrix();
		camera.calcCollision(camera.cameracol);
		var lightSource= null;

		if(globalParam.shadow){
			lightSource = ono3d.environments[0].sun
			if(lightSource){
				camera.calcCollision(camera.cameracol2,lightSource.viewmatrix);
			}
		}
		for(i=0;i<objMan.objs.length;i++){
			var obj = objMan.objs[i];
			ono3d.setTargetMatrix(1)
			ono3d.push();
			ono3d.setTargetMatrix(0)
			ono3d.loadIdentity()
			ono3d.rf=0;
			obj.draw();
			ono3d.setTargetMatrix(1)
			ono3d.pop();
		}

		drawgeometryTime=Date.now()-start;

		start=Date.now();
		
		globalParam.stereo=-globalParam.stereoVolume * globalParam.stereomode*0.4;

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.depthMask(true);
		gl.clearColor(0.0,0.0,0.0,0.0);
		gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
		drawSub(0,0,WIDTH,HEIGHT);
		

		//描画結果をバッファにコピー
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		Ono3d.copyImage(bufTexture,0,0,0,0,WIDTH,HEIGHT);

		//画面平均光度算出
		if(globalParam.autoExposure){
			ono3d.calcExpose(bufTexture,(WIDTH-512)/2.0/1024,0 ,512/1024,HEIGHT/1024);
		}else{
			ono3d.setExpose(globalParam.exposure_level,globalParam.exposure_upper);
		}

		if(globalParam.exposure_bloom ){
			ono3d.setViewport(0,0,WIDTH,HEIGHT);
			ono3d.bloom(bufTexture,globalParam.exposure_bloom);
			Ono3d.copyImage(bufTexture,0,0,0,0,WIDTH,HEIGHT);
		}
	//	Ono3d.drawCopy(ono3d.environments[0].lightMap,0,0,1.0,1.0);
	//	Ono3d.drawCopy(field.scenes[0].lightMap,0,0,1.0,1.0);


		ono3d.setViewport(0,0,WIDTH,HEIGHT);
		gl.bindFramebuffer(gl.FRAMEBUFFER,null );

		ono3d.toneMapping(bufTexture,WIDTH/1024,HEIGHT/1024);
		

		gl.disable(gl.BLEND);
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

		//gl.getParameter(gl.VIEWPORT);
		drawrasteriseTime=Date.now()-start;

		drawTime =Date.now()-drawTime;

	}

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

		if(Util.getLoadingCount()>0){
			//初期ロードが未完了の場合はメイン処理は開始しない
			setTimeout(this.start,100);
			return;
		}

		var select = document.getElementById("cTexture");
		var option;
		//soundbuffer = WebAudio.loadSound('se.mp3');

		

		document.getElementById("autoExposure").addEventListener("change"
			,function(evt){
				var control = document.getElementById("exposure_setting");
				var inputs = Array.prototype.slice.call(control.getElementsByTagName("input"));

				for(var i=0;i<inputs.length;i++){
					var element = inputs[i];
					if(this.checked){
						element.setAttribute("disabled","disabled");
					}else{
						element.removeAttribute("disabled");
					}
				}
		});
	
		var control = document.getElementById("control");
		var inputs = Array.prototype.slice.call(control.getElementsByTagName("input"));
		var selects= Array.prototype.slice.call(control.getElementsByTagName("select"));
		
		inputs = inputs.concat(selects);

		for(var i=0;i<inputs.length;i++){
			var element = inputs[i];
			var tag = element.id;
			if(!tag)continue;

			element.title = tag;
			if(element.className=="colorpicker"){
				element.value=globalParam[tag];
				element.addEventListener("change",function(evt){globalParam[evt.target.id] = this.value},false);
			}else if(element.type=="checkbox"){
				element.checked=Boolean(globalParam[tag]);
				element.addEventListener("change",function(evt){globalParam[evt.target.id] = this.checked},false);
			}else if(element.type==="text" || element.tagName ==="SELECT"){
				element.value=globalParam[tag];
				element.addEventListener("change",function(evt){globalParam[evt.target.id] = parseFloat(this.value)},false);
				if(!element.value){
					continue;
				}
			}else if(element.type==="radio"){
				var name = element.name;
				if(element.value === ""+globalParam[name]){
					element.checked=1;
				}else{
					element.checked=0;
				}
				element.addEventListener("change",function(evt){globalParam[evt.target.name] = parseFloat(this.value)},false);
				if(!element.checked){
					continue;
				}
			}
			Util.fireEvent(element,"change");
		}
		
		skyTexture = Ono3d.loadTexture("sky.jpg",function(image){
			var envsize=16;
			gl.colorMask(true,true,true,true);
			gl.disable(gl.BLEND);
			gl.disable(gl.DEPTH_TEST);


			gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
			gl.viewport(0,0,image.width,image.height);
			Ono3d.postEffect(image,0,0 ,1,1,ono3d.shaders["envset"]); 
			gl.bindTexture(gl.TEXTURE_2D, image.glTexture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			Ono3d.copyImage(image,0,0,0,0,image.width,image.height);

			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);


			goMain = objMan.createObj(GoMain);


		});

		Util.setFps(globalParam.fps,mainloop);
		Util.fpsman();

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
	if(gl){
		globalParam.enableGL=true;
	}else{
		globalParam.enableGL=false;
	}
	globalParam.gl=gl;

	canvasgl.style.zoom="1.0";

	if(globalParam.enableGL){
		Rastgl.init(gl);
		canvas.style.width="0px";
		canvasgl.style.display="inline";
		//Ono3d.setDrawMethod(3);
	}else{
		canvasgl.style.display="none";
		canvas.style.display="inline";
	}
	var ono3d = new Ono3d()
	O3o.setOno3d(ono3d)
	ono3d.init(canvas,ctx);

	ono3d.rendercanvas=canvas;
	Rastgl.ono3d = ono3d;

	

	bufTexture=Ono3d.createTexture(1024,1024);
	gl.bindTexture(gl.TEXTURE_2D, bufTexture.glTexture);


	
	onoPhy = new OnoPhy();
	objMan = new ObjMan();

	inittime=Date.now();

	span=document.getElementById("cons");


	return ret;
})()
