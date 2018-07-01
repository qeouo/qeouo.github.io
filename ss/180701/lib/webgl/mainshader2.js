"use strict"
var MainShader2=(function(){
var MainShader2 = function(){};
var ret= MainShader2;
var TEXSIZE= 1024;
var gl;

var parallaxShader={};
var parallax2Shader={};
var reflectShader={};
var reflect2Shader={};
var transparent2Shader={};
var baseShader={};
var normalShader={};
var compositeShader={};

var parallaxTexture;
var roughTexture;
var baseTexture;
var normalTexture;
var reflectTexture;
var transparentTexture;

var fa16 =new Float32Array(16);
var jsbuffers;
var WIDTH=0;
var HEIGHT=0;

var arr;

var envs=[0.0,0.1,0.2,0.4,0.8,1.0];
var textures = new Array(envs.length);
ret.init= function(){
	gl = Rastgl.gl;

	var size=TEXSIZE;
	gl.bindFramebuffer(gl.FRAMEBUFFER,Rastgl.frameBuffer);
	gl.viewport(0,0,TEXSIZE,TEXSIZE);
	gl.depthMask(false);
	gl.clearColor(1., 1., 1.,0.0);
	gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
	for(var i=0;i<envs.length;i++){
		textures[i]= Rastgl.createTexture(null,size,size);
		gl.bindTexture(gl.TEXTURE_2D, textures[i]);
		gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,size,size);
		size>>1;
	}

	var size =64*3;
	jsbuffers=[];
	for(var i=0;i<8;i++){
		size*=2;
		jsbuffers.push(new Float32Array(size));
	}

	parallaxShader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec3 aPos; \
attribute vec3 aNormal; \
attribute vec3 aSvec; \
attribute vec3 aTvec; \
attribute vec2 aUv; \
varying vec2 vUv; \
varying vec3 vEye; \
varying mat3 vView; \
uniform mat4 uProjectionMatrix; \
uniform vec3 uAnglePos;  \
uniform float uNormpow; \
void main(void){ \
	gl_Position = uProjectionMatrix * vec4(aPos,1.0); \
	vUv = aUv; \
	vEye = aPos - uAnglePos ; \
	vView = mat3(normalize(aSvec - dot(aNormal,aSvec)*aNormal) \
		,normalize(aTvec - dot(aNormal,aTvec)*aNormal) \
		,aNormal) * uNormpow * 0.5; \
} \
" , " \
precision lowp float; \
varying vec2 vUv; \
varying vec3 vEye; \
varying mat3 vView; \
uniform sampler2D uNormalmap; \
void main(void){ \
	vec2 uv = vUv; \
	vec3 eye = normalize(vEye); \
	/*視線と高さから視差を求める*/ \
	vec4 nrmmap = texture2D(uNormalmap,uv); \
	uv =  (vView*eye).xy * nrmmap.w ; \
	/*視差*/ \
	gl_FragColor =vec4((uv*10.0+1.0)*0.5,0.0,0.0); \
} \
",
	[	{name:"aPos",size:3}
		,{name:"aNormal",size:3}
		,{name:"aSvec",size:3}
		,{name:"aTvec",size:3}
		,{name:"aUv",size:2}
	]
	,[ "uProjectionMatrix",
		"uNormalmap",
		"uNormpow",
		"uAnglePos",
	]);
	parallaxTexture= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);

	parallax2Shader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec3 aPos; \
uniform mat4 uProjectionMatrix; \
void main(void){ \
	gl_Position = uProjectionMatrix * vec4(aPos,1.0); \
} \
" , " \
precision lowp float; \
void main(void){ \
	gl_FragColor =vec4(0.5,0.5,0.0,0.0); \
} \
"
	,[ {name:"aPos",size:3}
	]
	,[ "uProjectionMatrix"
	]);

	reflectShader= Rastgl.setShaderProgram2(" \
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
void main(void){ \
	vec2 st = gl_FragCoord.st/1024.0; \
	/*視差*/ \
	vec2 plx = (texture2D(uParallax,st).rg -0.5)*0.01; \
	vec2 uv = vUv + plx ; \
	/*反射強度とラフネス*/ \
	gl_FragColor = uColor * texture2D(uSampler,uv); \
} \
"
	,[	{name:"aPos",size:3}
		,{name:"aUv",size:2}
	]
	,["uProjectionMatrix",
		"uColor",
		"uSampler",
		"uParallax",
	]);
	roughTexture= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);
	
	reflect2Shader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec2 aPos; \
