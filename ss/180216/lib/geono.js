"use strict"
var Geono= (function(){
	var cross=new Vec3()
	,closestA=new Vec3()
	,closestB=new Vec3()

	,Z_VECTOR = [0,0,1]
	,Z_VECTOR_NEG = [0,0,-1]
	,ZERO_VECTOR = [0,0,0]
	
	var bV0 = new Vec3()
	,bV1 = new Vec3()
	,bV2 = new Vec3()
	,bV3 = new Vec3()
	,bV4 = new Vec3()
	,bV5 = new Vec3()

	var ret=function(){}

	ret.Z_VECTOR= Z_VECTOR
	ret.Z_VECTOR_NEG= Z_VECTOR_NEG
	ret.ZERO_VECTOR= ZERO_VECTOR


	ret.LINE_POINT = function(ans,l1,l2,p1){
		var dir = new Vec3();
		var dpos = new Vec3();
		Vec3.sub(dir,l2,l1); //線分の向き
		if(!(dir[0] || dir[1] || dir[2])){
			Vec3.copy(ans,l1);
			return;
		}
		Vec3.sub(dpos,p1,l1); //線分と点の差
		var r = Vec3.dot(dir,dpos);
		if(r < 0){
			Vec3.copy(ans,l1);
		}else if( r > dir[0]*dir[0]+dir[1]*dir[1]+dir[2]*dir[2]){
			Vec3.copy(ans,l2);
		}else{
			Vec3.muladd(ans,l1,dir, r/(dir[0]*dir[0]+dir[1]*dir[1]+dir[2]*dir[2]));
		}

		return Vec3.len2(ans,p1);
	}
	ret.LINE_POINT0 = function(ans,l1,l2){
		var dir = new Vec3();
		Vec3.sub(dir,l2,l1); //線分の向き
		if(!Vec3.scalar(dir)){
			Vec3.copy(ans,l1);
			return;
		}
		var r = -Vec3.dot(dir,l1);
		if(r < 0){
			Vec3.copy(ans,l1);
		}else if( r > dir[0]*dir[0]+dir[1]*dir[1]+dir[2]*dir[2]){
			Vec3.copy(ans,l2);
		}else{
			Vec3.muladd(ans,l1,dir, r/(dir[0]*dir[0]+dir[1]*dir[1]+dir[2]*dir[2]));
		}
		return;
	}


	var LLbuf1=new Vec3();
	var LLbuf2=new Vec3();
	var LLbuf3=new Vec3();
	var LLbuf4=new Vec3();
	var LLbuf5=new Vec3();
	ret.LINE_LINE=function(a1,a2,p1,p2,p3,p4){
		var dir1 = LLbuf1;
		var dir2 = LLbuf2;
		var cross = LLbuf3;
		var dpos = LLbuf4;
		var l;
		Vec3.sub(dir1,p2,p1); //線分1の向き
		if(!(dir1[0] || dir1[1] || dir1[2])){
			Vec3.copy(a1,p1);
			this.LINE_POINT(a2,p3,p4,a1);
			return;
		}
		Vec3.sub(dir2,p4,p3);// 線分2の向き
		if(!(dir2[0] || dir2[1] || dir2[2])){
			Vec3.copy(a2,p3);
			this.LINE_POINT(a1,p1,p2,a2);
			return;
		}

		Vec3.cross(cross,dir1,dir2); //垂直ベクトル
		if(Vec3.scalar(cross)){
			//2直線に垂直な方向から見たときの交点
			Vec3.cross(cross,dir2,cross); //線分2に垂直かつ線分1に並行?なベクトル
			var l1 = Vec3.dot(cross,dir1); 
			Vec3.sub(dpos,p3,p1); 
			var r1 = Vec3.dot(cross,dpos); //線分1の交差比率
			if(r1*l1>=0 && r1*r1<=l1*l1){

				Vec3.cross(cross,dir1,dir2); //垂直ベクトル
				Vec3.cross(cross,dir1,cross); //線分1に垂直かつ線分2に並行?なベクトル
				var l2 = Vec3.dot(cross,dir2); 
				var r2 = -Vec3.dot(cross,dpos); //線分2の交差比率

				if(r2*l2>=0 && r2*r2<=l2*l2){
					Vec3.muladd(a1,p1,dir1,r1/l1);
					Vec3.muladd(a2,p3,dir2,r2/l2);
					return;
				}
			}
		}

		var min=this.LINE_POINT(dpos,p1,p2,p3);
		Vec3.copy(a1,dpos);
		Vec3.copy(a2,p3);

		var l=this.LINE_POINT(dpos,p1,p2,p4);
		if(l<min){
			min=l;
			Vec3.copy(a1,dpos);
			Vec3.copy(a2,p4);
		}
		l=this.LINE_POINT(dpos,p3,p4,p1);
		if(l<min){
			min=l;
			Vec3.copy(a1,p1);
			Vec3.copy(a2,dpos);
		}
		l=this.LINE_POINT(dpos,p3,p4,p2);
		if(l<min){
			min=l;
			Vec3.copy(a1,p2);
			Vec3.copy(a2,dpos);
		}

	}

	var tpbuf1=new Vec3();
	var tpbuf2=new Vec3();
	var tpbuf3=new Vec3();
	var tpbuf4=new Vec3();
	ret.TRIANGLE_POINT=function(ans,t1,t2,t3,p1){
		var dir = tpbuf1;//new Vec3(); 
		var cross = tpbuf2;//new Vec3();
		var cross2 = tpbuf3;//new Vec3();
		var dpos = tpbuf4;//new Vec3();

		//Vec3.sub(dir,t2,t1); 
		//Vec3.sub(dir2,t3,t1);
		//Vec3.cross(cross,dir,dir2); //垂直ベクトル
		cross[0]=t2[1]*t3[2] - t2[2]*t3[1] + t1[2]*(-t2[1]+t3[1]) + t1[1]*(t2[2]-t3[2]);
		cross[1]=t2[2]*t3[0] - t2[0]*t3[2] + t1[0]*(-t2[2]+t3[2]) + t1[2]*(t2[0]-t3[0]);
		cross[2]=t2[0]*t3[1] - t2[1]*t3[0] + t1[1]*(-t2[0]+t3[0]) + t1[0]*(t2[1]-t3[1]);

		var ts=[t1,t2,t3,t1,t2];

		for(var i=0;i<3;i++){
			var v1 = ts[i];
			var v2 = ts[i+1];
			var v3 = ts[i+2];
			Vec3.sub(dpos,p1,v1);
			Vec3.sub(dir,v2,v1); //線分の向き
			Vec3.cross(cross2,cross,dir); //法線と線分に垂直なベクトル
			
			if(Vec3.dot(cross2,dpos)<=0){
				var l=Vec3.dot(dpos,dir);
				var _l=Vec3.scalar2(dir);
				if(l<0){
					this.LINE_POINT(ans,v1,v3,p1);
				}else  if(l>_l){
					this.LINE_POINT(ans,v2,v3,p1);
				}else{
					Vec3.muladd(ans,v1,dir,l/_l);
				}
				return;
			}
		}

		Vec3.muladd(ans,p1,cross
			,-Vec3.dot(cross,dpos)/(cross[0]*cross[0]+cross[1]*cross[1]+cross[2]*cross[2]));
	}
	ret.TETRA_CLOSEST=function(ans,t1,t2,t3,t4,p1){
		var dir1 = new Vec3(); 
		var dir2 = new Vec3();
		var cross = new Vec3();
		var ts=[t1,t2,t3,t4];
		var dpos = new Vec3();

		var min=-1;
		for(var i=0;i<4;i++){
			var v1=ts[i];
			var v2=ts[(i+1)&3];
			var v3=ts[(i+2)&3];
			Vec3.sub(dir1,v2,v1);
			Vec3.sub(dir2,v3,v1);
			Vec3.sub(dpos,p1,v1);
			Vec3.cross(cross,dir1,dir2);
			Vec3.norm(cross);
			var l=Vec3.dot(dpos,cross);
			if(min<0 || min>l*l){
				min=l*l;
				Vec3.muladd(ans,p1,cross,-l);
			}
		}
	}
	ret.TETRA_POINT=function(ans,t1,t2,t3,t4,p1){
		var dir1 = new Vec3(); 
		var dir2 = new Vec3();
		var dir3 = new Vec3();
		var cross = new Vec3();
		var dpos = new Vec3();
		var ts=[t1,t2,t3,t4];
		var ret = new Vec3();

		var min=-1;
		var min2=0;
		var min2n=-1;
		for(var i=0;i<4;i++){
			var v1=i;
			var v2=(i+1)&3;
			var v3=(i+2)&3;
			var v4=(i+3)&3;
			Vec3.sub(dir1,ts[v2],ts[v1]);
			Vec3.sub(dir2,ts[v3],ts[v1]);
			Vec3.sub(dir3,ts[v4],ts[v1]);
			Vec3.sub(dpos,p1,ts[v1]);
			Vec3.cross(cross,dir1,dir2);
			var l1 = Vec3.dot(dpos,cross);
			var l2 = Vec3.dot(cross,dir3);
			if( l2 ==0 || l1 * l2 <0){
				this.TRIANGLE_POINT(ret,ts[v1],ts[v2],ts[v3],p1);
				var l = Vec3.len2(p1,ret);
				if(min<0 || l<min){
					min=l;
					Vec3.copy(ans,ret);
				}
			}
		}
		if(min>0){
			return 0;
		}else{ 
			this.TETRA_CLOSEST(ans,t1,t2,t3,t4,p1);
			return 1;
		}
	}

	ret.CUBOID_POINT=function(a1,a2,cuboid,point){
		var axis = new Vec3();
		var dLoc= new Vec3();
		var closestPos= new Vec3();
		var rotmat=cuboid.rotmat;
		Vec3.copy(closestPos,point);
		Vec3.sub(dLoc,point,cuboid.location); //位置差
		var min=99999; //最短距離
		var minn = -1; //最短要素
		var flg=0;

		//矩形面に対する最近距離
		for(var i=0;i<3;i++){
			Vec3.set(axis,rotmat[i*3+0],rotmat[i*3+1],rotmat[i*3+2])
			var d = Vec3.dot(axis,dLoc);
			var size = cuboid.scale[i]*cuboid.size[i];

			if(d*d>size*size){
				//面より外に点がある場合
				Vec3.muladd(closestPos,closestPos,axis,size*Math.sign(d)-d);
				flg = 1;
			}else{
				//面の内側に点がある場合
				var l = size - Math.abs(d);
				if(l<min || minn<0){
					min=l;
					minn=i;
				}
			}
		}
		if(flg==0){
			//箱の内側に点がある場合
			var size = cuboid.scale[minn]*cuboid.size[minn];
			Vec3.set(axis,rotmat[minn*3+0],rotmat[minn*3+1],rotmat[minn*3+2])
			Vec3.muladd(closestPos,closestPos,axis,size*Math.sign(d)-d);
		}
		Vec3.copy(a1,closestPos);
		Vec3.copy(a2,point);
	}

	return ret;
})()
