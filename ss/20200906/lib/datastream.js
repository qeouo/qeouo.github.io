
var DataStream =(function(){
	var DataStream =function(arraybuffer,offset,length){
		if(typeof arraybuffer === "number"){
			this.byteBuffer=new Uint8Array(arraybuffer);
		}else{
			if(length){
				this.byteBuffer=new Uint8Array(arraybuffer,offset,length);
			}else{
				this.byteBuffer=new Uint8Array(arraybuffer);
			}
		}
		this.dv=new DataView(this.byteBuffer.buffer,this.byteBuffer.byteOffset,this.byteBuffer.byteLength);
		this.idx=0;
	};
	var ret =DataStream;

	ret.prototype.getByteIndex=function(){
		return this.idx>>>3;
	}
	ret.prototype.fill= function(value,n){
		//nバイト書き込む
		for(var i=0;i<n;i++){
			this.setUint8(value);
		}
		return;
	}

	ret.prototype.setInt32= function(value,le){
		this.dv.setInt32(this.idx>>3,value,le);
		this.idx+=32;
		return;
	}
	ret.prototype.getInt32= function(le){
		var ret =this.dv.getInt32(this.idx>>3,le);
		this.idx+=32;
		return ret;
	}

	ret.prototype.setUint8 = function(value){
		this.dv.setUint8(this.idx>>3,value);
		this.idx+=8;
	}
	ret.prototype.getUint8 = function(le){
		var ret=this.dv.getUint8(this.idx>>3,le);
		this.idx+=8;
		return ret;
	}

	ret.prototype.setUint32= function(value,le){
		this.dv.setUint32(this.idx>>3,value,le);
		this.idx+=32;
		return;
	}
	ret.prototype.getUint32 = function(le){
		var ret=this.dv.getUint32(this.idx>>3,le);
		this.idx+=32;
		return ret;
	}
	ret.prototype.setUint16= function(value,le){
		this.dv.setUint16(this.idx>>3,value,le);
		this.idx+=16;
		return;
	}
	ret.prototype.getUint16= function(le){
		var ret=this.dv.getUint16(this.idx>>3,le);
		this.idx+=16;
		return ret;
	}

	ret.prototype.setUint64= function(value,le){
		var h=value/(65536*65536)|0;
		var l=value&0xffffffff;
		if(le){
			this.setUint32(l,le);
			this.setUint32(h,le);
		}else{
			this.setUint32(h,le);
			this.setUint32(l,le);
		}
	}
	ret.prototype.getUint64= function(le){
		var ret=this.getUint32(le);
		var ret2=this.getUint32(le);
		if(le){
			return (ret2<<32)+ret;
		}else{
			return (ret<<32)+ret2;
		}
	}
	ret.prototype.setFloat32 = function(value,le){
		this.dv.setFloat32(this.idx>>3,value,le);
		this.idx+=32;
	}
	ret.prototype.getFloat32 = function(le){
		var ret=this.dv.getFloat32(this.idx>>3,le);
		this.idx+=32;
		return ret;
	}

	ret.prototype.setBytes=function(bytes){
		for(var si=0;si<bytes.length;si++){
			this.setUint8(bytes[si]);
		}
		return ;
	}
	ret.prototype.getBytes=function(length){
		var array = new Uint8Array(length);
		for(var si=0;si<length;si++){
			array[si]=this.getUint8();
		}
		return array;
	}
	ret.prototype.setTextBuf=function(str,flg){
		var utf8array = Util.stringToUtf8(str);
		var dv = this.dv;
		for(var si=0;si<utf8array.length;si++){
			this.setUint8(utf8array[si]);
		}
		if(flg){
			this.setUint8(0);
		}
		return ;
	}
	ret.prototype.readTextBuf=function(){
		var dv = this.dv;
		var array=[];
		var a;
		while((a=dv.getUint8(this.idx>>3)) !== 0){
			array.push(a);
			this.idx+=1<<3;
		}
		this.idx+=1<<3;
		return Util.utf8ToString(array);
	}

	ret.prototype.setFloat16=function(value,le){
		var dv = this.dv;
		var s = (-Math.sign(value)+1)>>1;
		var val = Math.abs(value);
		var e = Math.floor(Math.log2(val));
		val = val/Math.pow(2,e)-1;
		
		var u = (s<<15) | ((e+15)<<10) | (val*1024 & 1023);

		this.setUint16(u,le);

		this.idx-=16;
		var val2= this.readFloat16(le);
	}
	ret.prototype.readFloat16=function(le){
		var dv = this.dv;
		var data = this.getUint16(this.idx>>3,le);
		if(data === 0)return 0.0; 
		var sign = (data>>15) &1;
		sign = 1-sign*2 ;

		var idx = ((data>>10)&31) -15;
		var b = (data & 1023)*1.0/1024.0+ 1.0;
		return sign * b * Math.pow(2.0,idx);
	}




	ret.prototype.outputBit=function(bit){ 
		//1ビットouput_bufferに書き込む
		//書き込んだあとindexを1ビットすすめる
		this.byteBuffer[this.idx>>3] &=  ~(1<<(this.idx&7));
		this.byteBuffer[this.idx>>3] |=bit<<(this.idx&7);

		this.idx++;
	}
	ret.prototype.outputBits=function(bits,len){
		//ビット列をoutput_bufferに書き込む
		for(var i=0;i<len;i++){
			this.outputBit((bits>>i)&1);
		}
	}
	ret.prototype.outputBitsReverse=function(bits,len){
		//ビット列を逆順(上位ビットから順番)にoutput_bufferに書き込む
		//ハフマン符号格納用

		for(var i=len-1;i>=0;i--){
			this.outputBit((bits>>i)&1);
		}
	}

	ret.prototype.readBit=function(){
		//bufferからoutput_indexの位置のビットを読み込み
		//読み込んだあとoutput_indexを1つすすめる
		var bit=(this.byteBuffer[this.idx>>3] >> (this.idx&7))&1;
		this.idx++;
		return bit;

	}

	ret.prototype.readBits=function(len){
		//output_bufferからlen分読み込み
		var bits=0;
		for(var i=0;i<len;i++){
			bits=bits | (this.readBit()<<i);
		}
		return bits;
	}
	ret.prototype.readBitsReverse=function(len){
		//output_bufferからlen分読み込み
		//読み込んだビットは高次ビットから格納される
		//ハフマン符号読み込み用
		var bits=0;
		for(var i=0;i<len;i++){
			bits=(bits<<1) | this.readBit();
		}
		return bits;
	}

	return ret;
})();
