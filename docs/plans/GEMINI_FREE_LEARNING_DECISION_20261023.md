# Gemini free and learning content — implementation decision

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Date: 23 October 2026. User selected Gemini free for initial experiments and
requested source-backed financial lessons prepared as an application content file.

## Provider boundary

The user subsequently explicitly requested saving the supplied credential. It is
stored only in the Git-ignored local backend `apps/api/.env`, not in mobile,
source, fixtures or commits. Rotation before public deployment is recommended.
A model-list metadata request authenticated successfully (HTTP 200).

Google's [Gemini API terms](https://ai.google.dev/gemini-api/terms?hl=en)
state that unpaid API input/output may be used to improve products and may be
read by human reviewers. They instruct users not to submit sensitive, confidential
or personal information. Therefore initial free-tier integration is restricted
to synthetic, predefined educational scenarios and non-personal lesson material.
Transaction history, receipt photos/OCR, identifiers and personal free-text
answers are excluded. Consent does not remove this provider restriction.

The service's age/audience and available-region requirements also need a real
release check. Model availability and free quota must be verified for the new
backend credential before selecting a model; there is no verified model benchmark
or successful provider call at this checkpoint. Quota exhaustion must fall back
to local educational content, without starting paid requests automatically.

## Research started

These are research inputs, not a completed or independently reviewed curriculum.
Content will be original Vietnamese prose with contextual examples in VND;
US-specific legal, tax, product and statistical assumptions are not presented as
Vietnamese rules or expected outcomes.

- [CFPB needs and wants activity](https://www.consumerfinance.gov/consumer-tools/educator-tool/youth-financial-education/teach/activities/budgeting-needs-and-wants/): distinction depends on personal context; use cases with explanations instead of judging purchases by merchant alone.
- [CFPB emergency fund guide](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/): distinguish unexpected expenses from planned costs; goals vary with circumstances. Do not prescribe a universal target as mandatory.
- [CFPB financial glossary](https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/glossary/): terminology reference; write independent explanations rather than copy definitions wholesale.
- [CFPB comparing loan estimates](https://www.consumerfinance.gov/owning-a-home/compare/compare-loan-estimates/): evaluate interest and fees in total-cost examples. US mortgage disclosure requirements are out of scope for Vietnamese lessons.

## Required content artifact

Twelve lessons in six chapters from the master plan. Each needs a stable ID,
competency, language/version, objective, original lesson body, worked VND example,
two or three scenario questions, explanation for every option, optional local
practice, source references and review status. Quiz arithmetic must be checked
independently of model generation. No automatic publication of model output.

The user requested the assistant to research and author the material. This does
not constitute independent professional review or a completed real-user pilot;
those statuses must remain explicit in the content manifest and release report.

Staging configuration remains unspecified. No production financial data or
paid provider use is authorized by this decision.

## Live synthetic provider checkpoint

The adapter accepts only a predefined `cash-gap-v1` synthetic scenario and vi/en.
The provider selects enum identifiers for approved explanations; arbitrary model
prose is not published. Unknown scenarios/locales are rejected before networking.
HTTP errors, malformed output and transport failures become a local fallback
failure. No owner ID, financial history, receipt or user-written answer is sent.

- `gemini-2.5-flash-lite`: metadata listed the model, but generation returned 404.
- `gemini-3.1-flash-lite`: selected after checking its documented free standard
  tier; the short structured smoke did not return a validated result within the
  adapter call. No live generation success or content-quality benchmark claimed.
- No paid plan was enabled, no provider failover or production AI route exposed.
- Three adapter mock tests passed; these are not a substitute for 150-case eval.

References: [structured JSON output](https://ai.google.dev/gemini-api/docs/structured-output),
[free and paid pricing](https://ai.google.dev/gemini-api/docs/pricing). A model list
or successful authentication does not establish usable quota or content quality.
