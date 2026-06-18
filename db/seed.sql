-- Очищення таблиць перед вставкою (якщо потрібно почати з чистого аркуша)
-- ВАЖЛИВО: Виконуйте цей скрипт обережно, він додає демонстраційні дані.
-- Пароль для всіх користувачів: 123456

-- 1. Створення користувачів
INSERT INTO "Users" ("Id", "FirstName", "LastName", "Email", "PasswordHash", "GlobalRole", "CreatedAt", "UpdatedAt", "IsDeleted") VALUES
('11111111-1111-1111-1111-111111111111', 'Олександр', 'Пастухов', 'admin@squadly.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Admin', NOW(), NOW(), false),
('22222222-2222-2222-2222-222222222222', 'Анна', 'Мельник', 'anna@squadly.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Organizer', NOW(), NOW(), false),
('33333333-3333-3333-3333-333333333333', 'Дмитро', 'Шевченко', 'dmitro@squadly.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'User', NOW(), NOW(), false),
('44444444-4444-4444-4444-444444444444', 'Олена', 'Коваленко', 'olena@squadly.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'User', NOW(), NOW(), false)
ON CONFLICT ("Email") DO NOTHING;

-- 2. Створення проєктів
INSERT INTO "Projects" ("Id", "Title", "Description", "Status", "Category", "Priority", "Color", "Goal", "CreatedByUserId", "CreatedAt", "UpdatedAt", "Tags", "IsDeleted") VALUES
('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Розробка веб-платформи Squadly', 'Головний проєкт для курсової роботи', 'Active', 'Web', 'High', 'indigo', 'Створити систему для організації студентських проєктів', '22222222-2222-2222-2222-222222222222', NOW(), NOW(), '["web", "react", "csharp"]', false),
('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Мобільний додаток HealthTracker', 'Застосунок для відстеження активності', 'Active', 'Mobile', 'Medium', 'emerald', 'Допомогти користувачам слідкувати за здоров''ям', '22222222-2222-2222-2222-222222222222', NOW(), NOW(), '["mobile", "health"]', false)
ON CONFLICT ("Id") DO NOTHING;

-- 3. Додавання учасників до проєктів
INSERT INTO "ProjectMemberships" ("Id", "ProjectId", "UserId", "Role", "CreatedAt", "UpdatedAt", "JoinedAt", "IsDeleted") VALUES
(gen_random_uuid(), 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Organizer', NOW(), NOW(), NOW(), false),
(gen_random_uuid(), 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Mentor', NOW(), NOW(), NOW(), false),
(gen_random_uuid(), 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Participant', NOW(), NOW(), NOW(), false),
(gen_random_uuid(), 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Participant', NOW(), NOW(), NOW(), false)
ON CONFLICT DO NOTHING;

-- 4. Створення завдань
DELETE FROM "TaskItem" WHERE "ProjectId" = 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

INSERT INTO "TaskItem" ("Id", "ProjectId", "Title", "Description", "Status", "Priority", "AssigneeUserId", "DueDate", "CreatedAt", "UpdatedAt", "PointsAwarded", "IsDeleted") VALUES
('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Спроєктувати базу даних', 'Створити ER-діаграму та налаштувати EF', 'Done', 'High', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 days', true, false),
('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Розробити API для автентифікації', 'Реалізувати JWT токени', 'InReview', 'High', '44444444-4444-4444-4444-444444444444', NOW() + INTERVAL '1 day', NOW() - INTERVAL '3 days', NOW(), false, false),
('33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Зверстати сторінку Дашборда', 'Використати React та TailwindCSS', 'InProgress', 'Medium', '33333333-3333-3333-3333-333333333333', NOW() + INTERVAL '3 days', NOW() - INTERVAL '1 days', NOW(), false, false),
('44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Написати висновки до курсової', 'Додати описи до розділу 3', 'NeedsRevision', 'Low', '33333333-3333-3333-3333-333333333333', NOW() + INTERVAL '1 day', NOW() - INTERVAL '4 days', NOW(), false, false)
ON CONFLICT DO NOTHING;

-- 5. Додавання здачі роботи (TaskSubmission)
INSERT INTO "TaskSubmissions" ("Id", "TaskItemId", "SubmittedByUserId", "WhatWasDone", "Links", "HoursSpent", "CreatedAt", "UpdatedAt", "IsDeleted") VALUES
(gen_random_uuid(), '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'База даних спроєктована, створені всі міграції.', '["https://github.com/myrepo"]', 4.5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', false),
(gen_random_uuid(), '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Токени генеруються, додано AuthGuard на фронтенд.', '["https://jwt.io"]', 6, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', false),
(gen_random_uuid(), '44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Написав висновок, перевірте будь ласка.', '["https://docs.google.com/test"]', 2, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', false)
ON CONFLICT DO NOTHING;

-- 6. Додаємо коментарі (від ментора до виконавця)
-- Оновлюємо задачу NeedsRevision щоб був коментар ментора
UPDATE "TaskItem" SET "ReviewComment" = 'Дуже мало тексту, розшир будь ласка розділ 3.2 і додай скріншоти.' WHERE "Id" = '44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Звичайні коментарі в чаті задачі
INSERT INTO "Comment" ("Id", "TaskItemId", "AuthorUserId", "Content", "CreatedAt", "UpdatedAt", "IsDeleted") VALUES
(gen_random_uuid(), '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Не забудь зробити адаптивну верстку для мобільних!', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours', false),
(gen_random_uuid(), '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Так, звісно, використовую Tailwind.', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', false)
ON CONFLICT DO NOTHING;

-- 7. Рейтинг (Бали)
INSERT INTO "Ratings" ("Id", "UserId", "Points", "Reason", "CreatedAt", "UpdatedAt", "IsDeleted") VALUES
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 20, 'Завдання "Спроєктувати базу даних" виконано', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', false),
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 1, 'Залишено коментар', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', false)
ON CONFLICT DO NOTHING;
