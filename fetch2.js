const https=require('https');
function fetch(url){ return new Promise((res,rej)=>{
  https.get(url,r=>{
    if(r.statusCode>=300 && r.statusCode<400 && r.headers.location){
      fetch(r.headers.location).then(res).catch(rej);
      return;
    }
    let d='';
    r.on('data',c=>d+=c);
    r.on('end',()=>res({statusCode:r.statusCode,body:d}));
  }).on('error',rej);
});}

fetch('https://noahbprice.love/blog').then(r=>{
  console.log(r.statusCode);
  console.log(r.body.split('\n').slice(350,374).join('\n'));
}).catch(e=>console.error(e));
