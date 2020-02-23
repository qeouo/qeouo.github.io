var Zip = (function(){
	var Zip = {};
	var ret = Zip;

	ret.read=function(buffer){
		var ds = new DataStream(buffer);
		var files=[];
		while(1){
			//ローカルファイルヘッダ
			var sig=ds.getUint32(true);//シグネチャ
			if(sig !== 0x04034b50){
				break;
			}
			var file ={};
			files.push(file);
			ds.getUint16(true);//バージョン
			ds.getUint16(true);//ビットフラグ
			ds.getUint16(true);//圧縮メソッド
			ds.getUint16(true);//最終変更時間
			ds.getUint16(true);//最終変更日時
			ds.getUint32(true);//CRC-32
			var data_length=ds.getUint32(true);//圧縮サイズ
			ds.getUint32(true);//非圧縮サイズ
			var file_name_length = ds.getUint16(true);//ファイル名の長さ
			ds.getUint16(0,true);//拡張フィールドの長さ
			file.name=Util.utf8ToString(ds.getBytes(file_name_length));//ファイル名
			ds.fill(0x0,0);//拡張フィールド

			file.data = ds.getBytes(data_length);//ファイルデータ

			//Data descriptor
			//ds.setUint32(crc,true);//CRC-32
			//ds.setUint32(filesize,true);//圧縮サイズ
			//ds.setUint32(filesize,true);//非圧縮サイズ
		}
		return files;
		
	}

	var calcCrc32 = function(array) {
		var table = [];
		var poly = 0xEDB88320;  
		var result = 0xFFFFFFFF;

		//create table
		for(var i = 0; i < 256; i++) {  
			var u = i;  
			for(var j = 0; j < 8; j++) {  
				if(u & 0x1) u = (u >>> 1) ^ poly;  
				else        u >>>= 1;  
			}  
			table.push(u>>>0);
		}

		//calculate
		for(var i = 0; i < array.length; i++)
			result = ((result >>> 8) ^ table[array[i] ^ (result & 0xFF)])>>>0;
		return (~result)>>>0;
	}

	var LOCAL_HEADER_SIZE = 30;
	var CENTRAL_SIZE = 46;
	var END_SIZE = 22;
	ret.create=function(_files){
		var files=[];
		var total_size=0;
		for(var fi=0;fi<_files.length;fi++){
			var file = {};
			files.push(file);
			file.name_utf8 = Util.stringToUtf8(_files[fi].name);
			file.data = _files[fi].data;
			file.offset = total_size;

			file.crc = calcCrc32(file.data);
			total_size += LOCAL_HEADER_SIZE + file.data.length+ file.name_utf8.length;
		}
		total_size+=CENTRAL_SIZE* files.length + END_SIZE;
		for(var fi=0;fi<files.length;fi++){
			total_size+=files[fi].name_utf8.length;
		}
		
		
		var ds = new DataStream(total_size);

		for(var fi=0;fi<files.length;fi++){
			var file = files[fi];
			//ローカルファイルヘッダ
			ds.setUint32(0x04034b50,true);//シグネチャ
			ds.setUint16(20,true);//バージョン
			ds.setUint16(0x0,true);//ビットフラグ
			ds.setUint16(0x0,true);//圧縮メソッド
			ds.setUint16(0x0,true);//最終変更時間
			ds.setUint16(0x0,true);//最終変更日時
			ds.setUint32(file.crc,true);//CRC-32
			ds.setUint32(file.data.length,true);//圧縮サイズ
			ds.setUint32(file.data.length,true);//非圧縮サイズ
			ds.setUint16(file.name_utf8.length,true);//ファイル名の長さ
			ds.setUint16(0,true);//拡張フィールドの長さ
			ds.setBytes(file.name_utf8);//ファイル名
			ds.fill(0x0,0);//拡張フィールド

			var oldidx=ds.idx;
			ds.setBytes(file.data);//ファイルデータ
			//var filesize=ds.idx-oldidx >>> 3;

			//Data descriptor
			//ds.setUint32(crc,true);//CRC-32
			//ds.setUint32(filesize,true);//圧縮サイズ
			//ds.setUint32(filesize,true);//非圧縮サイズ
		}
		var central_idx= ds.getByteIndex();
		for(var fi=0;fi<files.length;fi++){
			var file = files[fi];

			//セントラルディレクトリエントリ
			ds.setUint32(0x02014b50,true);//シグネチャ
			ds.setUint8(20,true);//バージョン
			ds.setUint8(10,true);//バージョン
			ds.setUint16(20,true);//最小バージョン
			ds.setUint16(0x0,true);//ビットフラグ
			ds.setUint16(0x0,true);//圧縮メソッド
			ds.setUint16(0x0,true);//最終変更時間
			ds.setUint16(0x0,true);//最終変更日時
			ds.setUint32(file.crc,true);//CRC-32
			ds.setUint32(file.data.length,true);//圧縮サイズ
			ds.setUint32(file.data.length,true);//非圧縮サイズ
			ds.setUint16(file.name_utf8.length,true);//ファイル名の長さ
			ds.setUint16(0,true);//拡張フィールドの長さ
			ds.setUint16(0,true);//ファイルコメントの長さ
			ds.setUint16(0,true);//ファイルが開始するディスク番号
			ds.setUint16(0,true);//内部ファイル属性
			ds.setUint32(0,true);//外部ファイル属性
			ds.setUint32(file.offset,true);//ローカルファイルヘッダの相対オフセット
			ds.setBytes(file.name_utf8);//ファイル名
			ds.fill(0x0,0);//拡張フィールド
			ds.fill(0x0,0);//ファイルコメント
		}
		var central_size = ds.getByteIndex() - central_idx ;

		//終端レコード
		ds.setUint32(0x06054b50,true);//シグネチャ
		ds.setUint16(0,true);//このディスクの数
		ds.setUint16(0,true);//セントラルディレクトリが開始するディスク
		ds.setUint16(files.length,true);//セントラルディレクトリレコードの数
		ds.setUint16(files.length,true);//セントラルディレクトリレコードの合計数
		ds.setUint32(central_size,true);//セントラルディレクトリレコードのサイズ
		ds.setUint32(central_idx,true);//セントラルディレクトリの開始位置のオフセット
		ds.setUint16(0,true);//コメント長さ
		ds.setTextBuf("");//コメント

		return ds.byteBuffer;
	}
	return ret;
})();
