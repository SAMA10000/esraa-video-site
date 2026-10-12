# NAMAA factory: Kaggle GPU through GitHub Actions, without TinyFish

The pipeline uses the official Kaggle CLI to push, poll and download a private Kaggle notebook. It combines the already-tested V6 environment with the experimental V12 female/calm voice generator. The old male output and temporary public upload were removed. The model runs on Kaggle's free T4 GPU only if quota/internet are available. There is no Project 79 VPS dependency.

The voice is NOT automatically published. The QC only checks duration/obviously truncated clips: it cannot establish natural pronunciation. A human must listen before accepting a voice.

One-time setup: on Kaggle Settings > API generate an API token and place it in GitHub repo Actions secret named KAGGLE_API_TOKEN. Alternative: store KAGGLE_USERNAME and KAGGLE_KEY. Never paste tokens here or commit them. Google browser login doesn't authorize the CLI.

After adding the secret, go to GitHub Actions > NAMAA Kaggle Female Voice Factory > Run workflow > choose RUN. Download the audio from the completed run's Artifacts. If quota, permission or code fails, the workflow reports failure, not fake success. No auto schedule until verified.

The repository is public, so artifact access follows repo visibility. Use only test/non-sensitive audio.

Official documentation: https://github.com/Kaggle/kaggle-cli/blob/main/docs/kernels.md and https://github.com/Kaggle/kaggle-cli/blob/main/docs/README.md
