INSERT INTO "TaskSubmissions" ("Id", "TaskItemId", "SubmittedByUserId", "WhatWasDone", "Links", "HoursSpent", "SubmissionNumber", "CreatedAt", "UpdatedAt", "IsDeleted") VALUES
(gen_random_uuid(), '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'База даних спроєктована, створені всі міграції.', '["https://github.com/myrepo"]', 4.5, 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', false),
(gen_random_uuid(), '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Токени генеруються, додано AuthGuard на фронтенд.', '["https://jwt.io"]', 6, 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', false),
(gen_random_uuid(), '44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Написав висновок, перевірте будь ласка.', '["https://docs.google.com/test"]', 2, 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', false)
ON CONFLICT DO NOTHING;
