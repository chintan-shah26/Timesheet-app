Audit, fix, and verify npm package vulnerabilities across the entire project.

## Steps

1. **Audit** — run `npm audit` in both `backend/` and `frontend/` and report all vulnerabilities found (severity, package, description).

2. **Fix** — for each directory with vulnerabilities:
   - Run `npm audit fix` to auto-fix compatible issues
   - If critical/high vulnerabilities remain, run `npm audit fix --force` only after explaining what breaking changes it may introduce and getting confirmation
   - If a package needs a manual update (no auto-fix), explain what needs to be done and why

3. **Verify** — re-run `npm audit` in both directories and confirm the vulnerability count is reduced. Show a before/after summary.

Report format:
- List each vulnerability: severity | package | issue | fix applied
- Final summary: X vulnerabilities fixed, Y remaining (with reason if any remain)
