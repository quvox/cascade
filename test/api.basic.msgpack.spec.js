import {getTestEnv} from './prepare.js';
const testEnv = getTestEnv();
const cascade = testEnv.library;
const env = testEnv.envName;

import chai from 'chai';
// const should = chai.should();
const expect = chai.expect;

import {createParam} from './params-basic.js';

describe(`${env}: message-pack test`, () => {

  let message;
  let param;

  before(async function () {
    this.timeout(50000);
    message = new Uint8Array(32);
    for (let i = 0; i < 32; i++) message[i] = 0xFF & i;

    param = await createParam();
  });

  it('jscu: EC/RSA encryption and signing test',  async function () {
    this.timeout(50000);
    await Promise.all(param.paramArray.map( async (paramObject) => {
      await Promise.all(paramObject.param.map( async (p, idx) => {
        const encryptionKeys = {
          publicKeys: [ param.Keys[paramObject.name][idx].publicKey.keyString ],
          privateKeyPassSets:[ { privateKey: param.Keys[paramObject.name][idx].privateKey.keyString, passphrase: '' } ] // for Signing
        };
        const encryptConfig = { encrypt: param.jscuEncryptConf(paramObject, idx), sign: param.jscuSignConf(paramObject) };

        const encryptionKeyImported = await cascade.importKeys(
          'string', {keys: encryptionKeys, suite: {encrypt_decrypt: 'jscu', sign_verify: 'jscu'}, mode: ['encrypt', 'sign']}
        );
        const encryptionResult = await cascade.encrypt({ message, keys: encryptionKeyImported, config: encryptConfig});
        const serializedEncrypted = encryptionResult.message.serialize();
        const serializedSignature = encryptionResult.signature.serialize();

        const deserializedEncrypted = cascade.importEncryptedBuffer(serializedEncrypted);
        const deserializedSignature = cascade.importSignatureBuffer(serializedSignature);
        const decryptionKeys = {
          privateKeyPassSets:[ { privateKey: param.Keys[paramObject.name][idx].privateKey.keyString, passphrase: '' } ],
          publicKeys: [ param.Keys[paramObject.name][idx].publicKey.keyString ] // for verification
        };
        const decryptionKeyImported = await cascade.importKeys(
          'string', {keys: decryptionKeys, suite: {encrypt_decrypt: 'jscu', sign_verify: 'jscu'}, mode: ['decrypt', 'verify']}
        );
        const decryptionResult = await cascade.decrypt({
          data: {message: deserializedEncrypted, signature: deserializedSignature},
          keys: decryptionKeyImported
        });
        expect(decryptionResult.signatures.every((s) => s.valid), `failed at ${p}`).to.be.true;
      }));
    }));
  });

  it('jscu: EC/RSA encryption test with multiple public keys', async function () {
    this.timeout(50000);
    await Promise.all(param.paramArray.map( async (paramObject) => {
      await Promise.all(paramObject.param.map( async (p, idx) => {
        const encryptionKeys = {
          publicKeys: [
            param.Keys[paramObject.name][idx].publicKey.keyString,
            param.Keys[paramObject.name][idx].publicKey.keyString
          ],
        };
        const encryptConfig = { encrypt: param.jscuEncryptConf(paramObject, idx) };

        const encryptionKeyImported = await cascade.importKeys(
          'string', {keys: encryptionKeys, suite: {encrypt_decrypt: 'jscu' }, mode: ['encrypt']}
        );
        const encryptionResult = await cascade.encrypt({ message, keys: encryptionKeyImported, config: encryptConfig});
        const serializedEncrypted = encryptionResult.message.serialize();

        const deserializedEncrypted = cascade.importEncryptedBuffer(serializedEncrypted);
        const decryptionKeys = {
          privateKeyPassSets:[
            { privateKey: param.Keys[paramObject.name][0].privateKey.keyString, passphrase: '' }, // this sometimes failed
            { privateKey: param.Keys[paramObject.name][idx].privateKey.keyString, passphrase: '' }
          ],
        };
        const decryptionKeyImported = await cascade.importKeys(
          'string', {keys: decryptionKeys, suite: {encrypt_decrypt: 'jscu'}, mode: ['decrypt']}
        );
        const decryptionResult = await cascade.decrypt({
          data: {message: deserializedEncrypted},
          keys: decryptionKeyImported
        });
        expect(decryptionResult.data.toString()===message.toString()).to.be.true;
      }));
    }));
  });

  it('openpgp: RSA/EC encryption test', async function () {
    this.timeout(50000);
    await Promise.all(param.paramArray.map( async (paramObject) => {
      await Promise.all(paramObject.param.map( async (p, idx) => {
        const encryptionKeys = {
          publicKeys: [param.KeysGPG[paramObject.name][idx].publicKey.keyString ],
        };
        const encryptConfig = { encrypt: param.openpgpEncryptConf };

        const encryptionKeyImported = await cascade.importKeys(
          'string', {keys: encryptionKeys, suite: {encrypt_decrypt: 'openpgp'}, mode: ['encrypt']}
        );
        const encryptionResult = await cascade.encrypt({ message, keys: encryptionKeyImported, config: encryptConfig});
        const serializedEncrypted = encryptionResult.message.serialize();

        const deserializedEncrypted = cascade.importEncryptedBuffer(serializedEncrypted);
        const decryptionKeys = {
          privateKeyPassSets:[ { privateKey:param.KeysGPG[paramObject.name][idx].privateKey.keyString, passphrase: '' } ],
        };
        const decryptionKeyImported = await cascade.importKeys(
          'string', {keys: decryptionKeys, suite: {encrypt_decrypt: 'openpgp'}, mode: ['decrypt']}
        );
        const decryptionResult = await cascade.decrypt({
          data: {message: deserializedEncrypted}, keys: decryptionKeyImported
        });
        expect(decryptionResult.data.toString()===message.toString()).to.be.true;
      }));
    }));
  });

});