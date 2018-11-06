/**
 * params.basic.js
 */

import jscu from 'js-crypto-utils';
import * as cascade from '../src/index.js';

// Encryption and Signing Parameters
const curves = [ 'P-256', 'P-384', 'P-521' ];
const modulusLength = [ 1024, 2048 ];
const userIds = [ 'test@example.com' ];
const paramArray = [{name: 'EC', param: curves}, {name: 'RSA', param: modulusLength}];

const openpgpEncryptConf = { suite: 'openpgp', options: { detached: true, compression: 'zlib' }};
const openpgpSignConf = {required: true, suite: 'openpgp', options: {}};

const jscuSessionEncryptConf = {suite: 'jscu', options: {name: 'AES-GCM'}};
const openpgpgSessionEncryptConf = {suite: 'openpgp', options: {algorithm: 'aes256', aead: true, aead_mode: 'eax' }};


export async function createParam() {
  const param = new ParamsBasic();
  await param.init();
  return param;
}

class ParamsBasic{
  constructor(){
    this.Keys={};
    this.KeysGPG={};
  }

  async init (){
    this.Keys.EC = await Promise.all(
      curves.map ( (curve) => cascade.generateKey({suite: 'jscu', keyParams: {type: 'ECC', curve}}))
    );
    this.KeysGPG.EC = await Promise.all(
      curves.map ( (curve) => cascade.generateKey({suite: 'openpgp', userIds, keyParams: {type: 'ECC', keyExpirationTime: 0, curve}}))
    );
    this.Keys.RSA = await Promise.all(
      modulusLength.map ( (ml) => cascade.generateKey({suite: 'jscu', keyParams: {type: 'RSA', modulusLength: ml}}))
    );
    this.KeysGPG.RSA = await Promise.all(
      modulusLength.map (
        (ml) => cascade.generateKey({suite: 'openpgp', userIds, keyParams: {type: 'RSA', keyExpirationTime: 0, modulusLength: ml}}))
    );
    this.Keys.sessionKey = await jscu.random.getRandomBytes(32);
  }

  jscuEncryptConf (paramObject, idx) {
    return {
      suite: 'jscu',
      options: (paramObject.name === 'EC')
        ? {
          privateKeyPass: {privateKey: this.Keys[paramObject.name][idx].privateKey.keyString, passphrase: ''}, // only for ECDH
          hash: 'SHA-256', encrypt: 'AES-GCM', keyLength: 32, info: ''
        }
        : {hash: 'SHA-256'},
    };
  }

  jscuSignConf (paramObject) {
    return {
      required: true,
      suite: 'jscu',
      options: (paramObject.name === 'EC') ? {hash: 'SHA-256'} : {hash: 'SHA-256', name: 'RSA-PSS', saltLength: 32}
    };
  }

  get paramArray () { return paramArray; }
  get openpgpEncryptConf () { return openpgpEncryptConf; }
  get openpgpSignConf () { return openpgpSignConf; }
  get jscuSessionEncryptConf () { return jscuSessionEncryptConf; }
  get openpgpgSessionEncryptConf () { return openpgpgSessionEncryptConf; }
}
