<a name="Store"></a>

## Store
Simple key-value store with file persistence and optional async write queue.

**Kind**: global class  

* [Store](#Store)
    * [new Store([file])](#new_Store_new)
    * [.get(key)](#Store+get) <code>\*</code>
    * [.set(key, value)](#Store+set)
    * [.setSync(key, value)](#Store+setSync)
    * [.remove(key)](#Store+remove)
    * [.removeSync(key)](#Store+removeSync)
    * [.changeFeed(listener)](#Store+changeFeed)
    * [.removeChangeFeedListener(listener)](#Store+removeChangeFeedListener) <code>boolean</code>
    * [.getAll()](#Store+getAll) <code>Object</code>

<a name="new_Store_new"></a>

### new Store([file])
Initializes the store.


| Param | Type | Description |
| --- | --- | --- |
| [file] | <code>string</code> | Path to JSON file for storage. |

<a name="Store+get"></a>

### store.get(key) <code>\*</code>
Gets the value for the given key.

**Kind**: instance method of [<code>Store</code>](#Store)  
**Returns**: <code>\*</code> - Value for the given key.  

| Param | Type |
| --- | --- |
| key | <code>string</code> | 

<a name="Store+set"></a>

### store.set(key, value)
Asynchronously sets the value for the given key.

**Kind**: instance method of [<code>Store</code>](#Store)  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| value | <code>\*</code> | Must be a primitive. |

<a name="Store+setSync"></a>

### store.setSync(key, value)
Synchronously sets the value for the given key.

**Kind**: instance method of [<code>Store</code>](#Store)  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| value | <code>\*</code> | Must be a primitive. |

<a name="Store+remove"></a>

### store.remove(key)
Asynchronously removes the value for the given key.

**Kind**: instance method of [<code>Store</code>](#Store)  

| Param | Type |
| --- | --- |
| key | <code>string</code> | 

<a name="Store+removeSync"></a>

### store.removeSync(key)
Synchronously removes the value for the given key.

**Kind**: instance method of [<code>Store</code>](#Store)  

| Param | Type |
| --- | --- |
| key | <code>string</code> | 

<a name="Store+changeFeed"></a>

### store.changeFeed(listener)
Subscribes to changes in the store.

**Kind**: instance method of [<code>Store</code>](#Store)  

| Param | Type | Description |
| --- | --- | --- |
| listener | <code>function</code> | Function to call on change. |

<a name="Store+removeChangeFeedListener"></a>

### store.removeChangeFeedListener(listener) <code>boolean</code>
Unsubscribes from changes in the store.

**Kind**: instance method of [<code>Store</code>](#Store)  
**Returns**: <code>boolean</code> - True if listener was removed, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| listener | <code>function</code> | Listener to remove. |

<a name="Store+getAll"></a>

### store.getAll() <code>Object</code>
Gets all key-value pairs from the store.

**Kind**: instance method of [<code>Store</code>](#Store)  
**Returns**: <code>Object</code> - All key-value pairs.  
