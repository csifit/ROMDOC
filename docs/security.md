# RomDoc Security

Authentication:
- Supabase Auth

Authorization:
- Row Level Security (RLS)

Roles:
- admin
- doctor
- staff

Strategy:
- Public read access for directory content
- Doctors manage only their own data
- Admins manage all data