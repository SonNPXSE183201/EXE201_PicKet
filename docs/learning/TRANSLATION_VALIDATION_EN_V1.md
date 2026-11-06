# English curriculum v1 — translation consistency record

<!-- project-status-link -->
> Đồng bộ tài liệu 01/11/2026: [Trạng thái hiện hành](../PROJECT_STATUS.md). Kết quả biên dịch/kiểm nguồn trong tài liệu này là checkpoint theo ngày của chính tài liệu.

Date: 2026-10-23. Status: **authored-not-independent-review**. This is an editorial translation of `PICKET_FINANCIAL_CURRICULUM_VI_V1.json`, not independent financial-content approval, an official translation of the references, or endorsement by their publishers.

## Output

- `PICKET_FINANCIAL_CURRICULUM_EN_V1.json`: machine-readable translation.
- `PICKET_FINANCIAL_CURRICULUM_EN_V1.md`: full reading/review artifact.
- `build_curriculum_en.py`: local reproducible generator and consistency assertions.

All 12 lesson bodies, 12 objectives, 12 worked-example descriptions, 36 scenario prompts, 108 answer choices, 108 individual explanations and 12 optional actions are translated. The original Vietnamese artifacts are read-only inputs. All amounts remain VND; changing the display language does not change currency or introduce US-specific entitlements.

## Checks completed

- 12 stable lesson IDs preserved exactly. The `.vi.` segment in the existing IDs is retained on purpose. Localization consumers must identify records by `(lessonId, locale, version)`.
- Six chapter IDs, competency IDs, lesson version and source URLs match the source.
- Each lesson contains three questions with three choices in their original order. Every `correctIndex` matches the source, is zero-based, and retains a separate explanation for each choice.
- The 30 original arithmetic expressions and expected results remain identical; all execute successfully in the local generator's constrained static check.
- Every numeric token in each English body matches the original body's sequence after normalizing Vietnamese thousands dots and English grouping commas. Two omitted repeated amounts were caught during audit, restored explicitly and rechecked.
- No template placeholders exist in the lesson text of either locale; none were introduced. Both JSON files parse successfully.
- `translationLocale=en-US`, `translationVersion=1`, `translationStatus=authored-not-independent-review` are explicit. Independent translation review dates remain null.
- Curriculum and lesson review status remains authored-not-independent-review. `publicationGate.publishable=false` remains in force.
- English body length is approximately 326–352 whitespace-delimited words, reflecting translation from Vietnamese rather than mechanically matching Vietnamese whitespace counts. Do not compare language-specific word counts as a readability equivalence claim.

## Editorial and publication limits

The translation retains distinctions between transfers and expenses, uncertain and received income, scheduled costs and emergencies, conditional scenarios and forecasts, total loan payments and annual-rate calculations, and internal Picket flags versus external cancellation. References to TILA remain explicitly US context and are not presented as Vietnamese law. A voluntary purchase pause is not a statutory cooling-off period.

No actual bank details, OTP, account data, API keys or provider calls were used. Examples remain fictional, optional actions require no spending and can be skipped.

Independent bilingual terminology review, independent financial/safety review, Vietnamese-context legal checks where relevant, learner comprehension/time testing and Android accessibility/offline verification remain necessary before published status. These checks should be evidence-based; this file does not assert they have happened.

## Editorial revision 2 — 27 October 2026

Added complete English counterparts for 12 fictional self-checks, 36 takeaways, 12 misconceptions and step-by-step solutions. There are now 60 aligned arithmetic checks, including the 30 original checks. Both app JSON files match their canonical documents. Existing lesson IDs, quiz versions and correct-answer ordering are unchanged. [Editorial evidence](CONTENT_PACK_EDITORIAL_20261027.md).
