"use strict"
var Ono3d = (function(){
	var _PI= 1.0/Math.PI;
	var gl;
	var shaders;
	var currentpath = Util.getCurrent();
	var
		i
		
		,RF_OUTLINE=i=1
		,RF_DOUBLE_SIDED=++i

	;
	var DEFAULT_VERTEX_DATA_SIZE = 20*4;
	var TEXSIZE =1024;
	var LightSource= function(){
		this.matrix= new Mat44();
		this.viewmatrix= new Mat44();
		this.viewmatrix2= new Mat44();
		this.color = new Vec3();
		this.type
		this.power =1
	}

	var Environment=function(){
		this.name="";
		this.envTexture ="";
		this.sun = new LightSource();
		this.area = new LightSource();
	}
	var Material =function(){
		this.name="";
		this.baseColor =new Vec3();//乱反射色 
		this.baseColorMap =null; //ベースカラーテクスチャ
		this.opacity = 1.0; //不透明度
		this.metallic= 0.0; //全反射強度
		this.metalColor = new Vec3();//反射色
		this.roughness =1.0; //反射粗度
		this.ior = 0.0; //屈折率
		this.subRoughness = 0.0; //透明粗度
		this.emt=0.0; //自己発光強度
		this.pbrMap=null; //pbrテクスチャ

		this.hightMap=null; //法線マップテクスチャ
		this.hightMapPower=0.0; //法線マップ強度
		this.lightMap=null;
		this.offsetx=0.0; //uvオフセット
		this.offsety=0.0; //
		this.uv="";

		this.bold=1.0; //太さ

		this.shader = ""; //シェーダ

	}
	var Face = function(){
		this.vertices=new Uint16Array(3);
		
		this.environments=new Array(2);
		this.environmentRatio=0.0;
	}
	var Line = function(){
		this.bold=1;
		//this.vertices=new Uint16Array(2);
		this.pos=[];
		this.pos[0]=new Vec3();
		this.pos[1]=new Vec3();
		this.material=0;
	};


	var Ono3d = function(){
		this.rf = 0
		this.smoothing = 0
		this.viewMatrix=new Mat44()
		this.worldMatrix=new Mat44()
		this.targetMatrix = this.worldMatrix
		this.projectionMatrix=new Mat44();
		this.pvMatrix=new Mat44();//new Array(16);//new Mat44()
		this.persx
		this.persy
		this.lines_index = 0
		this.vertices_index = 0
		this.faces_index=0;
		this.vertices_static_index=0;
		this.faces_static_index=0;
		this.materials_static_index=0;
		this.viewport = new Array(4);
		this.znear=0.1;
		this.zfar=80;
		this.aov=1;

		this.renderTarget
		this.canvasTarget

		this.bold=1.0
		this.lineColor=new Vec4();

		this.transTextures=[null,null];
		this.transTextureIndex=0;
		this.env2Texture=null;
		this.shadowTexture=null;
		this.envbufTexture=null;

		var i
		,RENDERFACES_MAX=4096;
		
		this.materials=[];
		for(i=0;i<256;i++)this.materials.push(new Material());

		this.environments=[];
		for(i=0;i<8;i++)this.environments.push(new Environment());


		this.lines = new Array(RENDERFACES_MAX)
		this.faces= new Array(RENDERFACES_MAX)
		for(i=this.faces.length;i--;){
			this.faces[i] = new Face();
			this.lines[i] = new Line();
		}



		this.stackTransMatrix=new Array()
		this.stackIndex=0
		for(var i=32;i--;)this.stackTransMatrix.push(new Mat44())

		this.clear();

	}
	var ret = Ono3d;

	ret.Material = Material;
	ret.Face = Face;


	ret.RF_OUTLINE=RF_OUTLINE
	ret.RF_DOUBLE_SIDED=RF_DOUBLE_SIDED

	
	//-x~x,-y~y,zn~zf
	ret.calcOrthoMatrix = function(mat,x,y,zn,zf){
		Mat44.set(mat
		,-1.0/x,0,0,0
		,0,1.0/y,0,0.0
		,0,0,2.0/(zf-zn),0.0
		,0,0,-(zf+zn)/(zf-zn),1.0);
	}
	ret.prototype= {

		getPos:function(pos,x,y,z){
			pos[0]=x
			pos[1]=y
			pos[2]=z
			Mat44.dotMat44Vec3(pos,this.targetMatrix,pos)

			pos[0] = -pos[0]/(pos[2]*this.persx)+0.5
			pos[1] = -pos[1]/(pos[2]*this.persy)+0.5
			
		}
		,LightSource:LightSource
		,framebuffer:function(){
			Rastgl.framebuffer(this);
		}
		,init:function(_canvas,_ctx){
			gl = Rastgl.gl;
			this.clear()

			this.renderTarget=_ctx
			this.canvasTarget=_canvas

			this.transTextures[0] = Ono3d.createTexture(TEXSIZE,TEXSIZE);
			this.transTextures[1] = Ono3d.createTexture(TEXSIZE,TEXSIZE);
			this.env2Texture= Ono3d.createTexture(TEXSIZE,TEXSIZE);
			this.shadowTexture = Ono3d.createTexture(TEXSIZE,TEXSIZE);
			gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture.glTexture);
			//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

			this.envbufTexture = Ono3d.createTexture(1024,512);
			this.indexBuffer = new Uint16Array(Rastgl.VERTEX_MAX);
			this.verticesFloat32Array= new Float32Array(Rastgl.VERTEX_MAX*20);

			this.shaders=[];
			shaders = this.shaders;

			var filenames=[ "shadow","plain","half","multiadd","fill","add"
				,"average","average2","average3","decode"
				,"rough","celestialsphere","envset","gauss","normal"
				,"cube2polar","cube2lightfield","cube2lightfield2","cube2lightfield3"];
			for(var i=0;i<filenames.length;i++){
				var filename = filenames[i];
		//		if(this.shaders[filename]){
		//			continue;
		//		}
				this.shaders[filename]=Ono3d.loadShader(currentpath+"shader/"+filename + ".shader");
			}


			Ono3d.loadMainShader();

			for(var i=0;i<6;i++){
				gl.activeTexture(gl.TEXTURE0+i);
			}
			gl.activeTexture(gl.TEXTURE0);
			   

		}
		,setTargetMatrix:function(target){
			if(target===0){
				this.targetMatrix = this.worldMatrix
			}else{
				this.targetMatrix = this.viewMatrix
			}
		}
		,setViewport:function(x,y,width,height){
			this.viewport[0]=x;
			this.viewport[1]=y;
			this.viewport[2]=width;
			this.viewport[3]=height;
			gl.viewport(x,y,width,height);
		}
		,setNearFar:function(zn,zf){
			this.znear=zn;
			this.zfar=zf;
		}
		,setAov:function(aov){
			this.aov=aov;
		}
		,calcProjectionMatrix:function(mat,x,y,zn,zf){
			Mat44.set(mat
				,zn/x,0,0,0
				,0,zn/y,0,0
				,0,0,-(zn+zf)/(zf-zn),-1.0
				,0,0,-2*zn*zf/(zf-zn),0);

		}
		,setOrtho:function(x,y,zn,zf){
			if(zn != null){
				this.znear=zn;
				this.zfar=zf;
			}
			
			ret.calcOrthoMatrix(this.projectionMatrix
				,x,y
				,this.znear,this.zfar);
		}
		,push:function(){
			if(this.stackIndex>=32)return
			var stm=this.stackTransMatrix[this.stackIndex]
			var tm=this.targetMatrix
			stm[0]=tm[0]
			stm[1]=tm[1]
			stm[2]=tm[2]
			stm[4]=tm[4]
			stm[5]=tm[5]
			stm[6]=tm[6]
			stm[8]=tm[8]
			stm[9]=tm[9]
			stm[10]=tm[10]
			stm[12]=tm[12]
			stm[13]=tm[13]
			stm[14]=tm[14]
			this.stackIndex++
		}
		,pop:function(){
			if(this.stackIndex<=0)return
			this.stackIndex--
			var stm=this.stackTransMatrix[this.stackIndex]
			var tm=this.targetMatrix
			tm[0]=stm[0]
			tm[1]=stm[1]
			tm[2]=stm[2]
			tm[4]=stm[4]
			tm[5]=stm[5]
			tm[6]=stm[6]
			tm[8]=stm[8]
			tm[9]=stm[9]
			tm[10]=stm[10]
			tm[12]=stm[12]
			tm[13]=stm[13]
			tm[14]=stm[14]
		}
		,loadIdentity:function(){
			var mat = this.targetMatrix
			mat[0] = 1.0
			mat[1] = 0
			mat[2] = 0
			mat[4] = 0
			mat[5] = 1.0
			mat[6] = 0
			mat[8] = 0
			mat[9] = 0
			mat[10] = 1.0
			mat[12] = 0
			mat[13] = 0
			mat[14] = 0
		}
		,rotate:function(r,x,y,z){
			var SIN=Math.sin(r)
			var COS=Math.cos(r)
			var a = Mat44.poolAlloc();
			a[0]=x*x*(1-COS)+COS;a[4]=x*y*(1-COS)-z*SIN;a[8]=z*x*(1-COS)+y*SIN;a[12]=0
			a[1]=x*y*(1-COS)+z*SIN;a[5]=y*y*(1-COS)+COS;a[9]=y*z*(1-COS)-x*SIN;a[13]=0
			a[2]=z*x*(1-COS)-y*SIN;a[6]=y*z*(1-COS)+x*SIN;a[10]=z*z*(1-COS)+COS;a[14]=0
			a[3]=a[7]=a[11]=0;a[15]=1;
			Mat44.dot(this.targetMatrix,this.targetMatrix,a)
			Mat44.poolFree(1);
		}
		,scale:function(x,y,z){
			var m = this.targetMatrix;
			m[0]=m[0]*x;
			m[1]*=x;
			m[2]*=x;
			m[4]*=y;
			m[5]*=y;
			m[6]*=y;
			m[8]*=z;
			m[9]*=z;
			m[10]*=z;
		}
		,translate:function(x,y,z){
			var m = this.targetMatrix
			m[12]=m[0]*x+m[4]*y+m[8]*z+m[12]
			m[13]=m[1]*x+m[5]*y+m[9]*z+m[13]
			m[14]=m[2]*x+m[6]*y+m[10]*z+m[14]
		}
		,transmat:function(m){
			Mat44.dot(this.targetMatrix,this.targetMatrix,m);
		}
	};
	ret.prototype.calcPerspectiveMatrix = function(mat,left,right,top,bottom,zn,zf){
		Mat44.set(mat
			,2*zn/(right-left),0,0,0
			,0,2*zn/(top-bottom),0,0
			,(right+left)/(right-left),(top+bottom)/(top-bottom),-(zn+zf)/(zf-zn),-1.0
			,0,0,-2*zn*zf/(zf-zn),0);

	}

	ret.prototype.setStatic=function(){
		this.faces_static_index=0;//this.faces_index;
		this.vertices_static_index=this.vertices_index;
		this.materials_static_index=this.materials_index;
	}
	ret.prototype.clear= function(){
		this.faces_index=this.faces_static_index;
		this.lines_index=0;
		this.vertices_index=this.vertices_static_index;
		this.materials_index=this.materials_static_index;
	};

	
	ret.prototype.stereoDraw = function(func){
		var x=this.viewport[0];
		var y=this.viewport[1];
		var WIDTH=this.viewport[2];
		var HEIGHT=this.viewport[3];

		if(globalParam.stereomode==0){
			globalParam.gl.viewport(x,y,WIDTH,HEIGHT);
			this.calcProjectionMatrix(this.projectionMatrix,this.aov*this.znear,this.aov*HEIGHT/WIDTH*this.znear
				,this.znear,this.zfar);
			Mat44.dot(this.pvMatrix,this.projectionMatrix,this.viewMatrix);
			func();
		}else{
			var p=1.0;
			var q=(1-p)*0.5;
			var stereo;
			WIDTH =WIDTH/2;
			globalParam.gl.viewport(WIDTH*q,HEIGHT*q,WIDTH*p,HEIGHT*p);
			stereo=globalParam.stereo;
			this.calcProjectionMatrix(this.projectionMatrix,this.aov*this.znear,this.aov*HEIGHT/WIDTH*this.znear
				,this.znear,this.zfar);
			this.projectionMatrix[8]=0;//stereo/10;
			this.projectionMatrix[12]=stereo;
			Mat44.dot(this.pvMatrix,this.projectionMatrix,this.viewMatrix);
			func();

			this.projectionMatrix[12]*=-1;
			Mat44.dot(this.pvMatrix,this.projectionMatrix,this.viewMatrix);
			globalParam.gl.viewport(WIDTH+WIDTH*q,HEIGHT*q,WIDTH*p,HEIGHT*p);
			func();
		}
	}

	var fa16 =new Float32Array(16);
	var mat=new Float32Array(9);
	var fa =new Float32Array(3);
	ret.calcMainShaderName=function(material){
		var options=["lightMap","opacity","specular","hightMapPower","pbrMap"];
		var num=0;
		for(var oi=0;oi<options.length;oi++){
			if(options[oi]==="opacity"){
				if(material[options[oi]] !== 1.0){
					num|=(1<<oi);
				}
			}else{
				if(material[options[oi]]){
					num|=(1<<oi);
				}
			}
		}
		return "main_"+num;
	}
	ret.prototype.render = function(camerap){
		var ono3d = this;

		var viewx,viewy,vieww,viewh;
		viewx = ono3d.viewport[0];
		viewy = ono3d.viewport[1];
		vieww = ono3d.viewport[2];
		viewh = ono3d.viewport[3];

		//メインシェーダを設定
		for(var mi=0;mi<this.materials_index;mi++){
			var material = this.materials[mi];
			if(material.shader && material.shader !==""){
				continue;
			}
			material.shader=Ono3d.calcMainShaderName(material);
		}

		//マテリアルリストをシェーダごとに分ける
		Sort.qSort(this.materials,this.materials_static_index,this.materials_index-1
			,function(a,b){return ((a.opacity === 1.0) && (b.opacity !== 1.0) || (a.shader < b.shader))?-1
				:((a.opacity !==1.0) && (b.opacity ===1.0) || (a.shader > b.shader))?1:0;})


		//描画ポリゴンをマテリアル,環境 順に並べる
		for(var i=0;i<this.materials_index;i++){
			this.materials[i].index = i;
		}
		for(var i=0;i<this.environments_index;i++){
			this.environments[i].index = i;
		}
		var faces = ono3d.faces;
		var facesize=ono3d.faces_index;
		for(var i=0;i<facesize;i++){
			faces[i].materialIndex = 

			(faces[i].material.opacity !== 1.0) *(0x1 << (8+8+8))
			 + (faces[i].environments[1].index<<(8+8))
			 + (faces[i].environments[0].index<<8)
			 + faces[i].material.index ;
		}
		//faces.sort(function(a,b){return a.materialIndex-b.materialIndex;});
		Sort.qSort(faces,this.faces_static_index,facesize-1,function(a,b){return a.materialIndex-b.materialIndex;});

		var vertexDataSize=20;
		var vindex=0;

		var oldIndex=-1;
		var linesize = ono3d.lines_index;

		//GPUに渡すバッファ
		var buff = this.verticesFloat32Array;
		var idxbuff = this.indexBuffer;
		var idxsize=0;

		//面データセット
		// マテリアルごとにインデックスをつくる
		var materialIndexes = [];
		for(var i=0;i<facesize;i++){
			var renderface = faces[i];
			if(oldIndex != renderface.materialIndex){
				materialIndexes.push(i);
				oldIndex = renderface.materialIndex
			}

			idxbuff[idxsize]=renderface.vertices[0];
			idxbuff[idxsize+1]=renderface.vertices[1];
			idxbuff[idxsize+2]=renderface.vertices[2];
			idxsize+=3;
		}
		materialIndexes.push(facesize);
		vindex+=vertexDataSize*3*facesize;


		
		//線データセット
		var lines = ono3d.lines;
		for(var i=0;i<linesize;i++){
			lines[i].materialIndex = lines[i].material.index ;
		}
		Sort.qSort(lines,0,this.lines_index-1,function(a,b){return a.materialIndex-b.materialIndex;});

		var vertex;
		var lineoffset = facesize*3*vertexDataSize;
		for(var i=0;i<linesize;i++){
			var idx = i*6 + lineoffset;
			var pos=lines[i].pos[0]
			buff[idx]=pos[0]
			buff[idx+1]=pos[1]
			buff[idx+2]=pos[2]
			pos=lines[i].pos[1]
			buff[idx+3]=pos[0]
			buff[idx+4]=pos[1]
			buff[idx+5]=pos[2]
		}
		vindex+=6*linesize;
		

		//データをGPUに転送
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
		
		var voff=this.vertices_static_index*vertexDataSize;
		gl.bufferSubData(gl.ARRAY_BUFFER, voff*4
			, new Float32Array(this.verticesFloat32Array.buffer,voff*4,vindex));
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Rastgl.glIdxBuffer);
		gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, new Uint16Array(idxbuff.buffer,0,idxsize));



