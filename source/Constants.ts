import { config } from "dotenv";
import http from "http";
config();

// Log Message to console, errors can generally be ignored.
export function Log(service: string, message: string) {
    process.stdout.write(`${new Date().toISOString()} | ${service}: ${message}\n`)
}
export const WEB_HOSTNAME = (process.env.WEB_PORT || "127.0.0.1")
export const WEB_PORT = (process.env.WEB_PORT || "1273")

export const WEB_ROUTES = new Array<{
    path: string;
    callback: (
        url: URL,
        req: http.IncomingMessage,
        res: http.OutgoingMessage<http.IncomingMessage>
    ) => Promise<{
        success?: boolean;
        headers?: { [key: string]: string };
        body?: any;
    }>;
}>()