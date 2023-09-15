import fse from 'fs-extra';

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

    /**
     * Initializes the store.
     * @param {string} [file] - Path to JSON file for storage.
     */

    constructor(file) {
        this.#FILE_PATH = file ?? this.#FILE_PATH;

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

                this.#writeToFile({});
            }
        }

        Store.#INSTANCES[this.#FILE_PATH] = this;

        setInterval(() => {
            this.#backupFile();
        }, 3600 * 1000); // 1 hour

        process.on('exit', this.#backupFile.bind(this));
        process.on('beforeExit', this.#backupFile.bind(this));
        process.on('SIGINT', () => {
            this.#backupFile();
            process.exit(2);
        });
        process.on('SIGTERM', () => {
            this.#backupFile();
            process.exit(2);
        });
    }

    #backupFile() {
        try {
            fse.copySync(this.#FILE_PATH, this.#BACKUP_PATH);
        } catch (error) {
            console.error('Failed to backup the file.', error);
        }
    }

    #hasLock() {
        try {
            const existingPid = fse.readFileSync(this.#LOCK_FILE, 'utf-8');
            try {
                process.kill(existingPid, 0);
                return false;
            } catch (error) {
                if (error.code === 'ESRCH') {
                    return true;
                }
                throw error;
            }
        } catch (err) {
            if (err.code === 'ENOENT') {
                return true;
            }
            throw err;
        }
    }

    async #acquireLock(retries = 10, interval = 50) {
        let attempt = 0;
        while (attempt < retries) {
            if (this.#hasLock()) {
                await fse.writeFile(this.#LOCK_FILE, process.pid.toString());
                this.#MERGE_REQUIRED = true;
                return;
            } else {
                attempt++;
                if (attempt < retries) {
                    await this.#sleep(interval * attempt);
                }
            }
        }
        throw new Error('Unable to acquire lock after multiple attempts. Another process is currently writing.');
    }

    #sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    #releaseLock() {
        fse.removeSync(this.#LOCK_FILE);
    }


   #mergeData () {
        const currentData =  fse.readJsonSync(this.#FILE_PATH);
        for (const [key, entry] of Object.entries(currentData)) {
            // Only merge if the in-memory store has a newer timestamp or doesn't have the key
            if (!this.#STORE[key] || entry.timestamp > this.#STORE[key].timestamp) {
                this.#STORE[key] = entry;
            }
        }
        this.#MERGE_REQUIRED = false;
    }

    #writeToFile(data) {
        this.#acquireLock();

        if(this.#MERGE_REQUIRED) {
            this.#mergeData();
        }
        fse.writeJsonSync(this.#TEMP_PATH, data);
        fse.moveSync(this.#TEMP_PATH, this.#FILE_PATH, {overwrite: true});
        this.#releaseLock();

    }

    async #writeToFileAsync() {
        this.#acquireLock();
        if(this.#MERGE_REQUIRED) {
            this.#mergeData();
        }
        await fse.writeJson(this.#TEMP_PATH, this.#STORE);
        await fse.move(this.#TEMP_PATH, this.#FILE_PATH, {overwrite: true});
        this.#releaseLock();
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
     * Gets the value for the given key.
     * @param {string} key
     * @returns {*} Value for the given key.
     */
    get(key) {
        return this.#STORE[key]?.value;
    }

    /**
     * Asynchronously sets the value for the given key.
     * @param {string} key
     * @param {*} value - Must be a primitive.
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
     * Synchronously sets the value for the given key.
     * @param {string} key
     * @param {*} value - Must be a primitive.
     */
    setSync(key, value) {
        if (typeof value === 'object' || Array.isArray(value)) {
            throw new Error('Value must be a primitive (string, number, or boolean).');
        }

        const oldValue = this.get(key);
        this.#STORE[key] = {value, timestamp: Date.now()};
        this.#writeToFile(this.#STORE);
        this.#_emitChange(key, value, oldValue);
    }

    /**
     * Asynchronously removes the value for the given key.
     * @param {string} key
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
     * Synchronously removes the value for the given key.
     * @param {string} key
     */

    removeSync(key) {
        if (!this.#STORE.hasOwnProperty(key)) {
            throw new Error('key does not exist');
        }
        const oldValue = this.#STORE[key];
        delete this.#STORE[key];
        this.#writeToFile(this.#STORE);
        this.#_emitChange(key, undefined, oldValue);
    }

    clear() {
        this.#STORE = {};
        this.#writeToFile({});
    }

    /**
     * Subscribes to changes in the store.
     * @param {Function} listener - Function to call on change.
     */
    changeFeed(listener) {
        this.#LISTENERS.push(listener);
    }

    /**
     * Unsubscribes from changes in the store.
     * @param {Function} listener - Listener to remove.
     * @returns {boolean} True if listener was removed, false otherwise.
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
     * Gets all key-value pairs from the store.
     * @returns {Object} All key-value pairs.
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