//シャドウマップ描画
		var lightSource= null;

		if(globalParam.shadow){
			lightSource = this.environments[0].sun;
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER,Rastgl.frameBuffer);
		this.setViewport(0,0,1024,1024);
		gl.clearColor(1., 16.0/255.0, 1.,16.0/255.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		if(lightSource && facesize){
			var shader =  this.shaders["shadow"];
			var f32a = new Float32Array(16);

			gl.useProgram(shader.program);
			gl.depthMask(true);
			gl.enable(gl.DEPTH_TEST);
			gl.cullFace(gl.BACK);
			gl.disable(gl.BLEND);

			//for(var i=0;i<16;i++){
			//	f32a[i] = lightSource.viewmatrix[i];
			//}

			gl.uniformMatrix4fv(shader.unis["projectionMatrix"],false,lightSource.viewmatrix);
			gl.vertexAttribPointer(shader.atts["aPos"], 3,gl.FLOAT, false,DEFAULT_VERTEX_DATA_SIZE , 0);
			gl.drawElements(gl.TRIANGLES, facesize*3, gl.UNSIGNED_SHORT, 0);

			//Ono3d.copyImage(this.shadowTexture,0,0,0,0,1024,1024);

			//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			//shader =  this.shaders["shadow_only"];
			//gl.useProgram(shader.program);
			//var WIDTH=1024;
			//var HEIGHT=512;
			//this.calcProjectionMatrix(this.projectionMatrix,this.aov*this.znear,this.aov*HEIGHT/WIDTH*this.znear
			//	,this.znear,this.zfar);
			//Mat44.dot(this.pvMatrix,this.projectionMatrix,this.viewMatrix);
			//gl.uniformMatrix4fv(shader.unis["projectionMatrix"],false,this.pvMatrix);
			//gl.uniformMatrix4fv(shader.unis["lightMat"],false,lightSource.viewmatrix);
			//gl.uniform1i(shader.unis["uShadowmap"],1);
			//gl.activeTexture(gl.TEXTURE1);
			//gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture.glTexture);

			//gl.vertexAttribPointer(shader.atts["aPos"], 3,gl.FLOAT, false,DEFAULT_VERTEX_DATA_SIZE , 0);
			//gl.drawElements(gl.TRIANGLES, facesize*3, gl.UNSIGNED_SHORT, 0);

			//gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
			//this.setViewport(0,0,1024,1024);
			//Engine.shadowGauss(1024,1024,1000,this.shadowTexture,0,0,1,1);
			//Ono3d.copyImage(this.shadowTexture,0,0,0,0,1024,1024);
		}
		Ono3d.copyImage(this.shadowTexture,0,0,0,0,1024,1024);




		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
		
		globalParam.stereo=-globalParam.stereoVolume * globalParam.stereomode*0.4;
		
		//シェーダごとにレンダリング
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.depthMask(true);
		gl.enable(gl.DEPTH_TEST);

		this.setViewport(viewx,viewy,vieww,viewh);

		fa[0] = camerap[0];
		fa[1] = camerap[1];
		fa[2] = camerap[2];

		mat[0] = this.viewMatrix[0];
		mat[1] = this.viewMatrix[1];
		mat[2] = this.viewMatrix[2];
		mat[3] = this.viewMatrix[4];
		mat[4] = this.viewMatrix[5];
		mat[5] = this.viewMatrix[6];
		mat[6] = this.viewMatrix[8];
		mat[7] = this.viewMatrix[9];
		mat[8] = this.viewMatrix[10];
		gl.enable(gl.DEPTH_TEST);
		gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
		gl.disable(gl.BLEND);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);

		var lineOpacityIndex=linesize;

		//不透明ポリゴン描画
		var opacityIndex = materialIndexes.length;
		for(var i=0;i<materialIndexes.length-1;i++){
			if(faces[materialIndexes[i]].material.opacity !== 1.0){
				opacityIndex = i;
				break;
			 }
			var j=i+1;
			for(;j<materialIndexes.length-1;j++){
				if(faces[materialIndexes[i]].material.shader 
					!= faces[materialIndexes[j]].material.shader){
					break;
				}

				if(faces[materialIndexes[j]].material.opacity !== 1.0){
					break;
				 }
			}
			this.renderShader(materialIndexes[i]
				,materialIndexes[j]-materialIndexes[i]
				,0);
			i=j-1;
		}
		

		

		//環境跨ぎポリゴンチェック
		var idx = -1;
		for(var i=0;i<opacityIndex;i++){
			var renderface = faces[materialIndexes[i]];
			if((renderface.materialIndex & (0xf<<(8+8)))){
				idx=i;
				break;
			}
		}
		if(idx>=0){
			//環境跨ぎポリゴンある場合はもう一回レンダリング
			Ono3d.copyImage({glTexture:Rastgl.fTexture},0,0,viewx,viewy,vieww,viewh);

			gl.clearColor(0.0,0.0,0.0,0.0);
			gl.clear(gl.COLOR_BUFFER_BIT);

			for(var i=idx;i<opacityIndex-1;i++){
				var j=i+1;
				for(;j<materialIndexes.length-1;j++){
					if(faces[materialIndexes[i]].material.shader 
						!= faces[materialIndexes[j]].material.shader){
						break;
					}
				}
				this.renderShader(materialIndexes[i]
					,materialIndexes[j]-materialIndexes[i]
					,1);
				i=j-1;
			}


			Ono3d.copyImage(this.env2Texture,0,0,viewx,viewy,vieww,viewh);


			//合成
			var addShader = this.shaders["add"];

			gl.useProgram(addShader.program);
			gl.uniform1i(addShader.unis["uSampler2"],1);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D,this.env2Texture.glTexture);
			gl.uniform1f(addShader.unis["v1"],1.0);
			gl.uniform1f(addShader.unis["v2"],1.0);
			
			gl.viewport(viewx,viewy,vieww,viewh);
			Ono3d.postEffect({glTexture:Rastgl.fTexture},0,0 ,vieww/1024,viewh/1024,addShader); 

			gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
		}

		
		//線描画
		var i=0;
		var materialIndex;
		var shader = this.shaders["plain"];

		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		gl.useProgram(shader.program);
		gl.vertexAttribPointer(shader.atts["aPos"], 3,gl.FLOAT, false,0 , ono3d.faces_index * DEFAULT_VERTEX_DATA_SIZE*3); 

		while(i<linesize){
			if(lines[i].material.opacity !==1.0){
				lineOpacityIndex = i;
				break;
			}
			materialIndex = lines[i].materialIndex;
			var j=i+1;
			for(j;j<linesize;j++){
				if(lines[j].materialIndex !== materialIndex){break;}
			}
			this.drawLine(i,j-i);
			i=j;
		}

		if(opacityIndex >= materialIndexes.length){
			//透明ポリゴンがない場合は終了
			return;
		}

		//不透明レンダリング結果からラフネス別テクスチャ作成
		var transTexture = this.transTextures[this.transTextureIndex];
		Ono3d.copyImage(transTexture,0,0,viewx,viewy,vieww,viewh);

		this.transTextureIndex=1-this.transTextureIndex;
		transTexture = this.transTextures[this.transTextureIndex];

		gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
		//gl.clearColor(1., 1., 1.,0.5);
		//gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
		gl.disable(gl.DEPTH_TEST);
		var size=TEXSIZE;
		gl.disable(gl.BLEND);
		for(var i=1;i<4;i++){
			size>>=1;
			gl.viewport(0,0,size,size*0.5);
		
			Ono3d.gauss(size,size*0.5,100
				,transTexture,0,(TEXSIZE-size*2)/TEXSIZE,size*2/TEXSIZE,size/TEXSIZE);
			Ono3d.copyImage(transTexture,0,1024-size,0,0,size,size*0.5);
		}
		size>>=1;
		var s=Math.pow(0.5,4);
		//gl.viewport(0,0,vieww*s,viewh*s*0.5);
		gl.viewport(0,0,TEXSIZE*s,TEXSIZE*s*0.5);

		var environment=this.environments[0];
		//Env2D.draw(environment.envTexture.glTexture,0,1-s,s,s*0.5);
		this.drawCelestialSphere(environment.envTexture,0,1-s,s,s*0.5);
		Ono3d.copyImage(transTexture,0,(1-s)*TEXSIZE,0,0,TEXSIZE*s,TEXSIZE*s*0.5);
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		Ono3d.copyImage(transTexture,0,0,0,0,vieww,viewh);

		//透明ポリゴン描画
		gl.viewport(viewx,viewy,vieww,viewh);

		gl.enable(gl.DEPTH_TEST);
		gl.depthMask(true);

		gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
		gl.disable(gl.BLEND);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);

		//シェーダごとにレンダリング
		for(var i=opacityIndex;i<materialIndexes.length-1;i++){
			var j=i+1;
			for(;j<materialIndexes.length-1;j++){
				if(faces[materialIndexes[i]].material.shader 
					!= faces[materialIndexes[j]].material.shader){
					break;
				}
			}
			this.renderShader(materialIndexes[i]
				,materialIndexes[j]-materialIndexes[i]
				,0);
			i=j-1;
		}
		

		//線描画
		var i=lineOpacityIndex;
		var materialIndex;
		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		var shader = this.shaders["plain"];
		gl.useProgram(shader.program);
		gl.vertexAttribPointer(shader.atts["aPos"], 3,gl.FLOAT, false,0 , ono3d.faces_index * DEFAULT_VERTEX_DATA_SIZE*3); 
		while(i<linesize){
			materialIndex = lines[i].materialIndex;
			var j=i+1;
			for(j;j<linesize;j++){
				if(lines[j].materialIndex !== materialIndex){break;}
			}
			this.drawLine(i,j-i);
			i=j;
		}
	}

	ret.loadTexture = function(path,func){
		return  Util.loadImage(path,0
			,function(image){
				if(!image.glTexture){
					image.glTexture = Rastgl.createTexture(image);
				}
				if(func){
					func(image);
				}
			}
		);
	}
	ret.createTexture= function(width,height){
		var image = {};
		image.width=width;
		image.height=height;
		image.glTexture = Rastgl.createTexture(null,width,height);
		return image;
	}
	ret.loadBumpTexture = function(path,func){
		return Ono3d.loadTexture(path,function(image){
			if(!image.bumpInitFlg){
				gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
				gl.viewport(0,0,image.width,image.height);
				Ono3d.initNormal(image);
				Ono3d.copyImage(image,0,0,0,0,image.width,image.height);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.bindTexture(gl.TEXTURE_2D, null);
				image.bumpInitFlg=true;
			}

			if(func){
				func(image);
			}
		});
	}
	ret.createShader= function(txt){
		var shader={};
		
		txt=txt.replace("[common]","");
		txt = " \n \
			#pragma optionNV(inline all) \n \
			#pragma optionNV(unroll all)  \n" +txt;
		var sss=txt.match(/\[vertexshader\]([\s\S]*)\[fragmentshader\]([\s\S]*)/);
		var vs = sss[1];
		var fs = sss[2];
		fs=(Rastgl.commonFunction + Rastgl.textureRGBE) + "\n" + fs;
		var unis = txt.match(/uniform .+?;/g)
		var atts = (vs+fs).match(/attribute .+?;/g)
		var gl = Rastgl.gl;

		var program = shader.program=Rastgl.setShaderProgram(vs,fs);

		shader.atts={};
		for(var i=0;i<atts.length;i++){
			var nam = atts[i].match(/(\S+)\s*;/)[1];

			var att=gl.getAttribLocation(program,nam); 
			shader.atts[nam]=att;
			if(att>=0){
				gl.enableVertexAttribArray(att);
				gl.vertexAttribPointer(att, 1,gl.FLOAT, false, 0, 0);
			}
		}
		shader.unis={};
		for(var i=0;i<unis.length;i++){
			var nam = unis[i].match(/(\S+)\s*;/)[1];
			nam = nam.match(/^([^\[]+)/)[1];
			shader.unis[nam]=gl.getUniformLocation(shader.program,nam);
		}
		return shader;
	}

	var vAP=function(gl,a,b,c,d,e,f){
		if(a>=0)gl.vertexAttribPointer(a, b,c,d,e,f);
	}

	ret.prototype.renderShader=function(start,size,envIdx){
		var arr = this.faces;
		var i=start;
		var material = arr[start].material;
		

		var name = material.shader;

		var shader = this.shaders[name];
		if(!shader.program){
			return;
		}


		var atts=shader.atts;
		var unis= shader.unis;

		gl.useProgram(shader.program);

		var offset = DEFAULT_VERTEX_DATA_SIZE ;

		vAP(gl,atts["aPos"], 3,gl.FLOAT, false, offset, 0);
		vAP(gl,atts["aNormal"], 3,gl.FLOAT, false, offset, 3*4);
		vAP(gl,atts["aSvec"], 3,gl.FLOAT, false, offset, 6*4);
		vAP(gl,atts["aTvec"], 3,gl.FLOAT, false, offset, 9*4);
		vAP(gl,atts["aUv"], 2,gl.FLOAT, false, offset, 12*4);
		vAP(gl,atts["aEnvRatio"], 1,gl.FLOAT, false, offset, 14*4);
		vAP(gl,atts["aUv2"], 2,gl.FLOAT, false, offset, 15*4);
		vAP(gl,atts["aLightProbe"], 3,gl.FLOAT, false, offset, 17*4);

		gl.uniform1i(unis["uEnvIndex"],envIdx);

		var oldEnv=null;
		var transTexture = this.transTextures[this.transTextureIndex];

		gl.uniform3fv(unis["anglePos"],fa);
		gl.uniformMatrix3fv(unis["uViewMat"],false,mat);
		var dif=(this.lightThreshold2-this.lightThreshold1);
		if(dif<0.01){
			dif=0.01;
		}
		gl.uniform1f(unis["lightThreshold1"],this.lightThreshold1);
		gl.uniform1f(unis["lightThreshold2"],1./dif);
		while(i<start+size){
			var j=i;
			var env = arr[i].environments[envIdx];

			if(i==start || arr[i].environments[envIdx] != arr[Math.max(i-1,0)].environments[envIdx]){
				var environment = arr[i].environments[envIdx];
				gl.uniform3f(unis["uLight"],environment.sun.matrix[8],environment.sun.matrix[9],environment.sun.matrix[10]);
				gl.uniform3fv(unis["uLightColor"],environment.sun.color);

			//	Mat44.copy(fa16,environment.sun.viewmatrix);

				gl.uniform3fv(unis["uAmbColor"],new Float32Array(environment.area.color));

				var lightSource = environment.sun;
				gl.uniformMatrix4fv(unis["lightMat"],false,lightSource.viewmatrix);

				gl.activeTexture(gl.TEXTURE1);
				if(globalParam.shadow){
					gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture.glTexture);
				}else{
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
				}
				gl.uniform1i(unis["uShadowmap"],1);
				gl.activeTexture(gl.TEXTURE3);

				//反射マップ
				gl.activeTexture(gl.TEXTURE3);
				if(environment.envTexture){
					gl.bindTexture(gl.TEXTURE_2D,environment.envTexture.glTexture);
				}else{
					if(env.envTexture){
						gl.bindTexture(gl.TEXTURE_2D,env.envTexture.glTexture);
					}else{
						gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
					}
				}
				gl.uniform1i(unis["uEnvMap"],3);

				//透過マップ
				gl.activeTexture(gl.TEXTURE4);
				if(transTexture){
					gl.bindTexture(gl.TEXTURE_2D,transTexture.glTexture);
				}else{
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
				}
				gl.uniform1i(unis["uTransMap"],4);

			}

			var materialIndex = arr[i].materialIndex;
			for(j=i+1;j<start+size;j++){
				if(arr[j].materialIndex !== materialIndex){break;}
			}
			material = arr[i].material;
			
			if(j>i){
				gl.uniform3f(unis["uBaseCol"],material.baseColor[0],material.baseColor[1],material.baseColor[2]);
				gl.uniform1f(unis["uOpacity"],material.opacity );
				gl.uniform1f(unis["uEmi"],material.emt);
				gl.uniform1f(unis["uMetallic"],material.metallic);
				//反射強度,反射ラフネス,透過ラフネス,屈折率
				gl.uniform4f(unis["uPbr"],material.specular,material.roughness,material.subRoughness,material.ior);

				gl.activeTexture(gl.TEXTURE0); //カラーテクスチャ
				gl.uniform1i(unis["uBaseColMap"],0);
				if(material.baseColorMap){
					gl.bindTexture(gl.TEXTURE_2D,material.baseColorMap.glTexture);
				}else{
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
				}

				gl.activeTexture(gl.TEXTURE2); //ノーマルマップ
				gl.uniform1i(unis["uNormalMap"],2);
				if(material.hightMap){
					gl.bindTexture(gl.TEXTURE_2D,material.hightMap.glTexture);
					gl.uniform1f(unis["uNormpow"],material.hightMapPower);
					gl.uniform1f(unis["uHeightBase"],material.hightBase);
				}else{
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
					gl.uniform1f(unis["uNormpow"],0);
					gl.uniform1f(unis["uHeightBase"],0.5);
				}

				gl.activeTexture(gl.TEXTURE5); //そのたマップ
				gl.uniform1i(unis["uPbrMap"],5);
				if(material.pbrMap){
					gl.bindTexture(gl.TEXTURE_2D,material.pbrMap.glTexture);
					gl.uniform1f(unis["uPbrPow"],1.0);
				}else{
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
					gl.uniform1f(unis["uPbrPow"],0);
				}

				//ライトマップ
				gl.activeTexture(gl.TEXTURE6);
				if(material.lightMap){
					gl.bindTexture(gl.TEXTURE_2D,material.lightMap.glTexture);
				}else{
					//if(!environment.lightProbe){
					//	i=j;
					//	continue;
					//}
					//gl.bindTexture(gl.TEXTURE_2D,environment.lightProbe.glTexture); 
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
				}
				gl.uniform1i(unis["uLightMap"],6);

				var pvMatrix = this.pvMatrix;
				this.stereoDraw(function(){
					gl.uniformMatrix4fv(unis["projectionMatrix"],false,pvMatrix);
					gl.drawElements(gl.TRIANGLES, (j-i)*3, gl.UNSIGNED_SHORT, i*3*2);
					//gl.drawArrays(gl.TRIANGLES, i*3, (j-i)*3);
				});
			}

			i=j;
		}
	}

