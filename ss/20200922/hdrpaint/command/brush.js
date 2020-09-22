Command["eraser"]=(function(){
	return function(log,undo_flg){
		//消しゴム描画
		Command.brush(log,undo_flg);
	}
})();
Command["brush"] = (function(){
	return function(log,undo_flg){
		//ペン描画
		if(undo_flg){
			return;
		}
		var param = log.param;
		var layer = Layer.findById(param.layer_id);
		var points = param.points;

			painted_mask.fill(0);

		for(var li=1;li<points.length;li++){
			Command.drawHermitian(log,li);
		}
	}
})();

Command.drawHermitian = (function(){
	var A = new Vec2(),B= new Vec2(),C= new Vec2(),D=new Vec2();
	var q0=new Vec2();
	var q1=new Vec2();
	var _p = [];
	var MAX=32;
	for(var i=0;i<MAX;i++){
		_p.push(new PenPoint());
	}

	var clamp=function(value,min,max){
		return Math.min(max,Math.max(min,value));
	}
	var brush_blend=function(dst,idx,pressure,dist,flg,weight,param){
		var alpha_mask = param.alpha_mask;
		var color = param.color;
		var sa = color[3] * param.alpha; 
		if(param.eraser){
			sa = param.alpha;
		}
		if(param.alpha_pressure_effect){
			sa *= pressure;
		}
		var l = Vec2.scalar(dist);
		if(param.softness){
			sa = sa  * Math.min(1,( weight - (weight*l))/(weight*param.softness));
		}else{
			if(param.antialias){
				sa = sa  * Math.min(1,( weight - (weight*l)));
			}	
		}
		if(param.eraser){
			if(param.overlap===2){
				dst[idx+3]=(1-sa) * (1-param.alpha);
			return;
			}
		}

		if(param.overlap===2){
			dst[idx+0] =  color[0] ;
			dst[idx+1] =  color[1] ;
			dst[idx+2] =  color[2] ;
			if(!alpha_mask){
				dst[idx+3] =  sa ;
			}
			return;
		}

		if(param.overlap==0){
			if(flg[idx>>2]>=sa){
				return;
			}
			var olda =flg[idx>>2];
			flg[idx>>2]=sa;
			sa = (sa - olda)/(1-olda);
		}
		if(param.eraser){
			dst[idx+3] = dst[idx+3] * (1-sa) + 0* sa;
			return;
		}

		var da = dst[idx+3]*(1-sa);
		if(!alpha_mask){
			dst[idx+3] = da + sa;
		}

		if( dst[idx+3] && !param.eraser){
			var rr = 1/dst[idx+3];
			da*=rr;
			sa*=rr;
			dst[idx+0] += (dst[idx+0] * (-1+da) + color[0] * sa);
			dst[idx+1] += (dst[idx+1] * (-1+da) + color[1] * sa);
			dst[idx+2] += (dst[idx+2] * (-1+da) + color[2] * sa);
		}
	}

	var vec2 =new Vec2();
	var side = new Vec2();
	var dist = new Vec2();
	var drawPen=function(img,point0,point1,param){
		var weight = param.weight;
		var pressure_mask = param.pressure_effect_flgs;
		var softness= param.softness;
		//描画
		var img_data = img.data;
	
		weight*=0.5;

		var weight_pressure_effect = pressure_mask&1;
		var alpha_pressure_effect = (pressure_mask&2)>>1;
		var pos1 = point1.pos;
		var pos0 = point0.pos;

		var pressure_0=point0.pressure;
		var d_pressure=point1.pressure - point0.pressure;

		var weight_0pow2 = weight  *( ( pressure_0 - 1)*weight_pressure_effect + 1);
		var weight_1pow2 = weight  *( (d_pressure + pressure_0 - 1)*weight_pressure_effect + 1);
		var max_weight = Math.max(weight_0pow2,weight_1pow2);
		var weight_0pow2 = weight_0pow2 * weight_0pow2;
		var weight_1pow2 = weight_1pow2 * weight_1pow2;

		var left = Math.min(pos1[0],pos0[0]);
		var right= Math.max(pos1[0],pos0[0])+1;
		var top= Math.min(pos1[1],pos0[1]);
		var bottom= Math.max(pos1[1],pos0[1])+1;
		
		left = Math.floor(clamp(left-max_weight,0,img.width));
		right= Math.ceil(clamp(right+max_weight,0,img.width));
		top= Math.floor(clamp(top-max_weight,0,img.height));
		bottom=Math.ceil(clamp(bottom+max_weight,0,img.height));

		Vec2.sub(vec2,pos1,pos0);
		var l = Vec2.scalar2(vec2);
		if(l!==0){
			Vec2.mul(vec2,vec2,1/l);
		}else{
			Vec2.set(vec2,0,0);
		}
		Vec2.set(side,vec2[1],-vec2[0]);
		Vec2.norm(side);


		drawfunc=brush_blend;
		for(var dy=top;dy<bottom;dy++){
			for(var dx=left;dx<right;dx++){
				dist[0]=dx-pos0[0]+0.5;
				dist[1]=dy-pos0[1]+0.5;
				var dp = Vec2.dot(vec2,dist);
				var l=0;
				var l2=0;
				var local_pressure=0;
				if(dp<=0){
					//始点より前
					
					if(Vec2.scalar2(dist)>=weight_0pow2){
						continue;
					}
					dp=0;
					l = Vec2.scalar(dist);
					local_pressure = d_pressure * dp + pressure_0 ;
					local_weight = weight  *( (local_pressure - 1)*weight_pressure_effect + 1);
				}else if(dp>=1){
					//終端より後

					dist[0]=dx-pos1[0]+0.5;
					dist[1]=dy-pos1[1]+0.5;
					
					if(Vec2.scalar2(dist)>=weight_1pow2){
						continue;
					}
					dp=1;
					l = Vec2.scalar(dist);
					local_pressure = d_pressure * dp + pressure_0 ;
					local_weight = weight  *( (local_pressure - 1)*weight_pressure_effect + 1);
				}else{
					//線半ば
					
					local_pressure = d_pressure * dp + pressure_0 ;
					local_weight = weight  *( (local_pressure - 1)*weight_pressure_effect + 1);
					l = Vec2.dot(dist,side);
					if(l*l>=local_weight*local_weight){
						//線幅より外の場合
						continue;
					}
					Vec2.mul(dist,side,l);
					l=Math.abs(l);
				}
				var idx = dy*img.width+ dx|0;

				Vec2.mul(dist,dist,1/local_weight);
				drawfunc(img_data,idx<<2,local_pressure,dist,painted_mask,local_weight,param);
			}
		}


	}
	return function(pen_log,n){
		var param=pen_log.param;
		var points = param.points;
		var layer = Layer.findById(param.layer_id);
		if(!layer){
			layer = param.layer;
		}
		var img= layer.img;


		var point0=points[n-1];
		var point1=points[n];
		var p0=point0.pos;
		var p1=point1.pos;
		var param = pen_log.param;


		//補間するための係数を求める
		if(n>=2 ){
			Vec2.sub(A,p0,points[n-2].pos);
			var l1 = Vec2.scalar(A);
			Vec2.sub(B,p1,p0);
			var l2 = Vec2.scalar(B);
			if(l1+l2>0){
				Vec2.mul(q0,A,  (l2/(l1+l2)));
				Vec2.madd(q0,q0,B, (l1/(l1+l2)));
			}
			
		}else{
			Vec2.sub(q0,p1,p0);
		}
		if(n+ 1<points.length) {
			Vec2.sub(A,p1,p0);
			var l1 = Vec2.scalar(A);
			Vec2.sub(B,points[n+1].pos,p1);
			var l2 = Vec2.scalar(B);
			if(l1+l2>0){
				Vec2.mul(q1,A, (l2/(l1+l2)));
				Vec2.madd(q1,q1,B, (l1/(l1+l2)));
			}

		}else{
			Vec2.sub(q1,p1,p0);
			Vec2.madd(q1,q1,q0,-0.5);
		}

		Vec2.copy(D,p0);

		Vec2.copy(C,q0);
		
		Vec2.madd(A,q1,p1,-2);
		Vec2.add(A,A,q0);
		Vec2.madd(A,A,p0,2);

		Vec2.sub(B,p1,A);
		Vec2.sub(B,B,q0);
		Vec2.sub(B,B,p0);


		var dp = point1.pressure - point0.pressure;
		var len = Vec2.len(p1,p0);
		var devide= clamp((len/4)|0,1,MAX-1);

		if(!param.stroke_interpolation){
			//補間しない
			devide=1;
		}
		var _devide=1/devide;

		var wei = param.weight*0.5;
		if(param.pressure_effect_flgs & 1){
			wei *=Math.max(point0.pressure,point1.pressure);
		}
		var left   = img.width;
		var right  = 0;
		var top    = img.height;
		var bottom = 0;

		for(var i=0;i<devide+1;i++){
			var p=_p[i];

			var dt = i*_devide;
			Vec2.mul (p.pos,  A,dt*dt*dt);
			Vec2.madd(p.pos,p.pos,B,dt*dt);
			Vec2.madd(p.pos,p.pos,C,dt);
			Vec2.add (p.pos,p.pos,D);

			p.pressure=point0.pressure + dp*dt;

			Vec2.sub(p.pos,p.pos,layer.position);

			left   = Math.min(p.pos[0],left);
			right  = Math.max(p.pos[0],right);
			top    = Math.min(p.pos[1],top);
			bottom = Math.max(p.pos[1],bottom);
			
		}

		left = Math.floor(clamp(left -wei,0,img.width-1));
		right= Math.ceil(clamp(right + wei,0,img.width-1));
		top= Math.floor(clamp(top -wei,0,img.height-1));
		bottom=Math.ceil(clamp(bottom + wei,0,img.height-1));

		if(pen_log){
			//差分ログ作成
			var log = pen_log;
			if(!log.undo_data){
				log.undo_data={"difs":[]};
			}
			if(log.undo_data.difs.length<n){
				var dif=Command.createDif(layer,left,top,right-left+1,bottom-top+1);
				log.undo_data.difs.push(dif);
			}
		}

		for(var i=0;i<devide;i++){
			drawPen(layer.img,_p[i],_p[i+1],param);
		}

		//再描画
		layer.refreshImg(left,top,right-left+1,bottom-top+1);

	}


})();

