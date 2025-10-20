# 🚀 Quick Test Reference - Conversational Memory

## Start Testing in 3 Steps

### 1️⃣ Start Expo
```bash
cd C:\Users\nehad\hlthy
npx expo start
```

### 2️⃣ Open Chat in App
- Launch app on phone/simulator
- Navigate to chat/AI interface
- Make sure you're logged in (userId required)

### 3️⃣ Try These Quick Tests

| Say This | Expected Response |
|----------|-------------------|
| `"I hate burpees"` | ✅ "Just to confirm, you don't like burpees. Is that right?" |
| `"My shoulder hurts"` | ✅ "Just to confirm, you have a shoulder issue. Is that right?" |
| `"I have dumbbells"` | ✅ "Just to confirm, you have access to dumbbells. Is that correct?" |
| `"What's a good workout?"` | ❌ NO confirmation (normal response) |
| `"Hello"` | ❌ NO confirmation (normal greeting) |

---

## ✅ Success Indicators

**It's working if you see:**
- ✅ Confirmation request message
- ✅ Console log: `type: "confirmation_request"`
- ✅ After saying "yes", preference is saved
- ✅ No confirmations for normal questions

**It's NOT working if you see:**
- ❌ "What's your primary fitness goal?" (interview mode)
- ❌ Direct answer without confirmation
- ❌ Error messages in console

---

## 🐛 Quick Troubleshooting

### Problem: No confirmation request
**Check**: 
1. Is userId being passed? Check console logs
2. Is API endpoint correct? `config/api.ts`
3. Is service healthy? Test: `/api/health`

### Problem: "Interview mode" appears
**This was the bug we fixed!** 
- Redeploy if it happens
- Check logs for routing errors

### Problem: Confirmation doesn't save
**Check**:
1. Did user say "yes"?
2. Check network tab for API call
3. Check production logs for errors

---

## 📊 Quick Health Check

```bash
# Check service is running
Invoke-WebRequest -Uri https://hlthy-ai-service-s4rm2uw5oa-pd.a.run.app/api/health

# Should return: {"status":"healthy","systems":{"intelligent_system":true,"memory":true,"profiles":true}}
```

---

## 🎯 Core Test Scenarios (30 seconds each)

### Test 1: Single Dislike ⏱️ 30s
1. Say: `"I really hate burpees"`
2. Expect: Confirmation request
3. Reply: `"Yes"`
4. Expect: Saved confirmation

### Test 2: Injury ⏱️ 30s
1. Say: `"My shoulder has been bothering me"`
2. Expect: Confirmation request
3. Reply: `"Yes"`
4. Expect: Saved confirmation

### Test 3: Normal Question ⏱️ 30s
1. Say: `"What's a good leg workout?"`
2. Expect: Direct answer (NO confirmation)
3. Success: No confirmation triggered

---

## 📞 Full Testing Guide

See: `TESTING_CONVERSATIONAL_MEMORY_IN_APP.md` for:
- 6 detailed test scenarios
- Edge cases
- Monitoring & logging
- Troubleshooting guide

---

## 🎉 What We Fixed

**BEFORE** (the bug):
- You: "I hate burpees"
- AI: "What's your primary fitness goal?" ❌ (went to interview mode)

**NOW** (fixed):
- You: "I hate burpees"  
- AI: "Just to confirm, you don't like burpees. Is that right?" ✅
- You: "Yes"
- AI: "Got it! I've saved that preference." ✅

---

## 📱 Where to Find Chat in App

The chat interface should be accessible from:
- Main navigation/tabs
- AI Coach section
- Pulse/Activity section
- Or look for a chat/message icon

---

## 🔍 What to Look For in Console

Enable React Native debugger and look for:

```javascript
// Request sent to API
Sending message to AI backend: {
  userId: "abc123",
  message: "I hate burpees"
}

// Response from API
Raw API response: {
  response: "Just to confirm, you don't like burpees. Is that right?",
  type: "confirmation_request",
  responseType: "conversational_memory_confirmation"
}
```

The key is `type: "confirmation_request"` in the response!

---

## 🚀 Quick Verification Checklist

After each test, verify:

- [ ] Message sent successfully (check network tab)
- [ ] Response received (check console)
- [ ] Response type is correct (confirmation vs normal)
- [ ] UI displays the message properly
- [ ] After "yes", check database for saved preference
- [ ] Next workout respects the preference

---

## 💡 Testing Tips

1. **Start simple**: Test "I hate burpees" first
2. **Check logs**: Always check console for response type
3. **Test both paths**: Test confirmation AND normal questions
4. **Verify saves**: Check database after confirming
5. **Test rejection**: Say "No" to a confirmation

---

## 📈 Success Metrics

**100% working:**
- ✅ All 5 quick tests behave as expected
- ✅ Confirmations save to database
- ✅ No false positives (normal questions work)

**Partial working:**
- ⚠️ Some confirmations work, some don't
- ⚠️ Saves work but messages inconsistent

**Not working:**
- ❌ All messages go to interview mode
- ❌ No confirmations ever generated
- ❌ Errors in console

---

**Ready? Start Expo and let's test! 🏋️‍♂️**

Open your app, go to chat, and say: **"I hate burpees"**
