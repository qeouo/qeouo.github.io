"use strict"
var MainShader2=(function(){
var MainShader2 = function(){};
var ret= MainShader2;
var TEXSIZE= 1024;
var gl;

var parallaxShader={};
var normalShader={};
var pbrShader={};
var lightShader={};
var baseShader={};
var compositeShader={};

var parallaxBuffer;
var pbrBuffer;
var baseColorBuffer;
var lightBuffer;
var normalBuffer;
var transparentMap;

var fa16 =new Float32Array(16);
var WIDTH=0;
var HEIGHT=0;

var arr;
var arrIndexes;

ret.init= function(){
	gl = Rastgl.gl;

	var size=TEXSIZE;
	transparentMap = Rastgl.createTexture(null,TEXSIZE,TEXSIZE);


	parallaxBuffer= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);
	normalBuffer= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);
	pbrBuffer= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);
	lightBuffer =Rastgl.createTexture(null,TEXSIZE,TEXSIZE);
	baseColorBuffer= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);

	parallaxShader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec3 aPos; \
attribute vec2 aUv; \
attribute vec3 aNormal; \
attribute vec3 aSvec; \
attribute vec3 aTvec; \
varying vec2 vUv; \
varying vec3 vEye; \
varying highp mat3 vView; \
uniform mat4 uProjectionMatrix; \
uniform vec3 uAnglePos;  \
void main(void){ \
	gl_Position = uProjectionMatrix * vec4(aPos,1.0); \
	vUv = aUv; \
	vEye = aPos - uAnglePos ; \
	vView = mat3(normalize(aSvec - dot(aNormal,aSvec)*aNormal) \
		,normalize(aTvec - dot(aNormal,aTvec)*aNormal) \
		,aNormal); \
	gl_Position.z*=1.003; \
} \
" , " \
precision lowp float; \
varying vec2 vUv; \
varying vec3 vEye; \
varying mat3 vView; \
uniform sampler2D uNormalMap; \
uniform float uNormpow; \
void main(void){ \
	vec2 uv = vUv; \
	vec3 eye = normalize(vEye); \
	/*視線から視差方向を求める*/ \
	vec4 nrmmap = texture2D(uNormalMap,uv); \
	uv =  vec2(dot(vView[0],eye),dot(vView[1],eye)); \
	/*視差*/ \
	gl_FragColor =vec4(uv*0.5+0.5,nrmmap.w*0.5,uNormpow*0.1); \
} \
",
	[	{name:"aPos",size:3}
		,{name:"aUv",size:2}
		,{name:"aNormal",size:3}
		,{name:"aSvec",size:3}
		,{name:"aTvec",size:3}
	]
	,[ "uProjectionMatrix",
		"uNormalMap",
		"uNormpow",
		"uAnglePos",
	]);

	normalShader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec3 aPos; \
attribute vec2 aUv; \
attribute vec3 aNormal; \
attribute vec3 aSvec; \
attribute vec3 aTvec; \
varying vec2 vUv; \
varying mat3 vView; \
uniform mat4 uProjectionMatrix; \
void main(void){ \
	gl_Position = uProjectionMatrix * vec4(aPos,1.0); \
	vUv = aUv; \
	vView = mat3(normalize(aSvec - dot(aNormal,aSvec)*aNormal) \
		,normalize(aTvec - dot(aNormal,aTvec)*aNormal) \
		,aNormal); \
} \
" , " \
precision lowp float; \
varying vec2 vUv; \
varying mat3 vView; \
uniform sampler2D uSampler; \
uniform sampler2D uNormalMap; \
uniform sampler2D uParallax; \
uniform float uNormpow; \
uniform vec4 uColor; \
void main(void){ \
	vec2 st = gl_FragCoord.st/1024.0; \
	vec4 q = texture2D(uParallax,st); \
	vec2 uv = vUv + (q.rg-0.5)*2.0*q.b*q.a; \
	vec3 nrm; \
	\n \
	/*ノーマルマップ*/ \
	vec4 nrmmap = texture2D(uNormalMap,uv); \
	nrm.rg = ( nrmmap.rg - 0.5 ) *2.0 * uNormpow*0.1 ; \
	nrm.b = nrmmap.b ; \
	nrm = normalize( vView* nrm); \
	/*ノーマル,不透明度*/ \
	gl_FragColor =vec4(nrm*0.5+0.5,uColor.a); \
} \
"
	,[ {name:"aPos",size:3}
		,{name:"aNormal",size:3}
		,{name:"aSvec",size:3}
		,{name:"aTvec",size:3}
		,{name:"aUv",size:2}
	]
	,[ "uProjectionMatrix",
		"uNormalMap",
		"uColor",
		"uParallax",
		"uNormpow",
	]);
	pbrShader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec3 aPos; \
