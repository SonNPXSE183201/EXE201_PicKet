-- Answer keys for curriculum lessons 13-30 (generated from
-- apps/mobile/src/features/learning/content/curriculum.vi.v1.json; the EN pack
-- shares lesson IDs and answer order). Keys stay unpublished: cloud grading of
-- a lesson starts only when its content record is published through the admin
-- review workflow, exactly like lessons 01-12.
insert into public.learning_answer_keys(lesson_id,content_version,correct_answers,choice_counts,published) values
('picket.vi.financial.v1.13',1,ARRAY[1,0,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.14',1,ARRAY[1,0,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.15',1,ARRAY[0,1,1],ARRAY[3,3,3],false),
('picket.vi.financial.v1.16',1,ARRAY[1,1,0],ARRAY[3,3,3],false),
('picket.vi.financial.v1.17',1,ARRAY[1,2,0],ARRAY[3,3,3],false),
('picket.vi.financial.v1.18',1,ARRAY[1,2,0],ARRAY[3,3,3],false),
('picket.vi.financial.v1.19',1,ARRAY[1,2,0],ARRAY[3,3,3],false),
('picket.vi.financial.v1.20',1,ARRAY[0,1,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.21',1,ARRAY[1,0,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.23',1,ARRAY[0,1,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.25',1,ARRAY[0,1,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.26',1,ARRAY[1,0,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.27',1,ARRAY[0,1,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.24',1,ARRAY[1,0,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.28',1,ARRAY[1,0,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.29',1,ARRAY[0,1,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.22',1,ARRAY[0,1,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.30',1,ARRAY[1,0,2],ARRAY[3,3,3],false)
on conflict(lesson_id,content_version) do nothing;
