import fse from 'fs-extra';
import fs from 'fs';

/**
 * Simple key-value store with file persistence and optional async write queue.
 */
class Store {
    #STORE = {};
    #LISTENERS = [];
    #FILE_PATH = './flatkvp.json';
    #TEMP_PATH = `${this.#FILE_PATH}.temp`;
    #BACKUP_PATH = `${this.#FILE_PATH}.backup`;
    #LOCK_FILE = `${this.#FILE_PATH}.lock`;
    #MERGE_REQUIRED = false;
    #QUEUE = [];
    #WRITE_LOCK = false;
    static #INSTANCES = {};
    #WATCHER;
    //this is very experimental still
    #MULTIPROCESS = false;

    /**
     * Initializes the store.
     * @param {object} [options] - Path to JSON file for storage.
     */

    constructor(options) {
        this.#FILE_PATH = options?.filePath ?? this.#FILE_PATH;
        this.#MULTIPROCESS = options?.multiprocess ?? this.#MULTIPROCESS;

        if (Store.#INSTANCES[this.#FILE_PATH]) {
            return Store.#INSTANCES[this.#FILE_PATH];  // return the existing instance
        }

        try {
            this.#STORE = fse.readJsonSync(this.#FILE_PATH);
        } catch (e) {
            console.warn('Failed to read main store file. Attempting to read from backup...');
            try {
                this.#STORE = fse.readJsonSync(this.#BACKUP_PATH);
            } catch (backupError) {
                console.error('Failed to read from backup. Initializing an empty store...');

                const timestamp = Date.now();
                try {
                    fse.copySync(this.#FILE_PATH, `${this.#FILE_PATH}.${timestamp}.backup`);
                } catch (timestampBackupError) {
                    console.error('Failed to create a timestamped backup.');
                }

                this.#writeToFileSync({});
            }
        }

        Store.#INSTANCES[this.#FILE_PATH] = this;

        setInterval(() => {
            this.#backupFile();
        }, 3600 * 1000); // 1 hour

        if (this.#MULTIPROCESS) {
            this.#startFileWatcher();
        }
        process.on('exit', this.#onExit);
        process.on('beforeExit', this.#onExit);
        process.on('SIGINT', () => {
            this.#onExit();
            process.exit(2);
        });
        process.on('SIGTERM', () => {
            this.#onExit();
            process.exit(2);
        });
    }

    #onExit() {
        delete Store.#INSTANCES[this.#FILE_PATH];
        if (this.#WATCHER) {
            this.#WATCHER.close();
        }
        this.#backupFile();

    }

    #startFileWatcher() {
        this.#WATCHER = fs.watch(this.#FILE_PATH, async (eventType, filename) => {
            if (eventType === 'change') {
                await this.#loadFromFile();
            }
        });
    }

    async #loadFromFile() {
        try {
            const newStore = await fse.readJson(this.#FILE_PATH);
            for (const [key, entry] of Object.entries(newStore)) {
                const oldValue = this.get(key);
                this.#STORE[key] = entry;

                if (oldValue !== entry.value) {
                    this.#_emitChange(key, entry.value, oldValue);
                }
            }
        } catch (e) {
            console.error('Failed to read changed store file.', e);
        }
    }

    #backupFile() {
        try {
            fse.copySync(this.#FILE_PATH, this.#BACKUP_PATH);
        } catch (error) {
            console.error('Failed to backup the file.', error);
        }
    }

    async #hasLockAsync() {
        try {
            const existingPid = await fse.readFile(this.#LOCK_FILE, 'utf-8');
            process.kill(existingPid, 0); // Check if process is running
            return false; // pid has lock
        } catch (error) {
            if (error.code === 'ENOENT') {
                return true; // Lock file doesn't exist
            }
            if (error.code === 'ESRCH') {
                return true; // process is not running, lock is stale
            }
            throw error;
        }
    }

    async #acquireLockAsync(retries = 10, interval = 50) {
        if (retries <= 0) {
            throw new Error('Unable to acquire lock after multiple attempts. Another process is currently writing.');
        }

        if (await this.#hasLockAsync()) {
            await fse.writeFile(this.#LOCK_FILE, process.pid.toString());
            if (retries < 10) {
                this.#MERGE_REQUIRED = true;
            }
            return;
        }

        setTimeout(() => this.#acquireLockAsync(retries - 1, interval + 50), interval);
    }

    #hasLockSync() {
        try {
            const existingPid = fse.readFileSync(this.#LOCK_FILE, 'utf-8');
            process.kill(existingPid, 0);
            return false;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return true;
            }
            if (error.code === 'ESRCH') {
                return true;
            }
            throw error;
        }
    }

    #acquireLockSync(retries = 20, interval = 10) {
        if (retries <= 0) {
            throw new Error('Unable to acquire lock after multiple attempts. Another process is currently writing.');
        }

        if (this.#hasLockSync()) {
            fse.writeFileSync(this.#LOCK_FILE, process.pid.toString());
            if (retries < 10) {
                this.#MERGE_REQUIRED = true;
            }
            return;
        }

        const sleepSync = (ms) => {
            const end = Date.now() + ms;
            while (Date.now() < end) {
            }
        };

        sleepSync(interval);
        return this.#acquireLockSync(retries - 1, interval + 10);
    }


    async #releaseLockAsync() {
        await fse.remove(this.#LOCK_FILE);
    }

    #releaseLockSync() {
        fse.removeSync(this.#LOCK_FILE);
    }

    #mergeData() {
        const currentData = fse.readJsonSync(this.#FILE_PATH);
        for (const [key, entry] of Object.entries(currentData)) {
            // Only merge if the in-memory store has a newer timestamp or doesn't have the key
            if (!this.#STORE[key] || entry.timestamp > this.#STORE[key].timestamp) {
                this.#STORE[key] = entry;
            }
        }
        this.#MERGE_REQUIRED = false;
    }

    #writeToFileSync(data) {
        if (this.#MULTIPROCESS) {
            this.#acquireLockSync();

            if (this.#MERGE_REQUIRED) {
                this.#mergeData();
            }
        }

        fse.writeJsonSync(this.#TEMP_PATH, data);
        fse.moveSync(this.#TEMP_PATH, this.#FILE_PATH, {overwrite: true});

        if (this.#MULTIPROCESS) this.#releaseLockSync();

    }

    async #writeToFileAsync() {
        if (this.#MULTIPROCESS) {
            await this.#acquireLockAsync();
            if (this.#MERGE_REQUIRED) {
                this.#mergeData();
            }
        }

        await fse.writeJson(this.#TEMP_PATH, this.#STORE);
        await fse.move(this.#TEMP_PATH, this.#FILE_PATH, {overwrite: true});

        if (this.#MULTIPROCESS) await this.#releaseLockAsync();
    }

    #_emitChange(key, newValue, oldValue) {
        for (const listener of this.#LISTENERS) {
            listener(key, newValue, oldValue);
        }
    }

    #queueOperation(operation) {
        this.#QUEUE.push(operation);
        this.#processQueue();
    }

    async #processQueue() {
        if (this.#WRITE_LOCK || this.#QUEUE.length === 0) return;

        this.#WRITE_LOCK = true;

        while (this.#QUEUE.length > 0) {
            const operation = this.#QUEUE.shift();
            if (operation.type === 'set') {
                this.#STORE[operation.key] = operation.value;
            } else if (operation.type === 'remove') {
                delete this.#STORE[operation.key];
            }
        }


        try {
            await this.#writeToFileAsync();
        } catch (err) {
            console.error(err);
            return;
        }
        this.#WRITE_LOCK = false;
    }

    /**
     * Retrieves the value associated with the provided key.
     * @param {string} key - The key to search for.
     * @returns {*} The value associated with the key, or undefined if the key doesn't exist.
     */

    get(key) {
        return this.#STORE[key]?.value;
    }

    /**
     * Asynchronously sets the value for a given key.
     * @param {string} key - The key to set.
     * @param {*} value - The value to set. Must be a primitive type (string, number, or boolean).
     * @throws {Error} If the value is not a primitive type.
     */
    set(key, value) {
        if (typeof value === 'object' || Array.isArray(value)) {
            throw new Error('Value must be a primitive (string, number, or boolean).');
        }

        const oldValue = this.get(key);
        this.#queueOperation({type: 'set', key, value: {value, timestamp: Date.now()}});
        this.#_emitChange(key, value, oldValue);
    }

    /**
     * Synchronously sets the value for a given key.
     * @param {string} key - The key to set.
     * @param {*} value - The value to set. Must be a primitive type (string, number, or boolean).
     * @throws {Error} If the value is not a primitive type.
     */
    setSync(key, value) {
        if (typeof value === 'object' || Array.isArray(value)) {
            throw new Error('Value must be a primitive (string, number, or boolean).');
        }

        const oldValue = this.get(key);
        this.#STORE[key] = {value, timestamp: Date.now()};
        this.#writeToFileSync(this.#STORE);
        this.#_emitChange(key, value, oldValue);
    }

    /**
     * Asynchronously removes a key and its associated value from the store.
     * @param {string} key - The key to remove.
     * @throws {Error} If the key doesn't exist in the store.
     */
    remove(key) {
        if (!this.#STORE.hasOwnProperty(key)) {
            throw new Error('key does not exist');
        }
        const oldValue = this.#STORE[key];
        this.#queueOperation({type: 'remove', key});
        this.#_emitChange(key, undefined, oldValue);
    }

    /**
     * Synchronously removes a key and its associated value from the store.
     * @param {string} key - The key to remove.
     * @throws {Error} If the key doesn't exist in the store.
     */
    removeSync(key) {
        if (!this.#STORE.hasOwnProperty(key)) {
            throw new Error('key does not exist');
        }
        const oldValue = this.#STORE[key];
        delete this.#STORE[key];
        this.#writeToFileSync(this.#STORE);
        this.#_emitChange(key, undefined, oldValue);
    }

    /**
     * Clears all key-value pairs from the store.
     */
    clear() {
        this.#STORE = {};
        this.#writeToFileSync({});
    }

    /**
     * Subscribes a listener function to changes in the store.
     * The listener is called whenever a key's value changes.
     * @param {Function} listener - The function to call when a change occurs.
     */
    changeFeed(listener) {
        this.#LISTENERS.push(listener);
    }

    /**
     * Unsubscribes a listener from the change feed.
     * @param {Function} listener - The listener to unsubscribe.
     * @returns {boolean} Returns true if the listener was found and removed, otherwise false.
     */
    removeChangeFeedListener(listener) {
        const index = this.#LISTENERS.indexOf(listener);
        if (index !== -1) {
            this.#LISTENERS.splice(index, 1);
            return true;
        }
        return false;
    }


    /**
     * Retrieves all key-value pairs currently in the store.
     * @returns {Object} An object containing all key-value pairs.
     */
    getAll() {
        const result = {};
        for (const [key, entry] of Object.entries(this.#STORE)) {
            result[key] = entry.value;
        }
        return result;
    }


}

export default Store;