attribute vec2 aUv; \
varying vec2 vUv; \
uniform mat4 uProjectionMatrix; \
void main(void){ \
	gl_Position = uProjectionMatrix * vec4(aPos,1.0); \
	vUv = aUv; \
} \
" , " \
precision lowp float; \
varying vec2 vUv; \
uniform sampler2D uParallax; \
uniform sampler2D uSampler; \
uniform vec4 uColor; \
uniform float uPow; \
void main(void){ \
	vec2 st = gl_FragCoord.st/1024.0; \
	/*視差*/ \
	vec4 q = texture2D(uParallax,st); \
	vec2 uv = vUv + (q.rg-0.5)*2.0*q.b*q.a; \
	/*反射率,ラフネス,透過ラフネス,屈折率*/ \
	gl_FragColor = uColor * texture2D(uSampler,uv); \
} \
"
	,[	{name:"aPos",size:3}
		,{name:"aUv",size:2}
	]
	,["uProjectionMatrix"
		,"uColor"
		,"uSampler"
		,"uParallax"
		,"uPow"
	]);
	
	lightShader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec3 aPos; \
varying vec3 vLightPos; \
uniform mat4 uProjectionMatrix; \
uniform mat4 uLightMatrix; \
void main(void){ \
	gl_Position = uProjectionMatrix * vec4(aPos,1.0); \
	vLightPos= (uLightMatrix * vec4(aPos,1.0)).xyz; \
} \
" , " \
precision lowp float; \
uniform sampler2D uNormalBuffer; \
uniform sampler2D uEnvmap; \
uniform sampler2D uShadowMap; \
varying vec3 vLightPos; \
uniform vec3 uLightAng; \
uniform vec3 uLightColor; \
uniform vec3 uAmbColor; \
uniform float uEmi; \
uniform float lightThreshold1; \
uniform float lightThreshold2; \
const highp float _PI =1.0/3.14159265359; \n \
void main(void){ \
	vec2 uv = gl_FragCoord.st/1024.0; \
	vec4 q = texture2D(uNormalBuffer,uv); \
	vec3 nrm= (q.rgb-0.5)*2.0; \
	/*乱反射強度*/ \
	float diffuse = max(-dot(nrm,uLightAng),0.0); \
	diffuse = clamp((diffuse-lightThreshold1)*lightThreshold2,0.0,1.0); \
	/*影判定*/ \
	vec4 shadowmap=texture2D(uShadowMap,vLightPos.xy*0.5+0.5); \
	float lightz = max(min(vLightPos.z,1.0),-1.); \
	diffuse = (1.0-sign(lightz*0.5+0.5-0.01 -shadowmap.z))*0.5 * diffuse; \
	/*拡散*/ \
	float refx = pow(0.5,4.0); \
	vec2 refV = vec2(atan(nrm.x,-nrm.z)*_PI*0.5 + 0.5 \
		,(-atan(nrm.y,length(nrm.xz))*_PI*0.95 + 0.5)*0.5); \
	q= texture2D(uEnvmap,refV*refx + vec2(0.0,1.0-refx)); \
	vec3 env = q.rgb * (q.a * 3.0 + 1.0); \
	gl_FragColor.rgb = env * uAmbColor + diffuse * uLightColor + uEmi; \
	 \
    highp float m = max(1.0,max(gl_FragColor.r,max(gl_FragColor.g,gl_FragColor.b))); \n \
	gl_FragColor = vec4(gl_FragColor.rgb/m,(m-1.0)/3.0); \
} \
"
	,[ {name:"aPos",size:3}
	]
	,[ "uProjectionMatrix"
		,"uLightMatrix"
		,"uNormalBuffer"
		,"uEnvmap"
		,"uShadowMap"
		,"uLightAng"
		,"uLightColor"
		,"uAmbColor"
		,"uEmi"
		,"lightThreshold1"
		,"lightThreshold2"
	]);

	baseShader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec3 aPos; \
