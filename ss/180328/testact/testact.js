"use strict"
var Testact=(function(){
	var ret={};
	var HEIGHT=480,WIDTH=720;
	var obj3d;
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
	var bV0 = new Vec3();
	var bV1 = new Vec3();
	var bV2 = new Vec3();
	var bM = new Mat44();

	var i;
	var STAT_EMPTY=0
		,STAT_ENABLE=1
		,STAT_CREATE=2

		,TYPE_EFFECT=i=0
		
		,MSG_CREATE=++i
		,MSG_MOVE=++i
		,MSG_DRAW=++i
	;

	var texts=[
		"Source"
		,"Reference"
		,"Source-Reference"
		,"Target"
		,"Result"
	]

	
	var Obj = function(){
		this.p=new Vec3();
		this.scale=new Vec3();
		this.angle=0;
		this.v=new Vec3();
		this.a=new Vec3();
		this.pos2=new Vec3();
		this.stat=STAT_EMPTY;
		this.type=0;
		this.hp=1;
		this.t=0;
		this.hitareas=[];
		this.matrix=new Mat43();
	}	
	var createObj = function(func){
		for(i=0;i<OBJSLENGTH;i++){
			var obj=objs[i];
			if(obj.stat!==STAT_EMPTY)continue;
			obj.func=func;
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
			obj.type=TYPE_EFFECT;
			obj.func(obj,MSG_CREATE,0);
			return obj;
		}
		return null;
	}
	var deleteObj=function(obj){
		obj.stat=-10;
	}
	
	for(i=0;i<OBJSLENGTH;i++){
		var obj=new Obj();
		obj.num=i;
		objs.push(obj);
	}
	var defObj=function(obj,msg,param){
		switch(msg){
		case MSG_CREATE:
			break;
		case MSG_MOVE:
			break;
		case MSG_DRAW:
			break;
		case MSG_HIT:
			obj.hp--;
			break;
		case MSG_FRAMEOUT:
			deleteObj(obj);
			break;
		}
		return;
	}
	var sourceArmature=null;
	var referenceArmature=null;
	var srArmature=null;
	var targetArmature=null;
	var mainObj=function(obj,msg,param){
		var phyObjs = obj.phyObjs;
		switch(msg){
		case MSG_CREATE:
			obj.phyObjs= null;
			Vec3.set(obj.p,0,15,-9);
			break;
		case MSG_MOVE:
			if(obj3d.scenes.length===0){
				break;
			}
			
			 //変換マトリクス初期化
			ono3d.setTargetMatrix(1);
			ono3d.loadIdentity();
			ono3d.setTargetMatrix(0);
			ono3d.loadIdentity();
			ono3d.rotate(-PI*0.5,1,0,0) //blenderはzが上なのでyが上になるように補正

			var scene= obj3d.scenes[globalParam.scene];
			O3o.setFrame(obj3d,scene,timer/1000.0*24); //アニメーション処理

			if(phyObjs===null){
				//物理シミュオブジェクトの設定
				if(obj3d.scenes.length>0){
					phyObjs=new Array();
					obj.phyObjs= phyObjs;
					for(i=0;i<scene.objects.length;i++){
						//3Dデータから物理オブジェクト生成
						var phyobj=O3o.createPhyObj(scene.objects[i],onoPhy);
						if(!phyobj){
							continue;
						}
						phyObjs.push(phyobj);
					}

					for(var i=0;i<phyObjs.length;i++){
						//ジョイント作成
						O3o.createPhyJoint(scene.objects[i],phyObjs,onoPhy);
					}
				}
			}

			if(phyObjs && globalParam.physics){
				//物理シミュ有効の場合は物理オブジェクトにアニメーション結果を反映させる
				for(var i=0;i<scene.objects.length;i++){
					//物理オブジェクトにアニメーション結果を反映
					//(前回の物理シミュ無効の場合は強制反映する)
					if(scene.objects[i].phyObj){
						O3o.movePhyObj(scene.objects[i],!globalParam.physics_);
					}
				}
				globalParam.physics_=true;
			}else{
				globalParam.physics_=false;
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
					O3o.movePhyObj(phyObj.parent,phyObj,true);
				}
			}

			break;

		case MSG_DRAW:
			ono3d.setTargetMatrix(0)
			ono3d.loadIdentity();
			ono3d.rotate(-PI*0.5,1,0,0)

			ono3d.rf=0;
			if(obj3d){
//				if(obj3d.scenes.length>0){
//					var objects = obj3d.scenes[globalParam.scene].objects;
//					for(var i=0;i<objects.length;i++){
//						if(objects[i].hide_render){
//							continue;
//						}
//						ono3d.lineWidth=1;
//						ono3d.rf&=~Ono3d.RF_OUTLINE;
//						if(globalParam.outlineWidth>0.){
//							ono3d.lineWidth=globalParam.outlineWidth;
//							ono3d.rf|=Ono3d.RF_OUTLINE;
//							Util.hex2rgb(ono3d.lineColor,globalParam.outlineColor);
//						}
//						if(bane){
//							if(bane.con2.name == objects[i].name){
//								ono3d.lineWidth=1;
//								ono3d.rf|=Ono3d.RF_OUTLINE;
//								Vec4.set(ono3d.lineColor,1,4,1,0);
//							}
//						}
//						if(globalParam.physics){
//							O3o.drawObject(objects[i],phyObjs);
//						}else{
//							O3o.drawObject(objects[i],null);
//						}
//					}
//				}
			if(globalParam.outlineWidth>0.){
				ono3d.lineWidth=globalParam.outlineWidth;
				ono3d.rf|=Ono3d.RF_OUTLINE;
				Util.hex2rgb(ono3d.lineColor,globalParam.outlineColor);
			}
			var dst = obj3d.objectsN["アーマチュア"].poseArmature;
			sourceArmature.reset();
			referenceArmature.reset();
			srArmature.reset();
			targetArmature.reset();
			sourceArmature.setAction(obj3d.actions[globalParam.source],timer/1000.0*24);
			targetArmature.setAction(obj3d.actions[globalParam.target],timer/1000.0*24);
			referenceArmature.setAction(obj3d.actions[globalParam.reference],timer/1000.0*24);
			ono3d.loadIdentity();
			ono3d.rotate(-PI*0.5,1,0,0)
			ono3d.translate(-3,0,0)
			O3o.PoseArmature.copy(dst,sourceArmature);
			O3o.drawObject(obj3d.objectsN["human"]);

			ono3d.translate(1.5,0,0)
			O3o.PoseArmature.copy(dst,referenceArmature);
			O3o.drawObject(obj3d.objectsN["human"]);


			O3o.PoseArmature.sub(srArmature,sourceArmature,referenceArmature);

			ono3d.translate(1.5,0,0)
			O3o.PoseArmature.copy(dst,srArmature);
			O3o.drawObject(obj3d.objectsN["human"]);

			ono3d.translate(1.5,0,0)
			O3o.PoseArmature.copy(dst,targetArmature);
			O3o.drawObject(obj3d.objectsN["human"]);

			O3o.PoseArmature.mul(dst,srArmature,globalParam.actionAlpha);
			O3o.PoseArmature.add(dst,dst,targetArmature);
			ono3d.translate(1.5,0,0)
			O3o.drawObject(obj3d.objectsN["human"]);

			}
			break;
		}
		return defObj(obj,msg,param);
	}
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
		globalParam.step=2;
		globalParam.fps=30;
		globalParam.scene=0;
		globalParam.shadow=1;
		globalParam.hdr=0;
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
	
	var mobj;

	
	var camera=createObj(defObj);
	var camera2=createObj(defObj);
	var camerazoom=0.577;
	var span;
	var oldTime = 0;
	var mseccount=0;
	var framecount=0;
	var vec3=new Vec3();
	var vec4=new Vec4();
	var inittime=0;
	var timer=0;
	var mat44 = new Mat44;
	var mainloop=function(){
		var nowTime = Date.now()
		timer=nowTime-inittime;
		
		var obj;

		if(obj3d == null){
			return;
		}
		if(obj3d.objects.length<=0){
			return;
		}
		var i;
		for(i=0;i<OBJSLENGTH;i++){
			if(objs[i].stat===STAT_CREATE){
				objs[i].stat=STAT_ENABLE;
			}
			if(objs[i].stat<0){
				objs[i].stat++;
			}
		}

		for(i=0;i<OBJSLENGTH;i++){
			if(objs[i].stat!==STAT_ENABLE)continue;
			objs[i].func(objs[i],MSG_MOVE,0);
		}
		var phytime=0;
		if(globalParam.physics){
			for(var i=0;i<globalParam.step;i++){
				var s=Date.now();
				onoPhy.calc(1.0/globalParam.fps/globalParam.step);
				phytime=Date.now()-s;
			}
		}

		if(Util.pressOn && !bane){
			camera2.a[1]+=(-(Util.cursorX-Util.oldcursorX)/WIDTH);
			camera2.a[0]+=((Util.cursorY-Util.oldcursorY)/HEIGHT);

		}
		camera2.a[0] =Math.min(camera2.a[0],Math.PI/2);
		camera2.a[0] =Math.max(camera2.a[0],-Math.PI/2);
		camera2.p[2]=Math.cos(camera2.a[0]);
		camera2.p[1]=Math.sin(camera2.a[0]);
		camera2.p[0]=Math.sin(camera2.a[1])*camera2.p[2];
		camera2.p[2]=Math.cos(camera2.a[1])*camera2.p[2];
		Vec3.mul(camera2.p,camera2.p,7);
		camera2.p[1]+=3;

		camera.p[0]+=(camera2.p[0]-camera.p[0])*0.1
		camera.p[1]+=(camera2.p[1]-camera.p[1])*0.1
		camera.p[2]+=(camera2.p[2]-camera.p[2])*0.1
		vec3[0]=0
		vec3[1]=1
		vec3[2]=0
		homingCamera(camera.a,vec3,camera.p);

		for(i=0;i<OBJSLENGTH;i++){
			if(objs[i].stat!==STAT_ENABLE)continue;
			objs[i].t++;
			objs[i].frame++;
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
		if(Util.pressCount == 1){
			var p0 =bV0;
			var p1 =bV1;

			Mat44.getInv(mat44,ono3d.pvMat);
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
			for(var i=0;i<mobj.phyObjs.length;i++){
				var phyObj = mobj.phyObjs[i];
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
					var im=new Mat43();
					Mat43.getInv(im,targetPhyObj.matrix);
					Mat43.dotVec3(bane.con2Pos,im,bV2);
				}

			}
		}

		if(bane){
			if(!Util.pressOn){
				if(bane.con2.type===OnoPhy.FACE){
					OnoPhy.Cloth.disablePhyFace.push(bane.con2);
				}
				onoPhy.deleteSpring(bane);
				bane= null;

			}else{
				Mat44.getInv(mat44,ono3d.pvMat);
		
				var w=(tsukamiZ*79+1);
				var z =  -ono3d.projectionMat[10] + ono3d.projectionMat[14]/w;
				Vec4.set(vec4,cursorr[0],-cursorr[1],z,1);
				Vec4.mul(vec4,vec4,w);
				Mat44.dotVec4(vec4,mat44,vec4);
				Vec3.copy(bane.p0,vec4);

				if(Util.pressCount==1){
					Vec3.copy(bane._p0,vec4);
				}
			}
			
		}

		ono3d.rf=0;
		ono3d.lineWidth=1.0;
		ono3d.smoothing=globalParam.smoothing;

		var light=ono3d.lightSources[0];
		Util.hex2rgb(light.color,globalParam.lightColor1);

		light=ono3d.lightSources[1];
		Util.hex2rgb(light.color,globalParam.lightColor2);

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
		for(i=0;i<OBJSLENGTH;i++){
			if(objs[i].stat!==STAT_ENABLE)continue;
			ono3d.push();
			ono3d.setTargetMatrix(0)
			ono3d.loadIdentity()
			ono3d.rf=0;
			objs[i].func(objs[i],MSG_DRAW,0);
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
			
			ono3d.setOrtho(10.0,10.0,10.0,30.0)
			var lightSource = ono3d.lightSources[0]
			Mat44.setInit(lightSource.matrix);
			Mat44.getRotVector(lightSource.matrix,lightSource.angle);
			Mat44.setInit(mat44);
			mat44[12]=-lightSource.pos[0]
			mat44[13]=-lightSource.pos[1]
			mat44[14]=-lightSource.pos[2]

			Mat44.dot(lightSource.matrix,lightSource.matrix,mat44);
			Mat44.dot(ono3d.pvMat,ono3d.projectionMat,lightSource.matrix);
			Mat44.copy(lightSource.matrix,ono3d.pvMat);
			
			Shadow.draw(ono3d);
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
		
//描画結果をメインのバッファにコピー
		gl.depthMask(false);
		gl.disable(gl.DEPTH_TEST);
		gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
		gl.clearColor(0.0,0.0,0.0,0.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, Rastgl.fTexture);
		gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);

//メインのバッファのアルファ値を1にする
		gl.viewport(0,0,WIDTH,HEIGHT);
		gl.colorMask(false,false,false,true);
		gl.clearColor(0.0,0.0,0.0,1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.colorMask(true,true,true,true);

		if(globalParam.hdr){
			//疑似HDRぼかし(α値が0が通常、1に近いほど光る)
			gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
			gl.viewport(0,0,WIDTH+1.0,HEIGHT);
			gl.depthMask(false);
			gl.disable(gl.DEPTH_TEST);
			gl.enable(gl.BLEND);
			gl.blendFuncSeparate(gl.CONSTANT_ALPHA,gl.DST_ALPHA,gl.ZERO,gl.ZERO);
			gl.blendColor(0,0,0,0.7);
			Rastgl.copyframe(emiTexture,0,0,WIDTH/1024,HEIGHT/1024); //既存の光テクスチャを重ねる
			gl.disable(gl.BLEND);
			gl.bindTexture(gl.TEXTURE_2D, emiTexture);
			gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);//結果を光テクスチャに書き込み
			Gauss.filter(emiTexture,emiTexture,100,2.0/1024,1024.0); //光テクスチャをぼかす

			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0,0,WIDTH,HEIGHT);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE,gl.ONE);
			Rastgl.copyframe(emiTexture,0,0,WIDTH/1024,HEIGHT/1024); //メイン画面に合成
		}

		if(bdfimage){
			
			ono3d.setTargetMatrix(1)
			ono3d.loadIdentity()
			ono3d.rotate(-camera.a[2],0,0,1)
			ono3d.rotate(-camera.a[0],1,0,0)
			ono3d.rotate(-camera.a[1]+Math.PI,0,1,0)
			ono3d.translate(-camera.p[0],-camera.p[1],-camera.p[2])
			ono3d.setAov(camerazoom);
			gl.enable(gl.BLEND);
			gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE);
			Rastgl.stereoDraw(ono3d,function(){
				var vec = new Vec4();
				ono3d.setTargetMatrix(0);
				ono3d.loadIdentity();
				ono3d.rotate(-PI*0.5,1,0,0);
				ono3d.translate(-3,0,0);
				var dst = obj3d.objectsN["アーマチュア"].poseArmature;
				var arms = [sourceArmature,referenceArmature,srArmature,targetArmature,dst];
				for(var i=0;i<texts.length;i++){
					arms[i].calcMatrix();
					Vec4.set(vec,0,0,2.0,1);
					Mat43.dotVec3(vec,arms[i].matrices[5],vec);
					Mat44.dotVec4(vec,ono3d.worldMatrix,vec);
					Mat44.dotVec4(vec,ono3d.viewMatrix,vec);
					Mat44.dotVec4(vec,ono3d.projectionMat,vec);
					var len = texts[i].length;
					var width = (4*texts[i].length+1);
					var height = 12;
					Rastgl.copyframe(bdfimage.gltexture,vec[0]/vec[3],vec[1]/vec[3],width*4/720,(height-1)*4/(720*ono3d.persy/ono3d.persx)
						,0,(height*(i+1))/512,width/512,-(height-1)/512);

					ono3d.translate(1.5,0,0);
				}
			});
			ono3d.setTargetMatrix(0)
		}

		gl.finish();
		ono3d.clear();

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
				//while(object.modifiers.length){
				//	if(object.modifiers[0].type != "MIRROR"){
				//		break;
				//	}
				//	O3o.freeze(object,object.modifiers[0]);
				//}
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
			document.getElementById("scene").selectedIndex=globalParam.scene;
			Util.fireEvent(document.getElementById("scene"),"change");

			var sel1= document.getElementById("target");
			var sel2= document.getElementById("reference");
			var sel3= document.getElementById("source");
			var option;
			for(var i=0;i<obj3d.actions.length;i++){
				option = document.createElement('option');
				option.setAttribute('value', i);
				option.innerHTML = obj3d.actions[i].name;

				sel1.appendChild(option);
				sel2.appendChild(option.cloneNode(true));
				sel3.appendChild(option.cloneNode(true));
			}
			sel1.selectedIndex=globalParam.target;
			sel2.selectedIndex=globalParam.reference;
			sel3.selectedIndex=globalParam.source;
			Util.fireEvent(sel1,"change");
			Util.fireEvent(sel2,"change");
			Util.fireEvent(sel3,"change");

			targetArmature= new O3o.PoseArmature(obj3d.objectsN["アーマチュア"].data);
			sourceArmature= new O3o.PoseArmature(obj3d.objectsN["アーマチュア"].data);
			referenceArmature= new O3o.PoseArmature(obj3d.objectsN["アーマチュア"].data);
			srArmature = new O3o.PoseArmature(obj3d.objectsN["アーマチュア"].data);

		});
		
	}
	ret.changeScene=function(){
		//onoPhy.phyObjs = [];
		//for(var i=0;i<phyObjs;i++){
		//	for(var j=0;j<onoPhp.phyObjs;j++){
		//		if(onoPhy.phyObjs[j]===phyObjs[i]){
		//			onoPhy.phyObjs[j].splice(j,1);
		//			break;
		//		}
		//	}
		//}
		//phyObjs=null;
		//globalParam.physics_=false;
	}
	ret.start = function(){
		//sky = Rastgl.loadTexture("sky.png");
		var texes =[];// ["tex1.jpg","tex2.jpg"];
		var select = document.getElementById("cTexture");
		var option;
		for(i=0;i<texes.length;i++){
			var texture = new O3o.Texture();
	
			texture.image = Ono3d.loadTexture(texes[i]);
			customTextures.push(texture);

			option = document.createElement('option');
			option.setAttribute('value', i);
			option.innerHTML = texes[i];
			select.appendChild(option);
		}
		document.getElementById("scene").selectedIndex=globalParam.scene;
		Util.fireEvent(document.getElementById("scene"),"change");
		texes = [];//["bump1.png"];
		select = document.getElementById("cBump");
		for(i=0;i<texes.length;i++){
			var texture = new O3o.Texture();
	
			texture.image = Ono3d.loadBumpTexture(texes[i]);
			customBumps.push(texture);

			option = document.createElement('option');
			option.setAttribute('value', i);
			option.innerHTML = texes[i];
			select.appendChild(option);
		}
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
			emiTexture = Rastgl.createTexture(null,1024,1024);

			bdf = Bdf.load("./k8x12.bdf",null,function(){
				var txt="";
				for(var i=0;i<texts.length;i++){
					txt+=texts[i]+"\n";
				}
				bdfimage = Bdf.render(txt,bdf,false);
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
				Rastgl.copyframe(bdfimage.gltexture,0,0,scl,scl);
				Rastgl.copyframe(bdfimage.gltexture,-1*ss,0,scl,scl);
				Rastgl.copyframe(bdfimage.gltexture,-2*ss,0,scl,scl);

				Rastgl.copyframe(bdfimage.gltexture,0,-1*ss,scl,scl);
				Rastgl.copyframe(bdfimage.gltexture,-1*ss,-1*ss,scl,scl);
				Rastgl.copyframe(bdfimage.gltexture,-2*ss,-1*ss,scl,scl);

				Rastgl.copyframe(bdfimage.gltexture,0*ss,-2*ss,scl,scl);
				Rastgl.copyframe(bdfimage.gltexture,-1*ss,-2*ss,scl,scl);
				Rastgl.copyframe(bdfimage.gltexture,-2*ss,-2*ss,scl,scl);
				//gl.bindTexture(gl.TEXTURE_2D,Rastgl.fTexture2);
				//gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,512,512);
				gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE);
				//Gauss.filter(Rastgl.fTexture2,Rastgl.fTexture2,100,1.0/512,512.0);
				gl.enable(gl.BLEND);
				gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE);
				Rastgl.copyframe(bdfimage.gltexture,-1*ss,-1*ss,scl,scl);
				gl.bindTexture(gl.TEXTURE_2D,bdfimage.gltexture);
				gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,512,512);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

			});
		});
		
		Util.setFps(globalParam.fps,mainloop);
		Util.fpsman();
	
		var checkbox=document.getElementById("notstereo");
		if(globalParam.stereomode==-1){
			checkbox=document.getElementById("parallel");
		}else if(globalParam.stereomode==1){
			checkbox=document.getElementById("cross");
		}
		checkbox.checked=1;
			

		document.getElementById("scene").value=globalParam.scene;

		var tags=["smoothing"
			,"lightColor1"
			,"lightColor2"
			,"lightThreshold1"
			,"lightThreshold2"
			,"physics"
			,"step"
			,"outlineWidth"
			,"outlineColor"
			,"stereoVolume"
			,"shadow"
			,"hdr"
			,"frenel"
			,"cMaterial"
			,"cColor"
			,"cAlpha"
			,"cEmi"
			,"cRefraction"
			,"cReflection"
			,"cReflectionColor"
			,"cRoughness"
			,"cTexture"
			,"cBump"
			,"cNormal"
			,"target"
			,"source"
			,"reference"
			,"actionAlpha"


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
//		var div=document.createElement("div");
//		parentnode.appendChild(div);
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

		Util.init(canvas,canvasgl,document.body);
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

		mobj=createObj(mainObj);
		var light = new ono3d.LightSource()
		light.type =Ono3d.LT_DIRECTION
		Vec3.set(light.angle,-1,-1,-1);
		Vec3.set(light.pos,10,15,10);
		light.power=1
		light.color[0]=1
		light.color[1]=1
		light.color[2]=1
		Vec3.norm(light.angle)
		ono3d.lightSources.push(light)
		light = new ono3d.LightSource()
		light.type =Ono3d.LT_AMBIENT
		light.color[0]=0.2
		light.color[1]=0.2
		light.color[2]=0.2
		ono3d.lightSources.push(light)
		Vec3.set(camera.p,0,6,10)
		Vec3.set(camera.a,0,PI,0)
		inittime=Date.now();

		span=document.getElementById("cons");
		
	var homingCamera=function(angle,target,camera){
		var dx=target[0]-camera[0]
		var dy=target[1]-camera[1]
		var dz=target[2]-camera[2]
		angle[0]=Math.atan2(dy,Math.sqrt(dz*dz+dx*dx));
		angle[1]=Math.atan2(dx,dz);
		angle[2]=0;
		
	}

	return ret;
})()
