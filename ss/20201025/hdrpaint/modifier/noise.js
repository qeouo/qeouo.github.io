Hdrpaint.modifier["noise"] = (function(){
	var Noisegen= function(){
		Layer.apply(this);
		this.scale=128;
		this.zoffset=0;
		this.octave=0;
		this.betsu=false;
		this.func="simplex";
		this.children=null;
	};
	var ret = Noisegen;
	inherits(ret,Layer);

	ret.prototype.typename="noise";

	var scale = 1/8;
	var octave = 1;
	var _total = 1.0/(1.0 - 1.0/(1<<octave));
	var betsu = false;
	var z = 0;
	var func;

	var funcs={"perlin":Noise.perlinnoise
		,"simplex":Noise.simplexnoise
		,"value":Noise.valuenoise
	};
	ret.prototype.init=function(x,y,w,h){
		scale = 1/this.scale;
		octave = Number(this.octave);
		_total = 1/((1<<(octave+1))-1);
		betsu = this.betsu;
		func = funcs[this.func];
		z = this.zoffset;
		
	}
	ret.prototype.getPixel = function(ret,x,y){
		var r=0;
		var scale2 = scale;
		var pow = 1<<octave;
		if(betsu){
			for(var n=0;n<3;n++){
				r = 0;
				for(var i=0;i<octave+1;i++){
					scale2 =(1<<i)*scale;
					r += func(x*scale2+i*0.123+n*0.321
							,y*scale2+i*0.123+n*0.321
							,z*scale2+i*0.123+n) * (1<<(octave-i));
				}
				r *=_total;

				ret[n] = r;
			}
		}else{
			for(var i=0;i<octave+1;i++){
				scale2 =(1<<i)*scale;
				r += func(x*scale2+i*0.123
						,y*scale2+i*0.123
						,z*scale2+i*0.123 ) * (1<<(octave-i));
			}
			r *=_total;

			ret[0] = r;
			ret[1] = r;
			ret[2] = r;
		}

		ret[3] = 1;
	}


	var html = `
			func:<select class="modifier_func" title="func">
				<option value="perlin">Perlin</option>
				<option value="simplex">Simplex</option>
				<option value="value">Value</option>
				</select><br>
			スケール:<input class="slider modifier_scale" title="scale" value="32" min="1" max="256"><br>
			オクターブ数:<input class="slider modifier_octabe" title="octave" value="0" min="0" max="10" step="1"><br>
			Z(seed):<input class="slider modifier_z" title="zoffset" max="255"><br>
			rgb別:<input type="checkbox" class="modifier_betsu" title="betsu"><br>
		`;
	Hdrpaint.addModifierControl("noise",html);
	Slider.init();

	return ret;
})();