attribute vec2 aUv; \
varying vec2 vUv; \
uniform mat4 uProjectionMatrix; \
void main(void){ \
	gl_Position = uProjectionMatrix * vec4(aPos,1.0); \
	vUv = aUv; \
} \
" , " \
precision lowp float; \
varying vec2 vUv; \
uniform sampler2D uSampler; \
uniform sampler2D uParallax; \
uniform vec4 uColor; \
void main(void){ \
	vec2 st = gl_FragCoord.st/1024.0; \
	/*視差*/ \
	vec4 q = texture2D(uParallax,st); \
	vec2 uv = vUv + (q.xy-0.5)*2.0*q.b*q.a; \
	/*表面色*/ \
	vec4 base = texture2D(uSampler,uv); \
	gl_FragColor = uColor* base; \
	gl_FragColor.a = 1.0; \
} \
"
	,[ {name:"aPos",size:3}
		,{name:"aUv",size:2}
	]
	,[ "uProjectionMatrix",
		"uColor",
		"uSampler",
		"uParallax",
	]);
	

	compositeShader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec2 aPos; \
varying vec3 vEye; \
uniform mat4 uProjectionMatrix; \
void main(void){ \
	gl_Position = vec4(aPos ,1.0,1.0); \
	vEye = (uProjectionMatrix *  gl_Position).xyz; \
} \
" , " \
precision lowp float; \
uniform sampler2D uPbrBuffer; \
uniform sampler2D uNormalBuffer; \
uniform sampler2D uTransparentMap; \
uniform sampler2D uLightBuffer; \
uniform sampler2D uBaseColor; \
uniform sampler2D uEnvmap; \
uniform mat3 uViewMat; \
varying vec3 vEye; \
const highp float _PI =1.0/3.14159265359; \n \
void main(void){ \
	vec3 eye = normalize(vEye); \
	vec2 uv = gl_FragCoord.st/1024.0; \
	vec4 q = texture2D(uNormalBuffer,uv); \
	vec3 nrm= (q.rgb-0.5)*2.0; \
	float opacity = q.a; \
	q = texture2D(uBaseColor ,uv); \
	vec3 base = 1.0 + (q.rgb-1.0)*q.a; \
	q =  texture2D(uPbrBuffer,uv); \
	float roughness = q.g; \
	float power = q.r ; \
	float transRough = q.b; \
	float refract = q.a; \
	power +=  ceil(q.a) * (1.0 - power)*pow(1.0 + min(dot(eye,nrm),0.0),5.0)*(1.0-opacity); \
	/*屈折*/ \
	float refx = min(floor(transRough/0.2),3.0); \
	float refa = (transRough-refx*0.2)/0.2; \
	refa = min(refa,1.0); \
	refx = pow(0.5,refx); \
	vec3 angle = normalize(uViewMat * nrm); \
	vec2 refV = uv +angle.xy *(-refract) ; \
	vec4 transCol = texture2D(uTransparentMap,refV*refx + vec2(0.0,1.0-refx)); \
	transCol.rgb *= (transCol.a * 3.0 + 1.0); \
	q = texture2D(uTransparentMap,refV*refx*0.5 + vec2(0.0,1.0-refx*0.5)); \
	q.rgb *= (q.a * 3.0 + 1.0); \
	transCol.rgb = mix(transCol.rgb,q.rgb,refa); \
	/*反射*/ \
	angle = reflect(eye,nrm); \
	refx = floor(sqrt(roughness/0.06)); \
	refa = (roughness -refx*refx*0.06)/((((1.0+refx)*(1.0+refx))-refx*refx)*0.06); \
	refa = min(refa,1.0); \
	refx = pow(0.5,refx); \
	refV = vec2(atan(angle.x,-angle.z)*_PI*0.5 + 0.5 \
		,(-atan(angle.y,length(angle.xz))*_PI*0.5  + 0.25)); \
	vec4 refCol = texture2D(uEnvmap,refV*refx + vec2(0.0,1.0-refx)); \
	refCol.rgb *= (refCol.a * 3.0 + 1.0); \
	q = texture2D(uEnvmap,refV*refx*0.5 + vec2(0.0,1.0-refx*0.5)); \
	q.rgb *= (q.a * 3.0 + 1.0); \
	refCol.rgb = mix(refCol.rgb,q.rgb,refa) ; \
	/* ライティング */ \
	q = texture2D(uLightBuffer ,uv); \
	vec3 light = q.rgb * (q.a * 3.0 + 1.0); \
	vec3 col = light * base; \
	/* 透過 */ \
	col = mix(transCol.rgb * base, col , opacity); \
	/* 反射 */ \
	gl_FragColor.rgb = mix(col, refCol.rgb, power); \
	 \
    highp float m = max(1.0,max(gl_FragColor.r,max(gl_FragColor.g,gl_FragColor.b))); \n \
	gl_FragColor = vec4(gl_FragColor.rgb/m,(m-1.0)/3.0); \
} \
"
	,[ {name:"aPos",size:2}
	]
	,[ 
		"uProjectionMatrix"
		,"uBaseColor"
		,"uNormalBuffer"
		,"uEnvmap"
		,"uPbrBuffer"
		,"uLightBuffer"
		,"uTransparentMap"
		,"uViewMat"
	]);
	compositeShader.texture= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);
}
var drawSub = function(ono3d,env2dtex,camerap,shadowTex,transFlg){

	gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
	Rastgl.vertexAttribPointers(parallaxShader);

	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	gl.cullFace(gl.BACK);
	gl.enable(gl.CULL_FACE);

	//視差
	gl.depthMask(true);
	gl.clearColor(0.0,0.0,0.0,0.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	renderParallax(ono3d,camerap,transFlg);
	gl.bindTexture(gl.TEXTURE_2D,parallaxBuffer);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);
	gl.depthMask(false);
	
	//法線,不透明度
	//gl.clearColor(0.0,0.0,0.0,0.0);
	//gl.clear(gl.COLOR_BUFFER_BIT);
	renderNormal(ono3d,transFlg);
	gl.bindTexture(gl.TEXTURE_2D,normalBuffer);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);


	//反射
	//gl.clearColor(0.0,0.0,0.0,1.0);
	//gl.clear(gl.COLOR_BUFFER_BIT);
	renderPbr(ono3d,transFlg);
	gl.bindTexture(gl.TEXTURE_2D,pbrBuffer);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);

	//ベースカラー
	//gl.clearColor(1.0,1.0,1.0,0.0);
	//gl.clear(gl.COLOR_BUFFER_BIT);
	renderBaseColor(ono3d,transFlg);
	gl.bindTexture(gl.TEXTURE_2D,baseColorBuffer);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);

	//ライティング
	renderLight(ono3d,shadowTex,env2dtex,transFlg);
	gl.bindTexture(gl.TEXTURE_2D,lightBuffer);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);

	composite(ono3d,env2dtex);
}

