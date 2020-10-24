Hdrpaint.blendfuncs["mul"] = function(dst,d_idx,src,s_idx,alpha,power){
	var src_alpha=src[s_idx+3]*alpha;
	var dst_r = (1-src_alpha);
	var src_r = power*src_alpha;

	dst[d_idx+0]=dst[d_idx+0] * (dst_r +  src[s_idx+0]*src_r);
	dst[d_idx+1]=dst[d_idx+1] * (dst_r +  src[s_idx+1]*src_r);
	dst[d_idx+2]=dst[d_idx+2] * (dst_r +  src[s_idx+2]*src_r);
}
