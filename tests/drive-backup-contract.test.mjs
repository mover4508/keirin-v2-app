import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('async function backup(token,current)');
const end=html.indexOf('let backupTimer;',start);
assert.ok(start>=0&&end>start,'Drive backup implementation not found');
const backup=html.slice(start,end);

test('Drive backup checks remote records before overwriting',()=>{
 assert.match(backup,/validateBackup\(remote\)/);
 assert.match(backup,/!descends\(db\.records\[k\],r\)/);
 assert.match(backup,/missingBackupDrafts\(remote,db\)/);
 assert.match(backup,/Object\.entries\(remote\.sources\?\?\{\}\)/);
 assert.match(backup,/if\(conflicts\)throw Error/);
});

test('Drive backup verifies the exact uploaded snapshot before reporting success',()=>{
 assert.match(backup,/uploadedSnapshot=snapshot\(\)/);
 assert.match(backup,/const downloaded=await drive\(/);
 assert.match(backup,/validateBackup\(downloaded\)/);
 assert.match(backup,/JSON\.stringify\(downloaded\)!==JSON\.stringify\(JSON\.parse\(uploadedSnapshot\)\)/);
 assert.ok(backup.indexOf('const downloaded=await drive(')<backup.indexOf('lastDriveReceipt='));
});

test('Drive backup retains generation guards and stable folder reuse',()=>{
 assert.match(backup,/driveConfig\.folderId/);
 assert.match(backup,/if\(!folder\)folder=await driveFind/);
 assert.match(backup,/if\(!folder\)folder=await drive\(/);
 assert.match(backup,/if\(current!==generation\)return/);
});
