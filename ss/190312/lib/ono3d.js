"use strict"
var Ono3d = (function(){
	var mainshader=null;
	var gl;
	var shaders;
	var currentpath = Util.getCurrent();
	var
		i
		
		,RF_OUTLINE=i=1
		,RF_DOUBLE_SIDED=++i

	;
	var DEFAULT_VERTEX_DATA_SIZE = 17*4;
	var TEXSIZE =1024;
	var LightSource= function(){
		this.matrix= new Mat44()
		this.viewmatrix= new Mat44()
		this.color = new Vec3()
		this.type
		this.power =1
	}

	var Environment=function(){
		this.name="";
		this.envTexture ="";
		this.lightMap=null;
		this.sun = new LightSource();
		this.area = new LightSource();
	}
	var Material =function(){
		this.name="";
		this.baseColor =new Vec3();//乱反射色 
		this.opacity = 1.0; //不透明度
		this.baseColorMap =null; //ベースカラーテクスチャ
		this.metallic= 0.0; //全反射強度
		this.metalColor = new Vec3();//反射色
		this.roughness =1.0; //反射粗度
		this.ior = 0.0; //屈折率
		this.subRoughness = 0.0; //透明粗度
		this.emt=0.0; //自己発光強度
		this.pbrMap=null; //pbrテクスチャ

		this.hightMap=null; //法線マップテクスチャ
		this.hightMapPower=0.0; //法線マップ強度
		this.offsetx=0.0; //uvオフセット
		this.offsety=0.0; //
		this.uv="";

		this.bold=1.0; //太さ

		this.shader = ""; //シェーダ
	}
	var Face = function(){
		this.uv = new Array(3);
		this.uv[0]=new Vec2();
		this.uv[1]=new Vec2();
		this.uv[2]=new Vec2();
		this.normalmap=null;
		this.normalmapvalue=0;
		this.uv2 = new Array(3);
		this.uv2[0]=new Vec2();
		this.uv2[1]=new Vec2();
		this.uv2[2]=new Vec2();
		this.vertices=new Array(3);
		this.normal=new Vec3();
		this.material=0;
		
		this.environments=new Array(2);
		this.environmentRatio=0.0;
	}
	var Line = function(){
		this.bold=1;
		this.vertices=new Array(2);
		this.material=0;
	};

	var Vertex = function(){
		this.pos = new Vec3();
		this.normal = new Vec3();
	};
	

	

	var Ono3d = function(){
		this.rf = 0
		this.smoothing = 0
		this.viewMatrix=new Mat44()
		this.worldMatrix=new Mat44()
		this.targetMatrix = this.worldMatrix
		this.projectionMatrix=new Mat44();
		this.pvMatrix=new Array(16);//new Mat44()
		this.persx
		this.persy
		this.lines_index = 0
		this.vertices_index = 0
		this.vertex_carent = 0
		this.viewport = new Array(4);
		this.znear=1;
		this.zfar=80;
		this.aov=1;

		this.renderTarget
		this.canvasTarget

		this.bold=1.0
		this.lineColor=new Vec4();

		this.transTexture=null;
		this.env2Texture=null;
		this.shadowTexture=null;
		this.emiTexture=null;
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


		this.vertices = new Array(RENDERFACES_MAX)
		for(i=this.vertices.length;i--;){
			this.vertices[i] = new Vertex()
			this.vertices[i].idx=i;
		}


		this.stackTransMatrix=new Array()
		this.stackIndex=0
		for(var i=32;i--;)this.stackTransMatrix.push(new Mat44())

		this.clear();

	}
	var ret = Ono3d;

	ret.Material = Material;


	ret.RF_OUTLINE=RF_OUTLINE
	ret.RF_DOUBLE_SIDED=RF_DOUBLE_SIDED

	
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
			this.clear()

			this.renderTarget=_ctx
			this.canvasTarget=_canvas

			this.transTexture = Ono3d.createTexture(TEXSIZE,TEXSIZE);
			this.env2Texture= Ono3d.createTexture(TEXSIZE,TEXSIZE);
			this.shadowTexture = Ono3d.createTexture(TEXSIZE,TEXSIZE);
			this.averageTexture = Ono3d.createTexture(512,512);
			this.emiTexture = Ono3d.createTexture(512,512);
			this.envbufTexture = Ono3d.createTexture(1024,512);
			gl = Rastgl.gl;

			this.shaders=[];
			shaders = this.shaders;

			var filenames=["add","average","average2","average3","fill","glass","main","test","decode","shadow","plain","n1s","n2s","cube2polar","rough","celestialsphere","envset","gauss","normal"];
			for(var i=0;i<filenames.length;i++){
				this.shaders[filenames[i]]=(Ono3d.loadShader(currentpath+"shader/"+filenames[i] + ".shader"));
			}

			mainshader= this.shaders["main"];

			   

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
		,getProjectionMatrix(mat){
			var persx = this.aov;
			var persy = this.aov * this.viewport[3]/this.viewport[2];
			var zn=this.znear;
			var zf=this.zfar;

			Mat44.set(mat
				,1/persx,0,0,0
				,0,1/persy,0,0
				,0,0,-(zn+zf)/(zf-zn),-1.0
				,0,0,-2*zn*zf/(zf-zn),0);
		}

		,setPers:function(x,y,zn,zf){
			if(zn==null){
				zn=this.znear;
				zf=this.zfar;
			}
			
			if(x>0)this.persx = x;
			if(y>0)this.persy = this.persx*y;
			Mat44.set(this.projectionMatrix
				,1/this.persx,0,0,0
				,0,1/this.persy,0,0
				,0,0,-(zn+zf)/(zf-zn),-1.0
				,0,0,-2*zn*zf/(zf-zn),0);
		}
		,ortho:function(mat,x,y,zn,zf){
			
			Mat44.set(mat
			,-1.0/x,0,0,0
			,0,1.0/y,0,0.0
			,0,0,2.0/(zf-zn),0.0
			,0,0,-(zf+zn)/(zf-zn),1.0);
		}
		,setOrtho:function(x,y,zn,zf){
			
			Mat44.set(this.projectionMatrix
			,-1.0/x,0,0,0
			,0,1.0/y,0,0.0
			,0,0,2.0/(zf-zn),0.0
			,0,0,-(zf+zn)/(zf-zn),1.0);
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

	ret.prototype.clear= function(){
		this.faces_index=0;
		//Face.poolIndex=0;
		//this.faces=[];
		this.lines_index=0
		//Line.poolIndex=0;
		//this.lines=[];
		this.vertices_index=0
		this.materials_index=0;
		//this.environments_index=0;
	};

	ret.prototype.addFace=function(){
		var face = Face.poolAlloc();
		this.faces.push(face);
		return face;

	}
	ret.prototype.addLine=function(){
		var line = Line.poolAlloc();
		this.lines.push(line);
		return line;

	}

	ret.prototype.stereoDraw = function(func){
		var x=this.viewport[0];
		var y=this.viewport[1];
		var WIDTH=this.viewport[2];
		var HEIGHT=this.viewport[3];

		if(globalParam.stereomode==0){
			globalParam.gl.viewport(x,y,WIDTH,HEIGHT);
			this.getProjectionMatrix(this.projectionMatrix);
			Mat44.dot(this.pvMatrix,this.projectionMatrix,this.viewMatrix);
			func();
		}else{
			var p=1.0;
			var q=(1-p)*0.5;
			var stereo;
			WIDTH =WIDTH/2;
			globalParam.gl.viewport(WIDTH*q,HEIGHT*q,WIDTH*p,HEIGHT*p);
			stereo=globalParam.stereo;
			this.setPers(this.aov,HEIGHT/WIDTH);
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
	ret.prototype.render = function(camerap,customMaterial){

		var ono3d = this;

		var i32a = new Array(4);
		i32a[0] = ono3d.viewport[0];
		i32a[1] = ono3d.viewport[1];
		i32a[2] = ono3d.viewport[2];
		i32a[3] = ono3d.viewport[3];
		var svec = Vec3.poolAlloc();
		var tvec = Vec3.poolAlloc();

		
		//マテリアルリストをシェーダごとに分ける
		Sort.qSort(this.materials,0,this.materials_index-1
			,function(a,b){return ((a.opacity === 1.0) && (b.opacity !== 1.0) || (a.shader < b.shader))?-1
				:((a.opacity !==1.0) && (b.opacity ===1.0) || (a.shader > b.shader))?1:0;})

		var materialIndexes = [];

		//描画ポリゴンをマテリアル,環境 順に並べる
		var faces = ono3d.faces;
		var facesize=ono3d.faces_index;
		for(var i=0;i<this.materials_index;i++){
			this.materials[i].index = i;
		}
		for(var i=0;i<this.environments_index;i++){
			this.environments[i].index = i;
		}
		for(var i=0;i<facesize;i++){
			faces[i].materialIndex = (faces[i].material.opacity !== 1.0) *(0x1 << 8+8+8)
			 + (faces[i].environments[1].index<<(8+8))
			 + (faces[i].environments[0].index<<8)
			 + faces[i].material.index ;
		}
		//faces.sort(function(a,b){return a.materialIndex-b.materialIndex;});
		Sort.qSort(faces,0,facesize-1,function(a,b){return a.materialIndex-b.materialIndex;});

		var posindex=0;
		var normalindex=3;
		var sindex=6;
		var tindex=9;
		var uvindex=12;

		var envratioindex=14;
		var uv2_index=15;

		var voffset=17;
		var vindex=0;

		var oldIndex=-1;
		var linesize = ono3d.lines_index;

		//GPUに渡すバッファを取得
		var buff = Rastgl.getJsBuffer(facesize*3*voffset + linesize*6);
		if(buff.length<facesize*3*voffset + linesize*6){
			//バッファオーバーしていたらポリゴン削る(暫定)
			if(buff.length<facesize*3*voffset){
				linesize=0;
				facesize=buff.length/(3*voffset);
			}else{
				linesize=0;
			}
		}

		//バッファにデータをセット
		for(var i=0;i<facesize;i++){
			var renderface = faces[i];
			var uv = renderface.uv;
			var uv2 = renderface.uv2;
			var material = renderface.material;
			if(oldIndex != renderface.materialIndex){
				materialIndexes.push(i);
				oldIndex = renderface.materialIndex
			}

			var smoothing=renderface.smoothing
			var vertices = renderface.vertices;
			var nx = renderface.normal[0] * (1-smoothing);
			var ny = renderface.normal[1] * (1-smoothing);
			var nz = renderface.normal[2] * (1-smoothing);

			if(material.normalmap || 1){
				if(calcST(svec,tvec
					,vertices[0].pos
					,vertices[1].pos
					,vertices[2].pos
					,renderface.uv[0][0]
					,renderface.uv[0][1]
					,renderface.uv[1][0]
					,renderface.uv[1][1]
					,renderface.uv[2][0]
					,renderface.uv[2][1]
				)){
					Vec3.set(svec,-renderface.normal[1],renderface.normal[2],renderface.normal[0]);
					Vec3.set(tvec,renderface.normal[2],-renderface.normal[0],renderface.normal[1]);
				}
			}else{
				Vec3.set(svec,-renderface.normal[1],renderface.normal[2],renderface.normal[0]);
				Vec3.set(tvec,renderface.normal[2],-renderface.normal[0],renderface.normal[1]);
			}


			for(var j=0;j<3;j++){
				//ポリゴンの3点セット

				var vertex=vertices[j];
				buff[posindex+vindex]=vertex.pos[0]
				buff[posindex+vindex+1]=vertex.pos[1]
				buff[posindex+vindex+2]=vertex.pos[2]
				buff[normalindex+vindex]=vertex.normal[0] * smoothing + nx
				buff[normalindex+vindex+1]=vertex.normal[1] * smoothing + ny
				buff[normalindex+vindex+2]=vertex.normal[2] * smoothing + nz
				buff[uvindex+vindex]=uv[j][0]
				buff[uvindex+vindex+1]=uv[j][1]

				buff[sindex+vindex]=svec[0]
				buff[sindex+vindex+1]=svec[1]
				buff[sindex+vindex+2]=svec[2]
				buff[tindex+vindex]=tvec[0]
				buff[tindex+vindex+1]=tvec[1]
				buff[tindex+vindex+2]=tvec[2]

				buff[envratioindex+vindex]=renderface.environmentRatio ;

				buff[uv2_index+vindex]=uv2[j][0]
				buff[uv2_index+vindex+1]=uv2[j][1]

				vindex+=voffset;
			}


		}
		materialIndexes.push(facesize);

		Vec3.poolFree(2);
		
		//線データセット
		var lines = ono3d.lines;
		for(var i=0;i<linesize;i++){
			lines[i].materialIndex = lines[i].material.index ;
		}
		Sort.qSort(lines,0,this.lines_index-1,function(a,b){return a.materialIndex-b.materialIndex;});

		var vertex;
		var lineoffset = facesize*3*voffset;
		for(var i=0;i<linesize;i++){
			var idx = i*6 + lineoffset;
			vertex=lines[i].vertices[0]
			buff[idx]=vertex.pos[0]
			buff[idx+1]=vertex.pos[1]
			buff[idx+2]=vertex.pos[2]
			vertex=lines[i].vertices[1]
			buff[idx+3]=vertex.pos[0]
			buff[idx+4]=vertex.pos[1]
			buff[idx+5]=vertex.pos[2]
		}
		

		//データをGPUに転送
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, buff);



//シャドウマップ描画
		var lightSource= null;

		if(globalParam.shadow){
			lightSource = this.environments[0].sun;
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER,Rastgl.frameBuffer);
		this.setViewport(0,0,1024,1024);
		gl.clearColor(1., 1., 1.,1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		if(lightSource && facesize){
			var shader =  this.shaders["shadow"];
			var f32a = new Float32Array(16);

			gl.useProgram(shader.program);
			gl.depthMask(true);
			gl.enable(gl.DEPTH_TEST);
			gl.cullFace(gl.BACK);
			gl.disable(gl.BLEND);

			for(var i=0;i<16;i++){
				f32a[i] = lightSource.viewmatrix[i];
			}

			gl.uniformMatrix4fv(shader.unis["projectionMatrix"],false,f32a);
			gl.vertexAttribPointer(shader.atts["aPos"], 3,gl.FLOAT, false,DEFAULT_VERTEX_DATA_SIZE , 0);

			//gl.drawElements(gl.TRIANGLES, arrlength*3, gl.UNSIGNED_SHORT, 0);
			gl.drawArrays(gl.TRIANGLES, 0, facesize*3);
		}
		Ono3d.copyImage(this.shadowTexture,0,0,0,0,1024,1024);


		
		globalParam.stereo=-globalParam.stereoVolume * globalParam.stereomode*0.4;
		
		//シェーダごとにレンダリング
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.depthMask(true);
		gl.enable(gl.DEPTH_TEST);
		this.setViewport(i32a[0],i32a[1],i32a[2],i32a[3]);

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
		if(customMaterial){
			if(customMaterial.opacity === 1.0){
				this.renderShader(0,facesize,customMaterial,0);
			}else{
				opacityIndex=0;
			}

		}else{
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
					,null,0);
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
				Ono3d.copyImage({glTexture:Rastgl.fTexture},0,0,i32a[0],i32a[1],i32a[2],i32a[3]);

				gl.clearColor(0.0,0.0,0.0,0.0);
				gl.clear(gl.COLOR_BUFFER_BIT);

				for(var i=idx;i<opacityIndex;i++){
					var j=i+1;
					for(;j<opacityIndex;j++){
						if(faces[materialIndexes[i]].material.shader 
							!= faces[materialIndexes[j]].material.shader){
							break;
						}
					}
					this.renderShader(materialIndexes[i]
						,materialIndexes[j]-materialIndexes[i]
						,null,1);
					i=j-1;
				}


				Ono3d.copyImage(this.env2Texture,0,0,i32a[0],i32a[1],i32a[2],i32a[3]);


				//合成
				var addShader = this.shaders["add"];

				gl.useProgram(addShader.program);
				gl.uniform1i(addShader.unis["uSampler2"],1);
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D,this.env2Texture);
				gl.uniform1f(addShader.unis["v1"],1.0);
				gl.uniform1f(addShader.unis["v2"],1.0);
				
				gl.disable(gl.DEPTH_TEST);
				gl.viewport(i32a[0],i32a[1],i32a[2],i32a[3]);
				Ono3d.postEffect({glTexture:Rastgl.fTexture},0,0 ,i32a[2]/1024,i32a[3]/1024,addShader); 

				gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
			}

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
			if(lines[i].material.opacity !==1.0 && !customMaterial){
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
		var transTexture = this.transTexture;
		Ono3d.copyImage(transTexture,0,0,i32a[0],i32a[1],i32a[2],i32a[3]);

		gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
		gl.disable(gl.DEPTH_TEST);
		var size=TEXSIZE;
		gl.disable(gl.BLEND);
		for(var i=1;i<4;i++){
			size>>=1;
			gl.viewport(0,0,size,size*0.5);
		
			this.gauss(size,size*0.5,100
				,transTexture,0,(TEXSIZE-size*2)/TEXSIZE,size*2/TEXSIZE,size/TEXSIZE,TEXSIZE,TEXSIZE);
			Ono3d.copyImage(transTexture,0,1024-size,0,0,size,size*0.5);
		}
		size>>=1;
		var s=Math.pow(0.5,4);
		//gl.viewport(0,0,i32a[2]*s,i32a[3]*s*0.5);
		gl.viewport(0,0,TEXSIZE*s,TEXSIZE*s*0.5);

		var environment=this.environments[0];
		//Env2D.draw(environment.envTexture.glTexture,0,1-s,s,s*0.5);
		this.drawCelestialSphere(environment.envTexture,0,1-s,s,s*0.5);
		Ono3d.copyImage(transTexture,0,(1-s)*TEXSIZE,0,0,TEXSIZE*s,TEXSIZE*s*0.5);
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		Ono3d.copyImage(transTexture,0,0,0,0,i32a[2],i32a[3]);



		//透明ポリゴン描画
		gl.viewport(i32a[0],i32a[1],i32a[2],i32a[3]);

		gl.enable(gl.DEPTH_TEST);
		gl.depthMask(true);

		gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
		gl.disable(gl.BLEND);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);

		if(customMaterial){
			this.renderShader(0,facesize,customMaterial,0);
		}else{
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
					,null,0);
				i=j-1;
			}
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
				gl.bindTexture(gl.TEXTURE_2D, null);
				image.bumpInitFlg=true;
			}

			if(func){
				func(image);
			}
		});
	}
	ret.createShader2= function(txt){
		var shader={};
		
		txt=txt.replace("[common]",Rastgl.commonFunction + Rastgl.textureRGBE);
		var sss=txt.match(/\[vertexshader\]([\s\S]*)\[fragmentshader\]([\s\S]*)/);
		var vs = sss[1];
		var fs = sss[2];
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

	ret.prototype.renderShader=function(start,size,customMaterial,envIdx){
		var arr = this.faces;
		var i=start;
		var material = arr[start].material;
		if(customMaterial){
			material = customMaterial;
		}

		var name = material.shader;

		var shader = this.shaders[name];
		if(!shader){
			shader=mainshader;
		}
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

		gl.uniform1i(unis["uEnvIndex"],envIdx);

		var oldEnv=null;

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
				gl.uniform3fv(unis["uLightColor"],new Float32Array(environment.sun.color));

				Mat44.copy(fa16,environment.sun.viewmatrix);

				gl.uniform3fv(unis["uAmbColor"],new Float32Array(environment.area.color));

				gl.uniformMatrix4fv(unis["lightMat"],false,fa16);

				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture.glTexture);
				gl.uniform1i(unis["uShadowmap"],1);
				gl.activeTexture(gl.TEXTURE3);

				//反射マップ
				gl.activeTexture(gl.TEXTURE3);
				if(environment.envTexture){
					gl.bindTexture(gl.TEXTURE_2D,environment.envTexture.glTexture);
				}else{
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
				}
				gl.uniform1i(unis["uEnvMap"],3);

				//透過マップ
				gl.activeTexture(gl.TEXTURE4);
				if(this.transTexture){
					gl.bindTexture(gl.TEXTURE_2D,this.transTexture.glTexture);
				}else{
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
				}
				gl.uniform1i(unis["uTransMap"],4);

				//ライトマップ
				gl.activeTexture(gl.TEXTURE6);
				if(environment.lightMap){
					gl.bindTexture(gl.TEXTURE_2D,environment.lightMap.glTexture);
				}else{
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
				}
				gl.uniform1i(unis["uLightMap"],6);
			}

			if(customMaterial){
				j=start+size;
				material = customMaterial;

			}else{
				var materialIndex = arr[i].materialIndex;
				for(j=i+1;j<start+size;j++){
					if(arr[j].materialIndex !== materialIndex){break;}
				}
				material = arr[i].material;
			}
			if(j>i){
				gl.uniform3f(unis["uBaseCol"],material.baseColor[0],material.baseColor[1],material.baseColor[2]);
				gl.uniform1f(unis["uOpacity"],material.opacity );
				gl.uniform1f(unis["uEmi"],material.emt);
				//反射強度,反射ラフネス,透過ラフネス,屈折率
				gl.uniform4f(unis["uPbr"],material.metallic,material.roughness,material.subRoughness,material.ior);
				gl.uniform3f(unis["uReflectionColor"] ,material.metalColor[0] ,material.metalColor[1] ,material.metalColor[2]);

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
				}else{
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
					gl.uniform1f(unis["uNormpow"],0);
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
				var pvMatrix = this.pvMatrix;
				this.stereoDraw(function(){
					gl.uniformMatrix4fv(unis["projectionMatrix"],false,new Float32Array(pvMatrix));
					gl.drawArrays(gl.TRIANGLES, i*3, (j-i)*3);
				});
			}

			i=j;
		}
	}

