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
