import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { RateLimiterMemory } from "rate-limiter-flexible";

const app = express();
const PORT = process.env.PORT || 3000;
const TAG = "join @FAST_DevelopersOfficial, Powered by FAST";
const API_KEY = process.env.API_KEY || ""; // optional

// --- middleware
app.use(helmet());
app.use(cors({ origin: "*"}));
app.use(express.json());
app.use(morgan("tiny"));

// --- simple rate limit (per IP)
const limiter = new RateLimiterMemory({ points: 30, duration: 60 }); // 30 req/min
app.use(async (req, res, next) => {
  try { await limiter.consume(req.ip); next(); }
  catch { return res.status(429).json({ status:"error", message:"Too many requests", tag: TAG }); }
});

// --- auth (optional)
app.use((req, res, next) => {
  if (!API_KEY) return next();
  const key = req.header("x-api-key") || req.query.key;
  if (key === API_KEY) return next();
  return res.status(401).json({ status:"error", message:"Invalid API key", tag: TAG });
});

// --- helpers
const isYouTube = (u) => /(youtube\.com|youtu\.be)/i.test(u || "");
const normalizeQuality = (q) => {
  const v = String(q || "best").toLowerCase();
  if (["360","360p"].includes(v)) return "360";
  if (["720","720p"].includes(v)) return "720";
  return "best";
};

// return multiple provider links (no outbound calls, just constructed URLs)
const buildLinks = (url) => {
  const q360 = `https://api.vevioz.com/api/button/mp4/360?url=${encodeURIComponent(url)}`;
  const q720 = `https://api.vevioz.com/api/button/mp4/720?url=${encodeURIComponent(url)}`;
  const qBest = `https://api.vevioz.com/api/button/mp4?url=${encodeURIComponent(url)}`;
  const aBest = `https://api.vevioz.com/api/button/mp3?url=${encodeURIComponent(url)}`;

  // a couple of alternates (as fallback pages users can open if one is down)
  const alt = {
    video_best_alt: `https://p.oceansaver.in/api/button/mp4?url=${encodeURIComponent(url)}`,
    audio_alt:      `https://p.oceansaver.in/api/button/mp3?url=${encodeURIComponent(url)}`
  };

  return {
    audio: {
      best: aBest,
      alt: alt.audio_alt
    },
    video: {
      "360p": q360,
      "720p": q720,
      "best": qBest,
      alt: alt.video_best_alt
    }
  };
};

// --- routes
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "FAST YouTube API online",
    endpoints: ["/health", "/yt?url=<yt_url>&type=audio|video&quality=360|720|best"],
    tag: TAG
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), tag: TAG });
});

app.get("/yt", (req, res) => {
  const url = (req.query.url || "").trim();
  const type = String(req.query.type || "links").toLowerCase();
  const quality = normalizeQuality(req.query.quality);

  if (!url || !isYouTube(url)) {
    return res.status(400).json({ status:"error", message:"Invalid or missing YouTube URL", tag: TAG });
  }

  const links = buildLinks(url);

  if (type === "audio") {
    return res.json({
      status: "ok",
      input_url: url,
      audio: links.audio,
      tag: TAG
    });
  }

  if (type === "video") {
    return res.json({
      status: "ok",
      input_url: url,
      quality,
      video: {
        url: quality === "360" ? links.video["360p"]
             : quality === "720" ? links.video["720p"]
             : links.video["best"],
        all: links.video
      },
      tag: TAG
    });
  }

  // default: return everything
  res.json({
    status: "ok",
    input_url: url,
    audio: links.audio,
    video: links.video,
    tag: TAG
  });
});

// --- start
app.listen(PORT, () => {
  console.log(`FAST API listening on :${PORT}`);
});
