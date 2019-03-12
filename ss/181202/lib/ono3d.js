"use strict"
var Ono3d = (function(){
	var mainshader=null;
	var currentpath = Util.getCurrent();
	var
		i
		
		,nearClip = 1
		,farClip = 6

		,OP_POINT=i=1
		,OP_LINE=++i
		,OP_LINES=++i
		,OP_TRIANGLES=++i
		,OP_POLYGON=++i
		,OP_LINELOOP=++i

		,RF_SHADE=1<<(i=0)
		,RF_SMOOTH=1<<(++i)
		,RF_TOON=1<<(++i)
		,RF_LINE=1<<(++i)
		,RF_TEXTURE=1<<(++i)
		,RF_OUTLINE=1<<(++i)
		,RF_ENVMAP=1<<(++i)
		,RF_DOUBLE_SIDED = 1<<(++i)
		,RF_DEPTHTEST = 1<<(++i)
		,RF_PERSCOLLECT = 1<<(++i)
		,RF_PHONGSHADING= 1<<(++i)
		
		,LT_DIRECTION=i=1
		,LT_AMBIENT=++i
		
		,drawMethod=0
		,drawPolygon
	;
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
		this.sun = new LightSource();
		this.area = new LightSource();
	}
	var Material =function(){
		this.name="";
		this.normalmap=null; //法線マップ
		this.normalmapvalue=0.0; //法線マップ強度
		this.r=1.0; //ベースカラー
		this.g=1.0;
		this.b=1.0;
		this.a=1.0;
		this.texture=null; //ベースカラーテクスチャ
		this.offsetx=0.0; //uvオフセット
		this.offsety=0.0; //

		this.emt=0.0; //自己発光強度
		this.spc=0.0; //スペキュラ強度
		this.mrr=0.0; //反射強度
		this.rough=1.0; //反射粗度
		this.reflectionColor = new Vec3();//反射色

		this.opacity = 1.0; //不透明度
		this.transRough = 0.0; //透明粗度
		this.ior = 0.0; //屈折率

		this.bold=1.0; //太さ

		this.shader = ""; //シェーダ
	}
	var Face = function(){
		this.operator;
		this.bold=1;
		this.uv = new Array(3);
		this.uv[0]=new Vec2();
		this.uv[1]=new Vec2();
		this.uv[2]=new Vec2();
		this.normalmap=null;
		this.normalmapvalue=0;
		this.nuv = new Array(3);
		this.nuv[0]=new Vec2();
		this.nuv[1]=new Vec2();
		this.nuv[2]=new Vec2();
		this.vertices=new Array(3);
		this.normal=new Vec3();
		this.angle=new Vec3();
		this.material=0;
		this.environment=null;
	}
	var Vertex = function(){
		this.pos = new Vec3()
		this.normal = new Vec3()
		this.screenx=0
		this.screeny=0
		this.screenz=0
		this.angle = new Vec3()
	}
	
	var bV0 = new Vec3()
	,bV1=new Vec3()
	,bV2=new Vec3()
	,bV3=new Vec3()
	,bM=new Mat44()
	,bufuv1=new Vec2()
	,bufuv2=new Vec2()
	,bufvertex1=new Vertex()
	,bufvertex2=new Vertex()
	,poses = new Array(4)
	,uvs = new Array(4)

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
		this.faces_index = 0
		this.vertices_index = 0
		this.vertex_carent = 0
		this.viewport = new Array(4);
		this.znear=1;
		this.zfar=80;
		this.aov=1;

		this.renderTarget
		this.canvasTarget

		
		this.color=0
		this.dif=0
		this.spc=0
		this.bold=1.0
		this.texture=null
		this.uv_u=0
		this.uv_v=0
		this.zoffset=0
		this.lineColor=new Vec4();

		this.transTexture=null;

		var i
		,RENDERFACES_MAX=4096
		
		this.materials=[];
		for(i=0;i<RENDERFACES_MAX;i++)this.materials.push(new Material());

		this.environments=[];
		for(i=0;i<RENDERFACES_MAX;i++)this.environments.push(new Environment());


		this.faces = new Array(RENDERFACES_MAX)
		for(i=this.faces.length;i--;){
			this.faces[i] = new Face()
				this.faces[i].material = this.materials[0];
		}


		this.vertices = new Array(RENDERFACES_MAX)
		for(i=this.vertices.length;i--;){
			this.vertices[i] = new Vertex()
			this.vertices[i].idx=i;
		}


		this.stackTransMatrix=new Array()
		this.stackIndex=0
		for(var i=32;i--;)this.stackTransMatrix.push(new Mat44())

		this.clear()

	}
	var ret = Ono3d;

	ret.Material = Material;

	ret.OP_POINT=OP_POINT
	ret.OP_LINE=OP_LINE
	ret.OP_LINES=OP_LINES
	ret.OP_LINELOOP=OP_LINELOOP
	ret.OP_TRIANGLES=OP_TRIANGLES
	ret.OP_POLYGON=OP_POLYGON

	ret.RF_SHADE=RF_SHADE
	ret.RF_SMOOTH=RF_SMOOTH
	ret.RF_TOON=RF_TOON
	ret.RF_LINE=RF_LINE
	ret.RF_OUTLINE=RF_OUTLINE
	ret.RF_TEXTURE=RF_TEXTURE
	ret.RF_ENVMAP=RF_ENVMAP
	ret.RF_DEPTHTEST=RF_DEPTHTEST
	ret.RF_PERSCOLLECT=RF_PERSCOLLECT
	ret.RF_DOUBLE_SIDED=RF_DOUBLE_SIDED
	ret.RF_PHONGSHADING=RF_PHONGSHADING

	ret.LT_DIRECTION = LT_DIRECTION
	ret.LT_AMBIENT=LT_AMBIENT
	
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

			this.transTexture = Rastgl.createTexture(null,TEXSIZE,TEXSIZE);
			this.shaders=[];

			var s = Ono3d.loadShader("mainshader",currentpath+"webgl/mains.shader",function(shader){
				mainshader=shader})
			this.shaders.push(s);

			this.shaders.push(Ono3d.loadShader("testshader",currentpath+"webgl/test.shader"));
			this.shaders.push(Ono3d.loadShader("glassshader",currentpath+"webgl/glass.shader"));
			   

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
			Rastgl.viewport(x,y,width,height);
		}
		,setNearFar:function(zn,zf){
			this.znear=zn;
			this.zfar=zf;
		}
		,setAov:function(aov){
			this.aov=aov;
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
			var a = bM
			a[0]=x*x*(1-COS)+COS;a[4]=x*y*(1-COS)-z*SIN;a[8]=z*x*(1-COS)+y*SIN;a[12]=0
			a[1]=x*y*(1-COS)+z*SIN;a[5]=y*y*(1-COS)+COS;a[9]=y*z*(1-COS)-x*SIN;a[13]=0
			a[2]=z*x*(1-COS)-y*SIN;a[6]=y*z*(1-COS)+x*SIN;a[10]=z*z*(1-COS)+COS;a[14]=0
			Mat44.dot(this.targetMatrix,this.targetMatrix,a)
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

		,clear: function(){
			this.faces_index=0
			this.vertices_index=0
			this.materials_index=0;
			//this.environments_index=0;
		}

	}
	ret.prototype.stereoDraw = function(func){
		var WIDTH=this.viewport[2];
		var HEIGHT=this.viewport[3];
		var p=1.0;
		var q=(1-p)*0.5;
		var stereo;

		if(globalParam.stereomode==0){
			globalParam.gl.viewport(0,0,WIDTH,HEIGHT);
			this.setPers(this.aov,HEIGHT/WIDTH);
			Mat44.dot(this.pvMatrix,this.projectionMatrix,this.viewMatrix);
			func();
		}else{
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
	ret.prototype.render = function(shadowTex,camerap,customMaterial){
		var ono3d = this;

		var i32a = ono3d.viewport;
		var svec = Vec3.poolAlloc();
		var tvec = Vec3.poolAlloc();


		
		//マテリアルリストをシェーダごとに分ける
		Sort.qSort(this.materials,0,this.materials_index-1
			,function(a,b){return (a.shader < b.shader)?-1:(a.shader > b.shader)?1:0;})

		var arr = [];
		this.arr = arr;
		//描画ポリゴンをマテリアル,環境 順に並べる
		var faces = ono3d.faces;
		var facessize=ono3d.faces_index;
		for(var i=0;i<this.materials_index;i++){
			this.materials[i].index = i;
		}
		for(var i=0;i<this.environments_index;i++){
			this.environments[i].index = i;
		}
		for(var i=0;i<facessize;i++){
			if(faces[i].operator !== Ono3d.OP_TRIANGLES){
				continue;
			}
			faces[i].materialIndex = faces[i].material.index*1000+ faces[i].environment.index;
			arr.push(faces[i]);
		}
		arr.sort(function(a,b){return a.materialIndex-b.materialIndex;});

		//GPUに渡すバッファを取得
		var buff = Rastgl.getJsBuffer(arr.length*3*14);
		if(buff.length<arr.length*3*14){
			//バッファオーバーしていたらポリゴン削る(暫定)
			arr.length=buff.length/(14*3);
		}

		//バッファにデータをセット
		var arrlength=arr.length;
		var posindex=0;
		var normalindex=3;
		var sindex=6;
		var tindex=9;
		var uvindex=12;

		var voffset=14;
		var vindex=0;


		var renderlist_shader=[];
		var oldshader="_____";

		for(var i=0;i<arrlength;i++){
			var renderface = arr[i];
			var uv = renderface.uv;
			var material = renderface.material;
			if(oldshader != material.shader){
				renderlist_shader.push(i);
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
				vindex+=voffset;
			}

			oldshader=material.shader;
		}
		renderlist_shader.push(arrlength);

		Vec3.poolFree(2);

		var gl = Rastgl.gl;
		//データをGPUに転送
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, buff);


		//シェーダごとにレンダリング
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
		this.shadowTexture=shadowTex;

		//不透明ポリゴン描画
		if(customMaterial){
			this.renderShader(0,arr.length ,false,customMaterial);
		}else{
			for(var i=0;i<renderlist_shader.length-1;i++){
				this.renderShader(renderlist_shader[i],renderlist_shader[i+1]-renderlist_shader[i]
					,false);
			}

			//透明マテリアル
			var opacityFlg = false;
			for(var i=0;i<ono3d.materials_index;i++){
				if(ono3d.materials[i].opacity<1.0){
					opacityFlg = true;
					break;
				}
			}
			if(!opacityFlg){
				//透明マテリアルがない場合は終了
				return;
			}
		}

		//不透明レンダリング結果からラフネス別テクスチャ作成
		var transTexture = this.transTexture;
		gl.bindTexture(gl.TEXTURE_2D,transTexture);
		gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,i32a[0],i32a[1],i32a[2],i32a[3]);

		gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
		gl.disable(gl.DEPTH_TEST);
		var size=TEXSIZE;
		gl.disable(gl.BLEND);
		for(var i=1;i<4;i++){
			size>>=1;
			gl.viewport(0,0,size,size*0.5);
		
			Gauss.filter(size,size*0.5,100
				,transTexture,0,(TEXSIZE-size*2)/TEXSIZE,size*2/TEXSIZE,size/TEXSIZE,TEXSIZE,TEXSIZE);
			gl.bindTexture(gl.TEXTURE_2D,transTexture);
			gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,1024-size,0,0,size,size*0.5);
		}
		size>>=1;
		var s=Math.pow(0.5,4);
		gl.viewport(0,0,i32a[2]*s,i32a[3]*s);

		s=Math.pow(0.5,4);
		var environment=this.environments[0];
		Env2D.draw(environment.envTexture,0,1-s,s,s*0.5);
		gl.bindTexture(gl.TEXTURE_2D,transTexture);
		gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,1024-size,0,0,i32a[2]*s,i32a[3]*s);
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		gl.bindTexture(gl.TEXTURE_2D,transTexture);
		gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,i32a[2],i32a[3]);



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
			this.renderShader(0,arr.length ,true,customMaterial);
		}else{
			//シェーダごとにレンダリング
			for(var i=0;i<renderlist_shader.length-1;i++){
				this.renderShader(renderlist_shader[i],renderlist_shader[i+1]-renderlist_shader[i]
					,true);
			
			}
		}

	}

	ret.loadTexture = function(path,func){
		return Rastgl.loadTexture(path,func);
	}
	ret.loadBumpTexture = function(path){
		return Rastgl.loadBumpTexture(path);
	}
	ret.loadCubemap = function(path,func){
		return Rastgl.loadCubemap(path,func);
	}
	ret.createShader2= function(name,txt){
		var shader={};
		var gl=Rastgl.gl;
		
		txt=txt.replace("[common]",Rastgl.commonFunction + Rastgl.textureRGBE);
		var sss=txt.match(/\[vertexshader\]([\s\S]*)\[fragmentshader\]([\s\S]*)/);
		var vs = sss[1];
		var fs = sss[2];
		var unis = txt.match(/uniform .+?;/g)
		var atts = (vs+fs).match(/attribute .+?;/g)

		shader.name = name;
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
			shader.unis[nam]=gl.getUniformLocation(shader.program,nam);
		}
		return shader;
	}
	ret.createShader= function(name,vs,fs){
		var shader={};
		var gl=Rastgl.gl;

		shader.name = name;
		var program = shader.program=Rastgl.setShaderProgram(vs,fs);

		shader.atts={};
		var un = (vs+fs).match(/attribute .+?;/g)
		for(var i=0;i<un.length;i++){
			var nam = un[i].match(/(\S+)\s*;/)[1];

			var att=gl.getAttribLocation(program,nam); 
			shader.atts[nam]=att;
			if(att>=0){
				gl.enableVertexAttribArray(att);
				gl.vertexAttribPointer(att, 1,gl.FLOAT, false, 0, 0);
			}
		}
		shader.unis={};
		var un = (vs+fs).match(/uniform .+?;/g)
		for(var i=0;i<un.length;i++){
			var nam = un[i].match(/(\S+)\s*;/)[1];
			shader.unis[nam]=gl.getUniformLocation(shader.program,nam);
		}
		return shader;
	}

	var vAP=function(gl,a,b,c,d,e,f){
		if(a>=0)gl.vertexAttribPointer(a, b,c,d,e,f);
	}

	ret.prototype.renderShader=function(start,size,opFlg,customMaterial){
		var arr = this.arr;
		var i=start;
		var material = arr[start].material;
		if(customMaterial){
			material = customMaterial;
		}

		var name = material.shader;

		var shader = this.shaders.find(function(a){return a.name===name });
		if(!shader){
			shader=mainshader;
		}
		if(!shader.program){
			return;
		}


		var atts=shader.atts;
		var unis= shader.unis;
		var gl = Rastgl.gl;

		gl.useProgram(shader.program);

		vAP(gl,atts["aPos"], 3,gl.FLOAT, false, 14*4, 0);
		vAP(gl,atts["aNormal"], 3,gl.FLOAT, false, 14*4, 3*4);
		vAP(gl,atts["aSvec"], 3,gl.FLOAT, false, 14*4, 6*4);
		vAP(gl,atts["aTvec"], 3,gl.FLOAT, false, 14*4, 9*4);
		vAP(gl,atts["aUv"], 2,gl.FLOAT, false, 14*4, 12*4);

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
			var env = arr[i].environment;

			if(i==start || arr[i].environment != arr[Math.max(i-1,0)].environment){
				var environment = arr[i].environment;
				gl.uniform3f(unis["uLight"],environment.sun.matrix[8],environment.sun.matrix[9],environment.sun.matrix[10]);
				gl.uniform3fv(unis["uLightColor"],new Float32Array(environment.sun.color));

				Mat44.copy(fa16,environment.sun.viewmatrix);

				gl.uniform3fv(unis["uAmbColor"],new Float32Array(environment.area.color));

				gl.uniformMatrix4fv(unis["lightMat"],false,fa16);

				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);
				gl.uniform1i(unis["uShadowmap"],1);
				gl.activeTexture(gl.TEXTURE3);

				//反射マップ
				gl.activeTexture(gl.TEXTURE3);
				if(environment.envTexture){
					gl.bindTexture(gl.TEXTURE_2D,environment.envTexture);
				}else{
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
				}
				gl.uniform1i(unis["uEnvMap"],3);
					
				//透過マップ
				var envindex=0;
				gl.activeTexture(gl.TEXTURE4);
				if(this.transTexture){
					gl.bindTexture(gl.TEXTURE_2D,this.transTexture);
				}else{
					gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
				}
				gl.uniform1i(unis["uTransMap"],4);
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


			if((material.opacity<1.0) !== opFlg ){
				i=j;
				continue;
			}


			gl.uniform3f(unis["uBaseCol"],material.r,material.g,material.b);
			gl.uniform1f(unis["uOpacity"],material.opacity);
			gl.uniform1f(unis["uEmi"],material.emt);
			//反射強度,反射ラフネス,透過ラフネス,屈折率
			gl.uniform4f(unis["uPbr"],material.spc,material.rough,material.transRough,material.ior);
			gl.uniform3f(unis["uReflectionColor"]
				,material.reflectionColor[0]
				,material.reflectionColor[1]
				,material.reflectionColor[2]);

			gl.activeTexture(gl.TEXTURE0); //カラーテクスチャ
			gl.uniform1i(unis["uBaseColMap"],0);
			if(material.texture){
				gl.bindTexture(gl.TEXTURE_2D,material.texture.gltexture);
			}else{
				gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
			}

			gl.activeTexture(gl.TEXTURE2); //ノーマルマップ
			if(material.normalmap){
				gl.uniform1i(unis["uNormalMap"],2);
				gl.bindTexture(gl.TEXTURE_2D,material.normalmap.gltexture);
				gl.uniform1f(unis["uNormpow"],material.normal);
			}else{
				gl.uniform1i(unis["uNormalMap"],2);
				gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
				gl.uniform1f(unis["uNormpow"],0);
			}

			gl.activeTexture(gl.TEXTURE5); //そのたマップ
			gl.uniform1i(unis["uPbrMap"],5);
			if(material.pbrmap){
				gl.bindTexture(gl.TEXTURE_2D,material.pbrmap.gltexture);
				gl.uniform1f(unis["uPbrPow"],material.pbr);
			}else{
				gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
				gl.uniform1f(unis["uPbrPow"],0);
			}
			var pvMatrix = this.pvMatrix;
			this.stereoDraw(function(){
				gl.uniformMatrix4fv(unis["projectionMatrix"],false,new Float32Array(pvMatrix));
				gl.drawArrays(gl.TRIANGLES, i*3, (j-i)*3);
			});

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

	ret.loadShader=function(name,path,func){
		var s={};
		Util.loadText(path,function(txt){
			var shader = Ono3d.createShader2(name,txt);
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
	return ret

})()

