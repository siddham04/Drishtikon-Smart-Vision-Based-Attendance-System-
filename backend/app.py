from flask import Flask, request, jsonify
import subprocess
import threading
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Existing script to run the attendance system
def run_script():
    try:
        result = subprocess.run(['python', 'test.py'], check=True, capture_output=True, text=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error occurred: {e.stderr}")

@app.route('/attend', methods=['GET'])
def attend():
    thread = threading.Thread(target=run_script)
    thread.start()
    return jsonify({"message": "Attempting to start attendance script..."})

# New endpoint to handle user registration
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    uid = data.get('uid')

    # Ensure 'Add_faces.py' script is called with the provided name and uid
    if name and uid:
        print("Received Name:", name)
        print("Received UID:", uid)

        # Start the thread to run the script for adding faces
        thread = threading.Thread(target=run_add_faces_script, args=(name, uid))
        thread.start()
        
        # Return success response
        return jsonify({"message": "Registration started", "name": name, "uid": uid}), 200
    else:
        # Return error response if name and UID are not provided
        return jsonify({"error": "Name and UID are required"}), 400

def run_add_faces_script(name, uid):
    try:
        result = subprocess.run(['python', 'Add_faces.py', f"{name},{uid}"], check=True, capture_output=True, text=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error occurred: {e.stderr}")

# New endpoint to capture patterns from the camera
@app.route('/capture-patterns', methods=['GET'])
def capture_patterns():
    return jsonify({"message": "Patterns captured successfully"}), 200

if __name__ == '__main__':
    app.run(debug=True)
