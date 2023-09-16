### NOTES: 
   - This is still alpha stage.
   - The Sync methods, if using the multiprocess flag, can hold up the thread for many seconds while trying to acquire a lock.
<a name="Store"></a>

## Store
Simple key-value store with file persistence and optional async write queue.

**Kind**: global class  

* [Store](#Store)
    * [new Store([options])](#new_Store_new)
    * [.get(key)](#Store+get)  <code>\*</code>
    * [.set(key, value)](#Store+set)
    * [.setSync(key, value)](#Store+setSync)
    * [.remove(key)](#Store+remove)
    * [.removeSync(key)](#Store+removeSync)
    * [.clear()](#Store+clear)
    * [.changeFeed(listener)](#Store+changeFeed)
    * [.removeChangeFeedListener(listener)](#Store+removeChangeFeedListener)  <code>boolean</code>
    * [.getAll()](#Store+getAll)  <code>Object</code>

<a name="new_Store_new"></a>

### new Store([options])
Initializes the store.


| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>object</code> | Path to JSON file for storage. |

<a name="Store+get"></a>

### store.get(key)  <code>\*</code>
Retrieves the value associated with the provided key.

**Kind**: instance method of [<code>Store</code>](#Store)  
**Returns**: <code>\*</code> - The value associated with the key, or undefined if the key doesn't exist.  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | The key to search for. |

<a name="Store+set"></a>

### store.set(key, value)
Asynchronously sets the value for a given key.

**Kind**: instance method of [<code>Store</code>](#Store)  
**Throws**:

- <code>Error</code> If the value is not a primitive type.


| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | The key to set. |
| value | <code>\*</code> | The value to set. Must be a primitive type (string, number, or boolean). |

<a name="Store+setSync"></a>

### store.setSync(key, value)
Synchronously sets the value for a given key.

**Kind**: instance method of [<code>Store</code>](#Store)  
**Throws**:

- <code>Error</code> If the value is not a primitive type.


| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | The key to set. |
| value | <code>\*</code> | The value to set. Must be a primitive type (string, number, or boolean). |

<a name="Store+remove"></a>

### store.remove(key)
Asynchronously removes a key and its associated value from the store.

**Kind**: instance method of [<code>Store</code>](#Store)  
**Throws**:

- <code>Error</code> If the key doesn't exist in the store.


| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | The key to remove. |

<a name="Store+removeSync"></a>

### store.removeSync(key)
Synchronously removes a key and its associated value from the store.

**Kind**: instance method of [<code>Store</code>](#Store)  
**Throws**:

- <code>Error</code> If the key doesn't exist in the store.


| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | The key to remove. |

<a name="Store+clear"></a>

### store.clear()
Clears all key-value pairs from the store.

**Kind**: instance method of [<code>Store</code>](#Store)  
<a name="Store+changeFeed"></a>

### store.changeFeed(listener)
Subscribes a listener function to changes in the store.
The listener is called whenever a key's value changes.

**Kind**: instance method of [<code>Store</code>](#Store)  

| Param | Type | Description |
| --- | --- | --- |
| listener | <code>function</code> | The function to call when a change occurs. |

<a name="Store+removeChangeFeedListener"></a>

### store.removeChangeFeedListener(listener)  <code>boolean</code>
Unsubscribes a listener from the change feed.

**Kind**: instance method of [<code>Store</code>](#Store)  
**Returns**: <code>boolean</code> - Returns true if the listener was found and removed, otherwise false.  

| Param | Type | Description |
| --- | --- | --- |
| listener | <code>function</code> | The listener to unsubscribe. |

<a name="Store+getAll"></a>

### store.getAll()  <code>Object</code>
Retrieves all key-value pairs currently in the store.

**Kind**: instance method of [<code>Store</code>](#Store)  
**Returns**: <code>Object</code> - An object containing all key-value pairs.  
