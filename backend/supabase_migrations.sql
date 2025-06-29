-- Create subscription_status table
create table if not exists subscription_status (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  status      text not null check (status in ('active', 'cancelled', 'none')),
  customer_id text,
  updated_at  timestamptz default current_timestamp
);

-- Enable RLS
alter table subscription_status enable row level security;

-- User can read their own subscription
create policy "User can read own subscription" on subscription_status
  for select using (auth.uid() = user_id);

-- Service role can insert/update
create policy "Service role can manage subscriptions" on subscription_status
  for all using (auth.jwt()->>'role' = 'service_role'); 