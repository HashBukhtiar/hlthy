# Testing Conversational Memory in the HLTHY App

## 🎯 Overview
Your conversational memory system is now deployed to production at:
**https://hlthy-ai-service-s4rm2uw5oa-pd.a.run.app**

The app is already configured to use this endpoint (see `config/api.ts`).

## ✅ Prerequisites Checklist
- [x] Production AI service deployed and healthy ✅
- [x] API endpoint configured in app (`config/api.ts`)
- [x] User authentication working (userId passed in requests)
- [ ] Expo app running (`npx expo start`)
- [ ] Test user account ready

## 🧪 Test Scenarios

### **Scenario 1: Extract→Confirm→Commit for Exercise Dislikes**

#### Test 1A: Single Dislike
1. **Open the chat interface** in the app
2. **Type exactly**: `"I really hate burpees"`
3. **Expected Response**: 
   ```
   Just to confirm, you don't like burpees. Is that right?
   ```
4. **Response Type**: `confirmation_request`
5. **Reply**: `"Yes"` or `"Yes, that's correct"`
6. **Expected**: Confirmation that preference was saved

#### Test 1B: Multiple Dislikes
1. **Type**: `"I hate burpees and can't stand overhead squats"`
2. **Expected Response**:
   ```
   Just to confirm: you don't like burpees and overhead squats. Is that all correct?
   ```
3. **Reply**: `"Yes"`
4. **Expected**: Both preferences saved to profile

#### Test 1C: Reject Confirmation
1. **Type**: `"I don't like deadlifts"`
2. **Expected**: Confirmation request
3. **Reply**: `"No, actually I love deadlifts"`
4. **Expected**: 
   - Acknowledgment that it won't be saved
   - Asks for clarification
   - Does NOT save the preference

---

### **Scenario 2: Extract→Confirm→Commit for Injuries**

#### Test 2A: Current Injury
1. **Type**: `"My shoulder has been bothering me lately"`
2. **Expected Response**:
   ```
   Just to confirm, you have a shoulder issue. Is that right?
   ```
3. **Response Type**: `confirmation_request`
4. **Reply**: `"Yes"`
5. **Expected**: Injury saved with HIGH confidence

#### Test 2B: Specific Injury Details
1. **Type**: `"I have a torn rotator cuff in my left shoulder"`
2. **Expected**: Confirmation with specific details
3. **Reply**: `"Yes, correct"`
4. **Expected**: Detailed injury saved to profile

#### Test 2C: Past Injury (Should NOT Trigger)
1. **Type**: `"I had a knee injury last year but it's fine now"`
2. **Expected**: 
   - NO confirmation request (past tense = LOW confidence)
   - Normal conversational response
   - NOT saved to profile

---

### **Scenario 3: Extract→Confirm→Commit for Equipment**

#### Test 3A: Available Equipment
1. **Type**: `"I have dumbbells and a pull-up bar at home"`
2. **Expected Response**:
   ```
   Just to confirm, you have access to dumbbells and pull-up bar. Is that correct?
   ```
3. **Reply**: `"Yes"`
4. **Expected**: Equipment saved to profile

#### Test 3B: No Equipment
1. **Type**: `"I don't have any equipment, just bodyweight"`
2. **Expected**: Confirmation that you prefer bodyweight exercises
3. **Reply**: `"Yes"`
4. **Expected**: Equipment preference saved

---

### **Scenario 4: Extract→Confirm→Commit for Preferences**

#### Test 4A: Time Preference
1. **Type**: `"I prefer morning workouts"`
2. **Expected**: Confirmation request
3. **Reply**: `"Yes"`
4. **Expected**: Preference saved

#### Test 4B: Focus Preference
1. **Type**: `"I want to focus on hypertrophy"`
2. **Expected**: Confirmation request
3. **Reply**: `"Yes"`
4. **Expected**: Training focus saved

---

### **Scenario 5: Normal Conversation (No Extraction)**

#### Test 5A: General Question
1. **Type**: `"What's a good workout for legs?"`
2. **Expected**: 
   - NO confirmation request
   - Direct workout recommendation
   - Normal router flow

#### Test 5B: Greeting
1. **Type**: `"Hey, how are you?"`
2. **Expected**:
   - NO confirmation request
   - Friendly greeting response
   - Asks how they can help

---

### **Scenario 6: Multiple Claims in One Message**

#### Test 6A: Mixed Claims
1. **Type**: `"I hate burpees, my knee hurts, and I only have dumbbells"`
2. **Expected Response**:
   ```
   Just to confirm:
   - You don't like burpees
   - You have a knee issue
   - You have access to dumbbells
   
   Is that all correct?
   ```
3. **Reply**: `"Yes"`
4. **Expected**: All three claims saved (dislike + injury + equipment)

---

## 🔍 What to Check

### **1. Response Format**
Check the console logs in the app for response structure:
```typescript
{
  text: "Just to confirm...",
  type: "confirmation_request",  // ← Key indicator
  responseType: "conversational_memory_confirmation"
}
```

