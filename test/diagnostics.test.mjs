import test from 'node:test';
import assert from 'node:assert/strict';
import { safeDatabaseFailure } from '../db/diagnostics.mjs';

test('safe diagnostics classify common DB failures',()=>{
  for(const [code,kind] of [['28P01','AUTHENTICATION_FAILED'],['ENOTFOUND','DNS_NOT_FOUND'],['ETIMEDOUT','TIMEOUT'],['3D000','DATABASE_NOT_FOUND'],['ERR_TLS_CERT_ALTNAME_INVALID','TLS_HOSTNAME']]){
    assert.equal(safeDatabaseFailure({code}).kind,kind);
  }
});
test('safe diagnostics never expose sensitive error fields',()=>{
  const marker='super-secret-password-should-not-leak';
  for (const error of [
    Object.assign(new Error(marker), {code:'ENOTFOUND',host:marker,detail:marker}),
    new Error(marker),
  ]) {
    assert.equal(JSON.stringify(safeDatabaseFailure(error)).includes(marker),false);
  }
});
test('safe diagnostics distinguish missing and invalid secrets',()=>{
  assert.equal(safeDatabaseFailure(new Error('BLANK_PG_URL is not configured')).kind,'SECRET_MISSING');
  assert.equal(safeDatabaseFailure(new Error('BLANK_PG_URL must be a PostgreSQL connection URL')).kind,'INVALID_URL');
});
