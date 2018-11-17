const test = require('tape')
const MiFi = require('.')

let client

test('create client and auth', async t => {
    client = new MiFi('192.168.8.1')
    await client.authenticate()
    t.end()
})

test('get status', async t => {
    const status = await client.status()
    console.log(status)
    t.end()
})

test('get traffic stats', async t => {
    const status = await client.traffic()
    console.log(status)
    t.end()
})

test('check notifications', async t => {
    const status = await client.notifications()
    console.log(status)
    t.end()
})