# Changelog

All notable changes to the PDF extraction system will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- RIGOR_PROTOCOL.md - Systematic framework for prompt engineering, validation, and schema design
- EXTRACTION_ROBUSTNESS_ANALYSIS.md - Comprehensive blind spot analysis (13 issues identified)
- CHANGELOG.md - Version tracking and change documentation
- Supporting learning database structure (PATTERNS_THAT_WORK.md, PATTERNS_TO_AVOID.md)

### Changed
- None yet

### Fixed
- None yet

### Why
- Establish systematic rigor and learning protocols before Phase 1 fixes
- Document baseline state and known issues
- Enable compound learning across 10 parallel sessions

### Expected Impact
- Higher quality prompt revisions (with verification)
- Faster blind spot detection (systematic checklists)
- Compounding improvements across iterations

### Breaking Changes
- None

---

## [1.0.0] - 2025-11-17 (Baseline)

### Initial Release
Complete PDF extraction pipeline with:
- 19 specialized agents
- 500+ schema fields
- Vision-based 2-round sectionization
- Multi-layer validation (lenient mode)
- Currency normalization (Swedish formats)
- Ground truth consensus mode (3-model)
- Graceful degradation and error recovery

### Known Issues
See EXTRACTION_ROBUSTNESS_ANALYSIS.md for 13 identified blind spots:
- Critical: Currency normalization ambiguity, section detection failures, JSON truncation data loss
- Medium: Missing cross-field validation, agent routing issues, evidence validation gaps
- Low: Edge cases in parsing, encoding, consistency checks
