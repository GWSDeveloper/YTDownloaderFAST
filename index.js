import requests, json
from flask import Flask, request, jsonify

app = Flask(__name__)

API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
Tag = "Join @FAST_DevelopersOfficial, API by Shantanu ( FAST )"


@app.route("/get_links", methods=["GET"])
def get_links():
    video_id = request.args.get("id")
    if not video_id:
        return jsonify({"error": "Missing video id"}), 400

    url = f"https://www.youtube.com/youtubei/v1/player?key={API_KEY}"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "com.google.android.youtube/19.08.35 (Linux; U; Android 13)"
    }
    payload = {
        "context": {"client": {"clientName": "ANDROID", "clientVersion": "19.08.35"}},
        "videoId": video_id
    }

    res = requests.post(url, headers=headers, data=json.dumps(payload))
    data = res.json()

    if "streamingData" not in data:
        return jsonify({"error": "No streaming data"}), 500

    links = []
    for fmt in data["streamingData"].get("formats", []) + data["streamingData"].get("adaptiveFormats", []):
        links.append({
            "itag": fmt.get("itag"),
            "quality": fmt.get("qualityLabel"),
            "mimeType": fmt.get("mimeType"),
            "url": fmt.get("url")
        })

    return jsonify({"videoId": video_id, "links": links, "Tag":Tag})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6119)
