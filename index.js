const {promisify} = require('util')
const parseXML	= promisify(require('xml2js').parseString)
const request = (require('request-promise-native')).defaults({
    jar: true
})
const uuid = require('uuid')
const uuidToHex = require('uuid-to-hex');
const crypto = require('crypto')

const pbkdf2 = promisify(crypto.pbkdf2)

function objectMap(object, mapFn) {
    return Object.keys(object).reduce(function(result, key) {
        result[key] = mapFn(object[key])
        return result
    }, {})
}

function generateNonce() {
    return uuidToHex(uuid.v4()) + uuidToHex(uuid.v4())
}

module.exports =
class MifiClient {
    constructor(host = '192.168.8.1') {
        this.host = host

        this._request = request.defaults({
            jar: true
        })
    }

    async request(path) {
        const xml = await this._request(`http://${this.host}${path}`)
        console.log(xml)
        const {response} = await parseXML(xml)
        return objectMap(response, val => val[0])
    }

    async _getToken() {
        const { token } = await this.request(`/api/webserver/token`)
        return token
    }

    async _challengeLogin(username, nonce, token) {
        console.log('PRE')
        const res = await this._request({
            method: 'POST',
            uri: `http://${this.host}/api/user/challenge_login`,
            headers: {
                'Content-type': 'text/html',
                '__RequestVerificationToken': token.substring(32)
            },
            encoding: 'utf8',
            resolveWithFullResponse: true,
            body: `<?xml version="1.0" encoding="UTF-8"?><request><username>${username}</username><firstnonce>${nonce}</firstnonce><mode>1</mode></request>`
        })
        const {response} = await parseXML(res.body)

        const serverNonce = response.servernonce[0]
        const salt = response.salt[0]
        const iterations = parseInt(response.iterations[0], 10)
        const verificationToken = res.headers['__requestverificationtoken']
        console.log('serverNonce', serverNonce)
        console.log('salt', salt)
        console.log('iterations', iterations)
        console.log('verificationToken', verificationToken)

        return {
            serverNonce,
            salt,
            iterations,
            verificationToken
        }

    }

    async _clientProof(clientNonce, serverNonce, password, salt, iterations) {
        const message = `${clientNonce},${serverNonce},${serverNonce}`

        const saltedPass = await pbkdf2(password, salt, iterations, 64, 'sha256')
        console.log(saltedPass)

        const clientKey = crypto.createHmac('sha256', 'Client Key')
        clientKey.update(saltedPass)
        console.log(saltedPass)

        const storedKey = crypto.createHash('sha256')
        storedKey.update(clientKey.digest())

        const signature = crypto.createHmac('sha256')
    }

    async login(username, password) {
        const serverToken = await this._getToken()
        const clientNonce = generateNonce()
        console.log(clientNonce)
        const { serverNonce, salt, iterations, verificationToken} = await this._challengeLogin(username, clientNonce, serverToken)
        const clientProof = this._clientProof(clientNonce, serverNonce, password, salt, iterations)
        console.log('POST')


        // `<?xml version: "1.0" encoding="UTF-8"?><request><clientproof>36c153e81f914499a92d033180bfbb14083bebdffed55cd6d2c61631b51ba0cb</clientproof><finalnonce>36ee747dd4fb4c2e9ac5573a4e9a14f2545a9a09a258a1cdd42257e66610257fG1F0cS3fMKBw790ftnjNrJPZ4fwUEtK4</finalnonce></request>`

    }

    async authenticate() {
        await this._request(`http://${this.host}`)
    }

    async status() {
        const res = await this.request(`/api/monitoring/status`)
        return {
            /**
             * mobile signal strength
             * number: 0 - 5
             */
            signal: parseInt(res.SignalIcon),
            /**
             * battery percentage
             * number 0 - 100
             */
            battery: parseInt(res.BatteryPercent),
            /**
             * current devices connected
             * number 0+
             */
            currentDevices: parseInt(res.CurrentWifiUser)
        }
    }

    async traffic() {
        const res = await this.request(`/api/monitoring/traffic-statistics`)
        return {
            currentConnectTime: parseInt(res.CurrentConnectTime),
            currentUpload: parseInt(res.CurrentUpload),
            currentDownload: parseInt(res.CurrentDownload),
            currentDownloadRate: parseInt(res.CurrentDownloadRate),
            currentUploadRate: parseInt(res.CurrentUploadRate),
            totalUpload: parseInt(res.TotalUpload),
            totalDownload: parseInt(res.TotalDownload),
            totalConnectTime: parseInt(res.TotalConnectTime),
        }
    }

    async notifications() {
        const res = await this.request(`/api/monitoring/check-notifications`)
        return {
            unreadMessage: parseInt(res.UnreadMessage),
            smsStorageFull: parseInt(res.SmsStorageFull),
            onlineUpdateStatus: parseInt(res.OnlineUpdateStatus),
        }
    }

    async connectedDevices() {
        const res = await this.request(`/api/wlan/host-list`)

        console.log(res)
    }
}
