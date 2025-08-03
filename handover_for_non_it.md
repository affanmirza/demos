# 🤖 Hospital FAQ Chatbot - Beginner's Setup Guide

## 📋 What is this project?

This is a **Hospital FAQ Chatbot** that helps answer common questions about RS Bhayangkara Brimob hospital. It can tell you about operating hours, BPJS insurance, online registration, emergency services, dental clinic, pediatric services, and registration fees. Think of it as a helpful assistant that knows everything about the hospital! 🏥

---

## 🎯 What you'll learn to do

By the end of this guide, you'll be able to:
- ✅ Download the project from GitHub
- ✅ Install Python on your Windows laptop
- ✅ Set up environment variables
- ✅ Train and run the Rasa chatbot
- ✅ Chat directly with Rasa for testing
- ✅ Connect to WhatsApp via 360dialog
- ✅ Know what to do when you make changes
- ✅ Handle common problems

---

## 📥 Step 1: Download the project

### What you need:
- A web browser (Chrome, Firefox, Edge, etc.)
- Your friend's GitHub link

### How to do it:
1. **Open your web browser** 🌐
2. **Go to the GitHub page** your friend gave you
3. **Look for a green button** that says "Code" (usually in the top-right)
4. **Click the green "Code" button** → a dropdown menu appears
5. **Click "Download ZIP"** from the dropdown
6. **Wait for the download** (it might take a minute)
7. **Find the downloaded file** (usually in your "Downloads" folder)
8. **Right-click the ZIP file** → "Extract All..."
9. **Choose where to extract** (like your Desktop or Documents folder)
10. **Click "Extract"** and wait for it to finish

**🎉 Congratulations!** You now have the project folder on your computer.

---

## 🐍 Step 2: Install Python

### What is Python?
Python is like the "engine" that makes the chatbot work. It's free and safe to install.

