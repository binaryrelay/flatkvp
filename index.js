import fse from 'fs-extra'

class Store {
  #STORE = {};
  #CALLBACKS = [];
   #FILE_PATH = './flatkvp.json';
  constructor() {
    try {
      this.#STORE = fse.readJsonSync(this.#FILE_PATH)
    } catch (e) {
      fse.writeJsonSync(this.#FILE_PATH, {})
    }

  }


  get(key) {

    if (this.#STORE[key]) {
      return this.#STORE[key]
    }

    return undefined;
  }


  set(key, value) {
    let oldValue = this.#STORE[key];
    this.#STORE[key] = String(value);
    fse.writeJson(this.#FILE_PATH, this.#STORE).catch(function (err) {
      console.log(err)
    })
    this.#_emitChange(key, value, oldValue)
  }

  setSync(key, value) {

    let oldValue = this.#STORE[key];

    this.#STORE[key] = String(value);
    try {
      fse.writeJsonSync(this.#FILE_PATH, this.#STORE)
    } catch (e) {
      console.error(e);
      return
    }

    this.#_emitChange(key, value, oldValue)
  }

  remove(key) {
    if (this.#STORE[key]) {
      throw new Error('key does not exist')
    }
    delete this.#STORE[key];

    fse.writeJson(this.#FILE_PATH, this.#STORE).catch(function (err) {
      console.log(err)
    })

    return true
  }


  clear() {
    this.#STORE = {}

    fse.writeJsonSync(this.#FILE_PATH, {})
    return true
  }

  changeFeed(listener) {
    this.#CALLBACKS.push(listener);
  }

  removeChangeFeedListener(listener) {
    let index = this.#CALLBACKS.indexOf(listener)
    this.#CALLBACKS.splice(index, 1);
    return true
  }

  #_emitChange(key, newValue, oldValue) {
    for (const callback of this.#CALLBACKS) {
      callback(key, newValue, oldValue)
    }
  }
}


export default new Store();