uniform mat4 uProjectionMatrix; \
varying vec3 vEye; \
void main(void){ \
	gl_Position = vec4(aPos ,1.0,1.0); \
	vEye = (uProjectionMatrix *  gl_Position).xyz; \
} \
" , " \
precision lowp float; \
uniform sampler2D uReflectmap; \
uniform sampler2D uNormal; \
uniform samplerCube uEnvmap0; \
uniform samplerCube uEnvmap1; \
uniform samplerCube uEnvmap2; \
uniform samplerCube uEnvmap3; \
uniform samplerCube uEnvmap4; \
uniform samplerCube uEnvmap5; \
varying vec3 vEye; \
void main(void){ \
	vec2 uv = gl_FragCoord.st/1024.0; \
	vec3 eye = normalize(vEye); \
	/*反射強度とラフネス*/ \
	vec4 reflectdata =  texture2D(uReflectmap,uv); \
	float roughness = reflectdata.g; \
	float power = reflectdata.r; \
	vec3 nrm = texture2D(uNormal,uv).rgb*2.0-1.0; \
	eye = reflect(eye,nrm); \
	lowp float a; \
	vec4 env1; \
	vec4 env2; \
	vec4 result ; \
 	if(roughness<0.1){ \
		env1 =  textureCube(uEnvmap0,eye); \
		env2 =  textureCube(uEnvmap1,eye); \
		a = (0.1 -roughness )/0.1; \
	}else if(roughness<0.2){ \
		env1 =  textureCube(uEnvmap1,eye); \
		env2 =  textureCube(uEnvmap2,eye); \
		a = (0.2 - roughness )/0.1; \
	}else if(roughness<0.4){ \
		env1 =  textureCube(uEnvmap2,eye); \
		env2 =  textureCube(uEnvmap3,eye); \
		a = (0.5 - roughness)/0.2; \
	}else if(roughness<0.8){ \
		env1 =  textureCube(uEnvmap3,eye); \
		env2 =  textureCube(uEnvmap4,eye); \
		a = (0.8 - roughness )/0.4; \
	}else { \
		env1 =  textureCube(uEnvmap4,eye); \
		env2 =  textureCube(uEnvmap5,eye); \
		a = (1.0 - roughness )/0.2; \
	} \
	env1.rgb = env1.rgb * (env1.a * 3.0 + 1.0) ; \
	env2.rgb = env2.rgb * (env2.a * 3.0 + 1.0) ; \
	env1 = mix(env2,env1,a); \
    highp float m = max(1.0,max(env1.r,max(env1.g,env1.b))); \n \
	gl_FragColor = vec4(env1.rgb / m ,(m-1.0)/3.0); \n \
} \
"
	,[	{name:"aPos",size:2}
	]
	,["uProjectionMatrix",
		"uReflectmap",
		"uNormal",
		"uEnvmap0",
		"uEnvmap1",
		"uEnvmap2",
		"uEnvmap3",
		"uEnvmap4",
		"uEnvmap5",
	]);
	reflectTexture= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);

	transparentTexture= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);
	
	transparent2Shader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec2 aPos; \
void main(void){ \
	gl_Position = vec4(aPos ,1.0,1.0); \
} \
" , " \
precision lowp float; \
uniform sampler2D uTransparentmap; \
uniform sampler2D uNormal; \
uniform sampler2D uEnvmap0; \
uniform sampler2D uEnvmap1; \
uniform sampler2D uEnvmap2; \
uniform sampler2D uEnvmap3; \
uniform sampler2D uEnvmap4; \
uniform sampler2D uEnvmap5; \
uniform mat3 uViewMat; \
void main(void){ \
	vec2 uv = gl_FragCoord.st/1024.0; \
	/*反射強度、反射ラフネス、ラフネス,屈折率*/ \
	vec4 transparentdata =  texture2D(uTransparentmap,uv); \
	float roughness = transparentdata.b; \
	float refract  = transparentdata.a; \
	vec3 nrm = texture2D(uNormal,uv).rgb*2.0-1.0; \
	nrm = normalize(uViewMat * nrm); \
	uv = uv + nrm.xy *(refract -1.0) * 0.2; \
	lowp float a; \
	vec4 env1; \
	vec4 env2; \
	vec4 result ; \
 	if(roughness<0.1){ \
		env1 =  texture2D(uEnvmap0,uv); \
		env2 =  texture2D(uEnvmap1,uv); \
		a = (0.1 -roughness )/0.1; \
	}else if(roughness<0.2){ \
		env1 =  texture2D(uEnvmap1,uv); \
		env2 =  texture2D(uEnvmap2,uv); \
		a = (0.2 - roughness )/0.1; \
	}else if(roughness<0.5){ \
		env1 =  texture2D(uEnvmap2,uv); \
		env2 =  texture2D(uEnvmap3,uv); \
		a = (0.5 - roughness)/0.2; \
	}else if(roughness<0.8){ \
		env1 =  texture2D(uEnvmap3,uv); \
		env2 =  texture2D(uEnvmap4,uv); \
		a = (0.8 - roughness )/0.4; \
	}else { \
		env1 =  texture2D(uEnvmap4,uv); \
		env2 =  texture2D(uEnvmap5,uv); \
		a = (1.0 - roughness )/0.2; \
	} \
	env1.rgb = env1.rgb * (env1.a * 3.0 + 1.0) ; \
	env2.rgb = env2.rgb * (env2.a * 3.0 + 1.0) ; \
	env1 = mix(env2,env1,a); \
    highp float m = max(1.0,max(env1.r,max(env1.g,env1.b))); \n \
	gl_FragColor = vec4(env1.rgb / m ,(m-1.0)/3.0); \n \
} \
"
	,[	{name:"aPos",size:2}
	]
	,["uTransparentmap",
		"uNormal",
		"uEnvmap0",
		"uEnvmap1",
		"uEnvmap2",
		"uEnvmap3",
		"uEnvmap4",
		"uEnvmap5",
		"uViewMat"
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
	vec2 plx = (texture2D(uParallax,st).rg -0.5)*0.01; \
	vec2 uv = vUv + plx ; \
	/*表面色*/ \
	vec4 base = texture2D(uSampler,uv); \
	/*base.rgb = base.rgb * (base.a * 3.0 + 1.0) ;*/ \
	gl_FragColor = uColor* base; \
    highp float m = max(1.0,max(gl_FragColor.r,max(gl_FragColor.g,gl_FragColor.b))); \n \
	gl_FragColor = vec4(gl_FragColor.rgb/m,(m-1.0)/3.0); \
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
	baseTexture= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);
	

	normalShader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec3 aPos; \
