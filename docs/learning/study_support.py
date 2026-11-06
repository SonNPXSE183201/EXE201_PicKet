"""Local, authored study support shared by the VI/EN curriculum builders."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HEADINGS = {
    'vi': ('Ghi nhớ', 'Hiểu lầm thường gặp', 'Tự kiểm tra — tình huống hư cấu', 'Gợi ý giải từng bước', 'Kết luận'),
    'en': ('Remember', 'Common misconception', 'Self-check — fictional scenario', 'Step-by-step reasoning', 'Conclusion'),
}


def apply_study_support(lessons, locale, append_checks=True, extra_entries=()):
    """Attach study support to every lesson.

    study_support.v1.json holds the original 12 entries; ``extra_entries``
    (same shape) come from curriculum_v2_extension.py so new lessons keep their
    VI/EN support next to the lesson text.
    """
    data = json.loads((ROOT / 'study_support.v1.json').read_text(encoding='utf-8'))
    entries = {entry['lessonId']: entry for entry in data['lessons']}
    assert len(entries) == 12
    for entry in extra_entries:
        assert entry['lessonId'] not in entries, entry['lessonId']
        entries[entry['lessonId']] = entry
    assert len(entries) == len(lessons)
    assert set(entries) == {lesson['lessonId'] for lesson in lessons}
    labels = HEADINGS[locale]
    for lesson in lessons:
        entry = entries[lesson['lessonId']]
        support = copy.deepcopy(entry[locale])
        assert support['synthetic'] is True
        assert len(support['keyTakeaways']) == 3 and len(support['solutionSteps']) >= 3
        texts = [*support['keyTakeaways'], *support['solutionSteps'],
                 support['misconception'], support['practicePrompt'], support['answer']]
        assert all(isinstance(text, str) and len(text.strip()) > 15 for text in texts)
        lesson['studySupport'] = support
        sections = [labels[0], *['• ' + point for point in support['keyTakeaways']],
                    '', labels[1], support['misconception'], '', labels[2], support['practicePrompt'],
                    '', labels[3], *[f'{i}. {step}' for i, step in enumerate(support['solutionSteps'], 1)],
                    '', labels[4], support['answer']]
        lesson['workedExample']['description'] += '\n\n' + '\n'.join(sections)
        if append_checks:
            lesson['workedExample']['arithmeticChecks'].extend(copy.deepcopy(entry['arithmeticChecks']))


def editorial_metadata(course):
    course.update(editorialRevision=3, supplementAuthoredAt='2026-10-27',
                  supplementReviewType='author-source-and-arithmetic-check-not-independent-review',
                  extensionAuthoredAt='2026-11-05',
                  extensionReviewType='author-self-review-checklist-v2-not-independent',
                  extensionChecklist='docs/learning/REVIEW_CHECKLIST_V2_20261105.md')


def markdown_example(description, locale):
    for heading in HEADINGS[locale]:
        description = description.replace('\n\n' + heading + '\n', '\n\n#### ' + heading + '\n\n')
    return description.replace('\n• ', '\n- ')


def write_app_copy(course, locale):
    destination = ROOT.parent.parent / 'apps/mobile/src/features/learning/content' / f'curriculum.{locale}.v1.json'
    destination.write_text(json.dumps(course, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
