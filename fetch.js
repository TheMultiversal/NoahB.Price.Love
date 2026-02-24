const https=require('https');
https.get('https://noahbprice.love/blog',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{console.log(res.statusCode);console.log(d.split('\\n').slice(360,374).join('\\n'));});}).on('error',e=>console.error(e));
