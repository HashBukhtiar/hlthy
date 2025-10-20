# AI Documentation

This folder contains documentation for the HLTHY AI Coach system.

## 📚 Available Guides

### Testing & Deployment

1. **[QUICK_TEST_REFERENCE.md](./QUICK_TEST_REFERENCE.md)** ⚡
   - **Start here!** Fast 3-step testing guide
   - 5 quick tests (30 seconds each)
   - Instant troubleshooting
   - Perfect for rapid verification

2. **[TESTING_CONVERSATIONAL_MEMORY_IN_APP.md](./TESTING_CONVERSATIONAL_MEMORY_IN_APP.md)** 📋
   - Comprehensive testing guide
   - 6 detailed test scenarios
   - Edge cases and validation
   - Monitoring and debugging
   - Expected results tables

3. **[pre_deployment_testing_summary.md](./pre_deployment_testing_summary.md)** ✅
   - Pre-deployment test results
   - 14 tests (all passing)
   - Code changes summary
   - Ready for deployment confirmation

### Architecture & Design

4. **[FOCUS_PLANNER_IMPLEMENTATION.md](../FOCUS_PLANNER_IMPLEMENTATION.md)** 🏗️
   - Focus Planner system design
   - Workout planning architecture

---

## 🚀 Quick Start Testing

Just deployed conversational memory? **Start here:**

1. Open [QUICK_TEST_REFERENCE.md](./QUICK_TEST_REFERENCE.md)
2. Follow the 3-step guide
3. Test: `"I hate burpees"`
4. Expect: Confirmation request

---

## 🎯 What Is Conversational Memory?

The conversational memory system allows the AI to:
- **Extract** user preferences naturally from conversation
- **Confirm** with the user before saving
- **Commit** to their profile for personalized planning

### Example Flow:
```
User: "I really hate burpees"
AI:   "Just to confirm, you don't like burpees. Is that right?"
User: "Yes"
AI:   "Got it! I've saved that preference."
[Future workouts avoid burpees]
```

---

## 📊 System Status

**Production Endpoint:**
```
https://hlthy-ai-service-s4rm2uw5oa-pd.a.run.app
```

**Health Check:**
```bash
Invoke-WebRequest -Uri https://hlthy-ai-service-s4rm2uw5oa-pd.a.run.app/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "systems": {
    "intelligent_system": true,
    "memory": true,
    "profiles": true
  }
}
```

---

## 🔧 Configuration

**API Endpoint:** `config/api.ts`
```typescript
export const API_BASE_URL = 'https://hlthy-ai-service-s4rm2uw5oa-pd.a.run.app';
```

**AI Chat Service:** `ai/ai_chat.ts`
- Handles all API communication
- Processes response types
- Manages conversation history

---

## 🧪 Test Coverage

### Unit Tests (6 tests)
- Extract single claim
- Extract multiple claims
- Different claim types
- Confidence thresholds
- Profile sync

### Orchestrator Integration Tests (5 tests)
- Empty context handling
- Single claim confirmation
- Multiple claims confirmation
- Different claim types (dislike, injury, equipment)
- Priority routing

### Full API Flow Tests (3 tests)
- End-to-end dislike flow
- End-to-end injury flow
- Normal conversation flow

**Total: 14 tests - All passing ✅**

---

## 🎓 Learn More

For detailed architecture and implementation details, see:
- `ai/core/ai_orchestrator.py` - Central AI brain
- `ai/utils/profile_sync.py` - Conversational memory extraction
- `ai/integration/intelligent_integration.py` - Integration layer
- `ai/tests/vertex_testing.py` - Main API endpoint

---

## 📞 Support

Having issues? Check:
1. [QUICK_TEST_REFERENCE.md](./QUICK_TEST_REFERENCE.md) - Quick troubleshooting
2. [TESTING_CONVERSATIONAL_MEMORY_IN_APP.md](./TESTING_CONVERSATIONAL_MEMORY_IN_APP.md) - Common issues section
3. Production logs: `gcloud logs read`
4. Health endpoint: `/api/health`

---

**Last Updated:** September 29, 2025  
**Status:** ✅ Deployed to Production
