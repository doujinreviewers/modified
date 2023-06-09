// DarkPlasma_ImageComposer
// Copyright (c) 2020 DarkPlasma
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php

/**
 * 2023/06/02 1.0.0-modified MZに対応
 * 2020/04/02 1.0.0 公開
 */

/*:ja
 * @target MZ
 * @plugindesc 画像を合成するプラグイン
 * @author DarkPlasma, 同人Reviewers
 * @license MIT
 *
 * @help
 * 画像を合成し、1枚のピクチャとして利用できるようにします。
 *
 * 利用方法は CBR_imgFusion.js と同様です。
 * イベントのスクリプトで以下のように入力してください。
 *
 * CBR-画像合成
 * <ベース画像.png>
 * 差分画像1.png
 * 差分画像2.png
 * ...
 *
 * これにより、ベース画像を読み込んだピクチャに差分画像が合成されます。
 * ピクチャの表示中でも合成が可能です。
 *
 * 合成解除したい際にも都度同様にして上書きする必要があります。
 *
 * このプラグインはCOBRAさんが公開されている CBR_imgFusion.js をリファクタしたものです。
 * 元のプラグインについては下記URLをご覧ください。
 *  http://cobrara.blogspot.jp/
 *  https://twitter.com/onarinin_san
 */

(function () {
  'use strict';
  const pluginName = document.currentScript.src.replace(/^.*\/(.*).js$/, function () {
    return arguments[1];
  });
  const pluginParameters = PluginManager.parameters(pluginName);

  const LOADING_STATE = {
    LOADED: 'loaded',
  };

  /**
   * 合成Bitmap
   */
  class ComposedBitmaps {
    constructor() {
      this._bitmaps = {};
    }

    /**
     * @param {string} key ベース画像の名前
     */
    clear(key) {
      this._bitmaps[key] = [];
    }

    /**
     * @param {string} key ベース画像の名前
     * @param {Bitmap} bitmap ビットマップ
     */
    pushBitmap(key, bitmap) {
      if (!this._bitmaps[key]) {
        this._bitmaps[key] = [];
      }
      this._bitmaps[key].push(bitmap);
    }

    /**
     * @param {string} key ベース画像の名前
     */
    isAllBitmapLoaded(key) {
      if (!this._bitmaps[key]) {
        return false;
      }
      return !this._bitmaps[key].some(bitmap => bitmap._loadingState !== LOADING_STATE.LOADED);
    }

    /**
     * @param {string} key ベース画像の名前
     * @return {Bitmap}
     */
    compose(key) {
      if (!this._bitmaps[key]) {
        return null;
      }
      const baseBitmap = this._bitmaps[key][0];
      let bitmap = new Bitmap(baseBitmap.width, baseBitmap.height);
      bitmap.blt(baseBitmap, 0, 0, baseBitmap.width, baseBitmap.height, 0, 0);
      const additionalBitmaps = this._bitmaps[key].slice(1);
      additionalBitmaps.forEach(additionalBitmap => {
        bitmap._context.drawImage(additionalBitmap._image, 0, 0);
      });
      bitmap._baseTexture.update();
      return bitmap;
    }
  }

  const composedBitmaps = new ComposedBitmaps();

  const _Game_Interpreter_command355 = Game_Interpreter.prototype.command355;
  Game_Interpreter.prototype.command355 = function () {
    const key = this.currentCommand().parameters[0];
    // TODO: インターフェースは後々考えるが、互換性を持たせる
    const keyScript = /^CBR\-(画像合成)$/.exec(key);
    if (keyScript) {
      let imageList = [];
      //下に続いてるスクリプトの取得
      while (this.nextEventCode() === 655) {
        this._index++;
        imageList.push(this.currentCommand().parameters[0]);
      }
      if (keyScript[1] === "画像合成") {
        $gameSystem.composeImage(imageList);
      }
    } else {
      //普通にスクリプト実行
      _Game_Interpreter_command355.call(this);
    }
    return true;
  }

  /**
   * 画像を合成する
   * @param {string[]} imageNameList
   */
  Game_System.prototype.composeImage = function (imageNameList) {
    // 画像の名前に含まれる変数を展開
    imageNameList = imageNameList
      .map(imageName => imageName.replace(/\\V\[(\d+)\]/g, (_, variableId) => $gameVariables.value(variableId)));

    const baseImageName = imageNameList.shift().slice(1, -1);

    // composedBitmapsにpush
    const bitmap = ImageManager.loadBitmap('img/pictures/', baseImageName.slice(0, -4), 0, true);
    composedBitmaps.clear(baseImageName);
    composedBitmaps.pushBitmap(baseImageName, bitmap);
    imageNameList.forEach(imageName => {
      const bitmap = ImageManager.loadBitmap('img/pictures/', imageName.slice(0, -4), 0, true);
      composedBitmaps.pushBitmap(baseImageName, bitmap);
    });
  };

  Sprite_Picture.prototype.loadBitmap = function() {
    if (composedBitmaps.isAllBitmapLoaded(`${this._pictureName}.png`)) {
      this.bitmap = composedBitmaps.compose(`${this._pictureName}.png`);
    }else{
      this.bitmap = ImageManager.loadPicture(this._pictureName);
    }
  };

})();
