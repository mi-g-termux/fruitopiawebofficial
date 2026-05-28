# Fruitopia — Complete Setup Guide
### From Zero to Running Store (No Experience Needed)

---

## What You'll Do

| Step | Task | Time |
|------|------|------|
| 1 | Install Node.js | ~5 min |
| 2 | Create a Firebase project | ~10 min |
| 3 | Connect Firebase to Fruitopia | ~5 min |
| 4 | Start the app | ~3 min |
| 5 | Complete the in-app wizard | ~5 min |

**Total: ~30 minutes**

---

## Phase 1 — Install Node.js

Node.js lets your computer run JavaScript outside of a browser. Fruitopia needs it to start.

### Step 1.1 — Download Node.js

Go to **https://nodejs.org/en/download** and click the big green **LTS** (Long-Term Support) button.

- Windows → download the `.msi` installer
- Mac → download the `.pkg` installer

> ⚠️ **Do not** download the "Current" version — always pick **LTS**. It's more stable.

### Step 1.2 — Run the installer

Open the downloaded file and click:

```
Next → Next → Install → Finish
```

Accept all the defaults. No need to change anything.

### Step 1.3 — Verify it installed

Open your terminal:
- **Windows:** press `Win + R`, type `cmd`, press Enter
- **Mac:** press `Cmd + Space`, type `Terminal`, press Enter

Type these two commands (press Enter after each):

```bash
node --version
npm --version
```

✅ You should see version numbers like `v20.x.x` and `10.x.x`. That means Node.js is ready.

> ⚠️ If you get "command not found" — close the terminal completely, open a new one, and try again. The installer sometimes needs a fresh terminal to take effect.

---

## Phase 2 — Create a Firebase Project

Firebase is Google's free database service. Fruitopia stores all orders, products, and settings there.

### Step 2.1 — Go to Firebase Console

Open your browser and go to:

```
https://console.firebase.google.com
```

Sign in with any Google account (Gmail). Firebase is **completely free** for small stores — no credit card needed.

### Step 2.2 — Create a new project

1. Click **Add Project**
2. Enter a project name like `my-fruitopia-store`
3. Click **Continue**
4. On the Google Analytics screen — you can turn it **off**
5. Click **Create Project**
6. Wait ~30 seconds, then click **Continue** when it says "Your project is ready"

### Step 2.3 — Create a Firestore Database

This is where all your store data lives.

1. In the left sidebar, click **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** → click **Next**
4. Pick a server location closest to you:
   - Bangladesh/South Asia → choose `asia-south1`
   - Europe → choose `europe-west1`
   - US → choose `us-central1`
5. Click **Enable**

> ⚠️ **Test mode** lets you get started quickly. The app's install wizard will set proper security rules automatically later.

### Step 2.4 — Get your Firebase config keys

These keys let Fruitopia connect to your database.

1. Click the **gear icon ⚙️** next to "Project Overview" in the top-left
2. Click **Project settings**
3. Scroll down to the **Your apps** section
4. Click the **`</>`** (web) icon
5. Give it a nickname like `fruitopia-web` → click **Register app**
6. You'll see a block of code like this — **keep this page open**, you'll need it in the next phase:

```js
// Your config will look like this (values will be different)
apiKey: "AIzaSy..."
authDomain: "mystore-xxxxx.firebaseapp.com"
projectId: "mystore-xxxxx"
storageBucket: "mystore-xxxxx.appspot.com"
messagingSenderId: "123456789"
appId: "1:123:web:abc..."
```

---

## Phase 3 — Set Up Fruitopia on Your Computer

### Step 3.1 — Extract the zip file

Take the `fruitopia-v6-fixed.zip` file you downloaded and extract it:

- **Windows:** Right-click → **Extract All** → choose a location like your Desktop → click Extract
- **Mac:** Double-click the zip file

You'll end up with a folder called `fruitopia` containing all the code files.

### Step 3.2 — Open the folder in your terminal

You need to navigate the terminal into the fruitopia folder.

