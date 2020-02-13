
var copyImg= function(dst,dst_x,dst_y,src,src_x,src_y,src_w,src_h){
	var dst_data = dst.data;
	var dst_width = dst.width;
	var src_data = src.data;
	var src_width = src.width;
	var dst_idx = 0;
	var src_idx = 0;
	for(var yi=0;yi<src_h;yi++){
		dst_idx = (yi + dst_y) * dst_width + dst_x<<2;
		src_idx = (yi + src_y) * src_width + src_x<<2;
		for(var xi=0;xi<src_w;xi++){
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
	var fillCheck = function(target_data,joined_data,idx){
		return (joined_r===joined_data[idx]
		&& joined_g===joined_data[idx+1]
		&& joined_b===joined_data[idx+2]
		&& joined_a===joined_data[idx+3]
		&& target_r===target_data[idx]
		&& target_g===target_data[idx+1]
		&& target_b===target_data[idx+2]
		&& target_a===target_data[idx+3]);
	}
	var fillSub=function(target,y,left,right){
		var ref_data=joined_img.data;
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

	ret.fill=function(layer,point_x,point_y,col){
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

			//左右の端を探す
			var yidx = target.width*y<<2;
			var idx = yidx + (x<<2);
			var left=x;
			for(;left>=0;left--){
				var idx2 = yidx + (left<<2);
				if(fillCheck(target_data,ref_data,idx2)){
				}else{
					left+=1;
					break;
				}
			}
			var right=x;
			for(;right<target.width;right++){
				var idx2 = yidx + (right<<2);
				if(fillCheck(target_data,ref_data,idx2)){
				}else{
					break;
				}
			}
		fillStack.push(y);
		fillStack.push(left);
		fillStack.push(right);
		
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
				target_data[idx+3]=draw_a;
			}

			if(yi>0){
				fillSub(target,yi-1,left,right);
			}
			if(yi<target.height-1){
				fillSub(target,yi+1,left,right);
			}
			refresh_left=Math.min(refresh_left,left);
			refresh_top=Math.min(refresh_top,yi);
			refresh_bottom=Math.max(refresh_bottom,yi+1);
			refresh_right=Math.max(refresh_right,right);
		}

		var width = refresh_right-refresh_left;
		var height= refresh_bottom -refresh_top;

		var log = History.createLog("fill",{"layer_id":layer.id,"x":point_x,"y":point_y,"color":new Float32Array(col)},"fill("+ point_x +","+point_y+")",{"layer":layer});
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


	ret.pen=function(layer,points,col){
		for(var li=0;li<points.length-1;li++){
			drawPen(layer.img,points[li],points[li+1],col);
		}
		refreshLayerThumbnail(layer);

	}
	var clamp=function(value,min,max){
		return Math.min(max,Math.max(min,value));
	}
	ret.drawLine=function(layer,point0,point1,col){
		var img= layer.img;
		var new_p = point1.pos;
		var old_p = point0.pos;
		var max_size = Math.max(point1.size,point0.size);

		var left = Math.min(new_p[0],old_p[0]);
		var right= Math.max(new_p[0],old_p[0])+1;
		var top= Math.min(new_p[1],old_p[1]);
		var bottom= Math.max(new_p[1],old_p[1])+1;
		
		left = Math.floor(clamp(left-max_size,0,img.width));
		right= Math.ceil(clamp(right+max_size,0,img.width));
		top= Math.floor(clamp(top-max_size,0,img.height));
		bottom=Math.ceil(clamp(bottom+max_size,0,img.height));


		if(pen_log){
			//差分ログ作成
			var log = pen_log;
			var dif=createDif(layer,left,top,right-left,bottom-top);
			if(!log.undo_data.difs){
				log.undo_data.difs=[];
			}
			log.undo_data.difs.push(dif);
		}

		drawPen(layer.img,point0,point1,col);

		if(right-left>0 && bottom-top>0){
			//再描画
			refreshMain(0,left,top,right-left,bottom-top);
		}
	}
	var vec2 =new Vec2();
	var side = new Vec2();
	var dist = new Vec2();
	var drawPen=function(img,point0,point1,color){
		var data = img.data;
		var new_p = point1.pos;
		var old_p = point0.pos;
		vec2[0] = new_p[0];
		vec2[1] = new_p[1];
		var max_size = Math.max(point1.size,point0.size);

		var left = Math.min(new_p[0],old_p[0]);
		var right= Math.max(new_p[0],old_p[0])+1;
		var top= Math.min(new_p[1],old_p[1]);
		var bottom= Math.max(new_p[1],old_p[1])+1;
		
		left = Math.floor(clamp(left-max_size,0,img.width));
		right= Math.ceil(clamp(right+max_size,0,img.width));
		top= Math.floor(clamp(top-max_size,0,img.height));
		bottom=Math.ceil(clamp(bottom+max_size,0,img.height));

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
		var point0size=point0.size;
		var point1size=point1.size;
		var point0size2=point0size*point0size;
		var point1size2=point1size*point1size;
		for(var dy=top;dy<bottom;dy++){
			for(var dx=left;dx<right;dx++){
				var idx = dy*img.width+ dx<<2;
				dist[0]=dx-old_p[0];
				dist[1]=dy-old_p[1];
				l = Vec2.dot(vec2,dist);
				if(l<=0){
					//始点より前
					if(Vec2.scalar2(dist)>point0size2){
						continue;
					}
				}else if(l>=1){
					//終端より後
					dist[0]=dx-new_p[0];
					dist[1]=dy-new_p[1];
					
					if(Vec2.scalar2(dist)>point1size2){
						continue;
					}
				}else{
					//線半ば
					var local_weight = point0size * (1-l) + point1size * l;
					if(Math.abs(Vec2.dot(dist,side))>local_weight){
						//線幅より外の場合
						continue;
					}
				}
				data[idx+0]=r;
				data[idx+1]=g;
				data[idx+2]=b;
				data[idx+3]=a;
			}
		}

	}


	Command.loadImageFile=function(file,n){
		var reader=new FileReader();
		var idx = n;
		var layer=createLayer(null,idx);
		reader.onload=function(e){
			var fu =function(img){
				
				layer.img=img;
				layer.name = file.name;

				if(img.width>=preview.width || img.height>=preview.height){
					//開いた画像がキャンバスより大きい場合は広げる
					preview.width=Math.max(img.width,preview.width);
					preview.height=Math.max(img.height,preview.height);
					resetCanvas(preview.width,preview.height);
				}
				refreshLayerThumbnail(layer);
				refreshLayer(layer);
				refreshMain(0);

			}
	 		if(/^image\//.test(file.type)){
				Img.loadImg(e.target.result,fu);
	 		} else if(/.*\.exr$/.test(file.name)){
				Img.loadExr(e.target.result,fu);
	 		}
		}
		reader.readAsDataURL(file);

		var log = History.createLog("loadImageFile",{"layer_id":layer.id,"file":file.name,"positon":n},"loadImageFIle("+file.name+")",{"file":file});

		return layer;
	}
	return ret;
})();
