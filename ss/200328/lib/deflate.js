
var Deflate=(function(){
	var Deflate = function(){};
	var ret = Deflate;

	ret.output_str="";

	var clen_huffmans=[]; //データ長データ用ハフマン符号情報
	var lit_huffmans=[]; //リテラル/長さ用ハフマン符号情報
	var dist_huffmans=[];//距離用ハフマン符号情報
	const MAX_BITS=15; //ハフマン符号に使う最大ビット長

	var createHuffmans=function(lenlist){
		//ビット長リストからハフマン符号情報を作成する
		var enc_huffmans=[];
		var max_bits=0;
		for(var i=0;i<lenlist.length;i++){
			var t = {};
			t.Len = lenlist[i];
			t.Code  = 0;
			enc_huffmans.push(t);

			if(max_bits<lenlist[i]){
				max_bits = lenlist[i];
			}
		}

		var bl_count=new Array(max_bits+1);
		for(var i=0;i<bl_count.length;i++){
			bl_count[i]=0;
		}
		for(var i=0;i<enc_huffmans.length;i++){
			bl_count[enc_huffmans[i].Len]++;
		}
	   var code = 0;
	   var next_code = new Array(max_bits+1);
		bl_count[0]=0;
	   for (var bits = 1; bits <next_code.length; bits++) {
		   code = (code + bl_count[bits-1]) << 1;
		   next_code[bits] = code;
	   }
	   for (var n = 0; n < enc_huffmans.length; n++) {
		   var len = enc_huffmans[n].Len;
		   if (len != 0) {
			   enc_huffmans[n].Code = next_code[len];
			   next_code[len]++;
		   }
	   }

		var dec_huffmans={};
		for(var i=0;i<enc_huffmans.length;i++){
			if(enc_huffmans[i].Len){
				dec_huffmans[enc_huffmans[i].Code]=i;
			}
		}

		var huffmans={};
		huffmans.enc_huffmans=enc_huffmans;
		huffmans.dec_huffmans=dec_huffmans;

		return huffmans;
	}




	var readHuffman = function(dv,tree){
		//ハフマン符号のどれかに一致するまで
		//output_bufferから1バイトずつ読みこみ
		//一致したハフマン符号をデコードした値を返す

		var dec_huffmans=tree.dec_huffmans;
		var enc_huffmans=tree.enc_huffmans;
		for(var i=1;i<=MAX_BITS;i++){
			var value =dv.readBitsReverse(i); 
			var deccode = dec_huffmans[value];
			if(deccode != null){
				if(enc_huffmans[deccode].Len === i){
					return deccode;
				}
			}
			
			dv.idx-=i;
		}
		return null;
	}

	var encodeClen=function(lenlist){
		//符号長リストを0~18の符号列に変換する

		var clen=[];
		for(var i=0;i<lenlist.length;i++){
			var target = lenlist[i];
			var count=1;
			for(;count+i<lenlist.length && target===lenlist[i+count];count++){ }
			i+=count-1;
			if(target===0){
				while(count){
					if(count<3){
						clen.push(0);
						count-=1;
					}else if(count<11){
						clen.push(17);
						clen.push(count-3);
						count=0;
					}else if(count<139){
						clen.push(18);
						clen.push(count-11);
						count=0;
					}else{
						clen.push(18);
						clen.push(127);
						count-=138;
					}
				}
			}else{
				clen.push(target);
				count-=1;
				while(count){
					if(count<3){
						clen.push(target);
						count-=1;
					}else if(count<7){
						clen.push(16);
						clen.push(count-3);
						count=0;
					}else{
						clen.push(16);
						clen.push(3);
						count-=6;
					}
				}
			}
			
		}
		return clen;



	}
	var decodeClen=function(ds,size,clen_huffmans){
		//ハフマン符号化された0~18の符号列から
		//符号長リストを復元する

		var lenlist=[];
		while(1){
			if(lenlist.length>=size){
				break;
			}
			var value = readHuffman(ds,clen_huffmans);
			if(value<=15){
				lenlist.push(value);
			}else if(value===16){
				//直前値3~6コピー
				var extra = ds.readBits(2);
				var org = lenlist[lenlist.length-1];
				
				for(var j=0;j<extra+3;j++){
					lenlist.push(org);
				}
			}else if(value===17){
				//3~10ゼロ埋め
				var extra = ds.readBits(3);
				
				for(var j=0;j<extra+3;j++){
					lenlist.push(0);
				}
			}else if(value===18){
				//11~138ゼロ埋め
				var extra = ds.readBits(7);
				
				for(var j=0;j<extra+11;j++){
					lenlist.push(0);
				}
			}
			
		}
		return lenlist;

	}
	var outputHuffman=function(ds,value,tree){
		//値をハフマン符号化しoutput_bufferに書き込む
		var t = tree.enc_huffmans[value];
		ds.outputBitsReverse(t.Code,t.Len);
	}

	var outputClen=function(ds,src,tree){
		//コード長をハフマン符号化しoutput_bufferに書き込む
		for(var i=0;i<src.length;i++){
			var value = src[i];
			if(value<=15){
				outputHuffman(ds,value,tree);
			}else if(value===16){
					outputHuffman(ds,value,tree);
					i++;
					ds.outputBits(src[i],2);
		}else if(value===17){
					outputHuffman(ds,value,tree);
					i++;
					ds.outputBits(src[i],3);
		}else if(value===18){
					outputHuffman(ds,value,tree);
					i++;
					ds.outputBits(src[i],7);
				}
			}
	}

	var compressLZ77=function(utf8array,offset,size){
		//LZ77で圧縮する
		var result=[];
		var output_str="";

//		output_str+="LZ77符号化:"
		for(var i=offset;i<(offset+size);i++){
			var dist=0;
			var len_max=2;
			for(var j=Math.max(0,i-32767);j<i;j++){
				if(utf8array[i] === utf8array[j]){
					var k=0;
					for(; k<=285;k++){
						if(utf8array[i+k] !== utf8array[j+k] ){
							break;
						}
					}
					if(k>len_max){
						dist=i-j
						len_max=k;
					}
				}
			}
			if(len_max>2){
				result.push({len:len_max,dist:dist});
				i+=len_max-1;

				//output_str+="&lt;"+len_max+","+dist+"&gt;,"
			}else{
				result.push(utf8array[i]);

//				output_str+=utf8array[i]+","
			}
		}
//		output_str=output_str.slice(0,-1) + "\n";

		Deflate.output_str+=output_str;
		return result;
	}

	var expandLZ77=function(data,exist_data){
		//LZ77圧縮データを伸長する
		var decoded_data;
		if(exist_data){
			decoded_data = exist_data;
		}else{
			decoded_data = [];
		}

		for(var i=0;i<data.length;i++){
			if(!isNaN(data[i])){
				//リテラルの場合そのまま出力
				decoded_data.push(data[i]);
			}else{
				//繰り返しの場合それを出力
				var idx=decoded_data.length-data[i].dist;
				for(var j=0;j<data[i].len;j++){
					decoded_data.push(decoded_data[idx+j]);
				}
			}
		}
		return decoded_data;

	}
	ret.compress=function(arrayBuffer){
		//deflate圧縮を行う

		//出力先を空にして初期化


		//ブロックを作成
		var comp_mode= parseInt(document.getElementById("comp_mode").value);
		var result = encBlock(arrayBuffer,0,arrayBuffer.length,1,comp_mode);

		return result;
	}

	var encBlock=function(src,offset,size,final,comp_type){
		var output_str="";
		//1ブロック分出力する
		var ds=new DataStream(new ArrayBuffer(size*2));

		var lit_list = [];
		var dist_list = [];
		var clen_list = [];

		//BFINAL
		ds.outputBit(final);
		//complession type
		ds.outputBits(comp_type,2);

		//output_str+="\n";
		//output_str += "BFINALビット:"+final+",圧縮モードビット:" + ("00"+comp_type.toString(2)).slice(-2);

		if(comp_type===0){
			//無圧縮モード

			//バイト頭まで移動
			if(ds.idx&7){
				ds.idx= (ds.idx&~7)+8;
			}else{
				ds.idx= (dx.idx&~7);
			}
			var len=size;
			ds.outputBits(len,16);
			ds.outputBits(~len,16);
			for(var i=0;i<src.length;i++){
				ds.outputBits(src[i+offset],8);
			}
			//output_str += ",データ長:"+len+",データ長補数:"+(~len);

			//output_str+="\n";
		}else{

			//output_str += "\n";
			//LZ77圧縮を行う
			src = compressLZ77(src,offset,size);

			if(comp_type===1){
				//固定ハフマン符号圧縮

				//リテラル/長さ用のハフマン符号を作るための符号長リスト
				for(var i=0;i<=143;i++){ lit_list[i]=8;}
				for(var i=144;i<=255;i++){ lit_list[i]=9;}
				for(var i=256;i<=279;i++){ lit_list[i]=7;}
				for(var i=280;i<=287;i++){ lit_list[i]=8;}

				//距離用のハフマン符号を作るための符号長リスト
				for(var i=0;i<=31;i++){ dist_list[i]=5;}

				//output_str+="\n";

			}else if(comp_type===2){
				//カスタムハフマン符号圧縮

				//符号長用のハフマン符号を作るための符号長リスト
				for(var i=0;i<19;i++){
					clen_list.push(5);
				}
				//符号長用のハフマン符号リストを作成
				clen_huffmans = createHuffmans(clen_list);

				//リテラル/長さ用のハフマン符号を作るための符号長リスト
				for(var i=0;i<=143;i++){ lit_list[i]=9;}
				for(var i=144;i<=255;i++){ lit_list[i]=8;}
				for(var i=256;i<=279;i++){ lit_list[i]=8;}
				for(var i=280;i<=287;i++){ lit_list[i]=7;}

				//距離用のハフマン符号を作るための符号長リスト
				for(var i=0;i<=10;i++){ dist_list[i]=4;}
				for(var i=11;i<=20;i++){ dist_list[i]=5;}
				for(var i=21;i<=31;i++){ dist_list[i]=6;}

				//リテラル/長さ用符号長リスト要素数を出力
				ds.outputBits(lit_list.length-257,5);
				//距離用符号長リスト要素数を出力
				ds.outputBits(dist_list.length-1,5);
				//符号長ハフマン符号用符号長リスト要素数を出力
				ds.outputBits(clen_list.length-4,4);
//				output_str+=",リテラル/長さ符号長数:"+lit_list.length+"-257"
//					+ ",距離符号長数:"+dist_list.length +"-1"
//					+ ",符号長符号長数:"+clen_list.length +"-4\n" ;


//				output_str+="符号長符号長リスト:"
				//符号長リストから符号長用ハフマン符号を作成
				for(var i=0;i<clen_list.length;i++){
					ds.outputBits(clen_list[i],3);
					//output_str+=clen_list[i]+",";
				}
//				output_str=output_str.slice(0,-1)+"\n";

//				output_str+="符号長ハフマン符号:"+formatHuffmans(clen_huffmans.enc_huffmans)+"…(略)\n";
//
//				output_str+="リテラル/長さ符号長リスト(0〜287):"+lit_list+"\n";
//				output_str+="距離符号長リスト(0〜31):"+dist_list+"\n";

				//符号長用ハフマン符号を用いてリテラル/長さ符号長リストを出力
				var enc = encodeClen(lit_list,clen_huffmans);
				outputClen(ds,enc,clen_huffmans);

				//符号長用ハフマン符号を用いて距離符号長リストを出力
				enc = encodeClen(dist_list,clen_huffmans);
				outputClen(ds,enc,clen_huffmans);
			}
			//符号長リストからリテラル/長さハフマン符号を作成
			lit_huffmans = createHuffmans(lit_list);
			//output_str+="リテラル/長さハフマン符号:"+formatHuffmans(lit_huffmans.enc_huffmans)+"…(略)\n";

			//符号長リストから距離ハフマン符号を作成
			dist_huffmans = createHuffmans(dist_list);
			//output_str+="距離ハフマン符号:"+formatHuffmans(dist_huffmans.enc_huffmans)+"…(略)\n";

			//LZ77で圧縮されたデータをハフマン符号化し出力
			//output_str+="LZ77符号化情報を符号+拡張情報化:";
			for(var i=0;i<src.length;i++){
				if(!isNaN(src[i])){
					//リテラルの場合、リテラル/長さ用ハフマン符号を使って出力
					outputHuffman(ds,src[i],lit_huffmans);
					//output_str+=src[i]+",";
				}else{
					//繰り返し情報の場合、長さ、距離を符号+拡張情報の形に変えた後
					//それぞれのハフマン符号を使って出力
					
					//長さを符号+拡張情報化
					var code = src[i].len ;
					var extra_bits=((Math.log2(Math.max(src[i].len-3,4)))|0)-2;
					code =extra_bits*4+((src[i].len-3)>>extra_bits) + 257;
					var extra_data=(src[i].len-3) & ((1<<extra_bits)-1);

					//長さ符号をハフマン符号を使って出力
					outputHuffman(ds,code,lit_huffmans);
					//拡張情報はそのまま出力
					ds.outputBits(extra_data,extra_bits);
					//output_str+="&lt;"+code;
					if(extra_bits){
						//output_str+="ex"+extra_data
					}
					//output_str+=","
				
					//距離を符号+拡張情報化
					code = src[i].dist ;
					extra_bits=((Math.log2(Math.max(src[i].dist-1,2)))|0)-1;
					code =extra_bits*2+((src[i].dist-1)>>extra_bits) ;
					var extra_data=(src[i].dist-1) & ((1<<extra_bits)-1);

					//距離符号をハフマン符号を使って出力
					outputHuffman(ds,code,dist_huffmans);
					///拡張情報はそのまま出力
					ds.outputBits(extra_data,extra_bits);

					//output_str+=""+code;
					if(extra_bits){
						//output_str+="ex"+extra_data
					}
					//output_str+=","
					//output_str=output_str.slice(0,-1)+"&gt;,";
				}
			}
			//output_str=output_str.slice(0,-1)+"\n";
			//ブロック終了符号(256)をリテラル/長さハフマン符号を使って出力
			outputHuffman(ds,256,lit_huffmans);
			//output_str+="\n上記情報をハフマン符号化して";
		}


		var result = new Uint8Array(ds.idx>>3);
		for(var i=0;i<result.length;i++){
			result[i]=ds.byteBuffer[i];
		}

//		Deflate.output_str+=output_str;
		return result.buffer;
	}
	ret.expand=function(compress_array_buffer,offset,length){
		//Deflate圧縮された情報を伸長する
		var ds=new DataStream(compress_array_buffer,offset,length);
//		var output_str="";

		var decdata=[];
		var bfinal = 0;

		//最終ブロックを伸長した後はループを抜ける
		while(!bfinal){

			bfinal =ds.readBit();
			var compless_type=ds.readBits(2);

			if(compless_type===0){
				//無圧縮
				if(ds.idx&7){
					ds.idx= (ds.idx&~7)+8;
				}else{
					ds.idx= (ds.idx&~7);
				}
				var len=ds.readBits(16);
				ds.readBits(16);
				for(var i=0;i<len;i++){
					decdata.push(ds.readBits(8));
				}
				//ds.idx+=len*8;
			}else if(compless_type === 1 || compless_type===2){
				var lenlist =[];
				if(compless_type===1){
					//固定ハフマン
					for(var i=0;i<=143;i++){ lenlist[i]=8;}
					for(var i=144;i<=255;i++){ lenlist[i]=9;}
					for(var i=256;i<=279;i++){ lenlist[i]=7;}
					for(var i=280;i<=287;i++){ lenlist[i]=8;}
					lit_huffmans = createHuffmans(lenlist);

					lenlist =[];
					for(var i=0;i<=31;i++){ lenlist[i]=5;}
					dist_huffmans = createHuffmans(lenlist);
				}else{
					//ダイナミックハフマン
					var hlit = ds.readBits(5);
					var hdist = ds.readBits(5);
					var hclen = ds.readBits(4);

					//コード長コード復号
					var idx = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
				
					for(var i=0;i<idx.length;i++){
						if(i<hclen+4){
							lenlist[idx[i]]=ds.readBits(3);
						}else{
							lenlist[idx[i]]=0;
						}
					}
					var clen_huffmans = createHuffmans(lenlist);

					//長さビット長リスト復元
					//距離ビット長リスト復元
					var lenlist2= decodeClen(ds,hlit+hdist+258,clen_huffmans);
					lenlist =lenlist2.slice(0,hlit+257);
					lit_huffmans = createHuffmans(lenlist);

					lenlist =lenlist2.slice(hlit+257);
					dist_huffmans = createHuffmans(lenlist);
				}

				while(1){
					var value = readHuffman(ds,lit_huffmans);

					if(value <256){
						//リテラル
						decdata.push(value);
					}else{
						if(value ==256){
							//終了符号
							break;
						}
						var a ={};

						//長さ
						if(value === 285){
							value=255;
						}else{
							var extra_bits = value-261;
							if(extra_bits>=0){
								extra_bits = extra_bits>>2;
								value =value-257;
								var offset = 4+(extra_bits*4);
								var extra_data = ds.readBits(extra_bits);
								value =((value -offset)<<extra_bits) + (4<<extra_bits) + extra_data;
							}else{
								value =value -257;
							}
						}
						a.len=value+3;


						//距離
						value = readHuffman(ds,dist_huffmans);
						//value = ds.readBitsReverse(5);
						if(value>29){
							coneole.log(a);
						}
						extra_bits = value -2;
						if(extra_bits>=0){
							extra_bits = extra_bits>>1;
							var offset = 2+(extra_bits*2);
							var extra_data = ds.readBits(extra_bits);
							value =((value -offset)<<extra_bits) + (2<<extra_bits) + extra_data;
						}
						a.dist=value+1;
						if(a.dist>50000){
							coneole.log(a);
						}
						decdata.push(a);
					}
				}

//				output_str+="ハフマン復号化:"+format(decdata)+"\n";
//
				decdata =expandLZ77(decdata);
//				output_str+="LZ77復号化:"+format(decdata)+"\n";
			}
		}

//		this.output_str+=output_str;
		return decdata;

	}

var format=function(src){
	//
	var result="";
	for(var i=0;i<src.length;i++){
		if(i!==0){
			result+=",";
		}

		if(isNaN(src[i])){
	 		result+="&lt;"+src[i].len.toString(10)+","+src[i].dist.toString(10)+"&gt;";
		}else{
			result+=src[i].toString(10);
		}
	}
	return result;
}
var formatBinary=function(array_buffer){
	var src = new Uint8Array(array_buffer);
	var result="";
	for(var i=0;i<src.length;i++){
		if(i!==0){
			result+=",";
		}
		result+=('00000000' +src[i].toString(2)).slice(-8);
	}
	return result;
}
var formatHuffmans=function(huffmans){
	var result="";
	for(var i=0;i<huffmans.length && i<3 ;i++){
		if(i!==0){
			result+=",";
		}
		result+=('0000000000' +huffmans[i].Code.toString(2)).slice(-huffmans[i].Len);
	}
	return result;
}
	return ret;
})();
