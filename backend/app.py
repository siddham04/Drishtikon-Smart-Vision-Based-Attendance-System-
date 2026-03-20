from flask import Flask, request, jsonify, send_file
import os
import json
import glob
import base64
import pickle
from datetime import datetime
from collections import Counter

import cv2
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BACKEND_DIR, 'Data')
ATTENDANCE_DIR = os.path.join(BACKEND_DIR, 'Attendance')
CASCADE_PATH = os.path.join(DATA_DIR, 'haarcascade_frontalface_default.xml')
GROUPS_PATH = os.path.join(DATA_DIR, 'groups.json')

os.makedirs(ATTENDANCE_DIR, exist_ok=True)


def load_groups():
    if os.path.isfile(GROUPS_PATH):
        with open(GROUPS_PATH, 'r') as f:
            return json.load(f)
    return {}


def save_groups(groups):
    with open(GROUPS_PATH, 'w') as f:
        json.dump(groups, f, indent=2)


def decode_frame(frame_b64):
    if ',' in frame_b64:
        frame_b64 = frame_b64.split(',')[1]
    img_bytes = base64.b64decode(frame_b64)
    nparr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def load_knn():
    faces_path = os.path.join(DATA_DIR, 'faces_data.pkl')
    labels_path = os.path.join(DATA_DIR, 'names.pkl')

    if not os.path.isfile(faces_path) or not os.path.isfile(labels_path):
        return None, "No registered faces found. Please register first."

    with open(faces_path, 'rb') as f:
        faces = pickle.load(f)
    with open(labels_path, 'rb') as f:
        labels = pickle.load(f)

    if faces.shape[0] != len(labels):
        return None, f"Data mismatch: {faces.shape[0]} faces vs {len(labels)} labels. Re-register."

    n = min(5, faces.shape[0])
    knn = KNeighborsClassifier(n_neighbors=n)
    knn.fit(faces, labels)
    return knn, None


def get_group_dir(group):
    group_dir = os.path.join(ATTENDANCE_DIR, group)
    os.makedirs(group_dir, exist_ok=True)
    return group_dir


