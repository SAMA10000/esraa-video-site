# Philosophy Cat — Mansa Musa animated vertical video

When upstream NAMAA Kaggle Female Voice Factory completes successfully, GitHub Actions downloads that run's exact MP3 and segment manifest, renders portrait MP4, checks runtime and audio sync, and attaches the MP4 and visual previews. It never posts to social media.

This first-pass vector motion-graphics renderer uses Python, Pillow, numpy, FFmpeg, and Arabic fonts on GitHub-hosted Linux. It does not use TinyFish, Project79 VPS, Motion Canvas, paid GPU, or an external image API.

Storyboard: one main visual per voice segment with a secondary animated visual beat; trade, gold, Mali, caravan, Cairo, scholarship, financial uncertainty, legacy. A consistent animated cat storyteller responds to audio loudness. Arabic RTL text overlays are timed to measured per-segment durations.

This is a review draft, NOT a claim of professional rigging or publisher approval. The audio may have pronunciation failures that duration checks do not catch. Nothing is auto-published.

Inputs: namaa_female_v12_corrected.mp3 and female_v12_report.json from the upstream GitHub Actions run.
Outputs: PHILOSOPHY_CAT_MANSA_MUSA.mp4, VIDEO_QA_REPORT.json and preview images.

For isolated local tests:
pip install -r video_pipeline/requirements.txt
python video_pipeline/render_philosophy_video.py --audio voice.mp3 --manifest female_v12_report.json --output output/video.mp4 --preview
python video_pipeline/render_philosophy_video.py --audio voice.mp3 --manifest female_v12_report.json --output output/video.mp4
