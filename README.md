# Squadly

Веб-платформа для організації групових проєктів.

## Стек технологій

- **Backend:** ASP.NET Core 8 Web API (C#)
- **Frontend:** React 18 + TypeScript + Vite
- **Database:** PostgreSQL 16

## Архітектура

Backend побудований за принципами Clean Architecture:
- `Squadly.Domain` — бізнес-сутності
- `Squadly.Application` — сервіси та DTO
- `Squadly.Infrastructure` — робота з БД, JWT, файлами
- `Squadly.API` — контролери та middleware

## Автор

Пастухов Олександр Костянтинович, група ІПЗ-22-4