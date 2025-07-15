import os
import py_vncorenlp

paths = [
    "/api/internal/services/pyvncorenlp",
    "/home/ubuntu/hung.nh2/vinnlp/Free-txt-vi/api/internal/services/pyvncorenlp",
    "services/pyvncorenlp"
]

for path in paths:
    print(f"Checking path: {path}")
    if os.path.exists(path):
        print(f"Path found: {path}")
        vncorenlp_model = py_vncorenlp.VnCoreNLP(save_dir=path)
        break
