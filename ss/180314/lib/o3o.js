"use strict"
var O3o=(function(){
	var i
		,bVec4=new Vec4()
		,bM=new Mat44()
		,bM2=new Mat44()
		,bM44 =new Mat44()
		
		,groupMatricies = new Array(64)
		,groupMatFlg= new Array(64)
		,defMatrix = new Mat44()
	;

	for(i=groupMatricies.length;i--;)groupMatricies[i] = new Mat44();

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
		this.objectsN=[]; //オブジェクト名からアドレスを引くテーブル（使ってない）
		this.textures = [];//テクスチャ
		this.materials = []; //マテリアル
		this.meshes = []; //メッシュ
		this.armatures = [];//スケルトン
		this.actions = []; //アニメーション
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
		this.matrix=new Mat44();//平行移動スケール回転合わせた行列
		this.action=""; //関連付けられたアニメーション
		this.data=""; //内容(メッシュとかアーマチュア)
		this.parent=""; //親オブジェクト
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

		this.posebones = []; // ボーンの状態
		this.mixedmatrix=new Mat44();
		this.flg=false;//既に合成行列が計算されているかどうかのフラグ
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
	var PoseBone = function(){
		//ボーン状態
		this.name="";
		this.target="";
		this.parent="";
		this.location=new Array(3);
		this.rotation_mode=QUATERNION;
		this.rotation=new Array(4);
		this.scale=new Array(3);
		this.matrix=new Mat44();
		this.mixedmatrix=new Mat44();
		this.flg=false;
	}
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
		this.reflectionColor=new Vec3();
		Vec3.set(this.reflectionColor,1,1,1);
		this.reflect=0.0;
		this.ior=1.0;
		this.rough=0.0;
		this.emt=0.0;
		this.spc=0.0;
		this.spchard=0.0;
		this.ior=1.0;
		this.normal=0;
		this.texture_slots=[];
		this.env=0.0;
	}
	var Texture_slot = ret.Texture_slot = function(){
		//テクスチャスロット
		this.texture="";
		this.uv_layer="";
		this.normal=0;
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
		this.matrix = new Mat44();
		this.imatrix = new Mat44();
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
				if(face.idxnum===3){
					addEdge(edges,face.idx[0],face.idx[1],j)
					addEdge(edges,face.idx[1],face.idx[2],j)
					addEdge(edges,face.idx[2],face.idx[0],j)
				}else if(faces[j].idxnum===4){
					addEdge(edges,face.idx[0],face.idx[1],j)
					addEdge(edges,face.idx[1],face.idx[2],j)
					addEdge(edges,face.idx[2],face.idx[3],j)
					addEdge(edges,face.idx[3],face.idx[0],j)
				}
			}
			o3o.meshes[i].edgeSize=edges.length;
		}

		var bind=function(object,modifier){
			var mod= new Mesh();
			freezeMesh(mod,modifier.object);
			freezeMesh(bufMesh,object);
			var binddata=[];
			var ret1 = new Vec3();
			var ret2 = new Vec3();
			for(var i=0;i<bufMesh.vertexSize;i++){
				var pos = bufMesh.vertices[i].pos;
				var binds=[];
				var bind={idx:-1,weight:99999,len:0,pweight:[0,0,0]};
				binds.push(bind);

				for(var j=0;j<mod.faceSize;j++){
					//近い面を探す
					Geono.TRIANGLE_POINT(ret1,mod.vertices[mod.faces[j].idx[0]].pos
						,mod.vertices[mod.faces[j].idx[1]].pos
						,mod.vertices[mod.faces[j].idx[2]].pos
						,pos);
					var l= Vec3.len2(ret1,pos);
					if(mod.faces[j].idxnum==4){
						Geono.TRIANGLE_POINT(ret1,mod.vertices[mod.faces[j].idx[2]].pos
							,mod.vertices[mod.faces[j].idx[3]].pos
							,mod.vertices[mod.faces[j].idx[0]].pos
							,pos);
						l = Math.min(l,Vec3.len2(ret1,pos));
					}
					var face = mod.faces[j];

					if(face.idxnum==4){
						Geono.calcSquarePos(binds[0].pweight,mod.vertices[face.idx[0]].pos
							,mod.vertices[face.idx[1]].pos
							,mod.vertices[face.idx[2]].pos
							,mod.vertices[face.idx[3]].pos,pos);
					}else{
						var v = new Vec3();
						Vec3.sub(v,mod.vertices[face.idx[2]].pos,mod.vertices[face.idx[1]].pos);
						Vec3.add(v,mod.vertices[face.idx[0]].pos,v);
						Geono.calcSquarePos(binds[0].pweight,mod.vertices[face.idx[0]].pos
							,mod.vertices[face.idx[1]].pos
							,mod.vertices[face.idx[2]].pos
							,v,pos);
					}
					if(binds[0].pweight[0]<0 || binds[0].pweight[1]>1){
						continue;
					}

					if(binds[0].weight>l){
						binds[0].idx=j;
						binds[0].weight=l;
					}
				}
				var sum=0;
				for(var j=0;j<binds.length;j++){
					var bind = binds[j];
					//ウェイト変換
					if(bind.weight===0){
						for(var kk=0;kk<bind.length;kk++){
							binds[kk].weight=0;
						}
						bind.weight=1;
						sum=1;
						break;
					}
					bind.weight=Math.sqrt(bind.weight);
					bind.weight=1/bind.weight;
					bind.weight=1;
					sum+=bind.weight;

					//面との位置関係を求める
					var face =mod.faces[bind.idx];
					Vec3.cross2(ret1,mod.vertices[face.idx[0]].pos
						,mod.vertices[face.idx[1]].pos
						,mod.vertices[face.idx[2]].pos);
					Vec3.norm(ret1);
					Vec3.sub(ret2,pos,mod.vertices[face.idx[0]].pos);
					bind.len = Vec3.dot(ret1,ret2); //法線距離
					//Vec3.madd(ret2,pos,ret1,-bind.len);

					if(face.idxnum==4){
						Geono.calcSquarePos(bind.pweight,mod.vertices[face.idx[0]].pos
							,mod.vertices[face.idx[1]].pos
							,mod.vertices[face.idx[2]].pos
							,mod.vertices[face.idx[3]].pos,pos);
					}else{
						var v = new Vec3();
						Vec3.sub(v,mod.vertices[face.idx[2]].pos,mod.vertices[face.idx[1]].pos);
						Vec3.add(v,mod.vertices[face.idx[0]].pos,v);
						Geono.calcSquarePos(bind.pweight,mod.vertices[face.idx[0]].pos
							,mod.vertices[face.idx[1]].pos
							,mod.vertices[face.idx[2]].pos
							,v,pos);
					}
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
			var basePos2=[];
			for(var i=0;i<bufMesh.vertexSize;i++){
				basePos2.push(new Vec3());
				Vec3.copy(basePos2[i],bufMesh.vertices[i].pos);
			}
			modifier.basePos2=basePos2;
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
			onloadfunc(o3o,"",buf)
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
				}else if(dstobj instanceof Mat44){
					dstobj[0]=src[member][0];
					dstobj[1]=src[member][1];
					dstobj[2]=src[member][2];
					dstobj[4]=src[member][4];
					dstobj[5]=src[member][5];
					dstobj[6]=src[member][6];
					dstobj[8]=src[member][8];
					dstobj[9]=src[member][9];
					dstobj[10]=src[member][10];
					dstobj[12]=src[member][12];
					dstobj[13]=src[member][13];
					dstobj[14]=src[member][14];
					
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
			for(line in o3o2[type]){
				if(o3o2[type][line].typ=="NONE"){
					continue;
				}
				texture=new Texture()
				o3o.textures.push(texture)
				setdata(texture,o3o2[type][line]);
			}
		}else if(type === "materials"){
			for(line in o3o2[type]){
				material=new Material()
				o3o.materials.push(material)
				setdata(material,o3o2[type][line]);
				for(var line2 in o3o2[type][line].texture_slots){
					texture_slot=new Texture_slot()
					material.texture_slots.push(texture_slot);
					setdata(texture_slot,o3o2[type][line].texture_slots[line2]);
				}
			}
				
		}else if(type==="meshes"){
			for(line in o3o2[type]){
				mesh=new Mesh()
				o3o.meshes.push(mesh)
				setdata(mesh,o3o2[type][line]);

				for(var line3 in o3o2[type][line].vertices){
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
				for(var line3 in o3o2[type][line].faces){
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
				for(var line3 in o3o2[type][line].uv_layers){
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
				
				for(var line3 in o3o2[type][line].shapeKeys){
					shapeKey = new ShapeKey()
					mesh.shapeKeys.push(shapeKey)
					for(var line4 in o3o2[type][line].shapeKeys[line3]){
						if(line==="shapeKeyPoints"){
							for(var line5 in o3o2[type][line].shapeKeys[line3][line4]){
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
			for(line in o3o2[type]){
				var armature=new Armature()
				o3o.armatures.push(armature);
				setdata(armature,o3o2[type][line]);
				for(line3 in o3o2[type][line].bones){
					bone=new Bone()
					armature.bones.push(bone);
					setdata(bone,o3o2[type][line].bones[line3]);
				}
			}
		}else if(type==="actions"){
			for(line in o3o2[type]){
				var action=new Action()
				o3o.actions.push(action)
				setdata(action,o3o2[type][line]);
				for(line3 in o3o2[type][line].fcurves){
					var fcurve = new Fcurve()
					action.fcurves.push(fcurve)
					setdata(fcurve,o3o2[type][line].fcurves[line3]);
					for(line5 in o3o2[type][line].fcurves[line3].keys){
						fcurve.keys.push(o3o2[type][line].fcurves[line3].keys[line5].f);
						fcurve.params.push(o3o2[type][line].fcurves[line3].keys[line5].p);
					}
					fcurve.type=fcurveConvert[fcurve.type];
				}
			}
		}else if(type==="objects"){
			for(line in o3o2[type]){
				object =new SceneObject()
				o3o.objects.push(object)
				setdata(object,o3o2[type][line]);
				for(line3 in o3o2[type][line].poseBones){
					var posebone = new PoseBone()
					object.posebones.push(posebone)
					setdata(posebone,o3o2[type][line].poseBones[line3]);
				}
				object.modifiers=o3o2[type][line].modifiers;
				object.o3o=o3o;
				o3o.objectsN[object.name]=object;
			}
		}else if(type==="scenes"){
			for(line in o3o2[type]){
				var scene=new Scene()
				var object
				o3o.scenes.push(scene)
				scene.o3o=o3o;
				setdata(scene,o3o2[type][line]);

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
				for(k=0;k<object.posebones.length;k++){
					object.posebones[k].target=name2Obj(object.posebones[k].target,object.data.bones)
					object.posebones[k].parent=name2Obj(object.posebones[k].parent,object.posebones)
				}
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
				Mat44.getInv(bone.imatrix,bone.matrix)
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
					object.parent_bone=name2Obj(object.parent_bone,object.parent.posebones);
				}
			}
		}

		return o3o
	}
	
	var freezeMesh = function(dst,obj,physics){
		copyMesh(dst,obj.data);
		var defMat = new Mat44();

		var flg=false;
		Mat44.dot(defMat,ono3d.worldMatrix,obj.mixedmatrix);
		if(physics){
			for(i=0;i<physics.length;i++){
				if( physics[i].name===obj.name){
					var phyObj=physics[i];

					if(phyObj.type===OnoPhy.SPRING_MESH || phyObj.type===OnoPhy.CLOTH){
						for(var j=phyObj.points.length;j--;){
							Vec3.copy(dst.vertices[j].pos,phyObj.points[j].location);
						}
						flg =true;
					}
					var matrix = defMat;
					matrix[0]=phyObj.matrix[0];
					matrix[1]=phyObj.matrix[1];
					matrix[2]=phyObj.matrix[2];
					matrix[4]=phyObj.matrix[3];
					matrix[5]=phyObj.matrix[4];
					matrix[6]=phyObj.matrix[5];
					matrix[8]=phyObj.matrix[6];
					matrix[9]=phyObj.matrix[7];
					matrix[10]=phyObj.matrix[8];
					matrix[12]=phyObj.matrix[9];
					matrix[13]=phyObj.matrix[10];
					matrix[14]=phyObj.matrix[11];
					matrix[3]=matrix[7]=matrix[11]=0;
					matrix[15]=1;

					break;
				}
			}
		}
		var bufdata=obj.data;
		//obj.data=dst;
		flg|=calcModifiers(dst,obj,flg,physics);
		//obj.data=bufdata;

		if(!flg){
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
			var mat12=defMat[12];
			var mat13=defMat[13];
			var mat14=defMat[14];

			for(var i=0;i<dst.vertexSize;i++){
				var pos=bufMeshVertices[i].pos;
				var x=pos[0];
				var y=pos[1];
				var z=pos[2];
				pos[0]=mat0*x + mat4*y + mat8*z + mat12;
				pos[1]=mat1*x + mat5*y + mat9*z + mat13;
				pos[2]=mat2*x + mat6*y + mat10*z + mat14;
			}
		}

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

			dstFace.idx[0]= srcFace.idx[0];
			dstFace.idx[1]= srcFace.idx[1];
			dstFace.idx[2]= srcFace.idx[2];

			if(srcFace.idxnum===4){
				dstFace.idx[3]= srcFace.idx[3];
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
			,quat = bVec4
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
	}
	var calcMatrixArmature=function(armature,frame){
		var posebones=armature.posebones;
		var posebone;
		var matrix;
		for(var i=posebones.length;i--;){
			posebone=posebones[i];
			matrix=posebone.matrix;
			if(armature.action){
				addaction(posebone,posebone.target.name,armature.action,frame)
			}
			genMatrix(posebone);
			Mat44.dot(matrix,matrix,posebone.target.imatrix)
			Mat44.dot(matrix,posebone.target.matrix,matrix)
			posebone.flg=false;
		}
		for(var i=0;i<posebones.length;i++){
			mixBoneMatrix(posebones[i]);
		}
	}
	var genMatrix=function(obj){
		var mat=obj.matrix;
		if(obj.rotation_mode===QUATERNION){
			Vec4.qTOm(mat,obj.rotation);
				
		}else{
			Mat44.getRotMat(mat,obj.rotation[0],1,0,0)
			Mat44.getRotMat(bM,obj.rotation[1],0,1,0)
			Mat44.dot(mat,bM,mat);
			Mat44.getRotMat(bM,obj.rotation[2],0,0,1)
			Mat44.dot(mat,bM,mat);
		}
		var s=obj.scale[0];
		mat[0]*=s; mat[1]*=s; mat[2]*=s;
		s=obj.scale[1];
		mat[4]*=s; mat[5]*=s; mat[6]*=s;
		s=obj.scale[2];
		mat[8]*=s; mat[9]*=s; mat[10]*=s;

		mat[12]=obj.location[0];
		mat[13]=obj.location[1];
		mat[14]=obj.location[2];
	}
	var getMatrix=function(obj,frame){
		if(obj.flg){
			return obj.mixedmatrix;
		}
		if(obj.action){
			addaction(obj,"",obj.action,frame)
		}
		genMatrix(obj);

		if(obj.parent){
			if(!obj.parent.flg){
				getMatrix(obj.parent,frame);
			}
			Mat44.dot(obj.mixedmatrix,obj.iparentmatrix,obj.matrix);
			Mat44.dot(obj.mixedmatrix,obj.parent.mixedmatrix,obj.mixedmatrix);
		}else{
			Mat44.copy(obj.mixedmatrix,obj.matrix);
		}
		obj.flg=true;
		return obj.mixedmatrix;
	}
	var calcMatrix=function(obj,frame){
		if(obj.action){
			addaction(obj,"",obj.action,frame)
		}
		genMatrix(obj);

		if(obj.objecttype===OBJECT_ARMATURE){
			calcMatrixArmature(obj,frame);
		}
		obj.flg=false;
	}
	var mixMatrix=function(obj){
		if(obj.parent){
			var parent;
			Mat44.dot(obj.mixedmatrix,obj.iparentmatrix,obj.matrix);
			if(obj.parent_bone){
				parent=obj.parent_bone;
				//if(!parent.flg){
				//	mixMatrix(parent);
				//}
				obj.mixedmatrix[13]+=parent.target.length;
				Mat44.dot(obj.mixedmatrix,parent.target.matrix,obj.mixedmatrix);
				Mat44.dot(obj.mixedmatrix,parent.mixedmatrix,obj.mixedmatrix);
			}
			parent=obj.parent;

			if(!parent.flg){
				mixMatrix(parent);
			}
			Mat44.dot(obj.mixedmatrix,parent.mixedmatrix,obj.mixedmatrix);
		}else{
			Mat44.copy(obj.mixedmatrix,obj.matrix);
		}
		obj.flg=true;
	}
	var mixBoneMatrix=function(bone){
		if(bone.parent){
			if(!bone.parent.flg){
				mixBoneMatrix(bone.parent);
			}
			Mat44.dot(bone.mixedmatrix,bone.parent.mixedmatrix,bone.matrix);
		}else{
			Mat44.copy(bone.mixedmatrix,bone.matrix);
		}
		bone.flg=true;
	}
	var setFrame=ret.setFrame=function(o3o,scene,frame){
		var objects = scene.objects;
		if(o3o){
		for(var i=o3o.materials.length;i--;){
			var material=o3o.materials[i];
			for(var j=material.texture_slots.length;j--;){
				var texture_slot = material.texture_slots[j];
				if(texture_slot.action){
					addaction(texture_slot,"0",texture_slot.action,frame);
				}
			}
		}
		}

		for(i=objects.length;i--;){
			objects[i].flg=false;
			//if(objects[i].objecttype===OBJECT_ARMATURE){
			//	var posebones=objects[i].posebones;
			//	for(j=posebones.length;j--;){
			//		posebones[j].flg=false;
			//	}

			//}
		}
		for(i=objects.length;i--;){
			calcMatrix(objects[i],frame);
		}
		for(i=0;i<objects.length;i++){
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
				return renderMaterials[i];
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
		renderMaterial.opacity = material.a;
		renderMaterial.ior = material.ior;
		renderMaterial.reflect = material.reflect;
		renderMaterial.ior= material.ior;
		renderMaterial.rough= material.rough;
		renderMaterial.spc= material.spc;
		renderMaterial.env= material.env;
		renderMaterial.emt = material.emt;
		renderMaterial.reflectionColor = material.reflectionColor;
		
		renderMaterial.smoothing = smoothing;

		renderMaterial.normalmap=null;
		renderMaterial.texture = null
		for(var j=material.texture_slots.length;j--;){
			var texture_slot = material.texture_slots[j];
			if(texture_slot.texture){
				if(texture_slot.normal>0){
					renderMaterial.normalmap= texture_slot.texture.image;
					renderMaterial.normal=texture_slot.normal;
				}else{
					renderMaterial.texture = texture_slot.texture.image;
					renderMaterial.offsetx=texture_slot.offset[0];
					renderMaterial.offsety=texture_slot.offset[1];
				}
			}
		}
		return renderMaterial;
	}
	var materialTable=new Array(256);

	ret.drawScene = function(scene,physics,obj){
		var i;
		var o3o=scene.o3o;
		var objects = scene.objects;

		
		materialTable[0]=setMaterial(defaultMaterial,"defaultMaterial");
		var materials = o3o.materials;
		if(ret.useCustomMaterial){
			for(var i=0;i<materials.length;i++){
				materialTable[i+1]=setMaterial(customMaterial,"customMaterial");
			}
		}else{
			for(var i=0;i<materials.length;i++){
				materialTable[i+1]=setMaterial(materials[i],o3o.name+"_"+materials[i].name);
			}
		}
		if(obj){
			if(obj.type=="MESH"){
				drawObject(o3o,obj,physics);
			}
		}else{
			for(i=objects.length;i--;){
				var obj=objects[i];
				if(obj.objecttype!=OBJECT_MESH)continue;
				if(obj.hide_render)continue;
		//		if(scene.objects[i].name=='ahoge_L.002')
				drawObject(o3o,scene.objects[i],physics);
			}
		}
	}

	ret.drawObject = function(obj,physics){
		var o3o = obj.o3o;
		
		materialTable[0]=setMaterial(defaultMaterial,"defaultMaterial");
		var materials = o3o.materials;
		if(ret.useCustomMaterial){
			for(var i=0;i<materials.length;i++){
				materialTable[i+1]=setMaterial(customMaterial,"customMaterial");
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
	var deformBuf=[];
	for(var i=0;i<1024;i++){
		deformBuf.push(new Vec3());
	}
	var deformMesh = new Mesh();
	var modMeshDeform=function(dst,obj,mod,phyObjs){
		if(!mod.basePos){
			return 0;
		}
		freezeMesh(deformMesh,mod.object,phyObjs);
		var ret1=new Vec3();

		for(var i=0;i<mod.basePos.length;i++){
			Vec3.sub(deformBuf[i],deformMesh.vertices[i].pos,mod.basePos[i]);
		}
		var e=Vec3.poolAlloc();
		var f=Vec3.poolAlloc();
		for(var i=0;i<dst.vertexSize;i++){
			var binds=mod.binddata[i];
			Vec3.set(dst.vertices[i].pos,0,0,0);
			for(var j=0;j<binds.length;j++){
				var face = deformMesh.faces[binds[j].idx];

				Vec3.sub(e,deformMesh.vertices[face.idx[1]].pos,deformMesh.vertices[face.idx[0]].pos);
				Vec3.madd(e,deformMesh.vertices[face.idx[0]].pos,e,binds[j].pweight[0]);
				if(face.idxnum==4){
					Vec3.sub(f,deformMesh.vertices[face.idx[2]].pos,deformMesh.vertices[face.idx[3]].pos);
					Vec3.madd(f,deformMesh.vertices[face.idx[3]].pos,f,binds[j].pweight[0]);
				}else{
					Vec3.sub(f,deformMesh.vertices[face.idx[2]].pos,deformMesh.vertices[face.idx[1]].pos);
					Vec3.add(f,f,e);
				}
				Vec3.sub(f,f,e);
				Vec3.madd(dst.vertices[i].pos,e,f,binds[j].pweight[1]);
				
				Vec3.cross2(ret1,deformMesh.vertices[face.idx[0]].pos
					,deformMesh.vertices[face.idx[1]].pos
					,deformMesh.vertices[face.idx[2]].pos);
				Vec3.norm(ret1);
				Vec3.madd(dst.vertices[i].pos,dst.vertices[i].pos
					,ret1,binds[j].len);
			}
		}

		Vec3.poolFree(2);
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
			dstvertices[0] = srcvertices[1]
			dstvertices[1] = srcvertices[0]
			dstvertices[2] = srcvertices[2]
			if(abs(bufMeshVertices[dstvertices[0]].pos[mrr])>0.01){
				dstvertices[0]+=vertexSize;
			}
			if(abs(bufMeshVertices[dstvertices[1]].pos[mrr])>0.01){
				dstvertices[1]+=vertexSize;
			}
			if(abs(bufMeshVertices[dstvertices[2]].pos[mrr])>0.01){
				dstvertices[2]+=vertexSize;
			}
			var dst=dstFace.uv,src=srcFace.uv
			dst[0] = src[2]
			dst[1] = src[3]
			dst[2] = src[0]
			dst[3] = src[1]
			dst[4] = src[4]
			dst[5] = src[5]

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
	var modArmature=function(obj,mod){
		var bufMeshVertices =bufMesh.vertices
		var renderVertex;
		var groupMatrix;
		var groupName;
		var x,y,z;

		var ratio,pos,vertex;
		var groups=obj.groups;

		Mat44.getInv(bM2,mod.object.mixedmatrix);
		Mat44.dot(bM,bM2,obj.mixedmatrix);
		Mat44.getInv(bM2,bM);

		var posebones=mod.object.posebones;
		for(var j=groups.length;j--;){
			groupMatFlg[j] = false;
			groupName=groups[j];
			groupMatrix = groupMatricies[j];
			for(var k=0,kmax=posebones.length;k<kmax;k++){
				if(posebones[k].name!=groupName)continue
				groupMatFlg[j] = true;
				Mat44.dot(groupMatrix,posebones[k].mixedmatrix,bM);
				Mat44.dot(groupMatrix,bM2,groupMatrix);
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
				Mat44.dotMat44Vec3(bV0,groupMatricies[vertexGroups[j]],pos)
				
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
					Mat44.dotMat44Vec3(pos,groupMatricies[mod.vertex_group],pos)
				}
			}
		}
		Vec3.poolFree(1);
	}

	var drawObject = function(o3o,obj,physics){

		freezeMesh(bufMesh,obj,physics);

		var bufMeshVertices=bufMesh.vertices;
		var renderVertices =ono3d.renderVertices;
		var rvIndex=ono3d.renderVertices_index;
		for(var i=0;i<bufMesh.vertexSize;i++){
			Vec3.copy(renderVertices[rvIndex+i].pos,bufMeshVertices[i].pos);
		}

		var renderFaces=ono3d.renderFaces;
		var rfIndex=ono3d.renderFaces_index;
		var rfCount=0;
		var renderMaterials=ono3d.renderMaterials;
		var face,renderFace;
		var rf= ono3d.rf | bufMesh.flg;
		var smoothing=ono3d.smoothing;
		var triangles=Ono3d.OP_TRIANGLES;
		var offsetx=0,offsety=0;

		var uv=[0,0,0,0,0,0];

		var uv_layerdata=null;
		if(bufMesh.uv_layers.length){
			uv_layerdata=bufMesh.uv_layers[0].data;
		}
		for(var i=0;i<bufMesh.faceSize;i++){
			face=bufMesh.faces[i];
			renderFace = renderFaces[rfIndex+rfCount];
			rfCount++;
			renderFace.reverseFlg=0;

			renderFace.rf = rf
			renderFace.rf &= ~(Ono3d.RF_OUTLINE * face.fs);
			
			renderFace.operator = triangles;
			renderFace.smoothing = smoothing;

			renderFace.vertices[0]= face.idx[0]+rvIndex;
			renderFace.vertices[1]= face.idx[1]+rvIndex;
			renderFace.vertices[2]= face.idx[2]+rvIndex;

			renderFace.material= materialTable[face.mat+1];
			if(face.mat>=0 && uv_layerdata){
				offsetx=renderFace.material.offsetx
				offsety=renderFace.material.offsety
				uv = uv_layerdata[i];

				renderFace.uv[0][0] = uv[0]+offsetx
				renderFace.uv[0][1] = uv[1]+offsety
				renderFace.uv[1][0] = uv[2]+offsetx
				renderFace.uv[1][1] = uv[3]+offsety
				renderFace.uv[2][0] = uv[4]+offsetx
				renderFace.uv[2][1] = uv[5]+offsety
			}

			renderFace.vertices[0]=renderVertices[renderFace.vertices[0]];
			renderFace.vertices[1]=renderVertices[renderFace.vertices[1]];
			renderFace.vertices[2]=renderVertices[renderFace.vertices[2]];

			renderFace.z = (renderFace.vertices[0].pos[2]
				+renderFace.vertices[1].pos[2]
				+renderFace.vertices[2].pos[2])*0.33333333;
			
		}
		for(var i=0;i<bufMesh.faceSize;i++){
			face=bufMesh.faces[i];
			if(face.idxnum==4){
				renderFace = renderFaces[rfIndex+rfCount];
				rfCount++;
				renderFace.reverseFlg=0;

				renderFace.rf = rf
				renderFace.rf &= ~(Ono3d.RF_OUTLINE * face.fs);
				
				renderFace.operator = triangles;
				renderFace.smoothing = smoothing;

				renderFace.vertices[0]= face.idx[2]+rvIndex;
				renderFace.vertices[1]= face.idx[3]+rvIndex;
				renderFace.vertices[2]= face.idx[0]+rvIndex;

				renderFace.material= materialTable[face.mat+1];
				if(face.mat>=0 && uv_layerdata){
					offsetx=renderFace.material.offsetx
					offsety=renderFace.material.offsety
					uv = uv_layerdata[i];
					renderFace.uv[0][0] = uv[4]+offsetx
					renderFace.uv[0][1] = uv[5]+offsety
					renderFace.uv[1][0] = uv[6]+offsetx
					renderFace.uv[1][1] = uv[7]+offsety
					renderFace.uv[2][0] = uv[0]+offsetx
					renderFace.uv[2][1] = uv[1]+offsety
				}

				renderFace.vertices[0]=renderVertices[renderFace.vertices[0]];
				renderFace.vertices[1]=renderVertices[renderFace.vertices[1]];
				renderFace.vertices[2]=renderVertices[renderFace.vertices[2]];

				renderFace.z = (renderFace.vertices[0].pos[2]
					+renderFace.vertices[1].pos[2]
					+renderFace.vertices[2].pos[2])*0.33333333;
			}
		}

		if( ono3d.smoothing>0){
			for(var i = 0;i<bufMesh.vertexSize;i++){
				//スムーシングする場合頂点法線をリセット
				Vec3.set(renderVertices[rvIndex+i].normal,0,0,0);
			}
		}
		
		for(var i=ono3d.lightSources.length;i--;){
			var lightSource = ono3d.lightSources[i];
			if(lightSource.type ===Ono3d.LT_DIRECTION){
				Vec3.copy(lightSource.viewAngle,lightSource.angle);
			}
		}

		//面の法線を算出
		var bufFace;
		var bV0 = Vec3.poolAlloc();
		var bV1 = Vec3.poolAlloc();
		for(var i=0;i<rfCount;i++){
			bufFace = renderFaces[rfIndex+i];
			Vec3.sub(bV0, bufFace.vertices[0].pos,bufFace.vertices[1].pos)
			Vec3.sub(bV1, bufFace.vertices[0].pos,bufFace.vertices[2].pos)
			
			Vec3.cross(bufFace.normal,bV0,bV1);
			Vec3.norm(bufFace.normal);

			Vec3.set(bufFace.angle,0,0,0)
			for(var j=3;j--;){
				Vec3.add(bufFace.vertices[j].normal
					,bufFace.vertices[j].normal
						,bufFace.normal)
				Vec3.add(bufFace.angle,bufFace.angle,bufFace.vertices[j].pos);
			}

			Vec3.norm(bufFace.angle);
		}
		Vec3.poolFree(2);
		if( ono3d.smoothing>0){
			for(var i = bufMesh.vertexSize;i--;){
				Vec3.norm(renderVertices[rvIndex+i].normal);
			}
		}
		

		if( ono3d.rf  & Ono3d.RF_OUTLINE){
			var bufFace,normal;
			Mat44.getInv(bM44,ono3d.viewMatrix);
			var cp0=bM44[12];
			var cp1=bM44[13];
			var cp2=bM44[14];
			for(i=0;i<rfCount;i++){
				bufFace = renderFaces[i+rfIndex]
				if(bufFace.rf & Ono3d.RF_OUTLINE){
					normal=bufFace.normal
					if((bufFace.vertices[0].pos[0]-cp0)*normal[0]
					 + (bufFace.vertices[0].pos[1]-cp1)*normal[1]
					 + (bufFace.vertices[0].pos[2]-cp2)*normal[2]<0){
						bufFace.cul=1;
					}else{
						bufFace.cul=-1;
					}	
				}else{
					bufFace.cul=0;
				}

			}

			var renderMaterial = ono3d.renderMaterials[ono3d.renderMaterials_index];
			ono3d.renderMaterials_index++;

			renderMaterial.r = ono3d.lineColor[0];
			renderMaterial.g = ono3d.lineColor[1];
			renderMaterial.b = ono3d.lineColor[2];
			renderMaterial.a = ono3d.lineColor[3];
			renderMaterial.opacity = ono3d.lineColor[3];

			var edges=bufMesh.edges;
			for(i=0;i<bufMesh.edgeSize;i++){
				var edge=edges[i];
				var flg=false;
				if(edge.f0<0)continue;
				if(edge.f1<0){
					if(renderFaces[edge.f0+ono3d.renderFaces_index].cul>0){
						flg=true;
					}
				}else{
					if(renderFaces[edge.f0+ono3d.renderFaces_index].cul
						* renderFaces[edge.f1+ono3d.renderFaces_index].cul <0){
						flg=true;
					}
				}
				if(!flg)continue;
				var renderFace=renderFaces[ono3d.renderFaces_index+rfCount];
				renderFace.vertices[0] = renderVertices[ono3d.renderVertices_index+edge.v0]
				renderFace.vertices[1] = renderVertices[ono3d.renderVertices_index+edge.v1]
				renderFace.bold = 1;
				renderFace.material = renderMaterial;
				renderFace.operator = Ono3d.OP_LINE
				//renderFace.z=
				//renderFace.z+=
				renderFace.rf=ono3d.rf
				rfCount++;
			}
			
		}
		ono3d.renderVertices_index+=bufMesh.vertexSize;
		ono3d.renderFaces_index+=rfCount;
		
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
			phyobj = onoPhy.createRigidBody(rigid.collision_shape,obj.data);

			if(rigid.type =="ACTIVE"){
				phyobj.fix=false;
			}
			phyobj.friction=rigid.friction;
			phyobj.restitution=rigid.restitution;
			phyobj.mass = rigid.mass;

			if(phyobj.collision){
				var collision = phyobj.collision;
				var b = obj.bound_box;
				collision.groups = rigid.collision_groups;
				phyobj.collisionSize[0]=(b[3] - b[0])*0.5;
				phyobj.collisionSize[1]=(b[4] - b[1])*0.5;
				phyobj.collisionSize[2]=(b[5] - b[2])*0.5;
			}
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
					phyobj.bend= mod.bend;//構造
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
					var face=renderFaces[j]
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
				obj.phyObj = phyobj;
				movePhyObj(obj,true);
				for(var j =0;j<phyobj.edges.length;j++){
					phyobj.edges[j].len=Vec3.len(phyobj.edges[j].point1.location
						,phyobj.edges[j].point2.location);
				}
				if(mod.type==="SOFT_BODY"){
					phyobj.init();
				}
			}
		}
		if(phyobj){
			phyobj.name=obj.name;
			phyobj.parent=obj;
			obj.phyObj = phyobj;
			phyobj.refresh();
			movePhyObj(obj,true);
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
		Mat43.dot(m,joint.parent.inv_matrix,joint.child.matrix);
		
		
	}

	var movePhyObj = ret.movePhyObj = function(object,flg){
		
		var phyObj = object.phyObj;
		if(!phyObj){
			return;
		}

		if(phyObj.type===OnoPhy.CLOTH){
			var truepos=phyObj.truepos;
			var bufMeshVertices=bufMesh.vertices;
			freezeMesh(bufMesh,object,null);
			if(flg){
				for(var i=0,imax=phyObj.points.length;i<imax;i++){
					Vec3.copy(phyObj.points[i].location,bufMeshVertices[i].pos);
					Vec3.set(phyObj.points[i].v,0,0,0);
				}
			}else{
				for(var i=0,imax=phyObj.points.length;i<imax;i++){
					if(phyObj.points[i].fix){
						Vec3.copy(phyObj.points[i].location,bufMeshVertices[i].pos);
						Vec3.set(phyObj.points[i].v,0,0,0);
					}
				}
			}
		}else{
			if(phyObj.fix || flg){
				Vec3.set(phyObj.v,0,0,0);
				Vec3.set(phyObj.rotV,0,0,0);
			
				Mat44.dot(bM,ono3d.worldMatrix,object.mixedmatrix);
				var mat=bM;phyObj.matrix;

				Vec3.set(phyObj.location,mat[12],mat[13],mat[14]);
				Vec3.set(phyObj.scale
						,Math.sqrt(mat[0]*mat[0]+mat[1]*mat[1]+mat[2]*mat[2])
						,Math.sqrt(mat[4]*mat[4]+mat[5]*mat[5]+mat[6]*mat[6])
						,Math.sqrt(mat[8]*mat[8]+mat[9]*mat[9]+mat[10]*mat[10]))
				var invx=1/phyObj.scale[0];
				var invy=1/phyObj.scale[1];
				var invz=1/phyObj.scale[2];

				var m= new Mat33();
				m[0]=mat[0]*invx;
				m[1]=mat[1]*invx;
				m[2]=mat[2]*invx;
				m[3]=mat[4]*invy;
				m[4]=mat[5]*invy;
				m[5]=mat[6]*invy;
				m[6]=mat[8]*invz;
				m[7]=mat[9]*invz;
				m[8]=mat[10]*invz;
				Mat33.getRotQuat(phyObj.rotq,m);
				phyObj.calcPre();
			}
		}
	}
	ret.loadTexture=function(path){
		var texture = new Texture();
		texture.path=path;
		texture.image = Util.loadImage(texture.path,1);
		return texture;
	}
	return ret
})()
