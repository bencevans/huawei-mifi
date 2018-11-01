const {promisify} = require('util')
const parseXML	= promisify(require('xml2js').parseString)
const request = (require('request-promise-native')).defaults({
    jar: true
})

function objectMap(object, mapFn) {
    return Object.keys(object).reduce(function(result, key) {
        result[key] = mapFn(object[key])
        return result
    }, {})
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
        const {response} = await parseXML(xml)
        return objectMap(response, val => val[0])
    }

    async authenticate() {
        await this._request(`http://${this.host}`)
    }

    async getStatus() {
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

    async getTrafficStatistics() {
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

    async getCheckNotifications() {
        const res = await this.request(`/api/monitoring/check-notifications`)
        return {
            unreadMessage: parseInt(res.UnreadMessage),
            smsStorageFull: parseInt(res.SmsStorageFull),
            onlineUpdateStatus: parseInt(res.OnlineUpdateStatus),
        }
    }
}
