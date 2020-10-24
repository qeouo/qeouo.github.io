commandObjs["noise"] = (function(){
	var _Noise= function(){
		CommandBase.apply(this);
	}
	var ret = _Noise;
	ret.filter = true;
	inherits(ret,CommandBase);

	ret.prototype.undo = function(){
		this.undo_default();
		
	}
	ret.prototype.func = function(){
		var param = this.param;
		var layer = Layer.findById(param.layer_id);

		if(!this.undo_data){
			var dif=Hdrpaint.createDif(layer,0,0,layer.img.width,layer.img.height);
			this.undo_data={};
			this.undo_data.difs=[];
			this.undo_data.difs.push(dif);

		}
		var scale = 1.0/this.param.scale;
		var octave = this.param.octave+1;
		var betsu = this.param.betsu;
		var z= this.param.z;
		var _total = 1.0/(1.0 - 1.0/(1<<octave));
		layer.img.scan(function(data,idx,x,y){
			var r=0;
			var scale2 = scale;
			if(betsu){
				for(var n=0;n<3;n++){
					r = 0;
					for(var i=0;i<octave;i++){
						scale2 =(1<<i)*scale;
						r += Noise.perlinnoise(x*scale2+i*0.123+n*0.345
								,y*scale2+i*0.123+n*0.345
								,z*scale2+i*0.123+n*0.345+ n*5) / (2<<i);
					}
					r *=_total;

					data[idx+n] = r;
				}
			}else{
				for(var i=0;i<octave;i++){
					scale2 =(1<<i)*scale;
					r += Noise.perlinnoise(x*scale2+i*0.123
							,y*scale2+i*0.123,z*scale2+i*0.123) / (2<<i);
				}
				r *=_total;

				data[idx] = r;
				data[idx+1] = r;
				data[idx+2] = r;
			}

			data[idx+3] = 1;
		});
		layer.refreshImg();
	}

	Hdrpaint.addFilter("noise","ノイズ");

	var html = `			スケール:<input type="text" class="scale size" value="32"><br>
			オクターブ数:<input type="text" class="octave size" value="2"><br>
			Z(seed):<input type="text" class="z size" value="0"><br>
			rgb別:<input type="checkbox" class="betsu"><br>
			<a href="#" class="button">実行</a>
		`;
	Hdrpaint.addDialog("noise_dialog",html);

		var dialog = document.querySelector("#noise_dialog");

	document.getElementById("noise").addEventListener("click",function(){
		Hdrpaint.showDialog("noise_dialog");
		return false;
	});

	
	dialog.querySelector(".button").addEventListener("click",function(e){
		Hdrpaint.executeCommand("noise",{
			"layer_id":selected_layer.id
			,"scale":Number(dialog.querySelector(".scale").value)
			,"octave":Number(dialog.querySelector(".octave").value)
			,"z":Number(dialog.querySelector(".z").value)
			,"betsu":Number(dialog.querySelector(".betsu").checked)
		});
		Hdrpaint.closeDialog();

	});


	return ret;
})();

