-- Exercise videos and posters. The bucket is public so the video player can
-- stream a plain URL; the files are demonstration videos with nothing
-- personal in them. Only the service role uploads (scripts/upload-media).

insert into storage.buckets (id, name, public, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, array['video/mp4', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
