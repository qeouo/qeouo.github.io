
var painted_mask=new Float32Array(1024*1024);
var PenFunc = (function(){
	var PenFunc=function(){
		this.pen_log=null;
		this.endFlg=0;
		this.idx=0;
		this.ragtime=0;
		var aaa=this;
		//window.requestAnimationFrame(function(){aaa.actualDraw()});
		setTimeout(function(){aaa.actualDraw();},1);
	}
	PenFunc.prototype.end=function(){
		this.endFlg=1;
	}
	PenFunc.prototype.actualDraw=function(){
		var aaa=this;
		var log = this.pen_log;
		var points = log.param.points;
		
		if(this.endFlg && points.length <= this.idx){
			var layer = Layer.findById(log.param.layer_id);

			painted_mask.fill(0);

		}else{
			//window.requestAnimationFrame(function(){
			//	aaa.actualDraw()
			//});
			setTimeout(function(){aaa.actualDraw();},1);
		}

		if(points.length <= this.idx){
			return;
		}

		var org = points[this.idx];


		if(org.time + this.ragtime>Date.now()){
			return;
		}
		if(this.idx>=1){

			//ログ文面変更
			log.label = ("0000" + log.id).slice(-4) + "| " + log.command;
			log.label += "(" + points[0].pos[0].toFixed(2)+ ","+ points[0].pos[1].toFixed(2)+")-";
			log.label += (points.length-2) +"-";
			log.label += "(" + points[points.length-1].pos[0].toFixed(2)+ ","+ points[points.length-1].pos[1].toFixed(2)+")";
			var option = inputs["history"].options[inputs["history"].selectedIndex];
			Util.setText(option,log.label);

			//今回と前回の座標で直線描画
			Command.drawHermitian(log,this.idx);
		}
		this.idx++;
	}
	return PenFunc;
})();