**Windows (Command Prompt):**
```bash
cd Desktop\fruitopia
```

**Mac (Terminal):**
```bash
cd ~/Desktop/fruitopia
```

> 💡 **Tip (Windows):** Type `cd ` (with a space) then drag the fruitopia folder into the terminal window — it'll auto-fill the full path for you!

To confirm you're in the right place, type:
```bash
dir
```
(Windows) or:
```bash
ls
```
(Mac) — you should see files like `package.json`, `server.ts`, `src/`, etc.

### Step 3.3 — Install all the packages

This downloads everything Fruitopia needs to run. It may take 1–3 minutes.

```bash
npm install
```

You'll see lots of text scrolling — that's normal. Wait for it to stop and show a new prompt line.

> ⚠️ `npm warn` messages are fine. Only `npm error` (in red) is a problem. If you see errors, copy them and ask for help.

### Step 3.4 — Create the Firebase config file

Inside the `fruitopia` folder, create a new file called:

```
firebase-config.json
```

Open it with Notepad (Windows) or TextEdit (Mac) and paste the following — **replacing every value with YOUR keys from the Firebase console**:

```json
{
  "apiKey": "YOUR_API_KEY_HERE",
  "authDomain": "YOUR_PROJECT.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT.appspot.com",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID"
}
```

Save the file.

> ⚠️ **Windows Notepad users:** When saving, set "Save as type" to **All Files** and name the file `firebase-config.json` — otherwise Notepad will save it as `firebase-config.json.txt` which won't work.

---

## Phase 4 — Start the App

### Step 4.1 — Run the development server

In your terminal (still inside the fruitopia folder), type:

```bash
npm run dev
```

✅ You'll see something like:

```
➜  Local:   http://localhost:3000
```

That means the app is running on your computer.

### Step 4.2 — Open it in your browser

Open Chrome (or any browser) and go to:

```
http://localhost:3000
```

The **install wizard** will appear automatically.

---

## Phase 5 — Complete the In-App Install Wizard

This part runs entirely inside your browser — no more terminal commands needed.

### Step 5.1 — Follow the wizard steps

The wizard will guide you through:

1. Confirming your Firebase connection (it auto-detects your `firebase-config.json`)
2. Entering your store name, currency, and basic info
3. Setting your admin username and password
4. Clicking **Complete Installation** — this writes everything to Firebase

### Step 5.2 — Access the admin panel

Once installed, go to the admin panel by typing this in the browser address bar:

```
http://localhost:3000/#admin
```

> ⚠️ There is **no button** linking to the admin panel on the storefront — by design, only you know this URL. Keep it private.

Inside the admin panel, go to **Site Settings** to toggle the **Order Tracker** on or off for your customers.

---

## You're All Set! ✅

Your store is now running locally on your computer.

| Action | Command |
|--------|---------|
| Start the app | `npm run dev` (from the fruitopia folder) |
| Stop the app | Press `Ctrl + C` in the terminal |
| Admin panel | `http://localhost:3000/#admin` |
| Customer storefront | `http://localhost:3000` |

---

## Common Issues & Fixes

**"command not found: node"**
→ Close the terminal completely, open a new one, and try again.

**"ENOENT: no such file or directory"**
→ You're not in the fruitopia folder. Run `cd Desktop\fruitopia` (Windows) or `cd ~/Desktop/fruitopia` (Mac) first.

**App opens but shows "Firebase not configured"**
→ Check that your `firebase-config.json` is inside the `fruitopia` folder (not inside `src/`) and that the values match exactly what's shown in your Firebase console.

**Page won't load at localhost:3000**
→ Make sure `npm run dev` is still running in the terminal. If you closed it, run it again.

---

## Want to Put It Online?

Right now the store only runs on your computer. To make it accessible to customers on the internet, you can deploy it to **Render** or **Railway** — both are free to start and take about 10 minutes. Just ask and I'll walk you through it.

---

*Guide version: Fruitopia v6 | Firebase + React + Vite + Express*