var setNormalMap = function(s,t,p0,p1,p2,u0,v0,u1,v1,u2,v2){
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
	d2=1/d2;
	s[0]=-(dv1*dx2-dv2*dx1)*d2;
	s[1]=-(dv1*dy2-dv2*dy1)*d2;
	s[2]=-(dv1*dz2-dv2*dz1)*d2;
	t[0]=(du1*dx2-du2*dx1)*d2;
	t[1]=(du1*dy2-du2*dy1)*d2;
	t[2]=(du1*dz2-du2*dz1)*d2;

}
ret.draw=function(ono3d,shadowTex,env2dtex,camerap){
	arr = [];

	var faces = ono3d.renderFaces;
	var facessize=ono3d.renderFaces_index;
	for(var i=0;i<facessize;i++){
		if(faces[i].operator !== Ono3d.OP_TRIANGLES){
			continue;
		}
		arr.push(faces[i]);
	}
	arr.sort(function(a,b){return a.materialIndex-b.materialIndex;});

	var buff = Rastgl.getJsBuffer(arr.length*3*parallaxShader.amax);
	if(buff.length<arr.length*3*parallaxShader.amax){
		arr.length=limit/(shader.amax*3);
	}

	var arrlength=arr.length;

	var i=0;
	var materialIndex=-1;
	arrIndexes=[];
	while(i<arrlength){
		materialIndex = arr[i].materialIndex;
		var j=i+1;
		for(j;j<arrlength;j++){
			if(arr[j].materialIndex !== materialIndex){break;}
		}
		arrIndexes.push({start:i,size:j-i,material:arr[i].material});
		i=j;
	}

	var args = parallaxShader.args;
	var posindex=args["aPos"].offset;
	var normalindex=args["aNormal"].offset;
	var sindex=args["aSvec"].offset;
	var tindex=args["aTvec"].offset;
	var uvindex=args["aUv"].offset;

	var voffset=parallaxShader.amax;
	var vindex=0;

	var svec = Vec3.poolAlloc();
	var tvec = Vec3.poolAlloc();
	for(var i=0;i<arrlength;i++){
		var renderface = arr[i];
		var uv = renderface.uv;
		var material = renderface.material;

		var smoothing=renderface.smoothing
		var vertices = renderface.vertices;
		var nx = renderface.normal[0] * (1-smoothing);
		var ny = renderface.normal[1] * (1-smoothing);
		var nz = renderface.normal[2] * (1-smoothing);

		if(material.normalmap){
			setNormalMap(svec,tvec
				,vertices[0].pos
				,vertices[1].pos
				,vertices[2].pos
				,renderface.uv[0][0]
				,renderface.uv[0][1]
				,renderface.uv[1][0]
				,renderface.uv[1][1]
				,renderface.uv[2][0]
				,renderface.uv[2][1]
			);
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

	}

	Vec3.poolFree(2);

	gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, buff);
	var i32a = ono3d.viewport;
	WIDTH=i32a[2]-i32a[0];
	HEIGHT=i32a[3]-i32a[1];

	gl.bindTexture(gl.TEXTURE_2D,transparentMap);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);

	gl.depthMask(true);
	gl.depthFunc(gl.LEQUAL);

	drawSub(ono3d,env2dtex,camerap,shadowTex,false);

	//不透明レンダリング結果からラフネス別テクスチャ作成
	gl.bindTexture(gl.TEXTURE_2D,transparentMap);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,i32a[0],i32a[1],i32a[2],i32a[3]);

	gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
	gl.disable(gl.DEPTH_TEST);
	var size=TEXSIZE;
	gl.disable(gl.BLEND);
	for(var i=1;i<4;i++){
		size>>=1;
		gl.viewport(0,0,size,size*0.5);
	
		Gauss.filter(size,size*0.5,10
			,transparentMap,0,(TEXSIZE-size*2)/TEXSIZE,size*2/TEXSIZE,size/TEXSIZE,TEXSIZE,TEXSIZE);
		gl.bindTexture(gl.TEXTURE_2D,transparentMap);
		gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,1024-size,0,0,size,size*0.5);
	}
	size>>=1;
	var s=Math.pow(0.5,4);
	gl.viewport(0,0,i32a[2]*s,i32a[3]*s);

	s=Math.pow(0.5,4);
	Env2D.draw(env2dtex,0,1-s,s,s*0.5);
	gl.bindTexture(gl.TEXTURE_2D,transparentMap);
	s=Math.pow(0.5,4);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,1024-size,0,0,i32a[2]*s,i32a[3]*s);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	gl.bindTexture(gl.TEXTURE_2D,transparentMap);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,i32a[2],i32a[3]);
	
	ono3d.setViewport(i32a[0],i32a[1],i32a[2],i32a[3]);

	drawSub(ono3d,env2dtex,camerap,shadowTex,true);
	

	
}
var composite = function(ono3d,env2dtex,opFlg){
	var shader = compositeShader;
	gl.disable(gl.DEPTH_TEST);
	gl.depthMask(false);
	gl.useProgram(shader.program);
	gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
	Rastgl.vertexAttribPointers(shader);

	gl.activeTexture(gl.TEXTURE0); //カラー
	gl.uniform1i(shader.args["uBaseColor"],0);
	gl.bindTexture(gl.TEXTURE_2D,baseColorBuffer);
	gl.activeTexture(gl.TEXTURE1); //法線
	gl.uniform1i(shader.args["uNormalBuffer"],1);
	gl.bindTexture(gl.TEXTURE_2D,normalBuffer);
	gl.activeTexture(gl.TEXTURE2); //環境マップ
	gl.uniform1i(shader.args["uEnvmap"],2);
	gl.bindTexture(gl.TEXTURE_2D,env2dtex);
	gl.activeTexture(gl.TEXTURE3); //反射マップ
	gl.uniform1i(shader.args["uPbrBuffer"],3);
	gl.bindTexture(gl.TEXTURE_2D,pbrBuffer);
	gl.activeTexture(gl.TEXTURE5); //透過マップ
	gl.uniform1i(shader.args["uTransparentMap"],5);
	gl.bindTexture(gl.TEXTURE_2D,transparentMap);
	gl.activeTexture(gl.TEXTURE6); //ライティング
	gl.uniform1i(shader.args["uLightBuffer"],6);
	gl.bindTexture(gl.TEXTURE_2D,lightBuffer);

	var lightSources=ono3d.lightSources
	for(var i=0;i<lightSources.length;i++){
		var lightSource = lightSources[i]
		if(lightSource.type ===Ono3d.LT_DIRECTION){
			gl.uniform3f(shader.args["uLight"],lightSource.matrix[8],lightSource.matrix[9],lightSource.matrix[10]);
			gl.uniform3fv(shader.args["uLightColor"],new Float32Array(lightSource.color));

			Mat44.copy(fa16,lightSource.viewmatrix);
		}
	}

	var mat=new Float32Array(9);
	mat[0] = ono3d.viewMatrix[0];
	mat[1] = ono3d.viewMatrix[1];
	mat[2] = ono3d.viewMatrix[2];
	mat[3] = ono3d.viewMatrix[4];
	mat[4] = ono3d.viewMatrix[5];
	mat[5] = ono3d.viewMatrix[6];
	mat[6] = ono3d.viewMatrix[8];
	mat[7] = ono3d.viewMatrix[9];
	mat[8] = ono3d.viewMatrix[10];
	
	gl.uniformMatrix3fv(shader.args["uViewMat"],false,mat);

	var mat44 = new Array(16);
	Mat44.getInv(mat44,ono3d.pvMatrix);
	gl.uniformMatrix4fv(shader.args["uProjectionMatrix"],false,new Float32Array(mat44));

	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

var renderParallax = function(ono3d,camerap,opFlg){
	var shader=parallaxShader;
	var args = shader.args;
	gl.useProgram(shader.program);

	var fa =new Float32Array(3);
	fa[0] = camerap[0];
	fa[1] = camerap[1];
	fa[2] = camerap[2];
	gl.uniform3fv(args["uAnglePos"],fa);

	for(var i=0;i<arrIndexes.length;i++){
		var material = arrIndexes[i].material;

		if((material.opacity<1.0) !== opFlg){
			continue;
		}

		gl.activeTexture(gl.TEXTURE0); //ノーマルマップ
		gl.uniform1i(args["uNormalMap"],0);
		if(material.normalmap){
			gl.bindTexture(gl.TEXTURE_2D,material.normalmap.gltexture);
			gl.uniform1f(args["uNormpow"],material.normal);
		}else{
			gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
			gl.uniform1f(args["uNormpow"],0.0);
		}

		ono3d.stereoDraw(function(){
			gl.uniformMatrix4fv(args["uProjectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
			gl.drawArrays(gl.TRIANGLES, arrIndexes[i].start*3, arrIndexes[i].size*3);
		});
	}

	
}
var renderPbr = function(ono3d,opFlg){
	var shader = pbrShader;
	var args = shader.args;
	gl.useProgram(shader.program);

	gl.activeTexture(gl.TEXTURE1); //視差マップ
	gl.uniform1i(args["uParallax"],1);
	gl.bindTexture(gl.TEXTURE_2D,parallaxBuffer);
	for(var i=0;i<arrIndexes.length;i++){
		var material = arrIndexes[i].material;
		if((material.opacity<1.0) !== opFlg){
			continue;
		}

		//反射強度,反射ラフネス,透過ラフネス,屈折率
		gl.uniform4f(args["uColor"],material.spc,material.rough,material.transRough,(1.0-1.0/material.ior)*0.2);

		gl.activeTexture(gl.TEXTURE0); //反射テクスチャ
		gl.uniform1i(args["uSampler"],0);
		if(material.pbrmap){
			gl.bindTexture(gl.TEXTURE_2D,material.pbrmap.gltexture);
			gl.uniform1f(args["uPow"],material.pbrPow);
		}else{
			gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
			gl.uniform1f(args["uPow"],0.0);
		}

		ono3d.stereoDraw(function(){
			gl.uniformMatrix4fv(args["uProjectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
			gl.drawArrays(gl.TRIANGLES, arrIndexes[i].start*3, arrIndexes[i].size*3);
		});
	}
}

var renderNormal = function(ono3d,opFlg){
	var shader = normalShader;
	var args = shader.args;
	gl.useProgram(shader.program);

	gl.activeTexture(gl.TEXTURE1); //マップ
	gl.uniform1i(args["uParallax"],1);
	gl.bindTexture(gl.TEXTURE_2D,parallaxBuffer);

	for(var i=0;i<arrIndexes.length;i++){
		var material = arrIndexes[i].material;
		if((material.opacity<1.0) !== opFlg){
			continue;
		}
		//不透明度
		gl.uniform4f(args["uColor"],0,0,0,material.opacity);
		gl.activeTexture(gl.TEXTURE0); //ノーマルマップ
		gl.uniform1i(args["uNormalMap"],0);
		if(material.normalmap){
			gl.bindTexture(gl.TEXTURE_2D,material.normalmap.gltexture);
			gl.uniform1f(args["uNormpow"],material.normal);
		}else{
			gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture);
			gl.uniform1f(args["uNormpow"],0);
		}

		ono3d.stereoDraw(function(){
			gl.uniformMatrix4fv(args["uProjectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
			gl.drawArrays(gl.TRIANGLES, arrIndexes[i].start*3, arrIndexes[i].size*3);
		});
	}
}

var renderLight = function(ono3d,shadowTex,envTex,opFlg){
	var shader = lightShader;
	var args = shader.args;
	gl.useProgram(shader.program);

	gl.uniform1f(args["lightThreshold1"],ono3d.lightThreshold1);
	var dif=(ono3d.lightThreshold2-ono3d.lightThreshold1);
	if(dif<0.01){
		dif=0.01;
	}
	gl.uniform1f(args["lightThreshold2"],1./dif);

	var lightSources=ono3d.lightSources;
	for(var i=0;i<lightSources.length;i++){
		var lightSource = lightSources[i]
		if(lightSource.type === Ono3d.LT_DIRECTION){
			gl.uniform3f(args["uLightAng"],lightSource.matrix[8],lightSource.matrix[9],lightSource.matrix[10]);
			gl.uniform3fv(args["uLightColor"],new Float32Array(lightSource.color));

			Mat44.copy(fa16,lightSource.viewmatrix);
		}else if(lightSource.type === Ono3d.LT_AMBIENT){
			gl.uniform3fv(args["uAmbColor"],new Float32Array(lightSource.color));
		}
	}
	gl.uniformMatrix4fv(args["uLightMatrix"],false,fa16);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D,normalBuffer);
	gl.uniform1i(args["uNormalBuffer"],0);
	
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D,shadowTex);
	gl.uniform1i(args["uShadowMap"],1);
	
	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D,envTex);
	gl.uniform1i(args["uEnvmap"],2);

	for(var i=0;i<arrIndexes.length;i++){
		var material = arrIndexes[i].material;
		if((material.opacity<1.0) !== opFlg){
			continue;
		}

		gl.uniform1f(args["uEmi"],material.emt);
		ono3d.stereoDraw(function(){
			gl.uniformMatrix4fv(shader.args["uProjectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
			gl.drawArrays(gl.TRIANGLES, arrIndexes[i].start*3, arrIndexes[i].size*3);
		});
	}
}
var renderBaseColor = function(ono3d,opFlg){
	var shader = baseShader;
	var args = shader.args;
	gl.useProgram(shader.program);

	gl.activeTexture(gl.TEXTURE2); //マップ
	gl.uniform1i(args["uParallax"],1);
	gl.bindTexture(gl.TEXTURE_2D,parallaxBuffer);

	for(var i=0;i<arrIndexes.length;i++){
		var material = arrIndexes[i].material;
		if((material.opacity<1.0) !== opFlg){
			continue;
		}
		//ベースカラー
		gl.uniform4f(shader.args["uColor"],material.r,material.g,material.b,0.0);
		gl.activeTexture(gl.TEXTURE0); //カラーテクスチャ
		gl.uniform1i(shader.args["uSampler"],0);
		if(material.texture){
			gl.bindTexture(gl.TEXTURE_2D,material.texture.gltexture);
		}else{
			gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
		}

		ono3d.stereoDraw(function(){
			gl.uniformMatrix4fv(shader.args["uProjectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
			gl.drawArrays(gl.TRIANGLES, arrIndexes[i].start*3, arrIndexes[i].size*3);
		});
	}
}

	ret.init();
	return ret;

})();