var calcST = function(s,t,p0,p1,p2,u0,v0,u1,v1,u2,v2){
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

	var d2=(du1*dv2-du2*dv1);
	if(d2===0){
		return true;
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
			var shader = Ono3d.createShader2(txt);
			shader.name = path;
			var keys =Object.keys(shader);
			for(var i=0;i<keys.length;i++){
				s[keys[i]] =shader[keys[i]]
			}
			
			if(func){
				func(s);
			}
		});
		return s ;
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

		if(!globalParam.windows){
			gl.lineWidth(material.bold);
		}

		ono3d.stereoDraw(function(){
			gl.uniformMatrix4fv(shader.unis["projectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
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


		gl.useProgram(sh.program);

		var unis = sh.unis;
		var atts = sh.atts;

		if(unis["uUvScale"])gl.uniform2f(unis["uUvScale"],w,h);
		if(unis["uUvOffset"])gl.uniform2f(unis["uUvOffset"],u,v);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,src.glTexture);
		gl.uniform1i(unis["uSampler"],0);

				
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
		gl.vertexAttribPointer(atts["aPos"], 2,gl.FLOAT, false,0 , 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);

		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
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
	ret.decode = function(dst,src){ 
		var idx= Math.floor(src[3] * 256.0 - 128.0); 
		var m = Math.pow(2.0,idx);
		dst[0] = src[0]*m;
		dst[1] = src[1]*m;
		dst[2] = src[2]*m;
	} 
	ret.encode2 = function (dst,src){ 
		var idx = Math.ceil(Math.log(src[0]+0.01)/Math.log(2.0)); 
		var idx2 = Math.ceil(Math.log(src[1]+0.01)/Math.log(2.0)); 
			dst[0]=src[0]/Math.pow(2.0,idx);
			dst[1]=src[1]/Math.pow(2.0,idx2);
			dst[2]=(idx+128.0)/255.0; 
			dst[3]=(idx2+128.0)/255.0; 
		} 
	ret.decode2 = function(dst,src){ 
		var idx= Math.floor(src[2] * 256.0 - 128.0); 
		var idx2= Math.floor(src[3] * 256.0 - 128.0); 
		var m = Math.pow(2.0,idx);
		dst[0] = src[0]*Math.pow(2.0,idx);
		dst[1] = src[1]*Math.pow(2.0,idx2);
	} 

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
	ret.drawCopy= function(dx,dy,dw,dh,image,sx,sy,sw,sh){
		if(!sx){
			sh = image;
			image = dx;
			sx = dx = dy;
			sy = sy = dw;
			sw = dw = dh;
			dh = sh;
		}
		var shader = Rastgl.planeShader;
		var unis = shader.unis;

		gl.useProgram(shader.program);
		gl.uniform2f(unis["uPosScale"],dw,dh);
		gl.uniform2f(unis["uPosOffset"],dx,dy);

		Ono3d.postEffect(image,sx,sy,sw,sh,shader); 
	}

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
		var max =64;
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

	ret.prototype.gauss=function(width,height,d,src,x,y,w,h,srcWidth,srcHeight){
		if(x==null){
			if(x==null){ x=0;y=0;w=1;h=1;
				srcWidth = width;srcHeight=height;
			}
		}
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
		var shader = this.shaders["gauss"];
		var args=shader.unis;

		gl.useProgram(shader.program);

		gl.uniform2f(args["uAxis"],1/width,0);
		gl.uniform1fv(args["weight"],weight);
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
		Ono3d.postEffect(src,x,y,w,h,shader); 

		Ono3d.copyImage(src,0,0,0,0,width,height);


		gl.uniform2f(args["uAxis"],0,1/height);
		Ono3d.postEffect(src,0,0,width/srcWidth,height/srcHeight,shader); 
	}

	ret.initNormal=function(src){
		var shader = shaders["normal"];

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		gl.useProgram(shader.program);
		gl.uniform2f(shader.unis["uUnit"],1.0/src.width,1.0/src.height);

		Ono3d.postEffect(src,0,0,1,1,shader); 

	}

	ret.prototype.calcExpose = function(image,x,y,w,h){
		var averageTexture = this.averageTexture;
		//ピクセル毎の光度と最大値を取得
		gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
		this.setViewport(0,0,256,256);
		gl.bindTexture(gl.TEXTURE_2D,averageTexture.glTexture);
		Ono3d.postEffect(image,x,y,w,h,shaders["average"]); 
		Ono3d.copyImage(averageTexture,0,0,0,0,256,256);

		//1/2縮小を繰り返し平均と最大値を求める
		var size = 256;
		for(var i=0;size>1;i++){
			this.setViewport(0,0,size/2,size/2);
			Ono3d.postEffect(averageTexture ,0 ,0,size/512,size/512,shaders["average2"]); 
			Ono3d.copyImage(averageTexture,0,0,0,0,size/2,size/2);
			size/=2;
		}
		this.setViewport(0,511,1,1);
		Ono3d.postEffect(averageTexture ,0,511/512,1/512,1/512,shaders["average3"]); 
		Ono3d.copyImage(averageTexture,0,511,0,511,1,1);

	}
	ret.prototype.setExpose = function(level,upper){
		var a = new Vec4();
		Vec4.set(a,level,upper,0.5,0.5);
		gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
		this.setViewport(0,511,1,1);
		gl.useProgram(shaders["fill"].program);
		Ono3d.encode2(a,a);
		gl.uniform4f(shaders["fill"].unis["uColor"]
			,a[0],a[1],a[2],a[3]);
			
		Ono3d.postEffect(this.averageTexture,0,0,0,0,shaders["fill"]); 
		Ono3d.copyImage(this.averageTexture,0,511,0,511,1,1);
	}
	ret.prototype.toneMapping = function(image,w,h){
		var decodeShader = shaders["decode"];
		gl.useProgram(decodeShader.program);
		gl.uniform1i(decodeShader.unis["uSampler2"],1);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D,this.averageTexture.glTexture);
		Ono3d.postEffect(image,0,0 ,w,h,decodeShader); 
	}
	ret.prototype.bloom = function(image,exposure_bloom){
		var addShader = shaders["add"];
		var emiTexture = this.emiTexture;
		//合成
		gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);

		gl.useProgram(addShader.program);
		gl.uniform1i(addShader.unis["uSampler2"],1);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D,image.glTexture);
		gl.uniform1f(addShader.unis["v1"],0.0);
		gl.uniform1f(addShader.unis["v2"],exposure_bloom);
		
		var WIDTH = this.viewport[2];
		var HEIGHT= this.viewport[3];
		var emiSize=0.5;
		this.setViewport(0,0,WIDTH*emiSize,HEIGHT*emiSize);
		Ono3d.postEffect(emiTexture ,0,0 ,WIDTH/image.width,HEIGHT/image.height,addShader); 
		Ono3d.copyImage(emiTexture,0,0,0,0,WIDTH/2,HEIGHT/2);

		this.gauss(WIDTH*emiSize,HEIGHT*emiSize,100
			,emiTexture,0,0,WIDTH*emiSize/512,HEIGHT*emiSize/512,512,512); //光テクスチャをぼかす
		Ono3d.copyImage(emiTexture,0,0,0,0,WIDTH*emiSize,HEIGHT*emiSize);//結果を光テクスチャに書き込み

		//合成
		gl.bindFramebuffer(gl.FRAMEBUFFER,null );

		gl.useProgram(addShader.program);
		gl.uniform1i(addShader.unis["uSampler2"],1);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D,emiTexture.glTexture);
		gl.uniform1f(addShader.unis["v1"],1.0);
		gl.uniform1f(addShader.unis["v2"],1.0);

		this.setViewport(0,0,WIDTH,HEIGHT);
		Ono3d.postEffect(image,0,0 ,WIDTH/1024.0,HEIGHT/1024,addShader); 
	}

	ret.prototype.createEnv = function(x,y,z,func){
		var tex =Ono3d.createTexture(256,256);
		var envBuf = this.envbufTexture;

		gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

		gl.clearColor(0.0,0.0,0.0,1.0);
		gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
		this.setAov(1.0);

		//前、右
		Mat44.set(this.viewMatrix,-1,0,0,0, 0,-1,0,0, 0,0,-1,0, -x,-y,-z,1);
		func(0,0,256,256);
		Mat44.set(this.viewMatrix,0,0,1,0, 0,-1,0,0, -1,0,0,0, -x,-y,-z,1);
		func(256,0,256,256);
		Ono3d.copyImage(envBuf,0,0,0,0,256*2,256);

		//後、左
		Mat44.set(this.viewMatrix,1,0,0,0, 0,-1,0,0, 0,0,1,0, -x,-y,-z,1);
		func(0,0,256,256);
		Mat44.set(this.viewMatrix,0,0,-1,0, 0,-1,0,0, 1,0,0,0, -x,-y,-z,1);
		func(256,0,256,256);
		Ono3d.copyImage(envBuf,512,0,0,0,256*2,256);

		//下、上
		Mat44.set(this.viewMatrix,-1,0,0,0, 0,0,1,0, 0,-1,0,0, -x,-y,-z,1);
		func(0,0,256,256);
		Mat44.set(this.viewMatrix,-1,0,0,0, 0,0,-1,0, 0,1,0,0, -x,-y,-z,1);
		func(256,0,256,256);

		Ono3d.copyImage(envBuf,0,256,0,0,256*2,256);

		//極座標化
		gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
		this.setViewport(0,0,256,128);
		Ono3d.postEffect(envBuf,0,0,1,1,shaders["cube2polar"]); 
		Ono3d.copyImage(tex,0,0,0,0,256,128);

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


			this.gauss(width,height,10,tex2,0,0,1,1,width,height); 

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
		
	return ret

})()

