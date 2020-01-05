Engine.goClass.field= (function(){
	var ono3d = Engine.ono3d;
	var onoPhy=Engine.onoPhy;
	var objMan=Engine.objMan;
	var fieldpath="f1.o3o";
	var GoField =function(){};
	var ret = GoField;
	var initFlg=false;
	var gl = globalParam.gl;
	inherits(ret,Engine.defObj);

	var o3o;
	ret.prototype.init=function(){
		this.initFlg=false;
		o3o =AssetManager.o3o(globalParam.model);
	}
	var aaa=true;
	ret.prototype.move=function(){
		var obj = this;
		if(o3o.scenes.length===0){
			return;
		}

		if(!this.initFlg && o3o.scenes.length>0){
			if(Util.getLoadingCount() > 0){
				return;
			}
			this.initFlg=true;

			var scene= o3o.scenes[0];
			
			if(scene.world.envTexture){
				//背景セット
				Engine.skyTexture = scene.world.envTexture;
			}

			scene.setFrame(0); //初期状態セット
			instance = o3o.createInstance(); //インスタンス作成
			this.instance=instance;
			instance.calcMatrix(0,true);
			globalParam.instance=instance;

			ono3d.setTargetMatrix(0);
			ono3d.loadIdentity();

			instance.joinPhyObj(onoPhy);

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

			var goCamera = Engine.go.camera;

			var co=  instance.objectInstances["Camera"];
			if(co){
				goCamera.p[0]=co.matrix[9];
				goCamera.p[1]=co.matrix[10];
				goCamera.p[2]=co.matrix[11];
				Mat44.dotVec3(goCamera.p,ono3d.worldMatrix,goCamera.p);
				goCamera.a[0]=co.matrix[3];
				goCamera.a[1]=co.matrix[4];
				goCamera.a[2]=co.matrix[5];
				Mat44.dotVec3(goCamera.a,ono3d.worldMatrix,goCamera.a);
				goCamera.target[0] = goCamera.p[0] - goCamera.a[0]* goCamera.p[2]/goCamera.a[2];
				goCamera.target[1] =  goCamera.p[1] - goCamera.a[1]* goCamera.p[2]/goCamera.a[2];
				goCamera.target[2] = 0;

				goCamera.cameralen=Math.abs(goCamera.p[2]);

				Engine.goClass.camera.homingCamera(goCamera.a,goCamera.target,goCamera.p);
				
			}

			var camera = Engine.camera;
			Vec3.copy(camera.p,goCamera.p)
			Vec3.copy(camera.a,goCamera.a)


			goCamera.move();
			camera.calcMatrix();
			camera.calcCollision(camera.cameracol);
			var poses= camera.cameracol.poses;

			camera.cameracol.refresh();
			var lightSource= null;


			lightSource = ono3d.environments[0].sun
			if(lightSource){
				camera.calcCollision(camera.cameracol2,lightSource.viewmatrix);
			}

			ono3d.clear();

			//環境マップ
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			ono3d.environments[0].envTexture = ono3d.createEnv(null,0,0,0,Engine.drawSub);

			Engine.createSHcoeff(0,0,0,Engine.drawSub);
			var u8 = new Uint8Array(9*4);
			gl.readPixels(0, 0, 9, 1, gl.RGBA, gl.UNSIGNED_BYTE, u8);
			var ratio = 1/(255*16*16*Math.PI*4);
			var x = (i%7)*9;
			var y= (i/7|0);
			var ii = y*64+x;
			var shcoef=[];
			var d = new Vec4();
			for(var j=0;j<9;j++){
				d[0] = u8[(j)*4+0];
				d[1] = u8[(j)*4+1];
				d[2] = u8[(j)*4+2];
				d[3] = u8[(j)*4+3];
				var e = [0,0,0];//new Vec3();
				Ono3d.unpackFloat(e,d);
				e[0]=e[0]*ratio;
				e[1]=e[1]*ratio;
				e[2]=e[2]*ratio;
				shcoef.push(e);
			}
			SH.mulA(shcoef);

			ono3d.setNearFar(0.01,100.0);
			ono3d.clear();
			var goField = Engine.go.field;
			goField.draw2();
			ono3d.render(camera.p);
			ono3d.setStatic();

			
			ono3d.lightThreshold1=globalParam.lightThreshold1;
			ono3d.lightThreshold2=globalParam.lightThreshold2;


			var lightprobe=instance.objectInstances["LightProbe"];
			if(lightprobe){

				var lightProbe = lightprobe.createLightProbe(true);
				ono3d.environments[0].lightProbe = lightProbe;
				for(var i=0;i<8;i++){
					lightProbe.shcoefs.push(shcoef);
				}

			}else{
				var points=[];
				var shcoefs=[];
				var MAX=1000;
				for(var i=0;i<8;i++){
					p=new Vec3();
					Vec3.set(p,((i&1)*2-1)*MAX,(((i&2)>>1)*2-1)*MAX,(((i&4)>>2)*2-1)*MAX);
					points.push(p);
				}
				for(var i=0;i<8;i++){
					shcoefs.push(shcoef);
				}
				var lightProbe = Engine.createLightProbe(points,shcoefs);
				ono3d.environments[0].lightProbe = lightProbe;

			}

			
		}
		
		 //変換マトリクス初期化
		ono3d.setTargetMatrix(0);
		ono3d.loadIdentity();

		var scene= o3o.scenes[0];

		scene.setFrame(this.t/60.0*60.0); //アニメーション処理
		var instance=this.instance;

		instance.calcMatrix(1.0/globalParam.fps,!globalParam.physics_ || !globalParam.physics);



		//特殊
		var phyObj = instance.o3o.objects.find(function(o){return o.name==="convexhull";});
		if(phyObj){
			var objectInstance = instance.objectInstances[phyObj.idx];
			phyObj = objectInstance.phyObj;
			var v=new Vec3();
			Vec3.set(v,0,-1,0);
			phyObj.refreshCollision();
			var nearest=999999;
			var target=null;
			var phyObjs = instance.objectInstances
			for(var i=0;i<instance.objectInstances.length;i++){
				var phyObj2 = instance.objectInstances[i].phyObj;
				if(!phyObj2){
					continue;
				}
				if(phyObj === phyObj2){
					continue;
				}
				if(!phyObj2.collision){
					continue;
				}
				phyObj2.refreshCollision();
				if(!AABB.aabbCast(v,phyObj.collision.aabb,phyObj2.collision.aabb)){
					continue;
				}
				var a=Collider.convexCast(v,phyObj.collision,phyObj2.collision);
				if(a !== Collider.INVALID){
					if( a<nearest){
						nearest=a;
						target=phyObj2;
					}
				}
			}
			if(target){
				Vec3.madd(phyObj.location,phyObj.location,v,nearest);
				phyObj.calcPre();
				Mat43.copy(objectInstance.matrix,phyObj.matrix);
			}
		}


	}
	var cuboidcol = new Collider.Cuboid;
	var col = new Collider.Sphere();

	ret.prototype.draw2=function(){
		var phyObjs = this.phyObjs;
		var instance=this.instance;

		ono3d.setTargetMatrix(0)
		ono3d.loadIdentity();

		ono3d.rf=0;

		var field = o3o;
		if(field){
			if(field.scenes.length>0){
				var objects = field.scenes[0].objects;

				for(var i=0;i<objects.length;i++){
					if(objects[i].hide_render
					|| !objects[i].static){
						continue;
					}
					var objectInstance= this.instance.objectInstances[objects[i].idx];

					var obj=objects[i];

					var env = null;
					obj.staticFaces=objectInstance.drawStatic(env);
					
				}
			}
		}
	}
	ret.prototype.draw=function(){
		var phyObjs = this.phyObjs;

		ono3d.setTargetMatrix(0)
		ono3d.loadIdentity();
		//ono3d.rotate(-Math.PI*0.5,1,0,0)

		ono3d.rf=0;
		var field=o3o;
		var camera=Engine.camera;

		var m43 = Mat43.poolAlloc();
		if(this.instance){
			var objects = field.scenes[0].objects;
			for(var i=0;i<objects.length;i++){
				var object = objects[i];
				if(object.type!=="MESH")continue;
				if(object.hide_render){
					continue;
				}
				if(object.staticFaces){
					O3o.drawStaticFaces(object.staticFaces);
					continue;
				}

				var objectInstance= this.instance.objectInstances[object.idx];
				var b =object.bound_box;
				Mat43.setInit(m43);
				m43[0]=(b[3] - b[0])*0.5;
				m43[4]=(b[4] - b[1])*0.5;
				m43[8]=(b[5] - b[2])*0.5;
				m43[9]=b[0]+m43[0];
				m43[10]=b[1]+m43[4];
				m43[11]=b[2]+m43[8];
				var phyObj = null;
				if(globalParam.physics){
					phyObj= phyObjs.find(function(a){return a.name===this;},object.name);
				}

				var obj=object;

				if(phyObj){
					Mat43.dot(cuboidcol.matrix,phyObj.matrix,m43);
				}else{
					Mat43.dot(m43,objectInstance.matrix,m43);
					Mat43.dotMat44Mat43(cuboidcol.matrix,ono3d.worldMatrix,m43);
				}
				cuboidcol.refresh();
				var l = 1;
				if(AABB.hitCheck(camera.cameracol.aabb,cuboidcol.aabb)){
					l=-1;
					l = Collider.checkHit(camera.cameracol,cuboidcol);
				}
				var l2 = 1;
				if(globalParam.shadow){
					if(AABB.hitCheck(camera.cameracol2.aabb,cuboidcol.aabb)){
						l2=-1;
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

				var bane = Engine.go.main.bane;
				if(bane){
					if(bane.con2.name == object.name){
						ono3d.lineWidth=1;
						ono3d.rf|=Ono3d.RF_OUTLINE;
						Vec4.set(ono3d.lineColor,1,4,1,0);
					}
				}

				Mat43.setInit(col.matrix);
				Mat43.mul(col.matrix,col.matrix,0);
				col.matrix[9]=object.location[0];
				col.matrix[10]=object.location[2];
				col.matrix[11]=-object.location[1];
				col.refresh();


				var probs = Engine.probs;
				var l =probs.checkHitAll(col)
				var env = null;
				if(probs.hitListIndex>0){
					env = ono3d.environments[1];
				}
				objectInstance.draw(env);
//				if(globalParam.physics){
//					O3o.drawObject(objects[i],phyObjs,env);
//				}else{
//					O3o.drawObject(objects[i],null,env);
//				}
			}
		}
		
		Mat43.poolFree(1);
	}
	return ret;
})();
