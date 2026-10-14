import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeComments, pages, postKey } from '../src/lib/giveaway/server/instagram';
import { publicProfile } from '../src/lib/giveaway/server/profiles';
test('Repeated refreshes preserve one record per ID and metadata already recovered',()=>{
  const old={id:'1',username:'alma',text:'old',timestamp:null,avatar:'photo',displayName:'Alma'};
  assert.deepEqual(mergeComments([old],[{id:'1',username:'alma',text:'updated',timestamp:null}]),[{...old,text:'updated'}]);
  assert.equal(mergeComments([old],[old,old]).length,1);
});
test('Profile metadata must identify the exact account; no generic Instagram image or other user',()=>{
  const head='<meta property="og:url" content="https://www.instagram.com/alma/"><meta property="og:title" content="Alma &#x1f49a; (&#064;alma) • Instagram"><meta property="og:image" content="https://scontent.cdninstagram.com/photo.jpg?a=1&amp;b=2">';
  assert.deepEqual(publicProfile(head,'alma'),{username:'alma',displayName:'Alma 💚',avatar:'https://scontent.cdninstagram.com/photo.jpg?a=1&b=2'});
  assert.equal(publicProfile(head,'otra'),null);
  assert.equal(publicProfile('<meta property="og:title" content="Instagram">','alma'),null);
});
test('Meta pagination refuses off-host URLs instead of forwarding the private token',async()=>{
  const iter=pages('123/comments','test-only-token',{}, {data:[{id:'1'}],paging:{next:'https://evil.test/?after=second'}});
  assert.deepEqual((await iter.next()).value,[{id:'1'}]);
  await assert.rejects(iter.next(),/Paginación/);
});
test('Only post and reel links from Instagram are accepted',()=>{
  assert.equal(postKey('https://www.instagram.com/p/DeIpHXtkYyf/?igsh=x'),'DeIpHXtkYyf');
  assert.throws(()=>postKey('https://evil.test/p/DeIpHXtkYyf/'));
});

import { reelPhotoKeys } from '../src/lib/giveaway/server/photo-keys';
test('Public animation signs only released eligible identities and trusted profile photos',()=>{
 const photo='https://scontent.cdninstagram.com/alma.jpg';
 const comments=[{id:'1',username:'alma',text:'',timestamp:null,avatar:photo},{id:'2',username:'hidden',text:'',timestamp:null,avatar:photo},{id:'3',username:'unsafe',text:'',timestamp:null,avatar:'https://evil.test/private'}];
 const entries=reelPhotoKeys([{username:'alma'},{username:'unknown'},{username:'unsafe'}],comments);
 assert.equal(entries.length,1);assert.equal(entries[0].username,'alma');assert.match(entries[0].key,/^[a-f0-9]{64}\.png$/);
 assert.equal(JSON.stringify(entries).includes(photo),false);
});