### How to install Python:
1. **Go to** [python.org](https://www.python.org/downloads/)
2. **Click the big yellow "Download Python" button**
3. **Find the downloaded file** (usually in Downloads folder)
4. **Double-click the installer** (it will be named something like "python-3.13.x-amd64.exe")
5. **IMPORTANT:** Check the box that says "Add Python to PATH" ✅
6. **Click "Install Now"**
7. **Wait for installation** (this might take a few minutes)
8. **Click "Close" when it's done**

**🎉 Great!** Python is now installed on your computer.

---

## 💻 Step 3: Open Command Prompt

### What is Command Prompt?
Think of it as a "text-based way" to talk to your computer. Don't worry - it's not scary!

### How to open it:
1. **Press the Windows key** (the key with the Windows logo)
2. **Type "cmd"** (just those 3 letters)
3. **Click on "Command Prompt"** when it appears
4. **A black window will open** - this is your Command Prompt!

**💡 Pro tip:** You can also press `Windows key + R`, type `cmd`, and press Enter.

---

## 📁 Step 4: Navigate to your project folder

### What we're doing:
We need to tell the computer where your project folder is located.

### How to do it:
1. **In the Command Prompt**, type: `cd Desktop` (if you put the folder on Desktop)
   - OR type: `cd Documents` (if you put it in Documents)
   - OR type: `cd Downloads` (if you put it in Downloads)
2. **Press Enter**
3. **Type:** `dir` (this shows you what folders are there)
4. **Find your project folder name** (it might be called "demos" or something similar)
5. **Type:** `cd` followed by your folder name
   - Example: `cd demos` or `cd demos-main`
6. **Press Enter**

**🎯 You should now see your folder name in the command line!**

---

## 📦 Step 5: Install required packages

### What are packages?
Think of packages as "tools" that the chatbot needs to work. We're going to install all of them at once!

### How to install them:
1. **In Command Prompt**, make sure you're in your project folder
2. **Type:** `pip install -r requirements_python313.txt`
3. **Press Enter**
4. **Wait for installation** (this might take 5-10 minutes - that's normal!)
5. **You'll see lots of text scrolling** - that's good!
6. **Wait until it stops** and you see your folder name again

**🎉 Perfect!** All the tools are now installed.

---

## 🚀 Step 6: Set up environment variables

### What are environment variables?
Think of them as "settings" that tell the chatbot how to work. Your friend will give you these values privately.

### How to set them up:
1. **In your project folder**, look for a file called `env.example`
2. **Right-click on it** → "Copy"
3. **Right-click in the same folder** → "Paste"
4. **Rename the copied file** to `.env` (just a dot, then "env")
5. **Right-click the `.env` file** → "Open with" → "Notepad"
6. **Your friend will send you the values** - replace the placeholder text with the real values
7. **Save the file** (Ctrl + S)

**💡 Example:** Change `DIALOG360_API_KEY=your_360dialog_api_key_here` to `DIALOG360_API_KEY=E51Heh_sandbox`

---

## 🤖 Step 7: Run the chatbot!

### Option A: Chat directly with Rasa (for testing)
1. **In Command Prompt**, make sure you're in your project folder
2. **Type:** `rasa train`
3. **Press Enter** and wait for training to complete
4. **Type:** `rasa shell`
5. **Press Enter** - you'll see a chat interface
6. **Type your questions** and press Enter to chat directly!

### Option B: Run the full chatbot with WhatsApp
1. **In Command Prompt**, make sure you're in your project folder
2. **Type:** `rasa train`
3. **Press Enter** and wait for training to complete
4. **Type:** `rasa run --enable-api`
5. **Press Enter** - this starts the Rasa server
6. **Open a NEW Command Prompt window** (keep the first one running)
7. **In the new window**, navigate to your project folder again
8. **Type:** `rasa run actions`
9. **Press Enter** - this starts the actions server
10. **Keep both windows open** - both need to keep running!

**🎉 Your chatbot servers are now running!**

---

## 🌐 Step 8: Connect to WhatsApp (Optional)

### What is ngrok?
ngrok is a tool that lets WhatsApp send messages to your computer. It's like a "bridge" between the internet and your laptop.

### How to set up ngrok:
1. **Download ngrok** from [ngrok.com](https://ngrok.com/download)
2. **Extract the ngrok.exe file** to your project folder
3. **Open a THIRD Command Prompt window**
4. **Navigate to your project folder** in this new window
5. **Type:** `ngrok http 8000`
6. **Press Enter** - you'll see a URL like `https://abc123.ngrok-free.app`
7. **Copy this URL** (you'll need it for the next step)

### How to connect to WhatsApp:
1. **In a FOURTH Command Prompt window**, navigate to your project folder
2. **Type this command** (replace the parts in brackets):
   ```
   curl --request POST --url https://waba-sandbox.360dialog.io/v1/configs/webhook --header "D360-API-KEY: E51Heh_sandbox" --header "Content-Type: application/json" --data "{\"url\": \"[YOUR_NGROK_URL]/webhook\"}"
   ```
3. **Replace `[YOUR_NGROK_URL]`** with the URL from ngrok (like `https://abc123.ngrok-free.app`)
4. **Press Enter**

**🎉 Your chatbot is now connected to WhatsApp!**

### How to test WhatsApp:
1. **Open WhatsApp** on your phone
2. **Find the 360dialog test number** your friend gave you
3. **Send a message** like "Jam buka rumah sakit?"
4. **The chatbot should respond!**

---

## 🔄 Step 9: What to do when you make changes

### When you change `.yml` or `.py` files:
If you or your friend changes any files that end in `.yml` or `.py`, you need to retrain and restart the chatbot:

1. **Stop all running servers** by pressing `Ctrl + C` in each Command Prompt window
2. **In the main Command Prompt**, type: `rasa train`
3. **Press Enter** and wait for training to complete
4. **Restart the servers:**
   - **Window 1:** `rasa run --enable-api`
   - **Window 2:** `rasa run actions`
   - **Window 3:** `ngrok http 8000` (if using WhatsApp)

**💡 Pro tip:** You'll know you need to retrain if you see error messages or if the chatbot doesn't respond properly.

---

## 🚨 Common problems and what to ignore

### ❌ Don't worry about these:
- **Red text that says "WARNING"** - these are just warnings, not errors
- **Text that says "Deprecated"** - this is normal
- **Messages about "pip" or "setuptools"** - these are just installation messages
- **Long lists of package names** during installation - this is normal
- **"Model not found" messages** during first run - this is normal

### ⚠️ Do worry about these:
- **"Error: No module named..."** - This means Python isn't installed properly
- **"Error: No such file or directory"** - This means you're not in the right folder
- **"Port already in use"** - This means the chatbot is already running somewhere else
- **"Missing env var"** - This means your `.env` file isn't set up properly

### 🔧 How to fix common problems:

**Problem:** "python is not recognized"
- **Solution:** Reinstall Python and make sure to check "Add Python to PATH"

**Problem:** "No such file or directory"
- **Solution:** Use `dir` to see what folders are there, then `cd` to the right folder

**Problem:** "Port already in use"
- **Solution:** Press `Ctrl + C` to stop the chatbot, then try `rasa run --enable-api` again

**Problem:** "Missing env var"
- **Solution:** Check your `.env` file and make sure all values are filled in

**Problem:** "Messages not sending to WhatsApp"
- **Solution:** Check your 360dialog API key in the `.env` file

---

## 🎯 Quick reference commands

Here are the commands you'll use most often:

| What you want to do | Type this command |
|-------------------|-------------------|
| See what folders are here | `dir` |
| Go into a folder | `cd folder_name` |
| Go back one folder | `cd ..` |
| Install packages | `pip install -r requirements_python313.txt` |
| Train the chatbot | `rasa train` |
| Chat directly with Rasa | `rasa shell` |
| Start Rasa server | `rasa run --enable-api` |
| Start actions server | `rasa run actions` |
| Start ngrok for WhatsApp | `ngrok http 8000` |
| Stop any server | `Ctrl + C` |

---

## 🆘 Need help?

### If something goes wrong:
1. **Don't panic!** 😊
2. **Take a screenshot** of any error messages
3. **Send the screenshot** to your friend
4. **Tell them exactly what you were doing** when the error happened

### Remember:
- **Everyone makes mistakes** - that's how we learn!
- **Your friend is there to help** - don't be afraid to ask questions
- **Take it one step at a time** - you don't need to understand everything at once

---

## 🎉 You did it!

**Congratulations!** 🎊 You've successfully:
- ✅ Downloaded the project
- ✅ Installed Python
- ✅ Set up environment variables
- ✅ Trained the Rasa chatbot
- ✅ Learned to chat directly with Rasa
- ✅ Connected to WhatsApp (optional)
- ✅ Learned how to handle changes

**You're now ready to help with the hospital chatbot project!** 🏥🤖

---

*This guide was made with ❤️ for non-technical friends who want to help with cool projects!* 