import fse from 'fs-extra'

class Store {
  #STORE = {};
  #LISTENERS = [];
  #FILE_PATH = './flatkvp.json';

  constructor() {
    try {
      this.#STORE = fse.readJsonSync(this.#FILE_PATH);
    } catch (e) {
      fse.writeJsonSync(this.#FILE_PATH, {});
    }
  }


  get(key) {

    if (this.#STORE[key]) {
      return this.#STORE[key];
    }

    return undefined;
  }


  set(key, value) {
    let oldValue = this.#STORE[key];
    this.#STORE[key] = value;
    fse.writeJson(this.#FILE_PATH, this.#STORE).catch(function (err) {
      console.error(err)
    })
    this.#_emitChange(key, value, oldValue)
  }

  setSync(key, value) {

    let oldValue = this.#STORE[key];

    this.#STORE[key] = value;
    try {
      fse.writeJsonSync(this.#FILE_PATH, this.#STORE)
    } catch (e) {
      console.error(e);
      return
    }

    this.#_emitChange(key, value, oldValue);
  }

  remove(key) {
    if (typeof this.#STORE[key] === 'undefined') {
      throw new Error('key does not exist');
    }
    let oldValue = this.#STORE[key];
    delete this.#STORE[key];

    fse.writeJson(this.#FILE_PATH, this.#STORE).catch(function (err) {
      console.error(err);
    })
    this.#_emitChange(key, this.#STORE[key], oldValue);
    return true
  }

  removeSync(key) {
    if (this.#STORE[key]) {
      throw new Error('key does not exist');
    }
    let oldValue = this.#STORE[key];
    delete this.#STORE[key];

    try {
      fse.writeJsonSync(this.#FILE_PATH, this.#STORE);
    } catch (e) {
      console.error(e);
      return false;
    }
    this.#_emitChange(key, this.#STORE[key], oldValue)
    return true;
  }

  clear() {
    this.#STORE = {};
    try {
      fse.writeJsonSync(this.#FILE_PATH, {})
    } catch (e) {
      console.error(e);
      return false;
    }
    return true;
  }

  changeFeed(listener) {
    this.#LISTENERS.push(listener);
  }

  removeChangeFeedListener(listener) {
    const index = this.#LISTENERS.indexOf(listener);

    if (index !== -1) {
      this.#LISTENERS.splice(index, 1);
    } else {
      return false;
    }

    return true;
  }

  getAll(){
    return {...this.#STORE}
  }

  #_emitChange(key, newValue, oldValue) {
    for (const listener of this.#LISTENERS) {
      listener(key, newValue, oldValue)
    }
  }
}

export default new Store();
