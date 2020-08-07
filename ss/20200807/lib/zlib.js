
Util.loadJs("../lib/deflate.js");
var Zlib=(function(){
	var Zlib= function(){};
	var ret = Zlib;


	var adler32 = function(data){
//パリティ計算
		var aa=1,bb=0;
		var len = data.length;
		for(var ai=0;ai<len;){
			var bmax = Math.min(5550,len-ai);
			for(var bi=0;bi<bmax;bi++,ai++){
				aa+=data[ai];
				bb+=aa;
			}
			aa %= 65521;
			bb %= 65521;
		}
		return (bb*65536)+aa;
	}


	ret.compress = function(buffer,flg,block){
		var header= [];
		header[0]=(7<<4) + 8;
		header[1]=(2<<6) ;
		header[1]+=31-((header[0]<<8) + header[1])%31;
		var body = Array.from(Deflate.compress(buffer,flg,block));

		//var check = Deflate.expand(new Uint8Array(body).buffer);

		var ad = adler32(buffer);

		var footer = new DataView(new ArrayBuffer(4));
		footer.setUint32(0,ad);
		footer = Array.from(new Uint8Array(footer.buffer));

		return header.concat(body).concat(Array.from(footer));
	}

	ret.expand = function(buffer,offset,length){
		var dv = new DataView(buffer);
		var c= dv.getUint16(0);
		var adl= dv.getUint32(offset+(length-4));


		var data = Deflate.expand(buffer,offset+2,length-6);
		var ad2 = adler32(data);
		return data;
	}

	return ret;
})();
