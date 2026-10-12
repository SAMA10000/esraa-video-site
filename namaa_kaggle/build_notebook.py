"""Build Kaggle script from previously tested V6 and female V12 notebooks."""
from pathlib import Path
import ast,json
root=Path(__file__).resolve().parents[1]
get=lambda name:json.loads((root/name).read_text(encoding="utf8"))
a=get("NAMAA_KAGGLE_TEST_V6_CLEAN_ENV.ipynb")
b=get("NAMAA_V12_FEMALE_SALVAGE.ipynb")
setup=a["cells"][1]["source"]
assert 'PHASE_6_INFERENCE' in setup and 'PHASE_5_PRECHECK_FRESH_PYTHON' in setup
setup=setup[:setup.index('script=Path("/kaggle/working/namaa_infer_v6.py")')]
setup=setup.replace("/kaggle/working/namaa_venv_v6","/kaggle/temp/namaa_venv_v6")
setup=setup.replace("/kaggle/working/namaa_hf_cache","/kaggle/temp/namaa_hf_cache")
setup=setup.replace('print("PHASE_1_BOOTSTRAP_VIRTUALENV"', 'Path("/kaggle/temp").mkdir(parents=True,exist_ok=True)\nprint("PHASE_1_BOOTSTRAP_VIRTUALENV"')
call=ast.parse(b["cells"][1]["source"]).body[0].value
assert isinstance(call,ast.Call) and call.func.id=="exec"
wrapper=ast.literal_eval(call.args[0])
calls=[n for n in ast.walk(ast.parse(wrapper)) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=="write_text"]
assert len(calls)==1
female=calls[0].args[0].value
assert "\nimport requests\nwith mp3.open" in female
female=female.split("\nimport requests\nwith mp3.open")[0]
assert "AUDIT_SECONDS" in female and "len(parts)>=13" in female
runner='''import os,subprocess
from pathlib import Path
py="/kaggle/temp/namaa_venv_v6/bin/python"
assert Path(py).is_file()
env=os.environ.copy()
env.pop("PYTHONPATH",None)
env.pop("PYTHONHOME",None)
env["PYTHONNOUSERSITE"]="1"
env["HF_HOME"]="/kaggle/temp/namaa_hf_cache"
job=Path("/kaggle/temp/namaa_female_v12.py")
job.write_text('''+repr(female)+''',encoding="utf8")
print("START_FEMALE_V12",flush=True)
subprocess.run([py,"-u",str(job)],check=True,env=env,timeout=1800)
print("FEMALE_OUTPUT_NEEDS_LISTENING_QA",flush=True)
'''
def cell(s):
    compile(s,"<cell>","exec")
    return {"cell_type":"code","metadata":{},"execution_count":None,"outputs":[],"source":s}
nb={"nbformat":4,"nbformat_minor":5,"metadata":{"kernelspec":{"name":"python3","language":"python","display_name":"Python 3"}},"cells":[{"cell_type":"markdown","metadata":{},"source":"NAMAA calm female narrator, free Kaggle GPU, human listening QA required"},cell(setup),cell(runner)]}
out=root/"namaa_kaggle"/"namaa_female_factory.ipynb"
out.write_text(json.dumps(nb,ensure_ascii=False,indent=2),encoding="utf8")
print("READY",out,len(nb["cells"]))
