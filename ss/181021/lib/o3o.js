"use strict"
var O3o=(function(){
	var i
		,groupMatricies = new Array(64)
		,groupMatFlg= new Array(64)
	;

	for(i=groupMatricies.length;i--;)groupMatricies[i] = new Mat43();

	var  REPEAT_NONE = i=0
		, REPEAT_LOOP = ++i
		,REPEAT_LINER = ++i
	;
	var  repeatConvert = {};
	repeatConvert["NONE"] = REPEAT_NONE;
	repeatConvert["LOOP"] = REPEAT_LOOP;
	repeatConvert["LINER"] = REPEAT_LINER;
	
	var INTERPOLATE_LINER = i=0
		,INTERPOLATE_SPLINE = ++i
	;

	var interpolateConvert = {};
	interpolateConvert["LINER"] = INTERPOLATE_LINER;
	interpolateConvert["SPLINE"] = INTERPOLATE_SPLINE;
	
	var OBJECT_MESH = i=1
		,OBJECT_ARMATURE= ++i
		,OBJECT_LAMP= ++i
	;

	var ShapeKey = function(){
		this.shapeKeyPoints = [];
	};

	var FCURVE_ROT_QUAT = i=1
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
		this.textures = [];//テクスチャ
		this.materials = []; //マテリアル
		this.meshes = []; //メッシュ
		this.armatures = [];//スケルトン
		this.actions = []; //アニメーション
		this.lamps = []; //照明
	}
	var ret =O3o;
	ret.useCustomMaterial=false;
	
	var ono3d = null;
	ret.setOno3d = function(a){
		ono3d=a;
	}

	var Scene = function(){
		//シーン
		this.name=""; //名前
		this.frame_start=0; //開始フレーム
		this.frame_end=0;//終了フレーム
		this.objects= []; //シーンに存在するオブジェクト
	}
	var SceneObject = function(){
		//オブジェクト
		this.name="";//オブジェクト名
		this.type=""; //オブジェクト種類
		this.matrix=new Mat43();//平行移動スケール回転合わせた行列
		this.action=""; //関連付けられたアニメーション
		this.data=""; //内容(メッシュとかアーマチュア)
		this.parent=""; //親オブジェクト
		this.iparentmatrix=new Mat43();
		this.parent_bone=null; //親骨オブジェクト
		this.groups=[]; //頂点グループ
		this.modifiers=[]; //モディファイア
		this.location=new Vec3(); //平行移動
		this.scale=new Vec3(); //スケール
		this.rotation_mode=EULER_XYZ;//デフォルトはオイラー角
		this.rotation=new Vec4();//オイラー角かクォータニオン
		this.hide_render=0; //レンダリングするかどうか
		this.rigid_body = new RigidBody(); //剛体設定
		this.rigid_body_constraint = new RigidBodyConstraint();//剛体コンストレイント設定
		this.bound_box = [];//バウンディングボックス

		this.poseArmature = null;
		this.mixedmatrix=new Mat43();
		this.flg=false;//既に合成行列が計算されているかどうかのフラグ
	}
	var Lamp = function(){
		this.name="";
		this.type="";
		this.color=new Vec3();
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
	var PoseArmature = ret.PoseArmature = (function(){
		var PoseArmature = function(armature){
			this.armature = armature;
			this.poseBones = []; // ボーンの状態
			this.matrices=[];
			for(var i=0;i<armature.bones.length;i++){
				this.poseBones.push(new PoseBone());
				this.matrices.push(new Mat43());
			}
		}
		var ret = PoseArmature;

		ret.prototype.setAction=function(action,frame){
			var armature = this.armature;
			var poseBones = this.poseBones;
			for(var i=0;i<poseBones.length;i++){
				//ボーンの数だけ計算する
				var poseBone = poseBones[i];
				var bone = armature.bones[i];
				//対象ボーンのアクションを計算
				addaction(poseBone,bone.name,action,frame)
				poseBone.flg=false; //行列の親子合成フラグをリセット
			}
		}

		ret.prototype.calcMatrix = function(){
			var poseBones = this.poseBones;
			for(var i=0;i<poseBones.length;i++){
				poseBones[i].flg=false; //ボーンの行列の親子合成
			}
			for(var i=0;i<poseBones.length;i++){
				this.mixBoneMatrix(i) //ボーンの行列の親子合成
			}
		}
		ret.prototype.mixBoneMatrix = function(n){
			var poseBone = this.poseBones[n];
			if(poseBone.flg){
				return;
			}
			var bones = this.armature.bones;

			var matrix = this.matrices[n];
			genMatrix(matrix,poseBone); //ボーンの姿勢から行列を作成
			var bone = bones[n];
			Mat43.dot(matrix,matrix,bone.imatrix)
			Mat43.dot(matrix,bone.matrix,matrix)
			if(bones[n].parent){
				var m=bones[n].parent.id;
				var parent = this.poseBones[m];
				this.mixBoneMatrix(m);

				Mat43.dot(this.matrices[n],this.matrices[m],matrix);
			}
			poseBone.flg=true;
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
			this.flg=false;

			this.reset();
		}
		var ret = PoseBone;
		ret.prototype.reset = function(){
			Vec3.set(this.location,0,0,0);
			Vec3.set(this.location,0,0,0,0);
			Vec3.set(this.scale,1,1,1);
			this.flg=false;
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
	var Texture = ret.Texture = function(){
		//テクスチャ
		this.path="";
		this.name="";
		this.typ="";
		this.image=null;
	}
	var Material = function(){
		//マテリアル
		this.name="";
		this.r=1.0;
		this.g=1.0;
		this.b=1.0;
		this.a=1.0;
		this.dif=1.0;
		this.emt=0.0;
		this.reflectionColor=new Vec3();
		Vec3.set(this.reflectionColor,1,1,1);
		this.use_transparency = 1;
		this.ior=1.0;
		this.transRough=0.0;
		this.use_mirror= 1;
		this.rough=0.0;
		this.reflect=0.0;
		this.spc=0.0;
		this.spchard=0.0;
		this.normal=0;
		this.texture_slots=[];
		this.env=0.0;
		this.use_nodes=false;
		this.fresnel=0.0;

		this.shader="";
	}
	var Texture_slot = ret.Texture_slot = function(){
		//テクスチャスロット
		this.texture="";
		this.uv_layer="";
		this.normal=0;
		this.pbr=0;
		this.action="";
		this.offset=new Vec2();
	}

	ret.Material=Material;
	var defaultMaterial= ret.defaultMaterial= new Material();
	var customMaterial= ret.customMaterial= new Material();

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
		this.vertices = [];//頂点
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

	var Vertex = function(){
		//頂点
		this.pos = new Vec3(); //座標
		this.normal = new Vec3(); //法線
		this.groups = [-1,-1,-1]; //グループ
		this.groupWeights = [1,0,0]; //グループウェイト
	};
	ret.Vertex=Vertex;

	var Face =function(){
		//面
		this.uv = new Array(8); //uv値(そのうち消す)
		this.normal = new Vec3(); //法線
		this.idx = [ -1 , -1 , -1 , -1]; //頂点インデックス
		this.idxnum=3;//頂点数
		this.material = null ; //マテリアル
		this.flg=0;//フラグ
		this.fs=0; //フラグ2
		this.mat=-1;
	};
	ret.Face=Face;

	var Edge = function(){
		//辺
		this.v0 = -1; //頂点インデックス1
		this.v1 = -1;//頂点インデックス2
		this.f0 = -1;//面インデックス1
		this.f1 = -1;//面インデックス2
	}
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
	for(i=0;i<1000;i++){
		bufMesh.vertices.push(new Vertex());
		bufMesh.faces.push(new Face());
		bufMesh.edges.push(new Edge());
	};

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
		if(buf.substring(0,11) ==="Metasequoia"){
		}else if(buf.substring(0,16) ==='{"format":"Ono3d'){
			loadret(o3o,url,buf)
		}else{
			return
		}

		var res =  /.*\//.exec(url)
		var currentdir=""
		var texture
		if(res) currentdir = res[0]
		o3o.name=url
		res= /[^\/]*$/.exec(url)
		if(res)o3o.name=res[0]

		for(i=0;i<o3o.materials.length;i++){
			var material = o3o.materials[i];
			material.r*=material.dif
			material.g*=material.dif
			material.b*=material.dif
			if(!o3o.materials[i].texture)continue
			for(j=o3o.textures.length;j--;){
				if(o3o.materials[i].texture === o3o.textures[j].name){
					o3o.materials[i].texture=o3o.textures[j];
					break;
				}
			}
		}

		//loadtexture
		for(i=o3o.textures.length;i--;){
			texture= o3o.textures[i]
			res=/[^\\\/]*$/.exec(texture.path)
			texture.path = res[0]
			texture.path = currentdir + texture.path
			var flg=false;
			for(var j=0;j<o3o.materials.length;j++){
				for(var k=0;k<o3o.materials[j].texture_slots.length;k++){
					if(o3o.materials[j].texture_slots[k].texture==texture
					&& o3o.materials[j].texture_slots[k].normal){
						flg=true;
						break;
					}
				}
			}

			if(flg){
				texture.image = Ono3d.loadBumpTexture(texture.path);
			}else{
				texture.image = Ono3d.loadTexture(texture.path);
			}
		}

		//edge
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
				face.idxnum=face.idx.length;
				for(var k=0;k<face.idxnum-1;k++){
					addEdge(edges,face.idx[k],face.idx[k+1],j)
				}
				addEdge(edges,face.idx[face.idxnum-1],face.idx[0],j)
			}
			o3o.meshes[i].edgeSize=edges.length;
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

		O3o.setFrame(o3o,o3o.scenes[0],0);
		//メッシュ変形のバインド
		for(i=0;i<o3o.objects.length;i++){
			var object=o3o.objects[i];
			for(var j=0;j<object.modifiers.length;j++){
				if(object.modifiers[j].type==="MESH_DEFORM"){
					bind(object,object.modifiers[j]);
				}
			}	
		}
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

	var setdata = function(dst,src){
		for(var member in dst){
			if(src[member] == null)continue;
			var to= typeof src[member];
			if(to == "string"
			|| to == "number"
			){
				dst[member]=src[member];
			}else{
				var dstobj=dst[member];
				if(dstobj instanceof Vec3){
					dstobj[0]=src[member][0];
					dstobj[1]=src[member][1];
					dstobj[2]=src[member][2];
				}else if(dstobj instanceof Mat43){
					//dstobj[0]=src[member][0];
					//dstobj[1]=src[member][1];
					//dstobj[2]=src[member][2];
					//dstobj[4]=src[member][4];
					//dstobj[5]=src[member][5];
					//dstobj[6]=src[member][6];
					//dstobj[8]=src[member][8];
					//dstobj[9]=src[member][9];
					//dstobj[10]=src[member][10];
					//dstobj[12]=src[member][12];
					//dstobj[13]=src[member][13];
					//dstobj[14]=src[member][14];
					Mat43.copy(dstobj,src[member]);
					
				}else if(dstobj instanceof Array){
					if(src[member].length >0){
						if(typeof src[member][0] == "string"
						|| typeof src[member][0] == "number"){
							dst[member] = src[member];
						}
					}
				}else{
					setdata(dstobj,src[member]);
				}
			}
		}
	}
	
	var addEdge=function(edges,v0,v1,f){
		var i,imax
		for(i=0,imax=edges.length;i<imax;i++){
			if((edges[i].v0===v0 && edges[i].v1===v1)
			|| (edges[i].v0===v1 && edges[i].v1===v0)){
				if(edges[i].f0<0){
					edges[i].f0=f
				}else{
					edges[i].f1=f
				}
				return 0
			}
		}
		var edge = new Edge()
		edge.v0=v0
		edge.v1=v1
		edge.f0=f
		edge.f1=-1;
		edges.push(edge)
		return 1
	}
	var name2Obj = function(name,objects){
		var i
		for(i=objects.length;i--;){
			if(objects[i].name === name){
				return objects[i]
			}
		}
		return null
	}

	var loadret = function(o3o,url,buf){
		var 
		i,imax
		,j,jmax
		,k,kmax
		,l
		var res =  /.*\//.exec(url)
		var currentdir="./"
		if(res) currentdir = res[0]

		var res
		 ,line
		 ,type
		
		var
			o3o
			,mesh
			,texture
			,material
			,texture_slot
			,vertex	
			,face	
			,face2	
			,bone	
			,param	
			,edge	
			,quat	
			,faces	
			,shapeKey
			,shapeKeyPoint
			,obj
		var data=new String()
		var o3o2=JSON.parse(buf);
	
	for(var type in o3o2){
		if(type === "textures"){
			//for(line in o3o2[type]){
			for(var line=0;line< o3o2[type].length;line++){
				if(o3o2[type][line].typ=="NONE"){
					continue;
				}
				texture=new Texture()
				o3o.textures.push(texture)
				setdata(texture,o3o2[type][line]);
			}
		}else if(type === "materials"){
			//for(line in o3o2[type]){
			for(var line=0;line< o3o2[type].length;line++){
				material=new Material()
				o3o.materials.push(material)
				setdata(material,o3o2[type][line]);
				material.transRough = o3o2[type][line].trans_rough;
				//for(var line2 in o3o2[type][line].texture_slots){
				for(var line2=0;line2< o3o2[type][line].texture_slots.length;line2++){
					texture_slot=new Texture_slot()
					material.texture_slots.push(texture_slot);
					setdata(texture_slot,o3o2[type][line].texture_slots[line2]);
				}
			}
				
		}else if(type==="meshes"){
			//for(line in o3o2[type]){
			for(var line=0;line< o3o2[type].length;line++){
				mesh=new Mesh()
				o3o.meshes.push(mesh)
				setdata(mesh,o3o2[type][line]);

				//for(var line3 in o3o2[type][line].vertices){
				for(var line3=0;line3< o3o2[type][line].vertices.length;line3++){
					vertex=new Vertex()
					mesh.vertices.push(vertex)
					setdata(vertex,o3o2[type][line].vertices[line3]);
					if(vertex.groupWeights.length==0){
						for(var i=0;i<vertex.groups.length;i++){
							vertex.groupWeights.push(1.0/vertex.groups.length);
						}
					}
				}
				mesh.vertexSize=mesh.vertices.length;

				//フェイス
				//for(var line3 in o3o2[type][line].faces){
				for(var line3=0;line3< o3o2[type][line].faces.length;line3++){
					face=new Face()
					mesh.faces.push(face)
					setdata(face,o3o2[type][line].faces[line3]);

					for(i=0;i<4;i++){
						if(face.idx[i]<0)break
					}
					face.idxnum=i
				}
				mesh.faceSize=mesh.faces.length;

				//uv_layers
				//for(var line3 in o3o2[type][line].uv_layers){
				for(var line3=0;line3< o3o2[type][line].uv_layers.length;line3++){
					var uv_layer=new Uv_layer()
					mesh.uv_layers.push(uv_layer)
					setdata(uv_layer,o3o2[type][line].uv_layers[line3]);
					uv_layer.data=o3o2[type][line].uv_layers[line3].data;
				}
				mesh.uv_layerSize=mesh.uv_layers.length;

				if(o3o2[type][line].double_sided){
					mesh.flg&=~Ono3d.RF_DOUBLE_SIDED;
					mesh.flg|=Ono3d.RF_DOUBLE_SIDED;
				}
				
				//for(var line3 in o3o2[type][line].shapeKeys){
				var shapeKeys = o3o2[type][line].shapeKeys;
				if(shapeKeys)
				for(var line3=0;line3< shapeKeys.length;line3++){
					shapeKey = new ShapeKey()
					mesh.shapeKeys.push(shapeKey)
					//for(var line4 in o3o2[type][line].shapeKeys[line3]){
					for(var line4=0;line3< o3o2[type][line].shapeKeys[line3].length;line4++){
						if(line==="shapeKeyPoints"){
							//for(var line5 in o3o2[type][line].shapeKeys[line3][line4]){
							for(var line5=0;line3< o3o2[type][line].shapeKeys[line3][line4].length;line5++){
								obj= o3o2[type][line].shapeKeys[line3][line4][line5]
								shapeKeyPoint= obj.pos
								shapeKey.shapeKeyPoints.push(shapeKeyPoint)
							}
						}else{
							shapeKey[line4] = o3o2[type][line].shapeKeys[line3][line4]
						}
					}
				}
			}
		}else if(type==="armatures"){
			//for(line in o3o2[type]){
			for(var line=0;line< o3o2[type].length;line++){
				var armature=new Armature()
				o3o.armatures.push(armature);
				setdata(armature,o3o2[type][line]);
				var id=0;
				//for(line3 in o3o2[type][line].bones){
				for(var line3=0;line3< o3o2[type][line].bones.length;line3++){
					bone=new Bone()
					armature.bones.push(bone);
					setdata(bone,o3o2[type][line].bones[line3]);
					bone.id = id;
					id++;
				}
			}
		}else if(type==="actions"){
			//for(line in o3o2[type]){
			for(var line=0;line< o3o2[type].length;line++){
				var action=new Action()
				o3o.actions.push(action)
				setdata(action,o3o2[type][line]);
	//			for(line3 in o3o2[type][line].fcurves){
				for(var line3=0;line3< o3o2[type][line].fcurves.length;line3++){
					var fcurve = new Fcurve()
					action.fcurves.push(fcurve)
					setdata(fcurve,o3o2[type][line].fcurves[line3]);
					//for(line5 in o3o2[type][line].fcurves[line3].keys){
					for(var line5=0;line5< o3o2[type][line].fcurves[line3].keys.length;line5++){
						fcurve.keys.push(o3o2[type][line].fcurves[line3].keys[line5].f);
						fcurve.params.push(o3o2[type][line].fcurves[line3].keys[line5].p);
					}
					fcurve.type=fcurveConvert[fcurve.type];
				}
			}
		}else if(type==="objects"){
			for(var line =0;line<o3o2[type].length;line++){
				object =new SceneObject()
				o3o.objects.push(object)
				setdata(object,o3o2[type][line]);

				object.modifiers=o3o2[type][line].modifiers;
				object.o3o=o3o;
			}
		}else if(type==="scenes"){
			for(var line=0;line< o3o2[type].length;line++){
				var scene=new Scene()
				var object
				o3o.scenes.push(scene)
				scene.o3o=o3o;
				setdata(scene,o3o2[type][line]);

			}
		}else if(type==="lamps"){
			for(var line=0;line< o3o2[type].length;line++){
				var lamp=new Lamp();
				var object;
				o3o.lamps.push(lamp);
				setdata(lamp,o3o2[type][line]);
			}

		}
	}
	
	
		var scene,name,object,objects
		for(i=o3o.scenes.length;i--;){
			scene = o3o.scenes[i]
			for(j=scene.objects.length;j--;){
				scene.objects[j] = name2Obj(scene.objects[j],o3o.objects);
			}
		}
		for(j=o3o.objects.length;j--;){
			object=o3o.objects[j]
			if(object.type==="MESH"){
				object.objecttype=OBJECT_MESH;
				object.data=name2Obj(object.data,o3o.meshes)
			}else if(object.type==="ARMATURE"){
				object.objecttype=OBJECT_ARMATURE;
				object.data=name2Obj(object.data,o3o.armatures)
				object.poseArmature = new PoseArmature(object.data);
			}else if(object.type==="LAMP"){
				object.objecttype=OBJECT_LAMP;
				object.data=name2Obj(object.data,o3o.lamps)
			}else{
				object.objecttype="";
				object.data=null
			}
			object.parent=name2Obj(object.parent,o3o.objects)
			for(k=0;k<object.modifiers.length;k++){
				object.modifiers[k].object=name2Obj(object.modifiers[k].object,o3o.objects)
				var  name=object.modifiers[k].vertex_group;
				object.modifiers[k].vertex_group=-1;
				for(var l=0;l<object.groups.length;l++){
					if(object.groups[l]===name){
						object.modifiers[k].vertex_group=l;
						break;
					}
				}
			}
			object.action=name2Obj(object.action,o3o.actions)

			if(object.rigid_body_constraint){
				object.rigid_body_constraint.object1=name2Obj(object.rigid_body_constraint.object1,o3o.objects)
				object.rigid_body_constraint.object2=name2Obj(object.rigid_body_constraint.object2,o3o.objects)

			}
		}
		for(i=o3o.materials.length;i--;){
			for(j=o3o.materials[i].texture_slots.length;j--;){
				var texture_slot = o3o.materials[i].texture_slots[j];
				texture_slot.texture=name2Obj(texture_slot.texture,o3o.textures)
				texture_slot.action=name2Obj(texture_slot.action,o3o.actions)
			}
		}
		var count=0
		for(i=o3o.meshes.length;i--;){
			mesh = o3o.meshes[i]
			//マテリアルのポインタ設定
			for(j=mesh.faces.length;j--;){
				face =mesh.faces[j]
				face.material = o3o.materials[face.mat]
			}
			
		}
	
		//骨の名称をアドレスに変更
		var i;for(i=o3o.armatures.length;i--;){
			armature=o3o.armatures[i]
			for(j=armature.bones.length;j--;){
				bone = armature.bones[j]
				Mat43.getInv(bone.imatrix,bone.matrix)
				for(k=armature.bones.length;k--;){
					if(bone.parent === armature.bones[k].name){
						bone.parent = armature.bones[k] 
						break
					}
				}
			}
		}
		
		for(j=o3o.objects.length;j--;){
			object=o3o.objects[j]
			if(object.parent){
				if(object.parent_bone){
					object.parent_bone=name2Obj(object.parent_bone,object.parent.poseArmatur.poseBones);
				}
			}
		}

		return o3o
	}
	
	var freezeMesh = function(dst,obj,physics){
		//モデファイアとワールド行列を反映
		copyMesh(dst,obj.data);
		var defMat = Mat43.poolAlloc();
		

		var flg=false;

		var phyObj = null;
		if(physics){
			phyObj = physics.find(function(a){return a.name===obj.name});
			if(phyObj){
				if(phyObj.type===OnoPhy.SPRING_MESH || phyObj.type===OnoPhy.CLOTH){
					for(var j=phyObj.points.length;j--;){
						Vec3.copy(dst.vertices[j].pos,phyObj.points[j].location);
					}
					flg =true;
				}
			}
		}
		var bufdata=obj.data;
		flg|=calcModifiers(dst,obj,flg,physics);


		if(!flg){
			//既に頂点単位で計算された場合はこの座標変換は行わない
			if(phyObj){
				Mat43.copy(defMat,phyObj.matrix);
			}else{
				Mat43.dotMat44Mat43(defMat,ono3d.worldMatrix,obj.mixedmatrix);
			}
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
	var copyMesh= function(dst,src){
		dst.name=src.name;

		//頂点情報をコピー
		var d=src.vertexSize - dst.vertices.length;
		for(var i = 0;i<d;i++){
			//変数領域が足りない場合は追加
			dst.vertices.push(new Vertex());
		}
		for(var i = 0;i<src.vertexSize;i++){
			Vec3.copy(dst.vertices[i].pos,src.vertices[i].pos);
			for(var j=0;j<3;j++){
				dst.vertices[i].groups[j]= src.vertices[i].groups[j];
				dst.vertices[i].groupWeights[j]= src.vertices[i].groupWeights[j];
			}
		}
		dst.vertexSize=src.vertexSize;

		//辺情報をコピー
		var d=src.edgeSize - dst.edges.length;
		for(var i = 0;i<d;i++){
			//変数領域が足りない場合は追加
			dst.edges.push(new Edge());
		}
		for(var i = 0;i<src.edgeSize;i++){
			var srcEdge=src.edges[i];
			var dstEdge=dst.edges[i];
			dstEdge.v0=srcEdge.v0;
			dstEdge.v1=srcEdge.v1;
			dstEdge.f0=srcEdge.f0;
			dstEdge.f1=srcEdge.f1;
		}
		dst.edgeSize=src.edgeSize;

		//面情報をコピー
		d=src.faceSize - dst.faces.length;
		for(var i = 0;i<d;i++){
			//変数領域が足りない場合は追加
			dst.faces.push(new Face());
		}
		for(var i = 0;i<src.faceSize;i++){
			var dstFace=dst.faces[i];
			var srcFace =src.faces[i];

			dstFace.material = srcFace.material;
			dstFace.mat= srcFace.mat;
			dstFace.idxnum=srcFace.idxnum;
			dstFace.fs = srcFace.fs;

			for(var j=0;j<srcFace.idxnum;j++){
				dstFace.idx[j]= srcFace.idx[j];
			}
		}
		dst.faceSize=src.faceSize;

		//uvをコピー
		d=src.uv_layersSize - dst.uv_layers.length;
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
	
	var addaction = function(obj,name,action,frame){
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

	var calcMatrix=function(obj,frame){
		if(obj.action){
			//対象オブジェクトに関連するアクションを計算
			addaction(obj,"",obj.action,frame)
		}
		genMatrix(obj.matrix,obj); //計算後の姿勢から行列を作成
		obj.flg=false; //行列の親子合成フラグをリセット
	}



	var genMatrix=function(mat,obj){
		if(obj.rotation_mode===QUATERNION){
			Mat43.fromLSR(mat,obj.location,obj.scale,obj.rotation);
		}else{
			Mat43.fromLSE(mat,obj.location,obj.scale,obj.rotation);
		}
	}
	var mixMatrix=function(obj){
		if(obj.parent){
			var parent;
			Mat43.dot(obj.mixedmatrix,obj.iparentmatrix,obj.matrix);
			if(obj.parent_bone){
				parent=obj.parent_bone;
				obj.mixedmatrix[13]+=parent.target.length;
				Mat43.dot(obj.mixedmatrix,parent.target.matrix,obj.mixedmatrix);
				Mat43.dot(obj.mixedmatrix,parent.mixedmatrix,obj.mixedmatrix);
			}
			parent=obj.parent;

			if(!parent.flg){
				mixMatrix(parent);
			}
			Mat43.dot(obj.mixedmatrix,parent.mixedmatrix,obj.mixedmatrix);
		}else{
			Mat43.copy(obj.mixedmatrix,obj.matrix);
		}
		obj.flg=true;
	}
	var setFrame=ret.setFrame=function(o3o,scene,frame){
		var objects = scene.objects;
		if(o3o){
			for(var i=o3o.materials.length;i--;){
				//マテリアルのUVアニメーション
				var material=o3o.materials[i];
				for(var j=material.texture_slots.length;j--;){
					var texture_slot = material.texture_slots[j];
					if(texture_slot.action){
						addaction(texture_slot,"0",texture_slot.action,frame);
					}
				}
			}
		}

		for(var i=0;i<objects.length;i++){
			objects[i].flg=false;
		}

		for(var i=0;i<objects.length;i++){
			//オブジェクト(アーマチュア及びメッシュ)のアニメーション
			calcMatrix(objects[i],frame);

			if(objects[i].objecttype===OBJECT_ARMATURE && objects[i].action){
				//もしアーマチュアの場合は、ボーンの計算を行う
				objects[i].poseArmature.setAction(objects[i].action,frame);
			}
		}

		for(var i=0;i<objects.length;i++){
			//親子関係のオブジェクトの姿勢を合成
			mixMatrix(objects[i]);
		}

	}
	var setMaterial=function(material,name){
		var smoothing=ono3d.smoothing;
		var renderMaterial;
		var material;
		var renderMaterials=ono3d.renderMaterials;
		var i=0;
		for(;i<ono3d.renderMaterials_index;i++){
			if(renderMaterials[i].name === name){
				return i;
			}
		}
		renderMaterial = renderMaterials[i];
		ono3d.renderMaterials_index++;

		renderMaterial.offsetx=0;
		renderMaterial.offsety=0;
		renderMaterial.name =name;
		renderMaterial.r = material.r;
		renderMaterial.g= material.g;
		renderMaterial.b= material.b;
		renderMaterial.a= material.a;
		if(material.use_transparency){
			renderMaterial.opacity = material.a;
		}else{
			renderMaterial.opacity = 0;
		}
		renderMaterial.ior = material.ior;
		renderMaterial.trans_rough = material.trans_rough;

		if(material.use_mirror){
			renderMaterial.reflect= material.reflect;
		}else{
			renderMaterial.reflect= 0;
		}
		renderMaterial.rough= material.rough;
		renderMaterial.spc= material.reflect;
		renderMaterial.env= material.env;
		renderMaterial.emt = material.emt;
		renderMaterial.reflectionColor = material.reflectionColor;
		renderMaterial.transRough= material.transRough;
		
		renderMaterial.smoothing = smoothing;

		renderMaterial.normalmap=null;
		renderMaterial.pbrmap=null;
		renderMaterial.texture = null
		for(var j=material.texture_slots.length;j--;){
			var texture_slot = material.texture_slots[j];
			if(texture_slot.texture){
				if(texture_slot.normal>0){
					renderMaterial.normalmap= texture_slot.texture.image;
					renderMaterial.normal=texture_slot.normal;
				}else if(texture_slot.pbr>0){
					renderMaterial.pbrmap = texture_slot.texture.image;
					renderMaterial.pbr=texture_slot.pbr;
				}else{
					renderMaterial.texture = texture_slot.texture.image;
					renderMaterial.offsetx=texture_slot.offset[0];
					renderMaterial.offsety=texture_slot.offset[1];
				}
			}
		}

		renderMaterial.shader = material.shader;

		return i;
	}
	var materialTable=new Array(256);

	ret.drawScene = function(scene,physics){
		var i;
		var o3o=scene.o3o;
		var objects = scene.objects;

		for(i=objects.length;i--;){
			var obj=objects[i];
			if(obj.objecttype!=OBJECT_MESH)continue;
			if(obj.hide_render)continue;
			drawObject(o3o,scene.objects[i],physics);
		}
		
	}

	ret.drawObject = function(obj,physics){
		var o3o = obj.o3o;
		
		materialTable[0]=setMaterial(defaultMaterial,"defaultMaterial");
		var materials = o3o.materials;
		if(ret.useCustomMaterial){
			for(var i=0;i<materials.length+1;i++){
				materialTable[i]=setMaterial(customMaterial,"customMaterial");
			}
		}else{
			for(var i=0;i<materials.length;i++){
				materialTable[i+1]=setMaterial(materials[i],o3o.name+"_"+materials[i].name);
			}
		}
		if(obj.type=="MESH"){
			drawObject(o3o,obj,physics);
		}
	}

	var abs=Math.abs;
	var table=new Array(64);
	var calcModifiers=function(dst,obj,flg,phyobjs){
		var flg=0;
		for(var i=0,imax=obj.modifiers.length;i<imax;i++){
			var mod=obj.modifiers[i];
			if(mod.type!="MIRROR" && flg){
				continue;
			}
			if(mod.type=="MIRROR"){
				flg|=modMirror(dst,obj,mod);
			}else if(mod.type=="ARMATURE"){
				flg|=modArmature(dst,obj,mod);
			}else if(mod.type=="MESH_DEFORM"){
				flg|=modMeshDeform(dst,obj,mod,phyobjs);
			}
		}
		return flg;
	}

	var deformMatricies=[];
	for(var i=0;i<128;i++){
		deformMatricies.push(new Mat43());
	}
	var deformMesh = new Mesh();
	var modMeshDeform=function(dst,obj,mod,phyObjs){
		//メッシュデフォーム
		if(!mod.basePos){
			return 0;
		}

		//デフォーム親メッシュを計算
		freezeMesh(deformMesh,mod.object,phyObjs);

		var dmv=deformMesh.vertices;
		var binddata=mod.binddata;
		var f=Vec4.poolAlloc();

		for(var i=0;i<deformMesh.faces.length;i++){
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
				//Vec3.set(deformBuf2[i],0,0,0);
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
	var modMirror = function(dst,obj,mod){
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
			var dst=dstFace.uv,src=srcFace.uv
			for(var k=0;k<srcFace.idxnum;k++){
				var _k = srcFace.idxnum-k;
				if(k==0){_k=0};

				if(abs(bufMeshVertices[srcvertices[_k]].pos[mrr])>0.01){
					dstvertices[k]= srcvertices[_k] + vertexSize;
				}else{
					//座標が中心に近い場合は共有
					dstvertices[k] = srcvertices[_k];
				}

				dst[k*2] = src[_k*2]
				dst[k*2+1] = src[_k*2+1]
			}

			dstFace.material = srcFace.material;
			dstFace.mat= srcFace.mat;
			dstFace.fs= srcFace.fs;

		}
		var jj=0;
		for(var j =0;j<bufMesh.edgeSize;j++){
			var dst=bufMesh.edges[jj+bufMesh.edgeSize]
			var src=bufMesh.edges[j];
			if(abs(bufMeshVertices[src.v0].pos[mrr])<0.01
			 && abs(bufMeshVertices[src.v1].pos[mrr])<0.01){
				src.f1=src.f0+faceSize;

				continue;
			}
			dst.v0=src.v0+vertexSize;
			dst.v1=src.v1+vertexSize;
			dst.f0=src.f0+faceSize;
			if(src.f1>=0){
				dst.f1=src.f1+faceSize;
			}else{
				dst.f1=-1;
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
	var modArmature=function(dst,obj,mod){
		var bufMesh = dst;
		var bufMeshVertices =bufMesh.vertices
		var renderVertex;
		var groupMatrix;
		var groupName;
		var x,y,z;

		var ratio,pos,vertex;
		var groups=obj.groups;

		var bM = Mat43.poolAlloc();
		var bM2 = Mat43.poolAlloc();
		Mat43.getInv(bM2,mod.object.mixedmatrix);
		Mat43.dot(bM,bM2,obj.mixedmatrix);
		Mat43.getInv(bM2,bM);

		var poseBones=mod.object.poseArmature.poseBones;
		var bones = mod.object.data.bones;
		var poseArmature = mod.object.poseArmature;

		poseArmature.calcMatrix();


		for(var j=groups.length;j--;){
			groupMatFlg[j] = false;
			groupName=groups[j];
			groupMatrix = groupMatricies[j];
			for(var k=0,kmax=bones.length;k<kmax;k++){
				if(bones[k].name!=groupName)continue
				groupMatFlg[j] = true;
				Mat43.dot(groupMatrix,poseArmature.matrices[k],bM);
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

	var drawObject = function(o3o,obj,physics){

		freezeMesh(bufMesh,obj,physics); //モデファイア適用

		var bufMeshVertices=bufMesh.vertices;
		var renderVertices =ono3d.renderVertices;
		var rvIndex=ono3d.renderVertices_index;
		var renderFaces=ono3d.renderFaces;
		var rfIndex=ono3d.renderFaces_index;
		var rfCount=0;
		var renderMaterials=ono3d.renderMaterials;
		var face,renderFace;
		var rf= ono3d.rf | bufMesh.flg;
		var smoothing=ono3d.smoothing;
		var triangles=Ono3d.OP_TRIANGLES;
		var offsetx=0,offsety=0;

		for(var i=0;i<bufMesh.vertexSize;i++){
			//モディファイア適用後の頂点をレンダー用頂点バッファに設定
			Vec3.copy(renderVertices[rvIndex+i].pos,bufMeshVertices[i].pos);
		}

		var uv=[0,0,0,0,0,0];
		var bV0 = Vec3.poolAlloc();

		var uv_layerdata=null;
		if(bufMesh.uv_layerSize){
			//uv指定ありの場合はレイヤを設定(0番固定)
			uv_layerdata=bufMesh.uv_layers[0].data;
		}
		for(var i=0;i<bufMesh.faceSize;i++){
			//フェイスをレンダー用バッファに格納
			face=bufMesh.faces[i];

			//面法線算出
			if(face.idxnum==3){
				Vec3.cross2(bV0
					,renderVertices[face.idx[0] + rvIndex].pos
					,renderVertices[face.idx[1] + rvIndex].pos
					,renderVertices[face.idx[2] + rvIndex].pos);
			}else{
				Vec3.cross3(bV0
					,renderVertices[face.idx[0] + rvIndex].pos
					,renderVertices[face.idx[2] + rvIndex].pos
					,renderVertices[face.idx[1] + rvIndex].pos
					,renderVertices[face.idx[3] + rvIndex].pos);
			}
			Vec3.norm(bV0);

			for(var j=0;j<face.idxnum-2;j++){
				//三角単位でレンダー用バッファに格納
				renderFace = renderFaces[rfIndex+i];
				if(j>0){
					//四角以上のポリゴンは後ろに追加する
					renderFace = renderFaces[rfIndex+(rfCount -i-1)+bufMesh.faceSize];
				}
				rfCount++;
				renderFace.operator = triangles;
				renderFace.reverseFlg=0;

				renderFace.rf = rf;
				renderFace.rf &= ~(Ono3d.RF_OUTLINE * face.fs);
				
				renderFace.smoothing = smoothing;

				renderFace.vertices[0]=renderVertices[face.idx[0] + rvIndex];
				renderFace.vertices[1]=renderVertices[face.idx[1+j] + rvIndex];
				renderFace.vertices[2]=renderVertices[face.idx[2+j] + rvIndex];

				renderFace.material= ono3d.renderMaterials[materialTable[face.mat+1]];
				if(face.mat>=0 && uv_layerdata){
					//uv値セット　オフセット分もたす
					offsetx=renderFace.material.offsetx;
					offsety=renderFace.material.offsety;
					uv = uv_layerdata[i];
					if(uv){

					renderFace.uv[0][0] = uv[0]+offsetx;
					renderFace.uv[0][1] = uv[1]+offsety;
					renderFace.uv[1][0] = uv[(1+j)*2]+offsetx;
					renderFace.uv[1][1] = uv[(1+j)*2+1]+offsety;
					renderFace.uv[2][0] = uv[(2+j)*2]+offsetx;
					renderFace.uv[2][1] = uv[(2+j)*2+1]+offsety;
					}
				}

				Vec3.copy(renderFace.normal,bV0);
			}
		}
		Vec3.poolFree(1);

		if( ono3d.smoothing>0){
			//スムーシングする場合頂点法線セット
			for(var i = 0;i<bufMesh.vertexSize;i++){
				Vec3.set(renderVertices[rvIndex+i].normal,0,0,0);
			}
			for(var i = 0;i<rfCount;i++){
				var renderFace = renderFaces[rfIndex+i];
				for(var j=3;j--;){
					Vec3.add(renderFace.vertices[j].normal
						,renderFace.vertices[j].normal
							,renderFace.normal)
				}
			}

			for(var i = bufMesh.vertexSize;i--;){
				Vec3.norm(renderVertices[rvIndex+i].normal);
			}
		}
		

		if( ono3d.rf  & Ono3d.RF_OUTLINE){
			//アウトライン作成
			var bufFace,normal;
			var bM44 = Mat44.poolAlloc();
			Mat44.getInv(bM44,ono3d.viewMatrix);
			var cp0=bM44[12];
			var cp1=bM44[13];
			var cp2=bM44[14];
			Mat44.poolFree(1);
			for(i=0;i<rfCount;i++){
				bufFace = renderFaces[i+rfIndex]
				if(bufFace.rf & Ono3d.RF_OUTLINE && bufFace.material.opacity ==1.0){
					normal=bufFace.normal
					if((bufFace.vertices[0].pos[0]-cp0)*normal[0]
					 + (bufFace.vertices[0].pos[1]-cp1)*normal[1]
					 + (bufFace.vertices[0].pos[2]-cp2)*normal[2]<0){
						bufFace.cul=1; //表
					}else{
						bufFace.cul=-1; //裏
					}	
				}else{
					bufFace.cul=0; //アウトライン非対象
				}

			}

			//アウトライン用マテリアル作成
			var renderMaterial = ono3d.renderMaterials[ono3d.renderMaterials_index];
			renderFace.materialIndex= ono3d.renderMaterials_index;
			ono3d.renderMaterials_index++;

			renderMaterial.r = ono3d.lineColor[0];
			renderMaterial.g = ono3d.lineColor[1];
			renderMaterial.b = ono3d.lineColor[2];
			renderMaterial.a = ono3d.lineColor[3];
			renderMaterial.opacity = ono3d.lineColor[3];
			renderMaterial.shader="lineshader";

			var edges=bufMesh.edges;
			for(i=0;i<bufMesh.edgeSize;i++){
				//エッジをアウトラインとして描画するかどうかの判定
				var edge=edges[i];

				if(edge.f0<0)continue; //エッジが属する面が存在しない場合はスキップ
				if(edge.f1<0){ //属面が1こだけの場合、その面が表でないならスキップ
					if(renderFaces[edge.f0+ono3d.renderFaces_index].cul<1)continue;
				}else{ //属面が2つある場合、裏表の境界になる場合以外はスキップ
					if(renderFaces[edge.f0+ono3d.renderFaces_index].cul
						* renderFaces[edge.f1+ono3d.renderFaces_index].cul > -1)continue;
				}

				//線描画追加
				var renderFace=renderFaces[ono3d.renderFaces_index+rfCount];
				renderFace.vertices[0] = renderVertices[ono3d.renderVertices_index+edge.v0]
				renderFace.vertices[1] = renderVertices[ono3d.renderVertices_index+edge.v1]
				renderFace.bold = ono3d.lineWidth;
				renderFace.material = renderMaterial;
				renderFace.operator = Ono3d.OP_LINE;
				renderFace.rf=ono3d.rf;
				rfCount++;
			}
			
		}
		ono3d.renderVertices_index+=bufMesh.vertexSize;
		ono3d.renderFaces_index+=rfCount;
		
	}

	ret.createCollisions= function(scene){
		var collisions=[] ;
		for(var i=0;i<scene.objects.length;i++){
			var object = scene.objects[i];
			//3Dデータからコリジョン生成
			if(object.name.indexOf("_") !==0 || !object.rigid_body){
				continue;
			}
			var collision=O3o.createCollision(object);
			if(collision){
				collisions.push(collision);
			}
		}
		return collisions;
	}
	ret.moveCollision=function(collision,object,ono3d){
		//コリジョンの状態を更新
		var b = object.bound_box;
		var rotq = Vec4.poolAlloc();
		var location= Vec3.poolAlloc();
		var scale= Vec3.poolAlloc();
		var mat = Mat43.poolAlloc();

		Mat43.dotMat44Mat43(mat,ono3d.worldMatrix,object.mixedmatrix);
		Mat43.toLSR(location,scale,rotq,mat);

		var sx=(b[3] - b[0])*0.5 * scale[0];
		var sy=(b[4] - b[1])*0.5 * scale[1];
		var sz=(b[5] - b[2])*0.5 * scale[2];
		var bold = 0;

		switch(collision.type){
		case Collider.SPHERE:
			bold = Math.max(Math.max(sx,sy),sz);
			sx=sy=sz=0;
			break;
		case Collider.CAPSULE:
			bold = Math.max(sx,sy);
			sz=Math.max((b[5]-b[2])*0.5 -bold,0)*scale[2];
			break;
		case Collider.MESH:
		case Collider.CONVEX_HULL:
			var vertices = object.data.vertices;
			for(var i=0;i<vertices.length;i++){
				Mat43.dotVec3(collision.poses[i],mat,vertices[i].pos);
			}
			sx=object.scale[0];
			sy=object.scale[1];
			sz=object.scale[2];
			break;
		}
		Vec3.set(scale,sx,sy,sz);
		Mat43.fromLSR(collision.matrix,location,scale,rotq);
		collision.bold = bold;
		collision.groups = object.rigid_body.collision_groups;

		if(collision.type !== Collider.MESH || !collision.AABBTreeRoot){
			collision.update();
		}
		Vec3.poolFree(2);
		Vec4.poolFree(1);
		Mat43.poolFree(1);
	}
	ret.createCollision = function(obj){
		var collision=null;
		var shape = obj.rigid_body.collision_shape;
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
	ret.createPhyObj = function(obj,onoPhy){
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
			phyobj=onoPhy.createRigidBody();

			var collision = O3o.createCollision(obj);
			phyobj.collision=collision;
			if(collision){
				onoPhy.collider.addCollision(collision);
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

		}
		for(var i=0;i<obj.modifiers.length;i++){
			mod = obj.modifiers[i];
			if(mod.type==="CLOTH" || mod.type==="SOFT_BODY"){
				mesh = obj.data;
				freezeMesh(bufMesh,obj);

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

				onoPhy.clothes.push(phyobj);


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
					phyobj.edges[j].point1 = phyobj.points[edge.v0];
					phyobj.edges[j].point2 = phyobj.points[edge.v1];
				}
				//obj.phyObj = phyobj;
				//movePhyObj(obj,0,true);
				for(var j =0;j<phyobj.edges.length;j++){
					phyobj.edges[j].len=Vec3.len(phyobj.edges[j].point1.location
						,phyobj.edges[j].point2.location);
				}

				phyobj.init();
				
			}
		}
		if(phyobj){
			phyobj.name=obj.name;
			phyobj.parent=obj;
			phyobj.refresh();
			movePhyObj(phyobj,obj,0,true);
		}

		return phyobj;
	}
	var createPhyJoint= ret.createPhyJoint = function(sceneObject,phyObjs,onoPhy){
		var search=function(name){
			//物理オブジェクト一覧から名前で探す
			for(var j=0;j<phyObjs.length;j++){
				if(name == phyObjs[j].name){
					return phyObjs[j];
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
		var phyObj = search(sceneObject.name); //ジョイント元オブジェクト

		//ジョイント作成
		joint = onoPhy.createJoint();
		phyObj.joint = joint;
		
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
			flg=0x37;
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

		var m=joint.matrix;
		if(joint.object1==phyObj){
			joint.parent=joint.object2;
			joint.child=joint.object1;
		}else{
			joint.parent=joint.object1;
			joint.child=joint.object2;
		}
		//接続差異行列設定
		Mat43.getInv(joint.parent.inv_matrix,joint.parent.matrix);
		Mat43.dot(m,joint.parent.inv_matrix,joint.child.matrix);
		
		
	}

	var movePhyObj = ret.movePhyObj = function(phyObj,object,dt,flg){
		

		if(phyObj.type===OnoPhy.CLOTH){
			var truepos=phyObj.truepos;
			var bufMeshVertices=bufMesh.vertices;
			freezeMesh(bufMesh,object,null);

			var mat=Mat43.poolAlloc();
			var rotq = phyObj.rotq;
			//Mat43.dotMat44Mat43(mat,ono3d.worldMatrix,object.mixedmatrix);
			//Mat43.toLSR(phyObj.location,phyObj.scale,phyObj.rotq,mat);

			if(flg){
				for(var i=0,imax=phyObj.points.length;i<imax;i++){
					Vec3.copy(phyObj.points[i].location,bufMeshVertices[i].pos);
					Vec3.set(phyObj.points[i].v,0,0,0);
					Vec4.copy(phyObj.points[i].rotq,rotq);
				}
			}else{
				for(var i=0,imax=phyObj.points.length;i<imax;i++){
					if(phyObj.points[i].fix){
						Vec3.copy(phyObj.points[i].location,bufMeshVertices[i].pos);
						Vec3.set(phyObj.points[i].v,0,0,0);
						Vec4.copy(phyObj.points[i].rotq,rotq);
					}
				}
			}
			Mat43.poolFree(1);
		}else{
			if(phyObj.fix || flg){
				Vec3.set(phyObj.v,0,0,0);
				Vec3.set(phyObj.rotV,0,0,0);
			
				Mat43.dotMat44Mat43(phyObj.matrix,ono3d.worldMatrix,object.mixedmatrix);
				Mat43.toLSR(phyObj.location,phyObj.scale,phyObj.rotq,phyObj.matrix);

				if(dt !=0){
					Vec3.sub(phyObj.v,phyObj.location,phyObj.oldloc);
					Vec3.mul(phyObj.v,phyObj.v,1/dt);
				}else{
					Vec3.copy(phyObj.oldloc,phyObj.location);
				}
				//phyObj.calcPre();
			}
		}
	}
	ret.loadTexture=function(path){
		var texture = new Texture();
		texture.path=path;
		texture.image = Util.loadImage(texture.path,1);
		return texture;
	}

	ret.createPhyObjs = function(scene,onoPhy){
		var phyObjs=new Array();
		for(var i=0;i<scene.objects.length;i++){
			//3Dデータから物理オブジェクト生成
			if(scene.objects[i].name.indexOf("_")==0){
				continue;
			}
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
		return phyObjs;
	}

	return ret
})()
