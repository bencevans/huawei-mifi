# huawei-mifi

> Gather stats from Huawei MiFi Device

## install

    $ npm install huawei-mifi

## example

```js
const Mifi = require('huawei-mifi')

const mifi = new Mifi('192.168.8.1')

await mifi.authenticate()
console.log('status:', await mifi.status())
console.log('traffic stats:', await mifi.traffic())
console.log('notifications:', await mifi.notifications())
```

## licence

MIT