### **2. Confidence Levels**
The system only asks for confirmation when confidence is **MEDIUM or HIGH**:
- **HIGH** (≥0.8): Strong, clear statements
- **MEDIUM** (≥0.5): Somewhat clear statements
- **LOW** (<0.5): Vague/unclear - NOT confirmed, just extracted

### **3. Profile Updates**
After confirming, check that the user's profile is updated:
- View the user's profile in your database
- Verify the claim was added with correct type, value, and confidence
- Check `needs_confirmation: false` after commit

---

## 🐛 Common Issues & Solutions

### Issue 1: "Health check failed"
**Solution**: Verify the API endpoint is working:
```bash
Invoke-WebRequest -Uri https://hlthy-ai-service-s4rm2uw5oa-pd.a.run.app/api/health
```

### Issue 2: No confirmation request generated
**Possible Causes**:
- Message too vague (confidence < 0.5)
- Past tense used (e.g., "I had" vs "I have")
- userId not passed in request
**Solution**: Check console logs for extraction results

### Issue 3: Confirmation request but not saved
**Possible Causes**:
- User didn't confirm with "yes" variant
- Network error during commit
**Solution**: Check logs for commit_conversational_memory call

### Issue 4: "Interview mode" response instead of confirmation
**This is the bug we just fixed!** Should no longer happen.
**If it does**: Check that the production deployment is live

---

## 📱 How to Test in the App

### **Option 1: Run in Expo Go (Recommended)**

1. **Start Expo**:
   ```bash
   cd C:\Users\nehad\hlthy
   npx expo start
   ```

2. **Scan QR code** with Expo Go app on your phone

3. **Navigate to Chat/Pulse** screen in the app

4. **Start testing** with the scenarios above

### **Option 2: Run in iOS/Android Simulator**

1. **Start Expo with platform flag**:
   ```bash
   npx expo start --ios
   # or
   npx expo start --android
   ```

2. **Navigate to chat interface**

3. **Test the scenarios**

### **Option 3: Debug Console Logging**

Enable verbose logging in `ai/ai_chat.ts` to see:
- Request payload sent to API
- Response received from API
- Response type and structure

Look for these console logs:
```
Sending message to AI backend: { userId: "...", message: "I hate burpees" }
Raw API response: { response: "Just to confirm...", type: "confirmation_request" }
```

---

## ✅ Success Criteria

### **You'll know it's working when:**

1. ✅ **Extraction Works**: Console shows extracted claims in response
2. ✅ **Confirmation Triggered**: User sees confirmation request message
3. ✅ **Response Type Correct**: `type: "confirmation_request"`
4. ✅ **Commit Works**: After "yes", preference is saved to profile
5. ✅ **Future Workouts Respect It**: Next workout plan avoids disliked exercises
6. ✅ **No False Positives**: Normal questions don't trigger confirmations

---

## 📊 Monitoring & Logs

### **Check Production Logs**:
```bash
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=hlthy-ai-service" --limit=50 --format="table(timestamp,textPayload)"
```

### **Check for Errors**:
```bash
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=hlthy-ai-service AND severity>=ERROR" --limit=20
```

### **View Specific User's Interactions**:
Search logs for: `user_id: <userId>`

---

## 🎯 Expected Test Results Summary

| Test Scenario | Input | Expected Response Type | Expected Message Starts With |
|---------------|-------|------------------------|------------------------------|
| Single Dislike | "I hate burpees" | `confirmation_request` | "Just to confirm, you don't like burpees" |
| Multiple Dislikes | "I hate burpees and squats" | `confirmation_request` | "Just to confirm: you don't like" |
| Injury | "My shoulder hurts" | `confirmation_request` | "Just to confirm, you have a shoulder issue" |
| Equipment | "I have dumbbells" | `confirmation_request` | "Just to confirm, you have access to dumbbells" |
| Preference | "I prefer morning workouts" | `confirmation_request` | "Just to confirm" |
| General Question | "What's a good workout?" | `text` or `clarify_focus` | Normal response (NO confirmation) |
| Greeting | "Hello" | `text` | Greeting response (NO confirmation) |

---

## 🚀 Next Steps After Testing

1. **Document any issues** you find
2. **Check edge cases** (typos, slang, etc.)
3. **Verify profile updates** in Firestore
4. **Test "No" responses** to confirmations
5. **Test conversation flow** after commitments
6. **Monitor production metrics** for first few days

---

## 💡 Pro Tips

- **Use exact phrases** from test scenarios first to verify baseline
- **Check console logs** in React Native debugger
- **Test with multiple users** to verify profile isolation
- **Try edge cases** after core scenarios work
- **Document any unexpected behavior** for iteration

---

## 📞 Need Help?

If you encounter issues:
1. Check the health endpoint: `/api/health`
2. Review console logs in the app
3. Check production logs with gcloud
4. Verify userId is being passed correctly
5. Test the API directly with curl/Postman

---

**Happy Testing! 🎉**

The conversational memory system is designed to make the AI feel more personal and remember user preferences naturally. This is a big step toward building a truly intelligent fitness coach!
