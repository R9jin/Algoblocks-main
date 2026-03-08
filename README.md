# AlgoBlocks Developer Setup Guide

Welcome to the AlgoBlocks team! This project uses a decoupled architecture: a **React + Vite + Blockly** frontend and a **Python + FastAPI** backend, designed to be deployed on **Vercel**. 

It also utilizes **MongoDB** to handle user authentication, progress tracking, and cloud-saving for algorithmic workspaces.

Please follow these instructions **sequentially** to set up your local development environment.

---

## Phase 1: Install System Prerequisites

Before writing or running any code, ensure your computer has the core engines installed:

1. **Git**
   Download and install [Git](https://git-scm.com/downloads).

2. **Node.js (for the Frontend)**
   Download and install the [Node.js LTS version](https://nodejs.org/).
   This includes npm (Node Package Manager), required to install React, Vite, and Blockly.

3. **Python (for the Backend)**
   Download and install [Python 3.10 or newer](https://www.python.org/downloads/).

   ⚠️ **CRITICAL WINDOWS STEP:** During installation, **check the box "Add Python to PATH"** on the first screen.

4. **Code Editor**
   Recommended: [Visual Studio Code (VS Code)](https://code.visualstudio.com/).

5. **MongoDB (for the Database)**
   You will need a MongoDB connection string. You can create a free cloud database using [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

---

## Phase 2: Clone the Repository

Open your terminal (or VS Code terminal) and run:

```bash
# Clone the repository
git clone <YOUR_GITHUB_REPOSITORY_URL_HERE>

# Navigate into the project folder
cd algoblocks_prototype

```

---

## Phase 3: Frontend Setup (React & Blockly)

The frontend lives inside the `frontend/` folder and uses `package.json` to track dependencies like `@blockly/theme-dark`, `react-split`, and `Vite`.

1. Navigate to the frontend folder:

```bash
cd frontend

```

2. Install all Node.js dependencies:

```bash
npm install

```

---

## Phase 4: Backend & Database Setup (FastAPI + MongoDB)

The backend is in the `api/` folder (named `api` to comply with Vercel serverless architecture).
It uses a **Virtual Environment (venv)** to isolate Python packages.

1. Navigate to the `api` folder:

```bash
cd api

```

2. Create a virtual environment:

```bash
python -m venv venv

```

3. Activate the virtual environment:

* **Windows (Command Prompt):**
```bash
.\venv\Scripts\activate

```


* **Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1

```


* **Mac/Linux:**
```bash
source venv/bin/activate

```



*(Success indicator: `(venv)` appears at the beginning of your terminal prompt.)*

4. Install Python dependencies:

```bash
pip install -r requirements.txt

```

5. **Set up your Environment Variables (.env):**
To enable saving projects and user logins, you need to connect the backend to MongoDB.
* Copy the provided `.env.example` file and rename it to `.env` inside the `api/` folder.
* Open the `.env` file and replace the placeholder with your actual MongoDB connection string:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/algoblocks_db?retryWrites=true&w=majority

```




*(Note: If you leave this blank, the app will still run, but database features will be disabled).*

---

## Phase 5: Run the System Locally

You must run **both** the frontend and backend servers simultaneously.
Open **two terminal windows**:

### Terminal 1: Start the Frontend (Vite)

```bash
cd frontend
npm run dev

```

*This will start the React UI. A local URL (usually `http://localhost:5173`) will appear. Ctrl+Click to open.*

### Terminal 2: Start the Backend (FastAPI)

```bash
cd api

# Activate the venv first
.\venv\Scripts\activate

# Start the server
python -m uvicorn index:app --reload --port 8000

```

*The complexity analyzer runs on port 8000. The `--reload` flag restarts the server automatically on code changes.*

---

## 🛠️ Common Troubleshooting

1. **Time Complexity Table is blank or shows "Error"**
The Vite frontend proxies `/api` calls to `http://127.0.0.1:8000`.
✅ **Fix:** Ensure Terminal 2 (backend) is running without errors.
2. **"Database not connected" Error on Login/Save**
✅ **Fix:** Ensure you have created the `.env` file in the `api/` directory and that your `MONGODB_URI` is correct. Check the backend terminal for the message `"MongoDB connection integrated successfully."`
3. **"Execution of scripts is disabled on this system" (Windows PowerShell)**
⚠️ **Fix:** Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy Unrestricted -Force

```


Then reactivate your venv.
4. **"ModuleNotFoundError: No module named 'fastapi'"**
⚠️ **Fix:** Activate venv, install requirements, and restart server:
```bash
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn index:app --reload

```


5. **"Port 8000 is already in use"**
⚠️ **Fix:** Stop the running Python process in Task Manager or change the port:
```bash
python -m uvicorn index:app --reload --port 8001

```


Update `vite.config.js` accordingly if you change the port.

```

```