attribute vec3 aNormal; \
attribute vec3 aSvec; \
attribute vec3 aTvec; \
attribute vec2 aUv; \
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
uniform sampler2D uNormalmap; \
uniform sampler2D uParallax; \
uniform float uNormpow; \
uniform vec4 uColor; \
void main(void){ \
	vec2 st = gl_FragCoord.st/1024.0; \
	vec2 plx = (texture2D(uParallax,st).rg -0.5)*0.01; \
	vec2 uv = vUv + plx ; \
	vec3 nrm; \
	\n \
	/*ノーマルマップ*/ \
	vec4 nrmmap = texture2D(uNormalmap,uv); \
	nrm.rg = ( nrmmap.rg*2.0 - 1.0 ) * uNormpow ; \
	nrm.b = nrmmap.b ; \
	nrm = normalize( vView* nrm); \
	/*ノーマル,不透明度*/ \
	gl_FragColor =vec4((nrm+1.0)*0.5,uColor.a); \
} \
"
	,[ {name:"aPos",size:3}
		,{name:"aNormal",size:3}
		,{name:"aSvec",size:3}
		,{name:"aTvec",size:3}
		,{name:"aUv",size:2}
	]
	,[ "uProjectionMatrix",
		"uNormalmap",
		"uColor",
		"uParallax",
		"uNormpow",
	]);
	normalTexture= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);

	compositeShader= Rastgl.setShaderProgram2(" \
precision lowp float; \
attribute vec2 aPos; \
void main(void){ \
	gl_Position = vec4(aPos ,1.0,1.0); \
} \
" , " \
precision lowp float; \
uniform sampler2D uBaseColor; \
uniform sampler2D uNormal; \
uniform samplerCube uEnvmap; \
uniform sampler2D uReflectmap; \
uniform sampler2D uReflectmap2; \
uniform sampler2D uTransparent; \
uniform vec3 uLight; \
uniform vec3 uLightColor; \
void main(void){ \
	vec2 uv = gl_FragCoord.st/1024.0; \
	vec4 nrma = texture2D(uNormal,uv); \
	vec3 nrm= nrma.rgb*2.0-1.0; \
	vec4 base = texture2D(uBaseColor ,uv); \
	base.rgb *=(base.a * 3.0 + 1.0) ; \
	vec4 transparent = texture2D(uTransparent,uv); \
	transparent.rgb *= (transparent.a * 3.0 + 1.0) ; \
	vec4 env =  textureCube(uEnvmap,nrm); \
	env.rgb *= (env.a * 3.0 + 1.0) ; \
	vec4 ref2= texture2D(uReflectmap2,uv); \
	ref2.rgb *= (ref2.a * 3.0 +1.0); \
	vec4 ref= texture2D(uReflectmap,uv); \
	/* ライティング */ \
	float diffuse = -dot(nrm,uLight)*.5+.5; \
	vec3 col = diffuse * uLightColor; \
	col = (col + env.rgb*0.4) * base.rgb ; \
	/* 透過 */ \
	col = mix(base.rgb*transparent.rgb, col , nrma.a); \
	/* 反射 */ \
	gl_FragColor.rgb = mix(col, ref2.rgb, ref.r); \
	 \
    highp float m = max(1.0,max(gl_FragColor.r,max(gl_FragColor.g,gl_FragColor.b))); \n \
	gl_FragColor = vec4(gl_FragColor.rgb/m,(m-1.0)/3.0); \
} \
"
	,[ {name:"aPos",size:2}
	]
	,[ "uBaseColor",
		"uNormal",
		"uEnvmap",
		"uReflectmap",
		"uReflectmap2",
		"uTransparent",
		"uLight",
		"uLightColor",
	]);
	compositeShader.texture= Rastgl.createTexture(null,TEXSIZE,TEXSIZE);
}
var drawSub = function(ono3d,envtexes,camerap,transFlg){

	arr = [];
	var faces=ono3d.renderFaces;
	var facessize=ono3d.renderFaces_index;
	for(var i=0;i<facessize;i++){
		if(((faces[i].material.opacity < 1.0) !== transFlg)
		|| ( faces[i].operator !== Ono3d.OP_TRIANGLES)){
			continue;
		}
		arr.push(faces[i]);
	}
	arr.sort(function(a,b){return a.materialIndex-b.materialIndex;});

	//視差
	gl.clearColor(0.5,0.5,0.0,0.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	renderParallax(ono3d,camerap,transFlg);
	gl.bindTexture(gl.TEXTURE_2D,parallaxTexture);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);
	
	//法線,不透明度
	gl.clearColor(0.0,0.0,0.0,0.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	renderNormal(ono3d,transFlg);
	gl.bindTexture(gl.TEXTURE_2D,normalTexture);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);


	//反射
	gl.clearColor(0.0,0.0,0.0,1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	renderReflect(ono3d,transFlg);
	gl.bindTexture(gl.TEXTURE_2D,roughTexture);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);
	compositeReflect(ono3d,envtexes,transFlg);
	gl.bindTexture(gl.TEXTURE_2D,reflectTexture);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);

	if(transFlg){
		//透過
		compositeTransparent(ono3d,textures,transFlg);

		gl.bindTexture(gl.TEXTURE_2D,transparentTexture);
		gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);
	}

	//ベースカラー
	gl.enable(gl.DEPTH_TEST);
	gl.clearColor(1.0,1.0,1.0,0.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	renderBaseColor(ono3d,transFlg);
	gl.bindTexture(gl.TEXTURE_2D,baseTexture);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);

	composite(ono3d,envtexes,transFlg);
}