def build_attendance_excel(group, date_str, present_labels, time_str):
    """Create/update an Excel file with all students of the group, marking Present/Absent."""
    groups = load_groups()
    students = groups.get(group, [])

    group_dir = get_group_dir(group)
    filepath = os.path.join(group_dir, f"{group}_{date_str}.xlsx")

    already_present = {}
    if os.path.isfile(filepath):
        wb = load_workbook(filepath)
        ws = wb.active
        for row in ws.iter_rows(min_row=2, values_only=False):
            label = row[2].value
            if row[3].value == "Present":
                already_present[label] = row[4].value
    else:
        wb = None

    present_set = set(already_present.keys())
    new_count = 0
    for label in present_labels:
        if label not in present_set:
            present_set.add(label)
            already_present[label] = time_str
            new_count += 1

    wb = Workbook()
    ws = wb.active
    ws.title = f"{group} - {date_str}"

    header_font = Font(bold=True, color="FFFFFF", size=12)
    header_fill = PatternFill(start_color="1a1a2e", end_color="1a1a2e", fill_type="solid")
    present_fill = PatternFill(start_color="d4edda", end_color="d4edda", fill_type="solid")
    absent_fill = PatternFill(start_color="f8d7da", end_color="f8d7da", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )

    headers = ["S.No", "Name", "UID", "Status", "Time"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
        cell.border = thin_border

    row_num = 2
    for i, student in enumerate(students, 1):
        label = f"{student['name']},{student['uid']}"
        is_present = label in present_set
        status = "Present" if is_present else "Absent"
        marked_time = already_present.get(label, "") if is_present else ""
        fill = present_fill if is_present else absent_fill

        values = [i, student['name'], student['uid'], status, marked_time]
        for col, val in enumerate(values, 1):
            cell = ws.cell(row=row_num, column=col, value=val)
            cell.fill = fill
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center')
        row_num += 1

    ws.column_dimensions['A'].width = 8
    ws.column_dimensions['B'].width = 25
    ws.column_dimensions['C'].width = 15
    ws.column_dimensions['D'].width = 12
    ws.column_dimensions['E'].width = 12

    present_count = len(present_set)
    total = len(students)
    ws.cell(row=row_num + 1, column=1, value="Summary:").font = Font(bold=True)
    ws.cell(row=row_num + 1, column=2, value=f"Present: {present_count}/{total}")
    ws.cell(row=row_num + 1, column=3, value=f"Absent: {total - present_count}/{total}")

    wb.save(filepath)
    return filepath, new_count, present_count, total


@app.route('/register-face', methods=['POST'])
def register_face():
    data = request.get_json()
    name = data.get('name')
    uid = data.get('uid')
    group = data.get('group')
    frames = data.get('frames', [])

    if not name or not uid:
        return jsonify({"error": "Name and UID are required"}), 400
    if not group:
        return jsonify({"error": "Group is required"}), 400
    if len(frames) < 5:
        return jsonify({"error": "At least 5 face frames are required"}), 400

    if not os.path.isfile(CASCADE_PATH):
        return jsonify({"error": "Haar cascade file not found on server"}), 500

    facedetect = cv2.CascadeClassifier(CASCADE_PATH)
    faces_data = []

    for frame_b64 in frames:
        try:
            img = decode_frame(frame_b64)
            if img is None:
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            detected = facedetect.detectMultiScale(gray, 1.3, 5)
            if len(detected) > 0:
                (x, y, w, h) = detected[0]
                crop = img[y:y+h, x:x+w]
                resized = cv2.resize(crop, (50, 50))
                faces_data.append(resized)
        except Exception as e:
            print(f"Frame processing error: {e}")
            continue

    if len(faces_data) < 5:
        return jsonify({"error": f"Only {len(faces_data)} faces detected. Need at least 5. Try better lighting."}), 400

    label = f"{name},{uid}"
    count = len(faces_data)
    faces_array = np.asarray(faces_data).reshape(count, -1)

    names_path = os.path.join(DATA_DIR, 'names.pkl')
    faces_path = os.path.join(DATA_DIR, 'faces_data.pkl')

    if os.path.isfile(names_path):
        with open(names_path, 'rb') as f:
            names = pickle.load(f)
        names = names + [label] * count
    else:
        names = [label] * count
    with open(names_path, 'wb') as f:
        pickle.dump(names, f)

    if os.path.isfile(faces_path):
        with open(faces_path, 'rb') as f:
            existing = pickle.load(f)
        faces_array = np.append(existing, faces_array, axis=0)
    with open(faces_path, 'wb') as f:
        pickle.dump(faces_array, f)

    groups = load_groups()
    if group not in groups:
        groups[group] = []
    student_entry = {"name": name, "uid": uid}
    if not any(s['uid'] == uid for s in groups[group]):
        groups[group].append(student_entry)
    save_groups(groups)

    return jsonify({
        "message": "Registration successful",
        "faces_captured": count,
        "name": name,
        "uid": uid,
        "group": group
    }), 200


@app.route('/take-attendance', methods=['POST'])
def take_attendance():
    data = request.get_json()
    group = data.get('group')
    frames = data.get('frames', [])

    if not group:
        return jsonify({"error": "Group is required"}), 400
    if len(frames) < 3:
        return jsonify({"error": "At least 3 frames are required"}), 400

    groups = load_groups()
    if group not in groups or len(groups[group]) == 0:
        return jsonify({"error": f"No students registered in {group}. Register students first."}), 400

    knn, err = load_knn()
    if knn is None:
        return jsonify({"error": err}), 400

    if not os.path.isfile(CASCADE_PATH):
        return jsonify({"error": "Haar cascade file not found"}), 500

    facedetect = cv2.CascadeClassifier(CASCADE_PATH)
    all_predictions = []

    for frame_b64 in frames:
        try:
            img = decode_frame(frame_b64)
            if img is None:
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            detected = facedetect.detectMultiScale(gray, 1.3, 5)
            for (x, y, w, h) in detected:
                crop = img[y:y+h, x:x+w]
                resized = cv2.resize(crop, (50, 50)).flatten().reshape(1, -1)
                prediction = knn.predict(resized)[0]
                all_predictions.append(prediction)
        except Exception as e:
            print(f"Recognition error: {e}")
            continue

    if not all_predictions:
        return jsonify({"error": "No faces recognized. Ensure someone registered is in front of the camera."}), 400

    counts = Counter(all_predictions)
    now = datetime.now()
    date_str = now.strftime("%d-%m-%Y")
    time_str = now.strftime("%H:%M:%S")

    present_labels = [label for label, _ in counts.most_common()]

    filepath, new_count, present_count, total = build_attendance_excel(
        group, date_str, present_labels, time_str
    )

    recognized = []
    for label, cnt in counts.most_common():
        name_part = label.split(',')[0] if ',' in label else label
        recognized.append({"name": name_part, "label": label, "count": cnt})

    return jsonify({
        "recognized": recognized,
        "new_entries": new_count,
        "already_marked": len(recognized) - new_count,
        "present": present_count,
        "total_students": total,
        "group": group,
        "date": date_str,
        "time": time_str,
        "file": os.path.basename(filepath)
    }), 200


@app.route('/view-attendance', methods=['GET'])
def view_attendance():
    group = request.args.get('group')
    date_param = request.args.get('date')

    if not group:
        return jsonify({"records": [], "dates": [], "message": "Select a group to view attendance"}), 200

    group_dir = os.path.join(ATTENDANCE_DIR, group)
    if not os.path.isdir(group_dir):
        return jsonify({"records": [], "dates": [], "group": group, "message": f"No attendance records for {group}"}), 200

    pattern = os.path.join(group_dir, f"{group}_*.xlsx")
    files = glob.glob(pattern)
    if not files:
        return jsonify({"records": [], "dates": [], "group": group, "message": f"No attendance records for {group}"}), 200

    files.sort(key=os.path.getmtime, reverse=True)

    available_dates = []
    for f in files:
        fn = os.path.basename(f)
        d = fn.replace(f"{group}_", "").replace(".xlsx", "")
        available_dates.append(d)

    target_date = date_param if date_param else available_dates[0]
    target_file = os.path.join(group_dir, f"{group}_{target_date}.xlsx")

    if not os.path.isfile(target_file):
        return jsonify({"records": [], "date": target_date, "dates": available_dates, "group": group, "message": "No attendance for this date"}), 200

    records = read_excel(target_file)

    return jsonify({"records": records, "date": target_date, "dates": available_dates, "group": group}), 200


@app.route('/download-attendance', methods=['GET'])
def download_attendance():
    group = request.args.get('group')
    date = request.args.get('date')
    if not group or not date:
        return jsonify({"error": "Group and date are required"}), 400

    filepath = os.path.join(ATTENDANCE_DIR, group, f"{group}_{date}.xlsx")
    if not os.path.isfile(filepath):
        return jsonify({"error": "File not found"}), 404

    return send_file(filepath, as_attachment=True, download_name=f"{group}_{date}.xlsx")


@app.route('/group-students', methods=['GET'])
def group_students():
    group = request.args.get('group')
    if not group:
        return jsonify({"students": []}), 200
    groups = load_groups()
    students = groups.get(group, [])
    return jsonify({"students": students, "group": group, "count": len(students)}), 200


def read_excel(filepath):
    wb = load_workbook(filepath, read_only=True)
    ws = wb.active
    records = []
    headers = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            headers = [str(h) for h in row]
            continue
        if row[0] is None or not str(row[0]).isdigit():
            break
        record = {}
        for j, header in enumerate(headers):
            record[header] = str(row[j]) if row[j] is not None else ""
        records.append(record)
    wb.close()
    return records


if __name__ == '__main__':
    app.run(debug=True)
