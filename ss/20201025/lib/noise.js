var Noise=(function(){
	var Noise = function(){
	};
	var ret =Noise;

	var _NIGORO=1/256;
	var MAX = (1<<30)-1;
	var _MAX= 1/MAX;
var h=[ 151,160,137,91,90,15,
   131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
   190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
   88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
   77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
   102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
   135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
   5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
   223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
   129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
   251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
   49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
   138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
];	
	h = h.concat(h)
	var hash256 = function(x,y,z){
		return h[h[h[x]+y]+z];
	}
	var hashInt = function(x,y,z){
		return xor(xor(xor(x*123) + y*5678) +z*1234)& MAX;
	}
	var xor = function(y) {
		y = y ^ (y << 13); y = y ^ (y >> 17);
		return  y ^ (y << 5);
	}
	var fade = function(t){
		return t * t * t * (t * (t * 6 - 15) + 10); 
	}
	var fade2 = function(t){
		return t*t;
	}

	var grad = function(hash,x,y,z){
		switch(hash &0xf)
		{
			case 0x0: return  x + y;
			case 0x1: return -x + y;
			case 0x2: return  x - y;
			case 0x3: return -x - y;
			case 0x4: return  x + z;
			case 0x5: return -x + z;
			case 0x6: return  x - z;
			case 0x7: return -x - z;
			case 0x8: return  y + z;
			case 0x9: return -y + z;
			case 0xa: return  y - z;
			case 0xb: return -y - z;
			case 0xc: return  y + x;
			case 0xd: return -y + z;
			case 0xe: return  y - x;
			case 0xf: return -y - z;
			default: return 0; 
		}
	}
	var lerp = function(r,a,b){
		return a*(1-r) + b * r;
	}
	ret.valuenoise=function(x,y,z){
	   var x_d = x - (x|0);
	   var y_d = y - (y|0);
	   var z_d = z - (z|0);
	   var x_i = x&0xff;
	   var y_i = y&0xff;
	   var z_i = z&0xff;
	   var x_f = fade(x_d);
	   var y_f = fade(y_d);
	   var z_f = fade(z_d);
			 
		var r =
			lerp(z_f
			,lerp(y_f
				,lerp(x_f,hash256(x_i,y_i,z_i) ,hash256(x_i+1,y_i,z_i))
				,lerp(x_f,hash256(x_i,y_i+1,z_i) ,hash256(x_i+1,y_i+1,z_i)))
				,lerp(y_f
				,lerp(x_f,hash256(x_i,y_i,z_i+1) ,hash256(x_i+1,y_i,z_i+1))
				,lerp(x_f,hash256(x_i,y_i+1,z_i+1) ,hash256(x_i+1,y_i+1,z_i+1)))
	   );
		 return  r*_NIGORO;
	}
	ret.perlinnoise=function(x,y,z){
	   var x_d = x - (x|0);
	   var y_d = y - (y|0);
	   var z_d = z - (z|0);
	   var x_i = x&0xff;
	   var y_i = y&0xff;
	   var z_i = z&0xff;
	   var x_f = fade(x_d);
	   var y_f = fade(y_d);
	   var z_f = fade(z_d);
	 
		var r =
			lerp(z_f
			,lerp(y_f
				,lerp(x_f,grad(hash256(x_i,y_i,z_i),x_d,y_d,z_d) 
					,grad(hash256(x_i+1,y_i,z_i),x_d-1,y_d,z_d))
					,lerp(x_f,grad(hash256(x_i,y_i+1,z_i),x_d,y_d-1,z_d) 
					,grad(hash256(x_i+1,y_i+1,z_i),x_d-1,y_d-1,z_d)))
				,lerp(y_f,lerp(x_f,grad(hash256(x_i,y_i,z_i+1),x_d,y_d,z_d-1)
					,grad(hash256(x_i+1,y_i,z_i+1),x_d-1,y_d,z_d-1))
				,lerp(x_f,grad(hash256(x_i,y_i+1,z_i+1),x_d,y_d-1,z_d-1) 
				,grad(hash256(x_i+1,y_i+1,z_i+1),x_d-1,y_d-1,z_d-1)))
	   );
	   return r*0.5+0.5;

	}
	var ROOT3_2= Math.sqrt(3)/2;
	var _ROOT3_2= 1/ROOT3_2;


  var F3 = 1.0 / 3.0;
  var G3 = -1.0 / 6.0;
  var hash3=function(x,y,z){
	return h[x + h[y + h[z&0xff]&0xff]&0xff];
  }

	ret.simplexnoise = function(xin,yin,zin){
		
      var s = (xin + yin + zin) * F3; 
      var i = Math.floor(xin + s);
      var j = Math.floor(yin + s);
      var k = Math.floor(zin + s);

      var t = (i + j + k) * G3;
      var x0 = xin - (i + t);
      var y0 = yin - (j + t);
      var z0 = zin - (k + t);
      var i1, j1, k1; 
      var i2, j2, k2; 
      if (x0 >= y0) {
        if (y0 >= z0) {
          i1 = 1; j1 = 0; k1 = 0;
          i2 = 1; j2 = 1; k2 = 0;
        } else if (x0 >= z0) {
          i1 = 1; j1 = 0; k1 = 0;
          i2 = 1; j2 = 0; k2 = 1;
        } else {
          i1 = 0; j1 = 0; k1 = 1;
          i2 = 1; j2 = 0; k2 = 1;
        }
      } else { 
        if (y0 < z0) {
          i1 = 0; j1 = 0; k1 = 1;
          i2 = 0; j2 = 1; k2 = 1;
        } else if (x0 < z0) {
          i1 = 0; j1 = 1; k1 = 0;
          i2 = 0; j2 = 1; k2 = 1;
        } else {
          i1 = 0; j1 = 1; k1 = 0;
          i2 = 1; j2 = 1; k2 = 0;
        } 
      }
      var x1 = x0 - (i1 + G3); 
      var y1 = y0 - (j1 + G3);
      var z1 = z0 - (k1 + G3);
      var x2 = x0 - (i2 + 2.0 * G3);
      var y2 = y0 - (j2 + 2.0 * G3);
      var z2 = z0 - (k2 + 2.0 * G3);
      var x3 = x0 - (1.0 + 3.0 * G3);
      var y3 = y0 - (1.0 + 3.0 * G3);
      var z3 = z0 - (1.0 + 3.0 * G3);

	  var v =
		  fade2(Math.max(0.5 - (x0 * x0 + y0 * y0 + z0 * z0),0))
			 * grad(hash3(i,j,k),x0,y0,z0)
		+ fade2(Math.max(0.5 - (x1 * x1 + y1 * y1 + z1 * z1),0))
			* grad(hash3(i+i1,j+j1,k+k1),x1,y1,z1)
		+ fade2(Math.max(0.5 - (x2 * x2 + y2 * y2 + z2 * z2),0))
			* grad(hash3(i+i2,j+j2,k+k2),x2,y2,z2)
		+ fade2(Math.max(0.5 - (x3 * x3 + y3 * y3 + z3 * z3),0))
			* grad(hash3(i+1,j+1,k+1),x3,y3,z3);
	  return v*10 * 0.5 + 0.5;
	}
	return ret;
})()