ret.draw=function(ono3d,shadowTex,envtexes,camerap,frenel){

	var i32a = ono3d.viewport;
	WIDTH=i32a[2]-i32a[0];
	HEIGHT=i32a[3]-i32a[1];

	gl.bindTexture(gl.TEXTURE_2D,transparentTexture);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,WIDTH,HEIGHT);

	gl.depthMask(true);
	gl.depthFunc(gl.LEQUAL);

	drawSub(ono3d,envtexes,camerap,false);

	//不透明レンダリング結果からラフネス別テクスチャ作成
	gl.bindTexture(gl.TEXTURE_2D,textures[0]);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,i32a[0],i32a[1],i32a[2],i32a[3]);
//
//	var bf = gl.getParameter(gl.FRAMEBUFFER_BINDING);
//	gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
//	gl.disable(gl.DEPTH_TEST);
//	gl.blendFunc(gl.CONSTANT_ALPHA,gl.ONE_MINUS_CONSTANT_ALPHA);
//	var size=WIDTH;
//	//var s2=HEIGHT/WIDTH;
//	size=TEXSIZE;
//	for(var i=1;i<envtexes.length/2;i++){
//		size>>=1;
//		gl.viewport(0,0,size,size);
//		Gauss.filter(size,size,10,textures[i],textures[i-1],0,0,1,1,size*2,size*2);
//	}
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	ono3d.setViewport(i32a[0],i32a[1],i32a[2],i32a[3]);

	drawSub(ono3d,envtexes,camerap,true);

	
}
var composite = function(ono3d,envtexes,opFlg){
	//gl.clear(gl.COLOR_BUFFER_BIT);
	gl.disable(gl.DEPTH_TEST);
	gl.depthMask(false);
	gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
	Rastgl.useProgram(compositeShader,0);

	gl.activeTexture(gl.TEXTURE0); //カラー
	gl.uniform1i(compositeShader.args["uBaseColor"],0);
	gl.bindTexture(gl.TEXTURE_2D,baseTexture);
	gl.activeTexture(gl.TEXTURE1); //法線
	gl.uniform1i(compositeShader.args["uNormal"],1);
	gl.bindTexture(gl.TEXTURE_2D,normalTexture);
	gl.activeTexture(gl.TEXTURE2); //環境マップ
	gl.uniform1i(compositeShader.args["uEnvmap"],2);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP,envtexes[5*2+1]);
	gl.activeTexture(gl.TEXTURE3); //反射マップ
	gl.uniform1i(compositeShader.args["uReflectmap"],3);
	gl.bindTexture(gl.TEXTURE_2D,roughTexture);
	gl.activeTexture(gl.TEXTURE4); //反射したマップ
	gl.uniform1i(compositeShader.args["uReflectmap2"],4);
	gl.bindTexture(gl.TEXTURE_2D,reflectTexture);
	gl.activeTexture(gl.TEXTURE5); //透過マップ
	gl.uniform1i(compositeShader.args["uTransparent"],5);
	gl.bindTexture(gl.TEXTURE_2D,transparentTexture);

	var lightSources=ono3d.lightSources
	for(var i=0;i<lightSources.length;i++){
		var lightSource = lightSources[i]
		if(lightSource.type ===Rastgl.LT_DIRECTION){
			gl.uniform3f(compositeShader.args["uLight"],lightSource.matrix[8],lightSource.matrix[9],lightSource.matrix[10]);
			gl.uniform3fv(compositeShader.args["uLightColor"],new Float32Array(lightSource.color));

			Mat44.copy(fa16,lightSource.viewmatrix);
		}
	}
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}
var setVertices=function(jsbuffer,shader,idx,size){
	var material;
	var renderface;
	var posindex=0;
	var uvindex=shader.args["aUv"].offset2*size*3;

	material = arr[idx].material;
	for(var i=0;i<size;i++){
		renderface = arr[idx+i];

		var vertices = renderface.vertices;
		var vertex=vertices[0];
		jsbuffer[posindex]=vertex.pos[0]
		jsbuffer[posindex+1]=vertex.pos[1]
		jsbuffer[posindex+2]=vertex.pos[2]
		posindex+=3;

		vertex=vertices[1]
		jsbuffer[posindex]=vertex.pos[0]
		jsbuffer[posindex+1]=vertex.pos[1]
		jsbuffer[posindex+2]=vertex.pos[2]
		posindex+=3;

		vertex=vertices[2]
		jsbuffer[posindex]=vertex.pos[0]
		jsbuffer[posindex+1]=vertex.pos[1]
		jsbuffer[posindex+2]=vertex.pos[2]
		posindex+=3;

		jsbuffer[uvindex]=renderface.uv[0][0]
		jsbuffer[uvindex+1]=renderface.uv[0][1]
		jsbuffer[uvindex+2]=renderface.uv[1][0]
		jsbuffer[uvindex+3]=renderface.uv[1][1]
		jsbuffer[uvindex+4]=renderface.uv[2][0]
		jsbuffer[uvindex+5]=renderface.uv[2][1]

		uvindex+=6;
	}
	return ;

}
var renderParallax = function(ono3d,camerap,opFlg){

	var glbuffer=Rastgl.glbuffer;
	var faceflg=Rastgl.faceflg;
	var renderface
	var posindex=0;
	var index=0;
	var uvindex=0;
	var faces=ono3d.renderFaces;
	var facessize=ono3d.renderFaces_index;
	var vertices=ono3d.renderVertices;
	var normalindex=0;
	var sindex=0;
	var tindex=0;
	var uv;
	var material=null;
	var shader = parallaxShader;
	var args = shader.args;
	var svec=Vec3.poolAlloc();
	var tvec=Vec3.poolAlloc();

	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	gl.cullFace(gl.BACK);
	gl.enable(gl.CULL_FACE);

	gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer);
	Rastgl.useProgram(shader,0);


	var fa =new Float32Array(3);
	fa[0] = camerap[0];
	fa[1] = camerap[1];
	fa[2] = camerap[2];
	gl.uniform3fv(shader.args["uAnglePos"],fa);

	
	var i=0;
	var materialIndex=-1;
	var arrlength=arr.length;
	var limit = jsbuffers[jsbuffers.length-1].length/(shader.amax*3) | 0;
	while(i<arrlength){
		materialIndex = arr[i].materialIndex;
		for(var j=i+1;j<arrlength;j++){
			if(arr[j].materialIndex !== materialIndex){break;}
		}
		var jmax=j;
		var jsize=(jmax-i);
		if(jsize>=limit){
			jmax= limit+i;
			jsize=limit;
		}
			
		jsize*=3;

		Rastgl.useProgram(shader,jsize);
		posindex=0;
		uvindex=args["aUv"].offset2*jsize;
		normalindex=args["aNormal"].offset2*jsize;
		sindex=args["aSvec"].offset2*jsize;
		tindex=args["aTvec"].offset2*jsize;
		var jssize =shader.amax*jsize;
		for(var j=0;j<jsbuffers.length;j++){
			if(jssize<jsbuffers[j].length){
				break;
			}
		}
		var jsbuffer=jsbuffers[j];
		material = arr[i].material;
		for(var j=i;j<jmax;j++){
			renderface=arr[j];


			var smoothing=renderface.smoothing
			var vertices = renderface.vertices;
			var nx = renderface.normal[0] * (1-smoothing);
			var ny = renderface.normal[1] * (1-smoothing);
			var nz = renderface.normal[2] * (1-smoothing);
			var vertex=vertices[0];
			jsbuffer[posindex]=vertex.pos[0]
			jsbuffer[posindex+1]=vertex.pos[1]
			jsbuffer[posindex+2]=vertex.pos[2]
			jsbuffer[normalindex+posindex]=vertex.normal[0] * smoothing + nx
			jsbuffer[normalindex+posindex+1]=vertex.normal[1] * smoothing + ny
			jsbuffer[normalindex+posindex+2]=vertex.normal[2] * smoothing + nz
			posindex+=3;

			vertex=vertices[1]
			jsbuffer[posindex]=vertex.pos[0]
			jsbuffer[posindex+1]=vertex.pos[1]
			jsbuffer[posindex+2]=vertex.pos[2]
			jsbuffer[normalindex+posindex]=vertex.normal[0] * smoothing + nx
			jsbuffer[normalindex+posindex+1]=vertex.normal[1] * smoothing + ny
			jsbuffer[normalindex+posindex+2]=vertex.normal[2] * smoothing + nz
			posindex+=3;

			vertex=vertices[2]
			jsbuffer[posindex]=vertex.pos[0]
			jsbuffer[posindex+1]=vertex.pos[1]
			jsbuffer[posindex+2]=vertex.pos[2]
			jsbuffer[normalindex+posindex]=vertex.normal[0] * smoothing + nx
			jsbuffer[normalindex+posindex+1]=vertex.normal[1] * smoothing + ny
			jsbuffer[normalindex+posindex+2]=vertex.normal[2] * smoothing + nz
			posindex+=3;

			jsbuffer[uvindex]=renderface.uv[0][0]
			jsbuffer[uvindex+1]=renderface.uv[0][1]
			jsbuffer[uvindex+2]=renderface.uv[1][0]
			jsbuffer[uvindex+3]=renderface.uv[1][1]
			jsbuffer[uvindex+4]=renderface.uv[2][0]
			jsbuffer[uvindex+5]=renderface.uv[2][1]

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
			jsbuffer[sindex+posindex-9]=svec[0]
			jsbuffer[sindex+posindex-9+1]=svec[1]
			jsbuffer[sindex+posindex-9+2]=svec[2]
			jsbuffer[sindex+posindex-9+3]=svec[0]
			jsbuffer[sindex+posindex-9+4]=svec[1]
			jsbuffer[sindex+posindex-9+5]=svec[2]
			jsbuffer[sindex+posindex-9+6]=svec[0]
			jsbuffer[sindex+posindex-9+7]=svec[1]
			jsbuffer[sindex+posindex-9+8]=svec[2]
			jsbuffer[tindex+posindex-9]=tvec[0]
			jsbuffer[tindex+posindex-9+1]=tvec[1]
			jsbuffer[tindex+posindex-9+2]=tvec[2]
			jsbuffer[tindex+posindex-9+3]=tvec[0]
			jsbuffer[tindex+posindex-9+4]=tvec[1]
			jsbuffer[tindex+posindex-9+5]=tvec[2]
			jsbuffer[tindex+posindex-9+6]=tvec[0]
			jsbuffer[tindex+posindex-9+7]=tvec[1]
			jsbuffer[tindex+posindex-9+8]=tvec[2]


			uvindex+=6;

		}
		i=jmax;

		gl.activeTexture(gl.TEXTURE0); //ノーマルマップ
		gl.uniform1i(parallaxShader.args["uNormalmap"],0);
		if(material.normalmap){
			gl.bindTexture(gl.TEXTURE_2D,material.normalmap.gltexture);
			gl.uniform1f(parallaxShader.args["uNormpow"],material.normal*0.1);
		}else{
			gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
			gl.uniform1f(parallaxShader.args["uNormpow"],0.0);
		}

		gl.bufferSubData(gl.ARRAY_BUFFER, 0, jsbuffer);

		ono3d.stereoDraw(function(){
			gl.uniformMatrix4fv(parallaxShader.args["uProjectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
			gl.drawArrays(gl.TRIANGLES, 0, jsize);
		});
	}

	Vec3.poolFree(2);
	
}
var renderBaseColor = function(ono3d,opFlg){
	var shader =baseShader;

	var material=null;

	gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
	Rastgl.useProgram(shader,0);

	gl.activeTexture(gl.TEXTURE1); //マップ
	gl.uniform1i(baseShader.args["uParallax"],1);
	gl.bindTexture(gl.TEXTURE_2D,parallaxTexture);


	var i=0;
	var materialIndex=-1;
	var arrlength=arr.length;
	var limit = jsbuffers[jsbuffers.length-1].length/(shader.amax*3) | 0;
	var faceNum;
	while(i<arrlength){
		materialIndex = arr[i].materialIndex;
		for(var j=i+1;j<arrlength;j++){
			if(arr[j].materialIndex !== materialIndex){break;}
		}
		var faceNum=(j-i);
		if(faceNum>=limit){
			faceNum=limit;
		}
			
		var vertexNum=faceNum*3;

		Rastgl.useProgram(shader,vertexNum);
		var jssize =shader.amax*vertexNum;
		for(var j=0;j<jsbuffers.length;j++){
			if(jssize<jsbuffers[j].length){
				break;
			}
		}
		var jsbuffer=jsbuffers[j];
		material = arr[i].material;

		setVertices(jsbuffer,shader,i,faceNum);
		i+=faceNum;

		//ベースカラー
		gl.uniform4f(baseShader.args["uColor"],material.r,material.g,material.b,0.0);

		gl.activeTexture(gl.TEXTURE0); //カラーテクスチャ
		gl.uniform1i(baseShader.args["uSampler"],0);
		if(material.texture){
			gl.bindTexture(gl.TEXTURE_2D,material.texture.gltexture);
		}else{
			gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
		}

		gl.bufferSubData(gl.ARRAY_BUFFER, 0, jsbuffer);

		ono3d.stereoDraw(function(){
			gl.uniformMatrix4fv(baseShader.args["uProjectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
			gl.drawArrays(gl.TRIANGLES, 0, vertexNum);
		});

	}
}
var renderReflect = function(ono3d,opFlg){
	var shader = reflectShader;

	var material;

	gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
	Rastgl.useProgram(shader,0);

	var i=0;
	var materialIndex=-1;
	var arrlength=arr.length;
	var limit = jsbuffers[jsbuffers.length-1].length/(shader.amax*3) | 0;
	var faceNum;
	while(i<arrlength){
		materialIndex = arr[i].materialIndex;
		for(var j=i+1;j<arrlength;j++){
			if(arr[j].materialIndex !== materialIndex){break;}
		}
		var faceNum=(j-i);
		if(faceNum>=limit){
			faceNum=limit;
		}
			
		var vertexNum=faceNum*3;

		Rastgl.useProgram(shader,vertexNum);
		var jssize =shader.amax*vertexNum;
		for(var j=0;j<jsbuffers.length;j++){
			if(jssize<jsbuffers[j].length){
				break;
			}
		}
		var jsbuffer=jsbuffers[j];
		material = arr[i].material;

		setVertices(jsbuffer,shader,i,faceNum);
		i+=faceNum;

		//反射強度,反射ラフネス,透過ラフネス,屈折率
		gl.uniform4f(shader.args["uColor"],material.spc,material.rough,material.trans_rough,1.0/material.ior);

		gl.activeTexture(gl.TEXTURE0); //反射テクスチャ
		gl.uniform1i(shader.args["uSampler"],0);
		if(material.reflectTexture){
			gl.bindTexture(gl.TEXTURE_2D,material.reflectTexture.gltexture);
		}else{
			gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture); //テクスチャ未指定の場合はダミーを設定
		}

		gl.activeTexture(gl.TEXTURE1); //視差マップ
		gl.uniform1i(shader.args["uParallax"],1);
		gl.bindTexture(gl.TEXTURE_2D,parallaxTexture);

		gl.bufferSubData(gl.ARRAY_BUFFER, 0, jsbuffer);

		ono3d.stereoDraw(function(){
			gl.uniformMatrix4fv(shader.args["uProjectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
			gl.drawArrays(gl.TRIANGLES, 0, vertexNum);
		});

	}

}

var compositeTransparent= function(ono3d,envtexes,opFlg){
	var shader = transparent2Shader;

	gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
	Rastgl.useProgram(shader,0);

	//反射強度、反射ラフネス、透過ラフネス、屈折率
	gl.activeTexture(gl.TEXTURE0)
	gl.uniform1i(shader.args["uTransparentmap"],0);
	gl.bindTexture(gl.TEXTURE_2D,roughTexture);
	gl.activeTexture(gl.TEXTURE1); //法線
	gl.uniform1i(shader.args["uNormal"],1);
	gl.bindTexture(gl.TEXTURE_2D,normalTexture);

	gl.activeTexture(gl.TEXTURE2); //透過
	gl.uniform1i(shader.args["uEnvmap0"],2);
	gl.bindTexture(gl.TEXTURE_2D,envtexes[0]);
	gl.activeTexture(gl.TEXTURE3); //透過
	gl.uniform1i(shader.args["uEnvmap1"],3);
	gl.bindTexture(gl.TEXTURE_2D,envtexes[1]);
	gl.activeTexture(gl.TEXTURE4); //透過
	gl.uniform1i(shader.args["uEnvmap2"],4);
	gl.bindTexture(gl.TEXTURE_2D,envtexes[2]);
	gl.activeTexture(gl.TEXTURE5); //透過
	gl.uniform1i(shader.args["uEnvmap3"],5);
	gl.bindTexture(gl.TEXTURE_2D,envtexes[3]);
	gl.activeTexture(gl.TEXTURE6); //透過
	gl.uniform1i(shader.args["uEnvmap4"],6);
	gl.bindTexture(gl.TEXTURE_2D,envtexes[4]);
	gl.activeTexture(gl.TEXTURE7); //透過
	gl.uniform1i(shader.args["uEnvmap5"],7);
	gl.bindTexture(gl.TEXTURE_2D,envtexes[5]);
	
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

	gl.disable(gl.DEPTH_TEST);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	gl.enable(gl.DEPTH_TEST);
}

var compositeReflect = function(ono3d,envtexes,opFlg){
	var shader = reflect2Shader;

	gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
	Rastgl.useProgram(shader,0);

	gl.activeTexture(gl.TEXTURE0)
	gl.uniform1i(shader.args["uReflectmap"],0);
	gl.bindTexture(gl.TEXTURE_2D,roughTexture);
	gl.activeTexture(gl.TEXTURE1); //法線
	gl.uniform1i(shader.args["uNormal"],1);
	gl.bindTexture(gl.TEXTURE_2D,normalTexture);

	gl.activeTexture(gl.TEXTURE2); //環境マップ
	gl.uniform1i(shader.args["uEnvmap0"],2);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP,envtexes[1]);
	gl.activeTexture(gl.TEXTURE3); 
	gl.uniform1i(shader.args["uEnvmap1"],3);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP,envtexes[3]);
	gl.activeTexture(gl.TEXTURE4); 
	gl.uniform1i(shader.args["uEnvmap2"],4);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP,envtexes[5]);
	gl.activeTexture(gl.TEXTURE5); 
	gl.uniform1i(shader.args["uEnvmap3"],5);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP,envtexes[7]);
	gl.activeTexture(gl.TEXTURE6); 
	gl.uniform1i(shader.args["uEnvmap4"],6);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP,envtexes[9]);
	gl.activeTexture(gl.TEXTURE7); 
	gl.uniform1i(shader.args["uEnvmap5"],7);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP,envtexes[11]);
	
	var mat44 = new Array(16);
	Mat44.getInv(mat44,ono3d.pvMatrix);
	gl.uniformMatrix4fv(shader.args["uProjectionMatrix"],false,new Float32Array(mat44));

	gl.disable(gl.DEPTH_TEST);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	gl.enable(gl.DEPTH_TEST);
}

