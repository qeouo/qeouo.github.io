Command["fill"] = (function(){
	var fillStack=[];
	var joined_r,joined_g,joined_b,joined_a;
	var target_r,target_g,target_b,target_a;

	var offset = new Vec2();

	var fillCheckAll = function(layer,joined,x,y){
		var x2 = x+offset[0];
		var y2 = y+offset[1];
		if(joined.width<=x2 || x2<0 || y2<0 || joined.height<=y2){
			return false;
		}
		var target = layer.img;
		var idx  = target.getIndex(x,y) <<2;
		var idx2 = joined.getIndex(x2,y2) <<2;
		var joined_data = joined.data;
		var target_data = target.data;
		return (joined_r===joined_data[idx2]
		&& joined_g===joined_data[idx2+1]
		&& joined_b===joined_data[idx2+2]
		&& joined_a===joined_data[idx2+3]
		&& target_r===target_data[idx]
		&& target_g===target_data[idx+1]
		&& target_b===target_data[idx+2]
		&& target_a===target_data[idx+3]);
	}
	var fillCheckLayer = function(layer,joined,x,y){
		var target = layer.img;
		var idx  = target.getIndex(x,y) <<2;
		var target_data = target.data;
		return ( target_r===target_data[idx]
		&& target_g===target_data[idx+1]
		&& target_b===target_data[idx+2]
		&& target_a===target_data[idx+3]);
	}
	var fillSub=function(layer,y,left,right,is_layer){
		var target = layer.img;
		var fillCheck=fillCheckAll;
		if(is_layer){
			fillCheck=fillCheckLayer;
		}
		var joined_img = root_layer.img;

		var mode=0;

		//塗りつぶし領域を求める

		//左の端を探す
		var xi = left;
		var yidx = target.getIndex(0,y) <<2;
		for(;xi>=0;xi--){
			var idx2 = yidx + (xi<<2);
			if(fillCheck(layer,joined_img,xi,y)){
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
			if(fillCheck(layer,joined_img,xi,y)){
				if(mode===0){
					//塗りつぶし領域開始
					fillStack.push(y);
					fillStack.push(xi);
					mode=1;
				}
			}else{
				if(mode===1){
					//塗りつぶし領域外なので終了
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
				if(!fillCheck(layer,joined_img,xi,y)){
					break;
				}
			}
			fillStack.push(xi);
		}
	}

	return function(log,undo_flg){
		//塗りつぶし
		if(undo_flg){
			return;
		}

		var refresh_left,refresh_top,refresh_bottom,refresh_right;
		var param = log.param;
		var layer = Layer.findById(param.layer_id);

		layer.getAbsolutePosition(offset);
		point_x = param.x;
		point_y = param.y;
		is_layer = param.is_layer;
		col = param.color;

		//アルファマスク保護設定
		var mask_alpha= layer.mask_alpha;
		var one_minus_mask_alpha= 1-mask_alpha;

		fillStack=[];
		var x = point_x|0;
		var y = point_y|0;
		//塗りつぶし範囲
		refresh_top=y;
		refresh_bottom=y;
		refresh_left=x;
		refresh_right=x;


		//塗りつぶし対象色
		var target= layer.img;
		var joined_img = root_layer.img;
		var idx = joined_img.getIndex(x+layer.position[0],y+layer.position[1])<<2;
		joined_r=joined_img.data[idx];
		joined_g=joined_img.data[idx+1];
		joined_b=joined_img.data[idx+2];
		joined_a=joined_img.data[idx+3];
		idx = target.getIndex(x,y)<<2;
		target_r=target.data[idx];
		target_g=target.data[idx+1];
		target_b=target.data[idx+2];
		target_a=target.data[idx+3];
		var draw_r =col[0];
		var draw_g =col[1];
		var draw_b =col[2];
		var draw_a =col[3];

		var target_data = target.data;
		if(    target_r === draw_r
			&& target_g === draw_g
			&& target_b === draw_b
			&& target_a === draw_a){
			//同色の場合終了
			return;
		}

		var old_img = new Img(target.width,target.height);
		Img.copy(old_img,0,0,target,0,0,target.width,target.height);

		//開始座標を登録
		fillStack.push(y);
		fillStack.push(x);
		fillStack.push(x);
		
		while(fillStack.length){

			right = fillStack.pop(); //右端
			left = fillStack.pop(); //左端
			var yi = fillStack.pop(); //y座標

			//塗りつぶし
			var yidx = target.getIndex(0,yi)<<2;
			for(var xi=left;xi<right;xi++){
				idx = yidx + (xi<<2);
				target_data[idx+0] = draw_r;
				target_data[idx+1] = draw_g;
				target_data[idx+2] = draw_b;
				target_data[idx+3] = target_data[idx+3]*mask_alpha + draw_a*one_minus_mask_alpha;
			}

			if(yi>0){
				//上端に到達していない場合、ひとつ上の行を探索
				fillSub(layer,yi-1,left,right,is_layer);
			}
			if(yi<target.height-1){
				//下端に到達していない場合、ひとつ下の行を探索
				fillSub(layer,yi+1,left,right,is_layer);
			}

			//更新領域を求める
			refresh_left=Math.min(refresh_left,left);
			refresh_right=Math.max(refresh_right,right);
			refresh_top=Math.min(refresh_top,yi);
			refresh_bottom=Math.max(refresh_bottom,yi+1);
		}

		var width = refresh_right-refresh_left;
		var height= refresh_bottom -refresh_top;

		if(!log.undo_data){
			log.undo_data={};
			var layer_img= layer.img;
			layer.img = old_img;
			var dif=Command.createDif(layer,refresh_left,refresh_top,width,height);
			layer.img=layer_img;
			log.undo_data.difs=[];
			log.undo_data.difs.push(dif);
		}

		//refreshMain(0,refresh_left + layer.position[0]
		//	,refresh_top + layer.position[1]
		//	,refresh_right-refresh_left,refresh_bottom-refresh_top);
		layer.refreshImg(refresh_left
			,refresh_top
			,refresh_right-refresh_left+1,refresh_bottom-refresh_top+1);

	}
})();
