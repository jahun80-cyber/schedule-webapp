-- 감사로그: 누가(역할) 언제 어느 매장의 무엇을 고쳤는지 남기는 표
--
-- [실행 방법]
--   Supabase 대시보드 -> 왼쪽 메뉴 SQL Editor -> New query -> 아래 내용 전체 붙여넣기 -> Run
--   (한 번만 실행하면 됩니다. 이미 만들어져 있어도 오류 없이 그냥 넘어갑니다.)
--
-- 지금은 총관리자/매장관리자/사용자가 공용 비밀번호라서 "개인 이름"은 남길 수 없고
-- "역할"까지만 기록합니다. 나중에 개인별 계정으로 바뀌면 actor_name 컬럼만 추가하면 됩니다.

create table if not exists audit_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  store_id   text,          -- 어느 매장 (매장과 무관한 작업이면 null)
  store_name text,          -- 그 시점의 매장 이름 (매장이 삭제돼도 로그에 남도록 이름을 같이 저장)
  role       text not null,  -- admin(총관리자) / manager(매장관리자) / viewer(사용자)
  action     text not null,  -- 무슨 작업인지 (예: config.update, schedule.update, store.delete)
  detail     text,           -- 바뀐 항목 요약 (예: "설정, 직원목록")
  ip         text
);

create index if not exists audit_log_created_idx on audit_log (created_at desc);
create index if not exists audit_log_store_idx   on audit_log (store_id, created_at desc);

alter table audit_log enable row level security;
