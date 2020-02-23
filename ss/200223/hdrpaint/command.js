
var copyImg= function(dst,dst_x,dst_y,src,src_x,src_y,src_w,src_h){
	var dst_data = dst.data;
	var dst_width = dst.width;
	var src_data = src.data;
	var src_width = src.width;
	var dst_idx = 0;
	var src_idx = 0;
	var max_yi = Math.min(src_h,dst.height -dst_y);
	var max_xi = Math.min(src_w,dst.width-dst_x);
	for(var yi=0;yi<max_yi;yi++){
		dst_idx = (yi + dst_y) * dst_width + dst_x<<2;
		src_idx = (yi + src_y) * src_width + src_x<<2;
		for(var xi=0;xi<max_xi;xi++){
			dst_data[dst_idx+0] = src_data[src_idx+0];
			dst_data[dst_idx+1] = src_data[src_idx+1];
			dst_data[dst_idx+2] = src_data[src_idx+2];
			dst_data[dst_idx+3] = src_data[src_idx+3];
			dst_idx+=4;
			src_idx+=4;
		}

	}
}
var Command = (function(){
	var  Command = function(){};
	var ret = Command;

var createDif=function(layer,left,top,width,height){
	//更新領域の古い情報を保存
	var img = new Img(width,height);
	copyImg(img,0,0,layer.img,left,top,width,height);
	var dif={};
	dif.img=img;
	dif.x=left;
	dif.y=top;
	return dif;

}
	var fillStack=[];
	var joined_r,joined_g,joined_b,joined_a;
	var target_r,target_g,target_b,target_a;
	var refresh_left,refresh_top,refresh_bottom,refresh_right;
	var fillCheck_all = function(target_data,joined_data,idx){
		return (joined_r===joined_data[idx]
		&& joined_g===joined_data[idx+1]
		&& joined_b===joined_data[idx+2]
		&& joined_a===joined_data[idx+3]
		&& target_r===target_data[idx]
		&& target_g===target_data[idx+1]
		&& target_b===target_data[idx+2]
		&& target_a===target_data[idx+3]);
	}
	var fillCheck_layer = function(target_data,joined_data,idx){
		return ( target_r===target_data[idx]
		&& target_g===target_data[idx+1]
		&& target_b===target_data[idx+2]
		&& target_a===target_data[idx+3]);
	}
	var fillSub=function(target,y,left,right,is_layer){
		var fillCheck=fillCheck_all;
		if(is_layer){
			fillCheck=fillCheck_layer;
		}
		var ref_data = joined_img.data;

		var target_data=target.data;
		var mode=0;

		//左の端を探す
		var xi = left;
		var yidx = target.width*y<<2;
		for(;xi>=0;xi--){
			var idx2 = yidx + (xi<<2);
			if(fillCheck(target_data,ref_data,idx2)){
				if(mode===0){
					mode=1;
				}
			}else{
				break;
			}
		}
		if(mode===1){
			fillStack.push(y);
			fillStack.push(xi+1);
		}

		for(var xi=left;xi<right;xi++){
			var idx2 = yidx + (xi<<2);
			if(fillCheck(target_data,ref_data,idx2)){
				if(mode===0){
					fillStack.push(y);
					fillStack.push(xi);
					mode=1;
				}
			}else{
				if(mode===1){
					fillStack.push(xi);
					mode=0;
				}
			}
		}

		//右端
		if(mode===1){
			var xi = right-1;
			for(;xi<target.width;xi++){
				var idx2 = yidx + (xi<<2);
				if(fillCheck(target_data,ref_data,idx2)){
				}else{
					break;
				}
			}
			fillStack.push(xi);
		}
	}

	ret.fill=function(layer,point_x,point_y,col,is_layer){
		var mask_alpha= layer.mask_alpha;
		var one_minus_mask_alpha= 1-mask_alpha;
		var fillCheck=fillCheck_all;
		if(is_layer){
			fillCheck=fillCheck_layer;
		}
		fillStack=[];
		var x = point_x|0;
		var y = point_y|0;
		refresh_top=y;
		refresh_bottom=y;
		refresh_left=x;
		refresh_right=x;


		var target= layer.img;
		var idx = y*joined_img.width+x<<2;
		joined_r=joined_img.data[idx];
		joined_g=joined_img.data[idx+1];
		joined_b=joined_img.data[idx+2];
		joined_a=joined_img.data[idx+3];
		target_r=target.data[idx];
		target_g=target.data[idx+1];
		target_b=target.data[idx+2];
		target_a=target.data[idx+3];
		var draw_r =col[0];
		var draw_g =col[1];
		var draw_b =col[2];
		var draw_a =col[3];

		var ref_data = joined_img.data;
		var target_data = target.data;
		if(    target_r === draw_r
			&& target_g === draw_g
			&& target_b === draw_b
			&& target_a === draw_a){
			return;
		}

		var old_img = new Img(target.width,target.height);
		copyImg(old_img,0,0,target,0,0,target.width,target.height);

		fillStack.push(y);
		fillStack.push(x);
		fillStack.push(x);
		
		while(1){
			if(fillStack.length===0){
				break;
			}
			right = fillStack.pop();
			left = fillStack.pop();
			var yi = fillStack.pop();
			//fillFunc(img,x,y);

			//塗りつぶし
			var yidx = target.width*yi<<2;
			for(var xi=left;xi<right;xi++){
				idx = yidx + (xi<<2);
				target_data[idx]=draw_r;
				target_data[idx+1]=draw_g;
				target_data[idx+2]=draw_b;
				target_data[idx+3]=target_data[idx+3]*mask_alpha+draw_a*one_minus_mask_alpha;
			}

			if(yi>0){
				fillSub(target,yi-1,left,right,is_layer);
			}
			if(yi<target.height-1){
				fillSub(target,yi+1,left,right,is_layer);
			}
			refresh_left=Math.min(refresh_left,left);
			refresh_top=Math.min(refresh_top,yi);
			refresh_bottom=Math.max(refresh_bottom,yi+1);
			refresh_right=Math.max(refresh_right,right);
		}

		var width = refresh_right-refresh_left;
		var height= refresh_bottom -refresh_top;

		var log = History.createLog("fill",{"layer_id":layer.id,"x":point_x,"y":point_y,"color":new Float32Array(col),"is_layer":is_layer},"fill("+ point_x +","+point_y+")",{"layer":layer});
		if(log){
			var layer_img= layer.img;
			layer.img = old_img;
			var dif=createDif(layer,refresh_left,refresh_top,width,height);
			layer.img=layer_img;
			log.undo_data.difs=[];
			log.undo_data.difs.push(dif);
		}

		refreshMain(0,refresh_left,refresh_top,refresh_right-refresh_left,refresh_bottom-refresh_top);
		refreshLayerThumbnail(layer);
	}


	ret.pen=function(layer,points,weight,col,color_mask,pressure_effect_flgs,alpha_direct){
		for(var li=0;li<points.length-1;li++){
			Command.drawLine(layer,points[li],points[li+1],weight,col,color_mask,pressure_effect_flgs,alpha_direct);
		}
		refreshLayerThumbnail(layer);

	}
	ret.drawLine=function(layer,point0,point1,weight,col,color_mask,pressure_effect_flg,alpha_direct){
		var img= layer.img;
		var new_p = point1.pos;
		var old_p = point0.pos;


		var point0_weight = weight;
		var point1_weight = weight;
		if(pressure_effect_flg &1){
			point0_weight*=point0.pressure;
			point1_weight*=point1.pressure;
		}
		var max_weight = Math.max(point0_weight,point1_weight);

		var left = Math.min(new_p[0],old_p[0]);
		var right= Math.max(new_p[0],old_p[0])+1;
		var top= Math.min(new_p[1],old_p[1]);
		var bottom= Math.max(new_p[1],old_p[1])+1;
		
		left = Math.floor(clamp(left-max_weight,0,img.width));
		right= Math.ceil(clamp(right+max_weight,0,img.width));
		top= Math.floor(clamp(top-max_weight,0,img.height));
		bottom=Math.ceil(clamp(bottom+max_weight,0,img.height));


		if(pen_log){
			//差分ログ作成
			var log = pen_log;
			var dif=createDif(layer,left-layer.position[0],top-layer.position[1],right-left,bottom-top);
			if(!log.undo_data.difs){
				log.undo_data.difs=[];
			}
			log.undo_data.difs.push(dif);
		}
		var org_pos0=point0.pos;
		var org_pos1=point1.pos;
		point0.pos=new Vec2();
		point1.pos=new Vec2();
		Vec2.sub(point0.pos,org_pos0,layer.position);
		Vec2.sub(point1.pos,org_pos1,layer.position);

		drawPen(layer.img,point0,point1,col,color_mask,weight,pressure_effect_flg,alpha_direct);
		point0.pos=org_pos0;
		point1.pos=org_pos1;

		if(right-left>0 && bottom-top>0){
			//再描画
			refreshMain(0,left,top,right-left,bottom-top);
		}
	}

	Command.loadImageFile=function(file,n){
		var layer=createLayer(null,n);

		var fu =function(img){
			
			layer.img=img;
			layer.name = file.name;

			refreshLayerThumbnail(layer);
			refreshLayer(layer);
			refreshMain(0);

		}
	 	if(/.*exr$/.test(file.name)){
			Util.loadBinary(file,function(buffer){
				var img=Img.loadExr(buffer);
				fu(img);
			});
	 	}else if(/^image\//.test(file.type)){
			Util.loadFile(file,Img.loadImg,fu);
	 	}

		var log = History.createLog("loadImageFile",{"layer_id":layer.id,"file":file.name,"positon":n},"loadImageFIle("+file.name+")",{"file":file});

		return layer;
	}

	Command.translateLayer=function(layer,x,y){
		layer.position[0]+=x;
		layer.position[1]+=y;
		var log = History.createLog("translateLayer",{"layer_id":layer.id,"x":x,"y":y},"translateLayer("+x+","+y+")",{});

		refreshLayer(layer);
		refreshMain(0,layer.position[0]-Math.abs(x),layer.position[1]-Math.abs(y)
			,layer.img.width+Math.abs(x)*2,layer.img.height+Math.abs(y)*2);
	}
	Command.resizeCanvas=function(width,height){
		var old_width=preview.width;
		var old_height=preview.height;


		var log = History.createLog("resizeCanvas",{"width":width,"height":height},"reisizeCanavs",{"width":old_width,"height":old_height});


		preview.width=width;
		preview.height=height

		preview_ctx_imagedata=preview_ctx.createImageData(width,height);
		joined_img = new Img(width,height);
		horizon_img = new Img(width,height);
		bloomed_img = new Img(width,height);
		bloom_img = new Img(width,height);

		refreshMain(0);
	}
	Command.resizeLayer=function(layer,width,height){
		var img = layer.img;
		if(!img){
			return;
		}
		var old_width=img.width;
		var old_height=img.height;
		
		//差分ログ作成
		var log = History.createLog("resizeLayer",{"layer_id":layer.id,"width":width,"height":height},"reisizeCanavs",{"width":old_width,"height":old_height});
		if(log){
			var dx = old_width-width;
			var dy = old_height-height;
			if(!log.undo_data.difs){
				log.undo_data.difs=[];
			}
			var dif;
			if(dx>0){
				dif=createDif(layer,width,0,dx,old_height);
				log.undo_data.difs.push(dif);
			}
			if(dy>0){
				dif=createDif(layer,0,height,old_width,dy);
				log.undo_data.difs.push(dif);
			}
		}
		var old_img = img;

		layer.img=new Img(width,height);
		copyImg(layer.img,0,0,old_img,0,0,old_img.width,old_img.height);
		refreshLayer(layer);
		refreshMain(0,0,0,layer.img.width,layer.img.height);



		refreshMain(0);
	}
	return ret;
})();
	var clamp=function(value,min,max){
		return Math.min(max,Math.max(min,value));
	}

	var vec2 =new Vec2();
	var side = new Vec2();
	var dist = new Vec2();
	var drawPen=function(img,point0,point1,color,mask,weight,pressure_mask,alpha_direct){
		var mask_alpha = 1-mask;
		var weight_pressure_effect = pressure_mask&1;
		var alpha_pressure_effect = (pressure_mask&2)>>1;
		var img_data = img.data;
		var new_p = point1.pos;
		var old_p = point0.pos;
		vec2[0] = new_p[0];
		vec2[1] = new_p[1];

		var point0_pressure=point0.pressure;
		var point1_pressure=point1.pressure;
		var point1_0_pressure=point1.pressure - point0.pressure;

		var point0_weight = weight;
		var point1_weight = weight;
		if(weight_pressure_effect){
			point0_weight*=point0.pressure;
			point1_weight*=point1.pressure;
		}
		var point0_weight2=point0_weight*point0_weight;
		var point1_weight2=point1_weight*point1_weight;
		var max_weight = Math.max(point0_weight,point1_weight);

		var left = Math.min(new_p[0],old_p[0]);
		var right= Math.max(new_p[0],old_p[0])+1;
		var top= Math.min(new_p[1],old_p[1]);
		var bottom= Math.max(new_p[1],old_p[1])+1;
		
		left = Math.floor(clamp(left-max_weight,0,img.width));
		right= Math.ceil(clamp(right+max_weight,0,img.width));
		top= Math.floor(clamp(top-max_weight,0,img.height));
		bottom=Math.ceil(clamp(bottom+max_weight,0,img.height));

		Vec2.sub(vec2,new_p,old_p);
		var l = Vec2.scalar2(vec2);
		if(l!==0){
			Vec2.mul(vec2,vec2,1/l);
		}else{
			Vec2.set(vec2,0,0);
		}
		Vec2.set(side,vec2[1],-vec2[0]);
		Vec2.norm(side);

		var r=color[0];
		var g=color[1];
		var b=color[2];
		var a=color[3];
		var drawfunc=function(idx,local_pressure,r,g,b,a){
			var local_r=r;// point0.pressure * (1-l) + point1.pressure * l;
			var local_alpha = a *((local_pressure - 1)*alpha_pressure_effect + 1);
			var rev_a = 1-local_alpha;

			img_data[idx+0]=img_data[idx+0] * rev_a + local_r * local_alpha;
			img_data[idx+1]=img_data[idx+1] * rev_a + g * local_alpha;
			img_data[idx+2]=img_data[idx+2] * rev_a + b * local_alpha;
			//img_data[idx+3]=;
			
			//var local_alpha = a;//local_pressure;
			img_data[idx+3] = img_data[idx+3] * rev_a + local_alpha;

		}
		if(alpha_direct){
			drawfunc=function(idx,local_pressure,r,g,b,a){
				var local_r=r;// point0.pressure * (1-l) + point1.pressure * l;

				img_data[idx+0]=local_r;
				img_data[idx+1]=g;
				img_data[idx+2]=b;
				//img_data[idx+3]=;
				
				//var local_alpha = a;//local_pressure;
				var local_alpha = a *((local_pressure - 1)*alpha_pressure_effect + 1);
				img_data[idx+3] += (local_alpha- img_data[idx+3]) * mask_alpha;
			}
		}
		for(var dy=top;dy<bottom;dy++){
			for(var dx=left;dx<right;dx++){
				var idx = dy*img.width+ dx<<2;
				dist[0]=dx-old_p[0];
				dist[1]=dy-old_p[1];
				l = Vec2.dot(vec2,dist);
				var local_pressure=0;
				if(l<=0){
					//始点より前
					if(Vec2.scalar2(dist)>point0_weight2){
						continue;
					}
					local_pressure=point0_pressure;
				}else if(l>=1){
					//終端より後


					dist[0]=dx-new_p[0];
					dist[1]=dy-new_p[1];
					
					if(Vec2.scalar2(dist)>point1_weight2){
						continue;
					}
					local_pressure=point0_pressure+point1_0_pressure;
				}else{
					//線半ば
					
					local_pressure = point1_0_pressure * l + point0_pressure ;
					var local_weight = weight  *( (local_pressure - 1)*weight_pressure_effect + 1);
					if(Math.abs(Vec2.dot(dist,side))>local_weight){
						//線幅より外の場合
						continue;
					}
				}
				drawfunc(idx,local_pressure,r,g,b,a);
			}
		}

	}

