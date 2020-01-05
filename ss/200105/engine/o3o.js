"use strict"
var O3o=(function(){
	const MAX_SIZE=4096;
	var abs=Math.abs;

	var loadTexture=function(path,func){
		return AssetManager.texture(path,func);
	}


	const REPEAT_NONE = i=0
		, REPEAT_LOOP = ++i
		,REPEAT_LINER = ++i
	;
	var  repeatConvert = {};
	repeatConvert["NONE"] = REPEAT_NONE;
	repeatConvert["LOOP"] = REPEAT_LOOP;
	repeatConvert["LINER"] = REPEAT_LINER;
	
	const INTERPOLATE_LINER = i=0
		,INTERPOLATE_SPLINE = ++i
	;

	const interpolateConvert = {};
	interpolateConvert["LINER"] = INTERPOLATE_LINER;
	interpolateConvert["SPLINE"] = INTERPOLATE_SPLINE;
	
	var OBJECT_MESH = i=1
		,OBJECT_ARMATURE= ++i
		,OBJECT_LIGHT= ++i
		,OBJECT_REFLECTIONPROBE= ++i
	;

	var ShapeKey = function(){
		this.shapeKeyPoints = [];
	};

	const FCURVE_ROT_QUAT = i=1
		,FCURVE_ROT_EULER = ++i
		,FCURVE_LOCATION = ++i
		,FCURVE_SCALE= ++i
		,FCURVE_SHAPEKEY = ++i 
		,FCURVE_OFFSET = ++i 
	;
	var fcurveConvert = {};
	fcurveConvert["rotation_quaternion"]=FCURVE_ROT_QUAT;
	fcurveConvert["rotation_euler"]=FCURVE_ROT_EULER;
	fcurveConvert["location"]=FCURVE_LOCATION;
	fcurveConvert["scale"]=FCURVE_SCALE;
	fcurveConvert["offset"]=FCURVE_OFFSET;
	fcurveConvert["value"]=FCURVE_SHAPEKEY;

	var QUATERNION=i=0
		,EULER_XYZ=1
		,EULER_XZY=6
		,EULER_YXZ=5
		,EULER_YZX=2
		,EULER_ZXY=4
		,EULER_ZYX=3
	;
	var rotationMode={}
	rotationMode["QUATERNION"]=QUATERNION;
	rotationMode["XYZ"]=EULER_XYZ;
	rotationMode["XZY"]=EULER_XZY;
	rotationMode["YXZ"]=EULER_YXZ;
	rotationMode["YZX"]=EULER_YZX;
	rotationMode["ZXY"]=EULER_ZXY;
	rotationMode["ZYX"]=EULER_ZYX;

	var O3o = function(){
		//モデルデータ
		this.scenes =[] ; //シーン情報
		this.objects = []; //オブジェクト情報
		this.materials = []; //マテリアル
		this.meshes = []; //メッシュ
		this.armatures = [];//スケルトン
		this.actions = []; //アニメーション
		this.lights = []; //照明

		this.environments=[];
		this.reflectionProbes= []; //反射プローブ

	}
	var ret =O3o;
	
	var ono3d = null;
	ret.setOno3d = function(a){
		ono3d=a;
	}



	var Scene = (function(){
		var Scene=function(){
			//シーン
			this.name=""; //名前
			this.frame_start=0; //開始フレーム
			this.frame_end=0;//終了フレーム
			this.objects= []; //シーンに存在するオブジェクト
			this.world = {};
		}
		var ret=Scene;

		ret.prototype.setFrame=ret.setFrame=function(frame){
			var objects = this.objects;
			var o3o = this.o3o;
			if(o3o){
				for(var i=o3o.materials.length;i--;){
					////マテリアルのUVアニメーション
					//var material=o3o.materials[i];
					//for(var j=material.texture_slots.length;j--;){
					//	var texture_slot = material.texture_slots[j];
					//	if(texture_slot.action){
					//		addaction(texture_slot,"0",texture_slot.action,frame);
					//	}
					//}
				}
			}

			for(var i=0;i<objects.length;i++){
				objects[i].flg=false;
			}

			for(var i=0;i<objects.length;i++){
				//オブジェクト(アーマチュア及びメッシュ)のアニメーション
				if(objects[i].action){
					//対象オブジェクトに関連するアクションを計算
					addaction(objects[i],"",objects[i].action,frame)
				}
				//objects[i].calcMatrix(frame);

				if(objects[i].objecttype===OBJECT_ARMATURE && objects[i].action){
					//もしアーマチュアの場合は、ボーンの計算を行う
					objects[i].pose.setAction(objects[i].action,frame);
				}
			}

		}
		return ret;
	})();

	var SceneObject = (function(){
		var SceneObject = function(){
			this.name="";//オブジェクト名
			this.type=""; //オブジェクト種類
			this.hide_render=0; //レンダリングするかどうか
			this.data=""; //内容(メッシュとかアーマチュア)
			this.modifiers=[]; //モディファイア

			this.location=new Vec3(); //平行移動
			this.scale=new Vec3(); //スケール
			this.rotation_mode=EULER_XYZ;//角度形式(デフォルトはオイラー角XYZ)
			this.rotation=new Vec4();//回転オイラー角かクォータニオン

			this.bound_box = [];//バウンディングボックス
			this.bound_type= "";//バウンディング形

			this.parent=""; //親オブジェクト
			this.iparentmatrix=new Mat43(); //親とのオフセット行列
			this.parent_bone=null; //親骨オブジェクト
			this.pose = null;

			this.action=""; //関連付けられたアニメーション
			this.groups=[]; //頂点グループ

			this.rigid_body = new RigidBody(); //剛体設定
			this.rigid_body_constraint = new RigidBodyConstraint();//剛体コンストレイント設定

			this.flg=false;//既に合成行列が計算されているかどうかのフラグ

			this.poseBones=null;
			this.static=0;
		}
		var ret=SceneObject;

		return ret;
	})();
	var Light = function(){
		this.name="";
		this.type="";
		this.color=new Vec3();
	}
	var ReflectionProbe= function(){
		this.name="";
		this.type="";
		this.distance=2;
		this.falloff=0.1;
	}
	var RigidBody = function(){
		//剛体設定
		this.type="";
		this.mass=1.0;
		this.collision_shape="";
		this.friction=0.5;
		this.restitution=0.0;
		this.collision_groups=0;
	}
	var RigidBodyConstraint = function(){
		//剛体コンストレイント設定
		this.breaking_threshold=0.0;
		this.disable_collisions=false;
		this.enabled= false;
		this.limit_ang_lower=new Vec3();
		this.limit_ang_upper=new Vec3();
		this.limit_lin_lower=new Vec3();
		this.limit_lin_upper=new Vec3();
		this.motor_ang_max_impulse=1;
		this.motor_ang_target_velocity=1;
		this.motor_lin_max_impulse=1;
		this.motor_lin_target_velocity=1;
		this.object1=null;
		this.object2=null;
		this.spring_damping=new Vec3();
		this.spring_stiffness=new Vec3();
		this.spring_damping_ang=new Vec3();
		this.spring_stiffness_ang=new Vec3();
		this.use_breaking=0;
		this.use_limit_ang=new Vec3();
		this.use_limit_lin=new Vec3();
		this.use_motor_ang=0;
		this.use_motor_lin=0;
		this.use_spring=new Vec3();
		this.use_spring_ang=new Vec3();
		this.type="";
	}
	var PoseBoneConstraint = function(){
		//ポーズボーンコンストレイント設定
		this.name="";
		this.type="";
		this.target="";
	}
	var Pose= ret.Pose = (function(){
		var Pose= function(armature){
			this.armature = armature;
			this.poseBones = []; // ボーンの状態
			this.matrices=[];
			for(var i=0;i<armature.bones.length;i++){
				this.poseBones.push(new PoseBone());
				this.matrices.push(new Mat43());
			}
		}
		var ret = Pose;

		ret.prototype.setAction=function(action,frame){
			var armature = this.armature;
			var poseBones = this.poseBones;
			for(var i=0;i<poseBones.length;i++){
				//ボーンの数だけ計算する
				var poseBone = poseBones[i];
				var bone = armature.bones[i];
				//対象ボーンのアクションを計算
				addaction(poseBone,bone.name,action,frame)
			}
		}

		ret.prototype.reset= function(){
			for(var i=0;i<this.poseBones.length;i++){
				this.poseBones[i].reset();
			}
		}
		ret.copy= function(a,b){
			for(var i=0;i<b.poseBones.length;i++){
				PoseBone.copy(a.poseBones[i],b.poseBones[i]);
			}
		}
		ret.add= function(a,b,c){
			for(var i=0;i<b.poseBones.length;i++){
				PoseBone.add(a.poseBones[i],b.poseBones[i],c.poseBones[i]);
			}
		}
		ret.sub = function(a,b,c){
			for(var i=0;i<b.poseBones.length;i++){
				PoseBone.sub(a.poseBones[i],b.poseBones[i],c.poseBones[i]);
			}
		}
		ret.madd = function(a,b,c,d){
			for(var i=0;i<b.poseBones.length;i++){
				PoseBone.madd(a.poseBones[i],b.poseBones[i],c.poseBones[i],d);
			}
		}
		ret.mul = function(a,b,c){
			for(var i=0;i<b.poseBones.length;i++){
				PoseBone.mul(a.poseBones[i],b.poseBones[i],c);
			}
		}
		return ret;
	})();

	var PoseBone = (function(){
		var PoseBone = function(){
			//ボーン状態
			this.location=new Vec3();
			this.rotation_mode=QUATERNION;
			this.rotation=new Vec4();
			this.scale=new Vec3();
			this.constraints=[];

			this.reset();
		}
		var ret = PoseBone;
		ret.prototype.reset = function(){
			Vec3.set(this.location,0,0,0);
			Vec3.set(this.rotation,0,0,0,0);
			Vec3.set(this.scale,1,1,1);
		}

		ret.copy=function(a,b){
			Vec3.copy(a.location,b.location);
			Vec3.copy(a.scale,b.scale);
			Vec4.copy(a.rotation,b.rotation);
		}
		ret.add=function(a,b,c){
			Vec3.add(a.location,b.location,c.location);
			for(var i=0;i<3;i++){
				a.scale[i]=b.scale[i]*c.scale[i];
			}
			Vec4.qdot(a.rotation,b.rotation,c.rotation);
		}
		ret.sub=function(a,b,c){
			Vec3.sub(a.location,b.location,c.location);
			for(var i=0;i<3;i++){
				a.scale[i]=b.scale[i]/c.scale[i];
			}
			Vec4.qmdot(a.rotation,b.rotation,c.rotation);
		}
		ret.mul=function(a,b,c){
			Vec3.mul(a.location,b.location,c);
			for(var i=0;i<3;i++){
				a.scale[i]=(b.scale[i]-1)*c+1;
			}
			Vec4.qmul(a.rotation,b.rotation,c);
		}
		ret.madd=function(a,b,c,d){
			Vec3.madd(a.location,b.location,c,d);
			Vec3.madd(a.scale,b.scale,c,d);
			var vec4 = Vec4.poolAlloc();
			iVec4.qmul(vec4,c,d);
			Vec4.qdot(a.rotation,b.rotation,vec4);
			Vec4.poolFree(1);
		}
		return ret;
	})();
	var Material = function(){
		//マテリアル
		this.name="";
		this.baseColor=new Vec3();
		Vec3.set(this.baseColor,1,1,1);
		this.baseColorMap="";
		this.opacity=1.0;
		this.specular=0.0;
		this.metallic=0.0;
		this.roughness=0.0;
		this.ior=1.0;
		this.subRoughness=0.0;
		this.emt=0.0;
		this.pbrMap="";
		this.hightMap="";
		this.hightMapPower=0;
		this.hightBase=0.5;
		this.lightMap="";
		this.uv="";
		this.fresnel=0.0;

		this.shader="";
	}
	var Environment = function(){
		//ライティング環境
		this.name="";
		this.lights=[];
		this.lightProbe=null;
	}

	ret.Material=Material;
	var defaultMaterial= ret.defaultMaterial= new Material();

	var Armature = function(){
		//骨組み
		this.name=""; //名前
		this.bones=[]; //骨
	}
	Armature.prototype.objecttype=OBJECT_ARMATURE;
	function Bone(){
		//骨
		this.name="";
		this.parent="";
		this.length=0;
		this.matrix = new Mat43();
		this.imatrix = new Mat43();
	};
	ret.Bone = Bone;

	var ShapeKey = function(){
		//シェイプキー
		this.name=""
		this.shapeKeyPoints = [];
	}

	var Mesh = function(){
		//メッシュ情報
		this.name=""; //名前
		this.use_auto_smooth = 0;
		this.auto_smooth_angle = 0;
		this.vertices = [];//頂点
		this.colors=[];//頂点色
		this.shcoefs=[];//球面調和関数の係数
		this.shapeKeys = [];//シェイプキー
		this.faces = [];//面
		this.edges = [];//辺
		this.flg=0; //フラグ
		this.uv_layers=[];//uv情報
	};
	var Uv_layer= function(){
		//uv情報
		this.name="" //名前
		this.data=[]; //uv値
	};
	Mesh.prototype.objecttype=OBJECT_MESH;
	ret.Mesh = Mesh;

	var TypedClass=(function(){
		var TypedClass=function(){};
		var ret=TypedClass;

		ret.array=function(n){
			var size=this.size;
			var buffer=new ArrayBuffer(size*n);
			var arr=[];
			for(var i=0;i<n;i++){
				var obj = new this(buffer,size*i);
				arr.push(obj);
			}
			arr.buf=new Int8Array(buffer);
			return arr;
		}
		//ret.set=function(src){

		//	new Int8Array(src.vertices[0].pos.buffer);
		//	var bbb=new Int8Array(dst.vertices[0].pos.buffer);
		//	bbb.set(aaa);

		//}
		ret.size=0;
		return ret;
	})();
	var Vertex = function(buffer,offset){
		if(!buffer){
			buffer=new ArrayBuffer(Vertex.size);
			offset=0;
		}
		//頂点
		//12+12+3+12=39バイト
		this.pos = new Float32Array(buffer,offset,3);//new Vec3(); //座標
		this.normal = new Float32Array(buffer,offset+12,3);//new Vec3(); //法線
		this.groupWeights = new Float32Array(buffer,offset+24,3);//[1,0,0]; //グループウェイト
		this.groupWeights.set([1,0,0]);
		this.groups =new Int8Array(buffer,offset+36,3);//[-1,-1,-1]; //グループ
		this.groups.set([-1,-1,-1]);
	};
	Vertex.size=40;
	ret.Vertex=Vertex;
	Vertex.array=TypedClass.array;

	var Face =function(buffer,offset){
		//面
		if(!buffer){
			buffer=new ArrayBuffer(Face.size);
			offset=0;
		}
		//this.uv = new Array(8); //uv値(そのうち消す)
		this.idx = new Int16Array(buffer,offset,4);//[ -1 , -1 , -1 , -1]; //頂点インデックス
		this.idx.set([-1,-1,-1,-1]);
		this.normal = new Float32Array(buffer,offset+8,3);// new Vec3(); //法線
		this.material = null ; //マテリアル
		this.flg=0;//フラグ
		this.fs=0; //フラグ2
		this.mat=-1;
		this.idxnum=3;//頂点数
	};
	ret.Face=Face;
	Face.size=28
	Face.array=TypedClass.array;

	var Edge = function(buffer,offset){
		//辺
		if(!buffer){
			buffer=new ArrayBuffer(Edge.size);
			offset=0;
		}
		
		this.vIndices=new Int16Array(buffer,offset,2);
		this.fIndices=new Int16Array(buffer,offset+4,2);
		this.fIndices.set([-1,-1]);
//		this.vIndices[0] = -1; //頂点インデックス1
//		this.vIndices[1] = -1;//頂点インデックス2
//		this.fIndices[0] = -1;//面インデックス1
//		this.fIndices[1] = -1;//面インデックス2
	}
	Edge.size=8;
	Edge.array=TypedClass.array;
	ret.Edge=Edge;

	function Action(){
		//アクション
		this.name=""; //アクション名
		this.endframe=0; //終了フレーム
		this.id_root=""; //ターゲットの種類
		this.fcurves =[];  //キーフレーム情報
	}
	function Fcurve(){
		//キーフレーム
		this.target ="";//ターゲット(ボーン名かマテリアル番号)
		this.type =""; //
		this.idx=0; //
		this.interpolatemode=INTERPOLATE_LINER; //補完タイプ
		this.repeatmode = REPEAT_NONE;//繰り返しタイプ
		this.keys = []; //キー時間
		this.params = []; //キーパラメータ
	}
	function Modefier(){
		//モデファイア
		this.name=""; //名称
		this.type=""; //種類
	}

	var bufMesh=new Mesh(); //メッシュバッファ
	bufMesh.ratios=[];
	bufMesh.vertices=Vertex.array(MAX_SIZE);
	bufMesh.faces=Face.array(MAX_SIZE);
	bufMesh.edges=Edge.array(MAX_SIZE);
	for(i=0;i<MAX_SIZE;i++){
		//bufMesh.faces.push(new Face());
		//bufMesh.edges.push(new Edge());
		bufMesh.ratios.push(new Vec4());

	};

	ret.bufMesh = bufMesh;

	var createXMLHttpRequest = function(){
	  if (window.XMLHttpRequest) {
		return new XMLHttpRequest();
	  } else if (window.ActiveXObject) {
		try {
		  return new ActiveXObject("Msxml2.XMLHTTP");
		} catch (e) {
		  try {
			return new ActiveXObject("Microsoft.XMLHTTP");
		  } catch (e2) {
			return null;
		  }
		}
	  } else {
		return null;
	  }
	}
	
	var onloadfunc= function(o3o,url,buf){
		var i,imax,j,jmax
		//if(buf.substring(0,11) ==="Metasequoia"){
		//}else if(buf.substring(0,16) ==='{"format":"Ono3d'){
			loadret(o3o,url,buf)
		//}else{
		//	return
		//}

		var res =  /.*\//.exec(url)
		var currentdir=""
		var texture
		if(res) currentdir = res[0]
		o3o.name=url
		res= /[^\/]*$/.exec(url)
		if(res)o3o.name=res[0]


		var loadMap = function(_path,flg){
			if(_path ==="")return null;

			var res =/[^\\\/]*$/.exec(_path)
			var path = currentdir + res[0];
			var func= function(image){
				var gl = Rastgl.gl;
				gl.bindTexture(gl.TEXTURE_2D, image.glTexture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
				//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			};

			if(flg){
				return AssetManager.bumpTexture(path,func);
			}else{
				return loadTexture(path,func);

			}
		}

		for(i=o3o.scenes.length;i--;){
			var scene = o3o.scenes[i]
			for(j=scene.objects.length;j--;){
				scene.objects[j] = o3o.objects.find(function(a){return a.name === this;},scene.objects[j]);
			}

			if(scene.world.envTexture){
				var res =/[^\\\/]*$/.exec(scene.world.envTexture)
				var path = currentdir + res[0];
				scene.world.envTexture = Engine.loadEnvTexture(path);
			}
		}

		//loadtexture
		for(i=o3o.materials.length;i--;){
			var material= o3o.materials[i];
			material.baseColorMap = loadMap(material.baseColorMap,0);
			material.pbrMap = loadMap(material.pbrMap,0);
			material.hightMap = loadMap(material.hightMap,1);
			material.lightMap = loadMap(material.lightMap,0);

			if(material.shader !== ""){
				if(ono3d.shaders[material.shader]){
					continue;
				}
				var currentpath = Util.getCurrent();
				var filename = material.shader;
				ono3d.shaders[filename]=Ono3d.loadShader(currentdir +filename + ".shader");
			}
		}
		

		//edge
		var addEdge=function(edges,v0,v1,f){
			var i,imax
			for(i=0,imax=edges.length;i<imax;i++){
				if((edges[i].vIndices[0]===v0 && edges[i].vIndices[1]===v1)
				|| (edges[i].vIndices[0]===v1 && edges[i].vIndices[1]===v0)){
					if(edges[i].fIndices[0]<0){
						edges[i].fIndices[0]=f
					}else{
						edges[i].fIndices[1]=f
					}
					return 0
				}
			}
			var edge = new Edge()
			edge.vIndices[0]=v0
			edge.vIndices[1]=v1
			edge.fIndices[0]=f
			edge.fIndices[1]=-1;
			edges.push(edge)
			return 1
		}
		for(i=0;i<o3o.meshes.length;i++){
			var faces=o3o.meshes[i].faces
			var edges;
			if(o3o.meshes[i].edges){
				edges=o3o.meshes[i].edges;
			}else{
				edges=[];
				o3o.meshes[i].edges=edges;
			}
			for(j=0,jmax=faces.length;j<jmax;j++){
				var face=faces[j];
				if(face.idx[3]>=0){
					face.idxnum=4;
				}else{
					face.idxnum=3;
				}

				for(var k=0;k<face.idxnum-1;k++){
					addEdge(edges,face.idx[k],face.idx[k+1],j)
				}
				addEdge(edges,face.idx[face.idxnum-1],face.idx[0],j)
			}
			o3o.meshes[i].edgeSize=edges.length;
			var edges2=Edge.array(o3o.meshes[i].edgeSize);
			for(j=0;j<edges.length;j++){
				var t=edges2[j].vIndices;
				new Int8Array(t.buffer,t.byteOffset).set(new Int8Array(edges[j].vIndices.buffer));
			}
			o3o.meshes[i].edges=edges2;
		}

		var bind=function(object,modifier){
			var mod= new Mesh();
			freezeMesh(mod,modifier.object);
			freezeMesh(bufMesh,object);
			var binddata=[];
			var ret1 = Vec3.poolAlloc();
			var ret2 = Vec3.poolAlloc();
			var BINDSIZE=2;
			for(var i=0;i<bufMesh.vertexSize;i++){
				var pos = bufMesh.vertices[i].pos;
				var binds=[];

				for(var j=0;j<mod.faceSize;j++){
					//近い面を探す
					var l= 99999999;
					for(var k=0;k<mod.faces[j].idxnum-2;k++){
						Geono.TRIANGLE_POINT(ret1,mod.vertices[mod.faces[j].idx[0]].pos
							,mod.vertices[mod.faces[j].idx[1+k]].pos
							,mod.vertices[mod.faces[j].idx[2+k]].pos
							,pos);
						l = Math.min(l,Vec3.len2(ret1,pos));
					}

					//頂点に既にバインドされている面より近い場合はバインドデータ付与
					var k=0;
					for(k=0;k<binds.length;k++){
						if(binds[k].weight>l){
							break;
						}
					}

					if(k<BINDSIZE){
						var bind={idx:-1,weight:99999,len:0,pweight:[0,0,0]};
						bind.idx = j;
						bind.weight=l;
						binds.splice(k,0,bind);
						binds.splice(BINDSIZE,binds.length-BINDSIZE);
					}

				}
				var sum=0;
				var v = Vec3.poolAlloc();
				for(var j=0;j<binds.length;j++){
					var bind = binds[j];
					//ウェイト変換
					if(bind.weight===0){
						//面との距離が0の場合はウェイト1で終了
						for(var k=0;k<bind.length;k++){
							binds[k].weight=0;
						}
						bind.weight=1;
						sum=1;
						break;
					}
					bind.weight=1/Math.sqrt(bind.weight);//距離の逆数をウェイトにする
					sum+=bind.weight;//総ウェイト

					//面との位置関係を求める
					var face =mod.faces[bind.idx];
					Vec3.cross2(ret1,mod.vertices[face.idx[0]].pos
						,mod.vertices[face.idx[1]].pos
						,mod.vertices[face.idx[2]].pos);
					Vec3.norm(ret1);
					Vec3.sub(ret2,pos,mod.vertices[face.idx[0]].pos);
					bind.len = Vec3.dot(ret1,ret2); //法線距離

					if(face.idxnum==4){
						Geono.calcSquarePos(bind.pweight,mod.vertices[face.idx[0]].pos
							,mod.vertices[face.idx[1]].pos
							,mod.vertices[face.idx[2]].pos
							,mod.vertices[face.idx[3]].pos,pos);
						bind.pweight[2]=bind.pweight[0]*bind.pweight[1];
					}else{
						Vec3.sub(v,mod.vertices[face.idx[2]].pos,mod.vertices[face.idx[1]].pos);
						Vec3.add(v,mod.vertices[face.idx[0]].pos,v);
						Geono.calcSquarePos(bind.pweight,mod.vertices[face.idx[0]].pos
							,mod.vertices[face.idx[1]].pos
							,mod.vertices[face.idx[2]].pos
							,v,pos);
						bind.pweight[2]=0;
					}
					bind.pweight[3]=bind.len;
				}
				Vec3.poolFree(1);

				sum=1/sum;
				for(var j=0;j<binds.length;j++){
					binds[j].weight*=sum;//ウェイトの総計1になるようスケーリング
				}
				binddata.push(binds);
			}
			modifier.binddata=binddata;

			var basePos=[];
			for(var i=0;i<mod.vertexSize;i++){
				basePos.push(new Vec3());
				Vec3.copy(basePos[i],mod.vertices[i].pos);
			}
			modifier.basePos=basePos;
			Vec3.poolFree(2);
		};

	}
	ret.load=function(url,callback){
		var o3o=new ret();
		Util.loadText(url,function(buf){
			onloadfunc(o3o,url,buf)
			if(callback){
				callback(o3o);
			}
		});
		
		return o3o;
	}


	var classes ={};
	//classes["materials"]=Material;
	//classes["meshes"]=Mesh;
	//classes["vertices"]=Vertex;
	//classes["faces"]=Face;
	classes["armatures"]=Armature;
	classes["actions"]=Action;
	classes["objects"]=SceneObject;
	classes["scenes"]=Scene;
	classes["lights"]=Light;
	classes["reflectionprobes"]=ReflectionProbe;
	classes["bones"]=Bone;
	classes["uv_layers"]=Uv_layer;
	classes["fcurves"]=Fcurve;
	var setdata2 = function(dst,src){
		for(var member in src){
			var srcdata=src[member];
			var dstdata=dst[member];
			if(srcdata == null)continue;
			var to= typeof srcdata;
			if(to == "string" || to == "number"){
				dst[member]=srcdata;
			}else if(dstdata instanceof Int8Array || dstdata instanceof Int16Array){
				for(var i=0;i<srcdata.length;i++){
					dstdata[i]=srcdata[i]|0;
				}
			}else if(dstdata instanceof Float32Array){
				for(var i=0;i<srcdata.length;i++){
					dstdata[i]=srcdata[i];
				}
			}else if(dstdata instanceof Array && srcdata.length > 0){
					
				if(typeof srcdata[0] == "string" || typeof srcdata[0] == "number"){
						dst[member] = srcdata;
				}else if(classes[member]){
					for(var i=0;i<srcdata.length;i++){
						var obj = new (classes[member]);
						setdata2(obj,srcdata[i]);
						dstdata.push(obj);
					}
				}else if(dstdata.length>0){
					for(var i=0;i<srcdata.length;i++){
						setdata2(dstdata[i],srcdata[i]);
					}
				}else{
					dst[member] = srcdata;
				}
			}else{
				dst[member] = srcdata;
			}
			
		}
	}

	var loadret = function(o3o,url,buf){
		var res =  /.*\//.exec(url)
		var currentdir="./"
		if(res) currentdir = res[0]

		var raw=JSON.parse(buf);
	

		var size=raw.materials.length;
		for(var i=0;i<size;i++){
			o3o.materials.push(new Material);
		}
		size=raw.meshes.length;
		for(var i=0;i<size;i++){
			var rawdata=raw.meshes[i];
			var mesh= new Mesh();
			o3o.meshes.push(mesh);

			mesh.vertices=Vertex.array(rawdata.vertices.length);
			mesh.faces=Face.array(rawdata.faces.length);
		}

		setdata2(o3o,raw);

		for(var type in o3o){
			//1層目のオブジェクトには親のリンク作っとく
			var arrays=o3o[type];
			if(arrays instanceof Array){
				for(var i=0;i<arrays.length;i++){
					arrays[i].o3o=o3o;
				}
			}
		}

		for(j=o3o.objects.length;j--;){
			o3o.objects[o3o.objects[j].name]=o3o.objects[j] ;
		}

		for(j=o3o.actions.length;j--;){
			o3o.actions[o3o.actions[j].name]=o3o.actions[j] ;
		}

		//オブジェクトのdataをアドレスに変換
		var typedatas={
			"MESH":{objecttype:OBJECT_MESH,target:"meshes"}
			,"ARMATURE":{objecttype:OBJECT_ARMATURE,target:"armatures"}
			,"LIGHT":{objecttype:OBJECT_LIGHT,target:"lights"}
			,"LIGHT_PROBE":{objecttype:OBJECT_REFLECTIONPROBE,target:"reflectionProbes"}
		};
		var scene,name,object,objects
		for(j=o3o.objects.length;j--;){
			object=o3o.objects[j]
			var typedata = typedatas[object.type];
			if(typedata){
				object.objecttype=typedata.objecttype;
				object.data=o3o[typedata.target].find(function(a){return a.name === this;},object.data)
			}else{
				object.objecttype="";
				object.data=null;
			}

			object.parent=o3o.objects.find(function(a){return a.name === this;},object.parent)

			for(k=0;k<object.modifiers.length;k++){
				object.modifiers[k].object=o3o.objects.find(function(a){return a.name === this;},object.modifiers[k].object)
				var  name=object.modifiers[k].vertex_group;
				object.modifiers[k].vertex_group=-1;
				for(var l=0;l<object.groups.length;l++){
					if(object.groups[l]===name){
						object.modifiers[k].vertex_group=l;
						break;
					}
				}
			}
			object.action=o3o.actions.find(function(a){return a.name === this;},object.action)

			if(object.rigid_body_constraint){
				object.rigid_body_constraint.object1
					= o3o.objects.find(function(a){return a.name === this;},object.rigid_body_constraint.object1);
				object.rigid_body_constraint.object2
					= o3o.objects.find(function(a){return a.name === this;},object.rigid_body_constraint.object2);

			}
		}

		for(var i=0;i< o3o.meshes.length;i++){
			var mesh=o3o.meshes[i];

			for(var j=0;j< mesh.vertices.length;j++){
				//ウェイト自動設定
				var vertex=mesh.vertices[j];
				if(vertex.groupWeights.length==0){
					for(var i=0;i<vertex.groups.length;i++){
						vertex.groupWeights.push(1.0/vertex.groups.length);
					}
				}
			}
			mesh.vertexSize=mesh.vertices.length;


			for(var j=0;j< mesh.faces.length;j++){
				//三角ポリか四角ポリか
				var face = mesh.faces[j];
				for(var k=0;k<4;k++){
					if(face.idx[k]<0)break
				}
				face.idxnum=k
			}
			mesh.faceSize=mesh.faces.length;

			mesh.uv_layerSize=mesh.uv_layers.length;

			if(mesh.double_sided){
				mesh.flg&=~Ono3d.RF_DOUBLE_SIDED;
				mesh.flg|=Ono3d.RF_DOUBLE_SIDED;
				delete mesh.double_sided;
			}
		}
	
		for(var i=0;i< o3o.actions.length;i++){
			var action = o3o.actions[i];
			for(var j=0;j< action.fcurves.length;j++){
				//フレームとパラメータ値を分ける
				var fcurve=action.fcurves[j];
				var keys = fcurve.keys;
				delete fcurve.keys;
				fcurve.keys=[];
				fcurve.params=[];
				for(var k=0;k< keys.length;k++){
					fcurve.keys.push(keys[k].f);
					fcurve.params.push(keys[k].p);
				}
				fcurve.type=fcurveConvert[fcurve.type]; //文字列をコードに変換
			}
		}
	


		for(j=o3o.objects.length;j--;){
			var object=o3o.objects[j];
			if(object.type==="ARMATURE"){
				object.pose = new Pose(object.data);
				object.pose.object=object;

				if(object.poseBones){
					for(var k=0;k<object.poseBones.length;k++){
						var poseBone = object.poseBones[k];
						if(poseBone.constraints){
							for(var l=0;l<poseBone.constraints.length;l++){
								var constraint = poseBone.constraints[l]
								constraint.target=o3o.objects.find(function(a){return a.name === this;},constraint.target)
							}
						}else{
							poseBone.constraints=[];
						}

					}
				}
			}

		}
		var count=0
		for(var i=o3o.meshes.length;i--;){
			mesh = o3o.meshes[i]
			//マテリアルのポインタ設定
			for(j=mesh.faces.length;j--;){
				var face =mesh.faces[j]
				face.material = o3o.materials[face.mat]
			}
			
		}
	
		//骨の名称をアドレスに変更
		for(var i=o3o.armatures.length;i--;){
			var armature=o3o.armatures[i]
			for(j=armature.bones.length;j--;){
				var bone = armature.bones[j]
				Mat43.getInv(bone.imatrix,bone.matrix)
				var a=new Mat43();
				Mat43.dot(a,bone.matrix,bone.imatrix);
				for(k=armature.bones.length;k--;){
					if(bone.parent === armature.bones[k].name){
						bone.parent = armature.bones[k] 
						break
					}
				}
				bone.id=j;
			}
		}
		
		for(var j=o3o.objects.length;j--;){
			object=o3o.objects[j]
			if(object.parent){
				if(object.parent_bone){
					for(var i=0;i<object.parent.data.bones.length;i++){
						if(object.parent_bone == object.parent.data.bones[i].name){
							object.parent_bone = i+1;
						}
					}
				}
			}
		}


		return o3o
	}
	
	var copyMesh= function(dst,src){
		dst.name=src.name;

		//頂点情報をコピー
		//var d=src.vertexSize - dst.vertices.length;
		//for(var i = 0;i<d;i++){
		//	//変数領域が足りない場合は追加
		//	dst.vertices.push(new Vertex());
		//}
		//for(var i = 0;i<src.vertexSize;i++){
		//	dst.vertices[i].pos.set(src.vertices[i].pos);
		//	for(var j=0;j<3;j++){
		//		dst.vertices[i].groups[j]= src.vertices[i].groups[j];
		//		dst.vertices[i].groupWeights[j]= src.vertices[i].groupWeights[j];
		//	}
		//}
		dst.vertices.buf.set(src.vertices.buf);
//		var aaa=new Int8Array(src.vertices[0].pos.buffer);
//		var bbb=new Int8Array(dst.vertices[0].pos.buffer);
//		bbb.set(aaa);
		dst.vertexSize=src.vertexSize;

		//辺情報をコピー
		//var d=src.edgeSize - dst.edges.length;
		//for(var i = 0;i<d;i++){
		//	//変数領域が足りない場合は追加
		//	dst.edges.push(new Edge());
		//}
		//for(var i = 0;i<src.edgeSize;i++){
		//	var srcEdge=src.edges[i];
		//	var dstEdge=dst.edges[i];
		//	dstEdge.vIndices[0]=srcEdge.vIndices[0];
		//	dstEdge.vIndices[1]=srcEdge.vIndices[1];
		//	dstEdge.fIndices[0]=srcEdge.fIndices[0];
		//	dstEdge.fIndices[1]=srcEdge.fIndices[1];
		//}
		dst.edges.buf.set(src.edges.buf);
		//aaa=new Int8Array(src.edges[0].vIndices.buffer);
		//bbb=new Int8Array(dst.edges[0].vIndices.buffer);
		//bbb.set(aaa);
		dst.edgeSize=src.edgeSize;

		//面情報をコピー
		//d=src.faceSize - dst.faces.length;
		//for(var i = 0;i<d;i++){
		//	//変数領域が足りない場合は追加
		//	dst.faces.push(new Face());
		//}
		for(var i = 0;i<src.faceSize;i++){
			var dstFace=dst.faces[i];
			var srcFace =src.faces[i];

			dstFace.material = srcFace.material;
			dstFace.mat= srcFace.mat;
			dstFace.idxnum=srcFace.idxnum;
			dstFace.fs = srcFace.fs;

	//		for(var j=0;j<srcFace.idxnum;j++){
	//			dstFace.idx[j]= srcFace.idx[j];
	//		}
		}
		if(src.faces.length>0){
			dst.faces.buf.set(src.faces.buf);
		}
		//aaa=new Int8Array(src.faces[0].idx.buffer);
		//bbb=new Int8Array(dst.faces[0].idx.buffer);
		//bbb.set(aaa);

		dst.faceSize=src.faceSize;

		//uvをコピー
		var d=src.uv_layersSize - dst.uv_layers.length;
		for(var i = 0;i<d;i++){
			//変数領域が足りない場合は追加
			dst.uv_layers.push(new Uv_layer());
		}
		for(var i = 0;i<src.uv_layerSize;i++){
			var srcdata=src.uv_layers[i].data;
			if(dst.uv_layers.length<=i){
				dst.uv_layers.push(new Uv_layer());
			}
			var dstdata=dst.uv_layers[i].data;
			d = src.faceSize - dstdata.length;
			for(var j=0;j<d;j++){
				dstdata.push([]);
			}

			for(var j = 0;j<src.faceSize;j++){
				dstdata[j][0] = srcdata[j][0];
				dstdata[j][1] = srcdata[j][1];
				dstdata[j][2] = srcdata[j][2];
				dstdata[j][3] = srcdata[j][3];
				dstdata[j][4] = srcdata[j][4];
				dstdata[j][5] = srcdata[j][5];
				dstdata[j][6] = srcdata[j][6];
				dstdata[j][7] = srcdata[j][7];
			}
		}
		dst.uv_layerSize=src.uv_layerSize;
		
	}
	
	var addaction = ret.addaction= function(obj,name,action,frame){
		var a,b,c
			,tim,ratio
			,fcurve
			,keys
			,mat43
			,paramA,paramB
			,quat = Vec4.poolAlloc();
		;

		frame=frame%action.endframe;

		for(var i=0,imax=action.fcurves.length;i<imax;i++){
			if(action.fcurves[i].target !== name)continue;
			fcurve=action.fcurves[i]
			keys=fcurve.keys;
			tim=frame

			a=0;b=fcurve.keys.length-1
			switch(fcurve.repeatmode){
			case REPEAT_NONE:
				if(tim<keys[a])tim=keys[a]
				if(tim>keys[b])tim=keys[b]
				break
			case REPEAT_LOOP:
				if(tim<keys[a])tim=keys[b]-(keys[a]-tim)%(keys[b]-keys[a])
				if(tim>keys[b])tim=keys[a]+(tim-keys[b])%(keys[b]-keys[a])
				break
			case REPEAT_LINER:
				break
			}
			while (a < b) {
				c = (a + b) >>1;
				if (keys[c] <= tim){
					a = c + 1;
				}else{
					b = c;
				}
			}
			if(tim === keys[a]){
				ratio=0;
				paramA=fcurve.params[a]
				paramB=paramA;//fcurve.params[a]
			}else{
				if(a>0)a--
				ratio=(tim-keys[a])/(keys[a+1]-keys[a])
				ratio=ratio*ratio*(3-2*ratio);
				paramA=fcurve.params[a]
				paramB=fcurve.params[a+1]
			}
			if(fcurve.type==FCURVE_ROT_QUAT){
				Vec4.slerp(obj.rotation,paramA,paramB,ratio)
			}else{
				var target;
				switch(fcurve.type){
				case FCURVE_ROT_EULER:
					target=obj.rotation;
					break;
				case FCURVE_SCALE:
					target=obj.scale;
					break;
				case FCURVE_LOCATION:
					target=obj.location;
					break;
				case FCURVE_OFFSET:
					target=obj.offset;
					break;
				}
				target[fcurve.idx]= (paramB-paramA)*ratio + paramA
			}
		}

		Vec4.poolFree(1);
	}

	var genMatrix=function(mat,obj){
		if(obj.rotation_mode===QUATERNION){
			Mat43.fromLSR(mat,obj.location,obj.scale,obj.rotation);
		}else{
			Mat43.fromLSE(mat,obj.location,obj.scale,obj.rotation);
		}
	}
	var setMaterial=function(material,name){
		var renderMaterial;
		var material;
		var renderMaterials=ono3d.materials;
		var i=0;
		for(;i<ono3d.materials_index;i++){
			if(renderMaterials[i].name === name){
				return i;
			}
		}
		renderMaterial = renderMaterials[i];
		ono3d.materials_index++;

		renderMaterial.offsetx=0;
		renderMaterial.offsety=0;
		renderMaterial.name =name;
		Vec3.copy(renderMaterial.baseColor,material.baseColor);
		renderMaterial.opacity = material.opacity;
		renderMaterial.metallic= material.metallic;
		renderMaterial.specular= material.specular;
		renderMaterial.roughness= material.roughness;
		renderMaterial.ior = material.ior;
		renderMaterial.subRoughness = material.subRoughness;
		renderMaterial.emt = material.emt;
		

		renderMaterial.baseColorMap= material.baseColorMap; 
		renderMaterial.hightMap =material.hightMap;
		renderMaterial.hightMapPower =material.hightMapPower;
		renderMaterial.hightBase=material.hightBase;
		renderMaterial.pbrMap = material.pbrMap;
		renderMaterial.lightMap = material.lightMap;

		renderMaterial.shader = material.shader;

		return i;
	}

	var materialTable=new Array(256);

	var _PI=1.0/Math.PI;


	var calcSHcoef=[];
	for(var i=0;i<9;i++){
		calcSHcoef.push(new Vec3());
	}
	var calcSH=function(color,normal,vertex,shcoefs,ratio){
		var hitTriangle = vertex.hitTriangle;
		if(!hitTriangle){
			Vec3.set(color,0.5,0.5,0.5);
			return;
		}
		if(shcoefs.length===0){
			Vec3.set(color,0.5,0.5,0.5);
			return;
		}

		var pIdx=hitTriangle.pIdx;
		for(var i=0;i<calcSHcoef.length;i++){
			Vec3.set(calcSHcoef[i],0,0,0);
		}
		for(var k=0;k<4;k++){
			var shcoef=shcoefs[pIdx[k]];
			var r=ratio[k];
			for(var i=0;i<calcSHcoef.length;i++){
				Vec3.madd(calcSHcoef[i],calcSHcoef[i],shcoef[i],r);
			}
		}

	}

	var copyFace = function(dst,src){
		dst.vertices[0]=src.vertices[0];
		dst.vertices[1]=src.vertices[1];
		dst.vertices[2]=src.vertices[2];
		dst.environments[0]=src.environments[0];
		dst.environments[1]=src.environments[1];
		dst.environmentRatio=src.environmentRatio;
		dst.material=src.material;
	}
	ret.drawStaticFaces = function(faces){
		var idx= ono3d.faces_index;

		var renderFaces=ono3d.faces;
		for(var i=0;i<faces.length;i++){
			copyFace(renderFaces[idx+i],faces[i]);
		}
		ono3d.faces_index+=faces.length;
		return ;
	}


	ret.createCollision = function(obj){
		var collision=null;
		var shape = obj.bound_type;
		if(obj.rigid_body.type){
			shape = obj.rigid_body.collision_shape;
		}
		if(shape == "SPHERE"){
			collision = new Collider.Sphere();
		}else if(shape=="BOX"){
			collision = new Collider.Cuboid();
		}else if(shape=="CYLINDER"){
			collision = new Collider.Cylinder();
		}else if(shape=="CONE"){
			collision = new Collider.Cone();
		}else if(shape=="CAPSULE"){
			collision = new Collider.Capsule();
		}else if(shape=="CONVEX_HULL"){
			var mesh = obj.data;
			collision = new Collider.ConvexHull();
			for(var i=0;i<mesh.vertices.length;i++){
				collision.poses.push(new Vec3());
			}
		}else if(shape=="MESH"){
			var mesh = obj.data;
			collision = new Collider.Mesh();
			for(var i=0;i<mesh.vertices.length;i++){
				collision.poses.push(new Vec3());
			}
			for(var i=0;i<mesh.faces.length;i++){
				var triangle = new Collider.Triangle();
				triangle.poses[0] = collision.poses[mesh.faces[i].idx[0]];
				triangle.poses[1] = collision.poses[mesh.faces[i].idx[1]];
				triangle.poses[2] = collision.poses[mesh.faces[i].idx[2]];
				collision.triangles.push(triangle);
			}
		}
		if(collision){
			collision.name = obj.name;
			collision.groups = obj.rigid_body.collision_groups;
		}
		return collision;

	}
	ret.createPhyObj = function(obj,instance){
		var mesh,obj
		,phyobj= null
		,vertices
		var renderVertices =bufMesh.vertices;
		var renderVertex;
		var renderFaces =bufMesh.faces;
		var renderFace;
		var idx;
		

		var mod;
		if(obj.rigid_body.type){
			var rigid=obj.rigid_body;
			var shape = rigid.collision_shape;
			phyobj = new OnoPhy.RigidBody();
			//phyobj=onoPhy.createRigidBody();

			var collision = O3o.createCollision(obj);
			phyobj.collision=collision;
			if(collision){
				//onoPhy.collider.addCollision(collision);
				if(collision.type ===Collider.MESH || collision.type ===Collider.CONVEX_HULL){
					phyobj.mesh = obj.data;
				}
				collision.parent=phyobj;
				var b = obj.bound_box;
				phyobj.collisionSize[0]=(b[3] - b[0])*0.5;
				phyobj.collisionSize[1]=(b[4] - b[1])*0.5;
				phyobj.collisionSize[2]=(b[5] - b[2])*0.5;
			}

			if(rigid.type ==="ACTIVE"){
				phyobj.fix=false;
			}
			phyobj.friction=rigid.friction;
			phyobj.restitution=rigid.restitution;
			phyobj.mass = rigid.mass;
			phyobj.name=obj.name;
			Mat43.toLSR(phyobj.location,phyobj.scale,phyobj.rotq,instance.o3oInstance.objectInstances[obj.idx].matrix);

		}
		for(var i=0;i<obj.modifiers.length;i++){
			mod = obj.modifiers[i];
			if(mod.type==="CLOTH" || mod.type==="SOFT_BODY"){
				mesh = obj.data;
				instance.freezeMesh(bufMesh);

				if(mod.type==="CLOTH"){
					phyobj = new OnoPhy.Cloth(bufMesh.vertexSize
						,bufMesh.edgeSize
						,bufMesh.faceSize);
					phyobj.air_damping=mod.air_damping;
					phyobj.mass=mod.mass;
					phyobj.speed=1.0;
					phyobj.structual_stiffness= mod.structual_stiffness;//構造
					phyobj.bending_stiffness = mod.bending_stiffness; //まげ
					phyobj.spring_damping = mod.spring_damping;//ばね抵抗
					phyobj.air_damping = mod.air_damping;//空気抵抗
					phyobj.vel_damping = mod.vel_damping;//速度抵抗
				}else{
					phyobj = new OnoPhy.SoftBody(bufMesh.vertexSize
						,bufMesh.edgeSize
						,bufMesh.faceSize);

					phyobj.friction=mod.friction;//摩擦
					phyobj.mass=mod.mass; //質量
					phyobj.speed=1.0; //スピード
					phyobj.pull= mod.pull;//ばね定数引き
					phyobj.push= mod.push; //ばね定数押し
					phyobj.damping= mod.damping;//ダンパ
					phyobj.bending_stiffness = mod.bend;//構造
				}	

				//onoPhy.clothes.push(phyobj);


				//点
				vertices = bufMesh.vertices;
				for(j=0;j<bufMesh.vertexSize;j++){
					Vec3.copy(phyobj.points[j].location,vertices[j].pos);
					phyobj.points[j].id=j;
					for(var k=0;k<vertices[j].groups.length;k++){
						if(vertices[j].groups[k]<0)break;
						if(obj.groups[vertices[j].groups[k]]=== mod.pin){
							phyobj.points[j].fix=true;
							break;
						}
					}
				}
				//面
				for(j=0;j<bufMesh.faceSize;j++){
					var face=renderFaces[j];
					phyobj.faces[j].idxnum=face.idxnum;
					if(face.idxnum>= 3){
						for(var k=0;k<face.idxnum;k++){
							phyobj.faces[j].points[k] = phyobj.points[face.idx[k]];
						}
					}
				}

				//エッジ
				for(var j =0;j<bufMesh.edgeSize;j++){
					var edge=bufMesh.edges[j];
					phyobj.edges[j].point1 = phyobj.points[edge.vIndices[0]];
					phyobj.edges[j].point2 = phyobj.points[edge.vIndices[1]];
				}
				for(var j =0;j<phyobj.edges.length;j++){
					phyobj.edges[j].len=Vec3.len(phyobj.edges[j].point1.location
						,phyobj.edges[j].point2.location);
				}

				phyobj.init();
				
			}
		}
		if(phyobj){
			obj.phyObject= phyobj;
			phyobj.name=obj.name;
			phyobj.parent=obj;
			phyobj.refreshCollision();
			phyobj.refreshInertia();
		}

		return phyobj;
	}
	var createPhyJoint2 = ret.createPhyJoint2 = function(sceneObject,objectInstances){
		var search=function(name){
			//物理オブジェクト一覧から名前で探す
			for(var j=0;j<objectInstances.length;j++){
				if(name == objectInstances[j].object.name){
					return objectInstances[j].phyObj;
				}
			}
			return null;
		}
		var rbc = sceneObject.rigid_body_constraint; //剛体コンストレイント情報

		if(!rbc.enabled || !rbc.object1 || !rbc.object2){
			//ジョイント情報無しもしくは不十分な場合は無視
			return;
		}

		var joint = null;

		//ジョイント作成
		joint = new OnoPhy.Joint();//onoPhy.createJoint();
		
		//パラメータセット
		joint.breaking_threshold=rbc.breaking_threshold;
		joint.disable_collisions=rbc.disable_collisions;
		joint.enabled=rbc.enabled ;
		Vec3.copy(joint.limit_ang_lower,rbc.limit_ang_lower);
		Vec3.copy(joint.limit_ang_upper,rbc.limit_ang_upper);
		Vec3.copy(joint.limit_lin_lower,rbc.limit_lin_lower);
		Vec3.copy(joint.limit_lin_upper,rbc.limit_lin_upper);
		joint.motor_ang_max_impulse=rbc.motor_ang_max_impulse;
		joint.motor_ang_target_velocity=rbc.motor_ang_target_velocity;
		joint.motor_lin_max_impulse=rbc.motor_lin_max_impulse;
		joint.motor_lin_target_velocity=rbc.motor_lin_target_velocity;
		joint.object1=rbc.object1;
		joint.object2=rbc.object2;
		Vec3.copy(joint.spring_damping,rbc.spring_damping);
		Vec3.copy(joint.spring_stiffness,rbc.spring_stiffness);
		Vec3.copy(joint.spring_damping_ang,rbc.spring_damping_ang);
		Vec3.copy(joint.spring_stiffness_ang,rbc.spring_stiffness_ang);
		joint.use_breaking=rbc.use_breaking;
		Vec3.copy(joint.use_limit_ang,rbc.use_limit_ang);
		Vec3.copy(joint.use_limit_lin,rbc.use_limit_lin);
		joint.use_motor_ang=rbc.use_motor_ang;
		joint.use_motor_lin=rbc.use_motor_lin;
		Vec3.copy(joint.use_spring,rbc.use_spring);
		Vec3.copy(joint.use_spring_ang,rbc.use_spring_ang);

		//ジョイントタイプによって制限を設ける
		var flg=0;
		if(rbc.type =="FIXED"){
			flg=0x77;
		}else if(rbc.type=="POINT"){
			flg=0x07;
		}else if(rbc.type=="HINGE"){
			flg=0x57;
		}else if(rbc.type=="SLIDER"){
			flg=0x76;
		}else if(rbc.type=="PISTON"){
			flg=0x66;
		}
		for(var i=0;i<3;i++){
			if((flg>>i)& 0x1){
				joint.use_limit_lin[i]=1;
				joint.limit_lin_upper[i]=0;
				joint.limit_lin_lower[i]=0;
			}
			if((flg>>i) & 0x10){
				joint.use_limit_ang[i]=1;
				joint.limit_ang_upper[i]=0;
				joint.limit_ang_lower[i]=0;
			}
		}	

		if(rbc.type!="GENERIC_SPRING"){
			Vec3.set(joint.use_spring,0,0,0);
			Vec3.set(joint.use_spring_ang,0,0,0);
		}
		if(rbc.type=="MOTOR"){
			Vec3.set(joint.use_limit_lin,0,0,0);
			Vec3.set(joint.use_limit_ang,0,0,0);
			Vec3.set(joint.use_spring,0,0,0);
			Vec3.set(joint.use_spring_ang,0,0,0);
		}else{
			joint.use_motor_lin=0;
			joint.use_motor_ang=0;
		}

		//ジョイント接続剛体設定
		joint.object1 = search(joint.object1.name);
		joint.object2 = search(joint.object2.name);

		joint.parent=joint.object1;
		joint.child=joint.object2;
		var imat = new Mat43();

		//接続差異行列設定
		var instance = objectInstances[sceneObject.idx];
		Mat43.getInv(imat,joint.parent.matrix);
		Mat43.dot(joint.matrix,imat,instance.matrix);

		Mat43.getInv(imat,joint.child.matrix);
		Mat43.dot(joint.matrix2,imat,instance.matrix);
		
		
		return joint;
	}



	ret.setEnvironments=function(scene){
		var m=Mat43.poolAlloc();

		var environment;

		for(var i=0;i<scene.objects.length;i++){
			//ライト設定
			var object = scene.objects[i];
			if(object.type!=="LIGHT")continue;
			environment = ono3d.environments[0];
			
			var ol = object.data;
			var light;
			if(ol.type==="SUN"){
				light = environment.sun;
			}else{
				light = environment.area;
			}
			light.power=1;
			Vec3.copy(light.color,ol.color);

			Mat43.fromLSE(m,object.location,object.scale,object.rotation); //ライトの姿勢行列
			Mat44.dotMat43(light.matrix,ono3d.worldMatrix,m); //ワールド行列で変換
			Mat43.fromRotVector(m,Math.PI*0.5,1,0,0);  //ライトはデフォルト姿勢で下向きなので補正
			Mat44.dotMat43(light.matrix,light.matrix,m);

			ono3d.setOrtho(10.0,10.0,0.1,80.0)
			var mat44 = ono3d.viewMatrix;
			Mat44.getInv(mat44,light.matrix);
			Mat44.dot(light.viewmatrix,ono3d.projectionMatrix,mat44);//影生成用のビュー行列

		}
		Mat43.poolFree(1);
	}






// ------------------------  インスタンス ---------------------


	var O3oInstance=(function(){

		var bind=function(instance,ins2,modifier){
			var object = instance.object;
			var mod= new Mesh();

			mod.ratios=[];
			mod.vertices=Vertex.array(MAX_SIZE);
			mod.faces=Face.array(MAX_SIZE);
			mod.edges=Edge.array(MAX_SIZE);
			for(i=0;i<MAX_SIZE;i++){
				//mod.faces.push(new Face());
				//mod.edges.push(new Edge());
				mod.ratios.push(new Vec4());

			};
			ins2.freezeMesh(mod);
			instance.freezeMesh(bufMesh);
			var binddata=[];
			var ret1 = Vec3.poolAlloc();
			var ret2 = Vec3.poolAlloc();
			var BINDSIZE=2;
			for(var i=0;i<bufMesh.vertexSize;i++){
				var pos = bufMesh.vertices[i].pos;
				var binds=[];

				for(var j=0;j<mod.faceSize;j++){
					//近い面を探す
					var l= 99999999;
					for(var k=0;k<mod.faces[j].idxnum-2;k++){
						Geono.TRIANGLE_POINT(ret1,mod.vertices[mod.faces[j].idx[0]].pos
							,mod.vertices[mod.faces[j].idx[1+k]].pos
							,mod.vertices[mod.faces[j].idx[2+k]].pos
							,pos);
						l = Math.min(l,Vec3.len2(ret1,pos));
					}

					//頂点に既にバインドされている面より近い場合はバインドデータ付与
					var k=0;
					for(k=0;k<binds.length;k++){
						if(binds[k].weight>l){
							break;
						}
					}

					if(k<BINDSIZE){
						var bind={idx:-1,weight:99999,len:0,pweight:[0,0,0]};
						bind.idx = j;
						bind.weight=l;
						binds.splice(k,0,bind);
						binds.splice(BINDSIZE,binds.length-BINDSIZE);
					}

				}
				var sum=0;
				var v = Vec3.poolAlloc();
				for(var j=0;j<binds.length;j++){
					var bind = binds[j];
					//ウェイト変換
					if(bind.weight===0){
						//面との距離が0の場合はウェイト1で終了
						for(var k=0;k<bind.length;k++){
							binds[k].weight=0;
						}
						bind.weight=1;
						sum=1;
						break;
					}
					bind.weight=1/Math.sqrt(bind.weight);//距離の逆数をウェイトにする
					sum+=bind.weight;//総ウェイト

					//面との位置関係を求める
					var face =mod.faces[bind.idx];
					Vec3.cross2(ret1,mod.vertices[face.idx[0]].pos
						,mod.vertices[face.idx[1]].pos
						,mod.vertices[face.idx[2]].pos);
					Vec3.norm(ret1);
					Vec3.sub(ret2,pos,mod.vertices[face.idx[0]].pos);
					bind.len = Vec3.dot(ret1,ret2); //法線距離

					if(face.idxnum==4){
						Geono.calcSquarePos(bind.pweight,mod.vertices[face.idx[0]].pos
							,mod.vertices[face.idx[1]].pos
							,mod.vertices[face.idx[2]].pos
							,mod.vertices[face.idx[3]].pos,pos);
						bind.pweight[2]=bind.pweight[0]*bind.pweight[1];
					}else{
						Vec3.sub(v,mod.vertices[face.idx[2]].pos,mod.vertices[face.idx[1]].pos);
						Vec3.add(v,mod.vertices[face.idx[0]].pos,v);
						Geono.calcSquarePos(bind.pweight,mod.vertices[face.idx[0]].pos
							,mod.vertices[face.idx[1]].pos
							,mod.vertices[face.idx[2]].pos
							,v,pos);
						bind.pweight[2]=0;
					}
					bind.pweight[3]=bind.len;
				}
				Vec3.poolFree(1);

				sum=1/sum;
				for(var j=0;j<binds.length;j++){
					binds[j].weight*=sum;//ウェイトの総計1になるようスケーリング
				}
				binddata.push(binds);
			}
			modifier.binddata=binddata;

			var basePos=[];
			for(var i=0;i<mod.vertexSize;i++){
				basePos.push(new Vec3());
				Vec3.copy(basePos[i],mod.vertices[i].pos);
			}
			modifier.basePos=basePos;
			Vec3.poolFree(2);
		};
		var ret = O3oInstance = function(o3o){
			this.objectInstances=[];
			var objects = o3o.objects;

			for(var i=0;i<objects.length;i++){
				var object=objects[i];
				object.idx=i;
				var instance = new SceneObjectInstance(object);
				instance.o3oInstance= this;
				this.objectInstances.push(instance);
				this.objectInstances[object.name]=instance;

			}

		//ono3d.setTargetMatrix(0);
		//ono3d.loadIdentity();
		Mat44.setInit(ono3d.worldMatrix);
			this.calcMatrix(0,true);


			for(var i=0;i<objects.length;i++){
				var object=objects[i];
				var instance = this.objectInstances[object.idx];
				instance.phyObj= O3o.createPhyObj(object,instance);

			}

			for(var i=0;i<objects.length;i++){
				if(objects[i].rigid_body_constraint){
					//ジョイント作成
					var joint=O3o.createPhyJoint2(objects[i],this.objectInstances);
					this.objectInstances[i].joint=joint;
				}
			}
			this.o3o= o3o;

		o3o.scenes[0].setFrame(0);
		//メッシュ変形のバインド
		for(i=0;i<o3o.objects.length;i++){
			var object=o3o.objects[i];
			var instance = this.objectInstances[i];
			for(var j=0;j<object.modifiers.length;j++){
				if(object.modifiers[j].type==="MESH_DEFORM"){
					var ins2= this.objectInstances[object.modifiers[j].object.idx];
					bind(instance,ins2,object.modifiers[j]);
				}
			}	
		}
			
		}
		ret.prototype.calcMatrix = function(dt,flg){
			for(var i=0;i<this.objectInstances.length;i++){
				this.objectInstances[i].resetMatrix();
			}
			for(var i=0;i<this.objectInstances.length;i++){
				this.objectInstances[i].calcMatrix(dt,flg);
			}

		}

		ret.prototype.joinPhyObj=function(onoPhy){
			var objectInstances=this.objectInstances;
			var imat = new Mat43();
			for(var i=0;i<objectInstances.length;i++){
				if(objectInstances[i].phyObj){
					onoPhy.addPhyObj(objectInstances[i].phyObj);
				}
			}
			for(var i=0;i<objectInstances.length;i++){
				if(objectInstances[i].joint){
					var joint = objectInstances[i].joint;

					//接続差異行列設定
					Mat43.getInv(imat,joint.parent.matrix);
					Mat43.dot(joint.matrix,imat,objectInstances[i].matrix);

					Mat43.getInv(imat,joint.child.matrix);
					Mat43.dot(joint.matrix2,imat,objectInstances[i].matrix);

					onoPhy.addJoint(objectInstances[i].joint);
				}
			}
		}
		return ret;
	})();
	ret.prototype.createInstance = function(){
		return new O3oInstance(this);
	}
	
	var SceneObjectInstance=(function(){
		var ret = SceneObjectInstance= function(object){
			this.object=object;
			this.matrix = new Mat43();
			this.boneMatrices=[];
			this.boneFlgs=[];
			if(object.objecttype===OBJECT_ARMATURE){
				var bones = object.data.bones;
				for(var i=0;i<bones.length;i++){
					this.boneMatrices.push(new Mat43());
					this.boneFlgs.push(false);
				}
			}
		}
		
		var sphere = new Collider.Sphere();
		var cuboid = new Collider.Cuboid();
		var cylinder = new Collider.Cylinder();
		var cone = new Collider.Cone();
		var capsule = new Collider.Capsule();
		ret.prototype.getTempCollision=function(groups){
			var collision;
			var obj = this.object;
			var scale=Vec3.poolAlloc();

			Vec3.set(scale,1,1,1);
			if(obj.type==="MESH"){
				var b = obj.bound_box;
				scale[0]=(b[3] - b[0])*0.5;
				scale[1]=(b[4] - b[1])*0.5;
				scale[2]=(b[5] - b[2])*0.5;
			}
			switch(obj.bound_type){
				case "SPHERE":
					collision = sphere;
					break;
			case "BOX":
				collision = cuboid;
				break;
			case "CYLINDER":
				collision = cylinder;
				break;
			case "CONE":
				collision = cone;
				break;
			case "CAPSULE":
				collision = capsule;
				break;
			}
			Mat43.copy(collision.matrix,this.matrix);
			var m = collision.matrix;
			for(var i=0;i<3;i++){
				for(var j=0;j<3;j++){
					m[i*3+j]*=scale[i];
				}
			}
			collision.groups=groups;
			collision.notgroups=0;
			collision.bold=0;

			switch(obj.bound_type){
				case "SPHERE":
					scale[0]=Math.sqrt(m[0]*m[0]+m[1]*m[1]+m[2]*m[2]);
					scale[1]=Math.sqrt(m[3]*m[3]+m[4]*m[4]+m[5]*m[5]);
					scale[2]=Math.sqrt(m[6]*m[6]+m[7]*m[7]+m[8]*m[8]);
					collision.bold=Math.max(Math.max(scale[0],scale[1]),scale[2]);
					break;
				case "CAPSULE":
					scale[0]=Math.sqrt(m[0]*m[0]+m[1]*m[1]+m[2]*m[2]);
					scale[1]=Math.sqrt(m[3]*m[3]+m[4]*m[4]+m[5]*m[5]);
					scale[2]=Math.sqrt(m[6]*m[6]+m[7]*m[7]+m[8]*m[8]);
					collision.bold = Math.max(scale[0],scale[2]);
					var a=(scale[1]-collision.bold)/scale[1];
					m[3]*=a;
					m[4]*=a;
					m[5]*=a;
					break;
			}

			collision.refresh();
			Vec3.poolFree(1);
			return collision;
		}
		ret.prototype.hitCheck = function(collider,flg){
			var collision=this.getTempCollision(flg);
			return collider.checkHitAll(collision);
			
		}
		ret.prototype.resetMatrix=function(){
			this.flg=false;
			for(var i=0;i<this.boneFlgs.length;i++){
				this.boneFlgs[i]=false;
			}
		}
		ret.prototype.calcBoneMatrix=function(n,dt,flg){
			if(this.boneFlgs[n]){
				//計算済み
				return;
			}

			var matrix = this.boneMatrices[n];
			var object = this.object;
			var bone = object.data.bones[n];
			var poseBone = object.pose.poseBones[n];

			genMatrix(matrix,poseBone); //ボーンの姿勢から行列を作成

			Mat43.dot(matrix,bone.matrix,matrix);//初期姿勢掛ける

			if(bone.parent){
				var m=bone.parent.id;
				this.calcBoneMatrix(m,dt,flg);
				Mat43.dot(matrix,this.boneMatrices[m],matrix); //親行列掛ける
			}
			
			if(object.poseBones){
				var poseBone_ = object.poseBones[n];
				for(var i=0;i<poseBone_.constraints.length;i++){
					var constraint =poseBone_.constraints[i];
					switch(constraint.type){
					case "COPY_ROTATION":
						var target = this.o3oInstance.objectInstances[constraint.target.idx];
						target.calcMatrix(dt,flg);

						Mat33.copy(matrix,target.matrix); //角度を強制的に設定
						break;

					}
				}
			}

			Mat43.dot(matrix,matrix,bone.imatrix); //初期姿勢逆行列

			poseBone.flg=true;
		}
		ret.prototype.calcMatrix=function(dt,flg){
			if(this.flg){
				return;
			}
			var obj = this.object;
			var matrix = this.matrix;
			var phyObj = this.phyObj;
			var o3oInstance = this.o3oInstance;

			if(phyObj){
				if((obj.rigid_body.type !== "PASSIVE" && !flg) && phyObj.type===OnoPhy.RIGID){
					//fixでない剛体の場合はそれに合わせる
					Mat43.copy(matrix,phyObj.matrix);
					this.flg=true;
					return;
				}
			}

			if(obj.rotation_mode===QUATERNION){
				Mat43.fromLSR(matrix,obj.location,obj.scale,obj.rotation);
			}else{
				Mat43.fromLSE(matrix,obj.location,obj.scale,obj.rotation);
			}
			for(var i=0;i<this.boneMatrices.length;i++){
				this.calcBoneMatrix(i,dt,flg);
			}


			if(obj.parent){
				var parent=obj.parent;
				var parentInstance = o3oInstance.objectInstances[parent.idx];
				parentInstance.calcMatrix(dt,flg);

				if(obj.parent_bone){
					var i=this.parent_bone-1;
					this.matrix[11]-=parent.data.bones[i].length;
					Mat43.dot(matrix,parent.data.bones[i].matrix,mat);
					Mat43.dot(matrix,parentInstance.boneMatrices[i],matrix);
				}else{
					Mat43.dot(matrix,obj.iparentmatrix,matrix);
				}
				Mat43.dot(matrix,parentInstance.matrix,matrix);
			}else{
				Mat43.dotMat44Mat43(matrix,ono3d.worldMatrix,matrix);
			}

			if(phyObj){
				if((obj.rigid_body.type =="PASSIVE" || flg) && phyObj.type===OnoPhy.RIGID){
					Vec3.set(phyObj.v,0,0,0);
					Vec3.copy(phyObj.v,phyObj.location);
					Vec3.set(phyObj.rotV,0,0,0);

				
					Mat43.copy(phyObj.matrix,this.matrix);
					//Mat43.dotMat44Mat43(phyObj.matrix,ono3d.worldMatrix,this.matrix);
					Mat43.toLSR(phyObj.location,phyObj.scale,phyObj.rotq,phyObj.matrix);

					if(dt !=0){
						Vec3.sub(phyObj.v,phyObj.location,phyObj.v);
						Vec3.mul(phyObj.v,phyObj.v,1/dt);
					}else{
						Vec3.mul(phyObj.v,phyObj.v,0);
					}
					phyObj.calcPre();
				}

				if(phyObj.type===OnoPhy.CLOTH){

					var dst =bufMesh;
					copyMesh(dst,obj.data);
					var defMat = Mat43.poolAlloc();
			

					this.calcModifiers(dst);


					Mat43.dotMat44Mat43(defMat,ono3d.worldMatrix,this.matrix);

					var bufMeshVertices=dst.vertices;
					var mat0=defMat[0];
					var mat1=defMat[1];
					var mat2=defMat[2];
					var mat3=defMat[3];
					var mat4=defMat[4];
					var mat5=defMat[5];
					var mat6=defMat[6];
					var mat7=defMat[7];
					var mat8=defMat[8];
					var mat9=defMat[9];
					var mat10=defMat[10];
					var mat11=defMat[11];

					var vertices= bufMesh.vertices;
					var dst= bufMesh;

					var points=phyObj.points;
					for(var i=0;i<dst.vertexSize;i++){
						if(points[i].fix || flg){
							var pos=points[i].location;
							var x=vertices[i].pos[0];
							var y=vertices[i].pos[1];
							var z=vertices[i].pos[2];
							pos[0]=mat0*x + mat3*y + mat6*z + mat9;
							pos[1]=mat1*x + mat4*y + mat7*z + mat10;
							pos[2]=mat2*x + mat5*y + mat8*z + mat11;
						}
					}

					Mat43.poolFree(1);
				}
			}
			this.flg=true;
		}



	var deformMatricies=[];
	for(var i=0;i<128;i++){
		deformMatricies.push(new Mat43());
	}
	var deformMesh = new Mesh();

			deformMesh.ratios=[];
			deformMesh.vertices=Vertex.array(MAX_SIZE);
			deformMesh.faces=Face.array(MAX_SIZE);
			deformMesh.edges=Edge.array(MAX_SIZE);
			for(i=0;i<MAX_SIZE;i++){
				//deformMesh.faces.push(new Face());
				//deformMesh.edges.push(new Edge());
				deformMesh.ratios.push(new Vec4());

			};
	ret.prototype.modMeshDeform=function(dst,mod){
		//メッシュデフォーム
		if(!mod.basePos){
			return 0;
		}
		var obj = this.object;

		var parentInstance = this.o3oInstance.objectInstances[mod.object.idx];

		//デフォーム親メッシュを計算
		parentInstance.freezeMesh(deformMesh);

		var dmv=deformMesh.vertices;
		var binddata=mod.binddata;
		var f=Vec4.poolAlloc();

		for(var i=0;i<deformMesh.faceSize;i++){
			//デフォーム親面ごとの係数計算
			var face = deformMesh.faces[i];
			var dmv0 = dmv[face.idx[0]].pos;
			var dmv1 = dmv[face.idx[1]].pos;
			var dmv2 = dmv[face.idx[2]].pos;
			var dmv3 = dmv[face.idx[3]].pos;
			var dm = deformMatricies[i];

			//平面方向
			Vec3.sub(f,dmv1,dmv0);
			dm[0]=f[0];
			dm[1]=f[1];
			dm[2]=f[2];
			
			if(face.idxnum==4){
				Vec3.sub(f,dmv2,f);
				Vec3.sub(f,f,dmv3);
				dm[6]=f[0];
				dm[7]=f[1];
				dm[8]=f[2];
				Vec3.sub(f,dmv3,dmv0);
				dm[3]=f[0];
				dm[4]=f[1];
				dm[5]=f[2];
			}else{
				Vec3.sub(f,dmv2,dmv0);
				dm[3]=f[0];
				dm[4]=f[1];
				dm[5]=f[2];
				//Vec3.set(deformbuf2[i],0,0,0);
			}


			//法線方向
			if(face.idx===4){
				Vec3.cross3(f,dmv0 ,dmv2 ,dmv1 ,dmv3);
			}else{
				Vec3.cross2(f,dmv0 ,dmv1 ,dmv2);
			}
			Vec3.norm(f);
			dm[9]=f[0];
			dm[10]=f[1];
			dm[11]=f[2];
		}
		for(var i=0;i<dst.vertexSize;i++){
			//デフォーム子の頂点計算
			var binds=binddata[i];//バインド情報
			var vertex = dst.vertices[i];
			Vec3.set(vertex.pos,0,0,0);
			for(var j=0;j<binds.length;j++){
				//バインド数分ループ
				var bind=binds[j];

				//バインド情報に係数をかけて座標を算出
				Mat43.dotVec4(f,deformMatricies[bind.idx],bind.pweight);
				Vec3.add(f,dmv[deformMesh.faces[bind.idx].idx[0]].pos,f);

				Vec3.madd(vertex.pos,vertex.pos,f,bind.weight); //重みを付けて加算
			}
		}

		Vec4.poolFree(1);
		return 1;

	}

	var table=new Array(64);
	ret.prototype.modMirror = function(dst,mod){
		var obj = this.object;
		var bufMesh = dst;
		var bufMeshVertices =bufMesh.vertices
		var renderVertex;

		var dstvertices,srcvertices;
		var dstvertex,srcvertex;
		var vertexSize=bufMesh.vertexSize
		var mrr = 0;
		if(mod.use_x){ mrr=0};
		if(mod.use_y){ mrr=1};
		if(mod.use_z){ mrr=2};

		for(j =0;j<vertexSize;j++){
			srcvertex=bufMeshVertices[j];
			dstvertex=bufMeshVertices[j+vertexSize];

			dstvertex.pos[0]=srcvertex.pos[0];
			dstvertex.pos[1]=srcvertex.pos[1];
			dstvertex.pos[2]=srcvertex.pos[2];
			dstvertex.pos[mrr]*=-1;
			//dstvertex.groups=srcvertex.groups;
			dstvertex.groupWeights=srcvertex.groupWeights;
			for(var k=0;k<srcvertex.groups.length;k++){
				dstvertex.groups[k]=srcvertex.groups[k];
			//	dstvertex.groupWeights[k]=srcvertex.groupWeights[k];
			}
			
		}
		var dstFace,srcFace;
		var faceSize=bufMesh.faceSize;
		for(var j =0;j<faceSize;j++){
			srcFace= bufMesh.faces[j]
			srcvertices=srcFace.idx;
			dstFace= bufMesh.faces[faceSize+j]
			dstFace.idxnum=srcFace.idxnum;
			dstvertices=dstFace.idx;
			//var dst=dstFace.uv,src=srcFace.uv
			for(var k=0;k<srcFace.idxnum;k++){
				var _k = srcFace.idxnum-k;
				if(k==0){_k=0};

				if(abs(bufMeshVertices[srcvertices[_k]].pos[mrr])>0.01){
					dstvertices[k]= srcvertices[_k] + vertexSize;
				}else{
					//座標が中心に近い場合は共有
					dstvertices[k] = srcvertices[_k];
				}

			//	dst[k*2] = src[_k*2]
			//	dst[k*2+1] = src[_k*2+1]
			}

			dstFace.material = srcFace.material;
			dstFace.mat= srcFace.mat;
			dstFace.fs= srcFace.fs;

		}
		var jj=0;
		for(var j =0;j<bufMesh.edgeSize;j++){
			var dst=bufMesh.edges[jj+bufMesh.edgeSize]
			var src=bufMesh.edges[j];
			if(abs(bufMeshVertices[src.vIndices[0]].pos[mrr])<0.01
			 && abs(bufMeshVertices[src.vIndices[1]].pos[mrr])<0.01){
				src.fIndices[1]=src.fIndices[0]+faceSize;

				continue;
			}
			dst.vIndices[0]=src.vIndices[0]+vertexSize;
			dst.vIndices[1]=src.vIndices[1]+vertexSize;
			dst.fIndices[0]=src.fIndices[0]+faceSize;
			if(src.fIndices[1]>=0){
				dst.fIndices[1]=src.fIndices[1]+faceSize;
			}else{
				dst.fIndices[1]=-1;
			}
			jj++;
		}
		bufMesh.edgeSize+=jj;

		for(j=0;j<obj.groups.length;j++){
			table[j]=j;
			var groupName=obj.groups[j];
			if(groupName.match(/L$/)){
				groupName=groupName.replace(/L$/,"R");
			}else if(groupName.match(/R$/)){
				groupName=groupName.replace(/R$/,"L");
			}else{
				continue;
			}

			for(k=0;k<obj.groups.length;k++){
				if(groupName===obj.groups[k]){
					table[j]=k;
					break;
				}
			}
		}
		for(k=0;k<vertexSize;k++){
			var vertex=bufMeshVertices[vertexSize+k];
			for(var l=0;l<8;l++){
				if(vertex.groups[l]<0)continue;
				vertex.groups[l]=table[vertex.groups[l]];
			}
		}
			

		
		bufMesh.faceSize+=faceSize;
		bufMesh.vertexSize+=vertexSize;
	}

	var groupMatricies = new Array(64)
		,groupMatFlg= new Array(64)
	;
	for(var i=groupMatricies.length;i--;)groupMatricies[i] = new Mat43();

	ret.prototype.modArmature=function(dst,mod){
		var bufMesh = dst;
		var bufMeshVertices =bufMesh.vertices
		var renderVertex;
		var groupMatrix;
		var groupName;
		var x,y,z;
		var obj = this.object;
		var objectInstances=this.o3oInstance.objectInstances;

		var ratio,pos,vertex;
		var groups=obj.groups;

		var bM = Mat43.poolAlloc();
		var bM2 = Mat43.poolAlloc();
		Mat43.getInv(bM2,objectInstances[mod.object.idx].matrix);
		Mat43.dot(bM,bM2,this.matrix);
		Mat43.getInv(bM2,bM);

		var bones = mod.object.data.bones;
		var boneMatrices=objectInstances[mod.object.idx].boneMatrices;



		for(var j=groups.length;j--;){
			groupMatFlg[j] = false;
			groupName=groups[j];
			groupMatrix = groupMatricies[j];
			for(var k=0,kmax=bones.length;k<kmax;k++){
				if(bones[k].name!=groupName)continue
				groupMatFlg[j] = true;
				Mat43.dot(groupMatrix,boneMatrices[k],bM);
				Mat43.dot(groupMatrix,bM2,groupMatrix);
				break
			}
		}
		var bV0=Vec3.poolAlloc();
		for(var k = 0;k<bufMesh.vertexSize;k++){
			pos = bufMeshVertices[k].pos
			vertex = bufMeshVertices[k];
			var vertexGroups = vertex.groups;

			x=0;
			y=0;
			z=0;
			var ratiosum=0;
			for(var j = vertexGroups.length;j--;){
				if(vertexGroups[j]<0)continue;
				if(!groupMatFlg[vertexGroups[j]]){
					continue;
				}
				ratio=vertex.groupWeights[j]
				Mat43.dotVec3(bV0,groupMatricies[vertexGroups[j]],pos)
				
				x +=  bV0[0] * ratio
				y +=  bV0[1] * ratio
				z +=  bV0[2] * ratio
				ratiosum+=ratio;
			}
			if(ratiosum>0){
				ratiosum=1.0/ratiosum;
				pos[0] =  x * ratiosum;
				pos[1] =  y * ratiosum;
				pos[2] =  z * ratiosum;
			}else{
				if(mod.vertex_group >=0){
					Mat43.dotVec3(pos,groupMatricies[mod.vertex_group],pos)
				}
			}
		}
		Vec3.poolFree(1);
		Mat43.poolFree(2);
	}
	ret.prototype.calcModifiers=function(dst){
		var flg=0;
		var obj = this.object;
		for(var i=0,imax=obj.modifiers.length;i<imax;i++){
			var mod=obj.modifiers[i];
			if(mod.type!="MIRROR" && flg){
				continue;
			}
			if(mod.type=="MIRROR"){
				flg|=this.modMirror(dst,mod);
			}else if(mod.type=="ARMATURE"){
				flg|=this.modArmature(dst,mod);
			}else if(mod.type=="MESH_DEFORM"){
				flg|=this.modMeshDeform(dst,mod);
			}
		}
		return flg;
	}
	ret.prototype.freezeMesh = function(dst){
		//モデファイアとワールド行列を反映
		var obj = this.object;
		copyMesh(dst,obj.data);
		

		var flg=false;

		var phyObj = null;

		phyObj = this.phyObj;
		
		flg|=this.calcModifiers(dst);

		if(phyObj){
			if(phyObj.type===OnoPhy.SPRING_MESH || phyObj.type===OnoPhy.CLOTH){
				for(var j=phyObj.points.length;j--;){
					Vec3.copy(dst.vertices[j].pos,phyObj.points[j].location);
				}
				flg =true;
			}
		}

		var defMat = Mat43.poolAlloc();
		if(!flg){
			//既に頂点単位で計算された場合はこの座標変換は行わない
			Mat43.dotMat44Mat43(defMat,ono3d.worldMatrix,this.matrix);

			var bufMeshVertices=dst.vertices;
			var mat0=defMat[0];
			var mat1=defMat[1];
			var mat2=defMat[2];
			var mat3=defMat[3];
			var mat4=defMat[4];
			var mat5=defMat[5];
			var mat6=defMat[6];
			var mat7=defMat[7];
			var mat8=defMat[8];
			var mat9=defMat[9];
			var mat10=defMat[10];
			var mat11=defMat[11];

			for(var i=0;i<dst.vertexSize;i++){
				var pos=bufMeshVertices[i].pos;
				var x=pos[0];
				var y=pos[1];
				var z=pos[2];
				pos[0]=mat0*x + mat3*y + mat6*z + mat9;
				pos[1]=mat1*x + mat4*y + mat7*z + mat10;
				pos[2]=mat2*x + mat5*y + mat8*z + mat11;
			}
		}

		Mat43.poolFree(1);
	}

	ret.prototype.drawStatic= function(environment,environment2,envratio){
		var oldIdx=ono3d.faces_index;
		this.draw(environment,environment2,envratio);
		var count = ono3d.faces_index-oldIdx;

		var faces=[];
		var renderFaces=ono3d.faces;
		for(var i=0;i<count;i++){
			var face = new Ono3d.Face();
			copyFace(face,renderFaces[i+oldIdx]);
			faces.push(face);

		}
		return faces;
	}
	ret.prototype.draw= function(environment,environment2,envratio){
		var obj = this.object;
		if(obj.type !== "MESH"){
			return null;
		}

		var o3o = obj.o3o;
		
		//マテリアルインデックステーブルにセット
		materialTable[0]=setMaterial(defaultMaterial,"defaultMaterial");
		var materials = o3o.materials;
		for(var i=0;i<materials.length;i++){
			materialTable[i+1]=setMaterial(materials[i],o3o.name+"_"+materials[i].name);
		}

		if(!environment){
			//環境情報がない場合はデフォルトをセット
			environment = ono3d.environments[0];
			envratio=0.0;
		}
		if(!environment2){
			environment2 = ono3d.environments[0];
		}

		this.freezeMesh(bufMesh); //モデファイア適用

		var bufMeshVertices=bufMesh.vertices;
		var renderVertices =ono3d.verticesFloat32Array;
		var rvIndex=ono3d.vertices_index;
		var renderFaces=ono3d.faces;
		var rfIndex=ono3d.faces_index;
		var rfCount=0;
		var renderMaterials=ono3d.materials;
		var face,renderFace;
		var smoothing=ono3d.smoothing;
		var offsetx=0,offsety=0;

		var uv;

		var uv_layerdata;
		var lightMapUvData;
		if(bufMesh.uv_layerSize){
			//uv指定ありの場合はレイヤを設定(0番固定)
			uv_layerdata=bufMesh.uv_layers[0].data;
			lightMapUvData=bufMesh.uv_layers[0].data;
		}
		if(bufMesh.uv_layerSize>=2){
			//uvが2つ以上ある場合は2個目も設定
			lightMapUvData=bufMesh.uv_layers[1].data;
		}


		//面の法線計算
		var vertices=bufMesh.vertices;
		var faces=bufMesh.faces;
		for(var i=0;i<bufMesh.faceSize;i++){
			var n = faces[i].normal;
			var idx=faces[i].idx;
			if(faces[i].idxnum==3){
				Vec3.cross2(n
					,vertices[idx[0]].pos
					,vertices[idx[1]].pos
					,vertices[idx[2]].pos);
			}else{
				Vec3.cross3(n
					,vertices[idx[0]].pos
					,vertices[idx[2]].pos
					,vertices[idx[1]].pos
					,vertices[idx[3]].pos);
			}
			Vec3.norm(n);
		}
		//if( ono3d.smoothing>0){
		if( obj.data.use_auto_smooth ){
			//スムーシングする場合頂点法線セット

			for(var i = 0;i<bufMesh.vertexSize;i++){
				//Vec3.set(vertices[i].normal,0,0,0);
				vertices[i].normal.fill(0);
			}
			for(var i=0;i<bufMesh.faceSize;i++){
				var idx=faces[i].idx;
				var fn=faces[i].normal;
				var n=vertices[idx[0]].normal;
				Vec3.add(n,n,fn);
				n=vertices[idx[1]].normal;
				Vec3.add(n,n,fn);
				n=vertices[idx[2]].normal;
				Vec3.add(n,n,fn);
				if(faces[i].idxnum==4){
					n=vertices[idx[3]].normal;
					Vec3.add(n,n,fn);
				}
			}

			for(var i = bufMesh.vertexSize;i--;){
				Vec3.norm(vertices[i].normal);
			}
			smoothing=1;
		}else{
			smoothing=0;
		}

		var lightProbeEnv=environment.lightProbe;
		var bspTree=null;
		var shcoefs=null;
		if(!lightProbeEnv){
			lightProbeEnv=ono3d.environments[0].lightProbe;
		}

		if(lightProbeEnv){
			bspTree = lightProbeEnv.bspTree;
			shcoefs=lightProbeEnv.shcoefs;
			//for(var i = bufMesh.vertexSize;i--;){
			//	var vertex=vertices[i];

			//	var hitTriangle = bspTree.getItem(vertex.pos);
			//	vertex.hitTriangle=hitTriangle;
			//	if(!hitTriangle){
			//		continue;
			//	}

			//	var bsps=hitTriangle.bsps;
			//	for(var k=0;k<4;k++){
			//		bufMesh.ratios[i][k]=Vec3.dot(bsps[k].v,vertex.pos)-bsps[k].m;
			//	}
			//}

			
			for(var i=0;i<calcSHcoef.length;i++){
				Vec3.set(calcSHcoef[i],0,0,0);
			}
			var vec3 = new Vec3();
			Vec3.set(vec3,this.matrix[9],this.matrix[10],this.matrix[11]);
			var hitTriangle = bspTree.getItem(vec3);
			var bsps=hitTriangle.bsps;
			var pIdx=hitTriangle.pIdx;
			for(var k=0;k<4;k++){
				var shcoef=shcoefs[pIdx[k]];
				var r=Vec3.dot(bsps[k].v,vec3)-bsps[k].m;
				for(var i=0;i<calcSHcoef.length;i++){
					Vec3.madd(calcSHcoef[i],calcSHcoef[i],shcoef[i],r);
				}
			}
		}


		var ii=rfIndex;
		var jj=rvIndex*20;
		var svec=Vec3.poolAlloc();
		var tvec=Vec3.poolAlloc();
		var color=Vec3.poolAlloc();
		var normal = Vec3.poolAlloc();
		for(var i=0;i<bufMesh.faceSize;i++){
			//フェイスをレンダー用バッファに格納
			face=faces[i];
			var idx=face.idx;

			for(var j=0;j<face.idxnum-2;j++){
				//三角単位でレンダー用バッファに格納
				renderFace = renderFaces[ii];
				ii++;
				rfCount++;
			
				//renderFace.rf = Ono3d.RF_OUTLINE * (1-face.fs);

				//renderFace.smoothing = smoothing;
				//Vec3.copy(facenormal,face.normal);
				var facenormal=face.normal;
				//buff[envratioindex+vindex]=renderface.environmentRatio ;

				renderFace.material= ono3d.materials[materialTable[face.mat+1]];
				renderFace.environments[0] = environment;
				renderFace.environments[1] = environment2;
				renderFace.environmentRatio = envratio;

				uv=null;
				if(face.mat>=0 && uv_layerdata){
					//uv値セット　オフセット分もたす
					offsetx=renderFace.material.offsetx;
					offsety=renderFace.material.offsety;
					uv = uv_layerdata[i];
				}
				var uv2=null;
				if(lightMapUvData){
					uv2 = lightMapUvData[i];
				}


				Vec3.set(svec,-facenormal[1],facenormal[2],facenormal[0]);
				Vec3.set(tvec,facenormal[2],-facenormal[0],facenormal[1]);
				if(renderFace.material.hightMap){
					Ono3d.calcST(svec,tvec
						,vertices[idx[0]].pos
						,vertices[idx[1+j]].pos
						,vertices[idx[2+j]].pos
						,uv[0]
						,uv[1]
						,uv[(1+j)*2]
						,uv[(1+j)*2+1]
						,uv[(2+j)*2]
						,uv[(2+j)*2+1]
					)
				}
				renderFace.vertices[0]=rvIndex;
				renderFace.vertices[1]=rvIndex+1;
				renderFace.vertices[2]=rvIndex+2;

				//頂点
				var vertex=vertices[j];
				var nx=face.normal[0]*(1-smoothing);
				var ny=face.normal[1]*(1-smoothing);
				var nz=face.normal[2]*(1-smoothing);
				var vidx=[0,1+j,2+j];
				for(var k=0;k<3;k++){
					var id = idx[vidx[k]];
					var vertex=vertices[id];
					renderVertices[jj]=vertex.pos[0];
					renderVertices[jj+1]=vertex.pos[1];
					renderVertices[jj+2]=vertex.pos[2];
					renderVertices[jj+3]=normal[0]=vertex.normal[0]*smoothing + nx;
					renderVertices[jj+4]=normal[1]=vertex.normal[1]*smoothing + ny;
					renderVertices[jj+5]=normal[2]=vertex.normal[2]*smoothing + nz;
					renderVertices[jj+6]=svec[0];
					renderVertices[jj+7]=svec[1];
					renderVertices[jj+8]=svec[2];
					renderVertices[jj+9]=tvec[0];
					renderVertices[jj+10]=tvec[1];
					renderVertices[jj+11]=tvec[2];

					if(uv){
						renderVertices[jj+12]=uv[vidx[k]*2]+offsetx;
						renderVertices[jj+13]=uv[vidx[k]*2+1]+offsety;
					}
					renderVertices[jj+14]=renderFace.environmentRatio;
					if(uv2){
						renderVertices[jj+15]=uv2[vidx[k]*2]+offsetx;
						renderVertices[jj+16]=uv2[vidx[k]*2+1]+offsety;
					}
					//calcSH(color,normal,vertex,shcoefs,bufMesh.ratios[id]);
					SH.decode2xyz(color,calcSHcoef,normal[0],normal[1],normal[2]);
					renderVertices[jj+17]=color[0];
					renderVertices[jj+18]=color[1];
					renderVertices[jj+19]=color[2];

					//renderVertices.set(vertex.pos,jj);
					//renderVertices.set(normal,jj+3);
					//renderVertices.set(svec,jj+6);
					//renderVertices.set(tvec,jj+9);
					//renderVertices.set(color,jj+17);
					
					rvIndex++;
					jj+=20;
				}
			}
		}

		if( ono3d.rf  & Ono3d.RF_OUTLINE && 0){
			//アウトライン作成
			var bufFace,normal;
			var bM44 = Mat44.poolAlloc();
			Mat44.getInv(bM44,ono3d.viewMatrix);
			var cp0=bM44[12];
			var cp1=bM44[13];
			var cp2=bM44[14];
			Mat44.poolFree(1);
			for(var i=0;i<bufMesh.faceSize;i++){
				bufFace = faces[i];
				if(1-face.fs){
					normal=bufFace.normal;
					var idx=bufFace.idx;
					if((vertices[idx[0]].pos[0]-cp0)*normal[0]
					 + (vertices[idx[1]].pos[1]-cp1)*normal[1]
					 + (vertices[idx[2]].pos[2]-cp2)*normal[2]<0){
						bufFace.cul=1; //表
					}else{
						bufFace.cul=-1; //裏
					}	
				}else{
					bufFace.cul=0; //アウトライン非対象
				}

			}

			//アウトライン用マテリアル作成
			var renderMaterial = ono3d.materials[ono3d.materials_index];
			ono3d.materials_index++;
			var renderMateriala = ono3d.materials[ono3d.materials_index];
			ono3d.materials_index++;

			Vec3.copy(renderMaterial.baseColor, ono3d.lineColor);
			renderMaterial.opacity = 1.0;//ono3d.lineColor[3];
			renderMaterial.shader="lineshader";
			renderMaterial.bold = ono3d.lineWidth;
			Vec3.copy(renderMateriala.baseColor, ono3d.lineColor);
			renderMateriala.opacity = ono3d.lineColor[3]*0.99;
			renderMateriala.shader="lineshader";
			renderMateriala.bold = ono3d.lineWidth;

			var edges=bufMesh.edges;
			var lines_index=ono3d.lines_index;
			var renderLines=ono3d.lines;
			var vertex_current = ono3d.vertices_index;
			for(i=0;i<bufMesh.edgeSize;i++){
				//エッジをアウトラインとして描画するかどうかの判定
				var edge=edges[i];
				var renderMat = renderMaterial;

				if(edge.fIndices[0]<0)continue; //エッジが属する面が存在しない場合はスキップ
				if(edge.fIndices[1]<0){ //属面が1こだけの場合、その面が表でないならスキップ
					var mat0 = ono3d.materials[materialTable[faces[edge.fIndices[0]].mat+1]]
					if(faces[edge.fIndices[0]].cul<1)continue;
					if(mat0.opacity !== 1.0){
						renderMat = renderMateriala;
					}

				}else{ //属面が2つある場合、裏表の境界になる場合以外はスキップ
					if(faces[edge.fIndices[0]].cul
						* faces[edge.fIndices[1]].cul > -1)continue;
					var mat0 = ono3d.materials[materialTable[faces[edge.fIndices[0]].mat+1]]
					var mat1 = ono3d.materials[materialTable[faces[edge.fIndices[1]].mat+1]]
					if(mat0.opacity !== 1.0
					|| mat1.opacity !== 1.0){
						renderMat = renderMateriala;
					}
				}

				//線描画追加
				var renderLine =renderLines[lines_index];
				renderLine.material=renderMat;
				lines_index++;
				Vec3.copy(renderLine.pos[0],vertices[edge.vIndices[0]].pos);
				Vec3.copy(renderLine.pos[1],vertices[edge.vIndices[1]].pos);
			}
			ono3d.lines_index=lines_index;
			
		}


		ono3d.vertices_index=rvIndex;
		ono3d.faces_index+=rfCount;
		
		Vec3.poolFree(4);
		return;
		
	}

	ret.prototype.createLightProbe=function(){
		this.freezeMesh(bufMesh);
		var vertexSize =bufMesh.vertexSize;

		var points=[];
		var p;
		for(var i=0;i<vertexSize;i++){
			p=new Vec3();
			Vec3.copy(p,bufMesh.vertices[i].pos);
			points.push(p);
		}

		return Engine.createLightProbe(points,this.object.data.shcoefs);
	}

		return ret;
	})();
	return ret
})()