var renderNormal = function(ono3d,opFlg){
	var glbuffer=Rastgl.glbuffer;
	var faceflg=Rastgl.faceflg;
	var renderface
	var posindex=0;
	var index=0;
	var uvindex=0;
	var faces=ono3d.renderFaces;
	var vertices=ono3d.renderVertices;
	var normalindex=0;
	var sindex=0;
	var tindex=0;
	var uv;
	var material=null;
	var shader = normalShader;
	var args = shader.args;
	var svec=Vec3.poolAlloc();
	var tvec=Vec3.poolAlloc();

	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	gl.cullFace(gl.BACK);
	gl.enable(gl.CULL_FACE);

	gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer);
	Rastgl.useProgram(shader,0);

	var i=0;
	var materialIndex=-1;
	var arrlength=arr.length;
	var limit = jsbuffers[jsbuffers.length-1].length/(shader.amax*3) | 0;
	while(i<arrlength){
		materialIndex = arr[i].materialIndex;
		for(var j=i+1;j<arrlength;j++){
			if(arr[j].materialIndex !== materialIndex){break;}
		}
		var jmax=j;
		var jsize=(jmax-i);
		if(jsize>=limit){
			jmax= limit+i;
			jsize=limit;
		}
			
		jsize*=3;

		Rastgl.useProgram(shader,jsize);
		posindex=0;
		uvindex=args["aUv"].offset2*jsize;
		normalindex=args["aNormal"].offset2*jsize;
		sindex=args["aSvec"].offset2*jsize;
		tindex=args["aTvec"].offset2*jsize;
		var jssize =shader.amax*jsize;
		for(var j=0;j<jsbuffers.length;j++){
			if(jssize<jsbuffers[j].length){
				break;
			}
		}
		var jsbuffer=jsbuffers[j];
		material = arr[i].material;
		for(var j=i;j<jmax;j++){
			renderface=arr[j];

			var smoothing=renderface.smoothing
			var vertices = renderface.vertices;
			var nx = renderface.normal[0] * (1-smoothing);
			var ny = renderface.normal[1] * (1-smoothing);
			var nz = renderface.normal[2] * (1-smoothing);
			var vertex=vertices[0];
			jsbuffer[posindex]=vertex.pos[0]
			jsbuffer[posindex+1]=vertex.pos[1]
			jsbuffer[posindex+2]=vertex.pos[2]
			jsbuffer[normalindex+posindex]=vertex.normal[0] * smoothing + nx
			jsbuffer[normalindex+posindex+1]=vertex.normal[1] * smoothing + ny
			jsbuffer[normalindex+posindex+2]=vertex.normal[2] * smoothing + nz
			posindex+=3;

			vertex=vertices[1]
			jsbuffer[posindex]=vertex.pos[0]
			jsbuffer[posindex+1]=vertex.pos[1]
			jsbuffer[posindex+2]=vertex.pos[2]
			jsbuffer[normalindex+posindex]=vertex.normal[0] * smoothing + nx
			jsbuffer[normalindex+posindex+1]=vertex.normal[1] * smoothing + ny
			jsbuffer[normalindex+posindex+2]=vertex.normal[2] * smoothing + nz
			posindex+=3;

			vertex=vertices[2]
			jsbuffer[posindex]=vertex.pos[0]
			jsbuffer[posindex+1]=vertex.pos[1]
			jsbuffer[posindex+2]=vertex.pos[2]
			jsbuffer[normalindex+posindex]=vertex.normal[0] * smoothing + nx
			jsbuffer[normalindex+posindex+1]=vertex.normal[1] * smoothing + ny
			jsbuffer[normalindex+posindex+2]=vertex.normal[2] * smoothing + nz
			posindex+=3;

			jsbuffer[uvindex]=renderface.uv[0][0]
			jsbuffer[uvindex+1]=renderface.uv[0][1]
			jsbuffer[uvindex+2]=renderface.uv[1][0]
			jsbuffer[uvindex+3]=renderface.uv[1][1]
			jsbuffer[uvindex+4]=renderface.uv[2][0]
			jsbuffer[uvindex+5]=renderface.uv[2][1]
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
			jsbuffer[sindex+posindex-9]=svec[0]
			jsbuffer[sindex+posindex-9+1]=svec[1]
			jsbuffer[sindex+posindex-9+2]=svec[2]
			jsbuffer[sindex+posindex-9+3]=svec[0]
			jsbuffer[sindex+posindex-9+4]=svec[1]
			jsbuffer[sindex+posindex-9+5]=svec[2]
			jsbuffer[sindex+posindex-9+6]=svec[0]
			jsbuffer[sindex+posindex-9+7]=svec[1]
			jsbuffer[sindex+posindex-9+8]=svec[2]
			jsbuffer[tindex+posindex-9]=tvec[0]
			jsbuffer[tindex+posindex-9+1]=tvec[1]
			jsbuffer[tindex+posindex-9+2]=tvec[2]
			jsbuffer[tindex+posindex-9+3]=tvec[0]
			jsbuffer[tindex+posindex-9+4]=tvec[1]
			jsbuffer[tindex+posindex-9+5]=tvec[2]
			jsbuffer[tindex+posindex-9+6]=tvec[0]
			jsbuffer[tindex+posindex-9+7]=tvec[1]
			jsbuffer[tindex+posindex-9+8]=tvec[2]

			uvindex+=6;

		}
		i=jmax;

		//不透明度
		gl.uniform4f(shader.args["uColor"],0,0,0,material.opacity);
		gl.activeTexture(gl.TEXTURE1); //ノーマルマップ
		gl.uniform1i(shader.args["uNormalmap"],1);
		if(material.normalmap){
			gl.bindTexture(gl.TEXTURE_2D,material.normalmap.gltexture);
			gl.uniform1f(shader.args["uNormpow"],material.normal*0.1);
		}else{
			gl.bindTexture(gl.TEXTURE_2D,Rastgl.dummyTexture);
			gl.uniform1f(shader.args["uNormpow"],0);
		}
		gl.activeTexture(gl.TEXTURE2); //マップ
		gl.uniform1i(shader.args["uParallax"],2);
		gl.bindTexture(gl.TEXTURE_2D,parallaxTexture);

		gl.bufferSubData(gl.ARRAY_BUFFER, 0, jsbuffer);

		ono3d.stereoDraw(function(){
			gl.uniformMatrix4fv(shader.args["uProjectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
			gl.drawArrays(gl.TRIANGLES, 0, jsize);
		});

	}
	Vec3.poolFree(2);
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
	ret.init();
	return ret;

})();

