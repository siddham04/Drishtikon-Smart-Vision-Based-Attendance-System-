"""
One-time script: Parse the seating plan PDF and generate groups.json
with all students organized by group.
"""
import json, os, re, fitz

PDF_PATH = os.path.join(
    os.environ.get("USERPROFILE", ""),
    r"AppData\Roaming\Cursor\User\workspaceStorage"
    r"\0284379c1b10b54794d67edb2e97755e\pdfs"
    r"\fa1b89d0-13ae-4d8a-a6d2-98bb3b17f63d"
    r"\Seating Plan of 2nd June, 2025.pdf",
)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Data")
GROUPS_PATH = os.path.join(DATA_DIR, "groups.json")

ROLL_RE = re.compile(r"^2[12]\d{8}$")
GROUP_RE = re.compile(r"^(G\d{1,2}|AI|ECE|HP)$")
SNO_RE = re.compile(r"^\d{1,3}$")

SKIP_WORDS = {
    "DEPARTMENT", "Subject:", "S.No.", "SEATING", "Invigilator",
    "Roll", "Name", "Group", "Classroom", "Signature:",
}


def should_skip(line):
    for w in SKIP_WORDS:
        if w in line:
            return True
    if line.startswith("TG-") or line.startswith("-- "):
        return True
    return False


def main():
    doc = fitz.open(PDF_PATH)
    all_lines = []
    for page in doc:
        text = page.get_text()
        for line in text.splitlines():
            stripped = line.strip()
            if stripped:
                all_lines.append(stripped)
    doc.close()

    groups = {}
    seen = set()
    i = 0
    while i < len(all_lines):
        line = all_lines[i]

        if should_skip(line):
            i += 1
            continue

        # Pattern: S.No (number), then Roll No, then Name, then Group
        if SNO_RE.match(line):
            # Look ahead for roll, name, group
            if i + 3 < len(all_lines):
                roll_line = all_lines[i + 1].strip()
                name_line = all_lines[i + 2].strip()
                group_line = all_lines[i + 3].strip()

                if ROLL_RE.match(roll_line) and GROUP_RE.match(group_line):
                    roll = roll_line
                    name = re.sub(r"\s+", " ", name_line).strip()
                    group = group_line

                    if roll not in seen:
                        seen.add(roll)
                        if group not in groups:
                            groups[group] = []
                        groups[group].append({"name": name, "uid": roll})

                    i += 4
                    continue

        i += 1

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(GROUPS_PATH, "w") as f:
        json.dump(groups, f, indent=2)

    total = sum(len(v) for v in groups.values())
    print(f"Parsed {total} students across {len(groups)} groups")
    for g in sorted(groups.keys()):
        print(f"  {g}: {len(groups[g])} students")


if __name__ == "__main__":
    main()
