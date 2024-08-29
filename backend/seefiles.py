import pickle
# Specify the path to your .pkl file
file_path = "./Data/names.pkl"
# file_path='./Data/faces_data.pkl'
# Open the .pkl file in binary mode for reading
with open(file_path, "rb") as f:
    # Load the data from the .pkl file
    # f.write(b"")
    data = pickle.load(f)
# Now 'data' contains the Python object that was stored in the .pkl file
print(len(data))
print(data)