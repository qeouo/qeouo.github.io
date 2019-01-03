"use strict"
var Geono= (function(){
	var ret=function(){}
	ret.LINE_POINT = function(ans,l1,l2,p1){
		var dir =Vec3.poolAlloc();
		var dpos = Vec3.poolAlloc();
		Vec3.sub(dir,l2,l1); //線分の向き
		//if(!(dir[0] || dir[1] || dir[2])){
		//	Vec3.copy(ans,l1);
		//	return;
		//}
		Vec3.sub(dpos,p1,l1); //線分と点の差
		var r = Vec3.dot(dir,dpos);
		if(r <= 0){
			Vec3.copy(ans,l1);
		}else{
			var r2 = dir[0]*dir[0]+dir[1]*dir[1]+dir[2]*dir[2];

			if( r > r2){
				Vec3.copy(ans,l2);
			}else{
				Vec3.madd(ans,l1,dir, r/r2);
			}
		}

		Vec3.poolFree(2);

		return Vec3.len2(ans,p1);
	}

	ret.LINE_LINE=function(a1,a2,p1,p2,p3,p4){
		var dir1 = Vec3.poolAlloc();
		var dir2 = Vec3.poolAlloc();
		var cross = Vec3.poolAlloc();
		var dpos = Vec3.poolAlloc();

		var l;
		Vec3.sub(dir1,p2,p1); //線分1の向き
		if(!(dir1[0] || dir1[1] || dir1[2])){
			Vec3.copy(a1,p1);
			this.LINE_POINT(a2,p3,p4,a1);

			Vec3.poolFree(4);
			return;
		}
		Vec3.sub(dir2,p4,p3);// 線分2の向き
		if(!(dir2[0] || dir2[1] || dir2[2])){
			Vec3.copy(a2,p3);
			this.LINE_POINT(a1,p1,p2,a2);

			Vec3.poolFree(4);
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
					Vec3.madd(a1,p1,dir1,r1/l1);
					Vec3.madd(a2,p3,dir2,r2/l2);
					Vec3.poolFree(4);
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

		Vec3.poolFree(4);

	}

	ret.TRIANGLE_POINT=function(ans,t1,t2,t3,p1){
		var dir = Vec3.poolAlloc(); 
		var cross = Vec3.poolAlloc();
		var cross2 = Vec3.poolAlloc();
		var dpos = Vec3.poolAlloc();

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
				var _l=Vec3.dot(dir,dir);
				if(l<0){
					this.LINE_POINT(ans,v1,v3,p1);
				}else  if(l>_l){
					this.LINE_POINT(ans,v2,v3,p1);
				}else{
					Vec3.madd(ans,v1,dir,l/_l);
				}
				Vec3.poolFree(4);
				return;
			}
		}

		Vec3.madd(ans,p1,cross
			,-Vec3.dot(cross,dpos)/(cross[0]*cross[0]+cross[1]*cross[1]+cross[2]*cross[2]));
		Vec3.poolFree(4);
	}

	ret.TRIANGLE_LINE=function(t1,t2,t3,l1,l2){
		var dpos = Vec3.poolAlloc();
		var cross=Vec3.poolAlloc();
		var pos2= Vec3.poolAlloc();
		var cross2= Vec3.poolAlloc();

		Vec3.cross2(cross,t1,t2,t3);
		Vec3.sub(dpos,t1,l1); //線開始点とポリゴンの距離
		Vec3.sub(pos2,l2,l1); //線開始点とポリゴンの距離

		var l = Vec3.dot(cross,dpos)/Vec3.dot(cross,pos2);
		Vec3.madd(pos2,l1,pos2,l); //面と線の交点

		var ts=[t1,t2,t3,t1];
		for(var j=0;j<3;j++){
			var v1 = ts[j];
			var v2 = ts[j+1];
			Vec3.sub(dpos,v2,v1); //線分の向き
			Vec3.cross(cross2,cross,dpos); //法線と線分に垂直なベクトル
			Vec3.sub(dpos,pos2,v1);
			
			if(Vec3.dot(cross2,dpos)<=0){
				//辺の外の場合はずれ
				Vec3.poolFree(4);
				return 99999;
			}
		}

		Vec3.poolFree(4);
		return l;

	}

	ret.calcSquarePos = function(ans,A,B,C,D,P){
		var BA =Vec3.poolAlloc();
		var CD =Vec3.poolAlloc();
		var AP = Vec3.poolAlloc();
		var DP= Vec3.poolAlloc();
		var n = Vec3.poolAlloc();
		Vec3.cross3(n,A,C,B,D);

		Vec3.sub(BA,B,A);
		Vec3.sub(CD,C,D);
		Vec3.sub(AP,A,P);
		Vec3.sub(DP,D,P);
		var a=0;
		var b=0;
		var c=0;
		for(var i=0;i<3;i++){
			var i1=(i+1)%3;
			var i2=(i+2)%3;
			a += (BA[i1]*CD[i2] - BA[i2]*CD[i1])*n[i];
			b += (BA[i1]*DP[i2] + AP[i1]*CD[i2] - (BA[i2]*DP[i1] + AP[i2]*CD[i1]))*n[i];
			c += (AP[i1]*DP[i2] - AP[i2]*DP[i1])*n[i];
		}
		var t;
		if(!a){
			t = -c/b;
		}else{
			if(b*b-4*a*c<0){
				t =(-b ) / (2*a);
			}else{
				t =(-b + Math.sqrt(b*b-4*a*c)) / (2*a);
			}
			var AD = Vec3.poolAlloc();
			Vec3.sub(AD,A,D);
			Vec3.cross(AD,AD,n);
			var BC= Vec3.poolAlloc();
			Vec3.sub(BC,B,C);
			Vec3.cross(BC,n,BC);
			var BP = Vec3.poolAlloc();
			Vec3.sub(BP,B,P);
			if((t<0 && Vec3.dot(AD,AP)>0)
			|| (t>1 && Vec3.dot(BC,BP)>0)){
				t =(-b - Math.sqrt(b*b-4*a*c)) / (2*a);
			}
			Vec3.poolFree(3);
		}

		ans[0]=t;
		var FE = Vec3.poolAlloc();
		var PE = Vec3.poolAlloc();
		Vec3.madd(FE,D,CD,t);
		Vec3.madd(FE,FE,BA,-t);
		Vec3.sub(FE,FE,A);
		Vec3.mul(PE,BA,t);
		Vec3.add(PE,PE,A);
		Vec3.sub(PE,P,PE);

		ans[1]= Vec3.dot(PE,FE)/Vec3.dot(FE,FE);

		Vec3.poolFree(7);
		return t;
	}

	return ret;
})()
