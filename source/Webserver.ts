import { Log, WEB_HOSTNAME, WEB_PORT, WEB_ROUTES } from './Constants';
import { inspect } from 'util';
import http from 'http';
import './routes/YouTube-Downloader';

http
    .createServer(async function (req, res) {
        // Route Request to Correct Endpoint
        const T = Date.now()
        const url = new URL(req.url || '', `http://${req.headers.host}`)
        const route = WEB_ROUTES.find(r => r.path === url.pathname.toLowerCase())
        if (!route) {
            res.statusCode = 404
            res.end(`404: Unknown Script of '${url.pathname}'`)
            return
        }

        // Call and Collect Script Response
        let success = true
        let headers: { [key: string]: string } = {}
        let body: any
        try {
            const response = await route.callback(url, req, res)
            if (response.success !== undefined) success = response.success
            if (response.headers !== undefined) headers = response.headers
            if (response.body !== undefined) body = response.body
        } catch (err) {
            success = false
            body = [
                `> AN ERROR HAS OCCCURED <`,
                `${err}`
            ].join('\n')
        }

        // Send Response to Client
        res.statusCode = success ? 200 : 500
        Object
            .entries(headers)
            .forEach(([k, v]) => res.setHeader(k, v))
        res.end(body)

        // Log Request
        Log('http', `${success ? '🟢' : '🔴'} ${res.statusCode} - ${req.url} (${Date.now() - T}ms)`)
    })
    .listen(
        parseInt(WEB_PORT), WEB_HOSTNAME,
        () => Log('http', `Listening on ${WEB_HOSTNAME}:${WEB_PORT}`)
    )