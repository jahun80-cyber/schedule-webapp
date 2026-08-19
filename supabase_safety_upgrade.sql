-- 안전장치 1: 백업 복원 / 매장 삭제 직전에 자동으로 스냅샷을 저장해두는 테이블
-- (실수로 잘못된 백업을 복원하거나 매장을 잘못 삭제해도, 여기서 직전 상태를 되살릴 수 있음)
create table if not exists backup_snapshots (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  reason text not null,
  data jsonb not null
);
create index if not exists backup_snapshots_created_at_idx on backup_snapshots (created_at desc);
alter table backup_snapshots enable row level security;

-- 안전장치 2: 로그인 무차별 대입(비밀번호 무한 시도) 방지용
create table if not exists login_failures (
  id bigserial primary key,
  ip text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists login_failures_ip_time_idx on login_failures (ip, attempted_at desc);
alter table login_failures enable row level security;
