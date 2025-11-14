---
name: implement
description: Implement a complete feature spanning frontend and backend with proper architecture, type safety, and security. Uses consultation-first pattern to get expert recommendations before planning.
slash_command: /implement
---

Implement a feature with full-stack coordination and production-quality standards.

Launch the **full-stack-integrator** agent to:
1. Understand the feature requirements
2. Consult frontend-dev and backend-dev specialists in parallel
3. Critically evaluate their recommendations
4. Synthesize a unified architectural plan with:
   - Explicit TypeScript interfaces
   - API contracts
   - Security requirements
   - Error handling
   - Performance considerations
5. Get your approval on the plan
6. Delegate implementation to appropriate specialists
7. Verify type safety and integration correctness

**Usage:**
```
/implement "add commenting system to posts"
/implement "implement user profile editing with avatar upload"
/implement "add password reset flow with email verification"
```

**The integrator is:**
- ✅ **Architectural Authority** - Makes hard decisions, doesn't just coordinate
- ✅ **Production Quality Gatekeeper** - Enforces security and scalability standards
- ✅ **Type Safety Enforcer** - Ensures frontend and backend types match exactly
- ✅ **Critical Evaluator** - Challenges weak proposals from specialists

**Consultation-First Pattern:**
The integrator asks specialists for recommendations BEFORE planning, then synthesizes their expertise into cohesive solutions. This ensures domain knowledge is applied from the start.

**Expected Duration:** Varies by feature complexity (30 minutes to 3 hours)

**Note:** For frontend-only or backend-only work, you can invoke those agents directly instead of using /implement.
