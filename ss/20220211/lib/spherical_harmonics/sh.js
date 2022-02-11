
import {Vec2,Vec3,Vec4,Mat33,Mat43,Mat44} from "../vector.js"
var SH = (function(){
	var SH = {};
	var ret = SH;

ret.A=function(l){
	if(l==1){
		return 2/3;
	}else if(l&1){
		return 0;
	}else{
		return 2*Math.pow(-1,l/2-1)/((l+2)*(l-1))
		*(kaijo(l)/(Math.pow(2,l)*Math.pow(kaijo(l/2),2)));
	}
	return 0;
}

var kaijo=function(n){
	var result=1;
	for(var i=n;i>0;i--){
		result *= i;
	}
	return result;

}
var kaijo2=function(n){
	if(n<0){
		return kaijo2(n+2)/(n+2);
	}
	var result=1;
	for(var i=n;i>0;i-=2){
		result *= i;
	}
	return result;

}
var K = function(l,m){
	var a = (2*l+1)/(4*Math.PI);
	var b = kaijo(l-Math.abs(m))/kaijo(l+Math.abs(m));
	return Math.sqrt(a*b);
}
ret.Y=function(l,m,theta,pi){
	if(m>0){
		return Math.sqrt(2)*K(l,m)*Math.cos(m*pi)*P(l,m,Math.cos(theta));
	}else if(m<0){
		return Math.sqrt(2)*K(l,m)*Math.sin(-m*pi)*P(l,-m,Math.cos(theta));
	}else{
		return K(l,0)*P(l,0,Math.cos(theta));
	}
}
var P=function(l,m,x){
	if(m===l){
		return  Math.pow(-1,m)*kaijo2(2*m-1)*Math.pow(1-x*x,m/2);
	}
	if((m+1)===l){
		return (2*m+1)*x*P(m,m,x);
	}
	return ((2*l-1)*x*P(l-1,m,x)-(l+m-1)*P(l-2,m,x))/(l-m);
	
}


//---------ここから下高速化関数-------------

//l<=2までの係数を積分で求めるときに使う(最後にencode2_2()を行わないといけない)
ret.encode2xyz=function(cs,src,x,y,z){

	Vec3.madd(cs[0],cs[0],src,1);
	Vec3.madd(cs[1],cs[1],src,x);
	Vec3.madd(cs[2],cs[2],src,y);
	Vec3.madd(cs[3],cs[3],src,z);
	Vec3.madd(cs[4],cs[4],src,x*z);
	Vec3.madd(cs[5],cs[5],src,x*y);
	Vec3.madd(cs[6],cs[6],src,(3*y*y-1));
	Vec3.madd(cs[7],cs[7],src,z*y);
	Vec3.madd(cs[8],cs[8],src,(z*z-x*x));
}
ret.encode2=function(cs,src,theta,pi){
	var y=Math.cos(theta);
	var x=Math.sin(pi)*Math.sin(theta);
	var z=Math.cos(pi)*Math.sin(theta);
	this.encode2xyz(cs,src,x,y,z);
}

//l<=2までの係数重み付け
var Y00Y00 = 1;
var Y10Y10 = 3;
var Y20Y20 = 5/4;
var Y21Y21 = 15;
var Y22Y22 = 15/4;
ret.encode2_2=function(cs){
	Vec3.mul(cs[0],cs[0],Y00Y00);
	Vec3.mul(cs[1],cs[1],Y10Y10);
	Vec3.mul(cs[2],cs[2],Y10Y10);
	Vec3.mul(cs[3],cs[3],Y10Y10);
	Vec3.mul(cs[4],cs[4],Y21Y21);
	Vec3.mul(cs[5],cs[5],Y21Y21);
	Vec3.mul(cs[6],cs[6],Y20Y20);
	Vec3.mul(cs[7],cs[7],Y21Y21);
	Vec3.mul(cs[8],cs[8],Y22Y22);
}

//encode2の結果から復元
ret.decode2xyz=function(result,cs,x,y,z){
	for(var i=0;i<3;i++){
		result[i]=cs[0][i]
			+ cs[1][i]*x
			+ cs[2][i]*y
			+ cs[3][i]*z
			+ cs[4][i]*x*z
			+ cs[5][i]*x*y
			+ cs[6][i]*(3*y*y-1)
			+ cs[7][i]*z*y
			+ cs[8][i]*(z*z-x*x);
	}
	//Vec3.madd(result,cs[0],cs[1],x);
	//Vec3.madd(result,result,cs[2],y);
	//Vec3.madd(result,result,cs[3],z);
	//Vec3.madd(result,result,cs[4],x*z);
	//Vec3.madd(result,result,cs[5],x*y);
	//Vec3.madd(result,result,cs[6],(3*y*y-1));
	//Vec3.madd(result,result,cs[7],z*y);
	//Vec3.madd(result,result,cs[8],(z*z-x*x));
}
ret.decode2=function(result,cs,theta,pi){
	var y=Math.cos(theta);
	var x=Math.sin(pi)*Math.sin(theta);
	var z=Math.cos(pi)*Math.sin(theta);
	this.decode2xyz(result,cs,x,y,z);
}

ret.mulA=function(cs){
	var a=this.A(0);
	var next=1;
	for(var i=0;i<cs.length;i++){
		if(i>next*next){
			a=this.A(next);
			next++;
		}
		Vec3.mul(cs[i],cs[i],a);
	}
}


//------係数をそこそこ効率よく求める----------
ret.encode3=function(cs,src,lmax,theta,pi){
	var cos=Math.cos(theta);
	var sin=Math.sin(theta);
	
	var m=0;
	var P=Math.pow(-1,m)*kaijo2(2*m-1)*Math.pow(sin,m);
	var oldP=0;
	for(var l=m;l<lmax;l++){
		if(l===m+1){
			oldP=P;
			P=(2*m+1)*cos*P;
		}else if(l>m+1){
			var oldoldP=oldP;
			oldP=P;
			P=((2*l-1)*cos*oldP-(l+m-1)*oldoldP)/(l-m);
		}
		var c=cs[(l+1)*l+m];
		Vec3.madd(c,c,src,P);
	}

	for(m=1;m<lmax;m++){
		var P=Math.pow(-1,m)*kaijo2(2*m-1)*Math.pow(sin,m);
		var oldP=0;
		var cosp=Math.cos(m*pi);
		var sinp=Math.sin(m*pi);
		for(var l=m;l<lmax;l++){
			if(l===m+1){
				oldP=P;
				P=(2*m+1)*cos*P;
			}else if(l>m+1){
				var oldoldP=oldP;
				oldP=P;
				P=((2*l-1)*cos*oldP-(l+m-1)*oldoldP)/(l-m);
			}
			var c=cs[(l+1)*l+m];
			Vec3.madd(c,c,src,P*cosp);
			c=cs[(l+1)*l-m];
			Vec3.madd(c,c,src,P*sinp);
		}
	}
}
var K2 = function(l,m){
	var a = (2*l+1);
	var b = kaijo(l-m)/kaijo(l+m);
	return a*b;
}
ret.encode3_2=function(cs,lmax){
	for(var l=0;l<lmax;l++){
		for(var m=0;m<=l;m++){
			var c=cs[(l+1)*l+m];
			if(m===0){
				Vec3.mul(c,c,K2(l,m));
			}else{
				var a=2*K2(l,m);
				Vec3.mul(c,c,a);
				c=cs[(l+1)*l-m];
				Vec3.mul(c,c,a);
			}
		}
	}
}

ret.decode3=function(result,cs,lmax,theta,pi){
	var cos=Math.cos(theta);
	var sin=Math.sin(theta);
	
	var m=0;
	var P=Math.pow(-1,m)*kaijo2(2*m-1)*Math.pow(sin,m);
	var oldP=0;
	Vec3.set(result,0,0,0);
	for(var l=m;l<lmax;l++){
		if(l===m+1){
			oldP=P;
			P=(2*m+1)*cos*P;
		}else if(l>m+1){
			var oldoldP=oldP;
			oldP=P;
			P=((2*l-1)*cos*oldP-(l+m-1)*oldoldP)/(l-m);
		}
		var c=cs[(l+1)*l+m];
		Vec3.madd(result,result,c,P);
	}

	for(m=1;m<lmax;m++){
		var P=Math.pow(-1,m)*kaijo2(2*m-1)*Math.pow(sin,m);
		var oldP=0;
		var cosp=Math.cos(m*pi);
		var sinp=Math.sin(m*pi);
		for(var l=m;l<lmax;l++){
			if(l===m+1){
				oldP=P;
				P=(2*m+1)*cos*P;
			}else if(l>m+1){
				var oldoldP=oldP;
				oldP=P;
				P=((2*l-1)*cos*oldP-(l+m-1)*oldoldP)/(l-m);
			}
			var c=cs[(l+1)*l+m];
			Vec3.madd(result,result,c,P*cosp);
			c=cs[(l+1)*l-m];
			Vec3.madd(result,result,c,P*sinp);
		}
	}
}

//l<=2のとき計算を高速化
var Y00 = 1/2*Math.sqrt(1/Math.PI);
var Y10 = 1/2*Math.sqrt(3/Math.PI);
var Y11 = Math.sqrt( 3/(4*Math.PI));
var Y20 = 1/4*Math.sqrt( 5/(Math.PI));
var Y22 = 3/2*Math.sqrt(5/(3*Math.PI));

ret.Y_2=function(l,m,theta,pi){
	if(l>2){
		return this.Y(l,m,theta,pi);
	}
	var y=Math.cos(theta);
	var x=Math.sin(pi)*Math.sin(theta);
	var z=Math.cos(pi)*Math.sin(theta);
	if(l==0 && m==0){
		return Y00;
	}else if(l==1 && m==0){
		return Y10*y;
	}else if(l==1 && m==-1){
		return Y11*x;
	}else if(l==1 && m==1){
		return Y11*z;
	}else if(l==2 && m==0){
		return Y20*(3*y*y-1);
	}else if(l==2 && m==-1){
		return Y22 *x*y;
	}else if(l==2 && m==1){
		return Y22*z*y;
	}else if(l==2 && m==-2){
		return Y22*x*z;
	}else if(l==2 && m==2){
		return Y22 /2 * (z*z-x*x);
	}
}
var As=[];
for(var i=0;i<9;i++){
	var a=ret.A(i);
	As.push(a);
}

return ret;
})();

export default SH;
