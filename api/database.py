import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from a .env file (for local development)
load_dotenv()

# Get the MongoDB URI. If not found, fallback to an empty string
MONGO_URI = os.getenv("MONGODB_URI", "")

# Define variables globally so index.py can always import them
client = None
db = None
users_collection = None
projects_collection = None

# Initialize the MongoDB client. 
# We use tls=True and tlsAllowInvalidCertificates=True to prevent SSL errors on Vercel
try:
    if MONGO_URI:
        client = MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True)
        # Select the database (it creates it automatically if it doesn't exist)
        db = client["algoblocks_db"]
        
        # Example collection references
        users_collection = db["users"]
        projects_collection = db["projects"]
        
        print("MongoDB connection integrated successfully.")
    else:
        print("No MONGODB_URI found. Database integration skipped.")
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")