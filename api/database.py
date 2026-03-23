# database.py
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    raise ValueError("No MONGODB_URI found in environment variables. Please check your .env file.")

client = MongoClient(MONGO_URI)
db = client.get_database("AlgoBlocksCluster")

# Define collections
projects_collection = db["projects"]
users_collection = db["users"]

print("Successfully connected to MongoDB.")