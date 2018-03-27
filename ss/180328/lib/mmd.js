"use strict"
var Mmd=(function(){
	var ret = new function(){}

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
	
	var idx,dv
	var encmode=0
	var readInt32 = function(){
		var i=dv.getInt32(idx,true)
		idx+=4
		return i
	}
	var readUint32 = function(){
		var i=dv.getUint32(idx,true)
		idx+=4
		return i
	}
	var readFloat = function(){

		var f=dv.getFloat32(idx,true)
		idx+=4
		return f
	}
	var readTextBuf=function(){
		var len = dv.getInt32(idx,true);idx+=4
		var str=""
		var a
		while(len){
			if(encmode==0){
				a=dv.getUint16(idx,true);idx+=2
				len-=2
				if((a&0xD000)!=0xD000){
					str+=String.fromCharCode(a)
				}else{
					str+=String.fromCharCode((a<<16)+dv.getUint16(idx,true))
					idx+=2
					len-=2
				}
			}
		}
		return str
	}
	var readText=function(len){
		var str=""
		var a
		var i
		for(i=0;i<len;i++){
			a=dv.getUint8(idx,true);idx+=1
			str+=String.fromCharCode(a)
		}
		return str
	}
	
	var addEdge=function(edges,v0,v1){
		var j
			var edge
		for(j=edges.length;j--;){
			edge=edges[j]
			if((edge.v0==v0 && edge.v1 == v1)
			|| (edge.v0==v1 && edge.v1 == v0))break
		}
		if(j<0){
			edge=new O3o.Edge()
			edge.v0=v0
			edge.v1=v1
			edges.push(edge)
		}
	}
	var cMatrix = new Mat43()
	Mat43.getRotMat(cMatrix,Math.PI,0,1,0)
	ret.loadPmx = function(path){
		var oreq= new XMLHttpRequest()
		oreq.open("GET", path, true)
		oreq.responseType="arraybuffer";
		var o3o = new O3o()

		oreq.onload=function(event){
			var arrayBuffer=oreq.response
			var advuv=0
			var vertexindexsize=1
			var boneindexsize=1
			var textureindexsize=1
			var i,imax,j,jmax

			dv = new DataView(arrayBuffer)
			idx=0

			//header
			var str=String.fromCharCode(dv.getUint8(idx++),dv.getUint8(idx++),dv.getUint8(idx++),dv.getUint8(idx++))
			//version
			var flt=readFloat()
			//byte
			var len=dv.getUint8(idx++)
			dv.getUint8(idx++)
			advuv=dv.getUint8(idx++)
			vertexindexsize=dv.getUint8(idx++)
			textureindexsize=dv.getUint8(idx++)
			dv.getUint8(idx++)
			boneindexsize=dv.getUint8(idx++)
			dv.getUint8(idx++)
			dv.getUint8(idx++)

			readTextBuf()
			readTextBuf()
			readTextBuf()
			readTextBuf()
			
			o3o.meshes=new Array(1)
			o3o.meshes[0] = new O3o.Mesh()
			//vertex
			len=readUint32()
			var vertices= new Array(len)
			o3o.meshes[0].vertices=vertices
			for(i=0;i<len;i++){
				var vertex=new O3o.Vertex()
				vertices[i]=vertex
				vertex.pos[0]=readFloat()
				vertex.pos[1]=readFloat()
				vertex.pos[2]=readFloat()
				vertex.normal[0]=-readFloat()
				vertex.normal[1]=readFloat()
				vertex.normal[2]=-readFloat()
				Vec3.norm(vertex.normal)
				//uv
				readFloat()
				readFloat()
				for(j;j<advuv;j++){
					idx+=16
				}
				var w=dv.getUint8(idx++)
				switch(w){
				case 0:
					idx+=boneindexsize
					break
				case 1:
					idx+=boneindexsize*2+4
						break;
				case 2:
					idx+=boneindexsize*4+4*4
					break;
				case 3:
					idx+=boneindexsize*2+4+12*3
					break;
				}
				idx+=4
			}
			//fase
			len=readUint32()/3
			var faces= new Array(len)
			o3o.meshes[0].faces=faces
			var j
			var edges=o3o.meshes[0].edges
			var edge
			for(i=0;i<len;i++){
				var face=new O3o.Face()
				faces[i]=face
				face.idxnum=3
				switch(vertexindexsize){
				case 1:
					face.idx[0]=dv.getUint8(idx++)
					face.idx[1]=dv.getUint8(idx++)
					face.idx[2]=dv.getUint8(idx++)
					break
				case 2:
					face.idx[0]=dv.getUint16(idx,true)
					face.idx[1]=dv.getUint16(idx+2,true)
					face.idx[2]=dv.getUint16(idx+4,true)
					idx+=2*3
					break
				case 4:
					face.idx[0]=dv.getUint32(idx,true)
					face.idx[1]=dv.getUint32(idx+4,true)
					face.idx[2]=dv.getUint32(idx+8,true)
					idx+=12
					break
				}
				addEdge(edges,face.idx[0],face.idx[1])
				addEdge(edges,face.idx[1],face.idx[2])
				addEdge(edges,face.idx[2],face.idx[0])
			}
			
			//texture
			len=readInt32()
			var textures = new Array(len)
			o3o.textures = textures
			for(i=0;i<len;i++){
				var texture = new O3o.Texture()
				textures[i] = texture
				texture.path =readTextBuf()
			}
			
			//material
			len=readInt32()
			var materials= new Array(len)
			o3o.materials = materials
			for(i=0;i<len;i++){
				var material=new O3o.Material()
				materials[i]=material
				material.name = readTextBuf() //materialname(jp)
				material.name2 = readTextBuf() //materialname(en)
				//dif
				material.r = readFloat()
				material.g = readFloat()
				material.b = readFloat()
				material.a = readFloat()
				//spe
				readFloat()
				readFloat()
				readFloat()
				//specpow
				material.difpow= readFloat()
				//amb
				readFloat()
				readFloat()
				readFloat()
				//flg
				idx+=1
				//edgecolor
				idx+=16
				//edgesize
				idx+=4
				//texture index size
				idx+=textureindexsize
				//texture index size
				idx+=textureindexsize
				//spheremode
				idx+=1
				var f = dv.getUint8(idx++)
				switch(f){
				case 0:
					//texture index
					idx+=textureindexsize
					break
				case 1:
					//toon texture index
					idx+=1
					break
				}
				//comment
				readTextBuf()
				//face num
				material.facenum = readInt32()
				material.color = (material.b*255)
					| (material.g*255<<8) 
					| (material.r*255<<16) 
					| (material.a*127<<24) 
			}

			//bone
			len=readInt32()
			var bones= new Array(len)
			for(i=0;i<len;i++){
				var bone=new O3o.Bone()
				readTextBuf()
				readTextBuf()
				idx+=4*3
				idx+=boneindexsize
				idx+=4
				var f = dv.getUint16(idx,true); idx+=2
				if((f&0x1)==0){
					idx+=12
				}else{
					idx+=boneindexsize
				}
				if((f&0x300)){
					idx+=boneindexsize
					idx+=4
				}
				if((f&0x400)){
					idx+=12
				}
				if((f&0x800)){
					idx+=12
					idx+=12
				}
				if((f&0x2000)){
					idx+=4
				}
				if((f&0x20)){
					idx+=boneindexsize
					idx+=4
					idx+=4
					var l = dv.getInt32(idx,true);idx+=4
					for(;l--;){
						idx+=boneindexsize
						var seigen = dv.getUint8(idx);idx+=1
						if(seigen==1){
							idx+=12
							idx+=12
						}
					}
				}

			}
			//morph
			len=readInt32()
			var morph= new Array(len)
			for(i=0;i<len;i++){
			}
				
			var count=0
			var mesh
			var k
			for(i=o3o.meshes.length;i--;){
				mesh = o3o.meshes[i]	
				//マテリアルのポインタ設定
				count = 0
				jmax= o3o.materials.length
				for(j=0;j<jmax;j++){
					for(k=o3o.materials[j].facenum/3|0;k--;){
						face =mesh.faces[count]
						face.material = o3o.materials[j]
						count++
					}
				}
				for(j=mesh.vertices.length;j--;){
					Mat43.dotMat43Vec3(mesh.vertices[j].pos,cMatrix,mesh.vertices[j].pos)
				}
				
				//エッジの親ポリを探す
				for(j=mesh.edges.length;j--;){
					edge=mesh.edges[j]
					edge.l = Vec3.len(mesh.vertices[edge.v0].pos,mesh.vertices[edge.v1].pos)
					for(k=mesh.faces.length;k--;){
						face = mesh.faces[k]
						count = 0
						for(l=face.idxnum;l--;){
							if(face.idx[l]==edge.v0 || face.idx[l] == edge.v1){
								count ++
								if(count == 2)break
							}
						}
						if(count == 2){
							if(edge.f0 == -1 ){
								edge.f0=k
							}else{
								edge.f1=k
								break
							}
						}
					}
				}
			}
		}
		oreq.send();
		return o3o
	}
	ret.loadPmd = function(path){
		var oreq= new XMLHttpRequest()
		oreq.open("GET", path, true)
		oreq.responseType="arraybuffer";
		var o3o = new O3o()

		oreq.onload=function(event){
			var arrayBuffer=oreq.response
			var advuv=0
			var vertexindexsize=1
			var boneindexsize=1
			var textureindexsize=1
			var i,imax,j,jmax,l

			var len

			dv = new DataView(arrayBuffer)
			idx=0

			//header
			var str=String.fromCharCode(dv.getUint8(idx++),dv.getUint8(idx++),dv.getUint8(idx++))
			//version
			var flt=readFloat()
			//modelname
			idx+=20
			//comment
			idx+=256
			
			o3o.meshes=new Array(1)
			o3o.meshes[0] = new O3o.Mesh()
			//vertex
			len=readUint32()
			var vertices= new Array(len)
			o3o.meshes[0].vertices=vertices
			for(i=0;i<len;i++){
				var vertex=new O3o.Vertex()
				vertices[i]=vertex
				//pos
				vertex.pos[0]=readFloat()
				vertex.pos[1]=readFloat()
				vertex.pos[2]=readFloat()
				//norm
				vertex.normal[0]=-readFloat()
				vertex.normal[1]=readFloat()
				vertex.normal[2]=-readFloat()
				Vec3.norm(vertex.normal)
				//uv
				readFloat()
				readFloat()
				//bone
				idx+=2
				idx+=2
				idx+=1
				//edge
				idx+=1
			}
			//fase
			len=readUint32()/3
			var faces= new Array(len)
			o3o.meshes[0].faces=faces
			var j
			var edges=o3o.meshes[0].edges
			var edge
			for(i=0;i<len;i++){
				var face=new O3o.Face()
				faces[i]=face
				face.idxnum=3
				face.idx[0]=dv.getUint16(idx,true)
				idx+=2
				face.idx[1]=dv.getUint16(idx,true)
				idx+=2
				face.idx[2]=dv.getUint16(idx,true)
				idx+=2

				addEdge(edges,face.idx[0],face.idx[1])
				addEdge(edges,face.idx[1],face.idx[2])
				addEdge(edges,face.idx[2],face.idx[0])
			}
			
			//material
			len=readUint32()
			var materials= new Array(len)
			o3o.materials = materials
			for(i=0;i<len;i++){
				var material=new O3o.Material()
				materials[i]=material
				//dif
				material.r = readFloat()
				material.g = readFloat()
				material.b = readFloat()
				material.a = readFloat()
				//specpow
				material.difpow= readFloat()
				//spe
				readFloat()
				readFloat()
				readFloat()
				//mrr
				readFloat()
				readFloat()
				readFloat()
				//toon
				idx+=1
				//edge
				idx+=1
				//face num
				material.facenum = readInt32()
				material.texturepath= readText()
				material.color = (material.b*255)
					| (material.g*255<<8) 
					| (material.r*255<<16) 
					| (material.a*127<<24) 
			}
				
			var count=0
			var mesh
			var k
			for(i=o3o.meshes.length;i--;){
				mesh = o3o.meshes[i]
				//マテリアルのポインタ設定
				count = 0
				jmax= o3o.materials.length
				for(j=0;j<jmax;j++){
					for(k=o3o.materials[j].facenum/3|0;k--;){
						face =mesh.faces[count]
						face.material = o3o.materials[j]
						count++
					}
				}
				for(j=mesh.vertices.length;j--;){
					Mat43.dotMat43Vec3(mesh.vertices[j].pos,cMatrix,mesh.vertices[j].pos)
				}
				
				//エッジの親ポリを探す
				for(j=mesh.edges.length;j--;){
					edge=mesh.edges[j]
					edge.l = Vec3.len(mesh.vertices[edge.v0].pos,mesh.vertices[edge.v1].pos)
					for(k=mesh.faces.length;k--;){
						face = mesh.faces[k]
						count = 0
						for(l=face.idxnum;l--;){
							if(face.idx[l]==edge.v0 || face.idx[l] == edge.v1){
								count ++
								if(count == 2)break
							}
						}
						if(count == 2){
							if(edge.f0 == -1 ){
								edge.f0=k
							}else{
								edge.f1=k
								break
							}
						}
					}
				}
			}
		}
		oreq.send();
		return o3o
	}
	return ret
})()



