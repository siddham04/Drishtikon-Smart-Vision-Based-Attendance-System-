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

def speak(text):
    """Function to speak text using pyttsx3."""
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()

# Open a video capture object using the default camera (0)
video = cv2.VideoCapture(0)  # Adjust camera index if needed
if not video.isOpened():
    print("Error: Could not open video.")
    exit()

# Load the Haar Cascade Classifier for face detection
cascade_path = os.path.expanduser('~/Desktop/Flask-react/backend/Data/haarcascade_frontalface_default.xml')
if not os.path.isfile(cascade_path):
    raise FileNotFoundError(f"Haar cascade file not found at {cascade_path}")
facedetect = cv2.CascadeClassifier(cascade_path)

# Load pre-trained face recognition data from pickle files
faces_path = os.path.expanduser('~/Desktop/Flask-react/backend/Data/faces_data.pkl')
labels_path = os.path.expanduser('~/Desktop/Flask-react/backend/Data/names.pkl')

if not os.path.isfile(faces_path) or not os.path.isfile(labels_path):
    print("Error: Face data or labels file not found.")
    exit()

with open(faces_path, 'rb') as f:
    FACES = pickle.load(f)

with open(labels_path, 'rb') as w:
    LABELS = pickle.load(w)

# Check if the loaded data has the expected shape
# if FACES.shape[0] == 0 or LABELS.shape[0] == 0:
#     print("Error: Empty face data or labels.")
#     exit()

# Initialize and train a K-Nearest Neighbors classifier
knn = KNeighborsClassifier(n_neighbors=5)
knn.fit(FACES, LABELS)

# Define column names for the attendance CSV file
COL_NAMES = ['NAME', 'TIME']

# Set the duration for capturing video (in seconds)
capture_duration = 30  # Change this value as needed
start_time = time.time()

# Start an infinite loop for real-time face recognition
while True:
    # Capture a frame from the video
    ret, frame = video.read()
    if not ret:
        continue

    # Convert the frame to grayscale for face detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = facedetect.detectMultiScale(gray, 1.3, 5)

    for (x, y, w, h) in faces:
        crop_img = frame[y:y+h, x:x+w]
        resized_img = cv2.resize(crop_img, (50, 50)).flatten().reshape(1, -1)

        # Predict the identity of the face using the trained KNN classifier
        output = knn.predict(resized_img)

        ts = time.time()
        date = datetime.fromtimestamp(ts).strftime("%d-%m-%Y")
        timestamp = datetime.fromtimestamp(ts).strftime("%H:%M:%S")

        attendance_file = os.path.expanduser(f"~/Desktop/Flask-react/backend/Attendance_{date}.csv")
        exist = os.path.isfile(attendance_file)

        # Draw rectangles and text on the frame for visualization
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

    # Display the current frame with annotations
    cv2.imshow("Frame", frame)

    if time.time() - start_time >= capture_duration:
        break
    if cv2.waitKey(1) == ord('q'):
        break

# Release the video capture object and close all windows
video.release()
cv2.destroyAllWindows()

# Function to find the most common name in the attendance file
def most_common_name(attendance_file):
    with open(attendance_file, 'r') as csvfile:
        reader = csv.reader(csvfile)
        next(reader)  # Skip header
        names = [row[0] for row in reader]
    if names:
        return Counter(names).most_common(1)[0][0]
    else:
        return None

# Get the path to the latest attendance file
latest_attendance_file = max(glob.glob(os.path.expanduser("~/Desktop/Flask-react/backend/Attendance_*.csv")), key=os.path.getctime)

# Find the most common name in the attendance file
most_common = most_common_name(latest_attendance_file)
print("Most common name:", most_common)

# Store the most common name in a separate CSV file
most_common_file = os.path.expanduser("~/Desktop/Flask-react/backend/Most_Common_Name.csv")
with open(most_common_file, 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['MOST_COMMON_NAME'])
    writer.writerow([most_common])
    print("Most common name stored in:", most_common_file)
