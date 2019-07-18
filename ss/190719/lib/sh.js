var SH = (function(){
	var SH = {};
	var ret = SH;

ret.A=function(l){
	if(l==1){
		return 2*Math.PI/3;
	}else if(l&1){
		return 0;
	}else{
		return 2*Math.PI*Math.pow(-1,l/2-1)/((l+2)*(l-1))
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
var k1=1/(4*Math.PI);
var K = function(l,m){
	var a = (2*l+1)*k1;
	var b = kaijo(l-Math.abs(m))/kaijo(l+Math.abs(m));
	return Math.sqrt(a*b);
}
var sqrt2=Math.sqrt(2);
ret.Y=function(l,m,theta,pi){
	if(m>0){
		return sqrt2*K(l,m)*Math.cos(m*pi)*P(l,m,Math.cos(theta));
	}else if(m<0){
		return sqrt2*K(l,m)*Math.sin(-m*pi)*P(l,-m,Math.cos(theta));
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

ret.Y_2=function(l,m,theta,pi){
	var y=Math.cos(theta);
	var x=Math.sin(pi)*Math.sin(theta);
	var z=Math.cos(pi)*Math.sin(theta);
	if(l==0 && m==0){
		var Y00 = 1/2*Math.sqrt(1/Math.PI);
		return Y00;
	}else if(l==1 && m==0){
		var Y10 = 1/2*Math.sqrt(3/Math.PI)*y;
		return Y10;
	}else if(l==1 && m==-1){
		if(y==1 || y==-1){
			return 0;
		}
		return Math.sqrt( 3/(4*Math.PI))*x
	}else if(l==1 && m==1){
		if(y==1 || y==-1){
			return 0;
		}
		return Math.sqrt( 3/(4*Math.PI))*z
	}else if(l==2 && m==0){
		return 1/4*Math.sqrt( 5/(Math.PI))*(3*y*y-1);
	}else if(l==2 && m==-2){
		return 3/2*Math.sqrt(5/(3*Math.PI))*x*z;
	}else if(l==2 && m==2){
		return 3/4*Math.sqrt(5/(3*Math.PI))*(z*z-x*x);
	}else if(l==2 && m==-1){
		return 3/2*Math.sqrt(5/(3*Math.PI))*x*y;
	}else if(l==2 && m==1){
		return 3/2*Math.sqrt(5/(3*Math.PI))*z*y;
	}else{
		return this.Y(l,m,theta,pi);
	}
}
return ret;
})();
