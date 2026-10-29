-- Exercise library, tags and the Kneedit starter routine.
--
-- Everything here is a draft pending clinician sign-off, in both languages.
-- The JSON in the two dollar-quoted blocks is also read by scripts/seed-strings.ts
-- for the i18n and copy-rule tests, and every Chinese string is listed in
-- locales/review-status.json under "data", so keep it valid JSON.
--
-- Demo accounts and their fake history are not here: scripts/seed-demo.mts
-- creates them through the service role.

insert into public.tags (key, kind, label)
select key, kind::public.tag_kind, label
from jsonb_to_recordset($json$
[
  { "key": "strength", "kind": "focus", "label": { "en": "Strength", "zh-Hans": "力量" } },
  { "key": "mobility", "kind": "focus", "label": { "en": "Mobility", "zh-Hans": "活动度" } },
  { "key": "balance", "kind": "focus", "label": { "en": "Balance", "zh-Hans": "平衡" } },
  { "key": "seated", "kind": "position", "label": { "en": "Seated", "zh-Hans": "坐姿" } },
  { "key": "lying", "kind": "position", "label": { "en": "Lying down", "zh-Hans": "躺姿" } },
  { "key": "standing", "kind": "position", "label": { "en": "Standing", "zh-Hans": "站姿" } }
]
$json$::jsonb) as t(key text, kind text, label jsonb)
on conflict (key) do update set kind = excluded.kind, label = excluded.label;

insert into public.exercises
  (id, name, steps, default_reps, focus_tag, position_tag, video_path, poster_path, sort_order)
select id, name, steps, default_reps, focus_tag, position_tag, video_path, poster_path, sort_order
from jsonb_to_recordset($json$
[
  {
    "id": "seated-knee-extension",
    "sort_order": 1,
    "default_reps": 10,
    "focus_tag": "strength",
    "position_tag": "seated",
    "video_path": "knee.mp4",
    "poster_path": "knee.jpg",
    "name": { "en": "Seated knee straightening", "zh-Hans": "坐姿伸膝" },
    "steps": {
      "en": [
        "Sit tall on a firm chair with both feet flat on the floor.",
        "Slowly straighten one knee until the leg is out in front of you.",
        "Hold for 3 seconds.",
        "Slowly lower the foot back to the floor."
      ],
      "zh-Hans": [
        "坐在稳固的椅子上，背部挺直，双脚平放在地上。",
        "慢慢伸直一侧膝盖，让小腿向前抬起。",
        "保持3秒。",
        "慢慢把脚放回地面。"
      ]
    }
  },
  {
    "id": "ankle-pumps",
    "sort_order": 2,
    "default_reps": 15,
    "focus_tag": "mobility",
    "position_tag": "lying",
    "video_path": "ankle.mp4",
    "poster_path": "ankle.jpg",
    "name": { "en": "Ankle pumps", "zh-Hans": "踝泵运动" },
    "steps": {
      "en": [
        "Lie on your back or sit with your legs straight out in front of you.",
        "Point your toes away from you.",
        "Pull your toes back towards you.",
        "Keep the movement slow and smooth."
      ],
      "zh-Hans": [
        "平躺，或坐着把双腿向前伸直。",
        "脚尖向前下压。",
        "再把脚尖往回勾向自己。",
        "动作要慢而平稳。"
      ]
    }
  },
  {
    "id": "quad-sets",
    "sort_order": 3,
    "default_reps": 10,
    "focus_tag": "strength",
    "position_tag": "lying",
    "video_path": "quad.mp4",
    "poster_path": "quad.jpg",
    "name": { "en": "Thigh tightening", "zh-Hans": "大腿收紧" },
    "steps": {
      "en": [
        "Lie on your back or sit with your legs straight out in front of you.",
        "Tighten the muscle on the front of your thigh and press the back of your knee down.",
        "Hold for 5 seconds.",
        "Relax the muscle."
      ],
      "zh-Hans": [
        "平躺，或坐着把双腿向前伸直。",
        "收紧大腿前侧的肌肉，把膝盖后方往下压。",
        "保持5秒。",
        "放松肌肉。"
      ]
    }
  },
  {
    "id": "heel-raises",
    "sort_order": 4,
    "default_reps": 10,
    "focus_tag": "balance",
    "position_tag": "standing",
    "video_path": null,
    "poster_path": null,
    "name": { "en": "Heel raises", "zh-Hans": "踮脚跟" },
    "steps": {
      "en": [
        "Stand behind a sturdy chair and hold the back with both hands.",
        "Slowly rise up onto your toes.",
        "Hold for 2 seconds.",
        "Slowly lower your heels to the floor."
      ],
      "zh-Hans": [
        "站在稳固的椅子后面，双手扶住椅背。",
        "慢慢踮起脚尖。",
        "保持2秒。",
        "慢慢把脚跟放回地面。"
      ]
    }
  },
  {
    "id": "mini-squats",
    "sort_order": 5,
    "default_reps": 8,
    "focus_tag": "strength",
    "position_tag": "standing",
    "video_path": null,
    "poster_path": null,
    "name": { "en": "Mini squats", "zh-Hans": "小幅度下蹲" },
    "steps": {
      "en": [
        "Stand behind a sturdy chair and hold the back with both hands.",
        "Keep your feet hip-width apart.",
        "Bend your knees a little, as if starting to sit down.",
        "Slowly stand back up straight."
      ],
      "zh-Hans": [
        "站在稳固的椅子后面，双手扶住椅背。",
        "双脚分开，与髋同宽。",
        "膝盖微微弯曲，像要坐下一样。",
        "慢慢站直。"
      ]
    }
  }
]
$json$::jsonb) as t(
  id text, name jsonb, steps jsonb, default_reps integer, focus_tag text, position_tag text,
  video_path text, poster_path text, sort_order integer
)
on conflict (id) do update set
  name = excluded.name,
  steps = excluded.steps,
  default_reps = excluded.default_reps,
  focus_tag = excluded.focus_tag,
  position_tag = excluded.position_tag,
  video_path = excluded.video_path,
  poster_path = excluded.poster_path,
  sort_order = excluded.sort_order;

-- The Kneedit starter routine: the first three exercises, once a day.
insert into public.default_routine_items (position, exercise_id, reps, frequency)
values
  (1, 'seated-knee-extension', 10, 'daily'),
  (2, 'ankle-pumps', 15, 'daily'),
  (3, 'quad-sets', 10, 'daily')
on conflict (position) do update set
  exercise_id = excluded.exercise_id, reps = excluded.reps, frequency = excluded.frequency;
