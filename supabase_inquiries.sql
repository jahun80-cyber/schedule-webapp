-- 문의함: 매장에서 올린 문의/건의와 그에 대한 답변을 담는 표
--
-- [실행 방법]
--   Supabase 대시보드 -> 왼쪽 메뉴 SQL Editor -> New query -> 아래 내용 전체 붙여넣기 -> Run
--   (한 번만 실행하면 됩니다. 이미 만들어져 있어도 오류 없이 그냥 넘어갑니다.)

create table if not exists inquiries (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  store_id    text,        -- 문의를 올린 매장
  store_name  text,        -- 그 시점의 매장 이름 (매장명이 바뀌어도 로그가 남도록 같이 저장)
  role        text not null,   -- 올린 사람의 권한 (admin/manager/viewer)
  category    text,            -- 문의 종류 (사용법 / 오류 / 건의 / 기타)
  body        text not null,   -- 문의 내용 (자유 형식)
  status      text not null default 'open',  -- open(미답변) / answered(답변완료) / closed(종료)
  answer      text,            -- 답변 내용
  answered_at timestamptz
);

create index if not exists inquiries_created_idx on inquiries (created_at desc);
create index if not exists inquiries_store_idx   on inquiries (store_id, created_at desc);
create index if not exists inquiries_status_idx  on inquiries (status, created_at desc);

alter table inquiries enable row level security;
