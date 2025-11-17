# Meta-Analysis Directory

**Purpose**: Aggregate findings across all experiment sessions to identify cross-cutting patterns

---

## Files to Maintain

### cross_session_patterns.md
- Patterns that emerge across multiple sessions
- Common failure modes
- Consistently high-performing configurations
- Correlations between variables (e.g., "longer prompts → higher confidence")

### winning_configurations.md
- Best prompts per agent (after N sessions)
- Best validation rules (after N sessions)
- Best schema designs (after N sessions)
- Promotion history (what was promoted when and why)

### failure_modes_catalog.md
- Comprehensive list of all failure modes discovered
- Frequency of each failure mode
- Root causes
- Mitigation strategies

### next_hypotheses.md
- Queue of hypotheses to test based on learnings
- Prioritization (high impact, low effort first)
- Experimental design notes

### metrics_over_time.md
- Track key metrics across sessions
- Visualize improvement trajectory
- Detect regressions

---

## Aggregation Schedule

After every 2-3 sessions:
1. Update cross_session_patterns.md
2. Update failure_modes_catalog.md

After every 5 sessions:
3. Update winning_configurations.md
4. Review and promote best configs to production

After every 10 sessions:
5. Comprehensive meta-analysis
6. Update RIGOR_PROTOCOL.md with new learnings
7. Design next batch of experiments

---

## Analysis Checklist

When aggregating:
- ☐ Did any pattern emerge in 3+ sessions? → Add to cross_session_patterns.md
- ☐ Did any config consistently outperform? → Add to winning_configurations.md
- ☐ Did any failure mode repeat 2+ times? → Add to failure_modes_catalog.md
- ☐ Did we learn something unexpected? → Design follow-up experiment
- ☐ Are there contradictory findings? → Design tie-breaker experiment
- ☐ Is improvement plateauing? → Try orthogonal approaches
