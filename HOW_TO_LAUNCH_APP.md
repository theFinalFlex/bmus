# 🚀 How to Launch the CertTracker App

## Quick Launch Instructions

### **Step 1: Open Two Terminal Windows**

**Terminal 1 - Backend (Mock Server):**
```bash
cd cert-skill-tree/selim/backend
npm run mock
```

**Terminal 2 - Frontend:**
```bash
cd cert-skill-tree/selim/frontend
npm run dev
```

### **Step 2: Access the Application**
1. Open your browser
2. Go to: **http://localhost:5173**
3. Login with: `admin@certtracker.com` / `admin123`

### **Step 3: Find the Notification System**
1. Click **Settings** in the navigation
2. Click the **"Advanced Notifications"** tab
3. Explore the new notification system!

## 🔧 Alternative Launch Method (If Frontend Won't Start)

### **Option A: Use VSCode Integrated Terminal**
1. Open VSCode
2. Open terminal (Ctrl + `)
3. Run the commands above

### **Option B: Use Command Prompt**
1. Open Command Prompt as Administrator
2. Navigate to the project folder
3. Run the commands above

### **Option C: Use PowerShell**
1. Open PowerShell as Administrator
2. Navigate to the project folder
3. Run the commands above

## 🚨 Troubleshooting

### **If Frontend Won't Start:**
The notification system is still fully functional! You can:

1. **Test the APIs directly:**
   ```bash
   curl http://localhost:3001/api/notifications/config
   curl http://localhost:3001/api/notifications/expiring-certifications
   ```

2. **View the source code:**
   - Frontend: `frontend/src/pages/Settings/NotificationSettings.tsx`
   - Backend: `backend/src/services/emailService.ts`

3. **Check the documentation:**
   - `NOTIFICATION_SYSTEM_IMPLEMENTATION.md`

### **If Backend Won't Start:**
Make sure you're in the right directory:
```bash
cd cert-skill-tree/selim/backend
ls  # Should see package.json
npm install  # If needed
npm run mock
```

## 🎯 What You Should See

### **Backend Running Successfully:**
```
🚀 Mock CertTracker API server running on port 3001
📊 Environment: development-mock
🌐 Health check: http://localhost:3001/health
🔐 Demo login: admin@certtracker.com / admin123
🎯 Bounty Board API endpoints available - Updated
📧 Notification API endpoints available
```

### **Frontend Running Successfully:**
```
  VITE v5.0.0  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

## 🌐 Direct URLs

- **Frontend App**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Notification Config**: http://localhost:3001/api/notifications/config

## 📱 Mobile Testing

The notification system is mobile-responsive! You can also test on mobile:
1. Find your computer's IP address
2. Use: http://[YOUR-IP]:5173
3. Login and test the notification settings

---

**🎉 Once launched, look for the "Advanced Notifications" tab in Settings - that's your new intelligent certification reminder system!**