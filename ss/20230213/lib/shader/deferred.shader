[vertexshader]#version 300 es
precision lowp float; 
in lowp vec2 aPos; 

uniform vec2 uUvScale;
uniform vec2 uUvOffset;
out vec2 vUv;
out lowp vec2 vPos; 
void main(void){
		gl_Position = vec4(aPos,1.0,1.0);
		vUv = (aPos+ 1.0) * 0.5 * uUvScale +  uUvOffset;
		vPos = aPos;
}

[fragmentshader]#version 300 es
precision highp usampler2D;
in lowp vec2 vPos; 
in lowp vec2 vUv; 
uniform vec3 anglePos;  
uniform mat4 projectionMatrix; 
 
uniform sampler2D uTransMap; 

uniform sampler2D uBaseColMap; 
uniform sampler2D uNormalMap; 
uniform sampler2D uPbrMap; 
uniform sampler2D uEnvMap;  
uniform usampler2D uDepthMap; 
uniform lowp mat4 lightMat; 
uniform highp vec2 uResolution;

layout (location = 0) out vec4 out_color;

void main(void){ 

	vec3 result;
	

	/*カラーマップ*/ 
	vec3 basecol = decode(texture(uBaseColMap,vUv)); 

	/*ノーマルマップ*/ 
	vec3 normal = (texture(uNormalMap,vUv).rgb-0.5)*2.0; 
	float opacity = texture(uNormalMap,vUv).a;

	/**/ 
	//vec3 eye = (texture(uDepthMap,vUv).rgb-0.5)*2.0;
	uvec4 ueye = texture(uDepthMap,vUv);
	vec3 eye;
	eye.xy = unpackHalf2x16(ueye.x);
	eye.z = unpackHalf2x16(ueye.y).x;
	//eye = uintBitsToFloat(ueye.rgb);
	//depth =  ((100.0+ 1.0 - depth * (100.0 - 1.0)))/(2.0 * 1.0) ;
	//depth = 1.0/depth;
	//depth = depth*5.0-0.8;
	/*vec4 pos = projectionMatrix * vec4(vPos,depth,1.0);*/

	//vec3 eye = normalize(anglePos);


	/*pbr*/ 
	vec4 pbr = texture(uPbrMap,vUv); 
	float specular= pbr.x; 
	float roughness = pbr.y; 
	float transparent_roughness = pbr.z; 
	float refractPower = pbr.w+1.0; 
	float metallic = 0.0;

	//result = basecol * max(dot( normal ,normalize(vec3(1.0,1.0,1.0))),0.0);

	float refx,refa;
	vec3 angle;
	vec2 refV;

	/*透過合成*/ 
	/*屈折*/ 
	refx = min(floor(transparent_roughness/0.2),3.0); 
	refa = (transparent_roughness-refx*0.2)/0.2; 
	refa = min(refa,1.0); 
	angle = normal;//normalize(uViewMat * nrm); 
	vec2 reso = vec2(1.0,0.5);
	refV = gl_FragCoord.xy/uResolution * reso+ angle.xy*(1.0-refractPower)*0.2; 
	highp vec3 transCol = textureTri(uTransMap,vec2(1024.0),refV,refx+refa); 
	result = transCol *(1.0 - opacity); 
		

	/*全反射*/ 
	angle = reflect(eye,normal	); 
	refx = floor((roughness*4.0)); 
	refa = (roughness -refx/4.0)/((((1.0+refx))-refx)/4.0); 
	refa = min(refa,1.0); 
	refV = angle2uv(angle) * vec2(1.0,0.5); 
	vec3 refcol = textureTri(uEnvMap,vec2(256.0),refV,refx+refa) ;

	/*全反射合成*/ 
	result = mix(mix(result,basecol *refcol ,metallic),refcol,specular); 

	/*スケーリング*/ 
	//out_color = encode(result); 
	//out_color = uvec4(result*65536.0,0.0); 
	out_color = vec4(result,0.0) ;
	//out_color = uvec4(result.rgb*65536.0,0); 
	if(normal.x <-0.9 && normal.y <=-0.9 && normal.z <=0.9){
		//out_color = encode(basecol); 
		out_color = vec4(basecol,0.0);
		//out_color = uvec4(basecol*65536.0,0); 
	}
} 
