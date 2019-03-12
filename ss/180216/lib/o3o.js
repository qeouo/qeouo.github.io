"use strict"
var O3o=(function(){
	var i
		,bV0 = new Vec3()
		,bV1 = new Vec3()
		,bV2 = new Vec3()
		,bV3 = new Vec3()
		,bVec4=new Vec4()
		,bM=new Mat43()
		,bM2=new Mat43()
		,bM44 =new Mat44()
		
		,groupMatricies = new Array(64)
		,groupMatFlg= new Array(64)
		,defMatrix = new Mat43()
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
	;

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

	//モデルオブジェクト
	var O3o = function(){
		this.scenes =[] ;
		this.objects = [];
		this.objectsN=[];
		this.textures = [];
		this.materials = [];
		this.meshes = [];
		this.armatures = [];
		this.actions = [];
	}
	var ret =O3o;
	ret.useCustomMaterial=false;
	
	var ono3d = null;
	ret.setOno3d = function(a){
		ono3d=a
	}

	var SceneObject = function(){
		this.name="";
		this.matrix=new Mat43();
		this.imatrix=new Mat43();
		this.iparentmatrix=new Mat43();
		this.actmatrix=new Mat43()
		this.action="";
		this.data="";
		this.parent="";
		this.parent_bone=null;
		this.type="";
		this.groups=[];
		this.modifiers=[];
		this.location=new Array(3);
		this.rotation_mode=EULER_XYZ;
		this.rotation=new Array(4);
		this.scale=new Array(3);
		this.posebones = [];
		this.flg=false;
		this.hide_render=0;
		this.mixedmatrix=new Mat43();
		this.rigid_body = new RigidBody();
		this.rigid_body_constraint = new RigidBodyConstraint();
		this.bound_box = [];
	}
	var RigidBody = function(){
		this.type="";
		this.mass=1.0;
		this.collision_shape="";
		this.friction=0.5;
		this.restitution=0.0;
		this.collision_groups=0;
	}
	var RigidBodyConstraint = function(){
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
		this.name="";
		this.target="";
		this.parent="";
		this.location=new Array(3);
		this.rotation_mode=QUATERNION;
		this.rotation=new Array(4);
		this.scale=new Array(3);
		this.actmatrix=new Mat43();
		this.mixedmatrix=new Mat43();
		this.flg=false;
	}
	var Scene = function(){
		this.name="";
		this.frame_start=0;
		this.frame_end=0;
		this.objects= [];
	}
	//テクスチャ
	var Texture = ret.Texture = function(){
		this.path="";
		this.name="";
		this.typ="";
		this.image=null;
	}
	//マテリアル
	var Material = function(){
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
		this.texture="";
		this.uv_layer="";
		this.normal=0;
		this.action="";
		this.offset=new Vec2();
	}

	ret.Material=Material
	var defaultMaterial= ret.defaultMaterial= new Material()
	var customMaterial= ret.customMaterial= new Material()

	//骨組み
	var Armature = function(){
		this.name="";
		this.bones=[];
	}
	Armature.prototype.objecttype=OBJECT_ARMATURE
	//骨
	function Bone(){
		this.name="";
		this.parent="";
		this.length=0;
		this.matrix = new Mat43();
		this.imatrix = new Mat43();
	}
	ret.Bone = Bone

	var ShapeKey = function(){
		this.shapeKeyPoints = [];
	}
	//モデル
	var Mesh = function(){
		this.parent="";
		this.render=1;
		this.name="";
		this.vertices = [];
		this.shapeKeys = [];
		this.faces = [];
		this.edges = [];
		this.groups=[];
		this.flg=0
		this.type=""
		this.uv_layers=[];
	}
	//Uv_layer
	var Uv_layer= function(){
		this.name=""
		this.data=[];
	}
	Mesh.prototype.objecttype=OBJECT_MESH
	ret.Mesh = Mesh

	//頂点グループ
	var Group = function(){
		this.name=""
	}
	//頂点
	var Vertex = function(){
		this.pos = new Vec3()
		this.normal = new Vec3()
		this.groups = [];
		this.groupratios = [];
	}
	ret.Vertex=Vertex

	var ShapeKey = function(){
		this.name=""
		this.shapeKeyPoints = [];
	}
	//面
	var Face =function(){
		this.uv = new Array(8)
		this.normal = new Vec3()
		this.idx = [ -1 , -1 , -1 , -1];
		this.material = null 
		this.flg=0;
		this.idxnum=3;
		this.fs=0;
		this.mat=-1;
	}
	ret.Face=Face
	//線
	var Edge = function(){
		this.v0 = -1
		this.v1 = -1
		this.f0 = -1
		this.f1 = -1
		this.l=0
	}
	ret.Edge=Edge

	//アクション
	function Action(){
		this.name="";
		this.endframe=0;
		this.id_root="";
		this.fcurves =[]; 
	}
	//fcurve
	function Fcurve(){
		this.target =""
		this.type ="";
		this.idx=0;
		this.interpolatemode=INTERPOLATE_LINER;
		this.repeatmode = REPEAT_NONE;
		this.keys = [];
		this.params = [];
	}
	//モデファイア
	function Modefier(){
		this.name="";
		this.type="";
	}

	var calcMesh=new Mesh();
	var calcFaces=[];
	var calcEdges=[];
	for(i=0;i<1000;i++){
		var vertex=new Vertex();
		calcMesh.vertices.push(vertex);
		for(var j=0;j<8;j++){
			vertex.groups.push(-1);
			vertex.groupratios.push(-1);
		}

		var face=new Face();
		calcFaces.push(face);
		calcEdges.push(new Edge());
	}
	calcMesh.faces=new Array(1000);
	calcMesh.edges=new Array(1000);


	var createXMLHttpRequest = function(){
	  if (window.XMLHttpRequest) {
		return new XMLHttpRequest()
	  } else if (window.ActiveXObject) {
		try {
		  return new ActiveXObject("Msxml2.XMLHTTP")
		} catch (e) {
		  try {
			return new ActiveXObject("Microsoft.XMLHTTP")
		  } catch (e2) {
			return null
		  }
		}
	  } else {
		return null
	  }
	}
	
	var onloadfunc= function(o3o,url,buf){
		var i,imax,j,jmax
		if(buf.substring(0,11) ==="Metasequoia"){
			var mqo = Mqo.loadMqo(url,buf)
			var texture

			//texture
			//material
			imax=mqo.materials.length
			o3o.materials = new Array(imax)
			for(i=0;i<imax;i++){
				var material = new Material()
				o3o.materials[i] = material
				material.r=mqo.materials[i].col[0]
				material.g=mqo.materials[i].col[1]
				material.b=mqo.materials[i].col[2]
				material.a=mqo.materials[i].col[3]
				material.dif=mqo.materials[i].dif
				material.spc=mqo.materials[i].spc
				material.spchard=mqo.materials[i].power
				material.emt=mqo.materials[i].emt
				if(mqo.materials[i].tex.length){
					texture= new Texture()
					texture.path=mqo.materials[i].tex
					o3o.textures.push(texture)
					material.texture=texture
				}
				material.normal=mqo.materials[i].normal
			}

			var scene = new Scene()
			o3o.scenes.push(scene)

			//mesh
			imax=mqo.objects.length
			o3o.meshes= new Array(imax)
			for(i=0;i<imax;i++){
				var mesh = new Mesh()
				var vertex,face
				o3o.meshes[i] = mesh
				var object = new SceneObject()
				object.data=mesh
				object.type="MESH"
				scene.objects.push(object)
				jmax=mqo.objects[i].vertices.length
				mesh.vertices = new Array(jmax)
				for(j=0;j<jmax;j++){
					vertex = new Vertex()
					mesh.vertices[j]=vertex
					
					vertex.pos[0] = mqo.objects[i].vertices[j][0]
					vertex.pos[1] = mqo.objects[i].vertices[j][1]
					vertex.pos[2] = mqo.objects[i].vertices[j][2]
				}
				jmax=mqo.objects[i].faces.length
				mesh.faces= [];
				for(j=0;j<jmax;j++){
					face= new Face()
					mesh.faces.push(face)
					if(mqo.objects[i].faces[j].vertexnum===4){
						face.uv[0]=mqo.objects[i].faces[j].UV[6]
						face.uv[1]=mqo.objects[i].faces[j].UV[7]
						face.uv[2]=mqo.objects[i].faces[j].UV[4]
						face.uv[3]=mqo.objects[i].faces[j].UV[5]
						face.uv[4]=mqo.objects[i].faces[j].UV[2]
						face.uv[5]=mqo.objects[i].faces[j].UV[3]
						face.uv[6]=mqo.objects[i].faces[j].UV[0]
						face.uv[7]=mqo.objects[i].faces[j].UV[1]
						face.idx[0]=mqo.objects[i].faces[j].V[3]
						face.idx[1]=mqo.objects[i].faces[j].V[2]
						face.idx[2]=mqo.objects[i].faces[j].V[1]
						face.idx[3]=mqo.objects[i].faces[j].V[0]
					}else{
						face.uv[0]=mqo.objects[i].faces[j].UV[4]
						face.uv[1]=mqo.objects[i].faces[j].UV[5]
						face.uv[2]=mqo.objects[i].faces[j].UV[2]
						face.uv[3]=mqo.objects[i].faces[j].UV[3]
						face.uv[4]=mqo.objects[i].faces[j].UV[0]
						face.uv[5]=mqo.objects[i].faces[j].UV[1]
						face.idx[0]=mqo.objects[i].faces[j].V[2]
						face.idx[1]=mqo.objects[i].faces[j].V[1]
						face.idx[2]=mqo.objects[i].faces[j].V[0]
					}
					face.material = o3o.materials[mqo.objects[i].faces[j].M]
					face.idxnum = mqo.objects[i].faces[j].vertexnum
					face.fs= mqo.objects[i].faces[j].fs;

				}
			}	

		//}else if(buf.substring(0,4)==="PMX "){
		//	return Mmd.loadPmx(url)
		//}else if(buf.substring(0,3)==="Pmd"){
		//	return Mmd.loadPmd(url)
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

		for(i=0,imax=o3o.materials.length;i<imax;i++){
			material = o3o.materials[i]
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
		var faces,edges
		for(i=0,imax=o3o.meshes.length;i<imax;i++){
			faces=o3o.meshes[i].faces
			if(o3o.meshes[i].edges){
				edges=o3o.meshes[i].edges;
			}else{
				edges=[];
				o3o.meshes[i].edges=edges;
			}
			for(j=0,jmax=faces.length;j<jmax;j++){
				face=faces[j]
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
				}else if(dstobj instanceof Mat43){
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
					if(vertex.groupratios.length==0){
						for(var i=0;i<vertex.groups.length;i++){
							vertex.groupratios.push(1.0/vertex.groups.length);
						}
					}


				}
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
				//uv_layers
				for(var line3 in o3o2[type][line].uv_layers){
					var uv_layer=new Uv_layer()
					mesh.uv_layers.push(uv_layer)
					setdata(uv_layer,o3o2[type][line].uv_layers[line3]);
					uv_layer.data=o3o2[type][line].uv_layers[line3].data;
				}
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
			Mat43.getInv(object.imatrix,object.matrix)

			if(object.rigid_body_constraint){
				object.rigid_body_constraint.object1=name2Obj(object.rigid_body_constraint.object1,o3o.objects)
				object.rigid_body_constraint.object2=name2Obj(object.rigid_body_constraint.object2,o3o.objects)

			}
		}
		for(i=o3o.materials.length;i--;){
			for(j=o3o.materials[i].texture_slots.length;j--;){
				var texture_slot = o3o.materials[i].texture_slots[j];
				texture_slot.texture=name2Obj(texture_slot.texture,o3o.textures)
				//var res=null;
				//for(k=o3o.meshes.length;k--;){
				//	res=name2Obj(o3o.materials[i].texture_slots[j].uv_layer,o3o.meshes[k].uv_layers)
				//	if(res != null){
				//		break;
				//	}
				//}
				//o3o.materials[i].texture_slots[j].uv_layer= res;
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
					object.parent_bone=name2Obj(object.parent_bone,object.parent.posebones);
				}
			}
		}

		return o3o
	}
	var calcVertex = function(obj){
		var i,j
			,src,dst
			,srcarr,dstarr
			,dstvertices=calcMesh.vertices
			,srcvertices=obj.data.vertices
			,mesh=obj.data;
		;
		var vertexSize=obj.data.vertices.length;
		for(i = vertexSize;i--;){
			src = srcvertices[i];
			dst = dstvertices[i];
			srcarr = src.pos;
			dstarr= dst.pos;
			dstarr[0]=srcarr[0];
			dstarr[1]=srcarr[1];
			dstarr[2]=srcarr[2];
			dstarr= dst.groups;
			srcarr= src.groups;
			dstarr[0]=-1;
			dstarr[1]=-1;
			dstarr[2]=-1;
			dstarr[3]=-1;
			dstarr[4]=-1;
			dstarr[5]=-1;
			dstarr[6]=-1;
			dstarr[7]=-1;
			for(var k=0;k<srcarr.length;k++){
				dstarr[k]=srcarr[k];
				//dst.groupratios[k]=src.groupratios[k];
			}
			dst.groupratios=src.groupratios;
		}
		calcMesh.vertexSize=vertexSize;

	}
	var setFaces =function(){
		var rfIndex=ono3d.renderFaces_index;
		var mesh=calcMesh;
		var renderFaces=ono3d.renderFaces
		var face,renderFace;
		var material;
		var rf= ono3d.rf | mesh.flg
			var vertex
		var rvIndex=ono3d.renderVertices_index;
		var faceSize=calcMesh.faceSize;
		var smoothing=ono3d.smoothing;
		var triangles=Ono3d.OP_TRIANGLES;
		var off = ono3d.renderMaterials_index+1;
		var renderMaterials=ono3d.renderMaterials;
		var offsetx=0,offsety=0;
		for(i=faceSize;i--;){
			
			face=mesh.faces[i]
			renderFace = renderFaces[rfIndex+i]
			renderFace.reverseFlg=0

			renderFace.rf = rf
			renderFace.rf &= ~(Ono3d.RF_OUTLINE * face.fs);
			
			renderFace.operator = triangles;
			renderFace.smoothing = smoothing;

			renderFace.vertices[0]= face.idx[0]+rvIndex;
			renderFace.vertices[1]= face.idx[1]+rvIndex;
			renderFace.vertices[2]= face.idx[2]+rvIndex;

			renderFace.material= materialTable[face.mat+1];
			if(face.mat>=0){
				offsetx=renderFace.material.offsetx
				offsety=renderFace.material.offsety
				renderFace.uv[0][0] = face.uv[0]+offsetx
				renderFace.uv[0][1] = face.uv[1]+offsety
				renderFace.uv[1][0] = face.uv[2]+offsetx
				renderFace.uv[1][1] = face.uv[3]+offsety
				renderFace.uv[2][0] = face.uv[4]+offsetx
				renderFace.uv[2][1] = face.uv[5]+offsety
			}
		}
	}
	var _calcFaces =function(obj){
		var mesh=obj.data;
		var faces=mesh.faces;
		var facesize=mesh.faces.length;
		var face,renderFace;
		var transMat = ono3d.transMat;
		var i;
		var uv=[0,0,0,0,0,0];

		var uv_layerdata=null;
		if(mesh.uv_layers.length){
			uv_layerdata=mesh.uv_layers[0].data;
		}

		var faceSize=mesh.faces.length;

		if(transMat[0]*transMat[5]*transMat[10]
		+ transMat[1]*transMat[6]*transMat[8]
		+ transMat[2]*transMat[4]*transMat[9]
		- transMat[0]*transMat[6]*transMat[9]
		- transMat[2]*transMat[5]*transMat[8]
		- transMat[1]*transMat[4]*transMat[10]
			<0){
			for(i=faces.length;i--;){
				var calcFace=calcFaces[i];
				var face=faces[i];
				if(uv_layerdata){
					uv=uv_layerdata[i];
				}
				calcMesh.faces[i]=calcFace;
				calcFace.material = face.material;
				calcFace.mat= face.mat;


				calcFace.idx[0]= face.idx[0]
				calcFace.idx[1]= face.idx[2]
				calcFace.idx[2]= face.idx[1]
				calcFace.idxnum=3;


				calcFace.uv[0] = uv[0]
				calcFace.uv[1] = uv[1]
				calcFace.uv[2] = uv[4]
				calcFace.uv[3] = uv[5]
				calcFace.uv[4] = uv[2]
				calcFace.uv[5] = uv[3]
				calcFace.fs = face.fs;
			}
			for(i=0;i<mesh.faces.length;i++){
				face=mesh.faces[i];

				if(face.idxnum ===4){
					if(uv_layerdata){
						uv=uv_layerdata[i];
					}
					calcFace.idxnum=3;
					calcFace=calcFaces[faceSize];
					calcMesh.faces[faceSize]=calcFace;
					calcFace.material = face.material;
					calcFace.mat= face.mat;
					calcFace.idxnum=3;

					calcFace.idx[0]= face.idx[0]
					calcFace.idx[1]= face.idx[3]
					calcFace.idx[2]= face.idx[2]

					calcFace.uv[0] = uv[0]
					calcFace.uv[1] = uv[1]
					calcFace.uv[2] = uv[6]
					calcFace.uv[3] = uv[7]
					calcFace.uv[4] = uv[4]
					calcFace.uv[5] = uv[5]

					calcFace.fs = face.fs;
					faceSize++;
				}
			}
		}else{
			for(i=0;i<mesh.faces.length;i++){
				//calcMesh.faces[i] = mesh.faces[i]
				var calcFace=calcFaces[i];
				var face=faces[i];
				if(uv_layerdata){
					uv=uv_layerdata[i];
				}
				calcMesh.faces[i]=calcFace;
				calcFace.material = face.material;
					calcFace.mat= face.mat;

				calcFace.idx[0]= face.idx[0]
				calcFace.idx[1]= face.idx[1]
				calcFace.idx[2]= face.idx[2]
				calcFace.idxnum=3;


				calcFace.uv[0] = uv[0]
				calcFace.uv[1] = uv[1]
				calcFace.uv[2] = uv[2]
				calcFace.uv[3] = uv[3]
				calcFace.uv[4] = uv[4]
				calcFace.uv[5] = uv[5]
				calcFace.fs = face.fs;
			}
			for(i=0;i<mesh.faces.length;i++){
				face=mesh.faces[i];

				if(face.idxnum ===4  ){
					if(uv_layerdata){
						uv=uv_layerdata[i];
					}
					calcFace=calcFaces[faceSize];
					calcFace.idxnum=3;
					calcMesh.faces[faceSize]=calcFace;
					calcFace.material = face.material;
					calcFace.mat= face.mat;
					calcFace.idxnum=3;

					calcFace.idx[0]= face.idx[0]
					calcFace.idx[1]= face.idx[1]
					calcFace.idx[2]= face.idx[2]

					calcFace.uv[0] = uv[0]
					calcFace.uv[1] = uv[1]
					calcFace.uv[2] = uv[2]
					calcFace.uv[3] = uv[3]
					calcFace.uv[4] = uv[4]
					calcFace.uv[5] = uv[5]

					calcFace=calcFaces[faceSize];
					calcMesh.faces[faceSize]=calcFace;
					calcFace.material = face.material;
					calcFace.idxnum=3;

					calcFace.idx[0]= face.idx[0]
					calcFace.idx[1]= face.idx[2]
					calcFace.idx[2]= face.idx[3]

					calcFace.uv[0] = uv[0]
					calcFace.uv[1] = uv[1]
					calcFace.uv[2] = uv[4]
					calcFace.uv[3] = uv[5]
					calcFace.uv[4] = uv[6]
					calcFace.uv[5] = uv[7]

					calcFace.fs = face.fs;
					faceSize++;
				}
			}
		}
		for(i=0;i<mesh.edges.length;i++){
			calcMesh.edges[i] = mesh.edges[i]
		}
		calcMesh.edgeSize = mesh.edges.length;

		calcMesh.faceSize=faceSize;
	}
	
	var calcNormal = function(){
		var i,j
		,lightSource
		,light
		,bufVertex
		,face
		,bufFace
		,lightPow
		,normal
		,renderVertices =ono3d.renderVertices
		,renderFaces =ono3d.renderFaces
		,rvIndex=ono3d.renderVertices_index
		,rfIndex=ono3d.renderFaces_index
		;

		for(i=calcMesh.faceSize;i--;){
			bufFace = renderFaces[i+rfIndex]
			bufFace.vertices[0]=renderVertices[bufFace.vertices[0]];
			bufFace.vertices[1]=renderVertices[bufFace.vertices[1]];
			bufFace.vertices[2]=renderVertices[bufFace.vertices[2]];

			bufFace.z = (bufFace.vertices[0].pos[2]+bufFace.vertices[1].pos[2]+bufFace.vertices[2].pos[2])*0.33333333;
		}
		if( ono3d.smoothing>0){
			for(i = calcMesh.vertexSize;i--;){
				normal= renderVertices[i+rvIndex].normal
				normal[0]=0
				normal[1]=0
				normal[2]=0
			}
		}

		for(j=ono3d.lightSources.length;j--;){
			lightSource = ono3d.lightSources[j]
			if(lightSource.type ===Ono3d.LT_DIRECTION){
				//Mat43.dotMat33Vec3(lightSource.viewAngle,ono3d.viewMatrix,lightSource.angle)
				Vec3.copy(lightSource.viewAngle,lightSource.angle)
			}
		}

		//面の法線を算出
		for(i=calcMesh.faceSize;i--;){
			bufFace = renderFaces[i+rfIndex]
			normal=bufFace.normal
			Vec3.sub(bV0, bufFace.vertices[0].pos,bufFace.vertices[1].pos)
			Vec3.sub(bV1, bufFace.vertices[0].pos,bufFace.vertices[2].pos)
			
			Vec3.cross(normal,bV0,bV1)
			Vec3.norm(normal)
			
			

			Vec3.set(bufFace.angle,0,0,0)
			for(j=3;j--;){
				Vec3.add(bufFace.vertices[j].normal
					,bufFace.vertices[j].normal
						,normal)
				Vec3.add(bufFace.angle,bufFace.angle,bufFace.vertices[j].pos)
			}

			Vec3.norm(bufFace.angle)
		}
		if( ono3d.smoothing>0){
			for(i = calcMesh.vertexSize;i--;){
				bufVertex = renderVertices[i+rvIndex]
				Vec3.norm(bufVertex.normal)
			}
		}
		

	}
	var changeFrame= function(obj,name,action,frame){
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
					target=~obj.rotation;
					break;
				case FCURVE_SCALE:
					target=~obj.scale;
					break;
				case FCURVE_LOCATIONX:
					target=obj.location;
					break;
				}
				target[fcurve.array_index]= (paramB-paramA)*ratio + paramA
			}
		}
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
		var actmatrix;
		for(var i=posebones.length;i--;){
			posebone=posebones[i];
			actmatrix=posebone.actmatrix;
			if(armature.action){
				addaction(posebone,posebone.target.name,armature.action,frame)
			}
			genMatrix(posebone);
			Mat43.dot(actmatrix,actmatrix,posebone.target.imatrix)
			Mat43.dot(actmatrix,posebone.target.matrix,actmatrix)
			posebone.flg=false;
		}
		for(var i=0;i<posebones.length;i++){
			mixBoneMatrix(posebones[i]);
		}
	}
	var genMatrix=function(obj){
		var mat=obj.actmatrix;
		if(obj.rotation_mode===QUATERNION){
			Vec4.qTOm(mat,obj.rotation);
				
		}else{
			Mat43.getRotMat(mat,obj.rotation[0],1,0,0)
			Mat43.getRotMat(bM,obj.rotation[1],0,1,0)
			Mat43.dot(mat,bM,mat);
			Mat43.getRotMat(bM,obj.rotation[2],0,0,1)
			Mat43.dot(mat,bM,mat);
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
			Mat43.dot(obj.mixedmatrix,obj.iparentmatrix,obj.actmatrix);
			Mat43.dot(obj.mixedmatrix,obj.parent.mixedmatrix,obj.mixedmatrix);
		}else{
			Mat43.copy(obj.mixedmatrix,obj.actmatrix);
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
			Mat43.dot(obj.mixedmatrix,obj.iparentmatrix,obj.actmatrix);
			if(obj.parent_bone){
				parent=obj.parent_bone;
				//if(!parent.flg){
				//	mixMatrix(parent);
				//}
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
			Mat43.copy(obj.mixedmatrix,obj.actmatrix);
		}
		obj.flg=true;
	}
	var mixBoneMatrix=function(bone){
		if(bone.parent){
			if(!bone.parent.flg){
				mixBoneMatrix(bone.parent);
			}
			Mat43.dot(bone.mixedmatrix,bone.parent.mixedmatrix,bone.actmatrix);
		}else{
			Mat43.copy(bone.mixedmatrix,bone.actmatrix);
		}
		bone.flg=true;
	}
	var setFrame=ret.setFrame=function(o3o,scene,frame){
		var objects = scene.objects;
		if(o3o){
		for(i=o3o.materials.length;i--;){
			var material=o3o.materials[i];
			for(j=material.texture_slots.length;j--;){
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
	ret.freeze=function(obj,modifier){
		//モディファイア適用
		calcVertex(obj);
		_calcFaces(obj);
		calcModifier(obj,modifier);

		//適用結果を置き換え
		var mesh=obj.data;
		mesh.vertices=[];
		for(var i=0;i<calcMesh.vertexSize;i++){
			var dstvertex = new Vertex();
			mesh.vertices.push(dstvertex);
			var srcvertex=calcMesh.vertices[i];

			dstvertex.pos[0]=srcvertex.pos[0];
			dstvertex.pos[1]=srcvertex.pos[1];
			dstvertex.pos[2]=srcvertex.pos[2];
			dstvertex.groupratios=srcvertex.groupratios;

			dstvertex.groups=[];
			for(var k=0;k<srcvertex.groups.length;k++){
				dstvertex.groups.push(srcvertex.groups[k]);
			}
		}

		mesh.faces=[];

		var uvdata=null;
		if(mesh.uv_layers.length){
			mesh.uv_layers[0].data=[];
			uvdata=mesh.uv_layers[0].data;
		}
		for(var i=0;i<calcMesh.faceSize;i++){
			var dstFace= new Face();
			mesh.faces.push(dstFace);
			var srcFace=calcMesh.faces[i];
			var srcvertices=srcFace.idx;
			var dstvertices=dstFace.idx;

			dstFace.idxnum=srcFace.idxnum;
			dstvertices[0] = srcvertices[0]
			dstvertices[1] = srcvertices[1]
			dstvertices[2] = srcvertices[2]
		//	var dst=dstFace.uv;
			var src=srcFace.uv;
		//	dst[0] = src[0]
		//	dst[1] = src[1]
		//	dst[2] = src[2]
		//	dst[3] = src[3]
		//	dst[4] = src[4]
		//	dst[5] = src[5]
			if(uvdata){
				var arr=new Array(8);
				arr[0]=src[0];
				arr[1]=src[1];
				arr[2]=src[2];
				arr[3]=src[3];
				arr[4]=src[4];
				arr[5]=src[5];
				arr[6]=src[6];
				uvdata.push(arr);
			}

			dstFace.material = srcFace.material;
			dstFace.mat= srcFace.mat;
			dstFace.fs= srcFace.fs;
		}

		//モディファイアリムーブ
		for(var i=0;i<obj.modifiers.length;i++){
			if(obj.modifiers[i]==modifier){
				obj.modifiers.splice(i,1);
				break;
			}
		}


	}
	var abs=Math.abs;
	var table=new Array(64);
	var calcModifiers=function(obj,flg){
		for(var i=0,imax=obj.modifiers.length;i<imax;i++){
			var mod=obj.modifiers[i];
			if(mod.type!="MIRROR" && flg){
				continue;
			}
			if(mod.type=="MIRROR"){
				modMirror(obj,mod);
			}else if(mod.type=="ARMATURE"){
				modArmature(obj,mod);
			}
		}
	}
	var modMirror = function(obj,mod){
		var calcMeshVertices =calcMesh.vertices
		var renderFaces=calcMesh.faces;
		var renderVertex;

		var dstvertices,srcvertices;
		var dstvertex,srcvertex;
		var vertexSize=calcMesh.vertexSize
		var mrr = 0;
		if(mod.use_x){ mrr=0};
		if(mod.use_y){ mrr=1};
		if(mod.use_z){ mrr=2};

		for(j =0;j<vertexSize;j++){
			srcvertex=calcMeshVertices[j];
			dstvertex=calcMeshVertices[j+vertexSize];

			dstvertex.pos[0]=srcvertex.pos[0];
			dstvertex.pos[1]=srcvertex.pos[1];
			dstvertex.pos[2]=srcvertex.pos[2];
			dstvertex.pos[mrr]*=-1;
			//dstvertex.groups=srcvertex.groups;
			dstvertex.groupratios=srcvertex.groupratios;
			for(var k=0;k<srcvertex.groups.length;k++){
				dstvertex.groups[k]=srcvertex.groups[k];
			//	dstvertex.groupratios[k]=srcvertex.groupratios[k];
			}
			
		}
		var dstFace,srcFace;
		var faceSize=calcMesh.faceSize;
		for(var j =0;j<faceSize;j++){
			srcFace= calcMesh.faces[j]
			srcvertices=srcFace.idx;
			dstFace= calcFaces[faceSize+j]
			renderFaces[faceSize+j] = dstFace;
			dstFace.idxnum=srcFace.idxnum;
			dstvertices=dstFace.idx;
			dstvertices[0] = srcvertices[1]
			dstvertices[1] = srcvertices[0]
			dstvertices[2] = srcvertices[2]
			if(abs(calcMeshVertices[dstvertices[0]].pos[mrr])>0.01){
				dstvertices[0]+=vertexSize;
			}
			if(abs(calcMeshVertices[dstvertices[1]].pos[mrr])>0.01){
				dstvertices[1]+=vertexSize;
			}
			if(abs(calcMeshVertices[dstvertices[2]].pos[mrr])>0.01){
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
		for(var j =0;j<calcMesh.edgeSize;j++){
			var dst=calcEdges[jj+calcMesh.edgeSize]
			var src=calcMesh.edges[j];
			if(abs(calcMeshVertices[src.v0].pos[mrr])<0.01
			 && abs(calcMeshVertices[src.v1].pos[mrr])<0.01){
				dst=calcEdges[j];	
				dst.v0=src.v0;
				dst.v1=src.v1;
				dst.f0=src.f0;
				dst.f1=src.f0+faceSize;
				calcMesh.edges[j]=dst;

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
			calcMesh.edges[jj+calcMesh.edgeSize]=dst;
			jj++;
		}
		calcMesh.edgeSize+=jj;

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
			var vertex=calcMeshVertices[vertexSize+k];
			for(var l=0;l<8;l++){
				if(vertex.groups[l]<0)continue;
				vertex.groups[l]=table[vertex.groups[l]];
			}
		}
			

		
		calcMesh.faceSize+=faceSize;
		calcMesh.vertexSize+=vertexSize;
	}
	var modArmature=function(obj,mod){
		var calcMeshVertices =calcMesh.vertices
		var renderVertex;
		var groupMatrix;
		var groupName;
		var x,y,z;

		var ratio,pos,vertex;
		var groups=obj.groups;

		Mat43.getInv(bM2,mod.object.mixedmatrix);
		Mat43.dot(bM,bM2,obj.mixedmatrix);
		Mat43.getInv(bM2,bM);

		var posebones=mod.object.posebones;
		for(var j=groups.length;j--;){
			groupMatFlg[j] = false;
			groupName=groups[j];
			groupMatrix = groupMatricies[j];
			for(var k=0,kmax=posebones.length;k<kmax;k++){
				if(posebones[k].name!=groupName)continue
				groupMatFlg[j] = true;
				//Mat43.dot(groupMatrix,posebones[k].mixedmatrix,bM);
				Mat43.dot(groupMatrix,posebones[k].mixedmatrix,bM);
				Mat43.dot(groupMatrix,bM2,groupMatrix);
				break
			}
		}
		for(var k = 0;k<calcMesh.vertexSize;k++){
			pos = calcMeshVertices[k].pos
			vertex = calcMeshVertices[k];
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
				ratio=vertex.groupratios[j]
				Mat43.dotMat43Vec3(bV0,groupMatricies[vertexGroups[j]],pos)
				
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
					Mat43.dotMat43Vec3(pos,groupMatricies[mod.vertex_group],pos)
				}
			}
		}
	}
	var _edges=[];
	var drawObject = function(o3o,obj,physics){
		var i,j,k
		var x,y,z,a,b;

		calcVertex(obj);
		_calcFaces(obj);

		var renderVertices =ono3d.renderVertices;
		var renderFaces=ono3d.renderFaces;
		var rvIndex=ono3d.renderVertices_index;
		var rfIndex=ono3d.renderFaces_index;

		var flg=false;
		Mat43.dot(defMatrix,ono3d.worldMatrix,obj.mixedmatrix);
		if(physics){
			for(i=0;i<physics.length;i++){
				if( physics[i].name===obj.name){
					var phyObj=physics[i];
					var matrix = defMatrix;
					var rotmat=phyObj.rotmat;
					var sx=phyObj.scale[0];
					var sy=phyObj.scale[1];
					var sz=phyObj.scale[2];
					matrix[0]=rotmat[0]*sx;
					matrix[1]=rotmat[1]*sx;
					matrix[2]=rotmat[2]*sx;
					matrix[3]=0;
					matrix[4]=rotmat[3]*sy;
					matrix[5]=rotmat[4]*sy;
					matrix[6]=rotmat[5]*sy;
					matrix[7]=0;
					matrix[8]=rotmat[6]*sz;
					matrix[9]=rotmat[7]*sz;
					matrix[10]=rotmat[8]*sz;
					matrix[11]=0;
					matrix[12]=phyObj.location[0];
					matrix[13]=phyObj.location[1];
					matrix[14]=phyObj.location[2];
					matrix[15]=1;

					if(phyObj.type===OnoPhy.SPRING_MESH){
						var poses=phyObj.poses;
						var a,b;
						for(j=poses.length;j--;){
							a=renderVertices[j+rvIndex].pos;
							b=poses[j];
							a[0]=b[0]; a[1]=b[1]; a[2]=b[2];
						}
						flg =true;
					}else if(phyObj.type===OnoPhy.CLOTH){
						var a,b;
						for(j=phyObj.points.length;j--;){
							a=renderVertices[j+rvIndex].pos;
							b=phyObj.points[j].location;
							a[0]=b[0]; a[1]=b[1]; a[2]=b[2];
						}
						flg =true;
					}
					break;
				}
			}
		}
		calcModifiers(obj,flg);
		if(!flg){
			var calcMeshVertices=calcMesh.vertices;
			var mat0=defMatrix[0]
			var mat1=defMatrix[1]
			var mat2=defMatrix[2]
			var mat3=defMatrix[3]
			var mat4=defMatrix[4]
			var mat5=defMatrix[5]
			var mat6=defMatrix[6]
			var mat7=defMatrix[7]
			var mat8=defMatrix[8]
			var mat9=defMatrix[9]
			var mat10=defMatrix[10]
			var mat11=defMatrix[11]
			var mat12=defMatrix[12]
			var mat13=defMatrix[13]
			var mat14=defMatrix[14]

			for(j=calcMesh.vertexSize;j--;){
				a=renderVertices[j+rvIndex].pos;
				b=calcMeshVertices[j].pos;
				x=b[0];
				y=b[1];
				z=b[2];
				a[0]=mat0*x + mat4*y + mat8*z + mat12;
				a[1]=mat1*x + mat5*y + mat9*z + mat13;
				a[2]=mat2*x + mat6*y + mat10*z + mat14;
			}
		}
		setFaces();
		calcNormal();
		var faceSize=calcMesh.faceSize;
		if( ono3d.rf  & Ono3d.RF_OUTLINE){
			var bufFace,normal;
			Mat44.getInv(bM44,ono3d.viewMatrix);
			var cp0=bM44[12];
			var cp1=bM44[13];
			var cp2=bM44[14];
			for(i=calcMesh.faceSize;i--;){
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

			var edges=calcMesh.edges;
			for(i=0;i<calcMesh.edgeSize;i++){
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
				var renderFace=renderFaces[ono3d.renderFaces_index+faceSize];
				renderFace.vertices[0] = renderVertices[ono3d.renderVertices_index+edge.v0]
				renderFace.vertices[1] = renderVertices[ono3d.renderVertices_index+edge.v1]
				renderFace.bold = 1;
				renderFace.material = renderMaterial;
				renderFace.operator = Ono3d.OP_LINE
				//renderFace.z=
				//renderFace.z+=
				renderFace.rf=ono3d.rf
				faceSize++;
			}
			
		}
		ono3d.renderVertices_index+=calcMesh.vertexSize;
		ono3d.renderFaces_index+=faceSize;
		
	}

	ret.createPhyObj = function(obj,onoPhy){
		var mesh,obj
		,phyobj= null
		,vertices
		var renderVertices =calcMesh.vertices;
		var renderVertex;
		var renderFaces =calcMesh.faces;
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
				collision.size[0]=(b[3] - b[0])*0.5;
				collision.size[1]=(b[4] - b[1])*0.5;
				collision.size[2]=(b[5] - b[2])*0.5;
			}
		}
		for(var i=0;i<obj.modifiers.length;i++){
			mod = obj.modifiers[i];
			if(mod.type==="CLOTH"){
				mesh = obj.data;
				vertices = calcMesh.vertices;
				calcVertex(obj);
				_calcFaces(obj);
				calcModifiers(obj);
		//		Mat43.dot(defMatrix,ono3d.worldMatrix,obj.mixedmatrix);

				phyobj = new OnoPhy.Cloth(calcMesh.vertexSize
					,calcMesh.edgeSize
					,calcMesh.faceSize);

				onoPhy.clothes.push(phyobj);


				phyobj.air_damping=mod.air_damping;
				phyobj.mass=mod.mass;
				phyobj.speed=1.0;
				phyobj.structual_stiffness= mod.structual_stiffness;//構造
				phyobj.bending_stiffness = mod.bending_stiffness; //まげ
				phyobj.spring_damping = mod.spring_damping;//ばね抵抗
				phyobj.air_damping = mod.air_damping;//空気抵抗
				phyobj.vel_damping = mod.vel_damping;//速度抵抗

				//点
				for(j=0;j<calcMesh.vertexSize;j++){
					Vec3.copy(phyobj.points[j].location,vertices[j].pos);
					for(var k=0;k<vertices[j].groups.length;k++){
						if(vertices[j].groups[k]<0)break;
						if(obj.groups[vertices[j].groups[k]]=== mod.pin){
							phyobj.points[j].fix=true;
							break;
						}
					}
				}
				//面
				for(j=0;j<calcMesh.faceSize;j++){
					var face=renderFaces[j]
					if(face.idxnum=== 3){
						for(var k=0;k<3;k++){
							phyobj.faces[j].points[k] = phyobj.points[face.idx[k]];
						}
					}
				}

				//エッジ
				for(var j =0;j<calcMesh.edgeSize;j++){
					var edge=calcMesh.edges[j];
					phyobj.edges[j].point1 = phyobj.points[edge.v0];
					phyobj.edges[j].point2 = phyobj.points[edge.v1];

				}
				obj.phyObj = phyobj;
				movePhyObj(obj,true);
				for(var j =0;j<phyobj.edges.length;j++){
					phyobj.edges[j].len=Vec3.len(phyobj.edges[j].point1.location
						,phyobj.edges[j].point2.location);

				}
			}
			else if(mod.type==="SOFT_BODY"){
				mesh = obj.data;
				vertices = calcMesh.vertices;
				calcVertex(obj);
				_calcFaces(obj);
				calcModifiers(obj);

				phyobj = onoPhy.createSpringMesh();


				for(var j=calcMesh.vertexSize;j--;){
					phyobj.poses.push(new Vec3());
					phyobj.truepos.push(new Vec3());
					phyobj.v.push(new Vec3());
					phyobj.a.push(new Vec3());
					phyobj.fixes.push(0);
				}
				for(j=0;j<calcMesh.vertexSize;j++){
					for(var k=0,kmax=vertices[j].groups.length;k<kmax;k++){
						if(vertices[j].groups[k]<0)break;
						if(obj.groups[vertices[j].groups[k]]=== mod.pin){
							phyobj.fixes[j]=1
							break;
						}
					}
				}

				phyobj.friction= mod.friction;
				phyobj.mass=mod.mass;
				phyobj.speed= mod.speed;
				phyobj.goalDefault= mod.goalDefault;
				phyobj.goalMin= mod.goalMin;
				phyobj.goalMax= mod.goalMax;
				phyobj.goalSpring= mod.goalSpring;
				phyobj.goalFriction= mod.goalFriction;
				phyobj.edgePull= mod.edgePull;
				phyobj.edgePush= mod.edgePush;
				phyobj.edgeDamping= mod.edgeDamping ;
				phyobj.plastic= mod.plastic;
				

				var face,edges
				for(j=0;j<calcMesh.faceSize;j++){
					face=renderFaces[j]
					if(face.idxnum=== 3){
						idx= new Array(3);
						idx[0]= face.idx[0]
						idx[1]= face.idx[1]
						idx[2]= face.idx[2]
						phyobj.faces.push(idx);
						phyobj.faceAABBs.push(new AABB());
					}
				}

				for(var j =0;j<calcMesh.edgeSize;j++){
					var edge=calcMesh.edges[j];
					var joint={};
					joint.v0=edge.v0;
					joint.v1=edge.v1;
					phyobj.joints.push(joint)

				}
				var vertexSize=calcMesh.vertexSize;
				for(j=0;j<vertexSize;j++){
					for(k=j+1;k<vertexSize;k++){
						if(Vec3.len(renderVertices[j].pos,renderVertices[k].pos)<0.0001){
							var joint={};
							joint.v0=j;
							joint.v1=k;
							phyobj.joints.push(joint)
						}
					}
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
		Mat44.dot(m,joint.parent.inv_matrix,joint.child.matrix);
		
		
	}

	var movePhyObj = ret.movePhyObj = function(object,flg){
		
		var phyObj = object.phyObj;
		if(!phyObj){
			return;
		}

		if(phyObj.type===OnoPhy.CLOTH){
			var truepos=phyObj.truepos;
			var calcMeshVertices=calcMesh.vertices;
			calcVertex(object);
			calcMesh.faceSize=0;
			calcMesh.edgeSize=0;
			calcModifiers(object);
			Mat43.dot(defMatrix,ono3d.worldMatrix,object.mixedmatrix);
			if(flg){
				for(var i=0,imax=phyObj.points.length;i<imax;i++){
					Mat43.dotMat43Vec3(phyObj.points[i].location,defMatrix,calcMeshVertices[i].pos)
					Vec3.set(phyObj.points[i].v,0,0,0);
				}
			}else{
				for(var i=0,imax=phyObj.points.length;i<imax;i++){
					if(phyObj.points[i].fix){
						Mat43.dotMat43Vec3(phyObj.points[i].location,defMatrix,calcMeshVertices[i].pos)
						Vec3.set(phyObj.points[i].v,0,0,0);
					}
				}
			}
		}else if(phyObj.type===OnoPhy.SPRING_MESH){
			var truepos=phyObj.truepos;
			var calcMeshVertices=calcMesh.vertices;
			calcVertex(object);
			calcMesh.faceSize=0;
			calcMesh.edgeSize=0;
			calcModifiers(object);
			Mat43.dot(defMatrix,ono3d.worldMatrix,object.mixedmatrix);
			for(var i=0,imax=phyObj.poses.length;i<imax;i++){
				Mat43.dotMat43Vec3(truepos[i],defMatrix,calcMeshVertices[i].pos)
			}
			if(flg){
				var pos=phyObj.poses;
				var v=phyObj.v;
				for(i=0,imax=phyObj.poses.length;i<imax;i++){
					Vec3.copy(pos[i],truepos[i]);
					Vec3.set(v[i],0,0,0);
				}
			}
		}else{
			if(phyObj.fix || flg){
				Vec3.set(phyObj.v,0,0,0);
				Vec3.set(phyObj.rotV,0,0,0);
			
				Mat43.dot(phyObj.matrix,ono3d.worldMatrix,object.mixedmatrix);
				var mat=phyObj.matrix;

				Vec3.set(phyObj.location,mat[12],mat[13],mat[14]);
				Vec3.set(phyObj.scale
						,Math.sqrt(mat[0]*mat[0]+mat[1]*mat[1]+mat[2]*mat[2])
						,Math.sqrt(mat[4]*mat[4]+mat[5]*mat[5]+mat[6]*mat[6])
						,Math.sqrt(mat[8]*mat[8]+mat[9]*mat[9]+mat[10]*mat[10]))
				var invx=1/phyObj.scale[0];
				var invy=1/phyObj.scale[1];
				var invz=1/phyObj.scale[2];
				Mat33.set(phyObj.rotmat
				,mat[0]*invx
				,mat[1]*invx
				,mat[2]*invx
				,mat[4]*invy
				,mat[5]*invy
				,mat[6]*invy
				,mat[8]*invz
				,mat[9]*invz
				,mat[10]*invz
				);
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
