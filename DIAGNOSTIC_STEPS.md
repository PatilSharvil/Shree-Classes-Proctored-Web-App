# Quick Diagnostic: Check What's Deployed

## 1. Check Backend Health & CORS

Open your browser console (F12) and run:

```javascript
// Test 1: Check if backend is reachable
fetch('https://shree-classes-proctored-web-app-2.onrender.com/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend Health:', d))
  .catch(e => console.error('❌ Backend unreachable:', e));

// Test 2: Check CORS headers on health endpoint
fetch('https://shree-classes-proctored-web-app-2.onrender.com/health')
  .then(r => {
    console.log('📋 Response Headers:');
    r.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));
  })
  .catch(e => console.error('❌ Request failed:', e));
```

**Expected Output:**
```
✅ Backend Health: {success: true, message: "Server is running", ...}
📋 Response Headers:
  access-control-allow-credentials: true
  access-control-allow-origin: https://shree-science-academy.vercel.app
  ...
```

**If you see:**
- ❌ No `access-control-allow-origin` header → **Old code deployed, wait for redeploy**
- ❌ Backend unreachable → **Backend crashed, check Render logs**
- ✅ Headers present → **CORS is working, issue is elsewhere**

---

## 2. Check Render Deployment Status

1. Go to: https://dashboard.render.com
2. Click your backend service
3. Look at the "Deployments" tab
4. Check the **latest commit SHA**

**Should see:** `a353169` or newer
**If you see older commit:** Deployment not complete, wait 2-3 minutes

---

## 3. Force Clear Browser Cache

Run this in browser console:

```javascript
// Clear everything
localStorage.clear();
sessionStorage.clear();

// Clear all cookies
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});

// Hard refresh
location.reload(true);
```

Then try logging in again.

---

## 4. Check ALLOWED_ORIGINS Environment Variable

The backend needs to know your frontend URL. Check on Render:

1. Go to Render Dashboard → Backend Service → Environment
2. Look for `ALLOWED_ORIGINS` variable
3. It should include: `https://shree-science-academy.vercel.app`

**If missing or wrong:**
- Add/Edit the variable
- Value: `https://shree-science-academy.vercel.app,http://localhost:5173`
- Save and trigger redeploy

---

## 5. Test Login with Verbose Logging

After clearing cache, try login and watch console for:

**Good signs:**
```
[CORS] Allowing origin: https://shree-science-academy.vercel.app
[API] Adding CSRF token to POST /auth/login
[API] CSRF token received from response headers
```

**Bad signs:**
```
Access to XMLHttpRequest blocked by CORS policy
[API] Error occurred: {status: undefined, ...}
```

---

## 6. Quick Backend Logs Check

Visit: https://dashboard.render.com → Backend → Logs

Search for:
- `[CORS] Allowed origins:` - Should show your frontend URL
- `[CORS] Allowing origin:` - Should see your frontend
- `[CORS] Blocking origin:` - If you see this, ALLOWED_ORIGINS is wrong

---

## If CORS Still Not Working

Try this workaround - add your frontend URL directly to backend:

1. On Render Dashboard → Backend → Environment
2. Add variable: `ALLOWED_ORIGINS`
3. Value: `https://shree-science-academy.vercel.app,http://localhost:5173,http://localhost:3000`
4. Save
5. Wait for redeploy (automatic)

---

## Summary Checklist

- [ ] Backend health check returns success
- [ ] Response headers include `access-control-allow-origin`
- [ ] Render shows latest commit deployed
- [ ] Browser cache cleared
- [ ] ALLOWED_ORIGINS includes your frontend URL
- [ ] Console shows `[CORS] Allowing origin: ...`

If ALL of these pass and login still fails, the issue is NOT CORS - it's something else (credentials, database, etc.)
