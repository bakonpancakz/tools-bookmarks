import ytdl from 'ytdl-core';
import cp from 'child_process';
import { WEB_ROUTES } from '../Constants';
import { join } from 'path';
import * as fs from 'fs';

const YTDL_COOKIES = (process.env.YTDL_COOKIES || '')
const TEMP_DIR = join(process.cwd(), 'temp')
fs.mkdirSync(TEMP_DIR, { recursive: true })

WEB_ROUTES.push({
    path: '/youtube/download',
    callback: async (url, req, res) => new Promise(async done => {

        // Fetch Video Metadata from URL
        const withVideo = url.searchParams.get('type') === 'video'
        const VideoID = ytdl.getVideoID(url.searchParams.get('url') || '')
        const vi = await ytdl.getInfo(VideoID, {
            requestOptions: {
                headers: { Cookie: YTDL_COOKIES }
            }
        })
        const videoStream = ytdl.chooseFormat(vi.formats, { quality: 'highestvideo' })
        const audioStream = ytdl.chooseFormat(vi.formats, { quality: 'highestaudio', })


        // Create Encoder Arguments
        const videoTitle = vi.videoDetails.title.replace(/[^A-Za-z0-9 ~';:\[\]{}\-+='!@#$%^&()_!@#$%^&+-_]/g, '-')
        const outputContainer = withVideo
            // Preserve Original Video to prevent reencoding
            ? (videoStream.container === 'webm' ? 'webm' : 'mp4')
            // Convert Audio into MP3 for audio only
            : 'mp3'
        const videoPath = join(TEMP_DIR, `temp_file_${Date.now()}.${outputContainer}`)

        const args = new Array<string>(
            '-hide_banner',
            '-loglevel', 'warning',
            '-i', audioStream.url,
        )
        if (videoStream && withVideo) args.push(
            '-i', videoStream.url,
            '-c:v', 'copy',
            '-c:a', (audioStream.container === 'webm' ? 'libopus' : 'mp3')
        )
        args.push('-y', videoPath)

        // Create FFMPEG Process
        const logs = new Array<Buffer>()
        const proc = cp.spawn('ffmpeg', args)
        proc.stderr.on('data', c => logs.push(c))
        proc.once('exit', (code: number) => {
            if (code === 0) {
                // Read File from Disk
                const fileLength = fs.statSync(videoPath).size
                const fileReader = fs.createReadStream(videoPath)

                // Write Headers
                res.setHeader('Content-Length', fileLength)
                res.setHeader(
                    'Content-Disposition',
                    `attachment; filename=${videoTitle}.${outputContainer}`
                )

                // Delete Temporary File
                fileReader.pipe(res).once('finish', () => {
                    fs.unlink(videoPath, () => { })
                    done({})
                })
            } else {
                // FFMPEG Process Crashed. Collect Logs for User
                done({
                    success: false,
                    body:
                        `> An Error has Occurred <\n\nURL: ${url}\n\n` +
                        `> Arguments <\n\nffmpeg ${args.map(a => URL.canParse(a) ? "<HIDDEN URL>" : a).join(' ')}\n\n` +
                        `> FFMPEG Output <\n\n${logs.map(c => c.toString()).join('')}`
                })
            }
        })
    })
})