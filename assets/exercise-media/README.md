# Exercise media

Demonstration videos and posters for the exercise library. `npm run media:upload` copies every `.mp4`, `.jpg`, `.png` and `.webp` here to the public `exercise-media` bucket.

The names must match `video_path` and `poster_path` in `supabase/seed.sql`:

| Exercise | Video | Poster |
| --- | --- | --- |
| Seated knee straightening | `knee.mp4` | `knee.jpg` |
| Ankle pumps | `ankle.mp4` | `ankle.jpg` |
| Thigh tightening | `quad.mp4` | `quad.jpg` |

Heel raises and mini squats have no video yet; the session screen shows the steps only.
