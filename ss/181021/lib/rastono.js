"use strict"
var Rastono= (function(){
	var ret=function(){}

	ret.det255=1/255;

	var bV0=new Vec3()
	,bV1=new Vec3()
	,bV2=new Vec3()
	,bV3=new Vec3();
	var i=1
	var flg
	var 
		FLG_ADD = 1
		,FLG_RGB = 1<<i++
		,FLG_A = 1<<i++
		,FLG_UV = 1<<i++
		,FLG_UV2 = 1<<i++
		,FLG_NRM = 1<<i++
		,FLG_NRMMAP = 1<<i++
		,FLG_LIGHTING = 1<<i++
		,FLG_W = 1<<i++
		,FLG_DEPTHTEST = 1<<i++
		,FLG_PERSCOLLECT = 1<<i++
		,FLG_SPC = 1<<i++
	var
		OP_DOT=i=1
		,OP_LINE=++i
		,OP_LINES=++i
		,OP_TRIANGLES=++i
		,OP_POLYGON=++i
		,OP_POINT=++i
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
		;
		

	var fillFuncs = new Array(1<<i)
	var strokeFuncs = new Array(1<<i)
	ret.depthBuffer = new Array(512*512)
	
	ret.persCollect=0
	ret.depthTest=0
	ret.zoffset=0

	ret.cripL =new Array(512)
	ret.cripR = new Array(512)
	ret.cripU = 0
	ret.cripD = 0

	ret.W = new Vec3()
	ret.R = new Vec3()
	ret.G = new Vec3()
	ret.B = new Vec3()
	ret.A = new Vec3()
	ret.NU = new Vec3()
	ret.NV = new Vec3()
	ret.NX = new Vec3()
	ret.NY = new Vec3()
	ret.NZ = new Vec3()
	ret.NUVec = new Vec3();
	ret.NVVec = new Vec3();
	ret.NTVec = new Vec3();
	ret.m = new Mat43();

	ret.uvTexture
	ret.U = new Vec3()
	ret.V = new Vec3()

	ret.uvTexture2
	ret.U2 = new Vec3()
	ret.V2 = new Vec3()
	ret.uvpow2 = 0;

	ret.normalMap
	ret.spc
	ret.spchard

	ret.bV=new Vec3()
	ret.bV2=new Vec3()
	ret.ono3d

	var X0,Y0,Z0
	,X1,Y1,Z1
	,X2,Y2,Z2
	,W0,W1,W2
	,dx1,dx2,dy1,dy2,d

	ret.clear = function(imagedata){
		var i=0
		var imax=imagedata.width*imagedata.height<<2
		var data=imagedata.data
		var j=0
		var depthBuffer=Rastono.depthBuffer
		do{
//			data[i]=0
//			data[i+1]=0
//			data[i+2]=0
			data[i+3]=0//255
			i+=4
			depthBuffer[j]=0
			j++
		}while(i<imax)
	}

	var calcVec= function(a,v0,v1,v2){
		var carent,d1,d2
		if(flg & FLG_PERSCOLLECT){
			carent = v0*W0
			d1=v1*W1-carent
			d2=v2*W2-carent
		}else{
			carent = v0
			d1=v1-carent
			d2=v2-carent
		}

		if(d*d<1){
			a[0] = 0
			a[1] = 0
			a[2] = (d1+d2)/3+carent
		}else{
			a[0] = d2*dy1-d1*dy2
			a[1] = -(d2*dx1-d1*dx2)
			a[2] = carent - a[0]*X0 - a[1]*Y0
		}
		
	}

	ret.setXYZ = function(x0,y0,z0,x1,y1,z1,x2,y2,z2,imagedata){
		var carent,d1,d2,inv
		flg=0

		X0= x0
		Y0= y0
		Z0= z0
		X1= x1
		Y1= y1
		Z1= z1
		X2= x2
		Y2= y2
		Z2= z2
		W0=1.0/z0
		W1=1.0/z1
		W2=1.0/z2

		dx1=x1-x0
		dx2=x2-x0
		dy1=y1-y0
		dy2=y2-y0

		d=dx2*dy1-dx1*dy2
		if(d==0)return true
		inv=1/d
		dy1*=inv
		dy2*=inv
		dx2*=inv
		dx1*=inv

		calcVec(Rastono.W,W0,W1,W2)

		if(this.depthTest)flg|=FLG_DEPTHTEST
		if(this.persCollect) flg|=FLG_PERSCOLLECT

		var xx0,yy0,xx1,yy1,xx2,yy2

		if(y0<y1){
			if(y1<y2){
				xx0=x0
				yy0=y0
				xx1=x1
				yy1=y1
				xx2=x2
				yy2=y2
			}else{
				if(y0<y2){
					xx0=x0
					yy0=y0
					xx1=x2
					yy1=y2
					xx2=x1
					yy2=y1
				}else{
					xx0=x2
					yy0=y2
					xx1=x0
					yy1=y0
					xx2=x1
					yy2=y1
				}
			}
		}else{
			if(y0<y2){
				xx0=x1
				yy0=y1
				xx1=x0
				yy1=y0
				xx2=x2
				yy2=y2
			}else{
				if(y1>y2){
					xx0=x2
					yy0=y2
					xx1=x1
					yy1=y1
					xx2=x0
					yy2=y0
				}else{
					xx0=x1
					yy0=y1
					xx1=x2
					yy1=y2
					xx2=x0
					yy2=y0
				}
			}
		}

		if((yy0|0)==(yy2|0)){
			return 1
		}
		if((xx1-xx0)*(yy2-yy0)-(xx2-xx0)*(yy1-yy0)<0){
			setCrip(xx0,yy0,xx1,yy1,imagedata,0)
			setCrip(xx1,yy1,xx2,yy2,imagedata,0)
			setCrip(xx0,yy0,xx2,yy2,imagedata,1)
		}else{
			setCrip(xx0,yy0,xx1,yy1,imagedata,1)
			setCrip(xx1,yy1,xx2,yy2,imagedata,1)
			setCrip(xx0,yy0,xx2,yy2,imagedata,0)
		}
		Rastono.cripU = yy0|0
		Rastono.cripD = (yy2-1|0) 
//		if(Rastono.cripU<0)Rastono.cripU=0
//		if(Rastono.cripD>imagedata.height-1)Rastono.cripD=imagedata.height-1
		return false
	}
	ret.setXYZ2 = function(x0,y0,z0,x1,y1,z1){
		var carent,d1,d2,inv
		flg=0

		X0= x0
		Y0= y0
		Z0= z0
		X1= x1
		Y1= y1
		Z1= z1
		X2= -(y1-y0)+x0
		Y2= (x1-x0)+y0
		Z2= (z0+z1)/2
		W0=1/Z0
		W1=1/Z1
		W2=1/Z2

		dx1=X1-X0
		dx2=X2-X0
		dy1=Y1-Y0
		dy2=Y2-Y0
		d=dx2*dy1-dx1*dy2
		if(d==0)return
		inv=1/d
		dy1*=inv
		dy2*=inv
		dx2*=inv
		dx1*=inv
		calcVec(Rastono.W,W0,W1,W2)
		if(this.depthTest){
			flg|=FLG_DEPTHTEST
		}
		if(this.persCollect) flg|=FLG_PERSCOLLECT
	}
	ret.setRGB = function(r0,g0,b0,r1,g1,b1,r2,g2,b2){
		calcVec(Rastono.R,r0*255,r1*255,r2*255)
		calcVec(Rastono.G,g0*255,g1*255,g2*255)
		calcVec(Rastono.B,b0*255,b1*255,b2*255)

		flg|=FLG_RGB
	}
	ret.setA = function(a0,a1,a2){
		calcVec(Rastono.A,a0,a1,a2)
		flg|=FLG_A
	}
	ret.setSpc = function(spc,spchard){
		if(spc==0)return;
		Rastono.spc=spc
		Rastono.spchard=spchard

		flg|=FLG_SPC|FLG_LIGHTING
	}
	ret.resetFlg = function(){
		flg=0
		if(this.depthTest)flg|=FLG_DEPTHTEST
		if(this.persCollect) flg|=FLG_PERSCOLLECT
	}
	ret.addFlg = function(aflg){
		flg|=aflg
	}
	ret.setRGBA = function(r0,g0,b0,a0,r1,g1,b1,a1,r2,g2,b2,a2){
		ret.setRGB(r0,g0,b0,r1,g1,b1,r2,g2,b2)
		ret.setA(a0,a1,a2)
	}
	ret.setUV = function(texture,u0,v0,u1,v1,u2,v2){

		Rastono.uvTexture=texture
		if(!texture)return
		var w=texture.width,h=texture.height
		calcVec(Rastono.U,u0*w,u1*w,u2*w)
		calcVec(Rastono.V,v0*h,v1*h,v2*h)
		flg|=FLG_UV
		flg|=FLG_A
	}
	ret.setUV2 = function(texture,u0,v0,u1,v1,u2,v2,pow){

		Rastono.uvTexture2=texture
		if(!texture)return
		var w=texture.width,h=texture.height
		calcVec(Rastono.U2,u0*w,u1*w,u2*w)
		calcVec(Rastono.V2,v0*h,v1*h,v2*h)
		Rastono.uvpow2=pow;
		flg|=FLG_UV2
	}
	ret.setNormalMap = function(texture,p0,p1,p2,u0,v0,u1,v1,u2,v2){
		Rastono.normalMap=texture
		if(!texture)return
		var du1=u1-u0
		var dv1=v1-v0
		var du2=u2-u0
		var dv2=v2-v0
		var dx1=p1[0]-p0[0]
		var dy1=p1[1]-p0[1]
		var dz1=p1[2]-p0[2]
		var dx2=p2[0]-p0[0]
		var dy2=p2[1]-p0[1]
		var dz2=p2[2]-p0[2]

		var d=1/(du1*dv2-du2*dv1)
		Rastono.NUVec[0]=(dv1*dx2-dv2*dx1)
		Rastono.NUVec[1]=(dv1*dy2-dv2*dy1)
		Rastono.NUVec[2]=(dv1*dz2-dv2*dz1)
		Rastono.NVVec[0]=(du1*dx2-du2*dx1)
		Rastono.NVVec[1]=(du1*dy2-du2*dy1)
		Rastono.NVVec[2]=(du1*dz2-du2*dz1)
		d=1/Math.sqrt(Rastono.NVVec[0]*Rastono.NVVec[0]
		+Rastono.NVVec[1]*Rastono.NVVec[1]
		+Rastono.NVVec[2]*Rastono.NVVec[2])
		Rastono.NVVec[0]*=d
		Rastono.NVVec[1]*=d
		Rastono.NVVec[2]*=d
		d=1/Math.sqrt(Rastono.NUVec[0]*Rastono.NUVec[0]
		+Rastono.NUVec[1]*Rastono.NUVec[1]
		+Rastono.NUVec[2]*Rastono.NUVec[2])
		Rastono.NUVec[0]*=d
		Rastono.NUVec[1]*=d
		Rastono.NUVec[2]*=d
			
		Vec3.cross(Rastono.NTVec,Rastono.NUVec,Rastono.NVVec);
		d=1/Math.sqrt(Rastono.NTVec[0]*Rastono.NTVec[0]
		+Rastono.NTVec[1]*Rastono.NTVec[1]
		+Rastono.NTVec[2]*Rastono.NTVec[2])
		Rastono.NTVec[0]*=d
		Rastono.NTVec[1]*=d
		Rastono.NTVec[2]*=d

		var w=texture.width,h=texture.height
		calcVec(Rastono.NU,u0*w,u1*w,u2*w)
		calcVec(Rastono.NV,v0*h,v1*h,v2*h)
		flg|=FLG_NRMMAP
	}
	ret.setNrm = function(x0,y0,z0,x1,y1,z1,x2,y2,z2){

		calcVec(Rastono.NX,x0,x1,x2)
		calcVec(Rastono.NY,y0,y1,y2)
		calcVec(Rastono.NZ,z0,z1,z2)
		flg|=(FLG_NRM|FLG_LIGHTING)

	}

	var fillStr = function(v,flg){
		var str
		if(flg & FLG_PERSCOLLECT){
			return v+"x*tx+"+v+"y*ty+"+v+"z*z"
		}else{
			return v+"x*x+"+v+"y*y+"+v+"z"
		}
	}

	var fillMethod = function(imagedata,ono3d_){
		var width=imagedata.width
		,data = imagedata.data
		Rastono.ono3d=ono3d_

		if(!fillFuncs[flg]){
			var code

			code = firstSection(flg)
			code+="var cripL=rastono.cripL \n"
				+ ",cripR=rastono.cripR \n"

			code+= "y=rastono.cripU \n"
				+ "ymax=rastono.cripD \n"

			+ "for(;y<=ymax;y++){ \n"
//			+ "	if(cripL[y]>cripR[y])continue \n"
			code+= "x=cripL[y]+0.5|0 \n"
			+ "	xmax=cripR[y]-0.5|0\n"
			+ "	if(x<0)x=0 \n"
			+ "	if(xmax>=width)xmax=width-1 \n"
			//+ " x++; \n"
			+ "	idx=(width*y+x)<<2 \n"
			if(flg & (FLG_DEPTHTEST | FLG_PERSCOLLECT)){
				code+= "	widx=width*y+x \n"
				code+= "	w =Wx*x+Wy*y+Wz \n"
			}
			code+= "	for(;x<=xmax;x++){ \n"
			if(flg & (FLG_DEPTHTEST | FLG_PERSCOLLECT)){
				code+= "	w =Wx*x+Wy*y+Wz \n"
			}
			code += drawSection(flg)

			if(flg & FLG_DEPTHTEST){
				code+= " widx+=1 \n"
			}
			if(flg & (FLG_DEPTHTEST|FLG_PERSCOLLECT)){
				code+= " w+=Wx \n"
			}
			code+= "		idx+=4 \n"
			+ "	} \n"
			+ "} \n" 
			var func = new Function("imagedata,rastono",code)
			fillFuncs[flg]=func
		}
		fillFuncs[flg](imagedata,ret)
	}

	var drawLine = function(ono3d){
		var imagedata=ono3d.targetImageData
		var x0,y0,x1,y1,w0,w1
		var data=imagedata.data
		if(Y0<Y1){
			x0=X0|0
			y0=Y0|0
			w0=W0
			x1=X1|0
			y1=Y1|0
			w1=W1
		}else{
			x1=X0|0
			y1=Y0|0
			w1=W0
			x0=X1|0
			y0=Y1|0
			w0=W1
		}
		strokeLine(x0,y0,x1,y1,imagedata,ono3d)
	
	}
	ret.drawTriangle=function(ono3d){
		var imagedata=ono3d.targetImageData
		var data = imagedata.data
				
		if(Rastono.cripU<0)Rastono.cripU=0
		if(Rastono.cripD>imagedata.height-1)Rastono.cripD=imagedata.height-1
		fillMethod(imagedata,ono3d)
	}
	var setCrip=function(x0,y0,x1,y1,imagedata,flg){
		var dx,dy,x,y
			,width = imagedata.width
			,height= imagedata.height
			,p
			,d

		var crip = flg?Rastono.cripR:Rastono.cripL

		if(y0<0 && y1<0)return
		if(y0>=height && y1>=height)return
		if(y0 == y1){
			return
		}

		dx=x1-x0
		dy=y1-y0

		d=dx/dy

		if(y0<0){
			x0+=d*(-y0)
			y0=0
		}
		if(y1>=height){
			x1+=d*((height-1)-y1)
			y1=height-1
		}

		if(dx*dx>dy*dy){
			x=x0+d*0.5
			y=y0|0
			var ymax
			
				
			crip[y]=x + d*(y-y0)*0.5

			x+=d+d*(y-y0)
			y++

			ymax=(y1|0)
			for(;y<ymax;y++){
				crip[y]=x
				x+=d
			}
			crip[ymax]=x1+d*(y1-ymax)*0.5

		}else{
			if(y0<0){
				x0-=d*y0
				y0=0
			}
			if(y1>=height){
				y1=height-1
			}
			x=x0
			y=y0|0
			ymax=y1|0

			crip[y]=x
			x+=d*(1-(y0-y))
			y++

			for(;y<ymax;y++){
				crip[y]=x
				x+=d
			}
			x+=d*(y1-(ymax|0))
			crip[ymax]=x

		}
	}

	var firstSection = function(flg){
		var code
		code= "var i,j,idx,tx,ty,z=1,w,uvidx \n"
		+",calc_r,calc_g,calc_b,calc_a \n"
		+",det_a,src_a,dst_a,out_a \n"
		+",width=imagedata.width \n"
		+",height=imagedata.height\n"
		+",data=imagedata.data \n"
		+",bV=rastono.bV,bV2=rastono.bV2 \n"
		+",ono3d=rastono.ono3d \n"
		+",det255=rastono.det255 \n"

		if(flg & FLG_RGB){
			code+= "var r,g,b \n"
			+",Rx=rastono.R[0],Ry=rastono.R[1],Rz=rastono.R[2] \n"
			+",Gx=rastono.G[0],Gy=rastono.G[1],Gz=rastono.G[2] \n"
			+",Bx=rastono.B[0],By=rastono.B[1],Bz=rastono.B[2] \n"
		}
		if(flg&FLG_A){
			code+= "var a \n"
				+ ",Ax=rastono.A[0],Ay=rastono.A[1],Az=rastono.A[2] \n"
		}
		if(flg & FLG_NRM){
			code+="var nx,ny,nz \n"
			+" NXx=rastono.NX[0],NXy=rastono.NX[1],NXz=rastono.NX[2] \n"
			+",NYx=rastono.NY[0],NYy=rastono.NY[1],NYz=rastono.NY[2] \n"
			+",NZx=rastono.NZ[0],NZy=rastono.NZ[1],NZz=rastono.NZ[2] \n"
			+",viewx1=-ono3d.persx/width \n"
			+",viewx2=0.5*ono3d.persx \n"
			+",viewy1=-ono3d.persy/height \n"
			+",viewy2=0.5*ono3d.persy \n"
		}

		if(flg & FLG_SPC){
			code+="var spc=rastono.spc,spchard=rastono.spchard \n"
				+ ",calcSpc=Ono3d.calcSpc; \n";
		}
		if(flg & FLG_UV){
			code+="var  \n"
			+" Ux=rastono.U[0],Uy=rastono.U[1],Uz=rastono.U[2] \n"
			+",Vx=rastono.V[0],Vy=rastono.V[1],Vz=rastono.V[2] \n"
			+",uvtex = rastono.uvTexture.data \n"
			+",uvwidth=rastono.uvTexture.width \n"
			+",uvwidth1=uvwidth-1 \n"
			+",uvheight1=rastono.uvTexture.height-1 \n"
		}
		if(flg & FLG_UV2){
			code+="var  \n"
			+" U2x=rastono.U2[0],U2y=rastono.U2[1],U2z=rastono.U2[2] \n"
			+",V2x=rastono.V2[0],V2y=rastono.V2[1],V2z=rastono.V2[2] \n"
			+",uvtex2 = rastono.uvTexture2.data \n"
			+",uvwidth2=rastono.uvTexture2.width \n"
			+",uvwidth21=uvwidth2-1 \n"
			+",uvheight2=rastono.uvTexture2.height \n"
			+",uvheight21=rastono.uvTexture2.height-1 \n"
			+",uvpow2=rastono.uvpow2 \n"
		}
		if(flg & FLG_NRMMAP){
			code+="var nnx,nny,nnz \n"
			+",NUx=rastono.NU[0],NUy=rastono.NU[1],NUz=rastono.NU[2] \n"
			+",NVx=rastono.NV[0],NVy=rastono.NV[1],NVz=rastono.NV[2] \n"
			+",nrmmap= rastono.normalMap.normalmap \n"
			+",nrmmapwidth=rastono.normalMap.width \n"
			+",nrmmapwidth1=nrmmapwidth-1 \n"
			+",nrmmapheight1=rastono.normalMap.height-1 \n"
			+",NUVecx=rastono.NUVec[0] \n"
			+",NUVecy=rastono.NUVec[1] \n"
			+",NUVecz=rastono.NUVec[2] \n"
			+",NVVecx=rastono.NVVec[0] \n"
			+",NVVecy=rastono.NVVec[1] \n"
			+",NVVecz=rastono.NVVec[2] \n"
			+",NTVecx=rastono.NTVec[0] \n"
			+",NTVecy=rastono.NTVec[1] \n"
			+",NTVecz=rastono.NTVec[2] \n"
			+",m=rastono.m \n"
		}
		if(flg & (FLG_DEPTHTEST | FLG_PERSCOLLECT | FLG_A)){
			code+="var dw,widx \n"
			+",Wx=rastono.W[0],Wy=rastono.W[1],Wz=rastono.W[2] \n"
			+",depthBuffer = rastono.depthBuffer \n"
			+",widx \n"
			+",dw \n"
		}
		return code
	}
	var drawSection = function(flg){
		var code=""
		if(flg & FLG_DEPTHTEST){
			code += " if(depthBuffer[widx]<=w || data[idx+3]<255){ \n"
		}
		if(flg & FLG_PERSCOLLECT){
			code+=" z= 1/w \n"
				+ " tx = x*z \n"
				+ " ty = y*z \n"
		}
		if(flg & FLG_RGB){
			code+="		calc_r="+fillStr("R",flg)+" \n"
				+ "		calc_g="+fillStr("G",flg)+" \n"
				+ "		calc_b="+fillStr("B",flg)+" \n"
		}
		if(flg &FLG_A){
			code+="		calc_a="+fillStr("A",flg)+" \n"
		}
		if(flg & FLG_NRM){
			code+= "		nx="+fillStr("NX",flg) +"\n"
			code+= "		ny="+fillStr("NY",flg) +"\n"
			code+= "		nz="+fillStr("NZ",flg) +"\n"
			code+= "		d=1/Math.sqrt(nx*nx+ny*ny+nz*nz) \n";
			code+= "		nx*=d;ny*=d;nz*=d; \n";

			if(flg & FLG_NRMMAP){
				code+= "		uvidx =("+fillStr("NU",flg) +"&nrmmapwidth1)+(" 
					+ fillStr("NV",flg) + "&nrmmapheight1)*nrmmapwidth << 2 \n"
				code+="		if(nrmmap[uvidx+2]!=1){ \n"
				code+="		nnx=-ny*NTVecz + nz*NTVecy; \n"
				code+="		nny=-nz*NTVecx + nx*NTVecz; \n"
				code+="		nnz=-nx*NTVecy + ny*NTVecx; \n"

				code+="		nx=nrmmap[uvidx];ny=nrmmap[uvidx+1];nz=nrmmap[uvidx+2];\n"

				code+="		bV2[0]=nx*NUVecx + ny*NVVecx+ nz*NTVecx;\n"
				code+="		bV2[1]=nx*NUVecy + ny*NVVecy+ nz*NTVecy;\n"
				code+="		bV2[2]=nx*NUVecz + ny*NVVecz+ nz*NTVecz;\n"


				code+="		var SIN=nnx*nnx+nny*nny+nnz*nnz \n"
				code+="		if(SIN != 0){ \n"
				code+="		var COS=Math.sqrt(1-SIN) \n"
				code+="		var COS1=1-COS \n"
				code+="		var SIN=Math.sqrt(SIN) \n"
				code+="		var d=1/SIN \n";
				
				code+="		nx=nnx*d;ny=nny*d;nz=nnz*d;\n"
				code+="		m[0]=nx*nx*COS1+COS;m[4]=nx*ny*COS1-nz*SIN;m[8]=nz*nx*COS1+ny*SIN;m[12]=0 \n"
				code+="		m[1]=nx*ny*COS1+nz*SIN;m[5]=ny*ny*COS1+COS;m[9]=ny*nz*COS1-nx*SIN;m[13]=0 \n"
				code+="		m[2]=nz*nx*COS1-ny*SIN;m[6]=ny*nz*COS1+nx*SIN;m[10]=nz*nz*COS1+COS;m[14]=0 \n"
				code+="		Mat43.dotMat43Vec3(bV2,m,bV2); \n";
				code+="		} \n"
				code+="		d=1/Math.sqrt(bV2[0]*bV2[0]+bV2[1]*bV2[1]+bV2[2]*bV2[2]); \n";
				code+="		nx=bV2[0]*d;ny=bV2[1]*d;nz=bV2[2]*d; \n";
				code+="		} \n"
			}
			code+="		bV[0]=nx;bV[1]=ny;bV[2]=nz; \n";
		}

		if((flg & FLG_NRM) &&((flg & FLG_SPC) || (flg & FLG_UV2))){
			code+= "		bV2[0]=x*viewx1 + viewx2 \n"
			code+= "		bV2[1]=y*viewy1 + viewy2 \n"
			code+= "		bV2[2]=1\n"
			code+= "		Vec3.nrm(bV2,bV2) \n";
		}
		if(flg & FLG_LIGHTING){
			code+= "		det = Ono3d.calcLighting(bV,ono3d.lightSources); \n"
			code+= "		calc_r*=det; \n";
			code+= "		calc_g*=det; \n";
			code+= "		calc_b*=det; \n";


			if(flg & FLG_SPC){
				code+= "		det =calcSpc(bV,bV2,spchard,ono3d.lightSources)*spc; \n"
				code+= "		calc_r+=det*255; \n";
				code+= "		calc_g+=det*255; \n";
				code+= "		calc_b+=det*255; \n";
			}
		}
		
		if(flg & FLG_UV){
			code+= "		uvidx =("+fillStr("U",flg) +"&uvwidth1)+(" 
				+ fillStr("V",flg) + "&uvheight1)*uvwidth << 2 \n"
			if(flg & (FLG_RGB|FLG_NRM)){
				code+="		calc_r=calc_r*uvtex[uvidx]>>8 \n"
					+ "		calc_g=calc_g*uvtex[uvidx+1]>>8 \n"
					+ "		calc_b=calc_b*uvtex[uvidx+2]>>8 \n"
			}else{
				code+="		calc_r=uvtex[uvidx] \n"
					+ "		calc_g=uvtex[uvidx+1] \n"
					+ "		calc_b=uvtex[uvidx+2] \n"
			}
			if(flg &FLG_A){
				code+= "		calc_a=uvtex[uvidx+3]*det255 \n"
			}
		}
		if(flg & FLG_UV2){
			if(flg & FLG_NRM){
				code+= "	//	Vec3.mult(bV,bV,Vec3.dot(bV2,bV)*-2); \n"
					+  "	//	Vec3.add(bV,bV2,bV); \n"
					+  "	d = -bV[0]*bV2[0] - bV[1]*bV2[1] - bV[2]*bV2[2]; \n"
					+  "	bV[0] += bV2[0]*d; \n"
					+  "	bV[1] += bV2[1]*d;  \n"
					+  "		uvidx=((bV[0]+1)*0.5*uvwidth2&uvwidth21)+((bV[1]+1)*0.5*uvheight2&uvheight21)*uvwidth2 <<2; \n"
				code+="		calc_r+=uvtex2[uvidx]*uvpow2 \n"
					+ "		calc_g+=uvtex2[uvidx+1]*uvpow2 \n"
					+ "		calc_b+=uvtex2[uvidx+2]*uvpow2 \n"
			}else{
				code+= "		uvidx =("+fillStr("U2",flg) +"&uvwidth21)+(" 
					+ fillStr("V2",flg) + "&uvheight21)*uvwidth2 << 2 \n"
				code+="		calc_r+=uvtex2[uvidx]*uvpow2 \n"
					+ "		calc_g+=uvtex2[uvidx+1]*uvpow2 \n"
					+ "		calc_b+=uvtex2[uvidx+2]*uvpow2 \n"
			}
		}
		if(flg&FLG_A){
//			code+="		calc_r*=calc_a \n"
//				+ "		calc_g*=calc_a \n"
//				+ "		calc_b*=calc_a \n"
		}else{
			code+="calc_a=1 \n";
		}
		
		if(flg&FLG_ADD){
			code+="		data[idx]+= calc_r \n"
			code+="		data[idx+1]+= calc_g \n"
			code+="		data[idx+2]+= calc_b \n"
		}else{
			if(flg&FLG_A){
				code += " if(depthBuffer[widx]<=w){ \n"
				code+= "	src_a=calc_a \n"
				code+= "	dst_a=data[idx+3]/255.0*(1.0-src_a) \n"
				code+= " }else{ \n"
				code+= "	dst_a=data[idx+3]/255.0 \n"
				code+= "	src_a=calc_a*(1.0-dst_a)\n"
				code+= " } \n"
				code+= "	out_a=src_a+ dst_a \n"
				code+="		data[idx+3]= out_a*255 \n"
				code+= "	out_a=1/out_a \n"
				code+="		data[idx]= (calc_r*src_a + data[idx]*dst_a)*out_a \n"
				code+="		data[idx+1]= (calc_g*src_a + data[idx+1]*dst_a)*out_a \n"
				code+="		data[idx+2]= (calc_b*src_a + data[idx+2]*dst_a)*out_a \n"
			}else{
				code+="		data[idx+3]= 255 \n"
				code+="		data[idx]= calc_r \n"
				code+="		data[idx+1]= calc_g \n"
				code+="		data[idx+2]= calc_b \n"
			}
				
		}
		if(flg & FLG_DEPTHTEST){
			code += " depthBuffer[widx]=w \n"
			code+= " } \n"
		}
		return code
	}

	var strokeLine = function(x0,y0,x1,y1,imagedata,ono3d){
		var dx,dy,max
		var X0,Y0,X1,Y1
		var width=imagedata.width
		var height=imagedata.height

		if((x0<0 && x1<0)
		||(x0>=width && x1>=width)
		||(y0<0 && y1<0)
		||(y0>=height && y1>=height)){
			return
		}
		
		dx = x1 - x0
		dy = y1 - y0

		if( dx*dx > dy*dy ){
			if(dx<0){
				X0=x1
				Y0=y1
				X1=x0
				Y1=y0
			}else{
				X0=x0
				Y0=y0
				X1=x1
				Y1=y1
			}
			dy = dy/dx
			dx = 1
			if(X0<0){
				Y0+=dy*(-X0)
				X0=0
			}
			if(X1>=width){
				Y1-=dy*(X1-width+1)
				X1=width-1
			}
			if(Y0<0){
				X0-=Y0/dy
				Y0=0
			}
			if(Y1<0){
				X1-=Y1/dy
				Y1=0
			}
			if(Y0>=height){
				X0-=(Y0-height+1)/dy
				Y0=height-1
			}
			if(Y1>=height){
				X1-=(Y1-height+1)/dy
				Y1=height-1
			}
			max=X1-X0
			
		}else{
			if(dy<0){
				X0=x1
				Y0=y1
				X1=x0
				Y1=y0
			}else{
				X0=x0
				Y0=y0
				X1=x1
				Y1=y1
			}
			dx=dx/dy
			dy=1	
			if(Y0<0){
				X0+=dx*(-Y0)
				Y0=0
			}
			if(Y1>=height){
				X1-=dx*(Y1-height+1)
				Y1=height-1
			}
			if(X0<0){
				Y0+=-X0/dx
				X0=0
			}
			if(X1<0){
				Y1+=-X1/dx
				X1=0
			}
			if(X0>=width){
				Y0-=(X0-width+1)/dx
				X0=width-1
			}
			if(X1>=width){
				Y1-=(X1-width+1)/dx
				X1=width-1
			}
			max=Y1-Y0
		}

		if(!strokeFuncs[flg]){
			var code
			code = firstSection(flg)
			code+= "var x,y,i \n"
			code+= "x=x0+0.5 \n"
			code+= "y=y0+0.5 \n"
			code+= "z=1 \n"

			code+= "for(i=0;i<=max;i++){ \n"
			code+= " idx=(width*(y|0)+(x|0))<<2 \n"
			if(flg &(FLG_DEPTHTEST|FLG_PERSCOLLECT)){
				code+=" widx=idx >> 2 \n"
				code+= " w =Wx*x+Wy*y+Wz \n"
			}
			code+=drawSection(flg)

			code+= " x+=dx \n" 
			+ " y+=dy \n" 
			+ "} \n" 
			var func = new Function("imagedata,x0,y0,dx,dy,max,rastono",code)
			strokeFuncs[flg]=func
		}
		if(!imagedata.data)return
		ret.ono3d=ono3d;
		strokeFuncs[flg](imagedata,X0,Y0,dx,dy,max,ret)
	}
	ret.drawMethod= function(ono3d,renderFace){
		var vertices=renderFace.vertices
		,lightSources
		,light
		,uv
		,u0,v0,u1,v1,u2,v2
		,normal=renderFace.normal
		,nx,ny,nz
		,smoothing=renderFace.smoothing
		,shading=renderFace.rf&RF_SHADE
		,r = renderFace.r
		,g = renderFace.g
		,b = renderFace.b
		,a=renderFace.a
		,spc=renderFace.spc
		,spchard=renderFace.spchard
		,texture=null
		,normalmap=null
		,det
		,vnormal0,vnormal1,vnormal2
		,ior
		,rf = renderFace.rf
		,vtx0=vertices[0]
		,vtx1=vertices[1]
		,vtx2=vertices[2]
		if(renderFace.operator != OP_TRIANGLES){
			vtx2=vertices[1];
		}

		var x0=vtx0.screenx
		,y0=vtx0.screeny
		,z0=vtx0.pos[2]
		,x1=vtx1.screenx
		,y1=vtx1.screeny
		,z1=vtx1.pos[2]
		,x2=vtx2.screenx
		,y2=vtx2.screeny
		,z2=vtx2.pos[2]
		

		Rastono.depthTest=rf & RF_DEPTHTEST
		Rastono.persCollect=rf & RF_PERSCOLLECT
		Rastono.zoffset=0
		if(renderFace.operator == OP_TRIANGLES){
			if(Rastono.setXYZ(x0,y0,z0,x1,y1,z1,x2,y2,z2,ono3d.targetImageData)){
				return
			}

			if((x1-x0)*(y2-y0)-(x2-x0)*(y1-y0)>0){
				if(!(rf&RF_DOUBLE_SIDED))return
				Vec3.mult(bV0,vtx0.normal,-1)
				Vec3.mult(bV1,vtx1.normal,-1)
				Vec3.mult(bV2,vtx2.normal,-1)
			}else{
				Vec3.copy(bV0,vtx0.normal)
				Vec3.copy(bV1,vtx1.normal)
				Vec3.copy(bV2,vtx2.normal)
			}
		}else{
			Rastono.setXYZ2(x0,y0,z0,x1,y1,z1,ono3d.targetImageData);
		}

		vnormal0=bV0
		vnormal1=bV1
		vnormal2=bV2

		if(smoothing==0){

			Vec3.copy(vnormal0,normal)
			Vec3.copy(vnormal1,normal)
			Vec3.copy(vnormal2,normal)
		}else{
			nx=normal[0]*(1-smoothing)
			ny=normal[1]*(1-smoothing)
			nz=normal[2]*(1-smoothing)
			vnormal0[0]= nx+vnormal0[0]* smoothing
			vnormal0[1]= ny+vnormal0[1]* smoothing
			vnormal0[2]= nz+vnormal0[2]* smoothing
			vnormal1[0]= nx+vnormal1[0]* smoothing
			vnormal1[1]= ny+vnormal1[1]* smoothing
			vnormal1[2]= nz+vnormal1[2]* smoothing
			vnormal2[0]= nx+vnormal2[0]* smoothing
			vnormal2[1]= ny+vnormal2[1]* smoothing
			vnormal2[2]= nz+vnormal2[2]* smoothing

			Vec3.nrm(vnormal0,vnormal0)
			Vec3.nrm(vnormal1,vnormal1)
			Vec3.nrm(vnormal2,vnormal2)
		}
	
		if(rf&RF_TEXTURE && ono3d.backTexture && a<1 && renderFace.ior!=1.0){
			ior=renderFace.ior

			nx=vnormal0[0]
			ny=vnormal0[1]
			nz=vnormal0[2]
			det= -(p0[0]*nx+p0[1]*ny+p0[2]*nz)
			nx= (nx*det+p0[0])*ior-nx*det
			ny= (ny*det+p0[1])*ior-ny*det
			nz= (nz*det+p0[2])*ior-nz*det
			det=-100/Math.sqrt(nx*nx+ny*ny+nz*nz)
			u0=nx*det+x0
			v0=ny*det+y0

			nx=vnormal1[0]
			ny=vnormal1[1]
			nz=vnormal1[2]
			det= -(p1[0]*nx+p1[1]*ny+p1[2]*nz)
			nx= (nx*det+p1[0])*ior-nx*det
			ny= (ny*det+p1[1])*ior-ny*det
			nz= (nz*det+p1[2])*ior-nz*det
			det=-100/Math.sqrt(nx*nx+ny*ny+nz*nz)
			u1=nx*det+x1
			v1=ny*det+y1

			nx=vnormal2[0]
			ny=vnormal2[1]
			nz=vnormal2[2]
			det= -(p2[0]*nx+p2[1]*ny+p2[2]*nz)
			nx= (nx*det+p2[0])*ior-nx*det
			ny= (ny*det+p2[1])*ior-ny*det
			nz= (nz*det+p2[2])*ior-nz*det
			det=-100/Math.sqrt(nx*nx+ny*ny+nz*nz)
			u2=nx*det+x2
			v2=ny*det+y2
			
		}
		if(rf&RF_TEXTURE){
			texture=renderFace.texture
			normalmap=renderFace.normalmap
		}
		Rastono.setUV(null)
		if(texture){
			uv=renderFace.uv
			Rastono.setUV(texture.imagedata,uv[0][0],uv[0][1]
					,uv[1][0],uv[1][1]
					,uv[2][0],uv[2][1])
		}
		Rastono.setNormalMap(null)
		if(normalmap){
			uv=renderFace.uv
			Rastono.setNormalMap(normalmap.imagedata,vtx0.pos,vtx1.pos,vtx2.pos
					,uv[0][0],uv[0][1]
					,uv[1][0],uv[1][1]
					,uv[2][0],uv[2][1])
		}
		if(shading){
			if(!(rf & RF_PHONGSHADING)){
				lightSources=ono3d.lightSources
				if(smoothing){
					u0=calcLighting(vnormal0,lightSources)
					u1=calcLighting(vnormal1,lightSources)
					u2=calcLighting(vnormal2,lightSources)
					if(texture){
						Rastono.setRGB(u0,u0,u0,u1,u1,u1,u2,u2,u2)
					}else{
						Rastono.setRGBA(u0*r,u0*g,u0*b,a,u1*r,u1*g,u1*b,a,u2*r,u2*g,u2*b,a)
					}
				}
				if(!smoothing){
					u0 = calcLighting(vnormal0,lightSources) 
					if(texture){
						Rastono.setRGB(u0,u0,u0,u0,u0,u0,u0,u0,u0)
					}else{
						u1=u0*g
						u2=u0*b
						u0=u0*r
						Rastono.setRGBA(u0,u1,u2,a,u0,u1,u2,a,u0,u1,u2,a)
					}
				}
			}else{
				Rastono.setNrm(vnormal0[0],vnormal0[1],vnormal0[2]
					,vnormal1[0],vnormal1[1],vnormal1[2]
					,vnormal2[0],vnormal2[1],vnormal2[2])
				if(texture){
					Rastono.setRGB(1,1,1,1,1,1,1,1,1)
				}else{
					Rastono.setRGBA(r,g,b,a,r,g,b,a,r,g,b,a)
				}
				Rastono.setSpc(spc,spchard)

			}
		}else{
			if(!texture){
				Rastono.setRGBA(r,g,b,a,r,g,b,a,r,g,b,a)
			}
		}

		if(rf&RF_TEXTURE && renderFace.mrr){
			texture=ono3d.envTexture

			Vec3.mult(bV3,vnormal0,Vec3.dot(vtx0.angle,vnormal0)*-2)
			Vec3.add(bV3,bV3,vtx0.angle)
			u0=(bV3[0]+1)*0.5
			v0=(bV3[1]+1)*0.5

			Vec3.mult(bV3,vnormal1,Vec3.dot(vtx1.angle,vnormal1)*-2)
			Vec3.add(bV3,bV3,vtx1.angle)
			u1=(bV3[0]+1)*0.5
			v1=(bV3[1]+1)*0.5


			Vec3.mult(bV3,vnormal2,Vec3.dot(vtx2.angle,vnormal2)*-2)
			Vec3.add(bV3,bV3,vtx2.angle)
			u2=(bV3[0]+1)*0.5
			v2=(bV3[1]+1)*0.5
			
			Rastono.setUV2(texture.imagedata,u0,v0,u1,v1,u2,v2,renderFace.mrr)
		}
		if(renderFace.operator != OP_TRIANGLES){
			drawLine(ono3d);
		}else{
			Rastono.drawTriangle(ono3d)
		}
			
		if(shading && spc){
			if(!(rf & RF_PHONGSHADING)){
				Rastono.resetFlg()
				Rastono.addFlg(1)
				lightSources=ono3d.lightSources
				if(smoothing){
					u0=calcSpc(vnormal0,vtx0.angle,spchard,lightSources)*spc
					u1=calcSpc(vnormal1,vtx1.angle,spchard,lightSources)*spc
					u2=calcSpc(vnormal2,vtx2.angle,spchard,lightSources)*spc
					Rastono.setRGBA(1,1,1,u0,1,1,1,u1,1,1,1,u2)
				}else{
					u0=calcSpc(normal,renderFace.angle,spchard,lightSources)*spc
					Rastono.setRGB(u0,u0,u0,u0,u0,u0,u0,u0,u0)
				}
				if(renderFace.operator != OP_TRIANGLES){
					drawLine(ono3d);
				}else{
					Rastono.drawTriangle(ono3d)
				}
			}
		}
	}
	return ret
})()

