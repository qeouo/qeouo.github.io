"use strict"
var Mqo=(function(){
	
	var Mqo = function(){
		this.scene = new Scene()
		this.backImage 
		this.materials =new Array()
		this.objects =new Array()
	}
	var Scene = function(){
		this.pos
		this.lookat
		this.head 
		this.pick
		this.ortho
		this.zoom2
		this.amb
	}
	var Backimage = function(){
		this.left =""
	}
	var Material = function(){
		this.name
		this.col
		this.dif
		this.amb
		this.emi
		this.spc
		this.power
		this.tex=""
	}
	var mqoObject = function(){
		this.name
		this.visible
		this.locking
		this.shadking
		this.color
		this.color_type
		this.mirror
		this.mirror_axis
		this.mirror_dis
		this.vertices
		this.faces
	}
	var Face = function(){
		this.vertexnum
		this.V= new Array(6)
		this.M
		this.UV=new Array(8)
	}


	var seek=function(data){
		var res
		var index2 = data.src.indexOf("\n",data.index)
		if(index2<0)return null
		res = data.src.substring(data.index,index2)
		data.index=index2 + 1
		if(/^[\]\}]/.test(res))return null
		return res
		
	}
	var kakko=function(data){
		var line
		var res
		while(line=seek(data)){
			if(res = line.match(/\{/)){
				kakko(data)
			}else if(res=line.match(/\}/)){
				break
			}
		}
	}
	var numortext=function(a){
		if(isNaN(a)){
			if(a.indexOf("\"")==0){
				return a.substring(1,a.length-1)
			}else{
				return a
			}
		}else{
			return parseFloat(a)
		}
	}
	var readParam=function(object,line){
		var res,param,j
		while(line.length){
			if( res = line.match(/^(\S+?)\((.+?)\)\s*/)){
				var arr=res[2].split(" ")
				if(arr.length>1){
					param = new Array()
					for(j=0;j<arr.length;j++){
						param[j]=numortext(arr[j])
					}
				}else{
					param=numortext(res[2])
				}
				object[res[1]]=param

			}
			line=line.substring(res[0].length)
		}
	}

	Mqo.loadMqo = function(url,buf){
		var 
		i,imax
		,j,jmax
		,k,kmax
		,l
		var res =  /.*\//.exec(url)
		var carentdir="./"
		if(res) carentdir = res[0]

		var res
		 ,line
		 ,type
		
		var
			mqo
			,mesh
			,material
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
	
		buf= buf.replace(/\s+$/mg, "")
		buf= buf.replace(/^\s+/mg, "")
		data.src = buf
		data.index = 0
		mqo = new Mqo()
		mqo.objects = new Array()
		while(line=seek(data)){
			res = line.match(/^(\S+)\s+(\S*)\s*{/)
			if(!res)continue
			type=res[1]
			if(type=="Scene"){
				var scene = new Scene()
				var param 
				mqo.scene = scene
				while(line=seek(data)){
					if(res = line.match(/\{/)){
						kakko(data)
					}
					if(res = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/)){
						param = new Vec3()
						scene[res[1]]=param
						param[0]=parseFloat(res[2])
						param[1]=parseFloat(res[3])
						param[2]=parseFloat(res[4])
					}else if(res = line.match(/^(\S+)\s+(\S+)/)){
						scene[res[1]]=parseFloat(res[2])
						
					}
				}
			}else if(type=="BackImage"){
				while(line=seek(data)){
				}
			}else if(type=="Material"){
				mqo.materials = new Array(parseInt(res[2]))
				i=0
				while(line=seek(data)){
					var material = new Material
					mqo.materials[i] = material
					res = material.name = line.match(/^".+?"\s+/)
					material.name=res[1]
					line=line.substring(res[0].length)
					readParam(material,line)
					i++
				}
			}else if(type=="Object"){
				var obj = new mqoObject()
				mqo.objects.push(obj)
				obj.name= res[2].substring(1,res[2].length-1)
				while(line=seek(data)){
					if(res = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/)){
						param = new Vec3()
						scene[res[1]]=param
						param[0]=parseFloat(res[2])
						param[1]=parseFloat(res[3])
						param[2]=parseFloat(res[4])
					}else if(res = line.match(/^(\S+)\s+(\S+)$/)){
						scene[res[1]]=parseFloat(res[2])
					}else if(res = line.match(/^vertex\s+(\d+)\s+{$/)){
						obj.vertices=new Array(parseInt(res[1]))
						var vertex
						i=0
						while(line=seek(data)){
							vertex = new Array(3)
							res = line.match(/^([\S\.]+)\s+([\S\.]+)\s+([\S\.]+)$/)
							obj.vertices[i] = vertex
							vertex[0]=parseFloat(res[1])
							vertex[1]=parseFloat(res[2])
							vertex[2]=parseFloat(res[3])
							i++
						}
					}else if(res = line.match(/^face\s+(\d+)\s+{$/)){
						obj.faces=new Array(parseInt(res[1]))
						var face
						i=0
						while(line=seek(data)){
							face = new Face()
							obj.faces[i]=face
							res=line.match(/^(\d+?)\s/)
							face.vertexnum = parseInt(res[1])
							line=line.substring(res[0].length)
							readParam(face,line)
							i++
						}
					}
				}
			}
		}
		return mqo
	}
	return Mqo
})()
