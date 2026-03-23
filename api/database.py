import os
from dotenv import load_dotenv
from pymongo import MongoClient
# Import any other necessary modules here

# Load environment variables from the .env file
load_dotenv()

# Get the MongoDB URI from the environment variable
MONGO_URI = os.getenv("MONGODB_URI")

# Check if the URI was successfully loaded
if not MONGO_URI:
    raise ValueError("No MONGODB_URI found in environment variables. Please check your .env file.")

# Connect to MongoDB
try:
    # Initialize the client (adjust the arguments as needed for your setup)
    client = MongoClient(MONGO_URI)

    # Access your specific database (replace 'AlgoBlocksCluster' if your DB name is different)
    db = client.get_database("AlgoBlocksCluster") 

    print("Successfully connected to MongoDB.")

except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

# You can now export `client` or `db` to use in other parts of your app
# For example: 
# def get_db():
#     return db