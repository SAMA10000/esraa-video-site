from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1])
files=list(root.rglob("namaa_female_v12_corrected.mp3"))
reports=list(root.rglob("female_v12_report.json"))
assert len(files)==len(reports)==1,(files,reports)
mp3=files[0]
data=json.loads(reports[0].read_text(encoding="utf-8"))
assert mp3.stat().st_size>200000
assert 58<float(data["seconds"])<130
assert len(data["chunks"])>=13
print("VERIFIED_MP3",mp3,"bytes",mp3.stat().st_size,"seconds",data["seconds"],"sha256",hashlib.sha256(mp3.read_bytes()).hexdigest())
print("NEEDS_HUMAN_LISTENING; QC is a duration heuristic, not voice intelligibility check")
