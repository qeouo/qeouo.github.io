"use strict"

var field;
var shShader=[];
var sigmaShader;
var probs = new Collider();

var objMan = null;
var ono3d = Engine.ono3d;
var onoPhy = Engine.onoPhy;
var camera = Engine.camera;
var gl = globalParam.gl;
var WIDTH = Engine.WIDTH;
var HEIGHT = Engine.HEIGHT;


var MainScene=(function(){
	var ret = MainScene=function(){
		Engine.Scene.apply(this);

		objMan = this.objMan;
		Engine.go.main= objMan.createObj(Engine.goClass.main);

	};
	inherits(ret,Engine.Scene);
	
	return ret;
})();

Engine.goClass.main= (function(){
	var GoMain=function(){};
	var ret = GoMain;
	inherits(ret,Engine.defObj);

	ret.prototype.init=function(){


		for(var i=objMan.objs.length;i--;){
			if(this == objMan.objs[i])continue;
			objMan.deleteObj(objMan.objs[i]);
		}

		onoPhy.init();
		Engine.go.field= objMan.createObj(Engine.goClass.field);
	
		this.initFlg=false;
	}
	ret.prototype.move=function(){
		if(!this.initFlg){
			if(Util.getLoadingCount() > 0){
				return;
			}
			this.initFlg=true;
			var t = Engine.go.field;
			var o3o = field;

			var scene= field.scenes[0];
			Engine.skyTexture = scene.world.envTexture;

			scene.setFrame(0); //アニメーション処理
			var instance = o3o.createInstance(); //インスタンス作成
			Engine.go.field.instance=instance;
			instance.calcMatrix(0,true);

			ono3d.setTargetMatrix(0);
			ono3d.loadIdentity();

			instance.joinPhyObj(onoPhy);


			ono3d.environments_index=1;
			O3o.setEnvironments(scene); //光源セット

			var lightSource= null;

			lightSource = ono3d.environments[0].sun
			if(lightSource){
				camera.calcCollision(camera.cameracol2,lightSource.viewmatrix);
			}

			ono3d.clear();

			//環境マップ
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			ono3d.environments[0].envTexture = ono3d.createEnv(null,0,0,0,Engine.drawSub);


			//背景描画
			ono3d.setNearFar(0.01,100.0);
			ono3d.clear();
			var goField = Engine.go.field;
			goField.drawStatic();


			//ドロネー集合作成
			var target = instance.objectInstances["LightProbe"];
			var points ;
			if(target){
				var lightProbe = target .createLightProbe(ono3d);
				points = lightProbe.points;
			}
			var lightProbeTexture = Ono3d.createTexture(64,64);

			var a=function(){
				for(var i=0;i<points.length;i++){
					var v=points[i];
					Engine.createSHcoeff(v[0],v[1],v[2],Engine.drawSub);
					Ono3d.copyImage(lightProbeTexture,(i%7)*9,(i/7|0),0,0,9,1);
				}
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				ono3d.setViewport(0,0,lightProbeTexture.width,lightProbeTexture.height);
				Ono3d.drawCopy(0,0,1,1,lightProbeTexture,0,0,1,1);

				var d = new Vec4();
				if(false){
					setTimeout(a,1);
					console.log(px,py,pz);
				}else{
					var width=64,height=64;
					var u8 = new Uint8Array(width*height*4);
					gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, u8);

					var shcoefs=[];
					var ratio = 1/(255*16*16*Math.PI*4);

					for(var i=0;i<points.length;i++){
						var x = (i%7)*9;
						var y= (i/7|0);
						var ii = y*64+x;
						var shcoef=[];
						for(var j=0;j<9;j++){
							d[0] = u8[(j+ii)*4+0];
							d[1] = u8[(j+ii)*4+1];
							d[2] = u8[(j+ii)*4+2];
							d[3] = u8[(j+ii)*4+3];
							var e = [0,0,0];//new Vec3();
							Ono3d.unpackFloat(e,d);
							e[0]=e[0]*ratio;
							e[1]=e[1]*ratio;
							e[2]=e[2]*ratio;
							shcoef.push(e);
						}
						SH.mulA(shcoef);
						shcoefs.push(shcoef);
					}


					Util.loadText(globalParam.model,function(text){
						var o3o=JSON.parse(text);
						var mesh=o3o.meshes.find(function(e){return e.name===this},target.object.data.name);
						mesh.shcoefs =shcoefs;
						var filename = globalParam.model.substr(globalParam.model.lastIndexOf("/")+1);
						 document.getElementById("download").setAttribute("download",filename);
						var blob = new Blob([JSON.stringify(o3o,null,4)], { "type" : "text/plain" });
						 document.getElementById("download").href = window.URL.createObjectURL(blob);
						
					});
				}
			}
			a();
		}
	}
	ret.prototype.delete=function(){
	}
	
	return ret;

})();



