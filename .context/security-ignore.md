# Security Ignored Findings

Findings that have been reviewed and deliberately suppressed with justification.

---

## Ignored Issues

*No ignored issues yet*

<!-- Example format:
### [SEVERITY] Issue Title

- **Date Added:** YYYY-MM-DD
- **Justification:** Why this finding is not applicable or acceptable
- **File:** path/to/file:line (if applicable)
- **Category:** XSS / RLS / Exposure / etc.
- **Risk Assessment:** Why the risk is acceptable
- **Reviewed By:** [Your name/role]
- **Re-evaluate:** Date to reconsider this decision
-->

---

## Common Reasons for Ignoring

**Valid reasons to ignore:**
- ✅ False positive (auditor was incorrect)
- ✅ Not applicable (e.g., "missing header" on API-only service)
- ✅ Mitigated by other controls (e.g., rate limiting at CDN layer)
- ✅ Accepted business risk with documented reasoning
- ✅ Third-party service responsibility (not our code)

**Invalid reasons to ignore:**
- ❌ "Too hard to fix right now"
- ❌ "Probably won't be exploited"
- ❌ "We'll fix it later"
- ❌ "It's only a small risk"
- ❌ "Nobody will find it"

---

## Review Process

**Periodic Review:**
- Review this file quarterly
- Re-evaluate if circumstances have changed
- Consider if ignored issues should be addressed
- Update justifications if needed
- Remove entries that are no longer relevant

**Before Major Releases:**
- Review all ignored findings
- Verify justifications still apply
- Consider if any should be promoted to active work
- Update risk assessments

---

## Guidelines

**Critical Issues:**
Should **rarely** be ignored. Require:
- Strong technical justification
- Documented compensating controls
- Explicit risk acceptance
- Regular re-evaluation

**High Issues:**
Can be ignored with:
- Clear justification
- Documented risk assessment
- Alternative mitigation strategy

**Medium/Low Issues:**
Can be ignored more freely, but still require:
- Brief justification
- Understanding of potential impact

**Informational:**
Can be ignored, but consider:
- Is this a pattern that could become a problem?
- Should we track this for future reference?

---

## Usage

This file is automatically maintained by the `security-coordinator` agent when you run `/audit` and choose "Ignore" for a finding.

**When to use Ignore:**
- ✅ Auditor identified a false positive
- ✅ Finding is not applicable to your architecture
- ✅ Risk is mitigated by external controls
- ✅ Business decision to accept the risk

**When NOT to use Ignore:**
- ❌ You don't understand the vulnerability
- ❌ You plan to fix it "someday"
- ❌ It seems hard to address
- ❌ Critical vulnerabilities (use Debug Exception instead)

**Remember:** Ignored findings won't be shown in future audits. Make sure your justification is solid.
