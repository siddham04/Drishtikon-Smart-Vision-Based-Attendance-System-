import cv2
import pickle
import numpy as np
import os
import glob
import csv
import time
from datetime import datetime
from sklearn.neighbors import KNeighborsClassifier
import pyttsx3
from collections import Counter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'Data')

def speak(text):
    """Function to speak text using pyttsx3."""
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()

video = cv2.VideoCapture(0)
if not video.isOpened():
    print("Error: Could not open video.")
    exit()

cascade_path = os.path.join(DATA_DIR, 'haarcascade_frontalface_default.xml')
if not os.path.isfile(cascade_path):
    raise FileNotFoundError(f"Haar cascade file not found at {cascade_path}")
facedetect = cv2.CascadeClassifier(cascade_path)

faces_path = os.path.join(DATA_DIR, 'faces_data.pkl')
labels_path = os.path.join(DATA_DIR, 'names.pkl')

if not os.path.isfile(faces_path) or not os.path.isfile(labels_path):
    print("Error: Face data or labels file not found. Please register a face first.")
    exit()

with open(faces_path, 'rb') as f:
    FACES = pickle.load(f)

with open(labels_path, 'rb') as w:
    LABELS = pickle.load(w)

if FACES.shape[0] != len(LABELS):
    print(f"Error: Data mismatch — {FACES.shape[0]} face samples but {len(LABELS)} labels.")
    print("Delete Data/faces_data.pkl and Data/names.pkl, then re-register all faces.")
    exit(1)

knn = KNeighborsClassifier(n_neighbors=5)
knn.fit(FACES, LABELS)

COL_NAMES = ['NAME', 'TIME']

capture_duration = 30
start_time = time.time()

while True:
    ret, frame = video.read()
    if not ret:
        continue

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = facedetect.detectMultiScale(gray, 1.3, 5)

    for (x, y, w, h) in faces:
        crop_img = frame[y:y+h, x:x+w]
        resized_img = cv2.resize(crop_img, (50, 50)).flatten().reshape(1, -1)

        output = knn.predict(resized_img)

        ts = time.time()
        date = datetime.fromtimestamp(ts).strftime("%d-%m-%Y")
        timestamp = datetime.fromtimestamp(ts).strftime("%H:%M:%S")

        attendance_file = os.path.join(BASE_DIR, f"Attendance_{date}.csv")
        exist = os.path.isfile(attendance_file)

        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 0, 255), 1)
        cv2.rectangle(frame, (x, y), (x+w, y+h), (50, 50, 255), 2)
        cv2.rectangle(frame, (x, y-40), (x+w, y), (50, 50, 255), -1)
        cv2.putText(frame, str(output[0]), (x, y-15), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 255, 255), 1)

        attendance = [str(output[0]), str(timestamp)]

        if cv2.waitKey(1) == ord('o'):
            speak("Attendance Taken..")
            time.sleep(5)
            with open(attendance_file, 'a', newline='') as csvfile:
                writer = csv.writer(csvfile)
                if not exist:
                    writer.writerow(COL_NAMES)
                writer.writerow(attendance)

    cv2.imshow("Frame", frame)

    if time.time() - start_time >= capture_duration:
        break
    if cv2.waitKey(1) == ord('q'):
        break

video.release()
cv2.destroyAllWindows()

def most_common_name(attendance_file):
    with open(attendance_file, 'r') as csvfile:
        reader = csv.reader(csvfile)
        next(reader)
        names = [row[0] for row in reader]
    if names:
        return Counter(names).most_common(1)[0][0]
    else:
        return None

attendance_pattern = os.path.join(BASE_DIR, "Attendance_*.csv")
attendance_files = glob.glob(attendance_pattern)
if attendance_files:
    latest_attendance_file = max(attendance_files, key=os.path.getctime)
    most_common = most_common_name(latest_attendance_file)
    print("Most common name:", most_common)

    most_common_file = os.path.join(BASE_DIR, "Most_Common_Name.csv")
    with open(most_common_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['MOST_COMMON_NAME'])
        writer.writerow([most_common])
        print("Most common name stored in:", most_common_file)
else:
    print("No attendance files found yet.")
