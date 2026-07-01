import pino from "pino";
import { ENV } from "./env.js";

export const logger = pino({
  level: ENV.isDev ? "debug" : "info",
  transport: ENV.isDev
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
    : undefined,
  base: { env: ENV.nodeEnv },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
