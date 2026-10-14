// Installed only in the isolated QA child process. No Instagram traffic leaves this test.
const nativeFetch=globalThis.fetch;
globalThis.fetch=async function(input,init){
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
  if(url.hostname==='graph.facebook.com'){
    const json=data=>Promise.resolve(new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}}));
    if(url.pathname.endsWith('/media'))return json({data:[{id:'17974675059140818',permalink:'https://www.instagram.com/p/DeIpHXtkYyf/',comments_count:4}]});
    if(url.pathname.endsWith('/comments')){
      const c=(id,user)=>({id,username:user,text:'Con @fixture.amiga',timestamp:'2026-10-14T12:00:00Z',replies:{data:[]}});
      if(url.searchParams.get('after'))return json({data:[c('179002','fixture.flor'),c('179003','fixture.alma'),c('179004','_myaimportaciones')]});
      return json({data:[c('179001','fixture.alma'),c('179002','fixture.flor')],paging:{next:'https://graph.facebook.com/v26.0/17974675059140818/comments?after=second',cursors:{after:'second'}}});
    }
    return json({id:'17841402381081579',username:'_myaimportaciones'});
  }
  if(url.hostname==='www.instagram.com'){
    const handle=url.pathname.replaceAll('/','');
    return new Response(`<html><head><meta property="og:url" content="https://www.instagram.com/${handle}/"><meta property="og:title" content="Nombre de prueba (@${handle}) • Instagram"><meta property="og:image" content="https://scontent.cdninstagram.com/v/fixture.jpg"></head></html>`,{headers:{'Content-Type':'text/html'}});
  }
  if(url.hostname.endsWith('cdninstagram.com'))return new Response(null,{status:404});
  return nativeFetch(input,init);
};