Engine.goClass.field= (function(){
	var GoField =function(){};
	var ret = GoField;
	inherits(ret,Engine.defObj);

	var objMan = Engine.objMan;
	var ono3d = Engine.ono3d;
	var onoPhy = Engine.onoPhy;
	var camera = Engine.camera;
	var gl = globalParam.gl;
	ret.prototype.init=function(){

		var a  = this;
		field =O3o.load(globalParam.model,function(o3o){

			o3o.scenes[0].setFrame(0); //アニメーション処理
			var instance = o3o.createInstance(); //インスタンス作成
			instance.calcMatrix(0,true);
			a.instance=instance;

		});
	}
	ret.prototype.move=function(){

	}
	var cuboidcol = new Collider.Cuboid;
	var col = new Collider.Sphere();
	ret.prototype.drawStatic=function(){
		var phyObjs = this.phyObjs;

		ono3d.setTargetMatrix(0)
		ono3d.loadIdentity();

		ono3d.rf=0;

		var m43 = Mat43.poolAlloc();
		if(field.scenes.length>0){
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
			}
		}
		Mat43.poolFree(1);
	}
	return ret;
})();


	var url=location.search.substring(1,location.search.length)
	globalParam.outline_bold=0;
	globalParam.outline_color="000000";
	globalParam.lightcolor1="808080";
	globalParam.lightcolor2="808080";;
	globalParam.lightthreshold1=0.;
	globalParam.lightthreshold2=1.;
	globalParam.physics=1;
	globalParam.physics_=0;
	globalParam.smoothing=0;
	globalParam.stereomode=0;
	globalParam.stereovolume=1;
	globalParam.step=1;
	globalParam.fps=60;
	globalParam.scene=0;
	globalParam.shadow=1;
	globalParam.model="";
	globalParam.materialmode = false;
//カスタムマテリアル
	globalParam.basecolor= "ffffff";
	globalParam.metallic= 0;
	globalParam.metalcolor= "ffffff";
	globalParam.roughness= 0;
	globalParam.subroughness= 0;
	globalParam.frenel = 0;
	globalParam.opacity= 1.0;
	globalParam.ior= 1.1;
	globalParam.cnormal= 1.0;
	globalParam.emi= 0.0;

	globalParam.shader= 0;

//カメラ露光
	globalParam.autoexposure=1;
	globalParam.exposure_level=0.18;
	globalParam.exposure_upper=1;
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
	
Engine.userInit=function(){

	var select = document.getElementById("cTexture");
	var option;


	var control = document.getElementById("control");
	if(control){
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
	}
	
	//メインオブジェクト作成
	//Engine.go.main= Engine.objMan.createObj(Engine.goClass.main);
	Engine.scenes.push(new MainScene());


}

	sigmaShader=Ono3d.loadShader("sigma.shader");

	for(var i=0;i<9;i++){
		shShader.push(Ono3d.loadShader("sh"+i+".shader"));
	}
	Engine.enableDraw=false;

