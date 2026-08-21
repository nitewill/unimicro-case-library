from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen
import re
import shutil


ORIGIN = "https://unimicro-case-library.yunislin.chatgpt.site"
OUTPUT = Path("_site")


def download(reference: str) -> bool:
    relative = reference.lstrip("/")
    target = OUTPUT / (relative or "index.html")
    target.parent.mkdir(parents=True, exist_ok=True)
    url = ORIGIN + (reference if reference.startswith("/") else "/" + reference)
    request = Request(
        quote(url, safe=":/%?&=+-._"),
        headers={"User-Agent": "Cloudflare-Pages-Sync"},
    )
    try:
        with urlopen(request, timeout=90) as response:
            target.write_bytes(response.read())
    except HTTPError as error:
        if error.code == 404:
            print(f"Skipping unavailable generated reference: {reference}")
            return False
        raise
    return True


shutil.rmtree(OUTPUT, ignore_errors=True)
OUTPUT.mkdir(parents=True)
download("/")

downloaded = {"/"}
reference_pattern = re.compile(r"/(?:assets|fonts)/[^\"'()\s<>]+")
for _ in range(4):
    references = set()
    for source in OUTPUT.rglob("*"):
        if source.suffix not in {".html", ".css", ".js"}:
            continue
        references.update(
            reference_pattern.findall(source.read_text("utf-8", errors="ignore"))
        )
    pending = sorted(reference for reference in references if reference not in downloaded)
    if not pending:
        break
    for reference in pending:
        download(reference)
        downloaded.add(reference)

# The application generates these result-image URLs at runtime, so they must be
# included explicitly even though they do not appear as literal bundle strings.
full_figures = {
    "254": ["02", "03", "04"],
    "253": ["02", "03", "04", "05"],
    "250": ["02", "03", "04"],
    "247": ["02", "03", "04"],
    "245": ["03", "05", "06", "07", "08", "09", "10", "11", "12"],
    "244": ["04", "05", "06", "07", "08", "09", "10", "11", "12", "13"],
    "243": ["04", "05", "06"],
    "242": ["04", "05", "06", "07"],
    "241": ["03", "05", "06", "07"],
    "240": ["04", "05", "06"],
    "239": ["04", "05", "06", "07", "08", "09"],
    "238": ["01", "02", "03", "04"],
    "236": ["02", "03", "04", "05", "06", "07"],
    "157": ["01", "02", "03"],
    "156": ["01", "02", "03"],
    "155": ["01", "02", "03"],
    "154": ["02", "03", "04", "05", "06", "07", "08"],
    "153": ["02", "03", "04", "05"],
    "152": ["01", "02", "03", "04", "05", "06", "07"],
    "151": ["01", "02"],
}
for case_id, figure_numbers in full_figures.items():
    for figure_number in figure_numbers:
        download(f"/assets/cases/full/{case_id}-{figure_number}.jpg")

shutil.copyfile(OUTPUT / "index.html", OUTPUT / "404.html")
(OUTPUT / ".nojekyll").touch()