ret.calcST = function(s,t,p0,p1,p2,u0,v0,u1,v1,u2,v2){
	var du1=u1-u0;
	var dv1=v1-v0;
	var du2=u2-u0;
	var dv2=v2-v0;
	var dx1=p1[0]-p0[0];
	var dy1=p1[1]-p0[1];
	var dz1=p1[2]-p0[2];
	var dx2=p2[0]-p0[0];
	var dy2=p2[1]-p0[1];
	var dz2=p2[2]-p0[2];

	var d2=du1*dv2-du2*dv1;
	if(d2===0){
	}else{
		d2=1/d2;
		s[0]=-(dv1*dx2-dv2*dx1)*d2;
		s[1]=-(dv1*dy2-dv2*dy1)*d2;
		s[2]=-(dv1*dz2-dv2*dz1)*d2;
		t[0]=(du1*dx2-du2*dx1)*d2;
		t[1]=(du1*dy2-du2*dy1)*d2;
		t[2]=(du1*dz2-du2*dz1)*d2;
	}
	return false;
}

	ret.loadShader=function(path,func){
		var s={};
		Util.loadText(path,function(txt){
			try{
				
				var shader = Ono3d.createShader(txt);
				shader.name = path;
				var keys =Object.keys(shader);
				for(var i=0;i<keys.length;i++){
					s[keys[i]] =shader[keys[i]]
				}
				
			}catch(e){
				alert(path+"\n"+e.message);
			}
		});
		return s;
	}


	ret.createMainShader=function(num){
		var shader;
		try{
			var options=["lightmap","transmission","reflect","height","pbr"];
			var txt=Ono3d.main_shader_code;
			for(var j=0;j<options.length;j++){
				if(num&(1<<j)){
					var re = new RegExp("/\\*\\[" + options[j] +"\\]","g");
					txt=txt.replace(re,"");
					re = new RegExp("\\[" + options[j] +"\\]\\*/","g");
					txt=txt.replace(re,"");
					
				}else{
					var re = new RegExp("/\\*\\[" + options[j] +"\\][\\s\\S]*?\\[" + options[j] +"\\]\\*/","g");

					txt=txt.replace(re,"");
				}
			}
			if(!(num&1)){
				var re = new RegExp("/\\*\\[" + "lightprobe" +"\\]","g");
				txt=txt.replace(re,"");
				re = new RegExp("\\[" + "lightprobe" +"\\]\\*/","g");
				txt=txt.replace(re,"");
				
			}else{
				var re = new RegExp("/\\*\\[lightprobe\\][\\s\\S]*?\\[lightprobe\\]\\*/","g");
				txt=txt.replace(re,"");
			}
			shader = Ono3d.createShader(txt);
			shader.name = "main_"+ num;
		}catch(e){
			alert(path+"\n"+e.message);
		}
		return shader
	}
	ret.loadMainShader=function(){
		var path=currentpath+"shader/main.shader?4"
		Util.loadText(path,function(txt_org){

			Ono3d.main_shader_code=txt_org;
			for(var i=0;i<(1<<5);i++){
				var shader = Ono3d.createMainShader(i);
				shaders[shader.name]= shader;
			}
		});
		return ;
	}

	ret.prototype.drawLine=function(start,size){
		if(size===0)return;

		var ono3d = this;
		var material;
		var lines=ono3d.lines;
		var shader = this.shaders["plain"];

		var i=0;

		var a= Vec4.poolAlloc();

		material = lines[start].material;
		Ono3d.encode(a,material.baseColor);

		gl.uniform4f(shader.unis["uColor"],a[0],a[1],a[2],a[3]);

		//if(!globalParam.windows){
		if(!globalParam.windows){
			gl.lineWidth(material.bold);
		}

		ono3d.stereoDraw(function(){
			gl.uniformMatrix4fv(shader.unis["projectionMatrix"],false,ono3d.pvMatrix);
			gl.drawArrays(gl.LINES, start*2, size*2);
		});
		
		Vec4.poolFree(1);
	}

	ret.copyImage= function(target,tx,ty,x,y,w,h){
		gl.bindTexture(gl.TEXTURE_2D, target.glTexture);
		gl.copyTexSubImage2D(gl.TEXTURE_2D,0,tx,ty,x,y,w,h);
	}
	ret.postEffect =function(src,u,v,w,h,sh){
		gl.disable(gl.DEPTH_TEST);
		gl.depthMask(false);

		if(!sh.program){
			return;
		}
		gl.useProgram(sh.program);

		var unis = sh.unis;
		var atts = sh.atts;

		if(unis["uUvScale"])gl.uniform2f(unis["uUvScale"],w,h);
		if(unis["uUvOffset"])gl.uniform2f(unis["uUvOffset"],u,v);
		if(unis["uUnit"])gl.uniform2f(unis["uUnit"],1.0/src.width,1.0/src.height);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,src.glTexture);
		gl.uniform1i(unis["uSampler"],0);

				
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
		gl.vertexAttribPointer(atts["aPos"], 2,gl.FLOAT, false,0 , 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);

		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}

	ret.packFloat = function (dst,src){ 
		var m = Math.max(src[0],Math.max(src[1],src[2])); 
		var idx = Math.ceil(Math.log(m+0.01)/Math.log(2.0)); 
		m = 1.0/Math.pow(2.0,idx);
		dst[0]=src[0]* m;
		dst[1]=src[1]* m;
		dst[2]=src[2]* m;
		dst[3]=(idx+128.0)/255.0; 
	} 
	ret.unpackFloat = function(dst,src){ 
		dst[0] = src[0] * (1 - (((src[3]>>7)&1)<<1));
		dst[1] = src[1] * (1 - (((src[3]>>6)&1)<<1));
		dst[2] = src[2]  *(1 - (((src[3]>>5)&1)<<1));
		var idx= Math.floor((src[3]&0x1f)  - 16.0); 
		var m = Math.pow(2.0,idx);
		dst[0] = dst[0]*m;
		dst[1] = dst[1]*m;
		dst[2] = dst[2]*m;
	} 
	ret.encode = function (dst,src){ 
		var m = Math.max(src[0],Math.max(src[1],src[2])); 
		var idx = Math.ceil(Math.log(m+0.01)/Math.log(2.0)); 
		m = 1.0/Math.pow(2.0,idx);
		dst[0]=src[0]* m;
		dst[1]=src[1]* m;
		dst[2]=src[2]* m;
		dst[3]=(idx+128.0)/255.0; 
	} 
	ret.decode2 = function(dst,src){ 
		var idx= Math.floor(src[2] * 256.0 - 128.0); 
		var idx2= Math.floor(src[3] * 256.0 - 128.0); 
		var m = Math.pow(2.0,idx);
		dst[0] = src[0]*Math.pow(2.0,idx);
		dst[1] = src[1]*Math.pow(2.0,idx2);
	} 

	/** 環境マップを背景として描画 **/
	ret.prototype.drawCelestialSphere= function(image,x,y,w,h){
		if(!w){
			x=0;
			y=0;
			w=1;
			h=1;
		}

		var shader = this.shaders["celestialsphere"];
		var mat44 = new Array(16);
			Mat44.copy(mat44,this.viewMatrix);
			mat44[12]=0;
			mat44[13]=0;
			mat44[14]=0;
			Mat44.dot(mat44,this.projectionMatrix,mat44);
			Mat44.getInv(mat44,mat44);
		gl.useProgram(shader.program);
		gl.uniformMatrix4fv(shader.unis["projectionMatrix"],false,new Float32Array(mat44));

		Ono3d.postEffect(image,x,y,w,h,shader); 
	}

	/** 単純な画像コピー **/
	ret.drawCopy= function(dx,dy,dw,dh,image,sx,sy,sw,sh){
		if(!sw){
			sh = image;
			image = dx;
			sx = dx = dy;
			sy = sy = dw;
			sw = dw = dh;
			dh = sh;
		}
		var shader = Rastgl.plainShader;
		var unis = shader.unis;

		gl.useProgram(shader.program);
		gl.uniform2f(unis["uPosScale"],dw,dh);
		gl.uniform2f(unis["uPosOffset"],dx,dy);

		Ono3d.postEffect(image,sx,sy,sw,sh,shader); 
	}

	/** 環境マップから拡散環境マップをつくる **/
	ret.prototype.rough=function(dst,rough,src,x,y,w,h){
		if(x==null){ x=0;y=0;w=1;h=1; }
		var shader=this.shaders["rough"];

		var width=dst.width;
		var height=dst.height;

		gl.viewport(0,0,width,height);
		
		gl.disable(gl.BLEND);
		gl.clearColor(0., 0., 0.,0.0);
		gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);



		gl.useProgram(shader.program);
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
		gl.vertexAttribPointer(shader.atts["aPos"], 2,gl.FLOAT, false,0 , 0);
		var unis = shader.unis;
		var max =1;
		if(rough==0.0){
			max=1;
		}
		if(rough>=1.0){
			rough=0.999;
		}

		gl.activeTexture(gl.TEXTURE1);
	 	gl.uniform1i(shader.unis["uDst"],1);
	 	gl.bindTexture(gl.TEXTURE_2D,dst.glTexture);
		
		gl.uniform1f(shader.unis["uRough"],1.0-Math.cos(rough*Math.PI*0.5));
		//gl.uniform1f(shader.unis["uRough"],0.0);
		for(var i=0;i<max;i++){
			gl.uniform1f(shader.unis["uSeed"],Math.random()*15.7);
			gl.uniform1f(shader.unis["uPow"],1.0/(i+1.0));
			//gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			Ono3d.postEffect(src,x,y,w,h,shader); 

			Ono3d.copyImage(dst,0,0,0,0,width,height);
	
		}
		

	}

	/** ガウスぼかし **/
	ret.gauss=function(width,height,d,src,x,y,w,h){
		//係数作成
		var weight = new Array(5);
		var t = 0.0;
		for(var i = 0; i < weight.length; i++){
			var r = 1.0 + 2.0 * i;
			var we = Math.exp(-0.5 * (r * r) / d);
			weight[i] = we;
			if(i > 0){we *= 2.0;}
			t += we;
		}
		for(i = 0; i < weight.length; i++){
			weight[i] /= t;
		}
		var shader = shaders["gauss"];
		var args=shader.unis;

		gl.useProgram(shader.program);

		gl.uniform1fv(args["weight"],weight);
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);

		//横ぼかし
		gl.uniform2f(args["uAxis"],1/width*w,0);
		Ono3d.postEffect(src,x,y,w,h,shader); 

		Ono3d.copyImage(src,0,0,0,0,width,height);


		//縦ぼかし
		gl.uniform2f(args["uAxis"],0,1/src.height);
		Ono3d.postEffect(src,0,0,width/src.width,height/src.height,shader); 
	}

	/** 法線マップ初期設定 (ハイトマップから法線マップに変換する)**/
	ret.initNormal=function(src){
		var shader = shaders["normal"];
		

		gl.bindTexture(gl.TEXTURE_2D, src.glTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		gl.useProgram(shader.program);

		Ono3d.postEffect(src,0,0,1,1,shader); 
		Ono3d.copyImage(src,0,0,0,0,src.width,src.height);
		//this.setViewport(0,0,512,1024);
		//Ono3d.gauss(src.width,src.height,100
		//	,src,0,0,1.0,1.0,src.width,src.height); 
		//Ono3d.copyImage(transTexture,0,0,0,0,512,1024);

	}


	/** (x,y,z)座標でキューブマップ作成 **/
	ret.prototype.createCubeMap= function(image,x,y,z,size,func){
		this.setViewport(0,0,size,size);
		gl.bindFramebuffer(gl.FRAMEBUFFER,null);

		this.setAov(1.0);

		var WIDTH=this.viewport[2];
		var HEIGHT=this.viewport[3];
		this.calcProjectionMatrix(this.projectionMatrix,this.aov*this.znear,this.aov*HEIGHT/WIDTH*this.znear
				,this.znear,this.zfar);
		//前、右
		Mat44.set(this.viewMatrix,-1,0,0,0, 0,1,0,0, 0,0,-1,0, x,-y,z,1);
		func(0,0,size,size);
		Mat44.set(this.viewMatrix,0,0,1,0, 0,1,0,0, -1,0,0,0, z,-y,-x,1);
		func(size,0,size,size);
		Ono3d.copyImage(image,0,size,0,0,size*2,size);

		//後、左
		Mat44.set(this.viewMatrix,1,0,0,0, 0,1,0,0, 0,0,1,0, -x,-y,-z,1);
		func(0,0,size,size);
		Mat44.set(this.viewMatrix,0,0,-1,0, 0,1,0,0, 1,0,0,0, -z,-y,x,1);
		func(size,0,size,size);
		Ono3d.copyImage(image,size*2,size,0,0,size*2,size);

		//下、上
		Mat44.set(this.viewMatrix,-1,0,0,0, 0,0,1,0, 0,1,0,0, x,-z,-y,1);
		func(0,0,size,size);
		Mat44.set(this.viewMatrix,-1,0,0,0, 0,0,-1,0, 0,-1,0,0, x,z,y,1);
		func(size,0,size,size);

		Ono3d.copyImage(image,0,0,0,0,size*2,size);

		//y軸反転
		gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
		var y = size*2/image.height;
		var x = size*4/image.width;
		this.setViewport(0,0,size*4,size*2);
		Ono3d.drawCopy(0,0,1,1,image,0,y,x,-y);
		Ono3d.copyImage(image,0,0,0,0,size*4,size*2);

		
	}
	ret.prototype.createEnv = function(tex,x,y,z,func){
		var size = 256;
		if(!tex){
			tex =Ono3d.createTexture(size,size);
		}
		var envBuf = this.envbufTexture;

		gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

		//キューブマップ作成
		this.createCubeMap(envBuf,x,y,z,size,func);
		


		//極座標化
		gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
		this.setViewport(0,0,size,size*0.5);
		Ono3d.postEffect(envBuf,0,0,1,1,shaders["cube2polar"]); 
		Ono3d.copyImage(tex,0,0,0,0,size,size*0.5);

		var texsize=tex.width;
		var width=texsize;
		var height=texsize*0.5;

		width>>=1;
		height>>=1;

		var envs=[0.06,0.24,0.54,1.0]; //i^2*0.06
		for(var i=0;i<envs.length;i++){
			var rough=envs[i];
			var tex2 = Ono3d.createTexture(width,height);
			gl.bindTexture(gl.TEXTURE_2D,tex2.glTexture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

			this.setViewport(0,0,width,height);
			this.rough(tex2,rough,tex,0,0,1,0.5);

			Ono3d.gauss(width,height,10,tex2,0,0,1,1,width,height); 

			Ono3d.copyImage(tex2,0,0,0,0,width,height);
			

			Ono3d.copyImage(tex,0,texsize-height*2,0,0,width,height);
			Ono3d.copyImage(tex,width,texsize-height*2,0,0,width,height);
			Ono3d.copyImage(tex,texsize-width,texsize-height*2,0,0,width,height);
			width>>=1;
			height>>=1;

			gl.deleteTexture(tex2.glTexture);
		}
		
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		return tex;
	}
	ret.prototype.setLine=function(p0,p1,material){
		//線追加
		var renderLine =this.lines[this.lines_index];
		renderLine.material=material;
		this.lines_index++;
		Vec3.copy(renderLine.pos[0],p0);
		Vec3.copy(renderLine.pos[1],p1);
	}
		
		
	return ret

})()

